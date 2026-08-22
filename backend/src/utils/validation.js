class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

const allowedRequestFields = new Set(['verified', 'credentials']);
const allowedCredentialFields = new Set(['name', 'studentId', 'email', 'phone', 'dob']);

function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function rejectUnexpectedFields(object, allowedFields, label) {
  const unexpectedFields = Object.keys(object).filter((field) => !allowedFields.has(field));
  if (unexpectedFields.length > 0) {
    throw new ValidationError(`Unexpected ${label} field: ${unexpectedFields[0]}.`);
  }
}

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${field} is required.`);
  }
  return value.trim();
}

function isValidDateOfBirth(dob) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return date.getTime() <= todayUtc;
}

function validateRegistration(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  rejectUnexpectedFields(payload, allowedRequestFields, 'request');

  if (!hasOwn(payload, 'verified')) {
    throw new ValidationError('verified is required.');
  }
  if (typeof payload.verified !== 'boolean') {
    throw new ValidationError('verified must be a boolean.');
  }
  if (!payload.verified) {
    throw new ValidationError('Local biometric verification is required.');
  }
  if (!hasOwn(payload, 'credentials') || !payload.credentials) {
    throw new ValidationError('credentials are required.');
  }
  if (typeof payload.credentials !== 'object' || Array.isArray(payload.credentials)) {
    throw new ValidationError('credentials must be an object.');
  }

  rejectUnexpectedFields(payload.credentials, allowedCredentialFields, 'credentials');

  const credentials = {
    name: requiredText(payload.credentials.name, 'name'),
    studentId: requiredText(payload.credentials.studentId, 'studentId'),
    email: requiredText(payload.credentials.email, 'email'),
    phone: requiredText(payload.credentials.phone, 'phone'),
    dob: requiredText(payload.credentials.dob, 'dob'),
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
    throw new ValidationError('email is invalid.');
  }
  if (!/^\+?[1-9]\d{9,14}$/.test(credentials.phone)) {
    throw new ValidationError('phone is invalid.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(credentials.dob)) {
    throw new ValidationError('dob must be in YYYY-MM-DD format.');
  }
  if (!isValidDateOfBirth(credentials.dob)) {
    throw new ValidationError('dob must be a valid, non-future calendar date.');
  }

  return credentials;
}

module.exports = { ValidationError, validateRegistration };
