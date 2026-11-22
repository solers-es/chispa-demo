/* =====================================================================
   Chispa · IA en el propio servidor (Cloudflare Workers AI, plan gratuito)
   ---------------------------------------------------------------------
   Lo usa chispa-api-worker.js (rutas /ia/… para la página y /v1/… y /mcp
   para la API pública). Necesita el enlace [ai] binding = "AI" en
   wrangler-api.toml. NO hay claves: Workers AI va con la propia cuenta.

   Modelos (probados de verdad el 07/10/2026 con la cuenta de Chispa):
     imagen       @cf/black-forest-labs/flux-1-schnell   1024×1024 JPEG, ~6 s
     voz          @cf/myshell-ai/melotts                 WAV; SOLO en, es, fr, zh, ja (jp), ko (kr)
     subtítulos   @cf/openai/whisper-large-v3-turbo      tiempos palabra a palabra
     texto        @cf/meta/llama-3.3-70b-instruct-fp8-fast  reaprovechar, escribir, traducir
     traducción   @cf/meta/m2m100-1.2b                   SOLO de reserva (es barato pero se
                                                         equivoca: tradujo «domingo» por «Dienstag»)

   CUPO GRATIS: 10.000 «neuronas» al día POR CUENTA (todas las IA juntas);
   pasado eso, Workers AI da error hasta las 00:00 UTC (no cobra solo).
   Por eso aquí se cuenta lo gastado en la tabla uso_ia y se corta ANTES:
     · tope global de la cuenta:  9.000 neuronas/día (margen de 1.000)
     · tope por negocio y día:    LIMITES (abajo)
   Neuronas aproximadas por uso (precios oficiales, ver docs/SERVIDOR-CHISPA.md):
     imagen 1024² con 4 pasos ≈ 173 (MEDIDO en la cuenta: 4 teselas × 4,8 + 4 pasos × 4 teselas × 9,6)
     voz de 20 s ≈ 6 (MeloTTS) + 16 (Whisper) ≈ 22
     texto (≈1.000 tokens de entrada + 1.000 de salida con Llama 3.3 70B) ≈ 230
   ===================================================================== */

