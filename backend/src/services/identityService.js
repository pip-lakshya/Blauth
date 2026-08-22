const { createWallet } = require('../models/wallet');
const { validateRegistration } = require('../utils/validation');
const { getWalletStore } = require('./walletStore');

async function registerWallet(payload) {
  const credentials = validateRegistration(payload);
  const { v4: createUuid } = await import('uuid');
  const wallet = createWallet({
    walletId: `wallet_${createUuid()}`,
    credentials,
  });

  await getWalletStore().save(wallet);
  return wallet;
}

module.exports = { registerWallet };
