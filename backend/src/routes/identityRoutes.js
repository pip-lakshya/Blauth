const express = require('express');

const { authenticateIdentity, getIdentityDisclosureHistory, getIdentityWallet, registerIdentity } = require('../controllers/identityController');

const router = express.Router();

router.post('/register', registerIdentity);
router.post('/authenticate', authenticateIdentity);
router.get('/:walletId/disclosures', getIdentityDisclosureHistory);
router.get('/:walletId', getIdentityWallet);

module.exports = router;
