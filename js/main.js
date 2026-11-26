import {
  RAINBOW, buildSprites, buildBear, buildBalloon, blit, resetCtx, drawSun, bearEyes, PAL,
} from './art.js';
import { Sound } from './audio.js';

// ───────────── Datos del evento ─────────────
const EVENT = new Date(2026, 11, 19, 0, 0, 0); // Sábado 19 de diciembre de 2026
const GOAL = 10; // florecitas para pintar el arcoíris

const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

const bg = $('#bg'), fx = $('#fx');
const bctx = bg.getContext('2d'), fctx = fx.getContext('2d');
const el = {
  title: $('#title'), hud: $('#hud'), hudN: $('#hudN'), mission: $('#mission'), hint: $('#hint'),
  toast: $('#toast'), skip: $('#btnSkip'), mute: $('#btnMute'), invite: $('#invite'), card: $('#card'),
  sunTop: $('#sunTop'), osita: $('#osita'), countdown: $('#countdown'), today: $('#today'),
  cd: [$('#cdD'), $('#cdH'), $('#cdM'), $('#cdS')],
};
$('#hudGoal').textContent = GOAL;

const sound = new Sound();

let W = 0, H = 0, K = 1, U = 1, S = null;
let scene = 'title', sceneT = 0, T = 0;
let dawnA = 1;
let collected = 0;
let fxDirty = false;
let winDone = false;

const clouds = [], stars = [], balloons = [], flowers = [], comets = [], drift = [], parts = [];
const rb = { cx: 0, cy: 0, R: 0, shown: 0, target: 0, ghost: 0, alpha: 1 };
const sun = {
  x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, r: 10, rT: 10, rot: 0, spin: 0, tilt: 0,
  sq: 0, sqV: 0, mood: 'sleep', happy: 0, blink: 0, blinkT: 2, alpha: 1, trail: 0, placed: false,
};
const ptr = { x: 0, y: 0, down: false, touch: false, t: -99 };
const timers = { flower: 0, balloon: 1.5, zz: 0.6, drift: 0, cd: 0 };

// Mascotas de la tarjeta (lienzos pequeños que viajan con el scroll)
const top = { ctx: el.sunTop.getContext("2d"), happy: 0, spin: 0, spinAcc: 0, blink: 0, blinkT: 2.5, pop: 0 };
const bear = { ctx: el.osita.getContext('2d'), sprite: null, balloon: null, happy: 0, jump: 0, jumpV: 0, blink: 0, blinkT: 3 };
const BEAR_H = 112;

// ───────────── Tamaño y sprites ─────────────
function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  let d = Math.min(window.devicePixelRatio || 1, 2) * quality;
  const maxPx = 2.8e6;
  if (W * H * d * d > maxPx) d = Math.sqrt(maxPx / (W * H));
  K = d;
  for (const c of [bg, fx]) {
    c.width = Math.round(W * K);
    c.height = Math.round(H * K);
  }
  U = Math.min(W, H * 0.62) / 100;
  S = buildSprites(U, K, W, H);

  rb.cx = W / 2;
  rb.R = Math.min(W * 0.43, H * 0.3);
  rb.cy = H - S.hillH * 0.66;

  if (!clouds.length) {
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: rand(-0.1, 1.1) * W, y: [0.1, 0.22, 0.34, 0.5, 0.62, 0.74][i] + rand(-0.03, 0.03),
        s: rand(0.45, 1), v: rand(4, 11), k: i % 2, a: rand(0.75, 0.95),
      });
    }
    for (let i = 0; i < 30; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.7, s: rand(0.4, 1.1), f: rand(1, 2.6), p: rand(0, TAU) });
    }
  }
  if (!sun.placed) {
    sun.x = W / 2; sun.y = H * 0.47; sun.r = sun.rT = U * 17; sun.placed = true;
  } else {
    sun.rT = scene === 'title' || scene === 'waking' ? U * 17 : U * 10.5;
  }

  for (const [cv, w, h] of [[el.sunTop, 190, 190], [el.osita, 150, 206]]) {
    cv.width = Math.round(w * K);
    cv.height = Math.round(h * K);
  }
  bear.sprite = buildBear(BEAR_H, K);
  bear.balloon = buildBalloon(23, K, PAL.rose);
  fxDirty = true;
}

// Si el teléfono no llega a 60 fps, baja la resolución interna (no el diseño).
let quality = 1, slowFrames = 0, qualityDrops = 0;
function watchPerf(dt) {
  if (T < 2) return;
  if (dt > 1 / 40) slowFrames++; else slowFrames = Math.max(0, slowFrames - 2);
  if (slowFrames > 60 && qualityDrops < 2) {
    quality *= 0.75;
    qualityDrops++;
    slowFrames = 0;
    resize();
  }
}

