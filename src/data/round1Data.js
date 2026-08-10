// Round 1 — Live Conversations.
// Host-only labels (human/gemini) are never rendered to participants.
const round1Data = [
  {
    id: "r1-q1",
    order: 1,
    title: "Round 1 — Conversation 1",
    focus: "Human vs Gemini",
    prompt: "What's your take on vibe coding, just letting AI write most of your code?",
    options: [
      {
        key: "A",
        label: "Response 1",
        answer: "It's useful for prototyping and boilerplate, but relying on it fully without understanding the logic underneath tends to bite you during debugging or in interviews. Best used as an accelerator, not a replacement for fundamentals."
      },
      {
        key: "B",
        label: "Response 2",
        answer: "Honestly I do it way more than I should. Copy paste, run, if it breaks I panic and start googling instead of actually reading the error."
      }
    ]
  },
  {
    id: "r1-q2",
    order: 2,
    title: "Round 1 — Conversation 2",
    focus: "Human vs Gemini",
    prompt: "How much do you trust AI chatbots to give you correct information?",
    options: [
      {
        key: "A",
        label: "Response 1",
        answer: "Depends what for. If it's something like a recipe or general knowledge I trust it, but the moment it's something specific to me, like my college syllabus, it just makes stuff up confidently."
      },
      {
        key: "B",
        label: "Response 2",
        answer: "It's generally reliable for broad, well established information, but accuracy can drop for niche, recent, or highly specific topics, so it's good practice to verify anything important."
      }
    ]
  },
  {
    id: "r1-q3",
    order: 3,
    title: "Round 1 — Conversation 3",
    focus: "Human vs Gemini",
    prompt: "Do you think phones have made us less social?",
    options: [
      {
        key: "A",
        label: "Response 1",
        answer: "In some ways yes, since face-to-face interaction time has decreased, but phones also enable new forms of connection like group chats and video calls that weren't possible before. It's more of a shift than a pure decline."
      },
      {
        key: "B",
        label: "Response 2",
        answer: "Kind of, but honestly I blame myself more than the phone. I could put it away and I just don't."
      }
    ]
  },
  {
    id: "r1-q4",
    order: 4,
    title: "Round 1 — Conversation 4",
    focus: "Human vs Gemini",
    prompt: "What app do you think you spend way too much time on?",
    options: [
      {
        key: "A",
        label: "Response 1",
        answer: "Instagram reels, no competition. I tell myself five minutes and then it's an hour and I don't even remember what I watched."
      },
      {
        key: "B",
        label: "Response 2",
        answer: "Short-form video apps in general tend to be the biggest time sinks due to their endless scroll design, which is built to maximize engagement rather than user benefit."
      }
    ]
  },
  {
    id: "r1-q5",
    order: 5,
    title: "Round 1 — Conversation 5",
    focus: "Human vs Gemini",
    prompt: "Would you rather lose your phone for a week or your laptop for a week?",
    options: [
      {
        key: "A",
        label: "Response 1",
        answer: "Losing the laptop would likely be more manageable short term, since most daily communication and quick tasks can be handled on a phone, whereas a laptop is harder to replace for focused work."
      },
      {
        key: "B",
        label: "Response 2",
        answer: "Laptop honestly, I'd survive. Losing my phone for a week sounds like actual torture, all my passwords and OTPs are on it."
      }
    ]
  },
  {
    id: "r1-q6",
    order: 6,
    title: "Round 1 — Conversation 6",
    focus: "Human vs Gemini",
    prompt: "Do you think social media does more harm than good?",
    options: [
      {
        key: "A",
        label: "Response 1",
        answer: "More harm probably, but I say that while still using it every day, so take that with a grain of salt."
      },
      {
        key: "B",
        label: "Response 2",
        answer: "It's mixed. Social media has clear benefits like connectivity and access to information, but also documented downsides related to mental health and misinformation, so the impact really depends on usage patterns."
      }
    ]
  }
];

export default round1Data;
