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

    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) {
      throw new Error('No active question for this round');
    }

    const hasResponded = await responseStore.hasResponded(roundId, activeId, username);
    if (hasResponded) {
      throw new Error('Already submitted for this round');
    }

    const questionsOrder = await questionStore.getQuestionsOrder(roundId);
    let isCorrect = false;
    let pointsAwarded = 0;
    
    if (questionsOrder.length > 0) {
      const q = await questionStore.getQuestion(roundId, activeId);
      if (q) {
        if (q.type === 'guess-author') {
          const displayedId = q.displayedOptionId || 'human-opt';
          const displayedOption = (q.options || []).find(o => o.id === displayedId);
          if (displayedOption && displayedOption.author) {
             isCorrect = displayedOption.author.trim().toLowerCase() === answer.trim().toLowerCase();
          }
          if (isCorrect) pointsAwarded = parseInt(q.points) || 10;
        } else if (q.type === 'profile-guess' || q.id === 'poll6' || q.id === 'r3-q6') {
          let guessedAge = null;
          let guessedProf = '';
          let guessedHobby = '';

          try {
            if (answer.startsWith('{')) {
              const parsed = JSON.parse(answer);
              guessedAge = parseInt(parsed.age);
              guessedProf = String(parsed.profession || '');
              guessedHobby = String(parsed.hobby || '');
            } else {
              const ageMatch = answer.match(/age:\s*(\d+)/i);
              const profMatch = answer.match(/profession:\s*([^|]+)/i);
              const hobbyMatch = answer.match(/hobby:\s*(.+)/i);
              if (ageMatch) guessedAge = parseInt(ageMatch[1]);
              if (profMatch) guessedProf = profMatch[1].trim();
              if (hobbyMatch) guessedHobby = hobbyMatch[1].trim();
            }
          } catch (e) {}

          const targetAge = parseInt(q.targetAge || 47);
          const targetProf = q.targetProfession || 'Lawyer';
          const targetHobby = q.targetHobby || 'Photography';

          let agePts = 0;
          if (guessedAge !== null && !isNaN(guessedAge)) {
            const diff = Math.abs(guessedAge - targetAge);
            if (diff === 0) agePts = 10;
            else if (diff <= 2) agePts = 7;
            else if (diff <= 5) agePts = 4;
          }

          let profPts = 0;
          if (guessedProf && (guessedProf.toLowerCase().includes(targetProf.toLowerCase()) || /lawyer|attorney|advocate|legal/i.test(guessedProf))) {
            profPts = 10;
          }

          let hobbyPts = 0;
          if (guessedHobby && (guessedHobby.toLowerCase().includes(targetHobby.toLowerCase()) || /photo|photograph|camera/i.test(guessedHobby))) {
            hobbyPts = 10;
          }

          pointsAwarded = agePts + profPts + hobbyPts;
          isCorrect = pointsAwarded > 0;
        } else {
          isCorrect = q.correctAnswer && q.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
          if (isCorrect) pointsAwarded = parseInt(q.points) || 10;
        }
      }
    }

    const submittedAt = Date.now();
    await responseStore.saveResponse(roundId, activeId, username, {
      answer,
      submittedAt,
      isCorrect,
      pointsAwarded
    });

    if (pointsAwarded > 0 && username !== 'simulated_user') {
      await leaderboardService.updateScore(username, roundId, pointsAwarded);
    }

    try {
      const logStore = require('../redis/logStore');
      await logStore.addLog({
        adminUsername: username,
        action: 'SUBMIT_RESPONSE',
        target: `${username} answered ${activeId}`,
        details: `Round: ${roundId} | Question: ${activeId} | Answer: "${answer}" | Points: +${pointsAwarded}`,
        timestamp: String(submittedAt)
      });
    } catch (e) {}

    const io = getIO();
    if (io) {
      io.emit('response:received', {
        roundId,
        questionId: activeId,
        username,
        answer,
        isCorrect,
        pointsAwarded,
        submittedAt
      });
    }

    return { isCorrect, pointsAwarded };
  }

  async getResponses(roundId, questionId) {
    if (!questionId) {
      // If questionId is not provided, fetch for active question
      questionId = await questionStore.getActiveQuestionId(roundId);
    }
    if (!questionId) return [];
    
    const users = await responseStore.getRespondedUsers(roundId, questionId);
    const responses = await Promise.all(users.map(u => responseStore.getResponse(roundId, questionId, u)));
    return responses.filter(Boolean);
  }

  async getMyResponse(roundId, questionId, username) {
    if (!questionId) {
      questionId = await questionStore.getActiveQuestionId(roundId);
    }
    if (!questionId) return null;
    return await responseStore.getResponse(roundId, questionId, username);
  }

  async deleteResponses(roundId, questionId, usernames) {
    const { redisClient } = require('../config/redisClient');
    const keys = require('../redis/keys');
    if (!usernames || !usernames.length) return 0;
    
    if (!questionId) {
      questionId = await questionStore.getActiveQuestionId(roundId);
    }
    if (!questionId) return 0;

    let deletedCount = 0;
    for (const u of usernames) {
      const resp = await responseStore.getResponse(roundId, questionId, u);
      if (resp) {
        await redisClient.del(keys.RESPONSE(roundId, questionId, u));
        await redisClient.srem(keys.RESPONSES(roundId, questionId), u);
        // Also deduct points from leaderboard
        if (resp.pointsAwarded && parseInt(resp.pointsAwarded) > 0) {
          await leaderboardService.updateScore(u, roundId, -parseInt(resp.pointsAwarded));
        }
        deletedCount++;
      }
    }
    
    const io = getIO();
    if (io) {
      io.emit('responses:deleted', { roundId, questionId, usernames });
    }
    
    return deletedCount;
  }
}

module.exports = new ResponseService();
