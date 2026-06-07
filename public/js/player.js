const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const playerNameDisplay = document.getElementById('playerNameDisplay');
const quizTitleDisplay = document.getElementById('quizTitleDisplay');
const qProgressDisplay = document.getElementById('qProgressDisplay');
const playerCountDisplay = document.getElementById('playerCountDisplay');
const questionText = document.getElementById('questionText');
const answersGrid = document.getElementById('answersGrid');
const timerNumber = document.getElementById('timerNumber');
const timerProgress = document.getElementById('timerProgress');
const feedbackOverlay = document.getElementById('feedbackOverlay');
const feedbackIcon = document.getElementById('feedbackIcon');
const feedbackLabel = document.getElementById('feedbackLabel');
const feedbackPts = document.getElementById('feedbackPts');
const lbScreenList = document.getElementById('lbScreenList');
const lbScreenSub = document.getElementById('lbScreenSub');
const lbYourRank = document.getElementById('lbYourRank');
const lbYourName = document.getElementById('lbYourName');
const lbYourScore = document.getElementById('lbYourScore');

const playerName = sessionStorage.getItem('playerName') || 'Player';
const roomCode = sessionStorage.getItem('roomCode') || '';
const quizTitle = sessionStorage.getItem('quizTitle') || 'Quiz';

if (!roomCode) window.location.href = '/';

playerNameDisplay.textContent = playerName;
quizTitleDisplay.textContent = quizTitle;
lbYourName.textContent = playerName;

let currentTimeLimit = 20;
let hasAnswered = false;
let currentQuestion = 0;
let totalQuestions = 0;
let prevRanks = {};

// ---- Reconnect ----
window.socket.on('connect', () => {
  const code = sessionStorage.getItem('roomCode');
  const name = sessionStorage.getItem('playerName');
  const avatar = sessionStorage.getItem('playerAvatar');
  const avatarBg = sessionStorage.getItem('playerAvatarBg');
  if (code && name) window.socket.emit('join-room', { code, playerName: name, avatar, avatarBg });
});

window.socket.on('room-joined', (data) => {
  sessionStorage.setItem('quizTitle', data.quizTitle);
});

window.socket.on('player-list-updated', (data) => {
  playerCountDisplay.textContent = data.count + ' Players';
});

// ---- Game started ----
window.socket.on('game-started', () => {
  lobbyScreen.style.display = 'none';
  gameScreen.style.display = 'flex';
  if (gameScreen.dataset.started) return;
  gameScreen.dataset.started = 'true';
  startCountdown();
});

// ---- New question ----
window.socket.on('question-started', (data) => {
  hasAnswered = false;
  currentTimeLimit = data.timeLimit;
  currentQuestion = data.questionIndex + 1;
  totalQuestions = data.totalQuestions;

  // Switch ke game screen
  leaderboardScreen.style.display = 'none';
  gameScreen.style.display = 'flex';

  questionText.textContent = data.question;
  qProgressDisplay.textContent = `Q${data.questionIndex + 1} / ${data.totalQuestions}`;

  timerProgress.style.strokeDashoffset = '0';
  timerProgress.classList.remove('urgent', 'critical');
  timerNumber.textContent = data.timeLimit;

  // Reset buttons bersih
  const icons = ['▲', '◆', '●', '■'];
  const btns = answersGrid.querySelectorAll('.pg-ans-btn');
  btns.forEach((btn, i) => {
    btn.disabled = false;
    btn.classList.remove('correct', 'wrong', 'selected');
    btn.style.opacity = '1';
    btn.innerHTML = `
      <div class="pg-ans-icon" data-index="${i}">${icons[i]}</div>
      <span class="answer-text">${data.options[i] || '—'}</span>
    `;
  });

  feedbackOverlay.classList.remove('show');
});

// ---- Timer ----
window.socket.on('timer-update', (data) => {
  const timeLeft = data.timeLeft;
  timerNumber.textContent = timeLeft;

  const offset = 232 * (1 - timeLeft / currentTimeLimit);
  timerProgress.style.strokeDashoffset = offset;

  if (timeLeft <= 5 && timeLeft > 0) {
    timerProgress.classList.add('critical');
    timerProgress.classList.remove('urgent');
  } else if (timeLeft <= 10) {
    timerProgress.classList.add('urgent');
    timerProgress.classList.remove('critical');
  }

  if (timeLeft <= 0 && !hasAnswered) lockAnswers();
});

// ---- Submit answer ----
answersGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.pg-ans-btn');
  if (!btn || hasAnswered) return;

  const answerIndex = parseInt(btn.dataset.index);
  hasAnswered = true;
  btn.classList.add('selected');
  lockAnswers(btn);
  window.socket.emit('submit-answer', { answerIndex });
});

function lockAnswers(selectedBtn = null) {
  answersGrid.querySelectorAll('.pg-ans-btn').forEach(b => {
    b.disabled = true;
    if (b !== selectedBtn) b.style.opacity = '0.4';
  });
}

// ---- Answer received ----
window.socket.on('answer-received', () => {
  feedbackIcon.textContent = '⏳';
  feedbackLabel.textContent = 'Answered!';
  feedbackLabel.style.color = 'var(--cyan)';
  feedbackPts.textContent = 'Waiting for results...';
  feedbackOverlay.classList.add('show');
});

