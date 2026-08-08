const { getIO: getBaseIO } = require('../config/socket');

const getIO = () => {
  try {
    return getBaseIO();
  } catch (e) {
    return null;
  }
};

module.exports = { getIO };