// ───────────── Partículas ─────────────
function spawn(s, x, y, vx, vy, o = {}) {
  if (parts.length > 240) return;
  parts.push({
    s, x, y, vx, vy,
    g: o.g ?? 0, drag: o.drag ?? 0, rot: o.rot ?? rand(0, TAU), vr: o.vr ?? 0,
    sc: o.sc ?? 1, life: 0, max: o.max ?? 1, flut: o.flut ?? 0, ph: rand(0, TAU), grow: o.grow ?? 0,
  });
}

function burst(x, y, n, colorIdx) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(22, 70) * U;
    const s = i % 3 === 0 ? S.dots[colorIdx ?? (i % S.dots.length)] : S.petals[colorIdx ?? (i % S.petals.length)];
    spawn(s, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 12 * U, {
      g: 70 * U, drag: 2.6, vr: rand(-8, 8), sc: rand(0.6, 1.1), max: rand(0.55, 0.95),
    });
  }
}

function sparkle(x, y, n, spread = 1) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(8, 40) * U * spread;
    spawn(S.sparks[i % S.sparks.length], x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
      drag: 3, vr: rand(-3, 3), sc: rand(0.45, 1), max: rand(0.4, 0.8),
    });
  }
}

function hearts(x, y, n) {
  for (let i = 0; i < n; i++) {
    spawn(S.hearts[i % S.hearts.length], x + rand(-6, 6) * U, y + rand(-3, 3) * U, rand(-10, 10) * U, rand(-34, -18) * U, {
      drag: 0.8, rot: rand(-0.3, 0.3), vr: rand(-0.6, 0.6), sc: rand(0.7, 1.15), max: rand(0.9, 1.5), flut: 7 * U,
    });
  }
}

function confetti(x, y, n, dir = -Math.PI / 2, spread = 1.1, power = 1) {
  for (let i = 0; i < n; i++) {
    const a = dir + rand(-spread, spread), sp = rand(60, 150) * U * power;
    const r = Math.random();
    const s = r < 0.5 ? S.petals[i % S.petals.length] : r < 0.72 ? S.dots[i % S.dots.length]
      : r < 0.88 ? S.hearts[i % S.hearts.length] : S.sparks[i % S.sparks.length];
    spawn(s, x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
      g: 95 * U, drag: 1.5, vr: rand(-9, 9), sc: rand(0.7, 1.25), max: rand(1.6, 2.8), flut: 9 * U,
    });
  }
}

function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.max) {
      parts[i] = parts[parts.length - 1];
      parts.pop();
      continue;
    }
    const d = Math.max(0, 1 - p.drag * dt);
    p.vx *= d;
    p.vy = p.vy * d + p.g * dt;
    p.x += (p.vx + Math.sin(p.ph + p.life * 7) * p.flut) * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
}

// ───────────── Interfaz ─────────────
let toastTimer = 0;
function toast(text, small = false) {
  el.toast.textContent = text;
  el.toast.className = small ? 'small' : '';
  void el.toast.offsetWidth;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2000);
}

function buzz(ms) {
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* nada */ } }
}

function setHud() {
  el.hudN.textContent = collected;
  el.hud.classList.remove('bump');
  void el.hud.offsetWidth;
  el.hud.classList.add('bump');
}

// ───────────── Escenas ─────────────
function wake() {
  if (scene !== 'title') return;
  scene = 'waking';
  sceneT = 0;
  sound.unlock();
  sound.wake();
  buzz(18);
  document.body.classList.remove('dawn');
  el.title.classList.add('out');
  sun.mood = 'awake';
  sun.sqV = 7;
  sun.spin = 5;
  sparkle(sun.x, sun.y, 16, 2.4);
  burst(sun.x, sun.y, 14);
  el.skip.hidden = false;
}

function startPlay() {
  scene = 'play';
  sceneT = 0;
  collected = 0;
  winDone = false;
  rb.shown = rb.target = 0;
  rb.alpha = 1;
  flowers.length = 0;
  comets.length = 0;
  drift.length = 0;
  timers.flower = 0.5;
  sun.mood = 'awake';
  sun.alpha = 1;
  sun.rT = U * 10.5;
  ptr.t = -99;
  el.title.hidden = true;
  el.hud.hidden = false;
  el.hudN.textContent = '0';
  el.skip.hidden = false;
  el.mission.hidden = false;
  el.mission.classList.remove('out');
  el.hint.hidden = false;
  el.hint.classList.remove('out');
  sound.startMusic();
}

function hideGuides() {
  el.hint.classList.add('out');
}

