/* Chispa · prueba en navegador (Playwright con su propio Chromium) del ALTA SOLA contra el servidor simulado:
   precios de precios.js, alta en iPhone, entrada en modo cliente con su sector, «Mi plan», pie legal
   y «Altas y pagos» en el modo Solers. Sin red y sin cuenta.
   NODE_PATH=<node_modules con sql.js y playwright-core> node pruebas/alta-navegador.cjs */
const assert = require('assert'), fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
const OUT = path.join(__dirname, '..', 'capturas', 'alta');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const s = await arrancar();
  const b = await chromium.launch();
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const url = (hash) => s.web + '/index.html?servidor=' + encodeURIComponent(s.base) + (hash || '');

  // 1) precios en la portada (ordenador)
  const c1 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p1 = await c1.newPage(); p1.on('pageerror', (e) => errores.push(e.message));
  await p1.goto(url(''), { waitUntil: 'load' }); await p1.waitForTimeout(800);
  const planes = await p1.locator('#landing .planes').innerText();
  assert.match(planes, /39 €/); assert.match(planes, /79 €/); assert.match(planes, /149 €/); assert.doesNotMatch(planes, /\b(29|59|99) €/);
  assert.match(planes, /Agencia/); assert.match(planes, /14 días gratis/);
  await p1.locator('#landing .planes').screenshot({ path: path.join(OUT, '1-precios.png') });
  paso('portada: 39/79/149 € + IVA (Básico/Pro/Agencia) y «Probar 14 días gratis», leídos de precios.js');
  assert.match(await p1.locator('#pieLanding').innerText(), /Aviso legal.*Privacidad.*Términos.*Cookies.*Encargo/);
  paso('pie de la portada con los cinco textos legales');
  await p1.evaluate(() => { preguntar('¿Cuánto cuesta?'); });
  await p1.waitForTimeout(2500);
  assert.match(await p1.locator('#stream').innerText(), /39 €\/mes \+ IVA/);
  paso('el chat de la portada dice el precio de precios.js');
  await c1.close();

  // 2) alta en un iPhone
  const c2 = await b.newContext({ ...devices['iPhone 13'] });
  const p2 = await c2.newPage(); p2.on('pageerror', (e) => errores.push(e.message));
  await p2.goto(url(''), { waitUntil: 'load' }); await p2.waitForTimeout(800);
  await p2.locator('#landing .plan[data-plan="pro"] button').click();
  await p2.waitForSelector('#altaPag.on');
  await p2.fill('#alNom', 'Peluquería Marga');
  await p2.waitForTimeout(200);
  assert.equal(await p2.locator('#alSecs .al-sec.on').getAttribute('data-s'), 'peluqueria');
  paso('«Probar» abre el alta y el sector se detecta por el nombre');
  await p2.selectOption('#alIdi', 'ca');
  await p2.fill('#alCor', 'marga@ejemplo.com');
  await p2.locator('#alBtn').click();
  await p2.waitForTimeout(300);
  assert.match(await p2.locator('#alErr').innerText(), /aceptas/);
  paso('sin marcar la aceptación de términos y privacidad no deja seguir');
  await p2.screenshot({ path: path.join(OUT, '2-alta-iphone.png'), fullPage: false });
  await p2.check('#alAcepto');
  await p2.locator('#alBtn').click();
  await p2.waitForSelector('#alCod', { timeout: 20000 });
  const codigo = (await p2.locator('#alCod').innerText()).trim();
  assert.match(codigo, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.match(await p2.locator('#altaPag').innerText(), /Modo prueba sin cobro/);
  await p2.screenshot({ path: path.join(OUT, '3-alta-lista.png') });
  paso('alta hecha en el servidor: enseña el código ' + codigo + ' y dice que no se cobra nada');
  await Promise.all([p2.waitForNavigation({ waitUntil: 'load' }), p2.locator('text=Entrar en mi Chispa').click()]);
  await p2.waitForTimeout(2500);
  const est = await p2.evaluate(() => ({ cliente: ChispaCuentas.esCliente(), id: ChispaCuentas.idActual(), sector: S.negocio.sectorId, nombre: S.negocio.nombre, idioma: S.negocio.idioma && S.negocio.idioma.codigo, modo: ChispaSync.estado().modo, tabs: TABS.map((t) => t.id) }));
  assert.equal(est.cliente, true); assert.match(est.id, /^peluqueria-marga-/); assert.equal(est.sector, 'peluqueria'); assert.equal(est.nombre, 'Peluquería Marga');
  assert.equal(est.idioma, 'ca'); assert.equal(est.modo, 'servidor'); assert.ok(!est.tabs.includes('clientes')); assert.ok(est.tabs.includes('plan'));
  paso('dentro en modo cliente: solo su negocio, sector peluquería, idioma catalán, sincronizando con el servidor, sin «Mis clientes»');
  await p2.waitForTimeout(1500);
  const enServidor = s.db.exec("SELECT COUNT(*) FROM estado WHERE negocio = '" + est.id + "'")[0].values[0][0];
  assert.ok(enServidor >= 1); paso('sus datos ya están en el servidor (valen en cualquier aparato)');
  assert.match(await p2.locator('#main').innerText(), /Prueba gratis: te quedan 14 días/);
  assert.equal(await p2.locator('#main .al-pie a').count(), 5);
  paso('aviso de prueba arriba y pie legal en el panel');
  await p2.evaluate(() => panel('plan'));
  await p2.waitForTimeout(1200);
  const plan = await p2.locator('#main').innerText();
  assert.match(plan, /Pro/); assert.match(plan, /En prueba gratis/); assert.match(plan, /Publicaciones este mes/); assert.match(plan, /0 \/ 90/);
  await p2.screenshot({ path: path.join(OUT, '4-mi-plan.png'), fullPage: true });
  paso('«Mi plan»: Pro en prueba, con el uso frente a los límites');
  await p2.locator('#main button', { hasText: 'Quiero este' }).first().click();
  await p2.waitForTimeout(800);
  assert.match(await p2.locator('#modalBox').innerText(), /todavía no está activado/);
  paso('«Quiero este» con el pago apagado explica que no se cobra y ofrece avisar a Solers');
  const ancho = await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  assert.ok(ancho); paso('en el iPhone no hay desplazamiento lateral');
  await c2.close();

  // 3) otro aparato entra con el código
  const c3 = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const p3 = await c3.newPage(); p3.on('pageerror', (e) => errores.push(e.message));
  await p3.goto(url('#conectar'), { waitUntil: 'load' }); await p3.waitForTimeout(800);
  const r = await p3.evaluate(async (a) => { const x = await fetch(a.base + '/sesion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ negocio: a.id, codigo: a.codigo }) }); return x.status; }, { base: s.base, id: est.id, codigo });
  assert.equal(r, 200); paso('con el código entra desde otro aparato');

  // 4) modo Solers: altas y pagos
  await p3.goto(s.web + '/index.html?admin', { waitUntil: 'domcontentloaded' }); await p3.waitForTimeout(1500);
  await p3.fill('#ccClave', 'clave-solers'); await p3.fill('#ccClave2', 'clave-solers'); await p3.evaluate(() => ccClaveOk()); await p3.waitForTimeout(800);
  assert.ok(await p3.locator('#alAdm').count());
  await p3.locator('#alAdm button', { hasText: 'Ver todos' }).click();
  await p3.fill('#alAdmK', s.env.ADMIN_CLAVE); await p3.evaluate(() => ChispaAlta._adminK());
  await p3.waitForSelector('#alAdmL table', { timeout: 5000 });
  const t = await p3.locator('#alAdmL').innerText();
  assert.match(t, /Peluquería Marga/); assert.match(t, /En prueba gratis/); assert.match(t, /El Paraíso/); assert.match(t, /apagado/);
  await p3.locator('#alAdm').screenshot({ path: path.join(OUT, '5-solers-altas-y-pagos.png') });
  paso('modo Solers: «Altas y pagos» lista los negocios del servidor con plan, prueba y pago');
  await c3.close();

  // 5) los textos legales abren y tienen español e inglés
  const c4 = await b.newContext(); const p4 = await c4.newPage(); p4.on('pageerror', (e) => errores.push(e.message));
  for (const f of ['aviso-legal', 'privacidad', 'terminos', 'cookies', 'encargo-tratamiento']) {
    const rr = await p4.goto(s.web + '/legal/' + f + '.html'); assert.equal(rr.status(), 200);
    const tx = await p4.locator('body').innerText();
    assert.match(tx, /\[CIF\]|\[domicilio\]|Solers/); assert.ok(await p4.locator('[lang="en"]').count(), f + ' sin inglés');
  }
  paso('los cinco textos legales abren, con [CIF]/[domicilio] marcados y versión en inglés');
  await c4.close();

  assert.deepEqual(errores, []); paso('sin errores de JavaScript en ninguna página');
  console.log('\n' + ok + ' comprobaciones en verde · capturas en capturas/alta/');
  await b.close(); s.cerrar(); process.exit(0);
})().catch((e) => { console.error('✗', e); process.exit(1); });
