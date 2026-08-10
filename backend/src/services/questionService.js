const questionStore = require('../redis/questionStore');
const roundStore = require('../redis/roundStore');

const POLLS_DATA = [
  {
    id: "poll1",
    order: 1,
    options: [
      { key: "A", question: "What does a perfect Sunday look like for you?", answer: "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens." },
      { key: "B", question: "What's something your friends often tease you about?", answer: "Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago." },
      { key: "C", question: "What's one thing you almost never leave home without?", answer: "My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I've forgotten something important." }
    ]
  },
  {
    id: "poll2",
    order: 2,
    options: [
      { key: "A", question: "What's something younger people do that you find interesting?", answer: "How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first." },
      { key: "B", question: "What's a change in everyday life that still amazes you?", answer: "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things." },
      { key: "C", question: "How did you usually discover new music growing up?", answer: "Mostly through friends or hearing something somewhere repeatedly. Sometimes you'd like one song enough to take a chance on everything else by the same artist." }
    ]
  },
  {
    id: "poll3",
    order: 3,
    options: [
      { key: "A", question: "What's the most tiring part of your work?", answer: "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together." },
      { key: "B", question: "What skill do you think you're unusually good at?", answer: "Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed." },
      { key: "C", question: "What's something you do before an important meeting?", answer: "I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important." }
    ]
  },
  {
    id: "poll4",
    order: 4,
    options: [
      { key: "A", question: "What's something you find interesting about conversations?", answer: "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different." },
      { key: "B", question: "What's something you've become less impressed by over time?", answer: "Confidence. Someone sounding completely certain doesn't really tell me whether they're right anymore. I tend to pay more attention to the details." },
      { key: "C", question: "What do your friends sometimes find annoying about you?", answer: "I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering." }
    ]
  },
  {
    id: "poll5",
    order: 5,
    options: [
      { key: "A", question: "What kind of moments do you remember most clearly?", answer: "Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds." },
      { key: "B", question: "What's something you're unusually patient about?", answer: "Waiting when I feel the timing matters. I don't mind staying in the same place for a while if rushing would mean missing something interesting." },
      { key: "C", question: "When you visit somewhere new, what do you usually do first?", answer: "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly." }
    ]
  }
];

