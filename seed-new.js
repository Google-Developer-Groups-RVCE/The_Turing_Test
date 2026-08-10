const Redis = require('ioredis');
const fs = require('fs');

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redis = new Redis(`redis://:production-redis-password@${redisHost}:6379`);

const round1Data = `[
  {
    "id": "r1-q1",
    "text": "Round 1 — Conversation 1: What's your take on vibe coding, just letting AI write most of your code?",
    "type": "guess-author",
    "options": [
      { "id": "A", "author": "Gemini", "text": "It's useful for prototyping and boilerplate, but relying on it fully without understanding the logic underneath tends to bite you during debugging or in interviews. Best used as an accelerator, not a replacement for fundamentals." },
      { "id": "B", "author": "Human", "text": "Honestly I do it way more than I should. Copy paste, run, if it breaks I panic and start googling instead of actually reading the error." }
    ],
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q2",
    "text": "Round 1 — Conversation 2: How much do you trust AI chatbots to give you correct information?",
    "type": "guess-author",
    "options": [
      { "id": "A", "author": "Human", "text": "Depends what for. If it's something like a recipe or general knowledge I trust it, but the moment it's something specific to me, like my college syllabus, it just makes stuff up confidently." },
      { "id": "B", "author": "Gemini", "text": "It's generally reliable for broad, well established information, but accuracy can drop for niche, recent, or highly specific topics, so it's good practice to verify anything important." }
    ],
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q3",
    "text": "Round 1 — Conversation 3: Do you think phones have made us less social?",
    "type": "guess-author",
    "options": [
      { "id": "A", "author": "Gemini", "text": "In some ways yes, since face-to-face interaction time has decreased, but phones also enable new forms of connection like group chats and video calls that weren't possible before. It's more of a shift than a pure decline." },
      { "id": "B", "author": "Human", "text": "Kind of, but honestly I blame myself more than the phone. I could put it away and I just don't." }
    ],
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q4",
    "text": "Round 1 — Conversation 4: What app do you think you spend way too much time on?",
    "type": "guess-author",
    "options": [
      { "id": "A", "author": "Human", "text": "Instagram reels, no competition. I tell myself five minutes and then it's an hour and I don't even remember what I watched." },
      { "id": "B", "author": "Gemini", "text": "Short-form video apps in general tend to be the biggest time sinks due to their endless scroll design, which is built to maximize engagement rather than user benefit." }
    ],
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q5",
    "text": "Round 1 — Conversation 5: Would you rather lose your phone for a week or your laptop for a week?",
    "type": "guess-author",
    "options": [
      { "id": "A", "author": "Gemini", "text": "Losing the laptop would likely be more manageable short term, since most daily communication and quick tasks can be handled on a phone, whereas a laptop is harder to replace for focused work." },
      { "id": "B", "author": "Human", "text": "Laptop honestly, I'd survive. Losing my phone for a week sounds like actual torture, all my passwords and OTPs are on it." }
    ],
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q6",
    "text": "Round 1 — Conversation 6: Do you think social media does more harm than good?",
    "type": "guess-author",
    "options": [
      { "id": "A", "author": "Human", "text": "More harm probably, but I say that while still using it every day, so take that with a grain of salt." },
      { "id": "B", "author": "Gemini", "text": "It's mixed. Social media has clear benefits like connectivity and access to information, but also documented downsides related to mental health and misinformation, so the impact really depends on usage patterns." }
    ],
    "durationSeconds": 300,
    "points": 10
  }
]`;

const round2Data = `[
  {
    "id": "r2-q1",
    "text": "Round 2 — Server Room (Which image is AI-generated?)",
    "type": "image-choice",
    "options": [
      { "id": "A", "text": "Image 1" },
      { "id": "B", "text": "Image 2" }
    ],
    "correctAnswer": "A",
    "durationSeconds": 300,
    "points": 20
  },
  {
    "id": "r2-q2",
    "text": "Round 2 — Wildlife Photography (Which part of the image was AI-edited?)",
    "type": "image-choice",
    "options": [
      { "id": "A", "text": "The head / face" },
      { "id": "B", "text": "The stripes on the abdomen" },
      { "id": "C", "text": "The legs" },
      { "id": "D", "text": "The background" }
    ],
    "correctAnswer": "A",
    "durationSeconds": 300,
    "points": 20
  },
  {
    "id": "r2-q3",
    "text": "Round 2 — Street Photography (Write a prompt that recreates this image as closely as possible.)",
    "type": "text",
    "options": [],
    "correctAnswer": "",
    "durationSeconds": 300,
    "points": 20
  },
  {
    "id": "r2-q4",
    "text": "Round 2 — Bird Photography (Is this image real or AI-generated?)",
    "type": "image-choice",
    "options": [
      { "id": "A", "text": "Real" },
      { "id": "B", "text": "AI-generated" }
    ],
    "correctAnswer": "A",
    "durationSeconds": 300,
    "points": 20
  }
]`;

