/* =====================================================================
   Chispa · ANUNCIOS (servidor)
   ---------------------------------------------------------------------
   Una campaña sencilla para un negocio local: objetivo, presupuesto al
   día, días que dura, público alrededor del local (radio en km y edad),
   texto, imagen y enlace.

   META (Facebook + Instagram) · Marketing API, en este orden:
     1. POST /act_{cuenta}/campaigns     objetivo OUTCOME_TRAFFIC u OUTCOME_AWARENESS
     2. POST /act_{cuenta}/adsets        presupuesto diario, fechas, público local
     3. POST /act_{cuenta}/adcreatives   página + texto + imagen + botón
     4. POST /act_{cuenta}/ads
   Todo se crea EN PAUSA: no gasta nada hasta que el dueño pulsa «Activar»
   (POST /{id} status=ACTIVE en campaña, conjunto y anuncio). Resultados:
   GET /{campaña}/insights. Hace falta el permiso ads_management (revisión
   de Meta) y una cuenta publicitaria con forma de pago: eso es TRÁMITE.

   GOOGLE ADS · el flujo queda PREPARADO: se guarda la campaña con las
   operaciones exactas de googleAds:mutate (presupuesto, campaña de
   búsqueda, radio, grupo, anuncio adaptable y palabras clave). Se envía
   sola cuando haya token de desarrollador (GOOGLE_ADS_DEVELOPER_TOKEN),
   cuenta de anuncios (ajuste google_ads_cliente) y permiso adwords.

   Probado con el simulador (pruebas/anuncios-servidor.cjs). SIN probar
   contra Meta/Google de verdad.
   ===================================================================== */
import { ajuste, datosNegocio } from "./bandeja.js";

export const ESQUEMA_ANUNCIOS = [
  "CREATE TABLE IF NOT EXISTS anuncios (negocio TEXT NOT NULL, id TEXT NOT NULL, red TEXT NOT NULL, estado TEXT NOT NULL, datos TEXT NOT NULL, ext TEXT NOT NULL DEFAULT '{}', resultados TEXT, motivo TEXT, ejemplo INTEGER NOT NULL DEFAULT 0, creado INTEGER NOT NULL, actualizado INTEGER NOT NULL, PRIMARY KEY (negocio, id))",
];
export const OBJETIVOS = {
  visitas: { nm: "Más visitas a tu web o reservas", meta: "OUTCOME_TRAFFIC", optimizar: "LINK_CLICKS" },
  alcance: { nm: "Que te conozca más gente cerca", meta: "OUTCOME_AWARENESS", optimizar: "REACH" },
};
const BOTONES = { reservar: "BOOK_TRAVEL", mas: "LEARN_MORE", pedir: "ORDER_NOW", llamar: "CALL_NOW", comprar: "SHOP_NOW" };
export const API_ADS = "v21";

