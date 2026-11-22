/* =====================================================================
   Chispa · LEER LA CARTA del negocio (trabajador L)
   ---------------------------------------------------------------------
   Lo usan la página (ofertas-dia.js, «Tu plan de ofertas») y el servidor
   (conectores/ofertas.js, POST /ofertas/carta). Es un script normal, como
   precios.js, para que valga en los dos sitios:
     página:   <script src="ofertas-carta.js">  → window.ChispaCarta
     servidor: import "../ofertas-carta.js"     → globalThis.ChispaCarta

   Qué sabe leer (de más fiable a menos):
     1. Las cartas hechas con la app de El Paraíso: carta-paraiso.html
        (ID_CARTA → /api/datos?cartaweb=…) y carta.html?c=… (/api/datos?carta=…).
     2. Cualquier web con datos estructurados schema.org (Menu / MenuItem / Offer).
     3. Texto con precios: «Paella mixta ........ 12,50 €».
     4. Una lista pegada a mano: una línea por plato, con o sin precio.

   REGLA: nunca se inventa un precio. Si no viene, el precio queda vacío y
   la pantalla enseña el hueco «… €» para que lo ponga el dueño.
   Sin FileReader.
   ===================================================================== */
(function (raiz) {
  'use strict';

  var MAX = 300;
  var RE_BEBIDA = /bebida|drink|c[oó]ctel|cocktail|mojito|daiquir|pi[nñ]a colada|caipiri|margarita|spritz|gin\b|gin-?tonic|\bron\b|\brum\b|whisk|vodka|tequila|licor|chupito|cerveza|ca[nñ]a\b|beer|vino|wine|tinto|blanco de|rosado|cava|champ[aá]n|sangr[ií]a|vermut|refresco|soda|cola\b|agua\b|water|zumo|jugo|juice|batido|smoothie|limonada|lemonade|granizad|horchata|caf[eé]\b|coffee|cortado|capuchino|cappuccino|latte|espresso|t[eé]\b|infusi|chocolate caliente|morir so[nñ]ando|mamajuana|presidente|mocktail|copa\b/i;
  var RE_SECCION_BEBIDA = /bebida|drink|c[oó]ctel|cocktail|vino|wine|cerveza|beer|cafe|caf[eé]|refresco|licor|copas?\b|bar\b/i;

  function txt(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  /* «2p 46 /   · 3p 64 / 4p 74 €» → «2p 46 · 3p 64 · 4p 74 €»; «25,€» → «25 €»; números sueltos → «12,50 €» */
  function limpiarPrecio(p) {
    if (p == null || p === '') return '';
    if (typeof p === 'number') return isFinite(p) && p > 0 ? p.toFixed(2).replace('.', ',').replace(/,00$/, '') + ' €' : '';
    var s = txt(p).replace(/\s*\/\s*\.?\s*·?\s*/g, ' · ').replace(/(\d)\s*\.\s+(?=\d|·)/g, '$1 ').replace(/·\s*·/g, '·').replace(/,\s*€/g, ' €').replace(/\s*€/g, ' €').replace(/\s+/g, ' ').replace(/^[·\s]+|[·\s]+$/g, '');
    if (!/\d/.test(s)) return '';
    if (/^\d+([.,]\d{1,2})?$/.test(s)) return s.replace('.', ',') + ' €';
    if (!/€/.test(s)) s += ' €';
    return s.slice(0, 60);
  }
  function precioNumero(p) { var m = String(p || '').match(/(\d+(?:[.,]\d{1,2})?)\s*€?\s*$/) || String(p || '').match(/(\d+(?:[.,]\d{1,2})?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; }
  function esBebida(nombre, categoria) {
    if (categoria && RE_SECCION_BEBIDA.test(categoria) && !/men[uú]|tapa|comida|plato/i.test(categoria)) return true;
    if (categoria && !RE_SECCION_BEBIDA.test(categoria)) return false; // en una sección de comida, «Pollo al vino» es un plato
    return RE_BEBIDA.test(nombre || '');
  }
  function item(nombre, precio, categoria, descripcion) {
    nombre = txt(nombre).replace(/^[-•·*–—\d.)\s]+(?=\D)/, '').slice(0, 80);
    if (nombre.length < 2) return null;
    var cat = txt(categoria).slice(0, 40);
    return { nombre: nombre, precio: limpiarPrecio(precio), categoria: cat, descripcion: txt(descripcion).slice(0, 160), tipo: esBebida(nombre, cat) ? 'bebida' : 'plato' };
  }
  function unicos(lista) {
    var vistos = {}, out = [];
    lista.forEach(function (x) { if (!x) return; var k = x.nombre.toLowerCase(); if (vistos[k]) return; vistos[k] = 1; out.push(x); });
    return out.slice(0, MAX);
  }

  /* --- 1 · cartas de la app de El Paraíso --- */
  function desdeCartaweb(j) { // {existe, carta:{secciones:[{titulo, platos:[{nom, precio, desc}]}]}}
    var c = j && (j.carta || j), out = [];
    ((c && c.secciones) || []).forEach(function (s) { (s.platos || []).forEach(function (p) { out.push(item(p.nom || p.nombre, p.precio, s.titulo, p.desc || p.descripcion)); }); });
    return unicos(out);
  }
  function desdeCartaC(j) { // {existe, carta:{platos:[{nombre, precio, categoria, descripcion}]}}
    var c = j && (j.carta || j);
    return unicos(((c && c.platos) || []).map(function (p) { return item(p.nombre || p.nom, p.precio, p.categoria, p.descripcion); }));
  }
  /* --- 2 · schema.org (JSON-LD) --- */
  function desdeJsonLd(html) {
    var out = [], re = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi, m;
    function andar(o, seccion) {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(function (x) { andar(x, seccion); }); return; }
      var t = [].concat(o['@type'] || []).join(' ');
      if (/MenuItem|Product/.test(t) && o.name) {
        var of = [].concat(o.offers || [])[0] || {};
        out.push(item(o.name, of.price != null ? (isNaN(+of.price) ? of.price : +of.price) : '', seccion, o.description));
      }
      var sec = /MenuSection/.test(t) && o.name ? o.name : seccion;
      ['@graph', 'hasMenu', 'hasMenuSection', 'hasMenuItem', 'itemListElement', 'item', 'mainEntity'].forEach(function (k) { if (o[k]) andar(o[k], sec); });
    }
    while ((m = re.exec(html))) { try { andar(JSON.parse(m[1]), ''); } catch (e) {} }
    return unicos(out);
  }
  /* --- 3 · texto con precios --- */
  function textoDeHtml(html) {
    return String(html || '').replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h\d|section|article)>/gi, '\n').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&euro;/g, '€').replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); });
  }
  var RE_LINEA_PRECIO = /^(.{2,80}?)[\s.·…:\-–—_]*(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:€|eur\b|euros?)\s*$/i;
  var RE_PRECIO_DELANTE = /^(?:€\s*)(\d{1,3}(?:[.,]\d{1,2})?)\s+(.{2,80})$/i;
  function desdeTexto(texto) {
    var out = [], cat = '';
    String(texto || '').split(/\n+/).map(txt).filter(Boolean).forEach(function (l) {
      var m = l.match(RE_LINEA_PRECIO), n = l.match(RE_PRECIO_DELANTE);
      if (m && !/^\d/.test(m[1])) out.push(item(m[1], m[2], cat));
      else if (n) out.push(item(n[2], n[1], cat));
      else if (l.length < 40 && !/\d/.test(l) && /^[A-ZÁÉÍÓÚÑ ·&]+$/.test(l)) cat = l; // títulos de sección en mayúsculas
    });
    return unicos(out);
  }
  /* --- 4 · lista pegada --- */
  function desdeLista(texto) {
    var out = [], cat = '';
    String(texto || '').split(/\n+/).map(txt).filter(Boolean).forEach(function (l) {
      if (/^#|:$/.test(l)) { cat = l.replace(/^#+\s*|:$/g, ''); return; }
      var m = l.match(/^(.*?)[\s.·…:\-–—_|;]*((?:\d+\s*p\s*)?\d{1,3}(?:[.,]\d{1,2})?(?:\s*[·/]\s*(?:\d+\s*p\s*)?\d{1,3}(?:[.,]\d{1,2})?)*)\s*(?:€|eur|euros)?\s*$/i);
      if (m && m[1] && !/^\d+$/.test(m[1].trim())) out.push(item(m[1], m[2], cat));
      else out.push(item(l, '', cat));
    });
    return unicos(out);
  }
  function deHtml(html) {
    var a = desdeJsonLd(html);
    if (a.length) return { items: a, fuente: 'datos estructurados (schema.org)' };
    var b = desdeTexto(textoDeHtml(html));
    return { items: b, fuente: 'texto de la página' };
  }

  /* Lee una dirección. pedir(url) → Promise<{ok, status, texto}> (en el servidor, con límite de tamaño) */
  function leerUrl(url, pedir) {
    var u;
    try { u = new URL(url); } catch (e) { return Promise.reject(new Error('Ese enlace no es válido')); }
    if (!/^https?:$/.test(u.protocol)) return Promise.reject(new Error('El enlace tiene que empezar por https://'));
    function json(t) { try { return JSON.parse(t); } catch (e) { return null; } }
    return pedir(u.toString()).then(function (r) {
      if (!r.ok) throw new Error('La carta respondió ' + r.status);
      var t = r.texto || '', j = json(t);
      if (j) {
        var x = j.carta && j.carta.secciones ? desdeCartaweb(j) : desdeCartaC(j);
        return { items: x, fuente: 'datos de la carta (JSON)' };
      }
      var id = (t.match(/ID_CARTA\s*=\s*["']([a-f0-9]{16,128})["']/) || [])[1];
      if (id && /cartaweb/.test(t)) {
        return pedir(u.origin + '/api/datos?cartaweb=' + id).then(function (r2) {
          var j2 = json(r2.texto);
          if (j2 && j2.existe && j2.carta && j2.carta.secciones) return { items: desdeCartaweb(j2), fuente: 'carta digital (la que se edita en el móvil)' };
          return deHtml(t);
        });
      }
      var c = u.searchParams.get('c');
      if (c && /\/api\/datos\?carta=/.test(t)) {
        return pedir(u.origin + '/api/datos?carta=' + encodeURIComponent(c)).then(function (r2) {
          var j2 = json(r2.texto);
          if (j2 && j2.existe) return { items: desdeCartaC(j2), fuente: 'carta digital con QR' };
          return { items: [], fuente: '', aviso: 'Esa carta todavía no está publicada.' };
        });
      }
      if (!c && /\/api\/datos\?carta=/.test(t) && /Editor de la carta/i.test(t)) {
        return { items: [], fuente: '', aviso: 'Ese enlace es el EDITOR de la carta, no la carta publicada. Pega el enlace que ven tus clientes (el del QR).' };
      }
      return deHtml(t);
    });
  }

  raiz.ChispaCarta = {
    version: '2026-10-07',
    leerUrl: leerUrl, desdeLista: desdeLista, desdeTexto: desdeTexto, desdeJsonLd: desdeJsonLd, desdeCartaweb: desdeCartaweb, desdeCartaC: desdeCartaC,
    textoDeHtml: textoDeHtml, limpiarPrecio: limpiarPrecio, precioNumero: precioNumero, esBebida: esBebida, MAX: MAX
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = raiz.ChispaCarta;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
