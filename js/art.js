// Todo el arte de la invitación se dibuja con canvas: no hay imágenes externas.
// Cada figura se pinta una sola vez en un "sprite" y luego se copia en cada cuadro,
// que es lo que mantiene la animación a 60 fps en el celular.

export const PAL = {
  rose: '#F3B4BF',
  roseDeep: '#E7909F',
  blush: '#FAD3D9',
  cream: '#FFF8F0',
  lilac: '#CFBCE9',
  lilacDeep: '#B9A2DC',
  butter: '#FCE191',
  butterDeep: '#F7D06C',
  peach: '#FBD2B6',
  sage: '#B7CEA6',
  brown: '#8A5A48',
  fur: '#E6C29F',
  furLight: '#FCEDDD',
};

// Bandas del arcoíris, de afuera hacia adentro.
export const RAINBOW = ['#EFA3B1', '#FFF6EA', '#CDB8E8', '#FCE191', '#F9C9D1'];

const TAU = Math.PI * 2;

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function rgba(h, a) {
  const c = hexToRgb(h);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

// ---------------------------------------------------------------- sprites

export function makeSprite(w, h, ax, ay, dpr, draw) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * dpr));
  c.height = Math.max(1, Math.ceil(h * dpr));
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.translate(ax, ay);
  draw(g, dpr);
  return { c, w, h, ax, ay };
}

// Copia un sprite con posición, giro, escala y transparencia. k = dpr del lienzo.
export function blit(ctx, k, s, x, y, rot = 0, sx = 1, sy = sx, alpha = 1) {
  if (alpha <= 0.003) return;
  if (rot) {
    const c = Math.cos(rot), n = Math.sin(rot);
    ctx.setTransform(k * c * sx, k * n * sx, -k * n * sy, k * c * sy, k * x, k * y);
  } else {
    ctx.setTransform(k * sx, 0, 0, k * sy, k * x, k * y);
  }
  ctx.globalAlpha = alpha > 1 ? 1 : alpha;
  ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h);
}

export function resetCtx(ctx, k) {
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- formas

export function heartPath(g, s) {
  g.beginPath();
  g.moveTo(0, s * 0.9);
  g.bezierCurveTo(-s * 1.35, s * 0.05, -s * 0.8, -s * 1.05, 0, -s * 0.38);
  g.bezierCurveTo(s * 0.8, -s * 1.05, s * 1.35, s * 0.05, 0, s * 0.9);
  g.closePath();
}

export function sparkPath(g, s) {
  g.beginPath();
  g.moveTo(0, -s);
  g.quadraticCurveTo(0, 0, s, 0);
  g.quadraticCurveTo(0, 0, 0, s);
  g.quadraticCurveTo(0, 0, -s, 0);
  g.quadraticCurveTo(0, 0, 0, -s);
  g.closePath();
}

function softShadow(g, dpr, color, blur, oy) {
  g.shadowColor = color;
  g.shadowBlur = blur * dpr;
  g.shadowOffsetY = oy * dpr;
}

function noShadow(g) {
  g.shadowColor = 'transparent';
  g.shadowBlur = 0;
  g.shadowOffsetY = 0;
}

export function drawFlower(g, dpr, R, petal, center, shadow = true) {
  const pr = R * 0.42, pd = R * 0.54;
  g.save();
  if (shadow) softShadow(g, dpr, 'rgba(190,110,135,.28)', R * 0.22, R * 0.08);
  // contorno blanco tipo calcomanía
  g.fillStyle = '#fff';
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * TAU;
    g.moveTo(Math.cos(a) * pd + pr * 1.12, Math.sin(a) * pd);
    g.arc(Math.cos(a) * pd, Math.sin(a) * pd, pr * 1.12, 0, TAU);
  }
  g.fill();
  noShadow(g);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * TAU;
    const px = Math.cos(a) * pd, py = Math.sin(a) * pd;
    const gr = g.createRadialGradient(px * 0.55, py * 0.55, pr * 0.1, px, py, pr);
    gr.addColorStop(0, mix(petal, '#C77C93', 0.16));
    gr.addColorStop(0.55, petal);
    gr.addColorStop(1, mix(petal, '#ffffff', 0.35));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(px, py, pr, 0, TAU);
    g.fill();
  }
  g.fillStyle = center;
  g.beginPath();
  g.arc(0, 0, R * 0.27, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.beginPath();
  g.arc(-R * 0.07, -R * 0.08, R * 0.1, 0, TAU);
  g.fill();
  g.restore();
}

