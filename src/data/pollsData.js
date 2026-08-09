// Content sourced from "Round 3 — Decode the Context" brief.
// Each poll has 3 options; teams vote for one.

const pollsData = [
  {
    id: "poll1",
    order: 1,
    title: "Poll 1 — Daily Life",
    focus: "Broad age-range clues",
    options: [
      {
        key: "A",
        question: "What does a perfect Sunday look like for you?",
        answer:
          "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens."
      },
      {
        key: "B",
        question: "What's something your friends often tease you about?",
        answer:
          "Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago."
      },
      {
        key: "C",
        question: "What's one thing you almost never leave home without?",
        answer:
          "My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I've forgotten something important."
      }
    ]
  },
  {
    id: "poll2",
    order: 2,
    title: "Poll 2 — Memories & Experiences",
    focus: "Narrowing the generation",
    options: [
      {
        key: "A",
        question: "What's something younger people do that you find interesting?",
        answer:
          "How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first."
      },
      {
        key: "B",
        question: "What's a change in everyday life that still amazes you?",
        answer:
          "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things."
      },
      {
        key: "C",
        question: "How did you usually discover new music growing up?",
        answer:
          "Mostly through friends or hearing something somewhere repeatedly. Sometimes you'd like one song enough to take a chance on everything else by the same artist."
      }
    ]
  },
  {
    id: "poll3",
    order: 3,
    title: "Poll 3 — Work & Thinking",
    focus: "Early profession clues",
    options: [
      {
        key: "A",
        question: "What's the most tiring part of your work?",
        answer:
          "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together."
      },
      {
        key: "B",
        question: "What skill do you think you're unusually good at?",
        answer:
          "Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed."
      },
      {
        key: "C",
        question: "What's something you do before an important meeting?",
        answer:
          "I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important."
      }
    ]
  },
  {
    id: "poll4",
    order: 4,
    title: "Poll 4 — Behaviour & Perspective",
    focus: "Narrowing the profession",
    options: [
      {
        key: "A",
        question: "What's something you find interesting about conversations?",
        answer:
          "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different."
      },
      {
        key: "B",
        question: "What's something you've become less impressed by over time?",
        answer:
          "Confidence. Someone sounding completely certain doesn't really tell me whether they're right anymore. I tend to pay more attention to the details."
      },
      {
        key: "C",
        question: "What do your friends sometimes find annoying about you?",
        answer:
          "I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering."
      }
    ]
  },
  {
    id: "poll5",
    order: 5,
    title: "Poll 5 — Personal Interests",
    focus: "Hobby clues",
    options: [
      {
        key: "A",
        question: "What kind of moments do you remember most clearly?",
        answer:
          "Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds."
      },
      {
        key: "B",
        question: "What's something you're unusually patient about?",
        answer:
          "Waiting when I feel the timing matters. I don't mind staying in the same place for a while if rushing would mean missing something interesting."
      },
      {
        key: "C",
        question: "When you visit somewhere new, what do you usually do first?",
        answer:
          "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly."
      }
    ]
  }
];

export default pollsData;
