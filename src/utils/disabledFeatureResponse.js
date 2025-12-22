const { APP_VERSION } = require('../config/appVersion');

const disabledFeatureHandler = (featureName) => (req, res) => {
  res.status(501).json({
    status: 'disabled',
    version: APP_VERSION,
    feature: featureName,
  });
};

module.exports = {
  disabledFeatureHandler,
};
