'use strict';

const r5Service = require('../services/r5Service');
const r5Store = require('../redis/r5Store');

class R5Controller {
  async submitResponse(req, res, next) {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, message: 'Response text is required' });
      }
      await r5Service.submitResponse(req.user.username, text);
      res.json({ success: true, message: 'Response submitted' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getMyResponse(req, res, next) {
    try {
      const response = await r5Store.getResponse(req.user.username);
      res.json({ success: true, text: response });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getSubmissionStatus(req, res, next) {
    try {
      const status = await r5Service.getSubmissionStatus();
      res.json({ success: true, ...status });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getOptions(req, res, next) {
    try {
      const options = await r5Service.getShuffledOptions();
      res.json({ success: true, options });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async submitVote(req, res, next) {
    try {
      const { optionIndex } = req.body;
      if (optionIndex === undefined) {
        return res.status(400).json({ success: false, message: 'Option index is required' });
      }
      await r5Service.submitVote(req.user.username, optionIndex);
      res.json({ success: true, message: 'Vote submitted' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getMyVote(req, res, next) {
    try {
      const vote = await r5Store.getVote(req.user.username);
      res.json({ success: true, optionIndex: vote !== null ? parseInt(vote, 10) : undefined });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getVotingStatus(req, res, next) {
    try {
      const status = await r5Service.getVotingStatus();
      res.json({ success: true, ...status });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getResults(req, res, next) {
    try {
      const results = await r5Service.getResults();
      res.json({ success: true, results });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getAllResponses(req, res, next) {
    try {
      const responses = await r5Service.getAllResponses();
      res.json({ success: true, responses });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async selectCandidates(req, res, next) {
    try {
      const { selectedUsernames } = req.body;
      await r5Service.selectCandidates(req.user.username, selectedUsernames);
      res.json({ success: true, message: 'Candidates selected and voting opened' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async openVoting(req, res, next) {
    try {
      await r5Service.openVoting(req.user.username);
      res.json({ success: true, message: 'Voting opened' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async showResults(req, res, next) {
    try {
      await r5Service.showResults(req.user.username);
      res.json({ success: true, message: 'Results published' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async resetRound5(req, res, next) {
    try {
      await r5Service.resetRound5();
      res.json({ success: true, message: 'Round 5 reset' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new R5Controller();
