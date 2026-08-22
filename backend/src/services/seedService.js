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
          // Best 2 from R1 (Guess the Author - 60s each)
          {
            id: "r1-q1", order: "1", type: "guess-author", text: "What's your take on vibe coding, just letting AI write most of your code?", prompt: "What's your take on vibe coding, just letting AI write most of your code?", durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "gemini-opt", text: "It's useful for prototyping and boilerplate, but relying on it fully without understanding the logic underneath tends to bite you during debugging or in interviews. Best used as an accelerator, not a replacement for fundamentals.", author: "Gemini" },
              { id: "human-opt", text: "Honestly I do it way more than I should. Copy paste, run, if it breaks I panic and start googling instead of actually reading the error.", author: "Human" }
            ]
          },
          {
            id: "r1-q2", order: "2", type: "guess-author", text: "How much do you trust AI chatbots to give you correct information?", prompt: "How much do you trust AI chatbots to give you correct information?", durationSeconds: '60', points: '10', correctAnswer: 'Human',
            options: [
              { id: "human-opt", text: "Depends what for. If it's something like a recipe or general knowledge I trust it, but the moment it's something specific to me, like my college syllabus, it just makes stuff up confidently.", author: "Human" },
              { id: "gemini-opt", text: "It's generally reliable for broad, well established information, but accuracy can drop for niche, recent, or highly specific topics, so it's good practice to verify anything important.", author: "Gemini" }
            ]
          },
          // Best 2 from R2 (Image Challenge - 60s each)
          {
            id: 'q2_2', order: '3', type: 'mcq', points: '10', durationSeconds: '60', text: 'This is a photo of a tiger in the wild. Which part of this photo was AI-edited?', prompt: 'This is a photo of a tiger in the wild. Which part of this photo was AI-edited?',
            options: [
              { key: 'A', label: 'The head / face', text: 'The head / face' },
              { key: 'B', label: 'The stripes on the abdomen', text: 'The stripes on the abdomen' },
              { key: 'C', label: 'The legs', text: 'The legs' },
              { key: 'D', label: 'The background', text: 'The background' }
            ],
            correctAnswer: 'B',
            imageUrl: '/reference/r2/tiger-edited.png'
          },
          {
            id: 'q2_3', order: '4', type: 'mcq', points: '10', durationSeconds: '60', text: 'This image is AI-generated. What is wrong with this image?', prompt: 'This image is AI-generated. What is wrong with this image?',
            options: [
              { key: 'A', label: 'Reflection mismatch', text: 'Reflection mismatch' },
              { key: 'B', label: 'Shadow mismatch', text: 'Shadow mismatch' },
              { key: 'C', label: 'Impossible perspective', text: 'Impossible perspective' },
              { key: 'D', label: 'Nothing — the image is real', text: 'Nothing — the image is real' }
            ],
            correctAnswer: 'A',
            imageUrl: '/reference/r2/dog-reflection.png'
          },
          // Best 2 from R4 Samples (Spot the Hallucination - 60s each)
          {
            id: 'r4-q1', order: '5', type: 'mcq', points: '15', durationSeconds: '60',
            text: 'What is wrong with this explanation of the Taj Mahal?',
            prompt: 'What is wrong with this explanation of the Taj Mahal?',
            aiResponse: 'The Taj Mahal is located in Agra and was commissioned by Shah Jahan. Construction began in 1632 and was completed in 1653. It was built to celebrate the annexation of Bijapur and Golconda during his Deccan campaigns.',
            correctAnswer: 'The monument was built to celebrate the annexation of Bijapur and Golconda',
            explanation: 'The Taj Mahal was commissioned by Shah Jahan as a mausoleum for his wife Mumtaz Mahal. The claimed connection to the annexation of Bijapur and Golconda is the hidden hallucination.',
            options: [
              "The Taj Mahal is not located in Agra",
              "Shah Jahan did not commission the Taj Mahal",
              "Construction could not have begun in the seventeenth century",
              "The monument was built to celebrate the annexation of Bijapur and Golconda",
              "The Taj Mahal is a mausoleum associated with Mumtaz Mahal rather than a Deccan-campaign victory monument"
            ]
          },
          {
            id: 'r4-q2', order: '6', type: 'mcq', points: '15', durationSeconds: '60',
            text: 'Should this research claim be accepted as stated?',
            prompt: 'Should this research claim be accepted as stated?',
            aiResponse: 'According to a Stanford University study published in 2023, students who use AI tools for more than two hours daily score 35% higher in engineering courses. The study proves that AI usage directly causes better academic performance.',
            correctAnswer: 'No; the citation lacks verifiable details and correlation does not establish causation',
            explanation: 'The citation lacks verifiable details and correlation does not establish causation.',
            options: [
              "Yes, because a Stanford attribution makes the claim automatically reliable",
              "Yes, because a 35% difference is enough to establish causation",
              "No; the citation lacks verifiable details and correlation does not establish causation",
              "No; AI can never improve academic performance under any circumstances",
              "Yes, because two hours per day is a scientifically established threshold"
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

      await roundStore.createRound({
        id: finalId,
        name: finalName,
        status: 'pending',
        durationSeconds: preset.baseId === 'round_5_reverse' ? '600' : '300',
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
