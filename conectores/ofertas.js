/* =====================================================================
   Chispa · PLAN DE OFERTAS en el servidor (trabajador L)
   ---------------------------------------------------------------------
   Módulo aparte (lo importa chispa-api-worker.js) para no pisar a nadie.
   La página (ofertas-dia.js) decide QUÉ proponer cada día con datos
   gratuitos (tiempo de Open-Meteo, festivos de Nager.Date, horas flojas,
   reglas de las redes y la carta). Aquí solo:

     GET  /ofertas/plan        → {plan, diasMax}  (Básico 3 días; Pro, Agencia e internos 14)
     POST /ofertas/textos      {dias:[…], idioma, negocio, sector, ciudad, tono, cta}
                               → la IA (Llama 3.3, Workers AI) escribe el texto de cada día en el
                                 idioma del negocio, en UNA sola llamada (cuida el cupo gratis).
                                 Los días de más que no cubre el plan se quitan AQUÍ, no solo en la página.
                                 Cualquier precio que la IA escriba y no venga de la carta se cambia por «… €».
     POST /ofertas/carta {url} → platos y bebidas con su precio leídos de la carta (ofertas-carta.js).
                                 Solo http(s) público, 8 s y 1,5 MB como mucho.
   ===================================================================== */
import "../precios.js";
import "../ofertas-carta.js";
import { llm, sacarJson, NOMBRES_IDIOMA, TEXTO_IDIOMAS_OFICIALES } from "./ia.js";
import { cuentaDe, comprobarLimite } from "./suscripciones.js";

const PRECIOS = globalThis.ChispaPrecios;
const CARTA = globalThis.ChispaCarta;
export const DIAS_MAX = 14;
const EN = { es: "Spanish", en: "English", de: "German", fr: "French", it: "Italian", pt: "Portuguese", nl: "Dutch", ca: "Catalan", gl: "Galician", eu: "Basque", zh: "Simplified Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic", ru: "Russian", pl: "Polish", sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish", tr: "Turkish", ro: "Romanian", uk: "Ukrainian", el: "Greek" };
const corto = (s, n) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);

/* días que ve cada plan (precios.js → limites.diasOfertas) */
export async function diasDelPlan(env, negocio) {
  const c = await cuentaDe(env, negocio);
  if (c.interno) return { plan: "interno", nombrePlan: "Solers", diasMax: DIAS_MAX };
  const p = PRECIOS.plan(c.plan) || PRECIOS.plan("basico");
  return { plan: p.id, nombrePlan: p.nombre, diasMax: Math.min(DIAS_MAX, (p.limites && p.limites.diasOfertas) || 3) };
}

/* fecha AAAA-MM-DD de hoy en Madrid (el negocio está en España; ±1 día de margen al comparar) */
function hoyMadrid() { return new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10); }
function diasEntre(a, b) { return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5); }

/* Cualquier «12 €», «12,50€» o «€12» que no venga en los datos del día se cambia por «… €» */
export function quitarPreciosInventados(texto, permitidos) {
  const ok = new Set((permitidos || []).join(" ").match(/\d+(?:[.,]\d{1,2})?/g) || []);
  const norm = (n) => n.replace(".", ",").replace(/,0+$/, "");
  const okN = new Set([...ok].map(norm));
  return String(texto || "")
    .replace(/(\d+(?:[.,]\d{1,2})?)\s*(€|euros?\b|EUR\b)/gi, (m, n) => (okN.has(norm(n)) ? m : "… €"))
    .replace(/€\s*(\d+(?:[.,]\d{1,2})?)/g, (m, n) => (okN.has(norm(n)) ? m : "… €"));
}

