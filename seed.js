const Redis = require('ioredis');
const fs = require('fs');

const redis = new Redis('redis://:production-redis-password@127.0.0.1:6379');

// Load data
const round1Data = `[
  {
    "id": "r1-q1",
    "text": "What's your take on vibe coding, just letting AI write most of your code?",
    "type": "mcq",
    "options": [
      { "id": "A", "text": "It's useful for prototyping and boilerplate, but relying on it fully without understanding the logic underneath tends to bite you during debugging or in interviews. Best used as an accelerator, not a replacement for fundamentals." },
      { "id": "B", "text": "Honestly I do it way more than I should. Copy paste, run, if it breaks I panic and start googling instead of actually reading the error." }
    ],
    "correctAnswer": "A",
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q2",
    "text": "What does this code do?\\n\\nlet x = [1, 2, 3];\\nlet y = x;\\ny.push(4);\\nconsole.log(x.length);",
    "type": "mcq",
    "options": [
      { "id": "A", "text": "Prints 3 because x is independent of y." },
      { "id": "B", "text": "Prints 4 because y holds a reference to the same array in memory, so modifying y modifies x." }
    ],
    "correctAnswer": "B",
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q3",
    "text": "How does React’s virtual DOM actually improve performance?",
    "type": "mcq",
    "options": [
      { "id": "A", "text": "It keeps a lightweight in-memory representation of the UI. When state changes, it diffs the new tree against the old one and only applies the exact necessary changes to the real DOM, avoiding expensive full re-renders." },
      { "id": "B", "text": "It compiles React code directly into assembly language so the browser runs it faster without interpreting JavaScript." }
    ],
    "correctAnswer": "A",
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q4",
    "text": "Why do we use useEffect with an empty dependency array []?",
    "type": "mcq",
    "options": [
      { "id": "A", "text": "To tell React that the effect doesn't depend on any props or state, meaning it should only run once when the component mounts, similar to componentDidMount." },
      { "id": "B", "text": "To ensure the effect runs on every single render to keep data completely fresh at all times." }
    ],
    "correctAnswer": "A",
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q5",
    "text": "What happens if you await a function that doesn't return a Promise?",
    "type": "mcq",
    "options": [
      { "id": "A", "text": "The engine throws a TypeError and crashes the thread." },
      { "id": "B", "text": "It just wraps the return value in a resolved Promise and continues execution without actually pausing." }
    ],
    "correctAnswer": "B",
    "durationSeconds": 300,
    "points": 10
  },
  {
    "id": "r1-q6",
    "text": "Describe how JWT (JSON Web Tokens) work for authentication.",
    "type": "mcq",
    "options": [
      { "id": "A", "text": "The server gives you a signed token containing your user info. You send it with every request. The server verifies the signature to know it's you without having to look up a session id in a database every time." },
      { "id": "B", "text": "It's an encrypted database row stored on the client side that the server reads directly." }
    ],
    "correctAnswer": "A",
    "durationSeconds": 300,
    "points": 10
  }
]`;

const round2Data = `[
  {
    "id": "r2-q1",
    "text": "Write a function to check if a string is a palindrome.",
    "type": "text",
    "durationSeconds": 300,
    "points": 20
  },
  {
    "id": "r2-q2",
    "text": "Explain what a closure is in your own words, and provide a short example.",
    "type": "text",
    "durationSeconds": 300,
    "points": 20
  },
  {
    "id": "r2-q3",
    "text": "Given an array of integers, return the indices of the two numbers that add up to a specific target.",
    "type": "text",
    "durationSeconds": 300,
    "points": 20
  },
  {
    "id": "r2-q4",
    "text": "What is the time complexity of searching in a perfectly balanced binary search tree, and why?",
    "type": "text",
    "durationSeconds": 300,
    "points": 20
  }
]`;

const pollsData = `[
  {
    "id": "poll1",
    "text": "What's the most annoying bug you've ever dealt with?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "CORS errors" },
      { "id": "B", "text": "Off-by-one errors" },
      { "id": "C", "text": "Race conditions" },
      { "id": "D", "text": "CSS centering" }
    ],
    "durationSeconds": 60,
    "points": 0
  },
  {
    "id": "poll2",
    "text": "Tabs or Spaces?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "Tabs" },
      { "id": "B", "text": "Spaces" },
      { "id": "C", "text": "Both (I am chaos)" }
    ],
    "durationSeconds": 60,
    "points": 0
  },
  {
    "id": "poll3",
    "text": "Which framework do you prefer for frontend development?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "React" },
      { "id": "B", "text": "Vue" },
      { "id": "C", "text": "Angular" },
      { "id": "D", "text": "Svelte" }
    ],
    "durationSeconds": 60,
    "points": 0
  },
  {
    "id": "poll4",
    "text": "How often do you write unit tests?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "Always" },
      { "id": "B", "text": "Sometimes" },
      { "id": "C", "text": "Rarely" },
      { "id": "D", "text": "Never" }
    ],
    "durationSeconds": 60,
    "points": 0
  },
  {
    "id": "poll5",
    "text": "Do you prefer Light or Dark mode?",
    "type": "poll",
    "options": [
      { "id": "A", "text": "Light" },
      { "id": "B", "text": "Dark" }
    ],
    "durationSeconds": 60,
    "points": 0
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
    await redis.hmset('round:r1', { id: 'r1', name: 'Round 1: Aptitude', status: 'idle', durationSeconds: 300 });
    await redis.hmset('round:r2', { id: 'r2', name: 'Round 2: Coding', status: 'idle', durationSeconds: 300 });
    await redis.hmset('round:r3', { id: 'r3', name: 'Round 3: Live Polls', status: 'idle', durationSeconds: 60 });

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
