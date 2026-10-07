/* ──────────────────────────────────────────────────────────────────────────
   Chispa · CUENTAS: modo Solers (administrador) y modo cliente — trabajador E

   ⚠️ IMPORTANTE: hoy Chispa es una web estática SIN SERVIDOR. Esta separación
   entre negocios es de PANTALLA: sirve para enseñar y para el flujo, NO es
   seguridad real. Cualquiera con conocimientos puede saltársela, y los datos
   viven en el navegador de cada aparato (localStorage).

   Todo pasa por window.ChispaCuentas. Sus funciones devuelven PROMESAS para
   que mañana se cambie el «almacén» de localStorage por un servidor con
   cuentas de verdad (p. ej. Supabase: un usuario por cliente y reglas por
   fila) sin tocar las pantallas:
     listarNegocios()            → Promise<[negocio]>   (cliente: solo el suyo)
     crearNegocio({nombre, sectorId, ejemplo})
     darAcceso(id)               → Promise<{codigo, enlace}>
     activar(id, si)             → activar / desactivar el acceso
     negocioActual()             → Promise<negocio>
     entrar(id)                  → abre ese negocio (guarda el actual aparte)
     esAdministrador()           → true/false (Solers)
   Lecturas al momento (caché local): idActual(), adminUI(), esCliente().

   Entrar en modo Solers: añadir ?admin a la dirección. La primera vez se crea
   una clave que se guarda SOLO en ese navegador (resumen SHA-256, nunca en el
   código). Un aparato abierto con un enlace de cliente no puede entrar.

   Cada negocio guarda TODAS sus claves «chispa…» de localStorage aparte
   (chispa_neg_<id>); al cambiar de negocio se guardan las del actual y se
   ponen las del otro. Los datos de El Paraíso no se borran nunca.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (!window.S || !window.TABS) return;

  var REG_KEY = 'chispa_cuentas_v1', ADMIN_OK = 'chispa_admin_ok', ADMIN_CLAVE = 'chispa_admin_clave', VISTA_CLI = 'chispa_sesion_vistacliente';
  var MAIN_KEY = window.KEY || 'chispa_proto_v1', RES_KEY = 'chispa_resenas_v1';
  var PROPIAS = /^chispa_(cuentas|admin|neg_|sesion)/;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } return true; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } return true; }
  function SEC() { return window.ChispaSector; }
  function perfil(id) { var s = SEC(); return (s && (s.get(id) || s.get('restaurante'))) || { id: 'restaurante', nombre: 'Restaurante y bar', icono: '🍽️', corto: 'restaurante', cambia: false }; }
  function azar(n) { var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = ''; for (var i = 0; i < n; i++) s += a.charAt(Math.floor(Math.random() * a.length)); return s; }
  function slug(s) { return (s || 'negocio').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'negocio'; }

  /* ---------- registro de negocios (hoy en localStorage; mañana, el servidor) ---------- */
  function leerReg() { try { return JSON.parse(ls(REG_KEY)) || null; } catch (e) { return null; } }
  function guardarReg(r) { ls(REG_KEY, JSON.stringify(r)); }
  function regInicial() {
    var r = { v: 1, actual: 'paraiso', cliente: null, negocios: [
      { id: 'paraiso', nombre: 'El Paraíso Bar Restaurante', sectorId: 'restaurante', ejemplo: false, primero: true, activo: true, acceso: null, creado: '2026-10-07' }
    ] };
    var s = SEC();
    if (s) s.lista().filter(function (p) { return p.cambia; }).forEach(function (p) {
      r.negocios.push({ id: 'ej-' + p.id, nombre: p.ejemplo.nombre, sectorId: p.id, ejemplo: true, activo: true, acceso: null, creado: '2026-10-07' });
    });
    return r;
  }
  var REG = leerReg();
  function buscar(id) { for (var i = 0; REG && i < REG.negocios.length; i++) if (REG.negocios[i].id === id) return REG.negocios[i]; return null; }
  function esCliente() { return !!(REG && REG.cliente); }
  function esAdministrador() { return !esCliente() && ls(ADMIN_OK) === '1'; }
  function adminUI() { return esAdministrador() && ss(VISTA_CLI) !== '1'; }
  function idActual() { return (REG && REG.actual) || 'paraiso'; }

  /* ---------- estado nuevo de un negocio, con todo lo de su sector ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function estadoNuevo(e) {
    var P = perfil(e.sectorId), st = (typeof window.nuevo === 'function') ? window.nuevo() : {};
    st.negocio = { nombre: e.nombre, sector: P.nombre, sectorId: P.id, logo: P.icono, tono: P.tono || 'Cercano y con chispa', red: 'Instagram + Facebook',
      ciudad: 'Palma de Mallorca', direccion: '', telefono: '', reserva: '', web: '', instagram: '', facebook: '', tiktok: '', oferta: '', color: P.color || '#8b5cf6',
      ejemplo: !!e.ejemplo, _cuenta: e.id, _datosB: 3 };
    st.programados = []; st.anuncios = []; st.historial = [];
    st.bandeja = e.ejemplo && P.mensajes ? P.mensajes.map(function (m) { var o = {}; for (var k in m) o[k] = m[k]; o.hecho = false; return o; }) : [];
    st.metricas = []; st.seguidores = []; st.cuentas = {};
    st.agenda = [];
    if (e.ejemplo && SEC()) {
      var hoy = new Date(), desp = [-3, -1, 1, 2, 3, 5];
      SEC().semanaDe(P.id, e.nombre).forEach(function (it, i) {
        var d = new Date(hoy.getTime() + desp[i % desp.length] * 864e5), m = (P.horas && P.horas.mejores[i % P.horas.mejores.length]) || { hora: '11:00' };
        d.setHours(+m.hora.slice(0, 2), +m.hora.slice(3, 5), 0, 0);
        st.agenda.push({ id: 'ej' + i + azar(4), titulo: it.titulo, txt: it.txt, tags: it.tags, kicker: it.kicker, formato: it.formato, cat: it.cat, L: it.L, foto: it.foto,
          ctas: [{ t: P.cta.icono + ' ' + P.cta.texto, tipo: 'reserva', url: '' }, { t: (P.etq.iconoCarta || '📖') + ' ' + P.etq.verCarta, tipo: 'carta', url: '' }, { t: '🌐 Ver web', tipo: 'web', url: '' }],
          sinTexto: false, redes: it.formato === 'reel' ? ['igf', 'tt'] : it.formato === 'historia' ? ['igs'] : ['igf', 'fb'],
          cuando: iso(d), estado: d < hoy ? 'publicada' : 'programada', por: '', media: it.media, mediaLocal: false, ejemplo: true, res: {}, motivo: '' });
      });
    }
    var R = { resenas: [], variantes: {}, borradores: {}, auto: { proponer: true, auto45: false, negativas: true, menu11: false, whatsapp: false } };
    if (e.ejemplo && P.resenasEj) R.resenas = P.resenasEj.map(function (r, i) {
      return { id: 'ej' + i, plataforma: 'google', autor: r.autor, estrellas: r.estrellas, fecha: new Date(Date.now() - r.dias * 864e5).toISOString(), texto: r.texto };
    });
    return { S: st, R: R };
  }

  /* ---------- cambiar de negocio sin perder nada ---------- */
  function clavesNegocio() {
    var L = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && /^chispa/.test(k) && !PROPIAS.test(k)) L.push(k); } } catch (e) {}
    return L;
  }
  function congelar() { try { guardar(); } catch (e) {} window.guardar = function () {}; } // que nadie escriba el negocio viejo encima del nuevo
  function recargar(hash) { try { history.replaceState(null, '', location.pathname + (hash || '#panel')); } catch (e) {} location.reload(); }
  function ponerEstado(e) {
    var raw = ls('chispa_neg_' + e.id);
    if (raw) { var o = JSON.parse(raw); Object.keys(o).forEach(function (k) { if (o[k] != null) localStorage.setItem(k, o[k]); }); ls('chispa_neg_' + e.id, null); }
    else { var est = estadoNuevo(e); localStorage.setItem(MAIN_KEY, JSON.stringify(est.S)); localStorage.setItem(RES_KEY, JSON.stringify(est.R)); }
  }
  function entrarSync(id, hash) {
    var e = buscar(id); if (!e) { toast('No encuentro ese negocio'); return false; }
    if (id === idActual()) { try { vista('panel'); window.panel(id === 'paraiso' ? 'asistente' : 'asistente'); } catch (x) {} return true; }
    if (e.activo === false && !esAdministrador()) { toast('Ese acceso está desactivado'); return false; }
    congelar();
    var snap = {}, claves = clavesNegocio();
    claves.forEach(function (k) { snap[k] = localStorage.getItem(k); });
    var txt = JSON.stringify(snap), clave = 'chispa_neg_' + idActual();
    try { localStorage.setItem(clave, txt); } catch (x) {}
    if (ls(clave) !== txt) { toast('No hay espacio en este navegador para guardar el negocio actual. No he cambiado nada.'); location.reload(); return false; }
    claves.forEach(function (k) { ls(k, null); });
    try { ponerEstado(e); } catch (x) { toast('No se pudo abrir: ' + (x && x.message)); }
    ss(VISTA_CLI, null);
    REG.actual = id; guardarReg(REG);
    recargar(hash);
    return true;
  }

  /* ---------- API (promesas: mañana, servidor) ---------- */
  function P_(v) { return Promise.resolve(v); }
  function copia(e) { return e ? JSON.parse(JSON.stringify(e)) : null; }
  function enlaceCliente(e) {
    var d = JSON.stringify({ i: e.id, n: e.nombre, s: e.sectorId, c: e.acceso.codigo });
    var b = btoa(unescape(encodeURIComponent(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return location.origin + location.pathname + '?cliente=' + e.acceso.codigo + '&d=' + b;
  }
  var API = {
    version: '2026-10-07',
    almacen: 'navegador',      // mañana: 'servidor'
    listarNegocios: function () { if (!REG) return P_([]); return P_((esCliente() ? REG.negocios.filter(function (e) { return e.id === REG.cliente; }) : REG.negocios).map(copia)); },
    negocioActual: function () { return P_(copia(buscar(idActual()))); },
    crearNegocio: function (o) {
      if (!esAdministrador()) return Promise.reject(new Error('Solo Solers puede crear negocios'));
      var e = { id: slug(o.nombre) + '-' + azar(4), nombre: (o.nombre || '').trim() || 'Nuevo negocio', sectorId: o.sectorId || 'restaurante', ejemplo: !!o.ejemplo, activo: true, acceso: null, creado: new Date().toISOString().slice(0, 10) };
      REG.negocios.push(e); guardarReg(REG); return P_(copia(e));
    },
    darAcceso: function (id) {
      if (!esAdministrador()) return Promise.reject(new Error('Solo Solers'));
      var e = buscar(id); if (!e) return Promise.reject(new Error('No existe'));
      if (!e.acceso) e.acceso = { codigo: azar(10), creado: new Date().toISOString().slice(0, 10) };
      e.activo = true; guardarReg(REG);
      return P_({ codigo: e.acceso.codigo, enlace: enlaceCliente(e) });
    },
    activar: function (id, si) {
      if (!esAdministrador()) return Promise.reject(new Error('Solo Solers'));
      var e = buscar(id); if (!e) return Promise.reject(new Error('No existe'));
      e.activo = !!si; guardarReg(REG); return P_(copia(e));
    },
    ejemploDe: function (sectorId) {
      var e = null; (REG ? REG.negocios : []).forEach(function (x) { if (!e && x.ejemplo && x.sectorId === sectorId) e = x; });
      if (e || !esAdministrador()) return P_(copia(e));
      var p = perfil(sectorId);
      return API.crearNegocio({ nombre: (p.ejemplo && p.ejemplo.nombre) || ('Ejemplo de ' + p.corto), sectorId: sectorId, ejemplo: true });
    },
    entrar: function (id) { return P_(entrarSync(id)); },
    esAdministrador: esAdministrador,
    adminUI: adminUI,
    esCliente: esCliente,
    idActual: idActual,
    actualizarSector: function (sectorId) { var e = buscar(idActual()); if (e) { e.sectorId = sectorId; guardarReg(REG); } },
    entrarAdmin: function () { pedirClave(); },
    salirAdmin: function () { ls(ADMIN_OK, null); ss(VISTA_CLI, null); ponerPestana(); window.panel('asistente'); toast('Has salido del modo Solers'); },
    verComoCliente: function (si) { ss(VISTA_CLI, si ? '1' : null); ponerPestana(); window.panel(si ? 'asistente' : 'clientes'); toast(si ? '👁 Así lo ve el cliente' : 'Modo Solers'); }
  };
  window.ChispaCuentas = API;

  /* ---------- arranque: registro, enlaces de cliente y ?admin ---------- */
  var q = null; try { q = new URLSearchParams(location.search); } catch (e) {}
  function limpiarURL() { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} }
  function decodificar(b) { try { b = b.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return JSON.parse(decodeURIComponent(escape(atob(b)))); } catch (e) { return null; } }

  var codigoCli = q && q.get('cliente');
  if (codigoCli) {
    var datos = decodificar(q.get('d') || '') || {};
    limpiarURL();
    var deEste = null;
    (REG ? REG.negocios : []).forEach(function (x) { if ((x.acceso && x.acceso.codigo === codigoCli) || (datos.i && x.id === datos.i)) deEste = x; });
    if (REG && esAdministrador()) {
      if (deEste) { toast('Enlace de cliente: en este navegador eres Solers, te abro su negocio'); if (deEste.id !== idActual()) { entrarSync(deEste.id); return; } }
      else toast('Ese enlace de cliente no es de este navegador');
    } else if (deEste && REG) {
      if (deEste.activo === false) { REG.cliente = deEste.id; guardarReg(REG); }
      else if (!REG.cliente || REG.cliente === deEste.id) {
        REG.cliente = deEste.id; guardarReg(REG);
        if (deEste.id !== idActual()) { entrarSync(deEste.id); return; }
      }
    } else if (datos.i && datos.n) {
      // aparato del cliente: solo existe SU negocio; nada de El Paraíso ni de otros
      congelar();
      clavesNegocio().forEach(function (k) { ls(k, null); });
      Object.keys(localStorage).forEach(function (k) { if (/^chispa_neg_/.test(k)) ls(k, null); });
      var e = { id: datos.i, nombre: datos.n, sectorId: datos.s || 'restaurante', ejemplo: false, activo: true, acceso: { codigo: codigoCli }, creado: new Date().toISOString().slice(0, 10) };
      REG = { v: 1, actual: e.id, cliente: e.id, negocios: [e] }; guardarReg(REG);
      ls(ADMIN_OK, null);
      var est = estadoNuevo(e); localStorage.setItem(MAIN_KEY, JSON.stringify(est.S)); localStorage.setItem(RES_KEY, JSON.stringify(est.R));
      recargar('#panel'); return;
    }
  }
  if (!REG) { REG = regInicial(); guardarReg(REG); }
  // coherencia: el negocio cargado manda; si se reinició, se rehace el del sector
  (function () {
    var n = S.negocio || {};
    if (!n._cuenta) {
      if (idActual() === 'paraiso') { n._cuenta = 'paraiso'; try { guardar(); } catch (e) {} }
      else { var e = buscar(idActual()); if (e) { congelar(); var est = estadoNuevo(e); localStorage.setItem(MAIN_KEY, JSON.stringify(est.S)); recargar(location.hash || '#panel'); } }
    } else if (n._cuenta !== idActual() && buscar(n._cuenta)) { REG.actual = n._cuenta; guardarReg(REG); }
  })();
  // el nombre de El Paraíso en la lista sigue al de «Mi negocio»
  (function () { var e = buscar(idActual()); if (e && S.negocio && S.negocio.nombre && e.nombre !== S.negocio.nombre && !e.ejemplo) { e.nombre = S.negocio.nombre; guardarReg(REG); } })();

  /* ---------- clave del modo Solers (solo en este navegador) ---------- */
  function resumen(t) {
    try { if (window.crypto && crypto.subtle && window.TextEncoder) return crypto.subtle.digest('SHA-256', new TextEncoder().encode('chispa·' + t)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); } catch (e) {}
    var h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return Promise.resolve('d' + h);
  }
  var AVISO = '<div class="cc-aviso" data-sin-sector>⚠️ <b>Esto no es seguridad real.</b> Chispa todavía no tiene servidor: la separación entre clientes es de pantalla, sirve para enseñar y para el flujo. Cualquiera con conocimientos podría saltársela y los datos viven en este navegador. Las cuentas de verdad llegarán con el servidor.</div>';
  function pedirClave() {
    if (esCliente()) { toast('Este aparato es de un cliente: aquí no hay modo Solers'); return; }
    var hay = !!ls(ADMIN_CLAVE);
    modal('<div data-sin-sector><h3>🔐 Modo Solers</h3>' +
      (hay ? '<p style="color:var(--tx2);font-size:13.5px">Escribe la clave de Solers de este navegador.</p><input class="inp" type="password" id="ccClave" autocomplete="current-password" placeholder="Clave">'
        : '<p style="color:var(--tx2);font-size:13.5px">Primera vez en este navegador: inventa una clave para entrar en «Mis clientes». Se guarda solo aquí (resumida), nunca en el código.</p>' +
          '<input class="inp" type="password" id="ccClave" autocomplete="new-password" placeholder="Clave nueva"><input class="inp" type="password" id="ccClave2" style="margin-top:8px" autocomplete="new-password" placeholder="Repite la clave">') +
      '<div id="ccClaveMsg" style="color:#fb7185;font-size:12.5px;min-height:16px;margin-top:6px"></div>' +
      '<button class="btn pp" style="width:100%;margin-top:6px" onclick="ccClaveOk()">Entrar</button>' + AVISO + '</div>');
    setTimeout(function () { var i = document.getElementById('ccClave'); if (i) { i.focus(); i.onkeydown = function (e) { if (e.key === 'Enter') window.ccClaveOk(); }; } }, 50);
  }
  window.ccClaveOk = function () {
    var a = (document.getElementById('ccClave') || {}).value || '', b2 = document.getElementById('ccClave2'), msg = document.getElementById('ccClaveMsg');
    if (a.length < 4) { msg.textContent = 'Mínimo 4 caracteres'; return; }
    if (b2 && b2.value !== a) { msg.textContent = 'Las dos claves no coinciden'; return; }
    resumen(a).then(function (h) {
      var guardada = ls(ADMIN_CLAVE);
      if (!guardada) ls(ADMIN_CLAVE, h);
      else if (guardada !== h) { msg.textContent = 'Clave incorrecta'; return; }
      ls(ADMIN_OK, '1'); ss(VISTA_CLI, null); cerrarModal(); ponerPestana();
      try { SEC().aplicar(); } catch (e) {}
      vista('panel'); window.panel('clientes'); toast('🔓 Modo Solers activado');
    });
  };

  /* ---------- pestaña «Mis clientes» y banda de aviso ---------- */
  var TAB_CLI = { id: 'clientes', ic: '🗂️', nm: 'Mis clientes' };
  function ponerPestana() {
    var i = TABS.indexOf(TAB_CLI);
    if (adminUI() && i < 0) TABS.unshift(TAB_CLI);
    if (!adminUI() && i >= 0) TABS.splice(i, 1);
    try { pintarNav(); } catch (e) {}
  }
  function banda() {
    var e = buscar(idActual()); if (!e) return '';
    var P = perfil(e.sectorId), adm = esAdministrador(), h = '';
    var volver = adm ? '<button class="btn pp sm" onclick="ChispaCuentas.entrar(\'paraiso\')">↩ Volver a El Paraíso</button><button class="btn g sm" onclick="panel(\'clientes\')">🗂️ Mis clientes</button>' : '';
    if (adm && ss(VISTA_CLI) === '1') return '<div class="cc-ban" data-sin-sector>👁 <span>Vista de cliente: así lo ve <b>' + esc(e.nombre) + '</b>.</span><button class="btn g sm" onclick="ChispaCuentas.verComoCliente(false)">Volver al modo Solers</button></div>';
    if (e.ejemplo) h = '<div class="cc-ban ej" data-sin-sector>🧪 <span><b>EJEMPLO</b> · Así es Chispa para ' + (/^(peluquer|tienda|cafeter)/.test(P.corto) ? 'una ' : 'un ') + esc(P.corto) + '. «' + esc(e.nombre) + '» es un negocio inventado para enseñar.</span>' + volver + '</div>';
    else if (adm && e.id !== 'paraiso') h = '<div class="cc-ban" data-sin-sector>' + P.icono + ' <span>Estás dentro de <b>' + esc(e.nombre) + '</b> (' + esc(P.nombre) + ') como Solers.</span>' + volver +
      '<button class="btn g sm" onclick="ChispaCuentas.verComoCliente(true)">👁 Verlo como el cliente</button></div>';
    return h;
  }
  function bloqueado() {
    return '<div class="card" style="text-align:center;padding:30px 16px" data-sin-sector><div style="font-size:40px">⏸️</div><h2 style="margin:8px 0">Acceso desactivado</h2><p style="color:var(--tx2)">El acceso de este negocio está pausado. Habla con Solers para volver a activarlo.</p></div>';
  }

  /* ---------- pantalla «Mis clientes» ---------- */
  var FIL = { sector: '', texto: '' };
  function lista() { return REG ? REG.negocios : []; }
  function chip(e) {
    var b = [];
    if (e.id === idActual()) b.push('<span class="cc-bd on">ABIERTO AHORA</span>');
    if (e.primero) b.push('<span class="cc-bd pr">PRIMER CLIENTE</span>');
    if (e.ejemplo) b.push('<span class="cc-bd ej">EJEMPLO</span>');
    if (e.activo === false) b.push('<span class="cc-bd no">ACCESO DESACTIVADO</span>');
    else if (e.acceso) b.push('<span class="cc-bd si">ACCESO DADO</span>');
    else if (!e.ejemplo) b.push('<span class="cc-bd">SIN ACCESO TODAVÍA</span>');
    return b.join('');
  }
  function tarjeta(e) {
    var P = perfil(e.sectorId), dentro = e.id === idActual();
    return '<div class="cc-card' + (dentro ? ' on' : '') + '"><div class="cc-ic">' + P.icono + '</div><div class="cc-inf"><b>' + esc(e.nombre) + '</b><div class="cc-sub">' + esc(P.nombre) + '</div><div class="cc-meta">' + chip(e) + '</div></div>' +
      '<div class="cc-acts">' + (dentro ? '<button class="btn g sm" onclick="panel(\'asistente\')">Abierto ›</button>' : '<button class="btn pp sm" onclick="ChispaCuentas.entrar(\'' + e.id + '\')">Entrar ›</button>') +
      (e.ejemplo ? '' : '<button class="btn g sm" onclick="ccAcceso(\'' + e.id + '\')">🔑 Acceso</button>') +
      (e.ejemplo || e.id === 'paraiso' ? '' : '<button class="btn g sm" onclick="ccActivar(\'' + e.id + '\',' + (e.activo === false) + ')">' + (e.activo === false ? '▶ Activar' : '⏸ Desactivar') + '</button>') +
      '</div></div>';
  }
  function listaHtml() {
    var t = FIL.texto.toLowerCase(), S_ = SEC(), grupos = '';
    (S_ ? S_.lista() : []).forEach(function (P) {
      if (FIL.sector && FIL.sector !== P.id) return;
      var L = lista().filter(function (e) { return (e.sectorId || 'restaurante') === P.id && (!t || e.nombre.toLowerCase().indexOf(t) >= 0); });
      if (!L.length) return;
      L.sort(function (a, b) { return (b.primero ? 1 : 0) - (a.primero ? 1 : 0) || (a.ejemplo ? 1 : 0) - (b.ejemplo ? 1 : 0); });
      grupos += '<div class="cc-grp">' + P.icono + ' ' + esc(P.nombre) + ' <span>' + L.length + '</span></div><div class="cc-cards">' + L.map(tarjeta).join('') + '</div>';
    });
    return grupos || '<div class="card" style="color:var(--tx3)">Ningún negocio con ese filtro.</div>';
  }
  function vClientes() {
    var S_ = SEC(), L = lista(), reales = L.filter(function (e) { return !e.ejemplo; }).length;
    var chips = '<button class="' + (!FIL.sector ? 'on' : '') + '" onclick="ccFiltro(\'\')">Todos <b>' + L.length + '</b></button>' +
      (S_ ? S_.lista() : []).map(function (P) {
        var n = L.filter(function (e) { return e.sectorId === P.id; }).length;
        return '<button class="' + (FIL.sector === P.id ? 'on' : '') + (n ? '' : ' cero') + '" onclick="ccFiltro(\'' + P.id + '\')" title="' + esc(P.nombre) + '">' + P.icono + ' ' + esc(P.corto) + ' <b>' + n + '</b></button>';
      }).join('');
    return '<div data-sin-sector><div class="hd"><h2>🗂️ Mis clientes</h2><button class="btn pp sm" onclick="ccNuevo()">➕ Nuevo cliente</button></div>' +
      '<p style="color:var(--tx3);font-size:12.5px;margin:-4px 0 10px">Modo Solers · ' + reales + ' negocio' + (reales === 1 ? '' : 's') + ' de verdad y ' + (L.length - reales) + ' de ejemplo. Entra en cualquiera para verlo como lo ve y lo lleva el cliente.</p>' +
      AVISO +
      '<div class="cc-fil">' + chips + '</div>' +
      '<input class="inp" id="ccBusca" placeholder="Buscar negocio…" value="' + esc(FIL.texto) + '" oninput="ccBuscar(this.value)" autocomplete="off" style="margin-bottom:10px">' +
      '<div id="ccLista">' + listaHtml() + '</div>' +
      '<div class="row" style="gap:8px;margin:16px 0 80px;flex-wrap:wrap"><button class="btn g sm" style="flex:none" onclick="ChispaCuentas.salirAdmin()">🔒 Salir del modo Solers</button></div></div>';
  }
  window.ccFiltro = function (id) { FIL.sector = id; window.panel('clientes'); };
  window.ccBuscar = function (v) { FIL.texto = v || ''; var d = document.getElementById('ccLista'); if (d) d.innerHTML = listaHtml(); };
  window.ccActivar = function (id, si) {
    API.activar(id, si).then(function (e) { toast(si ? '▶ Acceso activado' : '⏸ Acceso desactivado (en este navegador; con servidor valdrá en todos)'); window.panel('clientes'); }, function (x) { toast(x.message); });
  };
  window.ccAcceso = function (id) {
    API.darAcceso(id).then(function (r) {
      var e = buscar(id);
      modal('<div data-sin-sector><h3>🔑 Acceso de ' + esc(e.nombre) + '</h3>' +
        '<p style="color:var(--tx2);font-size:13.5px">Mándale este enlace. Al abrirlo, Chispa arranca en <b>modo cliente</b>: solo ve su negocio y su sector (' + esc(perfil(e.sectorId).nombre) + '), sin «Mis clientes» ni selector de sectores.</p>' +
        '<label class="lb">Enlace de acceso · usuario ' + esc(r.codigo) + '</label><input class="inp" id="ccEnl" readonly value="' + esc(r.enlace) + '" onclick="this.select()">' +
        '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn pp" style="flex:none" onclick="ccCopiar()">📋 Copiar enlace</button>' +
        '<button class="btn g" style="flex:none" onclick="ccWhats()">💬 Mandar por WhatsApp</button>' +
        '<button class="btn g" style="flex:none" onclick="ccActivar(\'' + id + '\',false);cerrarModal()">⏸ Desactivar</button></div>' +
        '<p style="color:var(--tx3);font-size:12px;margin-top:10px">Sin servidor, lo que el cliente escriba se queda en su aparato y desactivar solo funciona en este navegador. Con el servidor será un usuario de verdad.</p>' + AVISO + '</div>');
    }, function (x) { toast(x.message); });
  };
  window.ccCopiar = function () {
    var i = document.getElementById('ccEnl'); if (!i) return; var t = i.value;
    var ok = function () { toast('📋 Enlace copiado'); }, viejo = function () { i.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Mantén pulsado el enlace para copiarlo'); } };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(ok, viejo); return; } } catch (e) {}
    viejo();
  };
  window.ccWhats = function () { var i = document.getElementById('ccEnl'); if (!i) return; window.open('https://wa.me/?text=' + encodeURIComponent('Tu acceso a Chispa: ' + i.value), '_blank'); };

  var NUEVO = { sector: '', aMano: false };
  window.ccNuevo = function () {
    NUEVO = { sector: '', aMano: false };
    var S_ = SEC();
    modal('<div data-sin-sector><h3>➕ Nuevo cliente</h3><label class="lb">Nombre del negocio</label>' +
      '<input class="inp" id="ccNom" placeholder="Ej: Peluquería Marga" autocomplete="off" oninput="ccDetecta()">' +
      '<label class="lb" style="margin-top:12px">Toca su sector</label><div class="sec-grid" id="ccSecs">' +
      (S_ ? S_.lista() : []).map(function (P) { return '<button class="sec-b" data-s="' + P.id + '" onclick="ccSel(\'' + P.id + '\',true)"><span class="i">' + P.icono + '</span><span>' + esc(P.nombre) + '</span></button>'; }).join('') +
      '</div><div id="ccSug" class="sec-sug"></div>' +
      '<p style="color:var(--tx3);font-size:12px;margin:8px 0 0">Se crea con todas las funciones de su sector puestas: botón principal, ideas, horas, imágenes, respuestas y automatizaciones.</p>' +
      '<button class="btn pp" style="width:100%;margin-top:12px" onclick="ccCrear()">Crear negocio</button></div>');
    setTimeout(function () { var i = document.getElementById('ccNom'); if (i) i.focus(); }, 50);
  };
  window.ccSel = function (id, aMano) {
    NUEVO.sector = id; if (aMano) NUEVO.aMano = true;
    Array.prototype.forEach.call(document.querySelectorAll('#ccSecs .sec-b'), function (b) { b.classList.toggle('on', b.getAttribute('data-s') === id); });
  };
  window.ccDetecta = function () {
    var v = (document.getElementById('ccNom') || {}).value || '', id = SEC() && SEC().detectar(v), d = document.getElementById('ccSug');
    if (id && !NUEVO.aMano) { window.ccSel(id, false); if (d) d.innerHTML = 'Detectado por el nombre: <b>' + perfil(id).icono + ' ' + esc(perfil(id).nombre) + '</b> (puedes tocar otro)'; }
    else if (d && !id) d.innerHTML = '';
  };
  window.ccCrear = function () {
    var nom = ((document.getElementById('ccNom') || {}).value || '').trim();
    if (!nom) { toast('Escribe el nombre del negocio'); return; }
    if (!NUEVO.sector) { toast('Toca el icono de su sector'); return; }
    API.crearNegocio({ nombre: nom, sectorId: NUEVO.sector }).then(function (e) {
      var P = perfil(e.sectorId);
      modal('<div data-sin-sector><h3>' + P.icono + ' «' + esc(e.nombre) + '» creado ✓</h3><p style="color:var(--tx2);font-size:13.5px">Ya tiene puesto todo lo de ' + esc(P.nombre.toLowerCase()) + ': botón «' + esc(P.cta.texto) + '», ideas, horas y automatizaciones.</p>' +
        '<button class="btn pp" style="width:100%" onclick="cerrarModal();ChispaCuentas.entrar(\'' + e.id + '\')">Entrar en su Chispa ›</button>' +
        '<button class="btn g" style="width:100%;margin-top:8px" onclick="ccAcceso(\'' + e.id + '\')">🔑 Darle acceso</button>' +
        '<button class="btn g" style="width:100%;margin-top:8px" onclick="cerrarModal()">Seguir en Mis clientes</button></div>');
      window.panel('clientes');
    }, function (x) { toast(x.message); });
  };

  /* ---------- reiniciar sin mezclar negocios ---------- */
  var resetOrig = window.resetTodo;
  window.resetTodo = function () {
    if (idActual() === 'paraiso' && !esCliente()) return resetOrig.apply(this, arguments);
    var e = buscar(idActual()); if (!e) return;
    S = estadoNuevo(e).S; guardar(); window.panel('asistente'); toast('Negocio reiniciado');
  };

  /* ---------- engancharse a panel() ---------- */
  var panelAntes = window.panel;
  window.panel = function (tab) {
    if (tab === 'clientes') {
      if (!adminUI()) tab = 'asistente';
      else { TAB = 'clientes'; pintarNav(); $('main').innerHTML = vClientes(); window.scrollTo(0, 0); return; }
    }
    if (esCliente()) { var e = buscar(idActual()); if (e && e.activo === false) { TAB = tab; pintarNav(); $('main').innerHTML = bloqueado(); return; } }
    var r = panelAntes.apply(this, [tab].concat([].slice.call(arguments, 1)));
    var b = banda();
    if (b) { var m = $('main'); if (m && !m.querySelector('.cc-ban')) m.insertAdjacentHTML('afterbegin', b); }
    return r;
  };

  var css = document.createElement('style');
  css.textContent =
    '.cc-aviso{font-size:12.5px;line-height:1.45;background:rgba(255,204,51,.09);border:1px solid rgba(255,204,51,.35);color:var(--tx2);border-radius:12px;padding:10px 12px;margin:10px 0}' +
    '.cc-ban{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.4);border-radius:12px;padding:9px 12px;margin-bottom:12px}' +
    '.cc-ban span{flex:1 1 220px;min-width:0}.cc-ban .btn{flex:none}.cc-ban.ej{background:rgba(255,176,32,.12);border-color:rgba(255,176,32,.5)}' +
    '.cc-fil{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}' +
    '.cc-fil button{background:var(--panel2);border:1px solid var(--line);color:var(--tx2);font-weight:700;font-size:12.5px;padding:7px 11px;border-radius:30px;cursor:pointer;min-height:36px}' +
    '.cc-fil button b{color:var(--tx);margin-left:2px}.cc-fil button.on{background:rgba(139,92,246,.18);border-color:var(--purple);color:var(--tx)}.cc-fil button.cero{opacity:.55}' +
    '.cc-grp{font-weight:800;font-size:13px;margin:16px 0 8px;display:flex;align-items:center;gap:6px}.cc-grp span{font-size:11px;background:var(--panel2);border:1px solid var(--line);border-radius:20px;padding:1px 8px;color:var(--tx3)}' +
    '.cc-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}' +
    '.cc-card{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:12px}' +
    '.cc-card.on{border-color:var(--purple);box-shadow:0 0 0 2px rgba(139,92,246,.2)}' +
    '.cc-ic{font-size:26px;width:44px;height:44px;border-radius:12px;background:var(--bg2);display:flex;align-items:center;justify-content:center;flex:none}' +
    '.cc-inf{flex:1 1 150px;min-width:0}.cc-inf b{display:block;font-size:14.5px;overflow:hidden;text-overflow:ellipsis}.cc-sub{font-size:12px;color:var(--tx3)}' +
    '.cc-meta{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.cc-bd{font-size:10px;font-weight:800;letter-spacing:.03em;padding:2px 7px;border-radius:20px;border:1px solid var(--line);color:var(--tx3)}' +
    '.cc-bd.on{color:var(--purple2);border-color:var(--purple)}.cc-bd.pr{color:var(--verde);border-color:rgba(52,211,153,.5)}.cc-bd.ej{color:var(--amber);border-color:rgba(255,176,32,.5)}' +
    '.cc-bd.si{color:var(--verde);border-color:rgba(52,211,153,.4)}.cc-bd.no{color:#fb7185;border-color:rgba(251,113,133,.5)}' +
    '.cc-acts{display:flex;gap:6px;flex-wrap:wrap;width:100%}.cc-acts .btn{flex:none}' +
    '@media(max-width:420px){.cc-cards{grid-template-columns:1fr}}';
  document.head.appendChild(css);

  /* ---------- puesta en marcha ---------- */
  ponerPestana();
  if (q && q.has('admin')) { limpiarURL(); if (esAdministrador()) { vista('panel'); window.panel('clientes'); } else { vista('panel'); pedirClave(); } }
  else if (/clientes/.test(location.hash || '') && adminUI()) { vista('panel'); window.panel('clientes'); }
  else if (document.getElementById('app') && document.getElementById('app').classList.contains('on') && typeof TAB !== 'undefined') { try { window.panel(TAB); } catch (e) {} }
})();
