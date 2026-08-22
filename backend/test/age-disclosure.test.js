const assert = require('assert/strict');
const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');

const app = require('../src/app');

function createCredentials(dob) {
  return {
    name: 'Lucky',
    studentId: '24CE1032',
    email: 'lucky@example.com',
    phone: '9876543210',
    dob,
  };
}

async function withServer(run) {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'blauth-age-test-'));
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

  async function createVerificationRequest(dob, requestedFields) {
    const registration = await request('/identity/register', {
      verified: true,
      credentials: createCredentials(dob),
    });
    assert.equal(registration.status, 201);
    const verification = await request('/verify/request', {
      walletId: registration.body.walletId,
      verifierId: 'college-portal',
      requestedFields,
    });
    assert.equal(verification.status, 201);
    return { requestId: verification.body.requestId, walletId: registration.body.walletId };
  }

  try {
    await run({ createVerificationRequest, request, walletFile });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    delete process.env.WALLET_DATA_FILE;
    delete process.env.VERIFICATION_REQUEST_DATA_FILE;
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

test('an over-18 wallet discloses only ageOver18: true', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest('2000-04-15', ['ageOver18']);
    const response = await request('/verify/consent', { requestId, approvedFields: ['ageOver18'] });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { verified: true, data: { ageOver18: true } });
  });
});

test('an under-18 wallet discloses only ageOver18: false', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest('2012-04-15', ['ageOver18']);
    const response = await request('/verify/consent', { requestId, approvedFields: ['ageOver18'] });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { verified: true, data: { ageOver18: false } });
  });
});

test('ageOver18 is not disclosed when it was requested but not approved', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest('2000-04-15', ['ageOver18']);
    const response = await request('/verify/consent', { requestId, approvedFields: [] });

    assert.deepEqual(response.body, { verified: false, data: {} });
  });
});

test('ageOver18 is not disclosed when it was approved but not requested', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest('2000-04-15', ['name']);
    const response = await request('/verify/consent', { requestId, approvedFields: ['ageOver18'] });

    assert.deepEqual(response.body, { verified: false, data: {} });
  });
});

test('age disclosure history records the field name but not raw DOB', async () => {
  await withServer(async ({ createVerificationRequest, request, walletFile }) => {
    const dob = '2000-04-15';
    const { requestId } = await createVerificationRequest(dob, ['ageOver18']);
    await request('/verify/consent', { requestId, approvedFields: ['ageOver18'] });
    const wallets = JSON.parse(await fs.readFile(walletFile, 'utf8'));
    const history = wallets[0].disclosureHistory[0];

    assert.deepEqual(history.requestedFields, ['ageOver18']);
    assert.deepEqual(history.approvedFields, ['ageOver18']);
    assert.deepEqual(history.disclosedFields, ['ageOver18']);
    assert.equal(JSON.stringify(history).includes(dob), false);
  });
});

test('an invalid stored DOB produces a generic server error without disclosure', async () => {
  await withServer(async ({ createVerificationRequest, request, walletFile }) => {
    const { requestId } = await createVerificationRequest('2000-04-15', ['ageOver18']);
    const wallets = JSON.parse(await fs.readFile(walletFile, 'utf8'));
    wallets[0].credentials.dob = 'invalid-dob';
    await fs.writeFile(walletFile, JSON.stringify(wallets), 'utf8');

    const response = await request('/verify/consent', { requestId, approvedFields: ['ageOver18'] });

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'Internal server error' });
  });
});

test('name and studentId selective disclosure still works', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest('2000-04-15', ['name', 'studentId']);
    const response = await request('/verify/consent', { requestId, approvedFields: ['name', 'studentId'] });

    assert.deepEqual(response.body, {
      verified: true,
      data: { name: 'Lucky', studentId: '24CE1032' },
    });
  });
});
