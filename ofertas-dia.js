/* =====================================================================
   Chispa · 📅 TU PLAN DE OFERTAS (trabajador L, 07/10/2026)
   ---------------------------------------------------------------------
   Encargo de Stalin: «que en Chispa me salga la maqueta de cada día de lo
   que puedo poner de oferta: según el tiempo, el algoritmo y el día, me
   proponga: este día tal plato, este día tal bebida, este día tal oferta».

   Una MAQUETA POR DÍA (7 días, o 14) con: plato (o servicio / contenido
   según el sector), bebida (o extra / gancho), oferta, franja horaria, red
   y formato, el texto listo, una imagen propuesta (la IA solo al pulsar) y
   el «por qué» en una línea.

   Señales REALES y GRATIS (nada inventado):
     · Tiempo: Open-Meteo (sin clave), la ciudad de «Mi negocio»: máxima,
       probabilidad de lluvia, lluvia y viento de los próximos 16 días.
     · Festivos: Nager.Date (España + la comunidad del negocio). Si no
       responde, la lista de 2026 copiada de Nager.Date el 07/10/2026
       (nacionales + Baleares) y Sant Sebastià (fiesta local de Palma).
     · Fechas que se calculan solas: puentes, vísperas, principio de mes
       (nóminas), fin de mes, San Valentín, Día de la Madre, Halloween…
       Partidos y eventos NO: no hay una fuente gratuita fiable.
     · El día y sus horas: cerrado (horario de «Mi negocio»; El Paraíso,
       miércoles), horas flojas de la «Promo para llenar» del calendario.
     · Reglas de las redes: docs/CRECIMIENTO-ALGORITMOS.md (formato y hora
       por día, ritmo semanal).
     · Temporada turística (Baleares: alta de junio a septiembre).
     · Lo que ya funcionó: las estadísticas REALES del negocio (no las de
       ejemplo), cuando hay al menos 3 publicaciones medidas.
     · La CARTA: se importa del enlace de «Mi negocio» (ofertas-carta.js,
       también desde el servidor), se pega o se escribe. Nunca se inventa un
       precio: sin precio, el hueco «… €».

   Texto: la IA del servidor (POST /ofertas/textos, una sola llamada para
   todos los días, en el idioma del negocio); sin servidor, plantillas en
   es, en, de y fr. Plan: Básico 3 días, Pro y Agencia 14 (también en el
   servidor). Lo que no te gusta se guarda en S.ofertasDia, que el servidor
   sincroniza por negocio (ChispaSync, documento «principal»).
   Sin FileReader.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.S || !window.TABS) return;

  /* ---------------- utilidades ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return (s == null ? '' : '' + s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(m) { try { toast(m); } catch (e) {} }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function diaIso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function deIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function sumaDias(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function dow(d) { return (d.getDay() + 6) % 7; } // 0 = lunes
  function hm(min) { return pad(Math.floor(min / 60) % 24) + ':' + pad(min % 60); }
  function aMin(s) { var p = String(s || '').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  function sinT(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function azar(sem) { var a = hash(sem); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function uid() { return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function guardarS() { try { guardar(); } catch (e) {} }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function conTiempo(p, ms) { return Promise.race([p, new Promise(function (_, ko) { setTimeout(function () { ko(new Error('tiempo agotado')); }, ms); })]); }
  function json(url) { return conTiempo(fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }), 9000); }
  function sinPrecios(s) { return String(s || '').replace(/\d+(?:[.,]\d{1,2})?\s*€/g, '… €'); }
  var DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var RED = { igf: 'Instagram', igs: 'Historias', fb: 'Facebook', tt: 'TikTok', yt: 'YouTube Shorts', wa: 'Estado de WhatsApp', gbp: 'Google' };
  var FMT = { reel: 'Reel', carrusel: 'Carrusel', post: 'Publicación', historia: 'Historias' };

  function sync() { return window.ChispaSync; }
  function conServidor() { var s = sync(); if (!s || !s.estado || !s.pedir) return false; var e = s.estado(); return e.modo === 'servidor' && !e.pausado; }
  function perfil() { try { return ChispaSector.actual(); } catch (e) { return { id: 'restaurante', nombre: 'Restaurante y bar', hashtags: ['#restaurante', '#Palma'], horas: { mejores: [], franjas: [] }, cta: { texto: 'Reservar mesa', frase: 'Reserva tu mesa' }, idioma: { base: 'es', nombre: 'Español' } }; } }
  function lang() { var b = ((perfil().idioma || {}).base || 'es'); return b; }
  function N() { return S.negocio || {}; }
  function neg() { return (N().nombre || 'tu negocio').replace(/\s+(bar\s+restaurante|restaurante)$/i, ''); }
  function esComida() { var id = perfil().id; return id === 'restaurante' || id === 'cafeteria'; }

  /* ---------------- estado propio (viaja con S al servidor) ---------------- */
  function D() {
    if (!S.ofertasDia || S.ofertasDia.v !== 1) S.ofertasDia = { v: 1, carta: [], cartaFuente: '', cartaUrl: '', nomegusta: {}, usadas: {}, cambios: {}, textos: {}, semillas: {}, abiertos: {}, medias: {}, vista: 7 };
    var d = S.ofertasDia; ['nomegusta', 'usadas', 'cambios', 'textos', 'semillas', 'abiertos', 'medias'].forEach(function (k) { if (!d[k]) d[k] = {}; });
    return d;
  }
  function limpiarViejo() { // lo de días pasados no hace falta guardarlo
    var d = D(), hoy = diaIso(new Date());
    ['cambios', 'semillas', 'abiertos', 'medias', 'usadas'].forEach(function (k) { Object.keys(d[k]).forEach(function (f) { if (f < hoy) delete d[k][f]; }); });
    Object.keys(d.textos).forEach(function (k) { if (k.slice(0, 10) < hoy) delete d.textos[k]; });
  }

  /* ---------------- etiquetas por sector ---------------- */
  var LBL = {
    restaurante: { a: '🍽️ Plato', b: '🥤 Bebida', c: '🔥 Oferta', item: 'plato', item2: 'bebida' },
    cafeteria: { a: '🥐 Del mostrador', b: '☕ Bebida', c: '🔥 Oferta', item: 'producto', item2: 'bebida' },
    peluqueria: { a: '✂️ Servicio del día', b: '✨ Extra', c: '🔥 Oferta', item: 'servicio', item2: 'extra' },
    estetica: { a: '💅 Servicio del día', b: '✨ Extra', c: '🔥 Oferta', item: 'servicio', item2: 'extra' },
    gimnasio: { a: '🏋️ Clase o servicio', b: '✨ Extra', c: '🔥 Oferta', item: 'clase', item2: 'extra' },
    tienda: { a: '🛍️ Producto del día', b: '🎁 Complemento', c: '🔥 Oferta', item: 'producto', item2: 'complemento' },
    talleres: { a: '🔧 Servicio del día', b: '✨ Extra', c: '🔥 Oferta', item: 'servicio', item2: 'extra' },
    creador: { a: '🎬 Contenido del día', b: '🪝 Gancho', c: '📣 Llamada a la acción', item: 'contenido', item2: 'gancho' }
  };
  function L() { return LBL[perfil().id] || LBL.restaurante; }
  var EXTRAS = {
    peluqueria: ['Tratamiento de hidratación', 'Arreglo de barba', 'Peinado para salir', 'Mascarilla para el color'],
    estetica: ['Diseño de cejas', 'Mascarilla facial', 'Esmaltado de pies', 'Tinte de pestañas'],
    gimnasio: ['Clase de prueba', 'Valoración física', 'Entreno en pareja', 'Rutina para casa'],
    tienda: ['Complemento a juego', 'Envoltorio de regalo', 'Tarjeta regalo', 'Arreglo de bajos'],
    talleres: ['Presupuesto en 24 h', 'Revisión de mantenimiento', 'Revisión de seguridad', 'Visita sin compromiso'],
    creador: ['Gancho: «el error que todos cometen»', 'Antes y después', 'Tutorial en 30 segundos', 'Detrás de cámaras', 'Pregunta a tu audiencia']
  };

  /* =====================================================================
     SEÑALES
     ===================================================================== */
  var SEN = { tiempo: null, tiempoFuente: '', tiempoCiudad: '', festivos: null, festivosFuente: '', plan: null, cargando: false, cargado: false };
  var COORDS = { 'palma': [39.5696, 2.6502, 'Palma'], 'palma de mallorca': [39.5696, 2.6502, 'Palma'] };
  function ciudad() { return String(N().ciudad || 'Palma de Mallorca').split(',')[0].trim(); }
  function regionDe(c) {
    c = sinT(c);
    if (/palma|mallorca|ibiza|eivissa|menorca|formentera|manacor|inca|calvia|llucmajor|alcudia|soller|balear/.test(c)) return 'ES-IB';
    if (/madrid|alcala de henares|getafe|mostoles/.test(c)) return 'ES-MD';
    if (/barcelona|girona|lleida|tarragona|catalu|sabadell|terrassa|badalona/.test(c)) return 'ES-CT';
    if (/valencia|alicante|castellon|elche|benidorm/.test(c)) return 'ES-VC';
    if (/sevilla|malaga|granada|cordoba|cadiz|almeria|huelva|jaen|marbella|andaluc/.test(c)) return 'ES-AN';
    if (/bilbao|donostia|san sebastian|vitoria|euskadi/.test(c)) return 'ES-PV';
    if (/zaragoza|huesca|teruel/.test(c)) return 'ES-AR';
    if (/canaria|tenerife|las palmas|lanzarote|fuerteventura/.test(c)) return 'ES-CN';
    if (/coruna|vigo|santiago de compostela|ourense|lugo|pontevedra/.test(c)) return 'ES-GA';
    if (/murcia|cartagena/.test(c)) return 'ES-MC';
    if (/oviedo|gijon|asturias/.test(c)) return 'ES-AS';
    if (/santander|cantabria/.test(c)) return 'ES-CB';
    if (/pamplona|navarra/.test(c)) return 'ES-NC';
    if (/logrono|rioja/.test(c)) return 'ES-RI';
    if (/valladolid|burgos|leon|salamanca|segovia|soria|avila|zamora|palencia/.test(c)) return 'ES-CL';
    if (/toledo|albacete|ciudad real|cuenca|guadalajara/.test(c)) return 'ES-CM';
    if (/badajoz|caceres|merida/.test(c)) return 'ES-EX';
    return null;
  }
  /* festivos 2026 copiados de Nager.Date el 07/10/2026 (por si la API no responde) */
  var RESERVA_2026 = [
    ['2026-01-01', 'Año Nuevo'], ['2026-01-06', 'Día de Reyes'], ['2026-03-01', 'Dia de les Illes Balears', 'ES-IB'],
    ['2026-04-02', 'Jueves Santo', 'ES-IB'], ['2026-04-03', 'Viernes Santo'], ['2026-04-06', 'Lunes de Pascua', 'ES-IB'],
    ['2026-05-01', 'Fiesta del Trabajo'], ['2026-08-15', 'Asunción'], ['2026-10-12', 'Fiesta Nacional de España'],
    ['2026-11-01', 'Todos los Santos'], ['2026-12-06', 'Día de la Constitución'], ['2026-12-08', 'Inmaculada Concepción'], ['2026-12-25', 'Navidad']
  ];
  function localesDe(c, anio) { return /palma/.test(sinT(c)) ? [[anio + '-01-20', 'Sant Sebastià (fiesta local de Palma)']] : []; }

  function cargarTiempo() {
    var c = ciudad(), clave = sinT(c), cache = ls('chispa_ofertas_tiempo');
    if (cache && cache.clave === clave && Date.now() - cache.t < 3 * 3600e3) { SEN.tiempo = cache.dias; SEN.tiempoCiudad = cache.nombre; SEN.tiempoFuente = 'Open-Meteo'; return Promise.resolve(); }
    var co = COORDS[clave] ? Promise.resolve(COORDS[clave]) : json('https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&format=json&name=' + encodeURIComponent(c))
      .then(function (j) { var r = j && j.results && j.results[0]; if (!r) throw new Error('ciudad no encontrada'); return [r.latitude, r.longitude, r.name]; });
    return co.then(function (x) {
      return json('https://api.open-meteo.com/v1/forecast?latitude=' + x[0] + '&longitude=' + x[1] + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=16')
        .then(function (j) {
          var d = j.daily || {}, out = {};
          (d.time || []).forEach(function (f, i) { out[f] = { code: d.weather_code[i], tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i], prob: d.precipitation_probability_max[i], mm: d.precipitation_sum[i], viento: d.wind_speed_10m_max[i] }; });
          SEN.tiempo = out; SEN.tiempoCiudad = x[2]; SEN.tiempoFuente = 'Open-Meteo';
          ls('chispa_ofertas_tiempo', { clave: clave, t: Date.now(), dias: out, nombre: x[2] });
        });
    }).catch(function () { SEN.tiempo = null; SEN.tiempoFuente = ''; });
  }
  function cargarFestivos() {
    var hoy = new Date(), anios = [hoy.getFullYear()], fin = sumaDias(hoy, 15), reg = regionDe(ciudad()), c = ciudad();
    if (fin.getFullYear() !== hoy.getFullYear()) anios.push(fin.getFullYear());
    var clave = anios.join(',') + '|' + reg + '|' + sinT(c), cache = ls('chispa_ofertas_festivos');
    function poner(lista, fuente) {
      var out = {};
      lista.forEach(function (h) { if (h.global || !h.counties || (reg && h.counties.indexOf(reg) >= 0)) out[h.date] = { nombre: h.localName || h.name, ambito: h.global || !h.counties ? 'nacional' : 'autonómico' }; });
      anios.forEach(function (a) { localesDe(c, a).forEach(function (x) { if (!out[x[0]]) out[x[0]] = { nombre: x[1], ambito: 'local' }; }); });
      SEN.festivos = out; SEN.festivosFuente = fuente;
    }
    if (cache && cache.clave === clave && Date.now() - cache.t < 24 * 3600e3) { poner(cache.lista, 'Nager.Date'); return Promise.resolve(); }
    return Promise.all(anios.map(function (a) { return json('https://date.nager.at/api/v3/PublicHolidays/' + a + '/ES'); }))
      .then(function (rs) { var lista = [].concat.apply([], rs); ls('chispa_ofertas_festivos', { clave: clave, t: Date.now(), lista: lista }); poner(lista, 'Nager.Date'); })
      .catch(function () {
        poner(RESERVA_2026.map(function (x) { return { date: x[0], localName: x[1], global: !x[2], counties: x[2] ? [x[2]] : null }; }), 'lista oficial 2026 incluida (Nager.Date no respondió)');
      });
  }
  function cargarPlan() {
    if (!conServidor()) { SEN.plan = { plan: 'demostracion', diasMax: 14 }; return Promise.resolve(); }
    return sync().pedir('GET', '/ofertas/plan').then(function (j) { SEN.plan = j; }, function () { SEN.plan = { plan: '?', diasMax: 3 }; });
  }
  function cargar() {
    if (SEN.cargando) return SEN.cargando;
    SEN.cargando = Promise.all([cargarTiempo(), cargarFestivos(), cargarPlan()]).then(function () { SEN.cargado = true; SEN.cargando = false; repintar(); pedirTextos(); }, function () { SEN.cargado = true; SEN.cargando = false; repintar(); });
    return SEN.cargando;
  }

  /* ---------------- el tiempo de un día ---------------- */
  function icono(code) { return code === 0 ? '☀️' : code <= 2 ? '🌤️' : code === 3 ? '☁️' : code === 45 || code === 48 ? '🌫️' : code <= 57 ? '🌦️' : code <= 67 ? '🌧️' : code <= 77 ? '🌨️' : code <= 82 ? '🌧️' : '⛈️'; }
  function clima(f) {
    var t = SEN.tiempo && SEN.tiempo[f]; if (!t || t.tmax == null) return null;
    var lluvia = (t.prob != null && t.prob >= 60) || (t.mm != null && t.mm >= 2) || (t.code >= 61 && t.code <= 67) || (t.code >= 80);
    return { tmax: Math.round(t.tmax), tmin: Math.round(t.tmin), prob: t.prob, mm: t.mm, lluvia: lluvia, calor: t.tmax >= 28, templado: t.tmax >= 22 && t.tmax < 28, fresco: t.tmax < 17, viento: t.viento != null && t.viento >= 35, vientoKm: Math.round(t.viento || 0), icono: icono(t.code) };
  }

  /* ---------------- fechas especiales (se calculan; nada inventado) ---------------- */
  function primerDomingoMayo(a) { var d = new Date(a, 4, 1); while (d.getDay() !== 0) d.setDate(d.getDate() + 1); return diaIso(d); }
  function blackFriday(a) { var d = new Date(a, 10, 1), n = 0; while (true) { if (d.getDay() === 4) { n++; if (n === 4) break; } d.setDate(d.getDate() + 1); } d.setDate(d.getDate() + 1); return diaIso(d); }
  function festivo(f) { return SEN.festivos && SEN.festivos[f] || null; }
  function especiales(d) {
    var f = diaIso(d), a = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate(), out = [], reg = regionDe(ciudad());
    var fijas = { '02-14': 'San Valentín', '03-19': 'Día del Padre', '10-31': 'Halloween', '12-24': 'Nochebuena', '12-31': 'Nochevieja', '01-05': 'Noche de Reyes' };
    if (reg === 'ES-IB' || reg === 'ES-CT' || reg === 'ES-VC') fijas['06-23'] = 'Nit de Sant Joan';
    var k = pad(m) + '-' + pad(dd);
    if (fijas[k]) out.push({ k: 'fecha', t: fijas[k], por: fijas[k] });
    if (f === primerDomingoMayo(a)) out.push({ k: 'fecha', t: 'Día de la Madre', por: 'Día de la Madre' });
    if (f === blackFriday(a)) out.push({ k: 'fecha', t: 'Black Friday', por: 'Black Friday' });
    var fe = festivo(f), man = festivo(diaIso(sumaDias(d, 1))), w = dow(d);
    if (!fe && man) out.push({ k: 'vispera', t: 'Víspera de ' + man.nombre, por: 'mañana es festivo (' + man.nombre + '): la noche se alarga' });
    // puente: festivo en lunes o viernes (y el fin de semana pegado)
    for (var i = -2; i <= 2; i++) {
      if (i === 0) continue;
      var o = sumaDias(d, i), fo = festivo(diaIso(o));
      if (fo && !fe && (w === 5 || w === 6) && ((dow(o) === 0 && i > 0) || (dow(o) === 4 && i < 0))) { out.push({ k: 'puente', t: 'Puente de ' + fo.nombre, por: 'puente (' + fo.nombre + '): más gente con tiempo libre' }); break; }
    }
    if (dd <= 5) out.push({ k: 'nomina', t: 'Principio de mes', por: 'principio de mes: mucha gente acaba de cobrar la nómina' });
    else if (dd >= 26) out.push({ k: 'finmes', t: 'Fin de mes', por: 'fin de mes: la gente mira más el bolsillo' });
    return out;
  }
  function temporada(d) {
    var m = d.getMonth() + 1, ib = regionDe(ciudad()) === 'ES-IB';
    if (!ib) return null;
    if (m >= 6 && m <= 9) return { k: 'alta', t: 'Temporada alta', por: 'temporada alta en Mallorca: muchos turistas (pon también el texto en inglés o alemán)' };
    if (m === 5 || m === 10) return { k: 'media', t: m === 10 ? 'Final de temporada' : 'Empieza la temporada', por: m === 10 ? 'final de temporada: quedan turistas y vuelve la gente de aquí' : 'empieza la temporada: llegan los primeros turistas' };
    return { k: 'baja', t: 'Temporada baja', por: 'temporada baja: la clientela es sobre todo de aquí' };
  }

  /* ---------------- día cerrado y franja ---------------- */
  function cerrado(d) {
    var f = diaIso(d); if (D().abiertos[f]) return false;
    var n = N(), k = dow(d);
    if (n.horario && n.horario.length === 7) return !!(n.horario[k] && n.horario[k].cerrado);
    return /para[ií]so/i.test(n.nombre || '') && k === 2; // El Paraíso cierra los miércoles
  }
  function franjaDe(d) {
    var k = dow(d), P = perfil(), A = window.CHISPA_AGENDA;
    if (P.id === 'restaurante' && A && A.horasValle && A.horasValle[k]) {
      var v = A.horasValle[k];
      return { a: v[0] * 60 + v[1], b: v[2] * 60 + v[3], por: k >= 4 ? 'la tarde, entre la comida y la cena, es lo flojo del ' + DIAS[k] : 'la tarde del ' + DIAS[k] + ' es floja: la promo llena antes de la cena', tipo: 'valle' };
    }
    var fr = ((P.horas && P.horas.franjas) || []).filter(function (x) { return x.dias && x.dias.indexOf(k) >= 0; });
    var promo = fr.filter(function (x) { return x.tipo === 'promo'; })[0], lleno = fr.filter(function (x) { return x.tipo === 'lleno'; })[0];
    if (promo) return { a: aMin(promo.desde), b: aMin(promo.hasta), por: 'franja «' + promo.nombre + '»', tipo: 'promo' };
    if (lleno) return { a: aMin(lleno.desde), b: aMin(lleno.hasta), por: 'el ' + DIAS[k] + ' se llena solo: enseña el trabajo, sin descuento', tipo: 'lleno' };
    return { a: 17 * 60, b: 20 * 60, por: 'a última hora de la tarde se decide el plan', tipo: 'tarde' };
  }

  /* ---------------- reglas de las redes (docs/CRECIMIENTO-ALGORITMOS.md §9) ---------------- */
  var RITMO_COMIDA = [
    { f: 'carrusel', redes: ['igf', 'fb'], h: '12:30', por: 'los lunes, carrusel (es lo que más se guarda) a la hora de decidir dónde comer' },
    { f: 'carrusel', redes: ['igf', 'fb'], h: '21:00', por: 'martes: carrusel a las 21:00, cuando más se mira Instagram' },
    { f: 'reel', redes: ['igf', 'tt'], h: '20:00', por: 'reel a las 20:00: TikTok rinde de 20:00 a 22:00' },
    { f: 'reel', redes: ['igf', 'tt'], h: '19:30', por: 'de jueves a domingo los reels llegan a más gente' },
    { f: 'reel', redes: ['igf', 'tt'], h: '19:30', por: 'viernes: reel a la hora de decidir el plan de la noche' },
    { f: 'reel', redes: ['igf', 'tt'], h: '12:30', por: 'sábado: reel a mediodía, cuando se decide dónde comer' },
    { f: 'reel', redes: ['igf', 'tt', 'yt'], h: '19:30', por: 'domingo: reel (y Shorts, que rinden el fin de semana)' }
  ];
  function redesDe(f) { return f === 'reel' ? ['igf', 'tt'] : f === 'historia' ? ['igs', 'wa'] : ['igf', 'fb']; }
  function ritmo(d) {
    var k = dow(d), r;
    if (esComida()) r = Object.assign({}, RITMO_COMIDA[k]);
    else {
      var h = [];
      try { h = ChispaSector.horasDe(k); } catch (e) {}
      var x = h.filter(function (y) { return y.formato === 'reel'; })[0] || h.filter(function (y) { return y.formato !== 'historia'; })[0] || h[0];
      var f = x ? (x.formato === 'historia' ? 'post' : x.formato) : (k >= 3 ? 'reel' : 'carrusel');
      r = { f: f, redes: redesDe(f), h: (x && x.hora) || (f === 'reel' ? '20:00' : '12:30'), por: (x && x.por) ? x.por.replace(/\.$/, '') : 'la mejor hora de tu sector' };
    }
    var ap = aprendido();
    if (ap && k <= 1 && ap.formato !== r.f && (ap.formato === 'reel' || ap.formato === 'carrusel' || ap.formato === 'post')) { r.f = ap.formato; r.redes = redesDe(ap.formato); r.por = 'en tus estadísticas, ' + (FMT[ap.formato] || ap.formato).toLowerCase() + ' es lo que mejor te funciona'; }
    return r;
  }
  /* lo que ya funcionó: SOLO datos reales (no los de ejemplo) */
  function aprendido() {
    var M = (S.metricas || []).filter(function (m) { return m && m.fuente && m.fuente !== 'ejemplo' && m.alcance; });
    if (M.length < 3) return null;
    var g = {};
    M.forEach(function (m) { var t = (m.megusta || 0) + (m.comentarios || 0) + (m.guardados || 0) + (m.compartidos || 0); var x = g[m.formato] = g[m.formato] || { n: 0, r: 0 }; x.n++; x.r += t / m.alcance; });
    var mejor = null; Object.keys(g).forEach(function (f) { var x = g[f]; x.m = x.r / x.n; if (x.n >= 2 && (!mejor || x.m > g[mejor].m)) mejor = f; });
    return mejor ? { formato: mejor, n: M.length } : null;
  }

  /* =====================================================================
     LA CARTA Y LO QUE SE PUEDE PROPONER
     ===================================================================== */
  var RE = {
    cuchara: /sopa|caldo|guiso|potaje|crema de|lentej|cocido|sancocho|asopao|caldoso|brut|fideu|estofad|chile con/,
    arroz: /paella|arroz(?! blanco)|risotto|fideu/,
    fresco: /ensalad|ceviche|tartar|carpaccio|gazpacho|salmorejo|poke|aguacate|fruta|bowl/,
    parrilla: /parrilla|brasa|chulet|entrecot|churrasco|costilla|angus|solomillo|barbacoa|bbq/,
    pescado: /pescad|dorada|lubina|salm|marisc|pulpo|gamba|calamar|bogavante|mejill|bacalao|atun/,
    caribe: /caribe|picalonga|picapollo|mofongo|toston|yuca|platano|mangu|chicharr|yonge/,
    compartir: /nacho|croquet|tabla|compartir|alitas|tapas|bravas|picalonga|picapollo|\b2p\b|racion|surtido/,
    rapido: /hamburgues|pizza|bocad|sandwich|wrap|perrito|kebab/,
    desayuno: /desayun|tostad|croissant|bolleri|yonge|ensaimad|churro/,
    postre: /tarta|postre|helado|flan|brownie|coulant|tiramis|natilla|cheesecake|crema catalana/,
    relleno: /^a elegir|^oferta |arroz blanco|patatas fritas|^pan\b|guarnici/
  };
  var RB = {
    frio: /cerveza|ca[nñ]a|mojito|c[oó]ctel|coctel|limonada|granizad|sangr|tinto de verano|smoothie|batido|horchata|spritz|gin|pi[nñ]a colada|daiquir|zumo|morir so|cava|vermut|refresco|caipiri|margarita/,
    caliente: /caf[eé]|chocolate|t[eé]\b|infusi|carajillo|capuch|cortado|latte/,
    vino: /vino|tinto|rioja|ribera|crianza|rosado|blanco|copa/,
    coctel: /mojito|c[oó]ctel|coctel|spritz|gin|daiquir|pi[nñ]a colada|caipiri|margarita|mamajuana/
  };
  function tags(nombre, cat) { var s = sinT(nombre + ' ' + (cat || '')), t = {}; for (var k in RE) if (RE[k].test(s)) t[k] = 1; return t; }
  function tagsB(nombre) { var s = sinT(nombre), t = {}; for (var k in RB) if (RB[k].test(s)) t[k] = 1; return t; }

  var BEBIDAS_SIN_CARTA = {
    calor: ['Mojito', 'Tinto de verano', 'Limonada casera', 'Cerveza bien fría', 'Sangría'],
    templado: ['Copa de vino', 'Sangría', 'Cóctel de la casa', 'Cerveza artesana', 'Vermut'],
    frio: ['Chocolate caliente', 'Café con licor', 'Copa de vino tinto', 'Infusión de la casa']
  };
  var PLATOS_SIN_CARTA = {
    restaurante: ['Paella', 'Arroz caldoso', 'Plato de cuchara de la casa', 'Ensalada fresca', 'Pescado del día', 'Carne a la brasa', 'Tapas para compartir', 'Menú del día', 'Hamburguesa de la casa'],
    cafeteria: null
  };
  function cartaPropia() { return (D().carta || []).filter(function (x) { return x && x.nombre; }); }
  /* candidatos para la casilla A (plato / servicio / contenido) y B (bebida / extra / gancho) */
  function candidatos() {
    var P = perfil(), c = cartaPropia(), A = [], B = [];
    if (c.length) {
      c.forEach(function (x) { (x.tipo === 'bebida' ? B : A).push({ nombre: x.nombre, precio: x.precio || '', categoria: x.categoria || '', deCarta: true }); });
    }
    if (!A.length) {
      var lista = (PLATOS_SIN_CARTA[P.id]) || P.ideas || PLATOS_SIN_CARTA.restaurante;
      A = lista.map(function (n) { return { nombre: sinPrecios(n), precio: '', categoria: '', deCarta: false }; });
    }
    if (!B.length) {
      if (esComida()) B = null; // se elige por el tiempo (BEBIDAS_SIN_CARTA)
      else B = (EXTRAS[P.id] || EXTRAS.peluqueria).map(function (n) { return { nombre: n, precio: '', deCarta: false }; });
    }
    return { A: A, B: B };
  }
  function postreDeCarta() { var p = cartaPropia().filter(function (x) { return x.tipo !== 'bebida' && RE.postre.test(sinT(x.nombre + ' ' + x.categoria)); }); return p[0] || null; }

  /* =====================================================================
     EL MOTOR: una propuesta por día
     ===================================================================== */
  function contexto(d) {
    var f = diaIso(d);
    return { d: d, f: f, k: dow(d), clima: clima(f), festivo: festivo(f), esp: especiales(d), temp: temporada(d), cerrado: cerrado(d), franja: franjaDe(d), ritmo: ritmo(d) };
  }
  function tiene(cx, k) { return cx.esp.some(function (e) { return e.k === k; }); }
  function votos(tipo, nombre) { return D().nomegusta[tipo + ':' + sinT(nombre)] || 0; }
  function puntuaA(x, cx, r, usados) {
    var t = tags(x.nombre, x.categoria), s = r() * 2.2, c = cx.clima, finde = cx.k >= 4 || cx.festivo || tiene(cx, 'puente');
    if (votos('a', x.nombre)) return -999;
    if (t.relleno) s -= 6;
    if (t.postre) s -= 5;
    if (t.desayuno && perfil().id !== 'cafeteria') s -= 3;
    if (c) {
      if (c.calor) { s += (t.fresco ? 3 : 0) + (t.pescado ? 2 : 0) - (t.cuchara ? 4 : 0); }
      if (c.templado) { s += (t.parrilla ? 1 : 0) + (t.compartir ? 1 : 0) + (t.pescado ? 1 : 0); }
      if (c.fresco || c.lluvia) { s += (t.cuchara ? 3 : 0) + (t.arroz ? 1.5 : 0) + (t.parrilla ? 1 : 0) - (t.fresco ? 2 : 0); }
      if (c.lluvia) s += (t.rapido ? 2 : 0) + (t.caribe ? 0.5 : 0);
    }
    if (finde) s += (t.arroz ? 2.5 : 0) + (t.compartir ? 2 : 0) + (t.caribe ? 1 : 0);
    else s += (t.rapido ? 0.8 : 0);
    if (cx.k === 6) s += t.arroz ? 1.5 : 0;
    var pn = window.ChispaCarta ? ChispaCarta.precioNumero(x.precio) : null;
    if (tiene(cx, 'nomina') && pn && pn >= 18) s += 1.5;
    if (tiene(cx, 'finmes') && pn && pn <= 12) s += 1.5;
    if (usados[sinT(x.nombre)]) s -= 4;
    return s;
  }
  function puntuaB(x, cx, r) {
    var t = tagsB(x.nombre), s = r() * 2, c = cx.clima;
    if (votos('b', x.nombre)) return -999;
    if (c) { if (c.calor) s += (t.frio ? 3 : 0) - (t.caliente ? 3 : 0); if (c.fresco || c.lluvia) s += (t.caliente ? 3 : 0) + (t.vino ? 1 : 0) - (t.frio ? 1.5 : 0); }
    if (cx.k >= 4 || cx.festivo) s += t.coctel ? 1.5 : 0;
    return s;
  }
  function elegir(lista, pf) { var mejor = null, ms = -1e9; lista.forEach(function (x) { var p = pf(x); if (p > ms) { ms = p; mejor = x; } }); return ms <= -999 ? null : mejor; }
  function ordenar(lista, pf) { return lista.map(function (x) { return { x: x, p: pf(x) }; }).filter(function (o) { return o.p > -999; }).sort(function (a, b) { return b.p - a.p; }).map(function (o) { return o.x; }); }

  var OFERTAS_COMIDA = {
    combo: '{a} + {b} por … €',
    dosxuno: '2x1 en {b} de {fr}',
    postre: '{a} con {postre} de regalo',
    compartir: 'Para compartir: {a} y 2 {b} por … €',
    llevar: 'Día de lluvia: {a} también para llevar',
    happy: 'Happy hour de {fr}: {b} a … €',
    capricho: 'Date un capricho: {a}',
    finmes: 'Fin de mes: {a} + {b} a precio cerrado (… €)',
    festivo: '{fest}: {a} para compartir y {b}'
  };
  function ofertasPosibles(cx) {
    var o = [];
    if (cx.clima && cx.clima.lluvia) o.push('llevar');
    if (cx.festivo || tiene(cx, 'puente') || tiene(cx, 'vispera') || tiene(cx, 'fecha')) o.push('festivo');
    if (tiene(cx, 'nomina')) o.push('capricho');
    if (tiene(cx, 'finmes')) o.push('finmes');
    if (cx.k >= 4) o.push('compartir');
    if (cx.franja.tipo === 'valle') o.push('dosxuno', 'happy');
    o.push('combo');
    if (postreDeCarta()) o.push('postre');
    return o.filter(function (k, i) { return o.indexOf(k) === i && !votos('c', k); });
  }
  var OFERTAS_T = {
    en: { combo: '{a} + {b} for … €', dosxuno: '2-for-1 {b} from {fr}', postre: '{a} with a free {postre}', compartir: 'To share: {a} and 2 {b} for … €', llevar: 'Rainy day: {a} also to take away', happy: 'Happy hour {fr}: {b} at … €', capricho: 'Treat yourself: {a}', finmes: 'End of month: {a} + {b} at a set price (… €)', festivo: '{fest}: {a} to share and {b}', y: ' to ', fpostre: 'dessert' },
    de: { combo: '{a} + {b} für … €', dosxuno: '2 für 1: {b} von {fr}', postre: '{a} mit {postre} gratis', compartir: 'Zum Teilen: {a} und 2 {b} für … €', llevar: 'Regentag: {a} auch zum Mitnehmen', happy: 'Happy Hour {fr}: {b} für … €', capricho: 'Gönn dir: {a}', finmes: 'Monatsende: {a} + {b} zum Festpreis (… €)', festivo: '{fest}: {a} zum Teilen und {b}', y: ' bis ', fpostre: 'Dessert' },
    fr: { combo: '{a} + {b} pour … €', dosxuno: '2 pour 1 sur {b} de {fr}', postre: '{a} avec {postre} offert', compartir: 'À partager : {a} et 2 {b} pour … €', llevar: 'Jour de pluie : {a} aussi à emporter', happy: 'Happy hour {fr} : {b} à … €', capricho: 'Fais-toi plaisir : {a}', finmes: 'Fin du mois : {a} + {b} à prix fixe (… €)', festivo: '{fest} : {a} à partager et {b}', y: ' à ', fpostre: 'le dessert' }
  };
  function textoOferta(clave, a, b, cx, lc) {
    var T2 = lc && OFERTAS_T[lc], pos = postreDeCarta();
    var fr = hm(cx.franja.a) + (T2 ? T2.y : ' a ') + hm(cx.franja.b);
    var fest = (cx.festivo && cx.festivo.nombre) || (cx.esp.filter(function (e) { return e.k === 'puente' || e.k === 'fecha' || e.k === 'vispera'; })[0] || {}).t || 'Hoy';
    var base = T2 ? (T2[clave] || T2.combo) : (OFERTAS_COMIDA[clave] || OFERTAS_COMIDA.combo);
    return base.replace('{a}', a).replace('{b}', String(b).toLowerCase()).replace('{fr}', fr).replace('{postre}', pos ? pos.nombre.toLowerCase() : (T2 ? T2.fpostre : 'el postre')).replace('{fest}', fest);
  }

  function propuesta(f) {
    var d = deIso(f), cx = contexto(d), o = D(), sem = o.semillas[f] || 0, r = azar(f + '|' + sem + '|' + (N().nombre || '')), P = perfil(), lb = L();
    var p = { fecha: f, d: d, cx: cx, cerrado: cx.cerrado, lbl: lb };
    if (cx.cerrado) return p;
    var cand = candidatos(), usados = {};
    // no repetir lo de los 2 días anteriores
    for (var i = 1; i <= 2; i++) { var ant = PROPS[diaIso(sumaDias(d, -i))]; if (ant && ant.a) usados[sinT(ant.a.nombre)] = 1; }
    var ch = o.cambios[f] || {};
    var a = ch.a ? { nombre: ch.a, precio: ch.aPrecio || precioDe(ch.a), deCarta: !!precioDe(ch.a) } : elegir(cand.A, function (x) { return puntuaA(x, cx, r, usados); }) || cand.A[0];
    var b;
    if (ch.b) b = { nombre: ch.b, precio: precioDe(ch.b), deCarta: !!precioDe(ch.b) };
    else if (cand.B) b = elegir(cand.B, function (x) { return puntuaB(x, cx, r); }) || cand.B[0];
    else {
      var c = cx.clima, lista = c && c.calor ? BEBIDAS_SIN_CARTA.calor : c && (c.fresco || c.lluvia) ? BEBIDAS_SIN_CARTA.frio : BEBIDAS_SIN_CARTA.templado;
      lista = lista.filter(function (n) { return !votos('b', n); }); if (!lista.length) lista = BEBIDAS_SIN_CARTA.templado;
      b = { nombre: lista[Math.floor(r() * lista.length)], precio: '', deCarta: false, sugerida: true };
    }
    p.a = a; p.b = b;
    // oferta
    var ofKey, ofTxt;
    if (esComida()) {
      var pos = ofertasPosibles(cx);
      ofKey = ch.c || pos[Math.floor(r() * Math.min(pos.length, 2.999))] || 'combo';
      ofTxt = textoOferta(ofKey, a.nombre, b.nombre, cx);
    } else {
      var lista2 = (P.ofertas || []).map(sinPrecios).filter(function (x) { return !votos('c', x); });
      if (cx.franja.tipo === 'lleno') lista2 = ['Sin descuento: enseña el trabajo de hoy y los huecos que queden'];
      if (!lista2.length) lista2 = ['Huecos libres hoy de ' + hm(cx.franja.a) + ' a ' + hm(cx.franja.b)];
      ofTxt = ch.c || lista2[Math.floor(r() * lista2.length)]; ofKey = ofTxt;
    }
    p.ofKey = ofKey; p.oferta = ofTxt;
    p.franja = cx.franja;
    p.ritmo = cx.ritmo;
    p.porque = porque(p, cx);
    p.titulo = esComida() ? a.nombre : a.nombre;
    p.tags = hashtags(a.nombre);
    p.clave = f + '|' + sinT(a.nombre) + '|' + sinT(b.nombre) + '|' + sinT(ofKey) + '|' + lang();
    var tx = o.textos[p.clave];
    p.texto = tx ? tx.texto : plantilla(p, cx);
    p.textoIA = !!tx;
    if (tx && tx.hashtags && tx.hashtags.length) p.tags = tx.hashtags.join(' ');
    return p;
  }
  function precioDe(nombre) { var x = cartaPropia().filter(function (y) { return sinT(y.nombre) === sinT(nombre); })[0]; return x ? x.precio || '' : ''; }
  function hashtags(a) {
    var P = perfil(), h = (P.hashtags || []).slice(0, 3), w = sinT(a).replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(function (x) { return x.length > 3; })[0];
    if (w) h.unshift('#' + w);
    return h.filter(function (x, i) { return h.indexOf(x) === i; }).join(' ');
  }
  function porque(p, cx) {
    var r = [], c = cx.clima;
    if (cx.festivo) r.push(cx.festivo.nombre + ' (festivo ' + cx.festivo.ambito + ')');
    cx.esp.forEach(function (e) { if (e.k === 'puente' || e.k === 'vispera' || e.k === 'fecha') r.push(e.por); });
    if (c) {
      if (c.lluvia) r.push('lluvia (' + (c.prob != null ? c.prob + ' %' : '') + '): ' + (esComida() ? 'plato de cuchara, para llevar y a domicilio; publica pronto, se decide desde casa' : 'la gente organiza desde casa: buen día para pedir cita online'));
      else if (c.calor) r.push(c.tmax + ' °C: ' + (esComida() ? 'cócteles fríos y terraza' : 'publica a última hora, con el fresco'));
      else if (c.fresco) r.push(c.tmax + ' °C: ' + (esComida() ? 'apetece plato caliente' : 'la gente sale menos: recuerda que se reserva online'));
      if (c.viento) r.push('viento de ' + c.vientoKm + ' km/h: ' + (esComida() ? 'vende el interior, no la terraza' : 'mejor fotos de interior'));
    }
    if (!r.length || r.length < 2) r.push(cx.franja.por);
    if (r.length < 3) r.push(cx.ritmo.por);
    var nom = cx.esp.filter(function (e) { return e.k === 'nomina' || e.k === 'finmes'; })[0];
    if (nom && r.length < 3) r.push(nom.por);
    return r.slice(0, 3).join(' · ');
  }

  /* ---------------- texto de respaldo (sin servidor) ---------------- */
  var T = {
    es: { calor: '¿Calor? Hoy toca {a} y {b} bien fría 🧊', lluvia: 'Día de lluvia = {a} 🌧️', fresco: 'Hoy apetece {a} 😋', fest: '¡{fest}! Plan hecho: {a} 🎉', finde: 'Plan de {dia}: {a} en {neg} 😍', base: 'Hoy en {neg}: {a} ✨', fr: 'De {x} a {y}', serv: 'Hoy en {neg}: {a} ✨' },
    en: { calor: 'Hot out? Today it\'s {a} and an ice-cold {b} 🧊', lluvia: 'Rainy day = {a} 🌧️', fresco: 'Today calls for {a} 😋', fest: '{fest}! Plan sorted: {a} 🎉', finde: '{dia} plan: {a} at {neg} 😍', base: 'Today at {neg}: {a} ✨', fr: 'From {x} to {y}', serv: 'Today at {neg}: {a} ✨' },
    de: { calor: 'Heiß heute? Dann {a} und ein eiskaltes {b} 🧊', lluvia: 'Regentag = {a} 🌧️', fresco: 'Heute passt {a} 😋', fest: '{fest}! Der Plan steht: {a} 🎉', finde: 'Plan für {dia}: {a} im {neg} 😍', base: 'Heute im {neg}: {a} ✨', fr: 'Von {x} bis {y}', serv: 'Heute bei {neg}: {a} ✨' },
    fr: { calor: 'Il fait chaud ? Aujourd\'hui c\'est {a} et un {b} bien frais 🧊', lluvia: 'Jour de pluie = {a} 🌧️', fresco: 'Aujourd\'hui, envie de {a} 😋', fest: '{fest} ! Programme trouvé : {a} 🎉', finde: 'Programme du {dia} : {a} chez {neg} 😍', base: 'Aujourd\'hui chez {neg} : {a} ✨', fr: 'De {x} à {y}', serv: 'Aujourd\'hui chez {neg} : {a} ✨' }
  };
  var DIAS_L = { en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], de: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'], fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] };
  function plantilla(p, cx) {
    var lc = T[lang()] ? lang() : 'es', t = T[lc], c = cx.clima, P = perfil();
    var fest = (cx.festivo && cx.festivo.nombre) || (cx.esp.filter(function (e) { return e.k === 'puente' || e.k === 'fecha'; })[0] || {}).t;
    var g = !esComida() ? t.serv : fest ? t.fest : c && c.lluvia ? t.lluvia : c && c.calor ? t.calor : c && c.fresco ? t.fresco : cx.k >= 4 ? t.finde : t.base;
    var dia = lc === 'es' ? DIAS[cx.k] : DIAS_L[lc][cx.k];
    g = g.replace('{a}', p.a.nombre).replace('{b}', p.b.nombre.toLowerCase()).replace('{neg}', neg()).replace('{fest}', fest || '').replace('{dia}', dia);
    var cta = (P.cta && (lc === 'es' ? P.cta.frase : P.cta[lc])) || (P.cta && P.cta.texto) || '';
    var franja = cx.franja.tipo === 'lleno' ? '' : '\n🕒 ' + t.fr.replace('{x}', hm(cx.franja.a)).replace('{y}', hm(cx.franja.b));
    var of = esComida() && OFERTAS_T[lc] && OFERTAS_COMIDA[p.ofKey] ? textoOferta(p.ofKey, p.a.nombre, p.b.nombre, cx, lc) : p.oferta;
    return g + '\n\n🔥 ' + of + franja + (cta ? '\n👉 ' + cta + ' 📲' : '');
  }

  /* =====================================================================
     TEXTOS CON LA IA DEL SERVIDOR (una llamada para todos los días)
     ===================================================================== */
  var IA = { pidiendo: false, error: '', intentadas: {} };
  function pedirTextos(forzar) {
    if (!conServidor() || IA.pidiendo) return;
    var faltan = diasVisibles().map(function (f) { return PROPS[f]; }).filter(function (p) { return p && !p.cerrado && !p.textoIA && (forzar || !IA.intentadas[p.clave]); });
    if (!faltan.length) return;
    faltan.forEach(function (p) { IA.intentadas[p.clave] = 1; });
    var I = {}; try { I = ChispaSector.paraIA(); } catch (e) {}
    IA.pidiendo = true; IA.error = ''; repintar();
    sync().pedir('POST', '/ofertas/textos', {
      idioma: lang(), negocio: N().nombre, sector: perfil().nombre, ciudad: N().ciudad, tono: I.tono, cta: I.cta && I.cta.frase,
      dias: faltan.map(function (p) {
        var c = p.cx.clima;
        return { clave: p.clave, fecha: p.fecha, dia: DIAS[p.cx.k], plato: p.a.nombre, precioPlato: p.a.precio || '', bebida: p.b.nombre, precioBebida: p.b.precio || '', oferta: p.oferta,
          franja: hm(p.franja.a) + '-' + hm(p.franja.b), red: p.ritmo.redes.map(function (r) { return RED[r]; }).join(' + '), formato: p.ritmo.f, motivo: p.porque,
          tiempo: c ? c.tmax + ' °C' + (c.lluvia ? ', lluvia' : '') : '', festivo: (p.cx.festivo && p.cx.festivo.nombre) || '' };
      })
    }).then(function (j) {
      IA.pidiendo = false;
      (j.textos || []).forEach(function (t) { D().textos[t.clave] = { texto: t.texto, titulo: t.titulo, hashtags: t.hashtags }; });
      if (j.recortados) IA.error = 'Tu plan ve ' + j.diasMax + ' días: el resto, con plantilla.';
      if (j.aviso) IA.error = j.aviso;
      guardarS(); repintar();
    }, function (e) {
      IA.pidiendo = false; IA.error = (e && e.message) || 'la IA no está disponible'; repintar();
    });
  }

  /* =====================================================================
     PINTAR
     ===================================================================== */
  var PROPS = {};
  function diasMax() { return (SEN.plan && SEN.plan.diasMax) || (conServidor() ? 3 : 14); }
  function diasVisibles() {
    var n = Math.min(D().vista === 14 ? 14 : 7, diasMax()), hoy = new Date(), out = [];
    hoy.setHours(0, 0, 0, 0);
    var desde = new Date().getHours() >= 21 ? 1 : 0; // a partir de las 21:00, el plan empieza mañana
    for (var i = desde; i < desde + n; i++) out.push(diaIso(sumaDias(hoy, i)));
    return out;
  }
  function calcular() {
    PROPS = {};
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    for (var i = -2; i < 16; i++) { var f = diaIso(sumaDias(hoy, i)); PROPS[f] = propuesta(f); }
  }
  function fechaBonita(d) { var h = new Date(); h.setHours(0, 0, 0, 0); var k = Math.round((d - h) / 864e5), s = (k === 0 ? 'hoy, ' : k === 1 ? 'mañana, ' : '') + DIAS[dow(d)] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()]; return s.charAt(0).toUpperCase() + s.slice(1); }
  function precioHtml(x) { return x.precio ? '<span class="od-pr">' + esc(x.precio) + '</span>' : '<span class="od-pr hueco" title="Pon tú el precio">… €</span>'; }
  function fuentes() {
    var c = cartaPropia(), ap = aprendido();
    var tiempo = SEN.tiempo ? '🌤️ Tiempo de ' + esc(SEN.tiempoCiudad || ciudad()) + ': <b>Open-Meteo</b>' : (SEN.cargado ? '🌤️ Tiempo: no ha respondido (propongo sin él)' : '🌤️ Mirando el tiempo…');
    var fest = SEN.festivos ? '📅 Festivos: <b>' + esc(SEN.festivosFuente) + '</b>' + (regionDe(ciudad()) ? ' (España + ' + esc(regionDe(ciudad()).replace('ES-', '')) + ')' : ' (España)') : '📅 Festivos…';
    var carta = c.length ? '📖 Tu carta: <b>' + c.length + '</b> (' + c.filter(function (x) { return x.tipo === 'bebida'; }).length + ' bebidas)' : '📖 Sin carta: propongo por tu sector';
    var est = ap ? '📊 Tus estadísticas: ' + ap.n + ' publicaciones medidas' : '📊 Tus estadísticas: aún sin datos reales';
    return '<div class="od-fuentes">' + [tiempo, fest, carta, est, '📈 Reglas de las redes (Crecer)'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>';
  }
  function tarjeta(f) {
    var p = PROPS[f], lb = L(), cx = p.cx, c = cx.clima, usados = D().usadas[f];
    var chips = (c ? '<span class="od-chip t">' + c.icono + ' ' + c.tmax + '°' + (c.lluvia ? ' · ' + (c.prob != null ? c.prob + ' %' : 'lluvia') : '') + (c.viento ? ' · 💨' : '') + '</span>' : '') +
      (cx.festivo ? '<span class="od-chip f">🎉 ' + esc(cx.festivo.nombre) + '</span>' : '') +
      cx.esp.filter(function (e) { return e.k !== 'nomina' && e.k !== 'finmes'; }).map(function (e) { return '<span class="od-chip e">' + esc(e.t) + '</span>'; }).join('') +
      cx.esp.filter(function (e) { return e.k === 'nomina' || e.k === 'finmes'; }).map(function (e) { return '<span class="od-chip n">' + esc(e.t) + '</span>'; }).join('');
    var h = '<div class="od-dia' + (p.cerrado ? ' cerr' : '') + (usados ? ' usada' : '') + '" data-f="' + f + '"><div class="od-dh"><b>' + esc(fechaBonita(p.d)) + '</b><div class="od-chips">' + chips + '</div></div>';
    if (p.cerrado) {
      return h + '<div class="od-cerr">😴 <b>Cerrado.</b> Hoy no hay oferta: descansa. Como mucho, una historia por la noche: «mañana abrimos con…».</div>' +
        '<div class="od-acc"><button class="btn g sm" onclick="odAbrir(\'' + f + '\')">Este día abrimos</button></div></div>';
    }
    var r = p.ritmo, foto = imagenDe(p);
    h += '<div class="od-cuerpo"><div class="od-img"><img src="' + esc(foto.url) + '" alt="Imagen propuesta" width="118" height="118" loading="lazy"><small>' + esc(foto.nota) + '</small><button class="btn g sm" onclick="odImagenIA(\'' + f + '\')">🎨 Imagen con IA</button></div><div class="od-filas">' +
      '<div class="od-f"><span class="od-l">' + lb.a + '</span><span class="od-v"><b>' + esc(p.a.nombre) + '</b> ' + (esComida() || p.a.deCarta ? precioHtml(p.a) : '') + (p.a.deCarta ? '' : (cartaPropia().length ? ' <small>(no está en tu carta)</small>' : '')) + '</span></div>' +
      '<div class="od-f"><span class="od-l">' + lb.b + '</span><span class="od-v"><b>' + esc(p.b.nombre) + '</b> ' + (esComida() || p.b.deCarta ? precioHtml(p.b) : '') + (esComida() && !p.b.deCarta ? ' <small>(no está en tu carta: pon el precio tú)</small>' : '') + '</span></div>' +
      '<div class="od-f"><span class="od-l">' + lb.c + '</span><span class="od-v">' + esc(p.oferta) + '</span></div>' +
      '<div class="od-f"><span class="od-l">🕒 Franja</span><span class="od-v">' + hm(p.franja.a) + '–' + hm(p.franja.b) + ' <small>(' + (p.franja.tipo === 'valle' ? 'hora floja' : p.franja.tipo === 'lleno' ? 'se llena sola' : 'franja de oferta') + ')</small></span></div>' +
      '<div class="od-f"><span class="od-l">📲 Dónde</span><span class="od-v">' + esc(FMT[r.f] || r.f) + ' en ' + esc(r.redes.map(function (x) { return RED[x]; }).join(' + ')) + ' a las ' + esc(r.h) + (p.franja.tipo !== 'lleno' ? ' · y Historias + Estado de WhatsApp a las ' + hm(p.franja.a) : '') + '</span></div>' +
      '</div></div>' +
      '<div class="od-txt"><div class="od-tl">' + (p.textoIA ? '✍️ Escrito por la IA' : IA.pidiendo && conServidor() ? '✍️ La IA lo está escribiendo…' : '📝 Texto de plantilla' + (conServidor() ? '' : ' (con tu cuenta lo escribe la IA)')) + '</div>' + esc(p.texto) + (p.tags ? '\n' + esc(p.tags) : '') + '</div>' +
      '<div class="od-por">💡 <b>Por qué:</b> ' + esc(p.porque) + '</div>' +
      (usados ? '<div class="od-ok">✅ En tu calendario como borrador · <a href="javascript:void 0" onclick="vista(\'panel\');panel(\'calendario\')">Ver en el calendario</a></div>' : '') +
      '<div class="od-acc">' + (usados ? '' : '<button class="btn pp sm" onclick="odUsar(\'' + f + '\')">✅ Usar esta propuesta</button>') +
      '<button class="btn g sm" onclick="odOtra(\'' + f + '\')">🔄 Otra idea</button>' +
      '<button class="btn g sm" onclick="odCambiar(\'' + f + '\')">🔀 Cambiar ' + esc(lb.item) + '/' + esc(lb.item2) + '</button>' +
      '<button class="btn g sm" onclick="odNoGusta(\'' + f + '\')" aria-label="No me gusta">👎 No me gusta</button>' +
      '<button class="btn g sm" onclick="odCopiar(\'' + f + '\')">📋 Copiar</button></div></div>';
    return h;
  }
  function imagenDe(p) {
    var m = D().medias[p.fecha];
    if (m && m.url && m.clave === p.clave) return { url: m.url, nota: 'Imagen creada con IA' };
    var E = window.CHISPA_ESTUDIO, n = hash(p.fecha) % 5, url = '';
    try { if (perfil().cambia && window.ChispaSector) url = ChispaSector.fotoPara(p.a.nombre + ' ' + p.oferta, n, 800, 800); } catch (e) {}
    if (!url && E && E.fotoPara) url = E.fotoPara(E.catDe(p.a.nombre + ' ' + p.b.nombre), n, 800, 800).url;
    return { url: url || 'icono-512.png', nota: 'Foto libre de ejemplo (Unsplash): mejor una tuya' };
  }
  function vOfertas() {
    limpiarViejo(); calcular();
    var o = D(), max = diasMax(), lb = L(), P = perfil();
    var h = '<div class="hd"><h2>📅 Tu plan de ofertas</h2><span class="chip">' + esc((P.icono || '') + ' ' + (P.corto || P.nombre || '')) + '</span></div>';
    h += '<div class="od-intro"><b>Una maqueta por día: ' + esc(lb.item) + ', ' + esc(lb.item2) + ' y oferta, a qué hora y en qué red.</b> Chispa mira el tiempo, los festivos, tus horas flojas, las reglas de cada red y tu carta. Tú eliges: «Usar» la deja en tu calendario como borrador.</div>';
    h += fuentes();
    h += '<div class="od-barra"><button class="btn pp" onclick="odSemana()">⚡ Planificar la semana entera</button>' +
      '<div class="od-seg" role="group" aria-label="Días que se ven"><button class="' + (o.vista !== 14 ? 'on' : '') + '" onclick="odVista(7)">7 días</button><button class="' + (o.vista === 14 ? 'on' : '') + '" onclick="odVista(14)">14 días</button></div>' +
      '<button class="btn g" onclick="odCarta()">📖 ' + (cartaPropia().length ? 'Tu carta (' + cartaPropia().length + ')' : 'Importar tu carta') + '</button>' +
      (conServidor() ? '<button class="btn g" onclick="odTextosIA()">✍️ Reescribir con IA</button>' : '') + '</div>';
    if (!conServidor()) h += '<div class="od-demo">🧪 <b>Modo demostración:</b> el tiempo, los festivos y la carta son de verdad; los textos son de plantilla. Con tu cuenta (entra con tu código en <a href="javascript:void 0" onclick="panel(\'conectar\')">Conexiones</a>) los escribe la IA en tu idioma.</div>';
    if (IA.error) h += '<div class="warn">⚠️ ' + esc(IA.error) + '</div>';
    if (lang() !== 'es' && !T[lang()]) h += '<div class="od-demo">🌍 Tu idioma es ' + esc(perfil().idioma.nombre) + ': sin servidor verás los textos en español; con tu cuenta los escribe la IA en ' + esc(perfil().idioma.nombre) + '.</div>';
    var dias = diasVisibles();
    h += '<div class="od-grid">' + dias.map(tarjeta).join('') + '</div>';
    if (max < (o.vista === 14 ? 14 : 7)) h += '<div class="od-lock">🔒 Tu plan ve los próximos <b>' + max + ' días</b>. Con <b>Pro y Agencia</b> planificas 14 días. <a href="javascript:void 0" onclick="panel(\'plan\')">Mi plan</a></div>';
    h += '<div class="od-nota">Nada se publica solo: cada propuesta entra como <b>borrador</b> y tú la pasas a «Programada». Precios: solo los de tu carta; donde pone «… €», lo pones tú. No uso partidos ni eventos porque no hay una fuente gratuita fiable.</div>';
    return h;
  }
  function repintar() {
    if (typeof TAB !== 'undefined' && TAB === 'ofertas' && $('main') && $('app') && $('app').classList.contains('on')) { var y = window.scrollY; $('main').innerHTML = vOfertas(); window.scrollTo(0, y); }
    else if (typeof TAB !== 'undefined' && TAB === 'asistente') ponerTarjetaAsistente();
  }

  /* ---------------- pestaña y tarjeta del Asistente ---------------- */
  var TAB_O = { id: 'ofertas', ic: '🗓️', nm: 'Plan de ofertas' };
  function ponerTab() { if (TABS.some(function (t) { return t.id === 'ofertas'; })) return; var pos = -1; TABS.forEach(function (t, i) { if (t.id === 'asistente') pos = i; }); TABS.splice(pos + 1, 0, TAB_O); }
  ponerTab();
  function ponerTarjetaAsistente() {
    var m = $('main'); if (!m || m.querySelector('#odAsis')) { var v = $('odAsis'); if (v) v.outerHTML = tarjetaAsistente(); return; }
    var hd = m.querySelector('.hd'); var html = tarjetaAsistente();
    if (hd) hd.insertAdjacentHTML('afterend', html); else m.insertAdjacentHTML('afterbegin', html);
  }
  function tarjetaAsistente() {
    calcular();
    var dias = diasVisibles(), f = dias.filter(function (x) { return PROPS[x] && !PROPS[x].cerrado; })[0];
    if (!f) return '<div id="odAsis"></div>';
    var p = PROPS[f], c = p.cx.clima, lb = L();
    return '<div id="odAsis" class="od-asis"><div class="od-at">📅 Tu plan de ofertas · <b>' + esc(fechaBonita(p.d)) + '</b>' + (c ? ' <span class="od-chip t">' + c.icono + ' ' + c.tmax + '°</span>' : '') + '</div>' +
      '<div class="od-av">' + lb.a.split(' ')[0] + ' <b>' + esc(p.a.nombre) + '</b> · ' + lb.b.split(' ')[0] + ' ' + esc(p.b.nombre) + '<br>' + lb.c.split(' ')[0] + ' ' + esc(p.oferta) + ' · 🕒 ' + hm(p.franja.a) + '–' + hm(p.franja.b) + '</div>' +
      '<div class="od-por">💡 ' + esc(p.porque) + '</div>' +
      '<div class="od-acc"><button class="btn pp sm" onclick="panel(\'ofertas\')">Ver el plan de ' + Math.min(7, diasMax()) + ' días ›</button>' + (D().usadas[f] ? '' : '<button class="btn g sm" onclick="odUsar(\'' + f + '\')">✅ Usar esta</button>') + '</div></div>';
  }
  var panelAntes = window.panel;
  window.panel = function (tab) {
    if (tab !== 'ofertas') {
      var r = panelAntes.apply(this, arguments);
      if (tab === 'asistente') { try { ponerTarjetaAsistente(); } catch (e) {} if (!SEN.cargado) cargar(); }
      return r;
    }
    TAB = 'ofertas'; ponerTab(); pintarNav();
    $('main').innerHTML = vOfertas();
    if (!SEN.cargado) cargar(); else pedirTextos();
  };

  /* =====================================================================
     BOTONES
     ===================================================================== */
  window.odVista = function (n) { D().vista = n === 14 ? 14 : 7; guardarS(); repintar(); if (n === 14 && diasMax() < 14) aviso('Tu plan ve ' + diasMax() + ' días: 14 días en Pro y Agencia'); pedirTextos(); };
  window.odAbrir = function (f) { D().abiertos[f] = 1; guardarS(); repintar(); aviso('Vale: ese día lo cuento como abierto'); };
  window.odOtra = function (f) { var o = D(); o.semillas[f] = (o.semillas[f] || 0) + 1; delete o.cambios[f]; guardarS(); repintar(); aviso('🔄 Otra idea para ' + fechaBonita(deIso(f))); pedirTextos(); };
  window.odTextosIA = function () { Object.keys(PROPS).forEach(function (f) { var p = PROPS[f]; if (p && p.clave) delete D().textos[p.clave]; }); IA.intentadas = {}; calcular(); pedirTextos(true); };
  window.odCopiar = function (f) {
    var p = PROPS[f]; if (!p) return; var t = p.texto + (p.tags ? '\n' + p.tags : '');
    try { navigator.clipboard.writeText(t).then(function () { aviso('Copiado ✓'); }, function () { prompt('Copia el texto', t); }); } catch (e) { prompt('Copia el texto', t); }
  };
  window.odNoGusta = function (f) {
    var p = PROPS[f]; if (!p) return; var lb = L();
    modal('<h3>👎 ¿Qué no te gusta?</h3><p style="color:var(--tx2);font-size:14px">Lo apunto y no te lo vuelvo a proponer' + (conServidor() ? ' (se guarda en tu cuenta, en todos tus aparatos)' : '') + '.</p>' +
      '<div class="od-nog"><button class="btn g" onclick="odVoto(\'' + f + '\',\'a\')">' + lb.a + ': ' + esc(p.a.nombre) + '</button>' +
      '<button class="btn g" onclick="odVoto(\'' + f + '\',\'b\')">' + lb.b + ': ' + esc(p.b.nombre) + '</button>' +
      '<button class="btn g" onclick="odVoto(\'' + f + '\',\'c\')">' + lb.c + ': ' + esc(p.oferta) + '</button>' +
      '<button class="btn g" onclick="odVoto(\'' + f + '\',\'todo\')">Todo el día: dame otra cosa</button></div>' +
      (Object.keys(D().nomegusta).length ? '<button class="btn g sm" style="margin-top:12px" onclick="odOlvidar()">Olvidar lo que no me gustaba (' + Object.keys(D().nomegusta).length + ')</button>' : ''));
  };
  window.odVoto = function (f, que) {
    var p = PROPS[f], o = D(); if (!p) return;
    if (que === 'a' || que === 'todo') o.nomegusta['a:' + sinT(p.a.nombre)] = (o.nomegusta['a:' + sinT(p.a.nombre)] || 0) + 1;
    if (que === 'b' || que === 'todo') o.nomegusta['b:' + sinT(p.b.nombre)] = (o.nomegusta['b:' + sinT(p.b.nombre)] || 0) + 1;
    if (que === 'c' || que === 'todo') o.nomegusta['c:' + sinT(p.ofKey)] = (o.nomegusta['c:' + sinT(p.ofKey)] || 0) + 1;
    delete o.cambios[f]; o.semillas[f] = (o.semillas[f] || 0) + 1;
    guardarS(); cerrarModal(); repintar(); aviso('Apuntado: no te lo vuelvo a proponer 👍'); pedirTextos();
  };
  window.odOlvidar = function () { D().nomegusta = {}; guardarS(); cerrarModal(); repintar(); aviso('Listo: vuelvo a proponerlo todo'); };

  window.odCambiar = function (f) {
    var p = PROPS[f]; if (!p) return; var lb = L(), cand = candidatos(), cx = p.cx, r = azar('cambiar');
    var A = ordenar(cand.A, function (x) { return puntuaA(x, cx, r, {}); }).slice(0, 40);
    var B = cand.B ? ordenar(cand.B, function (x) { return puntuaB(x, cx, r); }).slice(0, 40) : [].concat(BEBIDAS_SIN_CARTA.calor, BEBIDAS_SIN_CARTA.templado, BEBIDAS_SIN_CARTA.frio).filter(function (x, i, a) { return a.indexOf(x) === i; }).map(function (n) { return { nombre: n, precio: '' }; });
    function opts(l, actual) { return l.map(function (x) { return '<option value="' + esc(x.nombre) + '"' + (x.nombre === actual ? ' selected' : '') + '>' + esc(x.nombre) + (x.precio ? ' · ' + esc(x.precio) : '') + '</option>'; }).join(''); }
    var ofs = esComida() ? ofertasPosibles(cx).concat(Object.keys(OFERTAS_COMIDA)).filter(function (k, i, a) { return a.indexOf(k) === i; }).map(function (k) { return '<option value="' + k + '"' + (k === p.ofKey ? ' selected' : '') + '>' + esc(textoOferta(k, p.a.nombre, p.b.nombre, cx)) + '</option>'; }).join('') : '';
    modal('<h3>🔀 Cambiar · ' + esc(fechaBonita(p.d)) + '</h3>' +
      '<label class="lb">' + lb.a + ' (los primeros son los que mejor encajan con ese día)</label><select id="odSelA">' + opts(A, p.a.nombre) + '</select>' +
      '<input class="inp" id="odOtroA" placeholder="…o escribe otro" style="margin-top:6px">' +
      '<label class="lb" style="margin-top:12px">' + lb.b + '</label><select id="odSelB">' + opts(B, p.b.nombre) + '</select>' +
      '<input class="inp" id="odOtroB" placeholder="…o escribe otra" style="margin-top:6px">' +
      (ofs ? '<label class="lb" style="margin-top:12px">' + lb.c + '</label><select id="odSelC">' + ofs + '</select>' : '') +
      '<button class="btn pp" style="width:100%;margin-top:14px" onclick="odGuardarCambio(\'' + f + '\')">Guardar</button>');
  };
  window.odGuardarCambio = function (f) {
    var a = ($('odOtroA').value || '').trim() || $('odSelA').value, b = ($('odOtroB').value || '').trim() || $('odSelB').value, c = $('odSelC') ? $('odSelC').value : '';
    D().cambios[f] = { a: a.slice(0, 80), b: b.slice(0, 80), c: c || undefined };
    guardarS(); cerrarModal(); repintar(); aviso('Cambiado ✓'); pedirTextos();
  };

  window.odImagenIA = function (f) {
    var p = PROPS[f], M = window.CHISPA_MOTOR, E = window.CHISPA_ESTUDIO; if (!p) return;
    if (!M || !M.generar) { aviso('La imagen necesita el Estudio de publicaciones'); return; }
    aviso(conServidor() ? '🎨 Creando la imagen con IA…' : '🎨 Sin cuenta pongo una foto libre (la IA va con tu cuenta)');
    M.generar({ cat: E && E.catDe ? E.catDe(p.a.nombre + ' ' + p.b.nombre) : 'plato', formato: 'post', ancho: 1080, alto: 1080, cantidad: 1, semilla: hash(p.clave) % 50, ia: true, texto: p.a.nombre + '. ' + p.oferta, titulo: p.a.nombre })
      .then(function (m) {
        if (!m || !m.url) throw new Error('sin imagen');
        if (m.tipo === 'ia') { D().medias[f] = { url: m.url, clave: p.clave, tipo: 'ia' }; guardarS(); repintar(); aviso('✨ Imagen creada con IA'); }
        else { var img = document.querySelector('.od-dia[data-f="' + f + '"] .od-img img'); if (img) img.src = m.url; aviso(m.aviso || '📷 Foto libre'); }
      }, function () { aviso('No se pudo crear la imagen. Prueba otra vez.'); });
  };

  /* ---------------- usar: al calendario (borrador) y a Publicar ---------------- */
  function itemBase(p, cuando) {
    var E = window.CHISPA_ESTUDIO, med = D().medias[p.fecha], foto = imagenDe(p);
    return { id: uid(), titulo: String(p.a.nombre).slice(0, 80), txt: p.texto, tags: p.tags || '', kicker: p.oferta.slice(0, 60), formato: p.ritmo.f,
      cat: E && E.catDe ? E.catDe(p.a.nombre + ' ' + p.b.nombre) : 'plato', L: 0, foto: hash(p.fecha) % 5, ctas: null, sinTexto: false, redes: p.ritmo.redes.slice(), cuando: cuando, estado: 'borrador',
      por: 'Plan de ofertas: ' + p.porque, media: med && med.clave === p.clave ? { tipo: 'ia', url: med.url, cred: '' } : { tipo: 'foto', url: foto.url.replace('w=800&h=800', 'w=1080&h=1080'), cred: '' },
      mediaLocal: false, ejemplo: false, res: {}, motivo: '', modo: 'hora', hasta: '', piezas: null, reparto: 'auto', cada: 0, promo: false, origen: 'ofertas', ofertaFecha: p.fecha };
  }
  function isoMin(d, min) { var x = new Date(d); x.setHours(0, 0, 0, 0); x.setMinutes(min); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()) + 'T' + pad(x.getHours()) + ':' + pad(x.getMinutes()); }
  function usar(f) {
    var p = PROPS[f]; if (!p || p.cerrado) return 0;
    var A = window.CHISPA_AGENDA; try { if (A && A.datos) A.datos(); } catch (e) {}
    if (!S.agenda) S.agenda = [];
    var ahora = new Date(), min = aMin(p.ritmo.h), ids = [];
    if (diaIso(ahora) === f && min <= ahora.getHours() * 60 + ahora.getMinutes() + 20) min = Math.min(23 * 60, Math.ceil((ahora.getHours() * 60 + ahora.getMinutes() + 30) / 15) * 15);
    var it = itemBase(p, isoMin(p.d, min)); S.agenda.push(it); ids.push(it.id);
    if (p.franja.tipo !== 'lleno' && A && A.crearPromo) {
      try {
        var pr = A.crearPromo({ dia: p.d, txt: p.oferta, a: p.franja.a, b: p.franja.b, n: 3 });
        pr.estado = 'borrador'; pr.origen = 'ofertas'; pr.ofertaFecha = f; pr.por = 'Plan de ofertas · franja: ' + p.franja.por; pr.media = it.media;
        S.agenda.push(pr); ids.push(pr.id);
      } catch (e) {}
    }
    D().usadas[f] = ids; guardarS();
    return ids.length;
  }
  window.odUsar = function (f) {
    var n = usar(f), p = PROPS[f]; if (!n) return;
    repintar();
    var E = window.CHISPA_ESTUDIO;
    modal('<h3>✅ En tu calendario</h3><p style="color:var(--tx2);font-size:14px">' + esc(fechaBonita(p.d)) + ': <b>' + esc((FMT[p.ritmo.f] || '') + ' en ' + p.ritmo.redes.map(function (x) { return RED[x]; }).join(' + ')) + '</b> a las ' + esc(p.ritmo.h) +
      (n > 1 ? ' y la <b>franja de ' + hm(p.franja.a) + ' a ' + hm(p.franja.b) + '</b> con historias y estado de WhatsApp' : '') + ', como <b>borrador</b>. Revisa el texto y el precio y pásalo a «Programada».</p>' +
      '<div class="od-acc"><button class="btn pp" onclick="cerrarModal();vista(\'panel\');panel(\'calendario\')">📅 Ver en el calendario</button>' +
      (E && E.publicar ? '<button class="btn g" onclick="odPublicar(\'' + f + '\')">✏️ Abrir en Publicar</button>' : '') +
      '<button class="btn g" onclick="cerrarModal()">Seguir</button></div>');
  };
  window.odPublicar = function (f) {
    var p = PROPS[f], E = window.CHISPA_ESTUDIO; if (!p || !E || !E.nuevoPost) return;
    cerrarModal();
    var post = E.nuevoPost({ titulo: p.a.nombre, kicker: p.oferta.slice(0, 40), txt: p.texto, tags: p.tags, formato: p.ritmo.f === 'reel' ? 'reel' : 'post', idea: p.a.nombre });
    var it = (S.agenda || []).filter(function (a) { return (D().usadas[f] || []).indexOf(a.id) >= 0; })[0];
    if (it && it.media) post.media = it.media;
    E.publicar(post, p.ritmo.redes);
  };
  window.odSemana = function () {
    var dias = diasVisibles().slice(0, 7), hechos = [], sal = 0;
    dias.forEach(function (f) { var p = PROPS[f]; if (!p) return; if (p.cerrado || D().usadas[f]) { sal++; return; } if (usar(f)) hechos.push(f); });
    repintar();
    if (!hechos.length) { aviso('Esta semana ya está planificada ✓'); return; }
    modal('<h3>⚡ Semana planificada</h3><p style="color:var(--tx2);font-size:14px">' + hechos.length + ' días en tu calendario como <b>borrador</b>' + (sal ? ' (' + sal + ' ya estaban o cerráis)' : '') + ':</p><ul class="od-lista">' +
      hechos.map(function (f) { var p = PROPS[f]; return '<li><b>' + esc(fechaBonita(p.d)) + '</b> · ' + esc(p.a.nombre) + ' · ' + esc(p.oferta) + '</li>'; }).join('') + '</ul>' +
      '<div class="od-acc"><button class="btn pp" onclick="cerrarModal();vista(\'panel\');panel(\'calendario\')">📅 Ver en el calendario</button><button class="btn g" onclick="cerrarModal()">Seguir</button></div>');
  };

  /* ---------------- la carta ---------------- */
  function urlCartaDefecto() {
    var u = D().cartaUrl || N().carta || '';
    // El Paraíso: el enlace de «Mi negocio» es el EDITOR (carta.html); la carta que ven los clientes (QR de las mesas) es carta-paraiso.html
    if (/el-paraiso-eight\.vercel\.app\/carta\.html(?!\?c=)/.test(u)) u = 'https://el-paraiso-eight.vercel.app/carta-paraiso.html';
    return u;
  }
  window.odCarta = function () {
    var c = cartaPropia();
    modal('<h3>📖 Tu carta</h3><p style="color:var(--tx2);font-size:13.5px">Con tu carta propongo tus platos y bebidas con <b>su precio</b>. Sin precio, sale «… €» para que lo pongas tú: nunca me invento uno.</p>' +
      '<label class="lb">Leer de tu web</label><div class="od-fila"><input class="inp" id="odUrl" value="' + esc(urlCartaDefecto()) + '" placeholder="https://tunegocio.com/carta"><button class="btn pp" onclick="odLeerCarta()">Leer</button></div><div id="odCartaEst" class="od-est"></div>' +
      '<label class="lb" style="margin-top:12px">…o pégala (una línea por plato: «Paella mixta 14,50 €»; «Bebidas:» para empezar las bebidas)</label><textarea id="odPegar" rows="4" placeholder="Paella mixta 14,50\nCroquetas caseras 8,50 €\nBebidas:\nMojito 7 €\nCerveza"></textarea><button class="btn g sm" style="margin-top:6px" onclick="odPegarCarta()">Añadir a la lista</button>' +
      '<div id="odLista">' + listaCarta() + '</div>');
  };
  function listaCarta() {
    var c = cartaPropia();
    if (!c.length) return '<div class="od-est" style="margin-top:12px">Aún no hay carta: propongo por tu sector, sin precios.</div>';
    return '<div class="od-lh"><b>' + c.length + ' en tu carta</b>' + (D().cartaFuente ? ' · ' + esc(D().cartaFuente) : '') + ' <button class="btn g sm" onclick="odBorrarCarta()">Vaciar</button></div><div class="od-tabla">' +
      c.map(function (x, i) {
        return '<div class="od-ci"><input class="inp" value="' + esc(x.nombre) + '" onchange="odEditar(' + i + ',\'nombre\',this.value)" aria-label="Nombre"><input class="inp od-cp" value="' + esc(x.precio) + '" placeholder="… €" onchange="odEditar(' + i + ',\'precio\',this.value)" aria-label="Precio">' +
          '<select onchange="odEditar(' + i + ',\'tipo\',this.value)" aria-label="Tipo"><option value="plato"' + (x.tipo !== 'bebida' ? ' selected' : '') + '>Plato</option><option value="bebida"' + (x.tipo === 'bebida' ? ' selected' : '') + '>Bebida</option></select>' +
          '<button class="btn g sm" onclick="odQuitar(' + i + ')" aria-label="Quitar">🗑</button></div>';
      }).join('') + '</div>';
  }
  function ponerCarta(items, fuente, juntar) {
    var o = D(), base = juntar ? o.carta.slice() : [];
    items.forEach(function (x) { if (!base.some(function (y) { return sinT(y.nombre) === sinT(x.nombre); })) base.push({ nombre: x.nombre, precio: x.precio || '', categoria: x.categoria || '', tipo: x.tipo === 'bebida' ? 'bebida' : 'plato' }); });
    o.carta = base.slice(0, 300); if (fuente) o.cartaFuente = fuente;
    Object.keys(o.textos).forEach(function (k) { delete o.textos[k]; }); IA.intentadas = {};
    guardarS(); var l = $('odLista'); if (l) l.innerHTML = listaCarta(); repintar();
  }
  window.odLeerCarta = function () {
    var u = ($('odUrl').value || '').trim(), est = $('odCartaEst'); if (!u) { aviso('Pega el enlace de tu carta'); return; }
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    D().cartaUrl = u; est.textContent = '📖 Leyendo tu carta…';
    var C = window.ChispaCarta;
    var paso = conServidor() ? sync().pedir('POST', '/ofertas/carta', { url: u })
      : C ? C.leerUrl(u, function (x) { return conTiempo(fetch(x).then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, texto: t }; }); }), 9000); })
        .catch(function () { throw new Error('tu web no deja leerla desde el navegador; con tu cuenta la lee el servidor, o pégala aquí abajo'); }) : Promise.reject(new Error('falta ofertas-carta.js'));
    paso.then(function (j) {
      var it = j.items || [];
      if (!it.length) { est.textContent = '⚠️ ' + (j.aviso || 'No he encontrado platos con precio. Pégala aquí abajo.'); return; }
      ponerCarta(it, j.fuente ? 'leída de ' + u.replace(/^https?:\/\//, '').slice(0, 50) : '', false);
      var e2 = $('odCartaEst'); if (e2) e2.textContent = '✅ ' + it.length + ' leídos (' + it.filter(function (x) { return x.tipo === 'bebida'; }).length + ' bebidas). Revisa los precios y los tipos.';
      aviso('📖 Carta importada: ' + it.length);
    }, function (e) { est.textContent = '⚠️ No he podido leerla: ' + ((e && e.message) || 'error') + '.'; });
  };
  window.odPegarCarta = function () {
    var t = ($('odPegar').value || '').trim(); if (!t || !window.ChispaCarta) { aviso('Pega primero la lista'); return; }
    var it = ChispaCarta.desdeLista(t); if (!it.length) { aviso('No he entendido la lista'); return; }
    ponerCarta(it, 'escrita a mano', true); $('odPegar').value = ''; aviso('Añadidos: ' + it.length);
  };
  window.odEditar = function (i, k, v) {
    var c = D().carta[i]; if (!c) return;
    if (k === 'precio') v = window.ChispaCarta ? ChispaCarta.limpiarPrecio(v) : v;
    c[k] = String(v || '').slice(0, 80); Object.keys(D().textos).forEach(function (x) { delete D().textos[x]; }); IA.intentadas = {};
    guardarS(); repintar();
  };
  window.odQuitar = function (i) { D().carta.splice(i, 1); guardarS(); var l = $('odLista'); if (l) l.innerHTML = listaCarta(); repintar(); };
  window.odBorrarCarta = function () { if (!confirm('¿Vaciar la carta? (no se borra de tu web)')) return; D().carta = []; D().cartaFuente = ''; guardarS(); var l = $('odLista'); if (l) l.innerHTML = listaCarta(); repintar(); };

  /* para las pruebas y otros módulos */
  window.ChispaOfertas = { propuesta: function (f) { calcular(); return PROPS[f]; }, dias: function () { calcular(); return diasVisibles().map(function (f) { return PROPS[f]; }); }, senales: SEN, cargar: cargar, usar: usar, datos: D, regionDe: regionDe, especiales: especiales };

  window.addEventListener('chispa:sector', function () { if (typeof TAB !== 'undefined' && TAB === 'ofertas') repintar(); });
  try { pintarNav(); } catch (e) {}
  if (/ofertas/.test(location.hash || '')) { try { vista('panel'); window.panel('ofertas'); } catch (e) {} }
  else if ($('app') && $('app').classList.contains('on') && typeof TAB !== 'undefined' && TAB === 'asistente') { try { ponerTarjetaAsistente(); cargar(); } catch (e) {} }
})();
