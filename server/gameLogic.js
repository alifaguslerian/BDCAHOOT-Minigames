const { calculateScore, rankPlayers } = require('./utils');
const roomManager = require('./roomManager');

/**
 * Start the game for a room
 * Returns false if room is not ready
 */
function startGame(room) {
  if (!room.quiz || room.players.size === 0) return false;
  room.state = 'playing';
  room.currentQuestionIndex = -1;
  return true;
}

/**
 * Advance to next question
 * Returns the question data to broadcast, or null if game is over
 */
function nextQuestion(room) {
  room.currentQuestionIndex++;
  const quiz = room.quiz;

  if (room.currentQuestionIndex >= quiz.questions.length) {
    return null; // no more questions
  }

  const question = quiz.questions[room.currentQuestionIndex];

  // Reset per-round state
  room.answeredThisRound = new Set();
  room.state = 'question';
  room.questionStartTime = Date.now();

  // Reset all players' answered flag
  for (const [, player] of room.players) {
    player.answered = false;
  }

  return {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: quiz.questions.length,
    question: question.question,
    options: question.options,
    timeLimit: question.timeLimit
  };
}

/**
 * Process a player's answer
 * Returns { correct, score, totalScore } or null if invalid
 */
function submitAnswer(room, socketId, answerIndex) {
  if (room.state !== 'question') return null;
  if (room.answeredThisRound.has(socketId)) return null;

  const player = room.players.get(socketId);
  if (!player) return null;

  const question = room.quiz.questions[room.currentQuestionIndex];
  const isCorrect = answerIndex === question.correctAnswer;

  room.answeredThisRound.add(socketId);
  player.answered   = true;
  player.lastAnswer = answerIndex;

  let earned = 0;
  if (isCorrect) {
    const elapsed       = (Date.now() - room.questionStartTime) / 1000;
    const timeRemaining = Math.max(0, question.timeLimit - elapsed);
    earned = calculateScore(question.timeLimit, timeRemaining);
    player.score += earned;
  }

  // Simpan, kirim nanti pas timer habis
  player.pendingResult = {
    correct: isCorrect,
    correctAnswer: question.correctAnswer,
    score: earned,
    totalScore: player.score
  };

  return player.pendingResult;
}

/**
 * Build current leaderboard snapshot (sorted, ranked)
 */
function getLeaderboard(room) {
  const players = Array.from(room.players.values());
  return rankPlayers(players);
}

/**
 * Check if all players have answered (for auto-advance)
 */
function allPlayersAnswered(room) {
  if (room.players.size === 0) return false;
  return room.answeredThisRound.size >= room.players.size;
}

module.exports = {
  startGame,
  nextQuestion,
  submitAnswer,
  getLeaderboard,
  allPlayersAnswered
};
