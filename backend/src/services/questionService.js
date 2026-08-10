const questionStore = require('../redis/questionStore');
const roundStore = require('../redis/roundStore');

const getIO = () => {
  try {
    return require('../config/socket').getIO();
  } catch(e) {
    return null;
  }
};

class QuestionService {
  async getQuestions(roundId) {
    const order = await questionStore.getQuestionsOrder(roundId);
    const questions = await Promise.all(order.map(id => questionStore.getQuestion(roundId, id)));
    return questions.filter(Boolean);
  }

  async addQuestion(roundId, questionData) {
    const id = questionData.id || `q_${Date.now()}`;
    const question = {
      id,
      text: questionData.text,
      type: questionData.type || 'mcq',
      options: questionData.options || [],
      correctAnswer: questionData.correctAnswer,
      points: questionData.points || 10,
      durationSeconds: questionData.durationSeconds || 300,
      order: questionData.order || Date.now().toString()
    };
    if (questionData.imageUrl) question.imageUrl = questionData.imageUrl;
    if (questionData.imageProps) question.imageProps = questionData.imageProps;
    await questionStore.addQuestion(roundId, question);

    // If no active question is set for this round, set this new question as active
    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) {
      await questionStore.setActiveQuestionId(roundId, id);
    }
    return question;
  }

  async updateQuestion(roundId, questionId, updates) {
    await questionStore.updateQuestion(roundId, questionId, updates);
  }

  async deleteQuestion(roundId, questionId) {
    await questionStore.deleteQuestion(roundId, questionId);
  }

  async getActiveQuestion(roundId) {
    const order = await questionStore.getQuestionsOrder(roundId);
    if (!order || order.length === 0) return null;

    let activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId || !order.includes(activeId)) {
      activeId = order[0];
      await questionStore.setActiveQuestionId(roundId, activeId);
    }

    const question = await questionStore.getQuestion(roundId, activeId);
    if (!question) return null;

    const { correctAnswer, ...questionWithoutAnswer } = question;
    
    if (questionWithoutAnswer.type === 'guess-author') {
      questionWithoutAnswer.options = (questionWithoutAnswer.options || []).map(opt => {
        const { author, ...rest } = opt;
        return rest;
      });
    }

    return questionWithoutAnswer;
  }

  async setActiveQuestion(roundId, questionId) {
    await questionStore.setActiveQuestionId(roundId, questionId);
    let question = await questionStore.getQuestion(roundId, questionId);
    if (question && question.type === 'guess-author') {
      const options = question.options || [];
      if (options.length > 0) {
        const randomOption = options[Math.floor(Math.random() * options.length)];
        await questionStore.updateQuestion(roundId, questionId, { displayedOptionId: randomOption.id });
      }
    }
    
    question = await this.getActiveQuestion(roundId);

    // Reset round timer to question duration if round is active
    const round = await roundStore.getRound(roundId);
    if (round && round.status === 'active' && question?.durationSeconds) {
      const updatedRound = {
        ...round,
        durationSeconds: question.durationSeconds,
        startedAt: Date.now().toString()
      };
      await roundStore.updateRound(roundId, {
        durationSeconds: updatedRound.durationSeconds,
        startedAt: updatedRound.startedAt
      });
      const io = getIO();
      if (io) io.emit('round:changed', { roundId, roundData: updatedRound });
    }

    const io = getIO();
    if (io) {
      io.emit('question:changed', { roundId, activeQuestionId: questionId, question });
    }
    return question;
  }

  async nextQuestion(roundId) {
    const settingsStore = require('../redis/settingsStore');
    const settings = await settingsStore.getSettings();

    let activeStage = await roundStore.getActiveStage(roundId) || 'question';

    const order = await questionStore.getQuestionsOrder(roundId);
    // Even if no questions, we can show leaderboard if enabled
    if (settings.showLeaderboard === 'true' && activeStage === 'question') {
      await roundStore.setActiveStage(roundId, 'leaderboard');
      const io = getIO();
      if (io) io.emit('round:stage_changed', { roundId, activeStage: 'leaderboard' });
      return { stage: 'leaderboard' };
    }

    if (activeStage === 'leaderboard') {
      await roundStore.setActiveStage(roundId, 'question');
    }

    if (!order || order.length === 0) {
      const io = getIO();
      if (io) io.emit('round:stage_changed', { roundId, activeStage: 'question' });
      return { stage: 'question', question: null };
    }

    const activeId = await questionStore.getActiveQuestionId(roundId);
    const currentIndex = order.indexOf(activeId);
    let nextIndex = 0;
    if (currentIndex >= 0 && currentIndex < order.length - 1) {
      nextIndex = currentIndex + 1;
    }
    const nextQuestionId = order[nextIndex];
    const newQuestion = await this.setActiveQuestion(roundId, nextQuestionId);

    const io = getIO();
    if (io) io.emit('round:stage_changed', { roundId, activeStage: 'question' });

    return { stage: 'question', question: newQuestion };
  }

  async previousQuestion(roundId) {
    const order = await questionStore.getQuestionsOrder(roundId);
    if (!order || order.length === 0) return null;

    const activeId = await questionStore.getActiveQuestionId(roundId);
    const currentIndex = order.indexOf(activeId);
    let prevIndex = order.length - 1;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    }
    const prevQuestionId = order[prevIndex];
    return await this.setActiveQuestion(roundId, prevQuestionId);
  }

  async overrideDisplayedOption(roundId, optionId) {
    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) throw new Error("No active question to override");
    const question = await questionStore.getQuestion(roundId, activeId);
    if (!question || question.type !== 'guess-author') throw new Error("Question is not guess-author type");
    
    await questionStore.updateQuestion(roundId, activeId, { displayedOptionId: optionId });
    const updatedQuestion = await this.getActiveQuestion(roundId);
    
    const io = getIO();
    if (io) {
      io.emit('question:changed', { roundId, activeQuestionId: activeId, question: updatedQuestion });
    }
    return updatedQuestion;
  }

  async revealPoll(roundId) {
    const question = await this.getActiveQuestion(roundId);
    if (!question || question.type !== 'poll') {
      throw new Error('Active question is not a poll');
    }

    const { getResponses } = require('../redis/responseStore');
    const responses = await getResponses(roundId);
    const pollResponses = responses.filter(r => r.questionId === question.id);

    const counts = {};
    for (const r of pollResponses) {
      counts[r.answer] = (counts[r.answer] || 0) + 1;
    }

    let winningKey = null;
    let maxCount = -1;
    for (const key of Object.keys(counts)) {
      if (counts[key] > maxCount) {
        maxCount = counts[key];
        winningKey = key;
      }
    }

    if (!winningKey && question.options.length > 0) {
      winningKey = question.options[0].key; // default if no votes
    }

    const winningOption = question.options.find(o => o.key === winningKey);
    const result = {
      winningKey,
      answerText: winningOption ? winningOption.answer : 'No Answer',
      counts
    };

    const io = getIO();
    if (io) io.emit('poll:revealed', { roundId, questionId: question.id, result });
    
    return result;
  }
}

module.exports = new QuestionService();
