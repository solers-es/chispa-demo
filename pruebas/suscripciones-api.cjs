/* Chispa · pruebas del ALTA SOLA, límites por plan y PAGO con un simulador local de Stripe.
   Sin red y sin cuenta: firmas de webhook REALES (HMAC-SHA256) con una clave de prueba falsa.
   Uso: NODE_PATH=<carpeta con node_modules de sql.js> node pruebas/suscripciones-api.cjs */
const assert = require('assert'), crypto = require('crypto');
const { arrancar } = require('./servidor-simulador.cjs');

/* ---------- Stripe imitado ---------- */
const STRIPE = { sesiones: [], portales: [], llamadas: [] };
const fetchSim = globalThis.fetch;
globalThis.fetch = async function (entrada, o = {}) {
  const url = new URL(typeof entrada === 'string' ? entrada : entrada.url);
  if (url.hostname === 'api.stripe.com') {
    const cab = o.headers || {};
    const campos = Object.fromEntries(new URLSearchParams(String(o.body || '')));
    STRIPE.llamadas.push({ ruta: url.pathname, auth: cab.Authorization, campos });
    const j = (st, d) => new Response(JSON.stringify(d), { status: st, headers: { 'Content-Type': 'application/json' } });
    if (cab.Authorization !== 'Bearer sk_test_FALSA_de_prueba') return j(401, { error: { message: 'Invalid API Key' } });
    if (url.pathname === '/v1/checkout/sessions') { const id = 'cs_test_' + STRIPE.sesiones.length; STRIPE.sesiones.push({ id, campos }); return j(200, { id, url: 'https://checkout.stripe.com/c/pay/' + id }); }
    if (url.pathname === '/v1/billing_portal/sessions') { STRIPE.portales.push(campos); return j(200, { url: 'https://billing.stripe.com/p/session/test_1' }); }
    return j(404, { error: { message: 'no simulado' } });
  }
  if (url.hostname === 'challenges.cloudflare.com') {
    const q = new URLSearchParams(String(o.body || ''));
    return new Response(JSON.stringify({ success: q.get('response') === 'token-bueno' }), { headers: { 'Content-Type': 'application/json' } });
  }
  return fetchSim(entrada, o);
};
const WHSEC = 'whsec_FALSO_de_prueba_1234567890';
function firmar(cuerpo, secreto = WHSEC, t = Math.floor(Date.now() / 1000)) {
  return 't=' + t + ',v1=' + crypto.createHmac('sha256', secreto).update(t + '.' + cuerpo).digest('hex');
}

