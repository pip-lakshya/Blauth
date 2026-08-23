const express = require('express');

const { createApp, createDeveloperVerificationRequest } = require('../controllers/developerController');
const { developerAuthentication } = require('../middleware/developerAuthentication');

const router = express.Router();

router.post('/apps', createApp);
router.post('/verify', developerAuthentication, createDeveloperVerificationRequest);

module.exports = router;
