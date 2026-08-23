const assert = require('assert/strict');
const test = require('node:test');

const { createCredentialHash } = require('../src/utils/credentialHash');

const credentials = {
  name: 'Lucky',
  studentId: '24CE1032',
  email: 'lucky@example.com',
  phone: '9876543210',
  dob: '2005-04-15',
};

test('credential hashing is deterministic', () => {
  assert.equal(createCredentialHash(credentials), createCredentialHash({ ...credentials }));
});

test('credential hashing uses the defined field order rather than input property order', () => {
  const reorderedCredentials = {
    dob: credentials.dob,
    phone: credentials.phone,
    email: credentials.email,
    studentId: credentials.studentId,
    name: credentials.name,
  };

  assert.equal(createCredentialHash(credentials), createCredentialHash(reorderedCredentials));
});

test('changing a credential changes its hash', () => {
  assert.notEqual(createCredentialHash(credentials), createCredentialHash({ ...credentials, studentId: '24CE1033' }));
});

test('credential hashes are fixed-size bytes32 values without plaintext credentials', () => {
  const hash = createCredentialHash(credentials);

  assert.match(hash, /^0x[a-f0-9]{64}$/);
  assert.equal(hash.includes(credentials.name), false);
  assert.equal(hash.includes(credentials.email), false);
  assert.equal(hash.includes(credentials.phone), false);
  assert.equal(hash.includes(credentials.dob), false);
});

test('biometric payload fields never affect the blockchain credential hash', () => {
  const credentialHash = createCredentialHash(credentials);
  const hashWithBiometricPayload = createCredentialHash({
    ...credentials,
    faceImage: 'image-data',
    faceEmbedding: 'embedding-data',
    faceDescriptor: 'descriptor-data',
    biometricTemplate: 'template-data',
  });

  assert.equal(hashWithBiometricPayload, credentialHash);
});
