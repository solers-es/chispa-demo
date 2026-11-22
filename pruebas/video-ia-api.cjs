/* Chispa · «Crear vídeo con IA» en el servidor, sin red ni cupo:
     NODE_PATH=~/Proyectos/chispa-f-pruebas/node_modules node pruebas/video-ia-api.cjs
   - Gratis: POST /ia/texto {accion:"video"} → guion por escenas (voz + imagen por escena), en modo JSON.
   - Pro (de pago): /ia/video APAGADO (501 con el mensaje para Stalin) hasta poner proveedor y clave;
     con proveedor imitado (fal.ai): límite por plan (Básico 0, Pro 8, Agencia 30), coste apuntado,
     consulta del trabajo y descarga del clip por /video-ia/:id.mp4. */
const assert = require('assert');
process.env.PUERTO_API = process.env.PUERTO_API || '8794';
const { arrancar, respuestas } = require('./servidor-simulador.cjs');

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
    return { st: r.status, j, txt, r };
  };
  let r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: s.codigo });
  const paraiso = r.j.sesion;

  // --- versión gratis: guion por escenas ---
  r = await pedir('POST', '/ia/texto', { accion: 'video', tema: 'Recetas caribeñas en 60 segundos', escenas: 5, idioma: 'es' });
  assert.equal(r.st, 401); paso('sin sesión: 401 (la página lo dice claro y monta un EJEMPLO con el tema)');
  r = await pedir('POST', '/ia/texto', { accion: 'video', tema: 'Recetas caribeñas en 60 segundos', escenas: 5, idioma: 'es', plataforma: 'tiktok' }, paraiso);
  assert.equal(r.st, 200, r.txt);
  assert.equal(r.j.escenas.length, 5); assert.ok(r.j.escenas.every((e) => e.dice && e.imagen)); assert.equal(r.j.vozServidor, true);
  const ll = s.llamadasIA.filter((c) => /llama/.test(c.modelo)).pop().e;
  assert.deepEqual(ll.response_format, { type: 'json_object' });
  assert.match(ll.messages[0].content, /image descriptions ALWAYS in English/); assert.match(ll.messages[1].content, /Scenes: exactly 5/); assert.match(ll.messages[1].content, /Recetas caribeñas/);
  paso('guion por escenas con IA: 5 escenas con voz e imagen (en inglés para FLUX), pedido en modo JSON');
  r = await pedir('POST', '/ia/texto', { accion: 'video', tema: 'trucos de inglés', escenas: 20, idioma: 'de' }, paraiso);
  assert.equal(r.j.escenas.length, 6); assert.equal(r.j.vozServidor, false); paso('como mucho 6 escenas; en alemán avisa de que no hay voz del servidor');
  r = await pedir('POST', '/ia/texto', { accion: 'video', tema: 'Hola, soy Ana.\nHoy te enseño tres trucos para viajar barato.\nEl primero es reservar los martes.', escenas: 4 }, paraiso);
  assert.match(s.llamadasIA.filter((c) => /llama/.test(c.modelo)).pop().e.messages[1].content, /Turn this script into scenes/); paso('si se pega un guion, lo trocea en escenas en vez de inventar otro');

  // --- versión Pro apagada ---
  r = await pedir('GET', '/ia/video/estado', undefined, paraiso);
  assert.equal(r.st, 200); assert.equal(r.j.activo, false); assert.equal(r.j.mensaje, 'Vídeo realista con IA: se activa al conectar el proveedor (de pago).');
  r = await pedir('POST', '/ia/video', { prompt: 'Un cocinero caribeño sirviendo arroz con habichuelas' }, paraiso);
  assert.equal(r.st, 501); assert.equal(r.j.error, 'Vídeo realista con IA: se activa al conectar el proveedor (de pago).');
  r = await pedir('POST', '/v1/video', { prompt: 'Un cocinero' }, paraiso);
  assert.equal(r.st, 501);
  paso('vídeo realista APAGADO: 501 «se activa al conectar el proveedor (de pago)», también por la API /v1/video');
  s.env.VIDEO_IA_PROVEEDOR = 'fal';
  r = await pedir('GET', '/ia/video/estado', undefined, paraiso);
  assert.equal(r.j.activo, false); paso('con el proveedor elegido pero SIN clave sigue apagado');

  // --- proveedor imitado ---
  s.env.FAL_KEY = 'clave-fal-falsa';
  let estadoFal = 'IN_QUEUE';
  respuestas.unshift([/queue\.fal\.run\/fal-ai\/ltx-2\/text-to-video\/fast$/, (u, o, c) => [200, { request_id: 'req1', status_url: 'https://queue.fal.run/fal-ai/ltx-2/requests/req1/status', response_url: 'https://queue.fal.run/fal-ai/ltx-2/requests/req1' }]]);
  respuestas.unshift([/requests\/req1\/status/, () => [200, { status: estadoFal }]]);
  respuestas.unshift([/requests\/req1$/, () => [200, { video: { url: 'https://v3.fal.media/files/clip.mp4' } }]]);
  respuestas.unshift([/v3\.fal\.media\/files\/clip\.mp4/, () => [200, { falso: 'mp4' }]]);
  r = await pedir('GET', '/ia/video/estado', undefined, paraiso);
  assert.equal(r.j.activo, true); assert.equal(r.j.limite, 8); assert.equal(r.j.costeClip, 0.24);
  r = await pedir('POST', '/ia/video', { prompt: 'Un cocinero caribeño sirviendo arroz con habichuelas' }, paraiso);
  assert.equal(r.st, 200, r.txt); assert.equal(r.j.estado, 'generando'); assert.equal(r.j.coste, 0.24);
  const envio = s.registro.filter((x) => /queue\.fal\.run\/fal-ai\/ltx-2\/text-to-video/.test(x.url)).pop();
  assert.equal(envio.auth, 'Key clave-fal-falsa'); assert.match(envio.cuerpo, /9:16/);
  const id = r.j.id;
  r = await pedir('GET', '/ia/video/' + id, undefined, paraiso);
  assert.equal(r.j.estado, 'generando');
  estadoFal = 'COMPLETED';
  r = await pedir('GET', '/ia/video/' + id, undefined, paraiso);
  assert.equal(r.j.estado, 'listo'); assert.match(r.j.url, /\/video-ia\/[A-Za-z0-9_-]+\.mp4$/);
  r = await fetch(r.j.url);
  assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'video/mp4');
  r = await pedir('GET', '/ia/video/estado', undefined, paraiso);
  assert.equal(r.j.usados, 1); assert.equal(r.j.costeMes, 0.24);
  paso('con proveedor (imitado): pide el clip vertical, lo consulta hasta «listo», lo sirve por /video-ia/…mp4 y apunta 0,24 $');

  // límites por plan
  r = await pedir('POST', '/admin/negocios', { id: 'canal-basico', nombre: 'Canal Básico' }, null, { 'X-Chispa-Admin': s.env.ADMIN_CLAVE });
  r = await pedir('POST', '/sesion', { negocio: 'canal-basico', codigo: r.j.codigo });
  const basico = r.j.sesion;
  s.db.run("INSERT INTO cuentas (negocio, plan, estado, prueba_hasta, creado, actualizado) VALUES ('canal-basico', 'basico', 'prueba', ?, ?, ?)", [Date.now() + 5 * 864e5, Date.now(), Date.now()]);
  const antes = s.registro.length;
  r = await pedir('POST', '/ia/video', { prompt: 'Un gato bailando salsa en la playa' }, basico);
  assert.equal(r.st, 402); assert.match(r.j.error, /Pro y Agencia/); assert.equal(s.registro.length, antes);
  paso('plan Básico: 402 «viene en Pro y Agencia» y no se pide nada al proveedor');
  s.db.run("UPDATE cuentas SET plan = 'pro' WHERE negocio = 'canal-basico'");
  for (let k = 0; k < 8; k++) s.db.run("INSERT INTO video_ia (id, negocio, proveedor, estado, coste, creado) VALUES (?, 'canal-basico', 'fal', 'listo', 0.24, ?)", ['x' + k, Date.now()]);
  r = await pedir('POST', '/ia/video', { prompt: 'Un gato bailando salsa en la playa' }, basico);
  assert.equal(r.st, 429); assert.match(r.j.error, /8 vídeos realistas/);
  paso('plan Pro: 8 clips al mes; el noveno, 429');
  s.db.run("UPDATE cuentas SET plan = 'agencia' WHERE negocio = 'canal-basico'");
  s.env.VIDEO_IA_TOPE_USD_MES = '2';
  r = await pedir('POST', '/ia/video', { prompt: 'Un gato bailando salsa en la playa' }, basico);
  assert.equal(r.st, 429); assert.match(r.j.error, /tope de gasto/);
  paso('tope de gasto de TODA la cuenta al mes (VIDEO_IA_TOPE_USD_MES): no se pasa');
  const P = require('../precios.js');
  assert.equal(P.plan('basico').limites.videoIAMes, 0); assert.equal(P.plan('pro').limites.videoIAMes, 8); assert.equal(P.plan('agencia').limites.videoIAMes, 30);
  assert.ok(!P.plan('pro').incluye.some((x) => /realista/.test(x)));
  paso('precios.js: límites 0/8/30 y NO se promete en «incluye» mientras esté apagado');

  await s.cerrar();
  console.log(ok + ' comprobaciones en verde');
})().catch((e) => { console.error(e); process.exit(1); });
