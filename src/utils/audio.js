// Web Audio API Synthesizer for game sound effects (no assets to download!)
let audioCtx = null;
let soundEnabled = true;

export const toggleSound = () => {
  soundEnabled = !soundEnabled;
  return soundEnabled;
};

export const isSoundEnabled = () => soundEnabled;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playSound = (type) => {
  if (!soundEnabled) return;

  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;

      case 'place':
        // Simulates wood block or stone drop
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      case 'roll':
        // Crackling roll sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100 + Math.random() * 150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'win':
        // Ascending major chord arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          
          const noteTime = now + index * 0.12;
          
          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(freq, noteTime);
          
          noteGain.gain.setValueAtTime(0.1, noteTime);
          noteGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);
          
          noteOsc.start(noteTime);
          noteOsc.stop(noteTime + 0.3);
        });
        break;

      case 'lose':
        // Descending sad buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.4);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.4);
        break;

      case 'score':
        // High ping for points
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      default:
        break;
    }
  } catch (e) {
    console.warn("Audio Context error:", e);
  }
};
