export class AudioSystem {
  constructor() {
    this.context = null;
    this.enabled = true;
  }

  unlock() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.context.state === "suspended") this.context.resume();
  }

  tone(type, frequency, duration, gain = 0.05, slide = 0) {
    if (!this.enabled) return;
    this.unlock();
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(amp).connect(this.context.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  shoot() {
    this.tone("triangle", 760, 0.045, 0.026, 180);
  }

  explosion() {
    this.tone("sawtooth", 130, 0.22, 0.08, -80);
    this.tone("square", 70, 0.14, 0.04, -30);
  }

  pickup() {
    this.tone("sine", 520, 0.08, 0.045, 380);
    setTimeout(() => this.tone("sine", 900, 0.08, 0.035, 180), 60);
  }

  hurt() {
    this.tone("square", 180, 0.18, 0.06, -90);
  }

  boss() {
    this.tone("sawtooth", 90, 0.45, 0.07, 150);
    setTimeout(() => this.tone("triangle", 260, 0.25, 0.05, 120), 180);
  }
}
