const assert = require('assert/strict');
const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');

const app = require('../src/app');

const validCredentials = {
  name: 'Lucky',
  studentId: '24CE1032',
  email: 'lucky@example.com',
  phone: '9876543210',
  dob: '2005-04-15',
};

async function withServer(run) {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'blauth-test-'));
  process.env.WALLET_DATA_FILE = path.join(tempDirectory, 'wallets.json');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  async function request(body) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const clientRequest = http.request(
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

  async function get(pathname) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}${pathname}`, (response) => {
        let responseBody = '';
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(responseBody) }));
      }).on('error', reject);
    });
  }

  try {
    await run({ request, get, dataFile: process.env.WALLET_DATA_FILE });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    delete process.env.WALLET_DATA_FILE;
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

function registrationPayload(credentials = validCredentials, verified = true) {
  return { verified, credentials };
}

test('successful registration creates an active wallet without exposing credentials', async () => {
  await withServer(async ({ request }) => {
    const response = await request(registrationPayload());

    assert.equal(response.status, 201);
    assert.match(response.body.walletId, /^wallet_/);
    assert.deepEqual(Object.keys(response.body).sort(), ['status', 'walletId']);
    assert.equal(response.body.status, 'ACTIVE');
  });
});

test('successful registration persists the complete wallet record', async () => {
  await withServer(async ({ request, dataFile }) => {
    const response = await request(registrationPayload());
    const wallets = JSON.parse(await fs.readFile(dataFile, 'utf8'));

    assert.equal(wallets.length, 1);
    assert.deepEqual(wallets[0], {
      walletId: response.body.walletId,
      credentials: validCredentials,
      createdAt: wallets[0].createdAt,
      disclosureHistory: [],
    });
    assert.equal(new Date(wallets[0].createdAt).toISOString(), wallets[0].createdAt);
  });
});

test('GET /identity/:walletId returns only the requested wallet credentials', async () => {
  await withServer(async ({ get, request }) => {
    const registration = await request(registrationPayload());
    const response = await get(`/identity/${registration.body.walletId}`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      walletId: registration.body.walletId,
      credentials: validCredentials,
    });
  });
});

test('GET /identity/:walletId returns 404 for an unknown wallet', async () => {
  await withServer(async ({ get }) => {
    const response = await get('/identity/wallet_unknown');

    assert.equal(response.status, 404);
  });
});

test('two successful registrations receive different wallet IDs', async () => {
  await withServer(async ({ request, dataFile }) => {
    const first = await request(registrationPayload());
    const second = await request(registrationPayload());
    const wallets = JSON.parse(await fs.readFile(dataFile, 'utf8'));

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.notEqual(first.body.walletId, second.body.walletId);
    assert.equal(wallets.length, 2);
  });
});

test('registration rejects verified=false', async () => {
  await withServer(async ({ request, dataFile }) => {
    assert.equal((await request(registrationPayload(validCredentials, false))).status, 400);
    await assert.rejects(fs.access(dataFile));
  });
});

test('registration rejects a non-boolean verified value', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request(registrationPayload(validCredentials, 'true'))).status, 400);
  });
});

test('registration rejects missing verified', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request({ credentials: validCredentials })).status, 400);
  });
});

test('registration rejects missing credentials', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request({ verified: true })).status, 400);
  });
});

test('registration rejects a missing name', async () => {
  await withServer(async ({ request }) => {
    const { name, ...credentials } = validCredentials;
    assert.equal((await request(registrationPayload(credentials))).status, 400);
  });
});

test('registration rejects an empty name', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request(registrationPayload({ ...validCredentials, name: '   ' }))).status, 400);
  });
});

test('registration rejects a missing studentId', async () => {
  await withServer(async ({ request }) => {
    const { studentId, ...credentials } = validCredentials;
    assert.equal((await request(registrationPayload(credentials))).status, 400);
  });
});

test('registration rejects an empty studentId', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request(registrationPayload({ ...validCredentials, studentId: '' }))).status, 400);
  });
});

test('registration rejects an invalid email', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request(registrationPayload({ ...validCredentials, email: 'invalid' }))).status, 400);
  });
});

test('registration rejects a missing phone', async () => {
  await withServer(async ({ request }) => {
    const { phone, ...credentials } = validCredentials;
    assert.equal((await request(registrationPayload(credentials))).status, 400);
  });
});

test('registration rejects an invalid phone format', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request(registrationPayload({ ...validCredentials, phone: 'not-a-phone' }))).status, 400);
  });
});

test('registration rejects credentials with the wrong type', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request({ verified: true, credentials: 'credentials' })).status, 400);
  });
});

test('registration rejects a missing DOB', async () => {
  await withServer(async ({ request }) => {
    const { dob, ...credentials } = validCredentials;
    assert.equal((await request(registrationPayload(credentials))).status, 400);
  });
});

test('registration rejects an incorrectly formatted DOB', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request(registrationPayload({ ...validCredentials, dob: '15-04-2005' }))).status, 400);
  });
});

test('registration rejects an invalid calendar DOB', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request(registrationPayload({ ...validCredentials, dob: '2005-02-30' }))).status, 400);
  });
});

test('registration rejects a future DOB', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request(registrationPayload({ ...validCredentials, dob: '2999-01-01' }))).status, 400);
  });
});

const unexpectedCredentialFields = [
  'campus',
  'faceImage',
  'faceEmbedding',
  'faceDescriptor',
  'biometricTemplate',
  'image',
  'video',
  'cameraFrame',
];

for (const field of unexpectedCredentialFields) {
  test(`registration rejects unexpected credential field: ${field}`, async () => {
    await withServer(async ({ request, dataFile }) => {
      const response = await request(registrationPayload({ ...validCredentials, [field]: 'unexpected-data' }));

      assert.equal(response.status, 400);
      await assert.rejects(fs.access(dataFile));
    });
  });
}

test('storage failures return only a generic 500 response', async () => {
  await withServer(async ({ request, dataFile }) => {
    await fs.mkdir(dataFile);
    const response = await request(registrationPayload());

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'Internal server error' });
  });
});

test('GET /health returns the expected response', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/health`, (healthResponse) => {
        let body = '';
        healthResponse.on('data', (chunk) => {
          body += chunk;
        });
        healthResponse.on('end', () => resolve({ status: healthResponse.statusCode, body: JSON.parse(body) }));
      }).on('error', reject);
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: 'ok', service: 'BLAuth backend' });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
