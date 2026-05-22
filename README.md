# BDCAHOOT 🎮

Realtime multiplayer quiz platform for student communities and events.

## Stack
- **Frontend**: HTML, CSS, Vanilla JS
- **Backend**: Node.js + Express + Socket.IO
- **Storage**: JSON file (`data/quizzes.json`)
- **Deploy**: Railway

## Setup

```bash
npm install
npm run dev    # development (nodemon)
npm start      # production
```

## Project Structure

```
quiz-game/
├── public/
│   ├── index.html         ← Landing page
│   ├── host.html          ← Host dashboard
│   ├── player.html        ← Player game view
│   ├── create-quiz.html   ← Quiz builder
│   ├── result.html        ← Final podium
│   ├── css/style.css
│   └── js/
│       ├── socket.js      ← Shared socket instance
│       ├── app.js         ← Landing page / join modal
│       ├── host.js        ← Host logic
│       ├── player.js      ← Player logic
│       ├── createQuiz.js  ← Quiz builder
│       └── result.js      ← Final results renderer
├── server/
│   ├── server.js          ← Express + Socket.IO entrypoint
│   ├── roomManager.js     ← In-memory room store
│   ├── gameLogic.js       ← Question flow, scoring, leaderboard
│   ├── quizManager.js     ← JSON file read/write
│   └── utils.js           ← Helpers (room codes, scoring formula)
└── data/quizzes.json      ← Quiz storage
```

## Gameplay Flow

1. **Host** opens `/host.html`, selects a quiz → creates a room
2. **Players** open the landing page, click Join → enter room code + name
3. Host clicks **Start Game**
4. Questions broadcast in realtime with countdown timer
5. Players answer — faster = more points (max ~1800 pts/question)
6. Leaderboard updates after each question
7. After last question → final podium at `/result.html`

## Scoring Formula

```
score = 1000 + (timeRemaining * 50)
```

Example: answer with 16s remaining on a 20s question → 1000 + 800 = 1800 pts

## Socket Events

| Client → Server | Server → Client |
|---|---|
| join-room | room-created |
| create-room | room-joined |
| start-game | player-list-updated |
| submit-answer | game-started |
| next-question | question-started |
| end-game | timer-update |
| | answer-result |
| | answer-reveal |
| | leaderboard-updated |
| | game-finished |

## Deploy to Railway

1. Push to GitHub
2. Connect repo on railway.app
3. Set start command: `node server/server.js`
4. Deploy — Railway auto-detects `PORT` env variable
