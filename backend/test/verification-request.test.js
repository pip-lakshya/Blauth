const assert = require('assert/strict');
const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');

const app = require('../src/app');

const credentials = {
  name: 'Lucky',
  studentId: '24CE1032',
  email: 'lucky@example.com',
  phone: '9876543210',
  dob: '2005-04-15',
};

async function withServer(run) {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'blauth-verification-test-'));
  const walletFile = path.join(tempDirectory, 'wallets.json');
  const requestFile = path.join(tempDirectory, 'verification-requests.json');
  process.env.WALLET_DATA_FILE = walletFile;
  process.env.VERIFICATION_REQUEST_DATA_FILE = requestFile;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  async function request(endpoint, body) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const clientRequest = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (response) => {
          let responseBody = '';
          response.on('data', (chunk) => {
            responseBody += chunk;
          });
          response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(responseBody) }));
        },
      );
      clientRequest.on('error', reject);
      clientRequest.end(payload);
    });
  }

  async function createWallet() {
    const response = await request('/identity/register', { verified: true, credentials });
    assert.equal(response.status, 201);
    return response.body.walletId;
  }

  try {
    await run({ createWallet, request, requestFile });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    delete process.env.WALLET_DATA_FILE;
    delete process.env.VERIFICATION_REQUEST_DATA_FILE;
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

function requestPayload(walletId, requestedFields = ['name', 'studentId']) {
  return { walletId, verifierId: 'college-portal', requestedFields };
}

test('creates a name and studentId verification request without disclosing credentials', async () => {
  await withServer(async ({ createWallet, request }) => {
    const walletId = await createWallet();
    const response = await request('/verify/request', requestPayload(walletId));

    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(response.body), ['requestId']);
    assert.match(response.body.requestId, /^req_/);
  });
});

test('creates a valid single-field verification request', async () => {
  await withServer(async ({ createWallet, request }) => {
    const response = await request('/verify/request', requestPayload(await createWallet(), ['email']));
    assert.equal(response.status, 201);
  });
});

test('allows ageOver18 as a requested field without deriving it', async () => {
  await withServer(async ({ createWallet, request }) => {
    const response = await request('/verify/request', requestPayload(await createWallet(), ['ageOver18']));
    assert.equal(response.status, 201);
  });
});

test('stores a pending request with only request metadata', async () => {
  await withServer(async ({ createWallet, request, requestFile }) => {
    const walletId = await createWallet();
    const response = await request('/verify/request', requestPayload(walletId));
    const requests = JSON.parse(await fs.readFile(requestFile, 'utf8'));

    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0], {
      requestId: response.body.requestId,
      walletId,
      verifierId: 'college-portal',
      requestedFields: ['name', 'studentId'],
      status: 'PENDING',
      createdAt: requests[0].createdAt,
    });
    assert.equal('credentials' in requests[0], false);
    assert.equal('dob' in requests[0], false);
    assert.equal(JSON.stringify(requests).includes(credentials.email), false);
    assert.equal(JSON.stringify(requests).includes(credentials.phone), false);
    assert.equal(JSON.stringify(requests).includes(credentials.dob), false);
    assert.equal(JSON.stringify(requests).includes(credentials.studentId), false);
  });
});

test('two verification requests receive different request IDs', async () => {
  await withServer(async ({ createWallet, request }) => {
    const walletId = await createWallet();
    const first = await request('/verify/request', requestPayload(walletId, ['name']));
    const second = await request('/verify/request', requestPayload(walletId, ['studentId']));

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.notEqual(first.body.requestId, second.body.requestId);
  });
});

test('rejects an unknown wallet', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request('/verify/request', requestPayload('wallet_unknown'))).status, 404);
  });
});

const invalidRequestCases = [
  ['missing walletId', { verifierId: 'college-portal', requestedFields: ['name'] }],
  ['empty walletId', { walletId: '', verifierId: 'college-portal', requestedFields: ['name'] }],
  ['missing verifierId', { walletId: 'wallet_any', requestedFields: ['name'] }],
  ['empty verifierId', { walletId: 'wallet_any', verifierId: '', requestedFields: ['name'] }],
  ['non-string verifierId', { walletId: 'wallet_any', verifierId: 123, requestedFields: ['name'] }],
  ['missing requestedFields', { walletId: 'wallet_any', verifierId: 'college-portal' }],
  ['requestedFields with the wrong type', { walletId: 'wallet_any', verifierId: 'college-portal', requestedFields: 'name' }],
  ['empty requestedFields', { walletId: 'wallet_any', verifierId: 'college-portal', requestedFields: [] }],
  ['unsupported requested field', { walletId: 'wallet_any', verifierId: 'college-portal', requestedFields: ['address'] }],
  ['duplicate requested field', { walletId: 'wallet_any', verifierId: 'college-portal', requestedFields: ['name', 'name'] }],
];

for (const [description, payload] of invalidRequestCases) {
  test(`rejects ${description}`, async () => {
    await withServer(async ({ request, requestFile }) => {
      const response = await request('/verify/request', payload);
      assert.equal(response.status, 400);
      await assert.rejects(fs.access(requestFile));
    });
  });
}
