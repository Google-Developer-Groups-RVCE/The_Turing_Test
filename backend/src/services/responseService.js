const responseStore = require('../redis/responseStore');
const roundStore = require('../redis/roundStore');
const questionStore = require('../redis/questionStore');
const leaderboardService = require('./leaderboardService');
const logStore = require('../redis/logStore');

const getIO = () => {
  try {
    return require('../sockets/socketServer').getIO();
  } catch(e) {
    return null;
  }
};

class ResponseService {
  async submitResponse(roundId, username, answer) {
    const round = await roundStore.getRound(roundId);
    if (!round || round.status !== 'active') {
      throw new Error('Round is not active');
    }

    const hasResponded = await responseStore.hasResponded(roundId, username);
    if (hasResponded) {
      throw new Error('Already submitted for this round');
    }

    // Determine correct answer and points
    // Assume single question per round for this simplified version, or get active question
    const questionsOrder = await questionStore.getQuestionsOrder(roundId);
    let isCorrect = false;
    let pointsAwarded = 0;
    
    if (questionsOrder.length > 0) {
      const q = await questionStore.getQuestion(roundId, questionsOrder[0]);
      if (q) {
        isCorrect = q.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
        if (isCorrect) pointsAwarded = parseInt(q.points) || 10;
      }
    }

    const submittedAt = Date.now();
    await responseStore.saveResponse(roundId, username, {
      answer,
      submittedAt,
      isCorrect,
      pointsAwarded
    });

    if (pointsAwarded > 0) {
      await leaderboardService.updateScore(username, roundId, pointsAwarded);
    }

    const io = getIO();
    if (io) {
      io.emit('response:received', { roundId, username, submittedAt });
    }

    return { isCorrect, pointsAwarded };
  }

  async getResponses(roundId) {
    const users = await responseStore.getRespondedUsers(roundId);
    const responses = await Promise.all(users.map(u => responseStore.getResponse(roundId, u)));
    return responses.filter(Boolean);
  }

  async getMyResponse(roundId, username) {
    return await responseStore.getResponse(roundId, username);
  }
}

module.exports = new ResponseService();
