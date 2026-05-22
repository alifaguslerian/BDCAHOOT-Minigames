// Utility functions for BDCAHOOT server

/**
 * Generate a random 6-character room code (uppercase letters + numbers)
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars like O,0,I,1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a unique quiz ID
 */
function generateQuizId() {
  return 'quiz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

/**
 * Calculate score based on time remaining
 * Faster answers = higher score
 */
function calculateScore(timeLimit, timeRemaining) {
  const BASE_SCORE = 1000;
  const SPEED_MULTIPLIER = 50;
  const speedBonus = Math.floor(timeRemaining * SPEED_MULTIPLIER);
  return BASE_SCORE + speedBonus;
}

/**
 * Sort players by score descending and assign ranks
 */
function rankPlayers(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((player, index) => ({
    ...player,
    rank: index + 1
  }));
}

module.exports = {
  generateRoomCode,
  generateQuizId,
  calculateScore,
  rankPlayers
};
