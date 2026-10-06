/* ──────────────────────────────────────────────────────────────────────────
   Chispa · conector de la FICHA de Google (Google Business Profile) — trabajador B

   Lo que hace (con la API oficial, sin herramientas puente de pago):
     · Publicar en la ficha  → v4 localPosts.create
         POST https://mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/localPosts
     · Cambiar el horario    → Business Information API v1 locations.patch
         PATCH https://mybusinessbusinessinformation.googleapis.com/v1/locations/{l}?updateMask=regularHours
     · Subir fotos           → v4 media.create (la foto tiene que estar en un enlace público)
         POST https://mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/media

   Permiso: https://www.googleapis.com/auth/business.manage (el mismo que usa
   conector-google.js del trabajador C para las reseñas). Mismo cliente OAuth:
   el Client ID se pone UNA vez en window.CHISPA_GOOGLE_CLIENT_ID (o lo exporta
   ChispaGoogle.clientId() si C lo añade). El Client ID es público por diseño;
   NO hay ninguna clave secreta aquí. El token vive solo en memoria (1 h).

   ► PARA EL TRABAJADOR A (modal «Publicar» de chispa-estudio.js): no toco tu
     modal. Para que «Google (ficha del negocio)» salga como destino:
        1) en tu lista REDES añade:   if (window.ChispaFicha) REDES.push(ChispaFicha.red);
        2) en el paso 2, al pulsar esa red (id 'gbp'):
              ChispaFicha.enviarDesdePublicar(window._posts[PUB.i]);
     (Alternativa sin lista: ChispaFicha.opcionHtml() pinta una casilla y
      ChispaFicha.marcado() dice si está marcada.)
     Si Google aún no está conectado, publicar() abre la ficha con el texto
     copiado para pegarlo (no se pierde nada).
   ────────────────────────────────────────────────────────────────────────── */