function win() {
  scene = 'win';
  sceneT = 0;
  sun.mood = 'happy';
  sun.spin = 9;
  sun.sqV = 6;
  el.hud.hidden = true;
  el.skip.hidden = true;
  el.mission.classList.add('out');
  el.hint.classList.add('out');
  toast('¡Lo lograste!');
  sound.win();
  buzz([20, 60, 30]);
  confetti(rb.cx, rb.cy - rb.R * 0.5, 50, -Math.PI / 2, 1.3, 1.1);
}

function showInvite(fast) {
  const fromRainbow = !fast && scene === 'win';
  scene = 'invite';
  sceneT = 0;
  document.body.classList.remove('dawn');
  el.title.hidden = true;
  el.hud.hidden = true;
  el.skip.hidden = true;
  el.mission.hidden = true;
  el.hint.hidden = true;
  flowers.length = 0;
  comets.length = 0;
  timers.balloon = 0.3;
  timers.drift = 0.2;

  const inv = el.invite, card = el.card;
  inv.classList.remove('in', 'fast');
  inv.hidden = false;
  inv.scrollTop = 0;
  document.querySelectorAll('#invite .rv').forEach((n, i) => n.style.setProperty('--i', i));

  card.style.transition = 'none';
  card.style.transform = 'none';
  const r = card.getBoundingClientRect();
  if (fromRainbow) {
    // La tarjeta nace del arcoíris recién pintado y crece hasta su lugar.
    const ring = parseFloat(getComputedStyle(card).getPropertyValue('--ring')) * 5 || 30;
    const s0 = (rb.R * 2) / (r.width + ring * 2);
    const dx = rb.cx - (r.left + r.width / 2);
    const dy = rb.cy - rb.R - r.top + ring * s0;
    card.style.transform = `translate(${dx}px, ${dy}px) scale(${s0})`;
  } else {
    card.style.transform = 'translateY(40px) scale(.9)';
  }
  card.style.opacity = '0';
  void card.offsetWidth;
  card.style.transition = 'transform .95s cubic-bezier(.22, 1.18, .36, 1), opacity .3s ease';
  card.style.transform = 'none';
  card.style.opacity = '1';
  inv.classList.add('in');
  if (!fromRainbow) inv.classList.add('fast');
  top.pop = 1;
  sound.unlock();
  sound.startMusic();
  updateCountdown();
}

function replay() {
  el.invite.hidden = true;
  el.invite.classList.remove('in', 'fast');
  balloons.length = 0;
  sun.x = W / 2;
  sun.y = H * 0.45;
  sun.vx = sun.vy = 0;
  sun.sqV = 6;
  startPlay();
  el.title.hidden = true;
}

// ───────────── Actualización ─────────────
function updateSun(dt) {
  const s = sun;
  let k = 60;
  if (scene === 'title' || scene === 'waking') {
    s.tx = W / 2;
    s.ty = H * 0.47 + Math.sin(T * 1.3) * U * 1.6;
    k = 30;
  } else if (scene === 'play') {
    const manual = ptr.down || T - ptr.t < 2.4;
    if (manual) {
      s.tx = ptr.x;
      s.ty = ptr.y - (ptr.touch ? s.r * 1.55 : 0);
      k = 150;
    } else if (sceneT > 3.8 || collected > 0) {
      // piloto automático: si nadie toca, el Solcito juega solo
      let best = null, bd = 1e9;
      for (const f of flowers) {
        if (f.got || f.y > H - S.hillH * 0.9 || f.y < 0) continue;
        const d = Math.hypot(f.x - s.x, f.y - s.y);
        if (d < bd) { bd = d; best = f; }
      }
      if (best) { s.tx = best.x; s.ty = best.y + best.vy * 0.3; }
      else { s.tx = W / 2 + Math.sin(T * 0.8) * W * 0.22; s.ty = H * 0.4 + Math.sin(T * 1.3) * H * 0.05; }
      k = 22;
    } else {
      s.tx = W / 2 + Math.sin(T * 1.1) * W * 0.06;
      s.ty = H * 0.45 + Math.sin(T * 1.6) * U * 2;
      k = 30;
    }
    s.tx = clamp(s.tx, s.r * 0.9, W - s.r * 0.9);
    s.ty = clamp(s.ty, s.r + 50, H - S.hillH * 0.55);
  } else if (scene === 'win') {
    s.tx = rb.cx;
    s.ty = rb.cy - rb.R - s.r * 1.9 + Math.sin(T * 5) * U;
    k = 40;
  } else {
    s.ty = -s.r * 3;
    k = 30;
  }
  const damp = 2 * Math.sqrt(k) * 0.82;
  s.vx += (k * (s.tx - s.x) - damp * s.vx) * dt;
  s.vy += (k * (s.ty - s.y) - damp * s.vy) * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;

  s.r += (s.rT - s.r) * (1 - Math.exp(-dt * 5));
  s.spin *= Math.exp(-dt * 2.2);
  s.rot += dt * ((s.mood === 'sleep' ? 0.07 : 0.3) + s.spin);
  const tiltT = clamp(s.vx / (U * 260), -0.32, 0.32);
  s.tilt += (tiltT - s.tilt) * (1 - Math.exp(-dt * 10));
  s.sqV += (-s.sq * 220 - s.sqV * 13) * dt;
  s.sq += s.sqV * dt;
  if (s.happy > 0) { s.happy -= dt; if (s.happy <= 0 && scene === 'play') s.mood = 'awake'; }
  s.blinkT -= dt;
  if (s.blinkT < 0) { s.blink = 1; if (s.blinkT < -0.13) { s.blink = 0; s.blinkT = rand(1.8, 4.2); } }
  const aT = scene === 'invite' ? 0 : 1;
  s.alpha += (aT - s.alpha) * (1 - Math.exp(-dt * 7));

  if (scene === 'play' || scene === 'win') {
    s.trail += Math.hypot(s.vx, s.vy) * dt;
    if (s.trail > U * 9) {
      s.trail = 0;
      spawn(S.sparks[(Math.random() * 3) | 0], s.x + rand(-1, 1) * s.r, s.y + rand(-1, 1) * s.r, 0, 6 * U, {
        sc: rand(0.35, 0.7), max: rand(0.4, 0.7), vr: rand(-2, 2),
      });
    }
  }
}