export async function textos(env, Fallo, negocio, q) {
  await comprobarLimite(env, Fallo, negocio, null); // prueba terminada, cancelada o impago: no se gasta IA
  const plan = await diasDelPlan(env, negocio), hoy = hoyMadrid();
  const todos = (Array.isArray(q.dias) ? q.dias : []).filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha || "")));
  if (!todos.length) throw new Fallo("Faltan los días (dias: [{fecha, plato, bebida, oferta…}])");
  // el plan manda aquí también: Básico, como mucho los 3 días siguientes
  const dias = todos.filter((d) => { const k = diasEntre(hoy, d.fecha); return k >= -1 && k < plan.diasMax + 1; }).slice(0, plan.diasMax);
  const recortados = todos.length - dias.length;
  if (!dias.length) throw new Fallo("Tu plan " + plan.nombrePlan + " ve los próximos " + plan.diasMax + " días. Para planificar 14 días, plan Pro o Agencia (en «Mi plan»).", 402, { motivo: "plan", diasMax: plan.diasMax, plan: plan.plan });
  const lc = String(q.idioma || "es").toLowerCase().slice(0, 2), lengua = EN[lc] || lc;
  const quien = corto(q.negocio, 80) + (q.sector ? " (" + corto(q.sector, 60) + ")" : "") + (q.ciudad ? " in " + corto(q.ciudad, 60) : "");
  const sis = "You write the daily offer posts for " + (quien || "a small local business") + ". Tone: " + (corto(q.tono, 60) || "close, warm, with a spark") + ". " +
    "Each day already has its dish/service, drink/extra, offer, time window, network and format chosen by the owner's planner: use them EXACTLY as given (same names), do not add other products. " +
    "NEVER invent prices, discounts, dates, events or facts that are not given. If the offer has '… €' keep '… €' literally (the owner will write the price). " +
    "The fields 'motivo' and 'tiempo' are INTERNAL notes for the owner: use them only to pick the angle (e.g. heat → cold drink, rain → comfort food); NEVER say the business is quiet, slow, empty or that it needs customers. Speak to the customer with appetite and enthusiasm. " +
    "Write EVERYTHING in " + lengua + " (" + lc + "), natural and idiomatic. Answer ONLY with valid JSON, no markdown.";
  const lineas = dias.map((d) => ({
    clave: corto(d.clave || d.fecha, 60), fecha: d.fecha, dia: corto(d.dia, 20), plato: corto(d.plato, 80), precioPlato: corto(d.precioPlato, 40),
    bebida: corto(d.bebida, 80), precioBebida: corto(d.precioBebida, 40), oferta: corto(d.oferta, 140), franja: corto(d.franja, 30),
    red: corto(d.red, 60), formato: corto(d.formato, 20), motivo: corto(d.motivo, 160), tiempo: corto(d.tiempo, 60), festivo: corto(d.festivo, 60),
  }));
  const usr = "Days (JSON):\n" + JSON.stringify(lineas) +
    '\n\nFor EACH day return one post. JSON: {"dias":[{"clave":"same clave","titulo":"max 6 words for the image","texto":"35-90 words: hook in the first line, the dish/drink/offer, the time window, 1-3 emojis and a call to action' + (q.cta ? " (" + corto(q.cta, 40) + ")" : "") + '","hashtags":["#x"]}]}. Use \\n for line breaks inside strings.';
  const j = sacarJson(await llm(env, negocio, sis, usr, Math.min(2600, 350 + 175 * dias.length)));
  const porClave = {};
  (Array.isArray(j.dias) ? j.dias : []).forEach((x) => { if (x && x.clave && x.texto) porClave[String(x.clave)] = x; });
  const salida = lineas.map((d) => {
    const x = porClave[d.clave];
    if (!x) return null;
    const permitidos = [d.precioPlato, d.precioBebida, d.oferta];
    return { clave: d.clave, titulo: quitarPreciosInventados(corto(x.titulo, 60), permitidos), texto: quitarPreciosInventados(String(x.texto).replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").trim().slice(0, 900), permitidos),
      hashtags: Array.isArray(x.hashtags) ? x.hashtags.slice(0, 6).map((h) => corto(h, 40)) : [] };
  }).filter(Boolean);
  if (!salida.length) throw new Fallo("La IA no devolvió los textos; prueba otra vez", 502);
  const raro = !TEXTO_IDIOMAS_OFICIALES.includes(lc);
  return { plan: plan.plan, diasMax: plan.diasMax, recortados, idioma: lc, textos: salida,
    aviso: raro ? "Idioma sin garantía del modelo (" + (NOMBRES_IDIOMA[lc] || lc) + "): revísalo antes de publicar." : null };
}

/* ---------------- leer la carta desde el servidor ---------------- */
function hostPrivado(h) {
  h = String(h || "").toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h === "0.0.0.0" || h.startsWith("[")) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = +m[1], b = +m[2];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}
async function pedirCarta(url) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol) || hostPrivado(u.hostname)) throw new Error("Esa dirección no se puede leer");
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(u.toString(), { headers: { "User-Agent": "Chispa/1.0 (+https://solers-es.github.io/chispa-demo/)", Accept: "text/html,application/json;q=0.9,*/*;q=0.5" }, signal: ctl.signal, redirect: "follow" });
    const tipo = (r.headers && r.headers.get && r.headers.get("content-type")) || "";
    if (tipo && !/text|json|html|xml/i.test(tipo)) return { ok: false, status: 415, texto: "" };
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 1.5e6) return { ok: false, status: 413, texto: "" };
    return { ok: r.ok, status: r.status, texto: new TextDecoder().decode(buf) };
  } finally { clearTimeout(t); }
}
export async function leerCarta(Fallo, q) {
  let url = String((q && q.url) || "").trim();
  if (!url) throw new Fallo("Falta el enlace de la carta");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url.replace(/^\/+/, "");
  try {
    const r = await CARTA.leerUrl(url, pedirCarta);
    return { url, items: r.items || [], fuente: r.fuente || "", aviso: r.aviso || (r.items && r.items.length ? null : "No he encontrado platos con precio en esa página. Pega la lista a mano (una línea por plato).") };
  } catch (e) {
    throw new Fallo("No he podido leer la carta: " + String((e && e.message) || e).slice(0, 120) + ". Pega la lista a mano.", 400);
  }
}

/* ---------------- rutas ---------------- */
export async function rutasOfertas(req, env, h, s, m, ruta) {
  const { Fallo, leerJson } = h;
  if (m === "GET" && ruta === "/ofertas/plan") return diasDelPlan(env, s.negocio);
  if (m === "POST" && ruta === "/ofertas/textos") { const c = await leerJson(req); return textos(env, Fallo, s.negocio, { ...c, negocio: c.negocio || s.nombre }); }
  if (m === "POST" && ruta === "/ofertas/carta") return leerCarta(Fallo, await leerJson(req));
  throw new Fallo("No existe", 404);
}
