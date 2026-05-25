// sounds.js — Web Audio API sound effects, no library needed

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

// Lazy init — browser butuh user interaction dulu sebelum AudioContext bisa jalan
function getCtx() {
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

function playCorrect() {
    const ac = getCtx();
    const t = ac.currentTime;

    // Chord ascending — nada "ding ding!"
    [523, 659, 784].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.12);

        gain.gain.setValueAtTime(0, t + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, t + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);

        osc.start(t + i * 0.12);
        osc.stop(t + i * 0.12 + 0.4);
    });
}

function playWrong() {
    const ac = getCtx();
    const t = ac.currentTime;

    // Descending buzzer
    [300, 220].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + i * 0.15);

        gain.gain.setValueAtTime(0, t + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.15, t + i * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.35);

        osc.start(t + i * 0.15);
        osc.stop(t + i * 0.15 + 0.35);
    });
}

function playCountdown() {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ac.currentTime);

    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ac.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.2);
}

function playGo() {
    const ac = getCtx();
    const t = ac.currentTime;

    [523, 784, 1047].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);

        gain.gain.setValueAtTime(0, t + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, t + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.5);

        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.5);
    });
}

function playTimerUrgent() {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ac.currentTime);

    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ac.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.15);
}

window.SFX = { playCorrect, playWrong, playCountdown, playGo, playTimerUrgent };

// Unlock AudioContext on first user interaction
document.addEventListener('click', () => {
    if (ctx && ctx.state === 'suspended') ctx.resume();
}, { once: false });