function drawBalloon(g, dpr, R, color) {
  const ry = R * 1.2;
  g.save();
  // hilo
  g.strokeStyle = 'rgba(176,128,146,.75)';
  g.lineWidth = Math.max(1, R * 0.045);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, ry + R * 0.16);
  g.bezierCurveTo(R * 0.35, ry + R * 0.9, -R * 0.35, ry + R * 1.5, R * 0.05, ry + R * 2.3);
  g.stroke();
  // nudo
  g.fillStyle = mix(color, '#B26A84', 0.3);
  g.beginPath();
  g.moveTo(0, ry - R * 0.04);
  g.lineTo(-R * 0.16, ry + R * 0.2);
  g.lineTo(R * 0.16, ry + R * 0.2);
  g.closePath();
  g.fill();
  // cuerpo
  const gr = g.createRadialGradient(-R * 0.35, -ry * 0.4, R * 0.08, 0, 0, ry * 1.05);
  gr.addColorStop(0, mix(color, '#ffffff', 0.6));
  gr.addColorStop(0.45, color);
  gr.addColorStop(1, mix(color, '#B26A84', 0.22));
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(0, 0, R, ry, 0, 0, TAU);
  g.fill();
  // brillo
  g.fillStyle = 'rgba(255,255,255,.6)';
  g.beginPath();
  g.ellipse(-R * 0.42, -ry * 0.45, R * 0.13, R * 0.26, 0.5, 0, TAU);
  g.fill();
  g.restore();
}

function drawCloud(g, dpr, s, variant) {
  g.save();
  softShadow(g, dpr, 'rgba(206,150,178,.22)', s * 0.3, s * 0.12);
  const gr = g.createLinearGradient(0, -s * 0.9, 0, s * 0.6);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(1, '#FFEDF2');
  g.fillStyle = gr;
  const bumps = variant === 0
    ? [[-0.95, 0.12, 0.46], [-0.38, -0.26, 0.62], [0.3, -0.1, 0.52], [0.9, 0.16, 0.4]]
    : [[-0.8, 0.14, 0.42], [-0.2, -0.16, 0.5], [0.42, -0.3, 0.6], [1.0, 0.14, 0.44]];
  g.beginPath();
  for (const [bx, by, br] of bumps) {
    g.moveTo(bx * s + br * s, by * s);
    g.arc(bx * s, by * s, br * s, 0, TAU);
  }
  const x0 = -1.38 * s, x1 = 1.42 * s, y0 = 0.08 * s, y1 = 0.6 * s, rr = (y1 - y0) / 2;
  g.moveTo(x0 + rr, y0);
  g.lineTo(x1 - rr, y0);
  g.arc(x1 - rr, y0 + rr, rr, -Math.PI / 2, Math.PI / 2);
  g.lineTo(x0 + rr, y1);
  g.arc(x0 + rr, y0 + rr, rr, Math.PI / 2, Math.PI * 1.5);
  g.fill();
  g.restore();
}

function hillY(x, W, hh, base, amp, freq, phase) {
  return hh * base + Math.sin((x / W) * Math.PI * freq + phase) * hh * amp;
}

