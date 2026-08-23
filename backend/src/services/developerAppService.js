const crypto = require('crypto');

const { createDeveloperApp: createDeveloperAppRecord } = require('../models/developerApp');
const { validateDeveloperApp } = require('../utils/validation');
const { getDeveloperAppStore } = require('./developerAppStore');

function generateToken(prefix) {
  return `${prefix}${crypto.randomBytes(32).toString('base64url')}`;
}

function hashApiSecret(apiSecret) {
  return crypto.createHash('sha256').update(apiSecret, 'utf8').digest('hex');
}

function secretsMatch(apiSecret, apiSecretHash) {
  const suppliedHash = Buffer.from(hashApiSecret(apiSecret), 'hex');
  const storedHash = Buffer.from(apiSecretHash, 'hex');

  return suppliedHash.length === storedHash.length && crypto.timingSafeEqual(suppliedHash, storedHash);
}

async function createDeveloperApp(payload) {
  const name = validateDeveloperApp(payload);
  const { v4: createUuid } = await import('uuid');
  const apiKey = generateToken('blauth_pk_');
  const apiSecret = generateToken('blauth_sk_');
  const app = createDeveloperAppRecord({
    appId: `app_${createUuid()}`,
    name,
    apiKey,
    apiSecretHash: hashApiSecret(apiSecret),
  });

  await getDeveloperAppStore().save(app);
  return {
    appId: app.appId,
    name: app.name,
    apiKey: app.apiKey,
    apiSecret,
  };
}

async function authenticateDeveloperApp(apiKey, apiSecret) {
  if (typeof apiKey !== 'string' || apiKey.trim() === '' || typeof apiSecret !== 'string' || apiSecret === '') {
    return null;
  }

  const app = await getDeveloperAppStore().findByApiKey(apiKey);
  if (!app || app.status !== 'ACTIVE' || !secretsMatch(apiSecret, app.apiSecretHash)) {
    return null;
  }

  return {
    appId: app.appId,
    name: app.name,
    apiKey: app.apiKey,
    status: app.status,
  };
}

module.exports = { authenticateDeveloperApp, createDeveloperApp, hashApiSecret };
