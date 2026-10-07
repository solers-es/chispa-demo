/* =====================================================================
   Chispa · 🎬 CREAR VÍDEO CON IA (para creadores de contenido y negocios)
   ---------------------------------------------------------------------
   VERSIÓN GRATIS (funciona ya, dentro del cupo gratuito de Cloudflare):
     1. La IA del servidor escribe el guion por ESCENAS (/ia/texto accion "video").
     2. Una IMAGEN IA real por escena (/ia/imagen, FLUX). Si se acaba el cupo
        o el plan no da más, esa escena va con una foto libre (y se dice).
     3. VOZ IA por escena (/ia/voz, MeloTTS: es, en, fr, zh, ja, ko) con los
        tiempos de cada palabra. Otros idiomas: solo subtítulos (la voz del
        navegador no se puede grabar dentro del vídeo).
     4. Se monta en el propio aparato con el montador del Estudio
        (CHISPA_ESTUDIO.hacerVideo con «escenas»): vertical 1080×1920, Ken
        Burns, fundido entre escenas, subtítulos palabra a palabra, sello de
        marca y, si se quiere, una música suave GENERADA aquí (sin derechos).
     5. Descargar (MP4 si el navegador lo graba —Safari del iPhone y Chrome
        nuevos—, si no WebM), compartir desde el móvil y «📅 Programar» en el
        calendario real (el vídeo se guarda en el aparato y se sube al
        servidor al programarlo).
   Sin sesión / sin servidor: guion de EJEMPLO con el tema pedido y fotos
   libres, marcado como ejemplo. Nunca FileReader (iPhone).

   VERSIÓN PRO (vídeo realista generado clip a clip, de pago): conectores/
   video-ia.js. APAGADA hasta que Stalin elija proveedor y ponga la clave:
   aquí sale «Vídeo realista con IA: se activa al conectar el proveedor
   (de pago)». Límite por plan y coste del mes, del servidor.

   Dónde se ve: Estudio → «🎞️ Crear vídeo con IA» (#video-ia) y una tarjeta
   «Para creadores» en el Asistente. Se carga DESPUÉS de chispa-creadores.js.
   ===================================================================== */
