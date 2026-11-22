/* =====================================================================
   Chispa · VÍDEO REALISTA CON IA (versión PRO, de pago por clip)
   ---------------------------------------------------------------------
   Vídeo generado de verdad, clip a clip, por un proveedor externo. Está
   PROGRAMADO pero APAGADO: no hay nada contratado ni ninguna clave puesta.
   Opciones, precios y recomendación: docs/VIDEO-IA.md.

   Para encenderlo (lo decide Stalin y pone la tarjeta en el proveedor):
     Google Veo 3.1 Lite (API de Gemini), ≈ 0,05 $/s → clip de 8 s ≈ 0,40 $
       npx wrangler secret put VIDEO_IA_PROVEEDOR -c conectores/wrangler-api.toml   → veo
       npx wrangler secret put GEMINI_API_KEY     -c conectores/wrangler-api.toml
     fal.ai LTX-2 Fast, ≈ 0,04 $/s → clip de 6 s ≈ 0,24 $
       VIDEO_IA_PROVEEDOR = fal   +   npx wrangler secret put FAL_KEY …
   Opcionales: VIDEO_IA_MODELO (nombre exacto del modelo del proveedor),
   VIDEO_IA_TOPE_USD_MES (tope de gasto de TODA la cuenta al mes; 20 por
   defecto), VIDEO_IA_INTERNO_MES (clips/mes de los negocios internos; 8).

   OJO: las llamadas siguen la documentación pública de cada proveedor
   (ai.google.dev/gemini-api/docs/video y fal.ai/docs/model-endpoints/queue)
   pero NO se han probado contra ellos: no hay clave. El primer día con
   clave hay que hacer UNA prueba y mirar la respuesta.

   Límites por plan (precios.js → limites.videoIAMes): Básico 0, Pro 8,
   Agencia 30 clips al mes. Cada clip apunta su coste en la tabla video_ia.

   Rutas (con sesión):
     GET  /ia/video/estado        → {activo, mensaje, proveedor, limite, usados, costeMes}
     POST /ia/video {prompt, segundos?}  → 501 apagado · 402 plan · 429 límite · {id, estado}
     GET  /ia/video/:id           → {estado: generando|listo|fallo, url?}
   Pública (id imposible de adivinar, como /medio/):
     GET  /video-ia/:id.mp4       → el clip (lo baja del proveedor con la clave del servidor)
   ===================================================================== */
import { FalloIA } from "./ia.js";
import { cuentaDe } from "./suscripciones.js";

export const MENSAJE_APAGADO = "Vídeo realista con IA: se activa al conectar el proveedor (de pago).";
export const PROVEEDORES = {
  veo: { nombre: "Google Veo 3.1 Lite", modelo: "veo-3.1-lite-generate-preview", segundos: 8, usdSegundo: 0.05 },
  fal: { nombre: "fal.ai LTX-2 Fast", modelo: "fal-ai/ltx-2/text-to-video/fast", segundos: 6, usdSegundo: 0.04 },
};
export const LIMITE_PLAN = { basico: 0, pro: 8, agencia: 30 };
export const ESQUEMA_VIDEO_IA = [
  "CREATE TABLE IF NOT EXISTS video_ia (id TEXT PRIMARY KEY, negocio TEXT NOT NULL, proveedor TEXT NOT NULL, trabajo TEXT, estado TEXT NOT NULL, prompt TEXT, segundos INTEGER, coste REAL NOT NULL DEFAULT 0, archivo TEXT, error TEXT, creado INTEGER NOT NULL)",
];

const ahora = () => Date.now();
const mesIni = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); };
export function proveedorActivo(env) {
  const p = String(env.VIDEO_IA_PROVEEDOR || "").toLowerCase().trim();
  if (p === "veo" && env.GEMINI_API_KEY) return p;
  if (p === "fal" && env.FAL_KEY) return p;
  return null;
}
async function limiteDe(env, negocio) {
  const c = await cuentaDe(env, negocio);
  if (c.interno) return { limite: parseInt(env.VIDEO_IA_INTERNO_MES || "8", 10), plan: "interno", cuenta: c };
  const l = c.limites && c.limites.videoIAMes != null ? c.limites.videoIAMes : LIMITE_PLAN[c.plan] || 0;
  return { limite: l, plan: c.plan, nombrePlan: c.nombrePlan, cuenta: c };
}
async function usoMes(env, negocio) {
  const f = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(coste), 0) AS c FROM video_ia WHERE negocio = ? AND creado >= ? AND estado != 'fallo'").bind(negocio, mesIni()).first();
  const g = await env.DB.prepare("SELECT COALESCE(SUM(coste), 0) AS c FROM video_ia WHERE creado >= ? AND estado != 'fallo'").bind(mesIni()).first();
  return { usados: f ? f.n : 0, costeMes: Math.round((f ? f.c : 0) * 100) / 100, costeCuenta: Math.round((g ? g.c : 0) * 100) / 100 };
}

