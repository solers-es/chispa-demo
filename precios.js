/* =====================================================================
   Chispa · PRECIOS Y LÍMITES — la ÚNICA tabla (trabajador H)
   ---------------------------------------------------------------------
   Todo lo que enseña un precio (portada, chat, Chispa habla, alta, panel)
   y el servidor (límites por plan) lee de aquí. Para cambiar un precio o
   un límite: SOLO este fichero. EL PRECIO FINAL LO DECIDE STALIN.

   Precios en euros al mes, IVA APARTE (21 % en España).
   Prueba gratis: DIAS_PRUEBA días, sin tarjeta.

   Uso en la página:   ChispaPrecios.planes · ChispaPrecios.plan('pro')
                       ChispaPrecios.texto('pro') → «79 €/mes + IVA»
   Uso en el servidor: import "../precios.js" → globalThis.ChispaPrecios
   (es un script normal, sin import/export, para que valga en los dos sitios)
   ===================================================================== */
(function (raiz) {
  'use strict';
  var P = {
    version: '2026-10-07',
    moneda: 'EUR',
    iva: 21,                 // se suma aparte en la factura
    ivaIncluido: false,
    DIAS_PRUEBA: 14,
    planes: [
      {
        id: 'basico', nombre: 'Básico', precio: 39, etiqueta: 'Para empezar',
        en: { nombre: 'Basic', etiqueta: 'To get started' },
        incluye: ['Publicaciones escritas por IA', 'Programación automática', 'Calendario de contenido', '2 redes conectadas', '30 publicaciones al mes', '5 imágenes IA al día'],
        incluyeEn: ['AI-written posts', 'Automatic scheduling', 'Content calendar', '2 connected networks', '30 posts a month', '5 AI images a day'],
        limites: { publicacionesMes: 30, redes: 2, imagenesDia: 5, usuarios: 1 }
      },
      {
        id: 'pro', nombre: 'Pro', precio: 79, etiqueta: 'Lo más completo', destacado: true,
        en: { nombre: 'Pro', etiqueta: 'Most complete' },
        incluye: ['Todo lo de Básico +', 'Todas las redes (Instagram, Facebook, TikTok, YouTube, Google)', '90 publicaciones al mes', '20 imágenes IA al día', 'Anuncios preparados', 'Respuestas a comentarios y reseñas', 'Hasta 3 usuarios'],
        incluyeEn: ['Everything in Basic +', 'All networks (Instagram, Facebook, TikTok, YouTube, Google)', '90 posts a month', '20 AI images a day', 'Ready-made ads', 'Replies to comments and reviews', 'Up to 3 users'],
        limites: { publicacionesMes: 90, redes: 4, imagenesDia: 20, usuarios: 3 }
      },
      {
        id: 'agencia', nombre: 'Agencia', precio: 149, etiqueta: 'Volumen y equipos',
        en: { nombre: 'Agency', etiqueta: 'Volume and teams' },
        incluye: ['Todo lo de Pro +', '300 publicaciones al mes', '60 imágenes IA al día', 'Hasta 10 usuarios', 'Soporte prioritario'],
        incluyeEn: ['Everything in Pro +', '300 posts a month', '60 AI images a day', 'Up to 10 users', 'Priority support'],
        limites: { publicacionesMes: 300, redes: 4, imagenesDia: 60, usuarios: 10 }
      }
    ]
  };
  P.plan = function (id) {
    id = String(id || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (id === 'equipo') id = 'agencia'; // nombre antiguo
    for (var i = 0; i < P.planes.length; i++) if (P.planes[i].id === id || P.planes[i].nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === id) return P.planes[i];
    return null;
  };
  P.texto = function (id, idioma) {
    var p = P.plan(id); if (!p) return '';
    return idioma === 'en' ? '€' + p.precio + '/month + VAT' : p.precio + ' €/mes + IVA';
  };
  P.desde = function () { return Math.min.apply(null, P.planes.map(function (p) { return p.precio; })); };
  P.conIva = function (id) { var p = P.plan(id); return p ? Math.round(p.precio * (100 + P.iva)) / 100 : 0; };
  raiz.ChispaPrecios = P;
  if (typeof module !== 'undefined' && module.exports) module.exports = P;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));

/* ---------- En la página: pinta los precios donde los haya ---------- */
(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  var P = window.ChispaPrecios;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tarjetas() {
    return P.planes.map(function (p) {
      return '<div class="plan' + (p.destacado ? ' best' : '') + '" data-plan="' + p.id + '">' +
        '<h3>' + esc(p.nombre) + '</h3><div class="price">' + p.precio + ' €<small>/mes + IVA</small></div>' +
        '<span class="chip' + (p.destacado ? '' : ' amb') + '">' + esc(p.etiqueta) + '</span>' +
        '<ul>' + p.incluye.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<button class="btn ' + (p.destacado ? 'pp' : 'g') + '" onclick="elegir(\'' + p.id + '\')">Probar ' + P.DIAS_PRUEBA + ' días gratis</button>' +
        '</div>';
    }).join('');
  }
  function pintar() {
    var c = document.querySelectorAll('.planes');
    for (var i = 0; i < c.length; i++) c[i].innerHTML = tarjetas();
    var l = document.querySelectorAll('[data-precios-lead]');
    for (var j = 0; j < l.length; j++) l[j].textContent = 'Prueba ' + P.DIAS_PRUEBA + ' días gratis, sin tarjeta. Sin permanencia: te das de baja cuando quieras. Precios sin IVA.';
  }
  window.ChispaPrecios.pintar = pintar;
  // el chat de la portada
  if (window.GUION) {
    var b = P.plan('basico'), pr = P.plan('pro'), a = P.plan('agencia');
    window.GUION['¿Cuánto cuesta?'] = 'Desde ' + b.precio + ' €/mes + IVA el plan Básico. El que más eligen es el Pro, ' + pr.precio + ' €/mes + IVA, con todas las redes e imágenes IA. Agencia, ' + a.precio + ' €/mes + IVA, para volumen y equipos. Pruebas ' + P.DIAS_PRUEBA + ' días gratis, sin tarjeta y sin permanencia. 💜';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar); else pintar();
})();