function drawHills(g, dpr, W, hh, seed) {
  const layers = [
    { c0: '#E3D4F3', c1: '#D5C2EC', base: 0.2, amp: 0.13, freq: 1.5, ph: 0.4 },
    { c0: '#F9CAD3', c1: '#F4B8C4', base: 0.42, amp: 0.11, freq: 2.1, ph: 2.2 },
    { c0: '#FDE9DC', c1: '#FBDCD3', base: 0.64, amp: 0.08, freq: 1.7, ph: 4.4 },
  ];
  for (const L of layers) {
    const gr = g.createLinearGradient(0, hh * (L.base - L.amp), 0, hh);
    gr.addColorStop(0, L.c0);
    gr.addColorStop(1, L.c1);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, hh);
    for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, hillY(x, W, hh, L.base, L.amp, L.freq, L.ph));
    g.lineTo(W, hh);
    g.closePath();
    g.fill();
  }
  // florecitas y hojitas sembradas en las colinas
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const kinds = [
    [PAL.rose, PAL.butter], [PAL.lilac, PAL.butter], [PAL.butter, PAL.roseDeep], ['#ffffff', PAL.butter],
  ];
  const n = Math.round(W / 34);
  for (let i = 0; i < n; i++) {
    const li = i % 3 === 0 ? 1 : 2;
    const L = layers[li];
    const x = ((i + 0.2 + rnd() * 0.6) / n) * W;
    const top = hillY(x, W, hh, L.base, L.amp, L.freq, L.ph);
    const y = top + (hh - top) * (0.16 + rnd() * 0.5);
    const R = hh * (0.045 + rnd() * 0.03) * (li === 2 ? 1.15 : 0.85);
    g.save();
    g.translate(x, y);
    // tallo y hojas
    g.strokeStyle = PAL.sage;
    g.lineWidth = Math.max(1.2, R * 0.2);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(R * 0.3, R * 1.1, 0, R * 2);
    g.stroke();
    g.fillStyle = PAL.sage;
    g.beginPath();
    g.ellipse(R * 0.55, R * 1.2, R * 0.5, R * 0.22, -0.6, 0, TAU);
    g.ellipse(-R * 0.45, R * 1.45, R * 0.45, R * 0.2, 0.6, 0, TAU);
    g.fill();
    g.rotate(rnd() * TAU);
    const kd = kinds[Math.floor(rnd() * kinds.length)];
    drawFlower(g, dpr, R, kd[0], kd[1], false);
    g.restore();
  }
}

