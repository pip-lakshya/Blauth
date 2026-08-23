const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const {
  POLYGON_AMOY_CHAIN_ID,
  createCredentialHash,
} = require('../src/services/blockchainCredentialService');

const backendRoot = path.resolve(__dirname, '..');

test('blockchain service is locked to Polygon Amoy', () => {
  assert.equal(POLYGON_AMOY_CHAIN_ID, 80002);
});

test('the registry contract accepts only a bytes32 hash as credential input', () => {
  const contract = fs.readFileSync(path.join(backendRoot, 'contracts/CredentialRegistry.sol'), 'utf8');

  assert.match(contract, /function registerCredential\(bytes32 credentialHash\)/);
  assert.doesNotMatch(contract, /string.*(?:name|email|phone|dob|studentId)/i);
});

test('the blockchain input is a hash and contains no biometric payload values', () => {
  const credentials = {
    name: 'Lucky',
    studentId: '24CE1032',
    email: 'lucky@example.com',
    phone: '9876543210',
    dob: '2005-04-15',
    cameraFrame: 'frame-data',
    video: 'video-data',
  };
  const credentialHash = createCredentialHash(credentials);

  assert.match(credentialHash, /^0x[a-f0-9]{64}$/);
  assert.equal(credentialHash.includes(credentials.cameraFrame), false);
  assert.equal(credentialHash.includes(credentials.video), false);
});
