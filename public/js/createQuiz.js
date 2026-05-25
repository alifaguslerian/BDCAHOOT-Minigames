// createQuiz.js — Dynamic quiz builder

// Cek apakah mode edit
const urlParams = new URLSearchParams(window.location.search);
const editId    = urlParams.get('edit');

// Load quiz kalau edit mode
if (editId) {
  document.querySelector('.create-header h1').textContent = 'Edit Quiz';
  document.querySelector('.create-header p').textContent  = 'Update your quiz questions and save';
  saveQuizBtn.textContent = 'Save Changes ✓';

  fetch(`/api/quizzes/${editId}`)
    .then(r => r.json())
    .then(quiz => {
      quizTitleInput.value = quiz.title;
      // Clear default blank question
      questionsContainer.innerHTML = '';
      questionCount = 0;
      quiz.questions.forEach(q => addQuestion(q));
    });
}

const questionsContainer = document.getElementById('questionsContainer');
const addQuestionBtn     = document.getElementById('addQuestionBtn');
const saveQuizBtn        = document.getElementById('saveQuizBtn');
const quizTitleInput     = document.getElementById('quizTitle');
const saveError          = document.getElementById('saveError');
const saveSuccess        = document.getElementById('saveSuccess');

let questionCount = 0;

// ---- Add a blank question card ----
function addQuestion(prefill = null) {
  questionCount++;
  const idx = questionCount;

  const q = prefill || {
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    timeLimit: 20
  };

  const card = document.createElement('div');
  card.className = 'question-card';
  card.id = `qcard-${idx}`;
  card.dataset.index = idx;

  card.innerHTML = `
    <div class="question-card-header">
      <span class="question-number">Question ${idx}</span>
      <button class="btn btn-ghost btn-sm" onclick="removeQuestion(${idx})" style="color:#FF5252;border-color:rgba(255,82,82,0.2);">
        Remove
      </button>
    </div>

    <div class="form-group">
      <label>Question Text</label>
      <input type="text" class="form-control q-text" placeholder="Enter your question..." value="${escHtml(q.question)}" maxlength="300" />
    </div>

    <div class="form-group">
      <label>Answer Options (select correct one)</label>
      <div class="options-grid">
        ${q.options.map((opt, i) => `
          <div class="option-item">
            <input type="radio" class="option-radio" name="correct-${idx}" value="${i}" ${q.correctAnswer === i ? 'checked' : ''} />
            <input type="text" class="form-control q-option" placeholder="Option ${i + 1}" value="${escHtml(opt)}" maxlength="150" />
          </div>
        `).join('')}
      </div>
    </div>

    <div class="form-group" style="max-width:200px;">
      <label>Time Limit (seconds)</label>
      <select class="form-control q-timer">
        ${[10, 15, 20, 30, 45, 60].map(t =>
          `<option value="${t}" ${q.timeLimit === t ? 'selected' : ''}>${t}s</option>`
        ).join('')}
      </select>
    </div>
  `;

  questionsContainer.appendChild(card);
}

function removeQuestion(idx) {
  const card = document.getElementById(`qcard-${idx}`);
  if (card) card.remove();
  renumberQuestions();
}

function renumberQuestions() {
  const cards = questionsContainer.querySelectorAll('.question-card');
  cards.forEach((card, i) => {
    const label = card.querySelector('.question-number');
    if (label) label.textContent = `Question ${i + 1}`;
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Collect form data ----
function collectQuizData() {
  const title = quizTitleInput.value.trim();
  const cards  = questionsContainer.querySelectorAll('.question-card');

  const questions = [];
  let valid = true;
  let errors = [];

  if (!title) { errors.push('Please enter a quiz title.'); valid = false; }

  if (cards.length === 0) { errors.push('Add at least one question.'); valid = false; }

  cards.forEach((card, i) => {
    const qText   = card.querySelector('.q-text').value.trim();
    const options = Array.from(card.querySelectorAll('.q-option')).map(o => o.value.trim());
    const correctRadio = card.querySelector(`.option-radio:checked`);
    const timeLimit = parseInt(card.querySelector('.q-timer').value);

    if (!qText) { errors.push(`Question ${i+1}: question text is empty.`); valid = false; }
    if (options.some(o => !o)) { errors.push(`Question ${i+1}: all 4 options must be filled.`); valid = false; }
    if (!correctRadio) { errors.push(`Question ${i+1}: select the correct answer.`); valid = false; }

    questions.push({
      question: qText,
      options,
      correctAnswer: correctRadio ? parseInt(correctRadio.value) : 0,
      timeLimit
    });
  });

  return { valid, title, questions, errors };
}

// ---- Save quiz ----
saveQuizBtn.addEventListener('click', async () => {
  saveError.classList.remove('show');
  saveSuccess.style.display = 'none';

  const { valid, title, questions, errors } = collectQuizData();
  if (!valid) {
    saveError.textContent = errors[0];
    saveError.classList.add('show');
    return;
  }

  saveQuizBtn.disabled = true;
  saveQuizBtn.textContent = 'Saving...';

  try {
    const url    = editId ? `/api/quizzes/${editId}` : '/api/quizzes';
    const method = editId ? 'PUT' : 'POST';

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, questions })
    });
    const data = await res.json();

    if (data.success || data.quiz) {
      saveSuccess.style.display = 'block';
      saveSuccess.textContent   = editId ? '✓ Quiz updated! Redirecting...' : '✓ Quiz saved! Redirecting...';
      setTimeout(() => window.location.href = '/manage-quiz.html', 1500);
    } else {
      throw new Error('Save failed');
    }
  } catch (e) {
    saveError.textContent = 'Failed to save. Check your connection.';
    saveError.classList.add('show');
    saveQuizBtn.disabled = false;
    saveQuizBtn.textContent = editId ? 'Save Changes ✓' : 'Save Quiz ✓';
  }
});

addQuestionBtn.addEventListener('click', () => addQuestion());

// Start with 1 blank question
addQuestion();
