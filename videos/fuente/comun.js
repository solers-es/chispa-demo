// Ayudas compartidas por los dos guiones.
const { execFileSync } = require('child_process');
const fs = require('fs');
const FF = '/Users/usuario/herramientas/bin/ffmpeg';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const card = i => `#cmCard_${i}`;
const PREGEN = m => __dirname + '/privado/pregen-' + m + '.webm'; // vídeo hecho por la app aparte (pregen-video.js)

async function esperarImagenIA(h, ms = 40000) {
  await h.p.waitForFunction(() => window._posts && window._posts[0] && window._posts[0].media && window._posts[0].media.tipo === 'ia' && !window._posts[0].creando, null, { timeout: ms })
    .catch(() => console.log('   ! la imagen IA no llegó'));
}
async function esperarDescarga(h, antes, ms = 60000) {
  const t = Date.now();
  while (Date.now() - t < ms) { if (h.ultimaDescarga && h.ultimaDescarga !== antes && fs.existsSync(h.ultimaDescarga) && fs.statSync(h.ultimaDescarga).size > 1000) return h.ultimaDescarga; await sleep(300); }
  console.log('   ! no llegó la descarga del vídeo'); return null;
}
// Genera el vídeo vertical (con voz de la IA) desde la ventana «Descargar para redes» ya abierta.
async function grabarVideo(h, conCursor = true, cortar = false) {
  const antes = h.ultimaDescarga;
  if (conCursor) await h.clic('button:has-text("Descargar vídeo vertical")', { despues: 300 });
  else await h.v(() => [...document.querySelectorAll('#cmBox button')].find(b => /Descargar vídeo vertical/.test(b.innerText)).click());
  if (cortar) { await sleep(cortar); h.cortarDesde(); }
  const f = await esperarDescarga(h, antes);
  if (cortar) { await sleep(1500); h.cortarHasta(); await sleep(1200); }
  return f;
}
// Enseña el vídeo que acaba de hacer Chispa, en grande, y mete su sonido en la pista del vídeo explicativo.
async function reproducirVideo(h, fichero, maxSeg = 30) {
  if (!fichero) return;
  const wav = fichero.replace(/\.[a-z0-9]+$/, '') + '.wav';
  try { execFileSync(FF, ['-y', '-v', 'error', '-i', fichero, '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', wav]); } catch (e) { console.log('   ! sin audio en el vídeo'); }
  // El Chromium de pruebas no decodifica H.264: para enseñarlo se pasa a WebM (VP9), mismo vídeo.
  const webm = fichero.replace(/\.[a-z0-9]+$/, '') + '.webm';
  if (!fs.existsSync(webm) && webm !== fichero) execFileSync(FF, ['-y', '-v', 'error', '-i', fichero, '-an', '-c:v', 'libvpx-vp9', '-b:v', '3M', '-deadline', 'realtime', '-cpu-used', '8', webm]);
  const b64 = fs.readFileSync(webm).toString('base64');
  const dur = await h.v(b64 => new Promise(ok => {
    const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const b = new Blob([u8], { type: 'video/webm' });
    const d = document.createElement('div'); d.id = 'v-play';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483643;background:rgba(5,6,10,.86);display:grid;place-items:center;opacity:0;transition:opacity .4s';
    d.innerHTML = '<div style="position:relative;padding:10px;border-radius:30px;background:#111;box-shadow:0 30px 80px rgba(0,0,0,.7),0 0 0 2px #333"><video id="v-pv" style="height:740px;display:block;border-radius:22px" muted playsinline></video></div>';
    document.documentElement.appendChild(d);
    const v = d.querySelector('video'); v.src = URL.createObjectURL(b);
    v.onloadedmetadata = () => { requestAnimationFrame(() => { d.style.opacity = 1; }); v.play().catch(() => { }); ok(isFinite(v.duration) ? v.duration : 10); };
    v.onerror = () => ok(0);
    setTimeout(() => ok(10), 4000);
  }), b64);
  console.log('   (vídeo de Chispa en pantalla: ' + (dur ? dur.toFixed(1) + ' s' : 'NO CARGÓ') + ')');
  if (fs.existsSync(wav)) h.audioExtra(wav);
  await sleep(Math.min(maxSeg, dur || 10) * 1000 + 300);
  await h.v(() => { const d = document.getElementById('v-play'); if (d) { d.style.opacity = 0; setTimeout(() => d.remove(), 450); } });
  await sleep(500);
  return dur;
}
module.exports = { PREGEN, sleep, card, esperarImagenIA, esperarDescarga, grabarVideo, reproducirVideo };
