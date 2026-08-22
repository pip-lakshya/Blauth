function createVerificationRequest({ requestId, walletId, verifierId, requestedFields }) {
  return {
    requestId,
    walletId,
    verifierId,
    requestedFields,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
}

module.exports = { createVerificationRequest };
