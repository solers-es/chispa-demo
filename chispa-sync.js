/* =====================================================================
   Chispa · sincronización con el servidor (trabajador F)
   ---------------------------------------------------------------------
   Lo que pidió Stalin: «una vez Chispa esté enlazado con todas las
   plataformas, que en todas las páginas y en el teléfono se vea
   actualizado sin volver a enlazarlo».

   Cómo:
     · Al abrir, descarga del servidor el estado del negocio y lo pone en
       la página (S, reseñas…). Cada cambio se sube con su número de
       versión; si otro dispositivo guardó antes, se juntan los dos.
     · Vuelve a mirar al volver a la pestaña y cada ~15 s (solo con la
       pestaña a la vista, para no gastar).
     · Las conexiones con Google, YouTube, Instagram/Facebook y TikTok
       viven en el servidor (tokens cifrados que nunca bajan aquí): se
       conectan UNA vez y valen para todos los dispositivos.
     · Sin servidor configurado → MODO DEMOSTRACIÓN: todo sigue en
       localStorage como hasta ahora, y Conexiones lo dice.

   Configuración (una de las tres):
     1) en index.html:  window.CHISPA_SERVIDOR = "https://chispa-api.<cuenta>.workers.dev"
     2) abrir una vez la página con ?servidor=https://…  (se recuerda)
     3) localStorage «chispa_servidor»
   Entrar en el móvil sin teclear: enlace «#acceso=<negocio>.<código>» que
   da el botón «Enlazar otro móvil» (código de 15 min y un solo uso).

   API para el resto de módulos (window.ChispaSync):
     ChispaSync.vincular(doc, claveLocalStorage, alLlegar?)  sincroniza una clave de localStorage
     ChispaSync.guardar(doc, datos)     guarda un documento propio y lo sube
     ChispaSync.leer(doc)               lo último que hay de ese documento
     ChispaSync.suscribir(doc, fn)      fn(datos, {origen:"servidor"}) cuando llega un cambio de fuera
     ChispaSync.api(red, metodo, url, cuerpo)  el servidor llama a la API de la red con SU token
     ChispaSync.conexiones()            promesa con las redes conectadas (sin tokens)
     ChispaSync.conectar(red)           abre el permiso de Google/YouTube/Meta/TikTok
     ChispaSync.estado()                {modo:"demostracion"|"sin-sesion"|"servidor", negocio, nombre, esAdministrador}
     ChispaSync.esAdministrador() · ChispaSync.negocioActual() · ChispaSync.sincronizarAhora()
   Cómo engancha cada módulo: docs/SERVIDOR-CHISPA.md, apartado «Enganches».

   No toca chispa-agenda.js, sectores.js ni mi-negocio.js: envuelve panel()
   para añadir su tarjeta en «Conexiones», y vigila localStorage.setItem
   para saber cuándo se ha guardado algo (S lo guarda guardar()).
   Nada de FileReader (el iPhone de Stalin no lo tiene).
   ===================================================================== */
