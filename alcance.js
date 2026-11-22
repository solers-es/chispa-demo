/* ──────────────────────────────────────────────────────────────────────────
   Chispa · 🚀 LLEGAR A GENTE NUEVA GRATIS (07/10/2026)

   Encargo de Stalin: explicar y hacer ACCIONABLES las formas GRATUITAS de
   llegar a gente que todavía no te sigue, sin prometer lo que no hace.

   Lo que hay (cada cosa con su botón):
     🧪 Reels de prueba (Trial reels de Instagram: solo a NO seguidores)
     🤝 Colaboraciones (Collab de Instagram): buscador de candidatos,
        mensaje de propuesta y publicación con la invitación de colaborador
     🎁 Canje con creadores locales: mensaje, lista legal y seguimiento
     📍 Ubicación, etiquetas locales y publicaciones de la ficha de Google
     💬 Contenido de clientes (desde la bandeja), Estado y Canal de WhatsApp
     🔁 Promoción cruzada entre negocios del mismo dueño

   Honestidad (no se cambia sin una fuente):
     · La etiqueta «Publicidad» / «Patrocinado» SOLO sale pagando a Meta
       (Anuncios). Nada de esto la lleva ni la imita.
     · API de Instagram (developers.facebook.com, IG User /media):
       `trial_params` (graduation_strategy MANUAL o SS_PERFORMANCE) para
       reels de prueba y `collaborators` (hasta 3 usuarios; NO en historias).
       El servidor de Chispa los manda (conectores/redes.js). Sin servidor
       (la web pública es demostración desde el 08/10/2026) se hace en la
       app de Instagram con los pasos que se enseñan.
     · WhatsApp no deja publicar Estados ni mensajes de Canal por API: se
       prepara y se avisa para subirlo con un toque.
     · Instagram no deja compartir por API las historias en que te mencionan.

   Se adapta al SECTOR y al IDIOMA (ChispaSector): socios propuestos,
   invitación del canje, etiquetas y los mensajes (es, en, de, fr; en otro
   idioma salen en español con el aviso). Modo creador: colaboraciones con
   otros creadores y canjes con marcas (y la marca de publicidad es tuya).

   Estado propio en S.alcance (viaja con S). Sin FileReader. Sin claves.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (!window.S || !window.TABS || !window.ChispaSector) return;

  /* ---------------- utilidades ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return (s == null ? '' : '' + s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(m) { try { toast(m); } catch (e) {} }
  function guardarS() { try { guardar(); } catch (e) {} }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function uid() { return 'al' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function perfil() { return window.ChispaSector.actual(); }
  function N() { return S.negocio || {}; }
  function lang() { var b = (perfil().idioma || {}).base || 'es'; return MSG[b] ? b : 'es'; }
  function traducido() { var b = (perfil().idioma || {}).base || 'es'; return b !== 'es' && !MSG[b]; }
  function esCreador() { return perfil().id === 'creador'; }
  function neg() { return (N().nombre || 'tu negocio').trim(); }
  function ciudad() { return (N().ciudad || '').trim() || 'tu ciudad'; }
  function esParaiso() { return /para[ií]so/i.test(N().nombre || ''); }
  function sinT(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function usuario(s) { s = String(s || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, ''); return /^[\w.]{1,30}$/.test(s) ? s : ''; }
  function copiar(t) {
    try { navigator.clipboard.writeText(t).then(function () { aviso('Copiado ✓ pégalo donde quieras'); }, function () { prompt('Copia el texto', t); }); }
    catch (e) { prompt('Copia el texto', t); }
  }
  function abrir(u) { var w = null; try { w = window.open(u, '_blank'); if (w) w.opener = null; } catch (e) {} if (!w) aviso('Tu navegador ha bloqueado la ventana: ' + u); }

  /* ---------------- estado propio ---------------- */
  function D() {
    if (!S.alcance || S.alcance.v !== 1) S.alcance = { v: 1, candidatos: [], canjes: [], hechos: {}, sub: 'prueba' };
    var a = S.alcance; a.candidatos = a.candidatos || []; a.canjes = a.canjes || []; a.hechos = a.hechos || {};
    if (esParaiso() && !a._sazon) { // el ejemplo de promoción cruzada de El Paraíso
      a._sazon = 1;
      if (!a.candidatos.some(function (c) { return /saz[oó]n/i.test(c.nombre); }))
        a.candidatos.push({ id: uid(), usuario: '', nombre: 'El Sazón de Quisqueya', tipo: 'propio', estado: 'idea', nota: 'Del mismo dueño: promoción cruzada (pon su @ de Instagram)' });
    }
    return a;
  }

  /* ---------------- textos por idioma (los que se COPIAN o se PUBLICAN) ---------------- */
  var MSG = {
    es: {
      collab: '¡Hola {nom}! Somos {neg}, en {ciu}. Nos encanta lo que hacéis y se nos ha ocurrido una colaboración: un reel en «Collab» de Instagram, que sale en los dos perfiles y lo ven los seguidores de los dos. {idea} ¿Os apetece? Si os va bien, os proponemos día y hora. ¡Gracias!',
      ideaNeg: 'Venís, probáis lo que más nos piden y lo grabamos juntos.',
      ideaCre: 'Grabamos un vídeo juntos sobre algo que nos guste a los dos y lo publicamos a la vez.',
      canje: '¡Hola {nom}! Somos {neg} ({ciu}). Nos gustaría invitarte a {inv} a cambio de un reel o unas historias contándolo con sinceridad. Como hay contraprestación, la publicación tiene que ir marcada como publicidad (por ejemplo «Publi» al principio o la etiqueta «Colaboración pagada» de Instagram). ¿Te encaja? Dinos qué día te viene bien.',
      canjeCre: '¡Hola {nom}! Soy {neg}, creador de contenido en {ciu}. Uso vuestros productos y me gustaría hacer un vídeo con ellos a cambio de {inv}. Irá marcado como publicidad («Publi» o «Colaboración pagada»), como manda la ley. ¿Os interesa? Os paso mis datos de alcance.',
      permiso: '¡Hola {nom}! Muchas gracias por tu mensaje 💛 ¿Nos dejas compartirlo en nuestras redes con tu nombre? Si prefieres que no, no pasa nada.',
      cruzada: '¿Ya conoces {otro}? Es de la familia de {neg} 💛 Si te gusta lo nuestro, te va a encantar. Síguelos{cta} y diles que vas de nuestra parte.',
      cruzadaMsg: 'Hola, soy de {neg}. ¿Hacemos esta semana promoción cruzada? Vosotros nos mencionáis en una historia y nosotros a vosotros, y un reel en Collab entre los dos. Así nos conocen los clientes de los dos.',
      canal: 'Únete a nuestro canal de WhatsApp: ofertas y novedades de {neg} antes que nadie. Sin spam y te sales cuando quieras 👉 {enl}',
      estado: '{neg} · hoy 👉 {frase}. Responde a este estado y te lo guardamos.',
      google: 'Novedad en {neg} ({ciu}): {frase}. ¡Te esperamos!',
      prueba: '{gancho}\n\n{frase} · {ciu}',
      resena: '«{tx}» — {nom} 💛\nGracias por venir a {neg}.',
      collabPost: '{tema} con {cuenta} 🤝\n\n{frase} · {ciu}'
    },
    en: {
      collab: 'Hi {nom}! We are {neg}, in {ciu}. We love what you do and had an idea: an Instagram «Collab» reel, which shows on both profiles and reaches both sets of followers. {idea} Fancy it? If so, we will suggest a day and time. Thanks!',
      ideaNeg: 'You come over, try what people order most, and we film it together.',
      ideaCre: 'We film a video together about something we both like and post it at the same time.',
      canje: 'Hi {nom}! We are {neg} ({ciu}). We would love to invite you to {inv} in exchange for an honest reel or a few stories about it. As there is something in return, the post must be labelled as advertising (e.g. «Ad» at the start or Instagram\'s «Paid partnership» label). Does that work for you? Tell us which day suits you.',
      canjeCre: 'Hi {nom}! I am {neg}, a content creator in {ciu}. I use your products and would like to make a video with them in exchange for {inv}. It will be labelled as advertising («Ad» or «Paid partnership»), as the law requires. Interested? I can send you my reach figures.',
      permiso: 'Hi {nom}! Thank you so much for your message 💛 May we share it on our social media with your name? If you would rather not, no problem at all.',
      cruzada: 'Do you know {otro} yet? It is part of the {neg} family 💛 If you like us, you will love them. Follow them{cta} and tell them we sent you.',
      cruzadaMsg: 'Hi, this is {neg}. Shall we cross-promote this week? You mention us in a story and we mention you, plus a Collab reel together. That way customers of both get to know us.',
      canal: 'Join our WhatsApp channel: {neg} offers and news before anyone else. No spam, leave whenever you like 👉 {enl}',
      estado: '{neg} · today 👉 {frase}. Reply to this status and we will save you one.',
      google: 'New at {neg} ({ciu}): {frase}. See you soon!',
      prueba: '{gancho}\n\n{frase} · {ciu}',
      resena: '«{tx}» — {nom} 💛\nThanks for visiting {neg}.',
      collabPost: '{tema} with {cuenta} 🤝\n\n{frase} · {ciu}'
    },
    de: {
      collab: 'Hallo {nom}! Wir sind {neg} in {ciu}. Wir mögen, was ihr macht, und hätten eine Idee: ein Instagram-«Collab»-Reel, das auf beiden Profilen erscheint und die Follower von beiden erreicht. {idea} Habt ihr Lust? Dann schlagen wir Tag und Uhrzeit vor. Danke!',
      ideaNeg: 'Ihr kommt vorbei, probiert unsere Bestseller und wir filmen es zusammen.',
      ideaCre: 'Wir drehen gemeinsam ein Video zu einem Thema, das uns beiden gefällt, und posten es gleichzeitig.',
      canje: 'Hallo {nom}! Wir sind {neg} ({ciu}). Wir laden dich gern zu {inv} ein, im Gegenzug für ein ehrliches Reel oder ein paar Storys. Da es eine Gegenleistung gibt, muss der Beitrag als Werbung gekennzeichnet sein (z. B. «Werbung» am Anfang oder Instagrams Label «Bezahlte Partnerschaft»). Passt dir das? Sag uns, welcher Tag dir passt.',
      canjeCre: 'Hallo {nom}! Ich bin {neg}, Content Creator in {ciu}. Ich nutze eure Produkte und würde gern ein Video damit machen, im Gegenzug für {inv}. Es wird als Werbung gekennzeichnet («Werbung» oder «Bezahlte Partnerschaft»), wie es das Gesetz verlangt. Interesse? Ich schicke euch meine Reichweite.',
      permiso: 'Hallo {nom}! Vielen Dank für deine Nachricht 💛 Dürfen wir sie mit deinem Namen in unseren sozialen Netzwerken teilen? Wenn nicht, ist das völlig in Ordnung.',
      cruzada: 'Kennst du schon {otro}? Gehört zur Familie von {neg} 💛 Wenn dir unser Laden gefällt, wirst du ihn lieben. Folge ihnen{cta} und sag, dass wir dich schicken.',
      cruzadaMsg: 'Hallo, hier ist {neg}. Wollen wir diese Woche gegenseitig werben? Ihr erwähnt uns in einer Story, wir euch, und dazu ein gemeinsames Collab-Reel. So lernen uns die Kunden von beiden kennen.',
      canal: 'Tritt unserem WhatsApp-Kanal bei: Angebote und News von {neg} vor allen anderen. Kein Spam, jederzeit abmeldbar 👉 {enl}',
      estado: '{neg} · heute 👉 {frase}. Antworte auf diesen Status und wir reservieren dir eins.',
      google: 'Neu bei {neg} ({ciu}): {frase}. Wir freuen uns auf dich!',
      prueba: '{gancho}\n\n{frase} · {ciu}',
      resena: '«{tx}» — {nom} 💛\nDanke für deinen Besuch bei {neg}.',
      collabPost: '{tema} mit {cuenta} 🤝\n\n{frase} · {ciu}'
    },
    fr: {
      collab: 'Bonjour {nom} ! Nous sommes {neg}, à {ciu}. On adore ce que vous faites et on a une idée : un reel en «Collab» sur Instagram, publié sur les deux profils et vu par les abonnés des deux. {idea} Ça vous tente ? Si oui, on vous propose un jour et une heure. Merci !',
      ideaNeg: 'Vous venez, vous goûtez ce qu\'on nous demande le plus et on filme ensemble.',
      ideaCre: 'On tourne une vidéo ensemble sur un sujet qui nous plaît à tous les deux et on la publie en même temps.',
      canje: 'Bonjour {nom} ! Nous sommes {neg} ({ciu}). Nous aimerions t\'inviter à {inv} en échange d\'un reel ou de quelques stories honnêtes. Comme il y a une contrepartie, la publication doit être signalée comme publicité (par ex. «Pub» au début ou le label «Partenariat rémunéré» d\'Instagram). Ça te va ? Dis-nous quel jour te convient.',
      canjeCre: 'Bonjour {nom} ! Je suis {neg}, créateur de contenu à {ciu}. J\'utilise vos produits et j\'aimerais faire une vidéo avec eux en échange de {inv}. Elle sera signalée comme publicité («Pub» ou «Partenariat rémunéré»), comme l\'exige la loi. Intéressés ? Je vous envoie mes statistiques.',
      permiso: 'Bonjour {nom} ! Merci beaucoup pour ton message 💛 Pouvons-nous le partager sur nos réseaux avec ton nom ? Si tu préfères que non, aucun souci.',
      cruzada: 'Tu connais déjà {otro} ? C\'est la famille de {neg} 💛 Si tu nous aimes, tu vas adorer. Suis-les{cta} et dis-leur que tu viens de notre part.',
      cruzadaMsg: 'Bonjour, ici {neg}. On fait une promo croisée cette semaine ? Vous nous mentionnez dans une story et nous aussi, plus un reel en Collab ensemble. Comme ça, les clients des deux nous découvrent.',
      canal: 'Rejoins notre chaîne WhatsApp : les offres et nouveautés de {neg} avant tout le monde. Pas de spam, tu pars quand tu veux 👉 {enl}',
      estado: '{neg} · aujourd\'hui 👉 {frase}. Réponds à ce statut et on te le garde.',
      google: 'Nouveau chez {neg} ({ciu}) : {frase}. À bientôt !',
      prueba: '{gancho}\n\n{frase} · {ciu}',
      resena: '«{tx}» — {nom} 💛\nMerci d\'être venu chez {neg}.',
      collabPost: '{tema} avec {cuenta} 🤝\n\n{frase} · {ciu}'
    }
  };
  function m(clave, datos) {
    var t = (MSG[lang()] || MSG.es)[clave] || MSG.es[clave] || '';
    datos = datos || {};
    return t.replace(/\{(\w+)\}/g, function (_, k) { return datos[k] != null ? datos[k] : k === 'neg' ? neg() : k === 'ciu' ? ciudad() : k === 'frase' ? frase() : ''; });
  }
  function frase() { var P = perfil(), b = lang(); return (b !== 'es' && P.cta[b]) || P.cta.frase || P.cta.texto || ''; }

  /* ---------------- por sector ---------------- */
  // con quién colaborar (por sector) y qué se invita en un canje
  var SOCIOS = {
    restaurante: { quien: ['Creadores de comida de {ciu} (foodies)', 'Tu proveedor (bodega, ron, café, pescado)', 'Músicos o DJ que toquen en tu local', 'Hoteles y apartamentos cercanos', 'Tiendas y negocios del barrio'], buscar: ['foodie', 'comer en', 'restaurantes'], inv: { es: 'comer para dos', en: 'a meal for two', de: 'einem Essen für zwei', fr: 'un repas pour deux' } },
    cafeteria: { quien: ['Creadores de desayunos y brunch de {ciu}', 'Panaderías u obradores que te sirven', 'Librerías, coworkings y oficinas cercanas', 'Estudios de yoga o pilates del barrio'], buscar: ['brunch', 'cafeterías', 'desayunos'], inv: { es: 'un desayuno para dos', en: 'breakfast for two', de: 'einem Frühstück für zwei', fr: 'un petit-déjeuner pour deux' } },
    peluqueria: { quien: ['Creadoras de belleza y moda de {ciu}', 'Fotógrafos de retrato o de bodas', 'Maquilladoras y centros de estética', 'Tiendas de ropa del barrio'], buscar: ['peinados', 'belleza', 'moda'], inv: { es: 'un corte y peinado', en: 'a cut and style', de: 'einem Haarschnitt mit Styling', fr: 'une coupe et un brushing' } },
    estetica: { quien: ['Creadoras de belleza y cuidado de la piel de {ciu}', 'Peluquerías y maquilladoras', 'Gimnasios y estudios de yoga', 'Organizadores de bodas'], buscar: ['skincare', 'belleza', 'bodas'], inv: { es: 'un tratamiento', en: 'a treatment', de: 'einer Behandlung', fr: 'un soin' } },
    gimnasio: { quien: ['Creadores de deporte y salud de {ciu}', 'Nutricionistas y fisioterapeutas', 'Tiendas de deporte', 'Cafeterías saludables cercanas'], buscar: ['fitness', 'entrenador', 'deporte'], inv: { es: 'un mes de gimnasio', en: 'a month of gym membership', de: 'einem Monat Training', fr: 'un mois de salle' } },
    tienda: { quien: ['Creadores de moda y estilo de {ciu}', 'Fotógrafos y modelos locales', 'Cafeterías y negocios de tu calle', 'Diseñadores o artesanos locales'], buscar: ['moda', 'outfit', 'tiendas'], inv: { es: 'elegir una prenda', en: 'pick an item of clothing', de: 'einem Kleidungsstück deiner Wahl', fr: 'choisir un vêtement' } },
    talleres: { quien: ['Creadores de motor de {ciu}', 'Autoescuelas', 'Tiendas de recambios y de neumáticos', 'Lavaderos y aparcamientos cercanos'], buscar: ['motor', 'coches', 'motos'], inv: { es: 'una revisión', en: 'a vehicle check-up', de: 'einer Inspektion', fr: 'une révision' } },
    creador: { quien: ['Creadores de tu tema con un tamaño parecido al tuyo', 'Marcas que ya usas de verdad', 'Negocios locales de {ciu} que encajen con tu tema', 'Podcasts y canales que entrevisten'], buscar: ['creador', 'youtuber', 'podcast'], inv: { es: 'el producto', en: 'the product', de: 'dem Produkt', fr: 'le produit' } }
  };
  function socios() { return SOCIOS[perfil().id] || SOCIOS.restaurante; }
  function invitacion() { var i = socios().inv; return i[lang()] || i.es; }
  function slugTag(s) { return sinT(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map(function (w, i) { return i ? w.charAt(0).toUpperCase() + w.slice(1) : w; }).join(''); }
  function tagsLocales() {
    var c = ciudad(), P = perfil(), out = [];
    function mete(t) { if (t && out.map(sinT).indexOf(sinT(t)) < 0) out.push(t); }
    if (c !== 'tu ciudad') { var cs = slugTag(c); mete('#' + cs.charAt(0).toUpperCase() + cs.slice(1)); var c1 = slugTag(c.split(/[\s,]+/)[0]); mete('#' + slugTag(P.corto || P.nombre) + c1.charAt(0).toUpperCase() + c1.slice(1)); }
    (P.hashtags || []).forEach(mete);
    return out.slice(0, 5); // Instagram limita a 5 hashtags por publicación (diciembre 2025)
  }
  function ideasReel() {
    var P = perfil(), base = (P.ideas || []).slice(0, 6);
    var g = { es: ['Lo que nadie te cuenta de {neg}', 'Si estás en {ciu} y no has probado esto…', '3 cosas que no sabías de {neg}'], en: ['What nobody tells you about {neg}', 'If you are in {ciu} and have not tried this…'], de: ['Was dir niemand über {neg} erzählt', 'Wenn du in {ciu} bist und das noch nicht probiert hast…'], fr: ['Ce que personne ne te dit sur {neg}', 'Si tu es à {ciu} et que tu n\'as pas goûté ça…'] };
    return (g[lang()] || g.es).map(function (x) { return x.replace('{neg}', neg()).replace('{ciu}', ciudad()); }).concat(lang() === 'es' ? base : []);
  }

  /* ---------------- al calendario (borrador) y a Publicar ---------------- */
  function isoEn(dias, hh) { var d = new Date(); d.setDate(d.getDate() + dias); var p = (hh || '20:30').split(':'); d.setHours(+p[0] || 20, +p[1] || 0, 0, 0); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function foto(texto, formato, n) {
    var E = window.CHISPA_ESTUDIO, v = formato === 'reel' || formato === 'historia';
    try { if (perfil().cambia) return { tipo: 'foto', url: ChispaSector.fotoPara(texto, n || 0, 1080, v ? 1920 : 1080), cred: '' }; } catch (e) {}
    try { if (E && E.fotoPara) { var f = E.fotoPara(E.catDe ? E.catDe(texto) : 'plato', n || 0, 1080, v ? 1920 : 1080); return { tipo: 'foto', url: f.url, cred: f.cred || '' }; } } catch (e) {}
    return null;
  }
  // crea una publicación en el calendario REAL como borrador (S.agenda, la misma de chispa-agenda.js)
  function alCalendario(o) {
    var A = window.CHISPA_AGENDA, E = window.CHISPA_ESTUDIO; try { if (A && A.datos) A.datos(); } catch (e) {}
    if (!S.agenda) S.agenda = [];
    var it = { id: uid(), titulo: String(o.titulo || '').slice(0, 80), txt: o.txt || '', tags: o.tags || '', kicker: o.kicker || '', formato: o.formato || 'post',
      cat: E && E.catDe ? E.catDe(o.titulo + ' ' + o.txt) : 'plato', L: 0, foto: 0, ctas: null, sinTexto: false, redes: o.redes || ['igf'], cuando: o.cuando || isoEn(1, '20:30'),
      estado: 'borrador', por: o.por || '', media: o.media || foto(o.titulo + ' ' + o.txt, o.formato, Math.floor(Math.random() * 5)), mediaLocal: false, ejemplo: false, res: {}, motivo: '', modo: 'hora', hasta: '',
      piezas: null, reparto: 'auto', cada: 0, promo: false, origen: 'alcance' };
    if (o.prueba) it.prueba = o.prueba;                       // reel de prueba: 'MANUAL' o 'SS_PERFORMANCE' (trial_params de la API)
    if (o.colaboradores && o.colaboradores.length) it.colaboradores = o.colaboradores.slice(0, 3); // collaborators de la API (máx. 3)
    S.agenda.push(it); guardarS();
    return it;
  }
  function hecho(it, pasos, extra) {
    var E = window.CHISPA_ESTUDIO;
    window._alUltimo = it;
    modal('<h3>✅ En tu calendario</h3><p class="al-p">' + esc(it.titulo) + ' · <b>' + esc(fechaBonita(it.cuando)) + '</b>, como <b>borrador</b>. Revisa texto e imagen y pásalo a «Programada».</p>' +
      (pasos ? '<div class="al-pasos"><b>Al publicarlo:</b><ol>' + pasos.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol></div>' : '') + (extra || '') +
      '<div class="al-acc"><button class="btn pp" onclick="cerrarModal();vista(\'panel\');panel(\'calendario\')">📅 Ver en el calendario</button>' +
      (E && E.publicar && E.nuevoPost ? '<button class="btn g" onclick="alPublicar()">✏️ Abrir en Publicar</button>' : '') +
      '<button class="btn g" onclick="cerrarModal()">Seguir</button></div>');
  }
  function fechaBonita(iso) { var d = new Date(iso); if (isNaN(d)) return iso; var D = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']; return D[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + ' a las ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  window.alPublicar = function () {
    var it = window._alUltimo, E = window.CHISPA_ESTUDIO; if (!it || !E || !E.nuevoPost) return;
    cerrarModal();
    var p = E.nuevoPost({ titulo: it.titulo, txt: it.txt, tags: it.tags, formato: it.formato === 'reel' ? 'reel' : it.formato === 'historia' ? 'historia' : 'post', idea: it.titulo });
    if (it.media) p.media = it.media;
    E.publicar(p, it.redes);
  };
  function conServidor() { try { var e = window.ChispaSync.estado(); return e.modo === 'servidor' && !e.pausado; } catch (e) { return false; } }

  /* =====================================================================
     VISTA
     ===================================================================== */
  var SUBS = [
    ['prueba', '🧪 Reels de prueba'], ['collab', '🤝 Colaboraciones'], ['canje', '🎁 Canje con creadores'],
    ['local', '📍 Ubicación y Google'], ['clientes', '💬 Clientes y WhatsApp'], ['cruzada', '🔁 Entre tus negocios']
  ];
  function vAlcance() {
    var a = D(), P = perfil(), sub = a.sub || 'prueba';
    var h = '<div class="hd"><h2>🚀 Llegar a gente nueva gratis</h2><span class="chip">' + esc(P.icono + ' ' + P.corto) + '</span></div>';
    h += '<div class="al-intro"><b>Formas gratis de que te vea gente que todavía no te sigue.</b> Cada una con su botón: Chispa prepara el texto, ' +
      'la imagen y la deja en tu <a href="javascript:void 0" onclick="vista(\'panel\');panel(\'calendario\')">calendario</a> como borrador. ' +
      '<span class="al-honesto">Ojo: esto es alcance <b>sin pagar</b>. No lleva la etiqueta «Publicidad» ni «Patrocinado»: esa etiqueta solo existe pagando a Meta. Y nadie puede garantizarte cifras: lo que sí hacemos es que no se te olvide ninguna.</span></div>';
    if (traducido()) h += '<div class="al-aviso">🌍 Tu negocio publica en <b>' + esc(P.idioma.nombre) + '</b>: los mensajes para copiar salen en español; tradúcelos (o pídeselo a Chispa en el Estudio) antes de mandarlos.</div>';
    h += '<div class="al-sub" role="group" aria-label="Formas de llegar a gente nueva">' + SUBS.map(function (s) {
      return '<button class="' + (sub === s[0] ? 'on' : '') + '" aria-pressed="' + (sub === s[0]) + '" onclick="alVer(\'' + s[0] + '\')">' + s[1] + '</button>';
    }).join('') + '</div>';
    h += ({ prueba: vPrueba, collab: vCollab, canje: vCanje, local: vLocal, clientes: vClientes, cruzada: vCruzada }[sub] || vPrueba)();
    h += '<div class="al-pie">💶 <b>Si quieres anuncios de verdad:</b> desde 1-2 €/día en Meta → <a href="javascript:void 0" onclick="panel(\'anuncios\')">Anuncios</a> (se crean en pausa; tú decides cuándo se encienden).</div>';
    return h;
  }
  function tarjeta(titulo, cuerpo, fuente) { return '<div class="card al-card"><h3>' + titulo + '</h3>' + cuerpo + (fuente ? '<div class="al-fuente">Fuente: ' + fuente + '</div>' : '') + '</div>'; }
  function enl(u, t) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + '</a>'; }
  function cajaTexto(id, txt) { return '<textarea class="inp al-txt" id="' + id + '" rows="5">' + esc(txt) + '</textarea>'; }

  /* ---------- 🧪 reels de prueba ---------- */
  function vPrueba() {
    var ideas = ideasReel();
    var c = '<p class="al-p">Instagram enseña un <b>reel de prueba</b> solo a gente que <b>no te sigue</b>. Tus seguidores no lo ven en su inicio. ' +
      'A los pocos días miras cómo ha ido y decides si lo compartes con tus seguidores, o dejas que Instagram lo haga solo si funciona. Sirve para probar ganchos nuevos sin «gastar» a tus seguidores.</p>' +
      '<label class="lb" for="alGancho">Gancho del reel (la primera frase)</label><input class="inp" id="alGancho" value="' + esc(ideas[0] || '') + '">' +
      '<div class="al-chips">' + ideas.slice(0, 6).map(function (x, i) { return '<button class="al-chip" onclick="alGancho(' + i + ')">' + esc(x) + '</button>'; }).join('') + '</div>' +
      '<div class="al-fila"><div><label class="lb" for="alGrad">Si funciona</label><select id="alGrad" class="inp"><option value="MANUAL">Yo decido si se enseña a mis seguidores</option><option value="SS_PERFORMANCE">Que Instagram lo enseñe solo si va bien</option></select></div>' +
      '<div><label class="lb" for="alDiaP">Cuándo</label><select id="alDiaP" class="inp"><option value="1">Mañana 20:30</option><option value="2">Pasado mañana 20:30</option><option value="0">Hoy 21:00</option></select></div></div>' +
      '<div class="al-acc"><button class="btn pp" onclick="alPrueba()">🧪 Preparar reel de prueba</button></div>' +
      '<div class="al-nota">' + (conServidor() ? '✅ Con tu cuenta conectada, Chispa lo publica <b>marcado como prueba</b> (la API de Instagram lo permite con <code>trial_params</code>).' :
        'ℹ️ La API de Instagram <b>sí</b> permite marcarlo como prueba (<code>trial_params</code>) y el servidor de Chispa ya lo manda. Ahora mismo estás en <b>modo demostración</b>: lo publicas tú desde la app de Instagram con los pasos que te doy.') +
      ' Si en tu Instagram no sale la opción «Reel de prueba», es que Instagram aún no la ha activado en tu cuenta (tiene que ser profesional y pública).</div>';
    return tarjeta('🧪 Reels de prueba (solo para gente que no te sigue)', c, enl('https://creators.instagram.com/blog/instagram-trial-reels', 'Instagram Creators · Trial reels') + ' · ' + enl('https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media', 'API de Instagram (trial_params)'));
  }
  window.alGancho = function (i) { var x = ideasReel()[i]; if (x && $('alGancho')) $('alGancho').value = x; };
  window.alPrueba = function () {
    var g = ($('alGancho') && $('alGancho').value || '').trim() || ideasReel()[0], grad = $('alGrad') ? $('alGrad').value : 'MANUAL', dia = +($('alDiaP') ? $('alDiaP').value : 1);
    var it = alCalendario({ titulo: '🧪 Reel de prueba: ' + g, txt: m('prueba', { gancho: g }), tags: tagsLocales().join(' '), formato: 'reel', redes: ['igf'], cuando: isoEn(dia, dia === 0 ? '21:00' : '20:30'), prueba: grad,
      por: 'Reel de prueba: solo lo ve gente que no te sigue. ' + (grad === 'MANUAL' ? 'Tú decides después si se enseña a tus seguidores.' : 'Instagram lo enseña a tus seguidores si va bien.') });
    D().hechos.prueba = (D().hechos.prueba || 0) + 1; guardarS();
    hecho(it, ['Graba el vídeo en vertical: el gancho en los <b>3 primeros segundos</b> y con subtítulos.', 'En Instagram: <b>+ → Reel</b>, elige el vídeo y pega el texto.',
      'Antes de «Compartir», activa <b>«Reel de prueba»</b> (en inglés «Trial»).', grad === 'MANUAL' ? 'A los 3 días mira las visualizaciones y, si te gusta, pulsa «Compartir con seguidores».' : 'Elige que se comparta automáticamente si funciona bien.'],
      conServidor() ? '' : '<div class="al-nota">En modo demostración Chispa no publica: te avisa a la hora con el texto listo.</div>');
  };

  /* ---------- 🤝 colaboraciones ---------- */
  function vCollab() {
    var a = D(), S_ = socios(), c = ciudad();
    var h = '<p class="al-p">Con una <b>Collab</b> la publicación sale <b>en los dos perfiles</b> y la ven <b>los seguidores de los dos</b>, con los números compartidos. Vale para publicaciones, carruseles y reels (no historias).</p>';
    h += '<div class="al-sec">🔎 Buscar con quién colaborar</div><p class="al-p">' + (esCreador() ? 'Mejor creadores de tu tema y de tamaño parecido al tuyo, y marcas que ya usas.' : 'Funcionan mejor los que tienen público <b>en ' + esc(c) + '</b>, aunque sean pequeños.') + '</p>';
    h += '<div class="al-chips">' + S_.quien.map(function (q) { return '<span class="al-chip off">' + esc(q.replace('{ciu}', c)) + '</span>'; }).join('') + '</div>';
    h += '<div class="al-fila"><div><label class="lb" for="alBusca">Qué buscas</label><input class="inp" id="alBusca" value="' + esc(S_.buscar[0] + ' ' + (c === 'tu ciudad' ? '' : c)) + '"></div></div>' +
      '<div class="al-acc"><button class="btn g sm" onclick="alBuscar(\'ig\')">📸 En Instagram (etiqueta)</button><button class="btn g sm" onclick="alBuscar(\'google\')">🔎 Cuentas en Google</button>' +
      '<button class="btn g sm" onclick="alBuscar(\'tt\')">🎵 En TikTok</button>' + (esCreador() ? '' : '<button class="btn g sm" onclick="alBuscar(\'mapa\')">📍 Negocios vecinos</button>') + '</div>' +
      '<div class="al-nota">Chispa no puede sacarte una lista de cuentas de Instagram: Instagram no lo permite a ninguna aplicación. Te abre las búsquedas buenas y tú apuntas aquí las que te gusten.</div>';
    h += '<div class="al-sec">📋 Tus candidatos</div>' +
      '<div class="al-fila"><div><label class="lb" for="alCu">@ de Instagram</label><input class="inp" id="alCu" placeholder="@cuenta"></div><div><label class="lb" for="alCn">Nombre</label><input class="inp" id="alCn" placeholder="Quién es"></div>' +
      '<div><label class="lb" for="alCt">Tipo</label><select class="inp" id="alCt"><option value="creador">Creador</option><option value="negocio">Negocio vecino</option><option value="propio">Negocio mío</option><option value="marca">Marca / proveedor</option></select></div></div>' +
      '<div class="al-acc"><button class="btn g sm" onclick="alAnadir()">➕ Añadir candidato</button></div>';
    h += a.candidatos.length ? '<div class="al-lista">' + a.candidatos.map(function (x, i) {
      return '<div class="al-it"><div class="al-itt"><b>' + esc(x.nombre || '@' + x.usuario) + '</b> ' + (x.usuario ? '<span class="al-u">@' + esc(x.usuario) + '</span>' : '<span class="al-u falta">falta su @</span>') +
        ' <span class="al-est ' + esc(x.estado) + '">' + esc(ESTADOS_C[x.estado] || x.estado) + '</span>' + (x.nota ? '<div class="al-u">' + esc(x.nota) + '</div>' : '') + '</div>' +
        '<div class="al-acc"><button class="btn g sm" onclick="alPropuesta(' + i + ')">✉️ Mensaje de propuesta</button><button class="btn pp sm" onclick="alCollabPost(' + i + ')">🤝 Preparar publicación Collab</button>' +
        '<button class="btn g sm" onclick="alEstadoC(' + i + ')">Estado ›</button><button class="btn g sm" onclick="alQuitarC(' + i + ')" aria-label="Quitar">✕</button></div></div>';
    }).join('') + '</div>' : '<div class="al-nota">Aún no tienes candidatos: busca arriba y apúntalos aquí.</div>';
    return tarjeta('🤝 Colaboraciones (Collab de Instagram)', h, enl('https://help.instagram.com/iphone-app/5861247717337470', 'Ayuda de Instagram · Collab') + ' · ' + enl('https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media', 'API (collaborators, hasta 3)'));
  }
  var ESTADOS_C = { idea: 'por escribir', escrito: 'mensaje enviado', acepto: 'ha aceptado', publicado: 'publicado' };
  var ORDEN_C = ['idea', 'escrito', 'acepto', 'publicado'];
  window.alBuscar = function (donde) {
    var q = ($('alBusca') && $('alBusca').value || '').trim(); if (!q) { aviso('Escribe qué buscas'); return; }
    var tag = sinT(q).replace(/[^a-z0-9]/g, '');
    var u = donde === 'ig' ? 'https://www.instagram.com/explore/tags/' + encodeURIComponent(tag) + '/'
      : donde === 'tt' ? 'https://www.tiktok.com/search/user?q=' + encodeURIComponent(q)
      : donde === 'mapa' ? 'https://www.google.com/maps/search/' + encodeURIComponent('negocios cerca de ' + (N().direccion || ciudad()))
      : 'https://www.google.com/search?q=' + encodeURIComponent('site:instagram.com ' + q);
    abrir(u);
  };
  window.alAnadir = function () {
    var u = usuario($('alCu').value), n = ($('alCn').value || '').trim(), t = $('alCt').value;
    if (!u && !n) { aviso('Pon su @ o su nombre'); return; }
    if ($('alCu').value.trim() && !u) { aviso('Ese @ no es válido en Instagram'); return; }
    D().candidatos.push({ id: uid(), usuario: u, nombre: n, tipo: t, estado: 'idea', nota: '' }); guardarS(); repinta(); aviso('Apuntado ✓');
  };
  window.alQuitarC = function (i) { D().candidatos.splice(i, 1); guardarS(); repinta(); };
  window.alEstadoC = function (i) { var x = D().candidatos[i]; if (!x) return; x.estado = ORDEN_C[(ORDEN_C.indexOf(x.estado) + 1) % ORDEN_C.length]; guardarS(); repinta(); aviso('Ahora: ' + ESTADOS_C[x.estado]); };
  window.alPropuesta = function (i) {
    var x = D().candidatos[i]; if (!x) return;
    var t = x.tipo === 'propio' ? m('cruzadaMsg') : m('collab', { nom: x.nombre || '@' + x.usuario, idea: esCreador() ? m('ideaCre') : m('ideaNeg') });
    modal('<h3>✉️ Propuesta para ' + esc(x.nombre || '@' + x.usuario) + '</h3><p class="al-p">Mándalo por mensaje directo de Instagram. Cámbialo a tu manera.</p>' + cajaTexto('alMsg', t) +
      '<div class="al-acc"><button class="btn pp" onclick="alCopiarMsg(' + i + ')">📋 Copiar' + (x.usuario ? ' y abrir su perfil' : '') + '</button><button class="btn g" onclick="cerrarModal()">Cerrar</button></div>');
  };
  window.alCopiarMsg = function (i) {
    var x = D().candidatos[i]; copiar($('alMsg').value);
    if (x) { if (x.estado === 'idea') x.estado = 'escrito'; guardarS(); if (x.usuario) abrir('https://www.instagram.com/' + x.usuario + '/'); }
    cerrarModal(); repinta();
  };
  window.alCollabPost = function (i) {
    var x = D().candidatos[i]; if (!x) return;
    if (!x.usuario) { aviso('Pon primero su @ de Instagram para invitarle'); return; }
    var tema = esCreador() ? (lang() === 'es' ? 'Vídeo juntos' : 'Together') : (perfil().etq && perfil().etq.carta ? (lang() === 'es' ? 'Probando nuestra ' + perfil().etq.carta : neg()) : neg());
    var it = alCalendario({ titulo: '🤝 Collab con @' + x.usuario, txt: m('collabPost', { tema: tema, cuenta: '@' + x.usuario }), tags: tagsLocales().join(' '), formato: 'reel', redes: ['igf'], cuando: isoEn(3, '19:30'),
      colaboradores: [x.usuario], por: 'Collab: sale en tu perfil y en el de @' + x.usuario + ' (si acepta la invitación).' });
    hecho(it, ['Antes, confirma con @' + esc(x.usuario) + ' el día y que acepta.', 'En Instagram, al publicar: <b>Etiquetar personas → Invitar colaborador</b> → @' + esc(x.usuario) + '.',
      'Cuando acepte, la publicación aparece en los dos perfiles.'], conServidor() ? '<div class="al-nota">Con tu cuenta conectada, Chispa manda la invitación al publicar (<code>collaborators</code> de la API). No vale para historias.</div>' : '<div class="al-nota">En modo demostración la invitación la haces tú desde la app.</div>');
  };

  /* ---------- 🎁 canje ---------- */
  var LEGAL = [
    ['marca', 'Va marcado como <b>publicidad</b> al principio y bien visible: «Publi», «Publicidad», «Colaboración pagada con …» o la etiqueta «Colaboración pagada» de Instagram (es gratis). No basta con #sp, #collab o #ad escondidos al final.'],
    ['contra', 'Lo que das a cambio (comida, servicio, producto) cuenta como <b>pago</b>: queda apuntado aquí.'],
    ['sincero', 'El creador cuenta su opinión de verdad: no se le dicta un texto engañoso ni se ocultan precios o condiciones.'],
    ['menores', 'Si el creador es menor o su público lo es, se tiene más cuidado (y nada de alcohol dirigido a menores).'],
    ['derechos', 'Acordado por escrito (vale un mensaje): qué publica, cuándo y si puedes reutilizar su vídeo en tus redes o anuncios.']
  ];
  function vCanje() {
    var a = D(), cre = esCreador();
    var h = '<p class="al-p">' + (cre ? 'Le propones a una marca o negocio un vídeo con su producto a cambio del producto o el servicio. <b>Tú</b> eres quien tiene que marcarlo como publicidad.' :
      'Invitas a un creador de ' + esc(ciudad()) + ' a <b>' + esc(invitacion()) + '</b> a cambio de que lo cuente. Sus seguidores te descubren.') + '</p>';
    h += '<div class="al-sec">✉️ Mensaje</div><div class="al-fila"><div><label class="lb" for="alCjN">' + (cre ? 'Marca' : 'Creador') + '</label><input class="inp" id="alCjN" placeholder="' + (cre ? 'Nombre de la marca' : '@creador') + '"></div></div>' +
      '<div class="al-acc"><button class="btn g sm" onclick="alCanjeMsg()">✉️ Ver el mensaje listo para copiar</button><button class="btn pp sm" onclick="alCanjeNuevo()">➕ Apuntar este canje</button></div>';
    h += '<div class="al-sec">⚖️ Antes de publicar (lo que pide la ley en España)</div><p class="al-p">Si hay <b>contraprestación</b> —dinero o algo gratis—, la publicación es <b>publicidad</b> y tiene que reconocerse como tal. Esto es una guía práctica, no asesoramiento legal.</p>' +
      '<ul class="al-check">' + LEGAL.map(function (l) { return '<li><b>✔</b> ' + l[1] + '</li>'; }).join('') + '</ul>' +
      '<div class="al-nota">Y la etiqueta «Colaboración pagada» de Instagram <b>no es</b> un anuncio: es gratis y solo dice que hay acuerdo. «Patrocinado» solo sale si pagas a Meta.</div>';
    h += '<div class="al-sec">📋 Seguimiento</div>' + (a.canjes.length ? '<div class="al-lista">' + a.canjes.map(function (x, i) {
      var nOk = LEGAL.filter(function (l) { return x.check && x.check[l[0]]; }).length;
      return '<div class="al-it"><div class="al-itt"><b>' + esc(x.quien) + '</b> <span class="al-est ' + esc(x.estado) + '">' + esc(ESTADOS_J[x.estado]) + '</span> <span class="al-u">⚖️ ' + nOk + '/' + LEGAL.length + '</span>' +
        (x.enlace ? ' · ' + enl(x.enlace, 'ver publicación') : '') + '</div>' +
        '<div class="al-acc"><button class="btn g sm" onclick="alCanjeVer(' + i + ')">Abrir ›</button><button class="btn g sm" onclick="alCanjeSig(' + i + ')">Siguiente paso ›</button><button class="btn g sm" onclick="alCanjeQuitar(' + i + ')" aria-label="Quitar">✕</button></div></div>';
    }).join('') + '</div>' : '<div class="al-nota">Aún no hay canjes apuntados.</div>');
    return tarjeta('🎁 Canje con creadores ' + (cre ? '(tú con marcas)' : 'locales'), h,
      enl('https://www.autocontrol.es/documentos/codigo-de-conducta-sobre-el-uso-de-influencers-en-la-publicidad/', 'Código de Conducta sobre el uso de influencers en la publicidad (Autocontrol)') + ' · ' +
      enl('https://www.boe.es/buscar/act.php?id=BOE-A-2022-11311', 'Ley 13/2022 General de Comunicación Audiovisual (art. 94)') + ' · ' + enl('https://www.boe.es/buscar/doc.php?id=BOE-A-2024-8716', 'Real Decreto 444/2024') + ' · ' +
      enl('https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758', 'Ley 34/2002 (LSSI), art. 20'));
  }
  var ESTADOS_J = { propuesto: 'propuesto', aceptado: 'aceptado', visita: 'ha venido', publicado: 'publicado' };
  var ORDEN_J = ['propuesto', 'aceptado', 'visita', 'publicado'];
  function textoCanje(nom) { return m(esCreador() ? 'canjeCre' : 'canje', { nom: nom || (esCreador() ? 'equipo' : ''), inv: invitacion() }).replace('¡Hola !', '¡Hola!').replace('Hi !', 'Hi!').replace('Hallo !', 'Hallo!').replace('Bonjour  !', 'Bonjour !'); }
  window.alCanjeMsg = function () {
    var n = ($('alCjN').value || '').trim();
    modal('<h3>✉️ Propuesta de canje</h3><p class="al-p">Ya lleva lo de marcarlo como publicidad: así no hay sorpresas.</p>' + cajaTexto('alMsg', textoCanje(n)) +
      '<div class="al-acc"><button class="btn pp" onclick="copiar_al()">📋 Copiar</button><button class="btn g" onclick="cerrarModal()">Cerrar</button></div>');
  };
  window.copiar_al = function () { copiar($('alMsg').value); cerrarModal(); };
  window.alCanjeNuevo = function () {
    var n = ($('alCjN').value || '').trim(); if (!n) { aviso(esCreador() ? 'Pon el nombre de la marca' : 'Pon el @ del creador'); return; }
    D().canjes.push({ id: uid(), quien: n, estado: 'propuesto', check: {}, enlace: '', da: invitacion(), creado: new Date().toISOString().slice(0, 10) }); guardarS(); repinta(); aviso('Canje apuntado ✓');
  };
  window.alCanjeSig = function (i) { var x = D().canjes[i]; if (!x) return; var k = ORDEN_J.indexOf(x.estado); if (k < ORDEN_J.length - 1) x.estado = ORDEN_J[k + 1]; guardarS(); repinta(); aviso('Ahora: ' + ESTADOS_J[x.estado]); if (x.estado === 'publicado') window.alCanjeVer(i); };
  window.alCanjeQuitar = function (i) { D().canjes.splice(i, 1); guardarS(); repinta(); };
  window.alCanjeVer = function (i) {
    var x = D().canjes[i]; if (!x) return; x.check = x.check || {};
    modal('<h3>🎁 ' + esc(x.quien) + '</h3><p class="al-p">A cambio: <b>' + esc(x.da || invitacion()) + '</b> · estado: <b>' + esc(ESTADOS_J[x.estado]) + '</b></p>' +
      '<div class="al-sec">⚖️ Comprobado</div>' + LEGAL.map(function (l) { return '<label class="al-cb"><input type="checkbox" data-k="' + l[0] + '"' + (x.check[l[0]] ? ' checked' : '') + '> <span>' + l[1] + '</span></label>'; }).join('') +
      '<label class="lb" for="alCjE" style="margin-top:10px">Enlace de su publicación</label><input class="inp" id="alCjE" value="' + esc(x.enlace || '') + '" placeholder="https://www.instagram.com/reel/…">' +
      '<div class="al-acc"><button class="btn pp" onclick="alCanjeGuardar(' + i + ')">Guardar</button>' + (x.enlace ? '<button class="btn g" onclick="alCompartirCanje(' + i + ')">🔁 Compartirlo en tus historias</button>' : '') + '</div>');
  };
  window.alCanjeGuardar = function (i) {
    var x = D().canjes[i]; if (!x) return;
    Array.prototype.forEach.call(document.querySelectorAll('#modalBox .al-cb input'), function (c) { x.check[c.getAttribute('data-k')] = c.checked; });
    var e = ($('alCjE').value || '').trim(); if (e && !/^https?:\/\//.test(e)) e = 'https://' + e; x.enlace = e;
    guardarS(); cerrarModal(); repinta(); aviso('Guardado ✓');
  };
  window.alCompartirCanje = function (i) {
    var x = D().canjes[i]; if (!x) return; cerrarModal();
    var it = alCalendario({ titulo: '🔁 Historia: lo que ha contado ' + x.quien, txt: (lang() === 'es' ? 'Mirad lo que ha contado ' : '') + x.quien + ' 👀\n' + x.enlace, formato: 'historia', redes: ['igs'], cuando: isoEn(0, '21:00'),
      por: 'Compartir la publicación del creador en tus historias (ya va marcada como publicidad por él).' });
    hecho(it, ['En Instagram, abre su publicación → <b>Compartir (avión de papel) → Añadir a tu historia</b>.', 'Menciónale con su @.']);
  };

  /* ---------- 📍 ubicación, etiquetas y Google ---------- */
  function vLocal() {
    var n = N(), tags = tagsLocales();
    var h = '<div class="al-sec">📍 Ubicación y etiquetas locales</div><p class="al-p">Instagram busca por <b>nombre, bio, texto, etiquetas y lugar</b>. Quien busca «' + esc((perfil().corto || '') + ' ' + ciudad()) + '» te encuentra si lo pones.</p>' +
      '<ul class="al-check"><li><b>✔</b> Pon la <b>ubicación</b> en cada publicación, reel e historia (sticker de ubicación en historias).</li>' +
      '<li><b>✔</b> Tu <b>nombre de perfil</b> con lo que haces y dónde: «' + esc(neg().split(/\s+·|\s+-/)[0] + ' · ' + (perfil().corto || '') + ' ' + ciudad()) + '».</li>' +
      '<li><b>✔</b> Máximo <b>5 etiquetas</b> (Instagram no deja más desde diciembre de 2025), concretas y de tu zona.</li></ul>' +
      '<div class="al-chips">' + tags.map(function (t) { return '<span class="al-chip off">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="al-acc"><button class="btn g sm" onclick="alCopiarTags()">📋 Copiar estas etiquetas</button><button class="btn g sm" onclick="vista(\'panel\');panel(\'ajustes\')">⚙️ Revisar ciudad y dirección</button></div>';
    h += '<div class="al-sec">🔎 Publicaciones de tu ficha de Google</div><p class="al-p">Lo que publicas en tu ficha sale a quien te busca en <b>Google y Maps</b>, aunque no te conozca. Una por semana basta: oferta, novedad o evento.</p>' +
      '<label class="lb" for="alGtx">Texto</label>' + cajaTexto('alGtx', m('google')) +
      '<div class="al-acc"><button class="btn pp sm" onclick="alGoogle()">🔎 Preparar publicación de Google</button>' + (n.google ? '<button class="btn g sm" onclick="abrirCta(\'google\')">📍 Ver mi ficha</button>' : '<button class="btn g sm" onclick="vista(\'panel\');panel(\'ajustes\')">Poner mi ficha de Google</button>') + '</div>' +
      '<div class="al-nota">' + (conServidor() ? 'Con tu ficha conectada, Chispa la publica sola a la hora.' : 'En modo demostración te avisa a la hora con el texto listo para pegarlo en tu ficha.') + '</div>';
    return tarjeta('📍 Ubicación, etiquetas locales y Google', h, enl('https://about.instagram.com/blog/announcements/break-down-how-instagram-search-works/', 'Instagram · cómo funciona la búsqueda') + ' · ' + enl('https://support.google.com/business/answer/7662907?hl=es', 'Google · publicaciones en tu perfil de empresa'));
  }
  window.alCopiarTags = function () { copiar(tagsLocales().join(' ')); };
  window.alGoogle = function () {
    var t = ($('alGtx') && $('alGtx').value || '').trim() || m('google');
    var it = alCalendario({ titulo: '🔎 Google: ' + t.slice(0, 50), txt: t, formato: 'post', redes: ['gbp'], cuando: isoEn(1, '10:00'), por: 'Publicación de la ficha de Google: la ve quien te busca en Google y Maps.' });
    D().hechos.google = (D().hechos.google || 0) + 1; guardarS();
    hecho(it, null);
  };

  /* ---------- 💬 clientes y WhatsApp ---------- */
  var BUENO = /gracias|buen[ií]sim|encant|genial|me gust|perfect|recomiend|incre[ií]ble|delicios|😍|💛|❤|⭐|love|great|amazing|lecker|super|top|merci|excellent/i;
  function vClientes() {
    var b = (S.bandeja || []).map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return o.x && o.x.tx && BUENO.test(o.x.tx); });
    var h = '<div class="al-sec">💬 Lo que dicen tus clientes</div><p class="al-p">Lo que cuenta un cliente convence más que lo que cuentas tú, y lo comparten sus amigos. Pide permiso y publícalo.</p>';
    h += b.length ? '<div class="al-lista">' + b.slice(0, 6).map(function (o) {
      return '<div class="al-it"><div class="al-itt"><b>' + esc(o.x.nm || 'Cliente') + '</b> <span class="al-u">' + esc(o.x.red || '') + '</span><div class="al-cita">«' + esc(o.x.tx) + '»</div></div>' +
        '<div class="al-acc"><button class="btn g sm" onclick="alPermiso(' + o.i + ')">✉️ Pedir permiso</button><button class="btn pp sm" onclick="alResena(' + o.i + ')">🖼️ Preparar publicación</button></div></div>';
    }).join('') + '</div>' : '<div class="al-nota">Aún no hay mensajes buenos en tu bandeja. <a href="javascript:void 0" onclick="panel(\'bandeja\')">Ir a la bandeja</a></div>';
    h += '<div class="al-nota">Cuando un cliente te <b>menciona en su historia</b>, compártela desde la app de Instagram (en la mención: «Añadir a tu historia»). Instagram no deja hacerlo por API.</div>';
    h += '<div class="al-sec">🟢 Estado de WhatsApp</div><p class="al-p">Lo ven tus contactos, y los amigos a los que se lo reenvían. Ideal para la oferta del día.</p>' + cajaTexto('alWtx', m('estado')) +
      '<div class="al-acc"><button class="btn pp sm" onclick="alEstadoWa()">🟢 Preparar estado para hoy</button></div>';
    var enlCanal = (S.alcance && S.alcance.canal) || '';
    h += '<div class="al-sec">📢 Canal de WhatsApp</div><p class="al-p">Un canal es público: cualquiera lo encuentra en «Novedades» de WhatsApp y se une sin darte su número.</p>' +
      '<ol class="al-ol"><li>WhatsApp → <b>Novedades → + → Crear canal</b>.</li><li>Pon el nombre de tu negocio, tu logo y una frase.</li><li>Copia el enlace del canal y pégalo aquí.</li></ol>' +
      '<div class="al-fila"><div><label class="lb" for="alCanal">Enlace de tu canal</label><input class="inp" id="alCanal" value="' + esc(enlCanal) + '" placeholder="https://whatsapp.com/channel/…"></div></div>' +
      '<div class="al-acc"><button class="btn g sm" onclick="alCanal()">📋 Guardar y copiar la invitación</button></div>' +
      '<div class="al-nota">WhatsApp no deja publicar estados ni mensajes de canal desde ninguna aplicación: Chispa te avisa a la hora con el texto listo y lo subes con un toque.</div>';
    return tarjeta('💬 Contenido de clientes, Estado y Canal de WhatsApp', h, enl('https://faq.whatsapp.com/', 'Ayuda de WhatsApp'));
  }
  window.alPermiso = function (i) {
    var x = (S.bandeja || [])[i]; if (!x) return;
    modal('<h3>✉️ Pedir permiso a ' + esc(x.nm || '') + '</h3>' + cajaTexto('alMsg', m('permiso', { nom: (x.nm || '').split(' ')[0] })) +
      '<div class="al-acc"><button class="btn pp" onclick="copiar_al()">📋 Copiar</button><button class="btn g" onclick="cerrarModal()">Cerrar</button></div>');
  };
  window.alResena = function (i) {
    var x = (S.bandeja || [])[i]; if (!x) return;
    var it = alCalendario({ titulo: '💬 Lo que dice ' + (x.nm || 'un cliente'), txt: m('resena', { tx: x.tx, nom: (x.nm || '').split(' ')[0] }), tags: tagsLocales().slice(0, 3).join(' '), formato: 'post', redes: ['igf', 'fb'], cuando: isoEn(2, '13:00'),
      por: 'Contenido de clientes. Publícalo solo si te ha dado permiso.' });
    hecho(it, ['Antes, pide permiso al cliente (botón «Pedir permiso»).', 'Menciónale si tiene cuenta y le parece bien: lo compartirá con sus amigos.']);
  };
  window.alEstadoWa = function () {
    var t = ($('alWtx') && $('alWtx').value || '').trim() || m('estado');
    var it = alCalendario({ titulo: '🟢 Estado de WhatsApp', txt: t, formato: 'historia', redes: ['wa'], cuando: isoEn(0, '12:00'), por: 'Estado de WhatsApp: lo ven tus contactos. WhatsApp no deja publicarlo solo: te avisamos.' });
    hecho(it, ['WhatsApp → <b>Novedades → Mi estado</b>.', 'Pon la foto y pega el texto.']);
  };
  window.alCanal = function () {
    var u = ($('alCanal').value || '').trim();
    if (u && !/^https?:\/\/(www\.)?whatsapp\.com\/channel\//i.test(u)) { aviso('Ese enlace no es de un canal de WhatsApp (whatsapp.com/channel/…)'); return; }
    D().canal = u; guardarS();
    copiar(m('canal', { enl: u || '(enlace de tu canal)' }));
  };

  /* ---------- 🔁 entre tus negocios ---------- */
  function vCruzada() {
    var a = D(), propios = a.candidatos.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return o.x.tipo === 'propio'; });
    var h = '<p class="al-p">Si tienes más de un negocio, cada uno le presenta el otro a <b>sus</b> clientes. Es la colaboración más fácil: no hay que convencer a nadie.' +
      (esParaiso() ? ' Ejemplo: <b>El Paraíso</b> presenta <b>El Sazón de Quisqueya</b> y al revés.' : '') + '</p>';
    var otros = window._alOtros || [];
    if (otros.length) h += '<div class="al-nota">En Chispa llevas también: ' + otros.map(function (o) { return '<b>' + esc(o.nombre) + '</b>'; }).join(', ') + '. <button class="btn g sm" onclick="alTraerPropios()">➕ Añadirlos aquí</button></div>';
    h += propios.length ? '<div class="al-lista">' + propios.map(function (o) {
      var x = o.x;
      return '<div class="al-it"><div class="al-itt"><b>' + esc(x.nombre || '@' + x.usuario) + '</b> ' + (x.usuario ? '<span class="al-u">@' + esc(x.usuario) + '</span>' : '<span class="al-u falta">falta su @</span>') + (x.nota ? '<div class="al-u">' + esc(x.nota) + '</div>' : '') + '</div>' +
        '<div class="al-acc"><button class="btn pp sm" onclick="alCruzadaPost(' + o.i + ')">🔁 Preparar historia y publicación</button><button class="btn g sm" onclick="alCollabPost(' + o.i + ')">🤝 Reel Collab entre los dos</button>' +
        '<button class="btn g sm" onclick="alPonUsuario(' + o.i + ')">✏️ Su @</button></div></div>';
    }).join('') + '</div>' : '<div class="al-nota">Añade tu otro negocio en «🤝 Colaboraciones» con el tipo «Negocio mío».</div>';
    h += '<ul class="al-check"><li><b>✔</b> Una historia por semana mencionando al otro (con su @ y su ubicación).</li><li><b>✔</b> Un reel Collab al mes entre los dos.</li><li><b>✔</b> En la mesa o el mostrador, el QR o el nombre del otro.</li></ul>';
    return tarjeta('🔁 Promoción cruzada entre tus negocios', h, '');
  }
  window.alTraerPropios = function () {
    var a = D(); (window._alOtros || []).forEach(function (o) { if (!a.candidatos.some(function (c) { return sinT(c.nombre) === sinT(o.nombre); })) a.candidatos.push({ id: uid(), usuario: '', nombre: o.nombre, tipo: 'propio', estado: 'idea', nota: 'Negocio tuyo en Chispa' }); });
    guardarS(); repinta(); aviso('Añadidos ✓');
  };
  window.alPonUsuario = function (i) {
    var x = D().candidatos[i]; if (!x) return; var v = prompt('@ de Instagram de ' + (x.nombre || ''), x.usuario ? '@' + x.usuario : '');
    if (v == null) { aviso('Sin cambios'); return; } var u = usuario(v); if (v.trim() && !u) { aviso('Ese @ no es válido'); return; } x.usuario = u; guardarS(); repinta(); aviso(u ? '@' + u + ' guardado ✓' : 'Quitado');
  };
  window.alCruzadaPost = function (i) {
    var x = D().candidatos[i]; if (!x) return;
    var cta = x.usuario ? ' (@' + x.usuario + ')' : '';
    var t = m('cruzada', { otro: x.nombre || '@' + x.usuario, cta: cta });
    var h1 = alCalendario({ titulo: '🔁 Historia: presentamos ' + (x.nombre || '@' + x.usuario), txt: t, formato: 'historia', redes: ['igs', 'wa'], cuando: isoEn(1, '13:00'), por: 'Promoción cruzada: menciona al otro negocio con su @.' });
    var it = alCalendario({ titulo: '🔁 ' + (x.nombre || '@' + x.usuario) + ', de la familia', txt: t, tags: tagsLocales().slice(0, 3).join(' '), formato: 'carrusel', redes: ['igf', 'fb'], cuando: isoEn(4, '19:30'),
      colaboradores: x.usuario ? [x.usuario] : null, por: 'Promoción cruzada entre negocios del mismo dueño' + (x.usuario ? ' (con invitación de colaborador).' : '.') });
    hecho(it, ['La historia sale el ' + esc(fechaBonita(h1.cuando)) + ' y la publicación después.', x.usuario ? 'Al publicar: <b>Invitar colaborador → @' + esc(x.usuario) + '</b>, y acéptalo desde el otro perfil.' : 'Pon su @ (botón «✏️ Su @») para mencionarle.']);
  };

  /* ---------------- pestaña ---------------- */
  var TAB_A = { id: 'alcance', ic: '🚀', nm: 'Llegar a gente nueva' };
  function ponerTab() {
    if (TABS.some(function (t) { return t.id === 'alcance'; })) return;
    var pos = -1; TABS.forEach(function (t, i) { if (t.id === 'crecer' || (pos < 0 && t.id === 'calendario')) pos = i; });
    TABS.splice(pos >= 0 ? pos + 1 : TABS.length, 0, TAB_A);
  }
  ponerTab();
  function repinta() { if (typeof TAB !== 'undefined' && TAB === 'alcance' && $('main')) { var y = window.scrollY; $('main').innerHTML = vAlcance(); window.scrollTo(0, y); } }
  window.alVer = function (s) { D().sub = s; guardarS(); repinta(); };
  function cargarPropios() {
    try {
      if (!window.ChispaCuentas || !ChispaCuentas.listarNegocios) return;
      ChispaCuentas.listarNegocios().then(function (l) {
        var yo = sinT(neg());
        window._alOtros = (l || []).filter(function (e) { return e && e.nombre && !e.ejemplo && sinT(e.nombre) !== yo; });
        if (window._alOtros.length) repinta();
      }, function () {});
    } catch (e) {}
  }
  var panelAntes = window.panel;
  window.panel = function (tab) {
    if (tab !== 'alcance') return panelAntes.apply(this, arguments);
    TAB = 'alcance'; ponerTab(); pintarNav();
    $('main').innerHTML = vAlcance();
    cargarPropios();
  };
  window.ChispaAlcance = { datos: D, tags: tagsLocales, mensaje: m, alCalendario: alCalendario, socios: socios };
  if (/alcance/.test(location.hash || '')) { try { vista('panel'); window.panel('alcance'); } catch (e) {} }
})();
