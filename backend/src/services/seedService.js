'use strict';

const roundStore = require('../redis/roundStore');
const questionStore = require('../redis/questionStore');
const responseStore = require('../redis/responseStore');
const leaderboardService = require('./leaderboardService');
const logStore = require('../redis/logStore');
const { redisClient } = require('../config/redisClient');
const keys = require('../redis/keys');

class SeedService {
  async seedSamples(adminUsername) {
    // Clear all existing rounds and questions first to start fresh
    const roundKeys = await redisClient.keys('round:*');
    if (roundKeys.length > 0) {
      await redisClient.del(roundKeys);
    }
    await redisClient.del(keys.ROUNDS_ORDER);
    await redisClient.del(keys.CURRENT_ROUND);

    // Inject all 5 preset rounds with their full questions and updated settings
    return await this.injectPresetRound('all', adminUsername);
  }

  async clearAllData(adminUsername) {
    await responseStore.clearAllResponses();
    await leaderboardService.resetLeaderboard(adminUsername);
    try {
      const r5Store = require('../redis/r5Store');
      await r5Store.clearAll();
      await r5Store.setPhase('prompt');
      await r5Store.setGeminiResponse("The quiet hours when the world is asleep are where your future self is built step by step. Every page you read tonight is bringing you closer to the moment you walk out of that exam knowing you gave it everything.");
    } catch {}
    await logStore.addLog({ action: 'CLEAR_ALL_DATA', adminUsername, timestamp: Date.now().toString(), details: 'Cleared all responses and reset leaderboard' });
    return { message: 'All live responses cleared and leaderboard reset' };
  }

