/* ──────────────────────────────────────────────────────────────────────────
   Chispa · «Reseñas» y «Automatizaciones»  (trabajador C)

   Va en su propio fichero para no pisar index.html: se engancha añadiendo
   dos pestañas a TABS y envolviendo panel(). Usa de index.html solo lo
   común: S (negocio), $, esc, toast, modal, cerrarModal, pintarNav.

   Las respuestas las escribe el motor de FAMA (fama-motor.js), sin IA ni
   claves: detecta idioma, de qué habla la reseña y contesta a eso.
   Las reseñas de ejemplo son INVENTADAS y se marcan como tales.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var KEY_R = 'chispa_resenas_v1';
  var HORA = 3600e3;

  /* ---------- estilos propios ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.rs-top{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}',
    '@media(max-width:700px){.rs-top{grid-template-columns:1fr 1fr}}',
    '.rs-k{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:13px}',
    '.rs-k .n{font-size:24px;font-weight:800;letter-spacing:-.5px}.rs-k .l{font-size:12px;color:var(--tx3)}',
    '.rs-fil{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px;align-items:center}',
    '.rs-fil button{background:var(--panel2);border:1px solid var(--line);color:var(--tx2);font-weight:700;font-size:13px;padding:8px 13px;border-radius:30px;cursor:pointer;min-height:36px}',
    '.rs-fil button.on{background:rgba(139,92,246,.18);border-color:var(--purple);color:var(--tx)}',
    '.rs-fil select{width:auto;padding:8px 12px;border-radius:30px;font-size:13px}',
    '.rs{background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px;animation:fadeUp .3s ease both}',
    '.rs.neg{border-left:3px solid var(--rojo)}',
    '.rs-h{display:flex;align-items:center;gap:9px;flex-wrap:wrap}',
    '.rs-pl{font-size:11px;font-weight:800;padding:3px 9px;border-radius:30px;border:1px solid;white-space:nowrap}',
    '.rs-pl.google{color:#93c5fd;border-color:rgba(96,165,250,.45);background:rgba(96,165,250,.12)}',
    '.rs-pl.tripadvisor{color:#6ee7b7;border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.1)}',
    '.rs-pl.thefork{color:#bef264;border-color:rgba(163,230,53,.4);background:rgba(163,230,53,.1)}',
    '.rs-au{font-weight:700;font-size:14px}',
    '.rs-st{color:var(--amber);letter-spacing:1px;font-size:14px}.rs-st i{color:var(--line);font-style:normal}',
    '.rs-fe{margin-left:auto;font-size:12px;color:var(--tx3)}',
    '.rs-tx{font-size:14px;margin:8px 0 10px;color:var(--tx)}',
    '.rs-meta{font-size:11.5px;color:var(--tx3);margin-bottom:8px}',
    '.rs-prop{background:rgba(139,92,246,.08);border:1px dashed rgba(139,92,246,.45);border-radius:11px;padding:10px 12px;font-size:13.5px;white-space:pre-wrap}',
    '.rs-prop .lbl,.rs-ok .lbl{font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;font-weight:800;margin-bottom:4px;white-space:normal}',
    '.rs-prop .lbl{color:var(--purple2)}',
    '.rs-ok{background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.4);border-radius:11px;padding:10px 12px;font-size:13.5px;white-space:pre-wrap}',
    '.rs-ok .lbl{color:var(--verde)}',
    '.rs-acts{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}',
    '.rs-acts .btn{min-height:40px}',
    '.rs-aviso{font-size:12.5px;color:var(--tx2);margin-top:8px}',
    '.rs-ej{display:inline-block;font-size:10.5px;font-weight:800;color:var(--tx3);border:1px solid var(--line);border-radius:30px;padding:2px 8px}',
    '.au{background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:15px;margin-bottom:12px}',
    '.au-h{display:flex;align-items:flex-start;gap:12px}',
    '.au-t{flex:1;min-width:0}.au-t b{font-size:15px;display:block}',
    '.au-d{font-size:13px;color:var(--tx2);margin-top:3px}',
    '.au-es{display:inline-block;font-size:11px;font-weight:800;padding:3px 10px;border-radius:30px;border:1px solid;margin-top:8px}',
    '.au-es.ya{color:var(--verde);border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.1)}',
    '.au-es.app{color:var(--amber);border-color:rgba(255,204,51,.4);background:rgba(255,204,51,.1)}',
    '.au-es.con{color:var(--azul);border-color:rgba(96,165,250,.45);background:rgba(96,165,250,.1)}',
    '.au-es.off{color:var(--tx3);border-color:var(--line)}',
    '.au-x{margin-top:10px;font-size:12.5px;color:var(--tx2);border-top:1px solid var(--line);padding-top:9px}',
    '.au-x p{margin:4px 0}.au-x b{color:var(--tx)}',
    '.sw2{position:relative;flex:none;width:52px;height:30px;border-radius:30px;background:var(--panel2);border:1px solid var(--line);cursor:pointer;padding:0;transition:background .2s}',
    '.sw2::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#9aa3b5;transition:transform .2s,background .2s}',
    '.sw2.on{background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-color:#8b5cf6}',
    '.sw2.on::after{transform:translateX(22px);background:#fff}',
    '.sw2:focus-visible{outline:2px solid var(--amber);outline-offset:2px}',
    '.pasos{margin:6px 0 0;padding-left:20px;font-size:13px;color:var(--tx2)}.pasos li{margin:6px 0}.pasos b{color:var(--tx)}',
    '.rs-alerta{background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.45);border-radius:12px;padding:11px 13px;margin-bottom:12px;font-size:13.5px}',
    '.rs-alerta b{color:var(--rojo)}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- datos ---------- */
  function hace(h) { return new Date(Date.now() - h * HORA).toISOString(); }
  function ejemplos() {
    return [
      { id: 'ej1', plataforma: 'google', autor: 'Marina P.', estrellas: 5, fecha: hace(2),
        texto: 'La paella de los domingos es de otro nivel. Los camareros muy atentos y la terraza preciosa al atardecer. ¡Volveremos seguro!' },
      { id: 'ej2', plataforma: 'google', autor: 'Javier R.', estrellas: 2, fecha: hace(20),
        texto: 'Esperamos más de 40 minutos por los platos y nadie nos dijo nada. La comida estaba bien, pero así no apetece volver.' },
      { id: 'ej3', plataforma: 'tripadvisor', autor: 'Emma W.', estrellas: 5, fecha: hace(27),
        texto: 'Lovely spot in Palma! Great tapas, very friendly staff and the sangria was amazing. Highly recommend dinner on the terrace.' },
      { id: 'ej4', plataforma: 'thefork', autor: 'Carlos G.', estrellas: 4, fecha: hace(46),
        texto: 'Buen menú del día, raciones generosas y la comida muy rica. El servicio rápido. El postre algo flojo, pero repetiremos.' },
      { id: 'ej5', plataforma: 'google', autor: 'Un usuario de Google', estrellas: 1, fecha: hace(70),
        texto: 'Caro para lo que es y el baño estaba sucio. No lo recomiendo.' },
      { id: 'ej6', plataforma: 'google', autor: 'Klaus B.', estrellas: 5, fecha: hace(96),
        texto: 'Sehr leckeres Essen und super freundliche Bedienung. Die Terrasse ist toll, wir kommen gerne wieder!' },
      { id: 'ej7', plataforma: 'tripadvisor', autor: 'Sophie L.', estrellas: 3, fecha: hace(120),
        texto: "Cadre sympa et service correct, mais l'attente était un peu longue pour le repas." },
      { id: 'ej8', plataforma: 'thefork', autor: 'Ana M.', estrellas: 5, fecha: hace(150),
        texto: 'Celebramos un cumpleaños y todo perfecto. El trato del equipo fue de diez, ¡gracias por la tarta sorpresa!' },
      { id: 'ej9', plataforma: 'google', autor: 'Toni F.', estrellas: 4, fecha: hace(200),
        texto: 'Buen ambiente y los mojitos muy bien hechos. Un poco de ruido el sábado por la noche.',
        respuesta: '¡Gracias, Toni! Nos alegra que te gustaran los mojitos. Tomamos nota del ruido de los sábados. ¡Te esperamos pronto!\n\nEl equipo de El Paraíso' },
      { id: 'ej10', plataforma: 'google', autor: 'Lucía S.', estrellas: 5, fecha: hace(290),
        texto: 'El mejor arroz que he probado en Palma y un trato muy cercano.',
        respuesta: '¡Muchas gracias, Lucía! Que te gustara tanto el arroz nos llena de orgullo. ¡Hasta muy pronto!\n\nEl equipo de El Paraíso' }
    ];
  }
  var AUTOS = ['proponer', 'auto45', 'negativas', 'menu11', 'whatsapp'];
  function nuevoR() {
    return { resenas: ejemplos(), variantes: {}, borradores: {}, auto: { proponer: true, auto45: false, negativas: true, menu11: false, whatsapp: false },
      menu: { primero: 'Gazpacho o ensalada mallorquina', segundo: 'Paella de marisco o lomo con col', postre: 'Ensaïmada o fruta', precio: '14,50 €' } };
  }
  var R;
  try { R = JSON.parse(localStorage.getItem(KEY_R)) || nuevoR(); } catch (e) { R = nuevoR(); }
  (function () { var d = nuevoR(); for (var k in d) if (R[k] === undefined) R[k] = d[k]; for (var a in d.auto) if (R.auto[a] === undefined) R.auto[a] = d.auto[a]; })();
  function guardarR() { try { localStorage.setItem(KEY_R, JSON.stringify(R)); } catch (e) {} }

  var PLAT = {
    google: { nm: 'Google', ic: '🔎', panel: 'https://business.google.com/reviews' },
    tripadvisor: { nm: 'TripAdvisor', ic: '🦉', panel: 'https://www.tripadvisor.es/Owners' },
    thefork: { nm: 'TheFork', ic: '🍴', panel: 'https://manager.thefork.com/' }
  };
  var filtro = 'todas', filtroPlat = '', reales = false;

  function tonoFama() { var t = (S.negocio && S.negocio.tono) || ''; return /formal|profesional|elegante/i.test(t) ? 'formal' : 'cercano'; }
  function local() { return (S.negocio && S.negocio.nombre) || 'nuestro local'; }
  function propuesta(r) {
    if (R.borradores[r.id]) return R.borradores[r.id];
    if (!window.FamaMotor) return '';
    return window.FamaMotor.proponer({ estrellas: r.estrellas, texto: r.texto, autor: r.autor, local: local(), tono: tonoFama(), variante: R.variantes[r.id] || 0 }).texto;
  }
  function sinResponder() { return R.resenas.filter(function (r) { return !r.respuesta; }); }
  function negativasSin() { return R.resenas.filter(function (r) { return !r.respuesta && r.estrellas <= 3; }); }
  function estrellas(n) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '<i>★</i>'; return s; }
  function cuando(iso) {
    var h = Math.max(0, (Date.now() - new Date(iso).getTime()) / HORA);
    if (h < 1) return 'hace un momento'; if (h < 24) return 'hace ' + Math.round(h) + ' h';
    var d = Math.round(h / 24); if (d === 1) return 'ayer'; if (d < 30) return 'hace ' + d + ' días';
    return new Date(iso).toLocaleDateString('es-ES');
  }
  function buscar(id) { for (var i = 0; i < R.resenas.length; i++) if (R.resenas[i].id === id) return R.resenas[i]; return null; }
  function idJs(id) { return "'" + String(id).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }

  /* ---------- pestañas en el menú ---------- */
  var tabR = { id: 'resenas', ic: '⭐' }, tabA = { id: 'automatizaciones', ic: '🤖', nm: 'Automatizaciones' };
  Object.defineProperty(tabR, 'nm', { enumerable: true, get: function () { var n = sinResponder().length; return 'Reseñas' + (n ? ' <span class="chip" style="margin-left:auto">' + n + '</span>' : ''); } });
  var pos = -1; for (var i = 0; i < TABS.length; i++) if (TABS[i].id === 'bandeja') pos = i;
  TABS.splice(pos >= 0 ? pos + 1 : TABS.length, 0, tabR, tabA);

  var panelOriginal = window.panel;
  window.panel = function (tab) {
    if (tab !== 'resenas' && tab !== 'automatizaciones') return panelOriginal.apply(this, arguments);
    TAB = tab; pintarNav();
    $('main').innerHTML = tab === 'resenas' ? vResenas() : vAutos();
    if (tab === 'resenas' && R.auto.negativas && negativasSin().length && !window._rsAvisado) { window._rsAvisado = true; toast('⚠️ Tienes ' + negativasSin().length + ' reseña(s) negativa(s) sin responder'); }
  };
  function repinta() { if (TAB === 'resenas' || TAB === 'automatizaciones') window.panel(TAB); else pintarNav(); }

  /* ---------- vista Reseñas ---------- */
  function vResenas() {
    var todas = R.resenas, n = todas.length;
    var media = n ? (todas.reduce(function (a, r) { return a + r.estrellas; }, 0) / n) : 0;
    var lista = todas.filter(function (r) {
      if (filtro === 'sin' && r.respuesta) return false;
      if (filtro === 'neg' && r.estrellas > 3) return false;
      if (filtroPlat && r.plataforma !== filtroPlat) return false;
      return true;
    }).sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });

    var h = '<div class="hd"><h2>⭐ Reseñas</h2><span class="chip">' + sinResponder().length + ' sin responder</span></div>';
    h += cajaConexion();
    if (R.auto.negativas && negativasSin().length) {
      h += '<div class="rs-alerta">⚠️ <b>' + negativasSin().length + ' reseña' + (negativasSin().length > 1 ? 's' : '') + ' negativa' + (negativasSin().length > 1 ? 's' : '') + ' sin responder.</b> Chispa nunca contesta sola a las negativas: revísalas tú. <button class="btn g sm" style="margin-left:6px" onclick="rsFiltro(\'neg\')">Ver</button></div>';
    }
    h += '<div class="rs-top">' +
      '<div class="rs-k"><div class="n" style="color:var(--amber)">' + media.toFixed(1).replace('.', ',') + ' ★</div><div class="l">Nota media</div></div>' +
      '<div class="rs-k"><div class="n">' + n + '</div><div class="l">Reseñas</div></div>' +
      '<div class="rs-k"><div class="n" style="color:var(--purple2)">' + sinResponder().length + '</div><div class="l">Sin responder</div></div>' +
      '<div class="rs-k"><div class="n" style="color:var(--rojo)">' + todas.filter(function (r) { return r.estrellas <= 3; }).length + '</div><div class="l">Negativas (1-3★)</div></div></div>';
    h += '<div class="rs-fil" role="group" aria-label="Filtrar reseñas">' +
      ['todas:Todas', 'sin:Sin responder', 'neg:Negativas'].map(function (p) { var k = p.split(':'); return '<button class="' + (filtro === k[0] ? 'on' : '') + '" aria-pressed="' + (filtro === k[0]) + '" onclick="rsFiltro(\'' + k[0] + '\')">' + k[1] + '</button>'; }).join('') +
      '<select aria-label="Plataforma" onchange="rsPlat(this.value)"><option value="">Todas las plataformas</option>' +
      Object.keys(PLAT).map(function (k) { return '<option value="' + k + '"' + (filtroPlat === k ? ' selected' : '') + '>' + PLAT[k].nm + '</option>'; }).join('') + '</select></div>';
    if (!lista.length) return h + '<div class="empty">' + (filtro === 'sin' ? 'Todo respondido 🎉' : 'No hay reseñas con este filtro.') + '</div>';
    lista.forEach(function (r) { h += tarjeta(r); });
    return h;
  }

  function tarjeta(r) {
    var p = PLAT[r.plataforma] || PLAT.google, id = idJs(r.id);
    var idioma = window.FamaMotor ? window.FamaMotor.detectarIdioma(r.texto) : 'es';
    var h = '<div class="rs' + (r.estrellas <= 3 ? ' neg' : '') + '"><div class="rs-h">' +
      '<span class="rs-pl ' + r.plataforma + '">' + p.ic + ' ' + p.nm + '</span>' +
      '<span class="rs-au">' + esc(r.autor) + '</span><span class="rs-st" aria-label="' + r.estrellas + ' de 5 estrellas">' + estrellas(r.estrellas) + '</span>' +
      '<span class="rs-fe">' + cuando(r.fecha) + '</span></div>' +
      '<div class="rs-tx">“' + esc(r.texto || '(sin texto, solo estrellas)') + '”</div>' +
      '<div class="rs-meta">' + (r.real ? 'Reseña real de tu ficha' : '<span class="rs-ej">EJEMPLO INVENTADO</span>') +
      (idioma !== 'es' && window.FamaMotor ? ' · escrita en ' + window.FamaMotor.IDIOMAS[idioma].toLowerCase() + ', Chispa contesta en su idioma' : '') + '</div>';
    if (r.respuesta) {
      return h + '<div class="rs-ok"><div class="lbl">✓ Respondida' + (r.respondidaPor ? ' · ' + esc(r.respondidaPor) : '') + '</div>' + esc(r.respuesta) + '</div></div>';
    }
    h += '<div class="rs-prop"><div class="lbl">⚡ Respuesta que propone Chispa · tono ' + (tonoFama() === 'formal' ? 'formal' : 'cercano') + (R.borradores[r.id] ? ' · editada por ti' : '') + '</div>' + esc(propuesta(r)) + '</div>';
    var txtBoton = r.plataforma === 'google' ? '✓ Responder' : '📋 Copiar y abrir ' + p.nm;
    h += '<div class="rs-acts"><button class="btn pp sm" onclick="rsResponder(' + id + ')">' + txtBoton + '</button>' +
      '<button class="btn g sm" onclick="rsEditar(' + id + ')">✎ Editar</button>' +
      '<button class="btn g sm" onclick="rsOtra(' + id + ')">↻ Otra versión</button></div>';
    if (r.plataforma !== 'google') h += '<div class="rs-aviso">' + p.nm + ' no deja contestar desde otras apps: Chispa copia la respuesta y abre tu panel de ' + p.nm + ' para pegarla.</div>';
    else if (!r.real) h += '<div class="rs-aviso">Ejemplo: al pulsar se marca como respondida aquí. Con Google conectado se publica en tu ficha.</div>';
    return h + '</div>';
  }

  function cajaConexion() {
    var G = window.ChispaGoogle;
    if (G && G.conectado()) {
      return '<div class="card" style="border-color:rgba(52,211,153,.4)"><div class="row" style="align-items:center"><div style="flex:3;min-width:200px">✅ <b>Google conectado</b> · ' + esc(G.ficha().titulo || '') + '<div style="font-size:12.5px;color:var(--tx3)">Las reseñas de Google son las de tu ficha. TripAdvisor y TheFork siguen siendo ejemplos.</div></div>' +
        '<button class="btn g sm" style="flex:none" onclick="rsCargarGoogle()">↻ Actualizar</button><button class="btn g sm" style="flex:none" onclick="rsDesconectar()">Desconectar</button></div></div>';
    }
    return '<div class="card" style="background:rgba(96,165,250,.06);border-color:rgba(96,165,250,.3)"><div class="row" style="align-items:center"><div style="flex:3;min-width:220px;font-size:13.5px;color:var(--tx2)">🔌 <b style="color:var(--tx)">Estás viendo reseñas de ejemplo.</b> Conecta tu ficha de Google y Chispa leerá y contestará las de verdad.</div>' +
      '<button class="btn pp sm" style="flex:none" onclick="rsConectar()">Conectar Google</button><button class="btn g sm" style="flex:none" onclick="rsQueFalta()">¿Qué hace falta?</button></div></div>';
  }

  /* ---------- acciones ---------- */
  window.rsFiltro = function (f) { filtro = f; repinta(); };
  window.rsPlat = function (p) { filtroPlat = p; repinta(); };
  window.rsOtra = function (id) { delete R.borradores[id]; R.variantes[id] = (R.variantes[id] || 0) + 1; guardarR(); repinta(); toast('↻ Otra versión'); };
  window.rsEditar = function (id) {
    var r = buscar(id); if (!r) return;
    modal('<h3>Editar respuesta</h3><div style="font-size:12.5px;color:var(--tx3);margin-bottom:8px">' + esc(r.autor) + ' · ' + r.estrellas + '★</div>' +
      '<label class="lb" for="rsEd">Tu respuesta</label><textarea id="rsEd" style="min-height:170px">' + esc(propuesta(r)) + '</textarea>' +
      '<div class="row" style="margin-top:12px"><button class="btn g" onclick="rsGuardarBorrador(' + idJs(id) + ')">Guardar borrador</button><button class="btn pp" onclick="rsGuardarBorrador(' + idJs(id) + ',1)">' + (r.plataforma === 'google' ? 'Guardar y responder' : 'Guardar y copiar') + '</button></div>');
  };
  window.rsGuardarBorrador = function (id, responder) {
    var t = ($('rsEd').value || '').trim(); if (!t) { toast('La respuesta está vacía'); return; }
    R.borradores[id] = t; guardarR(); cerrarModal();
    if (responder) window.rsResponder(id); else { repinta(); toast('Borrador guardado ✓'); }
  };
  function marcar(r, texto, quien) { r.respuesta = texto; r.respondidaPor = quien; delete R.borradores[r.id]; guardarR(); }
  function copiar(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); } catch (e) {}
    return Promise.reject();
  }
  window.rsResponder = function (id) {
    var r = buscar(id); if (!r) return;
    var texto = propuesta(r), G = window.ChispaGoogle;
    if (r.plataforma !== 'google') {
      var abrir = function () { try { window.open(PLAT[r.plataforma].panel, '_blank', 'noopener'); } catch (e) {} };
      copiar(texto).then(function () { toast('📋 Copiada. Pégala en ' + PLAT[r.plataforma].nm); }, function () { toast('Mantén pulsado el texto para copiarlo'); });
      marcar(r, texto, 'copiada para ' + PLAT[r.plataforma].nm); abrir(); repinta(); return;
    }
    if (r.real && G && G.conectado()) {
      toast('Publicando en Google…');
      G.responder(r.id, texto).then(function () { marcar(r, texto, 'publicada en Google'); repinta(); toast('✅ Publicada en tu ficha de Google'); },
        function (e) { toast('No se pudo publicar: ' + e.message); });
      return;
    }
    marcar(r, texto, 'demo'); repinta(); toast('✓ Respondida (ejemplo: con Google conectado se publica en tu ficha)');
  };

  window.rsConectar = function () {
    var G = window.ChispaGoogle;
    if (!G || !G.configurado()) { window.rsQueFalta(true); return; }
    toast('Abriendo Google…');
    G.conectar().then(function (f) { toast('✅ Conectado: ' + (f.titulo || 'tu ficha')); return window.rsCargarGoogle(); },
      function (e) { toast(e.message === 'SIN_CLIENT_ID' ? 'Falta el permiso de Google' : 'Google: ' + e.message); });
  };
  window.rsCargarGoogle = function () {
    var G = window.ChispaGoogle; if (!G || !G.conectado()) return;
    return G.leerResenas().then(function (j) {
      var otras = R.resenas.filter(function (r) { return r.plataforma !== 'google'; });
      R.resenas = j.resenas.concat(otras); reales = true; guardarR();
      autoResponder45(); repinta(); toast('⭐ ' + j.resenas.length + ' reseñas de Google cargadas');
    }, function (e) { toast(e.message); });
  };
  window.rsDesconectar = function () {
    window.ChispaGoogle.desconectar();
    R.resenas = R.resenas.filter(function (r) { return !r.real; }).concat(ejemplos().filter(function (r) { return r.plataforma === 'google'; }));
    reales = false; guardarR(); repinta(); toast('Google desconectado');
  };

  /* Responder solo las 4-5★ de Google, nunca las negativas. */
  function autoResponder45(soloEjemplos) {
    if (!R.auto.auto45) return 0;
    var G = window.ChispaGoogle, n = 0;
    R.resenas.forEach(function (r) {
      if (r.respuesta || r.plataforma !== 'google' || r.estrellas < 4) return;
      var t = propuesta(r);
      if (r.real && G && G.conectado()) { n++; G.responder(r.id, t).then(function () { marcar(r, t, 'automática · publicada en Google'); repinta(); }, function () {}); }
      else if (soloEjemplos && !r.real) { n++; marcar(r, t, 'automática (ejemplo)'); }
    });
    return n;
  }

  var PASOS_GOOGLE =
    '<ol class="pasos">' +
    '<li><b>Ficha de Google de El Paraíso verificada</b>, con Stalin como propietario o administrador. Google pide que la ficha lleve <b>verificada y activa unos 60 días</b> y que tenga web.</li>' +
    '<li><b>Proyecto en Google Cloud</b> (cuenta de Solers) con tres APIs activadas: <i>My Business Account Management</i>, <i>My Business Business Information</i> y <i>Google My Business API</i> (la v4, que es la de las reseñas).</li>' +
    '<li><b>Pedir a Google el acceso a la API de Business Profile</b> con su formulario de solicitud. <b>Este es el permiso que manda:</b> hasta que lo aprueban, la cuota es 0 y nada funciona. Suele tardar de días a un par de semanas.</li>' +
    '<li><b>Pantalla de consentimiento</b> con el permiso <code>business.manage</code>. En modo «prueba» vale para El Paraíso (hasta 100 usuarios añadidos a mano). Para venderlo a otros negocios, Google tiene que <b>verificar la app</b>.</li>' +
    '<li><b>ID de cliente OAuth</b> (aplicación web, origen <code>https://solers-es.github.io</code>). Se pega en <code>conector-google.js</code>. Es público, no es una clave secreta.</li>' +
    '<li>Para que conteste <b>sola aunque la app esté cerrada</b> hace falta además un servidor pequeño con el permiso guardado. FAMA ya lo tiene hecho (<code>api/fama.js</code>); esta demo en GitHub Pages no puede.</li></ol>';

  window.rsQueFalta = function (desdeBoton) {
    modal('<h3>Conectar las reseñas de Google</h3>' +
      (desdeBoton ? '<div class="warn"><b>Todavía no se puede conectar.</b> El conector ya está programado (leer reseñas y publicar respuestas), pero falta que Google dé permiso a Chispa.</div>' : '') +
      '<p style="font-size:13.5px;color:var(--tx2);margin:0 0 6px">Qué hay que pedir a Google, en orden:</p>' + PASOS_GOOGLE +
      '<p style="font-size:12.5px;color:var(--tx3);margin-top:10px"><b style="color:var(--tx2)">TripAdvisor y TheFork</b> no dejan a otras apps contestar reseñas. Ahí Chispa escribe la respuesta, la copia y te abre su panel para pegarla.</p>' +
      '<button class="btn pp" style="width:100%;margin-top:8px" onclick="cerrarModal()">Entendido</button>');
  };

  /* ---------- vista Automatizaciones ---------- */
  var AUTO = {
    proponer: { t: 'Proponer respuesta a cada reseña nueva', d: 'Chispa escribe la respuesta en el tono de tu negocio y en el idioma del cliente. Tú decides si se envía.',
      estado: function () { return ['ya', '✅ Funciona ya']; },
      ya: 'Con todas las reseñas (Google, TripAdvisor, TheFork), con o sin conexión.', falta: 'Nada.' },
    auto45: { t: 'Responder reseñas de 4-5★ automáticamente', d: 'Las buenas de Google se contestan solas. Las de 1-3★ nunca: esas siempre las ves tú antes.',
      estado: function () { return window.ChispaGoogle && window.ChispaGoogle.conectado() ? ['app', '🟡 Funciona con la app abierta'] : ['con', '🔌 Necesita conectar Google']; },
      ya: 'La regla está hecha: solo 4-5★, solo Google, con la respuesta de Chispa. Puedes probarla con los ejemplos.',
      falta: 'El permiso de Google Business Profile (ver «¿Qué hace falta?» en Reseñas). Para que funcione con la app cerrada, un servidor con el permiso guardado (FAMA ya lo tiene).',
      extra: '<button class="btn g sm" style="margin-top:8px" onclick="rsProbar45()">▶ Probar ahora con los ejemplos</button>' },
    negativas: { t: 'Avisarme de reseñas negativas', d: 'Si entra una reseña de 1-3★ te avisa para que contestes tú, rápido y con calma.',
      estado: function () { return ['app', '🟡 Funciona dentro de la app']; },
      ya: 'Al abrir Chispa ves el aviso en rojo y el número en el menú de Reseñas.',
      falta: 'Para que te llegue al móvil por WhatsApp o correo con la app cerrada: el servidor y la conexión de WhatsApp (o un correo de envío). FAMA ya avisa así.' },
    menu11: { t: 'Publicar el menú del día cada mañana a las 11:00', d: 'Chispa monta el post con el menú del día y lo publica en Instagram y Facebook a las 11:00.',
      estado: function () { return ['con', '🔌 Necesita conectar Instagram / Facebook']; },
      ya: 'El texto del menú se prepara aquí (pulsa «Ver cómo queda»).',
      falta: 'Conectar Instagram y Facebook con permiso de Meta para publicar (<code>instagram_content_publish</code>, <code>pages_manage_posts</code>; Meta revisa la app) y un servidor que lo lance a las 11:00: una página web sola no puede despertarse a una hora.',
      extra: '<button class="btn g sm" style="margin-top:8px" onclick="rsMenu()">👀 Ver cómo queda</button>' },
    whatsapp: { t: 'Recordar a los clientes su reserva por WhatsApp', d: 'El día de la reserva, un mensaje: «Te esperamos hoy a las 21:00, ¿sigue en pie?».',
      estado: function () { return ['con', '🔌 Necesita WhatsApp Business y las reservas']; },
      ya: 'El mensaje está redactado (pulsa «Ver el mensaje»).',
      falta: 'WhatsApp Business Platform de Meta (empresa verificada, un número propio y una plantilla de mensaje aprobada por Meta), saber las reservas (TheFork Manager o el sistema de reservas que uséis) y que el cliente haya dado su teléfono para eso.',
      extra: '<button class="btn g sm" style="margin-top:8px" onclick="rsWhats()">💬 Ver el mensaje</button>' }
  };

  function vAutos() {
    var h = '<div class="hd"><h2>🤖 Automatizaciones</h2></div>' +
      '<div class="card" style="background:rgba(255,204,51,.06);border-color:rgba(255,204,51,.25);font-size:13.5px;color:var(--tx2)">Enciende lo que quieras que Chispa haga por ti. Cada una dice <b style="color:var(--tx)">qué funciona ya</b> y <b style="color:var(--tx)">qué permiso falta</b>, sin trampas: si falta una conexión, se queda encendida y empieza sola cuando la conectes.</div>';
    AUTOS.forEach(function (k) {
      var a = AUTO[k], on = !!R.auto[k], es = a.estado();
      var estado = on ? es : ['off', '⏸ Apagada'];
      if (on && es[0] === 'con') estado = ['con', es[1] + ' · se activará al conectar'];
      h += '<div class="au"><div class="au-h"><div class="au-t"><b id="au-' + k + '">' + a.t + '</b><div class="au-d">' + a.d + '</div>' +
        '<span class="au-es ' + estado[0] + '">' + estado[1] + '</span></div>' +
        '<button class="sw2' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-labelledby="au-' + k + '" onclick="rsAuto(\'' + k + '\')"></button></div>' +
        '<div class="au-x"><p><b>Ya funciona:</b> ' + a.ya + '</p><p><b>Falta:</b> ' + a.falta + '</p>' + (a.extra || '') + '</div></div>';
    });
    return h;
  }
  window.rsAuto = function (k) {
    R.auto[k] = !R.auto[k]; guardarR(); repinta();
    var es = AUTO[k].estado();
    toast(R.auto[k] ? (es[0] === 'con' ? '✓ Encendida. Empezará cuando conectes lo que falta' : '✓ Encendida') : 'Apagada');
    if (k === 'auto45' && R.auto[k]) { var n = autoResponder45(false); if (n) toast('🤖 Contestando ' + n + ' reseñas de 4-5★ en Google'); }
  };
  window.rsProbar45 = function () {
    if (!R.auto.auto45) { R.auto.auto45 = true; }
    var n = autoResponder45(true); guardarR(); repinta();
    toast(n ? '🤖 ' + n + ' reseña(s) de 4-5★ de ejemplo contestadas solas. Las negativas no se tocan' : 'No quedan reseñas de 4-5★ de Google sin responder');
  };
  window.rsMenu = function () {
    var m = R.menu;
    modal('<h3>Menú del día · 11:00</h3>' +
      '<label class="lb" for="mn1">Primeros</label><input class="inp" id="mn1" value="' + esc(m.primero) + '">' +
      '<label class="lb" for="mn2" style="margin-top:10px">Segundos</label><input class="inp" id="mn2" value="' + esc(m.segundo) + '">' +
      '<label class="lb" for="mn3" style="margin-top:10px">Postre</label><input class="inp" id="mn3" value="' + esc(m.postre) + '">' +
      '<label class="lb" for="mn4" style="margin-top:10px">Precio</label><input class="inp" id="mn4" value="' + esc(m.precio) + '">' +
      '<button class="btn pp" style="width:100%;margin-top:12px" onclick="rsMenuVer()">Ver el post</button><div id="mnPost"></div>');
  };
  window.rsMenuVer = function () {
    var m = R.menu; m.primero = $('mn1').value; m.segundo = $('mn2').value; m.postre = $('mn3').value; m.precio = $('mn4').value; guardarR();
    var t = '🍲 Menú del día en ' + local() + '\n\n🥗 ' + m.primero + '\n🥘 ' + m.segundo + '\n🍰 ' + m.postre + '\n\nPan, bebida y postre por ' + m.precio + '. ¡Te esperamos desde las 13:00!\n\n#MenúDelDía #Palma #Mallorca';
    $('mnPost').innerHTML = '<div class="rs-prop" style="margin-top:12px"><div class="lbl">Así saldría a las 11:00</div>' + esc(t) + '</div><div class="rs-aviso">Se publicará solo cuando conectes Instagram/Facebook. Mientras, puedes copiarlo.</div>';
  };
  window.rsWhats = function () {
    var t = 'Hola {nombre} 👋 Te recordamos tu reserva hoy en ' + local() + ' a las {hora} para {personas}. ¿Sigue en pie? Responde SÍ para confirmar o NO si no puedes venir. ¡Te esperamos!';
    modal('<h3>Recordatorio de reserva</h3><div class="rs-prop">' + esc(t) + '</div>' +
      '<div class="rs-aviso">Lo que va entre llaves lo rellena Chispa con cada reserva. Meta tiene que aprobar este texto como plantilla antes de poder enviarlo.</div>' +
      '<button class="btn pp" style="width:100%;margin-top:12px" onclick="cerrarModal()">Entendido</button>');
  };

  /* ---------- arranque ---------- */
  pintarNav();
  var hs = location.hash || '';
  if (hs.indexOf('resenas') >= 0 || hs.indexOf('automatizaciones') >= 0) {
    vista('panel'); window.panel(hs.indexOf('resenas') >= 0 ? 'resenas' : 'automatizaciones');
  }
}());
