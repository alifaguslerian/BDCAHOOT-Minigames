// app.js — Landing page: join modal logic

const joinModal    = document.getElementById('joinModal');
const heroJoinBtn  = document.getElementById('heroJoinBtn');
const navJoinBtn   = document.getElementById('navJoinBtn');
const closeBtn     = document.getElementById('closeJoinModal');
const joinSubmitBtn = document.getElementById('joinSubmitBtn');
const roomCodeInput  = document.getElementById('roomCodeInput');
const playerNameInput = document.getElementById('playerNameInput');
const roomCodeError   = document.getElementById('roomCodeError');
const playerNameError = document.getElementById('playerNameError');

function openModal()  { joinModal.classList.add('active'); roomCodeInput.focus(); }
function closeModal() { joinModal.classList.remove('active'); clearErrors(); }
function clearErrors() {
  roomCodeError.classList.remove('show');
  playerNameError.classList.remove('show');
}

heroJoinBtn.addEventListener('click', openModal);
navJoinBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);

// Close on overlay click
joinModal.addEventListener('click', (e) => {
  if (e.target === joinModal) closeModal();
});

// Auto-uppercase room code input
roomCodeInput.addEventListener('input', () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase();
});

// Submit join
joinSubmitBtn.addEventListener('click', submitJoin);
roomCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitJoin(); });
playerNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitJoin(); });

function submitJoin() {
  clearErrors();

  const code = roomCodeInput.value.trim();
  const name = playerNameInput.value.trim();

  let valid = true;

  if (code.length < 4) {
    roomCodeError.textContent = 'Please enter a valid room code.';
    roomCodeError.classList.add('show');
    valid = false;
  }
  if (!name) {
    playerNameError.textContent = 'Please enter your name.';
    playerNameError.classList.add('show');
    valid = false;
  }

  if (!valid) return;

  // Disable button while attempting to join
  joinSubmitBtn.disabled = true;
  joinSubmitBtn.textContent = 'Joining...';

  // Store player info for use on player page
  sessionStorage.setItem('playerName', name);
  sessionStorage.setItem('roomCode', code);

  // Emit join-room to server
  window.socket.emit('join-room', { code, playerName: name });
}

// Server responses
window.socket.on('room-joined', (data) => {
  // Redirect to player page
  sessionStorage.setItem('quizTitle', data.quizTitle);
  window.location.href = '/player.html';
});

window.socket.on('join-error', (data) => {
  joinSubmitBtn.disabled = false;
  joinSubmitBtn.textContent = 'Join Game →';
  roomCodeError.textContent = data.message;
  roomCodeError.classList.add('show');
});
