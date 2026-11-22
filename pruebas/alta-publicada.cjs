/* Chispa · mirada ÚNICA a la web publicada (GitHub Pages) con el Chromium de Playwright:
   precios de precios.js, el alta abre y pide su reto al servidor desplegado (CORS bien). NO crea ningún alta.
   NODE_PATH=<node_modules con playwright-core> node pruebas/alta-publicada.cjs */
const assert = require('assert');
const { chromium, devices } = require('playwright-core');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
  const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  let reto = null; p.on('response', (r) => { if (/\/alta\/reto/.test(r.url())) reto = r.status(); });
  await p.goto('https://solers-es.github.io/chispa-demo/?v=' + Date.now(), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const t = await p.locator('#landing .planes').innerText();
  assert.match(t, /39 €/); assert.match(t, /79 €/); assert.match(t, /149 €/);
  console.log('  ✓ precios publicados: 39/79/149 € + IVA');
  await p.locator('#landing .plan[data-plan="basico"] button').click();
  await p.waitForSelector('#altaPag.on'); await p.waitForTimeout(2500);
  assert.equal(reto, 200); console.log('  ✓ el alta abre y el servidor desplegado le da su reto anti-robots (CORS bien)');
  const r = await p.request.get('https://solers-es.github.io/chispa-demo/legal/terminos.html'); assert.equal(r.status(), 200);
  console.log('  ✓ legal/terminos.html publicado');
  assert.deepEqual(errores, []); console.log('  ✓ sin errores de JavaScript');
  await b.close(); process.exit(0);
})().catch((e) => { console.error('✗', e); process.exit(1); });
