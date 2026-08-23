const { createWallet } = require('../models/wallet');
const { registerCredentialOnChain } = require('./blockchainCredentialService');
const { validateRegistration } = require('../utils/validation');
const { getWalletStore } = require('./walletStore');

async function registerWallet(payload) {
  const credentials = validateRegistration(payload);
  const { v4: createUuid } = await import('uuid');
  const wallet = createWallet({
    walletId: `wallet_${createUuid()}`,
    credentials,
  });

  const blockchainProof = await registerCredentialOnChain(credentials);
  await getWalletStore().save(wallet);
  return { wallet, blockchainProof };
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

module.exports = { registerWallet, getWallet, getDisclosureHistory };