export async function estadoVideo(env, negocio) {
  const p = proveedorActivo(env), l = await limiteDe(env, negocio), u = await usoMes(env, negocio);
  return {
    activo: !!p, mensaje: p ? null : MENSAJE_APAGADO, proveedor: p ? PROVEEDORES[p].nombre : null,
    segundos: p ? PROVEEDORES[p].segundos : null, costeClip: p ? Math.round(PROVEEDORES[p].segundos * PROVEEDORES[p].usdSegundo * 100) / 100 : null,
    limite: l.limite, plan: l.plan, usados: u.usados, costeMes: u.costeMes, moneda: "USD",
    gratis: "El vídeo con imágenes IA, voz y subtítulos (montado en tu móvil) es gratis y no cuenta aquí.",
  };
}

export async function pedirVideo(env, negocio, q, urlBase) {
  const p = proveedorActivo(env);
  if (!p) throw new FalloIA(MENSAJE_APAGADO, 501, { pendiente: "video-ia", opciones: Object.keys(PROVEEDORES) });
  const prompt = String(q.prompt || q.texto || "").replace(/\s+/g, " ").trim().slice(0, 1200);
  if (prompt.length < 8) throw new FalloIA("Describe la escena del vídeo (qué se ve, dónde y cómo)");
  const l = await limiteDe(env, negocio);
  if (!l.limite) throw new FalloIA("El vídeo realista con IA viene en los planes Pro y Agencia" + (l.nombrePlan ? ". Tu plan es " + l.nombrePlan : "") + ": súbelo en «Mi plan».", 402, { motivo: "plan", funcion: "videoIA" });
  const u = await usoMes(env, negocio);
  if (u.usados + 1 > l.limite) throw new FalloIA("Has usado los " + l.limite + " vídeos realistas con IA de este mes de tu plan. El mes que viene tienes más.", 429, { motivo: "limite", limite: "videoIAMes", maximo: l.limite, usado: u.usados });
  const P = PROVEEDORES[p], seg = P.segundos, coste = Math.round(seg * P.usdSegundo * 100) / 100;
  const tope = parseFloat(env.VIDEO_IA_TOPE_USD_MES || "20");
  if (u.costeCuenta + coste > tope) throw new FalloIA("Se ha llegado al tope de gasto de vídeo IA de este mes de toda la cuenta (" + tope + " $). Avisa a Solers.", 429, { motivo: "tope-cuenta" });
  const modelo = env.VIDEO_IA_MODELO || P.modelo;
  const textoFinal = prompt + (q.vertical === false ? "" : ". Vertical 9:16 video for social media, cinematic, realistic, no text on screen, no logos, no watermark.");
  let trabajo;
  if (p === "veo") {
    // https://ai.google.dev/gemini-api/docs/video  (predictLongRunning → operación que se consulta)
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":predictLongRunning", {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ instances: [{ prompt: textoFinal }], parameters: { aspectRatio: q.vertical === false ? "16:9" : "9:16", resolution: "720p" } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.name) throw new FalloIA("El proveedor de vídeo (Google) no lo ha aceptado: " + String((j.error && j.error.message) || r.status).slice(0, 200), 502);
    trabajo = j.name;
  } else {
    // https://fal.ai/docs/model-endpoints/queue  (cola: request_id + status_url + response_url)
    const r = await fetch("https://queue.fal.run/" + modelo, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Key " + env.FAL_KEY },
      body: JSON.stringify({ prompt: textoFinal, aspect_ratio: q.vertical === false ? "16:9" : "9:16", duration: seg }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.request_id) throw new FalloIA("El proveedor de vídeo (fal.ai) no lo ha aceptado: " + String(j.detail || r.status).slice(0, 200), 502);
    trabajo = JSON.stringify({ estado: j.status_url, respuesta: j.response_url });
  }
  const id = idNuevo();
  await env.DB.prepare("INSERT INTO video_ia (id, negocio, proveedor, trabajo, estado, prompt, segundos, coste, creado) VALUES (?, ?, ?, ?, 'generando', ?, ?, ?, ?)")
    .bind(id, negocio, p, trabajo, prompt, seg, coste, ahora()).run();
  return { id, estado: "generando", proveedor: P.nombre, segundos: seg, coste, moneda: "USD", consulta: "/ia/video/" + id };
}

export async function consultarVideo(env, negocio, id, urlBase) {
  const f = await env.DB.prepare("SELECT * FROM video_ia WHERE id = ? AND negocio = ?").bind(String(id), negocio).first();
  if (!f) throw new FalloIA("Ese vídeo no existe", 404);
  if (f.estado === "listo") return { id, estado: "listo", url: urlBase + "/video-ia/" + id + ".mp4" };
  if (f.estado === "fallo") return { id, estado: "fallo", error: f.error };
  let archivo = null, error = null;
  try {
    if (f.proveedor === "veo") {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/" + f.trabajo, { headers: { "x-goog-api-key": env.GEMINI_API_KEY } });
      const j = await r.json();
      if (j.error) error = String(j.error.message || "error");
      else if (j.done) {
        const m = j.response && j.response.generateVideoResponse && j.response.generateVideoResponse.generatedSamples;
        archivo = m && m[0] && m[0].video && m[0].video.uri;
        if (!archivo) error = "Google no devolvió el vídeo (puede que el texto no pasara su filtro)";
      }
    } else {
      const t = JSON.parse(f.trabajo), h = { Authorization: "Key " + env.FAL_KEY };
      const s = await (await fetch(t.estado, { headers: h })).json();
      if (s.status === "COMPLETED") { const j = await (await fetch(t.respuesta, { headers: h })).json(); archivo = j.video && j.video.url; if (!archivo) error = "fal.ai no devolvió el vídeo"; }
      else if (s.status && !/IN_QUEUE|IN_PROGRESS/.test(s.status)) error = "fal.ai: " + s.status;
    }
  } catch (e) { return { id, estado: "generando", nota: "Sin respuesta del proveedor todavía" }; }
  if (error) { await env.DB.prepare("UPDATE video_ia SET estado = 'fallo', error = ?, coste = 0 WHERE id = ?").bind(error.slice(0, 300), id).run(); return { id, estado: "fallo", error }; }
  if (!archivo) return { id, estado: "generando" };
  await env.DB.prepare("UPDATE video_ia SET estado = 'listo', archivo = ? WHERE id = ?").bind(archivo, id).run();
  return { id, estado: "listo", url: urlBase + "/video-ia/" + id + ".mp4" };
}

/* Público: el clip, bajado del proveedor con la clave del servidor (la clave nunca llega al navegador) */
export async function servirVideo(env, id) {
  const limpio = String(id || "").replace(/\.mp4$/, "");
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(limpio)) return new Response("No existe", { status: 404 });
  const f = await env.DB.prepare("SELECT proveedor, archivo FROM video_ia WHERE id = ? AND estado = 'listo'").bind(limpio).first();
  if (!f || !f.archivo) return new Response("No existe o no está listo", { status: 404 });
  const h = f.proveedor === "veo" ? { "x-goog-api-key": env.GEMINI_API_KEY || "" } : {};
  const r = await fetch(f.archivo, { headers: h, redirect: "follow" });
  if (!r.ok) return new Response("El proveedor ya no lo tiene (caduca a los 2 días): vuelve a generarlo", { status: 410 });
  return new Response(r.body, { headers: { "Content-Type": "video/mp4", "Cache-Control": "private, max-age=86400", "Access-Control-Allow-Origin": "*", "Content-Disposition": 'inline; filename="chispa-video-ia.mp4"' } });
}

function idNuevo() { const a = crypto.getRandomValues(new Uint8Array(18)); return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }

/* compatibilidad: el hueco antiguo /ia/video y /v1/video */
export async function generarVideo(env, negocio, q, urlBase) { return pedirVideo(env, negocio, q || {}, urlBase); }
