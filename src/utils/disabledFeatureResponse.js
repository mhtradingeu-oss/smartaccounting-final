const { version } = require('../config/appVersion');

const disabledFeatureHandler = (featureName) => (req, res) => {
  res.status(501).json({
    status: 'disabled',
    version,
    feature: featureName,
  });
};

module.exports = {
  disabledFeatureHandler,
};
