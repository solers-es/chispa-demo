// Corte corto de Chispa para redes (≈ 90 s).
const { PREGEN, card, esperarImagenIA, grabarVideo, reproducirVideo } = require('./comun');
const PORTADA = `<div class="bolt">⚡</div><h1>¿No te da la vida<br><span>para las redes?</span></h1>
<p>Esto es Chispa · tu marketing en automático</p>`;
const CIERRE = `<div class="bolt">⚡</div><h1>Tú atiendes tu negocio.<br><span>Chispa llena tus redes.</span></h1>
<p>14 días gratis, sin tarjeta</p><div class="url">solers-es.github.io/chispa-demo</div>
<div class="pie">Una herramienta de Solers</div>`;

module.exports = {
  escenas: [
    {
      id: 'c-portada', entrada: 300,
      preparar: async h => { await h.v(() => window.__V.cursorVisible(false)); await h.tarjeta(PORTADA); await h.esperar(900); },
      segs: [{ t: '¿Tienes un negocio, o un canal, y no te da la vida para las redes? Esto es Chispa: tu marketing en automático.', pausa: 0.5 }],
      despues: async h => { await h.quitarTarjeta(); await h.v(() => window.__V.cursorVisible(true)); },
    },
    {
      id: 'c-crear', ctx: 'b', rotulo: ['1', 'Le dices la idea', 'y Chispa escribe la publicación'],
      preparar: async h => { await h.cerrarTodo(); await h.panel('asistente'); await h.esperar(1200); await h.mover(700, 300, 10); },
      segs: [
        { t: 'Le dices la idea en una frase, y Chispa escribe la publicación.',
          a: async h => { await h.escribir('#idea', 'Tarta de zanahoria casera con café', 45); await h.clic('button:has-text("Que Chispa lo escriba")', { despues: 1500 }); await h.verEn(card(0), 'start'); await h.v(() => window.scrollBy({ top: -80, behavior: 'smooth' })); } },
        { t: 'La imagen la crea la inteligencia artificial, con el sello de tu marca.',
          a: async h => { await h.clic(`${card(0)} .cm-acts button >> nth=0`, { despues: 400 }); await h.v(() => document.querySelector('#cmCard_0').scrollIntoView({ behavior: 'smooth', block: 'start' })); await esperarImagenIA(h); await h.v(() => { document.querySelector('#cmCard_0').scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); }); await h.zoom(`${card(0)} .cm-media`, 1.3); await h.esperar(1500); await h.sinZoom(600); } },
      ],
      despues: async h => { await h.cerrarTodo(); },
    },
    {
      id: 'c-video', ctx: 'b', rotulo: ['2', 'Y el vídeo', 'con voz y subtítulos'],
      preparar: async h => { await h.cerrarTodo(); await h.v(() => { document.querySelector('#cmCard_0').scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); }); await h.mover(720, 420, 10); },
      segs: [
        { t: 'Y te hace el vídeo vertical, con voz y subtítulos.', a: async h => { await h.clic(`${card(0)} button[onclick^="cmExportar"]`, { despues: 900 }); await h.resaltar('#cmBox .cm-li', 1400); await h.cerrarTodo(); } },
        { t: 'Escucha.', a: async h => { await reproducirVideo(h, PREGEN('corto'), 7); }, pausa: 0.2 },
      ],
    },
    {
      id: 'c-asi', rotulo: ['3', 'Así lo ve tu cliente', 'en todas las redes'],
      preparar: async h => { await h.cerrarTodo(); await h.panel('asistente'); await h.v(() => document.querySelector('#cmCard_0 .cm-acts').scrollIntoView({ block: 'center' })); await h.mover(700, 400, 10); },
      segs: [
        { t: 'Antes de publicar, ves cómo quedará en Instagram, TikTok, Facebook, WhatsApp, Google y YouTube.',
          a: async h => { await h.clic(`${card(0)} button:has-text("Así lo ve tu cliente")`, { despues: 800 }); await h.mover(700, 500); for (const y of [600, 1250, 1900]) { await h.scrollSuave('#cmBox', y); await h.esperar(400); } } },
      ],
      despues: async h => { await h.cerrarTodo(); },
    },
    {
      id: 'c-cal', rotulo: ['4', 'Calendario', 'con promociones para llenar'],
      preparar: async h => { await h.cerrarTodo(); await h.panel('calendario'); await h.mover(700, 300, 10); },
      segs: [
        { t: 'Te monta la semana, con franjas y promociones para llenar tus horas flojas.',
          a: async h => { await h.clic('#main button:has-text("Promo para llenar")', { despues: 1200 }); await h.mover(720, 450); await h.rueda(400, 10, 1200); } },
        { t: 'Y comprueba que no se pisa con nada.',
          a: async h => { await h.verEn('text=Todo cuadrado'); await h.resaltar(h.p.locator('text=Todo cuadrado').first(), 1400); await h.clic('button:has-text("Crear la promo")', { despues: 900 }); } },
      ],
      despues: async h => { await h.cerrarTodo(); },
    },
    {
      id: 'c-msg', rotulo: ['5', 'Mensajes y reseñas', 'la respuesta, ya escrita'],
      preparar: async h => { await h.cerrarTodo(); await h.panel('bandeja'); await h.mover(760, 400, 10); },
      segs: [
        { t: 'Te deja escritas las respuestas a comentarios, mensajes y reseñas, en el idioma de cada cliente. Tú solo las apruebas.',
          a: async h => { await h.rueda(380); await h.resaltar(h.p.locator('#main .cp-it', { hasText: 'Toni Ferrer' }).first(), 2000); await h.clic(h.p.locator('#main .cp-it', { hasText: 'Toni Ferrer' }).locator('button:has-text("Enviar")').first(), { despues: 800 }); } },
      ],
    },
    {
      id: 'c-precio', rotulo: ['6', '14 días gratis', 'sin tarjeta y sin permanencia'],
      preparar: async h => { await h.cerrarTodo(); await h.v(() => { vista('landing'); }); await h.v(() => document.querySelector('#landing .plan').scrollIntoView({ block: 'center' })); await h.mover(720, 300, 10); },
      segs: [
        { t: 'Desde 39 € al mes más IVA, con 14 días gratis y sin tarjeta.', voz: 'Desde treinta y nueve euros al mes más IVA, con catorce días gratis y sin tarjeta.',
          a: async h => { await h.resaltar('#landing .plan >> nth=0', 1500); await h.apuntar('#landing .plan.best button'); } },
      ],
    },
    {
      id: 'c-cierre', entrada: 300,
      preparar: async h => { await h.v(() => window.__V.cursorVisible(false)); await h.tarjeta(CIERRE); await h.esperar(900); },
      segs: [
        { t: 'Para negocios y para creadores de contenido, en cualquier idioma.' },
        { t: 'Cuando conectes tus cuentas y cada red dé su permiso, se publica solo.' },
        { t: 'Tú atiendes tu negocio; Chispa llena tus redes.', pausa: 1.4 },
      ],
      salida: 1.0,
    },
  ],
};
