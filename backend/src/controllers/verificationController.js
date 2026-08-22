const { createVerificationRequest, processConsent } = require('../services/verificationService');

async function requestVerification(req, res, next) {
  try {
    const verificationRequest = await createVerificationRequest(req.body);
    res.status(201).json({ requestId: verificationRequest.requestId });
  } catch (error) {
    next(error);
  }
}

async function submitConsent(req, res, next) {
  try {
    const result = await processConsent(req.body);
    res.status(200).json({
      verified: result.outcome === 'APPROVED',
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { requestVerification, submitConsent };
