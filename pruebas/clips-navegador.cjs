/* Chispa · prueba de «✂️ Cortar en clips» (chispa-clips.js) con Playwright y su propio Chromium.
   Fabrica en el navegador un vídeo de 12 s (silencio y un tramo con sonido fuerte), lo elige como
   lo haría el usuario, comprueba que propone el tramo con sonido y graba un clip vertical.
   Uso: PUERTO_API=8858 PUERTO_WEB=8855 NODE_PATH=<…> node pruebas/clips-navegador.cjs */
const assert = require('assert');
const { chromium } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
(async () => {
  const s = await arrancar();
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errores = []; pg.on('pageerror', (e) => errores.push(e.message));
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  await pg.goto(s.web + '/index.html', { waitUntil: 'load' }); await pg.waitForTimeout(1200);
  const m = await pg.evaluate(() => ChispaClips.momentos([0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 5, 5, 5, 0], 3, 2));
  assert.deepEqual(m, [3, 10]); paso('momentos(): elige los tramos con más sonido sin que se pisen');
  const b64 = await pg.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 240; const c = cv.getContext('2d');
    const ac = new AudioContext(), os = ac.createOscillator(), g = ac.createGain(), dst = ac.createMediaStreamDestination();
    os.connect(g); g.connect(dst); g.gain.value = 0.0001; os.start();
    const st = cv.captureStream(25); dst.stream.getAudioTracks().forEach((t) => st.addTrack(t));
    const rec = new MediaRecorder(st, { mimeType: 'video/webm' }), tr = [];
    rec.ondataavailable = (e) => tr.push(e.data);
    const t0 = performance.now();
    rec.start(200);
    await new Promise((ok) => { (function f() { const t = (performance.now() - t0) / 1000; c.fillStyle = 'hsl(' + ((t * 40) % 360) + ',70%,50%)'; c.fillRect(0, 0, 320, 240); g.gain.value = t > 7 && t < 10 ? 0.9 : 0.0001; if (t < 12.2) requestAnimationFrame(f); else ok(); })(); });
    await new Promise((ok) => { rec.onstop = ok; rec.stop(); });
    const buf = new Uint8Array(await new Blob(tr, { type: 'video/webm' }).arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
    return btoa(s);
  });
  await pg.evaluate(() => { vista('panel'); panel('asistente'); });
  await pg.waitForSelector('#clBoton', { timeout: 5000 });
  await pg.click('#clBoton');
  await pg.setInputFiles('#clIn', { name: 'evento.webm', mimeType: 'video/webm', buffer: Buffer.from(b64, 'base64') });
  await pg.waitForSelector('#clLargo', { timeout: 8000 });
  paso('el botón «✂️ Cortar en clips» abre el cortador y lee el vídeo elegido (sin FileReader)');
  await pg.evaluate(() => { const s = document.getElementById('clLargo'); s.innerHTML = '<option>3</option>'; s.value = '3'; document.getElementById('clN').value = '1'; });
  await pg.click('button:has-text("Buscar los mejores momentos")');
  await pg.waitForSelector('#clT0', { timeout: 10000 });
  const ini = await pg.evaluate(() => ChispaClips._estado.clips[0].ini);
  assert.match(await pg.locator('#clLista').innerText(), /por el sonido/);
  assert.ok(ini >= 6 && ini <= 9, 'inicio ' + ini);
  paso('propone el momento con sonido (empieza en el segundo ' + ini + ')');
  await pg.click('#clLista button:has-text("Crear clip")');
  await pg.waitForSelector('#clR0 a[download]', { timeout: 20000 });
  const tam = await pg.evaluate(() => ChispaClips._estado.clips[0].blob.size);
  assert.ok(tam > 1000, 'tamaño ' + tam);
  paso('graba el clip vertical con su sonido y lo deja para descargar (' + Math.round(tam / 1024) + ' KB)');
  assert.deepEqual(errores, []); paso('sin errores de programa');
  console.log('\n' + ok + ' comprobaciones en verde');
  await b.close(); s.cerrar();
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
