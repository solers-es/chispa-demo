/* ──────────────────────────────────────────────────────────────────────────
   Chispa · «Crecer» — guía de crecimiento accionable para el dueño

   Igual que resenas.js / chispa-estudio.js / chispa-agenda.js: va en su propio
   fichero y se engancha añadiendo UNA pestaña a TABS y envolviendo window.panel.
   Usa de index.html solo lo común: S, $, esc, toast, modal, cerrarModal,
   TABS, TAB, pintarNav, panel, vista.

   TODO el contenido se adapta al SECTOR y al IDIOMA activos con
   ChispaSector.actual() (sectores.js): sus hashtags, sus mejores horas y su
   «producto estrella». Idiomas con plantillas propias: es, en, de, fr; en
   cualquier otro se muestra en español con el aviso honesto de que la IA lo
   reescribe en el idioma del negocio (mismo criterio que el resto de la app).

   Base: docs/CRECIMIENTO-ALGORITMOS.md (07/10/2026). Las reglas llevan su
   origen: [OFICIAL] lo dice la red · [ESTUDIO] lo mide una empresa de análisis
   · [OPINIÓN] es recomendación razonada. Nada inventado como si fuera oficial.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (!window.S || !window.TABS || !window.ChispaSector) return;

  /* ---------- estilos propios (prefijo cr-) ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.cr-sub{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px}',
    '.cr-sub button{background:var(--panel2);border:1px solid var(--line);color:var(--tx2);font-weight:700;font-size:13px;padding:8px 14px;border-radius:30px;cursor:pointer;min-height:38px}',
    '.cr-sub button.on{background:rgba(139,92,246,.18);border-color:var(--purple);color:var(--tx)}',
    '.cr-intro{background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(255,204,51,.07));border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin-bottom:16px}',
    '.cr-intro b{color:var(--tx)}.cr-intro p{margin:6px 0 0;color:var(--tx2);font-size:13.5px}',
    '.cr-step{display:flex;gap:13px;margin-bottom:12px}',
    '.cr-num{flex:none;width:34px;height:34px;border-radius:50%;background:rgba(139,92,246,.16);border:1px solid rgba(139,92,246,.4);color:var(--purple2);font-weight:800;display:grid;place-items:center;font-size:15px}',
    '.cr-step .t{font-weight:800;font-size:14.5px;color:var(--tx)}',
    '.cr-step .d{font-size:13.5px;color:var(--tx2);margin-top:2px}',
    '.cr-eg{background:var(--bg2);border:1px dashed rgba(139,92,246,.45);border-radius:10px;padding:8px 11px;margin-top:7px;font-size:13px;color:var(--tx);white-space:pre-wrap}',
    '.cr-eg .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.4px;font-weight:800;color:var(--purple2);margin-bottom:3px}',
    '.cr-tabla{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:4px}',
    '.cr-tabla th,.cr-tabla td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}',
    '.cr-tabla th{color:var(--tx3);font-size:11.5px;text-transform:uppercase;letter-spacing:.4px;font-weight:800}',
    '.cr-tabla td b{color:var(--tx)}.cr-tabla .q{color:var(--amber);font-weight:800;white-space:nowrap}',
    '.cr-hora{display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--line)}',
    '.cr-hora:last-child{border-bottom:0}',
    '.cr-hh{flex:none;font-weight:800;font-size:16px;color:var(--amber);min-width:58px}',
    '.cr-hf{flex:none;font-size:11px;font-weight:800;padding:3px 9px;border-radius:30px;border:1px solid var(--line);color:var(--tx2);text-transform:capitalize}',
    '.cr-hp{font-size:13px;color:var(--tx2)}',
    '.cr-tags{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}',
    '.cr-tag{font-size:13px;font-weight:700;padding:6px 12px;border-radius:30px;border:1px solid var(--line);background:var(--panel2);color:var(--tx)}',
    '.cr-tag.loc{color:var(--amber);border-color:rgba(255,204,51,.35);background:rgba(255,204,51,.1)}',
    '.cr-tag.sec{color:var(--purple2);border-color:rgba(139,92,246,.4);background:rgba(139,92,246,.12)}',
    '.cr-dia{display:flex;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)}.cr-dia:last-child{border-bottom:0}',
    '.cr-dd{flex:none;width:76px;font-weight:800;font-size:13px;color:var(--tx)}',
    '.cr-dfmt{flex:none;font-size:11px;font-weight:800;padding:2px 9px;border-radius:30px;align-self:flex-start;border:1px solid}',
    '.cr-dfmt.reel{color:var(--purple2);border-color:rgba(139,92,246,.4);background:rgba(139,92,246,.12)}',
    '.cr-dfmt.carrusel{color:var(--amber);border-color:rgba(255,204,51,.35);background:rgba(255,204,51,.1)}',
    '.cr-dfmt.historia{color:var(--azul);border-color:rgba(96,165,250,.4);background:rgba(96,165,250,.1)}',
    '.cr-dfmt.descanso{color:var(--tx3);border-color:var(--line)}',
    '.cr-di{font-size:13.5px;color:var(--tx2)}',
    '.cr-mon{display:flex;gap:12px;margin-bottom:12px}',
    '.cr-mr{flex:none;width:30px;height:30px;border-radius:9px;background:var(--panel2);border:1px solid var(--line);display:grid;place-items:center;font-weight:800;color:var(--amber);font-size:14px}',
    '.cr-mon .t{font-weight:800;font-size:14px;color:var(--tx)}.cr-mon .d{font-size:13px;color:var(--tx2);margin-top:2px}',
    '.cr-aviso{background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.4);border-radius:12px;padding:11px 13px;margin-top:6px;font-size:13.5px;color:var(--tx2)}.cr-aviso b{color:var(--rojo)}',
    '.cr-regla{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--line)}.cr-regla:last-child{border-bottom:0}',
    '.cr-ri{flex:none;font-size:20px}.cr-regla .t{font-weight:800;font-size:14px;color:var(--tx)}.cr-regla .d{font-size:13px;color:var(--tx2);margin-top:1px}',
    '.cr-fuente{font-size:11px;font-weight:800;padding:1px 7px;border-radius:30px;border:1px solid var(--line);color:var(--tx3);margin-left:6px;white-space:nowrap}',
    '.cr-fuente.of{color:var(--verde);border-color:rgba(52,211,153,.4)}',
    '.cr-fuente.es{color:var(--azul);border-color:rgba(96,165,250,.4)}',
    '.cr-fuente.op{color:var(--tx3)}',
    '.cr-nota{font-size:12.5px;color:var(--tx3);margin-top:10px}',
    '.cr-copi{margin-top:10px}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- idioma activo ----------
     Textos completos en es y en. Cualquier otro idioma se muestra en español
     con el aviso honesto de que la IA de Chispa lo reescribe en el idioma del
     negocio (mismo criterio que resenas.js / sectores.js). */
  var LANGS = { es: 1, en: 1 };
  function perfil() { return window.ChispaSector.actual(); }
  function lang() { var b = perfil().idioma.base; return LANGS[b] ? b : 'es'; }
  function traducido() { var I = perfil().idioma; return I.base !== 'es' && !LANGS[I.base]; }
  function neg() { return (S.negocio && S.negocio.nombre) || perfil().corto; }
  function ciudad() { return (S.negocio && S.negocio.ciudad) || 'Palma'; }
  function ciudadCorta() { return ciudad().split(/[ ,]/)[0]; }

  /* ---------- «producto estrella» por sector, traducido a es/en/de/fr ---------- */
  var PROD = {
    restaurante: { es: ['la paella', 'La paella'], en: ['the paella', 'The paella'], de: ['die Paella', 'Die Paella'], fr: ['la paella', 'La paella'] },
    peluqueria:  { es: ['el corte', 'El corte'], en: ['the haircut', 'The haircut'], de: ['der Haarschnitt', 'Der Haarschnitt'], fr: ['la coupe', 'La coupe'] },
    estetica:    { es: ['la manicura', 'La manicura'], en: ['the manicure', 'The manicure'], de: ['die Maniküre', 'Die Maniküre'], fr: ['la manucure', 'La manucure'] },
    gimnasio:    { es: ['el entreno', 'El entreno'], en: ['the workout', 'The workout'], de: ['das Training', 'Das Training'], fr: ["l'entraînement", "L'entraînement"] },
    tienda:      { es: ['el look', 'El look'], en: ['the outfit', 'The outfit'], de: ['das Outfit', 'Das Outfit'], fr: ['la tenue', 'La tenue'] },
    cafeteria:   { es: ['el café', 'El café'], en: ['the coffee', 'The coffee'], de: ['der Kaffee', 'Der Kaffee'], fr: ['le café', 'Le café'] },
    talleres:    { es: ['la reparación', 'La reparación'], en: ['the repair', 'The repair'], de: ['die Reparatur', 'Die Reparatur'], fr: ['la réparation', 'La réparation'] },
    creador:     { es: ['el vídeo', 'El vídeo'], en: ['the video', 'The video'], de: ['das Video', 'Das Video'], fr: ['la vidéo', 'La vidéo'] }
  };
  function prod(cap) {
    var P = perfil(), L = lang(), d = PROD[P.id];
    if (!d) return cap ? capital(P.corto) : P.corto;
    return d[L][cap ? 1 : 0];
  }
  function capital(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ---------- textos de interfaz por idioma ---------- */
  var T = {
    es: {
      tab: 'Crecer', titulo: '🚀 Crecer',
      introT: 'Tu guía para tener más clientes desde las redes',
      introP: 'Hecha a la medida de {neg} ({sector}, {ciudad}). No son promesas: cada consejo dice si lo dice la propia red (OFICIAL), lo mide un estudio o es una recomendación razonada (OPINIÓN).',
      sub: { video: '🎬 Vídeo que engancha', ritmo: '📆 Cuánto publicar', horas: '⏰ Mejores horas', tags: '#️⃣ Hashtags', semana: '🗓️ Plan de la semana', dinero: '💶 Ganar dinero', reglas: '🛡️ No te penalicen' },
      vTit: 'La receta de un vídeo que engancha',
      vSub: 'Los 3 primeros segundos deciden: si la gente desliza al empezar, el vídeo no sale de tus seguidores.',
      vSteps: [
        ['Gancho (segundos 0-3)', 'Empieza por lo más potente, sin logo ni «hola». Texto en pantalla de 3-7 palabras.', 'Primer fotograma: {prodC} en primer plano, en movimiento.\nTexto: «{prodC} como nunca»'],
        ['Desarrollo con micro-ganchos', 'Cada 2-3 segundos pasa algo nuevo (otro plano, un detalle, un número) para que no se deslice.', 'Enseña 3 detalles rápidos, uno cada 2 s, con sonido real.'],
        ['Remate + bucle', 'El final enlaza con el principio, para que el vídeo se vea otra vez (más tiempo de visionado).', 'Vuelve al primer plano del inicio: parece que empieza de nuevo.'],
        ['CTA de pregunta', 'Termina con UNA pregunta que invite a comentar o a enviárselo a alguien. Nada de «dale like».', '{pregunta}? Dínoslo en comentarios 👇']
      ],
      vNota: 'Prioridad de llamada: en Reels, que lo ENVÍEN a un amigo (es la señal que más llega a gente nueva); en carrusel, que lo GUARDEN; en Stories, que RESPONDAN.',
      rTit: 'Cuánto publicar en cada red',
      rSub: 'Más que dejar de publicar, lo que mata el alcance es publicar a ráfagas. Mejor constante.',
      rCols: ['Red', 'Ritmo', 'Formato que trae gente nueva'],
      rRows: [
        ['TikTok', '3-5 / semana', 'Vídeo vertical. Una cuenta pequeña puede llegar lejos: no dependes de los seguidores.'],
        ['YouTube Shorts', '2-4 / semana', 'Los mismos vídeos, con el archivo limpio (sin marca de TikTok).'],
        ['Instagram Reels', '3-5 / semana', 'Sin ráfagas: separa cada pieza 3 h o más. 3-5 publicaciones/sem crecen el doble que 1-2.'],
        ['Instagram Stories', 'Cada día que abras', 'Fidelizan a quien ya te sigue (encuestas, preguntas).'],
        ['Facebook', '1-2 / semana', 'Tu propio reel también aquí; público de 40+ y vecinos.'],
        ['Google / Maps', '1 novedad / semana', 'Es lo que más clientes trae a un negocio local: fotos y reseñas.']
      ],
      rNota: 'Regla: no publiques dos piezas en la misma red con menos de 3 h de diferencia (salvo Stories).',
      hTit: 'Las mejores horas para {neg}',
      hSub: 'Según tu sector y los horarios de España. A las 4 semanas, cambia estas horas por las que de verdad funcionen en tu cuenta.',
      hFmt: { post: 'post', reel: 'reel', historia: 'historia', carrusel: 'carrusel' },
      hDias: 'Días fuertes',
      tagTit: 'Hashtags para {neg}',
      tagSub: 'Instagram limita a 5 hashtags por publicación (diciembre 2025). Pocos y concretos funcionan mejor que una lista larga. Ponlos en el texto, no en el primer comentario.',
      tagLoc: 'De tu zona', tagSec: 'De tu sector',
      tagCopi: '📋 Copiar los 5',
      tagNota: 'Etiqueta siempre la ubicación de tu negocio y di la palabra clave («{prod} en {ciudad}») en las primeras palabras del texto.',
      sTit: 'Tu semana, lista',
      sSub: '7 ideas, una por día. Graba todo en 1 hora a la semana: 8-10 clips verticales con el móvil y luz natural dan para toda la semana.',
      sDias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      sPlan: [
        ['reel', '{prodC} de cerca, cámara en movimiento y sonido real'],
        ['carrusel', '«3 cosas que no sabías de {neg}» — para guardar'],
        ['historia', 'Entre bastidores: un día en {neg} + encuesta'],
        ['reel', 'De empezar a terminar en 15 segundos (proceso acelerado)'],
        ['reel', 'Cara y voz: presenta {prod} en 20 segundos'],
        ['historia', 'Pregunta a tu gente: «¿qué queréis ver?»'],
        ['carrusel', 'Lo mejor de la semana con fotos de clientes (con permiso)']
      ],
      sDesc: 'Descanso o Story suave',
      sNota: 'El día que cierres, no publiques nada salvo una Story de «mañana volvemos». El mejor vídeo de la semana, llévalo también al Estado de WhatsApp.',
      mTit: 'Cómo se gana dinero, por orden',
      mSub: 'De lo más realista para un negocio local a lo más difícil. Nada de comprar seguidores: el algoritmo lo nota y es contrario a las normas.',
      mRows: [
        ['UGC — contenido para otras marcas', 'Grabas vídeos para productos o negocios y te pagan por el vídeo (no por las vistas). Es lo más accesible para una cuenta pequeña.'],
        ['Vender lo tuyo / afiliación', 'Lo que mejor convierte: tus propios productos o servicios, o enlaces de afiliado a cosas que de verdad usas.'],
        ['Patrocinios y colaboraciones', 'Cuando tienes audiencia fiel, marcas de tu zona pagan por aparecer. Empieza por intercambios (collab) con negocios del barrio.'],
        ['YouTube (vídeo largo) antes que Shorts', 'El vídeo largo de YouTube paga mucho mejor por visualización que los Shorts. Si quieres ingresos por anuncios, el largo manda.']
      ],
      mAviso: 'Honestidad: <b>TikTok no te paga por visualizaciones en España.</b> Su fondo para creadores aquí es mínimo o no está disponible. En TikTok se gana con marcas, ventas y directos, no con las vistas.',
      gTit: 'Reglas para que no te bajen el alcance',
      gRows: [
        ['🔀', 'Varía', 'No vuelvas a subir el mismo vídeo ya publicado. Para repetir una idea, regrábala.'],
        ['🚱', 'Sin marcas de agua', 'Nada con el logo de TikTok, CapCut u otra app: Instagram y TikTok bajan ese contenido. Sube siempre el archivo original.'],
        ['🤖', 'Etiqueta la IA', 'Si usas imágenes o vídeo generados con IA, márcalos como tal. Es honesto y evita sanciones de la plataforma.'],
        ['🧑', 'Capa humana', 'Pon tu cara, tu voz o algo tuyo. Las cuentas que en 30 días publican casi todo contenido ajeno dejan de salir en recomendaciones.']
      ],
      iaNota: '💬 Ideas y ejemplos en español. Tu negocio publica en {idioma}: la IA de Chispa los reescribe en {idioma} (o escríbelos tú).',
      copiado: '📋 Copiado'
    },
    en: {
      tab: 'Grow', titulo: '🚀 Grow',
      introT: 'Your guide to getting more customers from social media',
      introP: 'Tailored to {neg} ({sector}, {ciudad}). No empty promises: every tip says whether the platform itself states it (OFFICIAL), a study measures it, or it is a reasoned recommendation (OPINION).',
      sub: { video: '🎬 Scroll-stopping video', ritmo: '📆 How often to post', horas: '⏰ Best times', tags: '#️⃣ Hashtags', semana: '🗓️ Your week', dinero: '💶 Making money', reglas: '🛡️ Avoid penalties' },
      vTit: 'The recipe for a video that hooks',
      vSub: 'The first 3 seconds decide: if people swipe away at the start, the video never leaves your followers.',
      vSteps: [
        ['Hook (seconds 0-3)', 'Open with the strongest moment, no logo, no "hi". On-screen text of 3-7 words.', 'First frame: {prodC} up close, moving.\nText: "{prod} like never before"'],
        ['Build with micro-hooks', 'Every 2-3 seconds something new happens (another shot, a detail, a number) so nobody swipes.', 'Show 3 quick details, one every 2 s, with real sound.'],
        ['Payoff + loop', 'The ending links back to the start so the video plays again (more watch time).', 'Cut back to the opening shot: it looks like it starts over.'],
        ['Question CTA', 'End with ONE question that invites a comment or a share. Never "please like".', '{pregunta}? Tell us in the comments 👇']
      ],
      vNota: 'CTA priority: on Reels, get it SENT to a friend (the signal that reaches new people most); on carousels, get it SAVED; on Stories, get a REPLY.',
      rTit: 'How often to post on each network',
      rSub: 'Posting in bursts kills reach more than posting less. Steady wins.',
      rCols: ['Network', 'Pace', 'Format that brings new people'],
      rRows: [
        ['TikTok', '3-5 / week', 'Vertical video. A small account can reach far: followers are not a ranking factor.'],
        ['YouTube Shorts', '2-4 / week', 'The same videos with a clean file (no TikTok watermark).'],
        ['Instagram Reels', '3-5 / week', 'No bursts: space pieces 3 h apart or more. 3-5 posts/week grow twice as fast as 1-2.'],
        ['Instagram Stories', 'Every day you open it', 'They keep existing followers (polls, questions).'],
        ['Facebook', '1-2 / week', 'Your own reel here too; audience of 40+ and locals.'],
        ['Google / Maps', '1 update / week', 'What brings the most local customers: photos and reviews.']
      ],
      rNota: 'Rule: do not post two pieces on the same network less than 3 h apart (except Stories).',
      hTit: 'The best times for {neg}',
      hSub: 'Based on your sector and Spanish schedules. After 4 weeks, swap these for the times that actually work on your account.',
      hFmt: { post: 'post', reel: 'reel', historia: 'story', carrusel: 'carousel' },
      hDias: 'Strong days',
      tagTit: 'Hashtags for {neg}',
      tagSub: 'Instagram caps hashtags at 5 per post (December 2025). A few specific ones beat a long generic list. Put them in the caption, not the first comment.',
      tagLoc: 'Local', tagSec: 'Your sector',
      tagCopi: '📋 Copy all 5',
      tagNota: 'Always tag your business location and say the keyword ("{prod} in {ciudad}") in the first words of the caption.',
      sTit: 'Your week, ready',
      sSub: '7 ideas, one a day. Film it all in 1 hour a week: 8-10 vertical phone clips in natural light cover the whole week.',
      sDias: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      sPlan: [
        ['reel', '{prodC} up close, moving camera and real sound'],
        ['carrusel', '"3 things you didn\'t know about {neg}" — save it'],
        ['historia', 'Behind the scenes: a day at {neg} + a poll'],
        ['reel', 'Start to finish in 15 seconds (sped-up process)'],
        ['reel', 'Face and voice: introduce {prod} in 20 seconds'],
        ['historia', 'Ask your people: "what do you want to see?"'],
        ['carrusel', 'Best of the week with customer photos (with permission)']
      ],
      sDesc: 'Rest or a light Story',
      sNota: 'On your closing day, post nothing but a "back tomorrow" Story. Send your best video of the week to your WhatsApp Status too.',
      mTit: 'How money is made, in order',
      mSub: 'From most realistic for a local business to hardest. Never buy followers: the algorithm notices and it breaks the rules.',
      mRows: [
        ['UGC — content for other brands', 'You film videos for products or businesses and get paid for the video (not for the views). Most accessible for a small account.'],
        ['Sell your own / affiliate', 'What converts best: your own products or services, or affiliate links to things you genuinely use.'],
        ['Sponsorships and collabs', 'Once you have a loyal audience, local brands pay to appear. Start with collab swaps with neighbourhood businesses.'],
        ['YouTube (long video) over Shorts', 'Long YouTube video pays far better per view than Shorts. For ad income, long-form wins.']
      ],
      mAviso: 'Honesty: <b>TikTok does not pay you for views in Spain.</b> Its creator fund here is minimal or unavailable. On TikTok you earn from brands, sales and lives, not views.',
      gTit: 'Rules so your reach is not cut',
      gRows: [
        ['🔀', 'Vary it', 'Do not re-upload the same video already posted. To repeat an idea, re-film it.'],
        ['🚱', 'No watermarks', 'Nothing with a TikTok, CapCut or other-app logo: Instagram and TikTok downrank it. Always upload the original file.'],
        ['🤖', 'Label AI', 'If you use AI-generated images or video, mark them as such. It is honest and avoids platform penalties.'],
        ['🧑', 'Human layer', 'Put your face, your voice or something of yours in it. Accounts that post mostly others\' content over 30 days drop out of recommendations.']
      ],
      iaNota: '',
      copiado: '📋 Copied'
    }
  };
  function t() { return T[lang()] || T.es; }

  /* ---------- pregunta de cierre por sector ---------- */
  var PREG = {
    restaurante: { es: '¿Con cuál te quedas', en: 'Which one would you pick', de: 'Welche nimmst du', fr: 'Laquelle choisis-tu' },
    peluqueria:  { es: '¿Te atreverías con este cambio', en: 'Would you dare this change', de: 'Traust du dich', fr: 'Oserais-tu ce changement' },
    estetica:    { es: '¿Cuál te harías', en: 'Which would you get', de: 'Welche würdest du nehmen', fr: 'Laquelle ferais-tu' },
    gimnasio:    { es: '¿Lo pruebas esta semana', en: 'Will you try it this week', de: 'Probierst du es diese Woche', fr: 'Tu essaies cette semaine' },
    tienda:      { es: '¿Cómo lo combinarías', en: 'How would you style it', de: 'Wie würdest du es kombinieren', fr: 'Comment l\'assortirais-tu' },
    cafeteria:   { es: '¿Con cuál empiezas el día', en: 'Which starts your day', de: 'Womit startest du', fr: 'Par lequel commences-tu' },
    talleres:    { es: '¿Te suena este problema', en: 'Sound familiar', de: 'Kennst du das', fr: 'Ça te parle' },
    creador:     { es: '¿Lo harías tú', en: 'Would you do it', de: 'Würdest du das machen', fr: 'Le ferais-tu' }
  };
  function pregunta() { var P = perfil(), L = lang(), d = PREG[P.id]; return (d && d[L]) || (d && d.es) || '¿Qué te parece'; }

  function rellena(s) {
    return String(s)
      .replace(/\{neg\}/g, neg())
      .replace(/\{sector\}/g, perfil().corto)
      .replace(/\{ciudad\}/g, ciudadCorta())
      .replace(/\{prodC\}/g, prod(true))
      .replace(/\{prod\}/g, prod(false))
      .replace(/\{pregunta\}/g, pregunta())
      .replace(/\{idioma\}/g, perfil().idioma.nombre);
  }

  /* ---------- pestaña en el menú ---------- */
  var tabC = { id: 'crecer', ic: '🚀' };
  Object.defineProperty(tabC, 'nm', { enumerable: true, get: function () { return t().tab; } });
  var pos = -1; for (var i = 0; i < TABS.length; i++) if (TABS[i].id === 'calendario') pos = i;
  if (!tabYaEsta()) TABS.splice(pos >= 0 ? pos + 1 : TABS.length, 0, tabC);
  function tabYaEsta() { for (var j = 0; j < TABS.length; j++) if (TABS[j].id === 'crecer') return true; return false; }

  var SUBS = ['video', 'ritmo', 'horas', 'tags', 'semana', 'dinero', 'reglas'];
  var sub = 'video';

  var panelOriginal = window.panel;
  window.panel = function (tab) {
    if (tab !== 'crecer') return panelOriginal.apply(this, arguments);
    TAB = tab; pintarNav();
    $('main').innerHTML = vCrecer();
  };
  function repinta() { if (TAB === 'crecer') window.panel('crecer'); }
  window.crVer = function (s) { sub = s; repinta(); };

  /* ---------- vista ---------- */
  function vCrecer() {
    var L = t();
    var h = '<div class="hd"><h2>' + L.titulo + '</h2><span class="chip">' + esc(perfil().icono + ' ' + perfil().corto) + '</span></div>';
    h += '<div class="cr-intro"><b>' + esc(L.introT) + '</b><p>' + esc(rellena(L.introP)) + '</p></div>';
    if (traducido()) h += '<div class="cr-aviso" style="border-color:rgba(139,92,246,.4);background:rgba(139,92,246,.08)">' + esc(rellena(T.es.iaNota)) + '</div>';
    h += '<div class="cr-sub" role="group" aria-label="Secciones de Crecer">';
    SUBS.forEach(function (s) {
      h += '<button class="' + (sub === s ? 'on' : '') + '" aria-pressed="' + (sub === s) + '" onclick="crVer(\'' + s + '\')">' + L.sub[s] + '</button>';
    });
    h += '</div>';
    if (sub === 'video') h += vVideo();
    else if (sub === 'ritmo') h += vRitmo();
    else if (sub === 'horas') h += vHoras();
    else if (sub === 'tags') h += vTags();
    else if (sub === 'semana') h += vSemana();
    else if (sub === 'dinero') h += vDinero();
    else if (sub === 'reglas') h += vReglas();
    return h;
  }

  function f(cl, txt) { return '<span class="cr-fuente ' + cl + '">' + txt + '</span>'; }

  function vVideo() {
    var L = t();
    var h = '<div class="card"><h3>🎬 ' + esc(L.vTit) + f('of', 'OFICIAL') + '</h3>';
    h += '<p style="color:var(--tx2);font-size:13.5px;margin:0 0 16px">' + esc(L.vSub) + '</p>';
    L.vSteps.forEach(function (st, n) {
      h += '<div class="cr-step"><div class="cr-num">' + (n + 1) + '</div><div><div class="t">' + esc(st[0]) + '</div><div class="d">' + esc(st[1]) + '</div>' +
        '<div class="cr-eg"><div class="lbl">' + (lang() === 'en' ? 'Example' : lang() === 'de' ? 'Beispiel' : lang() === 'fr' ? 'Exemple' : 'Ejemplo') + ' · ' + esc(perfil().corto) + '</div>' + esc(rellena(st[2])) + '</div></div></div>';
    });
    h += '<div class="cr-nota">💡 ' + esc(rellena(L.vNota)) + '</div></div>';
    return h;
  }

  function vRitmo() {
    var L = t();
    var h = '<div class="card"><h3>📆 ' + esc(L.rTit) + f('es', 'ESTUDIO') + '</h3>';
    h += '<p style="color:var(--tx2);font-size:13.5px;margin:0 0 10px">' + esc(L.rSub) + '</p>';
    h += '<table class="cr-tabla"><thead><tr><th>' + L.rCols[0] + '</th><th>' + L.rCols[1] + '</th><th>' + L.rCols[2] + '</th></tr></thead><tbody>';
    L.rRows.forEach(function (r) {
      h += '<tr><td><b>' + esc(r[0]) + '</b></td><td class="q">' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>';
    });
    h += '</tbody></table><div class="cr-nota">⏱️ ' + esc(L.rNota) + '</div></div>';
    return h;
  }

  function vHoras() {
    var L = t(), P = perfil(), mej = (P.horas && P.horas.mejores) || [];
    var DIASCORTO = { es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] };
    var dc = DIASCORTO[lang()] || DIASCORTO.es;
    var h = '<div class="card"><h3>⏰ ' + esc(rellena(L.hTit)) + f('op', 'OPINIÓN') + '</h3>';
    h += '<p style="color:var(--tx2);font-size:13.5px;margin:0 0 6px">' + esc(L.hSub) + '</p>';
    mej.forEach(function (m) {
      var dias = (m.dias || []).map(function (d) { return dc[d]; }).join(' ');
      h += '<div class="cr-hora"><div class="cr-hh">' + esc(m.hora) + '</div><span class="cr-hf">' + esc(L.hFmt[m.formato] || m.formato) + '</span>' +
        '<div class="cr-hp"><b style="color:var(--tx)">' + esc(dias) + '</b> · ' + esc(m.por) + '</div></div>';
    });
    if (!mej.length) h += '<div class="cr-nota">Elige tu tipo de negocio en «Mi negocio» para ver tus mejores horas.</div>';
    return h + '</div>';
  }

  function hashtagsDe() {
    var P = perfil(), tags = (P.hashtags || []).slice();
    var cityT = '#' + ciudadCorta().replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/g, '');
    var loc = [], sec = [];
    tags.forEach(function (x) { if (/palma|mallorca|baleares|barcelona|madrid|valencia/i.test(x)) loc.push(x); else sec.push(x); });
    // garantizar el hashtag de la ciudad del negocio
    var hayCiudad = loc.some(function (x) { return x.toLowerCase() === cityT.toLowerCase(); });
    if (!hayCiudad && cityT.length > 1) loc.unshift(cityT);
    if (!loc.length) loc = ['#Mallorca'];
    return { loc: loc, sec: sec, cinco: loc.slice(0, 2).concat(sec.slice(0, 3)).slice(0, 5) };
  }
  function vTags() {
    var L = t(), H = hashtagsDe();
    var h = '<div class="card"><h3>#️⃣ ' + esc(rellena(L.tagTit)) + f('of', 'OFICIAL') + '</h3>';
    h += '<p style="color:var(--tx2);font-size:13.5px;margin:0 0 12px">' + esc(L.tagSub) + '</p>';
    h += '<div style="font-size:12px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">' + esc(L.tagLoc) + '</div><div class="cr-tags">';
    H.loc.forEach(function (x) { h += '<span class="cr-tag loc">' + esc(x) + '</span>'; });
    h += '</div><div style="font-size:12px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">' + esc(L.tagSec) + '</div><div class="cr-tags">';
    H.sec.forEach(function (x) { h += '<span class="cr-tag sec">' + esc(x) + '</span>'; });
    h += '</div>';
    h += '<div class="cr-copi"><button class="btn pp sm" onclick="crCopiar()" data-tags="' + esc(H.cinco.join(' ')) + '" id="crTags">' + L.tagCopi + ': ' + esc(H.cinco.join(' ')) + '</button></div>';
    h += '<div class="cr-nota">🔍 ' + esc(rellena(L.tagNota)) + '</div></div>';
    return h;
  }
  window.crCopiar = function () {
    var b = document.getElementById('crTags'); if (!b) return;
    var txt = b.getAttribute('data-tags') || '';
    var ok = function () { toast(t().copiado); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(ok, function () { toast(txt); }); return; } } catch (e) {}
    toast(txt);
  };

  function vSemana() {
    var L = t();
    var h = '<div class="card"><h3>🗓️ ' + esc(L.sTit) + f('op', 'OPINIÓN') + '</h3>';
    h += '<p style="color:var(--tx2);font-size:13.5px;margin:0 0 10px">' + esc(L.sSub) + '</p>';
    L.sPlan.forEach(function (p, n) {
      h += '<div class="cr-dia"><div class="cr-dd">' + esc(L.sDias[n]) + '</div><span class="cr-dfmt ' + p[0] + '">' + esc(L.hFmt[p[0]] || p[0]) + '</span><div class="cr-di">' + esc(rellena(p[1])) + '</div></div>';
    });
    h += '<div class="cr-nota">📌 ' + esc(L.sNota) + '</div></div>';
    return h;
  }

  function vDinero() {
    var L = t();
    var h = '<div class="card"><h3>💶 ' + esc(L.mTit) + f('op', 'OPINIÓN') + '</h3>';
    h += '<p style="color:var(--tx2);font-size:13.5px;margin:0 0 14px">' + esc(L.mSub) + '</p>';
    L.mRows.forEach(function (r, n) {
      h += '<div class="cr-mon"><div class="cr-mr">' + (n + 1) + '</div><div><div class="t">' + esc(r[0]) + '</div><div class="d">' + esc(r[1]) + '</div></div></div>';
    });
    h += '<div class="cr-aviso">⚠️ ' + L.mAviso + '</div></div>';
    return h;
  }

  function vReglas() {
    var L = t();
    var h = '<div class="card"><h3>🛡️ ' + esc(L.gTit) + f('of', 'OFICIAL') + '</h3>';
    L.gRows.forEach(function (r) {
      h += '<div class="cr-regla"><div class="cr-ri">' + r[0] + '</div><div><div class="t">' + esc(r[1]) + '</div><div class="d">' + esc(r[2]) + '</div></div></div>';
    });
    h += '<div class="cr-nota">🚫 ' + (lang() === 'en' ? 'Never buy followers or likes: the algorithm notices and it breaks the rules.' : lang() === 'de' ? 'Niemals Follower oder Likes kaufen: der Algorithmus merkt es und es verstößt gegen die Regeln.' : lang() === 'fr' ? 'N\'achète jamais de followers ni de likes : l\'algorithme le détecte et c\'est contraire aux règles.' : 'Nunca compres seguidores ni «me gusta»: el algoritmo lo nota y es contrario a las normas.') + '</div></div>';
    return h;
  }

  /* ---------- reaccionar al cambio de sector/idioma ---------- */
  window.addEventListener('chispa:sector', function () { if (TAB === 'crecer') repinta(); });

  /* ---------- arranque ---------- */
  if (typeof pintarNav === 'function') pintarNav();
  var hs = location.hash || '';
  if (hs.indexOf('crecer') >= 0) { vista('panel'); window.panel('crecer'); }
}());