// La osita se dibuja mirando de frente, con la patita derecha arriba (sostiene el globo).
// El origen queda en la base de las patas y mide `h` de alto.
function drawBearBody(g, dpr, h) {
  const fur = PAL.fur, light = PAL.furLight, dark = mix(PAL.fur, '#B98A6B', 0.5);
  g.save();
  g.translate(0, -h * 0.5);
  softShadow(g, dpr, 'rgba(170,110,110,.25)', h * 0.06, h * 0.025);

  const body = g.createRadialGradient(-h * 0.06, h * 0.18, h * 0.04, 0, h * 0.25, h * 0.34);
  body.addColorStop(0, mix(fur, '#ffffff', 0.25));
  body.addColorStop(1, fur);

  // patitas traseras
  g.fillStyle = fur;
  g.beginPath();
  g.ellipse(-h * 0.15, h * 0.44, h * 0.105, h * 0.075, -0.25, 0, TAU);
  g.ellipse(h * 0.15, h * 0.44, h * 0.105, h * 0.075, 0.25, 0, TAU);
  g.fill();
  // brazo izquierdo (abajo)
  g.beginPath();
  g.ellipse(-h * 0.225, h * 0.22, h * 0.062, h * 0.115, 0.5, 0, TAU);
  g.fill();
  // brazo derecho (arriba)
  g.beginPath();
  g.ellipse(h * 0.235, h * 0.1, h * 0.062, h * 0.125, 0.75, 0, TAU);
  g.fill();
  // cuerpo
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(0, h * 0.26, h * 0.215, h * 0.21, 0, 0, TAU);
  g.fill();
  noShadow(g);
  // pancita
  g.fillStyle = light;
  g.beginPath();
  g.ellipse(0, h * 0.29, h * 0.13, h * 0.135, 0, 0, TAU);
  g.fill();
  // corazón en la pancita
  g.save();
  g.translate(0, h * 0.285);
  g.fillStyle = PAL.rose;
  heartPath(g, h * 0.045);
  g.fill();
  g.restore();
  // almohadillas
  g.fillStyle = PAL.blush;
  g.beginPath();
  g.ellipse(-h * 0.16, h * 0.455, h * 0.05, h * 0.036, -0.25, 0, TAU);
  g.ellipse(h * 0.16, h * 0.455, h * 0.05, h * 0.036, 0.25, 0, TAU);
  g.fill();

  // orejas
  softShadow(g, dpr, 'rgba(170,110,110,.2)', h * 0.04, h * 0.015);
  g.fillStyle = fur;
  g.beginPath();
  g.arc(-h * 0.2, -h * 0.335, h * 0.095, 0, TAU);
  g.arc(h * 0.2, -h * 0.335, h * 0.095, 0, TAU);
  g.fill();
  noShadow(g);
  g.fillStyle = PAL.blush;
  g.beginPath();
  g.arc(-h * 0.2, -h * 0.33, h * 0.052, 0, TAU);
  g.arc(h * 0.2, -h * 0.33, h * 0.052, 0, TAU);
  g.fill();
  // cabeza
  softShadow(g, dpr, 'rgba(170,110,110,.22)', h * 0.05, h * 0.02);
  const head = g.createRadialGradient(-h * 0.08, -h * 0.24, h * 0.04, 0, -h * 0.14, h * 0.3);
  head.addColorStop(0, mix(fur, '#ffffff', 0.3));
  head.addColorStop(1, fur);
  g.fillStyle = head;
  g.beginPath();
  g.ellipse(0, -h * 0.135, h * 0.275, h * 0.24, 0, 0, TAU);
  g.fill();
  noShadow(g);
  // hocico
  g.fillStyle = light;
  g.beginPath();
  g.ellipse(0, -h * 0.065, h * 0.115, h * 0.085, 0, 0, TAU);
  g.fill();
  // nariz
  g.fillStyle = PAL.brown;
  g.beginPath();
  g.ellipse(0, -h * 0.105, h * 0.034, h * 0.024, 0, 0, TAU);
  g.fill();
  // boquita
  g.strokeStyle = PAL.brown;
  g.lineWidth = h * 0.014;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(-h * 0.028, -h * 0.07, h * 0.028, 0.1, Math.PI * 0.95);
  g.stroke();
  g.beginPath();
  g.arc(h * 0.028, -h * 0.07, h * 0.028, Math.PI * 0.05, Math.PI - 0.1);
  g.stroke();
  // mejillas
  g.fillStyle = rgba('#F59FB0', 0.6);
  g.beginPath();
  g.ellipse(-h * 0.185, -h * 0.085, h * 0.045, h * 0.03, 0, 0, TAU);
  g.ellipse(h * 0.185, -h * 0.085, h * 0.045, h * 0.03, 0, 0, TAU);
  g.fill();
  // moñito
  g.save();
  g.translate(h * 0.17, -h * 0.385);
  g.rotate(0.35);
  softShadow(g, dpr, 'rgba(170,90,110,.25)', h * 0.03, h * 0.01);
  g.fillStyle = PAL.roseDeep;
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(-h * 0.05, -h * 0.085, -h * 0.14, -h * 0.07, -h * 0.125, 0);
  g.bezierCurveTo(-h * 0.14, h * 0.07, -h * 0.05, h * 0.085, 0, 0);
  g.bezierCurveTo(h * 0.05, -h * 0.085, h * 0.14, -h * 0.07, h * 0.125, 0);
  g.bezierCurveTo(h * 0.14, h * 0.07, h * 0.05, h * 0.085, 0, 0);
  g.fill();
  noShadow(g);
  g.fillStyle = PAL.rose;
  g.beginPath();
  g.arc(0, 0, h * 0.03, 0, TAU);
  g.fill();
  g.restore();
  g.restore();
  void dark;
}

