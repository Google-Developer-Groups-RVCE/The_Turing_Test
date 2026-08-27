const env = require('../src/config/env');
const Redis = require('ioredis');

// Ensure you're connecting to the correct Redis instance using the app config
const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  db: env.REDIS_DB,
});

const round1Data = [
  {
    id: "r1-q1", order: 1, title: "Round 1 — Question 1", focus: "Human vs Gemini",
    type: "guess-author",
    prompt: "What makes a mistake educational rather than purely wasteful?",
    options: [
      { id: "gemini-opt", key: "A", label: "Response 1", text: "Prompt, honest analysis of the root cause, followed by a concrete change in strategy before repeating the action.", author: "Gemini" },
      { id: "human-opt", key: "B", label: "Response 2", text: "Systematic reflection. A mistake becomes valuable only when it forces a recalibration of assumptions rather than mere regret.", author: "Human" }
    ]
  },
  {
    id: 'q2_2', order: 2, title: "Round 1 — Question 2", type: 'mcq', points: '10', durationSeconds: '60', text: 'This is a photo of a tiger in the wild. Which part of this photo was AI-edited?', prompt: 'This is a photo of a tiger in the wild. Which part of this photo was AI-edited?',
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
    id: 'q2_3', order: 3, title: "Round 1 — Question 3", type: 'mcq', points: '10', durationSeconds: '60', text: 'This image is AI-generated. What is wrong with this image?', prompt: 'This image is AI-generated. What is wrong with this image?',
    options: [
      { key: 'A', label: 'Reflection mismatch', text: 'Reflection mismatch' },
      { key: 'B', label: 'Shadow mismatch', text: 'Shadow mismatch' },
      { key: 'C', label: 'Impossible perspective', text: 'Impossible perspective' },
      { key: 'D', label: 'Nothing — the image is real', text: 'Nothing — the image is real' }
    ],
    correctAnswer: 'A',
    imageUrl: '/reference/r2/dog-reflection.png'
  },
  {
    id: "r1-q4", order: 4, title: "Round 1 — Question 4", focus: "Human vs Gemini",
    type: "guess-author",
    prompt: "How does living in a major city alter a person's perception of time?",
    options: [
      { id: "human-opt", key: "A", label: "Response 1", text: "Major cities accelerate micro-perceptions of time while compressing long-term memory. The constant input of traffic, schedules, and transit forces the mind to live in hyper-aware, short-term increments, making days feel packed and fast, yet blur together when looking back over years.", author: "Human" },
      { id: "gemini-opt", key: "B", label: "Response 2", text: "Urban environments often compress our awareness of time due to high density and constant schedules. The pacing of public transit, rapid environmental changes, and fixed routines create a heightened sense of urgency, making minutes feel more critical than they might in quieter, less structured settings.", author: "Gemini" }
    ]
  },
  {
    id: "r1-q5", order: 5, title: "Round 1 — Question 5", focus: "Human vs Gemini",
    type: "guess-author",
    prompt: "Why do humans feel a strange comfort in listening to sad music when they are down?",
    options: [
      { id: "human-opt", key: "A", label: "Response 1", text: "Sad music provides a form of psychological validation without requiring social interaction. It creates a space where an emotion can be felt completely and safely, serving as a mirror that reassures the listener that their state of mind is shared and natural.", author: "Human" },
      { id: "gemini-opt", key: "B", label: "Response 2", text: "Listening to melancholic music can foster a sense of emotional alignment and empathy. Rather than amplifying distress, it often offers a cathartic release by reflecting the listener's internal state, allowing them to process complex emotions in a safe, controlled aesthetic context.", author: "Gemini" }
    ]
  },
  {
    id: "r1-q6", order: 6, title: "Round 1 — Question 6", focus: "Human vs Gemini",
    type: "guess-author",
    prompt: "What role does failure play in long-term personal growth?",
    options: [
      { id: "human-opt", key: "A", label: "Response 1", text: "Failure acts as a necessary diagnostic tool. It strips away false assumptions about one's capabilities or strategies, forcing a recalibration that success rarely demands. Over time, navigating failure builds adaptability and a more grounded sense of competence.", author: "Human" },
      { id: "gemini-opt", key: "B", label: "Response 2", text: "Failure serves as a critical feedback mechanism in personal development. It highlights gaps in understanding or execution, encouraging reflection and resilience. While uncomfortable, it provides practical insights that refine future decision-making far more effectively than immediate success.", author: "Gemini" }
    ]
  },
  {
    id: "r1-q7", order: 7, title: "Round 1 — Question 7", focus: "Human vs Gemini",
    type: "guess-author",
    prompt: "What makes a story ending feel satisfying versus forced?",
    options: [
      { id: "gemini-opt", key: "A", label: "Response 1", text: "A satisfying resolution feels earned through the logical consequences of the characters' decisions, even if the outcome is unexpected. A forced ending usually relies on coincidence, unestablished mechanics, or external intervention to tie up plot points prematurely.", author: "Gemini" },
      { id: "human-opt", key: "B", label: "Response 2", text: "Satisfaction in a narrative conclusion relies on emotional and thematic coherence rather than just resolving the plot. If the characters' internal arcs reach a natural resolution that aligns with established stakes, the ending feels complete, even if loose threads remain.", author: "Human" }
    ]
  },
  {
    id: "r1-q8", order: 8, title: "Round 1 — Question 8", focus: "Human vs Gemini",
    type: "guess-author",
    prompt: "How does nostalgic memory differ from actual history?",
    options: [
      { id: "human-opt", key: "A", label: "Response 1", text: "History aims to preserve contextual facts and structural timelines, whereas nostalgia filters out discomfort to preserve a specific past emotional state.", author: "Human" },
      { id: "gemini-opt", key: "B", label: "Response 2", text: "History records events as they unfolded, while nostalgia edits those events to reflect how a period felt rather than what actually occurred.", author: "Gemini" }
    ]
  },
  {
    id: "r1-q9", order: 9, title: "Round 1 — Question 9", focus: "Human vs Gemini",
    type: "guess-author",
    prompt: "Why do old photos feel distinct from modern digital photos?",
    options: [
      { id: "gemini-opt", key: "A", label: "Response 1", text: "Analog photographs carry tangible physical constraints — limited exposures, chemical grain, and color shifts that create a sense of permanent artifacting.", author: "Gemini" },
      { id: "human-opt", key: "B", label: "Response 2", text: "Film photos capture a singular, deliberate moment due to physical film limits, giving them an authenticity often lost in infinite digital takes.", author: "Human" }
    ]
  },
  {
    id: "r1-q10", order: 10, title: "Round 1 — Question 10", focus: "Human vs Gemini",
    type: "guess-author",
    prompt: "What is the subtle boundary between patience and procrastination?",
    options: [
      { id: "gemini-opt", key: "A", label: "Response 1", text: "Patience is strategic waiting while gathering context or waiting for timing; procrastination is tactical avoidance driven by discomfort or fear.", author: "Gemini" },
      { id: "human-opt", key: "B", label: "Response 2", text: "Intentionality. Patience is an active choice to wait for optimal conditions, whereas procrastination is passive delay to avoid immediate effort.", author: "Human" }
    ]
  }
];


