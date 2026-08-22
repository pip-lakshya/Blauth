const { createVerificationRequest: createVerificationRequestRecord } = require('../models/verificationRequest');
const { validateVerificationRequest } = require('../utils/validation');
const { getVerificationRequestStore } = require('./verificationRequestStore');
const { getWalletStore } = require('./walletStore');

async function createVerificationRequest(payload) {
  const requestDetails = validateVerificationRequest(payload);
  const wallet = await getWalletStore().findByWalletId(requestDetails.walletId);

  if (!wallet) {
    const error = new Error('walletId does not exist.');
    error.status = 404;
    throw error;
  }

  const { v4: createUuid } = await import('uuid');
  const verificationRequest = createVerificationRequestRecord({
    requestId: `req_${createUuid()}`,
    ...requestDetails,
  });

  await getVerificationRequestStore().save(verificationRequest);
  return verificationRequest;
}

module.exports = { createVerificationRequest };