// ---- Answer result (timer habis) ----
window.socket.on('answer-result', (data) => {
  feedbackOverlay.classList.remove('show');
  void feedbackOverlay.offsetWidth;

  if (data.correct) {
    feedbackIcon.textContent = '✅';
    feedbackLabel.textContent = 'Jawaban benar!';
    feedbackLabel.style.color = 'var(--green)';
    feedbackPts.textContent = `+${data.score.toLocaleString()} poin`;
  } else {
    feedbackIcon.textContent = '❌';
    feedbackLabel.textContent = 'Jawaban salah';
    feedbackLabel.style.color = '#FF5252';
    feedbackPts.textContent = '0 poin';
  }

  lbYourScore.textContent = data.totalScore.toLocaleString() + ' pts';
  feedbackOverlay.classList.add('show');
});

// ---- Round end → switch ke leaderboard screen ----
window.socket.on('round-end', (data) => {
  feedbackOverlay.classList.remove('show');

  const btns = answersGrid.querySelectorAll('.pg-ans-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === data.correctAnswer) {
      btn.classList.add('correct');
      btn.style.opacity = '1';
    } else {
      btn.classList.add('wrong');
      btn.style.opacity = '0.35';
    }
  });

  if (data.isLastQuestion) {
    // Soal terakhir — skip leaderboard, langsung tunggu game-finished
    setTimeout(() => {
      gameScreen.style.display = 'none';
      // Tampilkan loading screen sementara nunggu host klik lihat hasil
      document.body.innerHTML += `
        <div id="waitingFinal" style="
          position:fixed;inset:0;background:#0A0A1A;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          z-index:500;font-family:'Bricolage Grotesque',sans-serif;
        ">
          <div style="font-size:48px;margin-bottom:20px;">🏆</div>
          <div style="font-size:28px;font-weight:800;color:#fff;margin-bottom:8px;">Game Over!</div>
          <div style="font-size:15px;color:rgba(255,255,255,0.4);">Waiting for final results...</div>
        </div>
      `;
    }, 1500);
    return;
  }

  // Bukan soal terakhir — transisi ke leaderboard screen
  setTimeout(() => {
    gameScreen.style.display        = 'none';
    leaderboardScreen.style.display = 'flex';
    lbScreenSub.textContent         = `After Q${currentQuestion} of ${totalQuestions}`;
    renderLbScreen(data.leaderboard);
  }, 1500);
});

// ---- Render leaderboard screen ----
function renderLbScreen(board) {
  const myAvatar = sessionStorage.getItem('playerAvatar') || '🎮';
  const myAvatarBg = sessionStorage.getItem('playerAvatarBg') || '#1A2A6C';
  const top10 = board.slice(0, 10);
  const myEntry = board.find(p => p.name === playerName);

  lbScreenList.innerHTML = top10.map((p, i) => {
    const isMe = p.name === playerName;
    const emoji = isMe ? myAvatar : (p.avatar || p.name.substring(0, 2).toUpperCase());
    const bg = isMe ? myAvatarBg : (p.avatarBg || '#1A2A6C');
    const prev = prevRanks[p.name];
    const moved = prev !== undefined ? prev - p.rank : 0;
    const arrow = moved > 0 ? '↑' : moved < 0 ? '↓' : '—';
    const arrowColor = moved > 0 ? '#00E676' : moved < 0 ? '#FF5252' : 'rgba(255,255,255,0.2)';
    const rankClass = p.rank === 1 ? 'rank-1' : p.rank === 2 ? 'rank-2' : p.rank === 3 ? 'rank-3' : '';

    return `
      <div class="lb-screen-row ${rankClass} ${isMe ? 'is-you' : ''}"
           style="animation-delay:${i * 0.07}s">
        <div class="lb-screen-rank">${p.rank}</div>
        <div class="lb-screen-avatar" style="background:${bg}">${emoji}</div>
        <div class="lb-screen-name">${p.name}${isMe ? ' (You)' : ''}</div>
        <div class="lb-screen-score">${p.score.toLocaleString()}</div>
        <div class="lb-screen-arrow" style="color:${arrowColor}">${arrow}</div>
      </div>
    `;
  }).join('');

  // Trigger animasi masuk
  requestAnimationFrame(() => {
    lbScreenList.querySelectorAll('.lb-screen-row').forEach(row => {
      row.classList.add('visible');
    });
  });

  // Update prevRanks
  board.forEach(p => { prevRanks[p.name] = p.rank; });

  if (myEntry) {
    lbYourRank.textContent = '#' + myEntry.rank;
    lbYourScore.textContent = myEntry.score.toLocaleString() + ' pts';
  }
}

// ---- Game finished ----
window.socket.on('game-finished', (data) => {
  sessionStorage.setItem('finalLeaderboard', JSON.stringify(data.leaderboard));
  sessionStorage.setItem('playerName', playerName);
  window.location.href = '/final-podium.html';
});

window.socket.on('host-left', () => {
  alert('The host ended the game.');
  window.location.href = '/';
});