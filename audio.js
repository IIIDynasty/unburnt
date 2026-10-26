// Unburnt Sound Effects Generator using Web Audio API
// Absolutely NO musical instruments or background music.
// Only functional and ambient sounds: Key clicks, fire crackling, and paper rustling.

class UnburntAudioController {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.fireSizzleSource = null;
    this.fireSizzleGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.initialized = true;
      this.startFireSizzle();
    } catch (e) {
      console.warn("Web Audio API not supported in this browser", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) {
      if (this.muted) {
        if (this.fireSizzleGain) this.fireSizzleGain.gain.value = 0;
      } else {
        if (this.fireSizzleGain) this.fireSizzleGain.gain.value = 0.05; // low ambient fire
      }
    }
    return this.muted;
  }

  // Helper to create white noise buffer
  createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Sound FX: Mechanical woodblock-like key click (typing feedback)
  playClick() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    // Small variation in pitch for organic click feel
    osc.frequency.setValueAtTime(400 + Math.random() * 100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Sound FX: Scroll burning (Whoosh + Sizzle)
  playBurn() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.4);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.5);
  }

  // Sound FX: Scroll saved (Parchment/Paper Rustle)
  playSave() {
    if (!this.initialized || this.muted) return;
    this.resume();

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
    // Mimic quick rustle by modulating volume rapidly
    gainNode.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.4);
  }

  // Ambient Loop: Fire Sizzle (Crackling hearth in the background)
  startFireSizzle() {
    if (!this.initialized || this.fireSizzleSource) return;

    // 1. Create a continuous pinkish-noise loop for the flame hum
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    // Generate pink noise approximation for warmer flame rumble
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // rescue clipping
      b6 = white * 0.115926;
    }

    this.fireSizzleSource = this.ctx.createBufferSource();
    this.fireSizzleSource.buffer = noiseBuffer;
    this.fireSizzleSource.loop = true;

    // Filter to make it sound muffled/warm
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    this.fireSizzleGain = this.ctx.createGain();
    this.fireSizzleGain.gain.value = this.muted ? 0 : 0.05;

    this.fireSizzleSource.connect(filter);
    filter.connect(this.fireSizzleGain);
    this.fireSizzleGain.connect(this.ctx.destination);

    this.fireSizzleSource.start();

    // 2. Schedule random crackle pops (crackling embers)
    this.scheduleCrackle();
  }

  scheduleCrackle() {
    if (!this.initialized || !this.fireSizzleSource) return;

    // Schedule next crackle in 50ms - 400ms
    const delay = 50 + Math.random() * 350;
    setTimeout(() => {
      this.playCracklePop();
      this.scheduleCrackle();
    }, delay);
  }

  playCracklePop() {
    if (!this.initialized || this.muted || !this.fireSizzleSource) return;

    // Create a very short high-pitched click to simulate wood popping
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500 + Math.random() * 2000, this.ctx.currentTime);

    // Very fast decay
    gainNode.gain.setValueAtTime(0.005 + Math.random() * 0.015, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.01);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.01);
  }

  stopFireSizzle() {
    if (this.fireSizzleSource) {
      try {
        this.fireSizzleSource.stop();
      } catch (e) { }
      this.fireSizzleSource = null;
    }
  }
}

// Export singleton instance
const unburntAudio = new UnburntAudioController();
if (typeof module !== 'undefined') {
  module.exports = unburntAudio;
}
