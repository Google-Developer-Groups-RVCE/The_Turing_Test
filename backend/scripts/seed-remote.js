'use strict';

const Redis = require('ioredis');

async function seed() {
  const client = new Redis({
    host: '127.0.0.1',
    port: 6380,
    password: 'production-redis-password'
  });

  const keys = require('../src/redis/keys');

  // Clear all existing rounds
  const roundKeys = await client.keys('round:*');
  if (roundKeys.length > 0) {
    await client.del(roundKeys);
  }
  await client.del(keys.ROUNDS_ORDER);
  await client.del(keys.CURRENT_ROUND);

  const rounds = [
    { id: 'round_1_aptitude',  name: 'Round 1 — Live Conversations',         status: 'pending', durationSeconds: '300', order: '1' },
    { id: 'round_2_coding',    name: 'Round 2 — Image Challenge',       status: 'pending', durationSeconds: '300', order: '2' },
    { id: 'round_3_decode',    name: 'Round 3 — Turing Test Speedrun',        status: 'pending', durationSeconds: '300', order: '3' },
  ];

  for (const r of rounds) {
    await client.hmset(keys.ROUND(r.id),
      'id', r.id,
      'name', r.name,
      'status', r.status,
      'durationSeconds', r.durationSeconds,
      'order', r.order
    );
    await client.rpush(keys.ROUNDS_ORDER, r.id);
  }

  const addQuestion = async (roundId, q) => {
    const key = keys.QUESTION(roundId, q.id);
    const entries = Object.entries({
      id: q.id,
      text: q.text,
      type: q.type || 'mcq',
      options: JSON.stringify(q.options || []),
      correctAnswer: q.correctAnswer,
      points: String(q.points || 10),
      order: String(q.order || 1),
      showEvaluation: q.showEvaluation !== undefined ? String(q.showEvaluation) : 'true',
      imageUrl: q.imageUrl,
      imageProps: q.imageProps ? JSON.stringify(q.imageProps) : null,
      targetAge: q.targetAge,
      targetProfession: q.targetProfession,
      targetHobby: q.targetHobby,
      durationSeconds: q.durationSeconds ? String(q.durationSeconds) : null
    }).filter(([_, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]).flat();
    
    if (entries.length > 0) {
      await client.hmset(key, ...entries);
    }
    await client.rpush(keys.QUESTIONS(roundId), q.id);
  };

  const r1Questions = [
    { id: "r1-q1", order: "1", type: "guess-author", text: "Round 1 — Conversation 1", options: [{ key: "A", label: "Response 1", answer: "It's useful for prototyping and boilerplate, but relying on it fully without understanding the logic underneath tends to bite you during debugging or in interviews. Best used as an accelerator, not a replacement for fundamentals." }, { key: "B", label: "Response 2", answer: "Honestly I do it way more than I should. Copy paste, run, if it breaks I panic and start googling instead of actually reading the error." }], correctAnswer: 'Human', points: '10', durationSeconds: '60' },
    { id: "r1-q2", order: "2", type: "guess-author", text: "Round 1 — Conversation 2", options: [{ key: "A", label: "Response 1", answer: "Depends what for. If it's something like a recipe or general knowledge I trust it, but the moment it's something specific to me, like my college syllabus, it just makes stuff up confidently." }, { key: "B", label: "Response 2", answer: "It's generally reliable for broad, well established information, but accuracy can drop for niche, recent, or highly specific topics, so it's good practice to verify anything important." }], correctAnswer: 'Human', points: '10', durationSeconds: '60' },
    { id: "r1-q3", order: "3", type: "guess-author", text: "Round 1 — Conversation 3", options: [{ key: "A", label: "Response 1", answer: "In some ways yes, since face-to-face interaction time has decreased, but phones also enable new forms of connection like group chats and video calls that weren't possible before. It's more of a shift than a pure decline." }, { key: "B", label: "Response 2", answer: "Kind of, but honestly I blame myself more than the phone. I could put it away and I just don't." }], correctAnswer: 'Human', points: '10', durationSeconds: '60' },
    { id: "r1-q4", order: "4", type: "guess-author", text: "Round 1 — Conversation 4", options: [{ key: "A", label: "Response 1", answer: "Instagram reels, no competition. I tell myself five minutes and then it's an hour and I don't even remember what I watched." }, { key: "B", label: "Response 2", answer: "Short-form video apps in general tend to be the biggest time sinks due to their endless scroll design, which is built to maximize engagement rather than user benefit." }], correctAnswer: 'Human', points: '10', durationSeconds: '60' },
    { id: "r1-q5", order: "5", type: "guess-author", text: "Round 1 — Conversation 5", options: [{ key: "A", label: "Response 1", answer: "Losing the laptop would likely be more manageable short term, since most daily communication and quick tasks can be handled on a phone, whereas a laptop is harder to replace for focused work." }, { key: "B", label: "Response 2", answer: "Laptop honestly, I'd survive. Losing my phone for a week sounds like actual torture, all my passwords and OTPs are on it." }], correctAnswer: 'Human', points: '10', durationSeconds: '60' },
    { id: "r1-q6", order: "6", type: "guess-author", text: "Round 1 — Conversation 6", options: [{ key: "A", label: "Response 1", answer: "More harm probably, but I say that while still using it every day, so take that with a grain of salt." }, { key: "B", label: "Response 2", answer: "It's mixed. Social media has clear benefits like connectivity and access to information, but also documented downsides related to mental health and misinformation, so the impact really depends on usage patterns." }], correctAnswer: 'Human', points: '10', durationSeconds: '60' }
  ];
  for (const q of r1Questions) await addQuestion('round_1_aptitude', q);
  await client.set(`round:round_1_aptitude:active_question`, 'r1-q1');

  const r2Questions = [
    { id: "r2-q1", order: "1", type: "image-choice", text: "Round 2 — Server Room", options: [{ key: "A", label: "Image 1" }, { key: "B", label: "Image 2" }], imageProps: { images: [{ src: "/reference/r2/image1.webp", label: "Image 1" }, { src: "/reference/r2/image2.webp", label: "Image 2" }] }, correctAnswer: 'Image 1', points: '10', durationSeconds: '60' },
    { id: "r2-q2", order: "2", type: "image-choice", text: "Round 2 — Wildlife Photography", options: [{ key: "A", label: "The head / face" }, { key: "B", label: "The stripes on the abdomen" }, { key: "C", label: "The legs" }, { key: "D", label: "The background" }], imageUrl: "/reference/r2/image3.webp", correctAnswer: 'The background', points: '10', durationSeconds: '60' },
    { id: "r2-q3", order: "3", type: "text", text: "Round 2 — Street Photography", options: [], imageUrl: "/reference/r2/image4.webp", correctAnswer: '', points: '10', durationSeconds: '60' },
    { id: "r2-q4", order: "4", type: "image-choice", text: "Round 2 — Bird Photography", options: [{ key: "A", label: "Real" }, { key: "B", label: "AI-generated" }], imageUrl: "/reference/r2/image5.webp", correctAnswer: 'AI-generated', points: '10', durationSeconds: '60' }
  ];
  for (const q of r2Questions) await addQuestion('round_2_coding', q);
  await client.set(`round:round_2_coding:active_question`, 'r2-q1');

  const r3Questions = [
    { id: 'poll1', order: '1', type: 'poll', text: 'Poll 1 — Daily Life', options: [{ key: 'A', question: "What does a perfect Sunday look like for you?", answer: "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens." }, { key: 'B', question: "What's something your friends often tease you about?", answer: "Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago." }, { key: 'C', question: "What's one thing you almost never leave home without?", answer: "My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I've forgotten something important." }], correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120' },
    { id: 'poll2', order: '2', type: 'poll', text: 'Poll 2 — Memories & Experiences', options: [{ key: 'A', question: "What's something younger people do that you find interesting?", answer: "How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first." }, { key: 'B', question: "What's a change in everyday life that still amazes you?", answer: "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things." }, { key: 'C', question: "How did you usually discover new music growing up?", answer: "Mostly through friends or hearing something somewhere repeatedly. Sometimes you'd like one song enough to take a chance on everything else by the same artist." }], correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120' },
    { id: 'poll3', order: '3', type: 'poll', text: 'Poll 3 — Work & Thinking', options: [{ key: 'A', question: "What's the most tiring part of your work?", answer: "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together." }, { key: 'B', question: "What skill do you think you're unusually good at?", answer: "Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed." }, { key: 'C', question: "What's something you do before an important meeting?", answer: "I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important." }], correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120' },
    { id: 'poll4', order: '4', type: 'poll', text: 'Poll 4 — Behaviour & Perspective', options: [{ key: 'A', question: "What's something you find interesting about conversations?", answer: "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different." }, { key: 'B', question: "What's something you've become less impressed by over time?", answer: "Confidence. Someone sounding completely certain doesn't really tell me whether they're right anymore. I tend to pay more attention to the details." }, { key: 'C', question: "What do your friends sometimes find annoying about you?", answer: "I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering." }], correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120' },
    { id: 'poll5', order: '5', type: 'poll', text: 'Poll 5 — Personal Interests', options: [{ key: 'A', question: "What kind of moments do you remember most clearly?", answer: "Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds." }, { key: 'B', question: "What's something you're unusually patient about?", answer: "Waiting when I feel the timing matters. I don't mind staying in the same place for a while if rushing would mean missing something interesting." }, { key: 'C', question: "When you visit somewhere new, what do you usually do first?", answer: "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly." }], correctAnswer: '', points: '0', showEvaluation: false, durationSeconds: '120' },
    { id: 'poll6', order: '6', type: 'profile-guess', text: 'Final Submission', options: [], correctAnswer: 'Age: 47 | Profession: Lawyer | Hobby: Photography', points: '30', showEvaluation: true, durationSeconds: '240', targetAge: '47', targetProfession: 'Lawyer', targetHobby: 'Photography' }
  ];
  for (const q of r3Questions) await addQuestion('round_3_decode', q);
  await client.set(`round:round_3_decode:active_question`, 'poll1');

  await client.quit();
  console.log('Seeded completely!');
}

seed().catch(console.error);
