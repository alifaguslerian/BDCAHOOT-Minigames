// hostAuth.js — cek password sebelum akses host features

const HOST_KEY = 'bdca_host_auth';

function isAuthed() {
    return sessionStorage.getItem(HOST_KEY) === 'true';
}

async function checkAuth(password) {
    const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.success) {
        sessionStorage.setItem(HOST_KEY, 'true');
        return true;
    }
    return false;
}

function requireAuth(onSuccess) {
    if (isAuthed()) { onSuccess(); return; }

    // Buat modal password
    const overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.85);
    backdrop-filter:blur(8px);z-index:500;
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;

    overlay.innerHTML = `
    <div style="
      background:#13132A;border:1px solid rgba(255,255,255,0.08);
      border-radius:24px;padding:40px;width:100%;max-width:400px;
      font-family:'DM Sans',sans-serif;
    ">
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;color:#fff;margin-bottom:8px;">
        Host Access
      </div>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin-bottom:24px;">
        Enter the host password to continue
      </p>
      <form id="authForm">
        <input
          type="password"
          id="authPasswordInput"
          placeholder="Enter password"
          style="
            width:100%;padding:14px 16px;border-radius:12px;
            background:#1C1C38;border:1px solid rgba(255,255,255,0.1);
            color:#fff;font-size:16px;font-family:'DM Sans',sans-serif;
            outline:none;margin-bottom:12px;box-sizing:border-box;
          "
        />
        <div id="authError" style="color:#FF5252;font-size:13px;margin-bottom:12px;display:none;">
          Wrong password. Try again.
        </div>
        <button id="authSubmitBtn" type="submit" style="
          width:100%;padding:14px;border-radius:12px;border:none;
          background:#00E676;color:#000;font-family:'Bricolage Grotesque',sans-serif;
          font-size:15px;font-weight:800;cursor:pointer;
        ">
          Enter →
        </button>
      </form>
      <button type="button" onclick="window.location.href='/'" style="
        width:100%;padding:10px;margin-top:10px;border-radius:12px;
        border:1px solid rgba(255,255,255,0.1);background:transparent;
        color:rgba(255,255,255,0.4);font-size:13px;cursor:pointer;
        font-family:'DM Sans',sans-serif;
      ">
        Cancel
      </button>
    </div>
  `;

    document.body.appendChild(overlay);

    const input = document.getElementById('authPasswordInput');
    const btn = document.getElementById('authSubmitBtn');
    const form = document.getElementById('authForm');
    const errMsg = document.getElementById('authError');

    input.focus();

    async function submit() {
        const pw = input.value.trim();
        if (!pw) return;

        btn.disabled = true;
        btn.textContent = 'Checking...';

        const ok = await checkAuth(pw);
        if (ok) {
            overlay.remove();
            onSuccess();
        } else {
            errMsg.style.display = 'block';
            input.value = '';
            input.focus();
            btn.disabled = false;
            btn.textContent = 'Enter →';
        }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
        e.preventDefault();
        submit();
      }
    });
}