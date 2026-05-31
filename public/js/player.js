// player.js — Player game logic

const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
const playerNameDisplay = document.getElementById('playerNameDisplay');
const quizTitleDisplay = document.getElementById('quizTitleDisplay');
const qProgressDisplay = document.getElementById('qProgressDisplay');
const playerCountDisplay = document.getElementById('playerCountDisplay');
const questionText = document.getElementById('questionText');
const answersGrid = document.getElementById('answersGrid');
const timerNumber = document.getElementById('timerNumber');
const timerProgress = document.getElementById('timerProgress');
const leaderboardList = document.getElementById('leaderboardList');
const yourRankNum = document.getElementById('yourRankNum');
const yourRankName = document.getElementById('yourRankName');
const yourRankScore = document.getElementById('yourRankScore');
const feedbackOverlay = document.getElementById('feedbackOverlay');
const feedbackIcon = document.getElementById('feedbackIcon');
const feedbackLabel = document.getElementById('feedbackLabel');
const feedbackPts = document.getElementById('feedbackPts');

const playerName = sessionStorage.getItem('playerName') || 'Player';
const roomCode = sessionStorage.getItem('roomCode') || '';
const quizTitle = sessionStorage.getItem('quizTitle') || 'Quiz';

// Guard: if no room code stored, redirect to home
if (!roomCode) window.location.href = '/';

// Set lobby info
lobbyCodeDisplay.textContent = roomCode;
playerNameDisplay.textContent = playerName;
quizTitleDisplay.textContent = quizTitle;
yourRankName.textContent = playerName;

let currentTimeLimit = 20;
let hasAnswered = false;

// ---- Re-join if socket reconnects ----
window.socket.on('connect', () => {
  const code = sessionStorage.getItem('roomCode');
  const name = sessionStorage.getItem('playerName');
  const avatar = sessionStorage.getItem('playerAvatar');
  const avatarBg = sessionStorage.getItem('playerAvatarBg');

  if (code && name) {
    window.socket.emit('join-room', { code, playerName: name, avatar, avatarBg });
  }
});

window.socket.on('room-joined', (data) => {
  sessionStorage.setItem('quizTitle', data.quizTitle);
  if (!data.isReconnect) {
    // Join baru — tetap di lobby
  }
  // Kalau reconnect, game-started akan dikirim server dan handle otomatis
});

// ---- Player list updates (lobby) ----
window.socket.on('player-list-updated', (data) => {
  playerCountDisplay.textContent = data.count + ' Players';
});

// ---- Game started ----
window.socket.on('game-started', () => {
  lobbyScreen.style.display = 'none';
  gameScreen.style.display = 'grid';

  // Kalau gameScreen sudah visible (reconnect), skip countdown
  if (gameScreen.dataset.started) return;
  gameScreen.dataset.started = 'true';
  startCountdown();
});

// ---- New question ----
window.socket.on('question-started', (data) => {
  hasAnswered = false;
  currentTimeLimit = data.timeLimit;

  questionText.textContent = data.question;
  qProgressDisplay.textContent = `Q${data.questionIndex + 1} / ${data.totalQuestions}`;

  // Reset timer ring
  const circumference = 263;
  timerProgress.style.strokeDashoffset = '0';
  timerProgress.classList.remove('urgent', 'critical');
  timerNumber.textContent = data.timeLimit;

  // Set answer text
  const btns = answersGrid.querySelectorAll('.answer-btn');
  btns.forEach((btn, i) => {
    btn.querySelector('.answer-text').textContent = data.options[i] || '—';
    btn.disabled = false;
    btn.classList.remove('correct', 'wrong', 'selected');
    btn.style.opacity = '1';
  });

  // Hide feedback
  feedbackOverlay.classList.remove('show');
});

// ---- Timer update ----
window.socket.on('timer-update', (data) => {
  const timeLeft = data.timeLeft;
  timerNumber.textContent = timeLeft;

  // Animate progress ring
  const circumference = 263;
  const progress = timeLeft / currentTimeLimit;
  const offset = circumference * (1 - progress);
  timerProgress.style.strokeDashoffset = offset;

  // Color feedback
  if (timeLeft <= 5) {
    timerProgress.classList.add('critical');
    timerProgress.classList.remove('urgent');
  } else if (timeLeft <= 10) {
    timerProgress.classList.add('urgent');
    timerProgress.classList.remove('critical');
  }

  // If time ran out and player hasn't answered
  if (timeLeft <= 0 && !hasAnswered) {
    lockAnswers();
  }
});

