const { createVerificationRequest: createVerificationRequestRecord } = require('../models/verificationRequest');
const { createDisclosureHistoryEntry } = require('../models/disclosureHistory');
const { validateConsent, validateVerificationRequest } = require('../utils/validation');
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

async function processConsent(payload) {
  const { requestId, approvedFields } = validateConsent(payload);
  const requestStore = getVerificationRequestStore();
  const verificationRequest = await requestStore.findByRequestId(requestId);

  if (!verificationRequest) {
    const error = new Error('requestId does not exist.');
    error.status = 404;
    throw error;
  }
  if (verificationRequest.status !== 'PENDING') {
    const error = new Error('Verification request has already been completed.');
    error.status = 409;
    throw error;
  }

  const walletStore = getWalletStore();
  const wallet = await walletStore.findByWalletId(verificationRequest.walletId);
  if (!wallet) {
    const error = new Error('Wallet does not exist.');
    error.status = 404;
    throw error;
  }

  const approvedFieldSet = new Set(approvedFields);
  const disclosedFields = verificationRequest.requestedFields.filter(
    (field) => approvedFieldSet.has(field),
  );
  const withheldFields = verificationRequest.requestedFields.filter(
    (field) => !disclosedFields.includes(field),
  );
  const outcome = disclosedFields.length > 0 ? 'APPROVED' : 'DENIED';
  const { v4: createUuid } = await import('uuid');
  const disclosureHistoryEntry = createDisclosureHistoryEntry({
    disclosureId: `disclosure_${createUuid()}`,
    requestId: verificationRequest.requestId,
    verifierId: verificationRequest.verifierId,
    requestedFields: verificationRequest.requestedFields,
    approvedFields,
    disclosedFields,
    withheldFields,
    outcome,
  });

  const data = {};
  for (const field of disclosedFields) {
    data[field] = wallet.credentials[field];
  }

  wallet.disclosureHistory.push(disclosureHistoryEntry);
  verificationRequest.status = outcome;

  await walletStore.update(wallet);
  await requestStore.update(verificationRequest);

  return { data, outcome };
}

module.exports = { createVerificationRequest, processConsent };
