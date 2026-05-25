const quizList = document.getElementById('quizList');

async function loadQuizzes() {
  try {
    const res  = await fetch('/api/quizzes');
    const data = await res.json();

    if (!data.length) {
      quizList.innerHTML = `
        <div style="text-align:center;padding:60px 0;">
          <div style="font-size:48px;margin-bottom:16px;">📭</div>
          <div style="color:var(--text-muted);margin-bottom:20px;">No quizzes yet</div>
          <a href="/create-quiz.html" class="btn btn-primary">+ Create your first quiz</a>
        </div>
      `;
      return;
    }

    quizList.innerHTML = data.map(q => `
      <div class="quiz-meta-card" style="display:flex;align-items:center;gap:16px;margin-bottom:14px;" id="qcard-${q.id}">
        <div style="flex:1;min-width:0;">
          <div style="font-size:17px;font-weight:700;margin-bottom:4px;">${q.title}</div>
          <div style="font-size:13px;color:var(--text-muted);">${q.questionCount} questions</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button class="btn btn-ghost btn-sm" onclick="editQuiz('${q.id}')">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:#FF5252;border-color:rgba(255,82,82,0.2);"
            onclick="deleteQuiz('${q.id}', '${q.title}')">🗑 Delete</button>
        </div>
      </div>
    `).join('');

  } catch (e) {
    quizList.innerHTML = `<div style="color:#FF5252;text-align:center;padding:40px;">Failed to load quizzes.</div>`;
  }
}

function editQuiz(id) {
  window.location.href = `/create-quiz.html?edit=${id}`;
}

async function deleteQuiz(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

  try {
    const res  = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      document.getElementById(`qcard-${id}`).remove();
      // Kalau list kosong, reload
      if (!document.querySelector('[id^="qcard-"]')) loadQuizzes();
    }
  } catch (e) {
    alert('Failed to delete. Try again.');
  }
}

loadQuizzes();