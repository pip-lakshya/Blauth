const { registerWallet } = require('../services/identityService');

async function registerIdentity(req, res, next) {
  try {
    const { wallet, blockchainProof } = await registerWallet(req.body);

    const response = {
      walletId: wallet.walletId,
      status: 'ACTIVE',
    };

    if (blockchainProof) {
      response.blockchain = {
        credentialHash: blockchainProof.credentialHash,
        transactionHash: blockchainProof.transactionHash,
      };
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

module.exports = { registerIdentity };
