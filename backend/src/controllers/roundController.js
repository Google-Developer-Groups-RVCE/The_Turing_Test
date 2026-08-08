'use strict';

const roundService = require('../services/roundService');

class RoundController {
  async getAllRounds(req, res, next) {
    try {
      const rounds = await roundService.getAllRounds();
      res.status(200).json({ rounds });
    } catch (err) { next(err); }
  }

  async getCurrentRound(req, res, next) {
    try {
      const round = await roundService.getCurrentRound();
      res.status(200).json({ round: round || null });
    } catch (err) { next(err); }
  }

  async createRound(req, res, next) {
    try {
      if (!req.body.name) return res.status(400).json({ message: 'Round name is required' });
      const round = await roundService.createRound(req.body);
      res.status(201).json({ round, message: 'Round created' });
    } catch (err) { next(err); }
  }

  async updateRound(req, res, next) {
    try {
      await roundService.updateRound(req.params.roundId, req.body);
      res.status(200).json({ message: 'Round updated' });
    } catch (err) { next(err); }
  }

  async deleteRound(req, res, next) {
    try {
      await roundService.deleteRound(req.params.roundId, req.user.username);
      res.status(200).json({ message: 'Round deleted' });
    } catch (err) { next(err); }
  }

  async startRound(req, res, next) {
    try {
      await roundService.startRound(req.params.roundId, req.user.username);
      res.status(200).json({ message: 'Round started' });
    } catch (err) { next(err); }
  }

  async pauseRound(req, res, next) {
    try {
      await roundService.pauseRound(req.params.roundId, req.user.username);
      res.status(200).json({ message: 'Round paused' });
    } catch (err) { next(err); }
  }

  async resumeRound(req, res, next) {
    try {
      await roundService.resumeRound(req.params.roundId, req.user.username);
      res.status(200).json({ message: 'Round resumed' });
    } catch (err) { next(err); }
  }

  async restartRound(req, res, next) {
    try {
      await roundService.restartRound(req.params.roundId, req.user.username);
      res.status(200).json({ message: 'Round restarted' });
    } catch (err) { next(err); }
  }

  async endRound(req, res, next) {
    try {
      await roundService.endRound(req.params.roundId, req.user.username);
      res.status(200).json({ message: 'Round ended' });
    } catch (err) { next(err); }
  }

  async resetEvent(req, res, next) {
    try {
      await roundService.resetEvent(req.user.username);
      res.status(200).json({ message: 'Event reset successfully' });
    } catch (err) { next(err); }
  }

  async endEvent(req, res, next) {
    try {
      await roundService.endEvent(req.user.username);
      res.status(200).json({ message: 'Event ended' });
    } catch (err) { next(err); }
  }
}

module.exports = new RoundController();
