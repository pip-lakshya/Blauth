const crypto = require('crypto');

const credentialFields = ['name', 'studentId', 'email', 'phone', 'dob'];

function createCredentialHash(credentials) {
  const canonicalCredentials = {};

  for (const field of credentialFields) {
    canonicalCredentials[field] = credentials[field];
  }

  const canonicalJson = JSON.stringify(canonicalCredentials);
  return `0x${crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex')}`;
}

module.exports = { createCredentialHash };
