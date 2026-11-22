/* Chispa · correo del alta (verificar el correo y mandar el código) y BAJA que borra todo — trabajador K.
   Sin red: el proveedor de correo (Resend) está imitado. Uso:
     NODE_PATH=<node_modules con sql.js> node pruebas/correo-api.cjs */
const assert = require('assert'), crypto = require('crypto');
process.env.PUERTO_API = process.env.PUERTO_API || '8795';
const { arrancar } = require('./servidor-simulador.cjs');

function resolver(reto, dif) {
  for (let n = 0; ; n++) {
    const h = crypto.createHash('sha256').update(reto + ':' + n).digest();
    let b = 0; for (const x of h) { if (x === 0) { b += 8; continue; } b += Math.clz32(x) - 24; break; }
    if (b >= dif) return String(n);
  }
}

(async () => {
  const s = await arrancar({ web: false });
  const B = s.base;
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  let ip = '10.9.0.1';
  const pedir = async (metodo, ruta, cuerpo, ses) => {
    const h = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip };
    if (ses) h.Authorization = 'Bearer ' + ses;
    const r = await fetch(B + ruta, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), redirect: 'manual' });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
    return { st: r.status, j, txt, tipo: r.headers.get('content-type') || '' };
  };
  const realNow = Date.now; let adelanto = 0; Date.now = () => realNow() + adelanto;
  const alta = async (correo) => {
    ip = '10.9.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
    const t = (await pedir('GET', '/alta/reto')).j; adelanto += 3500;
    return (await pedir('POST', '/alta', { nombre: 'Canal de Prueba', sector: 'creador', idioma: 'es', correo, plan: 'pro', acepto: true, reto: t.reto, solucion: resolver(t.reto, t.dificultad) })).j;
  };
  const CORREOS = [];
  s.respuestas.unshift([/api\.resend\.com\/emails/, (u, o, cuerpo) => { const j = JSON.parse(cuerpo); if ((o.headers || {}).Authorization !== 'Bearer re_FALSA') return [401, { message: 'bad key' }]; CORREOS.push(j); return [200, { id: 'em_' + CORREOS.length }]; }]);

  // 1) sin proveedor de correo: el alta funciona y la cuenta queda «sin verificar»
  const A = await alta('ana@ejemplo.com');
  assert.ok(A.sesion); assert.equal(A.correoEnviado, false); assert.equal(CORREOS.length, 0);
  let r = await pedir('GET', '/cuenta', undefined, A.sesion);
  assert.equal(r.j.correoVerificado, false); assert.equal(r.j.correoActivo, false);
  r = await pedir('POST', '/cuenta/correo/reenviar', {}, A.sesion);
  assert.equal(r.st, 503); assert.match(r.j.error, /todavía no está activado/);
  paso('sin proveedor de correo: el alta sigue funcionando, «sin verificar» y reenviar dice que no está activado (503)');

  // 2) con proveedor: correo con el código y el enlace; el enlace verifica una vez
  s.env.RESEND_API_KEY = 're_FALSA'; s.env.CORREO_REMITENTE = 'Chispa <hola@chispa.solers.es>';
  const C = await alta('carla@ejemplo.com');
  assert.equal(C.correoEnviado, true); assert.equal(CORREOS.length, 1);
  const m = CORREOS[0];
  assert.deepEqual(m.to, ['carla@ejemplo.com']); assert.match(m.from, /chispa\.solers\.es/); assert.match(m.subject, /confirma tu correo/);
  assert.ok(m.text.includes(C.codigo), 'el correo lleva el código de acceso'); assert.ok(m.text.includes(C.negocio));
  const enlace = m.text.match(/https?:\/\/\S+\/correo\/verificar\?t=([a-z0-9]+)/);
  assert.ok(enlace, 'el correo lleva el enlace de verificar');
  assert.equal(s.db.exec("SELECT COUNT(*) FROM correo_tokens WHERE huella = '" + enlace[1] + "'")[0].values[0][0], 0, 'el token se guarda como huella, no en claro');
  paso('con proveedor: al darse de alta llega un correo con su código, su negocio y el enlace (token guardado solo como huella)');
  r = await pedir('GET', '/correo/verificar?t=' + enlace[1]);
  assert.equal(r.st, 200); assert.match(r.tipo, /text\/html/); assert.match(r.txt, /Correo confirmado/);
  r = await pedir('GET', '/cuenta', undefined, C.sesion); assert.equal(r.j.correoVerificado, true);
  r = await pedir('GET', '/correo/verificar?t=' + enlace[1]); assert.match(r.txt, /caducado/);
  r = await pedir('GET', '/correo/verificar?t=<script>'); assert.match(r.txt, /no válido/); assert.doesNotMatch(r.txt, /<script>/);
  r = await pedir('POST', '/cuenta/correo/reenviar', {}, C.sesion); assert.equal(r.j.yaVerificado, true);
  paso('el enlace confirma el correo una sola vez; enlace repetido o raro → página clara, sin inyectar nada');

  // 3) reenviar: 1 cada 10 minutos; caduca a los 7 días
  const D = await alta('dani@ejemplo.com');
  r = await pedir('POST', '/cuenta/correo/reenviar', {}, D.sesion); assert.equal(r.st, 429);
  adelanto += 11 * 60e3;
  r = await pedir('POST', '/cuenta/correo/reenviar', {}, D.sesion); assert.equal(r.j.enviado, true);
  const t2 = CORREOS[CORREOS.length - 1].text.match(/verificar\?t=([a-z0-9]+)/)[1];
  assert.ok(!CORREOS[CORREOS.length - 1].text.includes('Tu código de acceso'), 'al reenviar no se manda el código otra vez');
  adelanto += 8 * 864e5;
  r = await pedir('GET', '/correo/verificar?t=' + t2); assert.match(r.txt, /caducado/);
  paso('reenviar: como mucho uno cada 10 min, sin volver a mandar el código; el enlace caduca a los 7 días');

  // 4) si el proveedor falla, el alta NO falla
  s.env.RESEND_API_KEY = 're_MALA';
  const E = await alta('eva@ejemplo.com');
  assert.ok(E.sesion); assert.equal(E.correoEnviado, false);
  paso('si el proveedor de correo falla, el alta sale bien igual (y dice que no se mandó)');

  // 5) baja: borra TODO lo del negocio (RGPD)
  const TABLAS = s.db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0].values.map((v) => v[0]);
  const conNegocio = TABLAS.filter((t) => s.db.exec('PRAGMA table_info(' + t + ')')[0].values.some((c) => c[1] === 'negocio'));
  for (const t of conNegocio) {
    const cols = s.db.exec('PRAGMA table_info(' + t + ')')[0].values;
    const vals = cols.map((c) => (c[1] === 'negocio' ? E.negocio : /INT|REAL/i.test(c[2]) ? 1 : 'x' + Math.random().toString(36).slice(2)));
    try { s.db.run('INSERT INTO ' + t + ' (' + cols.map((c) => c[1]).join(',') + ') VALUES (' + cols.map(() => '?').join(',') + ')', vals); } catch (e) {}
  }
  r = await pedir('POST', '/cuenta/baja', { confirmar: 'BORRAR' }, E.sesion); assert.equal(r.j.ok, true, r.txt);
  const quedan = conNegocio.filter((t) => s.db.exec('SELECT COUNT(*) FROM ' + t + " WHERE negocio = '" + E.negocio + "'")[0].values[0][0] > 0);
  assert.deepEqual(quedan, [], 'tablas con datos tras la baja: ' + quedan.join(', '));
  assert.equal(s.db.exec("SELECT COUNT(*) FROM negocios WHERE id = '" + E.negocio + "'")[0].values[0][0], 0);
  assert.ok(conNegocio.length >= 10, 'se comprueban ' + conNegocio.length + ' tablas');
  paso('baja: no queda NADA del negocio en ninguna de las ' + conNegocio.length + ' tablas (antes quedaban bandeja, estadísticas, anuncios…)');

  Date.now = realNow;
  console.log('\n' + ok + ' comprobaciones en verde');
  s.cerrar(); process.exit(0);
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
