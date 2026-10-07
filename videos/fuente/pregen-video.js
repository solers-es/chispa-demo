// Genera, con la propia app (negocio de prueba, misma idea e imagen IA), el vídeo vertical con voz y
// subtítulos que se enseña en la grabación. Se hace aparte porque con la grabación de pantalla activa
// el Chromium sin ventana deja el vídeo sin imagen (solo voz).
// Uso: node pregen-video.js largo|corto
const { chromium } = require('playwright-core');
const fs = require('fs');
const cache = require('./cache-ia');
const P = __dirname + '/privado/';
const EXE = '/Users/usuario/Library/Caches/ms-playwright/chromium-1234/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const IDEA = { largo: 'Tarta de zanahoria casera con café de especialidad', corto: 'Tarta de zanahoria casera con café' };
const modo = process.argv[2] || 'largo';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 810 }, locale: 'es-ES', timezoneId: 'Europe/Madrid', acceptDownloads: true, storageState: P + 'estado-b.json' });
  await cache.instalar(ctx);
  // este Chromium de pruebas no codifica bien H.264: que la app use WebM, como en navegadores sin MP4
  await ctx.addInitScript(() => { const o = MediaRecorder.isTypeSupported.bind(MediaRecorder); MediaRecorder.isTypeSupported = t => /mp4/.test(t) ? false : o(t); });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.goto('https://solers-es.github.io/chispa-demo/', { waitUntil: 'networkidle' }); await sleep(1500);
  await p.evaluate(() => { vista('panel'); panel('asistente'); }); await sleep(1200);
  await p.fill('#idea', IDEA[modo]);
  await p.click('button:has-text("Que Chispa lo escriba")'); await sleep(3000);
  await p.click('#cmCard_0 .cm-acts button >> nth=0');
  await p.waitForFunction(() => window._posts[0].media && window._posts[0].media.tipo === 'ia' && !window._posts[0].creando, null, { timeout: 40000 });
  await sleep(1500);
  await p.evaluate(() => cmExportar(0)); await sleep(800);
  const dl = p.waitForEvent('download', { timeout: 120000 });
  await p.click('button:has-text("Descargar vídeo vertical")');
  const d = await dl; const f = P + 'pregen-' + modo + '.' + d.suggestedFilename().split('.').pop(); await d.saveAs(f);
  console.log('hecho', f, await p.evaluate(() => document.getElementById('cmExpMsg').innerText));
  await b.close();
})();
