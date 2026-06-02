// quizPreview.js — Quiz preview + inline edit before starting game

const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('id');

if (!quizId) window.location.href = '/host.html';

let quiz = null;
let editingIndex = -1;

const previewTitle = document.getElementById('previewTitle');
const previewMeta = document.getElementById('previewMeta');
const footerMeta = document.getElementById('footerMeta');
const questionList = document.getElementById('questionList');
const editModal = document.getElementById('editModal');

// ---- Load quiz ----
async function loadQuiz() {
    try {
        const res = await fetch(`/api/quizzes/${quizId}`);
        quiz = await res.json();
        renderAll();
    } catch (e) {
        previewTitle.textContent = 'Failed to load quiz';
    }
}

function renderAll() {
    previewTitle.textContent = quiz.title;
    previewMeta.textContent = `${quiz.questions.length} questions · avg ${avgTime()}s per question`;
    footerMeta.textContent = `${quiz.questions.length} questions ready`;
    renderQuestions();
}

function avgTime() {
    if (!quiz.questions.length) return 0;
    const total = quiz.questions.reduce((sum, q) => sum + q.timeLimit, 0);
    return Math.round(total / quiz.questions.length);
}

function renderQuestions() {
    questionList.innerHTML = quiz.questions.map((q, i) => `
    <div class="qp-card" id="qcard-${i}">
      <div class="qp-card-top">
        <div class="qp-card-num">Q${i + 1}</div>
        <div class="qp-card-q">${escHtml(q.question)}</div>
        <div class="qp-card-btns">
          <button class="qp-icon-btn" onclick="openEdit(${i})" title="Edit">✏️</button>
          <button class="qp-icon-btn del" onclick="deleteQuestion(${i})" title="Delete">🗑</button>
        </div>
      </div>
      <div class="qp-opts">
        ${q.options.map((opt, oi) => `
          <div class="qp-opt ${oi === q.correctAnswer ? 'correct' : ''}">
            <div class="qp-opt-dot"></div>
            <span>${escHtml(opt)}</span>
          </div>
        `).join('')}
      </div>
      <div class="qp-timer">⏱ ${q.timeLimit}s</div>
    </div>
  `).join('');
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---- Delete question ----
async function deleteQuestion(index) {
    if (quiz.questions.length <= 1) {
        alert('Quiz must have at least 1 question.');
        return;
    }
    if (!confirm(`Delete question ${index + 1}?`)) return;

    quiz.questions.splice(index, 1);
    await saveQuiz();
    renderAll();
}

// ---- Edit question modal ----
function openEdit(index) {
    editingIndex = index;
    const q = quiz.questions[index];

    document.getElementById('editQuestionText').value = q.question;
    document.getElementById('editOpt0').value = q.options[0] || '';
    document.getElementById('editOpt1').value = q.options[1] || '';
    document.getElementById('editOpt2').value = q.options[2] || '';
    document.getElementById('editOpt3').value = q.options[3] || '';
    document.getElementById('editTimer').value = q.timeLimit;
    document.querySelector(`input[name="editCorrect"][value="${q.correctAnswer}"]`).checked = true;

    editModal.classList.add('active');
}

function closeEdit() {
    editModal.classList.remove('active');
    editingIndex = -1;
}

document.getElementById('closeEditModal').addEventListener('click', closeEdit);
document.getElementById('cancelEditBtn').addEventListener('click', closeEdit);
editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEdit(); });

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const qText = document.getElementById('editQuestionText').value.trim();
    const opts = [
        document.getElementById('editOpt0').value.trim(),
        document.getElementById('editOpt1').value.trim(),
        document.getElementById('editOpt2').value.trim(),
        document.getElementById('editOpt3').value.trim(),
    ];
    const correctRadio = document.querySelector('input[name="editCorrect"]:checked');
    const timeLimit = parseInt(document.getElementById('editTimer').value);

    if (!qText || opts.some(o => !o) || !correctRadio) {
        alert('Please fill all fields and select the correct answer.');
        return;
    }

    quiz.questions[editingIndex] = {
        question: qText,
        options: opts,
        correctAnswer: parseInt(correctRadio.value),
        timeLimit
    };

    await saveQuiz();
    closeEdit();
    renderAll();
});

// ---- Add question ----
function goAddQuestion() {
    // Simpan quiz ID ke sessionStorage biar create-quiz.html tau mau append ke mana
    sessionStorage.setItem('addToQuizId', quizId);
    window.location.href = `/create-quiz.html?edit=${quizId}`;
}

document.getElementById('addQuestionBtn').addEventListener('click', goAddQuestion);
document.getElementById('addRowBtn').addEventListener('click', goAddQuestion);

// ---- Save quiz ke server ----
async function saveQuiz() {
    await fetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quiz.title, questions: quiz.questions })
    });
}

// ---- Start game ----
function startGame() {
    if (quiz.questions.length === 0) {
        alert('Add at least 1 question before starting.');
        return;
    }
    // Redirect ke host dengan quizId siap
    sessionStorage.setItem('selectedQuizId', quizId);
    sessionStorage.setItem('selectedQuizTitle', quiz.title);
    window.location.href = '/host.html?start=' + quizId;
}

document.getElementById('startGameBtn').addEventListener('click', startGame);
document.getElementById('startGameBtn2').addEventListener('click', startGame);

loadQuiz();