export const MODELOS = {
  imagen: "@cf/black-forest-labs/flux-1-schnell",
  voz: "@cf/myshell-ai/melotts",
  subtitulos: "@cf/openai/whisper-large-v3-turbo",
  texto: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  traduccionReserva: "@cf/meta/m2m100-1.2b",
};
/* Voz en el servidor: código ISO → código de MeloTTS (lo que el modelo acepta de verdad) */
export const VOZ_IDIOMAS = { es: "es", en: "en", fr: "fr", zh: "zh", ja: "jp", ko: "kr" };
/* Idiomas en los que Llama 3.3 está garantizado por Meta. Los demás funcionan «a lo mejor»: se avisa. */
export const TEXTO_IDIOMAS_OFICIALES = ["es", "en", "de", "fr", "it", "pt", "hi", "th"];
export const NOMBRES_IDIOMA = {
  es: "español", en: "inglés", de: "alemán", fr: "francés", it: "italiano", pt: "portugués", nl: "neerlandés", ca: "catalán",
  gl: "gallego", eu: "euskera", zh: "chino", ja: "japonés", ko: "coreano", ar: "árabe", ru: "ruso", pl: "polaco", sv: "sueco",
  da: "danés", no: "noruego", fi: "finés", tr: "turco", hi: "hindi", th: "tailandés", ro: "rumano", uk: "ucraniano", el: "griego",
};
const NOMBRE_EN = { es: "Spanish", en: "English", de: "German", fr: "French", it: "Italian", pt: "Portuguese", nl: "Dutch", ca: "Catalan", gl: "Galician", eu: "Basque", zh: "Simplified Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic", ru: "Russian", pl: "Polish", sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish", tr: "Turkish", hi: "Hindi", th: "Thai", ro: "Romanian", uk: "Ukrainian", el: "Greek" };

export const LIMITES = { imagen: 20, voz: 40, texto: 25 };      // por negocio y día
export const CUPO_GLOBAL = 9000;                               // neuronas por día para TODA la cuenta
const ESTIMADO = { imagen: 175, voz: 25, texto: 260 };

export const ESQUEMA_IA = [
  "CREATE TABLE IF NOT EXISTS uso_ia (dia TEXT NOT NULL, negocio TEXT NOT NULL, tipo TEXT NOT NULL, veces INTEGER NOT NULL, neuronas REAL NOT NULL, PRIMARY KEY (dia, negocio, tipo))",
  "CREATE TABLE IF NOT EXISTS medios_ia (id TEXT PRIMARY KEY, negocio TEXT NOT NULL, tipo TEXT NOT NULL, datos TEXT NOT NULL, creado INTEGER NOT NULL)",
];

export class FalloIA extends Error { constructor(msg, status = 400, extra) { super(msg); this.status = status; this.extra = extra; } }
const hoy = () => new Date().toISOString().slice(0, 10); // el cupo de Cloudflare se reinicia a las 00:00 UTC
const idioma = (x) => String(x || "es").toLowerCase().slice(0, 2);

/* ---------------- cupo ---------------- */
export async function usoHoy(env, negocio) {
  const d = hoy();
  const { results } = await env.DB.prepare("SELECT tipo, veces FROM uso_ia WHERE dia = ? AND negocio = ?").bind(d, negocio).all();
  const g = await env.DB.prepare("SELECT COALESCE(SUM(neuronas), 0) AS n FROM uso_ia WHERE dia = ?").bind(d).first();
  const usado = {}; for (const f of results || []) usado[f.tipo] = f.veces;
  return { dia: d, usado, limites: LIMITES, neuronasCuenta: Math.round(g ? g.n : 0), cupoCuenta: CUPO_GLOBAL, reinicio: "00:00 UTC (02:00 en España en verano, 01:00 en invierno)" };
}
async function comprobarCupo(env, negocio, tipo, veces = 1) {
  const d = hoy();
  const f = await env.DB.prepare("SELECT veces FROM uso_ia WHERE dia = ? AND negocio = ? AND tipo = ?").bind(d, negocio, tipo).first();
  if ((f ? f.veces : 0) + veces > LIMITES[tipo]) throw new FalloIA("Has llegado al límite de hoy (" + LIMITES[tipo] + " de «" + tipo + "» por negocio y día). Mañana vuelve a estar disponible.", 429, { limite: LIMITES[tipo], tipo });
  const g = await env.DB.prepare("SELECT COALESCE(SUM(neuronas), 0) AS n FROM uso_ia WHERE dia = ?").bind(d).first();
  if ((g ? g.n : 0) + ESTIMADO[tipo] * veces > CUPO_GLOBAL) throw new FalloIA("Se ha gastado el cupo gratuito de IA de hoy de toda la cuenta. Vuelve a estar disponible a las 00:00 UTC.", 429, { cupoCuenta: CUPO_GLOBAL });
}
async function apuntar(env, negocio, tipo, neuronas, veces = 1) {
  await env.DB.prepare("INSERT INTO uso_ia (dia, negocio, tipo, veces, neuronas) VALUES (?, ?, ?, ?, ?) ON CONFLICT (dia, negocio, tipo) DO UPDATE SET veces = veces + excluded.veces, neuronas = neuronas + excluded.neuronas")
    .bind(hoy(), negocio, tipo, veces, neuronas).run();
}
function sinIA(env) { if (!env.AI) throw new FalloIA("Este servidor no tiene la IA activada (falta [ai] en wrangler-api.toml)", 501); }
async function correr(env, modelo, entrada) {
  try { return await env.AI.run(modelo, entrada); }
  catch (e) {
    const m = String((e && e.message) || e);
    if (/429|limit|exceed|quota|neuron/i.test(m)) throw new FalloIA("Cloudflare dice que se ha acabado el cupo gratuito de IA de hoy. Vuelve a las 00:00 UTC.", 429);
    throw new FalloIA("La IA no ha podido hacerlo: " + m.slice(0, 200), 502);
  }
}
const neuronasDe = (r, estimado) => (r && r.usage && typeof r.usage.neurons === "number" ? r.usage.neurons : estimado);

/* ---------------- IMAGEN ---------------- */
const SECTOR_EN = {
  restaurante: "restaurant food, appetizing plated dish, warm ambience", peluqueria: "hair salon, stylish haircut, professional hairdresser at work",
  estetica: "beauty salon, manicure and skincare, clean elegant aesthetic", gimnasio: "gym and fitness training, energetic, people working out",
  tienda: "boutique shop, clothing and gifts nicely displayed", cafeteria: "cozy cafe and bakery, coffee and fresh pastries",
  talleres: "professional workshop and home repair services, skilled technician at work", creador: "content creator scene, modern, eye-catching, social media aesthetic",
};
export function promptImagen(q) {
  if (q.prompt && String(q.prompt).trim().length > 8) return String(q.prompt).slice(0, 1500);
  const sector = SECTOR_EN[q.sector] || "small local business";
  const tema = [q.titulo, q.texto].filter(Boolean).join(". ").replace(/#\S+/g, "").replace(/\s+/g, " ").slice(0, 400);
  return "Professional photograph for Instagram, " + sector + (q.ciudad ? ", in " + q.ciudad : "") + ". Subject: " + tema +
    ". Natural light, high detail, realistic, vibrant but natural colours, no text, no letters, no logos, no watermark.";
}
/* Devuelve [{id, url}] con dirección pública (las redes la pueden descargar) */
export async function generarImagen(env, negocio, q, urlBase) {
  sinIA(env);
  const cantidad = Math.min(Math.max(parseInt(q.cantidad) || 1, 1), 3);
  await comprobarCupo(env, negocio, "imagen", cantidad);
  const prompt = promptImagen(q);
  const salida = [];
  for (let k = 0; k < cantidad; k++) {
    // flux-1-schnell de Workers AI solo admite {prompt, steps}: con «seed» devuelve el error 5006
    // y la imagen nunca salía desde la página (que siempre manda «semilla»). Sin semilla cada
    // llamada ya sale distinta, que es lo que pide «Otra versión».
    const entrada = { prompt, steps: 4 };
    const r = await correr(env, MODELOS.imagen, entrada);
    if (!r || !r.image) throw new FalloIA("La IA no devolvió imagen", 502);
    const id = idMedio();
    await env.DB.prepare("INSERT INTO medios_ia (id, negocio, tipo, datos, creado) VALUES (?, ?, 'image/jpeg', ?, ?)").bind(id, negocio, r.image, Date.now()).run();
    await apuntar(env, negocio, "imagen", neuronasDe(r, ESTIMADO.imagen));
    salida.push({ id, url: urlBase + "/medio/" + id + ".jpg" });
  }
  return { imagenes: salida, urls: salida.map((x) => x.url), prompt, modelo: MODELOS.imagen, ancho: 1024, alto: 1024 };
}
function idMedio() { const a = crypto.getRandomValues(new Uint8Array(18)); return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export async function servirMedio(env, id) {
  const limpio = String(id || "").replace(/\.(jpg|jpeg|png|wav)$/, "");
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(limpio)) return new Response("No existe", { status: 404 });
  const f = await env.DB.prepare("SELECT tipo, datos FROM medios_ia WHERE id = ?").bind(limpio).first();
  if (!f) return new Response("No existe o ha caducado", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
  return new Response(deBase64(f.datos), { headers: { "Content-Type": f.tipo, "Cache-Control": "public, max-age=2592000, immutable", "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin" } });
}
function deBase64(s) {
  if (typeof Uint8Array.fromBase64 === "function") return Uint8Array.fromBase64(s);
  const b = atob(s), n = b.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = b.charCodeAt(i);
  return u;
}
export async function limpiarMedios(env) { // se guardan 30 días: las redes ya las han descargado
  await env.DB.prepare("DELETE FROM medios_ia WHERE creado < ?").bind(Date.now() - 30 * 864e5).run();
}

/* ---------------- VOZ + SUBTÍTULOS ---------------- */
export function textoParaVoz(t) {
  return String(t || "").replace(/#\S+/g, "").replace(/https?:\/\/\S+/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/[→•·|]/g, ", ").replace(/\s+/g, " ").trim().slice(0, 420);
}
/* Devuelve el JSON YA en texto (el audio son cientos de KB: así no se pasa por JSON.stringify) */
export async function generarVoz(env, negocio, q) {
  sinIA(env);
  const lc = idioma(q.idioma), lang = VOZ_IDIOMAS[lc];
  if (!lang) throw new FalloIA("La voz del servidor no habla " + (NOMBRES_IDIOMA[lc] || lc) + ". Idiomas con voz: " + Object.keys(VOZ_IDIOMAS).map((c) => NOMBRES_IDIOMA[c]).join(", ") + ". Para los demás, Chispa usa la voz del navegador (gratis, pero no queda grabada en el vídeo).", 422, { alternativa: "navegador", idiomasVoz: Object.keys(VOZ_IDIOMAS) });
  const texto = textoParaVoz(q.texto);
  if (texto.length < 2) throw new FalloIA("Falta el texto que hay que leer");
  await comprobarCupo(env, negocio, "voz");
  const r = await correr(env, MODELOS.voz, { prompt: texto, lang });
  const audio = r && (r.audio || null);
  if (!audio || typeof audio !== "string") throw new FalloIA("La IA no devolvió audio", 502);
  let palabras = [], duracion = null, neuronas = 6;
  if (q.subtitulos !== false) {
    try {
      const w = await correr(env, MODELOS.subtitulos, { audio, language: lc });
      duracion = w && w.transcription_info && w.transcription_info.duration;
      // Los tiempos vienen de lo que se OYE, pero se escribe el texto ORIGINAL (Whisper a veces cambia una palabra)
      const oidas = []; for (const s of (w && w.segments) || []) for (const p of s.words || []) oidas.push({ i: +p.start, f: +p.end });
      palabras = alinear(texto, oidas, duracion);
      neuronas += neuronasDe(w, 16);
    } catch (e) { palabras = alinear(texto, [], null); }
  } else palabras = alinear(texto, [], null);
  await apuntar(env, negocio, "voz", neuronas);
  const tipo = audio.slice(0, 4) === "UklG" ? "audio/wav" : "audio/mpeg"; // «UklG» = «RIFF» en base64
  return '{"audio":"data:' + tipo + ";base64," + audio + '","tipo":"' + tipo + '","idioma":"' + lc + '","duracion":' + (duracion || "null") + ',"texto":' + JSON.stringify(texto) + ',"palabras":' + JSON.stringify(palabras) + ',"modelo":"' + MODELOS.voz + '"}';
}
/* Reparte las palabras del texto sobre los tiempos oídos (o a ritmo de lectura si no hay) */
export function alinear(texto, oidas, duracion) {
  const ws = texto.split(/\s+/).filter(Boolean);
  if (!ws.length) return [];
  if (oidas.length) {
    const out = [];
    for (let k = 0; k < ws.length; k++) {
      const pos = oidas.length === ws.length ? k : Math.min(oidas.length - 1, Math.floor((k * oidas.length) / ws.length));
      const o = oidas[pos];
      out.push({ t: ws[k], i: Math.round(o.i * 100) / 100, f: Math.round(o.f * 100) / 100 });
    }
    return out;
  }
  const total = duracion || Math.max(2, ws.length / 2.6);
  const largo = ws.reduce((s, w) => s + w.length + 1, 0);
  let t = 0;
  return ws.map((w) => { const d = (total * (w.length + 1)) / largo; const x = { t: w, i: Math.round(t * 100) / 100, f: Math.round((t + d) * 100) / 100 }; t += d; return x; });
}

/* ---------------- TEXTO (reaprovechar, escribir, traducir) ---------------- */
export async function llm(env, negocio, sistema, usuario, maxTokens = 1400, op = {}) { // también lo usa ofertas.js (plan de ofertas)
  sinIA(env);
  await comprobarCupo(env, negocio, "texto");
  const entrada = { messages: [{ role: "system", content: sistema }, { role: "user", content: usuario }], max_tokens: maxTokens, temperature: op.temperatura != null ? op.temperatura : 0.6 };
  // «JSON mode» de Workers AI: el modelo SOLO puede devolver un objeto JSON válido (medido el 07/10/2026:
  // sin esto, 2 de cada 6 miniseries salían con una «}» de más al final y no se podían leer; con esto, 6 de 6)
  if (op.json) entrada.response_format = { type: "json_object" };
  const r = await correr(env, MODELOS.texto, entrada);
  await apuntar(env, negocio, "texto", neuronasDe(r, ESTIMADO.texto));
  const txt = (r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content) || (r && r.response) || "";
  return typeof txt === "string" ? txt : JSON.stringify(txt);
}
/* Pide JSON a la IA y lo lee con tolerancia; si sale mal (o le falta algo: «valido»), lo pide OTRA vez,
   más estricto. Solo si fallan los dos intentos da error (y la página pone su plantilla con el tema pedido). */
export async function llmJson(env, negocio, sistema, usuario, maxTokens = 1400, valido = null) {
  let ultimo = null;
  for (let intento = 0; intento < 2; intento++) {
    const usr = intento === 0 ? usuario : usuario + "\n\nIMPORTANT: your previous answer could not be parsed. Return ONE single valid JSON object, exactly with the keys asked, no text before or after, no markdown, no trailing commas, balanced braces.";
    let txt;
    try { txt = await llm(env, negocio, sistema, usr, maxTokens, { json: true, temperatura: intento ? 0.3 : 0.6 }); }
    catch (e) { if (e instanceof FalloIA && (e.status === 429 || e.status === 501 || e.status === 400)) throw e; ultimo = e; continue; }
    try {
      const j = sacarJson(txt);
      if (valido && !valido(j)) { ultimo = new FalloIA("La IA no devolvió todo lo que hacía falta; prueba otra vez", 502); continue; }
      return j;
    } catch (e) { ultimo = e; }
  }
  throw ultimo instanceof FalloIA ? ultimo : new FalloIA("La IA no ha podido hacerlo ahora mismo; prueba otra vez en un minuto", 502);
}
/* Lee el JSON de lo que diga el modelo, con tolerancia: quita ```, se queda con el PRIMER objeto
   completo (llaves equilibradas, fuera de las comillas), arregla saltos de línea dentro de los textos,
   comas finales y, si se cortó, cierra lo que quedó abierto. */
export function sacarJson(t) {
  if (t && typeof t === "object") return t;
  const s = String(t || "").replace(/```(json)?/gi, "").replace(/^﻿/, "");
  const a = s.indexOf("{");
  if (a < 0) throw new FalloIA("La IA no respondió en el formato esperado; prueba otra vez", 502);
  const trozo = primerObjeto(s.slice(a)), e = escaparSaltos(trozo), c = sinComasFinales(e);
  for (const x of [trozo, e, c, cerrarAbierto(c)]) { try { const j = JSON.parse(x); if (j && typeof j === "object") return j; } catch (er) {} }
  throw new FalloIA("La IA respondió algo que no se pudo leer; prueba otra vez", 502);
}
/* Desde la primera «{» hasta la «}» que la cierra (lo que venga después, p. ej. una «}» de más, se ignora) */
export function primerObjeto(s) {
  let prof = 0, dentro = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (dentro) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') dentro = false; continue; }
    if (ch === '"') dentro = true;
    else if (ch === "{" || ch === "[") prof++;
    else if (ch === "}" || ch === "]") { prof--; if (prof === 0) return s.slice(0, i + 1); }
  }
  return s; // cortado: lo arregla cerrarAbierto
}
export function sinComasFinales(s) {
  let o = "", dentro = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (dentro) { o += ch; if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') dentro = false; continue; }
    if (ch === '"') { dentro = true; o += ch; continue; }
    if (ch === ",") { let k = i + 1; while (k < s.length && /\s/.test(s[k])) k++; if (s[k] === "}" || s[k] === "]") continue; }
    o += ch;
  }
  return o;
}
/* Si la respuesta se cortó (max_tokens): cierra la cadena, quita el último trozo a medias y cierra llaves */
export function cerrarAbierto(s) {
  const pila = []; let dentro = false, esc = false;
  for (const ch of s) {
    if (dentro) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') dentro = false; continue; }
    if (ch === '"') dentro = true; else if (ch === "{" || ch === "[") pila.push(ch); else if (ch === "}" || ch === "]") pila.pop();
  }
  if (!pila.length && !dentro) return s;
  let o = s + (dentro ? '"' : "");
  o = o.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"\s*$/, "").replace(/,\s*"[^"]*"\s*:?\s*$/, "").replace(/,\s*$/, "").replace(/:\s*$/, ': ""');
  for (let k = pila.length - 1; k >= 0; k--) o += pila[k] === "{" ? "}" : "]";
  return o;
}
/* Los modelos a veces meten saltos de línea «de verdad» dentro de las comillas (JSON no válido): se escapan */
export function escaparSaltos(t) {
  let dentro = false, esc = false, o = "";
  for (const ch of t) {
    if (dentro) {
      if (esc) { esc = false; o += ch; continue; }
      if (ch === "\\") { esc = true; o += ch; continue; }
      if (ch === '"') { dentro = false; o += ch; continue; }
      if (ch === "\n") { o += "\\n"; continue; }
      if (ch === "\r") continue;
      if (ch === "\t") { o += "\\t"; continue; }
      o += ch;
    } else { if (ch === '"') dentro = true; o += ch; }
  }
  return o;
}
const nombreEn = (c) => NOMBRE_EN[c] || c;
const avisoIdioma = (lcs) => { const raros = lcs.filter((c) => !TEXTO_IDIOMAS_OFICIALES.includes(c)); return raros.length ? "Idiomas sin garantía del modelo (revísalo antes de publicar): " + raros.map((c) => NOMBRES_IDIOMA[c] || c).join(", ") : null; };

export const PIEZAS = {
  posts: "3 different standalone social media posts (Instagram/Facebook), each with a hook in the first line, 40-120 words, 1-3 emojis, and 3-6 hashtags at the end",
  hilo: "one thread for X/Threads of 4-7 short numbered posts (max 270 characters each), first one is a strong hook",
  carrusel: "one Instagram carousel: 5-7 slides, each slide a short title (max 8 words) and a line of body text (max 25 words); plus a caption",
  guion: "one 20-40 second vertical video script (Reel/TikTok/Short): hook in the first 2 seconds, 4-6 short spoken lines, and an on-screen title",
  historias: "3 Instagram stories, each one short line of text plus a suggested sticker (poll, question or link)",
  newsletter: "one short email newsletter: subject line and 80-150 word body",
};
export async function reaprovechar(env, negocio, q) {
  const texto = String(q.texto || "").trim();
  if (texto.length < 40) throw new FalloIA("Pega un texto más largo (un artículo, un guion, la transcripción de un vídeo…): mínimo 40 letras");
  const lc = idioma(q.idioma);
  const tipos = (Array.isArray(q.piezas) && q.piezas.length ? q.piezas : ["posts", "hilo", "carrusel", "guion"]).filter((p) => PIEZAS[p]).slice(0, 6);
  if (!tipos.length) throw new FalloIA("Piezas válidas: " + Object.keys(PIEZAS).join(", "));
  const quien = q.negocio ? "for " + q.negocio + (q.sector ? " (" + q.sector + ")" : "") : "for a content creator";
  const sis = "You are an expert social media editor " + quien + ". You repurpose long content into native pieces for each platform. Write EVERYTHING in " + nombreEn(lc) + " (language code " + lc + "), natural and idiomatic, never translated-sounding. Do not invent facts, prices or dates that are not in the source. Answer ONLY with valid JSON, no markdown.";
  const usr = "Source content:\n\"\"\"\n" + texto.slice(0, 6000) + "\n\"\"\"\n\nCreate these pieces:\n" + tipos.map((t) => "- " + t + ": " + PIEZAS[t]).join("\n") +
    '\n\nJSON shape: {"piezas":[{"tipo":"posts|hilo|carrusel|guion|historias|newsletter","titulo":"short internal title","texto":"full text ready to paste (for hilo: posts separated by blank lines; for carrusel: the caption)","diapositivas":[{"titulo":"","texto":""}],"hashtags":["#x"]}]}. For "posts" return 3 separate items of tipo "posts". Only include "diapositivas" for carrusel. Use \\n for line breaks inside strings.' +
    "\n\nIMPORTANT: every piece must be written in " + nombreEn(lc) + " (" + lc + "), even if the source content is in another language: translate and adapt it.";
  const j = await llmJson(env, negocio, sis, usr, 2200, (x) => Array.isArray(x.piezas) && x.piezas.some((p) => p && p.texto));
  const piezas = (j.piezas || []).filter((p) => p && p.texto).map((p) => ({ tipo: PIEZAS[p.tipo] ? p.tipo : "posts", titulo: String(p.titulo || "").slice(0, 120), texto: String(p.texto), diapositivas: Array.isArray(p.diapositivas) ? p.diapositivas.slice(0, 10) : undefined, hashtags: Array.isArray(p.hashtags) ? p.hashtags.slice(0, 10) : undefined, idioma: lc }));
  if (!piezas.length) throw new FalloIA("La IA no devolvió piezas; prueba otra vez", 502);
  return { piezas, idioma: lc, aviso: avisoIdioma([lc]), modelo: MODELOS.texto };
}
export async function escribir(env, negocio, q) {
  const idea = String(q.idea || q.texto || "").trim();
  if (idea.length < 3) throw new FalloIA("Falta la idea");
  const lc = idioma(q.idioma);
  const sis = "You write social media posts for " + (q.negocio || "a small local business") + (q.sector ? " (" + q.sector + ")" : "") + (q.ciudad ? " in " + q.ciudad : "") + ". Tone: close, warm, with a spark. Write in " + nombreEn(lc) + ". Do not invent prices or dates. Answer ONLY with JSON.";
  const usr = 'Idea: ' + idea.slice(0, 800) + '\nFormat: ' + (q.formato || "post") + '\nJSON: {"titulo":"max 6 words for the image","texto":"40-110 words, hook first line, 1-3 emojis, call to action","hashtags":["#..."]}';
  const j = await llmJson(env, negocio, sis, usr, 600, (x) => !!x.texto);
  return { titulo: String(j.titulo || "").slice(0, 80), texto: String(j.texto || ""), hashtags: Array.isArray(j.hashtags) ? j.hashtags.slice(0, 8) : [], idioma: lc, aviso: avisoIdioma([lc]) };
}
/* ---------------- ESTUDIO PARA CREADORES (miniseries y guiones) ----------------
   Para canales de contenido (creadores, agencias) y para cualquier negocio que quiera vídeos
   por capítulos. No promete visitas ni dinero: escribe el plan; grabar y publicar es del creador. */
export const PLATAFORMAS = {
  tiktok: { nombre: "TikTok", dur: "21-45 s", objetivo: "that people watch it to the end and rewatch it" },
  reels: { nombre: "Instagram Reels", dur: "30-90 s", objetivo: "that people share it by direct message" },
  shorts: { nombre: "YouTube Shorts", dur: "15-50 s", objetivo: "that people do not swipe away and watch it entirely" },
};
const plataforma = (p) => (PLATAFORMAS[String(p || "").toLowerCase()] ? String(p).toLowerCase() : "tiktok");
const quienEs = (q) => (q.negocio ? q.negocio + (q.sector ? " (" + q.sector + ")" : "") + (q.ciudad ? " in " + q.ciudad : "") : "a content creator");
const REGLAS_CREADOR = "Rules: original and varied (never a copy of another creator), no invented facts, statistics, prices, dates or quotes; if the topic needs facts, write them as things the creator must check; no medical, legal or financial promises; no clickbait that the video does not deliver.";
export async function serie(env, negocio, q) {
  const tema = String(q.tema || q.nicho || "").trim();
  if (tema.length < 3) throw new FalloIA("Dime el tema o el nicho de la serie");
  const lc = idioma(q.idioma), pl = plataforma(q.plataforma), P = PLATAFORMAS[pl];
  const n = Math.min(Math.max(parseInt(q.episodios, 10) || 5, 3), 8);
  const sis = "You are a showrunner of short vertical video series for " + quienEs(q) + ". You plan mini-series where every episode ends with a cliffhanger that makes people watch the next one. " + REGLAS_CREADOR + " Write EVERYTHING in " + nombreEn(lc) + " (" + lc + "). Answer ONLY with valid JSON, no markdown.";
  const usr = "Topic / niche: " + tema.slice(0, 400) + (q.publico ? "\nAudience: " + String(q.publico).slice(0, 200) : "") + "\nPlatform: " + P.nombre + " (" + P.dur + ")\nEpisodes: " + n +
    '\nJSON: {"titulo":"series title, max 6 words","premisa":"one sentence","episodios":[{"titulo":"max 9 words","gancho":"first spoken line, max 15 words","guion":"3-5 short spoken lines separated by \\n","cliffhanger":"last line that leads to the next episode (for the last episode: the payoff)","texto_pantalla":"max 6 words"}],"hashtags":["#x"]}. Exactly ' + n + " episodes. Use \\n for line breaks inside strings.";
  const j = await llmJson(env, negocio, sis, usr, 2400, (x) => Array.isArray(x.episodios) && x.episodios.filter((e) => e && e.titulo).length >= 2);
  const eps = (Array.isArray(j.episodios) ? j.episodios : []).filter((e) => e && e.titulo).slice(0, n).map((e) => ({
    titulo: String(e.titulo).slice(0, 120), gancho: String(e.gancho || "").slice(0, 200), guion: String(e.guion || "").slice(0, 1200),
    cliffhanger: String(e.cliffhanger || "").slice(0, 300), texto_pantalla: String(e.texto_pantalla || "").slice(0, 60),
  }));
  if (eps.length < 2) throw new FalloIA("La IA no devolvió los episodios; prueba otra vez", 502);
  return { titulo: String(j.titulo || tema).slice(0, 80), premisa: String(j.premisa || "").slice(0, 300), episodios: eps, hashtags: Array.isArray(j.hashtags) ? j.hashtags.slice(0, 6).map(String) : [], plataforma: pl, idioma: lc, aviso: avisoIdioma([lc]), modelo: MODELOS.texto };
}
export async function guion(env, negocio, q) {
  const tema = String(q.tema || q.texto || "").trim();
  if (tema.length < 3) throw new FalloIA("Dime de qué va el vídeo");
  const lc = idioma(q.idioma), pl = plataforma(q.plataforma), P = PLATAFORMAS[pl];
  const sis = "You write short vertical video scripts for " + quienEs(q) + ". Optimised for " + P.nombre + ": " + P.dur + ", the goal is " + P.objetivo + ". Hook in the first 2 seconds that also works without sound, a cut every 1.5-3 seconds, a micro-hook before each third, a payoff that loops to the start, and a call to action that is NOT 'like and subscribe'. " + REGLAS_CREADOR + " Write EVERYTHING in " + nombreEn(lc) + " (" + lc + "). Answer ONLY with valid JSON, no markdown.";
  const usr = "Video topic: " + tema.slice(0, 600) + (q.variante ? "\nWrite a DIFFERENT version from the usual one (variant " + (parseInt(q.variante, 10) || 2) + ")." : "") +
    '\nJSON: {"titulo":"max 8 words","gancho":"spoken hook, max 15 words","texto_pantalla":"on-screen text for the first frame, max 6 words","escenas":[{"dice":"spoken line","se_ve":"what is on screen"}],"remate":"payoff line","cta":"call to action","descripcion":"caption for the post, 1-2 lines","hashtags":["#x"],"duracion":"approx seconds"}. 4-7 escenas.';
  const j = await llmJson(env, negocio, sis, usr, 1400, (x) => !!x.gancho && Array.isArray(x.escenas) && x.escenas.length > 0);
  const escenas = (Array.isArray(j.escenas) ? j.escenas : []).filter((e) => e && (e.dice || e.se_ve)).slice(0, 8).map((e) => ({ dice: String(e.dice || "").slice(0, 300), se_ve: String(e.se_ve || "").slice(0, 200) }));
  if (!j.gancho || !escenas.length) throw new FalloIA("La IA no devolvió el guion completo; prueba otra vez", 502);
  return {
    titulo: String(j.titulo || tema).slice(0, 90), gancho: String(j.gancho).slice(0, 200), texto_pantalla: String(j.texto_pantalla || "").slice(0, 60), escenas,
    remate: String(j.remate || "").slice(0, 300), cta: String(j.cta || "").slice(0, 200), descripcion: String(j.descripcion || "").slice(0, 400),
    hashtags: Array.isArray(j.hashtags) ? j.hashtags.slice(0, 6).map(String) : [], duracion: String(j.duracion || P.dur).slice(0, 20), plataforma: pl, idioma: lc, aviso: avisoIdioma([lc]), modelo: MODELOS.texto,
  };
}

/* textos: [string]; idiomas: ["en","de"] → {traducciones: {en: [..], de: [..]}} */
export async function traducir(env, negocio, q) {
  const textos = (Array.isArray(q.textos) ? q.textos : [q.texto]).map((t) => String(t || "")).filter(Boolean).slice(0, 8);
  const idiomas = [...new Set((Array.isArray(q.idiomas) ? q.idiomas : [q.idioma]).map(idioma).filter(Boolean))].slice(0, 6);
  if (!textos.length || !idiomas.length) throw new FalloIA("Faltan el texto y los idiomas");
  if (textos.join("").length > 5000) throw new FalloIA("Demasiado texto de una vez (máximo 5.000 letras)");
  const origen = q.origen ? idioma(q.origen) : null;
  try {
    const sis = "You are a professional social media translator. Translate naturally (adapt idioms, keep the tone), keep emojis, line breaks, @mentions, URLs and hashtags exactly as they are (do not translate hashtags). Answer ONLY JSON.";
    const usr = "Translate each text" + (origen ? " from " + nombreEn(origen) : "") + " into: " + idiomas.map((c) => c + " (" + nombreEn(c) + ")").join(", ") +
      ".\nTexts (JSON array):\n" + JSON.stringify(textos) + "\nReturn exactly this JSON object, replacing each placeholder with the translation (" + textos.length + " item(s) per language, same order as the input):\n" +
      JSON.stringify(Object.fromEntries(idiomas.map((c) => [c, textos.map((_, k) => "<text " + (k + 1) + " in " + nombreEn(c) + ">")])));
    const j = await llmJson(env, negocio, sis, usr, Math.min(3500, 300 + Math.ceil(textos.join("").length / 2.5) * idiomas.length), (x) => idiomas.every((c) => x[c] != null));
    const out = {};
    for (const c of idiomas) { const v = j[c]; out[c] = Array.isArray(v) ? v.map(String) : typeof v === "string" ? [v] : null; if (!out[c] || out[c].length !== textos.length) throw new Error("faltan traducciones"); }
    return { traducciones: out, modelo: MODELOS.texto, aviso: avisoIdioma(idiomas) };
  } catch (e) {
    if (e instanceof FalloIA && e.status === 429) throw e;
    // Reserva: m2m100 (barato, peor calidad). Se dice.
    sinIA(env);
    const out = {}; let n = 0;
    for (const c of idiomas) { out[c] = []; for (const t of textos) { const r = await correr(env, MODELOS.traduccionReserva, { text: t, source_lang: origen || "es", target_lang: c }); n += neuronasDe(r, 3); out[c].push((r && r.translated_text) || t); } }
    await apuntar(env, negocio, "texto", n, 0);
    return { traducciones: out, modelo: MODELOS.traduccionReserva, aviso: "Traducción automática de reserva (m2m100): revísala antes de publicar, a veces se equivoca en días y nombres." };
  }
}
export const BANDERA = { es: "🇪🇸", en: "🇬🇧", de: "🇩🇪", fr: "🇫🇷", it: "🇮🇹", pt: "🇵🇹", nl: "🇳🇱", ca: "🟨", zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷", ar: "🇸🇦", ru: "🇷🇺", pl: "🇵🇱", sv: "🇸🇪", da: "🇩🇰", no: "🇳🇴", fi: "🇫🇮", tr: "🇹🇷", ro: "🇷🇴", uk: "🇺🇦", el: "🇬🇷" };
/* Une varias versiones en un solo texto («multilingüe juntos») */
export function juntarIdiomas(base, lcBase, trad) {
  const partes = [(BANDERA[lcBase] || lcBase.toUpperCase()) + " " + base.trim()];
  for (const c of Object.keys(trad)) partes.push((BANDERA[c] || c.toUpperCase()) + " " + String(trad[c]).trim());
  return partes.join("\n\n");
}

/* ---------------- VÍDEO CON IA GRATIS: guion por escenas ----------------
   La página pide aquí el guion; luego genera UNA imagen IA por escena (/ia/imagen con «prompt»),
   la voz de cada escena (/ia/voz) y monta el vídeo vertical en el propio aparato (gratis).
   El vídeo realista generado clip a clip (de pago) está en video-ia.js. */
export async function escenasVideo(env, negocio, q) {
  const tema = String(q.tema || q.texto || "").trim();
  if (tema.length < 3) throw new FalloIA("Dime el tema del vídeo o pega el guion");
  const lc = idioma(q.idioma), pl = plataforma(q.plataforma), P = PLATAFORMAS[pl];
  const n = Math.min(Math.max(parseInt(q.escenas, 10) || 5, 3), 6);
  const esGuion = tema.length > 160 || /\n/.test(tema);
  const sis = "You are a director of short vertical videos for " + quienEs(q) + ", for " + P.nombre + ". You split a video into scenes: each scene has ONE spoken line (voice-over) and ONE photo generated by AI. " + REGLAS_CREADOR +
    " Spoken lines and on-screen texts in " + nombreEn(lc) + " (" + lc + "); the image descriptions ALWAYS in English. Answer ONLY with valid JSON, no markdown.";
  const usr = (esGuion ? "Turn this script into scenes, keeping its meaning and language:\n\"\"\"\n" + tema.slice(0, 2500) + "\n\"\"\"" : "Video topic: " + tema.slice(0, 400)) +
    "\nScenes: exactly " + n + ". Total spoken length 20-40 seconds. Scene 1 is a hook that works in the first 2 seconds; the last one closes with a call to action that is NOT 'like and subscribe'." +
    '\nJSON: {"titulo":"max 7 words","escenas":[{"dice":"spoken line, 8-22 words, natural, no emojis, no hashtags","texto_pantalla":"max 5 words","imagen":"English description of ONE realistic photo for this scene: subject, place, light, camera angle, vertical composition; no text, no letters, no logos; no real famous people"}],"descripcion":"caption for the post, 1-2 lines","hashtags":["#x"]}';
  const j = await llmJson(env, negocio, sis, usr, 1800, (x) => Array.isArray(x.escenas) && x.escenas.filter((e) => e && e.dice).length >= 2);
  const escenas = j.escenas.filter((e) => e && e.dice).slice(0, n).map((e) => ({
    dice: textoParaVoz(String(e.dice)).slice(0, 260), texto_pantalla: String(e.texto_pantalla || "").slice(0, 50),
    imagen: String(e.imagen || e.dice).replace(/\s+/g, " ").slice(0, 600),
  }));
  return { titulo: String(j.titulo || tema).slice(0, 80), escenas, descripcion: String(j.descripcion || "").slice(0, 400), hashtags: Array.isArray(j.hashtags) ? j.hashtags.slice(0, 6).map(String) : [],
    plataforma: pl, idioma: lc, vozServidor: !!VOZ_IDIOMAS[lc], aviso: avisoIdioma([lc]), modelo: MODELOS.texto };
}
