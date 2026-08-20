export default [
  {
    "id": "r4-q1",
    "order": 1,
    "title": "",
    "focus": "Warm-up",
    "prompt": "Who was the first person to walk on Mars?",
    "type": "mcq",
    "points": 0,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "It wasn't Neil Armstrong; it was Buzz Aldrin"
      },
      {
        "key": "B",
        "label": "",
        "answer": "It happened in 1969 and not 1985"
      },
      {
        "key": "C",
        "label": "",
        "answer": "It was an operation led by ISRO and not NASA"
      },
      {
        "key": "D",
        "label": "",
        "answer": "No human has ever walked on Mars"
      }
    ],
    "ai": "Neil Armstrong became the first person to walk on Mars during NASA's 1985 Mars expedition.",
    "correctAnswer": "No human has ever walked on Mars",
    "explanation": "No human has ever walked on Mars. No NASA Mars expedition occurred in 1985. The entire answer is fabricated."
  },
  {
    "id": "r4-q2",
    "order": 2,
    "title": "",
    "focus": "Warm-up",
    "prompt": "Does drinking coffee improve IQ?",
    "type": "mcq",
    "points": 0,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "Yes — the MIT attribution makes the permanent IQ increase scientifically established"
      },
      {
        "key": "B",
        "label": "",
        "answer": "Yes — coffee is a stimulant, so any improvement in alertness proves a permanent IQ increase"
      },
      {
        "key": "C",
        "label": "",
        "answer": "Likely fabricated / unsupported claim"
      },
      {
        "key": "D",
        "label": "",
        "answer": "No — coffee can never affect attention or cognitive performance in any way"
      },
      {
        "key": "E",
        "label": "",
        "answer": "It is proven if the study measured participants before and after drinking coffee"
      }
    ],
    "ai": "A 2021 MIT study proved that coffee permanently increases IQ by 15 points.",
    "correctAnswer": "Likely fabricated / unsupported claim",
    "explanation": "The claim is likely fabricated or unsupported. No verifiable MIT study is provided, the word 'proved' is suspiciously strong, and a permanent 15-point IQ increase is an extraordinary claim that would require strong evidence."
  },
  {
    "id": "r4-q3",
    "order": 3,
    "title": "",
    "focus": "Warm-up",
    "prompt": "Given answer: 40 m above the building.\n\nFind the error in the soln.",
    "type": "mcq",
    "points": 0,
    "image": "/reference/r4/wood-physics-ai-response.png",
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "Calculation error in step 1"
      },
      {
        "key": "B",
        "label": "",
        "answer": "Law of momentum conservation doesn't apply here"
      },
      {
        "key": "C",
        "label": "",
        "answer": "Law of energy conservation won't apply here"
      },
      {
        "key": "D",
        "label": "",
        "answer": "option a) and c)"
      }
    ],
    "ai": "Given answer: 40 m above the building. The image below shows the AI solution that produced the incorrect 50 m result.",
    "correctAnswer": "option a) and c)",
    "explanation": "(no need to actually solve this problem)\n·       In the 1st step itself, there is a calculation error.\n·       Gemini uses law of energy conservation which is wrong as the collision is inelastic. Hence, there will be a loss of energy. Conservation of linear momentum must be applied to solve this problem\n·       Hence, AI struggles with complex problems"
  },
  {
    "id": "r4-q4",
    "order": 4,
    "title": "",
    "focus": "Spot the Hallucination",
    "prompt": "Which statement is the hidden hallucination in this response about C?",
    "type": "mcq",
    "points": 10,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "C is a procedural programming language developed by Dennis Ritchie at Bell Labs"
      },
      {
        "key": "B",
        "label": "",
        "answer": "C was developed primarily in connection with Unix"
      },
      {
        "key": "C",
        "label": "",
        "answer": "C influenced later languages including C++ and Python"
      },
      {
        "key": "D",
        "label": "",
        "answer": "The language was originally designed to create the Windows operating system"
      },
      {
        "key": "E",
        "label": "",
        "answer": "C was created at Bell Labs before Windows existed"
      }
    ],
    "ai": "C is a procedural programming language developed by Dennis Ritchie at Bell Labs. It influenced many later languages such as C++, Java, and Python. The language was originally designed to create the Windows operating system.",
    "correctAnswer": "The language was originally designed to create the Windows operating system",
    "explanation": "C was developed at Bell Labs primarily in connection with the Unix operating system. Windows did not exist when C was created, so the claim that C was originally designed to create Windows is the hidden hallucination."
  },
  {
    "id": "r4-q5",
    "order": 5,
    "title": "",
    "focus": "Spot the Hallucination",
    "prompt": "Which statement is the hidden hallucination in this response about Moore's Law?",
    "type": "mcq",
    "points": 10,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "Gordon Moore is associated with the observation described by Moore's Law"
      },
      {
        "key": "B",
        "label": "",
        "answer": "Moore's Law is a historical observation or trend rather than a physical law of nature"
      },
      {
        "key": "C",
        "label": "",
        "answer": "The claim that all processors must obey Moore's Law is the hidden hallucination"
      },
      {
        "key": "D",
        "label": "",
        "answer": "Moore's Law is a prediction about technological progress, not a rule enforced by physics"
      },
      {
        "key": "E",
        "label": "",
        "answer": "It is incorrect to describe Moore's Law as something processors are physically required to obey"
      }
    ],
    "ai": "Moore's Law states that computer performance doubles every two years. This law was proposed by Gordon Moore in 1965 and remains a physical law of nature that all processors must obey.",
    "correctAnswer": "The claim that all processors must obey Moore's Law is the hidden hallucination",
    "explanation": "Moore's Law is a historical observation or trend about the growth of transistor density and related computing capability. It is not a fundamental physical law, and processors are not required to obey it."
  },
  {
    "id": "r4-q6",
    "order": 6,
    "title": "",
    "focus": "Spot the Hallucination",
    "prompt": "Which part of this Einstein response is incorrect?",
    "type": "mcq",
    "points": 10,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "Einstein received the Nobel Prize in Physics"
      },
      {
        "key": "B",
        "label": "",
        "answer": "The prize was awarded in 1921"
      },
      {
        "key": "C",
        "label": "",
        "answer": "Einstein's work revolutionized modern physics"
      },
      {
        "key": "D",
        "label": "",
        "answer": "The Nobel Prize was awarded primarily for the photoelectric effect, not relativity"
      },
      {
        "key": "E",
        "label": "",
        "answer": "The response falsely says the Nobel Prize was awarded for the theory of relativity"
      }
    ],
    "ai": "Albert Einstein won the Nobel Prize in Physics in 1921 for his Theory of Relativity, which revolutionized modern physics.",
    "correctAnswer": "The response falsely says the Nobel Prize was awarded for the theory of relativity",
    "explanation": "Einstein did receive the 1921 Nobel Prize in Physics, but the award was primarily for his explanation of the photoelectric effect, not for the theory of relativity."
  },
  {
    "id": "r4-q7",
    "order": 7,
    "title": "",
    "focus": "Spot the Hallucination",
    "prompt": "How should this password advice be evaluated?",
    "type": "mcq",
    "points": 10,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "It is safe because memorable passwords are always stronger than random ones"
      },
      {
        "key": "B",
        "label": "",
        "answer": "It becomes secure if a birth year is added to the personal detail"
      },
      {
        "key": "C",
        "label": "",
        "answer": "It is unsafe because predictable personal details can be guessed or discovered"
      },
      {
        "key": "D",
        "label": "",
        "answer": "It is safe as long as the password contains at least eight characters"
      },
      {
        "key": "E",
        "label": "",
        "answer": "It is recommended because attackers generally cannot know a person's favorite things"
      }
    ],
    "ai": "Use your birthday, pet's name, favorite team, or another personal detail so you never forget your password.",
    "correctAnswer": "It is unsafe because predictable personal details can be guessed or discovered",
    "explanation": "Personal details are often discoverable or guessable. Recommending them as passwords compromises security because attackers can use publicly available information or social engineering to guess them."
  },
  {
    "id": "r4-q8",
    "order": 8,
    "title": "",
    "focus": "Spot the Hallucination",
    "prompt": "What is wrong with this explanation of the Taj Mahal?",
    "type": "mcq",
    "points": 10,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "The Taj Mahal is not located in Agra"
      },
      {
        "key": "B",
        "label": "",
        "answer": "Shah Jahan did not commission the Taj Mahal"
      },
      {
        "key": "C",
        "label": "",
        "answer": "Construction could not have begun in the seventeenth century"
      },
      {
        "key": "D",
        "label": "",
        "answer": "The monument was built to celebrate the annexation of Bijapur and Golconda"
      },
      {
        "key": "E",
        "label": "",
        "answer": "The Taj Mahal is a mausoleum associated with Mumtaz Mahal rather than a Deccan-campaign victory monument"
      }
    ],
    "ai": "The Taj Mahal is located in Agra and was commissioned by Shah Jahan. Construction began in 1632 and was completed in 1653. It was built to celebrate the annexation of Bijapur and Golconda during his Deccan campaigns.",
    "correctAnswer": "The monument was built to celebrate the annexation of Bijapur and Golconda",
    "explanation": "The Taj Mahal was commissioned by Shah Jahan as a mausoleum for his wife Mumtaz Mahal. The claimed connection to the annexation of Bijapur and Golconda is the hidden hallucination."
  },
  {
    "id": "r4-q9",
    "order": 9,
    "title": "",
    "focus": "Spot the Hallucination",
    "prompt": "Which statement contains the hidden mathematical error?",
    "type": "mcq",
    "points": 10,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "Binary numbers use only the digits 0 and 1"
      },
      {
        "key": "B",
        "label": "",
        "answer": "Computers can represent data using binary"
      },
      {
        "key": "C",
        "label": "",
        "answer": "Every decimal number can be represented exactly with a finite binary expansion"
      },
      {
        "key": "D",
        "label": "",
        "answer": "A decimal fraction can never have a repeating binary representation"
      },
      {
        "key": "E",
        "label": "",
        "answer": "The hidden error is that decimal and binary numbers follow unrelated arithmetic rules"
      }
    ],
    "ai": "Binary numbers use only the digits 0 and 1. Computers internally represent data using binary. Therefore, every decimal number can be represented exactly in binary form.",
    "correctAnswer": "Every decimal number can be represented exactly with a finite binary expansion",
    "explanation": "The first two statements are broadly correct. The error is the claim that every decimal number has a finite exact binary representation. Some fractions, including 0.1, require a repeating binary expansion."
  },
  {
    "id": "r4-q10",
    "order": 10,
    "title": "",
    "focus": "Spot the Hallucination",
    "prompt": "Which part of this response should make you suspicious?",
    "type": "mcq",
    "points": 10,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "The statement that ChatGPT was released in 2022 is the hidden hallucination"
      },
      {
        "key": "B",
        "label": "",
        "answer": "The statement that AI can answer questions across many domains is impossible"
      },
      {
        "key": "C",
        "label": "",
        "answer": "The final sentence encourages blind trust and overstates reliability"
      },
      {
        "key": "D",
        "label": "",
        "answer": "The entire response is fabricated because AI cannot be trained on text"
      },
      {
        "key": "E",
        "label": "",
        "answer": "AI systems should never be used for factual questions under any circumstances"
      }
    ],
    "ai": "ChatGPT was released by OpenAI in 2022 and quickly became one of the most widely used AI systems in history. It is trained on vast amounts of text and can answer questions across many domains. Because of its advanced reasoning abilities, its factual statements are generally reliable and should be trusted unless there is strong evidence to the contrary.",
    "correctAnswer": "The final sentence encourages blind trust and overstates reliability",
    "explanation": "The first two sentences are broadly descriptive. The final sentence is the hidden problem: AI outputs can be wrong and should be verified, especially in high-stakes situations. Advanced reasoning does not guarantee factual accuracy."
  },
  {
    "id": "r4-q11",
    "order": 11,
    "title": "",
    "focus": "Spot the Hallucination",
    "prompt": "Should this research claim be accepted as stated?",
    "type": "mcq",
    "points": 10,
    "options": [
      {
        "key": "A",
        "label": "",
        "answer": "Yes, because a Stanford attribution makes the claim automatically reliable"
      },
      {
        "key": "B",
        "label": "",
        "answer": "Yes, because a 35% difference is enough to establish causation"
      },
      {
        "key": "C",
        "label": "",
        "answer": "No; the citation lacks verifiable details and correlation does not establish causation"
      },
      {
        "key": "D",
        "label": "",
        "answer": "No; AI can never improve academic performance under any circumstances"
      },
      {
        "key": "E",
        "label": "",
        "answer": "Yes, because two hours per day is a scientifically established threshold"
      }
    ],
    "ai": "According to a Stanford University study published in 2023, students who use AI tools for more than two hours daily score 35% higher in engineering courses. The study proves that AI usage directly causes better academic performance.",
    "correctAnswer": "No; the citation lacks verifiable details and correlation does not establish causation",
    "explanation": "The citation may be fabricated or misrepresented because no authors, paper title, journal, sample, or link is provided. Even a real correlation would not prove causation. The word 'proves' is a red flag."
  }
];
