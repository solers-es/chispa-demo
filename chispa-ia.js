/* =====================================================================
   Chispa · IA de verdad en la página (trabajador G)
   ---------------------------------------------------------------------
   Lo que Blotato tiene y Chispa no tenía, SIN herramientas de pago:
     1. «Crear imagen con IA» → imagen generada de verdad (FLUX en
        Cloudflare Workers AI, gratis dentro del cupo diario), acorde al
        texto y al sector, con el sello de marca encima como siempre.
     2. Vídeo con VOZ en off y SUBTÍTULOS palabra a palabra.
        Voz del servidor (grabada dentro del vídeo): español, inglés,
        francés, chino, japonés y coreano. Otros idiomas: voz del navegador
        (gratis) solo para escucharla; el vídeo sale con subtítulos.
     3. Varios idiomas: traducir una publicación (juntos en un texto o
        versiones aparte) y escribir en el idioma del negocio/creador.
     4. Reaprovechar un texto largo (artículo, guion, transcripción) en
        varias piezas: posts, hilo, carrusel, guion de reel, historias…
     5. Claves de API (n8n, Make, Claude/MCP) en Conexiones.
   Todo pasa por el servidor de Chispa (conectores/ia.js); sin servidor o
   sin sesión, Chispa sigue como antes (fotos libres) y lo dice.
   Se carga DESPUÉS de chispa-sync.js. Sin FileReader.
   ===================================================================== */
