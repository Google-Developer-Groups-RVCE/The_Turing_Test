export default [
  {
    "id": "r4-q1",
    "order": 1,
    "title": "Spot the Hallucination",
    "focus": "History Trap",
    "prompt": "Who was the first person to walk on Mars?",
    "type": "mcq",
    "points": 15,
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
    "title": "Spot the Hallucination",
    "focus": "Suspicious Source",
    "prompt": "Does drinking coffee improve IQ?",
    "type": "mcq",
    "points": 15,
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
    "title": "Spot the Hallucination",
    "focus": "Physics Calculation Trap",
    "prompt": "Given answer: 40 m above the building.\n\nFind the error in the soln.",
    "type": "mcq",
    "points": 15,
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
    "explanation": "(no need to actually solve this problem)\n· In the 1st step itself, there is a calculation error.\n· Gemini uses law of energy conservation which is wrong as the collision is inelastic. Hence, there will be a loss of energy. Conservation of linear momentum must be applied to solve this problem\n· Hence, AI struggles with complex problems"
  },
  {
    "id": "r4-q4",
    "order": 4,
    "title": "Spot the Hallucination",
    "focus": "Programming History",
    "prompt": "Which statement is the hidden hallucination in this response about C?",
    "type": "mcq",
    "points": 15,
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
    "title": "Spot the Hallucination",
    "focus": "Science Fact Trap",
    "prompt": "Which part of this Einstein response is incorrect?",
    "type": "mcq",
    "points": 15,
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
    "id": "r4-q6",
    "order": 6,
    "title": "Spot the Hallucination",
    "focus": "Historical Detail Trap",
    "prompt": "What is wrong with this explanation of the Taj Mahal?",
    "type": "mcq",
    "points": 15,
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
  }
];
