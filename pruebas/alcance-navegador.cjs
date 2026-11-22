/* Chispa · «🚀 Llegar a gente nueva gratis» en el navegador (Playwright con su propio Chromium, sin red).
   0) Ordenador, El Paraíso, sin servidor: las seis formas, cada botón deja algo REAL (calendario,
      candidatos, canjes, textos para copiar) y lo honesto está dicho (Patrocinado = pagando a Meta).
   1) Peluquería, creador e inglés: se adapta al sector y al idioma.
   2) iPhone (390 px): nada se sale del ancho.
     NODE_PATH=<node_modules con sql.js y playwright-core> node pruebas/alcance-navegador.cjs
   Capturas en capturas/alcance/. */
const assert = require('assert'), fs = require('fs'), path = require('path');
process.env.PUERTO_API = process.env.PUERTO_API || '8813';
process.env.PUERTO_WEB = process.env.PUERTO_WEB || '8814';
const { chromium, devices } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');
const OUT = path.join(__dirname, '..', 'capturas', 'alcance');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const s = await arrancar();
  const b = await chromium.launch();
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const errores = [];
  const preparar = async (ctx) => {
    await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.fulfill({ status: 204, body: '' }));
    await ctx.addInitScript(() => {
      window._abiertas = []; window._copiado = [];
      window.open = function (u) { window._abiertas.push(u); return { opener: null, close() {} }; };
      try { localStorage.setItem('chispa_tour_visto', '1'); } catch (e) {}
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window._copiado.push(t); return Promise.resolve(); } }, configurable: true });
    });
  };
  const abrir = async (ctx, hash) => {
    const pg = await ctx.newPage(); pg.on('pageerror', (e) => errores.push(e.message));
    pg.on('dialog', (d) => d.type() === 'prompt' ? d.accept('@elsazondequisqueya') : d.accept());
    await pg.goto(s.web + '/index.html?servidor=no' + (hash || ''), { waitUntil: 'load' }); await pg.waitForTimeout(700); return pg;
  };
  const tocar = async (pg, sel) => { const l = pg.locator(sel).first(); await l.evaluate((el) => el.scrollIntoView({ block: 'center' })); await l.click(); };
  const sub = (pg, t) => tocar(pg, '.al-sub button:has-text("' + t + '")');
  const ultimo = (pg) => pg.evaluate(() => S.agenda[S.agenda.length - 1]);
  const copiado = (pg) => pg.evaluate(() => window._copiado[window._copiado.length - 1] || '');

  // 0) ordenador, El Paraíso
  const c0 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await preparar(c0);
  const p = await abrir(c0, '#alcance');
  assert.match(await p.locator('#nav').innerText(), /Llegar a gente nueva/);
  let t = await p.locator('#main').innerText();
  assert.match(t, /Llegar a gente nueva gratis/); assert.match(t, /solo existe pagando a Meta/); assert.match(t, /desde 1-2 €\/día en Meta/);
  assert.equal(await p.locator('.al-sub button').count(), 6);
  await p.screenshot({ path: path.join(OUT, 'ordenador-reels-prueba.png') });
  paso('#alcance abre la sección: 6 formas, la advertencia de «Patrocinado = pagando a Meta» y la línea de anuncios');

  // 🧪 reels de prueba
  const n0 = await p.evaluate(() => (S.agenda || []).filter((a) => a.origen === 'alcance').length);
  await tocar(p, '.al-chip >> nth=1');
  await p.selectOption('#alGrad', 'SS_PERFORMANCE');
  await tocar(p, 'button:has-text("Preparar reel de prueba")');
  await p.waitForSelector('#modalBox:has-text("En tu calendario")');
  let it = await ultimo(p);
  assert.equal(await p.evaluate(() => S.agenda.filter((a) => a.origen === 'alcance').length), n0 + 1);
  assert.equal(it.formato, 'reel'); assert.equal(it.prueba, 'SS_PERFORMANCE'); assert.equal(it.estado, 'borrador'); assert.deepEqual(it.redes, ['igf']); assert.match(it.titulo, /Reel de prueba/);
  t = await p.locator('#modalBox').innerText(); assert.match(t, /Reel de prueba/); assert.match(t, /Trial/);
  assert.match(await p.locator('#main').innerText(), /trial_params/);
  await p.locator('#modalBox').screenshot({ path: path.join(OUT, 'reel-prueba-hecho.png') });
  await p.click('#modalBox button:has-text("Abrir en Publicar")'); await p.waitForTimeout(400);
  assert.ok(await p.locator('#cmOv.on').count(), 'abre la ventana Publicar del Estudio');
  await p.evaluate(() => { cmCerrar(); panel('alcance'); });
  paso('reel de prueba: al calendario REAL como borrador con prueba=SS_PERFORMANCE, pasos para activarlo, «Abrir en Publicar» y dice lo de la API (trial_params)');

  // 🤝 colaboraciones
  await sub(p, 'Colaboraciones');
  t = await p.locator('#main').innerText();
  assert.match(t, /El Sazón de Quisqueya/); assert.match(t, /Creadores de comida de Palma/); assert.match(t, /Instagram no lo permite/);
  await tocar(p, 'button:has-text("En Instagram (etiqueta)")');
  assert.match(await p.evaluate(() => window._abiertas.pop()), /instagram\.com\/explore\/tags\/foodiepalma/);
  await tocar(p, 'button:has-text("Negocios vecinos")');
  assert.match(await p.evaluate(() => window._abiertas.pop()), /google\.com\/maps\/search\/negocios/);
  await p.fill('#alCu', 'no vale!'); await tocar(p, 'button:has-text("Añadir candidato")');
  assert.equal(await p.evaluate(() => S.alcance.candidatos.length), 1, 'un @ inválido no se apunta');
  await p.fill('#alCu', '@mallorcafoodie'); await p.fill('#alCn', 'Mallorca Foodie'); await tocar(p, 'button:has-text("Añadir candidato")');
  assert.equal(await p.evaluate(() => S.alcance.candidatos.length), 2);
  await tocar(p, '.al-it:has-text("Mallorca Foodie") button:has-text("Mensaje de propuesta")');
  t = await p.inputValue('#alMsg'); assert.match(t, /Mallorca Foodie/); assert.match(t, /Collab/); assert.match(t, /El Paraíso/);
  await p.click('#modalBox button:has-text("Copiar")');
  assert.match(await copiado(p), /Collab/); assert.equal(await p.evaluate(() => window._abiertas.pop()), 'https://www.instagram.com/mallorcafoodie/');
  assert.equal(await p.evaluate(() => S.alcance.candidatos[1].estado), 'escrito');
  await tocar(p, '.al-it:has-text("Mallorca Foodie") button:has-text("Preparar publicación Collab")');
  await p.waitForSelector('#modalBox:has-text("Invitar colaborador")');
  it = await ultimo(p); assert.deepEqual(it.colaboradores, ['mallorcafoodie']); assert.equal(it.formato, 'reel');
  await p.evaluate(() => cerrarModal());
  await tocar(p, '.al-it:has-text("Sazón") button:has-text("Preparar publicación Collab")');
  assert.match(await p.locator('#toast').innerText(), /Pon primero su @/);
  await tocar(p, '.al-it:has-text("Mallorca Foodie") button:has-text("Estado")');
  assert.equal(await p.evaluate(() => S.alcance.candidatos[1].estado), 'acepto');
  await p.screenshot({ path: path.join(OUT, 'collab.png') });
  paso('Collab: buscador (Instagram, Maps), candidato con @ validado, propuesta copiada que abre su perfil, publicación con collaborators=[mallorcafoodie] y estados');

  // 🎁 canje
  await sub(p, 'Canje');
  t = await p.locator('#main').innerText();
  assert.match(t, /comer para dos/); assert.match(t, /contraprestación/); assert.match(t, /no asesoramiento legal/);
  const hrefs = await p.locator('.al-fuente a').evaluateAll((as) => as.map((a) => a.href));
  assert.ok(hrefs.some((h) => /autocontrol\.es\/documentos\/codigo-de-conducta-sobre-el-uso-de-influencers/.test(h)));
  assert.ok(hrefs.some((h) => /BOE-A-2022-11311/.test(h)) && hrefs.some((h) => /BOE-A-2024-8716/.test(h)));
  await p.fill('#alCjN', '@mallorcafoodie');
  await tocar(p, 'button:has-text("Ver el mensaje listo")');
  t = await p.inputValue('#alMsg'); assert.match(t, /comer para dos/); assert.match(t, /marcada como publicidad/);
  await p.click('#modalBox button:has-text("Copiar")');
  await tocar(p, 'button:has-text("Apuntar este canje")');
  await tocar(p, '.al-lista button:has-text("Siguiente paso")');
  await tocar(p, '.al-lista button:has-text("Abrir")');
  await p.locator('#modalBox .al-cb input').nth(0).check(); await p.locator('#modalBox .al-cb input').nth(1).check();
  await p.fill('#alCjE', 'instagram.com/reel/abc');
  await p.click('#modalBox button:has-text("Guardar")');
  const cj = await p.evaluate(() => S.alcance.canjes[0]);
  assert.equal(cj.estado, 'aceptado'); assert.equal(cj.check.marca, true); assert.equal(cj.check.contra, true); assert.equal(cj.enlace, 'https://instagram.com/reel/abc');
  assert.match(await p.locator('#main').innerText(), /2\/5/);
  await tocar(p, '.al-lista button:has-text("Abrir")');
  await p.click('#modalBox button:has-text("Compartirlo en tus historias")');
  it = await ultimo(p); assert.deepEqual(it.redes, ['igs']); assert.equal(it.formato, 'historia');
  await p.evaluate(() => cerrarModal());
  await p.screenshot({ path: path.join(OUT, 'canje.png') });
  paso('canje: mensaje con «marcada como publicidad», lista legal con Autocontrol, Ley 13/2022 y RD 444/2024, seguimiento (estado, 2/5 comprobado, enlace) y compartir en historias');

  // 📍 local y Google
  await sub(p, 'Ubicación');
  const tags = await p.evaluate(() => ChispaAlcance.tags());
  assert.ok(tags.length <= 5 && tags.includes('#Palma'), tags.join(' '));
  await tocar(p, 'button:has-text("Copiar estas etiquetas")'); assert.equal(await copiado(p), tags.join(' '));
  await tocar(p, 'button:has-text("Preparar publicación de Google")');
  it = await ultimo(p); assert.deepEqual(it.redes, ['gbp']); assert.match(it.txt, /El Paraíso/);
  await p.evaluate(() => cerrarModal());
  paso('ubicación: máximo 5 etiquetas locales (' + tags.join(' ') + ') para copiar, y publicación de la ficha de Google al calendario');

  // 💬 clientes y WhatsApp
  await sub(p, 'Clientes');
  t = await p.locator('#main').innerText();
  assert.match(t, /Carmen/); assert.doesNotMatch(t, /Quiero reservar para 8/); assert.match(t, /Instagram no deja hacerlo por API/);
  await tocar(p, '.al-it:has-text("Carmen") button:has-text("Pedir permiso")');
  assert.match(await p.inputValue('#alMsg'), /Carmen/); await p.evaluate(() => cerrarModal());
  await tocar(p, '.al-it:has-text("Carmen") button:has-text("Preparar publicación")');
  it = await ultimo(p); assert.match(it.txt, /buenísima/); assert.match(it.por, /permiso/);
  await p.evaluate(() => cerrarModal());
  await tocar(p, 'button:has-text("Preparar estado para hoy")');
  it = await ultimo(p); assert.deepEqual(it.redes, ['wa']); await p.evaluate(() => cerrarModal());
  await p.fill('#alCanal', 'https://example.com/x'); await tocar(p, 'button:has-text("Guardar y copiar la invitación")');
  assert.match(await p.locator('#toast').innerText(), /no es de un canal/);
  await p.fill('#alCanal', 'https://whatsapp.com/channel/ABC123'); await tocar(p, 'button:has-text("Guardar y copiar la invitación")');
  assert.match(await copiado(p), /whatsapp\.com\/channel\/ABC123/); assert.equal(await p.evaluate(() => S.alcance.canal), 'https://whatsapp.com/channel/ABC123');
  paso('clientes: solo los mensajes buenos de la bandeja, permiso y publicación; Estado de WhatsApp al calendario; canal con enlace validado e invitación copiada');

  // 🔁 entre tus negocios
  await sub(p, 'Entre tus negocios');
  assert.match(await p.locator('#main').innerText(), /presenta El Sazón de Quisqueya/);
  await tocar(p, '.al-it:has-text("Sazón") button:has-text("Su @")');
  assert.equal(await p.evaluate(() => S.alcance.candidatos[0].usuario), 'elsazondequisqueya');
  const antes = await p.evaluate(() => S.agenda.length);
  await tocar(p, '.al-it:has-text("Sazón") button:has-text("Preparar historia y publicación")');
  assert.equal(await p.evaluate(() => S.agenda.length), antes + 2);
  it = await ultimo(p); assert.deepEqual(it.colaboradores, ['elsazondequisqueya']); assert.match(it.txt, /El Sazón de Quisqueya/);
  await p.evaluate(() => cerrarModal());
  await p.screenshot({ path: path.join(OUT, 'cruzada.png') });
  paso('promoción cruzada El Paraíso ↔ El Sazón de Quisqueya: su @, historia + publicación con invitación de colaborador');
  await tocar(p, '.al-pie a:has-text("Anuncios")');
  assert.equal(await p.evaluate(() => TAB), 'anuncios');
  paso('«Anuncios» del pie lleva a la pestaña de anuncios');
  // lo guardado sobrevive a recargar
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(500);
  assert.equal(await p.evaluate(() => S.alcance.candidatos.length + S.alcance.canjes.length), 3);
  paso('candidatos y canjes se guardan (S.alcance) y siguen al recargar');

  // 1) sector e idioma
  await p.evaluate(() => { S.negocio.sectorId = 'peluqueria'; S.negocio.nombre = 'Pelu Prueba'; S.alcance.sub = 'canje'; panel('alcance'); });
  t = await p.locator('#main').innerText(); assert.match(t, /un corte y peinado/); assert.doesNotMatch(t, /comer para dos/);
  await p.evaluate(() => { S.alcance.sub = 'collab'; panel('alcance'); });
  assert.match(await p.locator('#main').innerText(), /Fotógrafos de retrato/);
  await p.evaluate(() => { S.negocio.sectorId = 'creador'; S.negocio.nombre = 'Ana Crea'; S.alcance.sub = 'canje'; panel('alcance'); });
  t = await p.locator('#main').innerText(); assert.match(t, /tú con marcas/); assert.match(t, /Tú<\/b>|Tú eres quien/);
  await p.fill('#alCjN', 'Marca X'); await tocar(p, 'button:has-text("Ver el mensaje listo")');
  assert.match(await p.inputValue('#alMsg'), /creador de contenido/); await p.evaluate(() => cerrarModal());
  await p.evaluate(() => { S.negocio.sectorId = 'restaurante'; S.negocio.nombre = 'El Paraíso Bar Restaurante'; S.negocio.idioma = { codigo: 'en', nombre: 'Inglés' }; S.alcance.sub = 'collab'; panel('alcance'); });
  await tocar(p, '.al-it:has-text("Mallorca Foodie") button:has-text("Mensaje de propuesta")');
  assert.match(await p.inputValue('#alMsg'), /^Hi Mallorca Foodie! We are El Paraíso/); await p.evaluate(() => cerrarModal());
  await p.evaluate(() => { S.negocio.idioma = { codigo: 'it', nombre: 'Italiano' }; panel('alcance'); });
  assert.match(await p.locator('#main').innerText(), /salen en español/);
  await p.evaluate(() => { S.negocio.idioma = { codigo: 'es', nombre: 'Español' }; guardar(); });
  paso('se adapta: peluquería (corte y peinado, fotógrafos), creador (canje con marcas, la marca de publi es suya), inglés, y aviso en italiano');
  await c0.close();

  // 2) iPhone
  const c1 = await b.newContext({ ...devices['iPhone 13'] });
  await preparar(c1);
  const q = await abrir(c1, '#alcance');
  for (const nom of ['Reels de prueba', 'Colaboraciones', 'Canje', 'Ubicación', 'Clientes', 'Entre tus negocios']) {
    await sub(q, nom);
    const a = await q.evaluate(() => ({ w: document.documentElement.scrollWidth, v: window.innerWidth }));
    assert.ok(a.w <= a.v + 1, nom + ': se sale del ancho ' + JSON.stringify(a));
  }
  await sub(q, 'Colaboraciones');
  await q.screenshot({ path: path.join(OUT, 'iphone-collab.png'), fullPage: true });
  paso('iPhone 390 px: las seis pantallas sin salirse del ancho');
  await c1.close();

  assert.deepEqual(errores, [], 'errores de programa: ' + errores.join(' | '));
  paso('0 errores de programa');
  await b.close(); s.cerrar();
  console.log(ok + ' comprobaciones en verde · capturas en capturas/alcance/');
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
