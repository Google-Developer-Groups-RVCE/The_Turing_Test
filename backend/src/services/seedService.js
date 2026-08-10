'use strict';

const roundStore = require('../redis/roundStore');
const questionStore = require('../redis/questionStore');
const responseStore = require('../redis/responseStore');
const leaderboardService = require('./leaderboardService');
const logStore = require('../redis/logStore');

class SeedService {
  async seedSamples(adminUsername) {
    // 1. Create 3 Rounds
    const rounds = [
      { id: 'round_1_aptitude',  name: 'Round 1 – Aptitude & Logic',         status: 'pending', durationSeconds: '300', order: '1' },
      { id: 'round_2_coding',    name: 'Round 2 – Algorithms & Coding',       status: 'pending', durationSeconds: '300', order: '2' },
      { id: 'round_3_decode',    name: 'Round 3 – Decode the Context',        status: 'pending', durationSeconds: '300', order: '3' },
    ];
    for (const r of rounds) await roundStore.saveRound(r);

    // 2. Questions for Round 1 (MCQ - 1 minute each)
    const r1Questions = [
      { id: 'q1_1', text: 'If 5 machines take 5 minutes to make 5 widgets, how long would 100 machines take to make 100 widgets?', type: 'mcq', options: ['5 minutes', '100 minutes', '50 minutes', '1 minute'], correctAnswer: '5 minutes', points: '10', order: '1', durationSeconds: '60' },
      { id: 'q1_2', text: 'Which number logically completes the sequence: 2, 6, 12, 20, 30, __?', type: 'mcq', options: ['42', '40', '36', '48'], correctAnswer: '42', points: '10', order: '2', durationSeconds: '60' },
      { id: 'q1_3', text: 'Look at this series: 7, 10, 8, 11, 9, 12, __. What number should come next?', type: 'mcq', options: ['10', '13', '7', '14'], correctAnswer: '10', points: '10', order: '3', durationSeconds: '60' },
    ];
    for (const q of r1Questions) await questionStore.addQuestion('round_1_aptitude', q);
    await questionStore.setActiveQuestionId('round_1_aptitude', 'q1_1');

    // 3. Questions for Round 2 (MCQ / coding - 1 minute each)
    const r2Questions = [
      { id: 'q2_1', text: 'What is the worst-case time complexity of QuickSort?', type: 'mcq', options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'], correctAnswer: 'O(n²)', points: '10', order: '1', durationSeconds: '60' },
      { id: 'q2_2', text: 'Which data structure is primarily used to implement Breadth-First Search (BFS) in a graph?', type: 'mcq', options: ['Queue', 'Stack', 'Priority Queue', 'Array'], correctAnswer: 'Queue', points: '10', order: '2', durationSeconds: '60' },
      { id: 'q2_3', text: "What will be the output of 3 + '3' - 3 in JavaScript?", type: 'mcq', options: ['30', 'NaN', '33', '0'], correctAnswer: '30', points: '10', order: '3', durationSeconds: '60' },
    ];
    for (const q of r2Questions) await questionStore.addQuestion('round_2_coding', q);
    await questionStore.setActiveQuestionId('round_2_coding', 'q2_1');

    // 4. Questions for Round 3 (5 polls + 1 profile-guess)
    await this.seedRound3Questions('round_3_decode');

    await logStore.addLog({ action: 'SEED_SAMPLE_DATA', adminUsername, timestamp: Date.now().toString(), details: 'Seeded 3 rounds (Round 3 with 5 polls + profile-guess)' });
    return { message: 'Seeded 3 sample rounds (Round 3: 5 polls + profile-guess)' };
  }

  /**
   * Seed Round 3 poll questions (poll1–poll5) + the final profile-guess question.
   * Safe to call on an existing round — checks before adding.
   */
  async seedRound3Questions(roundId) {
    const existing = await questionStore.getQuestionsOrder(roundId);
    if (existing && existing.length >= 6) {
      // Still update existing poll durations to match requirements
      for (let i = 1; i <= 5; i++) {
        await questionStore.updateQuestion(roundId, `poll${i}`, { durationSeconds: '120' });
      }
      await questionStore.updateQuestion(roundId, 'poll6', { durationSeconds: '240' });
      return { message: 'Round 3 questions updated' };
    }

    const r3Questions = [
      {
        id: 'poll1', order: '1', type: 'poll',
        text: 'Poll 1 – Daily Life: Vote for the question you want Gemini to answer',
        options: [
          { key: 'A', question: "What does a perfect Sunday look like for you?",       answer: "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens." },
          { key: 'B', question: "What's something your friends often tease you about?", answer: "Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago." },
          { key: 'C', question: "What's one thing you almost never leave home without?", answer: "My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I've forgotten something important." }
        ],
        correctAnswer: '',
        points: '0',
        showEvaluation: false,
        durationSeconds: '120'
      },
      {
        id: 'poll2', order: '2', type: 'poll',
        text: 'Poll 2 – Memories & Experiences: Vote for the question you want Gemini to answer',
        options: [
          { key: 'A', question: "What's something younger people do that you find interesting?", answer: "How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first." },
          { key: 'B', question: "What's a change in everyday life that still amazes you?",          answer: "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things." },
          { key: 'C', question: "How did you usually discover new music growing up?",               answer: "Mostly through friends or hearing something somewhere repeatedly. Sometimes you'd like one song enough to take a chance on everything else by the same artist." }
        ],
        correctAnswer: '',
        points: '0',
        showEvaluation: false,
        durationSeconds: '120'
      },
      {
        id: 'poll3', order: '3', type: 'poll',
        text: 'Poll 3 – Work & Thinking: Vote for the question you want Gemini to answer',
        options: [
          { key: 'A', question: "What's the most tiring part of your work?",                answer: "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together." },
          { key: 'B', question: "What skill do you think you're unusually good at?",        answer: "Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed." },
          { key: 'C', question: "What's something you do before an important meeting?",     answer: "I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important." }
        ],
        correctAnswer: '',
        points: '0',
        showEvaluation: false,
        durationSeconds: '120'
      },
      {
        id: 'poll4', order: '4', type: 'poll',
        text: 'Poll 4 – Behaviour & Perspective: Vote for the question you want Gemini to answer',
        options: [
          { key: 'A', question: "What's something you find interesting about conversations?",  answer: "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different." },
          { key: 'B', question: "What's something you've become less impressed by over time?", answer: "Confidence. Someone sounding completely certain doesn't really tell me whether they're right anymore. I tend to pay more attention to the details." },
          { key: 'C', question: "What do your friends sometimes find annoying about you?",      answer: "I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering." }
        ],
        correctAnswer: '',
        points: '0',
        showEvaluation: false,
        durationSeconds: '120'
      },
      {
        id: 'poll5', order: '5', type: 'poll',
        text: 'Poll 5 – Personal Interests: Vote for the question you want Gemini to answer',
        options: [
          { key: 'A', question: "What kind of moments do you remember most clearly?",      answer: "Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds." },
          { key: 'B', question: "What's something you're unusually patient about?",        answer: "Waiting when I feel the timing matters. I don't mind staying in the same place for a while if rushing would mean missing something interesting." },
          { key: 'C', question: "When you visit somewhere new, what do you usually do first?", answer: "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly." }
        ],
        correctAnswer: '',
        points: '0',
        showEvaluation: false,
        durationSeconds: '120'
      },
      {
        id: 'poll6', order: '6', type: 'profile-guess',
        text: 'Final Submission – Decode the Hidden Profile',
        options: [],
        correctAnswer: 'Age: 47 | Profession: Lawyer | Hobby: Photography',
        points: '30',
        showEvaluation: true,
        durationSeconds: '240',
        // Scoring targets
        targetAge: '47',
        targetProfession: 'Lawyer',
        targetHobby: 'Photography'
      }
    ];

    for (const q of r3Questions) {
      // Don't duplicate if already exists
      if (!existing || !existing.includes(q.id)) {
        await questionStore.addQuestion(roundId, q);
      }
    }
    await questionStore.setActiveQuestionId(roundId, 'poll1');
    return { message: `Round 3 questions seeded for ${roundId}` };
  }

  async clearAllData(adminUsername) {
    await responseStore.clearAllResponses();
    await leaderboardService.resetLeaderboard(adminUsername);
    await logStore.addLog({ action: 'CLEAR_ALL_DATA', adminUsername, timestamp: Date.now().toString(), details: 'Cleared all responses and reset leaderboard' });
    return { message: 'All live responses cleared and leaderboard reset' };
  }
}

module.exports = new SeedService();
