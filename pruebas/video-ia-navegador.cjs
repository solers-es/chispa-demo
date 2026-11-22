/* Chispa · «🎬 Crear vídeo con IA» en el navegador (Playwright con su propio Chromium), contra el servidor
   simulado (IA imitada: guion por escenas, FLUX, MeloTTS, Whisper):
     CHISPA_FOTO_IA=capturas/ia/servidor-real-paella.jpg NODE_PATH=<node_modules con sql.js y playwright-core> node pruebas/video-ia-navegador.cjs
   0) sin servidor: vídeo de EJEMPLO con el tema y fotos libres
   1) con servidor pero SIN entrar: lo dice claro; la miniserie de respaldo usa EL TEMA pedido (no El Paraíso)
   2) con sesión (iPhone): guion IA, una imagen IA por escena, voz por escena, música, vídeo grabado,
      descargar y «📅 Programar» en el calendario real; versión Pro apagada con su mensaje
   3) Asistente: tarjeta «Para creadores» y portada con la sección de creadores. Capturas en capturas/video-ia/. */
const assert = require('assert'), fs = require('fs'), path = require('path');
process.env.PUERTO_API = process.env.PUERTO_API || '8796';
process.env.PUERTO_WEB = process.env.PUERTO_WEB || '8797';
if (!process.env.CHISPA_FOTO_IA) process.env.CHISPA_FOTO_IA = path.join(__dirname, '..', 'capturas', 'ia', 'servidor-real-paella.jpg');
const { chromium, devices } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
const OUT = path.join(__dirname, '..', 'capturas', 'video-ia');
fs.mkdirSync(OUT, { recursive: true });
const TEMA = 'Recetas caribeñas en 60 segundos';

