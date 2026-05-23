// app.js — Landing page: join modal + avatar picker

const AVATARS = [
  { emoji: '🎮', bg: '#1A2A6C' },
  { emoji: '🚀', bg: '#0D4F8C' },
  { emoji: '⚡', bg: '#5C1A8C' },
  { emoji: '🔥', bg: '#8C1A1A' },
  { emoji: '💎', bg: '#0A5C5C' },
  { emoji: '🌟', bg: '#6B5C00' },
  { emoji: '🦊', bg: '#8C3A00' },
  { emoji: '🐉', bg: '#1A5C1A' },
  { emoji: '🤖', bg: '#1A3A6C' },
  { emoji: '👾', bg: '#4A1A8C' },
  { emoji: '🎯', bg: '#8C1A4A' },
  { emoji: '🏆', bg: '#6B4A00' },
  { emoji: '💀', bg: '#2A2A2A' },
  { emoji: '🦁', bg: '#7A4A00' },
  { emoji: '🐺', bg: '#3A3A5C' },
  { emoji: '🦅', bg: '#2A4A6C' },
  { emoji: '🎲', bg: '#4A0A6C' },
  { emoji: '🃏', bg: '#6C0A3A' },
];

const joinModal = document.getElementById('joinModal');
const heroJoinBtn = document.getElementById('heroJoinBtn');
const navJoinBtn = document.getElementById('navJoinBtn');
const closeBtn = document.getElementById('closeJoinModal');
const joinSubmitBtn = document.getElementById('joinSubmitBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const playerNameInput = document.getElementById('playerNameInput');
const roomCodeError = document.getElementById('roomCodeError');
const playerNameError = document.getElementById('playerNameError');
const avatarPreview = document.getElementById('avatarPreview');
const avatarGrid = document.getElementById('avatarGrid');

let selectedAvatarIndex = Math.floor(Math.random() * AVATARS.length); // random default

// ---- Build avatar grid ----
function buildAvatarGrid() {
  avatarGrid.innerHTML = '';
  AVATARS.forEach((av, i) => {
    const el = document.createElement('div');
    el.className = 'avatar-option' + (i === selectedAvatarIndex ? ' av-selected' : '');
    el.textContent = av.emoji;
    el.style.background = av.bg;
    el.title = av.emoji;
    el.addEventListener('click', () => selectAvatar(i));
    avatarGrid.appendChild(el);
  });
  applyAvatarPreview();
}

function selectAvatar(i) {
  selectedAvatarIndex = i;
  document.querySelectorAll('.avatar-option').forEach((el, idx) => {
    el.classList.toggle('av-selected', idx === i);
  });
  applyAvatarPreview();
}

function applyAvatarPreview() {
  const av = AVATARS[selectedAvatarIndex];
  avatarPreview.textContent = av.emoji;
  avatarPreview.style.background = av.bg;
}

// ---- Modal open/close ----
function openModal() {
  // Re-randomize default setiap kali modal dibuka
  selectedAvatarIndex = Math.floor(Math.random() * AVATARS.length);
  buildAvatarGrid();
  joinModal.classList.add('active');
  roomCodeInput.focus();
}

function closeModal() {
  joinModal.classList.remove('active');
  clearErrors();
}

function clearErrors() {
  roomCodeError.classList.remove('show');
  playerNameError.classList.remove('show');
}

heroJoinBtn.addEventListener('click', openModal);
navJoinBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
joinModal.addEventListener('click', (e) => { if (e.target === joinModal) closeModal(); });

roomCodeInput.addEventListener('input', () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase();
});

// ---- Submit join ----
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

  joinSubmitBtn.disabled = true;
  joinSubmitBtn.textContent = 'Joining...';

  const av = AVATARS[selectedAvatarIndex];
  sessionStorage.setItem('playerName', name);
  sessionStorage.setItem('roomCode', code);
  sessionStorage.setItem('playerAvatar', av.emoji);
  sessionStorage.setItem('playerAvatarBg', av.bg);

  window.socket.emit('join-room', {
    code,
    playerName: name,
    avatar: av.emoji,
    avatarBg: av.bg
  });
}

// ---- Socket responses ----
window.socket.on('room-joined', (data) => {
  sessionStorage.setItem('quizTitle', data.quizTitle);
  window.location.href = '/player.html';
});

window.socket.on('join-error', (data) => {
  joinSubmitBtn.disabled = false;
  joinSubmitBtn.textContent = 'Join Game →';
  roomCodeError.textContent = data.message;
  roomCodeError.classList.add('show');
});