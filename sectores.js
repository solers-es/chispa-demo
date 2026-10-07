/* ──────────────────────────────────────────────────────────────────────────
   Chispa · TIPO DE NEGOCIO (perfiles de sector)  — trabajador E

   Una entrada por sector en PERFILES (8: restaurante, peluquería, estética,
   gimnasio, tienda, cafetería, talleres y creador de contenido). Al elegir un sector, Chispa se adapta:
     · botón principal y CTA (Reservar mesa / Pedir cita / Comprar / Pedir
       presupuesto / Apuntarme…) con el enlace que rellena el negocio
       (Booksy, Treatwell, su web, WhatsApp). Chispa NO hace agendas de citas.
     · ideas, plantillas de publicaciones, hashtags y tono por defecto
     · mejores horas y franjas de promoción (datos para el calendario)
     · búsquedas y temas de imagen (para el motor de imágenes)
     · respuestas tipo a reseñas y mensajes, automatizaciones sugeridas
     · etiquetas del panel («mesa», «carta», «reservas» → lo equivalente)

   «Restaurante y bar» es el perfil de El Paraíso: con él NO se cambia nada de
   lo que ya hacen los demás ficheros (cambia:false).

   Para añadir un sector: copiar una entrada de PERFILES y cambiar los textos.
   PENDIENTE a propósito: clínicas, dentistas, fisios, farmacias y abogados
   (tienen reglas propias de publicidad sanitaria o deontológica).

   Datos para los demás módulos (sin tocar sus ficheros):
     ChispaSector.actual()            → perfil del negocio abierto
     ChispaSector.actual().horas      → {mejores:[{dias,hora,formato,por}], franjas:[…]}
     ChispaSector.actual().imagen     → {busquedas:[…], prompt, temas}
     ChispaSector.semana()            → publicaciones de una semana tipo, con la forma de item de la agenda (y su foto)
     ChispaSector.horasDe(dia)        → mejores horas de ese día (0 = lunes)
     window 'chispa:sector'           → evento al cambiar de sector
     ChispaSector.actual().idioma     → {codigo BCP-47, nombre, base, rtl, plantillas:'propias'|'ia', traduceIA}
     ChispaSector.paraIA()            → idioma, tono, CTA, hashtags y qué textos (en español) debe escribir la IA
     ChispaSector.idioma(cod, nombre) / ChispaSector.cta(texto) → cambian idioma y botón principal
   Sin FileReader. Todo en español.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (!window.S || !window.TABS) return;

  /* ---------- fotos libres (Unsplash, licencia libre; comprobadas una a una) ---------- */
  function U(id, w, h) { return 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&q=80&w=' + w + (h ? '&h=' + h : ''); }

  var L5 = [0, 1, 2, 3, 4], TODOS = [0, 1, 2, 3, 4, 5, 6];

  /* =====================================================================
     PERFILES — una entrada por sector
     ===================================================================== */
  var PERFILES = [
    {
      id: 'restaurante', nombre: 'Restaurante y bar', corto: 'restaurante', icono: '🍽️', cambia: false,
      iconos: ['🍽️', '🍷', '🍻', '🥘', '🍕', '🍔'],
      detectar: /restaur|\bbar\b|tasca|tabern|asador|marisquer|pizzer|tapas|gastro|bistr|chiringuito|burger|hamburgues|cocina|comida|cervecer|vinoteca|bodega/,
      tono: 'Cercano y con chispa', color: '#8b5cf6',
      cta: { texto: 'Reservar mesa', icono: '📅', frase: 'Reserva tu mesa', enlaces: 'TheFork, tu web de reservas o WhatsApp', en: 'Book a table', de: 'Tisch reservieren', fr: 'Réserve ta table' },
      etq: { negocio: 'restaurante', reservas: 'reservas', reserva: 'reserva', carta: 'carta', verCarta: 'Ver carta', mesa: 'mesa', mesas: 'mesas' },
      hashtags: ['#restaurante', '#foodie', '#Palma', '#Mallorca'],
      horas: {
        mejores: [
          { dias: L5, hora: '11:30', formato: 'post', por: 'Menú del día: la gente decide dónde comer antes de las 12:30.' },
          { dias: [3, 4], hora: '18:30', formato: 'reel', por: 'Terraza y noche: se decide al salir de trabajar.' },
          { dias: TODOS, hora: '20:30', formato: 'reel', por: 'Sofá y móvil: el mejor momento para los reels.' },
          { dias: [5, 6], hora: '11:00', formato: 'post', por: 'Plan del fin de semana (paella, brunch).' }
        ],
        franjas: [
          { nombre: 'Menú del día', dias: L5, desde: '12:30', hasta: '16:00', tipo: 'promo' },
          { nombre: 'Happy hour', dias: [3, 4], desde: '18:00', hasta: '20:00', tipo: 'promo' },
          { nombre: 'Fin de semana', dias: [5, 6], desde: '12:00', hasta: '23:30', tipo: 'promo' }
        ]
      },
      imagen: { busquedas: ['restaurant food', 'paella', 'cocktails', 'tapas', 'terrace'], prompt: '' },
      automatizaciones: [
        'Menú del día en historias a las 11:00',
        'Recordatorio de la reserva por WhatsApp 3 h antes',
        'Pedir reseña de Google al día siguiente de venir',
        '«Hace 2 meses que no vienes»: invitación con un detalle'
      ],
      resenas: {
        positiva: '¡Muchas gracias, {autor}! Nos alegra un montón que disfrutaras. ¡Te esperamos pronto!',
        negativa: 'Sentimos mucho tu experiencia, {autor}. Ya lo hemos hablado con el equipo; escríbenos y te invitamos a volver.',
        pregunta: '¡Hola! Sí, puedes reservar desde el botón de reservas o por WhatsApp.'
      }
    },

    {
      id: 'peluqueria', nombre: 'Peluquería y barbería', corto: 'peluquería', icono: '✂️', cambia: true,
      iconos: ['✂️', '💈', '💇', '💇‍♂️', '🪒', '💆'],
      detectar: /pelu|barber|estilis|peinad|hair|coiff|corte de pelo|tinte|mechas|balayage/,
      tono: 'Cercano y con chispa', color: '#ec4899',
      cta: { texto: 'Pedir cita', icono: '✂️', frase: 'Pide tu cita', pregunta: 'Te guardamos hueco', whatsapp: 'Pedir cita por WhatsApp',
        mensaje: 'Hola, quiero pedir cita en {neg}', enlaces: 'Booksy, Treatwell, Fresha, tu web o WhatsApp',
        en: 'Book your appointment', de: 'Termin buchen', fr: 'Prends rendez-vous' },
      etq: { negocio: 'peluquería', reservas: 'citas', reserva: 'cita', carta: 'servicios y precios', verCarta: 'Ver servicios', mesa: 'hueco', mesas: 'huecos', iconoCarta: '💈' },
      hashtags: ['#peluqueria', '#barberia', '#cortedepelo', '#Palma', '#Mallorca'],
      ideas: ['Antes y después de un degradado', 'Mechas balayage para el otoño', 'Arreglo de barba con toalla caliente', 'Huecos libres esta semana',
        'Tratamiento de keratina', 'Corte + barba a precio cerrado', 'Peinados para bodas y eventos', 'Cómo cuidar el color en casa',
        'Os presentamos al equipo', 'Reseña de 5 estrellas de un cliente'],
      ofertas: ['-15% en tu primer corte', 'Corte + barba 20 €', 'Martes y miércoles, -10% en color', 'Trae a un amigo: 5 € menos a cada uno', 'Lavar y peinar 12 €'],
      plan: {
        post: ['Antes y después de la semana ✂️', 'Nuestros precios, claros', 'Reseña de 5★ de un cliente ⭐', 'El equipo de {neg}'],
        reel: ['Degradado en 30 segundos 🎬', 'Del pelo largo a corto 💇', 'Barba perfecta, paso a paso 🪒', 'Mechas: el proceso entero'],
        historia: ['Huecos libres de hoy 📸', 'Así está el salón ahora', 'Pregunta: ¿qué corte te harías?', 'Un día en {neg}'],
        oferta: ['{of}', 'Martes de color -10% 🎨', 'Corte + barba 20 €', 'Trae a un amigo y ahorráis los dos']
      },
      frases: {
        gancho: ['{idea} ✂️\n\nEn {neg} te lo dejamos perfecto. Pide tu cita.', 'Así queda {idea} 😍\n\nEn {neg}, con cita y sin esperas.'],
        oferta: ['Solo esta semana: {idea} 🔥\n\nQuedan pocos huecos en {neg}. Pide tu cita 📲', '¡{idea}! ⏰\n\nCoge tu hueco en {neg} antes de que se llene la agenda.'],
        pregunta: ['¿Te atreves con {idea}? 👀\n\nCuéntanoslo en comentarios 👇 y te asesoramos en {neg}.', '¿{idea}? 🤔 En {neg} te decimos qué te favorece. ¿Te animas?'],
        local: ['Si estás por Palma, esto es para ti: {idea} 💈\n\n{neg}, tu peluquería de confianza.', 'Palma, atención 📣 {idea} en {neg}. Etiqueta a quien necesita un cambio.']
      },
      horas: {
        mejores: [
          { dias: [1, 2, 3], hora: '09:00', formato: 'historia', por: 'Antes de abrir: es cuando se buscan huecos para la semana.' },
          { dias: [4], hora: '13:30', formato: 'historia', por: 'Huecos de última hora para el sábado.' },
          { dias: L5, hora: '21:00', formato: 'reel', por: 'Los antes/después se ven de noche, en el sofá.' },
          { dias: [6], hora: '20:00', formato: 'post', por: 'Domingo por la tarde se organiza la semana.' }
        ],
        franjas: [
          { nombre: 'Días flojos (promo de color)', dias: [1, 2], desde: '10:00', hasta: '14:00', tipo: 'promo' },
          { nombre: 'Viernes y sábado: siempre lleno', dias: [4, 5], desde: '09:00', hasta: '20:00', tipo: 'lleno' },
          { nombre: 'Bodas y comuniones', meses: [4, 5, 6], tipo: 'temporada' },
          { nombre: 'Vuelta de vacaciones', meses: [9], tipo: 'temporada' }
        ]
      },
      imagen: {
        busquedas: ['barbershop', 'hair salon', 'haircut', 'balayage', 'beard trim'],
        prompt: 'Professional Instagram photo of a modern hair salon and barbershop in Palma de Mallorca, stylish haircut, natural light, shallow depth of field, no text, no logos.',
        temas: [
          { id: 'corte', re: /barb|corte|degrad|fade|navaja|afeit|caballero|chico/, fotos: ['1503951914875-452162b0f3f1', '1585747860715-2ba37e788b70', '1512690459411-b9245aed614b'] },
          { id: 'pelo', re: /mecha|balayage|color|tinte|keratin|peinad|melena|rubi|novia|boda|largo|cuidar/, fotos: ['1522337360788-8b13dee7a37e', '1580618672591-eb180b1a973f'] },
          { id: 'salon', re: /./, fotos: ['1521590832167-7bcbfaa6381f', '1560066984-138dadb4c035', '1600948836101-f9ffda59d250', '1585747860715-2ba37e788b70'] }
        ]
      },
      automatizaciones: [
        'Recordatorio de la cita 24 h antes por WhatsApp',
        '«Hace 6 semanas que no vienes»: mensaje con el enlace para pedir cita',
        'Pedir reseña de Google 2 h después de la cita',
        'Huecos libres de última hora en historias, solos',
        'Felicitar el cumpleaños con un -10%'
      ],
      resenas: {
        positiva: '¡Muchas gracias, {autor}! Nos encanta que te guste cómo quedó. ¡Te esperamos para el próximo corte! 💈',
        negativa: 'Sentimos que el resultado no fuera el que esperabas, {autor}. Escríbenos y te damos cita para arreglarlo sin coste.',
        pregunta: '¡Hola! Puedes pedir cita desde el botón «Pedir cita» o por WhatsApp, y te confirmamos al momento.'
      },
      mensajes: [
        { av: '👩', nm: 'Laura', red: 'mensaje directo', tx: '¿Tenéis hueco el sábado por la mañana para corte y color?', sug: '¡Hola Laura! El sábado tenemos hueco a las 10:30. Pide la cita desde el botón y te la dejamos guardada ✂️' },
        { av: '🧔', nm: 'Marc', red: 'comentario en Instagram', tx: '¿Cuánto cuesta corte + barba?', sug: '¡Hola Marc! Corte + barba son 20 €. ¿Te guardamos hueco esta semana? 💈' },
        { av: '👱‍♀️', nm: 'Sofía', red: 'comentario en Facebook', tx: 'Me encantó cómo me dejasteis las mechas 😍', sug: '¡Gracias, Sofía! 😍 Nos alegra un montón. ¡Te esperamos para el retoque!' }
      ],
      resenasEj: [
        { autor: 'Javier M.', estrellas: 5, dias: 2, texto: 'El mejor degradado que me han hecho en Palma. Rápidos, atentos y con cita sin esperas.' },
        { autor: 'Elena R.', estrellas: 5, dias: 9, texto: 'Me hicieron unas mechas preciosas y me explicaron cómo cuidarlas. Repetiré seguro.' },
        { autor: 'Pau G.', estrellas: 3, dias: 15, texto: 'Buen corte, pero tuve que esperar 20 minutos aunque tenía cita.' },
        { autor: 'Nuria F.', estrellas: 4, dias: 30, texto: 'Muy buen trato y buen precio. El local es pequeño pero muy agradable.' }
      ],
      semana: [
        ['Antes y después', 'Esta semana', 'post', 'Así entró y así salió ✂️ Un cambio de los que alegran el día.', '#antesydespues #peluqueria #Palma'],
        ['Degradado en 30 segundos', 'Barbería', 'reel', 'Degradado, perfilado y listo 💈 ¿Te animas esta semana?', '#barberia #degradado #Palma'],
        ['Huecos libres hoy', 'Última hora', 'historia', 'Nos quedan dos huecos esta tarde ⏰ Pide tu cita desde el enlace.', '#Palma #peluqueria'],
        ['Martes de color', '-10% en color', 'post', 'Martes y miércoles, -10% en tinte y mechas 🎨 Pide tu cita.', '#mechas #color #Mallorca'],
        ['Lo que dicen de nosotros', '5 estrellas', 'post', '«El mejor degradado de Palma» ⭐⭐⭐⭐⭐ Gracias por confiar en nosotros.', '#Palma #barberia'],
        ['Peinados para bodas', 'Temporada de bodas', 'carrusel', 'Recogidos y peinados para bodas y eventos 👰 Pide tu prueba con tiempo.', '#peinadosdenovia #Palma']
      ],
      ejemplo: { nombre: 'Barbería Ejemplo', ciudad: 'Palma de Mallorca' }
    },

    {
      id: 'estetica', nombre: 'Estética, uñas y pestañas', corto: 'centro de estética', icono: '💅', cambia: true,
      iconos: ['💅', '💄', '👁️', '🧖', '🌸', '✨'],
      detectar: /est[eé]tica|uñas|nails|manicur|pedicur|pesta[nñ]|cejas|depila|\bspa\b|masaje|facial|belleza|beauty|nails|lash|micropig|maquill/,
      tono: 'Elegante y formal', color: '#fb7185',
      cta: { texto: 'Pedir cita', icono: '💅', frase: 'Pide tu cita', pregunta: 'Te guardamos hueco', whatsapp: 'Pedir cita por WhatsApp',
        mensaje: 'Hola, quiero pedir cita en {neg}', enlaces: 'Treatwell, Booksy, Fresha, tu web o WhatsApp',
        en: 'Book your appointment', de: 'Termin buchen', fr: 'Prends rendez-vous' },
      etq: { negocio: 'centro de estética', reservas: 'citas', reserva: 'cita', carta: 'tratamientos y precios', verCarta: 'Ver tratamientos', mesa: 'hueco', mesas: 'huecos', iconoCarta: '🌸' },
      hashtags: ['#unas', '#estetica', '#pestanas', '#Palma', '#Mallorca'],
      ideas: ['Manicura semipermanente de otoño', 'Lifting de pestañas: antes y después', 'Limpieza facial profunda', 'Diseño de cejas', 'Huecos libres esta semana',
        'Uñas para una boda', 'Masaje relajante de 45 minutos', 'Bono de 5 sesiones', 'Cómo cuidar tus uñas en casa', 'Reseña de 5 estrellas de una clienta'],
      ofertas: ['-20% en tu primera manicura', 'Lifting de pestañas + tinte 35 €', 'Bono 5 sesiones: 1 gratis', 'Ven con una amiga: -10% las dos', 'Pedicura + manicura 30 €'],
      plan: {
        post: ['Diseño de uñas de la semana 💅', 'Nuestros tratamientos y precios', 'Reseña de 5★ de una clienta ⭐', 'Te presentamos a {neg}'],
        reel: ['Manicura en 30 segundos 🎬', 'Lifting de pestañas: el proceso', 'Limpieza facial paso a paso ✨', 'Del antes al después'],
        historia: ['Huecos libres de hoy 📸', 'Colores nuevos de temporada', 'Encuesta: ¿qué diseño prefieres?', 'Un día en {neg}'],
        oferta: ['{of}', 'Bono 5 sesiones: 1 gratis', 'Ven con una amiga: -10%', 'Pedicura + manicura 30 €']
      },
      frases: {
        gancho: ['{idea} 💅\n\nEn {neg} lo cuidamos al detalle. Pide tu cita.', 'Así queda {idea} ✨\n\nEn {neg}, con cita y sin prisas.'],
        oferta: ['Solo esta semana: {idea} 🔥\n\nQuedan pocos huecos en {neg}. Pide tu cita 📲', '¡{idea}! ⏰\n\nReserva tu hueco en {neg} antes de que vuele.'],
        pregunta: ['¿Te apetece {idea}? 👀\n\nCuéntanoslo en comentarios 👇 En {neg} te asesoramos.', '¿{idea}? 🤔 En {neg} te ayudamos a elegir. ¿Te animas?'],
        local: ['Si estás por Palma, esto es para ti: {idea} 🌸\n\n{neg}, tu momento para ti.', 'Palma, atención 📣 {idea} en {neg}. Etiqueta a quien se lo merece.']
      },
      horas: {
        mejores: [
          { dias: [0, 1, 2], hora: '10:00', formato: 'historia', por: 'Se piden las citas de la semana a primera hora.' },
          { dias: [3, 4], hora: '13:30', formato: 'post', por: 'Antes del fin de semana: uñas y pestañas para salir.' },
          { dias: TODOS, hora: '21:00', formato: 'reel', por: 'Los antes/después enganchan de noche.' },
          { dias: [6], hora: '19:00', formato: 'post', por: 'Domingo: se planifica la semana.' }
        ],
        franjas: [
          { nombre: 'Lunes y martes flojos', dias: [0, 1], desde: '10:00', hasta: '15:00', tipo: 'promo' },
          { nombre: 'Jueves y viernes: lleno', dias: [3, 4], desde: '16:00', hasta: '20:00', tipo: 'lleno' },
          { nombre: 'Bodas y verano', meses: [5, 6, 7], tipo: 'temporada' },
          { nombre: 'Navidad y Nochevieja', meses: [12], tipo: 'temporada' }
        ]
      },
      imagen: {
        busquedas: ['nail salon', 'manicure', 'eyelash extensions', 'facial treatment', 'spa'],
        prompt: 'Professional Instagram photo of a bright beauty salon in Palma de Mallorca, manicure, lashes or facial treatment, soft light, elegant, no text, no logos.',
        temas: [
          { id: 'unas', re: /u[nñ]a|manicur|pedicur|esmalt|nail|semiperm|gel/, fotos: ['1604654894610-df63bc536371', '1519014816548-bf5fe059798b'] },
          { id: 'mirada', re: /maquill|pesta|ceja|lash|mirada|novia/, fotos: ['1487412947147-5cebf100ffc2'] },
          { id: 'facial', re: /./, fotos: ['1570172619644-dfd03ed5d881', '1540555700478-4be289fbecef', '1595476108010-b4d1f102b1b1'] }
        ]
      },
      automatizaciones: [
        'Recordatorio de la cita 24 h antes por WhatsApp',
        '«Toca relleno de uñas»: aviso a las 3 semanas',
        '«Toca relleno de pestañas»: aviso a las 3 semanas',
        'Pedir reseña de Google después de la cita',
        'Bono de sesiones: avisar cuando le queda una'
      ],
      resenas: {
        positiva: '¡Muchas gracias, {autor}! Nos encanta que salieras tan contenta. ¡Te esperamos en la próxima! 🌸',
        negativa: 'Sentimos que no quedaras contenta, {autor}. Escríbenos y lo arreglamos sin coste.',
        pregunta: '¡Hola! Puedes pedir cita desde el botón «Pedir cita» o por WhatsApp.'
      },
      mensajes: [
        { av: '👩', nm: 'Carla', red: 'mensaje directo', tx: '¿Hacéis lifting de pestañas el viernes por la tarde?', sug: '¡Hola Carla! El viernes tenemos hueco a las 17:00. Pide la cita desde el botón y te la guardamos 💅' },
        { av: '👩‍🦱', nm: 'Marta', red: 'comentario en Instagram', tx: '¿Cuánto dura el semipermanente?', sug: '¡Hola Marta! Entre 2 y 3 semanas perfecto. ¿Te guardamos hueco? ✨' },
        { av: '👵', nm: 'Pilar', red: 'comentario en Facebook', tx: 'Qué gusto la limpieza facial de ayer 😍', sug: '¡Gracias, Pilar! 😍 Nos alegra mucho. ¡Te esperamos pronto!' }
      ],
      resenasEj: [
        { autor: 'Andrea P.', estrellas: 5, dias: 3, texto: 'Las uñas me duraron casi un mes perfectas. Muy limpias y muy cuidadosas.' },
        { autor: 'Lucía V.', estrellas: 5, dias: 11, texto: 'El lifting de pestañas me encantó, y el trato de diez.' },
        { autor: 'Bea S.', estrellas: 3, dias: 20, texto: 'Buen resultado pero me cambiaron la cita dos veces.' },
        { autor: 'Rosa M.', estrellas: 4, dias: 34, texto: 'Limpieza facial muy completa, salí con la piel como nueva.' }
      ],
      semana: [
        ['Diseño de la semana', 'Uñas', 'post', 'El diseño de uñas más pedido esta semana 💅 ¿Te lo hacemos?', '#unas #nails #Palma'],
        ['Lifting de pestañas', 'Antes y después', 'reel', 'Mirada despierta sin rímel 👁️ Así es un lifting de pestañas.', '#pestanas #lifting #Palma'],
        ['Huecos libres hoy', 'Última hora', 'historia', 'Nos quedan dos huecos esta tarde ⏰ Pide tu cita.', '#Palma #estetica'],
        ['Limpieza facial', 'Tu momento', 'post', 'Limpieza facial profunda: 60 minutos para ti ✨', '#facial #estetica #Mallorca'],
        ['Lo que dicen de nosotras', '5 estrellas', 'post', '«Las uñas me duraron un mes perfectas» ⭐⭐⭐⭐⭐ Gracias por confiar.', '#Palma #unas'],
        ['Bono de 5 sesiones', '1 gratis', 'carrusel', 'Con el bono de 5 sesiones, una te sale gratis 🎁', '#oferta #estetica #Palma']
      ],
      ejemplo: { nombre: 'Estética Ejemplo', ciudad: 'Palma de Mallorca' }
    },

    {
      id: 'gimnasio', nombre: 'Gimnasio y entrenador personal', corto: 'gimnasio', icono: '🏋️', cambia: true,
      iconos: ['🏋️', '💪', '🧘', '🥊', '🚴', '🏃'],
      detectar: /gimnas|\bgym\b|fitness|entrenad|crossfit|pilates|yoga|boxeo|funcional|trainer|\bbox\b|deporte|sport/,
      tono: 'Divertido y gamberro', color: '#34d399',
      cta: { texto: 'Apuntarme', icono: '💪', frase: 'Apúntate', pregunta: 'Te apuntamos a una clase de prueba', whatsapp: 'Apuntarme por WhatsApp',
        mensaje: 'Hola, quiero información para apuntarme en {neg}', enlaces: 'tu web de altas, Glofox, Virtuagym, Mindbody o WhatsApp',
        en: 'Join now', de: 'Jetzt anmelden', fr: 'Inscris-toi' },
      etq: { negocio: 'gimnasio', reservas: 'altas', reserva: 'alta', carta: 'clases y tarifas', verCarta: 'Ver clases y tarifas', mesa: 'plaza', mesas: 'plazas', iconoCarta: '🗓️' },
      hashtags: ['#gimnasio', '#fitness', '#entrenamiento', '#Palma', '#Mallorca'],
      ideas: ['Clase de prueba gratis esta semana', 'Rutina de 20 minutos para empezar', 'Antes y después de un socio', 'Nueva clase de pilates', 'Plazas libres en entrenamiento personal',
        'Cómo hacer bien una sentadilla', 'Reto de 30 días', 'Matrícula gratis este mes', 'Os presentamos a los entrenadores', 'Reseña de 5 estrellas de un socio'],
      ofertas: ['Matrícula gratis este mes', 'Primera semana gratis', 'Trae a un amigo: un mes al 50 %', 'Bono 10 sesiones de entrenador personal', 'Cuota de verano -20%'],
      plan: {
        post: ['El horario de clases de la semana 🗓️', 'Tarifas claras, sin permanencia', 'Reseña de 5★ de un socio ⭐', 'Los entrenadores de {neg}'],
        reel: ['Rutina de 20 minutos 🎬', 'Sentadilla bien hecha, paso a paso', 'Así es una clase de prueba 💪', 'El reto de 30 días'],
        historia: ['Plazas libres hoy 📸', 'Así está la sala ahora', 'Encuesta: ¿qué clase quieres?', 'Un día en {neg}'],
        oferta: ['{of}', 'Primera semana gratis', 'Trae a un amigo: mes al 50 %', 'Matrícula gratis']
      },
      frases: {
        gancho: ['{idea} 💪\n\nEn {neg} te acompañamos desde el primer día. Apúntate.', 'Esto es {idea} 🔥\n\nEn {neg} empiezas hoy, a tu ritmo.'],
        oferta: ['Solo esta semana: {idea} 🔥\n\nPlazas limitadas en {neg}. Apúntate 📲', '¡{idea}! ⏰\n\nQuedan pocas plazas en {neg}. No lo dejes para el lunes.'],
        pregunta: ['¿Te atreves con {idea}? 👀\n\nCuéntanoslo en comentarios 👇 En {neg} te ayudamos.', '¿{idea}? 🤔 En {neg} te enseñamos cómo. ¿Te apuntas?'],
        local: ['Si entrenas por Palma, esto es para ti: {idea} 💪\n\n{neg}, tu gimnasio de barrio.', 'Palma, atención 📣 {idea} en {neg}. Etiqueta a tu compañero de entreno.']
      },
      horas: {
        mejores: [
          { dias: L5, hora: '06:45', formato: 'historia', por: 'Antes de entrenar: la gente mira el móvil camino del gimnasio.' },
          { dias: [0, 1, 2, 3], hora: '18:00', formato: 'reel', por: 'Al salir de trabajar se decide si ir a entrenar.' },
          { dias: [6], hora: '19:00', formato: 'post', por: 'Domingo por la tarde: propósitos de la semana.' },
          { dias: [0], hora: '07:30', formato: 'post', por: 'Lunes: el día con más altas de la semana.' }
        ],
        franjas: [
          { nombre: 'Horas valle (promo)', dias: L5, desde: '11:00', hasta: '16:00', tipo: 'promo' },
          { nombre: 'Horas punta: sala llena', dias: [0, 1, 2, 3], desde: '18:00', hasta: '21:00', tipo: 'lleno' },
          { nombre: 'Propósitos de año nuevo', meses: [1], tipo: 'temporada' },
          { nombre: 'Operación verano', meses: [4, 5], tipo: 'temporada' },
          { nombre: 'Vuelta de vacaciones', meses: [9], tipo: 'temporada' }
        ]
      },
      imagen: {
        busquedas: ['gym workout', 'personal trainer', 'fitness class', 'weights'],
        prompt: 'Professional Instagram photo of a modern gym in Palma de Mallorca, people training with weights or in a fitness class, energetic light, no text, no logos.',
        temas: [
          { id: 'fuerza', re: /pesa|fuerza|sentadilla|muscul|halter|barra|press|peso/, fotos: ['1534438327276-14e5300c3a48', '1517836357463-d25dfeac3438', '1576678927484-cc907957088c'] },
          { id: 'clase', re: /./, fotos: ['1571019613454-1cb2f99b2d8b', '1594381898411-846e7d193883', '1599058917212-d750089bc07e', '1534438327276-14e5300c3a48'] }
        ]
      },
      automatizaciones: [
        'Recordatorio de la clase reservada 2 h antes',
        '«Hace 2 semanas que no vienes»: mensaje de ánimo',
        'Felicitar al cumplir 1, 3 y 6 meses de socio',
        'Pedir reseña de Google tras el primer mes',
        'Campañas de enero y septiembre preparadas solas'
      ],
      resenas: {
        positiva: '¡Gracias, {autor}! Da gusto entrenar con gente así. ¡A por el siguiente reto! 💪',
        negativa: 'Sentimos lo que cuentas, {autor}. Escríbenos y lo hablamos con el equipo para que no vuelva a pasar.',
        pregunta: '¡Hola! Puedes apuntarte desde el botón «Apuntarme» o venir a una clase de prueba gratis.'
      },
      mensajes: [
        { av: '🧑', nm: 'Dani', red: 'mensaje directo', tx: '¿Tenéis clase de prueba gratis?', sug: '¡Hola Dani! Sí, la primera clase es gratis. Apúntate desde el enlace y elige el día 💪' },
        { av: '👩', nm: 'Irene', red: 'comentario en Instagram', tx: '¿Hay permanencia?', sug: '¡Hola Irene! Sin permanencia: te das de baja cuando quieras. ¿Te apuntamos a una clase de prueba?' },
        { av: '🧔', nm: 'Tomeu', red: 'comentario en Facebook', tx: 'Llevo 3 meses y ya noto el cambio 🔥', sug: '¡Enhorabuena, Tomeu! 🔥 Ese es el camino. ¡Nos vemos en la sala!' }
      ],
      resenasEj: [
        { autor: 'Sergio L.', estrellas: 5, dias: 4, texto: 'Los entrenadores te corrigen siempre y el ambiente es muy bueno.' },
        { autor: 'María J.', estrellas: 5, dias: 12, texto: 'Empecé sin saber nada y ahora vengo 4 días a la semana. Gracias al equipo.' },
        { autor: 'Óscar T.', estrellas: 2, dias: 22, texto: 'A las 19:00 está demasiado lleno y hay que esperar máquinas.' },
        { autor: 'Laia B.', estrellas: 4, dias: 40, texto: 'Clases de pilates muy completas. Echo de menos más horarios por la mañana.' }
      ],
      semana: [
        ['Horario de la semana', 'Clases', 'carrusel', 'Todas las clases de esta semana 🗓️ Elige la tuya y apúntate.', '#gimnasio #Palma #fitness'],
        ['Rutina de 20 minutos', 'Para empezar', 'reel', 'Si no sabes por dónde empezar, esta rutina es para ti 💪', '#entrenamiento #fitness #Palma'],
        ['Plazas libres hoy', 'Última hora', 'historia', 'Quedan plazas en la clase de las 19:00 ⏰ Apúntate.', '#Palma #gimnasio'],
        ['Clase de prueba gratis', 'Esta semana', 'post', 'Tu primera clase, gratis 🎁 Ven, prueba y decide.', '#gimnasio #Mallorca'],
        ['Lo que dicen los socios', '5 estrellas', 'post', '«Los entrenadores te corrigen siempre» ⭐⭐⭐⭐⭐ Gracias por entrenar con nosotros.', '#Palma #fitness'],
        ['Sentadilla bien hecha', 'Técnica', 'reel', 'Tres errores típicos en la sentadilla y cómo evitarlos 🏋️', '#sentadilla #tecnica #gym']
      ],
      ejemplo: { nombre: 'Gimnasio Ejemplo', ciudad: 'Palma de Mallorca' }
    },

    {
      id: 'tienda', nombre: 'Tienda de ropa y regalos', corto: 'tienda', icono: '🛍️', cambia: true,
      iconos: ['🛍️', '👗', '🎁', '👟', '💍', '🧸'],
      detectar: /tienda|boutique|moda|ropa|regalo|complement|zapater|bisuter|joyer|decoraci|\bshop\b|store|concept|textil|lencer/,
      tono: 'Cercano y con chispa', color: '#f97316',
      cta: { texto: 'Comprar', icono: '🛍️', frase: 'Consíguelo ya', pregunta: 'Te lo guardamos', whatsapp: 'Preguntar por WhatsApp',
        mensaje: 'Hola, me interesa un artículo de {neg}, ¿lo tenéis disponible?', enlaces: 'tu tienda online (Shopify, WooCommerce), Instagram Shopping o WhatsApp',
        en: 'Shop now', de: 'Jetzt kaufen', fr: 'Achète maintenant' },
      etq: { negocio: 'tienda', reservas: 'tienda online', reserva: 'compra', carta: 'catálogo', verCarta: 'Ver catálogo', mesa: 'prenda', mesas: 'prendas', iconoCarta: '👗' },
      hashtags: ['#moda', '#tiendaonline', '#regalos', '#Palma', '#Mallorca'],
      ideas: ['Novedades de la temporada', 'Look completo por menos de 60 €', 'Ideas de regalo para el Día de la Madre', 'Últimas tallas en rebajas', 'Cómo combinar una camisa blanca',
        'Envío gratis este fin de semana', 'Nuevas joyas hechas a mano', 'Envolvemos tus regalos gratis', 'Así preparamos tu pedido', 'Reseña de 5 estrellas de una clienta'],
      ofertas: ['-20% en la segunda prenda', 'Envío gratis desde 40 €', 'Regalo con tu compra este finde', 'Rebajas: hasta -50%', '3x2 en complementos'],
      plan: {
        post: ['Novedades de la semana 🛍️', 'El look del día', 'Reseña de 5★ de una clienta ⭐', 'Así es {neg} por dentro'],
        reel: ['3 formas de llevar la misma prenda 🎬', 'Unboxing de lo nuevo', 'Así envolvemos tus regalos 🎁', 'Del escaparate a tu armario'],
        historia: ['Lo último que ha llegado 📸', 'Encuesta: ¿este o este?', 'Últimas tallas', 'Un día en {neg}'],
        oferta: ['{of}', '-20% en la segunda prenda', 'Envío gratis este finde', 'Regalo con tu compra']
      },
      frases: {
        gancho: ['{idea} 🛍️\n\nYa en {neg}. Consíguelo antes de que vuele.', 'Esto es {idea} 😍\n\nEn {neg}, en tienda y online.'],
        oferta: ['Solo esta semana: {idea} 🔥\n\nCorre a {neg} antes de que se agote 📲', '¡{idea}! ⏰\n\nUnidades limitadas en {neg}.'],
        pregunta: ['¿Qué te parece {idea}? 👀\n\nDinos en comentarios 👇 ¿este o el otro?', '¿{idea}? 🤔 En {neg} te ayudamos a elegir. ¿Te lo guardamos?'],
        local: ['Si estás por Palma, esto es para ti: {idea} 💛\n\n{neg}, comercio de barrio.', 'Palma, atención 📣 {idea} en {neg}. Etiqueta a quien le encantaría.']
      },
      horas: {
        mejores: [
          { dias: L5, hora: '13:30', formato: 'post', por: 'Pausa de la comida: se mira el móvil y se compra.' },
          { dias: TODOS, hora: '21:00', formato: 'reel', por: 'Por la noche se compra online desde el sofá.' },
          { dias: [5], hora: '10:00', formato: 'historia', por: 'Sábado por la mañana: paseo de tiendas.' },
          { dias: [3], hora: '19:00', formato: 'post', por: 'Jueves: se planea el look del fin de semana.' }
        ],
        franjas: [
          { nombre: 'Rebajas de invierno', meses: [1, 2], tipo: 'temporada' },
          { nombre: 'Día de la Madre', meses: [5], tipo: 'temporada' },
          { nombre: 'Rebajas de verano', meses: [7, 8], tipo: 'temporada' },
          { nombre: 'Black Friday y Navidad', meses: [11, 12], tipo: 'temporada' },
          { nombre: 'Tarde de sábado', dias: [5], desde: '17:00', hasta: '20:30', tipo: 'promo' }
        ]
      },
      imagen: {
        busquedas: ['clothing boutique', 'fashion store', 'gift shop', 'gift box'],
        prompt: 'Professional Instagram photo of a small fashion and gift boutique in Palma de Mallorca, clothes on rails, warm light, no text, no logos.',
        temas: [
          { id: 'regalo', re: /regalo|navidad|cumple|detalle|envolt|valent|madre|padre|joya/, fotos: ['1549465220-1a8b9238cd48'] },
          { id: 'ropa', re: /./, fotos: ['1441986300917-64674bd600d8', '1445205170230-053b83016050', '1567401893414-76b7b1e5a7a5'] }
        ]
      },
      automatizaciones: [
        'Aviso de novedades a las clientas habituales por WhatsApp',
        'Pedido listo para recoger: aviso automático',
        'Cumpleaños con un descuento',
        'Pedir reseña de Google después de la compra',
        'Recordatorio de fechas clave (Navidad, Día de la Madre, San Valentín)'
      ],
      resenas: {
        positiva: '¡Gracias, {autor}! Nos encanta que acertaras. ¡Te esperamos con las novedades! 🛍️',
        negativa: 'Sentimos lo ocurrido, {autor}. Escríbenos y lo solucionamos: cambio o devolución sin problema.',
        pregunta: '¡Hola! Puedes comprarlo online desde el botón «Comprar» o preguntarnos por WhatsApp si te lo guardamos.'
      },
      mensajes: [
        { av: '👩', nm: 'Clara', red: 'mensaje directo', tx: '¿Tenéis el vestido verde en talla M?', sug: '¡Hola Clara! Sí, nos queda una M. ¿Te la guardamos hasta mañana? 🛍️' },
        { av: '👨', nm: 'Jaume', red: 'comentario en Instagram', tx: '¿Hacéis envíos a Menorca?', sug: '¡Hola Jaume! Sí, enviamos a todas las islas en 48-72 h. Puedes comprarlo desde el enlace 📦' },
        { av: '👵', nm: 'Antonia', red: 'comentario en Facebook', tx: 'A mi nieta le encantó el regalo 😍', sug: '¡Qué alegría, Antonia! 😍 Gracias por contárnoslo. ¡Hasta pronto!' }
      ],
      resenasEj: [
        { autor: 'Paula C.', estrellas: 5, dias: 5, texto: 'Ropa preciosa y te asesoran sin agobiar. Me envolvieron el regalo gratis.' },
        { autor: 'Miquel A.', estrellas: 5, dias: 13, texto: 'Encontré el regalo perfecto en cinco minutos. Muy buena atención.' },
        { autor: 'Silvia R.', estrellas: 3, dias: 19, texto: 'Bonita tienda, pero el pedido online tardó una semana.' },
        { autor: 'Joana T.', estrellas: 4, dias: 33, texto: 'Mucha variedad y buenos precios. Volveré en rebajas.' }
      ],
      semana: [
        ['Novedades de la semana', 'Recién llegado', 'carrusel', 'Lo nuevo ya está en tienda y online 🛍️', '#novedades #moda #Palma'],
        ['3 formas de llevarlo', 'Ideas de look', 'reel', 'Una misma prenda, tres looks distintos 👗', '#looks #moda #Mallorca'],
        ['Últimas tallas', 'Corre', 'historia', 'Quedan las últimas tallas de lo más vendido ⏰', '#Palma #moda'],
        ['Regalo con tu compra', 'Este finde', 'post', 'Este fin de semana, regalo con tu compra 🎁', '#regalos #Palma'],
        ['Lo que dicen de nosotros', '5 estrellas', 'post', '«Me envolvieron el regalo gratis» ⭐⭐⭐⭐⭐ Gracias por comprar en el barrio.', '#comerciolocal #Palma'],
        ['Envío gratis', 'Desde 40 €', 'post', 'Envío gratis a toda Mallorca desde 40 € 📦', '#tiendaonline #Mallorca']
      ],
      ejemplo: { nombre: 'Tienda Ejemplo', ciudad: 'Palma de Mallorca' }
    },

    {
      id: 'cafeteria', nombre: 'Cafetería y panadería', corto: 'cafetería', icono: '☕', cambia: true,
      iconos: ['☕', '🥐', '🍞', '🧁', '🍰', '🥯'],
      detectar: /cafeter|caf[eé](?![a-z])|panader|pasteler|bolleri|\bhorno\b|obrador|bakery|coffee|brunch|churrer|ensa[iï]mad|reposter|forn\b/,
      tono: 'Cercano y con chispa', color: '#ffb020',
      cta: { texto: 'Hacer un encargo', icono: '🥐', frase: 'Haz tu encargo', pregunta: 'Te lo dejamos preparado', whatsapp: 'Encargar por WhatsApp',
        mensaje: 'Hola, quiero hacer un encargo en {neg}', enlaces: 'Glovo, Uber Eats, tu web de encargos o WhatsApp',
        en: 'Order now', de: 'Jetzt bestellen', fr: 'Commande maintenant' },
      etq: { negocio: 'cafetería', reservas: 'encargos', reserva: 'encargo', carta: 'carta', verCarta: 'Ver carta', mesa: 'mesa', mesas: 'mesas', iconoCarta: '📖' },
      hashtags: ['#cafeteria', '#panaderia', '#desayuno', '#Palma', '#Mallorca'],
      ideas: ['Pan de masa madre recién hecho', 'Croissants de mantequilla a primera hora', 'Desayuno completo por 4,50 €', 'Ensaimadas por encargo para el domingo', 'Tarta de cumpleaños personalizada',
        'Café de especialidad', 'Merienda: café + porción de tarta', 'Brunch del sábado', 'Así hacemos el pan cada madrugada', 'Reseña de 5 estrellas de un cliente'],
      ofertas: ['Café + croissant 2,50 €', 'Desayuno completo 4,50 €', '10.º café gratis con la tarjeta', 'Pan del día a mitad de precio desde las 19:00', 'Tarta de cumpleaños: -10% por encargo'],
      plan: {
        post: ['Lo que ha salido del horno hoy 🥐', 'Nuestra carta de desayunos', 'Reseña de 5★ de un cliente ⭐', 'Te esperamos en {neg} ☕'],
        reel: ['Así hacemos el pan de madrugada 🎬', 'El croissant perfecto, capa a capa', 'Latte art en 15 segundos ☕', 'Del obrador al mostrador'],
        historia: ['Recién salido del horno 📸', 'Así está el mostrador ahora', 'Encuesta: ¿dulce o salado?', 'Un día en {neg}'],
        oferta: ['{of}', 'Café + croissant 2,50 €', 'Desayuno completo 4,50 €', '10.º café gratis']
      },
      frases: {
        gancho: ['{idea} ☕\n\nRecién hecho en {neg}. Te esperamos.', 'Esto es {idea} 😋\n\nEn {neg}, cada mañana.'],
        oferta: ['Solo esta semana: {idea} 🔥\n\nPásate por {neg} antes de que se acabe 📲', '¡Hoy toca {idea}! ⏰\n\nEncárgalo en {neg} y te lo dejamos preparado.'],
        pregunta: ['¿Ya probaste {idea}? 👀\n\nCuéntanoslo en comentarios 👇 En {neg} te esperamos.', '¿{idea}? 🤔 Hoy en {neg}. ¿Te animas?'],
        local: ['Si estás por Palma, esto es para ti: {idea} 💛\n\n{neg}, tu café de cada día.', 'Palma, atención 📣 {idea} en {neg}. Etiqueta a quien invitas a desayunar.']
      },
      horas: {
        mejores: [
          { dias: L5, hora: '07:30', formato: 'historia', por: 'Camino del trabajo: «recién salido del horno».' },
          { dias: L5, hora: '16:30', formato: 'post', por: 'Merienda: café y tarta.' },
          { dias: [5, 6], hora: '09:00', formato: 'reel', por: 'Fin de semana: desayuno y brunch sin prisas.' },
          { dias: [3, 4], hora: '19:00', formato: 'post', por: 'Encargos del fin de semana (ensaimadas, tartas).' }
        ],
        franjas: [
          { nombre: 'Desayunos', dias: TODOS, desde: '07:30', hasta: '11:00', tipo: 'promo' },
          { nombre: 'Merienda', dias: L5, desde: '16:30', hasta: '19:00', tipo: 'promo' },
          { nombre: 'Pan del día a mitad de precio', dias: TODOS, desde: '19:00', hasta: '20:30', tipo: 'promo' },
          { nombre: 'Roscón y Navidad', meses: [12, 1], tipo: 'temporada' }
        ]
      },
      imagen: {
        busquedas: ['coffee shop', 'latte art', 'bakery', 'croissant', 'sourdough bread'],
        prompt: 'Professional Instagram photo of a cosy café and bakery in Palma de Mallorca, fresh bread, croissants and coffee, morning light, no text, no logos.',
        temas: [
          { id: 'pan', re: /\bpan\b|panes|masa madre|hogaza|barra|croissant|cruas|bolle|ensa[iï]mad|pastel|tarta|dulce|magdalen|cupcake|horno|obrador|roscon|roscón/, fotos: ['1509440159596-0249088772ff', '1555507036-ab1f4038808a', '1517433670267-08bbd4be890f', '1486427944299-d1955d23e34d'] },
          { id: 'cafe', re: /./, fotos: ['1495474472287-4d71bcdd2085', '1509042239860-f550ce710b93', '1501339847302-ac426a4a7cbb'] }
        ]
      },
      automatizaciones: [
        'Historia diaria «recién salido del horno» a las 7:30',
        'Encargo listo para recoger: aviso por WhatsApp',
        'Tarjeta de fidelidad: «te falta 1 café para el gratis»',
        'Pedir reseña de Google',
        'Aviso de encargos de tartas y ensaimadas antes de las fiestas'
      ],
      resenas: {
        positiva: '¡Gracias, {autor}! Nos alegra que te guste. ¡Mañana más, recién hecho! ☕',
        negativa: 'Sentimos lo que cuentas, {autor}. Pásate y lo hablamos con un café invitado.',
        pregunta: '¡Hola! Puedes hacer tu encargo desde el botón o por WhatsApp y te lo dejamos preparado.'
      },
      mensajes: [
        { av: '👩', nm: 'Neus', red: 'mensaje directo', tx: '¿Puedo encargar una ensaimada grande para el domingo?', sug: '¡Hola Neus! Claro: haz el encargo desde el enlace y el domingo a las 9:00 la tienes lista 🥐' },
        { av: '🧑', nm: 'Álex', red: 'comentario en Instagram', tx: '¿Tenéis leche de avena?', sug: '¡Hola Álex! Sí, de avena y de almendra ☕ ¡Te esperamos!' },
        { av: '👴', nm: 'Biel', red: 'comentario en Facebook', tx: 'El pan de masa madre, como el de antes 👌', sug: '¡Muchas gracias, Biel! 😊 Lo hacemos cada madrugada. ¡Hasta mañana!' }
      ],
      resenasEj: [
        { autor: 'Carmen D.', estrellas: 5, dias: 1, texto: 'Los mejores croissants del barrio y el café muy bueno.' },
        { autor: 'Toni R.', estrellas: 5, dias: 8, texto: 'Pan de masa madre de verdad. Y te atienden con una sonrisa.' },
        { autor: 'Eva M.', estrellas: 3, dias: 17, texto: 'Todo rico, pero por la mañana hay mucha cola.' },
        { autor: 'Xisca P.', estrellas: 4, dias: 29, texto: 'La tarta de cumpleaños quedó preciosa y buenísima.' }
      ],
      semana: [
        ['Recién salido del horno', 'Hoy', 'historia', 'Pan y croissants recién hechos 🥐 Te esperamos desde las 7:30.', '#panaderia #Palma'],
        ['El croissant perfecto', 'Capa a capa', 'reel', 'Mantequilla, paciencia y horno 🥐 Así hacemos los croissants.', '#croissant #obrador #Palma'],
        ['Desayuno completo', '4,50 €', 'post', 'Café, zumo y tostada por 4,50 € ☕', '#desayuno #Palma'],
        ['Encargos del domingo', 'Ensaimadas', 'post', 'Encarga tu ensaimada para el domingo 🥐 Te la dejamos lista.', '#ensaimada #Mallorca'],
        ['Lo que dicen de nosotros', '5 estrellas', 'post', '«Los mejores croissants del barrio» ⭐⭐⭐⭐⭐ Gracias por venir cada mañana.', '#Palma #cafeteria'],
        ['Merienda', 'Café + tarta', 'carrusel', 'Las tartas de esta semana 🍰 ¿Cuál te pedimos?', '#merienda #tartas #Palma']
      ],
      ejemplo: { nombre: 'Cafetería Ejemplo', ciudad: 'Palma de Mallorca' }
    },

    {
      id: 'talleres', nombre: 'Talleres y servicios', corto: 'taller', icono: '🔧', cambia: true,
      iconos: ['🔧', '🛠️', '🚗', '🚿', '⚡', '🏗️'],
      detectar: /taller|mec[aá]nic|fontaner|electricist|reforma|\bobras?\b|pintor|carpinter|cerrajer|climatiz|aire acondicionado|instalac|mantenimiento|jardiner|chapa|neum[aá]tic|lampist|alba[nñ]il|cristaler|limpieza/,
      tono: 'Profesional y claro', color: '#60a5fa',
      cta: { texto: 'Pedir presupuesto', icono: '📋', frase: 'Pide presupuesto sin compromiso', pregunta: 'Te pasamos presupuesto', whatsapp: 'Presupuesto por WhatsApp',
        mensaje: 'Hola, quiero pedir un presupuesto a {neg}', enlaces: 'tu web, un formulario, Habitissimo o WhatsApp',
        en: 'Get a free quote', de: 'Angebot anfordern', fr: 'Demande un devis' },
      etq: { negocio: 'empresa de servicios', reservas: 'presupuestos', reserva: 'presupuesto', carta: 'servicios y precios', verCarta: 'Ver servicios', mesa: 'visita', mesas: 'visitas', iconoCarta: '📋' },
      hashtags: ['#reformas', '#taller', '#fontaneria', '#Palma', '#Mallorca'],
      ideas: ['Antes y después de una reforma de baño', 'Revisión del coche antes del verano', 'Fuga de agua arreglada en una hora', 'Puesta a punto del aire acondicionado', 'Presupuesto sin compromiso en 24 h',
        'Cambio de neumáticos', 'Instalación eléctrica segura', 'Pintamos tu piso en 3 días', 'Así trabaja nuestro equipo', 'Reseña de 5 estrellas de un cliente'],
      ofertas: ['Presupuesto gratis en 24 h', 'Revisión pre-ITV 29 €', 'Limpieza del aire acondicionado 45 €', 'Sin coste de desplazamiento en Palma', '-10% en reformas de baño este mes'],
      plan: {
        post: ['Antes y después de la semana 🔧', 'Nuestros servicios y precios', 'Reseña de 5★ de un cliente ⭐', 'El equipo de {neg}'],
        reel: ['Reforma de baño en 30 segundos 🎬', 'Así se cambia un grifo', 'Tres trucos para que no se atasque 🚿', 'Del problema a la solución'],
        historia: ['Trabajo de hoy 📸', 'Así quedó', 'Pregunta: ¿qué arreglamos en tu casa?', 'Un día con {neg}'],
        oferta: ['{of}', 'Presupuesto gratis en 24 h', 'Revisión pre-ITV 29 €', 'Sin desplazamiento en Palma']
      },
      frases: {
        gancho: ['{idea} 🔧\n\nEn {neg} lo dejamos listo y bien hecho. Pide presupuesto sin compromiso.', 'Así queda {idea} 💪\n\nTrabajo de {neg}, con garantía.'],
        oferta: ['Solo este mes: {idea} 🔥\n\nPide presupuesto a {neg} 📲', '¡{idea}! ⏰\n\nLlama a {neg} antes de que se llene la agenda.'],
        pregunta: ['¿Necesitas {idea}? 👀\n\nCuéntanoslo en comentarios 👇 En {neg} te asesoramos gratis.', '¿{idea}? 🤔 En {neg} te decimos cuánto cuesta en 24 h.'],
        local: ['Si estás por Palma, esto es para ti: {idea} 🛠️\n\n{neg}, profesionales de la zona.', 'Palma, atención 📣 {idea} con {neg}. Etiqueta a quien lo necesita.']
      },
      horas: {
        mejores: [
          { dias: [0], hora: '08:00', formato: 'post', por: 'Lunes: aparecen las averías del fin de semana.' },
          { dias: [1, 2, 3], hora: '20:00', formato: 'reel', por: 'Por la noche, en casa, se piensa en reformas.' },
          { dias: [5], hora: '10:00', formato: 'post', por: 'Sábado: se planean obras y se piden presupuestos.' },
          { dias: L5, hora: '13:00', formato: 'historia', por: 'El trabajo terminado del día, con foto.' }
        ],
        franjas: [
          { nombre: 'Aire acondicionado antes del verano', meses: [5, 6], tipo: 'temporada' },
          { nombre: 'Revisión del coche antes de vacaciones', meses: [7], tipo: 'temporada' },
          { nombre: 'Calentadores y calefacción', meses: [10, 11, 12, 1], tipo: 'temporada' },
          { nombre: 'Reformas de invierno (temporada baja)', meses: [11, 12, 1, 2], tipo: 'temporada' }
        ]
      },
      imagen: {
        busquedas: ['plumber', 'home renovation', 'car mechanic', 'electrician', 'tools'],
        prompt: 'Professional Instagram photo of a trustworthy local tradesman in Palma de Mallorca (plumbing, renovation or car repair), clean work, natural light, no text, no logos.',
        temas: [
          { id: 'mecanico', re: /coche|motor|mec[aá]nic|neum|aceite|itv|chapa|freno|taller|moto/, fotos: ['1486262715619-67b85e0b08d3', '1504222490345-c075b6008014'] },
          { id: 'fontaneria', re: /fontan|tuber|fuga|agua|calentador|termo|grifo|atasc/, fotos: ['1607472586893-edb57bdc0e39'] },
          { id: 'electricidad', re: /el[eé]ctric|\bluz\b|enchufe|cuadro|instalaci/, fotos: ['1621905251189-08b45d6a269e'] },
          { id: 'obra', re: /./, fotos: ['1589939705384-5185137a7f0f', '1562259949-e8e7689d7828', '1504148455328-c376907d081c', '1556909114-f6e7ad7d3136', '1503387762-592deb58ef4e'] }
        ]
      },
      automatizaciones: [
        'Responder en menos de 1 h a cada petición de presupuesto',
        'Seguimiento del presupuesto a los 3 días',
        'Recordatorio de revisión anual (caldera, aire, ITV)',
        'Pedir reseña al terminar, con la foto del antes y después',
        'Aviso de la visita del técnico el día antes'
      ],
      resenas: {
        positiva: '¡Gracias, {autor}! Da gusto trabajar así. Para lo que necesites, aquí estamos. 🔧',
        negativa: 'Sentimos lo ocurrido, {autor}. Llámanos y pasamos a revisarlo sin coste.',
        pregunta: '¡Hola! Pídenos presupuesto desde el botón o por WhatsApp (con una foto) y te contestamos en 24 h.'
      },
      mensajes: [
        { av: '👩', nm: 'Marga', red: 'mensaje directo', tx: 'Tengo una fuga debajo del fregadero, ¿podéis venir hoy?', sug: '¡Hola Marga! Mándanos una foto por WhatsApp y te decimos hora hoy mismo 🔧' },
        { av: '👨', nm: 'Pere', red: 'comentario en Instagram', tx: '¿Cuánto cuesta reformar un baño pequeño?', sug: '¡Hola Pere! Depende de los materiales; pide presupuesto sin compromiso y te lo pasamos en 24 h 📋' },
        { av: '👵', nm: 'Catalina', red: 'comentario en Facebook', tx: 'Muy contentos con la reforma de la cocina 👏', sug: '¡Gracias, Catalina! 👏 Ha sido un placer. ¡Que la disfrutéis!' }
      ],
      resenasEj: [
        { autor: 'Jordi S.', estrellas: 5, dias: 3, texto: 'Vinieron el mismo día, arreglaron la fuga y dejaron todo limpio. Precio justo.' },
        { autor: 'Marta G.', estrellas: 5, dias: 10, texto: 'Reforma del baño en el plazo que dijeron. Muy serios.' },
        { autor: 'Rafel C.', estrellas: 2, dias: 21, texto: 'El trabajo bien, pero tardaron una semana en mandar el presupuesto.' },
        { autor: 'Ana L.', estrellas: 4, dias: 38, texto: 'Buen taller, te explican todo y no te cobran de más.' }
      ],
      semana: [
        ['Antes y después', 'Reforma de baño', 'carrusel', 'Así estaba y así quedó 🛠️ Reforma de baño en 5 días.', '#reformas #antesydespues #Palma'],
        ['Tres trucos para el desagüe', 'Consejos', 'reel', 'Tres trucos para que no se atasque el fregadero 🚿', '#fontaneria #trucos #Palma'],
        ['Trabajo de hoy', 'Terminado', 'historia', 'Trabajo terminado y todo limpio ✅', '#Palma #reformas'],
        ['Presupuesto en 24 h', 'Sin compromiso', 'post', 'Mándanos una foto y te pasamos presupuesto en 24 h 📋', '#presupuesto #Mallorca'],
        ['Lo que dicen de nosotros', '5 estrellas', 'post', '«Vinieron el mismo día y lo dejaron todo limpio» ⭐⭐⭐⭐⭐', '#Palma #fontaneria'],
        ['Revisión antes del verano', 'Aire acondicionado', 'post', 'Pon a punto el aire antes del calor ❄️ Pide cita.', '#aireacondicionado #Mallorca']
      ],
      ejemplo: { nombre: 'Reformas Ejemplo', ciudad: 'Palma de Mallorca' }
    },

    {
      id: 'creador', nombre: 'Creador de contenido', corto: 'creador de contenido', icono: '🎬', cambia: true,
      iconos: ['🎬', '🎙️', '📸', '🎨', '🎧', '⭐'],
      detectar: /influencer|youtuber|tiktoker|streamer|twitch|podcast|creador|creadora|content creator|creator|\bugc\b|coach|artista|ilustrador|m[uú]sico|cantante|marca personal|blogger|bloguer|instagramer|newsletter/,
      tono: 'Divertido y gamberro', color: '#8b5cf6',
      cta: { texto: 'Ver el enlace', icono: '🔗', frase: 'Link en la bio', pregunta: 'Te paso el enlace', whatsapp: 'Escríbeme por WhatsApp',
        mensaje: 'Hola, te escribo por una colaboración con {neg}', enlaces: 'tu link en la bio (Linktree, Beacons, tu web), tu tienda, tu canal o un formulario de colaboraciones',
        opciones: [['Seguir', '➕', 'Follow me', 'Folge mir', 'Suis-moi'], ['Suscribirse', '🔔', 'Subscribe', 'Abonnieren', 'Abonne-toi'], ['Ver el enlace', '🔗', 'Link in bio', 'Link in der Bio', 'Lien en bio'],
          ['Comprar mi producto', '🛒', 'Get it now', 'Jetzt holen', 'Achète-le'], ['Reservar colaboración', '🤝', 'Work with me', 'Zusammenarbeit anfragen', 'Collabore avec moi']],
        en: 'Link in bio', de: 'Link in der Bio', fr: 'Lien en bio' },
      etq: { negocio: 'creador de contenido', reservas: 'colaboraciones', reserva: 'colaboración', carta: 'mis enlaces', verCarta: 'Ver mis enlaces', mesa: 'hueco', mesas: 'huecos', iconoCarta: '🗂️', menuDia: 'contenido del día' },
      hashtags: ['#creadordecontenido', '#reels', '#detrasdecamaras', '#tips'],
      ideas: ['Reel de gancho: el error que todos cometen', 'Serie: episodio 1 de 5', 'Detrás de cámaras de mi último vídeo', 'Colaboración con otro creador', 'Del vídeo largo a 5 clips',
        'Lo que nadie te cuenta de mi trabajo', 'Responder al comentario más preguntado', 'Mi newsletter de esta semana', 'Lanzamiento de mi producto', 'Un día conmigo grabando'],
      ofertas: ['Comenta «GUÍA» y te la mando por DM', '-20% en mi curso solo este finde', 'Sorteo con una marca: participa', 'Newsletter gratis: apúntate', 'Plazas abiertas para colaboraciones'],
      plan: {
        post: ['Carrusel: 5 consejos que guardarás 💾', 'Cita o frase de la semana', 'Lo que me preguntáis siempre', 'Presentación: quién soy y qué hago'],
        reel: ['Gancho en 1 segundo: el error que todos cometen 🎬', 'Serie: episodio de esta semana', 'Clip del vídeo largo ✂️', 'Detrás de cámaras', 'Tendencia con mi toque'],
        historia: ['Encuesta: ¿qué vídeo hago ahora? 📊', 'Caja de preguntas', 'Así estoy grabando hoy', 'Comenta la palabra clave y te mando el enlace'],
        oferta: ['{of}', 'Comenta «GUÍA» y te la mando', 'Plazas para colaboraciones', 'Apúntate a mi newsletter']
      },
      frases: {
        gancho: ['{idea} 👀\n\nQuédate hasta el final: lo mejor viene en el segundo 20.\n\n👉 Sígueme para la parte 2.', 'Nadie te cuenta esto: {idea} 🤯\n\nGuárdalo para luego 💾'],
        oferta: ['{idea} 🔥\n\nComenta «LINK» y te lo mando por privado 📩', 'Solo esta semana: {idea} ⏰\n\nEl enlace, en mi bio 🔗'],
        pregunta: ['¿{idea}? 🤔\n\nTe leo en comentarios 👇 y el mejor sale en el próximo vídeo.', '¿Te ha pasado? {idea} 👀\n\nEnvíaselo a quien necesita verlo 📤'],
        local: ['{idea} 🎬\n\nDetrás de cámaras de {neg}: así lo hago de verdad.', 'Parte 1 de la serie: {idea} 📺\n\nActiva las notificaciones para no perderte la 2 🔔']
      },
      horas: {
        mejores: [
          { dias: [0, 1, 2, 3, 4], hora: '13:00', formato: 'reel', por: 'Pausa de la comida: mucho consumo de reels y shorts.' },
          { dias: TODOS, hora: '20:00', formato: 'reel', por: 'Pico de la noche: el algoritmo prueba el vídeo con más gente.' },
          { dias: [1, 3], hora: '09:00', formato: 'post', por: 'Carruseles útiles: se guardan camino del trabajo.' },
          { dias: [6], hora: '18:00', formato: 'historia', por: 'Domingo: encuestas y cajas de preguntas para la semana.' }
        ],
        franjas: [
          { nombre: 'Directo / estreno de vídeo largo', dias: [3], desde: '19:00', hasta: '21:00', tipo: 'promo' },
          { nombre: 'Lanzamiento de producto', dias: [1, 2, 3], desde: '10:00', hasta: '22:00', tipo: 'promo' },
          { nombre: 'Black Friday (colaboraciones de marcas)', meses: [11], tipo: 'temporada' },
          { nombre: 'Vuelta al cole: propósitos y cursos', meses: [9, 1], tipo: 'temporada' }
        ]
      },
      frecuencia: { reels: '4–5 por semana', carruseles: '2 por semana', historias: 'todos los días (3–7)', largo: '1 vídeo largo o pódcast por semana', newsletter: '1 por semana' },
      metricas: ['Retención (cuánta gente ve hasta el final)', 'Envíos (compartidos por privado)', 'Guardados', 'Seguidores nuevos por publicación', 'Clics en el enlace de la bio', 'Comentarios con la palabra clave'],
      formatos: ['Reels de gancho (1 s para enganchar)', 'Series por episodios', 'Detrás de cámaras', 'Colaboraciones (collab en Instagram)', 'Reaprovechar un vídeo largo en clips', 'Newsletter'],
      imagen: {
        busquedas: ['content creator', 'podcast studio', 'video editing', 'camera setup', 'youtube'],
        prompt: 'Professional Instagram photo of a content creator studio: camera, ring light, microphone or video editing screen, modern, natural light, no text, no logos.',
        temas: [
          { id: 'podcast', re: /podcast|p[oó]dcast|micro|entrevista|audio|newsletter|voz/, fotos: ['1590602847861-f357a9332bbc', '1478737270239-2f02b77fc618', '1559523161-0fc0d8b38a7a', '1593697821252-0c9137d9fc45'] },
          { id: 'edicion', re: /clip|edici|editar|largo|youtube|serie|episodio|cap[ií]tulo/, fotos: ['1492619375914-88005aa9e8fb', '1574717024653-61fd2cf4d44d', '1611162616475-46b635cb6868'] },
          { id: 'set', re: /./, fotos: ['1516035069371-29a1b244cc32', '1598550476439-6847785fcea6', '1533750516457-a7f992034fec', '1492619375914-88005aa9e8fb'] }
        ]
      },
      automatizaciones: [
        'Comentan una palabra clave («GUÍA», «LINK») → Chispa manda el enlace por DM',
        'Contestar los comentarios de la primera hora (los que más empujan el alcance)',
        'Pedir colaboración: plantilla de mensaje a marcas y a otros creadores',
        'Del vídeo largo, 5 clips verticales con subtítulos',
        'Resumen semanal de retención, envíos y guardados',
        'Newsletter semanal con lo mejor de la semana'
      ],
      resenas: {
        positiva: '¡Gracias, {autor}! 🙌 Me alegra que te sirva. ¡Nos vemos en el próximo vídeo!',
        negativa: 'Gracias por decírmelo, {autor}. Lo tengo en cuenta para el próximo; escríbeme por DM si quieres contarme más.',
        pregunta: '¡Hola! Te lo dejo en el enlace de mi bio 🔗 Y si comentas «LINK» te lo mando por DM.'
      },
      mensajes: [
        { av: '🧑', nm: 'Álvaro', red: 'comentario en Instagram', tx: 'GUÍA', sug: '¡Hecho, Álvaro! 📩 Te la acabo de mandar por DM. Cuéntame qué te parece.' },
        { av: '🏷️', nm: 'Marca de cosmética', red: 'mensaje directo', tx: 'Hola, ¿haces colaboraciones? ¿Tienes media kit?', sug: '¡Hola! Sí 🙌 Te paso el media kit y las tarifas. ¿Qué campaña tenéis en mente y para qué fechas?' },
        { av: '👩', nm: 'Lucía', red: 'comentario en TikTok', tx: '¿Parte 2 cuándo? 😭', sug: '¡Mañana a las 20:00, Lucía! 🔔 Sígueme para que te salga.' }
      ],
      resenasEj: [
        { autor: 'Pablo N.', estrellas: 5, dias: 2, texto: 'Sus vídeos me han ayudado muchísimo. Explica claro y sin rollo.' },
        { autor: 'Marta I.', estrellas: 5, dias: 9, texto: 'Compré su curso y vale cada euro. Responde a todas las dudas.' },
        { autor: 'Iván C.', estrellas: 3, dias: 18, texto: 'Buen contenido pero últimamente sube menos vídeos largos.' },
        { autor: 'Sara K.', estrellas: 4, dias: 31, texto: 'La newsletter de los domingos es lo mejor de mi semana.' }
      ],
      semana: [
        ['El error que todos cometen', 'Gancho', 'reel', 'El error que todos cometen (y cómo evitarlo) 👀 Quédate hasta el final.', '#reels #tips #creadordecontenido'],
        ['5 consejos para guardar', 'Carrusel', 'carrusel', '5 consejos que vas a querer guardar 💾', '#tips #carrusel'],
        ['Detrás de cámaras', 'Así lo hago', 'reel', 'Lo que no se ve de mi último vídeo 🎬', '#detrasdecamaras #creador'],
        ['Comenta GUÍA', 'Te la mando', 'post', 'Comenta «GUÍA» y te la mando gratis por DM 📩', '#guia #gratis'],
        ['Encuesta de la semana', 'Tú decides', 'historia', '¿Qué vídeo hago ahora? Vota 📊', '#encuesta'],
        ['Clip del pódcast', 'Episodio nuevo', 'reel', 'El mejor minuto del episodio de esta semana 🎙️', '#podcast #clips']
      ],
      ejemplo: { nombre: 'Creadora Ejemplo', ciudad: 'Palma de Mallorca' }
    }
  ];
  /* Pendientes a propósito (reglas de publicidad propias): */
  var PENDIENTES = ['Clínicas y fisioterapia', 'Dentistas', 'Abogados y asesorías', 'Farmacias'];

  var POR_ID = {}; PERFILES.forEach(function (p) { POR_ID[p.id] = p; });

  /* ---------- utilidades ---------- */
  function sinT(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function capital(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function N() { return (window.S && S.negocio) || {}; }
  function detectar(texto) {
    var t = (texto || '').toLowerCase();
    if (!t.trim()) return null;
    // primero los sectores concretos; restaurante al final («bar» sale en muchos nombres)
    var orden = ['peluqueria', 'estetica', 'creador', 'gimnasio', 'tienda', 'cafeteria', 'talleres', 'restaurante'];
    for (var i = 0; i < orden.length; i++) { var p = POR_ID[orden[i]]; if (p.detectar.test(t)) return p.id; }
    return null;
  }
  function idActual() {
    var n = N();
    if (n.sectorId && POR_ID[n.sectorId]) return n.sectorId;
    return detectar(n.sector) || detectar(n.nombre) || 'restaurante';
  }
  /* ---------- idioma del contenido (cualquiera: código BCP-47 + nombre) ---------- */
  var PLANTILLAS_PROPIAS = { es: 1, en: 1, de: 1, fr: 1 };   // idiomas con plantillas escritas; el resto, la IA
  var RTL = { ar: 1, he: 1, fa: 1, ur: 1 };
  var IDIOMAS_RAPIDOS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'nl', 'ca', 'ar', 'zh', 'ja', 'ru'];
  function codigoValido(c) {
    c = (c || '').trim().replace(/_/g, '-'); if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(c)) return '';
    try { if (Intl.getCanonicalLocales) return Intl.getCanonicalLocales(c)[0]; } catch (e) { return ''; }
    return c;
  }
  function nombreIdioma(c) {
    try { if (Intl.DisplayNames) { var t = new Intl.DisplayNames(['es'], { type: 'language' }).of(c); if (t && t !== c) return capital(t); } } catch (e) {}
    return c;
  }
  function idiomaDe(n) {
    var i = (n && n.idioma && n.idioma.codigo) ? n.idioma : { codigo: 'es', nombre: 'Español' };
    var base = i.codigo.split('-')[0].toLowerCase();
    return { codigo: i.codigo, nombre: i.nombre || nombreIdioma(i.codigo), base: base, rtl: !!RTL[base],
      plantillas: PLANTILLAS_PROPIAS[base] ? 'propias' : 'ia', traduceIA: base !== 'es' };
  }
  /* textos del perfil que están en español y los escribe la IA cuando el idioma es otro */
  var TEXTOS_IA = ['frases', 'ideas', 'plan', 'ofertas', 'semana', 'resenas', 'mensajes', 'cta.texto', 'cta.frase', 'cta.pregunta', 'automatizaciones'];
  function actual() {
    var P = POR_ID[idActual()], n = N();
    P.idioma = idiomaDe(n);
    P.textosIA = TEXTOS_IA;
    if (P.cta.opciones) {
      if (!P._ctaBase) P._ctaBase = { texto: P.cta.texto, icono: P.cta.icono, en: P.cta.en, de: P.cta.de, fr: P.cta.fr };
      var o = null; P.cta.opciones.forEach(function (x) { if (x[0] === n.ctaTexto) o = x; });
      P.cta.texto = o ? o[0] : P._ctaBase.texto; P.cta.icono = o ? o[1] : P._ctaBase.icono;
      P.cta.en = o ? o[2] : P._ctaBase.en; P.cta.de = o ? o[3] : P._ctaBase.de; P.cta.fr = o ? o[4] : P._ctaBase.fr;
    }
    return P;
  }
  function temaDe(P, texto) {
    var t = sinT(texto), T = (P.imagen && P.imagen.temas) || [];
    for (var i = 0; i < T.length; i++) if (T[i].re.test(t) || T[i].re.test((texto || '').toLowerCase())) return T[i];
    return T[T.length - 1] || null;
  }
  function fotoPara(P, texto, n, w, h) {
    var tm = temaDe(P, texto); if (!tm) return '';
    var f = tm.fotos[((n || 0) % tm.fotos.length + tm.fotos.length) % tm.fotos.length];
    return U(f, w || 1080, h || 1080);
  }
  function horasDe(dia) {
    return (actual().horas.mejores || []).filter(function (m) { return m.dias.indexOf(dia) >= 0; })
      .map(function (m) { return { hora: m.hora, formato: m.formato, por: m.por }; })
      .sort(function (a, b) { return a.hora < b.hora ? -1 : 1; });
  }
  /* semana tipo con la forma que usa la agenda (titulo, kicker, formato, txt, tags, cat, media) */
  function semanaDe(P, neg) {
    if (!P.semana) return [];
    return P.semana.map(function (s, i) {
      var v = s[2] === 'reel' || s[2] === 'historia';
      return { titulo: s[0], kicker: s[1], formato: s[2], txt: s[3].replace('{neg}', neg || ''), tags: s[4], cat: 'local', L: i % 4, foto: i,
        media: { tipo: 'foto', url: fotoPara(P, s[0] + ' ' + s[3], i, 1080, v ? 1920 : (s[2] === 'carrusel' ? 1350 : 1080)), cred: '' } };
    });
  }

  /* =====================================================================
     ADAPTAR CHISPA AL SECTOR
     ===================================================================== */
  var ORIG = {
    ANGULOS: window.ANGULOS, ANGL_T: window.ANGL_T, PLANPOOL: window.PLANPOOL, ejemploIdea: window.ejemploIdea,
    proponerHoy: window.proponerHoy, ponerOferta: window.ponerOferta, ctaBotones: window.ctaBotones,
    abrirCta: window.abrirCta, chispaEnlace: window.chispaEnlace, crearImagenIA: window.crearImagenIA, vAjustes: window.vAjustes, panel: window.panel
  };

  function angulosDe(P) {
    var base = ORIG.ANGULOS || [], f = P.frases, h = P.hashtags;
    var tags = [[h[0], '#{tag}', '#Palma', '#Mallorca'], ['#oferta', h[0], '#{tag}', '#Mallorca'], ['#{tag}', h[1], '#Palma'], ['#Palma', '#Mallorca', h[0], h[2]]];
    return ['gancho', 'oferta', 'pregunta', 'local'].map(function (k, i) {
      var b = base[i] || {};
      return { k: b.k || k, por: b.por || '', v: f[k], tags: tags[i] };
    });
  }
  function traduccionesDe(P) {
    var c = P.cta;
    var T = {
      en: [['{idea} ✨\n\nAt {neg} we have it ready for you. ' + c.en + '.', 'This is {idea} 😍\n\nOnly at {neg}. ' + c.en + '.'],
        ['This week only: {idea} 🔥\n\n' + c.en + ' at {neg} 📲', 'Today: {idea}! ⏰\n\nLimited spots at {neg}.'],
        ['Have you tried {idea}? 👀\n\nTell us in the comments 👇', 'Hey, {idea}? 🤔 {neg} is waiting for you.'],
        ['If you are in Palma, this is for you: {idea} 💛\n\n{neg}.', 'Palma, listen up 📣 {idea} at {neg}. Tag a friend.']],
      de: [['{idea} ✨\n\nBei {neg} ist alles bereit. ' + c.de + '.', 'Das ist {idea} 😍\n\nNur bei {neg}. ' + c.de + '.'],
        ['Nur diese Woche: {idea} 🔥\n\n' + c.de + ' bei {neg} 📲', 'Heute: {idea}! ⏰\n\nNur wenige Plätze bei {neg}.'],
        ['Schon {idea} probiert? 👀\n\nSchreib es in die Kommentare 👇', 'Hey, {idea}? 🤔 {neg} wartet auf dich.'],
        ['Wenn du in Palma bist, ist das für dich: {idea} 💛\n\n{neg}.', 'Palma, aufgepasst 📣 {idea} bei {neg}. Markiere einen Freund.']],
      fr: [['{idea} ✨\n\nChez {neg}, tout est prêt pour toi. ' + c.fr + '.', 'Voici {idea} 😍\n\nSeulement chez {neg}. ' + c.fr + '.'],
        ['Cette semaine seulement : {idea} 🔥\n\n' + c.fr + ' chez {neg} 📲', 'Aujourd\'hui : {idea} ! ⏰\n\nPlaces limitées chez {neg}.'],
        ['Tu as déjà essayé {idea} ? 👀\n\nDis-le en commentaire 👇', 'Hé, {idea} ? 🤔 {neg} t\'attend.'],
        ['Si tu es à Palma, c\'est pour toi : {idea} 💛\n\n{neg}.', 'Palma, attention 📣 {idea} chez {neg}. Identifie un ami.']]
    };
    var out = {}, h = P.hashtags;
    Object.keys(T).forEach(function (l) { out[l] = T[l].map(function (v, i) { return { v: v, tags: ['#{tag}', h[0], '#Palma', '#Mallorca'] }; }); });
    return out;
  }

  /* textos del panel: «mesa», «carta», «reservar»… → lo equivalente del sector */
  var REGLAS = [];
  function reglasDe(P) {
    var e = P.etq, c = P.cta, R = [];
    function caso(m, s) { return /^[A-ZÁÉÍÓÚÑ¿¡]/.test(m.replace(/^[¿¡]/, '')) ? capital(s) : s; }
    R.push([/Reservar por WhatsApp/g, function () { return c.whatsapp; }]);
    R.push([/[Rr]eserva tu mesa/g, function (m) { return caso(m, c.frase); }]);
    R.push([/[Rr]eservar (una )?mesa/g, function (m) { return caso(m, c.texto.toLowerCase()); }]);
    R.push([/¿Te (guardamos|reservamos) mesa\?/g, function () { return '¿' + c.pregunta + '?'; }]);
    if (e.mesa !== 'mesa') { R.push([/\bmesas\b/g, function () { return e.mesas; }]); R.push([/\bmesa\b/g, function () { return e.mesa; }]); }
    if (e.carta !== 'carta') {
      R.push([/📖 Ver carta|Ver carta/g, function (m) { return (/📖/.test(m) ? (e.iconoCarta || '📖') + ' ' : '') + e.verCarta; }]);
      R.push([/\b[Cc]arta\b/g, function (m) { return caso(m, e.carta); }]);
    }
    R.push([/📅 Reservar\b/g, function () { return c.icono + ' ' + c.texto; }]);
    R.push([/\bReservar\b/g, function () { return c.texto; }]);
    R.push([/\breservar\b/g, function () { return c.texto.toLowerCase(); }]);
    if (e.reservas !== 'reservas') {
      R.push([/\b[Rr]eservas\b/g, function (m) { return caso(m, e.reservas); }]);
      R.push([/\b[Rr]eserva\b/g, function (m) { return caso(m, e.reserva); }]);
    }
    var art = /^(peluquer|tienda|cafeter|empresa)/.test(e.negocio) ? 'una' : 'un';
    R.push([/\b([Uu])n restaurante\b/g, function (m, u) { return (u === 'U' ? capital(art) : art) + ' ' + e.negocio; }]);
    R.push([/\b[Rr]estaurante\b/g, function (m) { return caso(m, e.negocio); }]);
    R.push([/\bmen[uú] del d[ií]a\b/gi, function (m) { return caso(m, e.menuDia || 'oferta del día'); }]);
    return R;
  }
  var SALTAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1 };
  function traducirNodo(raiz) {
    if (!REGLAS.length || !raiz) return;
    if (raiz.nodeType === 3) { cambiarTexto(raiz); return; }
    if (raiz.nodeType !== 1 || SALTAR[raiz.nodeName] || (raiz.closest && raiz.closest('[data-sin-sector]'))) return;
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { var p = n.parentNode; if (!p || SALTAR[p.nodeName] || (p.closest && p.closest('[data-sin-sector]'))) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; }
    });
    var L = [], n; while ((n = w.nextNode())) L.push(n);
    L.forEach(cambiarTexto);
    if (raiz.querySelectorAll) Array.prototype.forEach.call(raiz.querySelectorAll('[placeholder],[title]'), function (el) {
      if (el.closest('[data-sin-sector]')) return;
      ['placeholder', 'title'].forEach(function (a) { var v = el.getAttribute(a); if (v) { var nv = aplicarReglas(v); if (nv !== v) el.setAttribute(a, nv); } });
    });
  }
  function aplicarReglas(s) { var o = s; REGLAS.forEach(function (r) { o = o.replace(r[0], r[1]); }); return o; }
  function cambiarTexto(t) { var v = t.nodeValue; if (!v || v.length < 3) return; var nv = aplicarReglas(v); if (nv !== v) t.nodeValue = nv; }
  var observador = null, cola = [], programado = false;
  function vigilar(on) {
    if (observador) { observador.disconnect(); observador = null; }
    if (!on) return;
    observador = new MutationObserver(function (ms) {
      ms.forEach(function (m) { for (var i = 0; i < m.addedNodes.length; i++) cola.push(m.addedNodes[i]); });
      if (!programado) { programado = true; requestAnimationFrame(function () { programado = false; var c = cola; cola = []; c.forEach(traducirNodo); }); }
    });
    observador.observe(document.body, { childList: true, subtree: true });
    traducirNodo(document.getElementById('app'));
  }

  function placeholders(P) {
    var i = document.getElementById('idea');
    if (i && P.cambia) i.placeholder = 'Ej: ' + P.ideas.slice(0, 3).map(function (x) { return x.toLowerCase(); }).join(', ') + '…';
    var r = document.getElementById('mn_reserva');
    if (r && P.cambia) r.placeholder = 'https://… (' + P.cta.enlaces + ')';
  }

  /* ---------- envolturas: con «restaurante» llaman a lo de siempre ---------- */
  function telE164(s) { var d = (s || '').replace(/[^\d+]/g, ''); if (d.charAt(0) === '+') return d; if (d.indexOf('00') === 0) return '+' + d.slice(2); if (d.length === 9) return '+34' + d; return '+' + d; }
  function waSector() {
    var n = N(), P = actual(); if (!n.whatsapp) return '';
    return 'https://wa.me/' + telE164(n.whatsapp).replace('+', '') + '?text=' + encodeURIComponent(P.cta.mensaje.replace('{neg}', n.nombre || 'vuestro negocio'));
  }
  window.abrirCta = function (tipo) {
    var P = actual();
    if (P.cambia && tipo === 'whatsapp') { var u = waSector(); if (u) { var w = null; try { w = window.open(u, '_blank'); } catch (e) {} if (!w) location.href = u; return; } }
    return ORIG.abrirCta.apply(this, arguments);
  };
  if (ORIG.chispaEnlace) window.chispaEnlace = function (tipo) {
    if (actual().cambia && tipo === 'whatsapp') return waSector();
    return ORIG.chispaEnlace.apply(this, arguments);
  };
  window.ctaBotones = function () {
    var P = actual(); if (!P.cambia) return ORIG.ctaBotones.apply(this, arguments);
    var n = N(), h = '<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">';
    h += '<button class="btn pp" style="flex:none" onclick="abrirCta(\'reserva\')">' + P.cta.icono + ' ' + P.cta.texto + '</button>';
    h += '<button class="btn g" style="flex:none" onclick="abrirCta(\'web\')">🌐 Ver web</button>';
    if (n.carta) h += '<button class="btn g" style="flex:none" onclick="abrirCta(\'carta\')">' + (P.etq.iconoCarta || '📖') + ' ' + P.etq.verCarta + '</button>';
    if (n.whatsapp) h += '<button class="btn g" style="flex:none" onclick="abrirCta(\'whatsapp\')">💬 ' + P.cta.whatsapp + '</button>';
    if (n.telefono) h += '<button class="btn g" style="flex:none" onclick="abrirCta(\'tel\')">📞 Llamar</button>';
    return h + '</div>';
  };
  /* botones de las tarjetas del Estudio (sin tocar chispa-estudio.js): se corrigen justo antes de pintar */
  /* idioma ≠ español: el Estudio escribe «Nombre, en Ciudad»; sin ciudad durante la generación no queda ese «en» español */
  var generarAntes = window.generar;
  if (generarAntes) window.generar = function () {
    var P = actual(), n = N(), c = n.ciudad;
    if (!P.idioma.traduceIA || !c) return generarAntes.apply(this, arguments);
    n.ciudad = '';
    try { return generarAntes.apply(this, arguments); } finally { n.ciudad = c; }
  };
  if (ORIG.crearImagenIA) window.crearImagenIA = function (i) {
    var P = actual(), p = window._posts && window._posts[i];
    if (P.cambia && p && p.ctas) {
      p.ctas = p.ctas.filter(function (c) { return c.tipo !== 'club'; }).map(function (c) {
        if (c.tipo === 'reserva' && /Reservar/.test(c.t)) c.t = P.cta.icono + ' ' + P.cta.texto;
        else if (c.tipo === 'carta' && /Ver carta/.test(c.t)) c.t = (P.etq.iconoCarta || '📖') + ' ' + P.etq.verCarta;
        return c;
      });
    }
    // antetítulos de cocina del Estudio («De nuestra cocina», «Desde 1968»…) → neutros
    if (P.cambia && p && /^(Recién hecho|De nuestra cocina|Desde 1968|¿Ya lo probaste\?)$/.test(p.kicker || '') && !(P.id === 'cafeteria' && p.kicker === 'Recién hecho')) {
      var k = ['Hoy en {neg}', 'Tu sitio en Palma', 'Esta semana', 'No te lo pierdas']; p.kicker = k[i % k.length];
    }
    // idioma ≠ español: nada de antetítulos fijos en español sobre la imagen; el botón, en su idioma si lo hay
    if (p && P.idioma.traduceIA && !p._idiomaHecho) {
      p._idiomaHecho = 1; p.kicker = '{neg}';
      var tc = P.cta[P.idioma.base];
      if (p.ctas && p.ctas[0] && tc) p.ctas[0].t = P.cta.icono + ' ' + tc;
      p.traducirIA = !tc;   // marca: estos botones los escribe la IA en el idioma
    }
    return ORIG.crearImagenIA.apply(this, arguments);
  };
  window.ejemploIdea = function () {
    var P = actual();
    if (P.idioma.traduceIA) setTimeout(function () { toast('💬 Idea en español: la IA la escribe en ' + P.idioma.nombre + ' (o escríbela tú en ' + P.idioma.nombre + ')'); }, 30);
    if (!P.cambia) return ORIG.ejemploIdea();
    return P.ideas[Math.floor(Math.random() * P.ideas.length)];
  };
  window.proponerHoy = function () {
    var P = actual(); if (!P.cambia && !P.idioma.traduceIA) return ORIG.proponerHoy.apply(this, arguments);
    if (typeof window.generar === 'function') window.generar(window.ejemploIdea(), true);
  };
  window.ponerOferta = function () {
    var P = actual(); if (!P.cambia) return ORIG.ponerOferta.apply(this, arguments);
    var o = N().oferta || '';
    modal('<h3>🔥 Oferta / descuento</h3><p style="color:var(--tx3);font-size:12.5px;margin:0 0 8px">Aparece como un sello llamativo en todas tus publicaciones y se menciona en el texto.</p>' +
      '<label class="lb">¿Qué oferta destacas?</label><input class="inp" id="ofTxt" value="' + esc(o) + '" placeholder="Ej: ' + esc(P.ofertas[0]) + '">' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">' + P.ofertas.map(function (c) { return '<button class="btn g sm" style="flex:none" onclick="document.getElementById(\'ofTxt\').value=this.textContent">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:14px;gap:8px"><button class="btn pp" style="flex:1" onclick="guardarOferta()">Guardar oferta</button>' +
      (o ? '<button class="btn g" style="flex:none" onclick="S.negocio.oferta=\'\';guardar();cerrarModal();refrescarActual();toast(\'Oferta quitada\')">Quitar</button>' : '') + '</div>');
  };

  /* ---------- motor de imágenes: palabras clave del sector sin tocar chispa-estudio.js ---------- */
  var MOTOR = window.CHISPA_MOTOR;
  if (MOTOR && MOTOR.proveedores && MOTOR.generar && !MOTOR._sector) {
    MOTOR._sector = true;
    var fotosOrig = MOTOR.proveedores.fotos, generarOrig = MOTOR.generar;
    MOTOR.proveedores.fotos = function (q) {
      var P = actual(); if (!P.cambia || !fotosOrig) return fotosOrig(q);
      var n = q.cantidad || 1, ctx = q.contexto || q.prompt || '', sl = [];
      for (var s = 0; s < n; s++) sl.push({ url: fotoPara(P, ctx, (q.semilla || 0) + s * 2, q.ancho, q.alto), cred: '' });
      return Promise.all(sl.map(function (x) { return new Promise(function (ok) { var im = new Image(); im.crossOrigin = 'anonymous'; im.onload = ok; im.onerror = ok; im.src = x.url; }); }))
        .then(function () { return n > 1 ? { tipo: 'foto', slides: sl, url: sl[0].url, cred: '' } : { tipo: 'foto', url: sl[0].url, cred: '' }; });
    };
    MOTOR.generar = function (q) {
      var P = actual();
      if (P.cambia && q) {
        var ctx = String(q.prompt || '').split('Context:').slice(1).join(' ');
        q = Object.assign({}, q, { contexto: ctx, sector: P.id, palabras: P.imagen.busquedas.slice(), prompt: P.imagen.prompt + (ctx ? ' Context:' + ctx : '') });
      }
      return generarOrig.call(MOTOR, q);
    };
  }

  /* ---------- tarjeta «Tipo de negocio» en «Mi negocio» ---------- */
  function C() { return window.ChispaCuentas || null; }
  function adminUI() { var c = C(); return !!(c && c.adminUI && c.adminUI()); }
  function resumenHtml(P) {
    var d = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    var horas = P.horas.mejores.map(function (m) { return '<li><b>' + m.dias.map(function (x) { return d[x]; }).join('·') + ' ' + m.hora + '</b> — ' + esc(m.por) + '</li>'; }).join('');
    return '<details class="sec-det"><summary>Lo que Chispa pone para ' + (P.id === 'restaurante' ? 'un restaurante' : 'tu ' + esc(P.corto)) + '</summary>' +
      '<div class="sec-res"><div><b>Botón principal:</b> ' + P.cta.icono + ' ' + esc(P.cta.texto) + ' <span style="color:var(--tx3)">(con tu enlace: ' + esc(P.cta.enlaces) + '. Chispa no lleva tu agenda: abre la tuya.)</span></div>' +
      '<div style="margin-top:8px"><b>Mejores horas para publicar</b><ul>' + horas + '</ul></div>' +
      '<div><b>Automatizaciones sugeridas</b><ul>' + P.automatizaciones.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' +
      (P.formatos ? '<div><b>Formatos</b><ul>' + P.formatos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' : '') +
      (P.frecuencia ? '<div><b>Frecuencia</b><ul>' + Object.keys(P.frecuencia).map(function (k) { return '<li>' + esc(capital(k)) + ': ' + esc(P.frecuencia[k]) + '</li>'; }).join('') + '</ul></div>' : '') +
      (P.metricas ? '<div><b>Métricas que importan</b><ul>' + P.metricas.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div><b>Hashtags:</b> ' + esc(P.hashtags.join(' ')) + ' · <b>Tono:</b> ' + esc(P.tono) + '</div></div></details>';
  }
  function idiomaHtml(P) {
    var I = P.idioma;
    return '<div class="sec-ver"><b>🌍 Idioma del contenido</b><div class="sec-p" style="margin:2px 0 6px">Cualquier idioma: código (es, it, pt-BR, zh-Hans…) y nombre. Ahora: <b>' + esc(I.nombre) + '</b> (' + esc(I.codigo) + ')' +
      (I.traduceIA ? (I.plantillas === 'propias' ? ' · plantillas propias' : ' · las plantillas las escribe la <span class="sec-ia">IA</span>') : '') + '.</div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' + IDIOMAS_RAPIDOS.map(function (c) {
        return '<button class="btn ' + (I.codigo === c ? 'pp' : 'g') + ' sm" style="flex:none" onclick="ChispaSector.idioma(\'' + c + '\')">' + c + '</button>'; }).join('') + '</div>' +
      '<div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><input class="inp" id="secLang" placeholder="Código: pl, sv, tr, pt-BR…" style="flex:1 1 120px" autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<input class="inp" id="secLangN" placeholder="Nombre (opcional)" style="flex:1 1 120px" autocomplete="off">' +
      '<button class="btn g sm" style="flex:none" onclick="ChispaSector.idioma(document.getElementById(\'secLang\').value,document.getElementById(\'secLangN\').value)">Poner</button></div></div>';
  }
  function ctaHtml(P) {
    if (!P.cta.opciones) return '';
    return '<div class="sec-ver"><b>👉 Botón principal</b><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">' + P.cta.opciones.map(function (o) {
      return '<button class="btn ' + (o[0] === P.cta.texto ? 'pp' : 'g') + ' sm" style="flex:none" onclick="ChispaSector.cta(\'' + o[0] + '\')">' + o[1] + ' ' + esc(o[0]) + '</button>'; }).join('') +
      '</div><div class="sec-p" style="margin-top:6px">Abre tu enlace de «' + esc(P.etq.reservas) + '» de Mi negocio (' + esc(P.cta.enlaces) + ').</div></div>';
  }
  function tarjetaSector() {
    var P = actual(), adm = adminUI(), n = N(), c = C();
    var h = '<div class="card" id="secCard" data-sin-sector><h3>🧭 Tipo de negocio</h3>';
    if (adm) {
      h += '<p class="sec-p">Elige el sector y Chispa se adapta entera: botón principal, ideas, horas, imágenes, respuestas y automatizaciones.</p>' +
        '<div class="sec-grid">' + PERFILES.map(function (p) {
          return '<button class="sec-b' + (p.id === P.id ? ' on' : '') + '" onclick="ChispaSector.elegir(\'' + p.id + '\')"><span class="i">' + p.icono + '</span><span>' + esc(p.nombre) + '</span></button>';
        }).join('') + '</div><div id="secSug" class="sec-sug"></div>' +
        '<p class="sec-p" style="margin-top:8px">Pendientes (tienen reglas de publicidad propias, no se añaden todavía): ' + esc(PENDIENTES.join(', ')) + '.</p>';
      h += '<div class="sec-ver"><b>👀 Enseñar Chispa a un cliente</b><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">' +
        PERFILES.filter(function (p) { return p.cambia; }).map(function (p) {
          return '<button class="btn g sm" style="flex:none" onclick="ChispaSector.probarComo(\'' + p.id + '\')">' + p.icono + ' Ver como ' + esc(p.corto) + '</button>';
        }).join('') +
        (c && c.idActual && c.idActual() !== 'paraiso' ? '<button class="btn pp sm" style="flex:none" onclick="ChispaCuentas.entrar(\'paraiso\')">↩ Volver a El Paraíso</button>' : '') +
        '<button class="btn g sm" style="flex:none" onclick="panel(\'clientes\')">🗂️ Mis clientes</button></div>' +
        '<div class="sec-p" style="margin-top:6px">Abre un negocio de EJEMPLO de ese sector. Los datos de El Paraíso no se tocan: cada negocio se guarda aparte.</div></div>';
    } else {
      h += '<div class="row" style="align-items:center;gap:10px"><span style="font-size:30px">' + P.icono + '</span><div><div style="font-weight:800">' + esc(P.nombre) + '</div>' +
        '<div class="sec-p" style="margin:0">Tu sector lo fija Solers al darte de alta. Si no es el tuyo, escríbenos.</div></div></div>';
    }
    h += idiomaHtml(P) + ctaHtml(P);
    return h + resumenHtml(P) + '</div>';
  }
  var css = document.createElement('style');
  css.textContent =
    '.sec-p{font-size:12.5px;color:var(--tx3);margin:4px 0 8px}' +
    '.sec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}' +
    '.sec-b{display:flex;align-items:center;gap:8px;text-align:left;border:1px solid var(--line);background:var(--panel2);color:var(--tx);border-radius:12px;padding:10px;cursor:pointer;font-weight:700;font-size:13px;min-height:48px}' +
    '.sec-b .i{font-size:22px}.sec-b.on{border-color:var(--purple);background:rgba(139,92,246,.16);box-shadow:0 0 0 2px rgba(139,92,246,.25)}' +
    '.sec-b.sug{border-color:var(--amber)}' +
    '.sec-sug{font-size:12.5px;margin-top:8px;color:var(--amber)}.sec-sug button{margin-left:6px}' +
    '.sec-ver{margin-top:12px;padding:10px 12px;border:1px dashed var(--line);border-radius:12px}' +
    '.sec-det{margin-top:12px}.sec-det summary{cursor:pointer;font-weight:700;font-size:13px;color:var(--purple2)}' +
    '.sec-res{font-size:12.5px;color:var(--tx2);margin-top:8px}.sec-res ul{margin:4px 0 8px;padding-left:18px}.sec-res li{margin:3px 0}' +
    '.sec-ia{font-size:10px;font-weight:800;padding:1px 6px;border-radius:20px;background:rgba(96,165,250,.18);color:#93c5fd;border:1px solid rgba(96,165,250,.45)}' +
    '.sec-idi-av{font-size:12.5px;color:var(--tx2);background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.35);border-radius:12px;padding:9px 12px;margin:0 0 12px}' +
    '@media(max-width:420px){.sec-grid{grid-template-columns:1fr 1fr}.sec-b{font-size:12px;padding:8px}}';
  document.head.appendChild(css);

  window.vAjustes = function () {
    var html = ORIG.vAjustes.apply(this, arguments);
    var marca = '<div class="card"><h3>🏷️ Quién eres</h3>';
    var i = html.indexOf(marca);
    return i >= 0 ? html.slice(0, i) + tarjetaSector() + html.slice(i) : tarjetaSector() + html;
  };
  function sugerir() {
    var d = document.getElementById('secSug'); if (!d) return;
    var s = document.getElementById('mn_sector'), nm = document.getElementById('mn_nombre');
    var id = detectar((s && s.value) || '') || detectar((nm && nm.value) || '');
    Array.prototype.forEach.call(document.querySelectorAll('.sec-b'), function (b) { b.classList.remove('sug'); });
    if (!id || id === idActual()) { d.innerHTML = ''; return; }
    var P = POR_ID[id];
    d.innerHTML = 'Por lo que has escrito parece <b>' + P.icono + ' ' + esc(P.nombre) + '</b>.<button class="btn g sm" onclick="ChispaSector.elegir(\'' + id + '\')">Usar este sector</button>';
  }
  function despuesDePintar(tab) {
    var P = actual();
    placeholders(P);
    if (tab === 'ajustes') {
      if (adminUI()) ['mn_sector', 'mn_nombre'].forEach(function (k) { var el = document.getElementById(k); if (el) el.addEventListener('input', sugerir); });
      // datos de otro negocio: fuera, salvo para Solers dentro de El Paraíso
      var c = C(), propio = !c || !c.idActual || c.idActual() === 'paraiso';
      if (!propio || (c && c.esCliente && c.esCliente())) Array.prototype.forEach.call(document.querySelectorAll('#main button'), function (b) {
        var oc = b.getAttribute('onclick') || ''; if (/mnRestaurarParaiso|resetTodo/.test(oc)) b.remove();
      });
    }
    if (tab === 'asistente') idiomaAsistente(P);
    if (P.cambia) traducirNodo(document.getElementById('main'));
  }
  function idiomaAsistente(P) {
    var I = P.idioma, sel = document.getElementById('contLang');
    if (sel) {
      if (!sel.querySelector('option[value="' + I.base + '"]')) { var o = document.createElement('option'); o.value = I.base; o.textContent = '🌍 ' + I.nombre; sel.appendChild(o); }
      sel.value = I.base; window._lang = I.base;
    }
    if (!I.traduceIA || document.getElementById('secIdiAviso')) return;
    var c = document.querySelector('#main .card'); if (!c) return;
    var d = document.createElement('div'); d.id = 'secIdiAviso'; d.className = 'sec-idi-av'; d.setAttribute('data-sin-sector', '');
    d.innerHTML = '🌍 Contenido en <b>' + esc(I.nombre) + '</b> (' + esc(I.codigo) + '). ' +
      (I.plantillas === 'propias' ? 'Las plantillas de Chispa ya están escritas en ese idioma. ' : 'Chispa usa plantillas sin frases en español. ') +
      'Lo marcado <span class="sec-ia">IA</span> (ideas, ofertas y respuestas de ejemplo, escritas en español) lo escribe la IA en ' + esc(I.nombre) + '. Mientras no esté conectada, escribe tu idea directamente en ' + esc(I.nombre) + '.';
    c.parentNode.insertBefore(d, c.nextSibling);
  }
  window.panel = function (tab) {
    var r = ORIG.panel.apply(this, arguments);
    try { despuesDePintar(tab); } catch (e) { try { console.warn('sectores:', e && e.message); } catch (x) {} }
    return r;
  };

  /* ---------- aplicar el perfil (al cargar y al cambiar) ---------- */
  function aplicar() {
    var P = actual();
    if (P.cambia) {
      window.ANGULOS = angulosDe(P);
      window.ANGL_T = traduccionesDe(P);
      window.PLANPOOL = P.plan;
      REGLAS = reglasDe(P);
    } else {
      window.ANGULOS = ORIG.ANGULOS; window.ANGL_T = ORIG.ANGL_T; window.PLANPOOL = ORIG.PLANPOOL; REGLAS = [];
    }
    // idioma del contenido: en/de/fr tienen plantillas; cualquier otro, plantillas neutras (sin español) que completa la IA
    var I = P.idioma, T = {}, k;
    for (k in (window.ANGL_T || {})) T[k] = window.ANGL_T[k];
    if (I.traduceIA && !T[I.base]) {
      var neutra = ['{idea} ✨\n\n📍 {neg}', '{idea} 🔥\n\n👉 {neg}', '{idea} 👀\n\n💬 👇', '{idea} 💛\n\n📍 {neg}'];
      T[I.base] = neutra.map(function (v) { return { v: [v], tags: ['#{tag}', '#Palma', '#Mallorca'], ia: true }; });
    }
    window.ANGL_T = T;
    window._lang = I.base;
    vigilar(P.cambia);
    try { window.dispatchEvent(new CustomEvent('chispa:sector', { detail: { id: P.id, perfil: P } })); } catch (e) {}
  }

  function elegir(id) {
    if (!POR_ID[id]) return;
    if (!adminUI()) { toast('El sector lo fija Solers 🙂'); return; }
    var n = N(), antes = actual(), P = POR_ID[id];
    var c = C();
    if (c && c.idActual && c.idActual() === 'paraiso' && id !== 'restaurante' && !confirm('El Paraíso es un restaurante. ¿Cambiar SU sector a «' + P.nombre + '»?\n\nPara enseñar otro sector sin tocar El Paraíso usa «Ver como…».')) return;
    n.sectorId = id;
    if (!n.sector || n.sector === antes.nombre) n.sector = P.nombre;
    if (!n.logoUrl && (!n.logo || antes.iconos.indexOf(n.logo) >= 0)) n.logo = P.icono;
    guardar();
    if (c && c.actualizarSector) c.actualizarSector(id);
    aplicar();
    if (typeof pintarNav === 'function') pintarNav();
    window.panel('ajustes');
    toast(P.icono + ' Chispa ya está en modo ' + P.corto);
  }
  function probarComo(id) {
    var c = C(); if (!c) return;
    c.ejemploDe(id).then(function (e) { if (e) c.entrar(e.id); });
  }

  window.ChispaSector = {
    version: '2026-10-07',
    lista: function () { return PERFILES.slice(); },
    get: function (id) { return POR_ID[id] || null; },
    actual: actual,
    idActual: idActual,
    detectar: detectar,
    elegir: elegir,
    probarComo: probarComo,
    aplicar: aplicar,
    horasDe: horasDe,
    semana: function (neg) { return semanaDe(actual(), neg || N().nombre); },
    semanaDe: function (id, neg) { return semanaDe(POR_ID[id] || actual(), neg); },
    fotoPara: function (texto, n, w, h) { return fotoPara(actual(), texto, n, w, h); },
    iconos: function () {
      var P = actual(), base = ['🍽️', '✂️', '🔧', '🏗️', '☕', '💅', '🐶', '🏠', '👗', '🥐'];
      return P.iconos.concat(base.filter(function (x) { return P.iconos.indexOf(x) < 0; })).slice(0, 12);
    },
    pendientes: PENDIENTES.slice(),
    idiomasRapidos: IDIOMAS_RAPIDOS.slice(),
    /* idioma del contenido del negocio abierto (lo pueden poner Solers y el cliente) */
    idioma: function (codigo, nombre) {
      var c = codigoValido(codigo); if (!c) { toast('Ese código de idioma no vale (ej.: it, pt-BR, zh-Hans)'); return; }
      var n = N(); n.idioma = { codigo: c, nombre: (nombre || '').trim() || nombreIdioma(c) }; guardar();
      aplicar(); window.panel(typeof TAB !== 'undefined' ? TAB : 'ajustes'); toast('🌍 Contenido en ' + n.idioma.nombre);
    },
    cta: function (texto) { var n = N(); n.ctaTexto = texto; guardar(); aplicar(); window.panel('ajustes'); toast('Botón principal: ' + texto); },
    /* lo que necesita el motor de IA (trabajador G) para escribir en el idioma y el estilo del negocio */
    paraIA: function () {
      var P = actual(), n = N();
      return { sector: P.id, idioma: P.idioma, tono: n.tono || P.tono, negocio: n.nombre, ciudad: n.ciudad, cta: { texto: P.cta.texto, frase: P.cta.frase },
        hashtags: P.hashtags.slice(), textosIA: TEXTOS_IA.slice(), origen: 'es' };
    }
  };
  // atajo de lectura para el calendario y el motor: ChispaSector.actual().semana sigue siendo la lista cruda;
  // la versión lista para la agenda es ChispaSector.semana().

  aplicar();
  if (document.getElementById('app') && document.getElementById('app').classList.contains('on') && typeof TAB !== 'undefined') {
    try { window.panel(TAB); } catch (e) {}
  }
})();
