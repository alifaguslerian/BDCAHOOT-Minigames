// result.js — Render final results from sessionStorage data

const leaderboard = JSON.parse(sessionStorage.getItem('finalLeaderboard') || '[]');
const myName      = sessionStorage.getItem('playerName') || '';

const podiumContainer = document.getElementById('podiumContainer');
const top10List       = document.getElementById('top10List');

if (!leaderboard.length) {
  // No data — redirect home
  window.location.href = '/';
}

// ---- Build Podium (top 3) ----
const podiumOrder = [1, 0, 2]; // visual order: 2nd left, 1st center, 3rd right

function initials(name) {
  return name.substring(0, 2).toUpperCase();
}

const top3 = leaderboard.slice(0, 3);
// Pad to 3 if fewer players
while (top3.length < 3) top3.push(null);

// Render in podium display order [rank2, rank1, rank3]
const displayOrder = [top3[1], top3[0], top3[2]]; // [2nd, 1st, 3rd]
const rankClasses  = ['rank-2', 'rank-1', 'rank-3'];
const medals       = ['🥈', '🏆', '🥉'];

podiumContainer.innerHTML = displayOrder.map((player, i) => {
  if (!player) return `<div class="podium-player ${rankClasses[i]}"><div class="podium-stand"></div></div>`;

  const realRank = i === 0 ? 2 : i === 1 ? 1 : 3;
  const isMe = player.name === myName;

  return `
    <div class="podium-player ${rankClasses[i]} animate-in" style="animation-delay:${i * 0.15}s">
      <div class="podium-avatar-wrap">
        <div class="podium-avatar" style="${isMe ? 'border-color:var(--cyan);' : ''}">
          ${initials(player.name)}
        </div>
        <div class="podium-rank-badge">${realRank}</div>
      </div>
      <div class="podium-name">${player.name}${isMe ? ' 🎯' : ''}</div>
      <div class="podium-score">${player.score.toLocaleString()} pts</div>
      <div class="podium-stand">${medals[i]}</div>
    </div>
  `;
}).join('');

// ---- Build Top 10 list (4th onward) ----
const rest = leaderboard.slice(3, 10);

if (rest.length === 0) {
  top10List.innerHTML = '<p style="color:var(--text-muted);font-size:14px;text-align:center;padding:20px 0;">Only 3 or fewer players</p>';
} else {
  top10List.innerHTML = rest.map((player) => {
    const isMe = player.name === myName;
    return `
      <div class="top10-item ${isMe ? 'is-you' : ''}" style="${isMe ? 'background:rgba(0,212,255,0.08);border-radius:10px;' : ''}">
        <div class="top10-rank">${player.rank}</div>
        <div class="top10-badge">${initials(player.name)}</div>
        <div class="top10-name">${player.name}${isMe ? ' (You)' : ''}</div>
        <div class="top10-pts">${player.score.toLocaleString()}</div>
      </div>
    `;
  }).join('');
}

// ---- Highlight if current player is not in top 10 ----
if (myName) {
  const myEntry = leaderboard.find(p => p.name === myName);
  if (myEntry && myEntry.rank > 10) {
    const myNote = document.createElement('div');
    myNote.style.cssText = 'text-align:center;padding:16px;color:var(--text-secondary);font-size:14px;';
    myNote.textContent = `Your rank: #${myEntry.rank} — ${myEntry.score.toLocaleString()} pts`;
    top10List.after(myNote);
  }
}
