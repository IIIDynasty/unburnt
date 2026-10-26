// Web Audio API Synthesizer for Cake & Ice Cream Van
// No external MP3/WAV files required - 100% reliable, zero latency, works offline!

class SoundController {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.tempo = 110;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
    } else {
      if (this.musicPlaying) {
        this.startBGM();
      }
    }
    return this.isMuted;
  }

  // Play a simple frequency tone
  tone(freq, type = 'sine', duration = 0.15, gainVal = 0.2, delay = 0) {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + delay;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  // Customer arrives: cute cheerful doorbell chime (C5 -> E5 -> G5)
  playDoorbell() {
    this.init();
    if (this.isMuted) return;
    this.tone(523.25, 'triangle', 0.2, 0.25, 0.0); // C5
    this.tone(659.25, 'triangle', 0.2, 0.25, 0.12); // E5
    this.tone(783.99, 'sine', 0.4, 0.3, 0.24); // G5
  }

  // Button select ingredient: cute bubbly "pop"
  playPop() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  // Topping sprinkles sparkle sound
  playSprinkle() {
    this.init();
    if (this.isMuted) return;
    const notes = [880, 1046.5, 1174.66, 1318.5, 1567.98];
    notes.forEach((freq, idx) => {
      this.tone(freq, 'sine', 0.08, 0.15, idx * 0.04);
    });
  }

  // Order success: joyful victory chime + cash register "cha-ching!"
  playSuccess() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    // Major chord arpeggio
    const arpeggio = [523.25, 659.25, 783.99, 1046.5];
    arpeggio.forEach((f, i) => {
      this.tone(f, 'triangle', 0.25, 0.25, i * 0.08);
    });
    // Cash chime
    setTimeout(() => {
      this.tone(1318.51, 'sine', 0.35, 0.3, 0); // E6
      this.tone(1760.00, 'sine', 0.5, 0.25, 0.08); // A6
    }, 320);
  }

  // Order incorrect: gentle playful "uh-oh" buzzer
  playError() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    this.tone(260, 'sawtooth', 0.15, 0.15, 0);
    this.tone(220, 'sawtooth', 0.25, 0.15, 0.12);
  }

  // Trash / Clear button: swish sound
  playClear() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    this.tone(450, 'sine', 0.08, 0.2, 0);
    this.tone(300, 'sine', 0.12, 0.15, 0.05);
  }

  // Customer timer running low: urgent tick
  playTick() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    this.tone(900, 'triangle', 0.04, 0.12, 0);
  }

  // Customer walks away sad: descending slide
  playCustomerSad() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    this.tone(392.00, 'sine', 0.18, 0.2, 0.0); // G4
    this.tone(349.23, 'sine', 0.18, 0.2, 0.15); // F4
    this.tone(293.66, 'sine', 0.3, 0.2, 0.3); // D4
  }

  // Round completed fanfare
  playRoundComplete() {
    this.init();
    if (this.isMuted) return;
    const melody = [523.25, 523.25, 659.25, 783.99, 659.25, 1046.5];
    melody.forEach((freq, idx) => {
      this.tone(freq, 'triangle', 0.2, 0.28, idx * 0.12);
    });
  }

  // Cute, gentle background music loop (van ice cream theme)
  startBGM() {
    this.init();
    this.musicPlaying = true;
    if (this.isMuted || !this.ctx) return;

    if (this.musicTimer) clearInterval(this.musicTimer);

    // Whimsical nursery-style melody notes (Hz)
    // C - E - G - E | F - A - G - E | D - F - E - C | D - G - C
    const melody = [
      { f: 523.25, d: 0.2 }, { f: 659.25, d: 0.2 }, { f: 783.99, d: 0.2 }, { f: 659.25, d: 0.2 },
      { f: 698.46, d: 0.2 }, { f: 880.00, d: 0.2 }, { f: 783.99, d: 0.2 }, { f: 659.25, d: 0.2 },
      { f: 587.33, d: 0.2 }, { f: 698.46, d: 0.2 }, { f: 659.25, d: 0.2 }, { f: 523.25, d: 0.2 },
      { f: 587.33, d: 0.2 }, { f: 783.99, d: 0.2 }, { f: 523.25, d: 0.4 }
    ];

    let noteIndex = 0;
    this.musicTimer = setInterval(() => {
      if (this.isMuted || !this.musicPlaying) return;
      const note = melody[noteIndex];
      this.tone(note.f, 'sine', note.d, 0.04);
      noteIndex = (noteIndex + 1) % melody.length;
    }, 380);
  }

  stopBGM() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

// Global instance
window.soundCtrl = new SoundController();
