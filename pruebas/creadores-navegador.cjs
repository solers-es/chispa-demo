/* Chispa · Estudio para creadores en el navegador (Playwright con su propio Chromium) — trabajador K.
   Sin servidor (plantillas marcadas como EJEMPLO), con servidor en iPhone (IA imitada del simulador:
   serie, guion, portada con sello, al calendario REAL como borrador) y con plan Básico (402 claro).
     NODE_PATH=<node_modules con sql.js y playwright-core> node pruebas/creadores-navegador.cjs
   Capturas en capturas/creadores/. */
const assert = require('assert'), fs = require('fs'), path = require('path');
process.env.PUERTO_API = process.env.PUERTO_API || '8793';
process.env.PUERTO_WEB = process.env.PUERTO_WEB || '8794';
const { chromium, devices } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
const OUT = path.join(__dirname, '..', 'capturas', 'creadores');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const s = await arrancar();
  const b = await chromium.launch();
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const abrir = async (ctx, url) => { const pg = await ctx.newPage(); pg.on('pageerror', (e) => errores.push(e.message)); pg.on('dialog', (d) => d.accept()); await pg.goto(url, { waitUntil: 'load' }); await pg.waitForTimeout(900); return pg; };
  const url = (hash) => s.web + '/index.html?servidor=' + encodeURIComponent(s.base) + (hash || '');
  // en el iPhone el botón flotante de la visita guiada y los avisos ocupan el borde de abajo: se toca con el botón en el centro
  const tocar = async (pg, sel) => { const l = pg.locator(sel).first(); await l.evaluate((el) => el.scrollIntoView({ block: 'center' })); await l.click(); };
  const entrar = async (pg, codigo, negocio) => {
    if (negocio) await pg.fill('#csNegocio', negocio);
    await pg.fill('#csCodigo', codigo);
    await pg.click('#chispaSyncCard button:has-text("Entrar")');
    await pg.waitForFunction(() => /Conectado en el servidor/.test((document.getElementById('chispaSyncCard') || {}).innerText || ''), null, { timeout: 8000 }).catch(async (e) => { console.log('TARJETA:', await pg.locator('#chispaSyncCard').innerText().catch(() => '?'), 'CODIGO:', codigo); throw e; });
  };

  // 0) sin servidor, ordenador
  const c0 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p0 = await abrir(c0, s.web + '/index.html?servidor=no#estudio');
  assert.ok(await p0.locator('#estudioApp.on').count());
  const tabs = await p0.locator('#enav').innerText();
  assert.match(tabs, /Miniserie con IA/); assert.match(tabs, /Guion con IA/); assert.match(tabs, /En el calendario/); assert.match(tabs, /Buenas prácticas/);
  paso('#estudio abre el Estudio para creadores con sus 6 pestañas');
  let t = await p0.locator('#emain').innerText();
  assert.match(t, /EJEMPLO/); assert.match(t, /no garantiza visitas ni ingresos/);
  await p0.click('#emain button:has-text("Quitar los ejemplos")');
  assert.equal(await p0.evaluate(() => S.canales.filter((c) => c.ejemplo).length), 0);
  paso('los canales de muestra salen como EJEMPLO y se quitan con un toque');
  await p0.evaluate(() => estudio('serie'));
  assert.match(await p0.locator('#emain').innerText(), /Modo demostración/);
  await p0.fill('#serTema', 'Historia y curiosidades');
  await p0.click('#emain button:has-text("Escribir la serie")');
  t = await p0.locator('#serRes').innerText();
  assert.match(t, /PLANTILLA DE EJEMPLO/); assert.equal(await p0.locator('.serTit').count(), 5);
  await p0.selectOption('#serCada', '1');
  await p0.click('#emain button:has-text("Pasar la serie al calendario")');
  let ag = await p0.evaluate(() => S.agenda.filter((a) => a.origen === 'estudio'));
  assert.equal(ag.length, 5); assert.ok(ag.every((a) => a.estado === 'borrador' && a.formato === 'reel' && a.redes[0] === 'tt' && a.cuando));
  assert.ok(new Date(ag[1].cuando) - new Date(ag[0].cuando) >= 20 * 3600e3);
  t = await p0.locator('#emain').innerText();
  assert.match(t, /En el calendario/); assert.match(t, /Borrador \(falta el vídeo\)/);
  paso('sin servidor: plantilla marcada como EJEMPLO y «Pasar al calendario» deja 5 borradores en el calendario REAL, uno por día');
  await p0.evaluate(() => estudio('ingresos'));
  t = await p0.locator('#emain').innerText();
  assert.match(t, /no una promesa/); assert.doesNotMatch(t, /\d+\s*\$|\$\s*\d|RPM|Brigada|GestorOS/);
  await p0.evaluate(() => estudio('reglas'));
  assert.doesNotMatch(await p0.locator('#emain').innerText(), /foso|anglosaj/);
  paso('«Monetizar» y «Buenas prácticas» sin cifras inventadas ni textos internos');
  await p0.evaluate(() => { vista('panel'); panel('calendario'); });
  await p0.waitForTimeout(500);
  assert.ok(await p0.evaluate(() => S.agenda.some((a) => a.origen === 'estudio')));
  await c0.close();

  // 1) con servidor, iPhone
  const iph = devices['iPhone 13'];
  const c1 = await b.newContext({ ...iph });
  const p1 = await abrir(c1, url('#conectar'));
  await entrar(p1, s.codigo);
  await p1.evaluate(() => { vista('estudio'); estudio('serie'); });
  assert.match(await p1.locator('#emain').innerText(), /IA activada/);
  await p1.fill('#serTema', 'recetas de 10 minutos');
  await p1.selectOption('#serPlat', 'shorts');
  await p1.selectOption('#serIdi', 'en');
  await p1.selectOption('#serN', '4');
  await tocar(p1, '#emain button:has-text("Escribir la serie")');
  await p1.waitForFunction(() => /escrita con IA/.test(document.getElementById('serRes').innerText), null, { timeout: 15000 });
  assert.equal(await p1.locator('.serTit').count(), 4);
  assert.equal(await p1.inputValue('.serTit >> nth=0'), 'Episodio 1 de la IA');
  const msg = s.llamadasIA.filter((c) => /llama/.test(c.modelo)).pop().e.messages;
  assert.match(msg[0].content, /English/); assert.match(msg[1].content, /YouTube Shorts/); assert.match(msg[0].content, /Restaurante/);
  paso('iPhone con servidor: serie escrita con IA (inglés, Shorts, 4 episodios, con el sector del negocio)');
  await p1.fill('.serTit >> nth=1', 'Título cambiado a mano');
  await p1.locator('.serChk >> nth=3').uncheck();
  await tocar(p1, '#emain button:has-text("Pasar la serie al calendario")');
  ag = await p1.evaluate(() => S.agenda.filter((a) => a.origen === 'estudio'));
  assert.equal(ag.length, 3); assert.ok(ag.every((a) => a.redes[0] === 'yt' && a.estado === 'borrador'));
  assert.ok(ag.some((a) => a.titulo === 'Título cambiado a mano')); assert.ok(ag[0].guion.length > 10);
  paso('solo los episodios marcados, con el título editado y el guion dentro, a YouTube como borrador');
  const anchoOk = await p1.evaluate(() => document.getElementById('emain').scrollWidth <= window.innerWidth + 1);
  assert.ok(anchoOk, 'el Estudio no se sale del ancho del iPhone');
  await p1.screenshot({ path: path.join(OUT, 'iphone-en-el-calendario.png'), fullPage: false });
  // portada con sello
  await p1.evaluate(() => estudio('serie'));
  await tocar(p1, '.epi >> nth=0 >> button:has-text("Portada")');
  await p1.waitForSelector('#kPort img', { timeout: 30000 });
  assert.match(await p1.locator('#kPort a[download]').getAttribute('href'), /^blob:/);
  assert.match(await p1.locator('#kPort').innerText(), /Imagen creada con IA/);
  await p1.locator('#modalBox').screenshot({ path: path.join(OUT, 'iphone-portada.png') });
  await p1.evaluate(() => cerrarModal());
  paso('portada del episodio con IA y el sello de marca, para descargar (sin FileReader)');
  // guion
  await p1.evaluate(() => estudio('guion'));
  await p1.fill('#gTema', 'cómo hacemos la paella');
  await p1.selectOption('#gPlat', 'reels');
  await tocar(p1, '#emain button:has-text("Escribir el guion")');
  await p1.waitForFunction(() => /escrito con IA/.test(document.getElementById('gRes').innerText), null, { timeout: 15000 });
  t = await p1.locator('#gRes').innerText();
  assert.match(t, /Nadie te cuenta esto/); assert.match(t, /Remate/); assert.match(t, /Instagram Reels/);
  await tocar(p1, '#gRes button:has-text("Otra versión")');
  await p1.waitForFunction(() => /escrito con IA/.test(document.getElementById('gRes').innerText), null, { timeout: 15000 });
  assert.match(s.llamadasIA.filter((c) => /llama/.test(c.modelo)).pop().e.messages[1].content, /variant 2/);
  await tocar(p1, '#gRes button:has-text("Al calendario")');
  ag = await p1.evaluate(() => S.agenda.filter((a) => a.origen === 'estudio'));
  assert.equal(ag.length, 4); assert.equal(ag[3].redes[0], 'igf');
  await p1.screenshot({ path: path.join(OUT, 'iphone-guion.png') });
  paso('guion con IA para Reels, «Otra versión» pide una distinta y «Al calendario» lo deja como borrador de Instagram');
  // se sincroniza con el servidor (S entero)
  await p1.waitForTimeout(2500);
  await p1.evaluate(() => ChispaSync.sincronizarAhora && ChispaSync.sincronizarAhora());
  await p1.waitForTimeout(1500);
  const enServidor = s.db.exec("SELECT datos FROM estado WHERE negocio = 'el-paraiso' AND doc = 'principal'");
  assert.ok(enServidor.length && /"origen":"estudio"/.test(enServidor[0].values[0][0]), 'los borradores del Estudio llegan al servidor');
  paso('los borradores del Estudio se guardan en el servidor (los ve el otro aparato)');
  await c1.close();

  // 2) plan Básico: la IA del Estudio dice que es de Pro y Agencia, y deja la plantilla
  let r = await fetch(s.base + '/admin/negocios', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chispa-Admin': s.env.ADMIN_CLAVE }, body: JSON.stringify({ id: 'canal-basico', nombre: 'Canal Básico' }) }).then((x) => x.json());
  s.db.run("INSERT INTO cuentas (negocio, plan, estado, prueba_hasta, creado, actualizado) VALUES ('canal-basico', 'basico', 'prueba', ?, ?, ?)", [Date.now() + 5 * 864e5, Date.now(), Date.now()]);
  const c2 = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const p2 = await abrir(c2, url('#conectar'));
  await entrar(p2, r.codigo, 'canal-basico');
  await p2.evaluate(() => { vista('estudio'); estudio('guion'); });
  await p2.fill('#gTema', 'trucos de inglés');
  await p2.click('#emain button:has-text("Escribir el guion")');
  await p2.waitForFunction(() => /PLANTILLA DE EJEMPLO/.test(document.getElementById('gRes').innerText), null, { timeout: 15000 });
  assert.match(await p2.locator('#gRes').innerText(), /🔒.*Pro y Agencia/);
  await p2.screenshot({ path: path.join(OUT, 'basico-402.png') });
  paso('plan Básico: aviso claro «viene en los planes Pro y Agencia» y plantilla de ejemplo para no dejarlo en blanco');
  await c2.close();

  assert.deepEqual(errores, [], 'errores de programa: ' + errores.join(' | '));
  paso('0 errores de programa en las tres sesiones');
  await b.close(); s.cerrar();
  console.log(ok + ' comprobaciones en verde · capturas en capturas/creadores/');
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