const getIO = () => {
  try {
    return require('../sockets/socketServer').getIO();
  } catch(e) {
    return null;
  }
};

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

    // If no active question is set for this round, set this new question as active
    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) {
      await questionStore.setActiveQuestionId(roundId, id);
    }
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

    let correctAnswer = question.correctAnswer;
    if (question.type === 'guess-author') {
      const displayedId = question.displayedOptionId || 'human-opt';
      const displayedOpt = (question.options || []).find(o => o.id === displayedId);
      correctAnswer = displayedOpt?.author || 'Human';
    }

    const { correctAnswer: _discard, ...questionWithoutAnswer } = question;
    
    if (questionWithoutAnswer.type === 'guess-author') {
      questionWithoutAnswer.options = (questionWithoutAnswer.options || []).map(opt => {
        const { author, ...rest } = opt;
        return rest;
      });
    }

    const activeStage = await roundStore.getActiveStage(roundId) || 'question';
    const isPoll = questionWithoutAnswer && (
      questionWithoutAnswer.type === 'poll' ||
      String(roundId).includes('3') ||
      String(roundId).includes('r3') ||
      String(questionWithoutAnswer.id).includes('poll')
    ) && questionWithoutAnswer.type !== 'profile-guess';

    if (activeStage === 'evaluated') {
      if (isPoll) {
        try {
          const pollMatch = POLLS_DATA.find(p => p.id === question.id || (p.order && Number(p.order) === Number(question.order)));
          let dbOpts = [];
          if (typeof question.options === 'string') {
            try { dbOpts = JSON.parse(question.options); } catch (e) {}
          } else if (Array.isArray(question.options)) {
            dbOpts = question.options;
          }
          const options = (pollMatch && pollMatch.options && pollMatch.options.length > 0) ? pollMatch.options : ((dbOpts && dbOpts.length > 0) ? dbOpts : []);
          
          const { getResponses } = require('../redis/responseStore');
          const responses = await getResponses(roundId).catch(() => []);
          const pollResponses = responses.filter(r => r.questionId === question.id);
          const counts = {};
          for (const r of pollResponses) {
            const ans = (r.answer || '').trim().toUpperCase();
            if (ans) counts[ans] = (counts[ans] || 0) + 1;
          }
          let winningKey = null;
          let maxCount = -1;
          for (const key of Object.keys(counts)) {
            if (counts[key] > maxCount) {
              maxCount = counts[key];
              winningKey = key;
            }
          }
          if (!winningKey && options.length > 0) winningKey = options[0].key || options[0].id || 'A';
          const winningOption = options.find(o => 
            (o.key && o.key.toUpperCase() === (winningKey || '').toUpperCase()) ||
            (o.id && o.id.toUpperCase() === (winningKey || '').toUpperCase()) ||
            (typeof o === 'string' && o.trim().toUpperCase() === (winningKey || '').toUpperCase())
          ) || options[0];

          let answerText = 'No votes recorded yet.';
          let winningQuestionText = '';
          if (winningOption) {
            if (typeof winningOption === 'string') answerText = winningOption;
            else {
              answerText = winningOption.answer || winningOption.text || 'No Answer';
              winningQuestionText = winningOption.question || winningOption.text || '';
            }
          }

          questionWithoutAnswer.pollResult = {
            winningKey: winningKey || 'A',
            answerText,
            winningQuestionText,
            counts
          };
        } catch (e) {}
      } else {
        questionWithoutAnswer.evaluationData = {
          questionId: question.id,
          correctAnswer: correctAnswer || 'N/A'
        };
      }
    }

    return questionWithoutAnswer;
  }

  async setActiveQuestion(roundId, questionId) {
    await questionStore.setActiveQuestionId(roundId, questionId);
    let question = await questionStore.getQuestion(roundId, questionId);
    if (question && question.type === 'guess-author') {
      const options = question.options || [];
      if (options.length > 0) {
        const randomOption = options[Math.floor(Math.random() * options.length)];
        await questionStore.updateQuestion(roundId, questionId, { displayedOptionId: randomOption.id });
      }
    }
    
    question = await this.getActiveQuestion(roundId);

    // Reset round timer to question duration if round is active
    const round = await roundStore.getRound(roundId);
    if (round && round.status === 'active' && question?.durationSeconds) {
      const updatedRound = {
        ...round,
        durationSeconds: question.durationSeconds,
        startedAt: Date.now().toString()
      };
      await roundStore.updateRound(roundId, {
        durationSeconds: updatedRound.durationSeconds,
        startedAt: updatedRound.startedAt
      });
      const io = getIO();
      if (io) io.emit('round:changed', { roundId, roundData: updatedRound });
    }

    const io = getIO();
    if (io) {
      io.emit('question:changed', { roundId, activeQuestionId: questionId, question });
    }
    return question;
  }

  async nextQuestion(roundId) {
    let activeStage = await roundStore.getActiveStage(roundId) || 'question';

    const order = await questionStore.getQuestionsOrder(roundId);
    const activeId = await questionStore.getActiveQuestionId(roundId);
    const question = await questionStore.getQuestion(roundId, activeId);

    const isPoll = question && (
      question.type === 'poll' ||
      String(roundId).includes('3') ||
      String(roundId).includes('r3') ||
      String(question.id).includes('poll')
    ) && question.type !== 'profile-guess' && question.id !== 'poll6' && question.id !== 'r3-q6';

    if (activeStage === 'question') {
      await roundStore.setActiveStage(roundId, 'evaluated');
      if (isPoll) {
        try { await this.revealPoll(roundId); } catch (e) {}
      } else {
        try { await this.evaluateQuestion(roundId); } catch (e) {}
      }
      const io = getIO();
      if (io) io.emit('round:stage_changed', { roundId, activeStage: 'evaluated' });
      return { stage: 'evaluated' };
    }

    if (activeStage === 'evaluated') {
      if (isPoll) {
        // FOR POLLS 1-5: Skip leaderboard stage completely!
        await roundStore.setActiveStage(roundId, 'question');
        const settingsStore = require('../redis/settingsStore');
        await settingsStore.updateSettings({ showLeaderboard: 'false' });
        const io = getIO();
        if (io) io.emit('settings:updated', { showLeaderboard: false });
        if (io) io.emit('round:stage_changed', { roundId, activeStage: 'question' });

        if (!order || order.length === 0) {
          return { stage: 'question', question: null };
        }
        const currentIndex = order.indexOf(activeId);
        let nextIndex = 0;
        if (currentIndex >= 0 && currentIndex < order.length - 1) {
          nextIndex = currentIndex + 1;
        }
        const nextQuestionId = order[nextIndex];
        const newQuestion = await this.setActiveQuestion(roundId, nextQuestionId);
        return { stage: 'question', question: newQuestion };
      } else {
        // FOR STANDARD QUESTIONS & FINAL QUESTION (Q6): Show Leaderboard
        await roundStore.setActiveStage(roundId, 'leaderboard');
        const settingsStore = require('../redis/settingsStore');
        await settingsStore.updateSettings({ showLeaderboard: 'true' });
        const io = getIO();
        if (io) io.emit('round:stage_changed', { roundId, activeStage: 'leaderboard' });
        if (io) io.emit('settings:updated', { showLeaderboard: true });
        return { stage: 'leaderboard' };
      }
    }

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

    const currentIndex = order.indexOf(activeId);
    let nextIndex = 0;
    if (currentIndex >= 0 && currentIndex < order.length - 1) {
      nextIndex = currentIndex + 1;
    }
    const nextQuestionId = order[nextIndex];
    const newQuestion = await this.setActiveQuestion(roundId, nextQuestionId);

    const io = getIO();
    if (io) io.emit('round:stage_changed', { roundId, activeStage: 'question' });

    return { stage: 'question', question: newQuestion };
  }

  async previousQuestion(roundId) {
    const order = await questionStore.getQuestionsOrder(roundId);
    if (!order || order.length === 0) return null;

    const activeId = await questionStore.getActiveQuestionId(roundId);
    const currentIndex = order.indexOf(activeId);
    let prevIndex = order.length - 1;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    }
    const prevQuestionId = order[prevIndex];
    return await this.setActiveQuestion(roundId, prevQuestionId);
  }

  async overrideDisplayedOption(roundId, optionId) {
    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) throw new Error("No active question to override");
    const question = await questionStore.getQuestion(roundId, activeId);
    if (!question || question.type !== 'guess-author') throw new Error("Question is not guess-author type");
    
    await questionStore.updateQuestion(roundId, activeId, { displayedOptionId: optionId });
    const updatedQuestion = await this.getActiveQuestion(roundId);
    
    const io = getIO();
    if (io) {
      io.emit('question:changed', { roundId, activeQuestionId: activeId, question: updatedQuestion });
    }
    return updatedQuestion;
  }

  async evaluateQuestion(roundId) {
    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) throw new Error("No active question to evaluate");
    
    const question = await questionStore.getQuestion(roundId, activeId);
    if (!question) throw new Error("Active question not found");

    if (question.showEvaluation === false) {
      return { skipped: true, message: 'Evaluation disabled for this question' };
    }

    let correctAnswer = question.correctAnswer;
    if (question.type === 'guess-author') {
      const displayedId = question.displayedOptionId || 'human-opt';
      const displayedOpt = (question.options || []).find(o => o.id === displayedId);
      correctAnswer = displayedOpt?.author || 'Human';
    }

    const evaluationData = {
      questionId: question.id,
      correctAnswer: correctAnswer || 'N/A'
    };

    const io = getIO();
    if (io) io.emit('question:evaluate', { roundId, evaluationData });
    
    return evaluationData;
  }

  async revealPoll(roundId) {
    const activeId = await questionStore.getActiveQuestionId(roundId);
    if (!activeId) throw new Error('No active question');
    const question = await questionStore.getQuestion(roundId, activeId);
    if (!question) throw new Error('Active question not found');

    const { getResponses } = require('../redis/responseStore');
    const responses = await getResponses(roundId);
    const pollResponses = responses.filter(r => r.questionId === question.id);

    const counts = {};
    for (const r of pollResponses) {
      const ans = (r.answer || '').trim().toUpperCase();
      if (ans) counts[ans] = (counts[ans] || 0) + 1;
    }

    let winningKey = null;
    let maxCount = -1;
    for (const key of Object.keys(counts)) {
      if (counts[key] > maxCount) {
        maxCount = counts[key];
        winningKey = key;
      }
    }

    let dbOpts = [];
    if (typeof question.options === 'string') {
      try { dbOpts = JSON.parse(question.options); } catch (e) {}
    } else if (Array.isArray(question.options)) {
      dbOpts = question.options;
    }

    const pollMatch = POLLS_DATA.find(p => p.id === question.id || (p.order && Number(p.order) === Number(question.order)));
    const options = (pollMatch && pollMatch.options && pollMatch.options.length > 0) ? pollMatch.options : ((dbOpts && dbOpts.length > 0) ? dbOpts : []);

    if (!winningKey && options.length > 0) {
      winningKey = options[0].key || options[0].id || 'A';
    }

    const winningOption = options.find(o => 
      (o.key && o.key.toUpperCase() === (winningKey || '').toUpperCase()) ||
      (o.id && o.id.toUpperCase() === (winningKey || '').toUpperCase()) ||
      (typeof o === 'string' && o.trim().toUpperCase() === (winningKey || '').toUpperCase())
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

    const result = {
      winningKey: winningKey || 'A',
      answerText,
      winningQuestionText,
      counts
    };

    const io = getIO();
    if (io) io.emit('poll:revealed', { roundId, questionId: question.id, result });
    
    return result;
  }
}

module.exports = new QuestionService();
