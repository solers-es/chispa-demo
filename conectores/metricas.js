/* =====================================================================
   Chispa · ESTADÍSTICAS por día (servidor)
   ---------------------------------------------------------------------
   El cron del Worker las recoge una vez al día (y el panel puede pedirlo
   con «↻ Leer ahora») de las APIs oficiales de insights:

     Instagram  GET /{ig}?fields=followers_count
                GET /{ig}/insights?metric=reach,views,profile_views,website_clicks,total_interactions&period=day&metric_type=total_value
     Facebook   GET /{página}?fields=followers_count
                GET /{página}/insights?metric=page_impressions_unique,page_post_engagements,page_views_total&period=day
     Google     businessprofileperformance v1 locations/{id}:fetchMultiDailyMetricsTimeSeries
                (impresiones, llamadas, «cómo llegar», web, reservas; Google va ~3 días tarde)
     YouTube    youtubeAnalytics v2 reports dimensions=day + channels?part=statistics
     TikTok     user/info (follower_count, likes_count) y video/list (vistas acumuladas → diferencia del día)

   Se guarda una fila por negocio, red y día (tabla metricas_dia). Si no
   hay ninguna red conectada, GET /metricas devuelve datos de EJEMPLO
   marcados ejemplo:true (consejos.js → serieEjemplo). Nunca se mezclan.
   ===================================================================== */
import { resumen, serieEjemplo, diaISO } from "./consejos.js";
import { ajuste } from "./bandeja.js";

export const ESQUEMA_METRICAS = [
  "CREATE TABLE IF NOT EXISTS metricas_dia (negocio TEXT NOT NULL, red TEXT NOT NULL, dia TEXT NOT NULL, datos TEXT NOT NULL, actualizado INTEGER NOT NULL, PRIMARY KEY (negocio, red, dia))",
];

async function guardarDia(env, negocio, red, dia, datos) {
  const viejo = await env.DB.prepare("SELECT datos FROM metricas_dia WHERE negocio = ? AND red = ? AND dia = ?").bind(negocio, red, dia).first();
  const junto = { ...(viejo ? JSON.parse(viejo.datos) : {}), ...limpio(datos) };
  await env.DB.prepare("INSERT INTO metricas_dia (negocio, red, dia, datos, actualizado) VALUES (?, ?, ?, ?, ?) ON CONFLICT (negocio, red, dia) DO UPDATE SET datos = excluded.datos, actualizado = excluded.actualizado")
    .bind(negocio, red, dia, JSON.stringify(junto), Date.now()).run();
}
function limpio(o) { const r = {}; for (const k in o) if (typeof o[k] === "number" && isFinite(o[k])) r[k] = o[k]; return r; }

/* Valor de una métrica de Graph, venga como serie (values) o como total (total_value) */
function valorGraph(d) {
  if (!d) return undefined;
  if (d.total_value && typeof d.total_value.value === "number") return d.total_value.value;
  const v = (d.values || []).map((x) => x.value).filter((x) => typeof x === "number");
  return v.length ? v[v.length - 1] : undefined;
}
const porNombre = (j) => { const o = {}; for (const d of (j && j.data) || []) o[d.name] = valorGraph(d); return o; };

