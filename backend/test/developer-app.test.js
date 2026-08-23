const assert = require('assert/strict');
const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');

const app = require('../src/app');

async function withServer(run) {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'blauth-developer-test-'));
  const developerAppFile = path.join(tempDirectory, 'developer-apps.json');
  const walletFile = path.join(tempDirectory, 'wallets.json');
  const requestFile = path.join(tempDirectory, 'verification-requests.json');
  process.env.DEVELOPER_APP_DATA_FILE = developerAppFile;
  process.env.WALLET_DATA_FILE = walletFile;
  process.env.VERIFICATION_REQUEST_DATA_FILE = requestFile;
  const server = http.createServer(app);

  await fs.writeFile(walletFile, JSON.stringify([{
    walletId: 'wallet_developer_test',
    credentials: {
      name: 'Lucky',
      studentId: '24CE1032',
      email: 'lucky@example.com',
      phone: '9876543210',
      dob: '2005-04-15',
    },
    createdAt: new Date().toISOString(),
    disclosureHistory: [],
  }]), 'utf8');
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  async function request(method, endpoint, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const clientRequest = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: endpoint,
          method,
          headers: {
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...headers,
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

  async function createApp(name = 'Demo College Portal') {
    const response = await request('POST', '/developer/apps', { name });
    assert.equal(response.status, 201);
    return response.body;
  }

  try {
    await run({ createApp, developerAppFile, request, requestFile, walletFile });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    delete process.env.DEVELOPER_APP_DATA_FILE;
    delete process.env.WALLET_DATA_FILE;
    delete process.env.VERIFICATION_REQUEST_DATA_FILE;
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

function developerHeaders(appRecord) {
  return {
    'X-BLAuth-API-Key': appRecord.apiKey,
    'X-BLAuth-API-Secret': appRecord.apiSecret,
  };
}

test('creates a developer application and returns its secret once', async () => {
  await withServer(async ({ createApp }) => {
    const appRecord = await createApp();

    assert.match(appRecord.appId, /^app_/);
    assert.equal(appRecord.name, 'Demo College Portal');
    assert.match(appRecord.apiKey, /^blauth_pk_/);
    assert.match(appRecord.apiSecret, /^blauth_sk_/);
  });
});

test('developer app IDs and API keys are unique', async () => {
  await withServer(async ({ createApp }) => {
    const first = await createApp('First App');
    const second = await createApp('Second App');

    assert.notEqual(first.appId, second.appId);
    assert.notEqual(first.apiKey, second.apiKey);
  });
});

test('stores only a hash of the API secret', async () => {
  await withServer(async ({ createApp, developerAppFile }) => {
    const appRecord = await createApp();
    const storedApps = JSON.parse(await fs.readFile(developerAppFile, 'utf8'));

    assert.deepEqual(Object.keys(storedApps[0]).sort(), ['apiKey', 'apiSecretHash', 'appId', 'createdAt', 'name', 'status']);
    assert.notEqual(storedApps[0].apiSecretHash, appRecord.apiSecret);
    assert.equal(JSON.stringify(storedApps).includes(appRecord.apiSecret), false);
  });
});

test('the API secret is not returned by later endpoints', async () => {
  await withServer(async ({ createApp, request }) => {
    const appRecord = await createApp();
    const response = await request('GET', '/developer/apps');

    assert.equal(response.status, 404);
    assert.equal(JSON.stringify(response.body).includes(appRecord.apiSecret), false);
  });
});

test('rejects missing and invalid application names', async () => {
  await withServer(async ({ request }) => {
    assert.equal((await request('POST', '/developer/apps', {})).status, 400);
    assert.equal((await request('POST', '/developer/apps', { name: 123 })).status, 400);
    assert.equal((await request('POST', '/developer/apps', { name: '   ' })).status, 400);
  });
});

test('rejects missing API credentials', async () => {
  await withServer(async ({ request }) => {
    const body = { walletId: 'wallet_developer_test', requestedFields: ['name'] };
    assert.equal((await request('POST', '/developer/verify', body)).status, 401);
    assert.equal((await request('POST', '/developer/verify', body, { 'X-BLAuth-API-Key': 'blauth_pk_test' })).status, 401);
    assert.equal((await request('POST', '/developer/verify', body, { 'X-BLAuth-API-Secret': 'blauth_sk_test' })).status, 401);
  });
});

test('rejects invalid API key and API secret', async () => {
  await withServer(async ({ createApp, request }) => {
    const appRecord = await createApp();
    const body = { walletId: 'wallet_developer_test', requestedFields: ['name'] };
    assert.equal((await request('POST', '/developer/verify', body, {
      ...developerHeaders(appRecord),
      'X-BLAuth-API-Key': 'blauth_pk_invalid',
    })).status, 401);
    assert.equal((await request('POST', '/developer/verify', body, {
      ...developerHeaders(appRecord),
      'X-BLAuth-API-Secret': 'blauth_sk_invalid',
    })).status, 401);
  });
});

test('rejects inactive developer applications', async () => {
  await withServer(async ({ createApp, developerAppFile, request }) => {
    const appRecord = await createApp();
    const storedApps = JSON.parse(await fs.readFile(developerAppFile, 'utf8'));
    storedApps[0].status = 'INACTIVE';
    await fs.writeFile(developerAppFile, JSON.stringify(storedApps), 'utf8');

    const response = await request(
      'POST',
      '/developer/verify',
      { walletId: 'wallet_developer_test', requestedFields: ['name'] },
      developerHeaders(appRecord),
    );
    assert.equal(response.status, 401);
  });
});

test('an authenticated developer creates a pending verification request without disclosure', async () => {
  await withServer(async ({ createApp, request, requestFile, walletFile }) => {
    const appRecord = await createApp();
    const response = await request(
      'POST',
      '/developer/verify',
      { walletId: 'wallet_developer_test', requestedFields: ['name', 'studentId'] },
      developerHeaders(appRecord),
    );
    const requests = JSON.parse(await fs.readFile(requestFile, 'utf8'));
    const wallets = JSON.parse(await fs.readFile(walletFile, 'utf8'));

    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(response.body), ['requestId']);
    assert.equal(requests[0].status, 'PENDING');
    assert.equal(requests[0].verifierId, appRecord.appId);
    assert.deepEqual(wallets[0].disclosureHistory, []);
    assert.equal('credentials' in response.body, false);
  });
});

test('developer records never contain user credentials', async () => {
  await withServer(async ({ createApp, developerAppFile }) => {
    await createApp();
    const storedText = await fs.readFile(developerAppFile, 'utf8');

    for (const value of ['Lucky', '24CE1032', 'lucky@example.com', '9876543210', '2005-04-15']) {
      assert.equal(storedText.includes(value), false);
    }
  });
});

test('developer app creation never logs API secrets', async () => {
  await withServer(async ({ createApp }) => {
    const logMessages = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...values) => logMessages.push(values.join(' '));
    console.error = (...values) => logMessages.push(values.join(' '));

    try {
      const appRecord = await createApp();
      assert.equal(logMessages.join('\n').includes(appRecord.apiSecret), false);
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });
});
