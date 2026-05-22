const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { generateRoomCode } = require('./utils');
const roomManager = require('./roomManager');
const gameLogic = require('./gameLogic');
const quizManager = require('./quizManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// =====================
// REST API ROUTES
// =====================

// Get all quizzes (for host to select)
app.get('/api/quizzes', (req, res) => {
  const quizzes = quizManager.loadQuizzes();
  // Return only id + title for listing
  res.json(quizzes.map(q => ({ id: q.id, title: q.title, questionCount: q.questions.length })));
});

// Create new quiz
app.post('/api/quizzes', (req, res) => {
  const { title, questions } = req.body;
  if (!title || !questions || !questions.length) {
    return res.status(400).json({ error: 'Title and questions required' });
  }
  const quiz = quizManager.createQuiz(title, questions);
  res.json({ success: true, quiz });
});

// Delete quiz
app.delete('/api/quizzes/:id', (req, res) => {
  const deleted = quizManager.deleteQuiz(req.params.id);
  res.json({ success: deleted });
});

// =====================
// SOCKET.IO EVENTS
// =====================

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ----- HOST: Create Room -----
  socket.on('create-room', ({ quizId }) => {
    const quiz = quizManager.getQuizById(quizId);
    if (!quiz) {
      socket.emit('error', { message: 'Quiz not found' });
      return;
    }

    // Generate unique room code
    let code;
    do { code = generateRoomCode(); } while (roomManager.getRoom(code));

    const room = roomManager.createRoom(code, socket.id);
    room.quizId = quizId;
    room.quiz = quiz;

    socket.join(code); // join Socket.IO room
    socket.emit('room-created', { code, quiz: { id: quiz.id, title: quiz.title, questionCount: quiz.questions.length } });
    console.log(`[Room] Created: ${code} by host ${socket.id}`);
  });

  // ----- PLAYER: Join Room -----
  socket.on('join-room', ({ code, playerName }) => {
    const room = roomManager.getRoom(code);

    if (!room) {
      socket.emit('join-error', { message: 'Room not found. Check your room code.' });
      return;
    }
    if (room.state !== 'lobby') {
      socket.emit('join-error', { message: 'Game already in progress.' });
      return;
    }

    const player = roomManager.addPlayer(code, socket.id, playerName);
    if (!player) {
      socket.emit('join-error', { message: 'Name already taken. Choose another name.' });
      return;
    }

    socket.join(code);
    socket.emit('room-joined', {
      code,
      playerName,
      quizTitle: room.quiz.title
    });

    // Notify everyone (host + players) of updated player list
    const players = roomManager.getPlayerList(code);
    io.to(code).emit('player-list-updated', {
      players: players.map(p => ({ name: p.name, score: p.score })),
      count: players.length
    });

    console.log(`[Room] ${playerName} joined ${code}`);
  });

  // ----- HOST: Start Game -----
  socket.on('start-game', () => {
    const room = roomManager.findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;

    const started = gameLogic.startGame(room);
    if (!started) {
      socket.emit('error', { message: 'Cannot start: no players or no quiz selected.' });
      return;
    }

    io.to(room.code).emit('game-started', { totalQuestions: room.quiz.questions.length });
    console.log(`[Game] Started in room ${room.code}`);

    // Automatically send the first question
    sendNextQuestion(room);
  });

  // ----- HOST: Next Question -----
  socket.on('next-question', () => {
    const room = roomManager.findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    sendNextQuestion(room);
  });

  // ----- PLAYER: Submit Answer -----
  socket.on('submit-answer', ({ answerIndex }) => {
    const room = roomManager.findRoomBySocket(socket.id);
    if (!room) return;

    const result = gameLogic.submitAnswer(room, socket.id, answerIndex);
    if (!result) return; // invalid / duplicate

    // Send result only to the answering player
    socket.emit('answer-result', result);

    // If all players answered, reveal answer + send leaderboard early
    if (gameLogic.allPlayersAnswered(room)) {
      revealAndLeaderboard(room);
    }
  });

  // ----- HOST: End Game -----
  socket.on('end-game', () => {
    const room = roomManager.findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    endGame(room);
  });

  // ----- Disconnect handling -----
  socket.on('disconnect', () => {
    const room = roomManager.findRoomBySocket(socket.id);
    if (!room) return;

    if (room.hostId === socket.id) {
      // Host left — end the game
      io.to(room.code).emit('host-left', { message: 'Host disconnected. Game ended.' });
      if (room.questionTimer) clearInterval(room.questionTimer);
      roomManager.deleteRoom(room.code);
      console.log(`[Room] Deleted ${room.code} (host left)`);
    } else {
      // Player left
      const player = room.players.get(socket.id);
      roomManager.removePlayer(room.code, socket.id);

      const players = roomManager.getPlayerList(room.code);
      io.to(room.code).emit('player-list-updated', {
        players: players.map(p => ({ name: p.name, score: p.score })),
        count: players.length
      });

      if (player) console.log(`[Room] ${player.name} left ${room.code}`);
    }
  });
});

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Send next question to room, start countdown timer
 */
function sendNextQuestion(room) {
  // Clear previous timer if any
  if (room.questionTimer) {
    clearInterval(room.questionTimer);
    room.questionTimer = null;
  }

  const questionData = gameLogic.nextQuestion(room);

  if (!questionData) {
    // No more questions — end the game
    endGame(room);
    return;
  }

  io.to(room.code).emit('question-started', questionData);

  let timeLeft = questionData.timeLimit;

  // Countdown timer — broadcasts every second
  room.questionTimer = setInterval(() => {
    timeLeft--;
    io.to(room.code).emit('timer-update', { timeLeft });

    if (timeLeft <= 0) {
      clearInterval(room.questionTimer);
      room.questionTimer = null;
      revealAndLeaderboard(room);
    }
  }, 1000);
}

/**
 * Reveal correct answer + send leaderboard update
 */
function revealAndLeaderboard(room) {
  if (room.questionTimer) {
    clearInterval(room.questionTimer);
    room.questionTimer = null;
  }

  const question = room.quiz.questions[room.currentQuestionIndex];
  room.state = 'reviewing';

  // Reveal correct answer to all
  io.to(room.code).emit('answer-reveal', {
    correctAnswer: question.correctAnswer
  });

  // Send updated leaderboard
  const leaderboard = gameLogic.getLeaderboard(room);
  io.to(room.code).emit('leaderboard-updated', { leaderboard });
}

/**
 * End the game and send final results
 */
function endGame(room) {
  room.state = 'finished';
  const leaderboard = gameLogic.getLeaderboard(room);
  io.to(room.code).emit('game-finished', { leaderboard });
  console.log(`[Game] Finished in room ${room.code}`);
}

// =====================
// START SERVER
// =====================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 BDCAHOOT server running on port ${PORT}`);
});
