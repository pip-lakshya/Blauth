const { createWallet } = require('../models/wallet');
const {
  getCredentialStatusByHash,
  isBlockchainEnabled,
  registerCredentialHashOnChain,
  registerCredentialOnChain,
} = require('./blockchainCredentialService');
const { validateBiometricCommitment, validateRegistration } = require('../utils/validation');
const { getWalletStore } = require('./walletStore');

async function registerWallet(payload) {
  const { credentials, biometricCommitment } = validateRegistration(payload);
  const walletStore = getWalletStore();

  if (biometricCommitment) {
    return registerBiometricWallet({ walletStore, credentials, biometricCommitment });
  }

  const { v4: createUuid } = await import('uuid');
  const wallet = createWallet({ walletId: `wallet_${createUuid()}`, credentials });
  const blockchainProof = await registerCredentialOnChain(credentials);
  await walletStore.save(wallet);
  return { wallet, blockchainProof };
}

async function registerBiometricWallet({ walletStore, credentials, biometricCommitment }) {
  let blockchainProof = null;

  if (isBlockchainEnabled()) {
    const credentialStatus = await getCredentialStatusByHash(biometricCommitment);

    if (credentialStatus.isRegistered) {
      if (credentialStatus.revoked) {
        const error = new Error('Biometric credential has been revoked.');
        error.status = 409;
        throw error;
      }

      blockchainProof = {
        credentialHash: biometricCommitment,
        transactionHash: null,
      };
    } else {
      blockchainProof = await registerCredentialHashOnChain(biometricCommitment);
    }
  }

  let wallet = await walletStore.findByBiometricCommitment(biometricCommitment);

  // Wallet records created before commitment mapping existed can be safely linked
  // when their complete local identity credentials match this enrollment payload.
  if (!wallet) {
    wallet = await walletStore.findByCredentials(credentials);
    if (wallet && !wallet.biometricCommitment) {
      wallet.biometricCommitment = biometricCommitment;
      await walletStore.update(wallet);
    } else if (wallet && wallet.biometricCommitment !== biometricCommitment) {
      wallet = null;
    }
  }

  if (!wallet) {
    const { v4: createUuid } = await import('uuid');
    wallet = createWallet({
      walletId: `wallet_${createUuid()}`,
      credentials,
      biometricCommitment,
    });
    await walletStore.save(wallet);
  }

  return { wallet, blockchainProof };
}

async function authenticateBiometricCommitment(commitment) {
  const biometricCommitment = validateBiometricCommitment(commitment);
  const status = await getCredentialStatusByHash(biometricCommitment);
  return {
    registered: isBiometricCredentialUsable(status),
    walletAddress: status.walletAddress,
    registeredAt: status.registeredAt,
    revoked: status.revoked,
  };
}

function isBiometricCredentialUsable(status) {
  return Boolean(status && status.isRegistered && !status.revoked);
}

async function getWallet(walletId) {
  const wallet = await getWalletStore().findByWalletId(walletId);
  if (!wallet) {
    const error = new Error('walletId does not exist.');
    error.status = 404;
    throw error;
  }

  return wallet;
}

async function getDisclosureHistory(walletId) {
  const wallet = await getWallet(walletId);

  return wallet.disclosureHistory.map((record) => ({
    verifier: record.verifier || record.verifierId,
    sharedFields: record.sharedFields || record.disclosedFields || [],
    withheldFields: record.withheldFields || [],
    timestamp: record.timestamp,
    ...(record.requestId ? { requestId: record.requestId } : {}),
  }));
}

module.exports = { registerWallet, getWallet, getDisclosureHistory, authenticateBiometricCommitment, isBiometricCredentialUsable };
