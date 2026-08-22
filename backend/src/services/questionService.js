'use strict';

const questionStore = require('../redis/questionStore');
const roundStore = require('../redis/roundStore');
const responseStore = require('../redis/responseStore');

// ──────────────────────────────────────────────────────────────────────────────
// POLLS_DATA: hardcoded from r3.md — every poll question + answers
// ──────────────────────────────────────────────────────────────────────────────
const POLLS_DATA = [
  {
    id: 'poll1', order: 1,
    options: [
      { key: 'A', question: "What does a perfect Sunday look like for you?", answer: "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens." },
      { key: 'B', question: "What's something your friends often tease you about?", answer: "Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago." },
      { key: 'C', question: "What's one thing you almost never leave home without?", answer: "My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I've forgotten something important." }
    ]
  },
  {
    id: 'poll2', order: 2,
    options: [
      { key: 'A', question: "What's something younger people do that you find interesting?", answer: "How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first." },
      { key: 'B', question: "What's a change in everyday life that still amazes you?", answer: "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things." },
      { key: 'C', question: "How did you usually discover new music growing up?", answer: "Mostly through friends or hearing something somewhere repeatedly. Sometimes you'd like one song enough to take a chance on everything else by the same artist." }
    ]
  },
  {
    id: 'poll3', order: 3,
    options: [
      { key: 'A', question: "What's the most tiring part of your work?", answer: "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together." },
      { key: 'B', question: "What skill do you think you're unusually good at?", answer: "Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed." },
      { key: 'C', question: "What's something you do before an important meeting?", answer: "I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important." }
    ]
  },
  {
    id: 'poll4', order: 4,
    options: [
      { key: 'A', question: "What's something you find interesting about conversations?", answer: "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different." },
      { key: 'B', question: "What's something you've become less impressed by over time?", answer: "Confidence. Someone sounding completely certain doesn't really tell me whether they're right anymore. I tend to pay more attention to the details." },
      { key: 'C', question: "What do your friends sometimes find annoying about you?", answer: "I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering." }
    ]
  },
  {
    id: 'poll5', order: 5,
    options: [
      { key: 'A', question: "What kind of moments do you remember most clearly?", answer: "Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds." },
      { key: 'B', question: "What's something you're unusually patient about?", answer: "Waiting when I feel the timing matters. I don't mind staying in the same place for a while if rushing would mean missing something interesting." },
      { key: 'C', question: "When you visit somewhere new, what do you usually do first?", answer: "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly." }
    ]
  }
];

const getIO = () => {
  try { return require('../sockets/socketServer').getIO(); } catch (e) { return null; }
};

/**
 * Determine whether a question is a "poll" question (polls 1–5, NOT the profile-guess).
 */
function isPollQuestion(question, roundId, roundName) {
  if (!question) return false;
  const qId = String(question.id || '').toLowerCase();
  const qType = (question.type || '').toLowerCase();
  if (qType === 'profile-guess') return false;
  if (qId === 'poll6' || qId === 'r3-q6') return false;
  return (
    qType === 'poll' ||
    qId.includes('poll') ||
    String(roundId).includes('r3') ||
    String(roundId).includes('3') ||
    (roundName && (roundName.includes('round 3') || roundName.includes('decode') || roundName.includes('poll')))
  );
}

/**
 * Compute poll result from response store (NO circular deps — uses responseStore directly).
 */
async function computePollResult(roundId, question) {
  const users = await responseStore.getRespondedUsers(roundId, question.id);
  const counts = {};
  for (const username of users) {
    const resp = await responseStore.getResponse(roundId, question.id, username);
    if (resp && resp.answer) {
      const ans = resp.answer.trim().toUpperCase();
      if (ans) counts[ans] = (counts[ans] || 0) + 1;
    }
  }

  // Find the poll option set from POLLS_DATA
  let options = [];
  const pollMatch = POLLS_DATA.find(p =>
    p.id === question.id ||
    (p.order && Number(p.order) === Number(question.order))
  );
  if (pollMatch && pollMatch.options && pollMatch.options.length > 0) {
    options = pollMatch.options;
  } else {
    let dbOpts = [];
    if (typeof question.options === 'string') {
      try { dbOpts = JSON.parse(question.options); } catch (e) {}
    } else if (Array.isArray(question.options)) {
      dbOpts = question.options;
    }
    options = dbOpts;
  }

  // Find winning key
  let winningKey = null;
  let maxCount = -1;
  for (const key of Object.keys(counts)) {
    if (counts[key] > maxCount) {
      maxCount = counts[key];
      winningKey = key;
    }
  }

  // Default to first option if no votes
  if (!winningKey && options.length > 0) {
    winningKey = options[0].key || options[0].id || 'A';
  }

  const winningOption = options.find(o =>
    (o.key && o.key.toUpperCase() === (winningKey || '').toUpperCase()) ||
    (o.id && o.id.toUpperCase() === (winningKey || '').toUpperCase())
  ) || options[0];

  let answerText = 'No votes recorded yet.';
  let winningQuestionText = '';
  if (winningOption) {
    if (typeof winningOption === 'string') {
      answerText = winningOption;
    } else {
      answerText = winningOption.answer || winningOption.text || 'No Answer';
      winningQuestionText = winningOption.question || winningOption.text || '';
    }
  }

  return { winningKey: winningKey || 'A', answerText, winningQuestionText, counts };
}

