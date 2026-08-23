const { authenticateBiometricCommitment, getDisclosureHistory, getWallet, registerWallet } = require('../services/identityService');

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

async function authenticateIdentity(req, res, next) {
  try {
    const proof = await authenticateBiometricCommitment(req.body && req.body.biometricCommitment);
    res.status(200).json(proof);
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

module.exports = { authenticateIdentity, registerIdentity, getIdentityWallet, getIdentityDisclosureHistory };