function tipOf(n) {
  const bw = rb.R * 0.13;
  const band = n >> 1, half = n & 1;
  const r = rb.R - bw * (band + 0.5);
  const a = Math.PI + half * (Math.PI / 2) + 0.12;
  return [rb.cx + Math.cos(a) * r, rb.cy + Math.sin(a) * r];
}

function collect(f) {
  f.got = true;
  const n = collected;
  collected++;
  setHud();
  sound.chime(n);
  buzz(12);
  sun.mood = 'happy';
  sun.happy = 0.55;
  sun.sqV = 5.5;
  sun.spin = Math.max(sun.spin, 2.5);
  burst(f.x, f.y, 10, f.k);
  sparkle(f.x, f.y, 5);
  if (n % 3 === 0) hearts(f.x, f.y, 1);
  const [tx, ty] = tipOf(n);
  comets.push({ k: f.k, x0: f.x, y0: f.y, x1: tx, y1: ty, cx: (f.x + tx) / 2 + rand(-0.2, 0.2) * W, cy: Math.min(f.y, ty) - H * 0.14, t: 0, n, x: f.x, y: f.y });
  if (collected === 1) { el.mission.classList.add('out'); hideGuides(); }
  if (collected === 5) toast('¡Qué bonito!', true);
  if (collected === 8) toast('¡Ya casi!', true);
}

function updatePlay(dt) {
  if (sceneT > 7) { el.mission.classList.add('out'); hideGuides(); }
  timers.flower -= dt;
  const pending = GOAL - collected;
  if (timers.flower <= 0 && pending > 0 && flowers.length < 5) {
    timers.flower = rand(0.6, 0.95);
    const x0 = rand(0.12, 0.88) * W;
    flowers.push({
      k: (Math.random() * S.flowers.length) | 0, x0, x: x0, y: -S.flowerR * 1.6,
      vy: H / rand(5.4, 7.2), ph: rand(0, TAU), amp: rand(0.02, 0.07) * W,
      rot: rand(0, TAU), vr: rand(-1.4, 1.4), age: 0, got: false, sc: 1,
    });
  }
  const sr = sun.r;
  for (let i = flowers.length - 1; i >= 0; i--) {
    const f = flowers[i];
    f.age += dt;
    f.y += f.vy * dt;
    f.x = f.x0 + Math.sin(f.ph + f.age * 1.5) * f.amp;
    f.rot += f.vr * dt;
    const dx = sun.x - f.x, dy = sun.y - f.y, d = Math.hypot(dx, dy);
    // imán suave: las flores se acercan solitas cuando el Solcito pasa cerca
    if (d < sr * 3.2 && d > 1) {
      const pull = (1 - d / (sr * 3.2)) * 520 * U * dt / d;
      f.x0 += dx * pull * 0.12;
      f.y += dy * pull * 0.12;
    }
    const ground = H - S.hillH * 0.55;
    if (f.y > ground) f.sc = Math.max(0, 1 - (f.y - ground) / (S.hillH * 0.3));
    if (d < sr * 1.05 + S.flowerR * 0.8 && collected < GOAL) {
      collect(f);
      flowers.splice(i, 1);
    } else if (f.sc <= 0) {
      flowers.splice(i, 1);
    }
  }
  // el Solcito revienta globos al pasar
  for (const b of balloons) {
    if (!b.dead && Math.hypot(b.x - sun.x, b.y - sun.y) < sr + S.balloonR * b.sc * 0.9) popBalloon(b);
  }
}

