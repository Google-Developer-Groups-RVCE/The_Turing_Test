const questionService = require('../services/questionService');

class QuestionController {
  async getQuestions(req, res, next) {
    try {
      const questions = await questionService.getQuestions(req.params.roundId);
      res.status(200).json({ questions });
    } catch (err) {
      next(err);
    }
  }

  async addQuestion(req, res, next) {
    try {
      const question = await questionService.addQuestion(req.params.roundId, req.body);
      res.status(201).json({ question });
    } catch (err) {
      next(err);
    }
  }

  async updateQuestion(req, res, next) {
    try {
      await questionService.updateQuestion(req.params.roundId, req.params.questionId, req.body);
      res.status(200).json({ message: 'Question updated' });
    } catch (err) {
      next(err);
    }
  }

  async deleteQuestion(req, res, next) {
    try {
      await questionService.deleteQuestion(req.params.roundId, req.params.questionId);
      res.status(200).json({ message: 'Question deleted' });
    } catch (err) {
      next(err);
    }
  }

  async getActiveQuestion(req, res, next) {
    try {
      const question = await questionService.getActiveQuestion(req.params.roundId);
      res.status(200).json({ question });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new QuestionController();
