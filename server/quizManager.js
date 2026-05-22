const fs = require('fs');
const path = require('path');
const { generateQuizId } = require('./utils');

const QUIZZES_PATH = path.join(__dirname, '../data/quizzes.json');

/**
 * Load all quizzes from JSON file
 */
function loadQuizzes() {
  try {
    const raw = fs.readFileSync(QUIZZES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[QuizManager] Error loading quizzes:', err.message);
    return [];
  }
}

/**
 * Save quizzes array back to JSON file
 */
function saveQuizzes(quizzes) {
  try {
    fs.writeFileSync(QUIZZES_PATH, JSON.stringify(quizzes, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[QuizManager] Error saving quizzes:', err.message);
    return false;
  }
}

/**
 * Get a specific quiz by ID
 */
function getQuizById(id) {
  const quizzes = loadQuizzes();
  return quizzes.find(q => q.id === id) || null;
}

/**
 * Create a new quiz and persist it
 */
function createQuiz(title, questions) {
  const quizzes = loadQuizzes();
  const newQuiz = {
    id: generateQuizId(),
    title,
    questions,
    createdAt: new Date().toISOString()
  };
  quizzes.push(newQuiz);
  saveQuizzes(quizzes);
  return newQuiz;
}

/**
 * Delete a quiz by ID
 */
function deleteQuiz(id) {
  const quizzes = loadQuizzes();
  const filtered = quizzes.filter(q => q.id !== id);
  if (filtered.length === quizzes.length) return false; // not found
  saveQuizzes(filtered);
  return true;
}

module.exports = {
  loadQuizzes,
  getQuizById,
  createQuiz,
  deleteQuiz
};
