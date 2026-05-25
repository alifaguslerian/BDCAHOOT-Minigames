const { getPool } = require('./db');
const { generateQuizId } = require('./utils');
const fs   = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '../data/quizzes.json');
const useDB = () => !!process.env.DATABASE_URL;

// ---- JSON fallback helpers ----
function readJSON() {
  try { return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')); }
  catch { return []; }
}
function writeJSON(data) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
}

// ---- Functions ----
async function loadQuizzes() {
  if (!useDB()) return readJSON();
  const res = await getPool().query('SELECT id, title, questions, created_at FROM quizzes ORDER BY created_at DESC');
  return res.rows.map(r => ({ id: r.id, title: r.title, questions: r.questions, createdAt: r.created_at }));
}

async function getQuizById(id) {
  if (!useDB()) {
    return readJSON().find(q => q.id === id) || null;
  }
  const res = await getPool().query('SELECT * FROM quizzes WHERE id = $1', [id]);
  if (!res.rows.length) return null;
  const r = res.rows[0];
  return { id: r.id, title: r.title, questions: r.questions };
}

async function createQuiz(title, questions) {
  const id = generateQuizId();
  if (!useDB()) {
    const quizzes = readJSON();
    const newQuiz = { id, title, questions, createdAt: new Date().toISOString() };
    quizzes.push(newQuiz);
    writeJSON(quizzes);
    return newQuiz;
  }
  await getPool().query(
    'INSERT INTO quizzes (id, title, questions) VALUES ($1, $2, $3)',
    [id, title, JSON.stringify(questions)]
  );
  return { id, title, questions };
}

async function updateQuiz(id, title, questions) {
  if (!useDB()) {
    const quizzes = readJSON();
    const idx = quizzes.findIndex(q => q.id === id);
    if (idx === -1) return false;
    quizzes[idx] = { ...quizzes[idx], title, questions };
    writeJSON(quizzes);
    return true;
  }
  const res = await getPool().query(
    'UPDATE quizzes SET title = $1, questions = $2 WHERE id = $3 RETURNING id',
    [title, JSON.stringify(questions), id]
  );
  return res.rows.length > 0;
}

async function deleteQuiz(id) {
  if (!useDB()) {
    const quizzes = readJSON();
    const filtered = quizzes.filter(q => q.id !== id);
    if (filtered.length === quizzes.length) return false;
    writeJSON(filtered);
    return true;
  }
  const res = await getPool().query('DELETE FROM quizzes WHERE id = $1 RETURNING id', [id]);
  return res.rows.length > 0;
}

module.exports = { loadQuizzes, getQuizById, createQuiz, updateQuiz, deleteQuiz };