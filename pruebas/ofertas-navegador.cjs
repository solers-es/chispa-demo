/* Chispa · «Tu plan de ofertas» en el navegador (Playwright con su propio Chromium) — trabajador L.
   0) Ordenador sin servidor: tiempo (Open-Meteo) y festivos (Nager.Date) imitados con días de calor,
      lluvia y un festivo; carta de El Paraíso imitada; todos los botones de una tarjeta.
   1) iPhone (390 px) con servidor: textos escritos por la IA (imitada) en una llamada, sin salirse del ancho.
   2) Plan Básico: 3 días y el candado de Pro y Agencia.
     NODE_PATH=<node_modules con sql.js y playwright-core> node pruebas/ofertas-navegador.cjs
   Capturas en capturas/ofertas/. */
const assert = require('assert'), fs = require('fs'), path = require('path');
process.env.PUERTO_API = process.env.PUERTO_API || '8797';
process.env.PUERTO_WEB = process.env.PUERTO_WEB || '8798';
const { chromium, devices } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
const OUT = path.join(__dirname, '..', 'capturas', 'ofertas');
fs.mkdirSync(OUT, { recursive: true });

const pad = (n) => (n < 10 ? '0' : '') + n;
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
const dia = (n) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d; };
// el tiempo imitado: el día +1 hace calor, el +2 llueve, el resto templado
const TIEMPO = { daily: { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_probability_max: [], precipitation_sum: [], wind_speed_10m_max: [] } };
for (let i = 0; i < 16; i++) {
  const t = TIEMPO.daily; t.time.push(iso(dia(i)));
  t.weather_code.push(i === 2 ? 63 : 1); t.temperature_2m_max.push(i === 1 ? 32 : i === 2 ? 15 : 23); t.temperature_2m_min.push(14);
  t.precipitation_probability_max.push(i === 2 ? 90 : 5); t.precipitation_sum.push(i === 2 ? 12 : 0); t.wind_speed_10m_max.push(i === 3 ? 45 : 10);
}
const FESTIVO = iso(dia(4));
const NAGER = (anio) => [{ date: FESTIVO, localName: 'Festivo de prueba', name: 'Test', global: true, counties: null }, { date: anio + '-03-01', localName: 'Dia de les Illes Balears', global: false, counties: ['ES-IB'] }, { date: iso(dia(5)), localName: 'Fiesta de otra comunidad', global: false, counties: ['ES-AN'] }];
const CARTA = { existe: true, carta: { secciones: [
  { titulo: 'Paellas y Arroces', platos: [{ nom: 'Paella Mixta', precio: '2p 46 · 3p 64 €' }, { nom: 'Arroz Caldoso de Marisco', precio: '18,90 €' }] },
  { titulo: 'Ensaladas', platos: [{ nom: 'Ensalada César', precio: '13,90 €' }, { nom: 'Ceviche de Corvina', precio: '' }] },
  { titulo: 'Carnes a la Parrilla', platos: [{ nom: 'Churrasco a la Parrilla', precio: '19 €' }] },
  { titulo: 'Especialidades Caribeñas', platos: [{ nom: 'Picapollo Caribeño', precio: '2p 20 · 4p 30 €' }, { nom: 'Mofongo Tradicional', precio: '18,00 €' }] },
  { titulo: 'Hamburguesas', platos: [{ nom: 'Hamburguesa Paraíso XL', precio: '14,90 €' }] },
  { titulo: 'Postres', platos: [{ nom: 'Tarta de Coco', precio: '3,70 €' }] }] } };

