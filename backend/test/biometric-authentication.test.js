const assert = require('assert/strict');
const test = require('node:test');

const blockchainServicePath = require.resolve('../src/services/blockchainCredentialService');
const identityServicePath = require.resolve('../src/services/identityService');
const blockchainService = require(blockchainServicePath);

let requestedCommitment = null;
let credentialStatus = {
  isRegistered: true,
  walletAddress: '0x1111111111111111111111111111111111111111',
  registeredAt: '123',
  revoked: false,
};

delete require.cache[identityServicePath];
require.cache[blockchainServicePath] = {
  id: blockchainServicePath,
  filename: blockchainServicePath,
  loaded: true,
  exports: {
    ...blockchainService,
    getCredentialStatusByHash: async (commitment) => {
      requestedCommitment = commitment;
      return credentialStatus;
    },
  },
};

const { authenticateBiometricCommitment } = require('../src/services/identityService');
const commitment = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

test('biometric authentication checks only the bytes32 commitment against the registry', async () => {
  requestedCommitment = null;
  credentialStatus = {
    isRegistered: true,
    walletAddress: '0x1111111111111111111111111111111111111111',
    registeredAt: '123',
    revoked: false,
  };

  const proof = await authenticateBiometricCommitment(commitment.toUpperCase().replace('0X', '0x'));

  assert.equal(requestedCommitment, commitment);
  assert.deepEqual(proof, {
    registered: true,
    walletAddress: credentialStatus.walletAddress,
    registeredAt: credentialStatus.registeredAt,
    revoked: false,
  });
});

test('a revoked biometric commitment cannot authenticate', async () => {
  credentialStatus = {
    isRegistered: true,
    walletAddress: '0x1111111111111111111111111111111111111111',
    registeredAt: '123',
    revoked: true,
  };

  const proof = await authenticateBiometricCommitment(commitment);

  assert.equal(proof.registered, false);
  assert.equal(proof.revoked, true);
});

test('raw biometric material is rejected before a registry lookup', async () => {
  requestedCommitment = null;

  await assert.rejects(
    authenticateBiometricCommitment('[0.12,0.44,0.91]'),
    /bytes32 hexadecimal value/,
  );

  assert.equal(requestedCommitment, null);
});
