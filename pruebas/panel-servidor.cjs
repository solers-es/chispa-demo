/* =====================================================================
   Chispa · pruebas del servidor: BANDEJA, ESTADÍSTICAS, ANUNCIOS y
   AUTOMATIZACIONES (conectores/panel-real.js y sus módulos).
   Sin red y sin cuenta: el Worker de verdad con D1 imitada (SQLite) y las
   APIs de Meta, Google, YouTube y TikTok imitadas con respuestas con la
   forma de su documentación oficial.
   Uso: PUERTO_API=8848 PUERTO_WEB=8845 NODE_PATH=<node_modules con sql.js> node pruebas/panel-servidor.cjs
   ===================================================================== */
const assert = require('assert');
const path = require('path');
const { arrancar } = require('./servidor-simulador.cjs');

const HOY = new Date(), ayer = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const comentarioCarta = { id: 'k3', text: 'CARTA', username: 'joana.mallorca', timestamp: HOY.toISOString(), from: { id: 'u3', username: 'joana.mallorca' } };
let comentariosIG = [
  { id: 'k1', text: '¿Abrís los domingos a mediodía?', username: 'marta.palma', timestamp: HOY.toISOString(), from: { id: 'u1', username: 'marta.palma' } },
  { id: 'k2', text: 'Gracias!', username: 'elparaiso', timestamp: HOY.toISOString(), from: { id: 'ig9', username: 'elparaiso' } }, // nuestro: no entra
];
const redesJ = [
  // ---- Instagram ----
  [/v21\.0\/ig9\?/, (u) => [200, u.searchParams.get('fields').includes('followers_count') ? { followers_count: 1210, media_count: 124 } : { username: 'elparaiso' }]],
  [/v21\.0\/ig9\/media\?/, () => [200, { data: [{ id: 'med1', caption: 'Paella de los domingos 🥘', permalink: 'https://instagram.com/p/x', timestamp: HOY.toISOString(), comments_count: 3 }, { id: 'med2', caption: 'Sin comentarios', comments_count: 0 }] }]],
  [/v21\.0\/med1\/comments/, () => [200, { data: comentariosIG }]],
  [/v21\.0\/k\d\/replies/, () => [200, { id: 'resp-ig-1' }]],
  [/v21\.0\/ig9\/insights/, () => [200, { data: [{ name: 'reach', total_value: { value: 512 } }, { name: 'views', total_value: { value: 1400 } }, { name: 'profile_views', total_value: { value: 40 } }, { name: 'website_clicks', total_value: { value: 9 } }, { name: 'total_interactions', total_value: { value: 37 } }] }]],
  // ---- Facebook ----
  [/v21\.0\/p2\/feed\?/, (u, o) => [200, { data: [{ id: 'p2_1', message: 'Menú del día', permalink_url: 'https://facebook.com/p2_1', comments: { data: [{ id: 'fc1', message: 'La paella estaba buenísima 😍', from: { id: 'u5', name: 'Carmen López' }, created_time: HOY.toISOString() }, { id: 'fc2', message: 'Gracias Carmen', from: { id: 'p2', name: 'El Paraíso' }, created_time: HOY.toISOString() }] } }] }]],
  [/v21\.0\/p2\/conversations\?/, (u) => [200, u.searchParams.get('platform') === 'instagram'
    ? { data: [{ id: 'cv-ig-1', participants: { data: [{ id: 'ig9', username: 'elparaiso' }, { id: 'igsid-7', username: 'toni.f' }] }, messages: { data: [{ id: 'mm2', message: 'Quiero reservar para 8 personas el viernes', from: { id: 'igsid-7', username: 'toni.f' }, created_time: HOY.toISOString() }, { id: 'mm1', message: 'Hola', from: { id: 'igsid-7' }, created_time: new Date(Date.now() - 6e4).toISOString() }] } }] }
    : { data: [] }]],
  [/v21\.0\/p2\/messages/, () => [200, { recipient_id: 'x', message_id: 'mid.1' }]],
  [/v21\.0\/fc\d\/comments/, () => [200, { id: 'resp-fb-1' }]],
  [/v21\.0\/p2\/insights/, () => [200, { data: [{ name: 'page_impressions_unique', values: [{ value: 180 }] }, { name: 'page_post_engagements', values: [{ value: 12 }] }] }]],
  [/v21\.0\/p2\?fields=followers_count/, () => [200, { followers_count: 905, fan_count: 900 }]],
  // ---- anuncios Meta ----
  [/v21\.0\/me\/adaccounts/, () => [200, { data: [{ id: 'act_555', account_id: '555', name: 'El Paraíso Ads', currency: 'EUR', account_status: 1 }] }]],
  [/v21\.0\/act_555\/campaigns/, () => [200, { id: 'camp1' }]],
  [/v21\.0\/act_555\/adsets/, () => [200, { id: 'set1' }]],
  [/v21\.0\/act_555\/adcreatives/, () => [200, { id: 'cre1' }]],
  [/v21\.0\/act_555\/ads/, () => [200, { id: 'ad1' }]],
  [/v21\.0\/camp1\/insights/, () => [200, { data: [{ impressions: '3200', reach: '2100', clicks: '87', spend: '14.20', ctr: '2.7', cpc: '0.16', actions: [{ action_type: 'link_click', value: '61' }] }] }]],
  [/v21\.0\/(camp1|set1|ad1)$/, () => [200, { success: true }]],
  // ---- Google ----
  [/mybusiness\.googleapis\.com\/v4\/accounts\/111\/locations\/222\/reviews\?/, () => [200, { reviews: [
    { reviewId: 'rv5', name: 'accounts/111/locations/222/reviews/rv5', reviewer: { displayName: 'Peter Schmidt' }, starRating: 'FIVE', comment: 'Sehr leckeres Essen und super freundlich!', createTime: HOY.toISOString() },
    { reviewId: 'rv2', name: 'accounts/111/locations/222/reviews/rv2', reviewer: { displayName: 'Laura M.' }, starRating: 'TWO', comment: 'Tardaron mucho y la carne llegó fría.', createTime: HOY.toISOString() },
    { reviewId: 'rv4', name: 'accounts/111/locations/222/reviews/rv4', reviewer: { displayName: 'Ana' }, starRating: 'FOUR', comment: 'Muy bien', createTime: HOY.toISOString(), reviewReply: { comment: 'Gracias Ana' } }] }]],
  [/reviews\/rv\d\/reply/, () => [200, { comment: 'ok' }]],
  [/businessprofileperformance\.googleapis\.com\/v1\/locations\/222:fetchMultiDailyMetricsTimeSeries/, () => {
    const [y, m, d] = ayer.split('-').map(Number);
    const serie = (k, v) => ({ dailyMetric: k, timeSeries: { datedValues: [{ date: { year: y, month: m, day: d }, value: String(v) }] } });
    return [200, { multiDailyMetricTimeSeries: [{ dailyMetricTimeSeries: [serie('BUSINESS_IMPRESSIONS_MOBILE_MAPS', 150), serie('BUSINESS_IMPRESSIONS_MOBILE_SEARCH', 60), serie('CALL_CLICKS', 4), serie('BUSINESS_DIRECTION_REQUESTS', 13), serie('WEBSITE_CLICKS', 8)] }] }];
  }],
  // ---- YouTube ----
  [/youtube\/v3\/commentThreads/, () => [200, { items: [{ id: 'th1', snippet: { topLevelComment: { snippet: { textOriginal: '¿Cuánto cuesta el menú del día?', authorDisplayName: 'Sergi', publishedAt: HOY.toISOString(), videoId: 'v1', authorChannelId: { value: 'UCotro' } } } } }] }]],
  [/youtube\/v3\/comments\?part=snippet/, () => [200, { id: 'yt-resp-1' }]],
  [/youtube\/v3\/channels\?part=statistics/, () => [200, { items: [{ statistics: { subscriberCount: '41' } }] }]],
  [/youtubeanalytics\.googleapis\.com\/v2\/reports\?ids=channel==MINE&dimensions=day/, () => [200, { rows: [[ayer, 230, 12, 2, 3, 1]] }]],
  // ---- TikTok ----
  [/open\.tiktokapis\.com\/v2\/user\/info\/\?fields=follower_count/, () => [200, { data: { user: { follower_count: 77, likes_count: 900, video_count: 5 } }, error: { code: 'ok' } }]],
  [/open\.tiktokapis\.com\/v2\/video\/list/, () => [200, { data: { videos: [{ id: 'tv1', view_count: 1000, like_count: 50, comment_count: 4, share_count: 2 }] }, error: { code: 'ok' } }]],
];