async function instagram(ctx, c, desde, hasta) {
  const cuenta = await ctx.graph("/" + c.IG_USER_ID, { fields: "followers_count,media_count", access_token: c.META_TOKEN }, "GET");
  let ins = {};
  try { ins = porNombre(await ctx.graph("/" + c.IG_USER_ID + "/insights", { metric: "reach,views,profile_views,website_clicks,total_interactions", period: "day", metric_type: "total_value", since: String(desde), until: String(hasta), access_token: c.META_TOKEN }, "GET")); }
  catch (e) { ins = porNombre(await ctx.graph("/" + c.IG_USER_ID + "/insights", { metric: "reach", period: "day", since: String(desde), until: String(hasta), access_token: c.META_TOKEN }, "GET")); }
  return { seguidores: cuenta.followers_count, alcance: ins.reach, vistas: ins.views, visitas_perfil: ins.profile_views, clics_web: ins.website_clicks, interacciones: ins.total_interactions };
}
async function facebook(ctx, c, desde, hasta) {
  const p = await ctx.graph("/" + c.FB_PAGE_ID, { fields: "followers_count,fan_count", access_token: c.META_TOKEN }, "GET");
  let ins = {};
  try { ins = porNombre(await ctx.graph("/" + c.FB_PAGE_ID + "/insights", { metric: "page_impressions_unique,page_post_engagements,page_views_total", period: "day", since: String(desde), until: String(hasta), access_token: c.META_TOKEN }, "GET")); }
  catch (e) { /* Meta retira métricas de páginas a menudo: sin ellas queda al menos seguidores */ }
  return { seguidores: p.followers_count != null ? p.followers_count : p.fan_count, alcance: ins.page_impressions_unique, interacciones: ins.page_post_engagements, visitas_perfil: ins.page_views_total };
}
const METRICAS_GBP = {
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "vistas", BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "vistas", BUSINESS_IMPRESSIONS_MOBILE_MAPS: "vistas", BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "vistas",
  CALL_CLICKS: "llamadas", WEBSITE_CLICKS: "clics_web", BUSINESS_DIRECTION_REQUESTS: "como_llegar", BUSINESS_BOOKINGS: "reservas",
};
async function google(ctx, c, diaIni, diaFin) {
  const [a, b] = [diaIni.split("-"), diaFin.split("-")];
  const q = Object.keys(METRICAS_GBP).map((k) => "dailyMetrics=" + k).join("&") +
    "&dailyRange.start_date.year=" + +a[0] + "&dailyRange.start_date.month=" + +a[1] + "&dailyRange.start_date.day=" + +a[2] +
    "&dailyRange.end_date.year=" + +b[0] + "&dailyRange.end_date.month=" + +b[1] + "&dailyRange.end_date.day=" + +b[2];
  const j = await ctx.gjson("https://businessprofileperformance.googleapis.com/v1/" + c.GBP_LOCAL + ":fetchMultiDailyMetricsTimeSeries?" + q, c.GOOGLE_ACCESS);
  const dias = {};
  for (const grupo of j.multiDailyMetricTimeSeries || []) for (const serie of grupo.dailyMetricTimeSeries || []) {
    const campo = METRICAS_GBP[serie.dailyMetric]; if (!campo) continue;
    for (const dv of (serie.timeSeries && serie.timeSeries.datedValues) || []) {
      const d = dv.date; if (!d) continue;
      const dia = d.year + "-" + String(d.month).padStart(2, "0") + "-" + String(d.day).padStart(2, "0");
      (dias[dia] = dias[dia] || {})[campo] = ((dias[dia] || {})[campo] || 0) + Number(dv.value || 0);
    }
  }
  return dias;
}
async function youtube(ctx, c, diaIni, diaFin) {
  const ch = await ctx.gjson("https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true", c.GOOGLE_ACCESS);
  const st = ((ch.items || [])[0] || {}).statistics || {};
  const r = await ctx.gjson("https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&dimensions=day&metrics=views,likes,comments,shares,subscribersGained&startDate=" + diaIni + "&endDate=" + diaFin, c.GOOGLE_ACCESS);
  const dias = {};
  for (const row of r.rows || []) dias[row[0]] = { vistas: row[1], interacciones: (row[2] || 0) + (row[3] || 0) + (row[4] || 0) };
  return { dias, seguidores: st.subscriberCount != null ? Number(st.subscriberCount) : undefined };
}
async function tiktok(ctx, c) {
  const u = await ctx.gjson("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count", c.TIKTOK_TOKEN);
  const user = (u.data && u.data.user) || {};
  let vistas = 0, inter = 0;
  try {
    const v = await ctx.gjson("https://open.tiktokapis.com/v2/video/list/?fields=id,view_count,like_count,comment_count,share_count", c.TIKTOK_TOKEN, "POST", { max_count: 20 });
    for (const x of (v.data && v.data.videos) || []) { vistas += x.view_count || 0; inter += (x.like_count || 0) + (x.comment_count || 0) + (x.share_count || 0); }
  } catch (e) {}
  return { seguidores: user.follower_count, vistas_acum: vistas, inter_acum: inter };
}

