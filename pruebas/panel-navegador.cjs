/* =====================================================================
   Chispa · prueba en NAVEGADOR (Playwright con su propio Chromium) de
   «Comentarios y DMs», «Estadísticas · Día a día», «Anuncios» y
   «Automatizaciones» (chispa-panel.js), en ordenador y en iPhone (390 px):
     A) sin servidor → modo demostración con EJEMPLOS marcados, sin errores
     B) con el servidor simulado y las redes imitadas → todo de verdad
   Uso: PUERTO_API=8848 PUERTO_WEB=8845 NODE_PATH=<node_modules con sql.js y playwright-core> node pruebas/panel-navegador.cjs
   ===================================================================== */
const assert = require('assert'), fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
const R = require('./redes-imitadas-j.cjs');
const OUT = path.join(__dirname, '..', 'capturas', 'panel-real');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const s = await arrancar();
  R.instalar(s);
  const b = await chromium.launch();
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const abrir = async (ctx, url) => {
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errores.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::|unsplash|fonts\.g/i.test(m.text())) errores.push('consola: ' + m.text()); });
    await pg.goto(url, { waitUntil: 'load' }); await pg.waitForTimeout(1500); return pg;
  };
  const ancho = (pg) => pg.evaluate(() => document.documentElement.scrollWidth);
  const ir = async (pg, tab) => { await pg.evaluate((t) => { vista('panel'); panel(t); }, tab); await pg.waitForTimeout(500); };

  for (const [nombre, opciones] of [['ordenador', { viewport: { width: 1366, height: 900 } }], ['iphone', { ...devices['iPhone 13'] }]]) {
    // ---------------- A) demostración ----------------
    const c = await b.newContext(opciones);
    const p = await abrir(c, s.web + '/index.html#bandeja');
    let txt = await p.locator('#main').innerText();
    assert.match(txt, /Datos de EJEMPLO/); assert.match(txt, /Marta|marta/); assert.ok(!/promo_followers/.test(txt), 'el spam no sale en «sin responder»');
    const n0 = await p.locator('.cp-it').count();
    assert.ok(n0 >= 6, 'ejemplos: ' + n0);
    await p.locator('.cp-it', { hasText: 'marta.palma' }).locator('button:has-text("Enviar")').click();
    await p.waitForTimeout(400);
    assert.equal(await p.locator('.cp-it').count(), n0 - 1);
    assert.match(await p.locator('#toast').innerText(), /ejemplo/i);
    await p.click('.cp-fil button:has-text("Respondidos")'); await p.waitForTimeout(200);
    assert.match(await p.locator('#main').innerText(), /ejemplo · no se envía/);
    await p.click('.cp-fil button:has-text("Spam")'); await p.waitForTimeout(200);
    assert.match(await p.locator('#main').innerText(), /promo_followers/);
    await p.click('.cp-fil button:has-text("Sin responder")'); await p.waitForTimeout(200);
    await p.locator('.cp-it', { hasText: 'Toni' }).locator('.cp-tagb').click();
    await p.locator('.cp-etsel input[value="urgente"]').check(); await p.click('#modalBox button:has-text("Guardar")'); await p.waitForTimeout(200);
    assert.match(await p.locator('.cp-it', { hasText: 'Toni' }).innerText(), /Urgente/);
    await p.selectOption('.cp-fil2 select[aria-label="Tipo"]', 'resena'); await p.waitForTimeout(200);
    assert.ok((await p.locator('.cp-it').count()) >= 1 && !(await p.locator('#main').innerText()).includes('Toni'));
    await p.selectOption('.cp-fil2 select[aria-label="Tipo"]', '');
    if (nombre === 'iphone') assert.ok((await ancho(p)) <= 392, 'ancho ' + (await ancho(p)));
    await p.screenshot({ path: path.join(OUT, 'demo-bandeja-' + nombre + '.png'), fullPage: false });
    paso(nombre + ' · demostración: bandeja con EJEMPLOS, enviar (sin mandar nada), filtros, spam y etiquetas');

    await ir(p, 'stats'); await p.waitForTimeout(400);
    txt = await p.locator('#main').innerText();
    assert.match(txt, /Día a día/); assert.match(txt, /EJEMPLO/); assert.match(txt, /Consejos con tus datos/);
    assert.ok(await p.locator('#cpGraf').count());
    await p.locator('.cp-kpi').nth(1).click(); await p.waitForTimeout(300);
    assert.ok(await p.locator('.cp-kpi.on').count());
    if (nombre === 'iphone') assert.ok((await ancho(p)) <= 392);
    await p.locator('.cp-dia').screenshot({ path: path.join(OUT, 'demo-dia-a-dia-' + nombre + '.png') });
    paso(nombre + ' · demostración: «Día a día» con gráfica, totales de 7 días y consejos, marcado EJEMPLO');

    await ir(p, 'anuncios');
    await p.fill('#anDia', '0'); await p.click('button:has-text("Simular")'); await p.waitForTimeout(200);
    assert.match(await p.locator('#toast').innerText(), /presupuesto/i);
    await p.fill('#anDia', '6'); await p.fill('#anDias', '5'); await p.locator('#anDias').dispatchEvent('input');
    assert.match(await p.locator('#anTotal').innerText(), /30 €/);
    await p.click('button:has-text("Simular")'); await p.waitForTimeout(300);
    assert.match(await p.locator('#main').innerText(), /Tus campañas[\s\S]*Simulación/);
    if (nombre === 'iphone') assert.ok((await ancho(p)) <= 392);
    paso(nombre + ' · demostración: anuncio con validación, total máximo y simulación (no se envía)');

    await ir(p, 'automatizaciones');
    await p.click('button[aria-labelledby="rg-palabra_dm"]'); await p.waitForTimeout(200);
    await p.selectOption('#rg_resena_modo', 'automatica'); await p.click('button[aria-labelledby="rg-resena"]'); await p.waitForTimeout(200);
    await p.click('button:has-text("Probar con los ejemplos")'); await p.waitForTimeout(300);
    txt = await p.locator('#main').innerText();
    assert.match(txt, /mensaje privado preparado para @joana/); assert.match(txt, /Reseña de 2★ de Laura/); assert.match(txt, /contestada sola la reseña de 5★/);
    if (nombre === 'iphone') assert.ok((await ancho(p)) <= 392);
    await p.screenshot({ path: path.join(OUT, 'demo-automatizaciones-' + nombre + '.png') });
    paso(nombre + ' · demostración: reglas encendidas y probadas con los ejemplos (CARTA → privado, 5★ sola, 2★ aviso)');
    await c.close();
  }

  // ---------------- B) con servidor ----------------
  const pedir = async (metodo, ruta, cuerpo, ses) => { const r = await fetch(s.base + ruta, { method: metodo, headers: { 'Content-Type': 'application/json', ...(ses ? { Authorization: 'Bearer ' + ses } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined, redirect: 'manual' }); try { return await r.json(); } catch (e) { return {}; } };
  const ses = (await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: s.codigo })).sesion;
  for (const red of ['meta', 'google']) { const j = await pedir('POST', '/conectar/' + red, {}, ses); await fetch(s.base + '/oauth/vuelta?code=' + (red === 'google' ? 'codigo-bueno' : 'x') + '&state=' + new URL(j.url).searchParams.get('state'), { redirect: 'manual' }); }
  await pedir('POST', '/metricas/recoger', {}, ses);
  const cB = await b.newContext({ ...devices['iPhone 13'] });
  const P = await abrir(cB, s.web + '/index.html?servidor=' + encodeURIComponent(s.base) + '#conectar');
  await P.fill('#csCodigo', s.codigo);
  await P.click('#chispaSyncCard button:has-text("Entrar")');
  await P.waitForFunction(() => window.ChispaPanel && ChispaPanel.enServidor());
  await ir(P, 'bandeja'); await P.waitForTimeout(800);
  assert.match(await P.locator('#main').innerText(), /Conectado al servidor/);
  await P.click('button:has-text("Traer nuevos")');
  await P.waitForFunction(() => document.querySelectorAll('.cp-it').length >= 4, null, { timeout: 8000 });
  txt = await P.locator('#main').innerText();
  assert.match(txt, /marta\.palma/); assert.match(txt, /Peter Schmidt/); assert.ok(!/EJEMPLO/.test(txt.split('Sin responder')[1] || ''));
  const antes = s.registro.length;
  await P.locator('.cp-it', { hasText: 'marta.palma' }).locator('button:has-text("Enviar")').click();
  await P.waitForFunction(() => /Enviada por/.test(document.getElementById('toast').innerText), null, { timeout: 6000 });
  assert.ok(s.registro.slice(antes).some((c) => /k1\/replies/.test(c.url)));
  await P.screenshot({ path: path.join(OUT, 'servidor-bandeja-iphone.png') });
  paso('iPhone con servidor: «Traer nuevos» trae lo de Instagram, Facebook y Google y «Enviar» contesta por la API');

  await ir(P, 'stats'); await P.waitForTimeout(1200);
  txt = await P.locator('.cp-dia').innerText();
  assert.ok(!/EJEMPLO/.test(txt), 'con datos reales no pone EJEMPLO'); assert.match(txt, /recogidos por el servidor/);
  paso('iPhone con servidor: «Día a día» con los datos recogidos (sin EJEMPLO)');

  await ir(P, 'anuncios'); await P.waitForTimeout(600);
  await P.click('button:has-text("Crear (queda en pausa")');
  await P.waitForFunction(() => /En pausa · no gasta/.test(document.getElementById('main').innerText), null, { timeout: 8000 });
  assert.ok(s.registro.some((c) => /act_555\/ads$/.test(c.url)));
  P.once('dialog', (d) => d.accept());
  await P.click('.cp-an button:has-text("Activar")');
  await P.waitForFunction(() => /▶ Activa/.test(document.getElementById('main').innerText), null, { timeout: 8000 });
  paso('iPhone con servidor: crea la campaña en Meta en pausa y el dueño la activa (con confirmación)');

  await ir(P, 'automatizaciones'); await P.waitForTimeout(800);
  await P.click('button[aria-labelledby="rg-recordatorio"]');
  await P.waitForFunction(() => /Encendida/.test((document.querySelector('[aria-labelledby="rg-recordatorio"]') || {}).parentNode.innerText || ''), null, { timeout: 6000 });
  assert.equal(s.db.exec("SELECT COUNT(*) FROM reglas WHERE tipo='recordatorio' AND activa=1")[0].values[0][0], 1);
  assert.ok((await ancho(P)) <= 392);
  paso('iPhone con servidor: encender una regla la guarda en el servidor');

  await b.close(); s.cerrar();
  assert.deepEqual(errores, [], 'errores en la página: ' + errores.join(' | '));
  paso('ningún error de programa en ninguna pantalla');
  console.log('\n' + ok + ' comprobaciones en verde');
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
