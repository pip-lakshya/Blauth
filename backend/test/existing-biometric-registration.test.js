const assert = require('assert/strict');
const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');

const blockchainServicePath = require.resolve('../src/services/blockchainCredentialService');
const identityServicePath = require.resolve('../src/services/identityService');
const identityControllerPath = require.resolve('../src/controllers/identityController');
const identityRoutesPath = require.resolve('../src/routes/identityRoutes');
const appPath = require.resolve('../src/app');

const commitment = '0x2e590021e9294beb739bc080bdc936b58d7f4375b3380bcfd9e7f2af22d83126';
const credentials = {
  name: 'Lucky',
  studentId: '24CE1032',
  email: 'lucky@example.com',
  phone: '9876543210',
  dob: '2005-04-15',
};

let credentialStatus;
let registrationCalls = 0;

delete require.cache[identityServicePath];
delete require.cache[identityControllerPath];
delete require.cache[identityRoutesPath];
delete require.cache[appPath];
require.cache[blockchainServicePath] = {
  id: blockchainServicePath,
  filename: blockchainServicePath,
  loaded: true,
  exports: {
    isBlockchainEnabled: () => true,
    getCredentialStatusByHash: async () => credentialStatus,
    registerCredentialHashOnChain: async (credentialHash) => {
      registrationCalls += 1;
      return { credentialHash, transactionHash: '0xnewtransaction' };
    },
    registerCredentialOnChain: async () => null,
  },
};

const app = require('../src/app');

function activeStatus() {
  return {
    isRegistered: true,
    walletAddress: '0x567f3A77197F8c6744d41B5e7A7A67469d876b42',
    registeredAt: '123',
    revoked: false,
  };
}

async function withServer(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blauth-existing-credential-test-'));
  const dataFile = path.join(directory, 'wallets.json');
  process.env.WALLET_DATA_FILE = dataFile;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  async function register() {
    const payload = JSON.stringify({ verified: true, credentials, biometricCommitment: commitment });
    return new Promise((resolve, reject) => {
      const request = http.request({
        hostname: '127.0.0.1',
        port: server.address().port,
        path: '/identity/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, (response) => {
        let body = '';
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
      });
      request.on('error', reject);
      request.end(payload);
    });
  }

  try {
    await run({ dataFile, register });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    delete process.env.WALLET_DATA_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('an active existing biometric credential reuses one local wallet without another transaction', async () => {
  credentialStatus = activeStatus();
  registrationCalls = 0;

  await withServer(async ({ dataFile, register }) => {
    const first = await register();
    const second = await register();
    const wallets = JSON.parse(await fs.readFile(dataFile, 'utf8'));

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.equal(first.body.walletId, second.body.walletId);
    assert.deepEqual(first.body.blockchain, { credentialHash: commitment, transactionHash: null });
    assert.equal(registrationCalls, 0);
    assert.equal(wallets.length, 1);
    assert.equal(wallets[0].biometricCommitment, commitment);
  });
});

test('an existing legacy wallet is linked to an active registered commitment', async () => {
  credentialStatus = activeStatus();
  registrationCalls = 0;

  await withServer(async ({ dataFile, register }) => {
    await fs.writeFile(dataFile, JSON.stringify([{
      walletId: 'wallet_existing', credentials, createdAt: '2026-01-01T00:00:00.000Z', disclosureHistory: [],
    }]), 'utf8');

    const response = await register();
    const wallets = JSON.parse(await fs.readFile(dataFile, 'utf8'));

    assert.equal(response.status, 201);
    assert.equal(response.body.walletId, 'wallet_existing');
    assert.equal(wallets.length, 1);
    assert.equal(wallets[0].biometricCommitment, commitment);
    assert.equal(registrationCalls, 0);
  });
});

test('an unregistered biometric commitment is registered once before its wallet is persisted', async () => {
  credentialStatus = { isRegistered: false, walletAddress: null, registeredAt: null, revoked: false };
  registrationCalls = 0;

  await withServer(async ({ dataFile, register }) => {
    const response = await register();
    const wallets = JSON.parse(await fs.readFile(dataFile, 'utf8'));

    assert.equal(response.status, 201);
    assert.equal(registrationCalls, 1);
    assert.equal(wallets.length, 1);
    assert.equal(wallets[0].biometricCommitment, commitment);
  });
});

test('a revoked biometric credential is rejected without registration or wallet persistence', async () => {
  credentialStatus = { ...activeStatus(), revoked: true };
  registrationCalls = 0;

  await withServer(async ({ dataFile, register }) => {
    const response = await register();

    assert.equal(response.status, 409);
    assert.equal(registrationCalls, 0);
    await assert.rejects(fs.access(dataFile));
  });
});