/* prueba de trabajo, como la hace el navegador */
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
  let ok = 0;
  const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  let ipFalsa = '10.0.0.1';
  const pedir = async (metodo, ruta, cuerpo, ses, extra = {}) => {
    const h = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ipFalsa, ...extra };
    if (ses) h.Authorization = 'Bearer ' + ses;
    const r = await fetch(B + ruta, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)) });
    let j = null; try { j = await r.clone().json(); } catch (e) {}
    return { st: r.status, j };
  };
  const reto = async () => { const r = await pedir('GET', '/alta/reto'); return r.j; };
  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  // el reto no vale antes de 3 s: en las pruebas se adelanta el reloj del servidor
  const realNow = Date.now; let adelanto = 0; Date.now = () => realNow() + adelanto;
  const altaBuena = async (extra = {}) => {
    const t = await reto(); adelanto += 3500;
    return pedir('POST', '/alta', { nombre: 'Peluquería Marga', sector: 'peluqueria', idioma: 'es', correo: 'marga@ejemplo.com', plan: 'basico', acepto: true, reto: t.reto, solucion: resolver(t.reto, t.dificultad), ...extra });
  };

  // --- precios ---
  let r = await pedir('GET', '/planes');
  assert.deepEqual(r.j.planes.map((p) => [p.id, p.precio]), [['basico', 39], ['pro', 79], ['agencia', 149]]);
  assert.equal(r.j.diasPrueba, 14); assert.equal(r.j.pago.encendido, false);
  paso('/planes da 39/79/149 €, 14 días de prueba y el pago apagado (sale de precios.js)');

  // --- anti-abuso ---
  let t = await reto();
  r = await pedir('POST', '/alta', { nombre: 'X Bar', sector: 'restaurante', correo: 'x@ejemplo.com', plan: 'pro', acepto: true, reto: t.reto, solucion: resolver(t.reto, t.dificultad) });
  assert.equal(r.st, 400); assert.equal(r.j.motivo, 'reto-rapido'); paso('alta instantánea (robot) rechazada: el reto no vale antes de 3 s');
  t = await reto(); adelanto += 3500;
  r = await pedir('POST', '/alta', { nombre: 'X Bar', sector: 'restaurante', correo: 'x@ejemplo.com', plan: 'pro', acepto: true, reto: t.reto, solucion: '1' });
  assert.equal(r.st, 400); assert.equal(r.j.motivo, 'reto'); paso('sin prueba de trabajo resuelta: rechazada');
  r = await altaBuena({ web: 'http://spam' });
  assert.equal(r.j.motivo, 'trampa'); paso('campo trampa relleno: rechazada');
  r = await altaBuena({ acepto: false });
  assert.equal(r.j.campo, 'acepto'); paso('sin aceptar términos y privacidad: rechazada');
  r = await altaBuena({ correo: 'no-es-correo' });
  assert.equal(r.j.campo, 'correo'); paso('correo no válido: rechazada');

  // --- alta buena ---
  t = await reto(); adelanto += 3500;
  const solucion = resolver(t.reto, t.dificultad);
  r = await pedir('POST', '/alta', { nombre: 'Peluquería Marga', sector: 'peluqueria', idioma: 'ca', correo: 'Marga@Ejemplo.com', plan: 'basico', acepto: true, reto: t.reto, solucion });
  assert.equal(r.st, 200, JSON.stringify(r.j));
  assert.match(r.j.negocio, /^peluqueria-marga-[a-z0-9]{4}$/); assert.match(r.j.codigo, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(r.j.estado, 'prueba'); assert.ok(Math.abs(r.j.pruebaHasta - Date.now() - 14 * 864e5) < 5000);
  const A = r.j; paso('alta sola: crea ' + A.negocio + ', da su código de acceso y 14 días de prueba');
  r = await pedir('POST', '/alta', { nombre: 'Otra', sector: 'peluqueria', correo: 'o@ejemplo.com', plan: 'basico', acepto: true, reto: t.reto, solucion });
  assert.equal(r.j.motivo, 'reto-usado'); paso('el mismo reto no se puede usar dos veces');
  r = await pedir('POST', '/sesion', { negocio: A.negocio, codigo: A.codigo });
  assert.equal(r.st, 200); assert.equal(r.j.esAdministrador, true); paso('con su código entra como dueño (en otro aparato)');
  r = await pedir('GET', '/cuenta', undefined, A.sesion);
  assert.equal(r.j.plan, 'basico'); assert.equal(r.j.estado, 'prueba'); assert.equal(r.j.diasQuedan, 14); assert.equal(r.j.correo, 'marga@ejemplo.com'); assert.equal(r.j.idioma, 'ca');
  paso('/cuenta: plan Básico, en prueba, 14 días, idioma y correo guardados');

  // --- límite por IP ---
  ipFalsa = '10.0.0.2';
  for (let i = 0; i < 3; i++) { r = await altaBuena({ correo: 'ip' + i + '@ejemplo.com' }); assert.equal(r.st, 200); }
  r = await altaBuena({ correo: 'ip9@ejemplo.com' });
  assert.equal(r.st, 429); assert.equal(r.j.motivo, 'ip'); paso('más de 3 altas en una hora desde la misma IP: 429');
  ipFalsa = '10.0.0.3';

  // --- Turnstile (si se configura) ---
  s.env.TURNSTILE_SECRETO = 'secreto-turnstile-falso'; s.env.TURNSTILE_SITIO = 'sitio-falso';
  r = await altaBuena({ correo: 'ts@ejemplo.com', turnstile: 'token-malo' });
  assert.equal(r.j.motivo, 'turnstile');
  r = await altaBuena({ correo: 'ts@ejemplo.com', turnstile: 'token-bueno' });
  assert.equal(r.st, 200); paso('con Turnstile configurado: token malo rechazado, bueno aceptado');
  delete s.env.TURNSTILE_SECRETO; delete s.env.TURNSTILE_SITIO;

  // --- límites del plan Básico ---
  for (let i = 0; i < 30; i++) { r = await pedir('POST', '/programar', { id: 'p' + i, cuando: new Date().toISOString(), redes: ['igf'] }, A.sesion); assert.equal(r.st, 200, JSON.stringify(r.j)); }
  r = await pedir('POST', '/programar', { id: 'p30', cuando: new Date().toISOString(), redes: ['igf'] }, A.sesion);
  assert.equal(r.st, 429); assert.equal(r.j.limite, 'publicacionesMes');
  r = await pedir('POST', '/programar', { id: 'p3', cuando: new Date().toISOString(), redes: ['igf', 'fb'] }, A.sesion);
  assert.equal(r.st, 200); paso('Básico: 30 publicaciones al mes; la 31 se para (429) pero editar una ya hecha sí deja');
  r = await pedir('POST', '/enlace', { rol: 'equipo' }, A.sesion);
  assert.equal(r.st, 429); assert.equal(r.j.limite, 'usuarios'); paso('Básico: 1 usuario; invitar a alguien del equipo se para');
  s.db.run("INSERT INTO conexiones (negocio, red, cifrado, iv, cuenta, detalle, estado, actualizado) VALUES (?, 'meta', 'x', 'x', '', '{}', 'conectada', 0), (?, 'google', 'x', 'x', '', '{}', 'conectada', 0)", [A.negocio, A.negocio]);
  r = await pedir('POST', '/conectar/tiktok', {}, A.sesion);
  assert.equal(r.st, 429); assert.equal(r.j.limite, 'redes');
  r = await pedir('POST', '/conectar/meta', {}, A.sesion);
  assert.equal(r.st, 200); paso('Básico: 2 redes; la tercera se para, reconectar una que ya tiene sí deja');

  // --- el-paraiso (de Solers) sigue sin límites ---
  r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: s.codigo });
  const par = r.j.sesion;
  r = await pedir('GET', '/cuenta', undefined, par); assert.equal(r.j.plan, 'interno');
  r = await pedir('POST', '/enlace', { rol: 'equipo' }, par); assert.equal(r.st, 200); paso('El Paraíso (dado de alta por Solers) es «interno»: sin límites');

  // --- pago APAGADO ---
  r = await pedir('POST', '/pago/checkout', { plan: 'pro' }, A.sesion);
  assert.equal(r.st, 503); assert.equal(r.j.modoPrueba, true); paso('sin claves de Stripe: /pago/checkout dice que el pago no está activado (sin cobrar)');

  // --- pago ENCENDIDO con Stripe simulado ---
  Object.assign(s.env, { STRIPE_SECRET_KEY: 'sk_test_FALSA_de_prueba', STRIPE_WEBHOOK_SECRET: WHSEC });
  r = await pedir('POST', '/pago/checkout', { plan: 'pro' }, A.sesion);
  assert.equal(r.st, 503); paso('con las claves pero sin PAGO_ENCENDIDO=1 tampoco cobra (doble seguro)');
  s.env.PAGO_ENCENDIDO = '1';
  r = await pedir('GET', '/planes'); assert.equal(r.j.pago.encendido, true);
  r = await pedir('POST', '/pago/checkout', { plan: 'pro' }, A.sesion);
  assert.equal(r.st, 200); assert.match(r.j.url, /^https:\/\/checkout\.stripe\.com\//);
  const cs = STRIPE.sesiones[0].campos;
  assert.equal(cs.mode, 'subscription'); assert.equal(cs.client_reference_id, A.negocio);
  assert.equal(cs['line_items[0][price_data][unit_amount]'], '7900'); assert.equal(cs['line_items[0][price_data][currency]'], 'eur');
  assert.equal(cs['line_items[0][price_data][tax_behavior]'], 'exclusive'); assert.equal(cs['subscription_data[metadata][plan]'], 'pro');
  assert.ok(Number(cs['subscription_data[trial_end]']) > Date.now() / 1000 + 12 * 86400);
  assert.equal(cs.customer_email, 'marga@ejemplo.com');
  paso('Checkout: suscripción mensual de 79,00 € + IVA, respeta los días de prueba que quedan');
  s.env.STRIPE_PRECIO_PRO = 'price_123';
  await pedir('POST', '/pago/checkout', { plan: 'pro' }, A.sesion);
  assert.equal(STRIPE.sesiones[1].campos['line_items[0][price]'], 'price_123'); delete s.env.STRIPE_PRECIO_PRO;
  paso('con STRIPE_PRECIO_PRO usa ese precio de Stripe');

  // --- webhook firmado ---
  const ev = (id, type, object) => JSON.stringify({ id, type, data: { object } });
  let cuerpo = ev('evt_1', 'checkout.session.completed', { id: 'cs_test_0', client_reference_id: A.negocio, customer: 'cus_1', subscription: 'sub_1', metadata: { negocio: A.negocio, plan: 'pro' } });
  r = await pedir('POST', '/stripe/webhook', cuerpo, null, { 'Stripe-Signature': firmar(cuerpo, 'whsec_OTRO') });
  assert.equal(r.st, 400); paso('webhook con firma falsa: rechazado');
  r = await pedir('POST', '/stripe/webhook', cuerpo, null, { 'Stripe-Signature': firmar(cuerpo, WHSEC, Math.floor(Date.now() / 1000) - 3600) });
  assert.equal(r.st, 400); paso('webhook con firma vieja (más de 5 min): rechazado');
  r = await pedir('POST', '/stripe/webhook', cuerpo, null, { 'Stripe-Signature': firmar(cuerpo) });
  assert.equal(r.st, 200);
  r = await pedir('POST', '/stripe/webhook', cuerpo, null, { 'Stripe-Signature': firmar(cuerpo) });
  assert.equal(r.j.repetido, true); paso('webhook firmado bien: aceptado, y el repetido no se aplica dos veces');
  cuerpo = ev('evt_2', 'customer.subscription.updated', { id: 'sub_1', customer: 'cus_1', status: 'active', current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, metadata: { negocio: A.negocio, plan: 'pro' } });
  await pedir('POST', '/stripe/webhook', cuerpo, null, { 'Stripe-Signature': firmar(cuerpo) });
  r = await pedir('GET', '/cuenta', undefined, A.sesion);
  assert.equal(r.j.plan, 'pro'); assert.equal(r.j.estado, 'activa'); assert.equal(r.j.stripeEstado, 'active'); assert.ok(r.j.pagadoHasta > Date.now());
  paso('suscripción activa → plan Pro activado');
  r = await pedir('POST', '/enlace', { rol: 'equipo' }, A.sesion); assert.equal(r.st, 200);
  r = await pedir('POST', '/conectar/tiktok', {}, A.sesion); assert.equal(r.st, 200); paso('con Pro ya deja invitar al equipo y conectar más redes');
  r = await pedir('POST', '/pago/portal', {}, A.sesion);
  assert.equal(r.st, 200); assert.equal(STRIPE.portales[0].customer, 'cus_1'); paso('portal de cliente de Stripe (cambiar plan, tarjeta, facturas, baja)');
  cuerpo = ev('evt_3', 'invoice.payment_failed', { id: 'in_1', customer: 'cus_1', subscription: 'sub_1' });
  await pedir('POST', '/stripe/webhook', cuerpo, null, { 'Stripe-Signature': firmar(cuerpo) });
  r = await pedir('POST', '/programar', { id: 'nuevo1', cuando: new Date().toISOString(), redes: ['igf'] }, A.sesion);
  assert.equal(r.st, 402); assert.equal(r.j.motivo, 'impago'); paso('cobro fallido → impago: no deja programar (402) y lo explica');
  cuerpo = ev('evt_4', 'customer.subscription.deleted', { id: 'sub_1', customer: 'cus_1', status: 'canceled', metadata: { negocio: A.negocio } });
  await pedir('POST', '/stripe/webhook', cuerpo, null, { 'Stripe-Signature': firmar(cuerpo) });
  r = await pedir('GET', '/cuenta', undefined, A.sesion); assert.equal(r.j.estado, 'cancelada'); paso('baja en Stripe → cancelada');

  // --- prueba caducada ---
  r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: s.codigo });
  ipFalsa = '10.0.0.4';
  const B2 = (await altaBuena({ correo: 'b2@ejemplo.com', plan: 'agencia' })).j;
  s.db.run('UPDATE cuentas SET prueba_hasta = ? WHERE negocio = ?', [Date.now() - 1000, B2.negocio]);
  r = await pedir('POST', '/programar', { id: 'x', cuando: new Date().toISOString(), redes: ['igf'] }, B2.sesion);
  assert.equal(r.st, 402); assert.equal(r.j.motivo, 'prueba-terminada');
  r = await pedir('GET', '/estado/principal', undefined, B2.sesion); assert.equal(r.st, 200);
  paso('a los 14 días sin pagar: no deja publicar, pero sus datos siguen ahí');
  s.db.run("INSERT INTO agenda (negocio, id, datos, cuando, estado) VALUES (?, 'viejo', ?, ?, 'programada')", [B2.negocio, JSON.stringify({ id: 'viejo', redes: ['igf'], cuando: new Date().toISOString(), estado: 'programada' }), Date.now() - 1000]);
  await s.cron();
  const fila = s.db.exec("SELECT estado FROM agenda WHERE negocio = '" + B2.negocio + "' AND id = 'viejo'")[0].values[0][0];
  assert.equal(fila, 'programada'); paso('el cron no publica lo de una prueba terminada');

  // --- administración ---
  r = await pedir('GET', '/admin/clientes'); assert.equal(r.st, 401);
  r = await pedir('GET', '/admin/clientes', undefined, null, { 'X-Chispa-Admin': s.env.ADMIN_CLAVE });
  const yo = r.j.clientes.find((c) => c.id === A.negocio), par2 = r.j.clientes.find((c) => c.id === 'el-paraiso');
  assert.equal(yo.plan, 'pro'); assert.equal(yo.estado, 'cancelada'); assert.equal(yo.stripeEstado, 'canceled'); assert.ok(yo.uso.publicacionesMes >= 30); assert.equal(par2.plan, 'interno');
  paso('modo Solers: ve todos los clientes con su plan, estado de pago y uso');
  r = await pedir('POST', '/admin/clientes/' + B2.negocio, { estado: 'activa', plan: 'basico' }, null, { 'X-Chispa-Admin': s.env.ADMIN_CLAVE });
  assert.equal(r.j.estado, 'activa');
  r = await pedir('POST', '/programar', { id: 'x', cuando: new Date().toISOString(), redes: ['igf'] }, B2.sesion); assert.equal(r.st, 200);
  paso('Solers puede activar a mano (p. ej. si paga por transferencia)');
  r = await pedir('DELETE', '/admin/negocios/el-paraiso', undefined, null, { 'X-Chispa-Admin': s.env.ADMIN_CLAVE }); assert.equal(r.st, 403);
  r = await pedir('DELETE', '/admin/negocios/' + B2.negocio, undefined, null, { 'X-Chispa-Admin': s.env.ADMIN_CLAVE }); assert.equal(r.j.ok, true);
  r = await pedir('GET', '/cuenta', undefined, B2.sesion); assert.equal(r.st, 401);
  paso('borrar un negocio de prueba lo quita todo (y El Paraíso no se deja borrar)');

  Date.now = realNow;
  console.log('\n' + ok + ' comprobaciones en verde');
  s.cerrar(); process.exit(0);
})().catch((e) => { console.error('✗', e); process.exit(1); });
