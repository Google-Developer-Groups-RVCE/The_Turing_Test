# Decode the Context — Frontend

Baseline (no visual design) React frontend for capturing team responses for
the "Decode the Context" game: 5 polls (each with 3 options) followed by a
final hidden-profile guess (Predicted Age, Predicted Profession, Predicted
Hobby).

This is the **frontend only**. It is built to plug into a Node/Express
backend (see "Backend contract" below) that will handle persistence,
scoring, and the leaderboard.

## Folder structure

```
decode-the-context/
├── index.html                  Vite entry HTML (mobile viewport set)
├── package.json
├── vite.config.js
├── .env.example                 Copy to .env and set VITE_API_BASE_URL
└── src/
    ├── main.jsx                 App bootstrap (Router + SessionProvider)
    ├── App.jsx                  Top-level component
    ├── index.css                Minimal reset only, no design/theming
    ├── api/
    │   ├── apiClient.js          Axios instance (base URL, timeout)
    │   └── responseService.js    API calls: registerTeam, submitPollAnswer,
    │                              submitFinalGuess, getLeaderboard
    ├── components/
    │   ├── PollCard.jsx          Renders one poll (title + 3 options)
    │   ├── OptionButton.jsx      Single selectable option
    │   ├── ProgressBar.jsx       "Step X of 5" text indicator
    │   └── Loader.jsx            Basic loading/submitting indicator
    ├── context/
    │   └── SessionContext.jsx    teamId/teamName/answers/textAnswers, persisted to
    │                              localStorage so refresh/flaky mobile
    │                              connections don't lose progress
    ├── data/
    │   ├── round1Data.js         Round 1 questions
    │   ├── round2Data.js         Round 2 questions + image assets
    │   └── pollsData.js          Existing Round 3 polls
    ├── pages/
    │   ├── TeamEntry.jsx         Team name entry / session start
    │   ├── Poll.jsx               Generic poll page, driven by :pollNumber
    │   ├── FinalSubmission.jsx    Predicted age / profession / hobby form
    │   └── ThankYou.jsx           Confirmation screen
    ├── routes/
    │   └── AppRoutes.jsx          / , /poll/:pollNumber , /final-submission ,
    │                              /thank-you
    └── utils/
        └── storage.js             localStorage helpers
```

## Setup

```bash
npm install
cp .env.example .env   # then set VITE_API_BASE_URL to your Express server
npm run dev             # local development
npm run build            # production build (outputs to dist/)
npm run preview          # preview the production build
```

## Backend contract (Node/Express — to be implemented separately)

| Method | Route                  | Body                                                             |
|--------|-------------------------|-------------------------------------------------------------------|
| POST   | /api/teams              | `{ teamName }` → `{ teamId, teamName }`                          |
| POST   | /api/responses/poll     | `{ teamId, pollId, optionKey }`                                  |
| POST   | /api/responses/final    | `{ teamId, predictedAge, predictedProfession, predictedHobby }`  |
| GET    | /api/leaderboard        | → leaderboard data                                                |

## Notes on scale & mobile

- Each poll answer is submitted immediately (not batched), keeping request
  payloads small — important when ~150-200 teams may be submitting around
  the same time.
- Progress is saved to `localStorage` per team so a dropped connection or
  accidental refresh on a phone doesn't lose answers already given.
- `index.html` sets a mobile-correct viewport; layout uses plain block-level
  elements with no fixed widths, so it works on small screens by default.
- No visual styling/theming has been added, per requirements — this is a
  functional baseline only.