// ──────────────────────────────────────────────────────────────────────────────
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
      durationSeconds: questionData.durationSeconds || 300,
      order: questionData.order || Date.now().toString()
    };
    if (questionData.imageUrl) question.imageUrl = questionData.imageUrl;
    if (questionData.imageProps) question.imageProps = questionData.imageProps;
    await questionStore.addQuestion(roundId, question);
    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) await questionStore.setActiveQuestionId(roundId, id);
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

    // Strip correctAnswer before sending to client
    const { correctAnswer, ...questionWithoutAnswer } = question;

    if (questionWithoutAnswer.type === 'guess-author') {
      questionWithoutAnswer.options = (questionWithoutAnswer.options || []).map(opt => {
        const { author, ...rest } = opt;
        return rest;
      });
    }

    const activeStage = await roundStore.getActiveStage(roundId) || 'question';
    const round = await roundStore.getRound(roundId);
    const roundName = (round?.name || '').toLowerCase();
    const isPoll = isPollQuestion(questionWithoutAnswer, roundId, roundName);

    const isProfileGuess = question.type === 'profile-guess' || question.id === 'poll6';
    if (isProfileGuess) {
      try {
        const revealedHistory = [];
        for (const poll of POLLS_DATA) {
          const pollQ = await questionStore.getQuestion(roundId, poll.id);
          const res = await computePollResult(roundId, pollQ || poll);
          if (res && res.winningQuestionText && res.answerText) {
            revealedHistory.push({
              pollId: poll.id,
              pollOrder: poll.order,
              question: res.winningQuestionText,
              answer: res.answerText,
              winningKey: res.winningKey
            });
          }
        }
        questionWithoutAnswer.revealedPollHistory = revealedHistory;
      } catch (err) {
        console.error('[getActiveQuestion] Error gathering revealedPollHistory:', err.message);
      }
    }

    // If we're in 'evaluated' stage, attach result/evaluation data
    if (activeStage === 'evaluated') {
      if (isPoll) {
        try {
          const result = await computePollResult(roundId, question);
          questionWithoutAnswer.pollResult = result;
        } catch (e) {
          console.error('[getActiveQuestion] computePollResult error:', e.message);
          questionWithoutAnswer.pollResult = { winningKey: 'A', answerText: 'Result unavailable.', winningQuestionText: '', counts: {} };
        }
      } else {
        let ca = correctAnswer;
        if (question.type === 'guess-author') {
          const displayedId = question.displayedOptionId || 'human-opt';
          const displayedOpt = (question.options || []).find(o => o.id === displayedId);
          ca = displayedOpt?.author || 'Human';
        }
        questionWithoutAnswer.evaluationData = {
          questionId: question.id,
          correctAnswer: ca || 'N/A'
        };
      }
    }

    return questionWithoutAnswer;
  }

  async setActiveQuestion(roundId, questionId) {
    await questionStore.setActiveQuestionId(roundId, questionId);
    const now = String(Date.now());
    let question = await questionStore.getQuestion(roundId, questionId);
    
    const updates = { startedAt: now };
    if (question && question.type === 'guess-author') {
      const options = question.options || [];
      if (options.length > 0 && !question.displayedOptionId) {
        const randomOption = options[Math.floor(Math.random() * options.length)];
        updates.displayedOptionId = randomOption.id;
      }
    }
    await questionStore.updateQuestion(roundId, questionId, updates);

    question = await this.getActiveQuestion(roundId);

    // Reset round timer to question duration and fresh startedAt timestamp
    const round = await roundStore.getRound(roundId);
    if (round && round.status === 'active') {
      const qDuration = question?.durationSeconds || round.durationSeconds || '120';
      await roundStore.updateRound(roundId, {
        durationSeconds: String(qDuration),
        startedAt: now
      });
    }

    const io = getIO();
    if (io) io.emit('question:changed', { roundId, activeQuestionId: questionId, question, startedAt: now });
    return question;
  }

  async nextQuestion(roundId) {
    let activeStage = await roundStore.getActiveStage(roundId) || 'question';

    const order = await questionStore.getQuestionsOrder(roundId);
    const activeId = await questionStore.getActiveQuestionId(roundId);
    const question = await questionStore.getQuestion(roundId, activeId); // raw question
    const round = await roundStore.getRound(roundId);
    const roundName = (round?.name || '').toLowerCase();
    const isPoll = isPollQuestion(question, roundId, roundName);

    // ── STAGE 1: question → evaluated ─────────────────────────────────────────
    if (activeStage === 'question') {
      await roundStore.setActiveStage(roundId, 'evaluated');

      if (isPoll) {
        // Compute and emit poll result
        try {
          const result = await computePollResult(roundId, question);
          const io = getIO();
          if (io) io.emit('poll:revealed', { roundId, questionId: question.id, result });
          console.log('[nextQuestion] poll:revealed emitted for', question.id, result);
        } catch (e) {
          console.error('[nextQuestion] revealPoll failed:', e.message);
        }
      } else {
        // Evaluate non-poll question
        try { await this.evaluateQuestion(roundId); } catch (e) {}
      }

      await roundStore.setActiveStage(roundId, 'evaluated');
      const io = getIO();
      if (io) io.emit('round:stage_changed', { roundId, activeStage: 'evaluated' });

      const updatedQuestion = await this.getActiveQuestion(roundId);
      return { stage: 'evaluated', question: updatedQuestion };
    }

    // ── STAGE 2: evaluated → next ─────────────────────────────────────────────
    if (activeStage === 'evaluated') {
      if (isPoll) {
        // For polls: move to the next question (which may be another poll or the profile-guess)
        await roundStore.setActiveStage(roundId, 'question');

        const settingsStore = require('../redis/settingsStore');
        await settingsStore.updateSettings({ showLeaderboard: 'false' });
        const io = getIO();
        if (io) io.emit('settings:updated', { showLeaderboard: false });
        if (io) io.emit('round:stage_changed', { roundId, activeStage: 'question' });

        if (!order || order.length === 0) return { stage: 'question', question: null };

        const currentIndex = order.indexOf(String(activeId));
        if (currentIndex >= 0 && currentIndex < order.length - 1) {
          const nextQuestionId = order[currentIndex + 1];
          const newQuestion = await this.setActiveQuestion(roundId, nextQuestionId);
          return { stage: 'question', question: newQuestion };
        } else if (currentIndex === -1 && order.length > 0) {
          const newQuestion = await this.setActiveQuestion(roundId, order[0]);
          return { stage: 'question', question: newQuestion };
        } else {
          const roundService = require('./roundService');
          await roundService.endRound(roundId, 'system');
          return { stage: 'ended', question: null };
        }
      } else {
        // Non-poll (mcq, guess-author, profile-guess): show leaderboard
        await roundStore.setActiveStage(roundId, 'leaderboard');
        const settingsStore = require('../redis/settingsStore');
        await settingsStore.updateSettings({ showLeaderboard: 'true' });
        const io = getIO();
        if (io) io.emit('round:stage_changed', { roundId, activeStage: 'leaderboard' });
        if (io) io.emit('settings:updated', { showLeaderboard: true });
        return { stage: 'leaderboard', question };
      }
    }

    // ── STAGE 3: leaderboard → next question (or next round) ──────────────────
    if (activeStage === 'leaderboard') {
      await roundStore.setActiveStage(roundId, 'question');
      const settingsStore = require('../redis/settingsStore');
      await settingsStore.updateSettings({ showLeaderboard: 'false' });
      const io = getIO();
      if (io) io.emit('settings:updated', { showLeaderboard: false });
    }

    if (!order || order.length === 0) {
      const io = getIO();
      if (io) io.emit('round:stage_changed', { roundId, activeStage: 'question' });
      return { stage: 'question', question: null };
    }

    const currentIndex = order.indexOf(String(activeId));
    if (currentIndex >= 0 && currentIndex < order.length - 1) {
      const nextQuestionId = order[currentIndex + 1];
      const newQuestion = await this.setActiveQuestion(roundId, nextQuestionId);

      const io = getIO();
      if (io) io.emit('round:stage_changed', { roundId, activeStage: 'question' });

      return { stage: 'question', question: newQuestion };
    } else if (currentIndex === -1 && order.length > 0) {
      const newQuestion = await this.setActiveQuestion(roundId, order[0]);
      const io = getIO();
      if (io) io.emit('round:stage_changed', { roundId, activeStage: 'question' });
      return { stage: 'question', question: newQuestion };
    } else {
      const roundService = require('./roundService');
      await roundService.endRound(roundId, 'system');
      return { stage: 'ended', question: null };
    }
  }

  async previousQuestion(roundId) {
    const order = await questionStore.getQuestionsOrder(roundId);
    if (!order || order.length === 0) return null;
    const activeId = await questionStore.getActiveQuestionId(roundId);
    const currentIndex = order.indexOf(activeId);
    let prevIndex = order.length - 1;
    if (currentIndex > 0) prevIndex = currentIndex - 1;
    return await this.setActiveQuestion(roundId, order[prevIndex]);
  }

  async reorderQuestions(roundId, orderedIds) {
    await questionStore.reorderQuestions(roundId, orderedIds);
    try {
      const logStore = require('../redis/logStore');
      await logStore.addLog({
        adminUsername: 'admin',
        action: 'REORDER_QUESTIONS',
        target: `Reordered questions for ${roundId}`,
        details: `New Order: ${orderedIds.join(', ')}`
      });
    } catch (e) {}
    const io = getIO();
    if (io) {
      const activeId = await questionStore.getActiveQuestionId(roundId);
      const question = await this.getActiveQuestion(roundId);
      io.emit('question:changed', { roundId, activeQuestionId: activeId, question });
    }
  }

  async overrideDisplayedOption(roundId, optionId, targetQuestionId = null) {
    const activeId = await questionStore.getActiveQuestionId(roundId);
    const qId = targetQuestionId || activeId;
    if (!qId) throw new Error('No question target to override');
    const question = await questionStore.getQuestion(roundId, qId);
    if (!question || question.type !== 'guess-author') throw new Error('Question is not guess-author type');
    await questionStore.updateQuestion(roundId, qId, { displayedOptionId: optionId });
    
    try {
      const logStore = require('../redis/logStore');
      await logStore.addLog({
        adminUsername: 'admin',
        action: 'FORCE_OPTION',
        target: `Forced option ${optionId} on question ${qId} in ${roundId}`,
        details: `Target Question: ${qId} | Forced Option: ${optionId}`
      });
    } catch (e) {}

    if (qId === activeId) {
      const updatedQuestion = await this.getActiveQuestion(roundId);
      const io = getIO();
      if (io) io.emit('question:changed', { roundId, activeQuestionId: activeId, question: updatedQuestion });
      return updatedQuestion;
    }
    return { message: `Updated displayed option for question ${qId}` };
  }

  async evaluateQuestion(roundId) {
    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) throw new Error('No active question to evaluate');
    const question = await questionStore.getQuestion(roundId, activeId);
    if (!question) throw new Error('Active question not found');
    if (question.showEvaluation === false) {
      return { skipped: true, message: 'Evaluation disabled for this question' };
    }
    let correctAnswer = question.correctAnswer;
    if (question.type === 'guess-author') {
      const displayedId = question.displayedOptionId || 'human-opt';
      const displayedOpt = (question.options || []).find(o => o.id === displayedId);
      correctAnswer = displayedOpt?.author || 'Human';
    }
    const evaluationData = { questionId: question.id, correctAnswer: correctAnswer || 'N/A' };
    const io = getIO();
    if (io) io.emit('question:evaluate', { roundId, evaluationData });
    return evaluationData;
  }

  async revealPoll(roundId) {
    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) throw new Error('No active question');
    const question = await questionStore.getQuestion(roundId, activeId);
    if (!question) throw new Error('Active question not found');

    const result = await computePollResult(roundId, question);

    const io = getIO();
    if (io) io.emit('poll:revealed', { roundId, questionId: question.id, result });

    return result;
  }
}

module.exports = new QuestionService();
