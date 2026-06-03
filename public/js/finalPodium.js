// finalPodium.js — Animated top 3 podium reveal

const leaderboard = JSON.parse(sessionStorage.getItem('finalLeaderboard') || '[]');
const myName      = sessionStorage.getItem('playerName') || '';

if (!leaderboard.length) window.location.href = '/';

const podium = document.getElementById('fpPodium');

const top3 = leaderboard.slice(0, 3);
while (top3.length < 3) top3.push(null); // pad kalau player < 3

// Display order: rank2 kiri, rank1 tengah, rank3 kanan
const displayOrder = [
  { player: top3[1], rankClass: 'rank-2', badge: '2', medal: '🥈' },
  { player: top3[0], rankClass: 'rank-1', badge: '1', medal: '🏆' },
  { player: top3[2], rankClass: 'rank-3', badge: '3', medal: '🥉' },
];

podium.innerHTML = displayOrder.map(({ player, rankClass, badge, medal }) => {
  if (!player) {
    return `<div class="fp-player ${rankClass}"><div class="fp-stand">${medal}</div></div>`;
  }

  const isMe  = player.name === myName;
  const emoji = player.avatar || player.name.substring(0, 2).toUpperCase();
  const bg    = player.avatarBg || '#1A2A6C';
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