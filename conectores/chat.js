/* =====================================================================
   Chispa · CHAT de la portada con IA de verdad (público, sin sesión)
   ---------------------------------------------------------------------
   POST /chat {mensajes:[{yo:true|false, texto}], voz?:"es"} → {texto, audio?}
   Con «voz» (es, en, fr, zh, ja, ko) devuelve además la respuesta leída por la
   voz del servidor (MeloTTS, ≈ 6 neuronas): la usa «Habla con Chispa».
   Contesta a quien visita la web lo que Chispa hace y cuesta, con
   Workers AI (Llama 3.3, el mismo modelo que conectores/ia.js) y con
   datos que NO se inventa: precios de precios.js y lo que hace hoy.
   Protegido para no gastar el cupo gratuito:
     · 20 preguntas por hora por visitante (huella de la IP, no la IP)
     · 200 preguntas al día en total, y respeta el cupo diario de la IA de
       toda la cuenta (tabla uso_ia de ia.js, como negocio «_chat»)
   Si no se puede (sin IA, sin cupo), responde 503 y la página contesta
   con sus frases preparadas: el visitante nunca se queda sin respuesta.
   ===================================================================== */
import "../precios.js";
import { MODELOS, CUPO_GLOBAL, VOZ_IDIOMAS, textoParaVoz } from "./ia.js";

export const ESQUEMA_CHAT = ["CREATE TABLE IF NOT EXISTS chat_uso (huella TEXT NOT NULL, hora TEXT NOT NULL, veces INTEGER NOT NULL, PRIMARY KEY (huella, hora))"];
const POR_HORA = 20, AL_DIA = 200, NEURONAS = 120;

function contexto() {
  const P = globalThis.ChispaPrecios;
  const planes = P ? P.planes.map((p) => p.nombre + " " + p.precio + " €/mes + IVA (" + p.incluye.join(", ") + ")").join("; ") + ". Prueba gratis " + P.DIAS_PRUEBA + " días sin tarjeta, sin permanencia." : "";
  return [
    "Eres Chispa, el asistente de marketing con IA de Solers para negocios locales (bares, restaurantes, peluquerías, gimnasios, tiendas, talleres, creadores). Hablas con alguien que visita la web de Chispa.",
    "Lo que Chispa hace HOY: escribe publicaciones con IA en el tono del negocio y en varios idiomas; crea imágenes con IA y vídeos cortos con voz y subtítulos a partir de fotos; «Crear vídeo con IA»: de un tema o un guion, la IA escribe las escenas, crea una imagen IA por escena y pone la voz (español, inglés, francés, chino, japonés y coreano; en otros idiomas solo subtítulos), y Chispa monta un vídeo vertical con movimiento, subtítulos palabra a palabra, sello de marca y música suave opcional, para descargar o programar; corta vídeos largos en clips verticales; Estudio para creadores: miniseries y guiones de vídeo con IA para TikTok, Reels y Shorts que pasan al calendario como borrador, con portada de marca (planes Pro y Agencia; grabar el vídeo lo hace el creador); calendario con franjas y publicación programada en Instagram, Facebook, TikTok, YouTube y la ficha de Google (al conectar las cuentas; algunas redes están terminando su revisión de permisos); bandeja con comentarios, mensajes y reseñas con respuesta propuesta y etiquetas; respuestas automáticas a reseñas buenas y aviso de las malas; palabra clave en un comentario → mensaje privado con un enlace; estadísticas diarias con consejos; anuncios en Facebook e Instagram creados en pausa con presupuesto y público local (planes Pro y Agencia); resumen semanal; app instalable en el móvil.",
    "Lo que NO hace todavía: vídeo realista generado clip a clip por IA (personas y movimiento reales; será de pago por clip y se activa al conectar el proveedor), WhatsApp automático (necesita WhatsApp Business), contestar comentarios de TikTok (TikTok no lo permite).",
    "Precios: " + planes,
    "Reglas: respuestas cortas (máximo 3 frases), cercanas, en el idioma del visitante, con 1 emoji como mucho. No inventes funciones, precios, descuentos ni plazos. Si preguntan algo que no sabes, dilo y ofrece probarlo gratis con el botón «Probar 14 días gratis». No pidas datos personales.",
  ].join("\n");
}

