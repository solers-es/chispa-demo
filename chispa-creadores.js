/* =====================================================================
   Chispa · ESTUDIO PARA CREADORES (trabajador K)
   ---------------------------------------------------------------------
   La pestaña «Estudio de contenido» era una herramienta interna de ideas
   (canales, miniseries y guiones con plantillas fijas, un calendario de
   juguete que no publicaba nada y una página de «ingresos» con cifras sin
   fuente). Decisión de Stalin (07/10/2026): TODO va para vender. Así que:

     · Miniserie y Guion con IA DE VERDAD (servidor: POST /ia/texto con
       accion «serie» | «guion», Llama 3.3), para cualquier tema, en el
       idioma del negocio o el que se elija, con su sector y su tono.
       Sin servidor: plantillas de EJEMPLO marcadas como tales.
     · «Pasar al calendario»: cada episodio entra en el CALENDARIO REAL
       (S.agenda, el mismo que publica el servidor) como BORRADOR con fecha
       propuesta y red (TikTok / Reels / Shorts). Borrador porque falta el
       vídeo: el creador lo graba o lo sube, y lo programa. Nada se publica
       solo sin vídeo.
     · Portada de cada episodio con el SELLO DE MARCA (motor de imagen del
       Estudio: IA del servidor o foto libre) para descargar.
     · Canales: los de ejemplo llevan la etiqueta EJEMPLO y se quitan con
       un toque; cada canal cuenta sus piezas en el calendario.
     · «Monetizar» y «Buenas prácticas» sin promesas: solo umbrales oficiales
       con enlace a la fuente y la advertencia de revisarlos.
     · Plan: Pro y Agencia (precios.js y el servidor, FUNCIONES.estudio).
       En Básico se ve todo y se usan las plantillas; la IA responde 402.

   Sustituye las vistas del Estudio de index.html (vCartera, vSerie, vGuion,
   vEcal, vIngresos, vReglas y ETABS) sin tocar el resto. Sin FileReader.
   ===================================================================== */
