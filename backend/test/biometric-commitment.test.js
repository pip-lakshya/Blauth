const assert = require('assert/strict');
const test = require('node:test');

const { isBiometricCredentialUsable } = require('../src/services/identityService');
const { validateBiometricCommitment } = require('../src/utils/validation');

const commitment = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

test('a biometric commitment is a deterministic bytes32 hexadecimal value', () => {
  assert.equal(validateBiometricCommitment(commitment), commitment);
  assert.throws(() => validateBiometricCommitment('face-descriptor-data'));
  assert.throws(() => validateBiometricCommitment('0x1234'));
});

test('raw biometric payloads cannot be used as blockchain credential input', () => {
  assert.throws(() => validateBiometricCommitment('[0.12,0.44,0.91]'));
  assert.throws(() => validateBiometricCommitment('data:image/png;base64,biometric'));
});

test('a registered, non-revoked biometric commitment is usable', () => {
  assert.equal(isBiometricCredentialUsable({ isRegistered: true, revoked: false }), true);
});

test('a revoked or absent biometric commitment fails authentication', () => {
  assert.equal(isBiometricCredentialUsable({ isRegistered: true, revoked: true }), false);
  assert.equal(isBiometricCredentialUsable({ isRegistered: false, revoked: false }), false);
});
