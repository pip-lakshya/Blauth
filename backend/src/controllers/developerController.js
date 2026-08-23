const { createDeveloperApp } = require('../services/developerAppService');
const { createVerificationRequest } = require('../services/verificationService');

async function createApp(req, res, next) {
  try {
    const app = await createDeveloperApp(req.body);
    res.status(201).json(app);
  } catch (error) {
    next(error);
  }
}

async function createDeveloperVerificationRequest(req, res, next) {
  try {
    const verificationRequest = await createVerificationRequest({
      walletId: req.body && req.body.walletId,
      verifierId: req.developerApp.appId,
      requestedFields: req.body && req.body.requestedFields,
    });

    res.status(201).json({ requestId: verificationRequest.requestId });
  } catch (error) {
    next(error);
  }
}

module.exports = { createApp, createDeveloperVerificationRequest };