function updateComets(dt) {
  for (let i = comets.length - 1; i >= 0; i--) {
    const c = comets[i];
    c.t += dt / 0.6;
    const t = Math.min(1, c.t), e = t * t * (3 - 2 * t), m = 1 - e;
    c.x = m * m * c.x0 + 2 * m * e * c.cx + e * e * c.x1;
    c.y = m * m * c.y0 + 2 * m * e * c.cy + e * e * c.y1;
    if (Math.random() < dt * 40) {
      spawn(S.sparks[(Math.random() * 3) | 0], c.x, c.y, rand(-4, 4) * U, rand(-4, 4) * U, { sc: rand(0.35, 0.75), max: 0.45 });
    }
    if (c.t >= 1) {
      rb.target = Math.max(rb.target, c.n + 1);
      sparkle(c.x1, c.y1, 6);
      sound.paint();
      comets.splice(i, 1);
    }
  }
}

function updateRainbow(dt) {
  const gT = scene === 'play' || scene === 'win' ? 1 : 0;
  rb.ghost += (gT - rb.ghost) * (1 - Math.exp(-dt * 3));
  if (rb.shown < rb.target) {
    rb.shown = Math.min(rb.target, rb.shown + dt * 2.6);
    if (Math.random() < dt * 30) {
      const band = Math.min(4, Math.floor(rb.shown / 2));
      const f = clamp(rb.shown / 2 - band, 0, 1);
      const r = rb.R - rb.R * 0.13 * (band + 0.5), a = Math.PI + f * Math.PI;
      sparkle(rb.cx + Math.cos(a) * r, rb.cy + Math.sin(a) * r, 1, 0.6);
    }
  }
  if (scene === 'play' && !winDone && collected >= GOAL && rb.shown >= GOAL - 0.001) {
    winDone = true;
    win();
  }
  const aT = scene === 'invite' ? 0 : 1;
  rb.alpha += (aT - rb.alpha) * (1 - Math.exp(-dt * 6));
}

function updateWin() {
  if (sceneT > 0.35 && sceneT < 0.4) confetti(rb.cx - rb.R * 0.8, rb.cy - rb.R * 0.2, 6, -1.1, 0.5, 1.2);
  if (sceneT > 0.55 && sceneT < 0.6) confetti(rb.cx + rb.R * 0.8, rb.cy - rb.R * 0.2, 6, -2.0, 0.5, 1.2);
  if (sceneT > 1.7) {
    showInvite(false);
    confetti(W * 0.5, H * 0.3, 40, -Math.PI / 2, 1.5, 0.9);
  }
}

function spawnBalloon(yStart) {
  const side = Math.random();
  const x = side < 0.4 ? rand(0.02, 0.16) * W : side < 0.8 ? rand(0.84, 0.98) * W : rand(0.2, 0.8) * W;
  balloons.push({
    x0: x, x, y: yStart ?? H + S.balloonR * 2, vy: rand(20, 34) * U * 0.42,
    ph: rand(0, TAU), f: rand(0.7, 1.3), amp: rand(1.5, 4) * U, k: (Math.random() * S.balloons.length) | 0,
    sc: rand(0.7, 1.1), dead: false, age: 0,
  });
}

function popBalloon(b) {
  b.dead = true;
  burst(b.x, b.y, 14, b.k % S.petals.length);
  sparkle(b.x, b.y, 6, 1.4);
  hearts(b.x, b.y, 2);
  sound.pop();
  buzz(10);
}

function updateBalloons(dt) {
  timers.balloon -= dt;
  const max = scene === 'invite' ? 7 : scene === 'play' ? 2 : 3;
  if (timers.balloon <= 0 && balloons.length < max && scene !== 'win') {
    timers.balloon = scene === 'invite' ? rand(1.1, 2.2) : rand(2.5, 4.5);
    spawnBalloon();
  }
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    b.age += dt;
    b.y -= b.vy * dt;
    b.x = b.x0 + Math.sin(T * b.f + b.ph) * b.amp;
    if (b.dead || b.y < -S.balloonR * 5) balloons.splice(i, 1);
  }
}

