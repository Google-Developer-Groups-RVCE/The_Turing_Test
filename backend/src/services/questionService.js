const questionStore = require('../redis/questionStore');
const roundStore = require('../redis/roundStore');

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
      options: questionData.options || [],
      correctAnswer: questionData.correctAnswer,
      points: questionData.points || 10,
      order: questionData.order || Date.now().toString()
    };
    await questionStore.addQuestion(roundId, question);
    return question;
  }

  async updateQuestion(roundId, questionId, updates) {
    await questionStore.updateQuestion(roundId, questionId, updates);
  }

  async deleteQuestion(roundId, questionId) {
    await questionStore.deleteQuestion(roundId, questionId);
  }

  async getActiveQuestion(roundId) {
    // Return the active question without answers for participants
    const questions = await this.getQuestions(roundId);
    if (!questions || questions.length === 0) return null;
    const { correctAnswer, ...questionWithoutAnswer } = questions[0];
    return questionWithoutAnswer;
  }
}

module.exports = new QuestionService();
