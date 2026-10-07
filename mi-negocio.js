/* ──────────────────────────────────────────────────────────────────────────
   Chispa · «Mi negocio», conexiones y botones que funcionan (trabajador B)

   Se carga DESPUÉS del script principal de index.html y sustituye o amplía:
     vAjustes / guardarAjustes  → pantalla «Mi negocio» nueva
     abrirCta / ctaBotones      → Reservar, Ver web, Llamar, WhatsApp
     conectarCuentas            → abre la guía «Conecta tu negocio»
     elegir                     → los botones de precios llevan al alta
     preguntar                  → cada pregunta del chat lleva a su acción
     panel                      → pestaña nueva «Conexiones»

   Todo se guarda en S.negocio (localStorage del script principal, ya con
   try/catch). Sin FileReader (el iPhone de Stalin no lo tiene). Sin claves.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ---------- datos reales de El Paraíso (de su web y su ficha de Google) ---------- */
  var PARAISO = {
    nombre: 'El Paraíso Bar Restaurante',
    sector: 'Bar restaurante · cocina dominicana · buen ambiente',
    ciudad: 'Palma de Mallorca',
    direccion: "Carrer d'Anselm Turmeda, 5, 07010 Palma",
    logoUrl: 'marca/elparaiso-logo-negro.jpg',   // fondo negro, como su Instagram (Stalin 07/10)
    web: 'https://el-paraiso-eight.vercel.app/links',
    club: 'https://el-paraiso-eight.vercel.app',
    reserva: 'https://el-paraiso-eight.vercel.app/reservas.html',   // su propio sistema de reservas
    carta: 'https://el-paraiso-eight.vercel.app/carta.html',
    eventos: 'https://el-paraiso-eight.vercel.app/eventos.html',
    telefono: '971 37 90 28',
    whatsapp: '689 98 02 02',        // móvil: el botón «Reserva por wasap» de los clientes
    whatsappApi: '971 37 90 28',     // fijo del local: el número de la API de WhatsApp de Chispa (decisión de Stalin)
    instagram: 'https://instagram.com/elparaisobarrestaurante',
    facebook: 'https://www.facebook.com/share/1cxhh2vr9X/',
    tiktok: 'https://www.tiktok.com/@elparaisomallorca29',
    youtube: '',
    google: 'https://share.google/4cyY3OFMTiTD0rcMG',
    resenas: 'https://g.page/r/CcMaSc8--j4YEBM/review'
  };
  var CAMPOS = ['nombre', 'sector', 'ciudad', 'direccion', 'logoUrl', 'web', 'club', 'reserva', 'carta', 'eventos', 'telefono', 'whatsapp', 'whatsappApi',
    'instagram', 'facebook', 'tiktok', 'youtube', 'google', 'resenas'];

  /* Rellena lo que falte con los datos de El Paraíso, una sola vez y sin pisar
     nada que el dueño haya escrito. */
  function sembrar() {
    var n = S.negocio = S.negocio || {};
    if (!n._datosB) {
      var esParaiso = !n.nombre || /para[ií]so/i.test(n.nombre);
      CAMPOS.forEach(function (k) {
        if (n[k] === undefined || n[k] === null) n[k] = '';
        if (esParaiso && !n[k]) n[k] = PARAISO[k];
      });
      if (esParaiso && n.nombre === 'El Paraíso') n.nombre = PARAISO.nombre;
      n._datosB = 3;
      guardar();
    }
    if (n._datosB < 2 && /para[ií]so/i.test(n.nombre || '')) {
      // 07/10/2026: enlaces exactos que dio Stalin; se sustituyen los anteriores por defecto
      var viejos = { logoUrl: ['https://el-paraiso-eight.vercel.app/fotos/logo.png'], web: ['https://el-paraiso-eight.vercel.app/'],
        reserva: ['https://el-paraiso-eight.vercel.app/reservas.html'], instagram: ['https://www.instagram.com/elparaisobarrestaurante/'],
        whatsapp: ['971 37 90 28'], sector: ['Restaurante · cocina caribeña y mediterránea', 'Restaurante'] };
      CAMPOS.forEach(function (k) { if (!n[k] || (viejos[k] && viejos[k].indexOf(n[k]) >= 0)) n[k] = PARAISO[k]; });
      n._datosB = 2; guardar();
    }
    if (n._datosB < 3 && /para[ií]so/i.test(n.nombre || '')) {
      // 07/10/2026 (2): reservas con su propio sistema, carta, eventos, Facebook y ficha de Google exactos
      var v3 = { reserva: ['https://api.whatsapp.com/send?phone=34689980202&text=Hola%2C+quiero+reservar+una+mesa+en+El+Paraiso'],
        facebook: ['https://www.facebook.com/people/El-Paraiso-Bar-Restaurante-Mallorca/'],
        google: ['https://www.google.com/maps/place/?q=place_id:ChIJl-sOCm2TlxIRwxpJzz76Phg'] };
      CAMPOS.forEach(function (k) { if (!n[k] || (v3[k] && v3[k].indexOf(n[k]) >= 0)) n[k] = PARAISO[k]; });
      n._datosB = 3; guardar();
    }
    // 07/10/2026 (3), trabajador A: el logo por defecto pasa a la versión de fondo negro
    if (/^marca\/elparaiso-logo(-160)?\.png$/.test(n.logoUrl || '')) { n.logoUrl = PARAISO.logoUrl; guardar(); }
    CAMPOS.forEach(function (k) { if (n[k] === undefined) n[k] = ''; });
    S.conexiones = S.conexiones || {};
  }

  /* ---------- validar y normalizar enlaces ---------- */
  function soloDigitos(s) { return (s || '').replace(/[^\d+]/g, ''); }
  function urlValida(s) {
    try { var u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.indexOf('.') > 0; }
    catch (e) { return false; }
  }
  function conHttps(s) {
    s = (s || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
    return s;
  }
  function usuario(s) { return (s || '').trim().replace(/^@/, '').replace(/[/?#].*$/, ''); }

  /* Cada campo: cómo se normaliza y qué dominios valen. Devuelve {v, ok, msg}. */
  var REGLAS = {
    web: function (s) { s = conHttps(s); return { v: s, ok: !s || urlValida(s), msg: 'Tiene que ser una dirección web (https://…)' }; },
    carta: function (s) { s = conHttps(s); return { v: s, ok: !s || urlValida(s), msg: 'Tiene que ser un enlace (https://…)' }; },
    eventos: function (s) { s = conHttps(s); return { v: s, ok: !s || urlValida(s), msg: 'Tiene que ser un enlace (https://…)' }; },
    club: function (s) { s = conHttps(s); return { v: s, ok: !s || urlValida(s), msg: 'Tiene que ser un enlace (https://…)' }; },
    whatsappApi: function (s) { var d = soloDigitos(s); return { v: (s || '').trim(), ok: !s || d.replace('+', '').length >= 9, msg: 'Pon el número (9 cifras o con +34)' }; },
    reserva: function (s) { s = conHttps(s); return { v: s, ok: !s || urlValida(s), msg: 'Tiene que ser un enlace (TheFork, tu web de reservas…)' }; },
    logoUrl: function (s) { s = (s || '').trim(); if (/^[\w./-]+\.(png|jpe?g|webp|svg)$/i.test(s) && !/^[\w-]+\.[a-z]{2,}\//i.test(s)) return { v: s, ok: true }; s = conHttps(s); return { v: s, ok: !s || urlValida(s), msg: 'Pega el enlace de una imagen (https://…/logo.png)' }; },
    telefono: function (s) { var d = soloDigitos(s); return { v: (s || '').trim(), ok: !s || d.replace('+', '').length >= 9, msg: 'Un teléfono tiene al menos 9 cifras' }; },
    whatsapp: function (s) {
      var t = (s || '').trim(), m = t.match(/wa\.me\/(\d+)/) || t.match(/[?&]phone=(\d+)/);
      if (m) t = m[1];
      var d = soloDigitos(t);
      return { v: t, ok: !t || d.replace('+', '').length >= 9, msg: 'Pon el número de WhatsApp (9 cifras o con +34)' };
    },
    instagram: function (s) {
      s = (s || '').trim(); if (!s) return { v: '', ok: true };
      if (/instagram\.com/i.test(s)) { s = conHttps(s); return { v: s, ok: urlValida(s), msg: 'Enlace de Instagram no válido' }; }
      if (/^https?:|\.com/i.test(s)) return { v: s, ok: false, msg: 'Eso no es de Instagram. Pon @tuusuario o instagram.com/tuusuario' };
      var u = usuario(s); return { v: 'https://www.instagram.com/' + u + '/', ok: /^[\w.]{1,30}$/.test(u), msg: 'Usuario de Instagram no válido' };
    },
    tiktok: function (s) {
      s = (s || '').trim(); if (!s) return { v: '', ok: true };
      if (/tiktok\.com/i.test(s)) { s = conHttps(s); return { v: s, ok: urlValida(s), msg: 'Enlace de TikTok no válido' }; }
      if (/^https?:|\.com/i.test(s)) return { v: s, ok: false, msg: 'Eso no es de TikTok. Pon @tuusuario o tiktok.com/@tuusuario' };
      var u = usuario(s); return { v: 'https://www.tiktok.com/@' + u, ok: /^[\w.]{2,24}$/.test(u), msg: 'Usuario de TikTok no válido' };
    },
    facebook: function (s) {
      s = (s || '').trim(); if (!s) return { v: '', ok: true };
      if (/(facebook|fb)\.(com|me)/i.test(s)) { s = conHttps(s); return { v: s, ok: urlValida(s), msg: 'Enlace de Facebook no válido' }; }
      if (/^https?:|\.com/i.test(s)) return { v: s, ok: false, msg: 'Eso no es de Facebook. Pega facebook.com/tupagina' };
      var u = usuario(s); return { v: 'https://www.facebook.com/' + u, ok: /^[\w.-]{3,80}$/.test(u), msg: 'Nombre de página no válido' };
    },
    youtube: function (s) {
      s = (s || '').trim(); if (!s) return { v: '', ok: true };
      if (/(youtube\.com|youtu\.be)/i.test(s)) { s = conHttps(s); return { v: s, ok: urlValida(s), msg: 'Enlace de YouTube no válido' }; }
      if (/^https?:|\.com/i.test(s)) return { v: s, ok: false, msg: 'Eso no es de YouTube. Pon @tucanal o youtube.com/@tucanal' };
      var u = usuario(s); return { v: 'https://www.youtube.com/@' + u, ok: /^[\w.-]{3,30}$/.test(u), msg: 'Canal de YouTube no válido' };
    },
    google: function (s) {
      s = conHttps(s); if (!s) return { v: '', ok: true };
      var ok = urlValida(s) && /(google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps|g\.page|business\.google\.com|g\.co\/kgs|share\.google)/i.test(s);
      return { v: s, ok: ok, msg: 'Pega el enlace de tu ficha (Google Maps → Compartir → Copiar enlace)' };
    },
    resenas: function (s) {
      s = conHttps(s); if (!s) return { v: '', ok: true };
      var ok = urlValida(s) && /(g\.page|google\.|goo\.gl|share\.google)/i.test(s);
      return { v: s, ok: ok, msg: 'Pega el enlace «Pedir reseñas» de tu ficha de Google (g.page/r/…)' };
    }
  };
  function revisar(k, s) { return REGLAS[k] ? REGLAS[k](s) : { v: (s || '').trim(), ok: true }; }

  /* Detecta de qué es un enlace pegado y en qué casilla va. */
  function adivinarCampo(s) {
    s = (s || '').trim();
    if (/instagram\.com/i.test(s)) return 'instagram';
    if (/tiktok\.com/i.test(s)) return 'tiktok';
    if (/(facebook|fb)\.(com|me)/i.test(s)) return 'facebook';
    if (/(youtube\.com|youtu\.be)/i.test(s)) return 'youtube';
    if (/wa\.me|whatsapp/i.test(s)) return 'whatsapp';
    if (/g\.page\/r\/|\/review/i.test(s)) return 'resenas';
    if (/(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|g\.page|business\.google|share\.google)/i.test(s)) return 'google';
    if (/(thefork|eltenedor|covermanager|resy|opentable|quandoo|reserv|booking|qamarero|bookfly)/i.test(s)) return 'reserva';
    if (/\.(png|jpe?g|webp|svg)(\?|$)/i.test(s)) return 'logoUrl';
    if (/^\+?[\d\s]{9,}$/.test(s)) return 'telefono';
    if (/^@/.test(s)) return 'instagram';
    if (/\.[a-z]{2,}/i.test(s)) return 'web';
    return '';
  }

  /* ---------- enlaces que usan TODOS los botones ---------- */
  function telE164(s) {
    var d = soloDigitos(s);
    if (!d) return '';
    if (d.charAt(0) === '+') return d;
    if (d.indexOf('00') === 0) return '+' + d.slice(2);
    if (d.length === 9) return '+34' + d;
    return '+' + d;
  }
  function enlace(tipo) {
    var n = S.negocio || {};
    switch (tipo) {
      case 'reserva': return n.reserva || '';
      case 'web': return n.web || '';
      case 'club': return n.club || '';
      case 'carta': return n.carta || '';
      case 'eventos': return n.eventos || '';
      case 'tel': return n.telefono ? 'tel:' + telE164(n.telefono) : '';
      case 'whatsapp': {
        if (!n.whatsapp) return '';
        var txt = encodeURIComponent('Hola, quiero reservar una mesa en ' + (n.nombre || 'vuestro local'));
        return 'https://wa.me/' + telE164(n.whatsapp).replace('+', '') + '?text=' + txt;
      }
      case 'instagram': case 'facebook': case 'tiktok': case 'youtube': case 'google': case 'resenas':
        return n[tipo] || '';
      case 'mapa': return n.google || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((n.nombre || '') + ' ' + (n.direccion || n.ciudad || '')));
    }
    return '';
  }
  var CAMPO_DE = { carta: 'carta', eventos: 'eventos', mapa: 'google', club: 'club', reserva: 'reserva', web: 'web', tel: 'telefono', whatsapp: 'whatsapp', instagram: 'instagram', facebook: 'facebook', tiktok: 'tiktok', youtube: 'youtube', google: 'google', resenas: 'resenas' };
  var NOMBRE_DE = { carta: 'el enlace de la carta', eventos: 'el enlace de eventos', club: 'el enlace del club', reserva: 'el enlace de reservas', web: 'tu web', tel: 'tu teléfono', whatsapp: 'tu WhatsApp', instagram: 'tu Instagram', facebook: 'tu Facebook', tiktok: 'tu TikTok', youtube: 'tu YouTube', google: 'tu ficha de Google', resenas: 'el enlace de reseñas' };

  function irA(url) {
    if (!url) return false;
    if (/^(tel|mailto|sms):/.test(url)) {
      // un enlace de verdad pulsado: es lo que mejor entienden el iPhone y el ordenador
      var a = document.createElement('a'); a.href = url; a.style.display = 'none';
      document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500);
      return true;
    }
    var w = null;
    // pestaña nueva (sin 'noopener' en el tercer parámetro: con él window.open devuelve null y no se sabría si se abrió)
    try { w = window.open(url, '_blank'); if (w) { try { w.opener = null; } catch (e) {} } } catch (e) {}
    if (!w) { // ventana bloqueada: enlace de verdad con target=_blank
      var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
      document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500);
    }
    return true;
  }
  /* Si falta el dato, en vez de un aviso que no lleva a nada, abre «Mi negocio»
     con la casilla que falta señalada. */
  function abrirCta(tipo) {
    if (irA(enlace(tipo))) return;
    try { cerrarModal(); } catch (e) {}
    try { cerrarChat(); } catch (e) {}
    vista('panel');
    panel('ajustes');
    var id = 'mn_' + (CAMPO_DE[tipo] || tipo);
    setTimeout(function () {
      var el = $(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); el.classList.add('mn-falta'); }
    }, 60);
    toast('Falta ' + (NOMBRE_DE[tipo] || 'ese dato') + ': pégalo aquí y guarda 🙂');
  }
  function ctaBotones() {
    var n = S.negocio, h = '<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">';
    h += '<button class="btn pp" style="flex:none" onclick="abrirCta(\'reserva\')">📅 Reservar</button>';
    h += '<button class="btn g" style="flex:none" onclick="abrirCta(\'web\')">🌐 Ver web</button>';
    if (n.carta) h += '<button class="btn g" style="flex:none" onclick="abrirCta(\'carta\')">📖 Ver carta</button>';
    if (n.whatsapp) h += '<button class="btn g" style="flex:none" onclick="abrirCta(\'whatsapp\')">💬 Reservar por WhatsApp</button>';
    if (n.google) h += '<button class="btn g" style="flex:none" onclick="abrirCta(\'google\')">📍 Cómo llegar</button>';
    if (n.telefono) h += '<button class="btn g" style="flex:none" onclick="abrirCta(\'tel\')">📞 Llamar</button>';
    return h + '</div>';
  }

  /* ---------- estilos de esta parte ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.mn-sec{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--tx3);margin:18px 0 4px}' +
    '.mn-f{position:relative}.mn-f .inp{padding-right:44px}' +
    '.mn-f .mn-ir{position:absolute;right:6px;bottom:6px;border:1px solid var(--line);background:var(--panel2);color:var(--tx);border-radius:8px;width:32px;height:30px;cursor:pointer;font-size:14px}' +
    '.mn-ok{border-color:rgba(52,211,153,.55)!important}.mn-bad,.mn-falta{border-color:#fb7185!important;box-shadow:0 0 0 3px rgba(251,113,133,.18)}' +
    '.mn-msg{font-size:11.5px;color:#fb7185;margin-top:4px;min-height:0}' +
    '.mn-logo{width:56px;height:56px;border-radius:14px;object-fit:cover;background:var(--bg2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:28px;flex:none!important;min-width:0!important}' +
    '.mn-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}@media(max-width:640px){.mn-grid{grid-template-columns:1fr}}' +
    '.mn-res{border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-top:8px;cursor:pointer;background:var(--bg2)}.mn-res:hover{border-color:var(--purple)}' +
    '.cx{border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px;background:var(--panel)}' +
    '.cx h3{margin:0 0 4px;font-size:16px;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}' +
    '.cx ol{margin:8px 0 0;padding-left:20px;font-size:13.5px;color:var(--tx2)}.cx ol li{margin:5px 0}' +
    '.cx .perm{font-size:12px;background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.25);border-radius:10px;padding:8px 10px;margin-top:10px;color:var(--tx2)}' +
    '.cx code{font-size:11.5px;background:var(--bg2);padding:1px 5px;border-radius:5px;color:var(--purple2)}' +
    '.cx .est{font-size:11px;font-weight:800;padding:3px 10px;border-radius:30px}' +
    '.cx .est.si{background:rgba(52,211,153,.14);color:var(--verde);border:1px solid rgba(52,211,153,.4)}' +
    '.cx .est.no{background:rgba(255,204,51,.12);color:var(--amber);border:1px solid rgba(255,204,51,.3)}' +
    '.cx label.hecho{display:flex;gap:8px;align-items:center;font-size:13px;margin-top:10px;cursor:pointer}';
  document.head.appendChild(css);

  /* ---------- pantalla «Mi negocio» ---------- */
  function campo(k, lb, ph, opts) {
    opts = opts || {};
    var n = S.negocio, v = n[k] || '';
    var ir = opts.ir ? '<button class="mn-ir" type="button" title="Probar el enlace" onclick="mnProbar(\'' + k + '\')">↗</button>' : '';
    return '<div class="mn-f"><label class="lb" style="margin-top:10px">' + lb + '</label>' +
      '<input class="inp" id="mn_' + k + '" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '"' +
      (opts.tipo ? ' inputmode="' + opts.tipo + '"' : '') + ' autocomplete="off" autocapitalize="off" spellcheck="false" oninput="mnValidar(\'' + k + '\')">' +
      ir + '<div class="mn-msg" id="mnm_' + k + '"></div></div>';
  }
  function logoHtml() {
    var n = S.negocio;
    return n.logoUrl ? '<img class="mn-logo" src="' + esc(n.logoUrl) + '" alt="Logo" onerror="this.outerHTML=\'<div class=&quot;mn-logo&quot;>' + esc(n.logo || '🍽️') + '</div>\'">'
      : '<div class="mn-logo">' + esc(n.logo || '🍽️') + '</div>';
  }
  function completado() {
    var n = S.negocio, k = ['nombre', 'web', 'reserva', 'telefono', 'whatsapp', 'instagram', 'facebook', 'tiktok', 'youtube', 'google', 'club'];
    var c = k.filter(function (x) { return !!n[x]; }).length;
    return Math.round(c / k.length * 100);
  }
  function vAjustes() {
    sembrar();
    var n = S.negocio, logos = ['🍽️', '✂️', '🔧', '🏗️', '☕', '💅', '🐶', '🏠', '👗', '🥐'], pct = completado();
    return '<div class="hd"><h2>🏪 Mi negocio</h2><div class="row" style="flex:none;gap:8px">' +
      '<button class="btn g sm" style="flex:none" onclick="panel(\'conectar\')">🔗 Conecta tus redes</button>' +
      '<button class="btn pp sm" style="flex:none" onclick="guardarAjustes()">💾 Guardar</button></div></div>' +

      '<div class="card"><div class="row" style="align-items:center;gap:14px">' + logoHtml() +
      '<div style="min-width:0"><div style="font-weight:800;font-size:17px">' + esc(n.nombre || 'Tu negocio') + '</div>' +
      '<div style="font-size:12.5px;color:var(--tx3)">' + esc(n.direccion || n.ciudad || '') + '</div>' +
      '<div style="margin-top:6px;height:7px;background:var(--bg2);border-radius:9px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:var(--grad)"></div></div>' +
      '<div class="row" style="gap:6px;margin:8px 0 4px">' +
      [['reserva', '📅 Reservar'], ['web', '🌐 Web'], ['carta', '📖 Ver carta'], ['eventos', '🎉 Eventos'], ['google', '📍 Cómo llegar / Ver en Google'], ['whatsapp', '💬 WhatsApp']]
        .map(function (b) { return '<button class="btn g sm" style="flex:none" onclick="abrirCta(\'' + b[0] + '\')">' + b[1] + '</button>'; }).join('') + '</div>' +
      '<div style="font-size:11.5px;color:var(--tx3);margin-top:3px">Ficha completa al ' + pct + ' % · estos datos los usan TODOS los botones de Chispa (Reservar, Ver web, WhatsApp, Llamar…)</div></div></div></div>' +

      fichaGoogleHtml() +
      '<div class="card"><h3>⚡ Rellénalo en un momento</h3>' +
      '<label class="lb">Pega aquí cualquier enlace (Instagram, web, reservas, Google…) y Chispa lo pone en su sitio</label>' +
      '<div class="row" style="gap:8px"><input class="inp" id="mnPega" placeholder="https://www.instagram.com/tunegocio/" autocomplete="off" autocapitalize="off" style="flex:3">' +
      '<button class="btn pp sm" style="flex:none" onclick="mnPegar()">Colocar</button></div>' +
      '<div class="row" style="gap:8px;margin-top:10px">' +
      '<button class="btn g sm" style="flex:none" onclick="mnBuscarGoogle()">🔎 Buscar mi negocio en Google</button>' +
      '<button class="btn g sm" style="flex:none" onclick="mnBuscarMaps()">🗺️ Abrir en Google Maps</button>' +
      '<button class="btn g sm" style="flex:none" onclick="mnDatosPublicos()">📥 Traer datos públicos (sin clave)</button></div>' +
      '<div id="mnRes"></div>' +
      '<p style="font-size:11.5px;color:var(--tx3);margin:10px 0 0">«Traer datos públicos» busca tu local en OpenStreetMap (gratis, sin clave) y rellena solo lo que esté vacío. ' +
      'Sacarlos directamente de la ficha de Google necesita una clave de Google Places: <a href="#" onclick="mnInfoPlaces();return false" style="color:var(--purple2)">qué hace falta</a>.</p></div>' +

      '<div class="card"><h3>🏷️ Quién eres</h3><div class="mn-grid">' +
      campo('nombre', 'Nombre del negocio', 'El Paraíso Bar Restaurante') +
      campo('sector', 'Qué es / sector', 'Restaurante, peluquería…') +
      campo('ciudad', 'Ciudad', 'Palma de Mallorca') +
      campo('direccion', 'Dirección', 'C/ Ejemplo, 12') + '</div>' +
      campo('logoUrl', 'Logo (enlace a la imagen)', 'https://tuweb.com/logo.png', { ir: 1 }) +
      '<label class="lb" style="margin-top:10px">…o un icono si no tienes logo</label><div class="row" style="gap:6px;flex-wrap:wrap">' +
      logos.map(function (l) { return '<button class="btn g sm" style="flex:none;font-size:20px;' + (l === n.logo ? 'border-color:var(--purple)' : '') + '" onclick="mnIcono(\'' + l + '\')">' + l + '</button>'; }).join('') + '</div>' +
      '<label class="lb" style="margin-top:10px">Tono de voz</label><select id="ajTono">' +
      ['Cercano y con chispa', 'Elegante y formal', 'Divertido y gamberro', 'Profesional y claro'].map(function (t) { return '<option ' + (t === n.tono ? 'selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
      '<label class="lb" style="margin-top:10px">Color de marca</label><div class="row" style="gap:8px;flex-wrap:wrap">' +
      ['#8b5cf6', '#ffb020', '#fb7185', '#34d399', '#60a5fa', '#f97316', '#ec4899'].map(function (c) { return '<button class="sw' + (c === n.color ? ' on' : '') + '" style="background:' + c + '" onclick="setColor(this,\'' + c + '\')"></button>'; }).join('') + '</div></div>' +

      '<div class="card"><h3>📅 Reservas y contacto</h3><div class="mn-grid">' +
      campo('reserva', 'Enlace de reservas', 'https://… (TheFork, tu web de reservas…)', { ir: 1 }) +
      campo('web', 'Web', 'https://tunegocio.com', { ir: 1 }) +
      campo('carta', 'Carta', 'https://tunegocio.com/carta', { ir: 1 }) +
      campo('eventos', 'Eventos', 'https://tunegocio.com/eventos', { ir: 1 }) +
      campo('telefono', 'Teléfono', '971 00 00 00', { ir: 1, tipo: 'tel' }) +
      campo('whatsapp', 'WhatsApp de reservas (el que escriben los clientes)', '600 00 00 00', { ir: 1, tipo: 'tel' }) +
      campo('club', 'Club de clientes / fidelización', 'https://…', { ir: 1 }) +
      campo('whatsappApi', 'Número para la API de WhatsApp de Chispa', '971 00 00 00', { tipo: 'tel' }) + '</div>' +
      '<p style="font-size:11.5px;color:var(--tx3);margin:6px 0 0">«Reservar» abre el enlace de reservas (puede ser un WhatsApp). El número de la API es el fijo del local: ese número no puede tener WhatsApp normal instalado.</p></div>' +

      '<div class="card"><h3>📲 Redes sociales</h3><div class="mn-grid">' +
      campo('instagram', 'Instagram', '@tunegocio', { ir: 1 }) +
      campo('tiktok', 'TikTok', '@tunegocio', { ir: 1 }) +
      campo('facebook', 'Facebook', 'facebook.com/tunegocio', { ir: 1 }) +
      campo('youtube', 'YouTube', '@tucanal', { ir: 1 }) + '</div></div>' +

      '<div class="card"><h3>📍 Google</h3>' +
      campo('google', 'Ficha de Google (Maps → Compartir → Copiar enlace)', 'https://maps.app.goo.gl/…', { ir: 1 }) +
      campo('resenas', 'Enlace para pedir reseñas', 'https://g.page/r/…/review', { ir: 1 }) + '</div>' +

      '<div class="card"><h3>🚀 Cómo publica Chispa</h3>' +
      '<label class="lb">Dónde publica</label><select id="ajRed">' +
      ['Instagram + Facebook', 'Solo Instagram', 'Solo Facebook', 'Instagram + Facebook + TikTok', 'Instagram + Facebook + TikTok + YouTube'].map(function (r) { return '<option ' + (r === n.red ? 'selected' : '') + '>' + r + '</option>'; }).join('') + '</select>' +
      '<label class="lb" style="margin-top:10px">Oferta activa (sale como sello 🔥 en tus anuncios)</label><input class="inp" id="ajOferta" value="' + esc(n.oferta || '') + '" placeholder="-10% esta semana, 2x1 en mojitos…">' +
      '<div style="margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:11px;background:rgba(139,92,246,.06)"><div class="row" style="align-items:center;justify-content:space-between;gap:10px"><div><div style="font-weight:700">🤖 Piloto automático</div><div style="font-size:12px;color:var(--tx3)">Chispa crea y programa tu semana sola. Publicará por ti en cuanto conectes tus cuentas.</div></div><button class="btn ' + (n.piloto ? 'pp' : 'g') + ' sm" style="flex:none" onclick="togglePiloto()">' + (n.piloto ? '✓ Activado' : 'Activar') + '</button></div></div></div>' +

      '<button class="btn pp" style="width:100%" onclick="guardarAjustes()">💾 Guardar cambios</button>' +
      '<div class="row" style="margin-top:10px;gap:8px;padding-bottom:80px"><button class="btn g sm" style="flex:none" onclick="mnRestaurarParaiso()">↺ Poner los datos de El Paraíso</button>' +
      '<button class="btn g sm" style="flex:none" onclick="resetTodo()">↺ Reiniciar demo</button></div>';
  }

  /* ---------- ficha de Google: conectar, horario, fotos y novedades ---------- */
  function horario() {
    var n = S.negocio;
    if (!n.horario || n.horario.length !== 7) n.horario = (window.ChispaFicha ? ChispaFicha.HORARIO_PARAISO : []).map(function (d) { return Object.assign({}, d); });
    return n.horario;
  }
  function estadoFicha() {
    var F = window.ChispaFicha;
    if (F && F.conectado()) return ['si', '✓ Conectada: ' + (F.ficha() && F.ficha().titulo || 'tu ficha')];
    if (F && F.configurado()) return ['no', 'Lista para conectar'];
    return ['no', 'Pendiente del permiso de Google'];
  }
  function fichaGoogleHtml() {
    var e = estadoFicha(), dias = (window.ChispaFicha ? ChispaFicha.DIAS_ES : []), h = horario();
    return '<div class="card" style="border-color:rgba(255,204,51,.45);background:linear-gradient(180deg,rgba(255,204,51,.07),transparent)">' +
      '<h3 style="justify-content:space-between;flex-wrap:wrap"><span>📍 Tu ficha de Google · lo más importante</span><span class="chip ' + (e[0] === 'si' ? '' : 'amb') + '">' + e[1] + '</span></h3>' +
      '<p style="font-size:13px;color:var(--tx2);margin:0 0 10px">Es lo primero que ve quien te busca en Google y en Maps. Chispa publica tus novedades y ofertas ahí, cambia el horario y sube fotos, igual que en Instagram.</p>' +
      '<div class="row" style="gap:8px">' +
      '<button class="btn pp sm" style="flex:none" onclick="mnFichaConectar()">🔗 Conectar mi ficha</button>' +
      '<button class="btn g sm" style="flex:none" onclick="mnFichaVer(\'mnHorario\')">🕒 Horario</button>' +
      '<button class="btn g sm" style="flex:none" onclick="mnFichaVer(\'mnFotos\')">📸 Fotos</button>' +
      '<button class="btn g sm" style="flex:none" onclick="mnFichaVer(\'mnNovedad\')">📝 Publicar novedad</button>' +
      '<button class="btn g sm" style="flex:none" onclick="abrirCta(\'google\')">📍 Cómo llegar / Ver en Google ↗</button>' +
      '<button class="btn g sm" style="flex:none" onclick="abrirCta(\'resenas\')">⭐ Pedir reseña ↗</button></div>' +
      '<details id="mnHorario" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">🕒 Horario de la ficha</summary>' +
      '<div style="margin-top:8px">' + dias.map(function (d, i) {
        var x = h[i] || {};
        return '<div class="row" style="align-items:center;gap:8px;margin:5px 0"><div style="flex:0 0 86px;min-width:0;font-size:13px">' + d + '</div>' +
          '<input class="inp" type="time" id="mnH_a' + i + '" value="' + esc(x.a || '') + '" style="flex:1;min-width:0;padding:8px"' + (x.cerrado ? ' disabled' : '') + '>' +
          '<input class="inp" type="time" id="mnH_c' + i + '" value="' + esc(x.c || '') + '" style="flex:1;min-width:0;padding:8px"' + (x.cerrado ? ' disabled' : '') + '>' +
          '<label style="flex:none;min-width:0;font-size:12px;display:flex;gap:4px;align-items:center"><input type="checkbox" id="mnH_x' + i + '"' + (x.cerrado ? ' checked' : '') + ' onchange="mnHorCerrado(' + i + ',this.checked)">Cerrado</label></div>';
      }).join('') +
      '<button class="btn pp sm" style="margin-top:6px" onclick="mnHorarioGoogle()">💾 Guardar y actualizar en Google</button></div></details>' +
      '<details id="mnFotos" style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">📸 Subir una foto a la ficha</summary>' +
      '<label class="lb" style="margin-top:8px">Enlace público de la foto (las que crea Chispa ya lo tienen)</label><input class="inp" id="mnFotoUrl" placeholder="https://…/plato.jpg" autocapitalize="off">' +
      '<label class="lb" style="margin-top:8px">Tipo</label><select id="mnFotoCat"><option value="FOOD_AND_DRINK">Comida y bebida</option><option value="INTERIOR">Interior</option><option value="EXTERIOR">Fachada</option><option value="TEAMS">Equipo</option><option value="COVER">Portada</option><option value="LOGO">Logo</option></select>' +
      '<button class="btn pp sm" style="margin-top:8px" onclick="mnFotoGoogle()">⬆️ Subir a Google</button></details>' +
      '<details id="mnNovedad" style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">📝 Publicar una novedad u oferta en la ficha</summary>' +
      '<textarea id="mnNovTxt" style="margin-top:8px" placeholder="Ej: Este domingo, paella para compartir. ¡Reserva tu mesa!"></textarea>' +
      '<label style="display:flex;gap:6px;align-items:center;font-size:13px;margin-top:6px"><input type="checkbox" id="mnNovOf"> Es una oferta (sale con la etiqueta «Oferta» 7 días)</label>' +
      '<button class="btn pp sm" style="margin-top:8px" onclick="mnNovedadGoogle()">📍 Publicar en Google</button></details></div>';
  }
  function mnFichaVer(id) { var d = $(id); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  function mnFichaConectar() {
    var F = window.ChispaFicha;
    if (F && F.configurado()) { F.conectar().then(function (f) { toast('📍 Ficha conectada: ' + f.titulo); panel('ajustes'); }).catch(function (e) { toast('Google: ' + e.message); }); return; }
    panel('conectar'); setTimeout(function () { var c = $('cx_google'); if (c) c.scrollIntoView({ behavior: 'smooth' }); }, 60);
  }
  function mnHorCerrado(i, si) { var a = $('mnH_a' + i), c = $('mnH_c' + i); if (a) a.disabled = si; if (c) c.disabled = si; }
  function leerHorario() {
    var h = horario();
    for (var i = 0; i < 7; i++) {
      var x = $('mnH_x' + i); if (!x) continue;
      h[i] = x.checked ? { cerrado: true } : { a: $('mnH_a' + i).value, c: $('mnH_c' + i).value };
      if (!x.checked && (!h[i].a || !h[i].c)) { toast('Falta la hora de ' + ChispaFicha.DIAS_ES[i]); return null; }
    }
    return h;
  }
  function mnHorarioGoogle() { var h = leerHorario(); if (!h) return; guardar(); ChispaFicha.actualizarHorario(h); }
  function mnFotoGoogle() {
    var u = conHttps(($('mnFotoUrl') || {}).value || '');
    if (!urlValida(u)) { toast('Pega el enlace de la foto (https://…)'); return; }
    ChispaFicha.subirFoto(u, $('mnFotoCat').value);
  }
  function mnNovedadGoogle() {
    var t = (($('mnNovTxt') || {}).value || '').trim();
    if (!t) { toast('Escribe la novedad primero 🙂'); return; }
    ChispaFicha.publicar({ texto: t, oferta: $('mnNovOf').checked ? (S.negocio.oferta || t.slice(0, 58)) : '' });
  }

  function mnValidar(k) {
    var el = $('mn_' + k); if (!el) return true;
    var r = revisar(k, el.value), m = $('mnm_' + k);
    el.classList.remove('mn-falta');
    el.classList.toggle('mn-bad', !r.ok);
    el.classList.toggle('mn-ok', r.ok && !!el.value.trim() && !!REGLAS[k]);
    if (m) m.textContent = r.ok ? '' : (r.msg || 'Revisa este dato');
    return r.ok;
  }
  function mnProbar(k) {
    var el = $('mn_' + k); if (!el) return;
    var r = revisar(k, el.value);
    if (!el.value.trim()) { toast('Primero pega el enlace 🙂'); el.focus(); return; }
    if (!r.ok) { mnValidar(k); toast(r.msg); return; }
    if (k === 'telefono') return irA('tel:' + telE164(r.v));
    if (k === 'whatsapp') return irA('https://wa.me/' + telE164(r.v).replace('+', ''));
    irA(r.v);
  }
  function leerFormulario() {
    var n = S.negocio, malos = [];
    CAMPOS.forEach(function (k) {
      var el = $('mn_' + k); if (!el) return;
      var r = revisar(k, el.value);
      if (!r.ok) { malos.push(k); mnValidar(k); return; }
      n[k] = r.v;
    });
    if ($('ajTono')) n.tono = $('ajTono').value;
    if ($('ajRed')) n.red = $('ajRed').value;
    if ($('ajOferta')) n.oferta = $('ajOferta').value.trim();
    if (!n.nombre) n.nombre = 'Mi negocio';
    return malos;
  }
  function guardarAjustes() {
    var malos = leerFormulario();
    if (malos.length) {
      var el = $('mn_' + malos[0]); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
      toast('Hay ' + malos.length + ' dato' + (malos.length > 1 ? 's' : '') + ' que revisar (en rojo). Lo demás no se ha perdido.');
      return;
    }
    aplicarMarca(); guardar();
    toast('Guardado ✓ Chispa ya usa los datos de tu negocio');
    panel('ajustes');
  }
  function mnIcono(l) { leerFormulario(); S.negocio.logo = l; S.negocio.logoUrl = ''; guardar(); panel('ajustes'); toast('Icono puesto ✓'); }
  function mnPegar() {
    var el = $('mnPega'), s = (el && el.value || '').trim();
    if (!s) { toast('Pega un enlace primero 🙂'); return; }
    var k = adivinarCampo(s);
    if (!k) { toast('No reconozco ese enlace. Pégalo directamente en su casilla.'); return; }
    var r = revisar(k, s);
    if (!r.ok) { toast(r.msg); return; }
    var c = $('mn_' + k); if (c) { c.value = r.v; mnValidar(k); c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    el.value = '';
    var etiquetas = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', youtube: 'YouTube', whatsapp: 'WhatsApp', resenas: 'Reseñas de Google', google: 'Ficha de Google', reserva: 'Reservas', logoUrl: 'Logo', telefono: 'Teléfono', web: 'Web' };
    // si es un enlace de Google Maps con el nombre dentro, lo aprovechamos
    if (k === 'google') {
      var m = s.match(/\/maps\/place\/([^/@?]+)/);
      if (m && $('mn_nombre') && !$('mn_nombre').value.trim()) $('mn_nombre').value = decodeURIComponent(m[1].replace(/\+/g, ' '));
    }
    toast('Puesto en «' + (etiquetas[k] || k) + '» ✓ Pulsa Guardar');
  }
  function textoBusqueda() {
    var nom = ($('mn_nombre') && $('mn_nombre').value) || S.negocio.nombre || '';
    var ciu = ($('mn_ciudad') && $('mn_ciudad').value) || S.negocio.ciudad || '';
    return (nom + ' ' + ciu).trim();
  }
  function mnBuscarGoogle() { irA('https://www.google.com/search?q=' + encodeURIComponent(textoBusqueda())); toast('Busca tu ficha → Compartir → Copiar enlace, y pégalo arriba'); }
  function mnBuscarMaps() { irA('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(textoBusqueda())); }

  /* Datos públicos SIN clave: OpenStreetMap (Nominatim permite llamadas desde el
     navegador). Solo rellena casillas vacías y el dueño elige el resultado. */
  var _osm = [];
  function mnDatosPublicos() {
    var q = textoBusqueda(), box = $('mnRes');
    if (!q) { toast('Escribe primero el nombre del negocio'); return; }
    box.innerHTML = '<div style="font-size:13px;color:var(--tx3);margin-top:10px">Buscando «' + esc(q) + '»…</div>';
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&limit=5&accept-language=es&q=' + encodeURIComponent(q);
    fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }).then(function (lista) {
      _osm = (lista || []).filter(function (x) { return x && x.display_name; });
      if (!_osm.length) {
        box.innerHTML = '<div class="mn-res" onclick="mnBuscarMaps()">No está en OpenStreetMap con ese nombre. <b>Ábrelo en Google Maps ›</b> y pega el enlace de la ficha arriba.</div>';
        return;
      }
      box.innerHTML = '<div style="font-size:12.5px;color:var(--tx3);margin-top:10px">Toca el tuyo para traer sus datos:</div>' + _osm.map(function (x, i) {
        var t = x.extratags || {};
        var extra = [t.phone || t['contact:phone'], t.website || t['contact:website'], t.opening_hours].filter(Boolean).join(' · ');
        return '<div class="mn-res" onclick="mnUsarOsm(' + i + ')"><b>' + esc(x.name || x.display_name.split(',')[0]) + '</b><div style="font-size:12px;color:var(--tx3)">' + esc(x.display_name) + '</div>' +
          (extra ? '<div style="font-size:12px;color:var(--tx2);margin-top:3px">' + esc(extra) + '</div>' : '') + '</div>';
      }).join('');
    }).catch(function () {
      box.innerHTML = '<div class="mn-res" onclick="mnBuscarMaps()">No se ha podido consultar ahora (¿sin conexión?). <b>Ábrelo en Google Maps ›</b></div>';
    });
  }
  function mnUsarOsm(i) {
    var x = _osm[i]; if (!x) return;
    var t = x.extratags || {}, a = x.address || {}, puestos = [];
    function pon(k, v) { var el = $('mn_' + k); if (el && v && !el.value.trim()) { el.value = v; mnValidar(k); puestos.push(k); } }
    var calle = [a.road, a.house_number].filter(Boolean).join(', ');
    pon('direccion', [calle, [a.postcode, a.city || a.town || a.village].filter(Boolean).join(' ')].filter(Boolean).join(', '));
    pon('ciudad', a.city || a.town || a.village);
    pon('telefono', t.phone || t['contact:phone']);
    pon('web', t.website || t['contact:website']);
    pon('instagram', t['contact:instagram']);
    pon('facebook', t['contact:facebook']);
    pon('google', 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((x.name || '') + ' ' + (calle || '')));
    $('mnRes').innerHTML = '';
    toast(puestos.length ? 'Rellenado: ' + puestos.length + ' dato(s) ✓ Revisa y pulsa Guardar' : 'Tus casillas ya estaban rellenas: no he tocado nada');
  }
  function mnInfoPlaces() {
    modal('<h3>📍 Datos directos de la ficha de Google</h3>' +
      '<p style="color:var(--tx2);font-size:14px">Para leer tu ficha de Google (horario, teléfono, web, fotos, nota) de forma automática hace falta la <b>API de Google Places</b>. No tiene versión gratuita sin clave.</p>' +
      '<ol style="font-size:13.5px;color:var(--tx2);padding-left:20px">' +
      '<li>En <b>console.cloud.google.com</b> crea un proyecto y activa <b>Places API (New)</b>. Pide tarjeta, pero trae crédito mensual gratuito que sobra para un restaurante.</li>' +
      '<li>En «Credenciales» crea una <b>clave de API</b> y <b>restríngela</b>: solo Places API y solo el sitio <code>solers-es.github.io</code>.</li>' +
      '<li>Se la pasas a Claude y la pone en el conector (no se publica sin restringir).</li></ol>' +
      '<p style="font-size:12.5px;color:var(--tx3)">Llamadas que usaría: <code>places:searchText</code> (buscar por nombre) y <code>places/{id}</code> con los campos <code>displayName, formattedAddress, nationalPhoneNumber, websiteUri, regularOpeningHours, googleMapsUri</code>. ' +
      'Mientras tanto: «Buscar mi negocio en Google» + pegar el enlace de la ficha hace lo mismo en 20 segundos.</p>' +
      '<button class="btn pp" style="width:100%;margin-top:6px" onclick="cerrarModal();mnBuscarGoogle()">🔎 Buscar mi negocio en Google</button>');
  }
  function mnRestaurarParaiso() {
    if (!confirm('¿Poner los datos reales de El Paraíso? Se sustituyen los enlaces que haya ahora.')) return;
    CAMPOS.forEach(function (k) { S.negocio[k] = PARAISO[k]; });
    guardar(); panel('ajustes'); toast('Datos de El Paraíso puestos ✓');
  }

  /* ---------- guía «Conecta tu negocio en 5 minutos» ---------- */
  var GUIA = [
    {
      id: 'google', ic: '📍', nm: 'Google (ficha de tu negocio) · paso más importante', campo: 'google',
      pasos: [
        'Busca tu negocio en Google Maps. Si pone «¿Eres el propietario?», <b>reclama la ficha</b> y verifica (postal, llamada o vídeo).',
        'En la ficha: <b>Compartir → Copiar enlace</b> y pégalo en «Mi negocio» → Ficha de Google.',
        'En el perfil: <b>Pedir reseñas</b> → copia el enlace (g.page/r/…) y pégalo en «Enlace para pedir reseñas».',
        'Pon tu web y tu enlace de reservas en la ficha (botón «Reservar»), con <code>?o=google</code>.'
      ],
      abrir: [['Buscar mi negocio', '#buscar'], ['Google Business Profile', 'https://business.google.com/']],
      perm: '<b>Permiso oficial:</b> <b>Google Business Profile API</b>, permiso <code>https://www.googleapis.com/auth/business.manage</code>. Con ese único permiso Chispa: <b>publica novedades y ofertas</b> en la ficha (<code>localPosts.create</code>), <b>cambia el horario</b> (Business Information API, <code>locations.patch</code> con <code>regularHours</code>), <b>sube fotos</b> (<code>media.create</code>) y <b>contesta reseñas</b> (<code>reviews.updateReply</code>). ' +
        'Se usa el mismo cliente OAuth de Google que el apartado Reseñas. ' +
        'Hay que <b>pedir acceso a Google</b> con su formulario (la ficha debe estar verificada y tener más de 60 días); hasta que lo aprueban, el cupo es 0.'
    },
    {
      id: 'instagram', ic: '📸', nm: 'Instagram', campo: 'instagram',
      pasos: [
        'En la app de Instagram: <b>Perfil → ☰ → Tipo de cuenta y herramientas → Cambiar a cuenta profesional → Empresa</b>. Gratis y sin perder nada.',
        'Enlázala con tu página de Facebook: <b>Editar perfil → Página</b> (o desde Meta Business Suite).',
        'Pega tu usuario en «Mi negocio» → Instagram.',
        'Pon en tu biografía tu enlace de reservas con <code>?o=instagram</code> para saber cuántas reservas vienen de aquí.'
      ],
      abrir: [['Abrir Instagram', 'https://www.instagram.com/'], ['Meta Business Suite', 'https://business.facebook.com/']],
      perm: '<b>Permiso oficial:</b> Instagram API de Meta (Graph API). Para publicar: <code>instagram_business_content_publish</code>; para leer y contestar comentarios: <code>instagram_business_manage_comments</code>; mensajes: <code>instagram_business_manage_messages</code>. ' +
        'Solers tiene que pasar la <b>revisión de la app (App Review)</b> y la <b>verificación de empresa</b> de Meta. Tope: 50 publicaciones por API cada 24 h por cuenta.'
    },
    {
      id: 'facebook', ic: '👍', nm: 'Facebook', campo: 'facebook',
      pasos: [
        'Necesitas una <b>Página</b> de Facebook (no un perfil personal) y ser su administrador.',
        'Entra en <b>Meta Business Suite</b> con esa página: ahí verás Facebook e Instagram juntos.',
        'Pega el enlace de la página en «Mi negocio» → Facebook.'
      ],
      abrir: [['Meta Business Suite', 'https://business.facebook.com/'], ['Crear una página', 'https://www.facebook.com/pages/create']],
      perm: '<b>Permiso oficial:</b> Facebook Login + Graph API: <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_posts</code> (publicar) y <code>pages_manage_engagement</code> (contestar comentarios). Mismo App Review y verificación de empresa que Instagram (es una sola app de Meta). ' +
        'Para los anuncios: <code>ads_management</code>.'
    },
    {
      id: 'tiktok', ic: '🎵', nm: 'TikTok', campo: 'tiktok',
      pasos: [
        'En TikTok: <b>Perfil → ☰ → Ajustes → Cuenta → Cambiar a Cuenta de empresa</b>.',
        'Pega tu usuario en «Mi negocio» → TikTok.',
        'Pon tu enlace de reservas en la biografía (TikTok lo permite en cuentas de empresa).'
      ],
      abrir: [['Abrir TikTok', 'https://www.tiktok.com/'], ['TikTok Business Center', 'https://business.tiktok.com/']],
      perm: '<b>Permiso oficial:</b> TikTok <b>Content Posting API</b>, con el permiso <code>video.publish</code> (publicación directa) o <code>video.upload</code> (se queda como borrador en tu TikTok y tú le das a publicar). ' +
        'Hasta que TikTok <b>audite</b> la app de Solers, lo que se publique por API sale solo en privado. <b>Contestar comentarios por API no lo permite TikTok</b> a apps normales: eso se hace desde la app.'
    },
    {
      id: 'youtube', ic: '▶️', nm: 'YouTube', campo: 'youtube',
      pasos: [
        'Entra en YouTube con la cuenta de Google del negocio y crea el canal: <b>foto de perfil → Crear un canal</b> (con el nombre del negocio).',
        'Pega el enlace del canal (youtube.com/@…) en «Mi negocio» → YouTube.',
        'Los Shorts que haga Chispa se suben aquí y salen también en Google.'
      ],
      abrir: [['YouTube Studio', 'https://studio.youtube.com/']],
      perm: '<b>Permiso oficial:</b> <b>YouTube Data API v3</b> con OAuth: <code>youtube.upload</code> (subir vídeos) y <code>youtube.force-ssl</code> (contestar comentarios). ' +
        'Google tiene que <b>verificar</b> la app y pasar la <b>auditoría de YouTube</b>; mientras tanto los vídeos subidos por API quedan en privado. Cupo: 10.000 unidades al día y subir un vídeo gasta unas 1.600.'
    },
    {
      id: 'whatsapp', ic: '💬', nm: 'WhatsApp', campo: 'whatsapp',
      pasos: [
        'Pon tu móvil de reservas en «Mi negocio» → WhatsApp de reservas: los botones «📅 Reservar» y «💬 WhatsApp» de tus posts ya abren ese chat con el mensaje escrito. Esto <b>no necesita ningún permiso</b>.',
        'Para que Chispa conteste sola se usa <b>otro número: el fijo del local</b> (en «Número para la API de WhatsApp de Chispa»).',
        'Recomendado: usa <b>WhatsApp Business</b> (gratis) en el móvil del local, con horario y respuesta automática de ausencia.'
      ],
      abrir: [['WhatsApp Business', 'https://www.whatsapp.com/business']],
      perm: '<b>Solo si quieres que Chispa conteste sola:</b> WhatsApp Business Platform (Cloud API) de Meta, directa y sin intermediarios, permiso <code>whatsapp_business_messaging</code> (y <code>whatsapp_business_management</code>), con pago por conversación. ' +
        '<b>⚠️ Importante:</b> Chispa usa el <b>número fijo del local</b> (no el móvil de reservas). Para darlo de alta en la Platform, ese número <b>no puede tener instalado WhatsApp ni WhatsApp Business normal</b> en ningún móvil (si lo tiene, hay que borrar esa cuenta antes). Un fijo sirve: Meta verifica el código con una <b>llamada de voz</b>.'
    }
  ];
  function vConectar() {
    // la ficha de Google va destacada arriba
    sembrar();
    var n = S.negocio, cx = S.conexiones, hechos = GUIA.filter(function (g) { return cx[g.id]; }).length;
    var html = '<div class="hd"><h2>🔗 Conecta tu negocio en 5 minutos</h2><button class="btn g sm" onclick="panel(\'ajustes\')">🏪 Mi negocio</button></div>' +
      '<div class="card"><div style="font-size:14px;color:var(--tx2)">Haz estos pasos <b>una sola vez</b>. Cuando los tengas, Chispa usa tus enlaces en cada publicación y está lista para publicar sola en cuanto las redes aprueben la app de Solers.</div>' +
      '<div style="margin-top:10px;height:8px;background:var(--bg2);border-radius:9px;overflow:hidden"><div style="height:100%;width:' + Math.round(hechos / GUIA.length * 100) + '%;background:var(--grad)"></div></div>' +
      '<div style="font-size:12px;color:var(--tx3);margin-top:4px">' + hechos + ' de ' + GUIA.length + ' listos</div></div>';
    GUIA.forEach(function (g) {
      var tiene = !!n[g.campo];
      html += '<div class="cx" id="cx_' + g.id + '"' + (g.id === 'google' ? ' style="border-color:rgba(255,204,51,.5);background:linear-gradient(180deg,rgba(255,204,51,.07),var(--panel))"' : '') + '><h3><span>' + g.ic + ' ' + g.nm + '</span>' +
        '<span class="est ' + (tiene ? 'si' : 'no') + '">' + (tiene ? '✓ Enlace puesto' : 'Falta el enlace') + '</span></h3>' +
        '<ol>' + g.pasos.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol>' +
        '<div class="row" style="gap:8px;margin-top:10px">' +
        g.abrir.map(function (a) { return '<button class="btn g sm" style="flex:none" onclick="' + (a[1] === '#buscar' ? 'mnBuscarMaps()' : 'mnAbrir(\'' + a[1] + '\')') + '">' + a[0] + ' ↗</button>'; }).join('') +
        '<button class="btn pp sm" style="flex:none" onclick="abrirCta(\'' + (g.id === 'google' ? 'google' : g.id) + '\')">' + (tiene ? 'Ver mi ' + g.nm.split(' ')[0] : 'Poner mi enlace') + '</button></div>' +
        '<div class="perm">' + g.perm + '</div>' +
        '<label class="hecho"><input type="checkbox" ' + (cx[g.id] ? 'checked' : '') + ' onchange="mnHecho(\'' + g.id + '\',this.checked)"> Ya he hecho estos pasos</label></div>';
    });
    html += '<div class="card" style="background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.3)"><div style="font-size:13px;color:var(--tx2)">' +
      '<b style="color:var(--tx)">¿Qué falta para que publique y conteste sola?</b> Que Meta, TikTok, Google y YouTube aprueben la app de Solers con los permisos de arriba. ' +
      'Se conecta <b>directo a las APIs oficiales</b>, sin herramientas puente de pago (nada de Metricool, Buffer ni similares). Es un trámite de Solers, no tuyo: cuando esté, aquí saldrá un botón «Conectar» por red y solo tendrás que pulsar «Permitir». Mientras tanto, Chispa te deja cada publicación lista y tú la subes con un toque.</div></div>';
    return html;
  }
  function mnHecho(id, si) { S.conexiones[id] = !!si; guardar(); panel('conectar'); toast(si ? 'Marcado como hecho ✓' : 'Desmarcado'); }
  function mnAbrir(u) { irA(u); }
  function conectarCuentas(red) {
    try { cerrarModal(); } catch (e) {}
    vista('panel'); panel('conectar');
    var id = typeof red === 'string' ? red : (red && (red.id || red.red)) || '';
    id = ({ ig: 'instagram', igf: 'instagram', igs: 'instagram', fb: 'facebook', tt: 'tiktok', yt: 'youtube', wa: 'whatsapp', gbp: 'google' })[id] || id;
    setTimeout(function () { var c = id && $('cx_' + id); if (c) c.scrollIntoView({ behavior: 'smooth' }); }, 60);
  }

  /* ---------- pestañas: Mi negocio + Conexiones ---------- */
  if (!TABS.some(function (t) { return t.id === 'conectar'; })) {
    TABS.push({ id: 'conectar', ic: '🔗', nm: 'Conexiones' });
  }
  TABS.forEach(function (t) { if (t.id === 'ajustes') t.ic = '🏪'; });
  var panelOriginal = window.panel;
  function panelB(tab) {
    if (tab === 'conectar') { TAB = tab; pintarNav(); $('main').innerHTML = vConectar(); window.scrollTo(0, 0); return; }
    panelOriginal(tab);
    if (tab === 'ajustes') { CAMPOS.forEach(function (k) { var el = $('mn_' + k); if (el && el.value) mnValidar(k); }); }
  }

  /* ---------- precios: cada botón lleva al alta ---------- */
  function elegir(plan) {
    try { localStorage.setItem('chispa_plan', plan); } catch (e) {}
    if (plan === 'Equipo') {
      modal('<h3>Plan Equipo 💜</h3><p style="color:var(--tx2)">Te llamamos o te escribimos hoy para montarlo con tu equipo.</p>' +
        '<button class="btn pp" style="width:100%;margin-top:6px" onclick="mnVentas(\'email\')">✉️ Escribir a ventas</button>' +
        '<button class="btn g" style="width:100%;margin-top:8px" onclick="cerrarModal();vista(\'panel\');panel(\'ajustes\')">Empezar ya con mis datos ›</button>');
      return;
    }
    vista('panel'); panel('ajustes');
    toast('Plan ' + plan + ' elegido ✓ Paso 1: revisa los datos de tu negocio');
  }
  function mnVentas() {
    var n = S.negocio || {};
    irA('mailto:admin@solers.es?subject=' + encodeURIComponent('Chispa · plan Equipo · ' + (n.nombre || '')) +
      '&body=' + encodeURIComponent('Hola, quiero el plan Equipo de Chispa para ' + (n.nombre || 'mi negocio') + '.\nTeléfono: ' + (n.telefono || '') + '\n'));
  }

  /* ---------- chat: cada pregunta acaba en un botón que hace algo ---------- */
  var ACCION_CHAT = {
    '¿Qué haces exactamente?': ['Ver el panel por dentro ›', function () { cerrarChat(); vista('panel'); panel('asistente'); }],
    '¿Cuánto cuesta?': ['Ver los planes ›', function () { cerrarChat(); vista('landing'); var p = document.querySelector('.planes'); if (p) p.scrollIntoView({ behavior: 'smooth' }); }],
    '¿Y si no sé de redes?': ['Que Chispa me proponga un post ›', function () { cerrarChat(); vista('panel'); panel('asistente'); }],
    '¿Publicas en TikTok?': ['Conectar TikTok ›', function () { cerrarChat(); vista('panel'); panel('conectar'); setTimeout(function () { var c = $('cx_tiktok'); if (c) c.scrollIntoView({ behavior: 'smooth' }); }, 60); }],
    '¿Haces vídeos?': ['Abrir el estudio de vídeo ›', function () { cerrarChat(); vista('estudio'); try { estudio('guion'); } catch (e) {} }],
    '¿En otros idiomas?': ['Crear un post en inglés ›', function () { cerrarChat(); window._lang = 'en'; vista('panel'); panel('asistente'); var s = $('contLang'); if (s) s.value = 'en'; toast('Idioma: inglés 🇬🇧'); }],
    '¿Publicas los anuncios?': ['Preparar un anuncio ›', function () { cerrarChat(); vista('panel'); panel('anuncios'); }],
    'Quiero probarlo': ['Empezar: configura tu negocio ›', function () { cerrarChat(); vista('panel'); panel('ajustes'); }]
  };
  var preguntarOriginal = window.preguntar;
  function preguntarB(p) {
    preguntarOriginal(p);
    var a = ACCION_CHAT[p]; if (!a) return;
    // el original pinta su respuesta con retraso; esperamos a que termine de «escribir»
    var intentos = 0;
    (function esperar() {
      var s = $('stream'); if (!s) return;
      if ((s.querySelector('.typing') || intentos === 0) && intentos++ < 60) { setTimeout(esperar, 120); return; }
      var viejos = s.querySelectorAll('button.btn'); // quita el botón genérico del original
      for (var i = 0; i < viejos.length; i++) if (/panel de ejemplo/i.test(viejos[i].textContent)) viejos[i].remove();
      var b = document.createElement('button'); b.className = 'btn pp sm'; b.style.margin = '4px 0 0'; b.textContent = a[0]; b.onclick = a[1];
      s.appendChild(b); s.scrollTop = s.scrollHeight;
    })();
  }
  // Las respuestas del guion se ajustan a lo que ahora hacen los botones
  if (window.GUION) {
    GUION['Quiero probarlo'] = '¡Me encanta! 🎉 Empezamos ya: rellena los datos de tu negocio (nombre, web, reservas, redes) y en 2 minutos tienes tu primera semana de publicaciones lista.';
  }

  /* «+ Crear anuncio»: lleva al formulario y lo señala */
  function nuevoAnuncio() {
    var el = $('adObj'); if (!el) { panel('anuncios'); el = $('adObj'); }
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus();
    el.classList.add('mn-falta'); setTimeout(function () { el.classList.remove('mn-falta'); }, 1600);
    toast('Elige el objetivo y pulsa «Que Chispa prepare el anuncio»');
  }

  /* ---------- publicar en el ámbito global (los onclick los llaman por nombre) ---------- */
  var G = {
    vAjustes: vAjustes, guardarAjustes: guardarAjustes, abrirCta: abrirCta, ctaBotones: ctaBotones,
    conectarCuentas: conectarCuentas, elegir: elegir, panel: panelB, preguntar: preguntarB,
    mnValidar: mnValidar, mnProbar: mnProbar, mnPegar: mnPegar, mnBuscarGoogle: mnBuscarGoogle, mnBuscarMaps: mnBuscarMaps,
    mnDatosPublicos: mnDatosPublicos, mnUsarOsm: mnUsarOsm, mnInfoPlaces: mnInfoPlaces, mnIcono: mnIcono,
    mnRestaurarParaiso: mnRestaurarParaiso, mnHecho: mnHecho, mnAbrir: mnAbrir, mnVentas: mnVentas,
    chispaEnlace: enlace, nuevoAnuncio: nuevoAnuncio,
    mnFichaVer: mnFichaVer, mnFichaConectar: mnFichaConectar, mnHorCerrado: mnHorCerrado, mnHorarioGoogle: mnHorarioGoogle, mnFotoGoogle: mnFotoGoogle, mnNovedadGoogle: mnNovedadGoogle
  };
  for (var k in G) window[k] = G[k];

  sembrar();
  pintarNav();
  var h = location.hash || '';
  if (/negocio|ajustes/.test(h)) { vista('panel'); panel('ajustes'); }
  else if (/conectar|conexion/.test(h)) { vista('panel'); panel('conectar'); }
  else if ($('app') && $('app').classList.contains('on') && TAB === 'ajustes') panel('ajustes');
})();
