// countdown.js — 3-2-1-GO! overlay sebelum soal pertama

const COLORS = { 3: '#FF5252', 2: '#FFD600', 1: '#00E676', 0: '#00D4FF' };
const SUBS   = { 3: 'Get ready...', 2: 'Almost time!', 1: 'Here we go!', 0: '' };

const overlay  = document.getElementById('countdownOverlay');
const cdNumber = document.getElementById('cdNumber');
const cdSub    = document.getElementById('cdSub');
const cdRing   = document.getElementById('cdRingProg');
const cdRipple = document.getElementById('cdRipple');

let cdTimer = null;
let cdCurrent = 3;

function setRingProgress(fraction) {
  cdRing.style.strokeDashoffset = 754 * (1 - fraction);
}

function fireRipple(color) {
  cdRipple.classList.remove('fire');
  void cdRipple.offsetWidth;
  cdRipple.style.borderColor = color;
  cdRipple.classList.add('fire');
}

function showStep(n) {
  const color = COLORS[n] || '#fff';
  cdRing.style.stroke = color;

  cdNumber.classList.remove('pop', 'go-text');
  cdNumber.style.animation = '';
  void cdNumber.offsetWidth;

  if (n === 0) {
    cdNumber.textContent = 'GO!';
    cdNumber.classList.add('go-text');
    cdNumber.style.color = color;
    cdSub.textContent = '';
  } else {
    cdNumber.textContent = n;
    cdNumber.style.color = '#fff';
    cdSub.textContent = SUBS[n];
  }

  cdNumber.classList.add('pop');
  fireRipple(color);
}

window.startCountdown = function(onComplete) {
  overlay.classList.add('active');
  cdCurrent = 3;
  setRingProgress(1);
  showStep(3);

  let elapsed = 0;

  cdTimer = setInterval(() => {
    elapsed += 50;
    setRingProgress(Math.max(0, 1 - elapsed / 1000));

    if (elapsed >= 1000) {
      elapsed = 0;
      cdCurrent--;
      setRingProgress(1);

      if (cdCurrent < 0) {
        clearInterval(cdTimer);
        overlay.classList.remove('active');
        if (onComplete) onComplete();
        return;
      }

      showStep(cdCurrent);

      if (cdCurrent === 0) {
        setTimeout(() => {
          cdNumber.style.animation = 'cdFadeOut 0.5s ease forwards';
        }, 600);
      }
    }
  }, 50);
};