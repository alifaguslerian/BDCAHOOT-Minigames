// host.js — Host page: room creation, player tracking, game control

const setupScreen = document.getElementById('setupScreen');
const hostScreen = document.getElementById('hostScreen');
const quizSelect = document.getElementById('quizSelect');
const quizInfo = document.getElementById('quizInfo');
const quizQCount = document.getElementById('quizQCount');
const quizName = document.getElementById('quizName');
const startHostingBtn = document.getElementById('startHostingBtn');
const displayRoomCode = document.getElementById('displayRoomCode');
const startGameBtn = document.getElementById('startGameBtn');
const playerCountLabel = document.getElementById('playerCountLabel');
const playerListEl = document.getElementById('playerListEl');
const lobbyControls = document.getElementById('lobbyControls');
const gameControls = document.getElementById('gameControls');
const hostQuestionText = document.getElementById('hostQuestionText');
const hostQProgress = document.getElementById('hostQProgress');
const hostTimerDisplay = document.getElementById('hostTimerDisplay');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const endGameBtn = document.getElementById('endGameBtn');
const endHostBtn = document.getElementById('endHostBtn');
const answerRevealArea = document.getElementById('answerRevealArea');
const hostCorrectAnswer = document.getElementById('hostCorrectAnswer');
const hostAnswerStats = document.getElementById('hostAnswerStats');
const sidebarTitle = document.getElementById('sidebarTitle');
const sidebarCount = document.getElementById('sidebarCount');
const hostLeaderboardEl = document.getElementById('hostLeaderboardEl');

let currentQuiz = null;
let playerCount = 0;
let currentPlayers = [];

// ---- Load quizzes ----
async function loadQuizzes() {
  try {
    const res = await fetch('/api/quizzes');
    const quizzes = await res.json();

    quizSelect.innerHTML = quizzes.length
      ? '<option value="">— Select a quiz —</option>' + quizzes.map(q =>
        `<option value="${q.id}" data-count="${q.questionCount}" data-title="${q.title}">
            ${q.title} (${q.questionCount} questions)
          </option>`
      ).join('')
      : '<option value="">No quizzes found. Create one first.</option>';
  } catch (e) {
    quizSelect.innerHTML = '<option value="">Error loading quizzes</option>';
  }
}

loadQuizzes();

quizSelect.addEventListener('change', () => {
  const opt = quizSelect.options[quizSelect.selectedIndex];
  if (!quizSelect.value) { quizInfo.style.display = 'none'; return; }
  quizInfo.style.display = 'flex';
  quizQCount.textContent = opt.dataset.count + ' questions';
  quizName.textContent = opt.dataset.title;
  currentQuiz = { id: quizSelect.value, title: opt.dataset.title, count: +opt.dataset.count };
});

// ---- Start hosting ----
startHostingBtn.addEventListener('click', () => {
  if (!currentQuiz) { alert('Please select a quiz first.'); return; }
  window.socket.emit('create-room', { quizId: currentQuiz.id });
  startHostingBtn.disabled = true;
  startHostingBtn.textContent = 'Creating room...';
});

window.socket.on('room-created', (data) => {
  displayRoomCode.textContent = data.code;
  setupScreen.style.display = 'none';
  hostScreen.style.display = 'block';
  sessionStorage.setItem('hostRoomCode', data.code);
});