  async injectPresetRound(targetRound = 'all', adminUsername = 'admin') {
    const roundService = require('./roundService');
    const presets = [
      {
        baseId: 'round_1_rapid_fire',
        baseName: 'Round 1 — Rapid Fire',
        orderNum: '1',
        questions: [
          {
            id: "r1-q1", order: "1", type: "guess-author",
            text: "What makes a mistake educational rather than purely wasteful?",
            prompt: "What makes a mistake educational rather than purely wasteful?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "gemini-opt", text: "Prompt, honest analysis of the root cause, followed by a concrete change in strategy before repeating the action.", author: "Gemini" },
              { id: "human-opt", text: "Systematic reflection. A mistake becomes valuable only when it forces a recalibration of assumptions rather than mere regret.", author: "Human" }
            ]
          },
          {
            id: "r1-q2", order: "2", type: "guess-author",
            text: "Why does anticipation of an event often feel more intense than the event itself?",
            prompt: "Why does anticipation of an event often feel more intense than the event itself?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "human-opt", text: "Imagination operates without constraints or physical friction, allowing the brain to simulate infinite best-case or worst-case scenarios uninterrupted.", author: "Human" },
              { id: "gemini-opt", text: "Because the mind projects unrestricted potential, whereas the actual event is bounded by real-time reality and practical limitations.", author: "Gemini" }
            ]
          },
          {
            id: "r1-q3", order: "3", type: "guess-author",
            text: "Why do people often overcomplicate simple decisions?",
            prompt: "Why do people often overcomplicate simple decisions?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "human-opt", text: "Anxiety over potential opportunity cost. When options are plentiful, the fear of making a suboptimal choice drives over-analysis of trivial details.", author: "Human" },
              { id: "gemini-opt", text: "Fear of regret often overrides logic, causing people to analyze minor variables to gain a false sense of control over the outcome.", author: "Gemini" }
            ]
          },
          {
            id: "r1-q4", order: "4", type: "guess-author",
            text: "How does living in a major city alter a person's perception of time?",
            prompt: "How does living in a major city alter a person's perception of time?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "human-opt", text: "Major cities accelerate micro-perceptions of time while compressing long-term memory. The constant input of traffic, schedules, and transit forces the mind to live in hyper-aware, short-term increments, making days feel packed and fast, yet blur together when looking back over years.", author: "Human" },
              { id: "gemini-opt", text: "Urban environments often compress our awareness of time due to high density and constant schedules. The pacing of public transit, rapid environmental changes, and fixed routines create a heightened sense of urgency, making minutes feel more critical than they might in quieter, less structured settings.", author: "Gemini" }
            ]
          },
          {
            id: "r1-q5", order: "5", type: "guess-author",
            text: "Why do humans feel a strange comfort in listening to sad music when they are down?",
            prompt: "Why do humans feel a strange comfort in listening to sad music when they are down?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "human-opt", text: "Sad music provides a form of psychological validation without requiring social interaction. It creates a space where an emotion can be felt completely and safely, serving as a mirror that reassures the listener that their state of mind is shared and natural.", author: "Human" },
              { id: "gemini-opt", text: "Listening to melancholic music can foster a sense of emotional alignment and empathy. Rather than amplifying distress, it often offers a cathartic release by reflecting the listener's internal state, allowing them to process complex emotions in a safe, controlled aesthetic context.", author: "Gemini" }
            ]
          },
          {
            id: "r1-q6", order: "6", type: "guess-author",
            text: "What role does failure play in long-term personal growth?",
            prompt: "What role does failure play in long-term personal growth?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "human-opt", text: "Failure acts as a necessary diagnostic tool. It strips away false assumptions about one's capabilities or strategies, forcing a recalibration that success rarely demands. Over time, navigating failure builds adaptability and a more grounded sense of competence.", author: "Human" },
              { id: "gemini-opt", text: "Failure serves as a critical feedback mechanism in personal development. It highlights gaps in understanding or execution, encouraging reflection and resilience. While uncomfortable, it provides practical insights that refine future decision-making far more effectively than immediate success.", author: "Gemini" }
            ]
          },
          {
            id: "r1-q7", order: "7", type: "guess-author",
            text: "What makes a story ending feel satisfying versus forced?",
            prompt: "What makes a story ending feel satisfying versus forced?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "gemini-opt", text: "A satisfying resolution feels earned through the logical consequences of the characters' decisions, even if the outcome is unexpected. A forced ending usually relies on coincidence, unestablished mechanics, or external intervention to tie up plot points prematurely.", author: "Gemini" },
              { id: "human-opt", text: "Satisfaction in a narrative conclusion relies on emotional and thematic coherence rather than just resolving the plot. If the characters' internal arcs reach a natural resolution that aligns with established stakes, the ending feels complete, even if loose threads remain.", author: "Human" }
            ]
          },
          {
            id: "r1-q8", order: "8", type: "guess-author",
            text: "How does nostalgic memory differ from actual history?",
            prompt: "How does nostalgic memory differ from actual history?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "human-opt", text: "History aims to preserve contextual facts and structural timelines, whereas nostalgia filters out discomfort to preserve a specific past emotional state.", author: "Human" },
              { id: "gemini-opt", text: "History records events as they unfolded, while nostalgia edits those events to reflect how a period felt rather than what actually occurred.", author: "Gemini" }
            ]
          },
          {
            id: "r1-q9", order: "9", type: "guess-author",
            text: "Why do old photos feel distinct from modern digital photos?",
            prompt: "Why do old photos feel distinct from modern digital photos?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "gemini-opt", text: "Analog photographs carry tangible physical constraints — limited exposures, chemical grain, and color shifts that create a sense of permanent artifacting.", author: "Gemini" },
              { id: "human-opt", text: "Film photos capture a singular, deliberate moment due to physical film limits, giving them an authenticity often lost in infinite digital takes.", author: "Human" }
            ]
          },
          {
            id: "r1-q10", order: "10", type: "guess-author",
            text: "What is the subtle boundary between patience and procrastination?",
            prompt: "What is the subtle boundary between patience and procrastination?",
            durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "gemini-opt", text: "Patience is strategic waiting while gathering context or waiting for timing; procrastination is tactical avoidance driven by discomfort or fear.", author: "Gemini" },
              { id: "human-opt", text: "Intentionality. Patience is an active choice to wait for optimal conditions, whereas procrastination is passive delay to avoid immediate effort.", author: "Human" }
            ]
          }
        ]

      },
      {
        baseId: 'round_2_decode',
        baseName: 'Round 2 — Decode the Context',
        orderNum: '2',
        questions: [
          {
            id: 'poll1', order: '1', type: 'poll', text: 'Poll 1 — Daily Life', prompt: 'Vote for the question you want Gemini to answer', correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '90',
            options: [
              { key: 'A', question: "What does a perfect Sunday look like for you?", answer: "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens." },
              { key: 'B', question: "What's something your friends often tease you about?", answer: "Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago." },
              { key: 'C', question: "What's one thing you almost never leave home without?", answer: "My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I've forgotten something important." }
            ]
          },
          {
            id: 'poll2', order: '2', type: 'poll', text: 'Poll 2 — Memories & Experiences', prompt: 'Vote for the question you want Gemini to answer', correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '90',
            options: [
              { key: 'A', question: "What's something younger people do that you find interesting?", answer: "How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first." },
              { key: 'B', question: "What's a change in everyday life that still amazes you?", answer: "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things." },
              { key: 'C', question: "How did you usually discover new music growing up?", answer: "Mostly through friends or hearing something somewhere repeatedly. Sometimes you'd like one song enough to take a chance on everything else by the same artist." }
            ]
          },
          {
            id: 'poll3', order: '3', type: 'poll', text: 'Poll 3 — Work & Thinking', prompt: 'Vote for the question you want Gemini to answer', correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '90',
            options: [
              { key: 'A', question: "What's the most tiring part of your work?", answer: "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together." },
              { key: 'B', question: "What skill do you think you're unusually good at?", answer: "Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed." },
              { key: 'C', question: "What's something you do before an important meeting?", answer: "I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important." }
            ]
          },
          {
            id: 'poll4', order: '4', type: 'poll', text: 'Poll 4 — Behaviour & Perspective', prompt: 'Vote for the question you want Gemini to answer', correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '90',
            options: [
              { key: 'A', question: "What's something you find interesting about conversations?", answer: "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different." },
              { key: 'B', question: "What's something you've become less impressed by over time?", answer: "Confidence. Someone sounding completely certain doesn't really tell me whether they're right anymore. I tend to pay more attention to the details." },
              { key: 'C', question: "What do your friends sometimes find annoying about you?", answer: "I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering." }
            ]
          },
          {
            id: 'poll5', order: '5', type: 'poll', text: 'Poll 5 — Personal Interests', prompt: 'Vote for the question you want Gemini to answer', correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '90',
            options: [
              { key: 'A', question: "What kind of moments do you remember most clearly?", answer: "Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds." },
              { key: 'B', question: "What's something you're unusually patient about?", answer: "Waiting when I feel the timing matters. I don't mind staying in the same place for a while if rushing would mean missing something interesting." },
              { key: 'C', question: "When you visit somewhere new, what do you usually do first?", answer: "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly." }
            ]
          },
          {
            id: 'poll6', order: '6', type: 'profile-guess', text: 'Final Submission', prompt: 'Decode the Hidden Profile', correctAnswer: 'Age: 47 | Profession: Lawyer | Hobby: Photography', points: '30', showEvaluation: true, durationSeconds: '240', targetAge: '47', targetProfession: 'Lawyer', targetHobby: 'Photography', options: []
          }
        ]
      },
      {
        baseId: 'round_3_reverse',
        baseName: 'Round 3 — Reverse Turing Test',
        orderNum: '3',
        questions: [
          {
            id: 'r5_q1',
            order: '1',
            type: 'reverse-turing',
            title: 'Round 3 — Reverse Turing Test',
            subtitle: 'Write Like an AI',
            text: 'Write a short 2-sentence motivational quote for someone studying for finals at 3 AM',
            prompt: 'Write a short 2-sentence motivational quote for someone studying for finals at 3 AM',
            description: "Can you write a response so convincing that others think it was written by Gemini? Your response will be mixed with Gemini's actual response — try to fool everyone!",
            durationSeconds: '240',
            points: '20',
            showEvaluation: false,
            options: []
          }
        ]
      }
    ];

    let toInject = [];
    if (String(targetRound).toLowerCase() === 'all') {
      toInject = presets;
    } else {
      const idx = parseInt(targetRound, 10) - 1;
      if (presets[idx]) toInject = [presets[idx]];
    }

    if (toInject.length === 0) {
      throw new Error(`Invalid preset round target: ${targetRound}`);
    }

    const addedRounds = [];

    for (const preset of toInject) {
      const currentRounds = await roundService.getAllRounds();

      let finalName = preset.baseName;
      let finalId = preset.baseId;

      const hasExistingName = currentRounds.some(r => r.name === preset.baseName);
      if (hasExistingName) {
        let counter = 1;
        while (currentRounds.some(r => r.name === `${preset.baseName} ${counter}` || r.name === `${preset.baseName} (${counter})`)) {
          counter++;
        }
        finalName = `${preset.baseName} ${counter}`;
        finalId = `${preset.baseId}_${counter}`;
      }

      if (currentRounds.some(r => r.id === finalId)) {
        finalId = `${preset.baseId}_${Date.now()}`;
      }

      const newOrder = currentRounds.length + 1;
      const totalRoundSeconds = preset.questions.reduce((sum, q) => sum + (parseInt(q.durationSeconds, 10) || 60), 0);

      await roundStore.createRound({
        id: finalId,
        name: finalName,
        status: 'pending',
        durationSeconds: String(totalRoundSeconds || 300),
        order: String(newOrder)
      });

      await roundStore.setActiveStage(finalId, 'question');

      for (const q of preset.questions) {
        await questionStore.addQuestion(finalId, q);
      }

      if (preset.questions.length > 0) {
        await questionStore.setActiveQuestionId(finalId, preset.questions[0].id);
      }

      // Initialize Reverse Turing Test default Gemini response & initial phase
      if (preset.baseId === 'round_3_reverse' || preset.baseId === 'round_5_reverse') {
        try {
          const r5Store = require('../redis/r5Store');
          await r5Store.setGeminiResponse("The quiet hours when the world is asleep are where your future self is built step by step. Every page you read tonight is bringing you closer to the moment you walk out of that exam knowing you gave it everything.");
          await r5Store.setPhase('prompt');
        } catch { /* silent */ }
      }

      addedRounds.push(finalName);

      await logStore.addLog({
        action: 'INJECT_PRESET_ROUND',
        adminUsername: adminUsername || 'admin',
        timestamp: Date.now().toString(),
        details: `Added preset round "${finalName}" (ID: ${finalId}) with ${preset.questions.length} questions`
      });
    }

    return {
      message: `Successfully added ${addedRounds.length} round(s): ${addedRounds.join(', ')}`,
      addedRounds
    };
  }
}

module.exports = new SeedService();