// ---------------------------------------------------------------- fábrica

export function buildSprites(u, dpr, W, H) {
  const S = {};
  const R = Math.round(u * 17); // radio de referencia del solcito
  S.sunR = R;

  // el resplandor es difuso: a media resolución se ve igual y cuesta la cuarta parte
  S.glow = makeSprite(R * 5.4, R * 5.4, R * 2.7, R * 2.7, dpr * 0.5, (g) => {
    const gr = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 2.7);
    gr.addColorStop(0, 'rgba(255,241,186,.75)');
    gr.addColorStop(0.45, 'rgba(255,236,190,.28)');
    gr.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = gr;
    g.fillRect(-R * 2.7, -R * 2.7, R * 5.4, R * 5.4);
  });

  S.rays = makeSprite(R * 3.8, R * 3.8, R * 1.9, R * 1.9, dpr, (g, d) => {
    softShadow(g, d, 'rgba(226,160,110,.3)', R * 0.1, R * 0.03);
    g.lineCap = 'round';
    g.strokeStyle = '#F9D777';
    g.lineWidth = R * 0.19;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const len = i % 2 ? 1.42 : 1.66;
      g.moveTo(Math.cos(a) * R * 1.22, Math.sin(a) * R * 1.22);
      g.lineTo(Math.cos(a) * R * len, Math.sin(a) * R * len);
    }
    g.stroke();
  });

  S.face = makeSprite(R * 2.5, R * 2.5, R * 1.25, R * 1.25, dpr, (g, d) => {
    softShadow(g, d, 'rgba(226,150,110,.35)', R * 0.14, R * 0.05);
    const gr = g.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
    gr.addColorStop(0, '#FFF4C4');
    gr.addColorStop(0.7, '#FDE7A0');
    gr.addColorStop(1, '#FBDD88');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.fill();
    noShadow(g);
    // mejillas
    for (const s of [-1, 1]) {
      const cg = g.createRadialGradient(s * R * 0.56, R * 0.2, 0, s * R * 0.56, R * 0.2, R * 0.2);
      cg.addColorStop(0, 'rgba(247,160,176,.85)');
      cg.addColorStop(0.6, 'rgba(247,160,176,.55)');
      cg.addColorStop(1, 'rgba(247,160,176,0)');
      g.fillStyle = cg;
      g.beginPath();
      g.ellipse(s * R * 0.56, R * 0.2, R * 0.2, R * 0.15, 0, 0, TAU);
      g.fill();
    }
  });

  // flores para juntar
  const fr = Math.round(u * 6.2);
  S.flowerR = fr;
  const kinds = [
    [PAL.rose, PAL.butter],
    [PAL.lilac, PAL.butter],
    [PAL.butter, PAL.roseDeep],
    ['#FFFDF8', PAL.butterDeep],
    [PAL.peach, '#FFF3C9'],
  ];
  S.flowerColors = kinds.map((k) => k[0]);
  S.flowers = kinds.map(([p, c]) =>
    makeSprite(fr * 2.8, fr * 2.8, fr * 1.4, fr * 1.4, dpr, (g, d) => drawFlower(g, d, fr, p, c)));

  // globos
  const br = Math.round(u * 6.5);
  S.balloonR = br;
  S.balloonColors = [PAL.rose, PAL.lilac, PAL.butter, PAL.peach, PAL.blush];
  S.balloons = S.balloonColors.map((c) =>
    makeSprite(br * 2.4, br * 5, br * 1.2, br * 1.4, dpr, (g, d) => drawBalloon(g, d, br, c)));

  // nubes
  const cs = Math.round(u * 11);
  S.clouds = [0, 1].map((v) =>
    makeSprite(cs * 3.6, cs * 2.4, cs * 1.8, cs * 1.2, dpr, (g, d) => drawCloud(g, d, cs, v)));

  // colinas
  const hh = Math.max(Math.round(H * 0.17), 96);
  S.hillH = hh;
  S.hills = makeSprite(W, hh, 0, 0, dpr, (g, d) => drawHills(g, d, W, hh, 7));

  // partículas
  const ps = Math.max(8, Math.round(u * 2.2));
  S.pSize = ps;
  const pcolors = [PAL.rose, PAL.lilac, PAL.butter, '#ffffff', PAL.peach, PAL.roseDeep];
  S.petals = pcolors.map((c) => makeSprite(ps * 2.4, ps * 2.4, ps * 1.2, ps * 1.2, dpr, (g) => {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(0, 0, ps, ps * 0.55, 0, 0, TAU);
    g.fill();
  }));
  S.dots = pcolors.map((c) => makeSprite(ps * 2, ps * 2, ps, ps, dpr, (g) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(0, 0, ps * 0.6, 0, TAU);
    g.fill();
  }));
  S.sparks = ['#ffffff', '#FFF2B8', '#FFD9E1'].map((c) =>
    makeSprite(ps * 3.2, ps * 3.2, ps * 1.6, ps * 1.6, dpr, (g, d) => {
      softShadow(g, d, 'rgba(255,225,150,.9)', ps * 0.5, 0);
      g.fillStyle = c;
      sparkPath(g, ps * 1.2);
      g.fill();
    }));
  S.hearts = [PAL.roseDeep, PAL.rose, PAL.lilacDeep].map((c) =>
    makeSprite(ps * 3.2, ps * 3.2, ps * 1.6, ps * 1.6, dpr, (g) => {
      g.fillStyle = '#fff';
      heartPath(g, ps * 1.18);
      g.fill();
      g.fillStyle = c;
      heartPath(g, ps * 0.95);
      g.fill();
    }));
  S.zz = makeSprite(ps * 3, ps * 3, ps * 1.5, ps * 1.5, dpr, (g) => {
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = ps * 0.34;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-ps * 0.7, -ps * 0.8);
    g.lineTo(ps * 0.7, -ps * 0.8);
    g.lineTo(-ps * 0.7, ps * 0.8);
    g.lineTo(ps * 0.7, ps * 0.8);
    g.stroke();
  });
  S.star = makeSprite(ps * 2, ps * 2, ps, ps, dpr, (g) => {
    g.fillStyle = '#fff';
    sparkPath(g, ps * 0.9);
    g.fill();
  });
  return S;
}

