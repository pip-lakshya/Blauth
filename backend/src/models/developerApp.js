function createDeveloperApp({ appId, name, apiKey, apiSecretHash }) {
  return {
    appId,
    name,
    apiKey,
    apiSecretHash,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE',
  };
}

module.exports = { createDeveloperApp };
