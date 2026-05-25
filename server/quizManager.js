const { pool } = require('./db');
const { generateQuizId } = require('./utils');

async function loadQuizzes() {
  const res = await pool.query('SELECT id, title, questions, created_at FROM quizzes ORDER BY created_at DESC');
  return res.rows.map(r => ({
    id: r.id,
    title: r.title,
    questions: r.questions,
    createdAt: r.created_at
  }));
}

async function getQuizById(id) {
  const res = await pool.query('SELECT * FROM quizzes WHERE id = $1', [id]);
  if (!res.rows.length) return null;
  const r = res.rows[0];
  return { id: r.id, title: r.title, questions: r.questions };
}

async function createQuiz(title, questions) {
  const id = generateQuizId();
  await pool.query(
    'INSERT INTO quizzes (id, title, questions) VALUES ($1, $2, $3)',
    [id, title, JSON.stringify(questions)]
  );
  return { id, title, questions };
}

async function updateQuiz(id, title, questions) {
  const res = await pool.query(
    'UPDATE quizzes SET title = $1, questions = $2 WHERE id = $3 RETURNING id',
    [title, JSON.stringify(questions), id]
  );
  return res.rows.length > 0;
}

async function deleteQuiz(id) {
  const res = await pool.query('DELETE FROM quizzes WHERE id = $1 RETURNING id', [id]);
  return res.rows.length > 0;
}

module.exports = { loadQuizzes, getQuizById, createQuiz, updateQuiz, deleteQuiz };