// Sprite de la osita para su lienzo propio (se construye aparte, con su tamaño).
export function buildBear(h, dpr) {
  return makeSprite(h * 1.0, h * 1.12, h * 0.5, h * 1.06, dpr, (g, d) => drawBearBody(g, d, h));
}

export function buildBalloon(R, dpr, color) {
  return makeSprite(R * 2.4, R * 2.8, R * 1.2, R * 1.4, dpr, (g) => {
    const ry = R * 1.2;
    g.fillStyle = mix(color, '#B26A84', 0.3);
    g.beginPath();
    g.moveTo(0, ry - R * 0.04);
    g.lineTo(-R * 0.16, ry + R * 0.2);
    g.lineTo(R * 0.16, ry + R * 0.2);
    g.closePath();
    g.fill();
    const gr = g.createRadialGradient(-R * 0.35, -ry * 0.4, R * 0.08, 0, 0, ry * 1.05);
    gr.addColorStop(0, mix(color, '#ffffff', 0.6));
    gr.addColorStop(0.45, color);
    gr.addColorStop(1, mix(color, '#B26A84', 0.22));
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(0, 0, R, ry, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath();
    g.ellipse(-R * 0.42, -ry * 0.45, R * 0.13, R * 0.26, 0.5, 0, TAU);
    g.fill();
  });
}

// ---------------------------------------------------------------- solcito

// Carita del sol: se dibuja en vectores para poder parpadear y cambiar de ánimo.
// mood: 'sleep' | 'awake' | 'happy'.  blink: 0 (abierto) … 1 (cerrado)
function sunFeatures(ctx, R, mood, blink) {
  const ex = R * 0.36, ey = -R * 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAL.brown;
  ctx.fillStyle = PAL.brown;
  ctx.lineWidth = R * 0.055;
  if (mood === 'sleep') {
    for (const s of [-1, 1]) {
      const cx = s * ex, cy = ey - R * 0.06, r = R * 0.14;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.14, Math.PI * 0.86);
      ctx.stroke();
      ctx.lineWidth = R * 0.04;
      ctx.beginPath();
      for (const a of [0.25, 0.5, 0.75]) {
        const an = Math.PI * a;
        ctx.moveTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r);
        ctx.lineTo(cx + Math.cos(an) * r * 1.42, cy + Math.sin(an) * r * 1.42);
      }
      ctx.stroke();
      ctx.lineWidth = R * 0.055;
    }
    ctx.beginPath();
    ctx.arc(0, R * 0.16, R * 0.1, Math.PI * 0.12, Math.PI * 0.88);
    ctx.stroke();
  } else if (mood === 'happy') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * ex, ey + R * 0.1, R * 0.14, Math.PI * 1.14, Math.PI * 1.86);
      ctx.stroke();
    }
    ctx.fillStyle = '#D9788C';
    ctx.beginPath();
    ctx.arc(0, R * 0.14, R * 0.2, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F7B2BF';
    ctx.beginPath();
    ctx.ellipse(0, R * 0.29, R * 0.1, R * 0.055, 0, 0, TAU);
    ctx.fill();
  } else {
    const open = 1 - blink;
    for (const s of [-1, 1]) {
      if (open < 0.15) {
        ctx.beginPath();
        ctx.moveTo(s * ex - R * 0.1, ey);
        ctx.lineTo(s * ex + R * 0.1, ey);
        ctx.stroke();
      } else {
        ctx.fillStyle = PAL.brown;
        ctx.beginPath();
        ctx.ellipse(s * ex, ey, R * 0.1, R * 0.115 * open, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s * ex - R * 0.03, ey - R * 0.045 * open, R * 0.038, 0, TAU);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(0, R * 0.1, R * 0.17, Math.PI * 0.14, Math.PI * 0.86);
    ctx.stroke();
  }
}

// o = { rot, tilt, sx, sy, mood, blink, glow, alpha }
export function drawSun(ctx, k, S, x, y, r, o) {
  const sc = r / S.sunR;
  const a = o.alpha ?? 1;
  if (a <= 0.003) return;
  const sx = sc * (o.sx ?? 1), sy = sc * (o.sy ?? 1);
  blit(ctx, k, S.glow, x, y, 0, sc * (o.glow ?? 1), sc * (o.glow ?? 1), a);
  blit(ctx, k, S.rays, x, y, o.rot ?? 0, sc * (o.rays ?? 1), sc * (o.rays ?? 1), a);
  blit(ctx, k, S.face, x, y, o.tilt ?? 0, sx, sy, a);
  // la transformación de la carita ya quedó puesta por el blit anterior
  sunFeatures(ctx, S.sunR, o.mood ?? 'awake', o.blink ?? 0);
}

// Ojos de la osita (para parpadear) en su propio lienzo.
export function bearEyes(ctx, h, blink, happy) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.brown;
  ctx.fillStyle = PAL.brown;
  ctx.lineWidth = h * 0.02;
  const ey = -h * 0.5 - h * 0.155;
  for (const s of [-1, 1]) {
    const exx = s * h * 0.115;
    if (happy) {
      ctx.beginPath();
      ctx.arc(exx, ey + h * 0.022, h * 0.03, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (blink > 0.8) {
      ctx.beginPath();
      ctx.moveTo(exx - h * 0.025, ey);
      ctx.lineTo(exx + h * 0.025, ey);
      ctx.stroke();
    } else {
      ctx.fillStyle = PAL.brown;
      ctx.beginPath();
      ctx.ellipse(exx, ey, h * 0.026, h * 0.03 * (1 - blink), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(exx - h * 0.008, ey - h * 0.011, h * 0.009, 0, TAU);
      ctx.fill();
    }
  }
}
