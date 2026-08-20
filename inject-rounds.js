'use strict';

/**
 * inject-rounds.js
 * 
 * Standalone script to inject Round 1, Round 2, and Round 3 event data into Redis.
 * Safe for manual execution whenever rounds need to be reset, re-populated, or repaired.
 * 
 * Usage:
 *   node inject-rounds.js
 * 
 * Configurable Environment Variables:
 *   REDIS_HOST     (Default: 127.0.0.1)
 *   REDIS_PORT     (Default: 6379 or 6380 if port forwarded)
 *   REDIS_PASSWORD (Default: production-redis-password)
 */

let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  try {
    Redis = require('./backend/node_modules/ioredis');
  } catch (err) {
    console.error('Error: ioredis is required to run this script. Run `npm install` in ./backend.');
    process.exit(1);
  }
}

async function injectRounds() {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT, 10) || (process.env.REDIS_HOST ? 6379 : 6380);
  const password = process.env.REDIS_PASSWORD !== undefined ? process.env.REDIS_PASSWORD : 'production-redis-password';

  console.log(`Connecting to Redis at ${host}:${port}...`);
  const client = new Redis({
    host,
    port,
    password,
    retryStrategy: (times) => Math.min(times * 100, 3000)
  });

  client.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  // Key Constants
  const KEYS = {
    ROUNDS_ORDER: 'rounds:order',
    CURRENT_ROUND: 'current_round',
    ROUND: (id) => `round:${id}`,
    QUESTIONS: (roundId) => `round:${roundId}:questions`,
    QUESTION: (roundId, qId) => `round:${roundId}:question:${qId}`,
    ACTIVE_QUESTION: (roundId) => `round:${roundId}:active_question`,
    ACTIVE_STAGE: (roundId) => `round:${roundId}:stage`
  };

  console.log('Cleaning up existing rounds and questions...');
  const roundKeys = await client.keys('round:*');
  if (roundKeys.length > 0) {
    await client.del(roundKeys);
  }
  await client.del(KEYS.ROUNDS_ORDER);
  await client.del(KEYS.CURRENT_ROUND);

  // 1. ROUND DEFINITIONS
  const rounds = [
    { id: 'round_1_aptitude',     name: 'Round 1 — Live Conversations',    status: 'pending', durationSeconds: '120', order: '1' },
    { id: 'round_2_coding',       name: 'Round 2 — Image Challenge',        status: 'pending', durationSeconds: '120', order: '2' },
    { id: 'round_3_decode',       name: 'Round 3 — Turing Test Speedrun',    status: 'pending', durationSeconds: '120', order: '3' },
    { id: 'round_4_hallucination',name: 'Round 4 — Spot the Hallucination', status: 'pending', durationSeconds: '120', order: '4' },
    { id: 'round_5_reverse',      name: 'Round 5 — Reverse Turing Test',    status: 'pending', durationSeconds: '120', order: '5' }
  ];

  for (const r of rounds) {
    await client.hmset(KEYS.ROUND(r.id),
      'id', r.id,
      'name', r.name,
      'status', r.status,
      'durationSeconds', r.durationSeconds,
      'order', r.order
    );
    await client.rpush(KEYS.ROUNDS_ORDER, r.id);
    await client.set(KEYS.ACTIVE_STAGE(r.id), 'question');
  }
  console.log('✔ Created 5 Rounds: Round 1, Round 2, Round 3, Round 4, Round 5');

  // Helper function to add question hash and list order
  const addQuestion = async (roundId, q) => {
    const key = KEYS.QUESTION(roundId, q.id);
    const fields = {
      id: q.id,
      text: q.text || '',
      prompt: q.prompt || q.text || '',
      type: q.type || 'mcq',
      options: JSON.stringify(q.options || []),
      correctAnswer: q.correctAnswer || '',
      points: String(q.points || 10),
      order: String(q.order || 1),
      imageUrl: q.imageUrl || '',
      imageProps: q.imageProps ? JSON.stringify(q.imageProps) : '',
      targetAge: q.targetAge || '',
      targetProfession: q.targetProfession || '',
      targetHobby: q.targetHobby || '',
      durationSeconds: String(q.durationSeconds || 120),
      showEvaluation: q.showEvaluation !== undefined ? String(q.showEvaluation) : 'true',
      aiResponse: q.aiResponse || '',
      explanation: q.explanation || '',
      sourceImageUrl: q.sourceImageUrl || '',
      title: q.title || ''
    };

    const flatArgs = [];
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== null) {
        flatArgs.push(k, String(v));
      }
    }

    await client.hmset(key, ...flatArgs);
    await client.rpush(KEYS.QUESTIONS(roundId), q.id);
  };

  // 2. ROUND 1 QUESTIONS (guess-author type with Human / Gemini options)
  const r1Questions = [
    {
      id: "r1-q1", order: "1", type: "guess-author",
      text: "What's your take on vibe coding, just letting AI write most of your code?",
      prompt: "What's your take on vibe coding, just letting AI write most of your code?",
      durationSeconds: "120", points: "10", correctAnswer: "Human",
      options: [
        { id: "gemini-opt", text: "It's useful for prototyping and boilerplate, but relying on it fully without understanding the logic underneath tends to bite you during debugging or in interviews. Best used as an accelerator, not a replacement for fundamentals.", author: "Gemini" },
        { id: "human-opt", text: "Honestly I do it way more than I should. Copy paste, run, if it breaks I panic and start googling instead of actually reading the error.", author: "Human" }
      ]
    },
    {
      id: "r1-q2", order: "2", type: "guess-author",
      text: "How much do you trust AI chatbots to give you correct information?",
      prompt: "How much do you trust AI chatbots to give you correct information?",
      durationSeconds: "120", points: "10", correctAnswer: "Human",
      options: [
        { id: "human-opt", text: "Depends what for. If it's something like a recipe or general knowledge I trust it, but the moment it's something specific to me, like my college syllabus, it just makes stuff up confidently.", author: "Human" },
        { id: "gemini-opt", text: "It's generally reliable for broad, well established information, but accuracy can drop for niche, recent, or highly specific topics, so it's good practice to verify anything important.", author: "Gemini" }
      ]
    },
    {
      id: "r1-q3", order: "3", type: "guess-author",
      text: "Do you think phones have made us less social?",
      prompt: "Do you think phones have made us less social?",
      durationSeconds: "120", points: "10", correctAnswer: "Human",
      options: [
        { id: "gemini-opt", text: "In some ways yes, since face-to-face interaction time has decreased, but phones also enable new forms of connection like group chats and video calls that weren't possible before. It's more of a shift than a pure decline.", author: "Gemini" },
        { id: "human-opt", text: "Kind of, but honestly I blame myself more than the phone. I could put it away and I just don't.", author: "Human" }
      ]
    },
    {
      id: "r1-q4", order: "4", type: "guess-author",
      text: "What app do you think you spend way too much time on?",
      prompt: "What app do you think you spend way too much time on?",
      durationSeconds: "120", points: "10", correctAnswer: "Human",
      options: [
        { id: "human-opt", text: "Instagram reels, no competition. I tell myself five minutes and then it's an hour and I don't even remember what I watched.", author: "Human" },
        { id: "gemini-opt", text: "Short-form video apps in general tend to be the biggest time sinks due to their endless scroll design, which is built to maximize engagement rather than user benefit.", author: "Gemini" }
      ]
    },
    {
      id: "r1-q5", order: "5", type: "guess-author",
      text: "Would you rather lose your phone for a week or your laptop for a week?",
      prompt: "Would you rather lose your phone for a week or your laptop for a week?",
      durationSeconds: "120", points: "10", correctAnswer: "Human",
      options: [
        { id: "gemini-opt", text: "Losing the laptop would likely be more manageable short term, since most daily communication and quick tasks can be handled on a phone, whereas a laptop is harder to replace for focused work.", author: "Gemini" },
        { id: "human-opt", text: "Laptop honestly, I'd survive. Losing my phone for a week sounds like actual torture, all my passwords and OTPs are on it.", author: "Human" }
      ]
    },
    {
      id: "r1-q6", order: "6", type: "guess-author",
      text: "Do you think social media does more harm than good?",
      prompt: "Do you think social media does more harm than good?",
      durationSeconds: "120", points: "10", correctAnswer: "Human",
      options: [
        { id: "human-opt", text: "More harm probably, but I say that while still using it every day, so take that with a grain of salt.", author: "Human" },
        { id: "gemini-opt", text: "It's mixed. Social media has clear benefits like connectivity and access to information, but also documented downsides related to mental health and misinformation, so the impact really depends on usage patterns.", author: "Gemini" }
      ]
    }
  ];
  for (const q of r1Questions) await addQuestion('round_1_aptitude', q);
  await client.set(KEYS.ACTIVE_QUESTION('round_1_aptitude'), 'r1-q1');
  console.log('✔ Injected Round 1 (6 Live Conversation Questions)');

  // 3. ROUND 2 QUESTIONS (Updated Image Challenge)
  const r2Questions = [
    { id: 'q2_1', order: '1', type: 'mcq', points: '10', durationSeconds: '120', text: 'Identify the option that correctly fills in the missing parts of the prompt.', prompt: 'Identify the option that correctly fills in the missing parts of the prompt.', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B', imageUrl: '/reference/r2/cyclist-night-street.png' },
    { id: 'q2_2', order: '2', type: 'mcq', points: '10', durationSeconds: '120', text: 'This is a photo of a tiger in the wild. Which part of this photo was AI-edited?', prompt: 'This is a photo of a tiger in the wild. Which part of this photo was AI-edited?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B', imageUrl: '/reference/r2/tiger-edited.png' },
    { id: 'q2_3', order: '3', type: 'mcq', points: '10', durationSeconds: '120', text: 'This image is AI-generated. What is wrong with this image?', prompt: 'This image is AI-generated. What is wrong with this image?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', imageUrl: '/reference/r2/dog-reflection.png' },
    { id: 'q2_4', order: '4', type: 'mcq', points: '10', durationSeconds: '120', text: 'Choose the prompt that is most appropriate for this living-room image.', prompt: 'Choose the prompt that is most appropriate for this living-room image.', options: ['A', 'B', 'C', 'D'], correctAnswer: 'C', imageUrl: '/reference/r2/living-room.png' }
  ];
  for (const q of r2Questions) await addQuestion('round_2_coding', q);
  await client.set(KEYS.ACTIVE_QUESTION('round_2_coding'), 'q2_1');
  console.log('✔ Injected Round 2 (4 Image Challenge Questions)');

  // 4. ROUND 3 QUESTIONS (5 Poll Questions + 1 Profile-Guess Final Submission)
  const r3Questions = [
    {
      id: 'poll1', order: '1', type: 'poll', text: 'Poll 1 — Daily Life',
      prompt: 'Vote for the question you want Gemini to answer',
      correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120',
      options: [
        { key: 'A', question: "What does a perfect Sunday look like for you?", answer: "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens." },
        { key: 'B', question: "What's something your friends often tease you about?", answer: "Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago." },
        { key: 'C', question: "What's one thing you almost never leave home without?", answer: "My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I've forgotten something important." }
      ]
    },
    {
      id: 'poll2', order: '2', type: 'poll', text: 'Poll 2 — Memories & Experiences',
      prompt: 'Vote for the question you want Gemini to answer',
      correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120',
      options: [
        { key: 'A', question: "What's something younger people do that you find interesting?", answer: "How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first." },
        { key: 'B', question: "What's a change in everyday life that still amazes you?", answer: "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things." },
        { key: 'C', question: "How did you usually discover new music growing up?", answer: "Mostly through friends or hearing something somewhere repeatedly. Sometimes you'd like one song enough to take a chance on everything else by the same artist." }
      ]
    },
    {
      id: 'poll3', order: '3', type: 'poll', text: 'Poll 3 — Work & Thinking',
      prompt: 'Vote for the question you want Gemini to answer',
      correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120',
      options: [
        { key: 'A', question: "What's the most tiring part of your work?", answer: "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together." },
        { key: 'B', question: "What skill do you think you're unusually good at?", answer: "Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed." },
        { key: 'C', question: "What's something you do before an important meeting?", answer: "I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important." }
      ]
    },
    {
      id: 'poll4', order: '4', type: 'poll', text: 'Poll 4 — Behaviour & Perspective',
      prompt: 'Vote for the question you want Gemini to answer',
      correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120',
      options: [
        { key: 'A', question: "What's something you find interesting about conversations?", answer: "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different." },
        { key: 'B', question: "What's something you've become less impressed by over time?", answer: "Confidence. Someone sounding completely certain doesn't really tell me whether they're right anymore. I tend to pay more attention to the details." },
        { key: 'C', question: "What do your friends sometimes find annoying about you?", answer: "I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering." }
      ]
    },
    {
      id: 'poll5', order: '5', type: 'poll', text: 'Poll 5 — Personal Interests',
      prompt: 'Vote for the question you want Gemini to answer',
      correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120',
      options: [
        { key: 'A', question: "What kind of moments do you remember most clearly?", answer: "Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds." },
        { key: 'B', question: "What's something you're unusually patient about?", answer: "Waiting when I feel the timing matters. I don't mind staying in the same place for a while if rushing would mean missing something interesting." },
        { key: 'C', question: "When you visit somewhere new, what do you usually do first?", answer: "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly." }
      ]
    },
    {
      id: 'poll6', order: '6', type: 'profile-guess', text: 'Final Submission',
      prompt: 'Decode the Hidden Profile',
      correctAnswer: 'Age: 47 | Profession: Lawyer | Hobby: Photography',
      points: '30', showEvaluation: true, durationSeconds: '300',
      targetAge: '47', targetProfession: 'Lawyer', targetHobby: 'Photography',
      options: []
    }
  ];

  for (const q of r3Questions) {
    await addQuestion('round_3_decode', q);
  }
  await client.set(KEYS.ACTIVE_QUESTION('round_3_decode'), 'poll1');
  console.log('✔ Injected Round 3 (5 Poll Questions + Final Profile Guess)');

  // 5. ROUND 4 QUESTIONS (Spot the Hallucination - 6 MCQ Questions)
  const r4Questions = [
    {
      id: 'r4-q1', order: '1', type: 'mcq', points: '15', durationSeconds: '120',
      text: 'Who was the first person to walk on Mars?',
      prompt: 'Who was the first person to walk on Mars?',
      aiResponse: "Neil Armstrong became the first person to walk on Mars during NASA's 1985 Mars expedition.",
      correctAnswer: 'No human has ever walked on Mars',
      explanation: 'No human has ever walked on Mars. No NASA Mars expedition occurred in 1985. The entire answer is fabricated.',
      options: [
        "It wasn't Neil Armstrong; it was Buzz Aldrin",
        "It happened in 1969 and not 1985",
        "It was an operation led by ISRO and not NASA",
        "No human has ever walked on Mars"
      ]
    },
    {
      id: 'r4-q2', order: '2', type: 'mcq', points: '15', durationSeconds: '120',
      text: 'Does drinking coffee improve IQ?',
      prompt: 'Does drinking coffee improve IQ?',
      aiResponse: 'A 2021 MIT study proved that coffee permanently increases IQ by 15 points.',
      correctAnswer: 'Likely fabricated / unsupported claim',
      explanation: "The claim is likely fabricated or unsupported. No verifiable MIT study is provided, the word 'proved' is suspiciously strong, and a permanent 15-point IQ increase is an extraordinary claim that would require strong evidence.",
      options: [
        "Yes — the MIT attribution makes the permanent IQ increase scientifically established",
        "Yes — coffee is a stimulant, so any improvement in alertness proves a permanent IQ increase",
        "Likely fabricated / unsupported claim",
        "No — coffee can never affect attention or cognitive performance in any way",
        "It is proven if the study measured participants before and after drinking coffee"
      ]
    },
    {
      id: 'r4-q3', order: '3', type: 'mcq', points: '15', durationSeconds: '120',
      text: 'Given answer: 40 m above the building. Find the error in the soln.',
      prompt: 'Given answer: 40 m above the building. Find the error in the soln.',
      imageUrl: '/reference/r4/wood-physics-ai-response.png',
      aiResponse: 'Given answer: 40 m above the building. The image below shows the AI solution that produced the incorrect 50 m result.',
      correctAnswer: 'option a) and c)',
      explanation: '(no need to actually solve this problem)\n· In the 1st step itself, there is a calculation error.\n· Gemini uses law of energy conservation which is wrong as the collision is inelastic. Hence, there will be a loss of energy. Conservation of linear momentum must be applied to solve this problem\n· Hence, AI struggles with complex problems',
      options: [
        "Calculation error in step 1",
        "Law of momentum conservation doesn't apply here",
        "Law of energy conservation won't apply here",
        "option a) and c)"
      ]
    },
    {
      id: 'r4-q4', order: '4', type: 'mcq', points: '15', durationSeconds: '120',
      text: 'Which statement is the hidden hallucination in this response about C?',
      prompt: 'Which statement is the hidden hallucination in this response about C?',
      aiResponse: 'C is a procedural programming language developed by Dennis Ritchie at Bell Labs. It influenced many later languages such as C++, Java, and Python. The language was originally designed to create the Windows operating system.',
      correctAnswer: 'The language was originally designed to create the Windows operating system',
      explanation: 'C was developed at Bell Labs primarily in connection with the Unix operating system. Windows did not exist when C was created, so the claim that C was originally designed to create Windows is the hidden hallucination.',
      options: [
        "C is a procedural programming language developed by Dennis Ritchie at Bell Labs",
        "C was developed primarily in connection with Unix",
        "C influenced later languages including C++ and Python",
        "The language was originally designed to create the Windows operating system",
        "C was created at Bell Labs before Windows existed"
      ]
    },
    {
      id: 'r4-q5', order: '5', type: 'mcq', points: '15', durationSeconds: '120',
      text: 'Which part of this Einstein response is incorrect?',
      prompt: 'Which part of this Einstein response is incorrect?',
      aiResponse: 'Albert Einstein won the Nobel Prize in Physics in 1921 for his Theory of Relativity, which revolutionized modern physics.',
      correctAnswer: 'The response falsely says the Nobel Prize was awarded for the theory of relativity',
      explanation: 'Einstein did receive the 1921 Nobel Prize in Physics, but the award was primarily for his explanation of the photoelectric effect, not for the theory of relativity.',
      options: [
        "Einstein received the Nobel Prize in Physics",
        "The prize was awarded in 1921",
        "Einstein's work revolutionized modern physics",
        "The Nobel Prize was awarded primarily for the photoelectric effect, not relativity",
        "The response falsely says the Nobel Prize was awarded for the theory of relativity"
      ]
    },
    {
      id: 'r4-q6', order: '6', type: 'mcq', points: '15', durationSeconds: '120',
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
    }
  ];
  for (const q of r4Questions) {
    await addQuestion('round_4_hallucination', q);
  }
  await client.set(KEYS.ACTIVE_QUESTION('round_4_hallucination'), 'r4-q1');
  console.log('✔ Injected Round 4 (6 MCQ Spot the Hallucination Questions)');

  // 6. ROUND 5 QUESTIONS (Reverse Turing Test)
  const r5Question = {
    id: 'r5_q1', order: '1', type: 'reverse-turing',
    title: 'Round 5 — Reverse Turing Test', subtitle: 'Write Like an AI',
    text: 'Write a short 2-sentence motivational quote for someone studying for finals at 3 AM',
    prompt: 'Write a short 2-sentence motivational quote for someone studying for finals at 3 AM',
    description: "Can you write a response so convincing that others think it was written by Gemini? Your response will be mixed with Gemini's actual response — try to fool everyone!",
    durationSeconds: '120', points: '20', showEvaluation: false, options: []
  };
  await addQuestion('round_5_reverse', r5Question);
  await client.set(KEYS.ACTIVE_QUESTION('round_5_reverse'), 'r5_q1');

  // Initialize R5 default gemini response and phase
  await client.set('r5:gemini', "The quiet hours when the world is asleep are where your future self is built step by step. Every page you read tonight is bringing you closer to the moment you walk out of that exam knowing you gave it everything.");
  await client.set('r5:phase', 'prompt');
  console.log('✔ Injected Round 5 (Reverse Turing Test)');

  await client.quit();
  console.log('\n🎉 ALL 5 ROUNDS INJECTED SUCCESSFULLY INTO REDIS!');
}

injectRounds().catch((err) => {
  console.error('Failed to inject rounds:', err);
  process.exit(1);
});
