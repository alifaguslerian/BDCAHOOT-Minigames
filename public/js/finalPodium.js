// finalPodium.js — Animated top 3 podium reveal + confetti

const leaderboard = JSON.parse(sessionStorage.getItem('finalLeaderboard') || '[]');
const myName = sessionStorage.getItem('playerName') || '';

if (!leaderboard.length) window.location.href = '/';

const podium = document.getElementById('fpPodium');

const top3 = leaderboard.slice(0, 3);
while (top3.length < 3) top3.push(null);

const displayOrder = [
  { player: top3[1], rankClass: 'rank-2', badge: '2', medal: '🥈' },
  { player: top3[0], rankClass: 'rank-1', badge: '1', medal: '🏆' },
  { player: top3[2], rankClass: 'rank-3', badge: '3', medal: '🥉' },
];

podium.innerHTML = displayOrder.map(({ player, rankClass, badge, medal }) => {
  if (!player) {
    return `<div class="fp-player ${rankClass}"><div class="fp-stand">${medal}</div></div>`;
  }

  const isMe = player.name === myName;
  const emoji = player.avatar || player.name.substring(0, 2).toUpperCase();
  const bg = player.avatarBg || '#1A2A6C';
  const isFontEmoji = player.avatar ? true : false;

  return `
    <div class="fp-player ${rankClass}">
      <div class="fp-avatar-wrap">
        <div class="fp-avatar" style="background:${bg};font-size:${isFontEmoji ? '32px' : '18px'};">
          ${emoji}
        </div>
        <div class="fp-badge">${badge}</div>
      </div>
      <div class="fp-name">${player.name}${isMe ? ' 🎯' : ''}</div>
      <div class="fp-score">${player.score.toLocaleString()} pts</div>
      <div class="fp-stand">${medal}</div>
    </div>
  `;
}).join('');

// =====================
// CONFETTI
// =====================

const canvas = document.getElementById('confettiCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animFrame = null;
let running = false;

const COLORS = [
  '#FFD600', '#00E676', '#00D4FF', '#F47272',
  '#9B5DE5', '#FF6B35', '#ffffff', '#00FF84'
];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.addEventListener('resize', resize);

function randomBetween(a, b) { return a + Math.random() * (b - a); }

function createParticle(x) {
  return {
    x: x !== undefined ? x : randomBetween(0, canvas.width),
    y: randomBetween(-20, 0),
    w: randomBetween(8, 14),
    h: randomBetween(4, 8),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: randomBetween(-2.5, 2.5),
    vy: randomBetween(3, 7),
    angle: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-0.15, 0.15),
    opacity: 1,
    shape: Math.random() > 0.5 ? 'rect' : 'circle'
  };
}

function burst(count = 80) {
  const cx = canvas.width / 2;
  for (let i = 0; i < count; i++) {
    const p = createParticle(randomBetween(cx - 200, cx + 200));
    p.vy = randomBetween(2, 9);
    p.vx = randomBetween(-5, 5);
    particles.push(p);
  }
}

function drawParticle(p) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = p.color;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  if (p.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  }

  ctx.restore();
}

function tick() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.spin;
    p.vy += 0.12; // gravity
    p.vx *= 0.99; // drag

    // Fade out saat mendekati bawah layar
    if (p.y > canvas.height * 0.75) {
      p.opacity -= 0.025;
    }

    drawParticle(p);
  });

  // Hapus partikel yang sudah tidak keliatan
  particles = particles.filter(p => p.opacity > 0 && p.y < canvas.height + 20);

  if (running || particles.length > 0) {
    animFrame = requestAnimationFrame(tick);
  }
}

function startConfetti() {
  running = true;

  // Burst awal
  burst(120);
  tick();

  // Burst kedua setelah 0.8s
  setTimeout(() => burst(80), 800);

  // Burst ketiga setelah 1.8s (pas rank 1 muncul)
  setTimeout(() => burst(100), 1800);

  // Stop spawn setelah 4 detik, biarkan yang ada habis sendiri
  setTimeout(() => { running = false; }, 4000);
}

// Mulai confetti pas rank 1 muncul (delay 2.2s sesuai animasi)
setTimeout(startConfetti, 2200);