(function () {
  'use strict';
  if (window.ChispaSync) return;

  var LS_SERVIDOR = 'chispa_servidor', LS_SESION = 'chispa_sesion', LS_META = 'chispa_sync_meta';
  var CADA_MS = 15000;
  var REDES = [
    { id: 'meta', ic: '📸', nm: 'Instagram y Facebook', guia: ['instagram', 'facebook'] },
    { id: 'google', ic: '📍', nm: 'Google (ficha del negocio)', guia: ['google'] },
    { id: 'youtube', ic: '▶️', nm: 'YouTube', guia: ['youtube'] },
    { id: 'tiktok', ic: '🎵', nm: 'TikTok', guia: ['tiktok'] }
  ];

  /* ---------------- utilidades ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return (s == null ? '' : '' + s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(m) { try { if (typeof window.toast === 'function') window.toast(m); } catch (e) {} }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsJson(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  var escribiendo = false; // true mientras ESTE fichero escribe en localStorage (no cuenta como cambio del usuario)
  function lsSet(k, v) { escribiendo = true; try { localStorage.setItem(k, v); return true; } catch (e) { return false; } finally { escribiendo = false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function txt(o) { return JSON.stringify(o === undefined ? null : o); }
  function igual(a, b) { return txt(a) === txt(b); }
  function copia(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function esObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function horaCorta(t) { if (!t) return ''; var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2); }

  /* ---------------- configuración ---------------- */
  (function leerParametro() {
    try {
      var p = new URLSearchParams(location.search).get('servidor');
      if (p === 'no') { lsDel(LS_SERVIDOR); return; }
      if (p && (/^https:\/\//.test(p) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(p))) lsSet(LS_SERVIDOR, p.replace(/\/$/, ''));
    } catch (e) {}
  })();
  function servidor() { return String(window.CHISPA_SERVIDOR || lsGet(LS_SERVIDOR) || '').replace(/\/$/, ''); }
  var SES = lsJson(LS_SESION);
  if (SES && SES.servidor !== servidor()) SES = null; // la sesión es de otro servidor
  function guardarSesion(s) { SES = s; if (s) lsSet(LS_SESION, JSON.stringify(s)); else lsDel(LS_SESION); }

  /* ---------------- llamadas al servidor ---------------- */
  function llamar(metodo, ruta, cuerpo) {
    var h = { 'Content-Type': 'application/json' };
    if (SES && SES.sesion) h.Authorization = 'Bearer ' + SES.sesion;
    return fetch(servidor() + ruta, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), cache: 'no-store' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401 && SES && ruta !== '/sesion') { guardarSesion(null); ponerPublicador(); repintar(); }
          if (!r.ok) { var e = new Error(j.error || ('Error ' + r.status)); e.status = r.status; e.datos = j; throw e; }
          return j;
        });
      });
  }

  /* ---------------- documentos ---------------- */
  var VIGILADAS = {}; // clave de localStorage → documento
  var cola = Promise.resolve(), temporizadores = {}, ultimo = { cuando: 0, error: '' }, pendienteRepintar = false;
  // meta en memoria POR PESTAÑA (version + copia base); se guarda en localStorage solo para la próxima vez
  var META = (function () { var m = lsJson(LS_META); return m && m.servidor === servidor() && SES && m.negocio === SES.negocio ? m : { servidor: servidor(), negocio: SES && SES.negocio, docs: {} }; })();
  function guardarMeta() {
    META.servidor = servidor(); META.negocio = SES && SES.negocio;
    if (!lsSet(LS_META, JSON.stringify(META))) { // sin sitio: se guarda sin las copias base
      var ligera = { servidor: META.servidor, negocio: META.negocio, docs: {} };
      for (var d in META.docs) ligera.docs[d] = { version: META.docs[d].version };
      lsSet(LS_META, JSON.stringify(ligera));
    }
  }
  var DOCS = {}; // nombre → {leer(), aplicar(datos), subs[]}
  function registrar(doc, def) { DOCS[doc] = { leer: def.leer, aplicar: def.aplicar, subs: (DOCS[doc] && DOCS[doc].subs) || [] }; if (!META.docs[doc]) META.docs[doc] = { version: 0, base: null }; }

  // S, el estado principal del panel (index.html: KEY = "chispa_proto_v1")
  registrar('principal', {
    leer: function () { return typeof S !== 'undefined' ? S : lsJson('chispa_proto_v1'); },
    aplicar: function (d) {
      if (typeof S === 'undefined' || !esObj(d)) return;
      d = conservarLocales(d, S);
      for (var k in S) if (!(k in d)) delete S[k];
      for (var j in d) S[j] = d[j];
      lsSet(typeof KEY !== 'undefined' ? KEY : 'chispa_proto_v1', JSON.stringify(S));
    }
  });
  // Reseñas (resenas.js guarda en «chispa_resenas_v1»)
  vincular('resenas', 'chispa_resenas_v1');

  /* Lo que solo vale en ESTE aparato (blob: de fotos en memoria) no se copia de otro */
  function conservarLocales(remoto, local) {
    if (!esObj(remoto)) return remoto;
    var o = {};
    for (var k in remoto) {
      var v = remoto[k], l = local && local[k];
      if (typeof v === 'string' && v.indexOf('blob:') === 0) { if (l !== undefined) o[k] = l; continue; }
      o[k] = esObj(v) ? conservarLocales(v, esObj(l) ? l : {}) : v;
    }
    return o;
  }

  function vincular(doc, clave, alLlegar) {
    VIGILADAS[clave] = doc;
    registrar(doc, {
      leer: function () { return lsJson(clave); },
      aplicar: function (d) { lsSet(clave, JSON.stringify(d)); if (alLlegar) try { alLlegar(d); } catch (e) {} }
    });
    if (activo()) programarSubida(doc, 50);
  }
  function guardarDoc(doc, datos) {
    if (!DOCS[doc]) vincular(doc, 'chispa_doc_' + doc);
    lsSet('chispa_doc_' + doc, JSON.stringify(datos));
    programarSubida(doc);
  }
  function leerDoc(doc) { return DOCS[doc] ? copia(DOCS[doc].leer()) : lsJson('chispa_doc_' + doc); }
  function suscribir(doc, fn) { if (!DOCS[doc]) vincular(doc, 'chispa_doc_' + doc); DOCS[doc].subs.push(fn); return function () { DOCS[doc].subs = DOCS[doc].subs.filter(function (f) { return f !== fn; }); }; }

  /* Vigila localStorage.setItem: cuando un módulo guarda, se sube (con un poco de espera) */
  try {
    var setOriginal = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      setOriginal.call(this, k, v);
      try {
        if (escribiendo || this !== window.localStorage) return;
        if (k === (typeof KEY !== 'undefined' ? KEY : 'chispa_proto_v1')) programarSubida('principal');
        else if (VIGILADAS[k]) programarSubida(VIGILADAS[k]);
      } catch (e) {}
    };
  } catch (e) {}

  /* ---------------- juntar cambios (tres vías) ---------------- */
  // base = lo último que ambos tenían; local = este aparato; remoto = el servidor.
  // Cambió solo uno → gana ese. Cambiaron los dos → se baja por dentro; listas con «id» se juntan por id.
  // Si los dos cambiaron EXACTAMENTE lo mismo de forma distinta, gana este aparato (es lo último que se ha tocado aquí).
  function fusionar(b, l, r) {
    if (igual(l, r)) return copia(l);
    if (igual(b, l)) return copia(r);
    if (igual(b, r)) return copia(l);
    if (esObj(l) && esObj(r)) {
      var o = {}, bb = esObj(b) ? b : {}, k, ks = {};
      for (k in r) ks[k] = 1; for (k in l) ks[k] = 1;
      for (k in ks) {
        var enL = k in l, enR = k in r;
        if (!enL) { if (k in bb && igual(bb[k], r[k])) continue; o[k] = copia(r[k]); continue; } // borrado aquí
        if (!enR) { if (k in bb && igual(bb[k], l[k])) continue; o[k] = copia(l[k]); continue; } // borrado allí
        o[k] = fusionar(bb[k], l[k], r[k]);
      }
      return o;
    }
    if (Array.isArray(l) && Array.isArray(r) && conId(l) && conId(r)) {
      var bi = indice(Array.isArray(b) && conId(b) ? b : []), li = indice(l), ri = indice(r), out = [], vistos = {};
      r.concat(l).forEach(function (x) {
        var id = x.id; if (vistos[id]) return; vistos[id] = 1;
        var B = bi[id], L = li[id], R = ri[id];
        if (!L) { if (B && igual(B, R)) return; out.push(copia(R)); return; }
        if (!R) { if (B && igual(B, L)) return; out.push(copia(L)); return; }
        out.push(fusionar(B, L, R));
      });
      return out;
    }
    return copia(l);
  }
  function conId(a) { return a.every(function (x) { return esObj(x) && x.id != null; }); }
  function indice(a) { var o = {}; a.forEach(function (x) { o[x.id] = x; }); return o; }

  /* ---------------- ciclo de sincronización ---------------- */
  function activo() { return !!(servidor() && SES && SES.sesion); }
  function enSerie(fn) { cola = cola.then(fn, fn).catch(function () {}); return cola; }
  function programarSubida(doc, ms) {
    if (!activo() || !DOCS[doc]) return;
    clearTimeout(temporizadores[doc]);
    temporizadores[doc] = setTimeout(function () { enSerie(function () { return sincronizarDoc(doc); }); }, ms == null ? 700 : ms);
  }
  function pendiente(doc) { var m = META.docs[doc]; return !m || m.base == null ? false : txt(DOCS[doc].leer()) !== m.base; }

  function aplicarRemoto(doc, datos, version) {
    var d = DOCS[doc], antes = txt(d.leer());
    d.aplicar(copia(datos));
    META.docs[doc] = { version: version, base: txt(d.leer()) };
    guardarMeta();
    if (antes !== META.docs[doc].base) {
      d.subs.forEach(function (fn) { try { fn(copia(datos), { origen: 'servidor' }); } catch (e) {} });
      if (doc === 'principal') { pendienteRepintar = true; repintarSiSePuede(); }
      return true;
    }
    return false;
  }

  function sincronizarDoc(doc) {
    if (!activo() || !DOCS[doc]) return Promise.resolve();
    var m = META.docs[doc] || (META.docs[doc] = { version: 0, base: null });
    return llamar('GET', '/estado/' + encodeURIComponent(doc) + (m.version && m.base != null ? '?v=' + m.version : ''))
      .then(function (r) {
        if (r.sinCambios) return pendiente(doc) ? subir(doc, 0) : null;
        var local = DOCS[doc].leer();
        if (!r.version) { // el servidor aún no tiene nada: se sube lo de este aparato
          if (local == null) return null;
          m.version = 0; if (m.base == null) m.base = 'null';
          return subir(doc, 0);
        }
        if (m.base == null) { // primera vez en este aparato: manda lo del servidor
          if (aplicarRemoto(doc, r.datos, r.version)) aviso('☁️ Datos del negocio traídos del servidor');
          return null;
        }
        if (!pendiente(doc)) { if (aplicarRemoto(doc, r.datos, r.version)) aviso('🔄 Actualizado desde otro dispositivo'); return null; }
        var junto = fusionar(JSON.parse(m.base), local, r.datos);
        aplicarRemoto(doc, junto, r.version);
        META.docs[doc].base = txt(r.datos); // la base es lo del servidor; lo juntado queda pendiente de subir
        return subir(doc, 0);
      })
      .then(function () { ultimo = { cuando: Date.now(), error: '' }; pintarEstadoCorto(); },
        function (e) { ultimo = { cuando: ultimo.cuando, error: e.message || 'sin conexión' }; pintarEstadoCorto(); });
  }
  function subir(doc, intento) {
    var m = META.docs[doc], datos = DOCS[doc].leer(), envio = txt(datos);
    return llamar('PUT', '/estado/' + encodeURIComponent(doc), { base: m.version || 0, datos: datos })
      .then(function (r) { m.version = r.version; m.base = envio; guardarMeta(); })
      .catch(function (e) {
        if (e.status !== 409 || intento > 3) throw e;
        var srv = e.datos || {}, junto = fusionar(m.base ? JSON.parse(m.base) : null, DOCS[doc].leer(), srv.datos);
        aplicarRemoto(doc, junto, srv.version);
        META.docs[doc].base = txt(srv.datos);
        aviso('🔀 Juntados tus cambios con los de otro dispositivo');
        return subir(doc, intento + 1);
      });
  }
  function sincronizarTodo() {
    if (!activo()) return Promise.resolve();
    return enSerie(function () { return Object.keys(DOCS).reduce(function (p, d) { return p.then(function () { return sincronizarDoc(d); }); }, Promise.resolve()); });
  }

  /* Repintar sin romper lo que el usuario está escribiendo */
  function editando() {
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    var mo = $('modalOv'); return !!(mo && mo.classList.contains('on'));
  }
  function repintarSiSePuede() {
    if (!pendienteRepintar || editando()) return;
    pendienteRepintar = false;
    try { if (typeof aplicarMarca === 'function') aplicarMarca(); } catch (e) {}
    try {
      if ($('app') && $('app').classList.contains('on') && typeof window.panel === 'function' && typeof TAB !== 'undefined') window.panel(TAB);
      else if ($('estudioApp') && $('estudioApp').classList.contains('on') && typeof estudio === 'function' && typeof ETAB !== 'undefined') estudio(ETAB);
    } catch (e) {}
  }
  document.addEventListener('focusout', function () { setTimeout(repintarSiSePuede, 300); });
  document.addEventListener('click', function () { setTimeout(repintarSiSePuede, 400); });

  /* ---------------- conexiones ---------------- */
  var CONEX = null; // última lista del servidor
  function cargarConexiones() {
    if (!activo()) { CONEX = null; ponerPublicador(); return Promise.resolve([]); }
    return llamar('GET', '/conexiones').then(function (j) { CONEX = j.conexiones || []; ponerPublicador(); repintarTarjeta(); return CONEX; }, function () { return CONEX || []; });
  }
  function conexion(red) { return (CONEX || []).filter(function (c) { return c.red === red; })[0]; }
  function conectar(red) {
    if (!activo()) { aviso('Primero entra con tu código de acceso'); return Promise.resolve(); }
    var volver = location.origin + location.pathname;
    return llamar('POST', '/conectar/' + red, { volver: volver }).then(function (j) { location.href = j.url; }, function (e) { aviso('No se pudo empezar: ' + e.message); });
  }
  function desconectar(red) {
    if (!confirm('¿Desconectar ' + red + ' en el servidor? Dejará de publicar en todos tus dispositivos.')) return;
    llamar('DELETE', '/conexiones/' + red).then(function () { aviso('Desconectado'); cargarConexiones(); }, function (e) { aviso(e.message); });
  }
  function elegirPagina(id) {
    llamar('POST', '/conexiones/meta/pagina', { id: id }).then(function (j) { aviso('Página elegida: ' + j.cuenta); cargarConexiones(); }, function (e) { aviso(e.message); });
  }
  function api(red, metodo, url, cuerpo) {
    if (!activo()) return Promise.reject(new Error('Sin servidor: modo demostración'));
    return llamar('POST', '/api/' + red, { metodo: metodo || 'GET', url: url, cuerpo: cuerpo });
  }
  /* El publicador de la agenda y del Estudio (chispa-agenda.js / chispa-estudio.js) usa window.CHISPA_PUBLICADOR */
  function ponerPublicador() {
    var PD = window.CHISPA_PUBLICADOR;
    if (PD && !PD._sync) return; // alguien lo configuró a mano: se respeta
    var redes = [];
    (CONEX || []).forEach(function (c) { if (c.estado === 'conectada') redes = redes.concat(c.publica || []); });
    if (!activo() || !redes.length) { if (PD && PD._sync) delete window.CHISPA_PUBLICADOR; return; }
    var b = servidor();
    window.CHISPA_PUBLICADOR = { _sync: true, base: b, url: b + '/publicar?s=' + encodeURIComponent(SES.sesion), clave: SES.sesion,
      conectada: function (id) { return redes.indexOf(id) >= 0; } };
  }

  /* ---------------- entrar / salir ---------------- */
  function entrar(negocio, codigo) {
    if (!servidor()) return Promise.reject(new Error('No hay servidor configurado'));
    return llamar('POST', '/sesion', { negocio: negocio, codigo: codigo }).then(function (j) {
      guardarSesion({ servidor: servidor(), sesion: j.sesion, negocio: j.negocio, nombre: j.nombre, rol: j.rol, esAdministrador: !!j.esAdministrador });
      META = { servidor: servidor(), negocio: j.negocio, docs: {} };
      Object.keys(DOCS).forEach(function (d) { META.docs[d] = { version: 0, base: null }; });
      guardarMeta();
      aviso('☁️ Conectado en el servidor · ' + j.nombre);
      return sincronizarTodo().then(cargarConexiones).then(function () { repintarTarjeta(); return j; });
    });
  }
  function salir() {
    var fin = function () { guardarSesion(null); lsDel(LS_META); META = { servidor: servidor(), docs: {} }; Object.keys(DOCS).forEach(function (d) { META.docs[d] = { version: 0, base: null }; }); CONEX = null; ponerPublicador(); repintarTarjeta(); aviso('Has salido en este dispositivo'); };
    if (!activo()) return fin();
    llamar('DELETE', '/sesion').then(fin, fin);
  }
  function enlazarMovil(rol) {
    if (!rol) {
      var q = '<h3>📱 Enlazar otro móvil</h3><p style="color:var(--tx2);font-size:14px">¿Para quién es?</p>' +
        '<button class="btn pp" style="width:100%" onclick="ChispaSync._enlazar(\'dueno\')">Para mí (dueño: puede conectar redes)</button>' +
        '<button class="btn g" style="width:100%;margin-top:8px" onclick="ChispaSync._enlazar(\'equipo\')">Para alguien del equipo (usa Chispa, no toca las conexiones)</button>';
      if (typeof window.modal === 'function') { window.modal(q); return; }
      rol = 'equipo';
    }
    llamar('POST', '/enlace', { rol: rol }).then(function (j) {
      var enlace = location.origin + location.pathname + '#acceso=' + encodeURIComponent(j.negocio) + '.' + encodeURIComponent(j.codigo);
      var html = '<h3>📱 Enlazar otro móvil</h3><p style="color:var(--tx2);font-size:14px">Abre este enlace en el otro móvil u ordenador (por WhatsApp a ti mismo, por ejemplo). Entra solo, sin volver a conectar las redes. Vale <b>' + j.minutos + ' minutos</b> y <b>una sola vez</b>.</p>' +
        '<input id="csEnlace" readonly value="' + esc(enlace) + '" style="width:100%;font-size:13px" onclick="this.select()">' +
        '<p style="font-size:13px;color:var(--tx3)">O escribe a mano: negocio <b>' + esc(j.negocio) + '</b> · código <b>' + esc(j.codigo) + '</b></p>' +
        '<button class="btn pp" style="width:100%;margin-top:6px" onclick="ChispaSync._compartir()">Compartir enlace</button>';
      if (typeof window.modal === 'function') window.modal(html); else prompt('Enlace para el otro móvil', enlace);
    }, function (e) { aviso(e.message); });
  }
  function compartir() {
    var v = ($('csEnlace') || {}).value || '';
    if (navigator.share) { navigator.share({ title: 'Chispa', text: 'Entra en Chispa', url: v }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(v).then(function () { aviso('Enlace copiado ✓'); }); } catch (e) { aviso('Copia el enlace a mano'); }
  }

  /* ---------------- tarjeta en «Conexiones» ---------------- */
  function tarjetaHtml() {
    if (!servidor()) {
      return '<div class="card" id="chispaSyncCard" style="border-color:rgba(255,204,51,.45)"><h3 style="margin:0 0 6px">🧪 Modo demostración</h3>' +
        '<div style="font-size:14px;color:var(--tx2)">Lo que haces se guarda <b>solo en este navegador</b>. En el móvil o en otro ordenador no se ve, y las redes no quedan enlazadas. ' +
        'Para que valga en <b>todos tus dispositivos</b> hace falta el servidor de Chispa (ya está programado; falta ponerlo en marcha: <code>docs/SERVIDOR-CHISPA.md</code>).</div></div>';
    }
    if (!activo()) {
      return '<div class="card" id="chispaSyncCard"><h3 style="margin:0 0 6px">☁️ Entra en tu negocio</h3>' +
        '<div style="font-size:14px;color:var(--tx2);margin-bottom:8px">Escribe tu código de acceso una vez en este aparato. Después todo se guarda en el servidor y vale para todos tus dispositivos.</div>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap"><input id="csNegocio" placeholder="Negocio (ej. el-paraiso)" value="' + esc(window.CHISPA_NEGOCIO || 'el-paraiso') + '" style="flex:1;min-width:140px" autocapitalize="off">' +
        '<input id="csCodigo" placeholder="Código: ABCD-EFGH-JKLM" style="flex:1;min-width:160px" autocapitalize="characters">' +
        '<button class="btn pp sm" style="flex:none" onclick="ChispaSync._entrarForm()">Entrar</button></div><div id="csError" style="color:#ff6b6b;font-size:13px;margin-top:6px"></div></div>';
    }
    var h = '<div class="card" id="chispaSyncCard" style="border-color:rgba(52,211,153,.5);background:linear-gradient(180deg,rgba(52,211,153,.08),var(--panel))">' +
      '<h3 style="margin:0 0 4px">☁️ Conectado en el servidor · vale para todos tus dispositivos</h3>' +
      '<div style="font-size:13px;color:var(--tx2)">Negocio: <b>' + esc(SES.nombre || SES.negocio) + '</b> · ' + (SES.esAdministrador ? 'dueño' : 'equipo') +
      ' · <span id="csCorto">' + estadoCorto() + '</span></div>';
    var cuentas = window.ChispaCuentas;
    try { if (cuentas && typeof cuentas.negocioActual === 'function') { var na = cuentas.negocioActual(), id = na && (na.id || na); if (id && id !== SES.negocio) h += '<div style="color:#ffcc33;font-size:13px;margin-top:4px">⚠️ Estás viendo «' + esc(id) + '» pero este aparato está entrado en «' + esc(SES.negocio) + '».</div>'; } } catch (e) {}
    h += '<div style="margin-top:10px;display:grid;gap:8px">';
    REDES.forEach(function (r) {
      var c = conexion(r.id), est = !c ? 'Sin conectar' : c.estado === 'conectada' ? '✓ Conectada' : '⚠️ Hay que volver a conectar';
      h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--bd,rgba(255,255,255,.12));border-radius:10px">' +
        '<span style="flex:1;min-width:160px"><b>' + r.ic + ' ' + esc(r.nm) + '</b><br><span style="font-size:12px;color:var(--tx3)">' + est + (c && c.cuenta ? ' · ' + esc(c.cuenta) : '') + (c && c.detalle && c.detalle.aviso ? '<br>' + esc(c.detalle.aviso) : '') + '</span></span>';
      if (SES.esAdministrador) {
        h += '<button class="btn ' + (c && c.estado === 'conectada' ? 'g' : 'pp') + ' sm" style="flex:none" onclick="ChispaSync.conectar(\'' + r.id + '\')">' + (c ? 'Volver a conectar' : 'Conectar') + '</button>';
        if (c) h += '<button class="btn g sm" style="flex:none" onclick="ChispaSync._desconectar(\'' + r.id + '\')">Quitar</button>';
      }
      h += '</div>';
      if (r.id === 'meta' && c && c.detalle && c.detalle.paginas && c.detalle.paginas.length > 1 && SES.esAdministrador) {
        h += '<label style="font-size:13px;color:var(--tx2)">Página de Facebook: <select onchange="ChispaSync._pagina(this.value)">' + c.detalle.paginas.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === c.detalle.elegida ? ' selected' : '') + '>' + esc(p.nombre + (p.instagram ? ' · @' + p.instagram : '')) + '</option>'; }).join('') + '</select></label>';
      }
    });
    h += '</div><div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">' +
      (SES.esAdministrador ? '<button class="btn pp sm" style="flex:none" onclick="ChispaSync._enlazar()">📱 Enlazar otro móvil</button>' : '') +
      '<button class="btn g sm" style="flex:none" onclick="ChispaSync.sincronizarAhora()">🔄 Sincronizar ahora</button>' +
      '<button class="btn g sm" style="flex:none" onclick="ChispaSync.salir()">Salir de este aparato</button></div></div>';
    return h;
  }
  function estadoCorto() {
    if (ultimo.error) return '⚠️ ' + esc(ultimo.error) + ' (se reintenta solo)';
    return ultimo.cuando ? 'al día · ' + horaCorta(ultimo.cuando) : 'sincronizando…';
  }
  function pintarEstadoCorto() { var e = $('csCorto'); if (e) e.innerHTML = estadoCorto(); }
  function enConexiones() { return typeof TAB !== 'undefined' && TAB === 'conectar' && $('app') && $('app').classList.contains('on'); }
  function repintarTarjeta() {
    if (!enConexiones()) return;
    var main = $('main'); if (!main) return;
    var vieja = $('chispaSyncCard'), div = document.createElement('div');
    div.innerHTML = tarjetaHtml();
    var nueva = div.firstChild;
    if (vieja) vieja.parentNode.replaceChild(nueva, vieja);
    else { var hd = main.querySelector('.hd'); if (hd && hd.nextSibling) main.insertBefore(nueva, hd.nextSibling); else main.insertBefore(nueva, main.firstChild); }
    marcarGuias();
  }
  // En cada tarjeta de la guía (cx_instagram, cx_google…) dice si el servidor ya tiene esa red
  function marcarGuias() {
    if (!activo()) return;
    REDES.forEach(function (r) {
      var c = conexion(r.id);
      r.guia.forEach(function (g) {
        var el = $('cx_' + g); if (!el) return;
        var x = el.querySelector('.cs-srv'); if (!x) { x = document.createElement('div'); x.className = 'cs-srv'; x.style.cssText = 'font-size:13px;margin-top:8px;font-weight:600'; el.appendChild(x); }
        x.textContent = c && c.estado === 'conectada' ? '☁️ Conectada en el servidor · vale para todos tus dispositivos' : '☁️ Aún no conectada en el servidor';
        x.style.color = c && c.estado === 'conectada' ? '#34d399' : 'var(--tx3)';
      });
    });
  }
  function repintar() { repintarTarjeta(); }

  /* Envuelve panel() (después de mi-negocio.js) para añadir la tarjeta en «Conexiones» */
  var panelPrevio = window.panel;
  if (typeof panelPrevio === 'function') {
    window.panel = function (tab) {
      var r = panelPrevio.apply(this, arguments);
      if (tab === 'conectar') { repintarTarjeta(); if (activo()) cargarConexiones(); }
      return r;
    };
  }

  /* ---------------- enlaces que llegan por la dirección (#acceso=…, #conectar-ok-…) ---------------- */
  function leerHash() {
    var h = location.hash || '', m;
    if ((m = h.match(/^#acceso=([^.&]+)\.([^&]+)/))) {
      history.replaceState(null, '', location.pathname + location.search + '#conectar');
      if (!servidor()) { aviso('Este enlace necesita el servidor de Chispa'); return; }
      entrar(decodeURIComponent(m[1]), decodeURIComponent(m[2])).catch(function (e) { aviso('No se pudo entrar: ' + e.message); });
      return true;
    }
    if ((m = h.match(/^#conectar-(ok|error)-([a-z]+)(?:-(.*))?$/))) {
      history.replaceState(null, '', location.pathname + location.search + '#conectar');
      var nm = (REDES.filter(function (r) { return r.id === m[2]; })[0] || { nm: m[2] }).nm;
      if (m[1] === 'ok') aviso('✓ ' + nm + ' conectado en el servidor: vale para todos tus dispositivos');
      else aviso('No se pudo conectar ' + nm + ': ' + decodeURIComponent(m[3] || ''));
      try { if (typeof vista === 'function') vista('panel'); window.panel('conectar'); } catch (e) {}
    }
  }

  /* ---------------- arranque ---------------- */
  function tick() { if (document.visibilityState === 'hidden') return; sincronizarTodo().then(repintarSiSePuede); if (enConexiones()) cargarConexiones(); }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { tick(); cargarConexiones(); } });
  window.addEventListener('focus', tick);
  window.addEventListener('online', tick);
  window.addEventListener('pagehide', function () { guardarMeta(); });
  setInterval(tick, CADA_MS);

  window.ChispaSync = {
    vincular: vincular, guardar: guardarDoc, leer: leerDoc, suscribir: suscribir,
    api: api, conexiones: function () { return cargarConexiones(); }, conectar: conectar,
    entrar: entrar, salir: salir, sincronizarAhora: function () { aviso('Sincronizando…'); return sincronizarTodo().then(function () { repintarSiSePuede(); return cargarConexiones(); }); },
    estado: function () { return { modo: !servidor() ? 'demostracion' : !activo() ? 'sin-sesion' : 'servidor', servidor: servidor(), negocio: SES && SES.negocio, nombre: SES && SES.nombre, esAdministrador: !!(SES && SES.esAdministrador), ultimo: ultimo }; },
    esAdministrador: function () { return !!(SES && SES.esAdministrador); },
    negocioActual: function () { return SES ? { id: SES.negocio, nombre: SES.nombre } : null; },
    _fusionar: fusionar,
    _entrarForm: function () {
      var n = ($('csNegocio') || {}).value || '', c = ($('csCodigo') || {}).value || '', er = $('csError');
      if (er) er.textContent = '';
      entrar(n.trim(), c.trim()).catch(function (e) { if (er) er.textContent = e.message; });
    },
    _desconectar: desconectar, _pagina: elegirPagina, _enlazar: enlazarMovil, _compartir: compartir
  };

  if (!leerHash() && activo()) { sincronizarTodo().then(cargarConexiones); }
  if (enConexiones()) repintarTarjeta();
})();
