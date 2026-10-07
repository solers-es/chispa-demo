/* =====================================================================
   Chispa · mirada ÚNICA a la web PUBLICADA con el servidor encendido
   (CHISPA_SERVIDOR en index.html), con el Chromium de Playwright:
     1) visitante sin código (iPhone y ordenador): la demostración entera,
        sin errores, con los EJEMPLOS marcados; el chat contesta.
     2) El Paraíso entra con su código: bandeja, «Día a día», anuncios y
        automatizaciones contra el servidor. SOLO LEE: no crea anuncios ni
        reglas, no contesta a nadie. Al final cierra esa sesión.
   El código se lee de un fichero local (CHISPA_CODIGO_FICHERO, por defecto
   ~/herramientas/chispa-servidor-claves.txt, línea ALTA_EL_PARAISO={…}) y no
   se imprime nunca.
   Uso: NODE_PATH=<node_modules con playwright-core> node pruebas/servidor-encendido-publicada.cjs
   ===================================================================== */
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const { chromium, devices } = require('playwright-core');
const WEB = 'https://solers-es.github.io/chispa-demo/';
(async () => {
  const b = await chromium.launch();
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const nueva = async (opc) => { const c = await b.newContext(opc); const p = await c.newPage(); p.on('pageerror', (e) => errores.push(e.message)); return [c, p]; };

  for (const [nombre, opc] of [['iPhone', { ...devices['iPhone 13'] }], ['ordenador', { viewport: { width: 1366, height: 900 } }]]) {
    const [c, p] = await nueva(opc);
    await p.goto(WEB + '?v=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const srv = await p.evaluate(() => ChispaSync.estado());
    assert.equal(srv.servidor, 'https://chispa-api.solers.workers.dev'); assert.equal(srv.modo, 'sin-sesion');
    for (const tab of ['asistente', 'calendario', 'bandeja', 'resenas', 'automatizaciones', 'anuncios', 'stats', 'ajustes', 'conectar']) {
      await p.evaluate((t) => { vista('panel'); panel(t); }, tab); await p.waitForTimeout(tab === 'stats' ? 1200 : 500);
    }
    await p.evaluate(() => { vista('panel'); panel('bandeja'); }); await p.waitForTimeout(500);
    assert.match(await p.locator('#main').innerText(), /Datos de EJEMPLO[\s\S]*Entra con el código/);
    if (nombre === 'iPhone') assert.ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 392);
    paso(nombre + ' · visitante sin código: todas las pestañas del panel abren, bandeja de EJEMPLO con el aviso de entrar');
    await p.evaluate(() => vista('landing'));
    await p.evaluate(() => abrirChat()); await p.waitForTimeout(1000);
    await p.fill('#chatTxt', '¿Me ayudáis con una cafetería?'); await p.evaluate(() => preguntarLibre());
    await p.waitForFunction(() => document.querySelectorAll('#stream .bub.ia').length >= 2, null, { timeout: 20000 });
    paso(nombre + ' · el chat de la portada contesta');
    await c.close();
  }

  // El Paraíso con su código (solo lectura)
  const fich = process.env.CHISPA_CODIGO_FICHERO || path.join(os.homedir(), 'herramientas', 'chispa-servidor-claves.txt');
  const linea = fs.readFileSync(fich, 'utf8').split('\n').filter((l) => /^ALTA_EL_PARAISO=\{/.test(l)).pop();
  const alta = JSON.parse(linea.slice('ALTA_EL_PARAISO='.length));
  const [c, p] = await nueva({ ...devices['iPhone 13'] });
  await p.goto(WEB + '?v=' + Date.now() + '#conectar', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  await p.evaluate(() => { vista('panel'); panel('conectar'); }); await p.waitForTimeout(600);
  await p.fill('#csCodigo', alta.codigo);
  await p.click('#chispaSyncCard button:has-text("Entrar")');
  await p.waitForFunction(() => window.ChispaPanel && ChispaPanel.enServidor(), null, { timeout: 15000 });
  paso('El Paraíso entra con su código');
  await p.evaluate(() => { vista('panel'); panel('bandeja'); }); await p.waitForTimeout(2500);
  assert.match(await p.locator('#main').innerText(), /Conectado al servidor/);
  await p.evaluate(() => panel('stats')); await p.waitForTimeout(2500);
  assert.match(await p.locator('.cp-dia').innerText(), /Día a día/);
  await p.evaluate(() => panel('anuncios')); await p.waitForTimeout(2000);
  assert.ok(!/⚠️/.test(await p.locator('#main').innerText().then((t) => t.split('Nueva campaña')[0])));
  await p.evaluate(() => panel('automatizaciones')); await p.waitForTimeout(2500);
  assert.match(await p.locator('#main').innerText(), /Estas reglas las ejecuta el servidor/);
  paso('El Paraíso: bandeja, «Día a día», anuncios y automatizaciones contra el servidor, sin errores');
  await p.evaluate(() => ChispaSync.pedir('DELETE', '/sesion')).catch(() => {});
  await c.close(); await b.close();
  assert.deepEqual(errores, [], errores.join(' | ')); paso('sin errores de JavaScript');
  console.log('\n' + ok + ' comprobaciones en verde');
})().catch((e) => { console.error('✗ FALLO:', e.message); process.exit(1); });
