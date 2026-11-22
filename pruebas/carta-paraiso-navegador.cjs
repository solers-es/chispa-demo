/* Chispa · la carta de El Paraíso: «Ver carta» abre la carta de los CLIENTES (carta-paraiso.html),
   no el editor (carta.html). Playwright con su propio Chromium, sin red.
   1) Negocio nuevo: el enlace por defecto es carta-paraiso.html y el botón «Ver carta» la abre.
   2) Datos guardados antiguos con carta.html (Mi negocio, botones de una publicación, carta de ofertas):
      al recargar se cambian a carta-paraiso.html y NO se borra nada más (otros datos, carta.html?c=…).
     NODE_PATH=<node_modules con sql.js y playwright-core> node pruebas/carta-paraiso-navegador.cjs */
const assert = require('assert');
process.env.PUERTO_API = process.env.PUERTO_API || '8811';
process.env.PUERTO_WEB = process.env.PUERTO_WEB || '8812';
const { chromium } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
const BUENA = 'https://el-paraiso-eight.vercel.app/carta-paraiso.html';
const EDITOR = 'https://el-paraiso-eight.vercel.app/carta.html';

(async () => {
  const s = await arrancar();
  const b = await chromium.launch();
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.fulfill({ status: 204, body: '' }));
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errores.push(e.message));
  const abiertas = [];
  ctx.on('page', (p) => { abiertas.push(p.url()); p.close().catch(() => {}); });
  await pg.addInitScript(() => { const o = window.open; window.open = function (u) { (window._abiertas = window._abiertas || []).push(u); return o.apply(this, arguments); }; });
  const PAGINA = s.web + '/index.html?servidor=no';
  await pg.goto(PAGINA + '#panel', { waitUntil: 'load' }); await pg.waitForTimeout(800);

  // 1) por defecto
  assert.equal(await pg.evaluate(() => S.negocio.carta), BUENA);
  await pg.evaluate(() => { vista('panel'); panel('ajustes'); });
  assert.equal(await pg.inputValue('#mn_carta'), BUENA);
  await pg.evaluate(() => abrirCta('carta'));
  assert.equal(await pg.evaluate(() => (window._abiertas || []).pop()), BUENA);
  paso('por defecto «Ver carta» abre ' + BUENA);

  // 2) datos antiguos
  await pg.evaluate((ed) => {
    S.negocio.carta = ed; S.negocio.eventos = 'https://el-paraiso-eight.vercel.app/eventos.html'; S.negocio.nota = 'no se toca';
    S.agenda = S.agenda || [];
    S.agenda.push({ id: 'viejo1', titulo: 'Paella', txt: 'x', ctas: [{ t: '📖 Ver carta', tipo: 'carta', url: ed }, { t: 'Otra', tipo: 'web', url: 'https://el-paraiso-eight.vercel.app/carta.html?c=abc' }], redes: ['igf'], cuando: '2026-10-20T12:00', estado: 'borrador' });
    S.ofertasDia = S.ofertasDia || { v: 1 }; S.ofertasDia.cartaUrl = ed + '/';
    guardar();
  }, EDITOR);
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(800);
  const d = await pg.evaluate(() => ({ carta: S.negocio.carta, ev: S.negocio.eventos, nota: S.negocio.nota, it: S.agenda.find((a) => a.id === 'viejo1'), of: S.ofertasDia.cartaUrl, guardado: localStorage.getItem('chispa_proto_v1') }));
  assert.equal(d.carta, BUENA); assert.equal(d.ev, 'https://el-paraiso-eight.vercel.app/eventos.html'); assert.equal(d.nota, 'no se toca');
  assert.equal(d.it.ctas[0].url, BUENA); assert.equal(d.it.ctas[1].url, 'https://el-paraiso-eight.vercel.app/carta.html?c=abc'); assert.equal(d.it.titulo, 'Paella');
  assert.equal(d.of, BUENA);
  assert.ok(!/carta\.html"/.test(d.guardado), 'no queda carta.html guardado');
  paso('datos antiguos: carta.html → carta-paraiso.html en Mi negocio, en los botones de una publicación y en la carta de ofertas; lo demás intacto (incluido carta.html?c=…)');

  assert.deepEqual(errores, [], 'errores de programa: ' + errores.join(' | '));
  paso('0 errores de programa');
  await b.close(); s.cerrar();
  console.log(ok + ' comprobaciones en verde');
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