(async () => {
  const s = await arrancar({ web: false });
  for (const r of redesJ.slice().reverse()) s.respuestas.unshift(r);
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
  const llamadas = (re, metodo) => s.registro.filter((c) => re.test(c.url) && (!metodo || c.metodo === metodo));

  let r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: s.codigo });
  const dueno = r.j.sesion;
  r = await pedir('POST', '/enlace', {}, dueno);
  r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: r.j.codigo });
  const equipo = r.j.sesion;

  // --- sin conexiones: estadísticas de EJEMPLO, bandeja vacía y honesta ---
  r = await pedir('GET', '/metricas', undefined, dueno);
  assert.equal(r.st, 200); assert.equal(r.j.ejemplo, true); assert.ok(r.j.dias.length >= 28); assert.ok(r.j.consejos.length >= 1); assert.match(r.j.aviso, /EJEMPLO/);
  paso('sin redes conectadas, /metricas da datos de EJEMPLO marcados como tales, con consejos');
  r = await pedir('POST', '/bandeja/recoger', {}, dueno);
  assert.equal(r.j.nuevos, 0); assert.equal(r.j.porRed.ig.conectada, false); assert.match(r.j.porRed.tt.aviso, /TikTok no deja/);
  paso('sin conexiones, «traer nuevos» no inventa nada y dice qué red falta (y que TikTok no deja)');
  r = await pedir('GET', '/bandeja', undefined);
  assert.equal(r.st, 401); paso('la bandeja pide sesión');

  // --- conectar Meta, Google y YouTube (OAuth simulado) ---
  for (const red of ['meta', 'google', 'youtube', 'tiktok']) {
    r = await pedir('POST', '/conectar/' + red, {}, dueno);
    const st = new URL(r.j.url).searchParams.get('state');
    await pedir('GET', '/oauth/vuelta?code=' + (red === 'google' || red === 'youtube' ? 'codigo-bueno' : 'x') + '&state=' + st);
  }
  r = await pedir('GET', '/conexiones', undefined, dueno);
  assert.equal(r.j.conexiones.length, 4);
  r = await pedir('POST', '/conectar/meta', {}, dueno);
  const scope = new URL(r.j.url).searchParams.get('scope');
  for (const p of ['instagram_manage_comments', 'instagram_manage_messages', 'pages_messaging', 'pages_manage_engagement', 'read_insights', 'instagram_manage_insights', 'ads_management']) assert.ok(scope.includes(p), p);
  r = await pedir('POST', '/conectar/tiktok', {}, dueno);
  assert.ok(new URL(r.j.url).searchParams.get('scope').includes('user.info.stats'));
  paso('Meta pide los permisos de comentarios, mensajes, estadísticas y anuncios; TikTok los de estadísticas');

  // --- bandeja ---
  r = await pedir('POST', '/bandeja/recoger', {}, equipo);
  assert.equal(r.st, 200, JSON.stringify(r.j));
  assert.equal(r.j.porRed.ig.conectada, true, JSON.stringify(r.j.porRed));
  r = await pedir('GET', '/bandeja', undefined, equipo);
  const els = r.j.elementos, por = (id) => els.find((e) => e.id === id);
  assert.ok(por('ig:c:k1') && !por('ig:c:k2'), 'nuestro propio comentario no entra');
  assert.ok(por('fb:c:fc1') && !por('fb:c:fc2'));
  assert.ok(por('ig:m:cv-ig-1') && por('gbp:r:rv5') && por('gbp:r:rv2') && por('yt:c:th1'));
  paso('recoge comentarios de Instagram y Facebook, mensajes de Instagram, reseñas de Google y comentarios de YouTube (sin los nuestros)');
  assert.deepEqual(por('ig:c:k1').etiquetas.includes('horario'), true);
  assert.ok(por('ig:m:cv-ig-1').etiquetas.includes('reserva'));
  assert.ok(por('gbp:r:rv2').etiquetas.includes('queja'));
  assert.ok(por('yt:c:th1').etiquetas.includes('precio'));
  assert.match(por('ig:m:cv-ig-1').sugerencia, /reservar/i);
  assert.match(por('gbp:r:rv5').sugerencia, /Danke|Vielen/); // contesta en alemán
  assert.match(por('gbp:r:rv2').sugerencia, /Sentimos|Lamentamos/);
  paso('cada uno con etiquetas automáticas (horario, reserva, queja, precio) y respuesta sugerida en el idioma del cliente');
  assert.equal(por('gbp:r:rv4').estado, 'respondido'); paso('una reseña ya contestada en Google entra como «respondida»');
  assert.equal(por('ig:m:cv-ig-1').historial.length, 2); paso('los mensajes traen la conversación');

  r = await pedir('POST', '/bandeja/ig:c:k1/responder', { texto: '¡Sí! Domingos de 13:00 a 16:30 🙌' }, equipo);
  assert.equal(r.st, 200, JSON.stringify(r.j)); assert.equal(r.j.elemento.estado, 'respondido');
  const rep = llamadas(/k1\/replies/, 'POST').pop();
  assert.ok(rep && /m-pagina2-SECRETO/.test(rep.cuerpo) && /Domingos/.test(decodeURIComponent(rep.cuerpo)));
  paso('contestar un comentario de Instagram llama a /{comentario}/replies con el token de la página');
  r = await pedir('POST', '/bandeja/ig:m:cv-ig-1/responder', { texto: 'Hecho, Toni: viernes 21:00 para 8.' }, equipo);
  const dm = llamadas(/p2\/messages/, 'POST').pop();
  assert.ok(/igsid-7/.test(decodeURIComponent(dm.cuerpo)) && /RESPONSE/.test(dm.cuerpo)); paso('contestar un mensaje directo va por /{página}/messages al cliente (ventana de 24 h)');
  r = await pedir('POST', '/bandeja/fb:c:fc1/responder', { texto: '¡Gracias, Carmen!' }, equipo);
  assert.ok(llamadas(/fc1\/comments/, 'POST').length); paso('comentario de Facebook → /{comentario}/comments');
  r = await pedir('POST', '/bandeja/gbp:r:rv5/responder', { texto: 'Vielen Dank, Peter!' }, equipo);
  const pr = llamadas(/reviews\/rv5\/reply/, 'PUT').pop();
  assert.ok(pr && /Vielen Dank/.test(pr.cuerpo)); paso('reseña de Google → PUT …/reviews/{id}/reply');
  r = await pedir('POST', '/bandeja/yt:c:th1/responder', { texto: 'El menú son 15,50 €' }, equipo);
  assert.ok(/"parentId":"th1"/.test(llamadas(/youtube\/v3\/comments\?part=snippet/, 'POST').pop().cuerpo)); paso('YouTube → comments.insert con parentId');
  r = await pedir('POST', '/bandeja/gbp:r:rv2/responder', { texto: '' }, equipo);
  assert.equal(r.st, 400); paso('respuesta vacía rechazada');
  r = await pedir('PATCH', '/bandeja/gbp:r:rv2', { etiquetas: ['queja', 'cocina'], estado: 'archivado' }, equipo);
  assert.deepEqual(r.j.etiquetas, ['queja', 'cocina']); assert.equal(r.j.estado, 'archivado');
  r = await pedir('GET', '/bandeja', undefined, equipo);
  assert.ok(!r.j.elementos.some((e) => e.id === 'gbp:r:rv2')); r = await pedir('GET', '/bandeja?estado=archivado', undefined, equipo);
  assert.ok(r.j.elementos.some((e) => e.id === 'gbp:r:rv2')); r = await pedir('GET', '/bandeja?etiqueta=cocina&estado=archivado', undefined, equipo);
  assert.equal(r.j.elementos.length, 1);
  r = await pedir('PATCH', '/bandeja/gbp:r:rv2', { estado: 'volando' }, equipo);
  assert.equal(r.st, 400); paso('etiquetas y estados: archivar, filtrar por estado y etiqueta; estados raros rechazados');
  r = await pedir('POST', '/bandeja/ig:m:cv-ig-1/sugerencia', { variante: 1 }, equipo);
  assert.ok(r.j.sugerencia.length > 20); paso('«otra versión» de la respuesta sugerida');
  const antes = s.registro.length;
  await pedir('POST', '/bandeja/recoger', {}, equipo);
  r = await pedir('GET', '/bandeja/ig:c:k1', undefined, equipo);
  assert.equal(r.j.estado, 'respondido'); assert.ok(s.registro.length > antes); paso('volver a recoger no pisa lo ya contestado');

  // --- estadísticas ---
  r = await pedir('POST', '/metricas/recoger', {}, dueno);
  assert.equal(r.j.porRed.ig.ok, true, JSON.stringify(r.j.porRed)); assert.equal(r.j.porRed.gbp.ok, true, JSON.stringify(r.j.porRed.gbp)); assert.equal(r.j.porRed.yt.ok, true); assert.equal(r.j.porRed.tt.ok, true, JSON.stringify(r.j.porRed.tt));
  r = await pedir('GET', '/metricas?dias=14', undefined, equipo);
  assert.equal(r.j.ejemplo, false);
  const ig = r.j.series.ig.find((f) => f.dia === ayer), gb = r.j.series.gbp.find((f) => f.dia === ayer);
  assert.deepEqual([ig.seguidores, ig.alcance, ig.vistas, ig.interacciones], [1210, 512, 1400, 37]);
  assert.deepEqual([gb.vistas, gb.llamadas, gb.como_llegar, gb.clics_web], [210, 4, 13, 8]);
  assert.equal(r.j.series.fb.find((f) => f.dia === ayer).seguidores, 905);
  assert.equal(r.j.series.yt.find((f) => f.dia === ayer).vistas, 230);
  assert.equal(r.j.series.tt.find((f) => f.dia === ayer).seguidores, 77);
  assert.ok(r.j.consejos.some((c) => /intención de venir/.test(c.titulo)), JSON.stringify(r.j.consejos));
  paso('estadísticas reales por día de Instagram, Facebook, Google, YouTube y TikTok, con consejos sacados de esos datos');

  // --- anuncios ---
  const anuncio = { red: 'meta', objetivo: 'visitas', texto: 'Paella los domingos en Palma. Reserva tu mesa.', titulo: 'El Paraíso', imagen: 'https://ejemplo.com/paella.jpg', enlace: 'https://el-paraiso-eight.vercel.app/reservas.html', diario: 5, dias: 7, radioKm: 5, edadMin: 25, edadMax: 60, lat: 39.5696, lng: 2.6502 };
  r = await pedir('POST', '/anuncios', { ...anuncio, diario: 0.2 }, dueno);
  assert.equal(r.st, 400); r = await pedir('POST', '/anuncios', { ...anuncio, lat: null, lng: null }, dueno);
  assert.equal(r.st, 400); assert.match(r.j.error, /ubicación/); paso('anuncio: presupuesto y ubicación se validan');
  r = await pedir('POST', '/anuncios', anuncio, dueno);
  assert.equal(r.st, 200, JSON.stringify(r.j)); assert.equal(r.j.estado, 'en-pausa'); assert.deepEqual([r.j.ext.campana, r.j.ext.conjunto, r.j.ext.creatividad, r.j.ext.anuncio], ['camp1', 'set1', 'cre1', 'ad1']);
  const set = decodeURIComponent(llamadas(/act_555\/adsets/, 'POST').pop().cuerpo.replace(/\+/g, ' '));
  assert.ok(/daily_budget=500/.test(set) && /"radius":5/.test(set) && /"age_min":25/.test(set) && /status=PAUSED/.test(set) && /m-usuario-largo-SECRETO/.test(set));
  const camp = decodeURIComponent(llamadas(/act_555\/campaigns/, 'POST').pop().cuerpo);
  assert.ok(/OUTCOME_TRAFFIC/.test(camp));
  paso('Meta: crea campaña, público local (radio y edad), creatividad y anuncio, TODO en pausa (5 €/día = 500 céntimos)');
  const idA = r.j.id;
  r = await pedir('POST', '/anuncios/' + idA + '/activar', {}, equipo);
  assert.equal(r.st, 403); paso('el equipo no puede activar anuncios (gastan dinero): solo el dueño');
  r = await pedir('POST', '/anuncios/' + idA + '/activar', {}, dueno);
  assert.equal(r.j.estado, 'activa'); assert.equal(llamadas(/v21\.0\/(camp1|set1|ad1)$/, 'POST').length, 3);
  r = await pedir('POST', '/anuncios/' + idA + '/resultados', {}, dueno);
  assert.deepEqual([r.j.resultados.clics, r.j.resultados.gastado, r.j.resultados.clicsEnlace], [87, 14.2, 61]);
  r = await pedir('DELETE', '/anuncios/' + idA, undefined, dueno);
  assert.equal(r.st, 400);
  r = await pedir('POST', '/anuncios/' + idA + '/pausar', {}, dueno);
  assert.equal(r.j.estado, 'en-pausa'); paso('activar, leer resultados (clics, gasto) y pausar; no se quita de la lista una activa');
  r = await pedir('POST', '/anuncios', { ...anuncio, red: 'google', palabras: ['paella palma'] }, dueno);
  assert.equal(r.j.estado, 'preparada'); assert.match(r.j.motivo, /token de desarrollador/);
  const ops = r.j.ext.operaciones;
  assert.ok(ops[0].campaignBudgetOperation.create.amountMicros === '5000000' && ops[2].campaignCriterionOperation.create.proximity.radius === 5 && ops.some((o) => o.adGroupCriterionOperation));
  paso('Google Ads: queda PREPARADA con las operaciones exactas (presupuesto, campaña, radio, anuncio y palabras) y dice qué falta');
  r = await pedir('POST', '/anuncios', { ...anuncio, simular: true }, dueno);
  assert.equal(r.j.estado, 'simulada'); assert.equal(r.j.ejemplo, true); paso('simulación sin enviar nada');

  // --- automatizaciones ---
  r = await pedir('POST', '/reglas', { tipo: 'palabra_dm', config: { palabra: '', redes: ['ig'] } }, dueno);
  assert.equal(r.st, 400);
  r = await pedir('POST', '/reglas', { tipo: 'palabra_dm', config: { palabra: 'carta', redes: ['ig'], enlace: 'https://elparaiso.es/carta', mensaje: '¡Hola {nombre}! La carta: {enlace}' } }, dueno);
  assert.equal(r.st, 200, JSON.stringify(r.j));
  r = await pedir('POST', '/reglas', { tipo: 'resena', config: { modo: 'automatica', minimo: 4 } }, dueno);
  r = await pedir('POST', '/reglas', { tipo: 'recordatorio', config: { dias: [0, 1, 2, 3, 4, 5, 6], hora: '00:00', horas: 24 } }, dueno);
  r = await pedir('POST', '/reglas', { tipo: 'resumen_semanal', config: { dia: 1, hora: '09:00', correo: '' } }, dueno);
  r = await pedir('GET', '/reglas', undefined, equipo);
  assert.equal(r.j.reglas.length, 4); assert.equal(r.j.correo, false);
  paso('reglas: palabra clave → DM, reseñas, recordatorio y resumen semanal; validación');
  // llega un comentario nuevo con la palabra, y reseñas nuevas
  comentariosIG = comentariosIG.concat([comentarioCarta]);
  s.db.run("UPDATE bandeja SET estado = 'nuevo', auto = '{}' WHERE id IN ('gbp:r:rv5')");
  await pedir('POST', '/bandeja/recoger', {}, dueno);
  s.db.run("UPDATE bandeja SET estado = 'nuevo' WHERE id = 'gbp:r:rv2'");
  const nAntes = llamadas(/reviews\/rv5\/reply/, 'PUT').length;
  await s.cron();
  const priv = llamadas(/p2\/messages/, 'POST').find((c) => /comment_id/.test(decodeURIComponent(c.cuerpo)));
  assert.ok(priv && /"comment_id":"k3"/.test(decodeURIComponent(priv.cuerpo)) && /elparaiso\.es\/carta/.test(decodeURIComponent(priv.cuerpo)) && /joana/.test(decodeURIComponent(priv.cuerpo)), 'respuesta privada');
  r = await pedir('GET', '/bandeja/ig:c:k3', undefined, dueno);
  assert.equal(r.j.estado, 'respondido'); assert.match(r.j.respondidoPor, /automática/);
  paso('el cron: comentario «CARTA» → mensaje privado oficial con el enlace (y queda contestado)');
  assert.equal(llamadas(/reviews\/rv5\/reply/, 'PUT').length, nAntes + 1); paso('reseña de 5★ → se contesta sola en Google (modo automático)');
  assert.equal(llamadas(/reviews\/rv2\/reply/, 'PUT').length, 0);
  r = await pedir('GET', '/avisos', undefined, dueno);
  assert.ok(r.j.avisos.some((a) => a.tipo === 'resena-negativa' && /2★/.test(a.titulo)), JSON.stringify(r.j));
  paso('reseña de 2★ → NUNCA se contesta sola: aviso al dueño en la app');
  assert.ok(r.j.avisos.some((a) => a.tipo === 'recordatorio')); paso('recordatorio: sin nada programado → aviso');
  await s.cron();
  assert.equal(llamadas(/p2\/messages/, 'POST').filter((c) => /comment_id/.test(decodeURIComponent(c.cuerpo))).length, 1); paso('una segunda pasada del cron no repite el mensaje');
  r = await pedir('POST', '/reglas/ejecutar', { resumen: true }, dueno);
  r = await pedir('GET', '/avisos', undefined, dueno);
  const res = r.j.avisos.find((a) => a.tipo === 'resumen');
  assert.ok(res && /Resumen de la semana de El Paraíso/.test(res.texto) && /Alcance/.test(res.texto) && /87 clics/.test(res.texto), res && res.texto);
  paso('resumen semanal sin proveedor de correo → aviso dentro de la app con cifras reales');
  r = await pedir('POST', '/avisos/leidos', {}, dueno); r = await pedir('GET', '/avisos', undefined, dueno);
  assert.equal(r.j.sinLeer, 0);
  r = await pedir('GET', '/reglas', undefined, dueno);
  assert.ok(r.j.registro.length >= 3); paso('avisos marcados como leídos y registro de lo que hizo cada regla');

  // --- planes (lo que promete la portada) ---
  const { cuentaDe } = await import(path.join(__dirname, '..', 'conectores', 'suscripciones.js'));
  const A = await import(path.join(__dirname, '..', 'conectores', 'automatizaciones.js'));
  await pedir('POST', '/admin/negocios', { id: 'bar-basico', nombre: 'Bar Básico' }, null, { 'X-Chispa-Admin': s.env.ADMIN_CLAVE }).then(async (x) => { r = await pedir('POST', '/sesion', { negocio: 'bar-basico', codigo: x.j.codigo }); });
  const basico = r.j.sesion;
  s.db.run("INSERT INTO cuentas (negocio, plan, estado, prueba_hasta, creado, actualizado) VALUES ('bar-basico', 'basico', 'prueba', ?, ?, ?)", [Date.now() + 2.5 * 864e5, Date.now(), Date.now()]);
  r = await pedir('POST', '/anuncios', anuncio, basico);
  assert.equal(r.st, 402); assert.match(r.j.error, /Pro y Agencia/);
  r = await pedir('POST', '/reglas', { tipo: 'palabra_dm', config: { palabra: 'carta', redes: ['ig'] } }, basico);
  assert.equal(r.st, 402);
  r = await pedir('POST', '/reglas', { tipo: 'recordatorio', config: { hora: '10:00' } }, basico);
  assert.equal(r.st, 200);
  r = await pedir('GET', '/bandeja', undefined, basico);
  assert.equal(r.st, 200);
  await pedir('POST', '/bandeja/ejemplos', {}, basico);
  r = await pedir('POST', '/bandeja/ej:2/responder', { texto: 'hola' }, basico);
  assert.equal(r.st, 200); assert.equal(r.j.ejemplo, true);
  paso('plan Básico: sin anuncios ni respuestas automáticas (402 «Pro y Agencia»), sí recordatorios y leer la bandeja');
  s.db.run("UPDATE cuentas SET plan = 'pro' WHERE negocio = 'bar-basico'");
  r = await pedir('POST', '/anuncios', { ...anuncio, simular: true }, basico);
  assert.equal(r.st, 200); paso('al pasar a Pro, ya puede');
  await A.avisoPrueba(s.env, 'bar-basico', cuentaDe);
  await A.avisoPrueba(s.env, 'bar-basico', cuentaDe);
  r = await pedir('GET', '/avisos', undefined, basico);
  assert.equal(r.j.avisos.filter((a) => a.tipo === 'prueba').length, 1); assert.match(r.j.avisos.find((a) => a.tipo === 'prueba').titulo, /3 días|2 días/);
  r = await pedir('GET', '/admin/avisos', undefined, null, { 'X-Chispa-Admin': s.env.ADMIN_CLAVE });
  assert.ok(r.j.avisos.some((a) => a.negocio === 'bar-basico' && a.tipo === 'prueba'));
  r = await pedir('GET', '/admin/avisos', undefined, null, { 'X-Chispa-Admin': 'mala' });
  assert.equal(r.st, 401);
  paso('aviso «te quedan N días de prueba» (una vez por día) y el modo Solers lo ve en /admin/avisos');
  s.db.run("UPDATE cuentas SET prueba_hasta = ? WHERE negocio = 'bar-basico'", [Date.now() - 1000]);
  r = await pedir('POST', '/anuncios', { ...anuncio, simular: true }, basico);
  assert.equal(r.st, 402); paso('prueba terminada → no deja crear anuncios (402)');

  // --- un negocio no ve lo de otro ---
  r = await pedir('GET', '/bandeja/ig:c:k1', undefined, basico);
  assert.equal(r.st, 404); r = await pedir('GET', '/anuncios', undefined, basico);
  assert.ok(!r.j.anuncios.some((a) => a.id === idA)); paso('cada negocio ve solo lo suyo');
  r = await pedir('GET', '/bandeja', undefined, null, { Authorization: 'Bearer chispa_inventada' });
  assert.equal(r.st, 401); paso('una clave inventada no entra');

  console.log('\n' + ok + ' comprobaciones en verde');
  s.cerrar();
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