(function () {
  'use strict';
  if (typeof S === 'undefined' || typeof estudio !== 'function') return;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (s == null ? '' : '' + s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(m) { try { toast(m); } catch (e) {} }
  function sync() { return window.ChispaSync; }
  function conServidor() { var s = sync(); if (!s || !s.estado || !s.pedir) return false; var e = s.estado(); return e.modo === 'servidor' && !e.pausado; }
  function info() { try { if (window.ChispaSector && ChispaSector.paraIA) return ChispaSector.paraIA(); } catch (e) {} var n = S.negocio || {}; return { sector: '', negocio: n.nombre, ciudad: n.ciudad, idioma: { base: 'es' } }; }
  function idiomaNegocio() { var i = info().idioma; return ((i && (i.base || i.codigo)) || 'es').slice(0, 2).toLowerCase(); }
  function nombreSector() { try { return ChispaSector.actual().nombre; } catch (e) { return ''; } }
  function copiar(t) { try { navigator.clipboard.writeText(t).then(function () { aviso('Copiado ✓'); }, function () { prompt('Copia el texto', t); }); } catch (e) { prompt('Copia el texto', t); } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function uid() { return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var IDIOMAS = [['es', 'Español'], ['en', 'Inglés'], ['fr', 'Francés'], ['de', 'Alemán'], ['it', 'Italiano'], ['pt', 'Portugués'], ['ca', 'Catalán'], ['nl', 'Neerlandés']];
  var PLAT = {
    tiktok: { nm: 'TikTok', red: 'tt', dur: '21-45 s', cab: 'que lo vean hasta el final y lo repitan' },
    reels: { nm: 'Instagram Reels', red: 'igf', dur: '30-90 s', cab: 'que lo compartan por mensaje' },
    shorts: { nm: 'YouTube Shorts', red: 'yt', dur: '15-50 s', cab: 'que no deslicen y lo vean entero' }
  };
  var NICHOS = ['Mi negocio por dentro', 'Tecnología e IA', 'Idiomas', 'Historia y curiosidades', 'Cocina y recetas', 'Deporte y salud (sin consejos médicos)', 'Belleza y moda', 'Viajes', 'Humor', 'Productividad', 'Motor', 'Música'];

  /* ---------------- estado propio ---------------- */
  function datos() {
    if (!S.estudioK) {
      S.estudioK = { v: 1, ultimaSerie: null, ultimoGuion: null };
      // los canales que venían de serie eran inventados: se marcan como EJEMPLO
      (S.canales || []).forEach(function (c) { if (['IA en 60 segundos', 'English con trucos', 'Historias que no sabías', 'Productividad brutal'].indexOf(c.nombre) >= 0) c.ejemplo = true; });
      // lo que alguien hubiera apuntado a mano en el calendario viejo del Estudio pasa al calendario real como borrador
      var viejos = ['IA: 3 apps que no conocías', 'Inglés: 5 errores típicos', 'Historia: el error que lo cambió todo', 'IA: automatiza tu día', 'Serie misterio · episodio 2'];
      (S.contenidoCal || []).forEach(function (e) {
        if (viejos.indexOf(e.txt) >= 0) return;
        alCalendario([{ titulo: e.txt, txt: e.txt, plataforma: e.red === 'YT' ? 'shorts' : e.red === 'IG' ? 'reels' : 'tiktok' }], { cada: 1, sinAviso: true });
      });
      try { guardar(); } catch (e) {}
    }
    if (!S.canales) S.canales = [];
    return S.estudioK;
  }

  /* ---------------- IA del servidor ---------------- */
  function pedirIA(cuerpo) {
    var I = info();
    cuerpo.negocio = I.negocio; cuerpo.sector = nombreSector() || I.sector; cuerpo.ciudad = I.ciudad;
    return sync().pedir('POST', '/ia/texto', cuerpo);
  }
  function errorIA(e) {
    var m = (e && e.message) || 'no disponible';
    if (/Pro y Agencia/.test(m)) return '🔒 ' + m;
    return '⚠️ La IA no ha podido: ' + m + '. Te dejo una plantilla de ejemplo.';
  }

  /* ---------------- piezas comunes ---------------- */
  function cabeceraModo() {
    if (conServidor()) return '<div class="card" style="background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.3)"><div style="font-size:13px;color:var(--tx2)">✅ <b style="color:var(--tx)">IA activada</b> · escribe para cualquier tema, en tu idioma y con el tono de tu negocio. Incluido en los planes <b>Pro y Agencia</b>.</div></div>';
    return '<div class="card" style="background:rgba(255,204,51,.06);border-color:rgba(255,204,51,.25)"><div style="font-size:13px;color:var(--tx2)">🧪 <b style="color:var(--tx)">Modo demostración:</b> verás plantillas de EJEMPLO. Con tu cuenta (entra con tu código en <a href="javascript:void 0" onclick="vista(\'panel\');panel(\'conectar\')">Conexiones</a>) la IA lo escribe para cualquier tema e idioma. Planes Pro y Agencia.</div></div>';
  }
  function selIdioma(id) {
    var lc = idiomaNegocio(), l = IDIOMAS.slice();
    if (!l.some(function (x) { return x[0] === lc; })) l.unshift([lc, lc.toUpperCase()]);
    return '<select id="' + id + '">' + l.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === lc ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>';
  }
  function selPlat(id, v) { return '<select id="' + id + '">' + Object.keys(PLAT).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + PLAT[k].nm + '</option>'; }).join('') + '</select>'; }
  function selCanal(id) {
    var c = (S.canales || []).filter(function (x) { return !x.ejemplo; });
    return '<select id="' + id + '"><option value="">— Sin canal —</option>' + c.map(function (x) { return '<option>' + esc(x.nombre) + '</option>'; }).join('') + '</select>';
  }

  /* ---------------- al calendario real ---------------- */
  function horaBuena(d) {
    try { var h = ChispaSector.horasDe((d.getDay() + 6) % 7).filter(function (x) { return x.formato === 'reel'; })[0] || ChispaSector.horasDe((d.getDay() + 6) % 7)[0]; if (h && /^\d\d:\d\d$/.test(h.hora)) return h.hora; } catch (e) {}
    return '19:00';
  }
  function alCalendario(piezas, op) {
    op = op || {};
    if (!S.agenda) S.agenda = [];
    var E = window.CHISPA_ESTUDIO || {}, cada = op.cada || 1, d = new Date(), n = 0;
    d.setDate(d.getDate() + 1);
    piezas.forEach(function (p, k) {
      var f = new Date(d); f.setDate(d.getDate() + k * cada);
      var h = horaBuena(f).split(':'); f.setHours(+h[0], +h[1], 0, 0);
      // si a esa hora ya hay otra publicación, una hora después (como mucho 6 intentos)
      for (var z = 0; z < 6 && S.agenda.some(function (o) { return o.cuando === iso(f) && o.estado !== 'publicada'; }); z++) f.setHours(f.getHours() + 1);
      var pl = PLAT[p.plataforma] || PLAT.tiktok;
      var cat = E.catDe ? E.catDe(p.titulo + ' ' + (p.txt || '')) : 'local';
      var media = p.media || (E.fotoPara ? (function () { var x = E.fotoPara(cat, k, 1080, 1920); return { tipo: 'foto', url: x.url, cred: x.cred }; })() : null);
      S.agenda.push({ id: uid(), titulo: String(p.titulo || 'Vídeo').slice(0, 80), txt: p.txt || '', tags: p.tags || '', kicker: p.kicker || '', formato: 'reel', cat: cat, L: 0, foto: k,
        ctas: null, sinTexto: false, redes: [pl.red], cuando: iso(f), estado: 'borrador', por: 'Estudio para creadores: falta el vídeo. Grábalo o súbelo y pásalo a «Programada».',
        media: media, mediaLocal: false, ejemplo: false, res: {}, motivo: '', modo: 'hora', hasta: '', piezas: null, reparto: 'auto', cada: 0, promo: false,
        origen: 'estudio', canal: p.canal || '', guion: p.guion || '' });
      n++;
    });
    try { guardar(); } catch (e) {}
    if (!op.sinAviso) aviso('📅 ' + n + (n === 1 ? ' borrador' : ' borradores') + ' en tu calendario, con fecha propuesta. Falta el vídeo de cada uno.');
    return n;
  }
  function delEstudio() { return (S.agenda || []).filter(function (a) { return a.origen === 'estudio'; }); }

  /* ---------------- portada con sello de marca ---------------- */
  function portada(titulo, kicker, txt) {
    var E = window.CHISPA_ESTUDIO, M = window.CHISPA_MOTOR;
    if (!E || !E.nuevoPost || !E.hacerImagen) { aviso('La portada necesita el Estudio de publicaciones'); return; }
    var p = E.nuevoPost({ titulo: titulo, kicker: kicker || '', txt: txt || titulo, formato: 'reel' });
    p.ctas = [{ t: '▶ ' + (/^Episodio/.test(kicker || '') ? 'Mira el episodio' : 'Míralo'), tipo: 'web', url: '' }]; // una portada de vídeo no lleva «Reservar»
    modal('<h3>🎨 Portada</h3><div id="kPort" style="text-align:center;color:var(--tx3);padding:30px 0">Creando la portada con tu marca…</div>');
    var paso = M && M.generar ? M.generar({ cat: p.cat, formato: 'reel', ancho: 1080, alto: 1920, cantidad: 1, semilla: Math.floor(Math.random() * 50), ia: true, texto: txt || titulo, titulo: titulo }) : Promise.resolve(null);
    paso.then(function (m) { p.media = m; return E.hacerImagen(p); }).then(function (b) {
      var u = URL.createObjectURL(b), box = $('kPort'); if (!box) return;
      box.innerHTML = '<img src="' + u + '" alt="Portada" style="max-width:100%;max-height:60vh;border-radius:12px">' +
        '<div style="font-size:12px;color:var(--tx3);margin:8px 0">' + (p.media && p.media.tipo === 'ia' ? 'Imagen creada con IA' : 'Foto libre (Unsplash)') + ' · con tu logo y tus colores</div>' +
        '<a class="btn pp" href="' + u + '" download="portada-' + esc(String(titulo).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)) + '.jpg">⬇️ Descargar</a>';
    }, function () { var box = $('kPort'); if (box) box.innerHTML = 'No se pudo crear la portada. Prueba otra vez.'; });
  }
  window.ChispaCreadores = { portada: portada, alCalendario: alCalendario, delEstudio: delEstudio, conServidor: conServidor };

  /* =====================================================================
     PESTAÑAS
     ===================================================================== */
  window.ETABS = [
    { id: 'cartera', ic: '📺', nm: 'Mis canales' },
    { id: 'serie', ic: '🎬', nm: 'Miniserie con IA' },
    { id: 'guion', ic: '🎯', nm: 'Guion con IA' },
    { id: 'ecal', ic: '🗓️', nm: 'En el calendario' },
    { id: 'ingresos', ic: '💶', nm: 'Monetizar' },
    { id: 'reglas', ic: '🛡️', nm: 'Buenas prácticas' }
  ];
  try { ETABS = window.ETABS; } catch (e) {}

  /* --- canales --- */
  window.vCartera = function () {
    datos();
    var html = '<div class="hd"><h2>📺 Mis canales</h2><button class="btn pp sm" onclick="addCanal()">+ Nuevo canal</button></div>';
    html += '<div class="card" style="background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.3)"><div style="font-size:13.5px;color:var(--tx2)">Para creadores y agencias que llevan <b style="color:var(--tx)">varios canales o temas</b>. Prueba temas, apunta en qué estado está cada uno y manda sus series y guiones al calendario. Chispa no garantiza visitas ni ingresos: te quita el trabajo de planificar y escribir.</div></div>';
    var ej = S.canales.filter(function (c) { return c.ejemplo; }).length;
    if (ej) html += '<div class="card" style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap"><div style="font-size:13px;color:var(--tx2)">Hay ' + ej + ' canales de EJEMPLO para que veas cómo queda.</div><button class="btn g sm" onclick="kQuitarEjemplos()">Quitar los ejemplos</button></div>';
    if (!S.canales.length) html += '<div class="empty">Aún no hay canales. Crea el primero.</div>';
    var A = delEstudio();
    S.canales.forEach(function (c, ix) {
      var piezas = A.filter(function (a) { return a.canal && a.canal === c.nombre; }).length;
      html += '<div class="canal"><div class="ci">' + esc(c.ic) + '</div><div class="cc">' +
        '<div class="cn">' + esc(c.nombre) + ' <span class="est ' + esc(c.estado) + '">' + esc(c.estado) + '</span>' + (c.ejemplo ? ' <span class="chip amb">EJEMPLO</span>' : '') + '</div>' +
        '<div class="cm">' + esc(c.nicho) + ' · ' + esc(c.reds) + ' · ' + (c.ejemplo ? c.videos + ' vídeos (inventado)' : c.videos + ' vídeos publicados · ' + piezas + ' en el calendario') + '</div></div>' +
        '<div class="cact"><button class="btn g sm" onclick="togglePausa(' + ix + ')">' + (c.estado === 'pausado' ? '▶ Activar' : '⏸ Pausar') + '</button>' +
        '<button class="btn g sm" onclick="editCanal(' + ix + ')" aria-label="Editar">✎</button>' +
        '<button class="btn g sm" onclick="borrarCanal(' + ix + ')" aria-label="Borrar">🗑</button></div></div>';
    });
    return html;
  };
  window.kQuitarEjemplos = function () { S.canales = S.canales.filter(function (c) { return !c.ejemplo; }); try { guardar(); } catch (e) {} estudio('cartera'); aviso('Ejemplos quitados'); };
  window.addCanal = function () {
    modal('<h3>Nuevo canal</h3><label class="lb">Nombre</label><input class="inp" id="caNom" placeholder="Ej: Ciencia en 1 minuto">' +
      '<label class="lb" style="margin-top:10px">Tema o nicho</label><input class="inp" id="caNicho" list="kNichos" placeholder="Escribe o elige"><datalist id="kNichos">' + NICHOS.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<label class="lb" style="margin-top:10px">Redes</label><select id="caReds"><option>TikTok + Reels + Shorts</option><option>TikTok</option><option>Instagram Reels</option><option>YouTube Shorts</option><option>YouTube + TikTok</option></select>' +
      '<button class="btn pp" style="width:100%;margin-top:14px" onclick="guardarCanal()">Crear canal</button>');
  };
  window.guardarCanal = function () {
    var n = ($('caNom').value || '').trim(); if (!n) { aviso('Ponle un nombre al canal'); return; }
    var ics = ['🎥', '🔥', '🌟', '🎬', '📡', '🧠', '🎙️'];
    S.canales.unshift({ ic: ics[Math.floor(Math.random() * ics.length)], nombre: n.slice(0, 60), nicho: (($('caNicho').value || '').trim() || 'Sin tema').slice(0, 60), reds: $('caReds').value, estado: 'probando', videos: 0 });
    try { guardar(); } catch (e) {} cerrarModal(); estudio('cartera'); aviso('Canal creado ✓ estado: probando');
  };

  /* --- miniserie --- */
  var EJEMPLOS_SERIE = {
    'Historia y curiosidades': { titulo: 'Misterios de la historia', eps: [['El mapa que no debería existir', '¿Cómo dibujaron esa costa siglos antes de explorarla?'], ['La ciudad que desapareció en una noche', 'Y lo que encontraron debajo lo cambia todo…'], ['El mensaje que tardó siglos en leerse', 'Lo que decía, en el próximo.'], ['El error que salvó a miles', 'Pero quien lo cometió nunca lo supo…'], ['Lo que había dentro de la tumba sellada', 'Fin de la serie — y el giro final.']] },
    'Tecnología e IA': { titulo: 'IA que ya cambia tu día', eps: [['La app que hace tu tarea en 10 segundos', 'Y casi nadie sabe que existe…'], ['Lo que la IA sabe de ti', 'El truco del final te sorprende.'], ['3 negocios pequeños que ya usan IA', 'El tercero casi nadie lo hace…'], ['La herramienta gratis que más uso', 'Mañana, paso a paso.'], ['Lo que viene el año que viene', 'Fin de la serie. Guárdalo.']] },
    'Mi negocio por dentro': { titulo: 'Un día en ' + ((S.negocio && S.negocio.nombre) || 'mi negocio'), eps: [['A las 7 de la mañana, antes de abrir', 'Lo que pasa antes de que llegues…'], ['El error que casi nos cuesta caro', 'Cómo lo arreglamos, mañana.'], ['La receta (o el truco) de la casa', 'Lo que nadie ve, en el próximo.'], ['Conoce al equipo', 'Y quién manda de verdad…'], ['Lo que nos dicen los clientes', 'Fin de la serie: gracias por verla.']] }
  };
  var SERIE = null;
  window.vSerie = function () {
    datos();
    var d = SERIE || (S.estudioK && S.estudioK.ultimaSerie);
    if (d && !SERIE) SERIE = d;
    return '<div class="hd"><h2>🎬 Miniserie con IA</h2></div>' + cabeceraModo() +
      '<div class="card"><label class="lb">Tema o nicho de la serie</label><input class="inp" id="serTema" list="kNichosS" placeholder="Ej: errores típicos en inglés, la historia de mi barrio, recetas de 10 minutos…"><datalist id="kNichosS">' + NICHOS.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<div class="row" style="margin-top:10px;flex-wrap:wrap"><div><label class="lb">Plataforma</label>' + selPlat('serPlat', 'tiktok') + '</div><div><label class="lb">Episodios</label><select id="serN"><option>3</option><option>4</option><option selected>5</option><option>6</option><option>8</option></select></div><div><label class="lb">Idioma</label>' + selIdioma('serIdi') + '</div><div><label class="lb">Canal</label>' + selCanal('serCanal') + '</div></div>' +
      '<button class="btn pp" style="margin-top:12px" onclick="generarSerie()">🎬 Escribir la serie</button></div><div id="serRes">' + (SERIE ? pintarSerie(SERIE) : '') + '</div>';
  };
  function plantillaSerie(tema, n) {
    var k = Object.keys(EJEMPLOS_SERIE).filter(function (x) { return x.toLowerCase() === String(tema).toLowerCase(); })[0] || 'Mi negocio por dentro';
    var e = EJEMPLOS_SERIE[k];
    return { titulo: e.titulo, premisa: '', ejemplo: true, plataforma: 'tiktok', idioma: 'es', hashtags: [],
      episodios: e.eps.slice(0, n).map(function (x) { return { titulo: x[0], gancho: '', guion: '', cliffhanger: x[1], texto_pantalla: '' }; }) };
  }
  window.generarSerie = function () {
    var tema = ($('serTema').value || '').trim(); if (!tema) { aviso('Dime el tema de la serie'); return; }
    var pl = $('serPlat').value, n = parseInt($('serN').value, 10) || 5, lc = $('serIdi').value, canal = $('serCanal').value;
    var res = $('serRes');
    if (!conServidor()) { SERIE = plantillaSerie(tema, n); SERIE.plataforma = pl; SERIE.canal = canal; res.innerHTML = pintarSerie(SERIE); return; }
    res.innerHTML = '<div class="card" style="color:var(--tx3)">✍️ Escribiendo la serie con IA…</div>';
    pedirIA({ accion: 'serie', tema: tema, plataforma: pl, episodios: n, idioma: lc }).then(function (j) {
      SERIE = j; SERIE.canal = canal; S.estudioK.ultimaSerie = SERIE; try { guardar(); } catch (e) {}
      res.innerHTML = pintarSerie(SERIE);
    }, function (e) {
      SERIE = plantillaSerie(tema, n); SERIE.plataforma = pl; SERIE.canal = canal;
      res.innerHTML = '<div class="warn">' + esc(errorIA(e)) + '</div>' + pintarSerie(SERIE);
    });
  };
  function pintarSerie(s) {
    var pl = PLAT[s.plataforma] || PLAT.tiktok, eps = s.episodios || [];
    var html = '<div class="card"><h3>📺 «' + esc(s.titulo) + '»' + (s.ejemplo ? ' <span class="chip amb">PLANTILLA DE EJEMPLO</span>' : ' <span class="chip">escrita con IA</span>') + '</h3>' +
      (s.premisa ? '<div style="font-size:13px;color:var(--tx2);margin:-2px 0 8px">' + esc(s.premisa) + '</div>' : '') +
      (s.aviso ? '<div class="warn">' + esc(s.aviso) + '</div>' : '') +
      '<div style="font-size:12px;color:var(--tx3);margin:0 0 10px">' + esc(pl.nm) + ' · ' + pl.dur + ' por episodio. Marca los que quieras, cambia el título si te apetece y pásalos al calendario.</div>';
    eps.forEach(function (e, i) {
      var fin = i === eps.length - 1;
      html += '<div class="epi"><label style="display:flex;align-items:center;gap:9px;cursor:pointer"><input type="checkbox" class="serChk" data-i="' + i + '" checked style="width:22px;height:22px;flex:none"><span class="en">Episodio ' + (i + 1) + (fin ? ' · final' : '') + '</span></label>' +
        '<input class="serTit" data-i="' + i + '" value="' + esc(e.titulo) + '" aria-label="Título del episodio ' + (i + 1) + '" style="width:100%;margin:8px 0 6px;background:var(--panel2);border:1px solid var(--line);border-radius:9px;color:var(--tx);padding:11px 12px;font-size:15px">' +
        (e.gancho ? '<div style="font-size:13px;color:var(--tx2)">🎤 <b>Gancho:</b> ' + esc(e.gancho) + '</div>' : '') +
        (e.guion ? '<div style="font-size:13px;color:var(--tx2);white-space:pre-line;margin-top:4px">' + esc(e.guion) + '</div>' : '') +
        '<div class="cliff">⏭️ ' + (fin ? 'Remate: ' : 'Gancho al siguiente: ') + esc(e.cliffhanger) + '</div>' +
        '<div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap"><button class="btn g sm" style="flex:none" onclick="kPortadaEp(' + i + ')">🎨 Portada</button><button class="btn g sm" style="flex:none" onclick="kCopiarEp(' + i + ')">📋 Copiar guion</button></div></div>';
    });
    html += '<div class="row" style="margin-top:10px;flex-wrap:wrap"><div><label class="lb">Un episodio</label><select id="serCada"><option value="1">cada día</option><option value="2" selected>cada 2 días</option><option value="3">cada 3 días</option><option value="7">cada semana</option></select></div></div>' +
      '<button class="btn pp" style="width:100%;margin-top:10px;padding:15px;font-size:16px" onclick="programarSerie()">📅 Pasar la serie al calendario</button>' +
      '<div style="font-size:12px;color:var(--tx3);margin-top:6px">Entran como <b>borrador</b> con fecha y hora propuestas: falta el vídeo de cada episodio. Cuando lo subas, pásalo a «Programada» y Chispa lo publica.</div></div>';
    return html;
  }
  function epTexto(i) {
    var e = SERIE.episodios[i], t = [];
    if (e.texto_pantalla) t.push('[En pantalla] ' + e.texto_pantalla);
    if (e.gancho) t.push(e.gancho);
    if (e.guion) t.push(e.guion);
    if (e.cliffhanger) t.push(e.cliffhanger);
    return t.join('\n');
  }
  function titEp(i) { var el = document.querySelector('.serTit[data-i="' + i + '"]'); return ((el && el.value) || SERIE.episodios[i].titulo || '').trim(); }
  window.kPortadaEp = function (i) { if (SERIE) portada(titEp(i), 'Episodio ' + (i + 1), epTexto(i) || titEp(i)); };
  window.kCopiarEp = function (i) { if (SERIE) copiar(titEp(i) + '\n\n' + epTexto(i)); };
  window.programarSerie = function () {
    if (!SERIE) return;
    var sel = [];
    Array.prototype.forEach.call(document.querySelectorAll('.serChk'), function (c) { if (c.checked) sel.push(+c.getAttribute('data-i')); });
    if (!sel.length) { aviso('Marca al menos un capítulo 🙂'); return; }
    var tags = (SERIE.hashtags || []).join(' ');
    var n = alCalendario(sel.map(function (i) {
      var g = epTexto(i);
      return { titulo: titEp(i), kicker: SERIE.titulo + ' · ' + (i + 1) + '/' + SERIE.episodios.length, txt: titEp(i) + (SERIE.episodios[i].cliffhanger ? '\n\n' + SERIE.episodios[i].cliffhanger : ''), tags: tags, guion: g, plataforma: SERIE.plataforma, canal: SERIE.canal || '' };
    }), { cada: parseInt(($('serCada') || {}).value, 10) || 2 });
    if (n) estudio('ecal');
  };

  /* --- guion --- */
  var GUION = null;
  window.vGuion = function () {
    datos();
    if (!GUION && S.estudioK.ultimoGuion) GUION = S.estudioK.ultimoGuion;
    return '<div class="hd"><h2>🎯 Guion con IA</h2></div>' + cabeceraModo() +
      '<div class="card"><label class="lb">¿De qué va el vídeo?</label><textarea id="gTema" placeholder="Ej: 3 trucos para ahorrar tiempo, el origen del café, cómo preparamos nuestra paella…"></textarea>' +
      '<div class="row" style="margin-top:10px;flex-wrap:wrap"><div><label class="lb">Plataforma</label>' + selPlat('gPlat', 'tiktok') + '</div><div><label class="lb">Idioma</label>' + selIdioma('gIdi') + '</div><div><label class="lb">Canal</label>' + selCanal('gCanal') + '</div></div>' +
      '<button class="btn pp" style="margin-top:12px" onclick="generarGuion()">🎯 Escribir el guion</button></div><div id="gRes">' + (GUION ? pintarGuion(GUION) : '') + '</div>';
  };
  function plantillaGuion(tema, pl) {
    var P = PLAT[pl] || PLAT.tiktok;
    return { ejemplo: true, titulo: tema.slice(0, 60), plataforma: pl, gancho: 'Nadie te cuenta esto sobre ' + tema, texto_pantalla: tema.slice(0, 30),
      escenas: [{ dice: 'Paso 1 sobre ' + tema + '…', se_ve: 'Plano corto, texto grande' }, { dice: 'Pero espera, esto es lo importante:', se_ve: 'Corte rápido' }, { dice: 'Paso 2…', se_ve: 'Detalle' }, { dice: 'Y lo mejor viene ahora: paso 3', se_ve: 'Resultado final' }],
      remate: 'Cierra cumpliendo la promesa y enlaza con el principio para que se repita.', cta: pl === 'reels' ? 'Mándaselo a quien lo necesite.' : '¿Tú cuál usas? Te leo en comentarios.', descripcion: '', hashtags: [], duracion: P.dur };
  }
  window.generarGuion = function (variante) {
    var tema = ($('gTema').value || '').trim() || (GUION && GUION.temaPedido) || ''; if (!tema) { aviso('Dime de qué va el vídeo'); return; }
    var pl = $('gPlat').value, lc = $('gIdi').value, canal = $('gCanal').value, res = $('gRes');
    if (!conServidor()) { GUION = plantillaGuion(tema, pl); GUION.canal = canal; GUION.temaPedido = tema; res.innerHTML = pintarGuion(GUION); return; }
    res.innerHTML = '<div class="card" style="color:var(--tx3)">✍️ Escribiendo el guion con IA…</div>';
    pedirIA({ accion: 'guion', tema: tema, plataforma: pl, idioma: lc, variante: variante || 0 }).then(function (j) {
      GUION = j; GUION.canal = canal; GUION.temaPedido = tema; GUION.variante = variante || 1; S.estudioK.ultimoGuion = GUION; try { guardar(); } catch (e) {}
      res.innerHTML = pintarGuion(GUION);
    }, function (e) {
      GUION = plantillaGuion(tema, pl); GUION.canal = canal; GUION.temaPedido = tema;
      res.innerHTML = '<div class="warn">' + esc(errorIA(e)) + '</div>' + pintarGuion(GUION);
    });
  };
  function guionTexto(g) {
    var t = ['[En pantalla] ' + (g.texto_pantalla || ''), '① ' + g.gancho];
    (g.escenas || []).forEach(function (e, k) { t.push((k + 2) + '. ' + e.dice + (e.se_ve ? '  [' + e.se_ve + ']' : '')); });
    if (g.remate) t.push('Remate: ' + g.remate);
    if (g.cta) t.push('CTA: ' + g.cta);
    return t.join('\n');
  }
  function pintarGuion(g) {
    var P = PLAT[g.plataforma] || PLAT.tiktok;
    var html = '<div class="card"><h3>✅ ' + esc(g.titulo) + (g.ejemplo ? ' <span class="chip amb">PLANTILLA DE EJEMPLO</span>' : ' <span class="chip">escrito con IA</span>') + '</h3>' +
      (g.aviso ? '<div class="warn">' + esc(g.aviso) + '</div>' : '') +
      '<div style="font-size:12.5px;color:var(--tx3);margin-bottom:12px">' + esc(P.nm) + ' · ' + esc(g.duracion || P.dur) + ' · pensado para ' + esc(P.cab) + ' · vertical 9:16 · subtítulos siempre</div>' +
      '<div class="gseg gancho"><div class="gl">① Gancho (0-2 s)</div><div class="gt">«' + esc(g.gancho) + '»' + (g.texto_pantalla ? '<br><span style="color:var(--tx3)">En pantalla: ' + esc(g.texto_pantalla) + '</span>' : '') + '</div></div>' +
      '<div class="gseg des"><div class="gl">② Desarrollo (un corte cada 1,5-3 s)</div><div class="gt">' + (g.escenas || []).map(function (e) { return '• ' + esc(e.dice) + (e.se_ve ? ' <span style="color:var(--tx3)">[' + esc(e.se_ve) + ']</span>' : ''); }).join('<br>') + '</div></div>' +
      '<div class="gseg rem"><div class="gl">③ Remate</div><div class="gt">' + esc(g.remate) + '</div></div>' +
      '<div class="gseg cta"><div class="gl">④ Llamada a la acción</div><div class="gt">' + esc(g.cta) + '</div></div>' +
      (g.descripcion || (g.hashtags && g.hashtags.length) ? '<div style="font-size:12.5px;color:var(--tx2);margin-top:4px">📝 ' + esc(g.descripcion || '') + ' ' + esc((g.hashtags || []).join(' ')) + '</div>' : '') +
      '<div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap"><button class="btn pp" style="flex:none" onclick="programarGuion()">📅 Al calendario</button>' +
      '<button class="btn g" style="flex:none" onclick="generarGuion(' + ((g.variante || 1) + 1) + ')">🔄 Otra versión</button>' +
      '<button class="btn g" style="flex:none" onclick="kCopiarGuion()">📋 Copiar</button>' +
      '<button class="btn g" style="flex:none" onclick="kPortadaGuion()">🎨 Portada</button></div></div>';
    return html;
  }
  window.kCopiarGuion = function () { if (GUION) copiar(GUION.titulo + '\n\n' + guionTexto(GUION)); };
  window.kPortadaGuion = function () { if (GUION) portada(GUION.titulo, GUION.texto_pantalla || '', GUION.gancho); };
  window.programarGuion = function () {
    if (!GUION) return;
    var n = alCalendario([{ titulo: GUION.titulo, txt: (GUION.descripcion || GUION.gancho), tags: (GUION.hashtags || []).join(' '), guion: guionTexto(GUION), plataforma: GUION.plataforma, canal: GUION.canal || '' }], { cada: 1 });
    if (n) estudio('ecal');
  };

  /* --- en el calendario --- */
  window.vEcal = function () {
    datos();
    var A = delEstudio().slice().sort(function (a, b) { return (a.cuando || '') < (b.cuando || '') ? -1 : 1; });
    var red = { tt: 'TikTok', igf: 'Instagram', yt: 'YouTube' }, est = { borrador: '✎ Borrador (falta el vídeo)', programada: '⏱ Programada', publicada: '✓ Publicada', fallo: '! Falló' };
    var html = '<div class="hd"><h2>🗓️ En el calendario</h2><button class="btn pp sm" onclick="vista(\'panel\');panel(\'calendario\')">Abrir el calendario ›</button></div>';
    html += '<div class="card" style="background:rgba(96,165,250,.07);border-color:rgba(96,165,250,.28)"><div style="font-size:13px;color:var(--tx2)">Lo que has mandado desde el Estudio está en el <b style="color:var(--tx)">calendario de publicaciones</b>, el mismo que publica solo. Ritmo aconsejado: TikTok 3-5 por semana, Shorts 2-4, repartidos.</div></div>';
    if (!A.length) return html + '<div class="empty">Todavía no has mandado nada. Escribe una miniserie o un guion y pulsa «Al calendario».</div>';
    html += '<div class="card">';
    A.forEach(function (a) {
      var d = a.cuando ? new Date(a.cuando) : null;
      html += '<div class="planrow" style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);flex-wrap:wrap"><div style="min-width:0"><div style="font-weight:700">' + esc(a.titulo) + '</div>' +
        '<div style="font-size:12px;color:var(--tx3)">' + (d ? d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + a.cuando.slice(11, 16) : 'sin fecha') + ' · ' + (a.redes || []).map(function (r) { return red[r] || r; }).join(', ') + (a.canal ? ' · ' + esc(a.canal) : '') + ' · ' + (est[a.estado] || a.estado) + '</div></div>' +
        '<div class="row" style="gap:6px;flex:none"><button class="btn g sm" onclick="vista(\'panel\');panel(\'calendario\');setTimeout(function(){window.agAbrir&&agAbrir(\'' + esc(a.id) + '\')},300)">Abrir</button><button class="btn g sm" onclick="kQuitarCal(\'' + esc(a.id) + '\')" aria-label="Quitar">🗑</button></div></div>';
    });
    return html + '</div>';
  };
  window.kQuitarCal = function (id) {
    var a = (S.agenda || []).filter(function (x) { return x.id === id; })[0];
    if (a && a.estado === 'publicada') { aviso('Ya está publicada: se queda en el calendario'); return; }
    S.agenda = (S.agenda || []).filter(function (x) { return x.id !== id; }); try { guardar(); } catch (e) {} estudio('ecal'); aviso('Quitado del calendario');
  };

  /* --- monetizar (sin promesas) --- */
  window.vIngresos = function () {
    return '<div class="hd"><h2>💶 Cómo se monetiza un canal</h2></div>' +
      '<div class="card"><div style="font-size:13.5px;color:var(--tx2)">Orientación general, <b style="color:var(--tx)">no una promesa</b>: Chispa no garantiza seguidores, visitas ni ingresos. Las condiciones las ponen las plataformas y cambian: revísalas siempre en su página oficial.</div></div>' +
      '<div class="via"><div class="vn">1</div><div><div class="vt">Vender lo tuyo</div><div class="vd">Tu negocio, tus servicios, un producto o un curso. Para la mayoría de negocios y creadores pequeños es lo que más rinde: el contenido trae clientes.</div></div></div>' +
      '<div class="via"><div class="vn">2</div><div><div class="vt">Colaboraciones con marcas y UGC</div><div class="vd">Vídeos para marcas (en tus cuentas o en las suyas). El precio se negocia y depende del nicho y de la audiencia; con UGC no hace falta tener muchos seguidores.</div></div></div>' +
      '<div class="via"><div class="vn">3</div><div><div class="vt">Afiliación</div><div class="vd">Comisión por las ventas que llegan con tu enlace. Hay que avisar siempre de que es publicidad.</div></div></div>' +
      '<div class="via"><div class="vn">4</div><div><div class="vt">Programa de socios de YouTube</div><div class="vd">Requisitos oficiales para cobrar por anuncios: 1.000 suscriptores y 4.000 horas de visualización en 12 meses, o 10 millones de visualizaciones de Shorts en 90 días. <a href="https://support.google.com/youtube/answer/72851?hl=es" target="_blank" rel="noopener">Fuente: YouTube</a></div></div></div>' +
      '<div class="warn">⚠️ <b>TikTok:</b> el pago por visualizaciones (Creator Rewards) no está disponible en todos los países; compruébalo en la app (Herramientas para creadores). Directos, suscripciones y tienda tienen reglas propias.</div>' +
      '<div class="warn">⚠️ <b>Instagram y Facebook:</b> los programas de pago para creadores van por invitación y por país. No cuentes con ellos para empezar.</div>' +
      '<div class="warn">⚠️ <b>Contenido hecho en masa:</b> YouTube no paga por vídeos repetitivos o producidos en serie sin aportar nada. <a href="https://support.google.com/youtube/answer/1311392?hl=es" target="_blank" rel="noopener">Políticas de monetización de YouTube</a>. Por eso Chispa varía cada guion y una persona revisa antes de publicar.</div>';
  };

  /* --- buenas prácticas --- */
  window.vReglas = function () {
    return '<div class="hd"><h2>🛡️ Buenas prácticas</h2></div>' +
      '<div class="card"><ul class="checklist">' +
      '<li><b>Cada vídeo distinto</b> (guion, voz, encuadre). Nada de plantilla calcada: es lo que las plataformas penalizan.</li>' +
      '<li><b>Sin marcas de agua</b> de otras apps al subir a otra red.</li>' +
      '<li><b>No resubir lo mismo</b> tal cual en todas las redes: adapta duración, texto y portada a cada una.</li>' +
      '<li><b>Una persona revisa</b> cada pieza antes de publicarla: la IA escribe, tú decides.</li>' +
      '<li><b>Series con gancho</b> al final de cada episodio para que vuelvan al siguiente.</li>' +
      '<li><b>Los primeros 2-3 segundos</b> deciden: gancho que funcione sin sonido y subtítulos siempre.</li>' +
      '<li><b>Datos comprobados</b>: si el vídeo da cifras, fechas o consejos, compruébalos. Salud, dinero y leyes, con más cuidado aún.</li>' +
      '<li><b>Publicidad, avisada</b>: colaboraciones y afiliados se marcan como publicidad.</li>' +
      '<li><b>Dale 24-72 h</b> a cada vídeo antes de juzgarlo.</li>' +
      '</ul></div>' +
      '<div class="card" style="background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.3)"><div style="font-size:13px;color:var(--tx2)">⚡ <b style="color:var(--tx)">Lo que hace Chispa por ti:</b> escribe series y guiones distintos cada vez, en tu idioma, te hace la portada con tu marca y lo deja en tu calendario. Grabar es cosa tuya (o súbelo y Chispa lo corta en clips).</div></div>';
  };

  // en el móvil el botón flotante de la visita guiada tapaba el último botón de la pantalla: hueco abajo
  try { var st = document.createElement('style'); st.textContent = '@media(max-width:820px){.app{padding-bottom:120px}}'; document.head.appendChild(st); } catch (e) {}
  try { datos(); pintarENav(); if ($('estudioApp') && $('estudioApp').classList.contains('on')) estudio(ETAB); } catch (e) {}
})();