(async () => {
  const s = await arrancar();
  // la IA imitada contesta el formato del plan de ofertas
  const runSim = s.env.AI.run; let llamadasOfertas = 0;
  s.env.AI.run = async (modelo, e) => {
    if (/llama/.test(modelo) && /daily offer posts/.test(e.messages[0].content)) {
      llamadasOfertas++;
      const dias = JSON.parse(e.messages[1].content.split('Days (JSON):\n')[1].split('\n\nFor EACH')[0]);
      return { choices: [{ message: { content: JSON.stringify({ dias: dias.map((d) => ({ clave: d.clave, titulo: d.plato, texto: 'IA: ' + d.plato + ' con ' + d.bebida + ' · ' + d.oferta, hashtags: ['#PalmaIA'] })) }) } }], usage: { neurons: 150 } };
    }
    return runSim(modelo, e);
  };
  const b = await chromium.launch();
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const preparar = async (ctx) => {
    await ctx.route(/api\.open-meteo\.com/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TIEMPO) }));
    await ctx.route(/date\.nager\.at\/api\/v3\/PublicHolidays\/(\d+)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NAGER(r.request().url().match(/(\d{4})\/ES/)[1])) }));
    await ctx.route(/el-paraiso-eight\.vercel\.app\/carta-paraiso\.html/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<script>const ID_CARTA = "4244bca40f5248ee217447ae96196df2b63dd8d0c83bad2e01995251a87329ba";fetch("/api/datos?cartaweb="+ID_CARTA)</script>', headers: { 'Access-Control-Allow-Origin': '*' } }));
    await ctx.route(/el-paraiso-eight\.vercel\.app\/api\/datos\?cartaweb=/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CARTA), headers: { 'Access-Control-Allow-Origin': '*' } }));
  };
  const abrir = async (ctx, url) => { const pg = await ctx.newPage(); pg.on('pageerror', (e) => errores.push(e.message)); pg.on('dialog', (d) => d.accept()); await pg.goto(url, { waitUntil: 'load' }); await pg.waitForTimeout(900); return pg; };
  const url = (hash) => s.web + '/index.html?servidor=' + encodeURIComponent(s.base) + (hash || '');
  const tocar = async (pg, sel) => { const l = pg.locator(sel).first(); await l.evaluate((el) => el.scrollIntoView({ block: 'center' })); await l.click(); };
  const entrar = async (pg, codigo, negocio) => {
    if (negocio) await pg.fill('#csNegocio', negocio);
    await pg.fill('#csCodigo', codigo);
    await pg.click('#chispaSyncCard button:has-text("Entrar")');
    await pg.waitForFunction(() => /Conectado en el servidor/.test((document.getElementById('chispaSyncCard') || {}).innerText || ''), null, { timeout: 8000 });
  };
  const tarjeta = (pg, n) => pg.locator('.od-dia').nth(n);

  // 0) ordenador, sin servidor
  const c0 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await preparar(c0);
  const p0 = await abrir(c0, s.web + '/index.html?servidor=no#ofertas');
  await p0.waitForFunction(() => /Open-Meteo/.test(document.querySelector('.od-fuentes') ? document.querySelector('.od-fuentes').innerText : ''), null, { timeout: 8000 });
  assert.match(await p0.locator('#nav').innerText(), /Plan de ofertas/);
  const n0 = await p0.locator('.od-dia').count();
  assert.equal(n0, 7);
  let t = await p0.locator('#main').innerText();
  assert.match(t, /Tu plan de ofertas/); assert.match(t, /Nager\.Date/); assert.match(t, /Modo demostración/);
  paso('#ofertas abre la sección: 7 días, con las fuentes a la vista (Open-Meteo, Nager.Date)');
  const dias = await p0.evaluate(() => ChispaOfertas.dias().map((p) => ({ f: p.fecha, cerrado: p.cerrado, k: p.cx.k, a: p.a && p.a.nombre, b: p.b && p.b.nombre, oferta: p.oferta, por: p.porque, fest: p.cx.festivo && p.cx.festivo.nombre })));
  const mie = dias.find((d) => d.k === 2);
  assert.ok(mie && mie.cerrado, 'El Paraíso cierra el miércoles'); paso('el miércoles sale CERRADO (El Paraíso) y no propone oferta');
  const desde = dias[0].f === iso(dia(0)) ? 0 : 1;
  const calor = dias.find((d) => d.f === iso(dia(1))), lluvia = dias.find((d) => d.f === iso(dia(2))), fest = dias.find((d) => d.f === FESTIVO);
  if (calor && !calor.cerrado) { assert.match(calor.por, /32 °C/); assert.match(calor.b, /Mojito|Tinto de verano|Limonada|Cerveza|Sangría/); }
  if (lluvia && !lluvia.cerrado) { assert.match(lluvia.por, /lluvia/); }
  if (fest && !fest.cerrado) { assert.equal(fest.fest, 'Festivo de prueba'); assert.match(fest.por, /Festivo de prueba/); }
  assert.ok(!dias.some((d) => d.fest === 'Fiesta de otra comunidad'), 'un festivo de otra comunidad no cuenta en Palma');
  paso('calor → bebida fría y «32 °C» en el porqué; lluvia en el porqué; festivo nacional sí, el de otra comunidad no (desde=' + desde + ')');
  assert.ok(dias.filter((d) => !d.cerrado).every((d) => !/\d+(?:[.,]\d+)?\s*€/.test(d.oferta.replace(/… €/g, ''))), 'sin carta no hay ni un precio inventado');
  paso('sin carta: ningún precio inventado (la oferta lleva «… €»)');

  // la carta
  await tocar(p0, '#main button:has-text("Importar tu carta")');
  assert.equal(await p0.inputValue('#odUrl'), 'https://el-paraiso-eight.vercel.app/carta-paraiso.html');
  await p0.click('#modalBox button:has-text("Leer")');
  await p0.waitForFunction(() => /leídos/.test(document.getElementById('odCartaEst').innerText), null, { timeout: 8000 });
  assert.equal(await p0.locator('.od-ci').count(), 9);
  await p0.fill('#odPegar', 'Bebidas:\nMojito 7,50 €\nChocolate caliente');
  await p0.click('#modalBox button:has-text("Añadir a la lista")');
  assert.equal(await p0.locator('.od-ci').count(), 11);
  await p0.screenshot({ path: path.join(OUT, 'carta.png') });
  await p0.evaluate(() => cerrarModal());
  const conCarta = await p0.evaluate(() => ChispaOfertas.dias().filter((p) => !p.cerrado).map((p) => ({ f: p.fecha, a: p.a.nombre, ap: p.a.precio, b: p.b.nombre, bp: p.b.precio })));
  const nombres = ['Paella Mixta', 'Arroz Caldoso de Marisco', 'Ensalada César', 'Ceviche de Corvina', 'Churrasco a la Parrilla', 'Picapollo Caribeño', 'Mofongo Tradicional', 'Hamburguesa Paraíso XL'];
  assert.ok(conCarta.every((d) => nombres.includes(d.a)), 'los platos salen de la carta: ' + conCarta.map((d) => d.a).join(', '));
  assert.ok(conCarta.every((d) => ['Mojito', 'Chocolate caliente'].includes(d.b)));
  const lluviaC = conCarta.find((d) => d.f === iso(dia(2))); if (lluviaC) assert.equal(lluviaC.b, 'Chocolate caliente');
  const calorC = conCarta.find((d) => d.f === iso(dia(1))); if (calorC) assert.equal(calorC.b, 'Mojito');
  assert.ok(!conCarta.some((d) => d.a === 'Tarta de Coco'), 'el postre no es el plato del día');
  t = await p0.locator('#main').innerText();
  assert.match(t, /Tu carta \(11\)/);
  paso('carta de El Paraíso importada (9) + lista pegada (2 bebidas): platos de la carta con su precio; lluvia → chocolate, calor → mojito');
  const ceviche = await p0.evaluate(() => { const c = S.ofertasDia.carta.find((x) => x.nombre === 'Ceviche de Corvina'); return c.precio; });
  assert.equal(ceviche, ''); paso('el plato sin precio en la carta queda sin precio (hueco «… €»)');

  // botones de una tarjeta abierta
  const iAbierta = dias.findIndex((d) => !d.cerrado);
  const fA = dias[iAbierta].f;
  const antesA = await p0.evaluate((f) => ChispaOfertas.propuesta(f).a.nombre, fA);
  await tocar(p0, '.od-dia[data-f="' + fA + '"] button:has-text("No me gusta")');
  await p0.click('#modalBox button:has-text("Plato")');
  const desp = await p0.evaluate((f) => ({ a: ChispaOfertas.propuesta(f).a.nombre, ng: S.ofertasDia.nomegusta }), fA);
  assert.notEqual(desp.a, antesA); assert.ok(Object.keys(desp.ng).length === 1);
  const enOtros = await p0.evaluate(() => ChispaOfertas.dias().filter((p) => !p.cerrado).map((p) => p.a.nombre));
  assert.ok(!enOtros.includes(antesA), 'lo que no gusta no vuelve a salir ningún día');
  paso('«No me gusta» el plato: desaparece de todos los días y queda apuntado (S.ofertasDia, se sincroniza por negocio)');
  await tocar(p0, '.od-dia[data-f="' + fA + '"] button:has-text("Otra idea")');
  assert.equal(await p0.evaluate((f) => S.ofertasDia.semillas[f], fA), 2);
  await tocar(p0, '.od-dia[data-f="' + fA + '"] button:has-text("Cambiar")');
  await p0.selectOption('#odSelA', 'Mofongo Tradicional');
  await p0.fill('#odOtroB', 'Morir soñando');
  await p0.click('#modalBox button:has-text("Guardar")');
  t = await p0.locator('.od-dia[data-f="' + fA + '"]').innerText();
  assert.match(t, /Mofongo Tradicional/); assert.match(t, /18,00 €/); assert.match(t, /Morir soñando/); assert.match(t, /… €/);
  paso('«Otra idea» y «Cambiar plato/bebida» (de la carta con su precio, o escrita a mano con el hueco «… €»)');
  await tocar(p0, '.od-dia[data-f="' + fA + '"] button:has-text("Imagen con IA")');
  await p0.waitForTimeout(600);
  await tocar(p0, '.od-dia[data-f="' + fA + '"] button:has-text("Usar esta propuesta")');
  await p0.waitForSelector('#modalBox:has-text("En tu calendario")');
  let ag = await p0.evaluate((f) => S.agenda.filter((a) => a.origen === 'ofertas' && a.ofertaFecha === f), fA);
  assert.equal(ag.length, 2); assert.ok(ag.every((a) => a.estado === 'borrador'));
  assert.ok(ag.some((a) => a.modo === 'franja' && a.promo && a.redes.indexOf('wa') >= 0), 'la franja de la promo con historias y WhatsApp');
  assert.ok(ag.some((a) => a.modo === 'hora' && /Mofongo/.test(a.titulo) && a.txt.length > 20));
  await p0.locator('#modalBox').screenshot({ path: path.join(OUT, 'usar.png') });
  await p0.click('#modalBox button:has-text("Abrir en Publicar")');
  await p0.waitForTimeout(500);
  assert.ok(await p0.locator('#cmOv.on').count(), 'se abre la ventana Publicar del Estudio');
  await p0.evaluate(() => { cerrarModal(); cmCerrar(); });
  paso('«Usar esta propuesta»: publicación + franja de promo en el calendario REAL como borrador, y «Abrir en Publicar»');
  await p0.evaluate(() => panel('ofertas'));
  await tocar(p0, '#main button:has-text("Planificar la semana entera")');
  await p0.waitForSelector('#modalBox:has-text("Semana planificada")');
  const usadas = await p0.evaluate(() => Object.keys(S.ofertasDia.usadas).length);
  assert.equal(usadas, dias.filter((d) => !d.cerrado).length);
  await p0.evaluate(() => cerrarModal());
  assert.equal(await p0.locator('.od-dia.usada').count(), usadas);
  paso('«Planificar la semana entera» de un toque: todos los días abiertos al calendario (' + usadas + '), sin repetir el ya usado');
  await tocar(p0, '.od-seg button:has-text("14 días")');
  assert.equal(await p0.locator('.od-dia').count(), 14);
  await p0.screenshot({ path: path.join(OUT, 'ordenador-14-dias.png'), fullPage: false });
  paso('vista de 14 días');
  await p0.evaluate(() => panel('asistente'));
  await p0.waitForSelector('#odAsis .od-at');
  assert.match(await p0.locator('#odAsis').innerText(), /Tu plan de ofertas/);
  await p0.locator('#odAsis').screenshot({ path: path.join(OUT, 'asistente.png') });
  paso('tarjeta en el Asistente con la propuesta del día y «Ver el plan»');
  // idioma del negocio: la plantilla sale en inglés (oferta incluida)
  const en = await p0.evaluate(() => { S.negocio.idioma = { codigo: 'en', nombre: 'Inglés' }; return ChispaOfertas.dias().filter((p) => !p.cerrado).map((p) => p.texto); });
  assert.ok(en.every((x) => /Today|Hot out|Rainy day|plan|Plan sorted|calls for/.test(x) && !/ por … €|Día de lluvia|Para compartir/.test(x)), en.join(' || '));
  await p0.evaluate(() => { S.negocio.idioma = { codigo: 'es', nombre: 'Español' }; });
  paso('negocio en inglés: el texto de respaldo sale en inglés, oferta incluida');
  // peluquería: servicio del día, sin bebidas
  await p0.evaluate(() => { S.negocio.sectorId = 'peluqueria'; S.negocio.nombre = 'Pelu Prueba'; S.negocio.horario = null; S.ofertasDia.carta = []; panel('ofertas'); });
  t = await p0.locator('#main').innerText();
  assert.match(t, /Servicio del día/); assert.doesNotMatch(t, /🥤 Bebida/); assert.doesNotMatch(t, /Cerrado\./);
  const pelu = await p0.evaluate(() => ChispaOfertas.dias().map((p) => p.oferta));
  assert.ok(pelu.every((o) => !/\d+(?:[.,]\d+)?\s*€/.test(o.replace(/… €/g, ''))), 'peluquería: sin precios inventados: ' + pelu.join(' | '));
  paso('peluquería: «Servicio del día» y «Extra», sin bebidas, y los precios de ejemplo del sector cambiados por «… €»');
  await c0.close();

  // 1) iPhone con servidor: textos con IA
  const c1 = await b.newContext({ ...devices['iPhone 13'] });
  await preparar(c1);
  const p1 = await abrir(c1, url('#conectar'));
  await entrar(p1, s.codigo);
  await p1.evaluate(() => panel('ofertas'));
  await p1.waitForFunction(() => document.querySelectorAll('.od-dia').length === 7 && /Escrito por la IA/.test(document.getElementById('main').textContent), null, { timeout: 15000 })
    .catch(async (e) => { console.log('PANTALLA:', (await p1.locator('#main').innerText()).slice(0, 1500), 'LLAMADAS:', llamadasOfertas); throw e; });
  assert.equal(llamadasOfertas, 1, 'una sola llamada a la IA para la semana');
  t = await p1.locator('#main').innerText();
  assert.match(t, /IA: /); assert.match(t, /#PalmaIA/); assert.doesNotMatch(t, /Modo demostración/);
  const ancho = await p1.evaluate(() => ({ w: document.documentElement.scrollWidth, v: window.innerWidth }));
  assert.ok(ancho.w <= ancho.v + 1, 'no se sale del ancho del iPhone: ' + JSON.stringify(ancho));
  await p1.screenshot({ path: path.join(OUT, 'iphone-ia.png') });
  await p1.locator('.od-dia').first().screenshot({ path: path.join(OUT, 'iphone-tarjeta.png') });
  paso('iPhone con servidor: la IA escribe los 7 textos en UNA llamada y nada se sale de los 390 px');
  await c1.close();

  // 2) plan Básico: 3 días
  const r = await fetch(s.base + '/admin/negocios', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chispa-Admin': s.env.ADMIN_CLAVE }, body: JSON.stringify({ id: 'bar-basico', nombre: 'Bar Básico' }) }).then((x) => x.json());
  s.db.run("INSERT INTO cuentas (negocio, plan, estado, prueba_hasta, creado, actualizado) VALUES ('bar-basico', 'basico', 'prueba', ?, ?, ?)", [Date.now() + 5 * 864e5, Date.now(), Date.now()]);
  const c2 = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await preparar(c2);
  const p2 = await abrir(c2, url('#conectar'));
  await entrar(p2, r.codigo, 'bar-basico');
  await p2.evaluate(() => panel('ofertas'));
  await p2.waitForFunction(() => document.querySelectorAll('.od-dia').length === 3 && /Pro y Agencia/.test(document.getElementById('main').innerText), null, { timeout: 15000 });
  await p2.screenshot({ path: path.join(OUT, 'basico-3-dias.png') });
  paso('plan Básico: 3 días y el candado «con Pro y Agencia planificas 14 días»');
  await c2.close();

  assert.deepEqual(errores, [], 'errores de programa: ' + errores.join(' | '));
  paso('0 errores de programa en las tres sesiones');
  await b.close(); s.cerrar();
  console.log(ok + ' comprobaciones en verde · capturas en capturas/ofertas/');
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
