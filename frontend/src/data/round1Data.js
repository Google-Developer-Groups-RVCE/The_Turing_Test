// Round 1 — Live Conversations (Guess the Author).
// Host-only labels (human/gemini) are never rendered to participants.
const round1Data = [
  {
    id: "r1-q1",
    order: 1,
    title: "Round 1 — Conversation 1",
    focus: "Human vs Gemini",
    prompt: "What makes a mistake educational rather than purely wasteful?",
    options: [
      {
        id: "gemini-opt",
        key: "A",
        label: "Response 1",
        text: "Prompt, honest analysis of the root cause, followed by a concrete change in strategy before repeating the action.",
        answer: "Prompt, honest analysis of the root cause, followed by a concrete change in strategy before repeating the action.",
        author: "Gemini"
      },
      {
        id: "human-opt",
        key: "B",
        label: "Response 2",
        text: "Systematic reflection. A mistake becomes valuable only when it forces a recalibration of assumptions rather than mere regret.",
        answer: "Systematic reflection. A mistake becomes valuable only when it forces a recalibration of assumptions rather than mere regret.",
        author: "Human"
      }
    ]
  },
  {
    id: "r1-q2",
    order: 2,
    title: "Round 1 — Conversation 2",
    focus: "Human vs Gemini",
    prompt: "Why does anticipation of an event often feel more intense than the event itself?",
    options: [
      {
        id: "human-opt",
        key: "A",
        label: "Response 1",
        text: "Imagination operates without constraints or physical friction, allowing the brain to simulate infinite best-case or worst-case scenarios uninterrupted.",
        answer: "Imagination operates without constraints or physical friction, allowing the brain to simulate infinite best-case or worst-case scenarios uninterrupted.",
        author: "Human"
      },
      {
        id: "gemini-opt",
        key: "B",
        label: "Response 2",
        text: "Because the mind projects unrestricted potential, whereas the actual event is bounded by real-time reality and practical limitations.",
        answer: "Because the mind projects unrestricted potential, whereas the actual event is bounded by real-time reality and practical limitations.",
        author: "Gemini"
      }
    ]
  },
  {
    id: "r1-q3",
    order: 3,
    title: "Round 1 — Conversation 3",
    focus: "Human vs Gemini",
    prompt: "Why do people often overcomplicate simple decisions?",
    options: [
      {
        id: "human-opt",
        key: "A",
        label: "Response 1",
        text: "Anxiety over potential opportunity cost. When options are plentiful, the fear of making a suboptimal choice drives over-analysis of trivial details.",
        answer: "Anxiety over potential opportunity cost. When options are plentiful, the fear of making a suboptimal choice drives over-analysis of trivial details.",
        author: "Human"
      },
      {
        id: "gemini-opt",
        key: "B",
        label: "Response 2",
        text: "Fear of regret often overrides logic, causing people to analyze minor variables to gain a false sense of control over the outcome.",
        answer: "Fear of regret often overrides logic, causing people to analyze minor variables to gain a false sense of control over the outcome.",
        author: "Gemini"
      }
    ]
  },
  {
    id: "r1-q4",
    order: 4,
    title: "Round 1 — Conversation 4",
    focus: "Human vs Gemini",
    prompt: "How does living in a major city alter a person's perception of time?",
    options: [
      {
        id: "human-opt",
        key: "A",
        label: "Response 1",
        text: "Major cities accelerate micro-perceptions of time while compressing long-term memory. The constant input of traffic, schedules, and transit forces the mind to live in hyper-aware, short-term increments, making days feel packed and fast, yet blur together when looking back over years.",
        answer: "Major cities accelerate micro-perceptions of time while compressing long-term memory. The constant input of traffic, schedules, and transit forces the mind to live in hyper-aware, short-term increments, making days feel packed and fast, yet blur together when looking back over years.",
        author: "Human"
      },
      {
        id: "gemini-opt",
        key: "B",
        label: "Response 2",
        text: "Urban environments often compress our awareness of time due to high density and constant schedules. The pacing of public transit, rapid environmental changes, and fixed routines create a heightened sense of urgency, making minutes feel more critical than they might in quieter, less structured settings.",
        answer: "Urban environments often compress our awareness of time due to high density and constant schedules. The pacing of public transit, rapid environmental changes, and fixed routines create a heightened sense of urgency, making minutes feel more critical than they might in quieter, less structured settings.",
        author: "Gemini"
      }
    ]
  },
  {
    id: "r1-q5",
    order: 5,
    title: "Round 1 — Conversation 5",
    focus: "Human vs Gemini",
    prompt: "Why do humans feel a strange comfort in listening to sad music when they are down?",
    options: [
      {
        id: "human-opt",
        key: "A",
        label: "Response 1",
        text: "Sad music provides a form of psychological validation without requiring social interaction. It creates a space where an emotion can be felt completely and safely, serving as a mirror that reassures the listener that their state of mind is shared and natural.",
        answer: "Sad music provides a form of psychological validation without requiring social interaction. It creates a space where an emotion can be felt completely and safely, serving as a mirror that reassures the listener that their state of mind is shared and natural.",
        author: "Human"
      },
      {
        id: "gemini-opt",
        key: "B",
        label: "Response 2",
        text: "Listening to melancholic music can foster a sense of emotional alignment and empathy. Rather than amplifying distress, it often offers a cathartic release by reflecting the listener's internal state, allowing them to process complex emotions in a safe, controlled aesthetic context.",
        answer: "Listening to melancholic music can foster a sense of emotional alignment and empathy. Rather than amplifying distress, it often offers a cathartic release by reflecting the listener's internal state, allowing them to process complex emotions in a safe, controlled aesthetic context.",
        author: "Gemini"
      }
    ]
  },
  {
    id: "r1-q6",
    order: 6,
    title: "Round 1 — Conversation 6",
    focus: "Human vs Gemini",
    prompt: "What role does failure play in long-term personal growth?",
    options: [
      {
        id: "human-opt",
        key: "A",
        label: "Response 1",
        text: "Failure acts as a necessary diagnostic tool. It strips away false assumptions about one's capabilities or strategies, forcing a recalibration that success rarely demands. Over time, navigating failure builds adaptability and a more grounded sense of competence.",
        answer: "Failure acts as a necessary diagnostic tool. It strips away false assumptions about one's capabilities or strategies, forcing a recalibration that success rarely demands. Over time, navigating failure builds adaptability and a more grounded sense of competence.",
        author: "Human"
      },
      {
        id: "gemini-opt",
        key: "B",
        label: "Response 2",
        text: "Failure serves as a critical feedback mechanism in personal development. It highlights gaps in understanding or execution, encouraging reflection and resilience. While uncomfortable, it provides practical insights that refine future decision-making far more effectively than immediate success.",
        answer: "Failure serves as a critical feedback mechanism in personal development. It highlights gaps in understanding or execution, encouraging reflection and resilience. While uncomfortable, it provides practical insights that refine future decision-making far more effectively than immediate success.",
        author: "Gemini"
      }
    ]
  },
  {
    id: "r1-q7",
    order: 7,
    title: "Round 1 — Conversation 7",
    focus: "Human vs Gemini",
    prompt: "What makes a story ending feel satisfying versus forced?",
    options: [
      {
        id: "gemini-opt",
        key: "A",
        label: "Response 1",
        text: "A satisfying resolution feels earned through the logical consequences of the characters' decisions, even if the outcome is unexpected. A forced ending usually relies on coincidence, unestablished mechanics, or external intervention to tie up plot points prematurely.",
        answer: "A satisfying resolution feels earned through the logical consequences of the characters' decisions, even if the outcome is unexpected. A forced ending usually relies on coincidence, unestablished mechanics, or external intervention to tie up plot points prematurely.",
        author: "Gemini"
      },
      {
        id: "human-opt",
        key: "B",
        label: "Response 2",
        text: "Satisfaction in a narrative conclusion relies on emotional and thematic coherence rather than just resolving the plot. If the characters' internal arcs reach a natural resolution that aligns with established stakes, the ending feels complete, even if loose threads remain.",
        answer: "Satisfaction in a narrative conclusion relies on emotional and thematic coherence rather than just resolving the plot. If the characters' internal arcs reach a natural resolution that aligns with established stakes, the ending feels complete, even if loose threads remain.",
        author: "Human"
      }
    ]
  },
  {
    id: "r1-q8",
    order: 8,
    title: "Round 1 — Conversation 8",
    focus: "Human vs Gemini",
    prompt: "How does nostalgic memory differ from actual history?",
    options: [
      {
        id: "human-opt",
        key: "A",
        label: "Response 1",
        text: "History aims to preserve contextual facts and structural timelines, whereas nostalgia filters out discomfort to preserve a specific past emotional state.",
        answer: "History aims to preserve contextual facts and structural timelines, whereas nostalgia filters out discomfort to preserve a specific past emotional state.",
        author: "Human"
      },
      {
        id: "gemini-opt",
        key: "B",
        label: "Response 2",
        text: "History records events as they unfolded, while nostalgia edits those events to reflect how a period felt rather than what actually occurred.",
        answer: "History records events as they unfolded, while nostalgia edits those events to reflect how a period felt rather than what actually occurred.",
        author: "Gemini"
      }
    ]
  },
  {
    id: "r1-q9",
    order: 9,
    title: "Round 1 — Conversation 9",
    focus: "Human vs Gemini",
    prompt: "Why do old photos feel distinct from modern digital photos?",
    options: [
      {
        id: "gemini-opt",
        key: "A",
        label: "Response 1",
        text: "Analog photographs carry tangible physical constraints — limited exposures, chemical grain, and color shifts that create a sense of permanent artifacting.",
        answer: "Analog photographs carry tangible physical constraints — limited exposures, chemical grain, and color shifts that create a sense of permanent artifacting.",
        author: "Gemini"
      },
      {
        id: "human-opt",
        key: "B",
        label: "Response 2",
        text: "Film photos capture a singular, deliberate moment due to physical film limits, giving them an authenticity often lost in infinite digital takes.",
        answer: "Film photos capture a singular, deliberate moment due to physical film limits, giving them an authenticity often lost in infinite digital takes.",
        author: "Human"
      }
    ]
  },
  {
    id: "r1-q10",
    order: 10,
    title: "Round 1 — Conversation 10",
    focus: "Human vs Gemini",
    prompt: "What is the subtle boundary between patience and procrastination?",
    options: [
      {
        id: "gemini-opt",
        key: "A",
        label: "Response 1",
        text: "Patience is strategic waiting while gathering context or waiting for timing; procrastination is tactical avoidance driven by discomfort or fear.",
        answer: "Patience is strategic waiting while gathering context or waiting for timing; procrastination is tactical avoidance driven by discomfort or fear.",
        author: "Gemini"
      },
      {
        id: "human-opt",
        key: "B",
        label: "Response 2",
        text: "Intentionality. Patience is an active choice to wait for optimal conditions, whereas procrastination is passive delay to avoid immediate effort.",
        answer: "Intentionality. Patience is an active choice to wait for optimal conditions, whereas procrastination is passive delay to avoid immediate effort.",
        author: "Human"
      }
    ]
  }
];

export default round1Data;
