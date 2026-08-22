const { getDisclosureHistory, getWallet, registerWallet } = require('../services/identityService');

async function registerIdentity(req, res, next) {
  try {
    const wallet = await registerWallet(req.body);

    res.status(201).json({
      walletId: wallet.walletId,
      status: 'ACTIVE',
    });
  } catch (error) {
    next(error);
  }
}

async function getIdentityWallet(req, res, next) {
  try {
    const wallet = await getWallet(req.params.walletId);

    res.status(200).json({
      walletId: wallet.walletId,
      credentials: wallet.credentials,
    });
  } catch (error) {
    next(error);
  }
}

async function getIdentityDisclosureHistory(req, res, next) {
  try {
    const disclosures = await getDisclosureHistory(req.params.walletId);

    res.status(200).json({ disclosures });
  } catch (error) {
    next(error);
  }
}

module.exports = { registerIdentity, getIdentityWallet, getIdentityDisclosureHistory };
