/* Chispa · «Tu plan de ofertas» en el servidor (trabajador L), sin red ni cupo:
     NODE_PATH=~/Proyectos/chispa-f-pruebas/node_modules node pruebas/ofertas-api.cjs
   GET /ofertas/plan, POST /ofertas/textos (IA imitada, idioma, días por plan, precios
   inventados fuera) y POST /ofertas/carta (carta de El Paraíso imitada, editor, lista). */
const assert = require('assert');
process.env.PUERTO_API = process.env.PUERTO_API || '8796';
const { arrancar } = require('./servidor-simulador.cjs');
const C = require('../ofertas-carta.js');

const HTML_CARTA = '<html><script>const ID_CARTA = "4244bca40f5248ee217447ae96196df2b63dd8d0c83bad2e01995251a87329ba";fetch("/api/datos?cartaweb="+ID_CARTA)</script></html>';
const JSON_CARTA = { existe: true, carta: { nombre: 'El Paraíso', secciones: [
  { titulo: 'Paellas y Arroces', platos: [{ nom: 'Paella Mixta', precio: '2p 46 /   · 3p 64 / 4p 74 €' }] },
  { titulo: 'Ensaladas', platos: [{ nom: 'Ensalada César', precio: '13,90 €' }] },
  { titulo: 'Cócteles', platos: [{ nom: 'Mojito', precio: '7 €' }, { nom: 'Piña colada', precio: '' }] }] } };
const EDITOR = '<html><body>Editor de la carta<script>fetch("/api/datos?carta=" + id)</script></body></html>';
const SCHEMA = '<html><script type="application/ld+json">{"@context":"https://schema.org","@type":"Menu","hasMenuSection":[{"@type":"MenuSection","name":"Bebidas","hasMenuItem":[{"@type":"MenuItem","name":"Caña","offers":{"@type":"Offer","price":"2.50"}}]},{"@type":"MenuSection","name":"Tapas","hasMenuItem":[{"@type":"MenuItem","name":"Patatas bravas","offers":{"price":6}}]}]}</script></html>';