export async function rutaChat(req, env, h) {
  const { Fallo, huella, leerJson } = h;
  if (!env.AI) throw new Fallo("Chat sin IA en este servidor", 503);
  await env.DB.batch(ESQUEMA_CHAT.map((s) => env.DB.prepare(s)));
  const c = await leerJson(req);
  const msgs = (Array.isArray(c.mensajes) ? c.mensajes : []).slice(-8).map((m) => ({ role: m && m.yo ? "user" : "assistant", content: String((m && m.texto) || "").slice(0, 500) })).filter((m) => m.content);
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") throw new Fallo("Falta la pregunta");
  const ip = req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For") || "local";
  const hora = new Date().toISOString().slice(0, 13), dia = hora.slice(0, 10);
  const yo = await huella(env, "chat:" + ip);
  const f = await env.DB.prepare("SELECT veces FROM chat_uso WHERE huella = ? AND hora = ?").bind(yo, hora).first();
  if (f && f.veces >= POR_HORA) throw new Fallo("Has hecho muchas preguntas seguidas: espera un poco", 429);
  const t = await env.DB.prepare("SELECT COALESCE(SUM(veces), 0) AS n FROM chat_uso WHERE hora LIKE ?").bind(dia + "%").first();
  if (t && t.n >= AL_DIA) throw new Fallo("Chat con IA en pausa hasta mañana", 503);
  const g = await env.DB.prepare("SELECT COALESCE(SUM(neuronas), 0) AS n FROM uso_ia WHERE dia = ?").bind(dia).first().catch(() => ({ n: 0 }));
  if (g && g.n + NEURONAS > CUPO_GLOBAL) throw new Fallo("Cupo de IA de hoy agotado", 503);
  await env.DB.prepare("INSERT INTO chat_uso (huella, hora, veces) VALUES (?, ?, 1) ON CONFLICT (huella, hora) DO UPDATE SET veces = veces + 1").bind(yo, hora).run();
  let r;
  try { r = await env.AI.run(MODELOS.texto, { messages: [{ role: "system", content: contexto() }, ...msgs], max_tokens: 220, temperature: 0.5 }); }
  catch (e) { throw new Fallo("La IA no ha podido contestar ahora", 503); }
  const texto = String((r && (r.response || (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content))) || "").trim();
  if (!texto) throw new Fallo("La IA no ha contestado", 503);
  const n = r && r.usage && typeof r.usage.neurons === "number" ? r.usage.neurons : NEURONAS;
  try { await env.DB.prepare("INSERT INTO uso_ia (dia, negocio, tipo, veces, neuronas) VALUES (?, '_chat', 'texto', 1, ?) ON CONFLICT (dia, negocio, tipo) DO UPDATE SET veces = veces + 1, neuronas = neuronas + excluded.neuronas").bind(dia, n).run(); } catch (e) {}
  const out = { texto: texto.slice(0, 1200) };
  const lang = c.voz && VOZ_IDIOMAS[String(c.voz).slice(0, 2).toLowerCase()];
  if (lang) {
    try {
      const v = await env.AI.run(MODELOS.voz, { prompt: textoParaVoz(out.texto).slice(0, 600), lang });
      if (v && typeof v.audio === "string") { out.audio = "data:" + (v.audio.slice(0, 4) === "UklG" ? "audio/wav" : "audio/mpeg") + ";base64," + v.audio; }
      try { await env.DB.prepare("UPDATE uso_ia SET neuronas = neuronas + 6 WHERE dia = ? AND negocio = '_chat' AND tipo = 'texto'").bind(dia).run(); } catch (e) {}
    } catch (e) { /* sin voz del servidor: la página usa la del navegador */ }
  }
  return out;
}
