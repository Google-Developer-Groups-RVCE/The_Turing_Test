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
      const responses = await responseService.getResponses(req.params.roundId);
      res.status(200).json(responses);
    } catch (err) {
      next(err);
    }
  }

  async getMyResponse(req, res, next) {
    try {
      const response = await responseService.getMyResponse(req.params.roundId, req.user.username);
      res.status(200).json(response || {});
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ResponseController();
