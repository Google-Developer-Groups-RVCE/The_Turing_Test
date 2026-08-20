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

  async reorderRounds(orderedIds) {
    await roundStore.reorderRounds(orderedIds);
    const io = getIO();
    if (io && orderedIds && orderedIds.length > 0) {
      io.emit('round:changed', { roundId: orderedIds[0] });
    }
  }

  async startRound(roundId, adminUsername) {
    const targetRound = await roundStore.getRound(roundId);
    if (!targetRound) throw new Error('Round not found');

    const order = await roundStore.getRoundsOrder();
    const currentActiveId = await roundStore.getCurrentRound();
    const currentActiveRound = currentActiveId ? await roundStore.getRound(currentActiveId) : null;

    // Priority Check: If a round with higher priority (lower index in order) is currently active, queue targetRound instead of cutting off higher priority
    if (currentActiveRound && currentActiveRound.status === 'active' && currentActiveRound.id !== roundId) {
      const targetIndex = order.indexOf(roundId);
      const currentIndex = order.indexOf(currentActiveRound.id);

      if (currentIndex < targetIndex) {
        // Lower priority round started while higher priority round is running -> queue it!
        await roundStore.updateRound(roundId, { status: 'queued' });
        await logStore.addLog({
          action: 'QUEUE_ROUND',
          adminUsername,
          timestamp: Date.now().toString(),
          details: `Queued round ${roundId} to auto-start after ${currentActiveRound.id}`
        });
        const io = getIO();
        if (io) io.emit('round:changed', { roundId: currentActiveRound.id });
        return { message: `Round queued. ${currentActiveRound.name} is currently running with priority.` };
      }
    }

    const startedAt = Date.now().toString();

    // Set target round to active
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
    const leaderboardService = require('./leaderboardService');

    // 1. Clear all user responses for this round
    await responseStore.clearRoundResponses(roundId);

    // 2. Recalculate leaderboard so cleared responses are removed from scores
    await leaderboardService.recalculateLeaderboard(adminUsername);

    // 3. Reset active stage to 'question'
    await roundStore.setActiveStage(roundId, 'question');

    // 4. Hide leaderboard
    await settingsStore.updateSettings({ showLeaderboard: 'false' });

    // 5. Set active question to Q1 (the first question in the round)
    const questionsOrder = await questionStore.getQuestionsOrder(roundId);
    let activeQuestion = null;
    if (questionsOrder && questionsOrder.length > 0) {
      activeQuestion = await questionService.setActiveQuestion(roundId, questionsOrder[0]);
    }

    // 6. Always start this round as the active round
    await this.startRound(roundId, adminUsername);

    // 7. Broadcast socket events so client devices immediately reset to Q1
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
    const leaderboardService = require('./leaderboardService');

    // 1. Clear all user responses for this round
    await responseStore.clearRoundResponses(roundId);

    // 2. Recalculate leaderboard so cleared responses are removed from scores
    await leaderboardService.recalculateLeaderboard(adminUsername);

    // 3. Reset active stage to 'question'
    await roundStore.setActiveStage(roundId, 'question');

    // 4. Reset active question to Q1
    const questionsOrder = await questionStore.getQuestionsOrder(roundId);
    let activeQuestion = null;
    if (questionsOrder && questionsOrder.length > 0) {
      activeQuestion = await questionService.setActiveQuestion(roundId, questionsOrder[0]);
    }

    // 5. Broadcast socket events
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

    // --- Priority Progression: Check if next round is queued or active ---
    const order = await roundStore.getRoundsOrder();
    const currentIndex = order.indexOf(roundId);

    let nextToRun = null;
    if (currentIndex >= 0) {
      for (let i = currentIndex + 1; i < order.length; i++) {
        const r = await roundStore.getRound(order[i]);
        if (r && (r.status === 'queued' || r.status === 'active')) {
          nextToRun = r;
          break;
        }
      }
    }

    if (nextToRun) {
      console.log(`[roundService] Priority progression: Round ${roundId} ended -> Auto-starting ${nextToRun.id}`);
      setTimeout(async () => {
        try {
          await this.restartRound(nextToRun.id, adminUsername || 'system');
          await logStore.addLog({
            action: 'AUTO_ADVANCE_ROUND',
            adminUsername,
            timestamp: Date.now().toString(),
            details: `Priority auto-advance from ${roundId} to ${nextToRun.id}`
          });
        } catch (err) {
          console.error(`[roundService] Failed to auto-advance to ${nextToRun.id}:`, err.message);
        }
      }, 1500);
    } else {
      console.log(`[roundService] Round ${roundId} ended. No queued round next.`);
      await roundStore.setEventState('idle', adminUsername);
    }
  }

  async resetEvent(adminUsername) {
    const responseStore = require('../redis/responseStore');
    const leaderboardService = require('./leaderboardService');
    const questionStore = require('../redis/questionStore');
    const questionService = require('./questionService');

    // 1. Clear all responses and reset leaderboard
    await responseStore.clearAllResponses();
    await leaderboardService.resetLeaderboard(adminUsername || 'system');

    // 2. Reset round statuses to pending and set Q1 as active question for each round
    const order = await roundStore.getRoundsOrder();
    for (const id of order) {
      await roundStore.updateRound(id, { status: 'pending', startedAt: '', endedAt: '' });
      await roundStore.setActiveStage(id, 'question');
      const questionsOrder = await questionStore.getQuestionsOrder(id);
      if (questionsOrder && questionsOrder.length > 0) {
        await questionService.setActiveQuestion(id, questionsOrder[0]);
      }
    }
    await roundStore.setCurrentRound('');
    await roundStore.setEventState('idle', adminUsername);

    await logStore.addLog({
      action: 'RESET_EVENT',
      adminUsername,
      timestamp: Date.now().toString(),
      details: `Event reset: cleared responses, reset leaderboard, set rounds to pending`
    });

    const io = getIO();
    if (io) {
      io.emit('event:reset', {});
      io.emit('responses:cleared', {});
      io.emit('leaderboard:update', { leaderboard: [] });
    }
  }

  async extendRoundTime(roundId, extraSeconds, adminUsername) {
    const round = await roundStore.getRound(roundId);
    if (!round) throw new Error('Round not found');

    const secondsDelta = parseInt(extraSeconds) || 0;
    const currentDur = parseInt(round.durationSeconds) || 120;
    const newDurationSeconds = Math.max(10, currentDur + secondsDelta);

    await roundStore.updateRound(roundId, { durationSeconds: newDurationSeconds.toString() });

    // Also update active question duration if present
    const questionStore = require('../redis/questionStore');
    const activeQId = await questionStore.getActiveQuestionId(roundId);
    if (activeQId) {
      await questionStore.updateQuestion(roundId, activeQId, { durationSeconds: newDurationSeconds.toString() });
    }

    const actionText = secondsDelta >= 0 ? `Added +${secondsDelta}s` : `Reduced ${secondsDelta}s`;
    await logStore.addLog({
      action: 'EXTEND_ROUND_TIME',
      adminUsername,
      timestamp: Date.now().toString(),
      details: `${actionText} to round ${roundId} (total: ${newDurationSeconds}s)`
    });

    const updatedRound = { ...round, durationSeconds: newDurationSeconds };

    const io = getIO();
    if (io) {
      io.emit('round:time_extended', {
        roundId,
        extraSeconds: secondsDelta,
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
