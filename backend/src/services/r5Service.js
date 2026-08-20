'use strict';

const r5Store = require('../redis/r5Store');
const { redisClient } = require('../config/redisClient');

const getIO = () => {
  try { return require('../sockets/socketServer').getIO(); } catch(e) { return null; }
};

class R5Service {
  async submitResponse(username, text) {
    const phase = await r5Store.getPhase();
    if (phase !== 'prompt') {
      throw new Error('Not in prompt phase');
    }
    const hasResponded = await r5Store.hasResponded(username);
    if (hasResponded) {
      throw new Error('Already responded');
    }

    await r5Store.saveResponse(username, text);

    const respondedUsers = await r5Store.getRespondedUsers();
    const totalExpected = await redisClient.scard('presence:participants');

    const io = getIO();
    if (io) {
      io.emit('r5:response_received', {
        username,
        totalSubmitted: respondedUsers.length,
        totalExpected: totalExpected || 0
      });
    }
  }

  async getSubmissionStatus() {
    const respondedUsers = await r5Store.getRespondedUsers();
    const totalExpected = await redisClient.scard('presence:participants');
    return {
      totalSubmitted: respondedUsers.length,
      totalExpected: totalExpected || 0,
      submitted: respondedUsers
    };
  }

  async getAllResponses() {
    return await r5Store.getAllResponses() || {};
  }

  async selectCandidates(adminUsername, selectedUsernames) {
    const phase = await r5Store.getPhase();
    if (phase !== 'prompt') {
      throw new Error('Can only select candidates from prompt phase');
    }

    if (!Array.isArray(selectedUsernames) || selectedUsernames.length === 0) {
      throw new Error('Please select at least 1 candidate response');
    }

    const responses = await r5Store.getAllResponses() || {};
    const leaderboardService = require('./leaderboardService');
    const roundStore = require('../redis/roundStore');
    const currentRound = await roundStore.getCurrentRound();
    const roundId = currentRound?.id || 'round_5_reverse';

    // Award 20 points to each user whose response was selected by admin
    for (const username of selectedUsernames) {
      if (responses[username]) {
        try {
          await leaderboardService.updateScore(username, roundId, 20);
        } catch (e) {
          console.error(`[r5Service] Failed to award candidate points to ${username}:`, e.message);
        }
      }
    }

    const geminiText = await r5Store.getGeminiResponse();
    let options = [];
    if (geminiText) {
      options.push({ text: geminiText, author: '__gemini__' });
    }

    for (const username of selectedUsernames) {
      if (responses[username]) {
        options.push({ text: responses[username], author: username });
      }
    }

    // Shuffle options using Fisher-Yates
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    // Assign indices
    const finalOptions = options.map((opt, idx) => ({ ...opt, index: idx }));

    await r5Store.setShuffledOptions(finalOptions);
    await r5Store.setPhase('voting');

    const participantOptions = finalOptions.map(opt => ({ index: opt.index, text: opt.text }));

    const io = getIO();
    if (io) {
      io.emit('r5:voting_opened', { options: participantOptions });
      io.emit('r5:phase_changed', { phase: 'voting' });
    }
  }

  async openVoting(adminUsername) {
    const responses = await r5Store.getAllResponses() || {};
    const usernames = Object.keys(responses);
    // Take up to 3 responses if none specifically selected
    const selected = usernames.slice(0, 3);
    return await this.selectCandidates(adminUsername, selected);
  }

  async getShuffledOptions() {
    const options = await r5Store.getShuffledOptions();
    if (!options) return [];
    return options.map(opt => ({ index: opt.index, text: opt.text }));
  }

  async submitVote(username, optionIndex) {
    const phase = await r5Store.getPhase();
    if (phase !== 'voting') {
      throw new Error('Not in voting phase');
    }
    const hasVoted = await r5Store.hasVoted(username);
    if (hasVoted) {
      throw new Error('Already voted');
    }

    const options = await r5Store.getShuffledOptions();
    if (!options || !options.find(o => o.index === parseInt(optionIndex, 10))) {
      throw new Error('Invalid option index');
    }

    await r5Store.saveVote(username, optionIndex);

    const io = getIO();
    if (io) {
      io.emit('r5:vote_received', { username });
    }
  }

  async getVotingStatus() {
    const votedUsers = await r5Store.getVotedUsers();
    const totalExpected = await redisClient.scard('presence:participants');
    return {
      totalVoted: votedUsers.length,
      totalExpected: totalExpected || 0,
      voted: votedUsers
    };
  }

  async showResults(adminUsername) {
    const phase = await r5Store.getPhase();
    if (phase !== 'voting') {
      throw new Error('Can only show results from voting phase');
    }

    const options = await r5Store.getShuffledOptions() || [];
    const geminiOption = options.find(o => o.author === '__gemini__');
    const votes = await r5Store.getAllVotes() || {};

    // Award 20 points to everyone who guessed Gemini correctly
    if (geminiOption !== undefined) {
      const leaderboardService = require('./leaderboardService');
      const roundStore = require('../redis/roundStore');
      const currentRound = await roundStore.getCurrentRound();
      const roundId = currentRound?.id || 'round_5_reverse';

      for (const [username, votedIndex] of Object.entries(votes)) {
        if (parseInt(votedIndex, 10) === geminiOption.index) {
          try {
            await leaderboardService.updateScore(username, roundId, 20);
          } catch (e) {
            console.error(`[r5Service] Failed to award Gemini guess points to ${username}:`, e.message);
          }
        }
      }
    }

    await r5Store.setPhase('results');
    const results = await this.getResults();

    const io = getIO();
    if (io) {
      io.emit('r5:results', { results });
      io.emit('r5:phase_changed', { phase: 'results' });
    }
  }

  async getResults() {
    const options = await r5Store.getShuffledOptions();
    if (!options) return [];

    const votes = await r5Store.getAllVotes() || {};
    const totalVotes = Object.keys(votes).length;

    const results = options.map(opt => {
      const voteCount = Object.values(votes).filter(v => parseInt(v, 10) === opt.index).length;
      return {
        ...opt,
        isGemini: opt.author === '__gemini__',
        username: opt.author === '__gemini__' ? 'Gemini' : opt.author,
        voteCount,
        percent: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
      };
    });

    return results;
  }

  async resetRound5() {
    await r5Store.clearAll();
    await r5Store.setPhase('prompt');
    const geminiText = await r5Store.getGeminiResponse();
    if (!geminiText) {
      await r5Store.setGeminiResponse("The quiet hours when the world is asleep are where your future self is built step by step. Every page you read tonight is bringing you closer to the moment you walk out of that exam knowing you gave it everything.");
    }
    
    const io = getIO();
    if (io) {
      io.emit('r5:phase_changed', { phase: 'prompt' });
    }
  }
}

module.exports = new R5Service();
