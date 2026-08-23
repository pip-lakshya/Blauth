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

module.exports = { registerWallet };
