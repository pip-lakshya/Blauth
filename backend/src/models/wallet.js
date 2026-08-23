function createWallet({ walletId, credentials, biometricCommitment }) {
  return {
    walletId,
    credentials,
    createdAt: new Date().toISOString(),
    disclosureHistory: [],
    ...(biometricCommitment ? { biometricCommitment } : {}),
  };
}

module.exports = { createWallet };