/* Valida y normaliza lo que llega del panel */
export function validar(c, Fallo, neg = {}) {
  const d = {
    red: c.red === "google" ? "google" : "meta",
    objetivo: OBJETIVOS[c.objetivo] ? c.objetivo : "visitas",
    nombre: String(c.nombre || "").trim().slice(0, 80),
    texto: String(c.texto || "").trim().slice(0, 600),
    titulo: String(c.titulo || "").trim().slice(0, 40),
    imagen: String(c.imagen || "").trim(),
    enlace: String(c.enlace || neg.reservas || neg.web || "").trim(),
    boton: BOTONES[c.boton] ? c.boton : "reservar",
    diario: Math.round(Number(c.diario) * 100) / 100,
    dias: Math.round(Number(c.dias)),
    radioKm: Math.round(Number(c.radioKm || 5)),
    edadMin: Math.round(Number(c.edadMin || 18)), edadMax: Math.round(Number(c.edadMax || 65)),
    lat: Number(c.lat != null ? c.lat : neg.lat), lng: Number(c.lng != null ? c.lng : neg.lng),
    inicio: c.inicio ? new Date(c.inicio).getTime() : Date.now() + 3600e3,
    palabras: Array.isArray(c.palabras) ? c.palabras.map((x) => String(x).trim()).filter(Boolean).slice(0, 15) : [],
  };
  if (!d.texto) throw new Fallo("Escribe el texto del anuncio");
  if (!(d.diario >= 1 && d.diario <= 500)) throw new Fallo("El presupuesto diario va de 1 € a 500 €");
  if (!(d.dias >= 1 && d.dias <= 60)) throw new Fallo("La campaña dura de 1 a 60 días");
  if (!(d.radioKm >= 1 && d.radioKm <= 80)) throw new Fallo("El radio va de 1 a 80 km");
  if (!(d.edadMin >= 18 && d.edadMax <= 65 && d.edadMin <= d.edadMax)) throw new Fallo("La edad va de 18 a 65 años");
  if (!isFinite(d.lat) || !isFinite(d.lng) || Math.abs(d.lat) > 90 || Math.abs(d.lng) > 180) throw new Fallo("Falta la ubicación del negocio (latitud y longitud) para el público local");
  if (!/^https:\/\//.test(d.enlace)) throw new Fallo("El enlace del anuncio tiene que empezar por https://");
  if (d.imagen && !/^https:\/\//.test(d.imagen)) throw new Fallo("La imagen tiene que ser una dirección https:// (las redes la descargan)");
  if (!d.inicio || d.inicio < Date.now() - 6e5) d.inicio = Date.now() + 3600e3;
  d.fin = d.inicio + d.dias * 864e5;
  d.total = Math.round(d.diario * d.dias * 100) / 100;
  if (!d.nombre) d.nombre = "Chispa · " + OBJETIVOS[d.objetivo].nm + " · " + new Date(d.inicio).toISOString().slice(0, 10);
  if (!d.titulo) d.titulo = (neg.nombre || "").slice(0, 40);
  return d;
}

/* ---------------- Meta ---------------- */
export function pasosMeta(d, cuenta, pagina, ig) {
  const objetivo = OBJETIVOS[d.objetivo];
  const link = { link: d.enlace, message: d.texto, name: d.titulo || undefined, call_to_action: { type: BOTONES[d.boton], value: { link: d.enlace } } };
  if (d.imagen) link.picture = d.imagen;
  const historia = { page_id: pagina, link_data: link };
  if (ig) historia.instagram_actor_id = ig;
  return {
    campana: { name: d.nombre, objective: objetivo.meta, status: "PAUSED", special_ad_categories: "[]", buying_type: "AUCTION" },
    conjunto: (campana) => ({
      name: d.nombre + " · público", campaign_id: campana, status: "PAUSED", billing_event: "IMPRESSIONS", optimization_goal: objetivo.optimizar,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP", daily_budget: String(Math.round(d.diario * 100)), // en céntimos de la moneda de la cuenta
      start_time: new Date(d.inicio).toISOString(), end_time: new Date(d.fin).toISOString(),
      targeting: JSON.stringify({ geo_locations: { custom_locations: [{ latitude: d.lat, longitude: d.lng, radius: d.radioKm, distance_unit: "kilometer" }] }, age_min: d.edadMin, age_max: d.edadMax }),
    }),
    creatividad: { name: d.nombre + " · creatividad", object_story_spec: JSON.stringify(historia) },
    anuncio: (conjunto, creatividad) => ({ name: d.nombre + " · anuncio", adset_id: conjunto, creative: JSON.stringify({ creative_id: creatividad }), status: "PAUSED" }),
  };
}
async function cuentaPublicitaria(env, ctx, negocio) {
  const guardada = await ajuste(env, negocio, "meta_cuenta_anuncios");
  if (guardada && guardada.id) return guardada;
  const { t } = await ctx.tokensDe(env, negocio, "meta");
  if (!t.usuario) throw new ctx.Fallo("Meta conectado sin permiso de usuario: vuelve a conectar Instagram y Facebook", 409);
  const j = await ctx.graph("/me/adaccounts", { fields: "account_id,name,currency,account_status", limit: "25", access_token: t.usuario }, "GET");
  const activa = (j.data || []).find((a) => a.account_status === 1) || (j.data || [])[0];
  if (!activa) throw new ctx.Fallo("Tu cuenta de Facebook no tiene ninguna cuenta publicitaria. Créala en business.facebook.com → Configuración → Cuentas publicitarias, añade una forma de pago y vuelve a pulsar «Crear».", 409, { motivo: "sin-cuenta-anuncios" });
  const c = { id: "act_" + String(activa.account_id || activa.id).replace(/^act_/, ""), nombre: activa.name, moneda: activa.currency };
  await ajuste(env, negocio, "meta_cuenta_anuncios", c);
  return c;
}
async function tokenUsuarioMeta(env, ctx, negocio) { const { t } = await ctx.tokensDe(env, negocio, "meta"); return t.usuario; }

async function crearMeta(env, ctx, negocio, d) {
  const c = await ctx.credPara(env, negocio, "fb", {});
  const cuenta = await cuentaPublicitaria(env, ctx, negocio);
  if (cuenta.moneda && cuenta.moneda !== "EUR") throw new ctx.Fallo("La cuenta publicitaria está en " + cuenta.moneda + ": Chispa trabaja en euros. Cambia la moneda o crea otra cuenta en euros.", 409);
  const tk = await tokenUsuarioMeta(env, ctx, negocio);
  const p = pasosMeta(d, cuenta.id, c.FB_PAGE_ID, c.IG_USER_ID);
  const ext = { cuenta: cuenta.id };
  const fase = async (nombre, ruta, params) => {
    try { return await ctx.graph(ruta, { ...params, access_token: tk }); }
    catch (e) { const f = new ctx.Fallo("Meta rechazó " + nombre + ": " + (e.message || e), 502, { ext }); throw f; }
  };
  ext.campana = (await fase("la campaña", "/" + cuenta.id + "/campaigns", p.campana)).id;
  ext.conjunto = (await fase("el público y el presupuesto", "/" + cuenta.id + "/adsets", p.conjunto(ext.campana))).id;
  ext.creatividad = (await fase("el texto y la imagen", "/" + cuenta.id + "/adcreatives", p.creatividad)).id;
  ext.anuncio = (await fase("el anuncio", "/" + cuenta.id + "/ads", p.anuncio(ext.conjunto, ext.creatividad))).id;
  return ext;
}
async function estadoMeta(env, ctx, negocio, ext, estado) {
  const tk = await tokenUsuarioMeta(env, ctx, negocio);
  const orden = estado === "ACTIVE" ? [ext.campana, ext.conjunto, ext.anuncio] : [ext.campana];
  for (const id of orden) if (id) await ctx.graph("/" + id, { status: estado, access_token: tk });
}
async function resultadosMeta(env, ctx, negocio, ext) {
  const tk = await tokenUsuarioMeta(env, ctx, negocio);
  const j = await ctx.graph("/" + ext.campana + "/insights", { fields: "impressions,reach,clicks,spend,ctr,cpc,actions", date_preset: "maximum", access_token: tk }, "GET");
  const r = (j.data || [])[0] || {};
  const accion = (t) => Number(((r.actions || []).find((a) => a.action_type === t) || {}).value || 0);
  return { impresiones: Number(r.impressions || 0), alcance: Number(r.reach || 0), clics: Number(r.clicks || 0), gastado: Number(r.spend || 0), ctr: Number(r.ctr || 0), cpc: Number(r.cpc || 0), clicsEnlace: accion("link_click"), leido: Date.now() };
}

/* ---------------- Google Ads (preparado) ---------------- */
export function operacionesGoogle(d, cliente, neg = {}) {
  const c = "customers/" + cliente, presu = c + "/campaignBudgets/-1", camp = c + "/campaigns/-2", grupo = c + "/adGroups/-3";
  const titulos = [d.titulo || neg.nombre || "Tu sitio en " + (neg.ciudad || "tu ciudad"), "Reserva tu mesa hoy", (neg.ciudad ? "En " + neg.ciudad : "Cerca de ti")].map((x) => String(x).slice(0, 30));
  const textos = [d.texto.slice(0, 90), ("Ven a " + (neg.nombre || "vernos") + ". Reserva en un minuto.").slice(0, 90)];
  const palabras = d.palabras.length ? d.palabras : [(neg.nombre || "restaurante") + "", "restaurante " + (neg.ciudad || "cerca"), "donde comer " + (neg.ciudad || "cerca")];
  return [
    { campaignBudgetOperation: { create: { resourceName: presu, name: d.nombre + " · presupuesto", amountMicros: String(Math.round(d.diario * 1e6)), deliveryMethod: "STANDARD", explicitlyShared: false } } },
    { campaignOperation: { create: { resourceName: camp, name: d.nombre, status: "PAUSED", advertisingChannelType: "SEARCH", campaignBudget: presu, targetSpend: {},
      startDate: new Date(d.inicio).toISOString().slice(0, 10), endDate: new Date(d.fin).toISOString().slice(0, 10),
      networkSettings: { targetGoogleSearch: true, targetSearchNetwork: false, targetContentNetwork: false }, containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING" } } },
    { campaignCriterionOperation: { create: { campaign: camp, proximity: { geoPoint: { latitudeInMicroDegrees: Math.round(d.lat * 1e6), longitudeInMicroDegrees: Math.round(d.lng * 1e6) }, radius: d.radioKm, radiusUnits: "KILOMETERS" } } } },
    { adGroupOperation: { create: { resourceName: grupo, name: d.nombre + " · grupo", campaign: camp, status: "ENABLED", type: "SEARCH_STANDARD" } } },
    { adGroupAdOperation: { create: { adGroup: grupo, status: "ENABLED", ad: { finalUrls: [d.enlace], responsiveSearchAd: { headlines: titulos.map((text) => ({ text })), descriptions: textos.map((text) => ({ text })) } } } } },
    ...palabras.map((p) => ({ adGroupCriterionOperation: { create: { adGroup: grupo, status: "ENABLED", keyword: { text: p.slice(0, 80), matchType: "PHRASE" } } } })),
  ];
}
async function crearGoogle(env, ctx, negocio, d, neg) {
  const cliente = await ajuste(env, negocio, "google_ads_cliente");
  const ops = operacionesGoogle(d, cliente || "CLIENTE", neg);
  const faltan = [];
  if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) faltan.push("token de desarrollador de Google Ads (se pide en ads.google.com → Herramientas → Centro de API)");
  if (!cliente) faltan.push("número de la cuenta de Google Ads del negocio");
  let tk = null;
  try { const t = await ctx.tokensDe(env, negocio, "google"); if (/adwords/.test(t.t.alcances || "")) tk = t.t.access; } catch (e) {}
  if (!tk) faltan.push("conectar Google con el permiso de anuncios (adwords)");
  if (faltan.length) return { estado: "preparada", ext: { operaciones: ops }, motivo: "Preparada. Para enviarla falta: " + faltan.join("; ") + "." };
  const r = await ctx.http("https://googleads.googleapis.com/v21/customers/" + cliente + "/googleAds:mutate", {
    method: "POST", headers: { Authorization: "Bearer " + tk, "developer-token": env.GOOGLE_ADS_DEVELOPER_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ mutateOperations: ops }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ctx.Fallo("Google Ads rechazó la campaña: " + ((j.error && j.error.message) || r.status), 502);
  return { estado: "en-pausa", ext: { respuestas: j.mutateOperationResponses || [] } };
}

/* ---------------- guardar / leer ---------------- */
function aFila(f) { return { id: f.id, red: f.red, estado: f.estado, datos: JSON.parse(f.datos), ext: JSON.parse(f.ext || "{}"), resultados: f.resultados ? JSON.parse(f.resultados) : null, motivo: f.motivo, ejemplo: !!f.ejemplo, creado: f.creado, actualizado: f.actualizado }; }
async function guardar(env, negocio, a) {
  await env.DB.prepare("INSERT INTO anuncios (negocio, id, red, estado, datos, ext, resultados, motivo, ejemplo, creado, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (negocio, id) DO UPDATE SET estado = excluded.estado, datos = excluded.datos, ext = excluded.ext, resultados = excluded.resultados, motivo = excluded.motivo, actualizado = excluded.actualizado")
    .bind(negocio, a.id, a.red, a.estado, JSON.stringify(a.datos), JSON.stringify(a.ext || {}), a.resultados ? JSON.stringify(a.resultados) : null, a.motivo || null, a.ejemplo ? 1 : 0, a.creado || Date.now(), Date.now()).run();
}
async function leer(env, negocio, id) { const f = await env.DB.prepare("SELECT * FROM anuncios WHERE negocio = ? AND id = ?").bind(negocio, id).first(); return f ? aFila(f) : null; }
export async function listarAnuncios(env, negocio) { const { results } = await env.DB.prepare("SELECT * FROM anuncios WHERE negocio = ? ORDER BY creado DESC").bind(negocio).all(); return (results || []).map(aFila); }

/* El cron: al terminar una campaña se marca terminada; las activas leen resultados una vez al día */
export async function cronAnuncios(env, ctx, negocio) {
  for (const a of await listarAnuncios(env, negocio)) {
    if (a.red !== "meta" || a.ejemplo || !["activa", "en-pausa"].includes(a.estado)) continue;
    if (a.datos.fin < Date.now() && a.estado === "activa") a.estado = "terminada";
    if (!a.resultados || Date.now() - a.resultados.leido > 20 * 36e5) { try { a.resultados = await resultadosMeta(env, ctx, negocio, a.ext); } catch (e) { a.motivo = "No se pudieron leer los resultados: " + (e.message || e); } }
    await guardar(env, negocio, a);
  }
}

export async function rutasAnuncios(req, env, ctx, s, m, ruta, partes) {
  if (partes[0] !== "anuncios") return undefined;
  const neg = s.negocio;
  if (m === "GET" && ruta === "/anuncios") return { anuncios: await listarAnuncios(env, neg), objetivos: OBJETIVOS, cuenta: await ajuste(env, neg, "meta_cuenta_anuncios") };
  if (m === "POST" && ruta === "/anuncios") {
    await ctx.exigirPlan(env, neg, "anuncios");
    const c = await ctx.leerJson(req), n = await datosNegocio(env, neg);
    const d = validar(c, ctx.Fallo, n);
    const a = { id: "an" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), red: d.red, datos: d, creado: Date.now(), ejemplo: !!c.simular };
    if (c.simular) { a.estado = "simulada"; a.motivo = "Simulación: no se ha enviado a " + (d.red === "google" ? "Google" : "Meta") + " ni se gasta nada."; await guardar(env, neg, a); return a; }
    try {
      if (d.red === "meta") { a.ext = await crearMeta(env, ctx, neg, d); a.estado = "en-pausa"; a.motivo = "Creada en Meta EN PAUSA: no gasta nada hasta que pulses «Activar»."; }
      else { const g = await crearGoogle(env, ctx, neg, d, n); a.ext = g.ext; a.estado = g.estado; a.motivo = g.motivo || "Creada en Google Ads en pausa."; }
    } catch (e) {
      a.estado = "fallo"; a.motivo = String(e.message || e); a.ext = (e.extra && e.extra.ext) || {};
      await guardar(env, neg, a);
      throw e;
    }
    await guardar(env, neg, a);
    return a;
  }
  if (partes.length === 3 && m === "POST") {
    const a = await leer(env, neg, partes[1]);
    if (!a) throw new ctx.Fallo("No existe ese anuncio", 404);
    const accion = partes[2];
    if (a.ejemplo) {
      if (accion === "activar") a.estado = "simulada-activa"; else if (accion === "pausar") a.estado = "simulada";
      else if (accion === "resultados") a.resultados = { impresiones: 0, alcance: 0, clics: 0, gastado: 0, leido: Date.now(), simulado: true };
      await guardar(env, neg, a); return a;
    }
    if (a.red !== "meta") throw new ctx.Fallo("Las campañas de Google se gestionan en ads.google.com hasta tener el permiso de Google Ads", 409);
    if (accion === "activar") { soloDueno(s, ctx); await ctx.exigirPlan(env, neg, "anuncios"); await estadoMeta(env, ctx, neg, a.ext, "ACTIVE"); a.estado = "activa"; a.motivo = "Activa en Meta: gasta hasta " + a.datos.diario + " €/día hasta el " + new Date(a.datos.fin).toLocaleDateString("es-ES") + "."; }
    else if (accion === "pausar") { await estadoMeta(env, ctx, neg, a.ext, "PAUSED"); a.estado = "en-pausa"; a.motivo = "En pausa: no gasta."; }
    else if (accion === "resultados") a.resultados = await resultadosMeta(env, ctx, neg, a.ext);
    else throw new ctx.Fallo("No existe", 404);
    await guardar(env, neg, a);
    return a;
  }
  if (partes.length === 2 && m === "DELETE") {
    const a = await leer(env, neg, partes[1]);
    if (a && ["activa"].includes(a.estado)) throw new ctx.Fallo("Pausa la campaña antes de quitarla de la lista");
    await env.DB.prepare("DELETE FROM anuncios WHERE negocio = ? AND id = ?").bind(neg, partes[1]).run();
    return { ok: true };
  }
  throw new ctx.Fallo("No existe", 404);
}
function soloDueno(s, ctx) { if (!s.esAdministrador) throw new ctx.Fallo("Solo el dueño puede activar anuncios (gastan dinero)", 403); }
