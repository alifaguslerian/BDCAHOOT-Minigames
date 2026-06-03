const setupScreen = document.getElementById('setupScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const quizSelect = document.getElementById('quizSelect');
const quizInfo = document.getElementById('quizInfo');
const quizQCount = document.getElementById('quizQCount');
const quizName = document.getElementById('quizName');
const startHostingBtn = document.getElementById('startHostingBtn');
const displayRoomCode = document.getElementById('displayRoomCode');
const startGameBtn = document.getElementById('startGameBtn');
const playerCountLabel = document.getElementById('playerCountLabel');
const playerListEl = document.getElementById('playerListEl');
const lobbyPlayerCount = document.getElementById('lobbyPlayerCount');
const endHostBtn = document.getElementById('endHostBtn');

const hdQProgress = document.getElementById('hdQProgress');
const hdAnsweredCount = document.getElementById('hdAnsweredCount');
const hdTotalPlayers = document.getElementById('hdTotalPlayers');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const hdTimerProg = document.getElementById('hdTimerProg');
const hdTimerNum = document.getElementById('hdTimerNum');
const hdQuestion = document.getElementById('hdQuestion');
const hdAnswersGrid = document.getElementById('hdAnswersGrid');
const hdLeaderboard = document.getElementById('hdLeaderboard');
const endGameBtn = document.getElementById('endGameBtn');

let currentQuiz = null;
let totalPlayers = 0;
let currentTimeLimit = 20;
let answeredCount = 0;

// ---- Load quizzes ----
async function loadQuizzes() {
  try {
    const res = await fetch('/api/quizzes');
    const quizzes = await res.json();
    quizSelect.innerHTML = quizzes.length
      ? '<option value="">— Select a quiz —</option>' + quizzes.map(q =>
        `<option value="${q.id}" data-count="${q.questionCount}" data-title="${q.title}">
            ${q.title} (${q.questionCount} questions)
          </option>`).join('')
      : '<option value="">No quizzes found. Create one first.</option>';
  } catch (e) {
    quizSelect.innerHTML = '<option value="">Error loading quizzes</option>';
  }
}

// Kalau dari preview page — langsung create room
const urlParams = new URLSearchParams(window.location.search);
const autoStartId = urlParams.get('start');
if (autoStartId) {
  // Tunggu socket connect lalu langsung buat room
  window.socket.on('connect', () => {
    window.socket.emit('create-room', { quizId: autoStartId });
  });
  // Sembunyikan setup screen
  setupScreen.style.display = 'none';
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
  // Redirect ke preview page dulu
  window.location.href = `/quiz-preview.html?id=${currentQuiz.id}`;
});

window.socket.on('room-created', (data) => {
  displayRoomCode.textContent = data.code;
  setupScreen.style.display = 'none';
  lobbyScreen.style.display = 'block';
});

// ---- Player list updates ----
window.socket.on('player-list-updated', (data) => {
  totalPlayers = data.count;
  playerCountLabel.textContent = data.count;
  lobbyPlayerCount.textContent = data.count + ' players';
  hdTotalPlayers.textContent = data.count;
  startGameBtn.disabled = data.count === 0;

  playerListEl.innerHTML = data.players.map(p => `
    <div class="player-item animate-in">
      <div class="player-avatar" style="background:${p.avatarBg || '#1A2A6C'};font-size:16px;">
        ${p.avatar || p.name.substring(0, 2).toUpperCase()}
      </div>
      <span style="font-weight:600;font-size:14px;">${p.name}</span>
    </div>
  `).join('');
});

// ---- Start game ----
startGameBtn.addEventListener('click', () => {
  window.socket.emit('start-game');
  startGameBtn.disabled = true;
});

window.socket.on('game-started', () => {
  lobbyScreen.style.display = 'none';
  gameScreen.style.display = 'grid';
  startCountdown(); // countdown 3-2-1 sebelum soal pertama
});

// ---- Question started ----
window.socket.on('question-started', (data) => {
  answeredCount = 0;
  currentTimeLimit = data.timeLimit;

  hdQProgress.textContent = `Q${data.questionIndex + 1} / ${data.totalQuestions}`;
  hdQuestion.textContent = data.question;
  hdAnsweredCount.textContent = '0';
  hdTotalPlayers.textContent = totalPlayers;
  nextQuestionBtn.disabled = true;

  // Reset timer
  hdTimerProg.style.strokeDashoffset = '0';
  hdTimerProg.classList.remove('urgent', 'critical');
  hdTimerNum.textContent = data.timeLimit;

  // Set answer cards
  const cards = hdAnswersGrid.querySelectorAll('.hd-ans-card');
  cards.forEach((card, i) => {
    card.querySelector('.hd-ans-text').textContent = data.options[i] || '—';
    card.classList.remove('correct', 'wrong');
    card.style.opacity = '1';
    const dist = card.querySelector('.hd-dist-wrap');
    if (dist) dist.style.display = 'none';
  });
});

