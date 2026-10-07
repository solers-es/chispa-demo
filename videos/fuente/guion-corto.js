// Corte corto de Chispa para redes (≈ 90 s).
const PORTADA = `<div class="bolt">⚡</div><h1>¿No te da la vida<br><span>para las redes?</span></h1>
<p>Esto es Chispa · tu marketing en automático</p>`;
const CIERRE = `<div class="bolt">⚡</div><h1>Tú atiendes tu negocio.<br><span>Chispa llena tus redes.</span></h1>
<p>Pide una demostración con tu propio negocio</p><div class="url">solers-es.github.io/chispa-demo</div>
<div class="pie">Una herramienta de Solers</div>`;
const card = i => `#cmCard_${i}`;
async function irPanel(h, tab) { await h.v(t => { vista('panel'); if (t) panel(t); window.scrollTo(0, 0); }, tab || null); await h.esperar(800); }

module.exports = {
  escenas: [
    {
      id: 'c-portada', entrada: 300,
      preparar: async h => { await h.v(() => window.__V.cursorVisible(false)); await h.tarjeta(PORTADA); await h.esperar(900); },
      segs: [{ t: '¿Tienes un negocio y no te da la vida para las redes sociales? Esto es Chispa: el asistente que lleva tus redes mientras tú atiendes a tus clientes.', pausa: 0.5 }],
      despues: async h => { await h.quitarTarjeta(); await h.v(() => window.__V.cursorVisible(true)); },
    },
    {
      id: 'c-crear', rotulo: ['1', 'Le dices la idea', 'y Chispa escribe la publicación'],
      preparar: async h => { await irPanel(h, 'asistente'); await h.esperar(1500); await h.mover(700, 300, 10); },
      segs: [
        { t: 'Le dices la idea en una frase,', a: async h => { await h.escribir('#idea', 'Paella de marisco este domingo', 55); } },
        { t: 'y Chispa escribe la publicación, le pone una foto con movimiento y el sello de tu marca.',
          a: async h => { await h.clic('button:has-text("Que Chispa lo escriba")', { despues: 1800 }); await h.verEn(card(0), 'start'); await h.zoom(`${card(0)} .cm-media`, 1.4); await h.esperar(1500); await h.sinZoom(600); } },
        { t: '¿No te convence? Pides otra versión, o subes tu propia foto desde el móvil.',
          a: async h => { await h.clic(`${card(0)} .cm-acts button >> nth=0`, { despues: 1500 }); await h.resaltar(`${card(0)} .cm-acts button >> nth=1`, 1200); } },
      ],
    },
    {
      id: 'c-asi', rotulo: ['2', 'Así lo ve tu cliente', 'en todas las redes'],
      preparar: async h => { },
      segs: [
        { t: 'Antes de publicar, ves cómo quedará en Instagram, TikTok, Facebook, WhatsApp, Google y YouTube.',
          a: async h => { await h.clic(`${card(0)} .cm-acts button >> nth=4`, { despues: 800 }); await h.mover(700, 500); for (const y of [600, 1250, 1900]) { await h.scrollSuave('#cmBox', y); await h.esperar(500); } } },
      ],
      despues: async h => { await h.cerrarTodo(); },
    },
    {
      id: 'c-pub', rotulo: ['3', 'Publicar', 'en todas tus redes a la vez'],
      preparar: async h => { await h.cerrarTodo(); await h.v(() => window.scrollTo(0, 0)); },
      segs: [
        { t: 'Eliges las redes, y queda todo listo para publicar con un toque.',
          a: async h => { await h.clic('button:has-text("Ver demo de publicación")', { despues: 600 }); await h.mover(330, 420); await h.esperar(5200); } },
      ],
      despues: async h => { await h.cerrarTodo(); },
    },
    {
      id: 'c-cal', rotulo: ['4', 'Calendario', 'a las mejores horas'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'calendario'); },
      segs: [
        { t: 'Con un toque, reparte tu semana en las mejores horas, con tus promociones incluidas.',
          a: async h => { await h.clic('#main button:has-text("Planificar mi semana")', { despues: 1200 }); await h.mover(700, 420); await h.esperar(1800); } },
        { t: 'Y entiende frases como: «pon una promo el viernes de seis a once, con cuatro historias».',
          a: async h => { await h.clic('#main button:has-text("Pon una promo el viernes")', { despues: 1500 }); } },
      ],
    },
    {
      id: 'c-msg', rotulo: ['5', 'Comentarios y mensajes', 'respuestas listas para aprobar'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'bandeja'); },
      segs: [
        { t: 'Te deja escritas las respuestas a comentarios y mensajes. Tú solo las apruebas.',
          a: async h => { await h.resaltar('#main >> text=Quiero reservar para 8 personas', 1400); await h.clic('#main button:has-text("Aprobar y enviar") >> nth=1', { despues: 900 }); } },
      ],
    },
    {
      id: 'c-res', rotulo: ['6', 'Reseñas', 'contestadas en su idioma'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'resenas'); await h.v(() => window.scrollTo(0, 380)); },
      segs: [
        { t: 'Contesta tus reseñas en el idioma de cada cliente. Las negativas, siempre las revisas tú.',
          a: async h => { await h.verEn('#main >> text=Lovely spot in Palma'); await h.resaltar('#main >> text=Hi Emma', 2000); await h.scrollSuave(null, 0); await h.clic('#main button:has-text("Negativas")', { despues: 600 }); } },
      ],
    },
    {
      id: 'c-stats', rotulo: ['7', 'Estadísticas', 'qué funciona y qué no'],
      preparar: async h => { await h.cerrarTodo(); await irPanel(h, 'stats'); },
      segs: [
        { t: 'Y te dice qué funciona: a qué hora te ven más, y qué tipo de publicación te trae más gente.',
          a: async h => { await h.mover(760, 520); await h.rueda(700, 14, 1400); await h.esperar(600); } },
      ],
    },
    {
      id: 'c-cierre', entrada: 300,
      preparar: async h => { await h.v(() => window.__V.cursorVisible(false)); await h.tarjeta(CIERRE); await h.esperar(900); },
      segs: [
        { t: 'Al conectar tus cuentas, se publica solo.' },
        { t: 'Tú atiendes tu negocio; Chispa llena tus redes. Pide tu demostración.', pausa: 1.5 },
      ],
      salida: 1.0,
    },
  ],
};
