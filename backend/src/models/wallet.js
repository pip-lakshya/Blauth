function createWallet({ walletId, credentials }) {
  return {
    walletId,
    credentials,
    createdAt: new Date().toISOString(),
    disclosureHistory: [],
  };
}

module.exports = { createWallet };