/* Recoge ayer (y los últimos días de Google, que llega con retraso). Devuelve {porRed} */
export async function recogerMetricas(env, ctx, negocio, hoy = Date.now()) {
  const cache = {}, porRed = {};
  const ayer = diaISO(hoy - 864e5), hace7 = diaISO(hoy - 8 * 864e5);
  // ventana de un día en segundos UNIX (Graph: since incluido, until excluido)
  const ini = Math.floor(Date.parse(ayer + "T00:00:00Z") / 1000), fin = ini + 86400;
  const uno = async (red, cod, fn) => {
    let c;
    try { c = await ctx.credPara(env, negocio, cod, cache); } catch (e) { porRed[red] = { conectada: false }; return; }
    try { await fn(c); porRed[red] = { conectada: true, ok: true }; } catch (e) { porRed[red] = { conectada: true, error: String(e.message || e) }; }
  };
  await uno("ig", "igf", async (c) => { if (!c.IG_USER_ID) throw new Error("sin Instagram profesional enlazado"); await guardarDia(env, negocio, "ig", ayer, await instagram(ctx, c, ini, fin)); });
  await uno("fb", "fb", async (c) => guardarDia(env, negocio, "fb", ayer, await facebook(ctx, c, ini, fin)));
  await uno("gbp", "gbp", async (c) => { const d = await google(ctx, c, hace7, ayer); for (const dia in d) await guardarDia(env, negocio, "gbp", dia, d[dia]); });
  await uno("yt", "yt", async (c) => { const r = await youtube(ctx, c, hace7, ayer); for (const dia in r.dias) await guardarDia(env, negocio, "yt", dia, r.dias[dia]); if (r.seguidores != null) await guardarDia(env, negocio, "yt", ayer, { seguidores: r.seguidores }); });
  await uno("tt", "tt", async (c) => {
    const r = await tiktok(ctx, c), antes = await env.DB.prepare("SELECT datos FROM metricas_dia WHERE negocio = ? AND red = 'tt' AND dia < ? ORDER BY dia DESC LIMIT 1").bind(negocio, ayer).first();
    const p = antes ? JSON.parse(antes.datos) : null;
    await guardarDia(env, negocio, "tt", ayer, { ...r, vistas: p && p.vistas_acum != null ? Math.max(0, r.vistas_acum - p.vistas_acum) : undefined, interacciones: p && p.inter_acum != null ? Math.max(0, r.inter_acum - p.inter_acum) : undefined });
  });
  await ajuste(env, negocio, "metricas_recogida", { cuando: Date.now(), dia: ayer, porRed });
  return { porRed, dia: ayer };
}

export async function leerMetricas(env, negocio, dias = 28) {
  const desde = diaISO(Date.now() - (dias + 1) * 864e5);
  const { results } = await env.DB.prepare("SELECT red, dia, datos FROM metricas_dia WHERE negocio = ? AND dia >= ? ORDER BY dia").bind(negocio, desde).all();
  return (results || []).map((f) => ({ red: f.red, dia: f.dia, ...JSON.parse(f.datos) }));
}

/* Lo de la bandeja que entra en los consejos */
async function extraBandeja(env, negocio) {
  const a = await env.DB.prepare("SELECT COUNT(*) AS n FROM bandeja WHERE negocio = ? AND estado = 'nuevo' AND ejemplo = 0").bind(negocio).first();
  const b = await env.DB.prepare("SELECT AVG(nota) AS media, COUNT(*) AS n FROM bandeja WHERE negocio = ? AND tipo = 'resena' AND nota IS NOT NULL AND ejemplo = 0").bind(negocio).first();
  return { sinResponder: (a && a.n) || 0, notaMedia: b && b.n ? b.media : null };
}

export async function rutasMetricas(req, env, ctx, s, m, ruta, partes, url) {
  if (partes[0] !== "metricas") return undefined;
  if (m === "POST" && ruta === "/metricas/recoger") return recogerMetricas(env, ctx, s.negocio);
  if (m === "GET" && ruta === "/metricas") {
    const dias = Math.min(90, Math.max(7, Number(url.searchParams.get("dias")) || 28));
    const filas = await leerMetricas(env, s.negocio, dias);
    const recogida = await ajuste(env, s.negocio, "metricas_recogida");
    if (!filas.length) {
      const r = resumen(serieEjemplo(dias));
      return { ...r, ejemplo: true, recogida, aviso: "Aún no hay datos de tus redes: son cifras de EJEMPLO. Se rellenan solas cada día cuando conectas Instagram, Facebook, Google, YouTube o TikTok." };
    }
    return { ...resumen(filas, await extraBandeja(env, s.negocio)), ejemplo: false, recogida };
  }
  throw new ctx.Fallo("No existe", 404);
}