(function (raiz) {
  'use strict';

  var SCOPE = 'https://www.googleapis.com/auth/business.manage';
  var API_CUENTAS = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
  var API_INFO = 'https://mybusinessbusinessinformation.googleapis.com/v1/';
  var API_V4 = 'https://mybusiness.googleapis.com/v4/';
  var DIAS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  var DIAS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  /* Horario real de El Paraíso según su ficha (21/07/2026): miércoles cerrado. */
  var HORARIO_PARAISO = [
    { a: '09:00', c: '23:00' }, { a: '09:00', c: '23:00' }, { cerrado: true },
    { a: '09:00', c: '23:00' }, { a: '09:00', c: '23:00' }, { a: '11:30', c: '00:30' }, { a: '11:30', c: '22:30' }
  ];

  var token = null, caduca = 0, ficha = null; // ficha = {cuenta:'accounts/1', local:'locations/2', titulo}

  function clientId() {
    try { if (raiz.ChispaGoogle && typeof raiz.ChispaGoogle.clientId === 'function') return raiz.ChispaGoogle.clientId() || ''; } catch (e) {}
    return raiz.CHISPA_GOOGLE_CLIENT_ID || '';
  }
  function configurado() { return !!clientId(); }
  function conectado() { return !!(token && ficha && Date.now() < caduca); }

  function cargarGIS() {
    return new Promise(function (ok, mal) {
      if (raiz.google && raiz.google.accounts && raiz.google.accounts.oauth2) return ok();
      var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { ok(); }; s.onerror = function () { mal(new Error('No se pudo cargar el inicio de sesión de Google')); };
      document.head.appendChild(s);
    });
  }
  function pedirToken() {
    // Si el conector de C ya tiene sesión y algún día la comparte, se reutiliza.
    try { if (raiz.ChispaGoogle && typeof raiz.ChispaGoogle.token === 'function' && raiz.ChispaGoogle.token()) { token = raiz.ChispaGoogle.token(); caduca = Date.now() + 50 * 60000; return Promise.resolve(token); } } catch (e) {}
    if (!configurado()) return Promise.reject(new Error('SIN_CLIENT_ID'));
    return cargarGIS().then(function () {
      return new Promise(function (ok, mal) {
        raiz.google.accounts.oauth2.initTokenClient({
          client_id: clientId(), scope: SCOPE,
          callback: function (r) { if (r && r.access_token) { token = r.access_token; caduca = Date.now() + (r.expires_in || 3600) * 1000 - 60000; ok(token); } else mal(new Error('Google no dio permiso')); },
          error_callback: function (e) { mal(new Error((e && e.type) || 'Ventana de Google cerrada')); }
        }).requestAccessToken({ prompt: token ? '' : 'consent' });
      });
    });
  }
  function llamar(url, op) {
    if (!token || Date.now() > caduca) return Promise.reject(new Error('SIN_SESION'));
    op = op || {};
    op.headers = Object.assign({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, op.headers || {});
    return fetch(url, op).then(function (r) {
      return r.text().then(function (t) { var j = {}; try { j = t ? JSON.parse(t) : {}; } catch (e) {} if (!r.ok) throw new Error((j.error && j.error.message) || ('Google respondió ' + r.status)); return j; });
    });
  }
  function conectar() {
    return pedirToken().then(function () { return llamar(API_CUENTAS); }).then(function (j) {
      var cuentas = j.accounts || [], i = 0;
      function siguiente() {
        if (i >= cuentas.length) throw new Error('Esta cuenta de Google no gestiona ninguna ficha');
        var c = cuentas[i++];
        return llamar(API_INFO + c.name + '/locations?readMask=name,title&pageSize=100').then(function (l) {
          var ls = l.locations || []; if (!ls.length) return siguiente();
          ficha = { cuenta: c.name, local: ls[0].name, titulo: ls[0].title };
          return ficha;
        });
      }
      return siguiente();
    });
  }
  function asegurar() { return conectado() ? Promise.resolve(ficha) : conectar(); }

  /* ---------- publicar en la ficha (localPosts) ---------- */
  function cuerpoPost(p) {
    var n = (raiz.S && raiz.S.negocio) || {};
    var b = { languageCode: 'es', summary: (p.texto || '').slice(0, 1500), topicType: p.oferta ? 'OFFER' : 'STANDARD' };
    var url = p.url || n.reserva || n.web;
    if (url) b.callToAction = { actionType: (p.url || n.reserva) ? 'BOOK' : 'LEARN_MORE', url: url };
    if (p.foto && /^https:\/\//.test(p.foto)) b.media = [{ mediaFormat: 'PHOTO', sourceUrl: p.foto }];
    if (p.oferta) {
      var hoy = new Date(), fin = new Date(Date.now() + 7 * 864e5);
      b.event = { title: String(p.oferta).slice(0, 58), schedule: {
        startDate: { year: hoy.getFullYear(), month: hoy.getMonth() + 1, day: hoy.getDate() },
        endDate: { year: fin.getFullYear(), month: fin.getMonth() + 1, day: fin.getDate() } } };
      delete b.callToAction; // las ofertas no llevan botón; llevan su propio enlace
      if (url) b.offer = { redeemOnlineUrl: url };
    }
    return b;
  }
  function publicar(p) {
    p = p || {};
    if (!configurado()) return manual('publicar', p);
    return asegurar().then(function (f) {
      return llamar(API_V4 + f.cuenta + '/' + f.local + '/localPosts', { method: 'POST', body: JSON.stringify(cuerpoPost(p)) });
    }).then(function (r) { aviso('📍 Publicado en tu ficha de Google ✓'); return r; })
      .catch(function (e) { aviso('Google: ' + e.message); return manual('publicar', p); });
  }

  /* ---------- horario (regularHours) ---------- */
  function hm(s) { var m = String(s || '').match(/(\d{1,2}):(\d{2})/); return m ? { hours: +m[1], minutes: +m[2] } : null; }
  function periodos(sem) {
    var out = [];
    sem.forEach(function (d, i) {
      if (!d || d.cerrado) return;
      var a = hm(d.a), c = hm(d.c); if (!a || !c) return;
      var pasaMedianoche = (c.hours * 60 + c.minutes) <= (a.hours * 60 + a.minutes);
      out.push({ openDay: DIAS[i], openTime: a, closeDay: pasaMedianoche ? DIAS[(i + 1) % 7] : DIAS[i], closeTime: (c.hours === 0 && c.minutes === 0 && !pasaMedianoche) ? { hours: 24 } : c });
    });
    return out;
  }
  function actualizarHorario(sem) {
    if (!configurado()) return manual('horario', { horario: sem });
    return asegurar().then(function (f) {
      return llamar(API_INFO + f.local + '?updateMask=regularHours', { method: 'PATCH', body: JSON.stringify({ regularHours: { periods: periodos(sem) } }) });
    }).then(function (r) { aviso('🕒 Horario actualizado en Google ✓'); return r; })
      .catch(function (e) { aviso('Google: ' + e.message); return manual('horario', { horario: sem }); });
  }

  /* ---------- fotos (media.create con enlace público) ---------- */
  function subirFoto(url, categoria) {
    if (!configurado()) return manual('foto', { foto: url });
    if (!/^https:\/\//.test(url || '')) { aviso('La foto tiene que estar en un enlace https público'); return Promise.resolve(null); }
    return asegurar().then(function (f) {
      return llamar(API_V4 + f.cuenta + '/' + f.local + '/media', { method: 'POST', body: JSON.stringify({ mediaFormat: 'PHOTO', locationAssociation: { category: categoria || 'FOOD_AND_DRINK' }, sourceUrl: url }) });
    }).then(function (r) { aviso('📸 Foto subida a tu ficha ✓'); return r; })
      .catch(function (e) { aviso('Google: ' + e.message); return manual('foto', { foto: url }); });
  }

  /* ---------- sin conexión todavía: se hace a mano, con todo preparado ---------- */
  function aviso(m) { try { raiz.toast(m); } catch (e) {} }
  function copiar(t) { try { navigator.clipboard.writeText(t); return true; } catch (e) { return false; } }
  function textoHorario(sem) { return sem.map(function (d, i) { return DIAS_ES[i] + ': ' + (d.cerrado ? 'cerrado' : d.a + ' - ' + d.c); }).join('\n'); }
  function manual(que, p) {
    var t = que === 'publicar' ? (p.texto || '') : que === 'horario' ? textoHorario(p.horario || []) : (p.foto || '');
    if (t) copiar(t);
    var titulo = { publicar: 'Publicar en tu ficha de Google', horario: 'Cambiar el horario en Google', foto: 'Subir la foto a Google' }[que];
    var pasos = {
      publicar: 'En tu perfil: <b>Añadir novedad</b> (o «Oferta») → pega el texto → añade la foto → Publicar.',
      horario: 'En tu perfil: <b>Editar perfil → Horario</b> → copia los días de abajo → Guardar.',
      foto: 'En tu perfil: <b>Añadir foto</b> → elige la foto → Publicar.'
    }[que];
    if (typeof raiz.modal === 'function') {
      raiz.modal('<h3>📍 ' + titulo + '</h3>' +
        '<p style="color:var(--tx2);font-size:14px">' + (configurado() ? 'Google no ha dejado hacerlo solo ahora.' : 'Chispa todavía no tiene el permiso de Google para hacerlo sola (ver «Conexiones → Google»).') + ' Lo tienes preparado' + (t ? ' y <b>copiado</b>' : '') + ':</p>' +
        (t ? '<pre style="white-space:pre-wrap;background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:10px;font-size:12.5px;max-height:180px;overflow:auto">' + raiz.esc(t) + '</pre>' : '') +
        '<p style="font-size:13px;color:var(--tx2)">' + pasos + '</p>' +
        '<button class="btn pp" style="width:100%" onclick="ChispaFicha.abrirPerfil()">Abrir mi ficha de Google ↗</button>');
    }
    return Promise.resolve(null);
  }
  function abrirPerfil() {
    var u = 'https://business.google.com/';
    try { var w = raiz.open(u, '_blank', 'noopener'); if (!w) location.href = u; } catch (e) { location.href = u; }
  }

  /* ---------- casilla para el modal «Publicar» de A ---------- */
  function marcado() { var c = document.getElementById('cfGoogleDestino'); return !!(c && c.checked); }
  function opcionHtml() {
    return '<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13.5px;cursor:pointer">' +
      '<input type="checkbox" id="cfGoogleDestino" checked> 📍 Publicar también en <b>Google (ficha del negocio)</b></label>';
  }

  /* Desde un post de Chispa ({txt, tags, media}) a la ficha. */
  function enviarDesdePublicar(post) {
    post = post || {};
    var foto = post.media && (post.media.url || post.media.src || post.media);
    var n = (raiz.S && raiz.S.negocio) || {};
    return publicar({ texto: [post.txt, post.tags].filter(Boolean).join('\n\n'), foto: typeof foto === 'string' ? foto : '', oferta: n.oferta || '' });
  }

  raiz.ChispaFicha = {
    red: { id: 'gbp', nm: 'Google', sub: 'Ficha del negocio', ic: 'G', cls: 'gbp' },
    enviarDesdePublicar: enviarDesdePublicar,
    SCOPE: SCOPE, configurado: configurado, conectado: conectado, conectar: conectar,
    ficha: function () { return ficha; },
    publicar: publicar, actualizarHorario: actualizarHorario, subirFoto: subirFoto,
    opcionHtml: opcionHtml, marcado: marcado, abrirPerfil: abrirPerfil,
    destino: { id: 'google', nm: 'Google (ficha del negocio)', ic: '📍' },
    HORARIO_PARAISO: HORARIO_PARAISO, DIAS_ES: DIAS_ES, periodos: periodos
  };
}(window));
