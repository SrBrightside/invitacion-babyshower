// Sonido 100 % sintetizado con Web Audio: cajita de música y efectos, sin archivos.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Cajita de música: 8 compases de 6 corcheas. Arpegio + melodía suave.
const ARP = [
  [72, 76, 79, 76, 84, 79], // Do
  [69, 72, 76, 72, 81, 76], // La m
  [65, 69, 72, 69, 77, 72], // Fa
  [67, 71, 74, 71, 79, 74], // Sol
  [72, 76, 79, 76, 84, 79], // Do
  [64, 67, 71, 67, 76, 71], // Mi m
  [65, 69, 72, 69, 77, 72], // Fa
  [67, 71, 74, 71, 79, 77], // Sol
];
const MEL = [
  [88, 0, 0, 91, 0, 0],
  [88, 0, 0, 84, 0, 0],
  [81, 0, 84, 0, 0, 0],
  [86, 0, 0, 83, 0, 0],
  [88, 0, 0, 91, 0, 93],
  [91, 0, 0, 88, 0, 0],
  [84, 0, 81, 0, 84, 0],
  [86, 0, 0, 0, 0, 0],
];
const BASS = [48, 45, 41, 43, 48, 40, 41, 43];
const STEP = 0.29;

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('olivia-mute') === '1'; } catch { /* sin almacenamiento */ }
    this.musicOn = false;
    this.step = 0;
    this.nextT = 0;
    this.timer = null;
  }

  // Debe llamarse dentro de un toque del usuario (requisito de iOS/Android).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch { return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp);
      comp.connect(c.destination);
      // eco suave para que brille
      this.send = c.createGain();
      this.send.gain.value = 0.28;
      const delay = c.createDelay(1);
      delay.delayTime.value = STEP * 1.5;
      const fb = c.createGain();
      fb.gain.value = 0.32;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3200;
      this.send.connect(delay);
      delay.connect(lp);
      lp.connect(fb);
      fb.connect(delay);
      lp.connect(this.master);
      this.musicBus = c.createGain();
      this.musicBus.gain.value = 0.55;
      this.musicBus.connect(this.master);
      this.musicBus.connect(this.send);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('olivia-mute', m ? '1' : '0'); } catch { /* nada */ }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  pause() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }

  // Nota de cajita de música: fundamental + armónicos que se apagan rápido.
  bell(freq, t, vol, dur, dest) {
    const c = this.ctx;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(dest);
    const parts = [[1, 1, 'sine'], [2.005, 0.32, 'sine'], [4.02, 0.1, 'sine']];
    for (const [mul, g, type] of parts) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = freq * mul;
      const og = c.createGain();
      og.gain.setValueAtTime(g, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur / mul);
      o.connect(og);
      og.connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  fx(freq, vol = 0.2, dur = 0.7, delay = 0) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    this.bell(freq, t, vol, dur, this.master);
    this.bell(freq, t, vol * 0.5, dur, this.send);
  }

  // Juntar una florecita: sube por la escala pentatónica.
  chime(n) {
    const scale = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];
    const m = scale[Math.min(n, scale.length - 1)];
    this.fx(midi(m), 0.22, 0.6);
    this.fx(midi(m + 12), 0.08, 0.4, 0.05);
  }

  paint() { this.fx(midi(96), 0.05, 0.3); }

  wake() {
    [72, 76, 79, 84, 88].forEach((m, i) => this.fx(midi(m), 0.17, 0.8, i * 0.085));
  }

  win() {
    [72, 76, 79, 84, 79, 84, 88, 91, 96].forEach((m, i) => this.fx(midi(m), 0.17, 1.1, i * 0.1));
    [60, 64, 67].forEach((m) => this.fx(midi(m), 0.1, 2.2, 0.9));
  }

  tap() { this.fx(midi(84 + Math.floor(Math.random() * 5) * 2), 0.09, 0.35); }

  giggle() {
    [88, 91, 88, 93].forEach((m, i) => this.fx(midi(m), 0.11, 0.25, i * 0.07));
  }

  pop() {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const len = Math.floor(c.sampleRate * 0.09);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.7;
    const g = c.createGain();
    g.gain.value = 0.5;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
    const og = c.createGain();
    og.gain.setValueAtTime(0.25, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og);
    og.connect(this.master);
    o.start(t);
    o.stop(t + 0.15);
    this.fx(midi(91 + Math.floor(Math.random() * 3) * 2), 0.07, 0.4, 0.03);
  }

  startMusic() {
    if (this.musicOn || !this.ctx) return;
    this.musicOn = true;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.schedule(), 90);
  }

  schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    // si la pestaña estuvo dormida, no intentes ponerte al día
    if (this.nextT < c.currentTime - 0.2) this.nextT = c.currentTime + 0.05;
    while (this.nextT < c.currentTime + 0.35) {
      const bar = Math.floor(this.step / 6) % 8, i = this.step % 6;
      const t = this.nextT;
      this.bell(midi(ARP[bar][i]), t, i === 0 ? 0.075 : 0.05, 1.3, this.musicBus);
      if (MEL[bar][i]) this.bell(midi(MEL[bar][i]), t, 0.085, 1.9, this.musicBus);
      if (i === 0) this.bell(midi(BASS[bar]), t, 0.11, 2.2, this.musicBus);
      this.nextT += STEP;
      this.step++;
    }
  }
}
