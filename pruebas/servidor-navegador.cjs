/* Chispa · prueba en navegador (Playwright con su propio Chromium) del servidor simulado:
   portátil + iPhone con el mismo negocio, sin cuenta y sin red.
   NODE_PATH=<node_modules con sql.js y playwright-core> node pruebas/servidor-navegador.cjs */
const assert = require('assert'), fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
const OUT = path.join(__dirname, '..', 'capturas', 'servidor');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const s = await arrancar();
  const b = await chromium.launch();
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const abrir = async (ctx, url) => { const pg = await ctx.newPage(); pg.on('pageerror', (e) => errores.push(e.message)); await pg.goto(url, { waitUntil: 'load' }); await pg.waitForTimeout(1200); return pg; };
  const url = (hash) => s.web + '/index.html?servidor=' + encodeURIComponent(s.base) + (hash || '');
  // Google «de mentira»: en vez de la pantalla de permiso, vuelve directamente al servidor con el código
  const simularGoogle = (ctx) => ctx.route(/accounts\.google\.com/, (route) => {
    const u = new URL(route.request().url());
    route.fulfill({ status: 302, headers: { location: u.searchParams.get('redirect_uri') + '?code=codigo-bueno&state=' + u.searchParams.get('state') } });
  });

  // 0) sin servidor: modo demostración
  const c0 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p0 = await abrir(c0, s.web + '/index.html?servidor=no#conectar');
  assert.match(await p0.locator('#chispaSyncCard').innerText(), /Modo demostración/);
  assert.equal(await p0.evaluate(() => ChispaSync.estado().modo), 'demostracion');
  await p0.locator('#chispaSyncCard').screenshot({ path: path.join(OUT, 'demostracion.png') });
  paso('sin servidor: sigue con localStorage y Conexiones dice «Modo demostración»');
  await c0.close();

  // 1) portátil: entra con el código
  const cA = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await simularGoogle(cA);
  const A = await abrir(cA, url('#conectar'));
  assert.match(await A.locator('#chispaSyncCard').innerText(), /Entra en tu negocio/);
  await A.fill('#csCodigo', s.codigo);
  await A.click('#chispaSyncCard button:has-text("Entrar")');
  await A.waitForFunction(() => /Conectado en el servidor · vale para todos tus dispositivos/.test((document.getElementById('chispaSyncCard') || {}).innerText || ''));
  paso('portátil: entra con el código y sale «Conectado en el servidor · vale para todos tus dispositivos»');
  await A.evaluate(() => { S.negocio.oferta = '2x1 en postres (prueba servidor)'; guardar(); });
  await A.waitForTimeout(1800);
  let fila = s.db.exec("SELECT version, datos FROM estado WHERE doc='principal'")[0].values[0];
  assert.match(fila[1], /2x1 en postres \(prueba servidor\)/); paso('lo que se guarda en el portátil sube solo al servidor (versión ' + fila[0] + ')');

  // 2) conectar Google desde el portátil
  await A.click('#chispaSyncCard button[onclick*="conectar(\'google\')"]');
  await A.waitForURL(/index\.html/); await A.waitForTimeout(1800);
  assert.match(await A.locator('#chispaSyncCard').innerText(), /Google \(ficha del negocio\)\s*✓ Conectada/);
  assert.match(await A.locator('#cx_google').innerText(), /Conectada en el servidor/);
  await A.screenshot({ path: path.join(OUT, 'portatil-conexiones.png') });
  paso('portátil: Google conectado por OAuth y marcado en la guía');

  // 3) iPhone: entra con el enlace de «Enlazar otro móvil»
  await A.click('#chispaSyncCard button:has-text("Enlazar otro móvil")');
  await A.click('button:has-text("Para alguien del equipo")');
  await A.waitForSelector('#csEnlace');
  const enlace = await A.inputValue('#csEnlace');
  assert.match(enlace, /#acceso=el-paraiso\./);
  const cB = await b.newContext({ ...devices['iPhone 13'] });
  const B = await abrir(cB, enlace.replace('index.html', 'index.html?servidor=' + encodeURIComponent(s.base)));
  await B.waitForFunction(() => window.ChispaSync && ChispaSync.estado().modo === 'servidor');
  await B.waitForFunction(() => S.negocio.oferta === '2x1 en postres (prueba servidor)');
  await B.evaluate(() => { vista('panel'); panel('conectar'); });
  await B.waitForFunction(() => /Google \(ficha del negocio\)\s*✓ Conectada/.test((document.getElementById('chispaSyncCard') || {}).innerText || ''));
  await B.screenshot({ path: path.join(OUT, 'iphone-conexiones.png') });
  paso('iPhone: entra con el enlace, trae los datos y ve Google conectado SIN volver a enlazar');

  // 4) cambio en el iPhone → aparece solo en el portátil (al volver a la pestaña / cada 15 s)
  await B.evaluate(() => { S.negocio.telefono = '971 000 111'; guardar(); });
  await A.evaluate(() => { S.negocio.web = 'https://el-paraiso-eight.vercel.app/'; guardar(); }); // a la vez, otro campo
  await B.waitForTimeout(1500); await A.waitForTimeout(1500);
  await A.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await B.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await A.waitForFunction(() => S.negocio.telefono === '971 000 111', null, { timeout: 20000 });
  await B.waitForFunction(() => S.negocio.web === 'https://el-paraiso-eight.vercel.app/', null, { timeout: 20000 });
  paso('cambios a la vez en los dos aparatos: se juntan, no se pisa ninguno');

  // 5) sin tocar nada: el ciclo de ~15 s trae lo nuevo
  await B.evaluate(() => { S.negocio.oferta = 'Menú del día 14 €'; guardar(); });
  await A.waitForFunction(() => S.negocio.oferta === 'Menú del día 14 €', null, { timeout: 25000 });
  paso('sin recargar: el portátil se pone al día solo en menos de 20 s');

  // 6) el móvil (rol equipo) no puede conectar redes; el publicador queda configurado
  assert.equal(await B.evaluate(() => ChispaSync.esAdministrador()), false);
  assert.equal(await B.locator('#chispaSyncCard button:has-text("Conectar")').count(), 0);
  assert.equal(await A.evaluate(() => !!(window.CHISPA_PUBLICADOR && CHISPA_PUBLICADOR.conectada('gbp') && !CHISPA_PUBLICADOR.conectada('tt'))), true);
  paso('el móvil de equipo no ve botones de conectar; la agenda publica por el servidor en las redes conectadas');

  // 6 bis) si en el portátil se abre OTRO negocio (chispa-cuentas.js), la sincronización se pausa
  const vAntes = s.db.exec("SELECT version FROM estado WHERE doc='principal'")[0].values[0][0];
  await A.evaluate(() => { window._idReal = ChispaCuentas.idActual; ChispaCuentas.idActual = () => 'ej-cafeteria'; S.negocio.nombre = 'Cafetería de ejemplo'; guardar(); });
  await A.waitForTimeout(1500);
  assert.equal(s.db.exec("SELECT version FROM estado WHERE doc='principal'")[0].values[0][0], vAntes);
  assert.equal(await A.evaluate(() => ChispaSync.estado().pausado), true);
  await A.evaluate(() => { ChispaCuentas.idActual = window._idReal; S.negocio.nombre = 'El Paraíso'; guardar(); });
  paso('con otro negocio abierto (modo Solers) no se sube nada encima de El Paraíso');

  // 7) ningún token en el navegador
  const todo = await A.evaluate(() => JSON.stringify(localStorage));
  assert.ok(!/g-acceso|SECRETO/.test(todo)); paso('en el navegador no hay ningún token de las redes');

  assert.deepEqual(errores, []); paso('sin errores de JavaScript en las páginas');
  console.log('\n' + ok + ' comprobaciones en verde · capturas en capturas/servidor/');
  await b.close(); s.cerrar();
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
