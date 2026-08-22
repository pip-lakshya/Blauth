const express = require('express');

const { requestVerification } = require('../controllers/verificationController');

const router = express.Router();

router.post('/request', requestVerification);

module.exports = router;
