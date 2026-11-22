/* Chispa · Estudio para creadores en el servidor (trabajador K), sin red ni cupo:
     NODE_PATH=~/Proyectos/chispa-f-pruebas/node_modules node pruebas/creadores-api.cjs
   POST /ia/texto {accion:"serie"|"guion"}: IA imitada del simulador, idioma, sector,
   límites del plan (Pro y Agencia; Básico 402; negocios internos siempre). */
const assert = require('assert');
process.env.PUERTO_API = process.env.PUERTO_API || '8792';
const { arrancar } = require('./servidor-simulador.cjs');

(async () => {
  const s = await arrancar({ web: false });
  const B = s.base;
  let ok = 0;
  const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const pedir = async (metodo, ruta, cuerpo, ses, extra) => {
    const h = { 'Content-Type': 'application/json', ...(extra || {}) };
    if (ses) h.Authorization = 'Bearer ' + ses;
    const r = await fetch(B + ruta, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    let j = null; const txt = await r.clone().text(); try { j = JSON.parse(txt); } catch (e) {}
    return { st: r.status, j, txt };
  };
  const ultimaLlama = () => s.llamadasIA.filter((c) => /llama/.test(c.modelo)).pop().e.messages;

  let r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: s.codigo });
  const paraiso = r.j.sesion;

  // --- serie ---
  r = await pedir('POST', '/ia/texto', { accion: 'serie', tema: 'recetas de 10 minutos', plataforma: 'shorts', episodios: 4, idioma: 'en', sector: 'Restaurante y bar', ciudad: 'Palma' });
  assert.equal(r.st, 401); paso('sin sesión no se escribe nada');
  r = await pedir('POST', '/ia/texto', { accion: 'serie', tema: 'recetas de 10 minutos', plataforma: 'shorts', episodios: 4, idioma: 'en', sector: 'Restaurante y bar', ciudad: 'Palma' }, paraiso);
  assert.equal(r.st, 200, r.txt);
  assert.equal(r.j.episodios.length, 4); assert.equal(r.j.plataforma, 'shorts'); assert.equal(r.j.idioma, 'en');
  assert.ok(r.j.episodios.every((e) => e.titulo && e.cliffhanger && e.gancho));
  let m = ultimaLlama();
  assert.match(m[0].content, /English/); assert.match(m[0].content, /Restaurante y bar/); assert.match(m[0].content, /no invented facts/);
  assert.match(m[1].content, /YouTube Shorts/); assert.match(m[1].content, /Episodes: 4/);
  paso('serie con IA: 4 episodios con gancho y cliffhanger, en inglés, con el sector y la regla de no inventar datos');
  r = await pedir('POST', '/ia/texto', { accion: 'serie', tema: 'x', episodios: 50 }, paraiso);
  assert.equal(r.st, 400); paso('serie sin tema: 400 con mensaje claro');
  r = await pedir('POST', '/ia/texto', { accion: 'serie', tema: 'misterios', episodios: 50, plataforma: 'inventada' }, paraiso);
  assert.equal(r.st, 200); assert.equal(r.j.episodios.length, 8); assert.equal(r.j.plataforma, 'tiktok'); paso('como mucho 8 episodios; plataforma desconocida → TikTok');

  // --- guion ---
  r = await pedir('POST', '/ia/texto', { accion: 'guion', tema: 'cómo hacemos la paella', plataforma: 'reels', idioma: 'es', variante: 3 }, paraiso);
  assert.equal(r.st, 200, r.txt);
  assert.ok(r.j.gancho && r.j.escenas.length >= 2 && r.j.cta && r.j.remate); assert.equal(r.j.plataforma, 'reels');
  m = ultimaLlama();
  assert.match(m[0].content, /Instagram Reels/); assert.match(m[0].content, /share it by direct message/); assert.match(m[0].content, /NOT 'like and subscribe'/);
  assert.match(m[1].content, /variant 3/); assert.match(m[0].content, /Spanish/);
  paso('guion con IA: gancho, escenas, remate y CTA; Reels pide que lo compartan; «otra versión» pide una variante distinta');

  // --- planes ---
  r = await pedir('POST', '/admin/negocios', { id: 'canal-basico', nombre: 'Canal Básico' }, null, { 'X-Chispa-Admin': s.env.ADMIN_CLAVE });
  r = await pedir('POST', '/sesion', { negocio: 'canal-basico', codigo: r.j.codigo });
  const basico = r.j.sesion;
  s.db.run("INSERT INTO cuentas (negocio, plan, estado, prueba_hasta, creado, actualizado) VALUES ('canal-basico', 'basico', 'prueba', ?, ?, ?)", [Date.now() + 5 * 864e5, Date.now(), Date.now()]);
  const antes = s.llamadasIA.length;
  r = await pedir('POST', '/ia/texto', { accion: 'guion', tema: 'trucos de inglés' }, basico);
  assert.equal(r.st, 402, r.txt); assert.match(r.j.error, /Pro y Agencia/); assert.equal(s.llamadasIA.length, antes);
  paso('plan Básico: 402 «viene en los planes Pro y Agencia» y no gasta IA');
  r = await pedir('POST', '/ia/texto', { accion: 'escribir', idea: 'menú del día' }, basico);
  assert.equal(r.st, 200); paso('Básico sigue pudiendo escribir publicaciones normales');
  s.db.run("UPDATE cuentas SET plan = 'pro' WHERE negocio = 'canal-basico'");
  r = await pedir('POST', '/ia/texto', { accion: 'serie', tema: 'trucos de inglés', idioma: 'fr' }, basico);
  assert.equal(r.st, 200); assert.equal(r.j.idioma, 'fr'); paso('al pasar a Pro, la serie funciona');
  s.db.run("UPDATE cuentas SET estado = 'cancelada' WHERE negocio = 'canal-basico'");
  r = await pedir('POST', '/ia/texto', { accion: 'serie', tema: 'trucos de inglés' }, basico);
  assert.equal(r.st, 402); paso('cuenta cancelada: no se gasta IA');

  const P = require('../precios.js');
  assert.ok(P.plan('pro').incluye.some((x) => /Estudio para creadores/.test(x)));
  assert.ok(!P.plan('basico').incluye.some((x) => /Estudio para creadores/.test(x)));
  paso('precios.js promete el Estudio solo en Pro (y Agencia lo hereda), igual que el servidor');

  await s.cerrar();
  console.log(ok + ' comprobaciones en verde');
})().catch((e) => { console.error(e); process.exit(1); });