// ---- Submit answer ----
answersGrid.addEventListener('click', (e) => {

  const btn = e.target.closest('.answer-btn');
  if (!btn || hasAnswered) return;

  const answerIndex = parseInt(btn.dataset.index);
  hasAnswered = true;
  btn.classList.add('selected');
  lockAnswers(btn);

  window.socket.emit('submit-answer', { answerIndex });
});

function lockAnswers(selectedBtn = null) {
  const btns = answersGrid.querySelectorAll('.answer-btn');
  btns.forEach(b => {
    b.disabled = true;
    if (b !== selectedBtn) b.style.opacity = '0.5';
  });
}

// Jawaban diterima server — tampilkan waiting state
window.socket.on('answer-received', () => {
  feedbackIcon.textContent = '⏳';
  feedbackLabel.textContent = 'Answered!';
  feedbackLabel.style.color = 'var(--cyan)';
  feedbackPts.textContent = 'Waiting for timer...';
  feedbackOverlay.classList.add('show');
});

// ---- Answer result ----
// Timer habis — tampilkan hasil + leaderboard
window.socket.on('answer-result', (data) => {
  feedbackOverlay.classList.remove('show');

  setTimeout(() => {
    if (data.correct) {
      feedbackIcon.textContent = '✅';
      feedbackLabel.textContent = 'Jawaban benar!';
      feedbackLabel.style.color = 'var(--green)';
      feedbackPts.textContent = `Dapat +${data.score.toLocaleString()} poin`;
    } else {
      feedbackIcon.textContent = '❌';
      feedbackLabel.textContent = 'Jawaban salah';
      feedbackLabel.style.color = '#FF5252';
      feedbackPts.textContent = 'Dapat 0 poin';
    }

    yourRankScore.textContent = data.totalScore.toLocaleString() + ' pts';
    feedbackOverlay.classList.add('show');

    // Tidak auto-hide — round-end yang akan hide ini
  }, 300);
});

// Round end — update leaderboard + distribusi jawaban
window.socket.on('round-end', (data) => {
  // Keep answer-result popup visible briefly so the player can read it
  setTimeout(() => {
    feedbackOverlay.classList.remove('show');
  }, 1800);

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

function renderLeaderboard(board) {
  const myAvatar = sessionStorage.getItem('playerAvatar') || '🎮';
  const myAvatarBg = sessionStorage.getItem('playerAvatarBg') || '#1A2A6C';
  const top5 = board.slice(0, 5);
  const myEntry = board.find(p => p.name === playerName);

  leaderboardList.innerHTML = top5.map((p, i) => {
    const isMe = p.name === playerName;
    const emoji = isMe ? myAvatar : (p.avatar || p.name.substring(0, 2).toUpperCase());
    const bg = isMe ? myAvatarBg : (p.avatarBg || '#1A2A6C');
    return `
      <div class="lb-item ${i < 3 ? 'top-3' : ''} ${isMe ? 'is-you' : ''}">
        <div class="lb-rank">${p.rank}</div>
        <div class="lb-avatar" style="background:${bg};font-size:14px;">${emoji}</div>
        <div class="lb-name">${p.name}${isMe ? ' (You)' : ''}</div>
        <div class="lb-score">${p.score.toLocaleString()}</div>
      </div>
    `;
  }).join('');

  if (myEntry) {
    yourRankNum.textContent = '#' + myEntry.rank;
    yourRankScore.textContent = myEntry.score.toLocaleString() + ' pts';
  }
}

// ---- Game finished ----
window.socket.on('game-finished', (data) => {
  sessionStorage.setItem('finalLeaderboard', JSON.stringify(data.leaderboard));
  sessionStorage.setItem('playerName', playerName);
  window.location.href = '/result.html';
});

// ---- Host left ----
window.socket.on('host-left', () => {
  alert('The host ended the game.');
  window.location.href = '/';
});
