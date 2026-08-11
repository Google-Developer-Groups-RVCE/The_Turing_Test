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

  async nextQuestion(req, res, next) {
    try {
      const question = await questionService.nextQuestion(req.params.roundId);
      res.status(200).json({ question, message: 'Advanced to next question' });
    } catch (err) {
      next(err);
    }
  }

  async previousQuestion(req, res, next) {
    try {
      const question = await questionService.previousQuestion(req.params.roundId);
      res.status(200).json({ question, message: 'Moved to previous question' });
    } catch (err) {
      next(err);
    }
  }

  async setActiveQuestion(req, res, next) {
    try {
      const question = await questionService.setActiveQuestion(req.params.roundId, req.params.questionId);
      res.status(200).json({ question, message: 'Question activated' });
    } catch (err) {
      next(err);
    }
  }

  async revealPoll(req, res, next) {
    try {
      const result = await questionService.revealPoll(req.params.roundId);
      res.status(200).json({ message: 'Poll revealed', result });
    } catch (err) {
      next(err);
    }
  }
  async reorderQuestions(req, res, next) {
    try {
      const { questionIds } = req.body;
      await questionService.reorderQuestions(req.params.roundId, questionIds);
      res.status(200).json({ message: 'Questions reordered successfully' });
    } catch (err) { next(err); }
  }

  async overrideDisplayedOption(req, res, next) {
    try {
      const { optionId, targetQuestionId } = req.body;
      const result = await questionService.overrideDisplayedOption(req.params.roundId, optionId, targetQuestionId);
      res.status(200).json({ message: 'Option overridden', question: result });
    } catch (err) {
      next(err);
    }
  }
  async evaluateQuestion(req, res, next) {
    try {
      const result = await questionService.evaluateQuestion(req.params.roundId);
      res.status(200).json({ message: 'Evaluation broadcasted', result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new QuestionController();
