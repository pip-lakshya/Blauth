const { authenticateDeveloperApp } = require('../services/developerAppService');

async function developerAuthentication(req, res, next) {
  try {
    const apiKey = req.get('X-BLAuth-API-Key');
    const apiSecret = req.get('X-BLAuth-API-Secret');
    const developerApp = await authenticateDeveloperApp(apiKey, apiSecret);

    if (!developerApp) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.developerApp = developerApp;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { developerAuthentication };
