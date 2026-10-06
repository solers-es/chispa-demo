/* ──────────────────────────────────────────────────────────────────────────
   Chispa · conector de Google Business Profile (reseñas)

   Lo mismo que hace FAMA en su servidor (solers-es/fama, api/fama.js:
   resenasGoogle / contestarGoogle), pero desde el navegador, porque esta
   demo vive en GitHub Pages y no tiene servidor.

   Cómo funciona:
     1. El dueño pulsa «Conectar Google» → ventana de Google (OAuth 2.0,
        Google Identity Services, flujo de token en el navegador).
     2. Pide el permiso https://www.googleapis.com/auth/business.manage.
     3. Con el token: cuentas → fichas → reseñas (reviews.list, API v4) y
        publicar respuesta (reviews.updateReply, PUT …/reviews/{id}/reply).

   El token solo vive en la memoria de la pestaña (caduca en 1 h y no se
   guarda en ningún sitio). NO hay claves aquí: el «Client ID» de OAuth es
   público por diseño (va en la URL de Google), y el secreto NO hace falta en
   este flujo. Mientras CLIENT_ID esté vacío, Chispa enseña ejemplos.

   Para que funcione de verdad hace falta que Google apruebe el acceso a la
   API de Business Profile (ver PASOS_GOOGLE, se enseña en la app).
   ────────────────────────────────────────────────────────────────────────── */
(function (raiz) {
  'use strict';

  /* Rellenar cuando Google apruebe el proyecto (Google Cloud → Credenciales →
     ID de cliente de OAuth, tipo «Aplicación web», origen autorizado
     https://solers-es.github.io). Es público: no es una clave secreta. */
  var CLIENT_ID = '';
  var SCOPE = 'https://www.googleapis.com/auth/business.manage';

  var API_CUENTAS = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
  var API_FICHAS = 'https://mybusinessbusinessinformation.googleapis.com/v1/';
  var API_RESENAS = 'https://mybusiness.googleapis.com/v4/';
  var ESTRELLAS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

  var token = null, caduca = 0, ficha = null; // ficha = {cuenta:'accounts/1', local:'locations/2', titulo:'…'}

  function cargarGIS() {
    return new Promise(function (ok, mal) {
      if (raiz.google && raiz.google.accounts && raiz.google.accounts.oauth2) return ok();
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { mal(new Error('No se pudo cargar el inicio de sesión de Google')); };
      document.head.appendChild(s);
    });
  }

  function pedirToken() {
    if (!CLIENT_ID) return Promise.reject(new Error('SIN_CLIENT_ID'));
    return cargarGIS().then(function () {
      return new Promise(function (ok, mal) {
        var cli = raiz.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          callback: function (r) {
            if (r && r.access_token) { token = r.access_token; caduca = Date.now() + (r.expires_in || 3600) * 1000 - 60000; ok(token); }
            else mal(new Error((r && r.error) || 'Google no dio permiso'));
          },
          error_callback: function (e) { mal(new Error((e && e.type) || 'Ventana de Google cerrada')); }
        });
        cli.requestAccessToken({ prompt: token ? '' : 'consent' });
      });
    });
  }

  function llamar(url, opciones) {
    if (!token || Date.now() > caduca) return Promise.reject(new Error('SIN_SESION'));
    opciones = opciones || {};
    opciones.headers = Object.assign({ Authorization: 'Bearer ' + token }, opciones.headers || {});
    return fetch(url, opciones).then(function (r) {
      if (r.status === 429 || r.status === 403) throw new Error('Google respondió ' + r.status + ': normalmente es que el proyecto aún no tiene aprobado el acceso a la API (cuota 0).');
      if (!r.ok) throw new Error('Google respondió ' + r.status);
      return r.status === 204 ? {} : r.json();
    });
  }

  /* Conectar: token + elegir la primera ficha que el usuario gestione. */
  function conectar() {
    return pedirToken().then(function () {
      return llamar(API_CUENTAS);
    }).then(function (j) {
      var cuentas = j.accounts || [];
      if (!cuentas.length) throw new Error('Esta cuenta de Google no gestiona ninguna ficha de empresa.');
      var i = 0;
      function siguiente() {
        if (i >= cuentas.length) throw new Error('No hay fichas de empresa en estas cuentas.');
        var c = cuentas[i++];
        return llamar(API_FICHAS + c.name + '/locations?readMask=name,title&pageSize=100').then(function (l) {
          var ls = l.locations || [];
          if (!ls.length) return siguiente();
          ficha = { cuenta: c.name, local: ls[0].name, titulo: ls[0].title, todas: ls.map(function (x) { return { cuenta: c.name, local: x.name, titulo: x.title }; }) };
          return ficha;
        });
      }
      return siguiente();
    });
  }

  /* reviews.list → mismo formato que usa Chispa para sus reseñas. */
  function leerResenas() {
    if (!ficha) return Promise.reject(new Error('SIN_SESION'));
    var base = API_RESENAS + ficha.cuenta + '/' + ficha.local + '/reviews';
    var fuera = [], media = null, total = null, pagina = '', vueltas = 0;
    function una() {
      return llamar(base + '?pageSize=50' + (pagina ? '&pageToken=' + encodeURIComponent(pagina) : '')).then(function (j) {
        if (j.averageRating != null) media = j.averageRating;
        if (j.totalReviewCount != null) total = j.totalReviewCount;
        (j.reviews || []).forEach(function (x) {
          fuera.push({
            id: x.name, plataforma: 'google', real: true,
            autor: (x.reviewer && x.reviewer.displayName) || 'Usuario de Google',
            estrellas: ESTRELLAS[x.starRating] || 0,
            texto: x.comment || '',
            fecha: x.createTime,
            respuesta: x.reviewReply ? x.reviewReply.comment : null
          });
        });
        pagina = j.nextPageToken || '';
        if (pagina && ++vueltas < 4) return una();
        return { resenas: fuera, media: media, total: total };
      });
    }
    return una();
  }

  /* reviews.updateReply: solo en una reseña de ESTA ficha (igual que FAMA). */
  function responder(nombre, texto) {
    if (!ficha) return Promise.reject(new Error('SIN_SESION'));
    if (String(nombre).indexOf(ficha.cuenta + '/' + ficha.local + '/reviews/') !== 0) return Promise.reject(new Error('Esa reseña no es de esta ficha'));
    return llamar(API_RESENAS + nombre + '/reply', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment: texto })
    });
  }

  function desconectar() {
    if (token && raiz.google && raiz.google.accounts && raiz.google.accounts.oauth2) { try { raiz.google.accounts.oauth2.revoke(token, function () {}); } catch (e) {} }
    token = null; ficha = null; caduca = 0;
  }

  raiz.ChispaGoogle = {
    configurado: function () { return !!CLIENT_ID; },
    conectado: function () { return !!(token && ficha && Date.now() < caduca); },
    ficha: function () { return ficha; },
    conectar: conectar, leerResenas: leerResenas, responder: responder, desconectar: desconectar,
    SCOPE: SCOPE
  };
}(window));