(async () => {
  const s = await arrancar({ web: false });
  const B = s.base;
  let ok = 0;
  const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const pedidas = [];
  // la carta de El Paraíso y otras webs, imitadas (el Worker las pide con fetch)
  const fetchSim = globalThis.fetch;
  globalThis.fetch = async (e, o) => {
    const u = String(typeof e === 'string' ? e : e.url);
    if (/carta-imitada\.test|schema\.test|editor\.test|privada|10\.0\.0\.1/.test(u)) pedidas.push(u);
    const r = (t, ct) => new Response(t, { status: 200, headers: { 'Content-Type': ct || 'text/html; charset=utf-8' } });
    if (/carta-imitada\.test\/carta-paraiso\.html/.test(u)) return r(HTML_CARTA);
    if (/carta-imitada\.test\/api\/datos\?cartaweb=4244/.test(u)) return r(JSON.stringify(JSON_CARTA), 'application/json');
    if (/editor\.test/.test(u)) return r(EDITOR);
    if (/schema\.test/.test(u)) return r(SCHEMA);
    return fetchSim(e, o);
  };
  // la IA imitada contesta el formato de ofertas
  const runSim = s.env.AI.run;
  s.env.AI.run = async (modelo, e) => {
    if (/llama/.test(modelo) && /daily offer posts/.test(e.messages[0].content)) {
      s.llamadasIA.push({ modelo, e });
      const dias = JSON.parse(e.messages[1].content.split('Days (JSON):\n')[1].split('\n\nFor EACH')[0]);
      const r = { dias: dias.map((d) => ({ clave: d.clave, titulo: d.plato, texto: 'Hoy ' + d.plato + ' + ' + d.bebida + ' por 9,90 € y la paella a 46 € · ' + d.oferta + ' · ' + d.franja, hashtags: ['#Palma'] })) };
      return { choices: [{ message: { content: JSON.stringify(r) } }], usage: { neurons: 150 } };
    }
    return runSim(modelo, e);
  };
  const pedir = async (metodo, ruta, cuerpo, ses) => {
    const h = { 'Content-Type': 'application/json' }; if (ses) h.Authorization = 'Bearer ' + ses;
    const r = await fetch(B + ruta, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {}
    return { st: r.status, j, txt };
  };
  const hoy = new Date(Date.now() + 2 * 3600e3);
  const fecha = (n) => new Date(hoy.getTime() + n * 864e5).toISOString().slice(0, 10);
  const dias = (n) => Array.from({ length: n }, (_, k) => ({ clave: fecha(k) + '|x', fecha: fecha(k), dia: 'jueves', plato: 'Paella Mixta', precioPlato: '2p 46 · 3p 64 · 4p 74 €', bebida: 'Mojito', precioBebida: '', oferta: 'Paella Mixta + mojito por … €', franja: '18:00-21:00', red: 'Instagram + TikTok', formato: 'reel', motivo: 'sol', tiempo: '26 °C' }));

  let r = await pedir('GET', '/ofertas/plan');
  assert.equal(r.st, 401); paso('sin sesión no hay plan de ofertas');
  r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: s.codigo });
  const paraiso = r.j.sesion;
  r = await pedir('GET', '/ofertas/plan', undefined, paraiso);
  assert.equal(r.st, 200); assert.equal(r.j.diasMax, 14); assert.equal(r.j.plan, 'interno'); paso('El Paraíso (interno): 14 días');

  // textos con IA
  r = await pedir('POST', '/ofertas/textos', { idioma: 'en', negocio: 'El Paraíso', sector: 'Restaurante y bar', ciudad: 'Palma', dias: dias(14) }, paraiso);
  assert.equal(r.st, 200, r.txt); assert.equal(r.j.textos.length, 14); assert.equal(r.j.idioma, 'en');
  const llam = s.llamadasIA.filter((c) => /daily offer posts/.test(c.e.messages[0].content));
  assert.equal(llam.length, 1, 'una sola llamada a la IA para todos los días');
  assert.match(llam[0].e.messages[0].content, /English/); assert.match(llam[0].e.messages[0].content, /NEVER invent prices/);
  const t0 = r.j.textos[0].texto;
  assert.match(t0, /46 €/, 'el precio de la carta se respeta'); assert.doesNotMatch(t0, /9,90 €/); assert.match(t0, /… €/);
  paso('14 textos en UNA llamada, en inglés, con la regla de no inventar precios; «9,90 €» inventado → «… €», «46 €» de la carta se queda');
  r = await pedir('POST', '/ofertas/textos', { dias: [] }, paraiso);
  assert.equal(r.st, 400); paso('sin días: 400 claro');

  // plan Básico: 3 días también en el servidor
  r = await fetch(B + '/admin/negocios', { method: 'POST', headers: { 'X-Chispa-Admin': s.env.ADMIN_CLAVE, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'bar-basico', nombre: 'Bar Básico' }) }).then((x) => x.json());
  r = await pedir('POST', '/sesion', { negocio: 'bar-basico', codigo: r.codigo });
  const basico = r.j.sesion;
  s.db.run("INSERT INTO cuentas (negocio, plan, estado, prueba_hasta, creado, actualizado) VALUES ('bar-basico', 'basico', 'prueba', ?, ?, ?)", [Date.now() + 5 * 864e5, Date.now(), Date.now()]);
  r = await pedir('GET', '/ofertas/plan', undefined, basico);
  assert.equal(r.j.diasMax, 3); assert.equal(r.j.plan, 'basico');
  r = await pedir('POST', '/ofertas/textos', { dias: dias(7) }, basico);
  assert.equal(r.st, 200, r.txt); assert.equal(r.j.textos.length, 3); assert.equal(r.j.recortados, 4);
  paso('Básico: 3 días; si la página pide 7, el servidor escribe 3 y dice que ha recortado 4');
  r = await pedir('POST', '/ofertas/textos', { dias: dias(14).slice(8) }, basico);
  assert.equal(r.st, 402); assert.match(r.j.error, /Pro o Agencia/); paso('Básico pidiendo días de la semana que viene: 402 «plan Pro o Agencia»');
  s.db.run("UPDATE cuentas SET plan = 'pro' WHERE negocio = 'bar-basico'");
  r = await pedir('GET', '/ofertas/plan', undefined, basico); assert.equal(r.j.diasMax, 14); paso('al pasar a Pro: 14 días');
  s.db.run("UPDATE cuentas SET estado = 'cancelada' WHERE negocio = 'bar-basico'");
  const antes = s.llamadasIA.length;
  r = await pedir('POST', '/ofertas/textos', { dias: dias(2) }, basico);
  assert.equal(r.st, 402); assert.equal(s.llamadasIA.length, antes); paso('cuenta cancelada: 402 y no gasta IA');

  // carta
  r = await pedir('POST', '/ofertas/carta', { url: 'https://carta-imitada.test/carta-paraiso.html' }, paraiso);
  assert.equal(r.st, 200, r.txt); assert.equal(r.j.items.length, 4);
  const pm = r.j.items.find((x) => x.nombre === 'Paella Mixta'), mo = r.j.items.find((x) => x.nombre === 'Mojito'), pc = r.j.items.find((x) => x.nombre === 'Piña colada');
  assert.equal(pm.precio, '2p 46 · 3p 64 · 4p 74 €'); assert.equal(pm.tipo, 'plato'); assert.equal(mo.tipo, 'bebida'); assert.equal(mo.precio, '7 €'); assert.equal(pc.precio, '');
  paso('carta de El Paraíso (ID_CARTA → cartaweb): platos y bebidas con su precio; sin precio, vacío (nunca inventado)');
  r = await pedir('POST', '/ofertas/carta', { url: 'editor.test/carta.html' }, paraiso);
  assert.equal(r.j.items.length, 0); assert.match(r.j.aviso, /EDITOR/); paso('si es el editor de la carta, lo dice en vez de inventar');
  r = await pedir('POST', '/ofertas/carta', { url: 'https://schema.test/menu' }, paraiso);
  assert.deepEqual(r.j.items.map((x) => [x.nombre, x.precio, x.tipo]), [['Caña', '2,50 €', 'bebida'], ['Patatas bravas', '6 €', 'plato']]); paso('web con schema.org Menu: leída');
  r = await pedir('POST', '/ofertas/carta', { url: 'http://10.0.0.1/carta' }, paraiso);
  assert.equal(r.st, 400); assert.ok(!pedidas.some((u) => /10\.0\.0\.1/.test(u))); paso('direcciones privadas: no se piden');
  r = await pedir('POST', '/ofertas/carta', { url: 'https://carta-imitada.test/carta-paraiso.html' });
  assert.equal(r.st, 401); paso('leer cartas necesita sesión (no es un proxy abierto)');

  // el parser, a solas
  const l = C.desdeLista('Paella mixta 14,50\nCroquetas caseras 8,50 €\nBebidas:\nMojito 7 €\nCerveza');
  assert.deepEqual(l.map((x) => [x.nombre, x.precio, x.tipo]), [['Paella mixta', '14,50 €', 'plato'], ['Croquetas caseras', '8,50 €', 'plato'], ['Mojito', '7 €', 'bebida'], ['Cerveza', '', 'bebida']]);
  assert.equal(C.esBebida('Pollo al vino', 'Carnes'), false);
  paso('lista pegada: precios limpios, «Bebidas:» separa, sin precio queda vacío; «Pollo al vino» en Carnes es plato');

  const P = require('../precios.js');
  assert.equal(P.plan('basico').limites.diasOfertas, 3); assert.equal(P.plan('pro').limites.diasOfertas, 14); assert.equal(P.plan('agencia').limites.diasOfertas, 14);
  paso('precios.js: Básico 3 días, Pro y Agencia 14 (lo mismo que aplica el servidor)');

  globalThis.fetch = fetchSim;
  await s.cerrar();
  console.log(ok + ' comprobaciones en verde');
})().catch((e) => { console.error(e); process.exit(1); });
