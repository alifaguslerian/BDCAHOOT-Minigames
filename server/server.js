const { initDB } = require('./db');
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

app.get('/api/quizzes', async (req, res) => {
  try {
    const quizzes = await quizManager.loadQuizzes();
    res.json(quizzes.map(q => ({
      id: q.id,
      title: q.title,
      questionCount: q.questions.length
    })));
  } catch (e) {
    res.status(500).json({ error: 'Failed to load quizzes' });
  }
});

app.post('/api/quizzes', async (req, res) => {
  const { title, questions } = req.body;
  if (!title || !questions || !questions.length) {
    return res.status(400).json({ error: 'Title and questions required' });
  }
  try {
    const quiz = await quizManager.createQuiz(title, questions);
    res.json({ success: true, quiz });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save quiz' });
  }
});

app.put('/api/quizzes/:id', async (req, res) => {
  const { title, questions } = req.body;
  try {
    const updated = await quizManager.updateQuiz(req.params.id, title, questions);
    res.json({ success: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

app.delete('/api/quizzes/:id', async (req, res) => {
  try {
    const deleted = await quizManager.deleteQuiz(req.params.id);
    res.json({ success: deleted });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const quiz = await quizManager.getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Not found' });
    res.json(quiz);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

// =====================
// SOCKET.IO EVENTS
// =====================

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ----- HOST: Create Room -----
  socket.on('create-room', async ({ quizId }) => {
    const quiz = await quizManager.getQuizById(quizId);
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
  socket.on('join-room', ({ code, playerName, avatar, avatarBg }) => {
    const room = roomManager.getRoom(code);

    if (!room) {
      socket.emit('join-error', { message: 'Room not found. Check your room code.' });
      return;
    }
    if (room.state !== 'lobby') {
      socket.emit('join-error', { message: 'Game already in progress.' });
      return;
    }

    const player = roomManager.addPlayer(code, socket.id, playerName, avatar, avatarBg);
    if (!player) {
      socket.emit('join-error', { message: 'Name already taken. Choose another name.' });
      return;
    }

    socket.join(code);
    socket.emit('room-joined', { code, playerName, quizTitle: room.quiz.title });

    const players = roomManager.getPlayerList(code);
    io.to(code).emit('player-list-updated', {
      players: players.map(p => ({
        name: p.name,
        avatar: p.avatar,
        avatarBg: p.avatarBg,
        score: p.score
      })),
      count: players.length
    });
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
    if (room.state !== 'reviewing') return; // guard: hanya bisa next kalau lagi di fase review
    sendNextQuestion(room);
  });
  // ----- PLAYER: Submit Answer -----
  socket.on('submit-answer', ({ answerIndex }) => {
    const room = roomManager.findRoomBySocket(socket.id);
    if (!room) return;

    const result = gameLogic.submitAnswer(room, socket.id, answerIndex);
    if (!result) return;

    // Hanya konfirmasi diterima, belum kasih tau bener/salah
    socket.emit('answer-received');
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
  room.state = 'reviewing'; // set SEKARANG, sebelum setTimeout apapun

  // Hitung distribusi
  const distribution = [0, 0, 0, 0];
  for (const [, player] of room.players) {
    if (player.lastAnswer !== undefined && player.lastAnswer !== null) {
      distribution[player.lastAnswer]++;
    }
  }

  const leaderboard = gameLogic.getLeaderboard(room);

  // Kirim answer-result ke tiap player pakai io.to(socketId)
  for (const [socketId, player] of room.players) {
    const result = player.pendingResult || {
      correct: false,
      correctAnswer: question.correctAnswer,
      score: 0,
      totalScore: player.score
    };
    io.to(socketId).emit('answer-result', result);
    player.pendingResult = null;
    player.lastAnswer = null;
  }

  // Kirim round-end setelah 2.5 detik — state sudah 'reviewing' dari atas
  setTimeout(() => {
    io.to(room.code).emit('round-end', {
      correctAnswer: question.correctAnswer,
      distribution,
      totalPlayers: room.players.size,
      leaderboard
    });
  }, 2);
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
initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🎮 BDCAHOOT server running on port ${PORT}`);
    console.log(`👉 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('[DB] Failed to init:', err);
  process.exit(1);
});
