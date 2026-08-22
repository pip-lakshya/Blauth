const express = require('express');

const { registerIdentity } = require('../controllers/identityController');

const router = express.Router();

router.post('/register', registerIdentity);

module.exports = router;
