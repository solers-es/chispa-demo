/* ============================================================================
   Chispa · VISITA GUIADA en pantalla  (trabajador «tour»)
   ----------------------------------------------------------------------------
   Un recorrido paso a paso que RESALTA cada elemento real de la app con un
   foco/spotlight y una burbuja, con Siguiente / Atrás / Saltar y contador.

   · Se lanza con el botón «▶ Ver cómo funciona» (hero del index + fab flotante).
   · El usuario ELIGE el escenario (8 sectores). Empieza por Restaurante y puede
     cambiar en cualquier momento.
   · Cada escenario PONE la app en ese sector cargando su NEGOCIO DE EJEMPLO
     (los que marca sectores.js/chispa-cuentas.js como ejemplo; el restaurante
     es El Paraíso). Para cambiar de negocio la app recarga la página, así que
     el tour guarda su sitio y SE REANUDA solo tras la recarga.
   · Navega la app de verdad: cambia de sección con window.panel/vista y apunta
     a elementos reales por selector. Si un elemento no está, salta ese paso con
     elegancia; nunca rompe la app (todo va envuelto en try/catch).

   No toca ningún otro fichero. Todo cuelga de window.ChispaTour.
   ============================================================================ */
(function () {
  'use strict';

  var RESUME = 'chispa_tour_resume';   // sessionStorage: sector a reanudar tras recargar

  /* ---- los 8 escenarios: sector + cuenta de ejemplo + etiqueta del selector ---- */
  var ESCENARIOS = [
    { id: 'restaurante', cuenta: 'paraiso',       e: '🍽️', label: 'Restaurante', sub: 'El Paraíso' },
    { id: 'peluqueria',  cuenta: 'ej-peluqueria', e: '✂️', label: 'Peluquería',  sub: 'Barbería' },
    { id: 'estetica',    cuenta: 'ej-estetica',   e: '💅', label: 'Estética',     sub: 'Uñas y pestañas' },
    { id: 'gimnasio',    cuenta: 'ej-gimnasio',   e: '🏋️', label: 'Gimnasio',     sub: 'Entrenador' },
    { id: 'tienda',      cuenta: 'ej-tienda',     e: '🛍️', label: 'Tienda',       sub: 'Ropa y regalos' },
    { id: 'cafeteria',   cuenta: 'ej-cafeteria',  e: '☕', label: 'Cafetería',    sub: 'Panadería' },
    { id: 'talleres',    cuenta: 'ej-talleres',   e: '🔧', label: 'Talleres',     sub: 'Servicios' },
    { id: 'creador',     cuenta: 'ej-creador',    e: '🎬', label: 'Creador',      sub: 'Contenido' }
  ];
  function esc(id) { for (var i = 0; i < ESCENARIOS.length; i++) if (ESCENARIOS[i].id === id) return ESCENARIOS[i]; return ESCENARIOS[0]; }

  /* ----------------------------- utilidades ----------------------------- */
  function perfil(id) { try { return (window.ChispaSector && window.ChispaSector.get(id)) || null; } catch (e) { return null; } }
  function negNombre(id) {
    try { if (window.S && window.S.negocio && window.S.negocio.nombre) return window.S.negocio.nombre; } catch (e) {}
    var P = perfil(id); if (P && P.ejemplo && P.ejemplo.nombre) return P.ejemplo.nombre;
    return id === 'restaurante' ? 'El Paraíso' : 'tu negocio';
  }
  function cta(id) { var P = perfil(id); return (P && P.cta && P.cta.texto) || 'Reservar'; }
  function corto(id) { var P = perfil(id); return (P && P.corto) || 'negocio'; }
  function mobile() { return window.innerWidth <= 560; }
  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    var cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    return true;
  }
  function pick(selectors) {        // primer elemento visible de una lista de selectores
    for (var i = 0; i < selectors.length; i++) {
      var list; try { list = document.querySelectorAll(selectors[i]); } catch (e) { continue; }
      for (var k = 0; k < list.length; k++) if (visible(list[k])) return list[k];
    }
    return null;
  }

  /* --------- cambiar a la sección real de la app, con cuidado --------- */
  function irPanel() { try { if (typeof window.vista === 'function') window.vista('panel'); } catch (e) {} }
  function abrirTab(tab) {
    irPanel();
    try { if (typeof window.panel === 'function') window.panel(tab); } catch (e) {}
  }

  /* ============================ PASOS ============================ */
  function pasos(id) {
    var neg = negNombre(id), C = cta(id), c = corto(id);
    return [
      { tab: 'ajustes', sel: ['#main .card', '#main .hd h2', '#nav button[onclick*="ajustes"]'],
        badge: '① Mi negocio',
        titulo: 'Da de alta tu negocio',
        texto: 'Aquí das de alta <b>' + neg + '</b>: nombre, logo, ciudad, horario y los enlaces (web, reservas…). Chispa usa estos datos en <b>todas</b> tus publicaciones y en el botón de «' + C + '».' },

      { tab: 'conectar', sel: ['#main .card', '#main .hd h2', '#nav button[onclick*="conectar"]'],
        altTab: 'ajustes', altSel: ['#main .card', '#main .hd h2'],
        badge: '② Conexiones',
        titulo: 'Conecta tus redes',
        texto: 'Conecta Instagram, Facebook, TikTok y tu ficha de Google en unos minutos. Así Chispa <b>publica y responde sola</b> en las redes de ' + neg + '.' },

      { tab: 'asistente', sel: ['#main button[onclick*="generar()"]', '#idea', '#main .hd h2'],
        badge: '③ Crear con IA',
        titulo: 'Crea una publicación con IA',
        texto: 'Dile una idea en una frase —o deja que Chispa proponga— y te escribe el post con el tono de ' + neg + ', te crea la imagen y lo deja listo para publicar.' },

      { tab: 'calendario', sel: ['.ag-bpromo', 'button[onclick*="planificarSemana"]', '#main .hd h2'],
        badge: '④ Calendario',
        titulo: 'Programa tu semana',
        texto: 'Chispa reparte tus publicaciones a las <b>mejores horas</b>. Con «🔥 Promo para llenar» montas una franja (varias historias + post) para llenar una tarde floja de ' + c + '.' },

      { tab: 'asistente', sel: ['#resultado .post', '#resultado .ideac', '#segA'],
        badge: '⑤ Vista cliente',
        titulo: 'Así lo ve tu cliente',
        texto: 'Esta es la publicación tal y como la verá tu cliente en el feed: foto, texto y el botón de «' + C + '». Lo que no suena bien, se cambia antes de publicar.' },

      { tab: 'resenas', sel: ['#main .rs', '.rs-top', '#main .hd h2', '#nav button[onclick*="resenas"]'],
        badge: '⑥ Reseñas',
        titulo: 'Reseñas',
        texto: 'Chispa te propone respuesta a cada reseña de Google de ' + neg + '. Las <b>negativas nunca</b> las contesta sola: esas las revisas tú.' },

      { tab: 'bandeja', sel: ['#main .msg', '#main .hd h2', '#nav button[onclick*="bandeja"]'],
        badge: '⑦ Mensajes',
        titulo: 'Comentarios y mensajes',
        texto: 'Cuando alguien comenta o te escribe un DM, Chispa prepara la respuesta con el tono de ' + neg + ' y tú la <b>apruebas con un clic</b>.' },

      { tab: 'stats', sel: ['#main .kpis', '#main .kpi', '#main .hd h2'],
        badge: '⑧ Estadísticas',
        titulo: 'Estadísticas',
        texto: 'Ves tu alcance, seguidores e interacciones claros, y Chispa <b>aprende qué funciona</b> para publicar más de eso en ' + neg + '.' },

      { tab: 'crecer', sel: ['.cr-intro', '#main .hd h2', '#nav button[onclick*="crecer"]'],
        badge: '⑨ Crecer',
        titulo: 'Crecer',
        texto: 'Una guía a medida de ' + c + ': qué publicar, a qué ritmo y a qué horas para ganar seguidores y clientes. Adaptada a tu sector e idioma.' },

      { tab: 'clientes', sel: ['#nav button[onclick*="clientes"]', '.seg', '#segA'],
        badge: '⑩ Solers / cliente',
        titulo: 'Modo Solers y modo cliente',
        texto: 'Como <b>Solers</b> gestionas todos los negocios desde «Mis clientes» y entras en cualquiera. Cada <b>cliente</b> entra con su propio enlace y solo ve lo suyo. El mismo Chispa, dos modos.' }
    ];
  }

  /* ============================ ESTADO ============================ */
  var ST = { on: false, id: null, pasos: [], i: 0, el: null, root: null };

  /* ----------- montaje de la capa (overlay + burbuja) una sola vez ----------- */
  function root() {
    if (ST.root) return ST.root;
    var r = document.createElement('div');
    r.className = 'ct-root'; r.setAttribute('hidden', '');
    r.innerHTML =
      '<div class="ct-catch" id="ctCatch"></div>' +
      '<div class="ct-hole" id="ctHole"></div>' +
      '<div class="ct-bub" id="ctBub" role="dialog" aria-modal="true" aria-label="Visita guiada de Chispa">' +
        '<span class="ct-arrow" id="ctArrow"></span>' +
        '<div class="ct-top"><span class="ct-badge" id="ctBadge"></span><span class="ct-neg" id="ctNeg"></span>' +
          '<button class="ct-x" id="ctClose" aria-label="Cerrar la visita">×</button></div>' +
        '<h4 id="ctTit"></h4><p id="ctTxt"></p>' +
        '<div class="ct-dots" id="ctDots"></div>' +
        '<div class="ct-foot"><span class="ct-count" id="ctCount"></span><span class="ct-spacer"></span>' +
          '<button class="ct-btn g" id="ctBack">‹ Atrás</button>' +
          '<button class="ct-btn pp" id="ctNext">Siguiente ›</button></div>' +
        '<div class="ct-sub"><button class="ct-link" id="ctSkip">Saltar la visita</button>' +
          '<span class="ct-spacer"></span><button class="ct-link" id="ctChange">⇄ Cambiar negocio</button></div>' +
      '</div>';
    document.body.appendChild(r);
    ST.root = r;
    r.querySelector('#ctClose').onclick = cerrar;
    r.querySelector('#ctSkip').onclick = cerrar;
    r.querySelector('#ctNext').onclick = function () { mover(1); };
    r.querySelector('#ctBack').onclick = function () { mover(-1); };
    r.querySelector('#ctChange').onclick = function () { cerrar(true); chooser(); };
    r.querySelector('#ctCatch').onclick = function (e) { e.stopPropagation(); }; // bloquea la app detrás
    return r;
  }

  /* ----------------------------- reanudar paso ----------------------------- */
  function mostrar(i, dir) {
    dir = dir || 1;
    var P = ST.pasos;
    // saltar con elegancia los pasos cuyo elemento no exista
    var guard = 0;
    while (i >= 0 && i < P.length && guard++ < P.length + 2) {
      var paso = P[i];
      abrirTab(paso.tab);
      var el = pick(paso.sel);
      if (!el && paso.altTab) { abrirTab(paso.altTab); el = pick(paso.altSel || paso.sel); }
      if (el) { ST.i = i; pintar(paso, el); return; }
      i += dir;                       // no hay elemento: al siguiente en la misma dirección
    }
    // no quedan pasos en esa dirección
    if (dir > 0) finDeVisita(); else { ST.i = 0; mostrar(0, 1); }
  }

  function pintar(paso, el) {
    var r = root(); r.removeAttribute('hidden');
    ST.el = el;
    var $ = function (id) { return r.querySelector(id); };
    $('#ctBadge').textContent = paso.badge;
    $('#ctNeg').textContent = negNombre(ST.id);
    $('#ctTit').textContent = paso.titulo;
    $('#ctTxt').innerHTML = paso.texto;
    $('#ctCount').textContent = 'Paso ' + (ST.i + 1) + ' de ' + ST.pasos.length;
    $('#ctBack').disabled = ST.i === 0;
    var last = ST.i === ST.pasos.length - 1;
    $('#ctNext').textContent = last ? '✓ Terminar' : 'Siguiente ›';
    // puntos de progreso
    var dots = ''; for (var k = 0; k < ST.pasos.length; k++) dots += '<i class="' + (k < ST.i ? 'done' : k === ST.i ? 'on' : '') + '"></i>';
    $('#ctDots').innerHTML = dots;
    // traer a la vista y colocar
    traerAlFrente(el);
    requestAnimationFrame(function () { requestAnimationFrame(function () { colocar(el); }); });
  }

  function traerAlFrente(el) {
    try { el.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {}
    try {
      var rc = el.getBoundingClientRect(), vh = window.innerHeight;
      var objetivo = mobile() ? vh * 0.3 : vh * 0.42;
      var dy = (rc.top + rc.height / 2) - objetivo;
      if (Math.abs(dy) > 8) window.scrollBy(0, dy);
    } catch (e) {}
  }

  function colocar(el) {
    if (!ST.on || !el || !ST.root) return;
    var r = ST.root, hole = r.querySelector('#ctHole'), bub = r.querySelector('#ctBub'), arrow = r.querySelector('#ctArrow');
    var rc = el.getBoundingClientRect();
    var pad = 6, vw = window.innerWidth, vh = window.innerHeight;
    var hx = Math.max(4, rc.left - pad), hy = Math.max(4, rc.top - pad);
    var hw = Math.min(vw - hx - 4, rc.width + pad * 2), hh = Math.min(vh - hy - 4, rc.height + pad * 2);
    hole.style.left = hx + 'px'; hole.style.top = hy + 'px';
    hole.style.width = hw + 'px'; hole.style.height = hh + 'px';

    var bw = bub.offsetWidth || 340, bh = bub.offsetHeight || 220;
    arrow.style.display = 'none';

    if (mobile()) {
      // en móvil: hoja inferior a lo ancho, salvo que el foco esté abajo → arriba
      bub.style.width = ''; // usa el max-width css
      var bwM = bub.offsetWidth || (vw - 24);
      var left = (vw - bwM) / 2;
      bub.style.left = left + 'px'; bub.style.right = '';
      var focoAbajo = rc.top > vh * 0.5;
      if (focoAbajo) bub.style.top = Math.max(10, rc.top - bh - 14) + 'px';
      else bub.style.top = Math.min(vh - bh - 10, rc.bottom + 14) + 'px';
      return;
    }

    // escritorio: debajo si cabe, si no encima, si no al lado
    var left2, top2, espacioAbajo = vh - rc.bottom, espacioArriba = rc.top;
    left2 = rc.left + rc.width / 2 - bw / 2;
    left2 = Math.max(12, Math.min(left2, vw - bw - 12));
    if (espacioAbajo >= bh + 20) {
      top2 = rc.bottom + 14;
      colocaFlecha(arrow, 'top', rc, left2, bw);
    } else if (espacioArriba >= bh + 20) {
      top2 = rc.top - bh - 14;
      colocaFlecha(arrow, 'bottom', rc, left2, bw);
    } else {
      // al lado derecho o izquierdo
      top2 = Math.max(12, Math.min(rc.top, vh - bh - 12));
      if (vw - rc.right >= bw + 20) left2 = rc.right + 14;
      else if (rc.left >= bw + 20) left2 = rc.left - bw - 14;
      else { left2 = Math.max(12, Math.min(rc.left + rc.width / 2 - bw / 2, vw - bw - 12)); top2 = Math.min(vh - bh - 12, rc.bottom + 14); }
    }
    bub.style.left = left2 + 'px'; bub.style.top = top2 + 'px'; bub.style.right = '';
  }

  function colocaFlecha(arrow, lado, rc, bubLeft, bw) {
    try {
      var cx = rc.left + rc.width / 2;
      var ax = Math.max(bubLeft + 14, Math.min(cx, bubLeft + bw - 30)) - bubLeft - 8;
      arrow.style.display = 'block';
      arrow.style.left = ax + 'px';
      if (lado === 'top') { arrow.style.top = '-8px'; arrow.style.transform = 'rotate(45deg)'; }
      else { arrow.style.top = ''; arrow.style.bottom = '-8px'; arrow.style.transform = 'rotate(225deg)'; }
    } catch (e) { arrow.style.display = 'none'; }
  }

  function mover(dir) { mostrar(ST.i + dir, dir); }

  function reposicionar() { if (ST.on && ST.el) colocar(ST.el); }

  /* ----------------------------- fin / cierre ----------------------------- */
  function finDeVisita() {
    var r = root(); r.removeAttribute('hidden');
    var el = pick(['.seg', '.ct-fab', '#segA']) || document.body;
    ST.el = el;
    var $ = function (id) { return r.querySelector(id); };
    $('#ctHole').style.width = '0px'; $('#ctHole').style.height = '0px';
    $('#ctHole').style.left = (window.innerWidth / 2) + 'px'; $('#ctHole').style.top = (window.innerHeight / 2) + 'px';
    $('#ctArrow').style.display = 'none';
    $('#ctBadge').textContent = '🎉 Fin';
    $('#ctNeg').textContent = negNombre(ST.id);
    $('#ctTit').textContent = 'Eso es Chispa';
    $('#ctTxt').innerHTML = 'Has visto cómo Chispa lleva el marketing de <b>' + negNombre(ST.id) + '</b> de principio a fin. Prueba a tocar la app, o repite la visita con otro tipo de negocio.';
    $('#ctCount').textContent = '';
    $('#ctDots').innerHTML = '';
    $('#ctBack').disabled = false;
    $('#ctNext').textContent = '✓ Explorar la app';
    $('#ctNext').onclick = function () { cerrar(); };
    var bub = r.querySelector('#ctBub');
    bub.style.left = ''; bub.style.right = ''; bub.style.top = '';
    bub.style.left = Math.max(12, (window.innerWidth - (bub.offsetWidth || 340)) / 2) + 'px';
    bub.style.top = Math.max(12, (window.innerHeight - (bub.offsetHeight || 220)) / 2) + 'px';
  }

  function cerrar(silencioso) {
    ST.on = false; ST.el = null;
    try { sessionStorage.removeItem(RESUME); } catch (e) {}
    if (ST.root) {
      ST.root.setAttribute('hidden', '');
      // restaurar el handler de Siguiente (el fin lo cambia)
      var n = ST.root.querySelector('#ctNext'); if (n) n.onclick = function () { mover(1); };
    }
  }

  /* =================== arranque de un escenario =================== */
  function arrancar(id) {
    var E = esc(id);
    var CC = window.ChispaCuentas;
    // ¿hace falta cambiar de negocio? (eso recarga la página → guardamos y reanudamos)
    var actual = null;
    try { actual = CC && CC.idActual ? CC.idActual() : null; } catch (e) {}
    if (CC && typeof CC.entrar === 'function' && E.cuenta && actual && actual !== E.cuenta) {
      try { sessionStorage.setItem(RESUME, id); } catch (e) {}
      try {
        var pr = CC.entrar(E.cuenta);
        // si no recarga (no lo encontró / sin espacio), seguimos aquí mismo
        if (pr && pr.then) pr.then(function (ok) { if (ok === false) { try { sessionStorage.removeItem(RESUME); } catch (e) {} correr(id); } });
        return;
      } catch (e) { try { sessionStorage.removeItem(RESUME); } catch (e2) {} }
    }
    correr(id);
  }

  function correr(id) {
    ST.on = true; ST.id = id; ST.pasos = pasos(id); ST.i = 0;
    irPanel();
    // pequeño respiro para que la primera sección pinte
    setTimeout(function () { mostrar(0, 1); }, 80);
  }

  /* =================== selector de escenario =================== */
  function chooser() {
    if (document.getElementById('ctChooserRoot')) return;
    var wrap = document.createElement('div');
    wrap.className = 'ct-root'; wrap.id = 'ctChooserRoot';
    var cards = ESCENARIOS.map(function (s, i) {
      return '<button class="ct-card' + (i === 0 ? ' rec' : '') + '" data-id="' + s.id + '">' +
        '<span class="e">' + s.e + '</span><span class="n">' + s.label + '</span><span class="s">' + s.sub + '</span></button>';
    }).join('');
    wrap.innerHTML =
      '<div class="ct-catch"></div>' +
      '<div class="ct-chooser" role="dialog" aria-modal="true" aria-label="Elige el tipo de negocio">' +
        '<button class="ct-x" aria-label="Cerrar">×</button>' +
        '<div class="ct-ch-h"><div class="ct-robot">🤖</div><h3>¿Cómo funciona Chispa?</h3>' +
          '<p class="ct-lead">Elige un tipo de negocio y te enseño, paso a paso, cómo Chispa le lleva el marketing. Empieza por el restaurante o toca el tuyo.</p></div>' +
        '<div class="ct-grid">' + cards + '</div>' +
        '<div class="ct-note">Cargaré un negocio de EJEMPLO de ese sector. Los datos de El Paraíso no se tocan.</div>' +
      '</div>';
    document.body.appendChild(wrap);
    function quita() { try { wrap.parentNode.removeChild(wrap); } catch (e) {} }
    wrap.querySelector('.ct-x').onclick = quita;
    wrap.querySelector('.ct-catch').onclick = quita;
    Array.prototype.forEach.call(wrap.querySelectorAll('.ct-card'), function (b) {
      b.onclick = function () { var id = b.getAttribute('data-id'); quita(); arrancar(id); };
    });
  }

  /* =================== botón flotante «Ver cómo funciona» =================== */
  function fab() {
    if (document.getElementById('ctFab')) return;
    var b = document.createElement('button');
    b.className = 'ct-fab'; b.id = 'ctFab';
    b.innerHTML = '<span class="ct-play">▶</span> Ver cómo funciona';
    b.setAttribute('aria-label', 'Ver cómo funciona Chispa: visita guiada');
    b.onclick = abrir;
    document.body.appendChild(b);
  }

  function abrir() { chooser(); }

  /* =================== API pública =================== */
  window.ChispaTour = {
    version: '2026-10-07',
    abrir: abrir,                 // lo llama el botón del hero y el fab
    escenario: function (id) { arrancar(id); },
    cerrar: cerrar,
    disponibles: function () { return ESCENARIOS.map(function (s) { return s.id; }); }
  };

  /* =================== puesta en marcha =================== */
  function init() {
    try { fab(); } catch (e) {}
    window.addEventListener('resize', reposicionar, { passive: true });
    window.addEventListener('scroll', reposicionar, { passive: true });
    // ¿veníamos de cambiar de negocio? reanudar la visita
    var r = null; try { r = sessionStorage.getItem(RESUME); } catch (e) {}
    if (r && esc(r)) { try { sessionStorage.removeItem(RESUME); } catch (e) {} setTimeout(function () { correr(r); }, 350); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 40); });
  else setTimeout(init, 40);
})();
