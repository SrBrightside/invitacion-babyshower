// Sonido de la invitación.
//
// La música de fondo suena por un elemento <audio>: así se escucha aunque el iPhone
// esté en modo silencio (el sonido hecho solo con Web Audio se calla con ese interruptor).
// Si no hay un archivo propio, la cajita de música se sintetiza y se convierte en audio
// al cargar la página. Los efectos (campanitas, globos) sí usan Web Audio.

// Para usar una canción propia: sube el archivo al repo (p. ej. audio/musica.mp3)
// y pon aquí su ruta. Vacío = cajita de música sintetizada.
const MUSIC_FILE = '';

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
const STEPS = 48;

// Nota de cajita de música: fundamental + armónicos que se apagan rápido.
function bell(c, freq, t, vol, dur, dest) {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(dest);
  for (const [mul, g] of [[1, 1], [2.005, 0.32], [4.02, 0.1]]) {
    const o = c.createOscillator();
    o.type = 'sine';
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

// Eco suave para que las campanitas brillen.
function addEcho(c, input, output) {
  const send = c.createGain();
  send.gain.value = 0.28;
  const delay = c.createDelay(1);
  delay.delayTime.value = STEP * 1.5;
  const fb = c.createGain();
  fb.gain.value = 0.32;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  input.connect(send);
  send.connect(delay);
  delay.connect(lp);
  lp.connect(fb);
  fb.connect(delay);
  lp.connect(output);
  return send;
}

function wavBlob(data, sampleRate) {
  const n = data.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    v.setInt16(44 + i * 2, s * 32767, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// Toca la cajita dos vueltas fuera de pantalla y se queda con la segunda:
// así el final de cada vuelta se funde con el principio y el bucle no tiene corte.
async function renderMusicBox() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return null;
  const sr = 32000;
  const loopLen = Math.round(sr * STEP * STEPS);
  const c = new OAC(1, loopLen * 2, sr);
  const bus = c.createGain();
  bus.gain.value = 1;
  bus.connect(c.destination);
  addEcho(c, bus, c.destination);
  for (let s = 0; s < STEPS * 2; s++) {
    const bar = Math.floor(s / 6) % 8, i = s % 6, t = s * STEP;
    bell(c, midi(ARP[bar][i]), t, i === 0 ? 0.075 : 0.05, 1.3, bus);
    if (MEL[bar][i]) bell(c, midi(MEL[bar][i]), t, 0.085, 1.9, bus);
    if (i === 0) bell(c, midi(BASS[bar]), t, 0.11, 2.2, bus);
  }
  const rendered = await new Promise((resolve, reject) => {
    c.oncomplete = (e) => resolve(e.renderedBuffer);
    const p = c.startRendering();
    if (p && p.then) p.then(resolve, reject);
  });
  const data = rendered.getChannelData(0).slice(loopLen, loopLen * 2);
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak < 1e-4) return null;
  const k = 0.42 / peak; // música de fondo: presente pero suave
  for (let i = 0; i < data.length; i++) data[i] *= k;
  return { blob: wavBlob(data, sr), seconds: loopLen / sr, peak };
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('olivia-mute') === '1'; } catch { /* sin almacenamiento */ }

    // En iPhone: tratar el sonido como "reproducción" para que no lo calle el modo silencio.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* no disponible */ }

    this.el = new Audio();
    this.el.loop = true;
    this.el.preload = 'auto';
    this.el.muted = this.muted;
    this.el.setAttribute('playsinline', '');
    // Un instante de silencio para poder "desbloquear" el reproductor en el primer toque,
    // aunque la música aún no haya terminado de prepararse.
    this.el.src = URL.createObjectURL(wavBlob(new Float32Array(4000), 8000));
    this.activated = false;
    this.musicUrl = '';
    this.musicOn = false;
    this.info = { source: 'pendiente' };
    this.prepare();
  }

  async prepare() {
    try {
      if (MUSIC_FILE) {
        this.musicUrl = MUSIC_FILE;
        this.info = { source: MUSIC_FILE };
      } else {
        const r = await renderMusicBox();
        if (!r) { this.info = { source: 'sin música' }; return; }
        this.musicUrl = URL.createObjectURL(r.blob);
        this.info = { source: 'cajita de música', seconds: r.seconds, peak: r.peak };
      }
      this.useMusic();
    } catch (e) {
      this.info = { source: 'error', message: String(e) };
    }
  }

  useMusic() {
    if (!this.musicUrl || this.musicOn) return;
    this.musicOn = true;
    this.el.src = this.musicUrl;
    if (this.activated && !document.hidden) this.el.play().catch(() => {});
  }

  // Debe llamarse dentro de un toque del usuario (requisito de iOS/Android).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try {
          this.ctx = new AC();
          const c = this.ctx;
          this.master = c.createGain();
          this.master.gain.value = this.muted ? 0 : 1;
          const comp = c.createDynamicsCompressor();
          comp.threshold.value = -14;
          comp.ratio.value = 4;
          this.master.connect(comp);
          comp.connect(c.destination);
          this.send = addEcho(c, c.createGain(), this.master);
        } catch { this.ctx = null; }
      }
    }
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (this.el.paused && !document.hidden) {
      const p = this.el.play();
      if (p && p.then) p.then(() => { this.activated = true; }).catch(() => {});
      else this.activated = true;
    }
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('olivia-mute', m ? '1' : '0'); } catch { /* nada */ }
    this.el.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  pause() {
    this.el.pause();
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.activated) this.el.play().catch(() => {});
  }

  fx(freq, vol = 0.2, dur = 0.7, delay = 0) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    bell(c, freq, t, vol, dur, this.master);
    bell(c, freq, t, vol * 0.5, dur, this.send);
  }

  // Cada florecita sube por la escala pentatónica.
  chime(n) {
    const scale = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];
    const m = scale[Math.min(n, scale.length - 1)];
    this.fx(midi(m), 0.26, 0.6);
    this.fx(midi(m + 12), 0.1, 0.4, 0.05);
  }

  paint() { this.fx(midi(96), 0.06, 0.3); }

  wake() {
    [72, 76, 79, 84, 88].forEach((m, i) => this.fx(midi(m), 0.2, 0.8, i * 0.085));
  }

  win() {
    [72, 76, 79, 84, 79, 84, 88, 91, 96].forEach((m, i) => this.fx(midi(m), 0.2, 1.1, i * 0.1));
    [60, 64, 67].forEach((m) => this.fx(midi(m), 0.12, 2.2, 0.9));
  }

  tap() { this.fx(midi(84 + Math.floor(Math.random() * 5) * 2), 0.11, 0.35); }

  giggle() {
    [88, 91, 88, 93].forEach((m, i) => this.fx(midi(m), 0.13, 0.25, i * 0.07));
  }

  pop() {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
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
    this.fx(midi(91 + Math.floor(Math.random() * 3) * 2), 0.08, 0.4, 0.03);
  }
}
