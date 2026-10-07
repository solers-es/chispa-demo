/* Chispa · prueba en navegador (Playwright con su propio Chromium) de chispa-ia.js:
   imagen con IA en el Estudio, vídeo con voz y subtítulos, otros idiomas, reaprovechar
   y claves de API — contra el servidor simulado (IA imitada, sin cupo ni red de Cloudflare).
     CHISPA_FOTO_IA=<una foto .jpg> NODE_PATH=<node_modules con sql.js y playwright-core> node pruebas/ia-navegador.cjs
   Capturas en capturas/ia/. */
const assert = require('assert'), fs = require('fs'), path = require('path');
process.env.PUERTO_API = process.env.PUERTO_API || '8788';
const { chromium, devices } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
const OUT = path.join(__dirname, '..', 'capturas', 'ia');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const s = await arrancar();
  const b = await chromium.launch();
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const abrir = async (ctx, url) => { const pg = await ctx.newPage(); pg.on('pageerror', (e) => errores.push(e.message)); pg.on('dialog', (d) => d.accept()); await pg.goto(url, { waitUntil: 'load' }); await pg.waitForTimeout(1000); return pg; };
  const url = (hash) => s.web + '/index.html?servidor=' + encodeURIComponent(s.base) + (hash || '');

  // 0) sin servidor: «Crear imagen con IA» pone una foto libre y lo dice
  const c0 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p0 = await abrir(c0, s.web + '/index.html');
  await p0.evaluate(() => { vista('panel'); panel('asistente'); document.getElementById('idea').value = 'Paella del domingo en la terraza'; generar(); });
  await p0.waitForFunction(() => window._posts && window._posts[0] && window._posts[0].media && !window._posts[0].creando, null, { timeout: 20000 });
  await p0.evaluate(() => crearImagenIA(0, 1));
  await p0.waitForFunction(() => !window._posts[0].creando && window._posts[0].media, null, { timeout: 20000 });
  assert.equal(await p0.evaluate(() => window._posts[0].media.tipo), 'foto');
  assert.match(await p0.evaluate(() => window._posts[0].media.aviso || ''), /servidor/);
  paso('sin servidor: «Crear imagen con IA» pone una foto libre y avisa de que la IA necesita el servidor');
  await c0.close();

  // 1) con servidor
  const cA = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const A = await abrir(cA, url('#conectar'));
  await A.fill('#csCodigo', s.codigo);
  await A.click('#chispaSyncCard button:has-text("Entrar")');
  await A.waitForFunction(() => /Conectado en el servidor/.test((document.getElementById('chispaSyncCard') || {}).innerText || ''));
  await A.evaluate(() => panel('asistente'));
  assert.ok(await A.locator('#ciaRepCard').isVisible()); paso('Asistente: tarjeta «Reaprovechar» visible');
  const iaAntes = s.llamadasIA.filter((c) => /flux/.test(c.modelo)).length;
  await A.evaluate(() => { document.getElementById('idea').value = 'Paella del domingo en la terraza'; generar(); });
  await A.waitForFunction(() => window._posts && window._posts.length && window._posts.every((p) => p.media && !p.creando), null, { timeout: 25000 });
  assert.equal(s.llamadasIA.filter((c) => /flux/.test(c.modelo)).length, iaAntes); paso('las propuestas automáticas NO gastan IA (fotos libres)');
  await A.click('#cmCard_0 .cm-acts button.pp');
  await A.waitForFunction(() => window._posts[0].media && window._posts[0].media.tipo === 'ia' && !window._posts[0].creando, null, { timeout: 20000 });
  const src = await A.evaluate(() => window._posts[0].media.url);
  assert.match(src, /\/medio\/[A-Za-z0-9_-]+\.jpg$/);
  const pr = s.llamadasIA.filter((c) => /flux/.test(c.modelo)).pop().e.prompt;
  assert.match(pr, /Paella del domingo/);
  await A.waitForTimeout(2600);
  assert.match(await A.locator('#cmCard_0 img.kbi').getAttribute('src'), /\/medio\//);
  assert.ok(await A.locator('#cmCard_0 .sello').count() >= 1, 'sello de marca');
  await A.locator('#cmCard_0').screenshot({ path: path.join(OUT, 'estudio-imagen-ia.png') });
  paso('«Crear imagen con IA» con servidor: imagen de la IA (URL pública /medio/…), con el sello de marca encima');

  // 2) vídeo con voz y subtítulos
  await A.evaluate(() => cmExportar(0));
  assert.ok(await A.locator('#ciaVoz').isChecked()); assert.ok(await A.locator('#ciaSub').isChecked());
  assert.match(await A.inputValue('#ciaGuion'), /\S{3,}/);
  await A.locator('#cmBox').screenshot({ path: path.join(OUT, 'opciones-video.png') });
  await A.click('#cmBox button:has-text("Descargar vídeo vertical")');
  await A.waitForFunction(() => /Vídeo (descargado|listo)|No se pudo/.test((document.getElementById('cmExpMsg') || {}).textContent || ''), null, { timeout: 40000 });
  const msg = await A.textContent('#cmExpMsg');
  assert.match(msg, /Vídeo descargado/, msg);
  assert.ok(s.llamadasIA.some((c) => /melotts/.test(c.modelo) && c.e.lang === 'es'));
  const info = await A.evaluate(() => new Promise((ok) => {
    const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(window._cmUltimoVideo.b);
    v.onloadedmetadata = () => {
      const fin = () => { const c = document.createElement('canvas'); c.width = 270; c.height = 480; c.getContext('2d').drawImage(v, 0, 0, 270, 480); ok({ dur: v.duration, tam: window._cmUltimoVideo.b.size, tipo: window._cmUltimoVideo.b.type, foto: c.toDataURL('image/jpeg', .8) }); };
      if (v.duration === Infinity) { v.currentTime = 1e6; v.ontimeupdate = () => { v.ontimeupdate = null; v.currentTime = 1.4; v.onseeked = fin; }; } else { v.currentTime = 1.4; v.onseeked = fin; }
    };
  }));
  fs.writeFileSync(path.join(OUT, 'video-fotograma-subtitulos.jpg'), Buffer.from(info.foto.split(',')[1], 'base64'));
  assert.ok(info.tam > 50000, 'vídeo con contenido'); assert.ok(info.dur >= 5.5, 'dura ' + info.dur);
  paso('vídeo grabado con voz de la IA y subtítulos (' + info.tipo + ', ' + Math.round(info.tam / 1024) + ' KB, ' + info.dur.toFixed(1) + ' s)');
  await A.evaluate(() => cmCerrar());

  // 3) otros idiomas
  await A.click('#cmCard_0 button:has-text("Otros idiomas")');
  await A.click('#modalBox button:has-text("Traducir")');
  await A.waitForSelector('#ciaTradRes pre');
  assert.match(await A.textContent('#ciaTradRes pre'), /🇬🇧 \[en\][\s\S]*🇩🇪 \[de\]/);
  await A.locator('#modalBox').screenshot({ path: path.join(OUT, 'otros-idiomas.png') });
  await A.click('#modalBox button:has-text("Poner en la publicación")');
  assert.match(await A.evaluate(() => window._posts[0].txt), /^🇪🇸[\s\S]*🇬🇧[\s\S]*🇩🇪/);
  paso('«Otros idiomas»: traduce a inglés y alemán y lo pone en la publicación con banderas');

  // 4) reaprovechar
  await A.evaluate(() => ChispaIA.reaprovechar());
  await A.fill('#ciaLargo', 'Este fin de semana celebramos 56 años con paella gratis para los 50 primeros y música en directo en la terraza de Palma. Ven con tu familia.');
  await A.selectOption('#ciaIdiR', 'en');
  await A.click('#modalBox button:has-text("Crear las piezas")');
  await A.waitForSelector('#ciaRepRes pre');
  assert.ok(await A.locator('#ciaRepRes pre').count() >= 3);
  const ultimo = s.llamadasIA.filter((c) => /llama/.test(c.modelo)).pop().e.messages[0].content;
  assert.match(ultimo, /English/);
  await A.locator('#modalBox').screenshot({ path: path.join(OUT, 'reaprovechar.png') });
  await A.click('#ciaRepRes button:has-text("Guardar como borrador") >> nth=0');
  await A.waitForTimeout(600);
  assert.ok(s.db.exec("SELECT datos FROM agenda")[0].values.some((v) => /"estado":"borrador"/.test(v[0])));
  paso('reaprovechar: texto largo → piezas en inglés; una se guarda como borrador en el servidor');
  await A.evaluate(() => cerrarModal());

  // 5) claves de API en Conexiones
  await A.evaluate(() => panel('conectar'));
  await A.waitForSelector('#ciaApiCard');
  await A.waitForFunction(() => /Todavía no hay claves|creada/.test((document.getElementById('ciaClaves') || {}).innerText || ''));
  await A.fill('#ciaClaveNom', 'n8n');
  await A.click('#ciaApiCard button:has-text("Crear clave")');
  await A.waitForSelector('#ciaClaveNueva input');
  const clave = await A.inputValue('#ciaClaveNueva input');
  assert.match(clave, /^chispa_/);
  await A.waitForFunction(() => /n8n/.test(document.getElementById('ciaClaves').innerText));
  await A.waitForFunction(() => /IA hoy/.test(document.getElementById('ciaUso').innerText));
  await A.locator('#ciaApiCard').screenshot({ path: path.join(OUT, 'claves-api.png') });
  let r = await fetch(s.base + '/v1/yo', { headers: { Authorization: 'Bearer ' + clave } });
  assert.equal(r.status, 200);
  await A.click('#ciaClaves button:has-text("Revocar")');
  await A.waitForFunction(() => /Todavía no hay claves/.test(document.getElementById('ciaClaves').innerText));
  r = await fetch(s.base + '/v1/yo', { headers: { Authorization: 'Bearer ' + clave } });
  assert.equal(r.status, 401);
  paso('Conexiones: crear clave de API (se enseña una vez), funciona en /v1, y revocarla la anula');

  // 6) iPhone
  const cB = await b.newContext({ ...devices['iPhone 13'] });
  const B = await abrir(cB, url());
  await B.evaluate(() => { vista('panel'); panel('asistente'); document.getElementById('idea').value = 'Cócteles en la terraza'; generar(); });
  await B.waitForFunction(() => window._posts && window._posts[0] && window._posts[0].media && !window._posts[0].creando, null, { timeout: 20000 });
  await B.waitForTimeout(1500);
  await B.screenshot({ path: path.join(OUT, 'iphone-estudio.png') });
  const ancho = await B.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  assert.ok(ancho, 'sin scroll horizontal en el iPhone'); paso('iPhone: el Estudio con los botones nuevos cabe sin scroll horizontal');

  assert.deepEqual(errores, [], 'errores de la página: ' + errores.join(' | '));
  paso('sin errores de JavaScript en la página');
  console.log('\n' + ok + ' comprobaciones en verde · capturas en capturas/ia/');
  await b.close(); s.cerrar();
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
