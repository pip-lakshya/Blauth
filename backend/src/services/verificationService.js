const { createVerificationRequest: createVerificationRequestRecord } = require('../models/verificationRequest');
const { createDisclosureHistoryEntry } = require('../models/disclosureHistory');
const { isAgeOver18 } = require('../utils/age');
const { validateConsent, validateVerificationRequest } = require('../utils/validation');
const { getVerificationRequestStore } = require('./verificationRequestStore');
const { getWalletStore } = require('./walletStore');

const AGE_WITHHELD_FIELDS = ['dob', 'name', 'email', 'phone', 'studentId'];
const COLLEGE_WITHHELD_FIELDS = ['email', 'dob', 'phone'];

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
  let withheldFields = verificationRequest.requestedFields.filter(
    (field) => !disclosedFields.includes(field),
  );
  const isAgeVerification = verificationRequest.verifierId === 'age-restricted-service'
    && verificationRequest.requestedFields.length === 1
    && verificationRequest.requestedFields[0] === 'ageOver18';
  if (isAgeVerification) {
    withheldFields = AGE_WITHHELD_FIELDS;
  }
  const isCollegeVerification = verificationRequest.verifierId === 'college-portal'
    && verificationRequest.requestedFields.length === 2
    && verificationRequest.requestedFields.includes('name')
    && verificationRequest.requestedFields.includes('studentId');
  if (isCollegeVerification) {
    withheldFields = [...new Set([...withheldFields, ...COLLEGE_WITHHELD_FIELDS])];
  }
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
    data[field] = field === 'ageOver18'
      ? isAgeOver18(wallet.credentials.dob)
      : wallet.credentials[field];
  }

  wallet.disclosureHistory.push(disclosureHistoryEntry);
  verificationRequest.status = outcome;

  await walletStore.update(wallet);
  await requestStore.update(verificationRequest);

  return { data, outcome };
}

module.exports = { createVerificationRequest, processConsent };
