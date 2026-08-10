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

    // Ensure ONLY this round is active in Redis
    const order = await roundStore.getRoundsOrder();
    for (const rId of order) {
      if (rId === roundId) {
        await roundStore.updateRound(rId, { status: 'active', startedAt });
      } else {
        const other = await roundStore.getRound(rId);
        if (other && other.status === 'active') {
          await roundStore.updateRound(rId, { status: 'pending' });
        }
      }
    }

    await roundStore.setCurrentRound(roundId);
    await roundStore.setEventState('running', adminUsername);

    // Make sure active question is set to Q1 if not set
    const questionStore = require('../redis/questionStore');
    const questionService = require('./questionService');
    const questionsOrder = await questionStore.getQuestionsOrder(roundId);
    let activeQuestion = null;
    if (questionsOrder && questionsOrder.length > 0) {
      const currentQId = await questionStore.getActiveQuestionId(roundId);
      const qToSet = (currentQId && questionsOrder.includes(currentQId)) ? currentQId : questionsOrder[0];
      activeQuestion = await questionService.setActiveQuestion(roundId, qToSet);
    }

    await logStore.addLog({
      action: 'START_ROUND',
      adminUsername,
      timestamp: startedAt,
      details: `Started round ${roundId}`
    });

    const io = getIO();
    if (io) {
      const updatedRound = await roundStore.getRound(roundId);
      io.emit('round:changed', { roundId, roundData: updatedRound });
      io.emit('round:stage_changed', { roundId, activeStage: 'question' });
      if (activeQuestion) {
        io.emit('question:changed', { roundId, activeQuestionId: activeQuestion.id, question: activeQuestion });
      }
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
    const questionStore = require('../redis/questionStore');
    const responseStore = require('../redis/responseStore');
    const settingsStore = require('../redis/settingsStore');
    const questionService = require('./questionService');

    // 1. Clear all user responses for this round
    await responseStore.clearRoundResponses(roundId);

    // 2. Reset active stage to 'question'
    await roundStore.setActiveStage(roundId, 'question');

    // 3. Hide leaderboard
    await settingsStore.updateSettings({ showLeaderboard: 'false' });

    // 4. Set active question to Q1 (the first question in the round)
    const questionsOrder = await questionStore.getQuestionsOrder(roundId);
    let activeQuestion = null;
    if (questionsOrder && questionsOrder.length > 0) {
      activeQuestion = await questionService.setActiveQuestion(roundId, questionsOrder[0]);
    }

    // 5. Always start this round as the active round
    await this.startRound(roundId, adminUsername);

    // 6. Broadcast socket events so client devices immediately reset to Q1
    const io = getIO();
    if (io) {
      io.emit('round:stage_changed', { roundId, activeStage: 'question' });
      io.emit('settings:updated', { showLeaderboard: false });
      if (activeQuestion) {
        io.emit('question:changed', { roundId, activeQuestionId: questionsOrder[0], question: activeQuestion });
      }
      io.emit('responses:cleared', { roundId });
    }

    await logStore.addLog({
      action: 'RESTART_ROUND',
      adminUsername,
      timestamp: Date.now().toString(),
      details: `Restarted round ${roundId} from start`
    });
  }

  async clearRoundResponses(roundId, adminUsername) {
    const responseStore = require('../redis/responseStore');
    const questionStore = require('../redis/questionStore');
    const questionService = require('./questionService');

    // 1. Clear all user responses for this round
    await responseStore.clearRoundResponses(roundId);

    // 2. Reset active stage to 'question'
    await roundStore.setActiveStage(roundId, 'question');

    // 3. Reset active question to Q1
    const questionsOrder = await questionStore.getQuestionsOrder(roundId);
    let activeQuestion = null;
    if (questionsOrder && questionsOrder.length > 0) {
      activeQuestion = await questionService.setActiveQuestion(roundId, questionsOrder[0]);
    }

    // 4. Broadcast socket events
    const io = getIO();
    if (io) {
      io.emit('round:stage_changed', { roundId, activeStage: 'question' });
      if (activeQuestion) {
        io.emit('question:changed', { roundId, activeQuestionId: questionsOrder[0], question: activeQuestion });
      }
      io.emit('responses:cleared', { roundId });
    }

    await logStore.addLog({
      action: 'CLEAR_ROUND_RESPONSES',
      adminUsername,
      timestamp: Date.now().toString(),
      details: `Cleared all responses for round ${roundId}`
    });

    return { message: `Responses cleared for round ${roundId}` };
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

    // --- Sequential Progression: Auto-advance to the next round in sequence ---
    const order = await roundStore.getRoundsOrder();
    const currentIndex = order.indexOf(roundId);

    if (currentIndex >= 0 && currentIndex < order.length - 1) {
      const nextRoundId = order[currentIndex + 1];
      console.log(`[roundService] Sequential progression: Round ${roundId} ended -> Auto-starting ${nextRoundId}`);
      setTimeout(async () => {
        try {
          await this.restartRound(nextRoundId, adminUsername || 'system');
          await logStore.addLog({
            action: 'AUTO_ADVANCE_ROUND',
            adminUsername,
            timestamp: Date.now().toString(),
            details: `Sequential auto-advance from ${roundId} to ${nextRoundId}`
          });
        } catch (err) {
          console.error(`[roundService] Failed to auto-advance to ${nextRoundId}:`, err.message);
        }
      }, 1500);
    } else {
      console.log(`[roundService] Final round ${roundId} ended. Ending event.`);
      await this.endEvent(adminUsername || 'system');
    }
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

  async extendRoundTime(roundId, extraSeconds, adminUsername) {
    const round = await roundStore.getRound(roundId);
    if (!round) throw new Error('Round not found');

    const secondsToAdd = parseInt(extraSeconds) || 30;
    const newDurationSeconds = (parseInt(round.durationSeconds) || 300) + secondsToAdd;

    await roundStore.updateRound(roundId, { durationSeconds: newDurationSeconds.toString() });

    await logStore.addLog({
      action: 'EXTEND_ROUND_TIME',
      adminUsername,
      timestamp: Date.now().toString(),
      details: `Added +${secondsToAdd}s to round ${roundId} (total: ${newDurationSeconds}s)`
    });

    const updatedRound = { ...round, durationSeconds: newDurationSeconds };

    const io = getIO();
    if (io) {
      io.emit('round:time_extended', {
        roundId,
        extraSeconds: secondsToAdd,
        newDurationSeconds,
        startedAt: round.startedAt,
        roundData: updatedRound
      });
      io.emit('round:changed', { roundId, roundData: updatedRound });
    }

    return updatedRound;
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
    if (roundId) {
      const r = await roundStore.getRound(roundId);
      if (r) return r;
    }
    const rounds = await this.getAllRounds();
    return rounds.find(r => r.status === 'active') || null;
  }
}

module.exports = new RoundService();
