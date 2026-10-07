// Guion del vídeo largo de Chispa (≈ 6 min). Cada escena: rótulo, y frases (t = lo que se oye y
// se subtitula; voz = cómo se le dice a la voz si hace falta otra pronunciación; a = lo que se hace
// en pantalla mientras se oye esa frase).
const PORTADA = `<div class="bolt">⚡</div><h1><span>Chispa</span></h1><p>Tu marketing en automático</p>
<p style="font-size:20px;color:#9aa3b5;margin-top:10px">Guía paso a paso para dueños de negocio</p>
<div class="pie">Ejemplo real: El Paraíso · Bar Restaurante · Palma</div>`;
const CIERRE = `<div class="bolt">⚡</div><h1>Tú atiendes tu negocio.<br><span>Chispa llena tus redes.</span></h1>
<p>Pide una demostración con tu propio negocio</p><div class="url">solers-es.github.io/chispa-demo</div>
<div class="pie">Una herramienta de Solers</div>`;

const card = i => `#cmCard_${i}`;
async function irPanel(h, tab) {
  await h.v(t => { vista('panel'); if (t) panel(t); window.scrollTo(0, 0); }, tab || null);
  await h.esperar(800);
}
async function asegurarPosts(h) {
  const n = await h.v(() => document.querySelectorAll('.cm-card').length);
  if (!n) { await irPanel(h, 'asistente'); }
}

