const roundStore = require('../redis/roundStore');
const logStore = require('../redis/logStore');

// In a real app we'd broadcast via socket server here
// For this design, let's keep it simple or require the socket module lazily to avoid circular dependency.
const getIO = () => {
  try {
    return require('../sockets/socketServer').getIO();
  } catch(e) {
    return null;
  }
};

class RoundService {
  async getAllRounds() {
    const order = await roundStore.getRoundsOrder();
    const rounds = await Promise.all(order.map(id => roundStore.getRound(id)));
    return rounds.filter(Boolean);
  }

  async getRound(roundId) {
    return await roundStore.getRound(roundId);
  }

  async createRound(roundData) {
    const id = roundData.id || `r_${Date.now()}`;
    const round = {
      id,
      name: roundData.name,
      status: 'pending',
      startedAt: '',
      endedAt: '',
      order: roundData.order || Date.now().toString()
    };
    await roundStore.createRound(round);
    return round;
  }

  async updateRound(roundId, updates) {
    await roundStore.updateRound(roundId, updates);
  }

  async deleteRound(roundId) {
    await roundStore.deleteRound(roundId);
  }

  async startRound(roundId, adminUsername) {
    const round = await roundStore.getRound(roundId);
    if (!round) throw new Error('Round not found');

    const startedAt = Date.now().toString();
    await roundStore.updateRound(roundId, { status: 'active', startedAt });
    await roundStore.setCurrentRound(roundId);
    await roundStore.setEventState('running', adminUsername);

    await logStore.addLog({
      action: 'START_ROUND',
      adminUsername,
      timestamp: startedAt,
      details: `Started round ${roundId}`
    });

    const io = getIO();
    if (io) {
      io.emit('round:changed', { roundId, roundData: { ...round, status: 'active', startedAt } });
    }
  }

  async pauseRound(roundId, adminUsername) {
    await roundStore.updateRound(roundId, { status: 'paused' });
    await roundStore.setEventState('paused', adminUsername);
    await logStore.addLog({
      action: 'PAUSE_ROUND',
      adminUsername,
      timestamp: Date.now().toString(),
      details: `Paused round ${roundId}`
    });

    const io = getIO();
    if (io) io.emit('round:paused', { roundId });
  }

  async resumeRound(roundId, adminUsername) {
    await roundStore.updateRound(roundId, { status: 'active' });
    await roundStore.setEventState('running', adminUsername);
    await logStore.addLog({
      action: 'RESUME_ROUND',
      adminUsername,
      timestamp: Date.now().toString(),
      details: `Resumed round ${roundId}`
    });

    const io = getIO();
    if (io) io.emit('round:resumed', { roundId });
  }

  async restartRound(roundId, adminUsername) {
    await this.startRound(roundId, adminUsername);
  }

  async endRound(roundId, adminUsername) {
    const endedAt = Date.now().toString();
    await roundStore.updateRound(roundId, { status: 'ended', endedAt });
    await logStore.addLog({
      action: 'END_ROUND',
      adminUsername,
      timestamp: endedAt,
      details: `Ended round ${roundId}`
    });

    const io = getIO();
    if (io) io.emit('round:ended', { roundId });
  }

  async resetEvent(adminUsername) {
    const order = await roundStore.getRoundsOrder();
    for (const id of order) {
      await roundStore.updateRound(id, { status: 'pending', startedAt: '', endedAt: '' });
    }
    await roundStore.setCurrentRound('');
    await roundStore.setEventState('idle', adminUsername);

    await logStore.addLog({
      action: 'RESET_EVENT',
      adminUsername,
      timestamp: Date.now().toString(),
      details: `Event reset`
    });

    const io = getIO();
    if (io) io.emit('event:reset', {});
  }

  async endEvent(adminUsername) {
    await roundStore.setEventState('ended', adminUsername);
    await logStore.addLog({
      action: 'END_EVENT',
      adminUsername,
      timestamp: Date.now().toString(),
      details: `Event ended`
    });

    const io = getIO();
    if (io) io.emit('event:ended', {});
  }

  async getCurrentRound() {
    const roundId = await roundStore.getCurrentRound();
    if (!roundId) return null;
    return await roundStore.getRound(roundId);
  }
}

module.exports = new RoundService();
