const settingsStore = require('../redis/settingsStore');
const logStore = require('../redis/logStore');

const getIO = () => {
  try {
    return require('../sockets/socketServer').getIO();
  } catch(e) {
    return null;
  }
};

class SettingsService {
  async getSettings() {
    return await settingsStore.getSettings();
  }

  async updateSettings(settings, adminUsername) {
    await settingsStore.updateSettings(settings);
    
    await logStore.addLog({
      action: 'UPDATE_SETTINGS',
      adminUsername,
      timestamp: Date.now().toString(),
      details: 'Event settings updated'
    });

    const io = getIO();
    if (io) {
      io.emit('settings:updated', settings);
    }
  }
}

module.exports = new SettingsService();
