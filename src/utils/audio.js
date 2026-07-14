// Web Audio API — sound effects + looping background music (no assets needed)
let audioCtx = null;
let soundEnabled = true;
let musicEnabled = true;
let musicScheduler = null;
let musicMasterGain = null;

export const toggleSound = () => { soundEnabled = !soundEnabled; return soundEnabled; };
export const isSoundEnabled = () => soundEnabled;
export const isMusicEnabled = () => musicEnabled;
export const toggleMusic = () => {
  musicEnabled = !musicEnabled;
  if (musicEnabled) startMusic();
  else stopMusic();
  return musicEnabled;
};

const getCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

// ── Background music: pentatonic ambient loop ──────────────────────────────────
// A minor pentatonic: A3 C4 D4 E4 G4 A4 C5 D5
const PENTA  = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
// 16-note looping melody
const MELODY = [1, 3, 4, 5, 4, 3, 2, 1, 2, 3, 5, 4, 3, 1, 0, 1];
const BEAT   = 0.37; // seconds per note

function schedMusicNote(ctx, dest, freq, t, dur, vol = 0.052, wave = 'sine') {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(dest);
  o.type = wave;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.04);
  g.gain.setValueAtTime(vol, t + dur - 0.08);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.start(t); o.stop(t + dur + 0.01);
}

export const startMusic = () => {
  stopMusic();
  if (!musicEnabled) return;
  const ctx = getCtx();
  musicMasterGain = ctx.createGain();
  musicMasterGain.gain.setValueAtTime(0, ctx.currentTime);
  musicMasterGain.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 1.8);
  musicMasterGain.connect(ctx.destination);

  let beat = 0;
  const schedule = () => {
    if (!musicMasterGain) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const idx = (beat + i) % MELODY.length;
      const t   = now + i * BEAT;
      schedMusicNote(ctx, musicMasterGain, PENTA[MELODY[idx]], t, BEAT * 0.8);
      // Soft bass drone on beats 0 and 4
      if (i % 4 === 0) {
        schedMusicNote(ctx, musicMasterGain, PENTA[0] / 2, t, BEAT * 3.6, 0.022, 'triangle');
      }
    }
    beat = (beat + 8) % MELODY.length;
    musicScheduler = setTimeout(schedule, 8 * BEAT * 1000 - 50);
  };
  schedule();
};

export const stopMusic = () => {
  if (musicScheduler) { clearTimeout(musicScheduler); musicScheduler = null; }
  const g = musicMasterGain;
  if (!g) return;
  musicMasterGain = null;
  try {
    const ctx = audioCtx;
    if (ctx) {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(() => { try { g.disconnect(); } catch {} }, 600);
    } else {
      g.disconnect();
    }
  } catch { try { g.disconnect(); } catch {} }
};

// ── Sound effects ──────────────────────────────────────────────────────────────
const pfx = (ctx, wave, freq, endFreq, dur, vol) => {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  const now = ctx.currentTime;
  o.type = wave;
  o.frequency.setValueAtTime(freq, now);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.start(now); o.stop(now + dur + 0.01);
};

const note = (ctx, freq, t, dur, vol, wave = 'sine') => {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = wave;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.15));
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur + 0.01);
};

export const playSound = (type) => {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    switch (type) {
      // ── UI ──────────────────────────────────────────────────────────────────
      case 'click':
        pfx(ctx, 'sine', 760, 320, 0.055, 0.07);
        break;

      // ── Piece movement ───────────────────────────────────────────────────────
      case 'place':
        // Wooden thud: low thump + crisp attack
        pfx(ctx, 'triangle', 185, 55, 0.18, 0.18);
        pfx(ctx, 'sine',     920, 500, 0.04, 0.04);
        break;

      // ── Chess specifics ──────────────────────────────────────────────────────
      case 'capture':
        // Sharp crack: impact + brief ring
        pfx(ctx, 'square', 290, 70, 0.1, 0.14);
        pfx(ctx, 'sine',   680, 260, 0.07, 0.05);
        break;

      case 'check': {
        // Two-note tense alert (minor second up)
        note(ctx, 466.16, now,        0.14, 0.1);
        note(ctx, 554.37, now + 0.16, 0.22, 0.1);
        break;
      }

      case 'castle': {
        // Two clunks: king moves first, then rook
        pfx(ctx, 'triangle', 215, 65, 0.14, 0.13);
        setTimeout(() => {
          const c2 = getCtx();
          pfx(c2, 'triangle', 172, 50, 0.12, 0.11);
        }, 170);
        break;
      }

      // ── Dice ─────────────────────────────────────────────────────────────────
      case 'roll': {
        const size = Math.floor(ctx.sampleRate * 0.28);
        const buf  = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < size; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (size * 0.45));
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        src.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.22, now);
        src.start(now);
        pfx(ctx, 'sawtooth', 65 + Math.random() * 45, 26, 0.22, 0.09);
        break;
      }

      // ── Win / Lose ────────────────────────────────────────────────────────────
      case 'win': {
        // 8-note triumphant fanfare
        const fanfare = [261.63, 329.63, 392.00, 523.25, 659.25, 784.00, 880.00, 1046.50];
        const at      = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.6];
        fanfare.forEach((f, i) => note(ctx, f, now + at[i], 0.35, 0.08));
        break;
      }

      case 'lose': {
        // 4-note descending lament
        [392.00, 349.23, 311.13, 261.63].forEach((f, i) =>
          note(ctx, f, now + i * 0.16, 0.32, 0.09, 'triangle'));
        break;
      }

      // ── Score / Combo ─────────────────────────────────────────────────────────
      case 'score':
        // Bright 3-note chime sweep
        note(ctx, 880,     now,        0.1,  0.07);
        note(ctx, 1108.73, now + 0.09, 0.12, 0.065);
        note(ctx, 1318.51, now + 0.20, 0.20, 0.055);
        break;

      case 'combo':
        // Ascending 5-note cascade
        [261.63, 329.63, 392.00, 523.25, 659.25].forEach((f, i) =>
          note(ctx, f, now + i * 0.07, 0.22, 0.07));
        break;

      default: break;
    }
  } catch (e) {
    console.warn('Audio error:', e);
  }
};