function updateDrift(dt) {
  // florecitas que caen despacio detrás de la invitación
  timers.drift -= dt;
  if (timers.drift <= 0 && drift.length < 7) {
    timers.drift = rand(0.9, 1.8);
    drift.push({
      k: (Math.random() * S.flowers.length) | 0, x0: rand(0, 1) * W, y: -S.flowerR, vy: H / rand(11, 16),
      ph: rand(0, TAU), amp: rand(0.03, 0.08) * W, rot: rand(0, TAU), vr: rand(-0.8, 0.8), sc: rand(0.4, 0.75), age: 0,
    });
  }
  for (let i = drift.length - 1; i >= 0; i--) {
    const f = drift[i];
    f.age += dt;
    f.y += f.vy * dt;
    f.rot += f.vr * dt;
    if (f.y > H - S.hillH * 0.5) drift.splice(i, 1);
  }
}

function updateMascots(dt) {
  for (const m of [top, bear]) {
    if (m.happy > 0) m.happy -= dt;
    m.blinkT -= dt;
    if (m.blinkT < 0) { m.blink = 1; if (m.blinkT < -0.13) { m.blink = 0; m.blinkT = rand(2, 4.5); } }
  }
  top.spin *= Math.exp(-dt * 2);
  top.pop *= Math.exp(-dt * 4);
  bear.jumpV += 900 * dt;
  bear.jump = Math.min(0, bear.jump + bear.jumpV * dt);
  if (bear.jump === 0) bear.jumpV = 0;
}

function updateCountdown() {
  const ms = EVENT.getTime() - Date.now();
  if (ms <= 0) {
    el.countdown.hidden = true;
    el.today.hidden = ms < -864e5;
    return;
  }
  const s = Math.floor(ms / 1000);
  const v = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
  for (let i = 0; i < 4; i++) {
    const txt = i === 0 ? String(v[i]) : String(v[i]).padStart(2, '0');
    if (el.cd[i].textContent !== txt) el.cd[i].textContent = txt;
  }
}

function update(dt) {
  dawnA += ((scene === 'title' ? 1 : 0) - dawnA) * (1 - Math.exp(-dt * 1.6));
  for (const c of clouds) {
    c.x += c.v * dt * (U / 4);
    const w = S.clouds[0].w * c.s;
    if (c.x - w / 2 > W) c.x = -w / 2;
  }
  updateBalloons(dt);
  if (scene === 'title') {
    timers.zz -= dt;
    if (timers.zz <= 0) {
      timers.zz = 0.95;
      spawn(S.zz, sun.x + sun.r * 0.95, sun.y - sun.r * 0.9, 7 * U, -11 * U, { rot: -0.2, vr: 0.25, sc: rand(0.7, 1.2), max: 2.4, flut: 3 * U });
    }
  } else if (scene === 'waking') {
    if (sceneT > 1.05) startPlay();
  } else if (scene === 'play') {
    updatePlay(dt);
  } else if (scene === 'win') {
    updateWin();
  } else if (scene === 'invite') {
    updateDrift(dt);
    updateMascots(dt);
    timers.cd -= dt;
    if (timers.cd <= 0) { timers.cd = 0.25; updateCountdown(); }
  }
  updateComets(dt);
  updateRainbow(dt);
  updateSun(dt);
  updateParts(dt);
}