(function () {
  'use strict';
  if (window.ChispaIA) return;

  var VOZ_SERVIDOR = { es: 1, en: 1, fr: 1, zh: 1, ja: 1, ko: 1 };
  var IDIOMAS = [['es', '🇪🇸 Español'], ['en', '🇬🇧 Inglés'], ['de', '🇩🇪 Alemán'], ['fr', '🇫🇷 Francés'], ['it', '🇮🇹 Italiano'], ['pt', '🇵🇹 Portugués'], ['nl', '🇳🇱 Neerlandés'], ['ca', 'Catalán'], ['zh', '🇨🇳 Chino'], ['ja', '🇯🇵 Japonés'], ['ko', '🇰🇷 Coreano'], ['ar', '🇸🇦 Árabe'], ['ru', '🇷🇺 Ruso'], ['pl', '🇵🇱 Polaco'], ['sv', '🇸🇪 Sueco']];
  var BANDERA = { es: '🇪🇸', en: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', it: '🇮🇹', pt: '🇵🇹', nl: '🇳🇱', ca: '🟨', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', ar: '🇸🇦', ru: '🇷🇺', pl: '🇵🇱', sv: '🇸🇪' };
  var PIEZAS = [['posts', '3 posts'], ['hilo', 'Hilo (X / Threads)'], ['carrusel', 'Carrusel'], ['guion', 'Guion de reel / TikTok'], ['historias', 'Historias'], ['newsletter', 'Newsletter']];
  var DOCS_API = 'https://github.com/solers-es/chispa-demo/blob/main/docs/API-CHISPA.md';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (s == null ? '' : '' + s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(m) { try { if (typeof window.toast === 'function') window.toast(m); } catch (e) {} }
  function sync() { return window.ChispaSync; }
  function activo() { var s = sync(); if (!s || !s.pedir || !s.estado) return false; var e = s.estado(); return e.modo === 'servidor' && !e.pausado; }
  function pedir(m, r, c) { return sync().pedir(m, r, c); }
  function info() { try { if (window.ChispaSector && ChispaSector.paraIA) return ChispaSector.paraIA(); } catch (e) {} var n = (window.S && S.negocio) || {}; return { sector: '', negocio: n.nombre, ciudad: n.ciudad, idioma: { base: (window._lang || 'es').slice(0, 2), nombre: '' } }; }
  function idioma() { var i = info().idioma; return ((i && (i.base || i.codigo)) || window._lang || 'es').slice(0, 2).toLowerCase(); }
  function nombreIdioma(c) { try { if (window.Intl && Intl.DisplayNames) { var t = new Intl.DisplayNames(['es'], { type: 'language' }).of(c); if (t && t !== c) return t; } } catch (e) {} return c; }
  function copiar(t) { try { navigator.clipboard.writeText(t).then(function () { aviso('Copiado ✓'); }, function () { prompt('Copia el texto', t); }); } catch (e) { prompt('Copia el texto', t); } }
  function sinServidorHtml(que) { return '<div style="font-size:13px;color:var(--amber,#ffcc33);margin-top:6px">⚠️ ' + que + ' necesita el servidor de Chispa: entra con tu código en <a href="javascript:void 0" onclick="cerrarModal&&cerrarModal();panel(\'conectar\')">Conexiones</a>.</div>'; }

  /* =====================================================================
     1 · MOTOR DE IMAGEN «chispa»
     ===================================================================== */
  var M = window.CHISPA_MOTOR;
  function cargarImg(src) { return new Promise(function (ok, ko) { var im = new Image(); im.crossOrigin = 'anonymous'; im.onload = function () { ok(im); }; im.onerror = ko; im.src = src; }); }
  if (M && M.proveedores) {
    M.proveedores.chispa = function (q) {
      if (!q.ia) return M.proveedores.fotos(q);
      if (!activo()) return M.proveedores.fotos(q).then(function (m) { m.aviso = '📷 Foto libre: la IA de imágenes funciona al entrar en el servidor (Conexiones)'; return m; });
      var I = info();
      return pedir('POST', '/ia/imagen', { texto: q.texto, titulo: q.titulo, sector: I.sector, ciudad: I.ciudad, cantidad: Math.min(q.cantidad || 1, 3), semilla: q.semilla })
        .then(function (j) {
          var urls = j.urls || [];
          if (!urls.length) throw new Error('El servidor no devolvió imagen');
          return Promise.all(urls.map(cargarImg)).then(function () {
            var sl = urls.map(function (u) { return { url: u, cred: '' }; });
            return sl.length > 1 ? { tipo: 'ia', slides: sl, url: urls[0], cred: '' } : { tipo: 'ia', url: urls[0], cred: '' };
          });
        })
        .catch(function (e) {
          aviso('IA de imágenes: ' + ((e && e.message) || 'no disponible') + ' · pongo una foto libre');
          return M.proveedores.fotos(q).then(function (m) { m.aviso = '📷 Foto libre (la IA no estaba disponible)'; return m; });
        });
    };
    if (!M.url && (!M.proveedor || M.proveedor === 'fotos')) M.proveedor = 'chispa';
  }

  /* =====================================================================
     2 · VOZ Y SUBTÍTULOS EN EL VÍDEO
     ===================================================================== */
  function guionDe(p) {
    var t = String(p.txt || '').replace(/#\S+/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
    var frases = t.match(/[^.!?¡¿]+[.!?]+|[^.!?]+$/g) || [t], g = '';
    for (var k = 0; k < frases.length && (g + frases[k]).length < 260; k++) g += frases[k];
    g = (g || t.slice(0, 240)).trim();
    var tit = String(p.titulo || '').trim();
    if (tit && g.toLowerCase().indexOf(tit.toLowerCase()) < 0) g = tit + '. ' + g;
    return g.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 400);
  }
  function opcionesVideoHtml(i) {
    var p = window._posts && window._posts[i]; if (!p) return '';
    var lc = idioma(), servidorVoz = activo() && VOZ_SERVIDOR[lc];
    var dice = servidorVoz ? '🎙️ Voz de la IA en ' + esc(nombreIdioma(lc)) + ', grabada dentro del vídeo (gratis).'
      : (activo() ? '🎙️ El servidor no tiene voz en ' + esc(nombreIdioma(lc)) + ' (sí en español, inglés, francés, chino, japonés y coreano). Puedes escucharla con la voz del móvil, pero el vídeo saldrá solo con subtítulos.'
        : '🎙️ Sin servidor: la voz del móvil se puede escuchar pero no queda grabada en el vídeo; el vídeo sale con subtítulos.');
    return '<div class="cm-li" style="display:grid;gap:6px;padding:10px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:12px">' +
      '<b style="font-size:14px">🎬 Vídeo con voz y subtítulos</b>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--tx2)"><input type="checkbox" id="ciaVoz" style="width:auto"' + (servidorVoz ? ' checked' : '') + (servidorVoz ? '' : ' disabled') + '> Voz en off</label>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--tx2)"><input type="checkbox" id="ciaSub" style="width:auto" checked> Subtítulos palabra a palabra</label>' +
      '<label style="font-size:12px;color:var(--tx3)">Lo que dice el vídeo (puedes cambiarlo)</label>' +
      '<textarea id="ciaGuion" rows="3" style="width:100%;font-size:13px">' + esc(guionDe(p)) + '</textarea>' +
      '<div style="font-size:12px;color:var(--tx3)">' + dice + '</div>' +
      '<button class="btn g sm" style="flex:none;justify-self:start" onclick="ChispaIA.escuchar()">▶ Escuchar</button></div>';
  }
  /* Se llama en el CLIC (antes de cualquier espera) para que el iPhone deje sonar el audio */
  function prepararVideo(p, msg) {
    var conVoz = $('ciaVoz') && $('ciaVoz').checked && !$('ciaVoz').disabled, conSub = !$('ciaSub') || $('ciaSub').checked;
    var guion = (($('ciaGuion') && $('ciaGuion').value) || guionDe(p)).trim(), lc = idioma();
    if (!conVoz && !conSub) return Promise.resolve({});
    var actx = null;
    if (conVoz) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.resume) actx.resume(); } catch (e) { actx = null; } }
    if (conVoz && actx && activo() && VOZ_SERVIDOR[lc]) {
      if (msg) msg('Preparando la voz con la IA…');
      return pedir('POST', '/ia/voz', { texto: guion, idioma: lc })
        .then(function (j) {
          return fetch(j.audio).then(function (r) { return r.arrayBuffer(); })
            .then(function (b) { return new Promise(function (ok, ko) { var pr = actx.decodeAudioData(b, ok, ko); if (pr && pr.then) pr.then(ok, ko); }); })
            .then(function (buf) { return { audio: buf, actx: actx, palabras: conSub ? j.palabras : null, retraso: 0.4, dur: Math.max(6, Math.min(45, buf.duration + 1.4)), nota: 'con voz' + (conSub ? ' y subtítulos' : '') }; });
        })
        .catch(function (e) {
          try { actx.close(); } catch (x) {}
          aviso('Voz: ' + ((e && e.message) || 'no disponible') + ' · el vídeo sale con subtítulos');
          return subtitulosSolo(guion, conSub);
        });
    }
    if (actx) try { actx.close(); } catch (e) {}
    return Promise.resolve(subtitulosSolo(guion, conSub));
  }
  function subtitulosSolo(guion, conSub) {
    if (!conSub) return {};
    var ws = guion.split(/\s+/).filter(Boolean), total = Math.max(3, ws.length / 2.6), largo = 0, t = 0;
    ws.forEach(function (w) { largo += w.length + 1; });
    var pal = ws.map(function (w) { var d = total * (w.length + 1) / largo, x = { t: w, i: t, f: t + d }; t += d; return x; });
    return { palabras: pal, retraso: 0.4, dur: Math.max(6, Math.min(45, total + 1.4)), nota: 'con subtítulos' };
  }
  function escuchar() {
    var g = (($('ciaGuion') && $('ciaGuion').value) || '').trim(), lc = idioma();
    if (!g) return;
    if (!window.speechSynthesis) { aviso('Este navegador no tiene voz'); return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(g); u.lang = lc;
      var vs = speechSynthesis.getVoices().filter(function (v) { return (v.lang || '').toLowerCase().indexOf(lc) === 0; });
      if (vs.length) u.voice = vs[0]; else aviso('Este móvil no tiene voz en ' + nombreIdioma(lc) + '; lee con la que tiene');
      speechSynthesis.speak(u);
    } catch (e) { aviso('No se pudo leer en voz alta'); }
  }
  /* Subtítulos: grupos de hasta 4 palabras, la que suena resaltada */
  function grupos(pal) {
    if (pal._g) return pal._g;
    var g = [], cur = [];
    pal.forEach(function (w) { cur.push(w); var txt = cur.map(function (x) { return x.t; }).join(' '); if (cur.length >= 4 || txt.length > 22 || /[.!?,;:]$/.test(w.t)) { g.push(cur); cur = []; } });
    if (cur.length) g.push(cur);
    pal._g = g; return g;
  }
  function dibujarSubtitulos(x, W, H, pal, t, V) {
    if (!pal || !pal.length || t < 0) return;
    var g = grupos(pal), act = null;
    for (var k = 0; k < g.length; k++) { var a = g[k][0].i, b = (g[k + 1] ? g[k + 1][0].i : g[k][g[k].length - 1].f + 0.6); if (t >= a && t < b) { act = g[k]; break; } }
    if (!act) return;
    var u = W / 100, fs = (V ? 6.4 : 5.6) * u;
    x.save();
    x.font = '800 ' + fs + 'px Inter, sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'left';
    var esp = x.measureText(' ').width, anchos = act.map(function (w) { return x.measureText(w.t).width; }), tot = anchos.reduce(function (s, a) { return s + a; }, 0) + esp * (act.length - 1);
    var y = H * (V ? 0.385 : 0.3), cx = (W - tot) / 2, padX = 2.4 * u, padY = 1.6 * u;
    x.fillStyle = 'rgba(0,0,0,.55)';
    var r = 2 * u, X = cx - padX, Y = y - fs / 2 - padY, Wd = tot + 2 * padX, Hd = fs + 2 * padY;
    x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + Wd, Y, X + Wd, Y + Hd, r); x.arcTo(X + Wd, Y + Hd, X, Y + Hd, r); x.arcTo(X, Y + Hd, X, Y, r); x.arcTo(X, Y, X + Wd, Y, r); x.closePath(); x.fill();
    for (var n = 0; n < act.length; n++) {
      var w = act[n], suena = t >= w.i && t < w.f + 0.05;
      x.fillStyle = suena ? '#ffcc33' : '#fff';
      x.lineWidth = 0.5 * u; x.strokeStyle = 'rgba(0,0,0,.6)'; x.strokeText(w.t, cx, y); x.fillText(w.t, cx, y);
      cx += anchos[n] + esp;
    }
    x.restore();
  }

  /* =====================================================================
     3 · VARIOS IDIOMAS
     ===================================================================== */
  function botonesTarjeta(i) { return '<button class="btn g" onclick="ChispaIA.idiomas(' + i + ')">🌍 Otros idiomas</button>'; }
  function idiomasModal(i) {
    var p = window._posts && window._posts[i]; if (!p || typeof window.modal !== 'function') return;
    var lc = idioma();
    var h = '<h3>🌍 Esta publicación en otros idiomas</h3><p style="color:var(--tx2);font-size:14px;margin:0 0 8px">Para turistas o para tu audiencia internacional. Lo traduce la IA del servidor (gratis dentro del cupo diario).</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' + IDIOMAS.filter(function (x) { return x[0] !== lc; }).map(function (x) {
        return '<label style="display:flex;gap:5px;align-items:center;border:1px solid var(--line,rgba(255,255,255,.15));border-radius:999px;padding:4px 10px;font-size:13px"><input type="checkbox" class="ciaLc" value="' + x[0] + '" style="width:auto"' + (/^(en|de)$/.test(x[0]) ? ' checked' : '') + '>' + esc(x[1]) + '</label>';
      }).join('') + '</div>' +
      '<div style="margin-top:8px;font-size:13px;color:var(--tx2)">Otro código (ej. <code>it</code>, <code>pt-BR</code>): <input id="ciaOtro" style="width:90px" placeholder="código"></div>' +
      '<div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap;font-size:13px"><label><input type="radio" name="ciaModo" value="juntos" checked style="width:auto"> Todos juntos en esta publicación</label><label><input type="radio" name="ciaModo" value="separadas" style="width:auto"> Versiones aparte</label></div>' +
      (activo() ? '<button class="btn pp" style="width:100%;margin-top:10px" onclick="ChispaIA._traducir(' + i + ')">Traducir</button>' : sinServidorHtml('Traducir')) +
      '<div id="ciaTradRes" style="margin-top:10px"></div>';
    window.modal(h);
  }
  function traducirPost(i) {
    var p = window._posts[i], lc = idioma(), res = $('ciaTradRes');
    var ls = [].slice.call(document.querySelectorAll('.ciaLc:checked')).map(function (e) { return e.value; });
    var otro = (($('ciaOtro') || {}).value || '').trim(); if (otro) ls.push(otro.slice(0, 2).toLowerCase());
    if (!ls.length) { aviso('Elige al menos un idioma'); return; }
    var modo = (document.querySelector('input[name="ciaModo"]:checked') || {}).value || 'juntos';
    var base = String(p.txt || '').trim();
    if (res) res.innerHTML = '<div style="color:var(--tx3);font-size:13px">Traduciendo a ' + ls.map(nombreIdioma).join(', ') + '…</div>';
    pedir('POST', '/ia/texto', { accion: 'traducir', textos: [base], idiomas: ls, origen: lc }).then(function (j) {
      var tr = j.traducciones || {}, avisoH = j.aviso ? '<div style="font-size:12px;color:var(--amber,#ffcc33);margin-bottom:6px">⚠️ ' + esc(j.aviso) + '</div>' : '';
      if (modo === 'juntos') {
        var junto = (BANDERA[lc] || lc.toUpperCase()) + ' ' + base;
        Object.keys(tr).forEach(function (c) { junto += '\n\n' + (BANDERA[c] || c.toUpperCase()) + ' ' + tr[c][0]; });
        window._ciaJunto = junto;
        res.innerHTML = avisoH + '<pre style="white-space:pre-wrap;font:inherit;font-size:13px;background:var(--panel2,rgba(255,255,255,.05));padding:10px;border-radius:10px;max-height:40vh;overflow:auto">' + esc(junto) + '</pre>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pp sm" style="flex:none" onclick="ChispaIA._ponerJunto(' + i + ')">Poner en la publicación</button><button class="btn g sm" style="flex:none" onclick="ChispaIA._copiar(window._ciaJunto)">Copiar</button></div>';
      } else {
        window._ciaVers = tr;
        res.innerHTML = avisoH + Object.keys(tr).map(function (c) {
          return '<div style="border:1px solid var(--line,rgba(255,255,255,.12));border-radius:10px;padding:8px;margin-bottom:8px"><b>' + (BANDERA[c] || '') + ' ' + esc(nombreIdioma(c)) + '</b><pre style="white-space:pre-wrap;font:inherit;font-size:13px;margin:6px 0">' + esc(tr[c][0]) + '</pre>' +
            '<button class="btn g sm" style="flex:none" onclick="ChispaIA._copiar(window._ciaVers[\'' + c + '\'][0])">Copiar</button> <button class="btn g sm" style="flex:none" onclick="ChispaIA._borrador(window._ciaVers[\'' + c + '\'][0],\'' + c + '\')">Guardar como borrador</button></div>';
        }).join('');
      }
    }, function (e) { if (res) res.innerHTML = '<div style="color:#ff6b6b;font-size:13px">' + esc(e.message) + '</div>'; });
  }
  function ponerTexto(i, t) {
    var p = window._posts[i]; if (!p) return;
    var el = document.querySelector('#cmCard_' + i + ' .cm-ed[data-k="txt"]');
    if (el && typeof window.cmGuardarCampo === 'function') { el.innerText = t; window.cmGuardarCampo(el); } else p.txt = t;
  }
  function borrador(texto, lc) {
    pedir('POST', '/v1/publicaciones', { texto: texto, idioma: lc || idioma() }).then(function () { aviso('Guardado como borrador en el servidor ✓'); }, function (e) { aviso(e.message); });
  }
  /* Idioma del negocio sin plantillas propias (it, pt, nl, zh…): lo generado se traduce solo con la IA */
  var generarAntes = window.generar;
  if (typeof generarAntes === 'function') {
    window.generar = function () {
      var r = generarAntes.apply(this, arguments);
      try {
        var I = info().idioma || {}, lc = idioma();
        if (I.traduceIA && I.plantillas === 'ia' && activo() && window._posts && window._posts.length) {
          var ps = window._posts.slice(), textos = [];
          ps.forEach(function (p) { textos.push(String(p.txt || '')); textos.push(String(p.titulo || '')); });
          aviso('🌍 La IA lo escribe en ' + (I.nombre || nombreIdioma(lc)) + '…');
          pedir('POST', '/ia/texto', { accion: 'traducir', textos: textos, idiomas: [lc] }).then(function (j) {
            var t = (j.traducciones || {})[lc]; if (!t) return;
            ps.forEach(function (p, k) {
              if (window._posts[k] !== p) return; // ya se ha generado otra cosa
              p.txt = t[2 * k] || p.txt; p.titulo = t[2 * k + 1] || p.titulo;
              if (typeof window.cmRepintar === 'function') window.cmRepintar(k);
            });
            aviso('🌍 Listo en ' + (I.nombre || nombreIdioma(lc)) + (j.aviso ? ' · revísalo antes de publicar' : ''));
          }, function (e) { aviso('No se pudo escribir en ' + (I.nombre || lc) + ': ' + e.message); });
        }
      } catch (e) {}
      return r;
    };
  }

  /* =====================================================================
     4 · REAPROVECHAR (creadores): texto largo → varias piezas
     ===================================================================== */
  function reaprovecharModal() {
    if (typeof window.modal !== 'function') return;
    var lc = idioma();
    var opIdi = IDIOMAS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === lc ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('');
    if (!IDIOMAS.some(function (x) { return x[0] === lc; })) opIdi = '<option value="' + lc + '" selected>' + esc(nombreIdioma(lc)) + '</option>' + opIdi;
    window.modal('<h3>♻️ Reaprovechar contenido largo</h3>' +
      '<p style="color:var(--tx2);font-size:14px;margin:0 0 8px">Pega un artículo, el guion o la transcripción de un vídeo, una newsletter… La IA lo convierte en piezas listas para cada red, en el idioma que elijas.</p>' +
      '<textarea id="ciaLargo" rows="7" style="width:100%" placeholder="Pega aquí el texto largo (mínimo unas líneas)"></textarea>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' + PIEZAS.map(function (x, k) {
        return '<label style="display:flex;gap:5px;align-items:center;border:1px solid var(--line,rgba(255,255,255,.15));border-radius:999px;padding:4px 10px;font-size:13px"><input type="checkbox" class="ciaPz" value="' + x[0] + '" style="width:auto"' + (k < 4 ? ' checked' : '') + '>' + esc(x[1]) + '</label>';
      }).join('') + '</div>' +
      '<div style="margin-top:8px;font-size:13px;color:var(--tx2)">Idioma de las piezas: <select id="ciaIdiR">' + opIdi + '</select></div>' +
      (activo() ? '<button class="btn pp" style="width:100%;margin-top:10px" onclick="ChispaIA._reaprovechar()">♻️ Crear las piezas</button>' : sinServidorHtml('Reaprovechar')) +
      '<div id="ciaRepRes" style="margin-top:10px"></div>');
  }
  function reaprovechar() {
    var texto = (($('ciaLargo') || {}).value || '').trim(), res = $('ciaRepRes');
    var piezas = [].slice.call(document.querySelectorAll('.ciaPz:checked')).map(function (e) { return e.value; });
    var lc = ($('ciaIdiR') || {}).value || idioma();
    if (texto.length < 40) { aviso('Pega un texto más largo 🙂'); return; }
    if (!piezas.length) { aviso('Elige al menos una pieza'); return; }
    var I = info();
    res.innerHTML = '<div style="color:var(--tx3);font-size:13px">La IA está preparando ' + piezas.length + ' tipos de pieza en ' + esc(nombreIdioma(lc)) + '… (unos segundos)</div>';
    pedir('POST', '/ia/texto', { accion: 'reaprovechar', texto: texto, piezas: piezas, idioma: lc, sector: I.sector }).then(function (j) {
      window._ciaPiezas = j.piezas || [];
      var nom = {}; PIEZAS.forEach(function (x) { nom[x[0]] = x[1]; });
      res.innerHTML = (j.aviso ? '<div style="font-size:12px;color:var(--amber,#ffcc33);margin-bottom:6px">⚠️ ' + esc(j.aviso) + '</div>' : '') +
        window._ciaPiezas.map(function (p, k) {
          var cuerpo = p.texto + (p.diapositivas ? '\n\n' + p.diapositivas.map(function (d, n) { return (n + 1) + '. ' + d.titulo + (d.texto ? ' — ' + d.texto : ''); }).join('\n') : '');
          p._todo = cuerpo;
          return '<div style="border:1px solid var(--line,rgba(255,255,255,.12));border-radius:12px;padding:10px;margin-bottom:8px"><div style="font-size:12px;color:var(--tx3)">' + esc(nom[p.tipo] || p.tipo) + (p.titulo ? ' · ' + esc(p.titulo) : '') + '</div>' +
            '<pre style="white-space:pre-wrap;font:inherit;font-size:13.5px;margin:6px 0">' + esc(cuerpo) + '</pre>' +
            '<button class="btn g sm" style="flex:none" onclick="ChispaIA._copiar(window._ciaPiezas[' + k + ']._todo)">Copiar</button> ' +
            '<button class="btn g sm" style="flex:none" onclick="ChispaIA._borrador(window._ciaPiezas[' + k + ']._todo,\'' + esc(lc) + '\')">Guardar como borrador</button></div>';
        }).join('');
    }, function (e) { res.innerHTML = '<div style="color:#ff6b6b;font-size:13px">' + esc(e.message) + '</div>'; });
  }
  function tarjetaReaprovechar() {
    if ($('ciaRepCard')) return;
    var c = document.querySelector('#main .card'); if (!c) return;
    var d = document.createElement('div'); d.id = 'ciaRepCard'; d.className = 'card';
    d.innerHTML = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:200px"><b>♻️ ¿Tienes un texto o un vídeo largo?</b><div style="font-size:13px;color:var(--tx2)">Conviértelo en posts, hilo, carrusel y guion de reel, en cualquier idioma.</div></div>' +
      '<button class="btn g sm" style="flex:none" onclick="ChispaIA.reaprovechar()">♻️ Reaprovechar</button></div>';
    c.parentNode.insertBefore(d, c.nextSibling);
  }

  /* =====================================================================
     5 · CLAVES DE API (n8n, Make, Claude) en Conexiones
     ===================================================================== */
  function tarjetaApi() {
    var main = $('main'); if (!main || !activo()) return;
    var e = sync().estado(); if (!e.esAdministrador) return;
    var d = $('ciaApiCard');
    if (!d) {
      d = document.createElement('div'); d.id = 'ciaApiCard'; d.className = 'card';
      var ancla = $('chispaSyncCard');
      if (ancla && ancla.parentNode) ancla.parentNode.insertBefore(d, ancla.nextSibling); else main.appendChild(d);
    }
    var base = e.servidor;
    d.innerHTML = '<h3 style="margin:0 0 4px">🔑 API de Chispa · n8n, Make y Claude</h3>' +
      '<div style="font-size:13px;color:var(--tx2)">Para crear y programar publicaciones desde otras herramientas o desde Claude (MCP). Cada clave se enseña <b>una sola vez</b>. <a href="' + DOCS_API + '" target="_blank" rel="noopener">Cómo se usa</a></div>' +
      '<div style="font-size:12px;color:var(--tx3);margin-top:6px">API: <code>' + esc(base) + '/v1</code> · MCP: <code>' + esc(base) + '/mcp</code></div>' +
      '<div id="ciaClaves" style="margin-top:8px;font-size:13px;color:var(--tx3)">Cargando claves…</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input id="ciaClaveNom" placeholder="Para qué es (ej. n8n)" style="flex:1;min-width:150px"><button class="btn pp sm" style="flex:none" onclick="ChispaIA._crearClave()">Crear clave</button></div>' +
      '<div id="ciaClaveNueva"></div><div id="ciaUso" style="margin-top:10px;font-size:12px;color:var(--tx3)"></div>';
    pintarClaves(); pintarUso();
  }
  function pintarClaves() {
    pedir('GET', '/claves').then(function (j) {
      var el = $('ciaClaves'); if (!el) return;
      var l = j.claves || [];
      el.innerHTML = l.length ? l.map(function (k) {
        return '<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line,rgba(255,255,255,.08))"><span style="flex:1"><b style="color:var(--tx)">' + esc(k.nombre) + '</b> · <code>' + esc(k.prefijo) + '</code><br><span style="font-size:11.5px">creada ' + new Date(k.creado).toLocaleDateString() + (k.usado ? ' · usada ' + new Date(k.usado).toLocaleString() : ' · sin usar') + '</span></span>' +
          '<button class="btn g sm" style="flex:none" onclick="ChispaIA._revocar(\'' + esc(k.id) + '\')">Revocar</button></div>';
      }).join('') : 'Todavía no hay claves.';
    }, function (e) { var el = $('ciaClaves'); if (el) el.textContent = e.message; });
  }
  function pintarUso() {
    pedir('GET', '/ia/uso').then(function (j) {
      var el = $('ciaUso'); if (!el) return;
      var u = j.usado || {}, L = j.limites || {};
      el.innerHTML = '✨ IA hoy (gratis): imágenes ' + (u.imagen || 0) + '/' + L.imagen + ' · voces ' + (u.voz || 0) + '/' + L.voz + ' · textos ' + (u.texto || 0) + '/' + L.texto +
        ' · cupo de la cuenta ' + j.neuronasCuenta + '/' + j.cupoCuenta + ' neuronas (se reinicia a las 00:00 UTC)';
    }, function () {});
  }
  function crearClave() {
    var n = (($('ciaClaveNom') || {}).value || '').trim() || 'Clave de API';
    pedir('POST', '/claves', { nombre: n }).then(function (j) {
      window._ciaClave = j.clave;
      $('ciaClaveNueva').innerHTML = '<div style="margin-top:8px;padding:10px;border:1px solid rgba(52,211,153,.6);border-radius:10px"><b>✓ Clave creada: cópiala ahora, no se vuelve a enseñar</b>' +
        '<input readonly value="' + esc(j.clave) + '" style="width:100%;margin-top:6px;font-size:12.5px" onclick="this.select()">' +
        '<button class="btn pp sm" style="flex:none;margin-top:6px" onclick="ChispaIA._copiar(window._ciaClave)">Copiar clave</button></div>';
      pintarClaves();
    }, function (e) { aviso(e.message); });
  }
  function revocar(id) {
    if (!confirm('¿Revocar esta clave? Lo que la use (n8n, Make, Claude…) dejará de funcionar al momento.')) return;
    pedir('DELETE', '/claves/' + encodeURIComponent(id)).then(function () { aviso('Clave revocada'); pintarClaves(); }, function (e) { aviso(e.message); });
  }

  /* ---------- enganche en el panel ---------- */
  var panelPrevio = window.panel;
  if (typeof panelPrevio === 'function') {
    window.panel = function (tab) {
      var r = panelPrevio.apply(this, arguments);
      try {
        if (tab === 'conectar') tarjetaApi();
        if (tab === 'asistente') tarjetaReaprovechar();
      } catch (e) {}
      return r;
    };
  }

  window.ChispaIA = {
    version: '2026-10-07',
    vozServidor: function (lc) { return !!VOZ_SERVIDOR[(lc || idioma()).slice(0, 2)]; },
    idioma: idioma,
    guionDe: guionDe,
    opcionesVideoHtml: opcionesVideoHtml,
    prepararVideo: prepararVideo,
    dibujarSubtitulos: dibujarSubtitulos,
    escuchar: escuchar,
    botonesTarjeta: botonesTarjeta,
    idiomas: idiomasModal,
    reaprovechar: reaprovecharModal,
    _traducir: traducirPost,
    _ponerJunto: function (i) { ponerTexto(i, window._ciaJunto || ''); if (typeof window.cerrarModal === 'function') window.cerrarModal(); aviso('🌍 Publicación en varios idiomas ✓'); },
    _copiar: copiar,
    _borrador: borrador,
    _reaprovechar: reaprovechar,
    _crearClave: crearClave,
    _revocar: revocar
  };
  try { if (typeof TAB !== 'undefined' && $('app') && $('app').classList.contains('on')) { if (TAB === 'conectar') tarjetaApi(); if (TAB === 'asistente') tarjetaReaprovechar(); } } catch (e) {}
})();
