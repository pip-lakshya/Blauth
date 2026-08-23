const assert = require('assert/strict');
const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');

const blockchainServicePath = require.resolve('../src/services/blockchainCredentialService');
const realBlockchainService = require(blockchainServicePath);
const identityServicePath = require.resolve('../src/services/identityService');
const identityControllerPath = require.resolve('../src/controllers/identityController');
const identityRoutesPath = require.resolve('../src/routes/identityRoutes');
const appPath = require.resolve('../src/app');

let blockchainProof = null;
let blockchainCallCount = 0;

delete require.cache[identityServicePath];
delete require.cache[identityControllerPath];
delete require.cache[identityRoutesPath];
delete require.cache[appPath];
require.cache[blockchainServicePath] = {
  id: blockchainServicePath,
  filename: blockchainServicePath,
  loaded: true,
  exports: {
    registerCredentialOnChain: async () => {
      blockchainCallCount += 1;
      return blockchainProof;
    },
  },
};

const app = require('../src/app');

const credentials = {
  name: 'Lucky',
  studentId: '24CE1032',
  email: 'lucky@example.com',
  phone: '9876543210',
  dob: '2005-04-15',
};

async function withServer(run) {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'blauth-blockchain-proof-test-'));
  process.env.WALLET_DATA_FILE = path.join(tempDirectory, 'wallets.json');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    await run(async () => new Promise((resolve, reject) => {
      const payload = JSON.stringify({ verified: true, credentials });
      const request = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/identity/register',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (response) => {
          let body = '';
          response.on('data', (chunk) => {
            body += chunk;
          });
          response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
        },
      );
      request.on('error', reject);
      request.end(payload);
    }));
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    delete process.env.WALLET_DATA_FILE;
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

test('successful blockchain registration returns only the blockchain proof metadata', async () => {
  blockchainProof = {
    credentialHash: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    transactionHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  };
  blockchainCallCount = 0;

  await withServer(async (register) => {
    const response = await register();

    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(response.body).sort(), ['blockchain', 'status', 'walletId']);
    assert.deepEqual(response.body.blockchain, blockchainProof);
    assert.match(response.body.blockchain.credentialHash, /^0x[a-f0-9]{64}$/);
    assert.equal(typeof response.body.blockchain.transactionHash, 'string');
    assert.equal(blockchainCallCount, 1);
  });
});

test('blockchain proof responses do not expose credential values', async () => {
  blockchainProof = {
    credentialHash: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    transactionHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  };

  await withServer(async (register) => {
    const response = await register();
    const responseText = JSON.stringify(response.body);

    assert.equal(responseText.includes(credentials.name), false);
    assert.equal(responseText.includes(credentials.studentId), false);
    assert.equal(responseText.includes(credentials.email), false);
    assert.equal(responseText.includes(credentials.phone), false);
    assert.equal(responseText.includes(credentials.dob), false);
    assert.equal('credentials' in response.body, false);
  });
});

test('blockchain-disabled registration keeps the existing response shape', async () => {
  blockchainProof = null;

  await withServer(async (register) => {
    const response = await register();

    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(response.body).sort(), ['status', 'walletId']);
  });
});

test('the real blockchain service is disabled unless explicitly enabled', () => {
  const previousValue = process.env.BLOCKCHAIN_ENABLED;
  delete process.env.BLOCKCHAIN_ENABLED;

  try {
    assert.equal(realBlockchainService.isBlockchainEnabled(), false);
  } finally {
    if (previousValue === undefined) {
      delete process.env.BLOCKCHAIN_ENABLED;
    } else {
      process.env.BLOCKCHAIN_ENABLED = previousValue;
    }
  }
});