module.exports = {
  escenas: [
    {
      id: 'portada', entrada: 300,
      preparar: async h => { await h.v(() => vista('landing')); await h.v(() => window.__V.cursorVisible(false)); await h.tarjeta(PORTADA); await h.esperar(900); },
      segs: [
        { t: 'Esto es Chispa: el asistente que lleva las redes sociales de tu negocio mientras tú atiendes a tus clientes.' },
        { t: 'En los próximos minutos te enseño, paso a paso, todo lo que hace. El ejemplo es El Paraíso, un bar restaurante de Palma.', pausa: 0.6 },
      ],
      despues: async h => { await h.quitarTarjeta(); await h.v(() => window.__V.cursorVisible(true)); },
    },
    {
      id: 'que-es', rotulo: ['1', 'Qué es Chispa', 'Para quién es y qué hace'],
      preparar: async h => { await h.v(() => { vista('landing'); window.scrollTo(0, 0); }); await h.mover(720, 520, 10); },
      segs: [
        { t: 'Chispa es para el dueño de un negocio que no tiene tiempo, ni ganas, de pelearse con Instagram.', a: async h => { await h.esperar(1200); await h.resaltar('#landing h1', 2200); } },
        { t: 'Escribe tus publicaciones, les pone imagen, las programa a la mejor hora, te ayuda a contestar a tus clientes y te dice qué funciona.',
          a: async h => { await h.mover(700, 600); await h.scrollSuave(null, 500); await h.esperar(600); } },
        { t: 'Y no hace falta saber nada de redes: se lo pides con tus palabras, como se lo pedirías a un empleado.',
          a: async h => { await h.scrollSuave(null, 0); await h.clic('text=Ver cómo funciona por dentro', { despues: 1200 }); } },
      ],
    },
    {
      id: 'asistente', rotulo: ['2', 'El Asistente', 'Pídele las cosas en lenguaje normal'],
      preparar: async h => { await irPanel(h, 'asistente'); await h.esperar(1500); },
      segs: [
        { t: 'Este es el panel de tu negocio. A la izquierda, todas las secciones. Empezamos por el Asistente.',
          a: async h => { await h.resaltar('#nav', 1800); } },
        { t: 'Le escribes la idea en una frase. Por ejemplo: paella de marisco este domingo.',
          a: async h => { await h.escribir('#idea', 'Paella de marisco este domingo', 70); } },
        { t: 'Pulsas «Que Chispa lo escriba», y en un momento tienes varias versiones, cada una con su texto, sus etiquetas y su foto.',
          a: async h => { await h.clic('button:has-text("Que Chispa lo escriba")', { despues: 2200 }); await h.verEn(card(0), 'start'); await h.mover(900, 400); } },
        { t: 'Cada versión usa un enfoque distinto: una va directa al grano, otra empuja con una oferta, y otra hace una pregunta para que la gente comente.',
          a: async h => { await h.resaltar(`${card(0)} .cm-top`, 1600); await h.resaltar(`${card(1)} .cm-top`, 1600); } },
        { t: 'Y si prefieres hablar, abajo a la derecha está «Pídeselo a Chispa». Le dices «programa la semana» o «¿cuál es la mejor hora?», con tus palabras.',
          a: async h => { await h.clic('#agFab', { despues: 1500 }); await h.clic('#qs button:has-text("¿Cuál es la mejor hora?")', { despues: 600 }); } },
        { t: 'Y te contesta con la respuesta pensada para tu negocio.', a: async h => { await h.esperar(2600); }, pausa: 1.2 },
      ],
      despues: async h => { await h.cerrarTodo(); },
    },
    {
      id: 'estudio', rotulo: ['3', 'Estudio de contenido', 'Imagen con movimiento, tu marca y tus botones'],
      preparar: async h => { await asegurarPosts(h); await h.cerrarTodo(); await h.v(() => document.querySelector('#cmCard_0').scrollIntoView({ block: 'start' })); await h.v(() => window.scrollBy(0, -90)); },
      segs: [
        { t: 'Ahora miramos una publicación de cerca.', a: async h => { await h.mover(500, 450); await h.zoom(`${card(0)} .cm-media`, 1.45); } },
        { t: 'La foto no está quieta: tiene un movimiento suave y el titular entra animado, como un vídeo corto. Se puede descargar como imagen o como vídeo vertical.',
          a: async h => { await h.esperar(2500); } },
        { t: 'Arriba lleva el sello de tu marca, con tu logo y tu nombre. Sale en todas las imágenes.',
          a: async h => { await h.sinZoom(); await h.resaltar(`${card(0)} .sello`, 2200); } },
        { t: 'Debajo van los botones que tu cliente puede pulsar: Reservar, Ver carta o Cómo llegar. Usan los enlaces de tu propio negocio.',
          a: async h => { await h.verEn(`${card(0)} .cm-ctas`); await h.resaltar(`${card(0)} .cm-ctas`, 2400); } },
        { t: '¿No te convence la foto? Pides otra versión. ¿Tienes una tuya? La subes desde el móvil, foto o vídeo.',
          a: async h => { await h.clic(`${card(0)} .cm-acts button >> nth=0`, { despues: 1800 }); await h.apuntar(`${card(0)} .cm-acts button >> nth=1`); await h.resaltar(`${card(0)} .cm-acts button >> nth=1`, 1400); } },
        { t: 'Y con «Editar» lo cambias todo: el texto, el titular, los botones, la fecha, y el formato: post, carrusel, historia o reel.',
          voz: 'Y con «Editar» lo cambias todo: el texto, el titular, los botones, la fecha, y el formato: post, carrusel, historia o ril.',
          a: async h => { await h.clic(`${card(0)} .cm-acts button >> nth=2`, { despues: 1200 }); await h.scrollSuave('#modalBox', 500); await h.esperar(1200); }, pausa: 0.8 },
      ],
      despues: async h => { await h.cerrarTodo(); },
    },
    {
      id: 'publicar', rotulo: ['4', 'Publicar en todas tus redes', '«Así lo ve tu cliente»'],
      preparar: async h => { await asegurarPosts(h); await h.cerrarTodo(); await h.v(() => document.querySelector('#cmCard_0 .cm-acts').scrollIntoView({ block: 'center' })); },
      segs: [
        { t: 'Cuando te gusta, pulsas «Así lo ve tu cliente».', a: async h => { await h.clic(`${card(0)} .cm-acts button >> nth=4`, { despues: 1200 }); } },
        { t: 'Ves la misma publicación tal como saldrá en cada sitio: Instagram, con sus historias y sus reels, TikTok, Facebook, WhatsApp, Google y YouTube.',
          voz: 'Ves la misma publicación tal como saldrá en cada sitio: Instagram, con sus historias y sus rils, TikTok, Facebook, WhatsApp, Google y YouTube.',
          a: async h => { await h.mover(700, 500); for (const y of [520, 1100, 1700, 2300]) { await h.scrollSuave('#cmBox', y); await h.esperar(900); } } },
        { t: 'Así no hay sorpresas: compruebas que se lee bien antes de que nadie la vea.', a: async h => { await h.scrollSuave('#cmBox', 0); } },
        { t: 'Y para publicar, eliges las redes y pulsas un botón. Mira la demostración.',
          a: async h => { await h.cerrarTodo(); await h.v(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await h.esperar(900); await h.clic('button:has-text("Ver demo de publicación")', { despues: 600 }); } },
        { t: 'Chispa marca Instagram, TikTok, Facebook y tu ficha de Google, y te enseña la vista previa de cada una.', a: async h => { await h.mover(330, 420); await h.esperar(5500); } },
        { t: 'Una cosa clara: en esta demostración no se sube nada de verdad. Hoy, Chispa te deja cada publicación preparada para subirla con un toque.',
          a: async h => { await h.mover(820, 140); await h.resaltar('#cmBox >> text=No se sube nada de verdad', 1800); } },
        { t: 'Cuando conectes tus cuentas, y cada red dé su permiso, se publica sola.', a: async h => { await h.esperar(6000); }, pausa: 1.0 },
      ],
      despues: async h => { await h.cerrarTodo(); },
    },
    {
      id: 'calendario', rotulo: ['5', 'Calendario', 'Tu semana planificada a las mejores horas'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'asistente'); },
      segs: [
        { t: 'Todo lo que preparas va al calendario. Cada color es una red, y cada publicación dice si está en borrador, programada o publicada.',
          a: async h => { await h.pestana('Calendario'); await h.esperar(500); await h.verEn('.ag-sem, #main', 'start').catch(() => { }); await h.rueda(330); await h.mover(760, 600); } },
        { t: 'Las casillas con brillo son las mejores horas para un restaurante en Palma.', a: async h => { await h.mover(1300, 470); await h.esperar(900); await h.mover(1150, 600); } },
        { t: 'Con «Planificar mi semana», Chispa reparte tus publicaciones en esas horas y te explica por qué: el menú, a las once y media; los planes de noche, a las seis y media; y los reels, a las ocho y media.',
          voz: 'Con «Planificar mi semana», Chispa reparte tus publicaciones en esas horas y te explica por qué: el menú, a las once y media; los planes de noche, a las seis y media; y los rils, a las ocho y media.',
          a: async h => { await h.scrollSuave(null, 0); await h.clic('#main button:has-text("Planificar mi semana")', { despues: 1500 }); await h.mover(700, 420); await h.esperar(2500); await h.rueda(250); } },
        { t: 'También entiende franjas y promociones. Le puedes decir: «pon una promo el viernes de seis a once de la noche, con cuatro historias», y lo reparte él solo.',
          a: async h => { await h.scrollSuave(null, 0); await h.clic('#main button:has-text("Pon una promo el viernes")', { despues: 1500 }); await h.mover(700, 430); await h.esperar(1500); } },
        { t: 'Las publicaciones se arrastran de un día a otro, y lo puedes ver por semana, por mes o en lista. Y si quieres, te avisa a la hora de publicar.',
          a: async h => { await h.clic('#main button:text-is("Mes")', { despues: 1800 }); await h.clic('#main button:text-is("Semana")', { despues: 600 }); await h.scrollSuave(null, 0); await h.apuntar('#main button:has-text("Avisarme a la hora")'); } },
      ],
    },
    {
      id: 'resenas', rotulo: ['6', 'Reseñas', 'Contestadas en el idioma del cliente'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'calendario'); },
      segs: [
        { t: 'En Reseñas, Chispa junta las opiniones de Google, TripAdvisor y TheFork, y te propone una respuesta para cada una.',
          voz: 'En Reseñas, Chispa junta las opiniones de Google, TripAdvisor y de Fork, y te propone una respuesta para cada una.',
          a: async h => { await h.pestana('Reseñas'); await h.rueda(420); } },
        { t: 'Contesta en el tono de tu negocio y en el idioma del cliente: si te escriben en inglés, responde en inglés.',
          a: async h => { await h.verEn('#main >> text=Lovely spot in Palma'); await h.resaltar('#main >> text=Hi Emma', 2600); } },
        { t: 'Pulsas «Responder» y listo. Si no te convence, pides otra versión, o la cambias a mano.',
          a: async h => { await h.scrollSuave(null, 0); await h.rueda(420); await h.clic('#main button:has-text("Otra versión") >> nth=0', { despues: 1300 }); await h.clic('#main button:has-text("Responder") >> nth=0', { despues: 1200 }); } },
        { t: 'Las buenas se pueden contestar solas. Las negativas, nunca: Chispa te avisa para que las mires tú, con calma.',
          a: async h => { await h.scrollSuave(null, 0); await h.clic('#main button:has-text("Negativas")', { despues: 1200 }); } },
        { t: 'Lo que ves aquí son reseñas de ejemplo. Al conectar tu ficha de Google, Chispa trabaja con las de verdad.',
          a: async h => { await h.resaltar('#main >> text=Estás viendo reseñas de ejemplo', 2500); } },
      ],
    },
    {
      id: 'mensajes', rotulo: ['7', 'Comentarios y mensajes', 'Respuestas listas, tú das el visto bueno'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'resenas'); },
      segs: [
        { t: 'Lo mismo con los comentarios y los mensajes privados de Instagram y Facebook.', a: async h => { await h.pestana('Comentarios'); } },
        { t: 'Chispa prepara la respuesta: si alguien pregunta el horario, o quiere reservar para ocho, ya tienes la contestación escrita.',
          a: async h => { await h.resaltar('#main >> text=Quiero reservar para 8 personas', 1500); await h.zoom('#main >> text=Para 8 personas el viernes', 1.3); await h.esperar(1500); await h.sinZoom(); } },
        { t: 'Pero no sale nada sin tu visto bueno. La apruebas con un clic, o la cambias.',
          a: async h => { await h.clic('#main button:has-text("Aprobar y enviar") >> nth=0', { despues: 1200 }); }, pausa: 0.8 },
      ],
    },
    {
      id: 'automatizaciones', rotulo: ['8', 'Automatizaciones', 'Lo que Chispa hace sola'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'bandeja'); },
      segs: [
        { t: 'En Automatizaciones enciendes lo que quieres que Chispa haga sola.', a: async h => { await h.pestana('Automatizaciones'); } },
        { t: 'Proponer respuesta a cada reseña, contestar solas las de cuatro y cinco estrellas, avisarte de las negativas, publicar el menú del día a las once, o recordar a tus clientes su reserva por WhatsApp.',
          a: async h => { await h.mover(760, 500); await h.rueda(500, 16, 1600); await h.esperar(1500); await h.rueda(500, 16, 1600); } },
        { t: 'Cada una dice con sinceridad qué funciona ya y qué permiso falta. Si falta una conexión, la dejas encendida, y empieza sola cuando conectes.',
          a: async h => { await h.resaltar('#main >> text=Funciona dentro de la app', 1600); await h.clic('#main button:has-text("Ver cómo queda")', { despues: 2500 }); await h.cerrarTodo(); } },
      ],
    },
    {
      id: 'anuncios', rotulo: ['9', 'Anuncios', 'Preparados para lanzar en Instagram y Facebook'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'automatizaciones'); },
      segs: [
        { t: 'En Anuncios eliges qué quieres conseguir, por ejemplo más reservas, a quién va dirigido y cuánto quieres gastar al día.',
          a: async h => { await h.pestana('Anuncios'); await h.resaltar('#main select', 1200); await h.resaltar('#adPub', 1000); await h.resaltar('#adPres', 1000); } },
        { t: 'Chispa prepara el texto del anuncio con sus botones, y te calcula lo que gastas al mes.',
          a: async h => { await h.clic('#main button:has-text("Que Chispa prepare el anuncio")', { despues: 1500 }); await h.verEn('#main >> text=Objetivo:'); await h.resaltar('#main >> text=Objetivo:', 1800); } },
        { t: 'Lo dejas listo para lanzarlo desde tu cuenta de anuncios de Meta.', pausa: 0.8 },
      ],
    },
    {
      id: 'estadisticas', rotulo: ['10', 'Estadísticas', 'Qué funciona y qué no'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'anuncios'); },
      segs: [
        { t: 'En Estadísticas ves lo que pasa en tus redes. Los datos de Instagram son reales: El Paraíso tiene hoy mil doscientos seis seguidores.',
          a: async h => { await h.pestana('Estadísticas'); await h.zoom('#main >> text=DATO REAL', 1.35); await h.esperar(2000); await h.sinZoom(); } },
        { t: 'Lo que lleva la etiqueta «ejemplo» es para enseñarte el panel. Cuando conectes las redes, se rellena solo.',
          a: async h => { await h.mover(760, 520); await h.rueda(620, 16, 1400); await h.esperar(1200); } },
        { t: 'Y lo más útil son los consejos: Chispa te dice a qué hora te ven más, qué formato funciona mejor y cuántas veces publicar.',
          a: async h => { await h.verEn('#main >> text=Consejos para el algoritmo', 'start'); await h.v(() => window.scrollBy({ top: -100, behavior: 'smooth' })); await h.esperar(800); await h.resaltar('#main >> text=Mejor hora', 1500); } },
      ],
    },
    {
      id: 'mi-negocio', rotulo: ['11', 'Mi negocio', 'Tus datos, tu ficha de Google y tus botones'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'stats'); },
      segs: [
        { t: 'En Mi negocio están tus datos: el nombre, la dirección, tu web, tu carta y tus reservas.', a: async h => { await h.pestana('Mi negocio'); await h.esperar(600); } },
        { t: 'Estos datos los usan todos los botones de Chispa. «Reservar» lleva a tu página de reservas, «Ver carta» a tu carta, y «Cómo llegar» abre Google Maps.',
          a: async h => { await h.resaltar('#main button:has-text("Reservar") >> nth=0', 1300); await h.resaltar('#main button:has-text("Ver carta") >> nth=0', 1200); await h.resaltar('#main button:has-text("Cómo llegar") >> nth=0', 1200); } },
        { t: 'También lleva tu ficha de Google, que es lo primero que ve quien te busca: novedades, ofertas, horario y fotos, en cuanto Google dé el permiso.',
          a: async h => { await h.verEn('#main >> text=Tu ficha de Google', 'start'); await h.v(() => window.scrollBy({ top: -110, behavior: 'smooth' })); await h.esperar(700); await h.mover(700, 420); } },
        { t: 'Y para rellenarlo no hace falta escribir nada: pegas cualquier enlace, y Chispa lo coloca en su sitio.',
          a: async h => { await h.verEn('#main >> text=Rellénalo en un momento'); await h.resaltar('#main >> text=PEGA AQUÍ CUALQUIER ENLACE', 0); await h.esperar(2000); await h.v(() => window.__V.apagar()); } },
      ],
    },
    {
      id: 'conexiones', rotulo: ['12', 'Conexiones', 'Tu negocio conectado en 5 minutos'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'ajustes'); },
      segs: [
        { t: 'Por último, Conexiones: una guía de cinco minutos para unir tu ficha de Google, Instagram, Facebook, TikTok, YouTube y WhatsApp.',
          a: async h => { await h.pestana('Conexiones'); await h.mover(760, 500); await h.rueda(700, 18, 2200); } },
        { t: 'Se hace una sola vez. A partir de ahí, Chispa usa tus enlaces en cada publicación, y queda lista para publicar sola en cuanto cada red apruebe la conexión.',
          a: async h => { await h.rueda(700, 18, 2200); await h.scrollSuave(null, 0); } },
      ],
    },
    {
      id: 'cierre', entrada: 300,
      preparar: async h => { await h.v(() => window.__V.cursorVisible(false)); await h.tarjeta(CIERRE); await h.esperar(900); },
      segs: [
        { t: 'Lo has visto con un bar restaurante, pero Chispa está pensada para cualquier negocio de cara al público: en Mi negocio eliges tu sector y el tono con el que quieres hablar.' },
        { t: 'Tú atiendes tu negocio; Chispa llena tus redes.' },
        { t: '¿Lo probamos con el tuyo? Pídenos una demostración.', pausa: 1.5 },
      ],
      salida: 1.0,
    },
  ],
};
