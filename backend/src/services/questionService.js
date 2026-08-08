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
    // In a real implementation this might check event state/time to see which question is active
    // For now, return the first question or all questions without answers
    const questions = await this.getQuestions(roundId);
    return questions.map(({ correctAnswer, ...q }) => q); // remove correct answer for participants
  }
}

module.exports = new QuestionService();