const round2Data = [
  {
    id: "r2-q1", order: 1, title: "Round 2 — Server Room", focus: "Which image is AI-generated?",
    type: "image-choice",
    images: [{ src: "/reference/r2/image1.webp", label: "Image 1" }, { src: "/reference/r2/image2.webp", label: "Image 2" }],
    options: [{ key: "A", label: "Image 1" }, { key: "B", label: "Image 2" }]
  },
  {
    id: "r2-q2", order: 2, title: "Round 2 — Wildlife Photography", focus: "Which part of the image was AI-edited?",
    type: "image-choice",
    image: "/reference/r2/image3.webp",
    options: [{ key: "A", label: "The head / face" }, { key: "B", label: "The stripes on the abdomen" }, { key: "C", label: "The legs" }, { key: "D", label: "The background" }]
  },
  {
    id: "r2-q3", order: 3, title: "Round 2 — Street Photography", focus: "Write a prompt that recreates this image as closely as possible.",
    type: "text",
    image: "/reference/r2/image4.webp",
    placeholder: "Describe the scene, lighting, camera style, subjects, atmosphere, and other details...",
    minLength: 10
  },
  {
    id: "r2-q4", order: 4, title: "Round 2 — Bird Photography", focus: "Is this image real or AI-generated?",
    type: "image-choice",
    image: "/reference/r2/image5.webp",
    options: [{ key: "A", label: "Real" }, { key: "B", label: "AI-generated" }]
  }
];

