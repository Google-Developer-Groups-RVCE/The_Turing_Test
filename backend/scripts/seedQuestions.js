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
    id: "r1-q1", order: 1, title: "Round 1 — Conversation 1", focus: "Human vs Gemini",
    prompt: "What's your take on vibe coding, just letting AI write most of your code?",
    options: [
      { key: "A", label: "Response 1", answer: "It's useful for prototyping and boilerplate, but relying on it fully without understanding the logic underneath tends to bite you during debugging or in interviews. Best used as an accelerator, not a replacement for fundamentals." },
      { key: "B", label: "Response 2", answer: "Honestly I do it way more than I should. Copy paste, run, if it breaks I panic and start googling instead of actually reading the error." }
    ]
  },
  {
    id: "r1-q2", order: 2, title: "Round 1 — Conversation 2", focus: "Human vs Gemini",
    prompt: "How much do you trust AI chatbots to give you correct information?",
    options: [
      { key: "A", label: "Response 1", answer: "Depends what for. If it's something like a recipe or general knowledge I trust it, but the moment it's something specific to me, like my college syllabus, it just makes stuff up confidently." },
      { key: "B", label: "Response 2", answer: "It's generally reliable for broad, well established information, but accuracy can drop for niche, recent, or highly specific topics, so it's good practice to verify anything important." }
    ]
  },
  {
    id: "r1-q3", order: 3, title: "Round 1 — Conversation 3", focus: "Human vs Gemini",
    prompt: "Do you think phones have made us less social?",
    options: [
      { key: "A", label: "Response 1", answer: "In some ways yes, since face-to-face interaction time has decreased, but phones also enable new forms of connection like group chats and video calls that weren't possible before. It's more of a shift than a pure decline." },
      { key: "B", label: "Response 2", answer: "Kind of, but honestly I blame myself more than the phone. I could put it away and I just don't." }
    ]
  },
  {
    id: "r1-q4", order: 4, title: "Round 1 — Conversation 4", focus: "Human vs Gemini",
    prompt: "What app do you think you spend way too much time on?",
    options: [
      { key: "A", label: "Response 1", answer: "Instagram reels, no competition. I tell myself five minutes and then it's an hour and I don't even remember what I watched." },
      { key: "B", label: "Response 2", answer: "Short-form video apps in general tend to be the biggest time sinks due to their endless scroll design, which is built to maximize engagement rather than user benefit." }
    ]
  },
  {
    id: "r1-q5", order: 5, title: "Round 1 — Conversation 5", focus: "Human vs Gemini",
    prompt: "Would you rather lose your phone for a week or your laptop for a week?",
    options: [
      { key: "A", label: "Response 1", answer: "Losing the laptop would likely be more manageable short term, since most daily communication and quick tasks can be handled on a phone, whereas a laptop is harder to replace for focused work." },
      { key: "B", label: "Response 2", answer: "Laptop honestly, I'd survive. Losing my phone for a week sounds like actual torture, all my passwords and OTPs are on it." }
    ]
  },
  {
    id: "r1-q6", order: 6, title: "Round 1 — Conversation 6", focus: "Human vs Gemini",
    prompt: "Do you think social media does more harm than good?",
    options: [
      { key: "A", label: "Response 1", answer: "More harm probably, but I say that while still using it every day, so take that with a grain of salt." },
      { key: "B", label: "Response 2", answer: "It's mixed. Social media has clear benefits like connectivity and access to information, but also documented downsides related to mental health and misinformation, so the impact really depends on usage patterns." }
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