// ---- Player list updates ----
window.socket.on('player-list-updated', (data) => {
  playerCount = data.count;
  currentPlayers = data.players;
  playerCountLabel.textContent = data.count;
  sidebarCount.textContent = data.count;

  startGameBtn.disabled = data.count === 0;

  // Render player list
  playerListEl.innerHTML = data.players.map(p => `
  <div class="player-item animate-in">
    <div class="player-avatar" style="background:${p.avatarBg || '#1A2A6C'};font-size:16px;">
      ${p.avatar || p.name.substring(0, 2).toUpperCase()}
    </div>
    <span style="font-weight:600;font-size:14px;">${p.name}</span>
  </div>
`).join('');

  // ---- Start game ----
  startGameBtn.addEventListener('click', () => {
    window.socket.emit('start-game');
    startGameBtn.disabled = true;
  });

  window.socket.on('game-started', () => {
    lobbyControls.style.display = 'none';
    gameControls.style.display = 'block';
    sidebarTitle.textContent = 'Live Ranks';

    // Switch sidebar to leaderboard
    playerListEl.style.display = 'none';
    hostLeaderboardEl.style.display = 'flex';
    hostLeaderboardEl.style.flexDirection = 'flex';
  });

  // ---- Question started ----
  window.socket.on('question-started', (data) => {
    answerRevealArea.style.display = 'none';
    nextQuestionBtn.disabled = true;

    hostQuestionText.textContent = data.question;
    hostQProgress.textContent = `Q${data.questionIndex + 1} / ${data.totalQuestions}`;
    hostTimerDisplay.textContent = `${data.timeLimit}s`;

    // Re-enable next button after question ends (via timer-update or answer-reveal)
  });

  // ---- Timer update ----
  window.socket.on('timer-update', (data) => {
    hostTimerDisplay.textContent = `${data.timeLeft}s remaining`;
    if (data.timeLeft <= 5) {
      hostTimerDisplay.style.color = '#FF5252';
    } else {
      hostTimerDisplay.style.color = 'var(--text-secondary)';
    }
  });

  // Timer habis — tampilkan hasil + leaderboard
  window.socket.on('answer-result', (data) => {
    // Update feedback overlay dengan hasil
    feedbackOverlay.classList.remove('show');

    setTimeout(() => {
      if (data.correct) {
        feedbackIcon.textContent = '✅';
        feedbackLabel.textContent = 'Correct!';
        feedbackLabel.style.color = 'var(--green)';
        feedbackPts.textContent = `+${data.score.toLocaleString()} pts`;
        SFX.playCorrect();
      } else {
        feedbackIcon.textContent = '❌';
        feedbackLabel.textContent = 'Wrong!';
        feedbackLabel.style.color = '#FF5252';
        feedbackPts.textContent = '0 pts';
        SFX.playWrong();
      }

      yourRankScore.textContent = data.totalScore.toLocaleString() + ' pts';
      feedbackOverlay.classList.add('show');

      // Auto hide setelah 2 detik
      setTimeout(() => feedbackOverlay.classList.remove('show'), 2000);
    }, 300);
  });

  // Round end — update leaderboard + distribusi jawaban
  window.socket.on('round-end', (data) => {
    // Update answer buttons dengan distribusi
    const btns = answersGrid.querySelectorAll('.answer-btn');
    btns.forEach((btn, i) => {
      btn.disabled = true;
      const count = data.distribution[i] || 0;
      const pct = Math.round((count / data.totalPlayers) * 100);

      if (i === data.correctAnswer) {
        btn.classList.add('correct');
        btn.style.opacity = '1';
      } else {
        btn.classList.add('wrong');
        btn.style.opacity = '0.5';
      }

      // Tambah bar distribusi
      const textEl = btn.querySelector('.answer-text');
      const iconEl = btn.querySelector('.answer-icon');
      if (textEl && iconEl) {
        btn.innerHTML = `
        <div class="answer-icon">${iconEl.innerHTML}</div>
        <span class="answer-text">${textEl.textContent}</span>
        <div class="answer-dist">
          <div class="answer-dist-bar" style="width:${pct}%"></div>
          <span class="answer-dist-label">${count}</span>
        </div>
      `;
      }
    });

    // Update leaderboard sidebar
    renderLeaderboard(data.leaderboard);
  });

  // Leaderboard di host — ganti renderHostLeaderboard:
  function renderHostLeaderboard(leaderboard) {
    hostLeaderboardEl.innerHTML = leaderboard.slice(0, 10).map((p, i) => `
    <div class="lb-item ${i < 3 ? 'top-3' : ''}">
      <div class="lb-rank">${p.rank}</div>
      <div class="lb-avatar" style="background:${p.avatarBg || '#1A2A6C'};font-size:14px;">
        ${p.avatar || p.name.substring(0, 2).toUpperCase()}
      </div>
      <div class="lb-name">${p.name}</div>
      <div class="lb-score">${p.score.toLocaleString()}</div>
    </div>
  `).join('');
  }

  // ---- Next question ----
  nextQuestionBtn.addEventListener('click', () => {
    window.socket.emit('next-question');
    answerRevealArea.style.display = 'none';
    nextQuestionBtn.disabled = true;
  });

  // ---- End game ----
  endGameBtn.addEventListener('click', () => {
    if (confirm('End the game now?')) window.socket.emit('end-game');
  });

  endHostBtn.addEventListener('click', () => {
    if (confirm('Close this room?')) {
      window.socket.emit('end-game');
      window.location.href = '/';
    }
  });

  // ---- Game finished ----
  window.socket.on('game-finished', (data) => {
    sessionStorage.setItem('finalLeaderboard', JSON.stringify(data.leaderboard));
    sessionStorage.setItem('isHost', 'true');
    window.location.href = '/result.html';
  });
});