const pollsData = `[
  {
    "id": "poll1",
    "text": "Poll 1 — Daily Life: What does a perfect Sunday look like for you?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens." },
      { "id": "B", "text": "Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago." },
      { "id": "C", "text": "My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I've forgotten something important." }
    ],
    "correctAnswer": "",
    "durationSeconds": 60,
    "points": 0
  },
  {
    "id": "poll2",
    "text": "Poll 2 — Memories & Experiences: What's something younger people do that you find interesting?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first." },
      { "id": "B", "text": "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things." },
      { "id": "C", "text": "Mostly through friends or hearing something somewhere repeatedly. Sometimes you'd like one song enough to take a chance on everything else by the same artist." }
    ],
    "correctAnswer": "",
    "durationSeconds": 60,
    "points": 0
  },
  {
    "id": "poll3",
    "text": "Poll 3 — Work & Thinking: What's the most tiring part of your work?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together." },
      { "id": "B", "text": "Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed." },
      { "id": "C", "text": "I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important." }
    ],
    "correctAnswer": "",
    "durationSeconds": 60,
    "points": 0
  },
  {
    "id": "poll4",
    "text": "Poll 4 — Behaviour & Perspective: What's something you find interesting about conversations?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different." },
      { "id": "B", "text": "Confidence. Someone sounding completely certain doesn't really tell me whether they're right anymore. I tend to pay more attention to the details." },
      { "id": "C", "text": "I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering." }
    ],
    "correctAnswer": "",
    "durationSeconds": 60,
    "points": 0
  },
  {
    "id": "poll5",
    "text": "Poll 5 — Personal Interests: What kind of moments do you remember most clearly?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds." },
      { "id": "B", "text": "Waiting when I feel the timing matters. I don't mind staying in the same place for a while if rushing would mean missing something interesting." },
      { "id": "C", "text": "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly." }
    ],
    "correctAnswer": "",
    "durationSeconds": 60,
    "points": 0
  },
  {
    "id": "poll6",
    "text": "Final Submission — Decode the Hidden Profile (Predict Age, Profession, and Hobby)",
    "type": "profile-guess",
    "options": [],
    "correctAnswer": "",
    "targetAge": 47,
    "targetProfession": "Lawyer",
    "targetHobby": "Photography",
    "durationSeconds": 300,
    "points": 30
  }
]`;

async function wipeAndSeed() {
  try {
    const r1 = JSON.parse(round1Data);
    const r2 = JSON.parse(round2Data);
    const r3 = JSON.parse(pollsData);

    // Delete existing question keys for r1, r2, r3 to avoid old garbage
    const keys = await redis.keys('question:*');
    if (keys.length > 0) await redis.del(...keys);
    await redis.del('questions:r1', 'questions:r2', 'questions:r3');
    
    // Also delete any wrong keys from the previous bug
    const wrongKeys = await redis.keys('round:round_*');
    if (wrongKeys.length > 0) await redis.del(...wrongKeys);
    
    const roundsList = await redis.lrange('rounds:order', 0, -1);
    if (!roundsList.includes('r1')) {
        await redis.rpush('rounds:order', 'r1', 'r2', 'r3');
    }
    
    // Always recreate round hashes to be safe
    await redis.hmset('round:r1', { id: 'r1', name: 'Round 1: Live Conversations', status: 'idle', durationSeconds: 300 });
    await redis.hmset('round:r2', { id: 'r2', name: 'Round 2: Image Challenge', status: 'idle', durationSeconds: 300 });
    await redis.hmset('round:r3', { id: 'r3', name: 'Round 3: Decode the Context', status: 'idle', durationSeconds: 60 });

    async function seedRound(roundId, questions) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const key = `question:${roundId}:${q.id}`;
        const qData = {
          id: q.id,
          text: q.text,
          type: q.type,
          options: JSON.stringify(q.options || []),
          correctAnswer: q.correctAnswer || '',
          points: String(q.points || 10),
          order: String(i + 1),
          durationSeconds: String(q.durationSeconds || 300)
        };
        // Add displayedOptionId if it's guess-author
        if (q.type === 'guess-author') {
          // Initialize randomly or just A by default. Backend will update this.
          qData.displayedOptionId = 'A';
        }
        await redis.hmset(key, qData);
        await redis.rpush(`questions:${roundId}`, q.id);
      }
      console.log(`Seeded round ${roundId} with ${questions.length} questions.`);
    }

    await seedRound('r1', r1);
    await seedRound('r2', r2);
    await seedRound('r3', r3);

    console.log('Seeding successful!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

wipeAndSeed();