// ───────────── Dibujo ─────────────
function drawRainbow(c) {
  if (rb.alpha < 0.01) return;
  const bw = rb.R * 0.13;
  for (let i = 0; i < 5; i++) {
    const r = rb.R - bw * (i + 0.5);
    if (rb.ghost > 0.01) {
      c.globalAlpha = rb.ghost * 0.36 * rb.alpha;
      c.strokeStyle = '#fff';
      c.lineWidth = bw * 0.86;
      c.lineCap = 'butt';
      c.beginPath();
      c.arc(rb.cx, rb.cy, r, Math.PI, TAU);
      c.stroke();
    }
    const f = clamp(rb.shown / 2 - i, 0, 1);
    if (f > 0) {
      c.globalAlpha = rb.alpha;
      c.strokeStyle = RAINBOW[i];
      c.lineWidth = bw * 1.03;
      c.lineCap = f < 1 ? 'round' : 'butt';
      c.beginPath();
      c.arc(rb.cx, rb.cy, r, Math.PI, Math.PI + f * Math.PI);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
}

function render() {
  const c = bctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, bg.width, bg.height);

  if (dawnA > 0.02) {
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(T * s.f + s.p);
      blit(c, K, S.star, s.x * W, s.y * H, 0, s.s * (0.7 + 0.3 * tw), s.s * (0.7 + 0.3 * tw), dawnA * (0.25 + 0.75 * tw));
    }
  }
  for (const cl of clouds) blit(c, K, S.clouds[cl.k], cl.x, cl.y * H, 0, cl.s, cl.s, cl.a);

  resetCtx(c, K);
  drawRainbow(c);

  for (const f of drift) {
    blit(c, K, S.flowers[f.k], f.x0 + Math.sin(f.ph + f.age * 1.1) * f.amp, f.y, f.rot, f.sc, f.sc, 0.9);
  }
  for (const b of balloons) {
    const inS = Math.min(1, b.age * 3);
    blit(c, K, S.balloons[b.k], b.x, b.y, Math.sin(T * b.f + b.ph + 1.2) * 0.1, b.sc * inS, b.sc * inS, 1);
  }
  blit(c, K, S.hills, 0, H - S.hillH);

  for (const f of flowers) {
    const pop = Math.min(1, f.age * 4) * f.sc;
    blit(c, K, S.flowers[f.k], f.x, f.y, f.rot, pop, pop, 1);
  }
  for (const m of comets) {
    const sc = 0.75 - 0.4 * Math.min(1, m.t);
    blit(c, K, S.flowers[m.k], m.x, m.y, m.t * 9, sc, sc, 1);
  }
  if (sun.alpha > 0.01) {
    drawSun(c, K, S, sun.x, sun.y, sun.r, {
      rot: sun.rot, tilt: sun.tilt, sx: 1 + sun.sq, sy: 1 - sun.sq, mood: sun.mood, blink: sun.blink,
      glow: 1 + Math.sin(T * 2.1) * 0.05, rays: 1 + sun.sq * 0.6 + (sun.mood === 'sleep' ? Math.sin(T * 1.3) * 0.02 : 0),
      alpha: sun.alpha,
    });
  }
  resetCtx(c, K);

  if (parts.length || fxDirty) {
    const f = fctx;
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.clearRect(0, 0, fx.width, fx.height);
    for (const p of parts) {
      const t = p.life / p.max;
      const a = t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
      const sc = p.sc * (t < 0.12 ? t / 0.12 : 1) * (0.75 + 0.25 * a);
      blit(f, K, p.s, p.x, p.y, p.rot, sc, sc, a);
    }
    resetCtx(f, K);
    fxDirty = parts.length > 0;
  }

  if (scene === 'invite') renderMascots();
}

function renderMascots() {
  // Solcito asomado sobre el arco
  let c = top.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, el.sunTop.width, el.sunTop.height);
  const happy = top.happy > 0;
  drawSun(c, K, S, 95, 95 + Math.sin(T * 1.7) * 2, 33 * (1 + top.pop * 0.25), {
    rot: T * 0.28 + top.spinAcc, mood: happy ? 'happy' : 'awake', blink: top.blink,
    glow: 1 + Math.sin(T * 2.1) * 0.05, tilt: Math.sin(T * 1.1) * 0.06,
  });
  top.spinAcc = (top.spinAcc || 0) + top.spin * 0.016;

  // Osita con su globo
  c = bear.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, el.osita.width, el.osita.height);
  const bx = 60, by = 198 + bear.jump;
  const sway = Math.sin(T * 1.5);
  const rot = sway * 0.035;
  const h = BEAR_H;
  // globo e hilo
  const pawX = bx + h * 0.3, pawY = by - h * 0.49 + Math.sin(T * 3) * 0.6;
  const balX = bx + h * 0.5 + Math.sin(T * 1.2) * 4, balY = by - h * 1.42 + Math.sin(T * 1.9) * 3 - bear.jump * 0.3;
  resetCtx(c, K);
  c.strokeStyle = 'rgba(176,128,146,.85)';
  c.lineWidth = 1.3;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(pawX, pawY);
  c.quadraticCurveTo(pawX + 9 + Math.sin(T * 1.2) * 3, (pawY + balY) / 2 + 16, balX, balY + 31);
  c.stroke();
  blit(c, K, bear.balloon, balX, balY, Math.sin(T * 1.2) * 0.08);
  blit(c, K, bear.sprite, bx, by, rot, 1 + (bear.jump < 0 ? 0.03 : 0), 1 - (bear.jump < 0 ? 0.03 : 0) + Math.sin(T * 2.2) * 0.012);
  // la transformación de la osita sigue activa: dibuja los ojitos encima
  bearEyes(c, h, bear.blink, bear.happy > 0);
  resetCtx(c, K);
}

// ───────────── Entrada ─────────────
function setPtr(e) {
  ptr.x = e.clientX;
  ptr.y = e.clientY;
  ptr.touch = e.pointerType !== 'mouse';
  ptr.t = T;
}