(function () {
  'use strict';
  if (window.ChispaVideoIA) return;

  var VOZ_SERVIDOR = { es: 1, en: 1, fr: 1, zh: 1, ja: 1, ko: 1 };
  var IDIOMAS = [['es', 'Español'], ['en', 'Inglés'], ['fr', 'Francés'], ['de', 'Alemán'], ['it', 'Italiano'], ['pt', 'Portugués'], ['ca', 'Catalán'], ['nl', 'Neerlandés'], ['zh', 'Chino'], ['ja', 'Japonés'], ['ko', 'Coreano']];
  var PLAT = { tiktok: { nm: 'TikTok', red: 'tt' }, reels: { nm: 'Instagram Reels', red: 'igf' }, shorts: { nm: 'YouTube Shorts', red: 'yt' } };
  var CTA = { es: 'Sígueme para más', en: 'Follow for more', fr: 'Abonne-toi pour la suite', de: 'Folge für mehr', it: 'Seguimi per altri', pt: 'Segue para mais', ca: 'Segueix-me per a més', nl: 'Volg voor meer' };
  var MSG_PRO = 'Vídeo realista con IA: se activa al conectar el proveedor (de pago).';
  var ESTILO_IMG = ', realistic vertical photo, 9:16 composition, natural light, high detail, no text, no letters, no logos, no watermark';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (s == null ? '' : '' + s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(m) { try { if (typeof window.toast === 'function') window.toast(m); } catch (e) {} }
  function sync() { return window.ChispaSync; }
  function estadoSync() { var s = sync(); return s && s.estado ? s.estado() : { modo: 'demostracion' }; }
  function activo() { var e = estadoSync(); return e.modo === 'servidor' && !e.pausado; }
  function sinSesion() { return estadoSync().modo === 'sin-sesion'; }
  function pedir(m, r, c) { return sync().pedir(m, r, c); }
  function E() { return window.CHISPA_ESTUDIO || {}; }
  function info() { try { if (window.ChispaSector && ChispaSector.paraIA) return ChispaSector.paraIA(); } catch (e) {} var n = (window.S && S.negocio) || {}; return { sector: '', negocio: n.nombre, ciudad: n.ciudad, idioma: { base: 'es' } }; }
  function idiomaNegocio() { var i = info().idioma; return ((i && (i.base || i.codigo)) || window._lang || 'es').slice(0, 2).toLowerCase(); }
  function slug(t) { return String(t || 'video').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video'; }
  function cargarImg(src) { return new Promise(function (ok, ko) { var im = new Image(); im.crossOrigin = 'anonymous'; im.onload = function () { ok(im); }; im.onerror = ko; im.src = src; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function cerrarAudio(a) { try { if (a && a.state !== 'closed') { var p = a.close(); if (p && p.catch) p.catch(function () {}); } } catch (e) {} }
  function puedeGrabar() { try { return !!(E().tipoVideo && E().tipoVideo(false) && HTMLCanvasElement.prototype.captureStream); } catch (e) { return false; } }

  var V = { ultimo: null, ocupado: false };

  /* ---------------- formulario (Estudio y ventana del Asistente) ---------------- */
  function cabecera() {
    if (activo()) return '<div class="card" style="background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.3)"><div style="font-size:13px;color:var(--tx2)">✅ <b style="color:var(--tx)">IA activada</b> · guion, imágenes y voz los hace la IA de Chispa (gratis, dentro del cupo del día). El vídeo se monta en tu propio móvil u ordenador.</div></div>';
    if (sinSesion()) return '<div class="card" style="background:rgba(255,204,51,.06);border-color:rgba(255,204,51,.25)"><div style="font-size:13px;color:var(--tx2)">🔑 <b style="color:var(--tx)">Falta entrar:</b> para que la IA escriba el guion, cree las imágenes y ponga la voz, entra con tu código de negocio en <a href="javascript:void 0" onclick="vista(\'panel\');panel(\'conectar\')">Conexiones</a>. Sin entrar te monto un vídeo de EJEMPLO con tu tema y fotos libres.</div></div>';
    return '<div class="card" style="background:rgba(255,204,51,.06);border-color:rgba(255,204,51,.25)"><div style="font-size:13px;color:var(--tx2)">🧪 <b style="color:var(--tx)">Modo demostración:</b> te monto un vídeo de EJEMPLO con tu tema y fotos libres. Con tu cuenta, la IA escribe el guion, crea una imagen por escena y pone la voz.</div></div>';
  }
  function selIdioma(id) {
    var lc = idiomaNegocio(), l = IDIOMAS.slice();
    if (!l.some(function (x) { return x[0] === lc; })) l.unshift([lc, lc.toUpperCase()]);
    return '<select id="' + id + '">' + l.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === lc ? ' selected' : '') + '>' + esc(x[1]) + (VOZ_SERVIDOR[x[0]] ? ' 🎙️' : '') + '</option>'; }).join('') + '</select>';
  }
  function formulario(pre) {
    var tema = (pre && pre.tema) || '';
    return '<div class="card"><label class="lb">Tema del vídeo o tu guion</label>' +
      '<textarea id="viTema" rows="3" placeholder="Ej: Recetas caribeñas en 60 segundos · 3 trucos de inglés para viajar · cómo preparamos nuestra paella… (o pega tu guion entero)">' + esc(tema) + '</textarea>' +
      '<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px"><div><label class="lb">Para</label><select id="viPlat"><option value="tiktok">TikTok</option><option value="reels">Instagram Reels</option><option value="shorts">YouTube Shorts</option></select></div>' +
      '<div><label class="lb">Escenas</label><select id="viN"><option>4</option><option selected>5</option><option>6</option></select></div>' +
      '<div><label class="lb">Idioma</label>' + selIdioma('viIdi') + '</div></div>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:13.5px;color:var(--tx2)">' +
      '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="viVoz" checked style="width:auto"> 🎙️ Voz IA</label>' +
      '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="viSub" checked style="width:auto"> 💬 Subtítulos palabra a palabra</label>' +
      '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="viMus" style="width:auto"> 🎵 Música suave (hecha aquí, sin derechos)</label></div>' +
      '<div style="font-size:12px;color:var(--tx3);margin-top:6px">🎙️ = idioma con voz IA (español, inglés, francés, chino, japonés y coreano). En los demás, el vídeo sale con subtítulos.</div>' +
      '<button class="btn pp" id="viBoton" style="margin-top:12px" onclick="ChispaVideoIA.crear()">🎬 Crear vídeo con IA</button>' +
      '<div id="viPasos" style="margin-top:10px"></div></div><div id="viRes">' + (V.ultimo ? pintarResultado(V.ultimo) : '') + '</div>';
  }
  function tarjetaPro() {
    return '<div class="card" id="viPro"><h3 style="margin:0 0 4px">🎥 Vídeo realista con IA <span class="chip">Pro y Agencia</span></h3>' +
      '<div style="font-size:13px;color:var(--tx2)">Clips de vídeo generados de verdad por la IA (personas, movimiento, cámara), de 6-8 segundos, para juntar con tu montaje. Es de pago por clip (≈ 0,24-0,40 $), con un número de clips al mes según tu plan.</div>' +
      '<div id="viProEstado" style="margin-top:8px;font-size:13px;color:var(--amber,#ffcc33)">⏳ ' + esc(MSG_PRO) + '</div>' +
      '<button class="btn g sm" id="viProBoton" style="flex:none;margin-top:8px" disabled>🎥 Generar clip realista</button><div id="viProRes"></div></div>';
  }
  function pintarPro() {
    var est = $('viProEstado'), bt = $('viProBoton'); if (!est) return;
    if (!activo()) { est.textContent = '⏳ ' + MSG_PRO; return; }
    pedir('GET', '/ia/video/estado').then(function (j) {
      if (!$('viProEstado')) return;
      if (!j.activo) { est.textContent = '⏳ ' + (j.mensaje || MSG_PRO); bt.disabled = true; return; }
      est.style.color = 'var(--tx2)';
      est.innerHTML = '✅ Conectado: ' + esc(j.proveedor) + ' · clips de ' + j.segundos + ' s (≈ ' + j.costeClip + ' $) · este mes ' + j.usados + ' de ' + j.limite + ' · gastado ' + j.costeMes + ' $';
      bt.disabled = !j.limite || j.usados >= j.limite;
      bt.onclick = function () { clipPro(); };
      if (!j.limite) est.innerHTML += '<br>🔒 Viene en los planes Pro y Agencia.';
    }, function (e) { est.textContent = '⏳ ' + MSG_PRO; });
  }
  function clipPro() {
    var t = (($('viTema') || {}).value || '').trim(), res = $('viProRes');
    var prompt = (V.ultimo && V.ultimo.escenas && V.ultimo.escenas[0] && V.ultimo.escenas[0].imagen) || t;
    if (!prompt) { aviso('Escribe el tema (o crea antes el vídeo gratis)'); return; }
    res.innerHTML = '<div style="font-size:13px;color:var(--tx3);margin-top:8px">🎥 Pidiendo el clip… (1-3 minutos)</div>';
    pedir('POST', '/ia/video', { prompt: prompt }).then(function (j) {
      var n = 0;
      (function mirar() {
        pedir('GET', '/ia/video/' + encodeURIComponent(j.id)).then(function (k) {
          if (k.estado === 'listo') { res.innerHTML = '<video src="' + esc(k.url) + '" controls playsinline style="width:100%;max-width:240px;border-radius:12px;margin-top:8px"></video><div><a class="btn g sm" href="' + esc(k.url) + '" download>⬇️ Descargar clip</a></div>'; pintarPro(); return; }
          if (k.estado === 'fallo') { res.innerHTML = '<div class="warn">No se pudo: ' + esc(k.error || '') + '</div>'; return; }
          if (++n > 40) { res.innerHTML = '<div class="warn">Está tardando mucho; vuelve a mirar en un rato.</div>'; return; }
          setTimeout(mirar, 6000);
        }, function (e) { res.innerHTML = '<div class="warn">' + esc(e.message) + '</div>'; });
      })();
    }, function (e) { res.innerHTML = '<div class="warn">' + esc(e.message) + '</div>'; });
  }
  function vista(pre) {
    return '<div class="hd"><h2>🎬 Crear vídeo con IA</h2></div>' + cabecera() +
      '<div class="card" style="font-size:13px;color:var(--tx2)">De un tema o un guion a un <b style="color:var(--tx)">vídeo vertical listo para TikTok, Reels o Shorts</b>: la IA escribe las escenas, crea una imagen para cada una y pone la voz; Chispa lo monta con movimiento, subtítulos y tu sello. Tarda 1-2 minutos y lo puedes descargar o programar.</div>' +
      formulario(pre) + tarjetaPro();
  }

  /* ---------------- pasos ---------------- */
  var PASOS = [['guion', '✍️ Guion por escenas'], ['img', '🎨 Imágenes'], ['voz', '🎙️ Voz y subtítulos'], ['mon', '🎬 Montaje del vídeo']];
  function pasos(estado) {
    var el = $('viPasos'); if (!el) return;
    el.innerHTML = PASOS.map(function (p) { var s = estado[p[0]] || ''; return '<div style="font-size:13px;margin:3px 0;color:' + (/^✓/.test(s) ? 'var(--tx)' : 'var(--tx3)') + '">' + p[1] + ' <span style="color:var(--tx2)">' + esc(s) + '</span></div>'; }).join('') + '<div class="cm-bar" id="viBar" style="display:none;margin-top:6px"><i></i></div><div id="viLienzo"></div>';
  }
  function plantilla(tema, n) {
    var t = String(tema).replace(/\s+/g, ' ').trim().slice(0, 70);
    var L = [
      ['¿Sabías esto sobre ' + t + '?', t.slice(0, 30)],
      ['Primero, lo básico de ' + t + ', en menos de un minuto.', 'Lo básico'],
      ['Ahora el truco que casi nadie usa.', 'El truco'],
      ['Y el error más típico, para que no te pase.', 'Ojo con esto'],
      ['Pruébalo y cuéntame qué tal te sale.', 'Tu turno'],
      ['Guárdalo para tenerlo a mano y sígueme para la parte dos.', 'Parte 2']
    ];
    if (n < 6) L.splice(4, 1); if (n < 5) L.splice(3, 1);
    return { ejemplo: true, titulo: t.slice(0, 50), escenas: L.slice(0, n).map(function (x) { return { dice: x[0], texto_pantalla: x[1], imagen: '' }; }), descripcion: t, hashtags: [], idioma: 'es' };
  }
  function fotoLibre(e, k) { var f = E().fotoPara ? E().fotoPara(E().catDe ? E().catDe(e.dice + ' ' + (e.texto_pantalla || '')) : 'plato', k, 1080, 1920) : null; return f ? f.url : null; }

  /* audio: decodifica el WAV que manda el servidor */
  function decodificar(actx, dataUrl) {
    return fetch(dataUrl).then(function (r) { return r.arrayBuffer(); }).then(function (b) {
      return new Promise(function (ok, ko) { var pr = actx.decodeAudioData(b, ok, ko); if (pr && pr.then) pr.then(ok, ko); });
    });
  }
  /* banda sonora en un solo AudioBuffer: las voces en su sitio + música suave sintetizada (sin derechos) */
  function bandaSonora(actx, total, voces, musica) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC || (!voces.some(Boolean) && !musica)) return Promise.resolve(null);
    var sr = 44100, oc = new OAC(2, Math.ceil(sr * total), sr);
    if (musica) {
      var bus = oc.createGain(), filtro = oc.createBiquadFilter();
      filtro.type = 'lowpass'; filtro.frequency.value = 1400; bus.connect(filtro); filtro.connect(oc.destination);
      bus.gain.value = voces.some(Boolean) ? 0.05 : 0.09;
      // La m – Fa – Do – Sol, acordes largos y suaves
      var ACORDES = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]], dur = 3.2;
      for (var t = 0, k = 0; t < total; t += dur, k++) {
        ACORDES[k % 4].forEach(function (f, n) {
          [1, 0.5].forEach(function (mult) {
            var o = oc.createOscillator(), g = oc.createGain();
            o.type = mult === 1 ? 'sine' : 'triangle'; o.frequency.value = f * mult; o.detune.value = (n - 1) * 4;
            g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(mult === 1 ? 0.33 : 0.18, t + 0.9);
            g.gain.setValueAtTime(mult === 1 ? 0.33 : 0.18, Math.max(t + 0.9, t + dur - 0.6)); g.gain.linearRampToValueAtTime(0, Math.min(total, t + dur + 0.5));
            o.connect(g); g.connect(bus); o.start(t); o.stop(Math.min(total, t + dur + 0.6));
          });
        });
      }
      bus.gain.setValueAtTime(bus.gain.value, Math.max(0, total - 1.2)); bus.gain.linearRampToValueAtTime(0, total);
    }
    voces.forEach(function (v) { if (!v) return; var s = oc.createBufferSource(); s.buffer = v.buf; s.connect(oc.destination); s.start(v.ini); });
    return new Promise(function (ok) {
      oc.oncomplete = function (ev) { ok(ev.renderedBuffer); };
      var p = oc.startRendering(); if (p && p.then) p.then(ok, function () { ok(null); });
    });
  }
  function estimarPalabras(texto, ini) {
    var ws = String(texto).split(/\s+/).filter(Boolean), total = Math.max(1.6, ws.length / 2.6), largo = 0, t = ini;
    ws.forEach(function (w) { largo += w.length + 1; });
    return { palabras: ws.map(function (w) { var d = total * (w.length + 1) / largo, x = { t: w, i: t, f: t + d }; t += d; return x; }), dur: total };
  }

  /* ---------------- crear ---------------- */
  function crear() {
    if (V.ocupado) return;
    var tema = (($('viTema') || {}).value || '').trim();
    if (tema.length < 3) { aviso('Escribe el tema del vídeo o pega tu guion'); return; }
    var pl = ($('viPlat') || {}).value || 'tiktok', n = parseInt(($('viN') || {}).value, 10) || 5, lc = ($('viIdi') || {}).value || idiomaNegocio();
    var quiereVoz = $('viVoz') && $('viVoz').checked, sub = !$('viSub') || $('viSub').checked, musica = $('viMus') && $('viMus').checked;
    var res = $('viRes'), st = {}, avisos = [];
    if (!puedeGrabar()) { res.innerHTML = '<div class="warn">Este navegador no puede grabar vídeo. En el iPhone hace falta iOS 14.5 o más nuevo (Safari); en el ordenador, Chrome, Edge o Safari actualizados.</div>'; return; }
    // el audio se prepara EN EL CLIC: si no, el iPhone no lo deja sonar luego
    var actx = null;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.resume) actx.resume(); } catch (e) { actx = null; }
    V.ocupado = true; if ($('viBoton')) $('viBoton').disabled = true;
    res.innerHTML = ''; st.guion = activo() ? 'la IA lo está escribiendo…' : 'ejemplo con tu tema'; pasos(st);
    var I = info(), ia = activo();
    var guion = ia ? pedir('POST', '/ia/texto', { accion: 'video', tema: tema, plataforma: pl, escenas: n, idioma: lc, negocio: I.negocio, sector: I.sector, ciudad: I.ciudad })
      .catch(function (e) { avisos.push((e && e.status === 401 ? '🔑 Entra con tu código para que la IA escriba el guion' : '⚠️ La IA no pudo escribir el guion (' + ((e && e.message) || 'error') + ')') + ': uso un guion de EJEMPLO con tu tema.'); return plantilla(tema, n); })
      : Promise.resolve(plantilla(tema, n));
    if (!ia && sinSesion()) avisos.push('🔑 Sin entrar con tu código: guion de EJEMPLO con tu tema y fotos libres.');
    var G;
    guion.then(function (g) {
      G = g; G.plataforma = pl; G.idioma = G.idioma || lc; G.temaPedido = tema;
      st.guion = '✓ ' + G.escenas.length + ' escenas' + (G.ejemplo ? ' (EJEMPLO)' : ' escritas con IA'); st.img = 'creando…'; pasos(st);
      // imágenes: de dos en dos para no saturar; si una falla, foto libre en esa escena
      var hechas = 0, deIA = 0, fallo = '';
      function una(k) {
        var e = G.escenas[k];
        var p = (ia && !G.ejemplo && e.imagen) ? pedir('POST', '/ia/imagen', { prompt: e.imagen + ESTILO_IMG, cantidad: 1, sector: I.sector })
          .then(function (j) { var u = (j.urls || [])[0]; if (!u) throw new Error('sin imagen'); return cargarImg(u).then(function (im) { deIA++; e.url = u; e.tipo = 'ia'; return im; }); })
          .catch(function (er) { fallo = fallo || ((er && er.message) || 'no disponible'); return null; }) : Promise.resolve(null);
        return p.then(function (im) {
          if (im) return im;
          var u = fotoLibre(e, k); e.url = u; e.tipo = 'foto';
          return u ? cargarImg(u).catch(function () { return null; }) : null;
        }).then(function (im) { e.fuente = im; hechas++; st.img = hechas + ' de ' + G.escenas.length + '…'; pasos(st); });
      }
      var cola = Promise.resolve();
      for (var k = 0; k < G.escenas.length; k += 2) (function (a) { cola = cola.then(function () { return Promise.all([una(a), a + 1 < G.escenas.length ? una(a + 1) : null]); }); })(k);
      return cola.then(function () {
        st.img = '✓ ' + (deIA ? deIA + ' con IA' : '') + (deIA && deIA < G.escenas.length ? ' + ' : '') + (G.escenas.length - deIA ? (G.escenas.length - deIA) + ' fotos libres' : '');
        if (fallo && ia && !G.ejemplo) avisos.push('🎨 Algunas imágenes van con foto libre: ' + fallo);
        G.deIA = deIA;
      });
    }).then(function () {
      // voz por escena (servidor) o subtítulos a ritmo de lectura
      var conVoz = quiereVoz && ia && !G.ejemplo && VOZ_SERVIDOR[G.idioma] && actx;
      if (quiereVoz && !VOZ_SERVIDOR[G.idioma]) avisos.push('🎙️ No hay voz IA en ese idioma: el vídeo sale con subtítulos.');
      if (quiereVoz && !ia) avisos.push('🎙️ La voz IA necesita entrar con tu código: el vídeo sale con subtítulos.');
      st.voz = conVoz ? 'poniendo la voz…' : (sub ? 'subtítulos' : 'sin voz'); pasos(st);
      var voces = G.escenas.map(function () { return null; });
      var cola = Promise.resolve();
      if (conVoz) G.escenas.forEach(function (e, k) {
        cola = cola.then(function () {
          return pedir('POST', '/ia/voz', { texto: e.dice, idioma: G.idioma }).then(function (j) {
            return decodificar(actx, j.audio).then(function (buf) { voces[k] = { buf: buf, palabras: j.palabras || [] }; });
          }).catch(function (er) { if (!voces.fallo) { voces.fallo = 1; avisos.push('🎙️ Voz: ' + ((er && er.message) || 'no disponible') + ' (esa escena va con subtítulos)'); } });
        });
      });
      return cola.then(function () {
        // línea de tiempo
        var t = 0.3, palabras = [], vozIni = [];
        G.escenas.forEach(function (e, k) {
          var v = voces[k], ini = t, hablar = ini + 0.35, d;
          if (v) { d = v.buf.duration; vozIni[k] = { buf: v.buf, ini: hablar }; (v.palabras || []).forEach(function (w) { palabras.push({ t: w.t, i: w.i + hablar, f: w.f + hablar }); }); }
          else { var es = estimarPalabras(e.dice, hablar); d = es.dur; palabras = palabras.concat(es.palabras); }
          e.ini = ini; e.fin = ini + Math.max(2.8, d + 0.9); t = e.fin;
        });
        G.escenas[G.escenas.length - 1].fin += 0.8;
        G.total = G.escenas[G.escenas.length - 1].fin;
        G.conVoz = vozIni.some(Boolean);
        st.voz = '✓ ' + (G.conVoz ? 'voz IA' : 'sin voz') + (sub ? ' + subtítulos' : '') + (musica ? ' + música' : '');
        st.mon = 'preparando el sonido…'; pasos(st);
        return bandaSonora(actx, G.total, vozIni, musica).then(function (audio) { return { audio: audio, palabras: sub ? palabras : null }; });
      });
    }).then(function (pista) {
      var cta = CTA[G.idioma] || CTA.en, ult = G.escenas.length - 1;
      var escenas = G.escenas.map(function (e, k) {
        var ultima = k === ult;
        return { fuente: e.fuente, ini: e.ini, fin: e.fin, titulo: k === 0 ? (e.texto_pantalla || G.titulo) : ultima ? (e.texto_pantalla || '') : '', sinTexto: !(k === 0 || ultima),
          ctas: ultima ? [{ t: '👉 ' + cta }] : null };
      });
      var p = { formato: 'reel', titulo: G.titulo, txt: G.descripcion || '', foto: 0, L: 0, media: null, sinOferta: true, sinBoton: false, kicker: '' };
      // la primera escena sin botón (el botón va al final)
      escenas[0].sinBoton = true;
      var bar = $('viBar'); if (bar) bar.style.display = 'block';
      st.mon = 'grabando ' + Math.round(G.total) + ' s… (no cierres esta pantalla)'; pasos(st); bar = $('viBar'); if (bar) bar.style.display = 'block';
      var ex = { escenas: escenas, audio: pista.audio, actx: pista.audio ? actx : null, palabras: pista.palabras, retraso: 0, dur: G.total, bitrate: 5000000, cerrarAudio: false, verEn: $('viLienzo'), fundido: 0.6 };
      // el montador de vídeo del Estudio (el mismo de «Descargar vídeo»), por escenas
      return E().hacerVideo(p, function (f) { var b = $('viBar'); if (b && b.firstChild) b.firstChild.style.width = Math.round(f * 100) + '%'; }, G.total, ex);
    }).then(function (blob) {
      cerrarAudio(actx);
      var ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
      G.blob = blob; G.ext = ext; G.url = URL.createObjectURL(blob); G.avisos = avisos; G.creado = Date.now();
      V.ultimo = G; st.mon = '✓ ' + ext.toUpperCase() + ', ' + Math.round(blob.size / 1024) + ' KB, ' + Math.round(G.total) + ' s'; pasos(st);
      var l = $('viLienzo'); if (l) l.innerHTML = '';
      if ($('viRes')) $('viRes').innerHTML = pintarResultado(G);
      aviso('🎬 Vídeo listo');
    }).catch(function (e) {
      cerrarAudio(actx);
      st.mon = '✗ ' + ((e && e.message) || 'error'); pasos(st);
      if ($('viRes')) $('viRes').innerHTML = '<div class="warn">No se pudo crear el vídeo: ' + esc((e && e.message) || 'error') + '</div>';
    }).then(function () { V.ocupado = false; if ($('viBoton')) $('viBoton').disabled = false; });
  }
  function pintarResultado(G) {
    if (!G || !G.url) return '';
    var av = (G.avisos || []).map(function (a) { return '<div style="font-size:12.5px;color:var(--amber,#ffcc33);margin:2px 0">' + esc(a) + '</div>'; }).join('');
    return '<div class="card"><h3 style="margin:0 0 6px">🎬 «' + esc(G.titulo) + '»' + (G.ejemplo ? ' <span class="chip amb">EJEMPLO</span>' : ' <span class="chip">hecho con IA</span>') + '</h3>' + av +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;margin-top:8px"><video id="viVideo" src="' + G.url + '" controls playsinline style="width:100%;max-width:260px;border-radius:14px;background:#000"></video>' +
      '<div style="flex:1;min-width:220px"><div style="font-size:13px;color:var(--tx2)">' + G.escenas.length + ' escenas · ' + Math.round(G.total) + ' s · ' + (G.deIA ? G.deIA + ' imágenes IA' : 'fotos libres') + ' · ' + (G.conVoz ? 'voz IA' : 'sin voz') + ' · ' + G.ext.toUpperCase() + (G.ext === 'webm' ? ' (este navegador no graba MP4: TikTok e Instagram lo aceptan desde el ordenador; en el iPhone sale MP4)' : '') + '</div>' +
      '<ol style="font-size:13px;color:var(--tx2);padding-left:18px">' + G.escenas.map(function (e) { return '<li>' + esc(e.dice) + (e.tipo === 'ia' ? ' <span class="chip" style="font-size:10px">imagen IA</span>' : '') + '</li>'; }).join('') + '</ol>' +
      (G.descripcion ? '<div style="font-size:12.5px;color:var(--tx3)">Texto para el post: ' + esc(G.descripcion) + ' ' + esc((G.hashtags || []).join(' ')) + '</div>' : '') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn pp sm" style="flex:none" onclick="ChispaVideoIA.descargar()">⬇️ Descargar ' + G.ext.toUpperCase() + '</button>' +
      '<button class="btn g sm" style="flex:none" onclick="ChispaVideoIA.programar()">📅 Programar</button>' +
      '<button class="btn g sm" style="flex:none" onclick="ChispaVideoIA.crear()">↻ Otra versión</button></div></div></div></div>';
  }
  function descargar() {
    var G = V.ultimo; if (!G || !G.blob) return;
    var nm = 'chispa-' + slug(G.titulo) + '.' + G.ext;
    var es = E();
    if (es.esMovil && es.esMovil() && es.compartirArchivo) return es.compartirArchivo(G.blob, nm, G.descripcion || G.titulo).then(function (r) { if (r === 'no' && es.bajar) es.bajar(G.blob, nm); });
    if (es.bajar) es.bajar(G.blob, nm);
  }
  function horaBuena(d) {
    try { var h = ChispaSector.horasDe((d.getDay() + 6) % 7).filter(function (x) { return x.formato === 'reel'; })[0] || ChispaSector.horasDe((d.getDay() + 6) % 7)[0]; if (h && /^\d\d:\d\d$/.test(h.hora)) return h.hora; } catch (e) {}
    return '19:00';
  }
  function programar() {
    var G = V.ultimo; if (!G || !G.blob) return;
    if (!window.CHISPA_AGENDA || !CHISPA_AGENDA.conVideo) { aviso('No se pudo abrir el calendario'); return; }
    var d = new Date(); d.setDate(d.getDate() + 1); var h = horaBuena(d).split(':'); d.setHours(+h[0], +h[1], 0, 0);
    var P = PLAT[G.plataforma] || PLAT.tiktok;
    CHISPA_AGENDA.conVideo({ titulo: String(G.titulo).slice(0, 80), txt: G.descripcion || G.titulo, tags: (G.hashtags || []).join(' '), formato: 'reel', redes: [P.red], cuando: iso(d), estado: 'programada',
      por: 'Vídeo creado con IA en Chispa (' + G.escenas.length + ' escenas). Está guardado en este aparato y se sube al servidor al programarlo.', origen: 'video-ia' }, G.blob)
      .then(function (it) {
        aviso('📅 Programado para mañana a las ' + h.join(':') + ' en ' + P.nm + '. Cámbialo si quieres.');
        try { if (typeof window.vista === 'function') window.vista('panel'); if (typeof window.panel === 'function') window.panel('calendario'); if (window.agAbrir) window.agAbrir(it.id); } catch (e) {}
      }, function (e) { aviso('No se pudo programar: ' + ((e && e.message) || 'error')); });
  }

  /* ---------------- enganches: Estudio, Asistente, ventana ---------------- */
  var estudioPrevio = window.estudio;
  if (typeof estudioPrevio === 'function') {
    window.estudio = function (tab) {
      if (tab !== 'video') return estudioPrevio.apply(this, arguments);
      try { ETAB = tab; } catch (e) {}
      try { if (typeof pintarENav === 'function') pintarENav(); } catch (e) {}
      var m = $('emain'); if (m) { m.innerHTML = vista(); pintarPro(); }
    };
  }
  function abrirModal(pre) {
    if (typeof window.modal !== 'function') return;
    window.modal(vista(pre));
    pintarPro();
  }
  function tarjetaCreadores() {
    if ($('viCreadores')) return;
    var main = $('main'); if (!main) return;
    var d = document.createElement('div'); d.id = 'viCreadores'; d.className = 'card';
    d.style.cssText = 'background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.3)';
    d.innerHTML = '<b>🎥 ¿Creas contenido? Chispa también es para ti</b>' +
      '<ul style="font-size:13px;color:var(--tx2);margin:6px 0 8px;padding-left:18px">' +
      '<li><b style="color:var(--tx)">Vídeo con IA</b> de un tema o un guion: escenas, imágenes IA, voz, subtítulos y tu sello, en vertical.</li>' +
      '<li><b style="color:var(--tx)">Miniseries y guiones</b> con gancho y final que engancha (Estudio, planes Pro y Agencia).</li>' +
      '<li><b style="color:var(--tx)">Reaprovechar</b> un texto o vídeo largo en posts, hilo, carrusel y guion; <b style="color:var(--tx)">cortar un vídeo largo</b> en clips verticales.</li>' +
      '<li><b style="color:var(--tx)">Varios idiomas</b> y <b style="color:var(--tx)">publicar o programar</b> en TikTok, Reels y Shorts (al conectar tus cuentas).</li></ul>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pp sm" style="flex:none" onclick="ChispaVideoIA.abrir()">🎬 Crear vídeo con IA</button>' +
      '<button class="btn g sm" style="flex:none" onclick="vista(\'estudio\');estudio(\'serie\')">🎞️ Miniserie</button>' +
      '<button class="btn g sm" style="flex:none" onclick="ChispaIA&&ChispaIA.reaprovechar()">♻️ Reaprovechar</button></div>';
    var ancla = $('ciaRepCard') || main.querySelector('.card');
    if (ancla && ancla.parentNode) ancla.parentNode.insertBefore(d, ancla.nextSibling); else main.appendChild(d);
  }
  var panelPrevio = window.panel;
  if (typeof panelPrevio === 'function') {
    window.panel = function (tab) {
      var r = panelPrevio.apply(this, arguments);
      try { if (tab === 'asistente') tarjetaCreadores(); } catch (e) {}
      return r;
    };
  }
  // pestaña del Estudio (si chispa-creadores.js no la puso)
  try { if (window.ETABS && !window.ETABS.some(function (t) { return t.id === 'video'; })) window.ETABS.splice(3, 0, { id: 'video', ic: '🎞️', nm: 'Crear vídeo con IA' }); } catch (e) {}

  window.ChispaVideoIA = { crear: crear, abrir: abrirModal, descargar: descargar, programar: programar, vista: vista, plantilla: plantilla, _estado: V, mensajePro: MSG_PRO };

  try {
    if (typeof TAB !== 'undefined' && $('app') && $('app').classList.contains('on') && TAB === 'asistente') tarjetaCreadores();
    if (/video-ia/.test(location.hash || '')) { if (typeof window.vista === 'function') window.vista('estudio'); window.estudio('video'); }
  } catch (e) {}
})();