// ---- Timer update ----
window.socket.on('timer-update', (data) => {
  const timeLeft = data.timeLeft;
  hdTimerNum.textContent = timeLeft;

  const offset = 213 * (1 - timeLeft / currentTimeLimit);
  hdTimerProg.style.strokeDashoffset = offset;

  if (timeLeft <= 5 && timeLeft > 0) {
    hdTimerProg.classList.add('critical');
    hdTimerProg.classList.remove('urgent');
  } else if (timeLeft <= 10) {
    hdTimerProg.classList.add('urgent');
    hdTimerProg.classList.remove('critical');
  }
});

// ---- Round end ----
window.socket.on('round-end', (data) => {
  nextQuestionBtn.disabled = false;
  document.getElementById('nextFloatBtn').style.display = 'block';

  const currentQ = parseInt(hdQProgress.textContent.split('/')[0].replace('Q', '').trim());
  const totalQ = parseInt(hdQProgress.textContent.split('/')[1].trim());

  const floatBtn = document.querySelector('#nextFloatBtn button');
  if (currentQ >= totalQ) {
    floatBtn.textContent = 'Lihat Hasil 🏆';
    floatBtn.style.background = '#FFD600';
    floatBtn.style.color = '#000';
  } else {
    floatBtn.textContent = 'Next Question →';
    floatBtn.style.background = '';
    floatBtn.style.color = '';
  }

  const cards = hdAnswersGrid.querySelectorAll('.hd-ans-card');
  cards.forEach((card, i) => {
    const count = data.distribution[i] || 0;
    const pct = Math.round((count / Math.max(data.totalPlayers, 1)) * 100);

    if (i === data.correctAnswer) {
      card.classList.add('correct');
    } else {
      card.classList.add('wrong');
    }

    const dist = card.querySelector('.hd-dist-wrap');
    const fill = card.querySelector('.hd-dist-fill');
    const countEl = card.querySelector('.hd-dist-count');

    dist.style.display = 'block';
    countEl.textContent = count;
    setTimeout(() => { fill.style.width = pct + '%'; }, 50);
  });

  renderLeaderboard(data.leaderboard);
});

// ---- Track answered count via leaderboard ----
// Setiap ada yang jawab, server broadcast leaderboard — pakai ini buat update counter
window.socket.on('leaderboard-updated', (data) => {
  // tidak dipakai, round-end yang handle
});

function renderLeaderboard(board) {
  hdLeaderboard.innerHTML = board.slice(0, 5).map((p, i) => {
    const tClass = i === 0 ? 't1' : i === 1 ? 't2' : i === 2 ? 't3' : '';
    return `
      <div class="hd-lb-row ${tClass}">
        <div class="hd-lb-rank">${p.rank}</div>
        <div class="hd-lb-av" style="background:${p.avatarBg || '#1A2A6C'};font-size:13px;">
          ${p.avatar || p.name.substring(0, 2).toUpperCase()}
        </div>
        <div class="hd-lb-name">${p.name}</div>
        <div class="hd-lb-score">${p.score.toLocaleString()}</div>
      </div>
    `;
  }).join('');
}

// ---- Next question ----
nextQuestionBtn.addEventListener('click', () => {
  window.socket.emit('next-question');
  nextQuestionBtn.disabled = true;
  document.getElementById('nextFloatBtn').style.display = 'none';
  const cards = hdAnswersGrid.querySelectorAll('.hd-ans-card');
  cards.forEach(c => {
    c.classList.remove('correct', 'wrong');
    c.style.opacity = '1';
    const dist = c.querySelector('.hd-dist-wrap');
    if (dist) dist.style.display = 'none';
    const fill = c.querySelector('.hd-dist-fill');
    if (fill) fill.style.width = '0%';
  });
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

window.socket.on('answered-update', (data) => {
  hdAnsweredCount.textContent = data.count;
});

// ---- Game finished ----
window.socket.on('game-finished', (data) => {
  sessionStorage.setItem('finalLeaderboard', JSON.stringify(data.leaderboard));
  sessionStorage.setItem('isHost', 'true');
  window.location.href = '/final-podium.html';
});

