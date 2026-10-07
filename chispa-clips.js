/* =====================================================================
   Chispa · «✂️ Cortar un vídeo largo en clips» (trabajador J)
   ---------------------------------------------------------------------
   Todo en el propio móvil u ordenador, gratis y sin subir nada:
     1. Eliges un vídeo (sin FileReader: URL.createObjectURL y arrayBuffer).
     2. Chispa escucha el sonido y propone los momentos con más vida
        (más volumen = más risas, aplausos, gente hablando…). Si el
        navegador no puede analizarlo, los reparte a lo largo del vídeo.
     3. Cada clip se graba en VERTICAL 9:16 (recortado al centro) o en el
        formato original, con su sonido: lienzo + MediaRecorder. Tarda lo
        que dura el clip. Se descarga o se comparte.
   API: ChispaClips.abrir() · ChispaClips.momentos(energias, seg, n) (pura, con pruebas)
   ===================================================================== */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function aviso(m) { try { window.toast(m); } catch (e) {} }
  function mmss(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }

  var V = { url: null, nombre: '', duracion: 0, clips: [], largo: 30, n: 3, vertical: true, grabando: false };

  /* Momentos con más energía: ventanas de «seg» segundos que no se pisan.
     energias = volumen medio por segundo. Devuelve los inicios, en orden. */
  function momentos(energias, seg, n) {
    var L = energias.length; if (!L) return [];
    seg = Math.max(1, Math.min(seg, L));
    var sum = [0]; for (var i = 0; i < L; i++) sum.push(sum[i] + energias[i]);
    var cands = [];
    for (var s = 0; s + seg <= L; s++) cands.push([sum[s + seg] - sum[s], s]);
    cands.sort(function (a, b) { return b[0] - a[0]; });
    var elegidos = [];
    for (var k = 0; k < cands.length && elegidos.length < n; k++) {
      var ini = cands[k][1];
      if (elegidos.every(function (e) { return ini + seg <= e || ini >= e + seg; })) elegidos.push(ini);
    }
    return elegidos.sort(function (a, b) { return a - b; });
  }
  function repartidos(dur, seg, n) {
    var out = [], hueco = Math.max(0, dur - seg);
    for (var i = 0; i < n; i++) out.push(n === 1 ? hueco / 2 : (hueco * i) / (n - 1));
    return out.filter(function (x, i, a) { return i === 0 || x - a[i - 1] >= Math.min(seg, 1); });
  }

  function abrir() {
    if (typeof modal !== 'function') return;
    modal('<h3>✂️ Cortar un vídeo largo en clips</h3>' +
      '<p style="color:var(--tx2);font-size:13.5px;margin:0 0 10px">Elige un vídeo largo (una entrevista, un directo, un evento). Chispa busca los mejores momentos por el sonido y te los deja en clips verticales para Reels, TikTok y Shorts. Todo se hace en tu aparato: no se sube a ningún sitio.</p>' +
      '<label class="btn pp" style="display:block;text-align:center;cursor:pointer">🎬 Elegir vídeo<input id="clIn" type="file" accept="video/*" style="display:none" onchange="ChispaClips._elegido(this)"></label>' +
      '<div id="clCuerpo"></div>');
  }
  function elegido(inp) {
    var f = inp.files && inp.files[0]; if (!f) return;
    if (!/^video\//.test(f.type) && !/\.(mp4|mov|webm|m4v)$/i.test(f.name)) { aviso('Elige un vídeo 🙂'); return; }
    if (V.url) try { URL.revokeObjectURL(V.url); } catch (e) {}
    V.url = URL.createObjectURL(f); V.nombre = f.name.replace(/\.[^.]+$/, ''); V.archivo = f; V.clips = [];
    $('clCuerpo').innerHTML = '<video id="clVid" src="' + V.url + '" controls playsinline style="width:100%;max-height:260px;border-radius:12px;margin-top:10px;background:#000"></video><div id="clOpc" style="color:var(--tx3);font-size:13px;margin-top:6px">Leyendo el vídeo…</div>';
    var v = $('clVid');
    v.onloadedmetadata = function () { V.duracion = v.duration || 0; pintarOpciones(); };
    v.onerror = function () { $('clOpc').innerHTML = '<span style="color:#fb7185">Este navegador no puede abrir ese vídeo. Prueba con un MP4.</span>'; };
  }
  function pintarOpciones() {
    var d = V.duracion, maxN = Math.max(1, Math.min(10, Math.floor(d / 5)));
    if (V.largo > d) V.largo = Math.max(3, Math.floor(d));
    $('clOpc').innerHTML = '<div style="font-size:13px;color:var(--tx2);margin:4px 0 8px">Dura ' + mmss(d) + '.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label class="lb" for="clLargo">Cada clip (segundos)</label><select id="clLargo">' + [15, 30, 45, 60].concat(d < 15 ? [Math.max(3, Math.floor(d))] : []).filter(function (s) { return s <= Math.max(3, d); }).map(function (s) { return '<option' + (s === V.largo ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="lb" for="clN">Cuántos clips</label><input class="inp" id="clN" type="number" min="1" max="' + maxN + '" value="' + Math.min(V.n, maxN) + '"></div></div>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;color:var(--tx2);margin-top:8px"><input type="checkbox" id="clVert" style="width:auto"' + (V.vertical ? ' checked' : '') + '> Vertical 9:16 (recortado al centro)</label>' +
      '<button class="btn pp" style="width:100%;margin-top:10px" onclick="ChispaClips._proponer()">⚡ Buscar los mejores momentos</button><div id="clLista"></div>';
  }
  function proponer() {
    V.largo = Number($('clLargo').value) || 30; V.n = Math.max(1, Math.min(10, Number($('clN').value) || 3)); V.vertical = $('clVert').checked;
    var seg = Math.min(V.largo, Math.floor(V.duracion)) || 1;
    $('clLista').innerHTML = '<p style="color:var(--tx3);font-size:13px">Escuchando el vídeo…</p>';
    analizar(V.archivo).then(function (en) {
      var ini = en && en.length > seg ? momentos(en, seg, V.n) : repartidos(V.duracion, seg, V.n);
      pintarClips(ini, seg, !!(en && en.length > seg));
    }, function () { pintarClips(repartidos(V.duracion, seg, V.n), seg, false); });
  }
  /* Volumen medio por segundo (Web Audio). Vídeos muy grandes (> 300 MB) no se analizan: se reparten */
  function analizar(f) {
    if (!f || f.size > 300e6 || typeof f.arrayBuffer !== 'function') return Promise.reject();
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return Promise.reject();
    return f.arrayBuffer().then(function (buf) {
      var ac = new AC();
      return new Promise(function (ok, mal) { ac.decodeAudioData(buf, ok, mal); }).then(function (audio) {
        var d = audio.getChannelData(0), sr = audio.sampleRate, out = [];
        for (var s = 0; s * sr < d.length; s++) {
          var a = 0, ini = s * sr, fin = Math.min(d.length, ini + sr), paso = Math.max(1, Math.floor((fin - ini) / 4000));
          var k = 0; for (var i = ini; i < fin; i += paso) { a += d[i] * d[i]; k++; }
          out.push(Math.sqrt(a / Math.max(1, k)));
        }
        try { ac.close(); } catch (e) {}
        return out;
      });
    });
  }
  function pintarClips(inicios, seg, porSonido) {
    V.clips = inicios.map(function (s) { return { ini: s, seg: seg }; });
    $('clLista').innerHTML = '<p style="font-size:12.5px;color:var(--tx3);margin:10px 0 6px">' + (porSonido ? 'Elegidos por el sonido: donde más pasa.' : 'Repartidos a lo largo del vídeo (este no se ha podido escuchar).') + ' Puedes moverlos antes de crearlos.</p>' +
      V.clips.map(function (c, i) {
        return '<div style="border:1px solid var(--line);border-radius:12px;padding:9px 11px;margin-bottom:8px"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>Clip ' + (i + 1) + '</b><span id="clT' + i + '" style="color:var(--tx2);font-size:13px">' + mmss(c.ini) + ' – ' + mmss(c.ini + c.seg) + '</span>' +
          '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="btn g sm" onclick="ChispaClips._mover(' + i + ',-5)" aria-label="5 segundos antes">−5 s</button><button class="btn g sm" onclick="ChispaClips._mover(' + i + ',5)" aria-label="5 segundos después">+5 s</button><button class="btn g sm" onclick="ChispaClips._ver(' + i + ')">▶ Ver</button><button class="btn pp sm" onclick="ChispaClips._crear(' + i + ')">Crear clip</button></span></div><div id="clR' + i + '"></div></div>';
      }).join('');
  }
  function mover(i, d) { var c = V.clips[i]; c.ini = Math.max(0, Math.min(V.duracion - c.seg, c.ini + d)); $('clT' + i).textContent = mmss(c.ini) + ' – ' + mmss(c.ini + c.seg); }
  function ver(i) { var v = $('clVid'), c = V.clips[i]; v.currentTime = c.ini; v.play().catch(function () {}); setTimeout(function () { if (Math.abs(v.currentTime - c.ini - c.seg) < 2 || v.currentTime > c.ini + c.seg) v.pause(); }, c.seg * 1000); }

  /* Graba el clip: vídeo oculto → lienzo (9:16 o el suyo) + su sonido → MediaRecorder */
  function tipoGrabacion() {
    var t = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < t.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t[i])) return t[i];
    return '';
  }
  function crear(i) {
    if (V.grabando) { aviso('Espera a que acabe el clip anterior'); return; }
    var c = V.clips[i], caja = $('clR' + i), tipo = tipoGrabacion();
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { caja.innerHTML = '<p style="color:#fb7185;font-size:13px">Este navegador no puede grabar clips. Prueba en Chrome o en Safari actualizado.</p>'; return; }
    V.grabando = true;
    var v = document.createElement('video'); v.src = V.url; v.playsInline = true; v.muted = false; v.preload = 'auto';
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    v.onloadedmetadata = function () {
      var w = v.videoWidth || 720, h = v.videoHeight || 1280;
      if (V.vertical) { cv.height = Math.min(1280, h); cv.width = Math.round(cv.height * 9 / 16); } else { var k = Math.min(1, 1280 / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k); }
      v.currentTime = c.ini;
    };
    v.onseeked = function () {
      if (V._empezado) return; V._empezado = true;
      var pista = cv.captureStream(30), audio = null;
      try {
        var AC = window.AudioContext || window.webkitAudioContext, ac = new AC(), src = ac.createMediaElementSource(v), dst = ac.createMediaStreamDestination();
        src.connect(dst); audio = ac; dst.stream.getAudioTracks().forEach(function (t) { pista.addTrack(t); });
      } catch (e) { /* sin sonido si el navegador no deja */ }
      var trozos = [], rec = new MediaRecorder(pista, tipo ? { mimeType: tipo, videoBitsPerSecond: 4e6 } : undefined);
      rec.ondataavailable = function (e) { if (e.data && e.data.size) trozos.push(e.data); };
      rec.onstop = function () {
        V.grabando = false; V._empezado = false;
        try { audio && audio.close(); } catch (e) {}
        var blob = new Blob(trozos, { type: (rec.mimeType || tipo || 'video/webm').split(';')[0] });
        var ext = /mp4/.test(blob.type) ? 'mp4' : 'webm', nombre = (V.nombre || 'clip') + '-clip' + (i + 1) + '.' + ext, url = URL.createObjectURL(blob);
        caja.innerHTML = '<video src="' + url + '" controls playsinline style="width:' + (V.vertical ? '140px' : '100%') + ';border-radius:10px;margin-top:8px;background:#000"></video>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><a class="btn pp sm" href="' + url + '" download="' + esc(nombre) + '">⬇️ Descargar</a>' +
          (navigator.canShare ? '<button class="btn g sm" onclick="ChispaClips._compartir(' + i + ')">📤 Compartir</button>' : '') + '<span style="font-size:12px;color:var(--tx3);align-self:center">' + Math.round(blob.size / 1024) + ' KB · ' + ext.toUpperCase() + '</span></div>';
        c.blob = blob; c.nombre = nombre;
        aviso('✅ Clip ' + (i + 1) + ' listo');
      };
      var fin = c.ini + c.seg, t0 = performance.now();
      function pintar() {
        if (v.paused || v.ended || v.currentTime >= fin) { if (rec.state === 'recording') rec.stop(); v.pause(); return; }
        var w = v.videoWidth, h = v.videoHeight;
        if (V.vertical) { var esc2 = Math.max(cv.width / w, cv.height / h), dw = w * esc2, dh = h * esc2; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(v, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh); }
        else ctx.drawImage(v, 0, 0, cv.width, cv.height);
        var p = Math.min(1, (v.currentTime - c.ini) / c.seg); caja.innerHTML = '<div style="height:6px;background:var(--panel2);border-radius:4px;margin-top:8px"><div style="height:6px;width:' + Math.round(p * 100) + '%;background:var(--purple);border-radius:4px"></div></div><div style="font-size:12px;color:var(--tx3)">Grabando… ' + Math.round(p * 100) + ' %</div>';
        if (performance.now() - t0 > (c.seg + 20) * 1000) { rec.stop(); v.pause(); return; } // red de seguridad
        requestAnimationFrame(pintar);
      }
      rec.start(500);
      v.play().then(function () { requestAnimationFrame(pintar); }, function (e) { V.grabando = false; V._empezado = false; caja.innerHTML = '<p style="color:#fb7185;font-size:13px">No se pudo reproducir: ' + esc(e.message) + '</p>'; try { rec.stop(); } catch (x) {} });
    };
  }
  function compartir(i) {
    var c = V.clips[i]; if (!c || !c.blob) return;
    try {
      var f = new File([c.blob], c.nombre, { type: c.blob.type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: c.nombre }).catch(function () {});
      else aviso('Descárgalo y súbelo desde la app de la red');
    } catch (e) { aviso('Descárgalo y súbelo desde la app de la red'); }
  }

  /* Botón junto a «♻️ Reaprovechar» (tarjeta de chispa-ia.js) en el Asistente */
  function ponerBoton() {
    var t = $('ciaRepCard'); if (!t || $('clBoton')) return;
    var b = document.createElement('button'); b.id = 'clBoton'; b.className = 'btn g sm'; b.style.flex = 'none'; b.textContent = '✂️ Cortar en clips'; b.onclick = abrir;
    var fila = t.firstElementChild || t; fila.appendChild(b);
  }
  var panelAntes = window.panel;
  if (typeof panelAntes === 'function') window.panel = function (tab) { var r = panelAntes.apply(this, arguments); if (tab === 'asistente') setTimeout(ponerBoton, 60); return r; };
  setTimeout(ponerBoton, 300);

  window.ChispaClips = { abrir: abrir, momentos: momentos, repartidos: repartidos, _elegido: elegido, _proponer: proponer, _mover: mover, _ver: ver, _crear: crear, _compartir: compartir, _estado: V };
})();