(async () => {
  const s = await arrancar();
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const abrir = async (ctx, url) => { const pg = await ctx.newPage(); pg.on('pageerror', (e) => errores.push(e.message)); pg.on('dialog', (d) => d.accept()); await pg.goto(url, { waitUntil: 'load' }); await pg.waitForTimeout(900); return pg; };
  const url = (hash) => s.web + '/index.html?servidor=' + encodeURIComponent(s.base) + (hash || '');
  const tocar = async (pg, sel) => { const l = pg.locator(sel).first(); await l.evaluate((el) => el.scrollIntoView({ block: 'center' })); await l.click(); };
  const esperarVideo = (pg) => pg.waitForFunction(() => { const v = window.ChispaVideoIA && ChispaVideoIA._estado; return v && !v.ocupado && (v.ultimo && v.ultimo.blob || /No se pudo/.test((document.getElementById('viRes') || {}).innerText || '')); }, null, { timeout: 120000 });

  // 0) sin servidor, ordenador
  const c0 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p0 = await abrir(c0, s.web + '/index.html?servidor=no#video-ia');
  assert.ok(await p0.locator('#viTema').isVisible(), 'el enlace #video-ia abre el Estudio en «Crear vídeo con IA»');
  assert.match(await p0.locator('#enav').innerText(), /Crear vídeo con IA/);
  assert.match(await p0.locator('#emain').innerText(), /Modo demostración/);
  await p0.fill('#viTema', TEMA); await p0.selectOption('#viN', '4');
  await tocar(p0, '#viBoton'); await esperarVideo(p0);
  const r0 = await p0.evaluate(() => { const G = ChispaVideoIA._estado.ultimo; return { ej: G.ejemplo, n: G.escenas.length, t: G.escenas.map((e) => e.dice).join(' '), tam: G.blob.size, tipo: G.blob.type, foto: G.escenas.every((e) => e.tipo === 'foto') }; });
  assert.ok(r0.ej && r0.n === 4 && /Recetas caribeñas/.test(r0.t) && r0.tam > 5000 && r0.foto, JSON.stringify(r0));
  assert.match(await p0.locator('#viRes').innerText(), /EJEMPLO/);
  paso('sin servidor: vídeo de EJEMPLO grabado (' + Math.round(r0.tam / 1024) + ' KB, ' + r0.tipo + ') con el tema pedido y fotos libres, marcado EJEMPLO');
  await c0.close();

  // 1) con servidor y SIN entrar
  const c1 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p1 = await abrir(c1, url());
  await p1.evaluate(() => { vista('estudio'); estudio('serie'); });
  assert.match(await p1.locator('#emain').innerText(), /Falta entrar/);
  await p1.fill('#serTema', TEMA); await tocar(p1, 'button:has-text("Escribir la serie")');
  await p1.waitForTimeout(500);
  const t1 = await p1.locator('#serRes').innerText();
  assert.match(t1, /entres con tu código/); assert.match(t1, /Recetas caribeñas/); assert.doesNotMatch(t1, /Un día en|El Paraíso/);
  await p1.screenshot({ path: path.join(OUT, 'serie-sin-sesion.png') });
  paso('servidor sin entrar: lo dice claro («entra con tu código») y la plantilla usa «' + TEMA + '», no la de El Paraíso');
  await p1.evaluate(() => estudio('video'));
  assert.match(await p1.locator('#emain').innerText(), /Falta entrar/);
  paso('«Crear vídeo con IA» sin entrar: avisa de que la IA necesita el código del negocio');
  await c1.close();

  // 2) con sesión en iPhone
  const c2 = await b.newContext({ ...devices['iPhone 13'] });
  const A = await abrir(c2, url('#conectar'));
  await A.fill('#csCodigo', s.codigo);
  await tocar(A, '#chispaSyncCard button:has-text("Entrar")');
  await A.waitForFunction(() => /Conectado en el servidor/.test((document.getElementById('chispaSyncCard') || {}).innerText || ''));
  await A.evaluate(() => { vista('estudio'); estudio('video'); });
  assert.match(await A.locator('#emain').innerText(), /IA activada/);
  await A.waitForFunction(() => /se activa al conectar el proveedor \(de pago\)/.test((document.getElementById('viProEstado') || {}).innerText || ''));
  assert.ok(await A.locator('#viProBoton').isDisabled());
  paso('versión Pro: «Vídeo realista con IA: se activa al conectar el proveedor (de pago).» y botón apagado');
  const ancho = await A.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(ancho <= 1, 'sin desbordar en el iPhone: ' + ancho);
  await A.fill('#viTema', TEMA); await A.selectOption('#viN', '5'); await A.check('#viMus');
  const antes = { flux: s.llamadasIA.filter((c) => /flux/.test(c.modelo)).length, voz: s.llamadasIA.filter((c) => /melotts/.test(c.modelo)).length };
  await tocar(A, '#viBoton');
  await A.waitForFunction(() => { const l = document.querySelector('#viLienzo canvas'); return !!l; }, null, { timeout: 60000 });
  await A.waitForTimeout(2500);
  await A.locator('#viPasos').screenshot({ path: path.join(OUT, 'iphone-montando.png') }).catch(() => {});
  await esperarVideo(A);
  const r2 = await A.evaluate(() => { const G = ChispaVideoIA._estado.ultimo; return { ej: !!G.ejemplo, n: G.escenas.length, deIA: G.deIA, voz: G.conVoz, tam: G.blob.size, tipo: G.blob.type, total: G.total }; });
  assert.ok(!r2.ej && r2.n === 5 && r2.deIA === 5 && r2.voz && r2.tam > 20000, JSON.stringify(r2));
  const flux = s.llamadasIA.filter((c) => /flux/.test(c.modelo)).slice(antes.flux);
  assert.equal(flux.length, 5); assert.ok(flux.every((c) => /Caribbean food/.test(c.e.prompt) && /no text/.test(c.e.prompt)));
  assert.equal(s.llamadasIA.filter((c) => /melotts/.test(c.modelo)).length - antes.voz, 5);
  const txt2 = await A.locator('#viRes').innerText();
  assert.match(txt2, /hecho con IA/); assert.match(txt2, /5 imágenes IA/); assert.match(txt2, /voz IA/);
  const dur = await A.evaluate(() => new Promise((ok) => { const v = document.getElementById('viVideo'); if (v.readyState >= 1) ok(v.duration); else { v.onloadedmetadata = () => ok(v.duration); setTimeout(() => ok(-1), 5000); } }));
  await A.locator('#viRes').screenshot({ path: path.join(OUT, 'iphone-resultado.png') });
  paso('con sesión (iPhone): guion IA de 5 escenas, 5 imágenes IA (FLUX), 5 voces, música; vídeo ' + r2.tipo + ' de ' + Math.round(r2.total) + ' s (' + Math.round(r2.tam / 1024) + ' KB, reproductor ' + (dur > 0 && isFinite(dur) ? Math.round(dur) + ' s' : 'sin duración en WebM') + ')');
  const blob = await A.evaluate(() => { const G = ChispaVideoIA._estado.ultimo; return G.blob.arrayBuffer().then((b) => Array.from(new Uint8Array(b))); });
  fs.writeFileSync(path.join(require('os').tmpdir(), 'chispa-simulador-video.' + (/mp4/.test(r2.tipo) ? 'mp4' : 'webm')), Buffer.from(blob));
  // programar
  await tocar(A, 'button:has-text("📅 Programar")');
  await A.waitForTimeout(1200);
  const it = await A.evaluate(() => (S.agenda || []).filter((a) => a.origen === 'video-ia').pop());
  assert.ok(it && it.mediaLocal && it.estado === 'programada' && it.formato === 'reel' && it.redes[0] === 'tt', JSON.stringify(it));
  paso('«📅 Programar»: entra en el calendario real como reel programado para TikTok, con el vídeo guardado en el aparato');
  await c2.close();

  // 3) Asistente y portada
  const c3 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p3 = await abrir(c3, s.web + '/index.html?servidor=no');
  assert.ok(await p3.locator('#creadores').isVisible()); assert.match(await p3.locator('#creadores').innerText(), /Vídeo con IA[\s\S]*Miniseries[\s\S]*Reaprovecha[\s\S]*idiomas[\s\S]*TikTok, Reels y Shorts[\s\S]*todavía no está disponible/);
  await p3.locator('#creadores').screenshot({ path: path.join(OUT, 'portada-creadores.png') });
  await p3.evaluate(() => { vista('panel'); panel('asistente'); });
  assert.ok(await p3.locator('#viCreadores').isVisible());
  await p3.click('#viCreadores button:has-text("Crear vídeo con IA")');
  assert.ok(await p3.locator('#viTema').isVisible());
  paso('portada con la sección «¿Creas contenido?» (sin prometer lo que no hace) y Asistente con «🎬 Crear vídeo con IA»');
  await c3.close();

  await b.close(); await s.cerrar();
  assert.deepEqual(errores, [], 'errores de la página: ' + errores.join(' | '));
  console.log(ok + ' comprobaciones en verde');
})().catch((e) => { console.error(e); process.exit(1); });
