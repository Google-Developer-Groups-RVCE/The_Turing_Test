const responseService = require('../services/responseService');

class ResponseController {
  async submitResponse(req, res, next) {
    try {
      const { answer } = req.body;
      const result = await responseService.submitResponse(req.params.roundId, req.user.username, answer);
      res.status(200).json(result);
    } catch (err) {
      if (err.message === 'Already submitted for this round' || err.message === 'Round is not active') {
        return res.status(400).json({ message: err.message });
      }
      next(err);
    }
  }

  async getResponses(req, res, next) {
    try {
      const { questionId } = req.query;
      const responses = await responseService.getResponses(req.params.roundId, questionId);
      res.status(200).json({ responses, total: responses.length });
    } catch (err) {
      next(err);
    }
  }

  async getMyResponse(req, res, next) {
    try {
      const { questionId } = req.query;
      const response = await responseService.getMyResponse(req.params.roundId, questionId, req.user.username);
      res.status(200).json(response || {});
    } catch (err) {
      next(err);
    }
  }

  async deleteResponses(req, res, next) {
    try {
      const { usernames, questionId } = req.body; // array of usernames to delete
      const deletedCount = await responseService.deleteResponses(req.params.roundId, questionId, usernames);
      res.status(200).json({ message: `Deleted ${deletedCount} responses`, deletedCount });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ResponseController();