window.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (scene === 'play') {
    ptr.down = true;
    setPtr(e);
    hideGuides();
  } else if (scene === 'invite') {
    if (e.target.closest('a, button, #sunTop, #osita')) return;
    const overCard = e.target.closest('.card, .foot');
    if (!overCard) {
      for (const b of balloons) {
        if (!b.dead && Math.hypot(b.x - e.clientX, b.y - e.clientY) < S.balloonR * b.sc * 1.5 + 8) {
          popBalloon(b);
          return;
        }
      }
    }
    sparkle(e.clientX, e.clientY, 6, 1.2);
    burst(e.clientX, e.clientY, 5);
    if (!overCard) { hearts(e.clientX, e.clientY, 1); sound.tap(); }
  }
});
window.addEventListener('pointermove', (e) => {
  if (scene !== 'play') return;
  if (e.pointerType === 'mouse' || ptr.down) setPtr(e);
});
const release = (e) => {
  sound.unlock();
  if (ptr.down) { ptr.down = false; ptr.t = T; }
  if (scene === 'title' && e.type === 'pointerup') wake();
};
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
window.addEventListener('keydown', (e) => {
  if (scene === 'title' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); wake(); }
});
$('#btnStart').addEventListener('click', () => { sound.unlock(); wake(); });

el.skip.addEventListener('click', (e) => {
  e.stopPropagation();
  if (scene === 'play' || scene === 'waking') showInvite(true);
});
el.skip.addEventListener('pointerdown', (e) => e.stopPropagation());
el.skip.addEventListener('pointerup', (e) => e.stopPropagation());

function syncMute() { el.mute.setAttribute('aria-pressed', sound.muted ? 'true' : 'false'); }
el.mute.addEventListener('click', (e) => {
  e.stopPropagation();
  sound.unlock();
  sound.setMuted(!sound.muted);
  syncMute();
});
el.mute.addEventListener('pointerdown', (e) => e.stopPropagation());
el.mute.addEventListener('pointerup', (e) => e.stopPropagation());
syncMute();

el.sunTop.addEventListener('click', () => {
  top.happy = 1.2;
  top.spin = 9;
  top.pop = 1;
  const r = el.sunTop.getBoundingClientRect();
  hearts(r.left + r.width / 2, r.top + r.height / 2, 4);
  sparkle(r.left + r.width / 2, r.top + r.height / 2, 10, 2);
  sound.giggle();
  buzz(12);
});
el.osita.addEventListener('click', () => {
  bear.happy = 1.2;
  if (bear.jump === 0) bear.jumpV = -210;
  const r = el.osita.getBoundingClientRect();
  hearts(r.left + r.width * 0.4, r.top + r.height * 0.55, 4);
  sound.giggle();
  buzz(12);
});

$('#btnReplay').addEventListener('click', replay);

const shareBtn = $('#btnShare');
if (navigator.share) {
  shareBtn.hidden = false;
  shareBtn.addEventListener('click', () => {
    navigator.share({
      title: 'Baby Shower de Olivia Victoria',
      text: '¡Estás invitado al Baby Shower de Olivia Victoria! Sábado 19 de Diciembre.',
      url: location.href,
    }).catch(() => {});
  });
}

// En Android/escritorio el calendario de Google abre directo; en iPhone/Mac se usa el .ics.
if (!/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)) {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Baby Shower de Olivia Victoria',
    dates: '20261219/20261220',
    location: 'Residencial Sierras Doradas, Casa D-5',
    details: 'Baby Shower de Olivia Victoria Vargas Arce. Cómo llegar: https://maps.app.goo.gl/cN2Evq2ijcGLDnuL6',
  });
  const cal = $('#btnCal');
  cal.href = `https://calendar.google.com/calendar/render?${q}`;
  cal.target = '_blank';
  cal.rel = 'noopener';
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) sound.pause();
  else { sound.resume(); last = 0; }
});
document.addEventListener('contextmenu', (e) => { if (!e.target.closest('a')) e.preventDefault(); });
document.addEventListener('gesturestart', (e) => e.preventDefault());

let resizeRaf = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    if (window.innerWidth !== W || window.innerHeight !== H) resize();
  });
});

// ───────────── Bucle principal ─────────────
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!last) { last = now; return; }
  let dt = (now - last) / 1000;
  last = now;
  if (dt <= 0) return;
  watchPerf(dt);
  if (dt > 0.05) dt = 0.05;
  T += dt;
  sceneT += dt;
  update(dt);
  render();
}

resize();
requestAnimationFrame(frame);

// Para pruebas: permite saltar directo a una escena con ?escena=invitacion
const q = new URLSearchParams(location.search).get('escena');
if (q === 'invitacion') showInvite(true);
if (q === 'juego') { document.body.classList.remove('dawn'); sun.mood = 'awake'; startPlay(); }
window.__game = { get scene() { return scene; }, get collected() { return collected; }, sun, ptr };
