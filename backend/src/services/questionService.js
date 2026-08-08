const questionStore = require('../redis/questionStore');
const roundStore = require('../redis/roundStore');

const getIO = () => {
  try {
    return require('./socketService').getIO ? require('./socketService').getIO() : require('../config/socket').getIO();
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
      order: questionData.order || Date.now().toString()
    };
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
    return questionWithoutAnswer;
  }

  async setActiveQuestion(roundId, questionId) {
    await questionStore.setActiveQuestionId(roundId, questionId);
    const question = await this.getActiveQuestion(roundId);

    const io = getIO();
    if (io) {
      io.emit('question:changed', { roundId, activeQuestionId: questionId, question });
    }
    return question;
  }

  async nextQuestion(roundId) {
    const order = await questionStore.getQuestionsOrder(roundId);
    if (!order || order.length === 0) return null;

    const activeId = await questionStore.getActiveQuestionId(roundId);
    const currentIndex = order.indexOf(activeId);
    let nextIndex = 0;
    if (currentIndex >= 0 && currentIndex < order.length - 1) {
      nextIndex = currentIndex + 1;
    }
    const nextQuestionId = order[nextIndex];
    return await this.setActiveQuestion(roundId, nextQuestionId);
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
}

module.exports = new QuestionService();
