const { createVerificationRequest } = require('../services/verificationService');

async function requestVerification(req, res, next) {
  try {
    const verificationRequest = await createVerificationRequest(req.body);
    res.status(201).json({ requestId: verificationRequest.requestId });
  } catch (error) {
    next(error);
  }
}

module.exports = { requestVerification };
