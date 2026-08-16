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
    rounds.push({ id: 'round_4_hallucination', name: 'Round 4 - Spot the Hallucination', status: 'pending', durationSeconds: '300', order: '4' });
    for (const r of rounds) {
      const existingRound = await roundStore.getRound(r.id);
      if (existingRound) await roundStore.updateRound(r.id, { name: r.name, durationSeconds: r.durationSeconds, order: r.order });
      else await roundStore.createRound(r);
    }

    // 2. Questions for Round 1 (MCQ - 1 minute each)
    const r1Questions = [
      { id: 'q1_1', text: 'If 5 machines take 5 minutes to make 5 widgets, how long would 100 machines take to make 100 widgets?', type: 'mcq', options: ['5 minutes', '100 minutes', '50 minutes', '1 minute'], correctAnswer: '5 minutes', points: '10', order: '1', durationSeconds: '60' },
      { id: 'q1_2', text: 'Which number logically completes the sequence: 2, 6, 12, 20, 30, __?', type: 'mcq', options: ['42', '40', '36', '48'], correctAnswer: '42', points: '10', order: '2', durationSeconds: '60' },
      { id: 'q1_3', text: 'Look at this series: 7, 10, 8, 11, 9, 12, __. What number should come next?', type: 'mcq', options: ['10', '13', '7', '14'], correctAnswer: '10', points: '10', order: '3', durationSeconds: '60' },
    ];
    const existingR1 = await questionStore.getQuestionsOrder('round_1_aptitude');
    for (const q of r1Questions) if (!existingR1.includes(q.id)) await questionStore.addQuestion('round_1_aptitude', q);
    await questionStore.setActiveQuestionId('round_1_aptitude', 'q1_1');

    // 3. Round 2: fixed-answer image challenges with direct point allocation.
    await this.seedRound2Questions('round_2_coding');

    // 4. Questions for Round 3 (5 polls + 1 profile-guess)
    await this.seedRound3Questions('round_3_decode');
    await this.seedHallucinationQuestions('round_4_hallucination');

    // --- Round 5: Reverse Turing Test ---
    const r5Exists = await roundStore.getRound('round_5_reverse');
    if (!r5Exists) {
      await roundStore.createRound({
        id: 'round_5_reverse',
        name: 'Round 5 – Reverse Turing Test',
        status: 'pending',
        durationSeconds: '600',
        order: '5'
      });
    }
    const r5Store = require('../redis/r5Store');
    const currentGemini = await r5Store.getGeminiResponse();
    if (!currentGemini) {
      await r5Store.setGeminiResponse("The quiet hours when the world is asleep are where your future self is built step by step. Every page you read tonight is bringing you closer to the moment you walk out of that exam knowing you gave it everything.");
    }
    const currentPhase = await r5Store.getPhase();
    if (!currentPhase) {
      await r5Store.setPhase('prompt');
    }
    const r5QExists = await questionStore.getQuestionsOrder('round_5_reverse');
    if (!r5QExists || r5QExists.length === 0) {
      await questionStore.addQuestion('round_5_reverse', {
        id: 'r5_q1',
        text: 'Write a short 2-sentence motivational quote for someone studying for finals at 3 AM',
        type: 'reverse-turing',
        options: [],
        correctAnswer: '',
        points: '0',
        order: '1',
        durationSeconds: '600',
        showEvaluation: false
      });
      await questionStore.setActiveQuestionId('round_5_reverse', 'r5_q1');
    }

    await logStore.addLog({ action: 'SEED_SAMPLE_DATA', adminUsername, timestamp: Date.now().toString(), details: 'Seeded sample rounds including Round 5' });
    return { message: 'Seeded sample rounds including Round 5' };
  }

  async seedHallucinationQuestions(roundId) {
    const questions = [
      ['h1', 'Warm-up - Obvious Hallucination', 'Who was the first person to walk on Mars?', "Neil Armstrong became the first person to walk on Mars during NASA's 1985 Mars expedition.", 'Hallucination', 'No human has walked on Mars. No NASA Mars expedition occurred in 1985. The entire answer is fabricated.'],
      ['h2', 'Warm-up - Obvious Hallucination', 'What happened during the Battle of Bengaluru in World War II?', 'The Battle of Bengaluru was a major conflict between Allied and Axis forces in southern India in 1943.', 'Hallucination', 'No such battle occurred. The response invents a historical event.'],
      ['h3', 'Warm-up - Obvious Hallucination', 'Which Indian astronaut planted the first Indian flag on the Moon?', 'Rakesh Sharma planted the first Indian flag on the Moon in 1991.', 'Hallucination', 'No Indian astronaut has walked on the Moon. Rakesh Sharma never visited the Moon.'],
      ['h4', 'Warm-up - Suspicious Source', 'Does drinking coffee improve IQ?', 'A 2021 MIT study proved that coffee permanently increases IQ by 15 points.', 'Likely fabricated / unsupported', "Ask: Is the source verifiable? Does 'proved' sound suspicious? A permanent 15-point IQ increase is an extraordinary claim that needs strong evidence."],
      ['h5', 'Round 2 - Hidden Hallucination', 'What is wrong with this response about the Great Wall of China?', 'The Great Wall of China is visible from the Moon with the naked eye and remains one of humanity\'s greatest engineering achievements.', 'One hidden hallucination', 'The Great Wall being visible from the Moon with the naked eye is the false claim. The rest is broadly true.'],
      ['h6', 'Round 2 - Hidden Hallucination', 'What is wrong with this response about Einstein?', 'Albert Einstein won the Nobel Prize in Physics in 1921 for his Theory of Relativity, which revolutionized modern physics.', 'The reason is wrong', 'Einstein did win the 1921 Nobel Prize in Physics, but he was awarded it primarily for his explanation of the photoelectric effect, not for the theory of relativity.'],
      ['h7', 'Round 3 - Unsafe Advice', 'How should the following password advice be evaluated?', 'Use your birthday, pet\'s name, favorite team, or another personal detail so you never forget your password.', 'Unsafe / incorrect advice', 'Personal details can be guessed or discovered. The response sounds helpful but compromises password security.'],
      ['h8', 'Round 3 - Historical Trap', 'What is wrong with this explanation of the Taj Mahal?', 'The Taj Mahal is located in Agra and was commissioned by Shah Jahan. Construction began in 1632 and was completed in 1653. It was built to celebrate the annexation of Bijapur and Golconda during his Deccan campaigns.', 'Hidden hallucination', "The Taj Mahal is a mausoleum associated with Shah Jahan's wife Mumtaz Mahal. The Deccan campaign explanation is the fabricated claim."],
      ['h9', 'Round 4 - Binary Trap', 'Which statement contains the hidden error?', 'Binary numbers use only the digits 0 and 1. Computers internally represent data using binary. Therefore, every decimal number can be represented exactly in binary form.', 'Hidden mathematical error', 'Not every decimal fraction has a finite exact binary representation. 0.1 is a classic example.'],
      ['h10', 'Round 4 - Physics Trap', 'A piece of wood is dropped from a 100 m building while a bullet is fired upward and embeds in it. Find the height the combination rises above the building.', '', '50 m is wrong - correct answer: 40 m', 'The collision is inelastic, so mechanical energy is not conserved through it. Apply conservation of momentum during the collision.', '/reference/wood-physics-ai-response.png'],
      ['h11', 'Round 5 - Meta AI Trap', 'Which part of this response should make you suspicious?', 'ChatGPT was released by OpenAI in 2022 and quickly became one of the most widely used AI systems in history. It is trained on vast amounts of text and can answer questions across many domains. Because of its advanced reasoning abilities, its factual statements are generally reliable and should be trusted unless there is strong evidence to the contrary.', 'Overclaim / blind-trust trap', 'The final sentence is the problem. It encourages blind trust and overstates reliability. AI outputs should be verified, especially in high-stakes situations.'],
      ['h12', 'Round 5 - Fake Citation Trap', 'Should this research claim be accepted as stated?', 'According to a Stanford University study published in 2023, students who use AI tools for more than two hours daily score 35% higher in engineering courses. The study proves that AI usage directly causes better academic performance.', 'Unsupported / likely fabricated', "The citation may be fabricated or misrepresented. No study details are provided, correlation does not establish causation, and the word 'proves' is suspicious."]
    ];
    const existing = await questionStore.getQuestionsOrder(roundId);
    for (let order = 0; order < questions.length; order += 1) {
      const [id, title, text, aiResponse, correctAnswer, explanation, sourceImageUrl] = questions[order];
      if (!existing.includes(id)) await questionStore.addQuestion(roundId, { id, title, text, type: 'hallucination', aiResponse, correctAnswer, explanation, sourceImageUrl, options: [], points: 0, durationSeconds: 300, order: order + 1, showEvaluation: true });
    }
    if (!await questionStore.getActiveQuestionId(roundId)) await questionStore.setActiveQuestionId(roundId, 'h1');
  }

  /** Replace only Round 2's questions; all other rounds stay intact. */
  async seedRound2Questions(roundId, resetResponses = false, adminUsername = 'system') {
    const questions = [
      { id: 'q2_1', order: '1', type: 'mcq', points: '10', durationSeconds: '60', text: 'Identify the option that correctly fills in the missing parts of the prompt.', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B', imageUrl: '/reference/r2/cyclist-night-street.png' },
      { id: 'q2_2', order: '2', type: 'mcq', points: '10', durationSeconds: '60', text: 'This is a photo of a tiger in the wild. Which part of this photo was AI-edited?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B', imageUrl: '/reference/r2/tiger-edited.png' },
      { id: 'q2_3', order: '3', type: 'mcq', points: '10', durationSeconds: '60', text: 'This image is AI-generated. What is wrong with this image?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', imageUrl: '/reference/r2/dog-reflection.png' },
      { id: 'q2_4', order: '4', type: 'mcq', points: '10', durationSeconds: '60', text: 'Choose the prompt that is most appropriate for this living-room image.', options: ['A', 'B', 'C', 'D'], correctAnswer: 'C', imageUrl: '/reference/r2/living-room.png' }
    ];
    if (resetResponses) {
      await responseStore.clearRoundResponses(roundId);
      await leaderboardService.recalculateLeaderboard(adminUsername);
    }
    const existing = await questionStore.getQuestionsOrder(roundId);
    for (const question of questions) {
      if (existing.includes(question.id)) await questionStore.updateQuestion(roundId, question.id, question);
      else await questionStore.addQuestion(roundId, question);
    }
    await questionStore.setActiveQuestionId(roundId, 'q2_1');
    return { message: `Round 2 questions seeded for ${roundId}` };
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
