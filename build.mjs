// Paso de publicación para Vercel: copia el sitio a dist/ y pone la URL absoluta
// en la imagen de vista previa (WhatsApp la necesita absoluta para mostrarla).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const out = 'dist';
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of ['index.html', 'css', 'js', 'fonts', 'evento.ics', 'favicon.svg', 'icon-180.png', 'og.jpg']) {
  cpSync(f, `${out}/${f}`, { recursive: true });
}

const host = process.env.SITE_HOST || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
if (host) {
  const base = `https://${host.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  let html = readFileSync(`${out}/index.html`, 'utf8');
  html = html.replace('content="/og.jpg"', `content="${base}/og.jpg"`)
    .replace('<meta property="og:type"', `<meta property="og:url" content="${base}/">\n<meta property="og:type"`);
  writeFileSync(`${out}/index.html`, html);
  console.log(`Vista previa apuntando a ${base}/og.jpg`);
}
console.log('Sitio listo en dist/');