const pollsData = [
  {
    id: "r3-q1", order: 1, title: "Poll 1 — Daily Life", focus: "Broad age-range clues", type: "poll",
    options: [
      { key: "A", question: "What does a perfect Sunday look like for you?", answer: "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens." },
      { key: "B", question: "What's something your friends often tease you about?", answer: "Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago." },
      { key: "C", question: "What's one thing you almost never leave home without?", answer: "My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I've forgotten something important." }
    ]
  },
  {
    id: "r3-q2", order: 2, title: "Poll 2 — Memories & Experiences", focus: "Narrowing the generation", type: "poll",
    options: [
      { key: "A", question: "What's something younger people do that you find interesting?", answer: "How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first." },
      { key: "B", question: "What's a change in everyday life that still amazes you?", answer: "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things." },
      { key: "C", question: "How did you usually discover new music growing up?", answer: "Mostly through friends or hearing something somewhere repeatedly. Sometimes you'd like one song enough to take a chance on everything else by the same artist." }
    ]
  },
  {
    id: "r3-q3", order: 3, title: "Poll 3 — Work & Thinking", focus: "Early profession clues", type: "poll",
    options: [
      { key: "A", question: "What's the most tiring part of your work?", answer: "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together." },
      { key: "B", question: "What skill do you think you're unusually good at?", answer: "Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed." },
      { key: "C", question: "What's something you do before an important meeting?", answer: "I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important." }
    ]
  },
  {
    id: "r3-q4", order: 4, title: "Poll 4 — Behaviour & Perspective", focus: "Narrowing the profession", type: "poll",
    options: [
      { key: "A", question: "What's something you find interesting about conversations?", answer: "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different." },
      { key: "B", question: "What's something you've become less impressed by over time?", answer: "Confidence. Someone sounding completely certain doesn't really tell me whether they're right anymore. I tend to pay more attention to the details." },
      { key: "C", question: "What do your friends sometimes find annoying about you?", answer: "I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering." }
    ]
  },
  {
    id: "r3-q5", order: 5, title: "Poll 5 — Personal Interests", focus: "Hobby clues", type: "poll",
    options: [
      { key: "A", question: "What kind of moments do you remember most clearly?", answer: "Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds." },
      { key: "B", question: "What's something you're unusually patient about?", answer: "Waiting when I feel the timing matters. I don't mind staying in the same place for a while if rushing would mean missing something interesting." },
      { key: "C", question: "When you visit somewhere new, what do you usually do first?", answer: "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly." }
    ]
  }
];

async function run() {
  console.log("Starting Question Seeding...");

  // Remove existing questions
  const existingQuestionsKeys = await redis.keys('question:*');
  if (existingQuestionsKeys.length > 0) {
    await redis.del(...existingQuestionsKeys);
  }
  
  const existingRoundKeys = await redis.keys('round:questions:*');
  if (existingRoundKeys.length > 0) {
    await redis.del(...existingRoundKeys);
  }

  // Helper to add questions
  const addQuestions = async (roundId, questions) => {
    for (const q of questions) {
      if (!q.type) q.type = 'multiple-choice';
      q.timeLimit = q.timeLimit || 300;
      q.roundId = roundId;
      
      const key = `question:${roundId}:${q.id}`;
      const entries = Object.entries({
        id: q.id,
        text: q.prompt || q.title || '',
        type: q.type,
        options: JSON.stringify(q.options || []),
        images: JSON.stringify(q.images || []),
        image: q.image || '',
        placeholder: q.placeholder || '',
        minLength: String(q.minLength || ''),
        timeLimit: String(q.timeLimit),
        order: String(q.order)
      }).filter(([_, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]).flat();
      
      if (entries.length > 0) {
        await redis.hmset(key, ...entries);
      }
      
      await redis.rpush(`round:questions:${roundId}`, q.id);
      console.log(`Added question ${q.id} to ${roundId}`);
    }
  };

  await addQuestions('r1', round1Data);
  await addQuestions('r2', round2Data);
  await addQuestions('r3', pollsData);

  console.log("Seeding complete!");
  process.exit(0);
}

run().catch(console.error);
