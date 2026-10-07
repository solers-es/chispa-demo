/* Chispa · pruebas del servidor (sin red, sin cuenta): NODE_PATH=… node pruebas/servidor-api.cjs */
const assert = require('assert');
const { arrancar } = require('./servidor-simulador.cjs');

(async () => {
  const s = await arrancar({ web: false });
  const B = s.base;
  let ok = 0;
  const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const pedir = async (metodo, ruta, cuerpo, ses, extra = {}) => {
    const h = { 'Content-Type': 'application/json', ...extra };
    if (ses) h.Authorization = 'Bearer ' + ses;
    const r = await fetch(B + ruta, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), redirect: 'manual' });
    let j = null; try { j = await r.clone().json(); } catch (e) {}
    return { st: r.status, j, r };
  };

  // --- acceso ---
  let r = await pedir('GET', '/estado/principal');
  assert.equal(r.st, 401); paso('sin sesión no se ve nada (401)');
  r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: 'AAAA-BBBB-CCCC' });
  assert.equal(r.st, 401); paso('código malo rechazado');
  r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: s.codigo.toLowerCase().replace(/-/g, ' ') });
  assert.equal(r.st, 200); assert.equal(r.j.esAdministrador, true);
  const portatil = r.j.sesion; paso('entra con el código (sin importar mayúsculas ni guiones) y es dueño');
  r = await pedir('POST', '/enlace', {}, portatil);
  const enlace = r.j.codigo;
  r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: enlace });
  assert.equal(r.st, 200); assert.equal(r.j.esAdministrador, false);
  const movil = r.j.sesion;
  r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: enlace });
  assert.equal(r.st, 401); paso('el código de «Enlazar otro móvil» vale una sola vez y da rol de equipo');

  // --- estado con versión ---
  r = await pedir('GET', '/estado/principal', undefined, movil);
  assert.deepEqual([r.st, r.j.version], [200, 0]);
  r = await pedir('PUT', '/estado/principal', { base: 0, datos: { negocio: { nombre: 'El Paraíso' }, n: 1 } }, portatil);
  assert.equal(r.j.version, 1);
  r = await pedir('GET', '/estado/principal', undefined, movil);
  assert.equal(r.j.datos.n, 1); paso('lo que guarda el portátil lo ve el móvil');
  r = await pedir('GET', '/estado/principal?v=1', undefined, movil);
  assert.equal(r.j.sinCambios, true); paso('si no hay nada nuevo responde «sinCambios» (barato)');
  r = await pedir('PUT', '/estado/principal', { base: 1, datos: { n: 2 } }, movil);
  assert.equal(r.j.version, 2);
  r = await pedir('PUT', '/estado/principal', { base: 1, datos: { n: 99 } }, portatil);
  assert.equal(r.st, 409); assert.equal(r.j.version, 2); assert.equal(r.j.datos.n, 2); paso('guardar sobre una versión vieja da 409 con lo nuevo (no se pisa)');
  r = await pedir('PUT', '/estado/../x', { base: 0, datos: {} }, portatil);
  assert.notEqual(r.st, 200); paso('nombres de documento raros rechazados');

  // --- OAuth Google ---
  r = await pedir('POST', '/conectar/google', { volver: 'https://malo.example/' }, movil);
  assert.equal(r.st, 403); paso('el equipo no puede conectar redes (solo el dueño)');
  s.estado.cuotaGbp0 = true; // como hoy: Google aún no ha aprobado la API de la ficha
  r = await pedir('POST', '/conectar/google', {}, portatil);
  await pedir('GET', '/oauth/vuelta?code=codigo-bueno&state=' + new URL(r.j.url).searchParams.get('state'));
  r = await pedir('GET', '/conexiones', undefined, movil);
  assert.match(r.j.conexiones.find((c) => c.red === 'google').detalle.aviso, /todavía no ha aprobado/);
  r = await pedir('POST', '/programar', { id: 'g0', redes: ['gbp'], texto: 'x', cuando: new Date(Date.now() - 1000).toISOString() }, movil);
  await s.cron();
  r = await pedir('GET', '/agenda', undefined, movil);
  assert.match(r.j.items.find((x) => x.id === 'g0').motivo, /todavía no ha aprobado/);
  await pedir('DELETE', '/programar/g0', undefined, movil);
  s.estado.cuotaGbp0 = false;
  paso('Google sin aprobar (cuota 0): se conecta igual y dice claro que falta la aprobación');
  r = await pedir('POST', '/conectar/google', { volver: 'https://malo.example/robar' }, portatil);
  const ug = new URL(r.j.url);
  assert.equal(ug.hostname, 'accounts.google.com'); assert.equal(ug.searchParams.get('access_type'), 'offline'); assert.equal(ug.searchParams.get('prompt'), 'consent');
  assert.equal(ug.searchParams.get('redirect_uri'), B + '/oauth/vuelta'); assert.ok(ug.searchParams.get('code_challenge'));
  paso('Google: access_type=offline, prompt=consent, PKCE y redirect_uri = <URL_BASE>/oauth/vuelta');
  r = await pedir('GET', '/oauth/vuelta?code=codigo-bueno&state=' + ug.searchParams.get('state'));
  assert.equal(r.st, 302);
  assert.ok(r.r.headers.get('location').startsWith(s.env.PANEL_URL + '#conectar-ok-google'), r.r.headers.get('location'));
  paso('vuelta de Google: guarda y vuelve al panel (nunca a una dirección de fuera)');
  r = await pedir('GET', '/oauth/vuelta?code=codigo-bueno&state=' + ug.searchParams.get('state'));
  assert.equal(r.st, 400); paso('el «state» vale una sola vez');

  r = await pedir('GET', '/conexiones', undefined, movil);
  const g = r.j.conexiones.find((c) => c.red === 'google');
  assert.equal(g.estado, 'conectada'); assert.equal(g.detalle.local, 'locations/222'); assert.equal(g.cuenta, 'cuenta-prueba@ejemplo.com');
  assert.ok(!/SECRETO|g-acceso/.test(JSON.stringify(r.j))); paso('el móvil ve Google conectado SIN volver a enlazar, y sin ningún token');
  const fila = s.db.exec("SELECT cifrado FROM conexiones")[0].values.map((v) => v[0]).join('');
  assert.ok(!/SECRETO|g-acceso/.test(fila) && !/SECRETO/.test(Buffer.from(fila, 'base64').toString('latin1'))); paso('en la base los tokens están cifrados');

  // --- el servidor llama a la API y renueva el token caducado ---
  const antes = s.registro.length;
  r = await pedir('POST', '/api/google', { url: 'https://mybusiness.googleapis.com/v4/accounts/111/locations/222/reviews' }, movil);
  assert.equal(r.j.status, 200); assert.equal(r.j.datos.reviews[0].reviewId, 'r1');
  const llamadas = s.registro.slice(antes);
  assert.ok(llamadas.some((c) => /oauth2.*token/.test(c.url) && /refresh_token/.test(c.cuerpo)), 'renovó');
  const renovado = llamadas.filter((c) => /oauth2.*token/.test(c.url)).length;
  assert.ok(renovado >= 1); assert.notEqual(llamadas.find((c) => /reviews/.test(c.url)).auth, 'Bearer g-acceso-1');
  assert.equal(llamadas.find((c) => /reviews/.test(c.url)).auth.slice(0, 16), 'Bearer g-acceso-');
  paso('token de Google a punto de caducar → el servidor lo renueva con refresh_token y llama a la API');
  r = await pedir('POST', '/api/google', { url: 'https://evil.example.com/robar' }, movil);
  assert.equal(r.st, 403);
  r = await pedir('POST', '/api/youtube', { url: 'https://www.googleapis.com/drive/v3/files' }, movil);
  assert.equal(r.st, 403); paso('/api solo llama a los dominios de cada red (lista blanca)');

  // --- Meta y TikTok ---
  r = await pedir('POST', '/conectar/meta', {}, portatil);
  const um = new URL(r.j.url); assert.equal(um.hostname, 'www.facebook.com');
  r = await pedir('GET', '/oauth/vuelta?code=x&state=' + um.searchParams.get('state'));
  assert.ok(r.r.headers.get('location').includes('#conectar-ok-meta'));
  r = await pedir('GET', '/conexiones', undefined, movil);
  const m = r.j.conexiones.find((c) => c.red === 'meta');
  assert.equal(m.cuenta, 'El Paraíso Palma · @elparaiso'); assert.equal(m.detalle.paginas.length, 2);
  paso('Meta: token de usuario largo → tokens de página; elige sola la página con Instagram');
  r = await pedir('POST', '/conectar/tiktok', {}, portatil);
  const ut = new URL(r.j.url); assert.equal(ut.hostname, 'www.tiktok.com');
  r = await pedir('GET', '/oauth/vuelta?code=x&state=' + ut.searchParams.get('state'));
  r = await pedir('GET', '/conexiones', undefined, movil);
  assert.equal(r.j.conexiones.find((c) => c.red === 'tiktok').cuenta, 'elparaiso_tt'); paso('TikTok conectado');
  r = await pedir('POST', '/conectar/youtube', {}, portatil);
  const uy = new URL(r.j.url);
  r = await pedir('GET', '/oauth/vuelta?code=codigo-bueno&state=' + uy.searchParams.get('state'));
  r = await pedir('GET', '/conexiones', undefined, movil);
  assert.equal(r.j.conexiones.find((c) => c.red === 'youtube').detalle.canal, 'UC123'); paso('YouTube conectado con su canal');

  // --- agenda + cron ---
  r = await pedir('POST', '/programar', { id: 'a1', redes: ['gbp', 'fb'], texto: 'Paella el domingo', titulo: 'Paella', formato: 'post', cuando: new Date(Date.now() - 1000).toISOString(), medios: [] }, movil);
  assert.equal(r.st, 200);
  await s.cron();
  r = await pedir('GET', '/agenda', undefined, portatil);
  const it = r.j.items.find((x) => x.id === 'a1');
  assert.equal(it.estado, 'publicada', it.motivo); assert.deepEqual(it.res, { gbp: 'publicada', fb: 'publicada' });
  assert.ok(s.registro.some((c) => /p2\/feed/.test(c.url) && /m-pagina2-SECRETO/.test(c.cuerpo)));
  paso('el cron publica lo programado en Google y Facebook con los tokens del servidor');

  // --- salir y cerrar todo ---
  r = await pedir('DELETE', '/sesiones', undefined, portatil);
  r = await pedir('GET', '/yo', undefined, movil);
  assert.equal(r.st, 401); paso('«cerrar todos los dispositivos» anula las sesiones');

  console.log('\n' + ok + ' comprobaciones en verde');
  s.cerrar();
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
