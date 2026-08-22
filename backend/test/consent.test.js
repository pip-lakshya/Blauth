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
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'blauth-consent-test-'));
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

  async function get(endpoint) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}${endpoint}`, (response) => {
        let responseBody = '';
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(responseBody) }));
      }).on('error', reject);
    });
  }

  async function createVerificationRequest(requestedFields) {
    const registration = await request('/identity/register', { verified: true, credentials });
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
    await run({ createVerificationRequest, get, request, requestFile, walletFile });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    delete process.env.WALLET_DATA_FILE;
    delete process.env.VERIFICATION_REQUEST_DATA_FILE;
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

function consentPayload(requestId, approvedFields) {
  return { requestId, approvedFields };
}

test('approving requested name and studentId returns only those fields', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name', 'studentId']);
    const response = await request('/verify/consent', consentPayload(requestId, ['name', 'studentId']));

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      verified: true,
      data: { name: 'Lucky', studentId: '24CE1032' },
    });
  });
});

test('approving only name returns only name', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name', 'studentId', 'email']);
    const response = await request('/verify/consent', consentPayload(requestId, ['name']));

    assert.deepEqual(response.body, { verified: true, data: { name: 'Lucky' } });
  });
});

test('an approved field that was not requested is never disclosed', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name', 'studentId']);
    const response = await request('/verify/consent', consentPayload(requestId, ['email']));

    assert.deepEqual(response.body, { verified: false, data: {} });
    assert.equal('email' in response.body.data, false);
  });
});

test('extra approved fields are removed from the actual disclosure', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name', 'studentId']);
    const response = await request('/verify/consent', consentPayload(requestId, ['name', 'studentId', 'email']));

    assert.deepEqual(response.body, {
      verified: true,
      data: { name: 'Lucky', studentId: '24CE1032' },
    });
  });
});

test('rejects an unknown requestId', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request('/verify/consent', consentPayload('req_unknown', []))).status, 404);
  });
});

test('rejects a missing requestId', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request('/verify/consent', { approvedFields: [] })).status, 400);
  });
});

test('rejects missing approvedFields', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name']);
    assert.equal((await request('/verify/consent', { requestId })).status, 400);
  });
});

test('rejects approvedFields with the wrong type', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name']);
    assert.equal((await request('/verify/consent', consentPayload(requestId, 'name'))).status, 400);
  });
});

test('rejects duplicate approved fields', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name']);
    assert.equal((await request('/verify/consent', consentPayload(requestId, ['name', 'name']))).status, 400);
  });
});

test('rejects unknown approved fields', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name']);
    assert.equal((await request('/verify/consent', consentPayload(requestId, ['address']))).status, 400);
  });
});

test('an empty approval denies the request without disclosing data', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name']);
    const response = await request('/verify/consent', consentPayload(requestId, []));

    assert.deepEqual(response.body, { verified: false, data: {} });
  });
});

test('an approved request cannot be reused', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name']);
    assert.equal((await request('/verify/consent', consentPayload(requestId, ['name']))).status, 200);
    assert.equal((await request('/verify/consent', consentPayload(requestId, ['name']))).status, 409);
  });
});

test('a denied request cannot be reused', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name']);
    assert.equal((await request('/verify/consent', consentPayload(requestId, []))).status, 200);
    assert.equal((await request('/verify/consent', consentPayload(requestId, ['name']))).status, 409);
  });
});

test('completed consent creates disclosure history', async () => {
  await withServer(async ({ createVerificationRequest, request, walletFile }) => {
    const { requestId, walletId } = await createVerificationRequest(['name']);
    await request('/verify/consent', consentPayload(requestId, ['name']));
    const wallets = JSON.parse(await fs.readFile(walletFile, 'utf8'));

    assert.equal(wallets[0].walletId, walletId);
    assert.equal(wallets[0].disclosureHistory.length, 1);
    assert.equal(wallets[0].disclosureHistory[0].requestId, requestId);
  });
});

test('college portal shares only name and studentId and records all protected fields as withheld', async () => {
  await withServer(async ({ createVerificationRequest, get, request }) => {
    const { requestId, walletId } = await createVerificationRequest(['name', 'studentId']);
    const response = await request('/verify/consent', consentPayload(requestId, ['name', 'studentId']));
    const history = await get(`/identity/${walletId}/disclosures`);

    assert.deepEqual(response.body, {
      verified: true,
      data: { name: 'Lucky', studentId: '24CE1032' },
    });
    assert.equal('email' in response.body.data, false);
    assert.equal('dob' in response.body.data, false);
    assert.equal('phone' in response.body.data, false);
    assert.deepEqual(history.body.disclosures[0].sharedFields, ['name', 'studentId']);
    assert.deepEqual(history.body.disclosures[0].withheldFields, ['email', 'dob', 'phone']);
    assert.equal(JSON.stringify(history.body).includes(credentials.dob), false);
  });
});

test('GET /identity/:walletId/disclosures returns a privacy-safe history record', async () => {
  await withServer(async ({ createVerificationRequest, get, request }) => {
    const { requestId, walletId } = await createVerificationRequest(['name', 'studentId']);
    await request('/verify/consent', consentPayload(requestId, ['name']));
    const response = await get(`/identity/${walletId}/disclosures`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.disclosures, [{
      verifier: 'college-portal',
      sharedFields: ['name'],
      withheldFields: ['studentId', 'email', 'dob', 'phone'],
      timestamp: response.body.disclosures[0].timestamp,
      requestId,
    }]);
    assert.equal(JSON.stringify(response.body).includes(credentials.name), false);
    assert.equal(JSON.stringify(response.body).includes(credentials.dob), false);
  });
});

test('GET /identity/:walletId/disclosures returns 404 for an unknown wallet', async () => {
  await withServer(async ({ get }) => {
    assert.equal((await get('/identity/wallet_unknown/disclosures')).status, 404);
  });
});

test('disclosure history contains field names but not credential values', async () => {
  await withServer(async ({ createVerificationRequest, request, walletFile }) => {
    const { requestId } = await createVerificationRequest(['name', 'studentId', 'email']);
    await request('/verify/consent', consentPayload(requestId, ['name', 'studentId']));
    const wallets = JSON.parse(await fs.readFile(walletFile, 'utf8'));
    const history = wallets[0].disclosureHistory[0];
    const historyText = JSON.stringify(history);

    assert.deepEqual(history.requestedFields, ['name', 'studentId', 'email']);
    assert.equal(historyText.includes(credentials.name), false);
    assert.equal(historyText.includes(credentials.studentId), false);
    assert.equal(historyText.includes(credentials.email), false);
    assert.equal(historyText.includes(credentials.phone), false);
    assert.equal(historyText.includes(credentials.dob), false);
  });
});

test('disclosure history records withheld fields correctly', async () => {
  await withServer(async ({ createVerificationRequest, request, walletFile }) => {
    const { requestId } = await createVerificationRequest(['name', 'studentId', 'email']);
    await request('/verify/consent', consentPayload(requestId, ['name', 'studentId']));
    const wallets = JSON.parse(await fs.readFile(walletFile, 'utf8'));
    const history = wallets[0].disclosureHistory[0];

    assert.deepEqual(history.disclosedFields, ['name', 'studentId']);
    assert.deepEqual(history.withheldFields, ['email']);
  });
});

test('a successful response never contains wallet credentials or unapproved DOB', async () => {
  await withServer(async ({ createVerificationRequest, request }) => {
    const { requestId } = await createVerificationRequest(['name', 'email']);
    const response = await request('/verify/consent', consentPayload(requestId, ['name']));

    assert.deepEqual(Object.keys(response.body).sort(), ['data', 'verified']);
    assert.deepEqual(response.body.data, { name: 'Lucky' });
    assert.equal('credentials' in response.body, false);
    assert.equal('dob' in response.body.data, false);
  });
});
