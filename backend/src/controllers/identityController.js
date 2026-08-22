const { registerWallet } = require('../services/identityService');

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

module.exports = { registerIdentity };
