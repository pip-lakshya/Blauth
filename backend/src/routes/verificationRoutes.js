const express = require('express');

const { requestVerification, submitConsent } = require('../controllers/verificationController');

const router = express.Router();

router.post('/request', requestVerification);
router.post('/consent', submitConsent);

module.exports = router;
