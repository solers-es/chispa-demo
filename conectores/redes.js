/* =====================================================================
   Chispa · llamadas a las redes (código COMPARTIDO)
   ---------------------------------------------------------------------
   Lo usan los dos servidores:
     · publicador-worker.js  → un solo negocio, tokens en secretos de Cloudflare
     · chispa-api-worker.js  → varios negocios, tokens cifrados en la base (D1)
   Cada función recibe un objeto «cred» con los mismos nombres que los
   secretos del publicador (META_TOKEN, IG_USER_ID, FB_PAGE_ID, TIKTOK_TOKEN,
   GOOGLE_*, GBP_CUENTA, GBP_LOCAL, YT_CANAL, RESERVAS_URL…). Si trae
   GOOGLE_ACCESS (token de acceso ya renovado) se usa tal cual; si no, se
   renueva con GOOGLE_REFRESH como antes.
   ===================================================================== */
export const GRAPH = "https://graph.facebook.com/v21.0";

/* ---------- publicar en cada red ---------- */
export async function publicarEn(env, red, p) {
  if (red === "igf" || red === "igs") return instagram(env, p, red === "igs");
  if (red === "fb") return facebook(env, p);
  if (red === "tt") return tiktok(env, p);
  if (red === "yt") return youtube(env, p);
  if (red === "gbp") return googleNegocio(env, p);
  if (red === "wa") throw new Error("WhatsApp no permite publicar Estados por API: se avisa para subirlo con un toque");
  throw new Error("Red desconocida: " + red);
}
export async function graph(ruta, params, metodo = "POST") {
  const body = new URLSearchParams(params);
  const r = await fetch(GRAPH + ruta + (metodo === "GET" ? "?" + body : ""), metodo === "GET" ? {} : { method: "POST", body });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error((j.error && j.error.message) || "Meta " + r.status);
  return j;
}
async function esperarContenedor(id, token) {
  for (let i = 0; i < 20; i++) { // los vídeos tardan en procesarse
    const j = await graph("/" + id, { fields: "status_code", access_token: token }, "GET");
    if (j.status_code === "FINISHED") return;
    if (j.status_code === "ERROR" || j.status_code === "EXPIRED") throw new Error("Instagram no pudo procesar el vídeo");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Instagram tarda demasiado en procesar el vídeo");
}
async function instagram(env, p, historia) {
  if (!env.META_TOKEN || !env.IG_USER_ID) throw new Error("Instagram sin conectar (falta META_TOKEN / IG_USER_ID)");
  const t = env.META_TOKEN, ig = "/" + env.IG_USER_ID, m = p.medios || [];
  if (!m.length) throw new Error("Instagram necesita imagen o vídeo");
  let cont;
  // Collab: hasta 3 usuarios invitados como colaboradores (no vale en historias) · reel de prueba: trial_params
  // (API de Instagram, IG User /media: «collaborators» y «trial_params.graduation_strategy» MANUAL | SS_PERFORMANCE)
  const extra = {};
  const colab = (p.colaboradores || []).map((u) => String(u).replace(/^@/, "")).filter((u) => /^[\w.]{1,30}$/.test(u)).slice(0, 3);
  if (!historia && colab.length) extra.collaborators = JSON.stringify(colab);
  if (!historia && p.esVideo && p.prueba) extra.trial_params = JSON.stringify({ graduation_strategy: p.prueba === "SS_PERFORMANCE" ? "SS_PERFORMANCE" : "MANUAL" });
  if (!historia && m.length > 1 && !p.esVideo) {
    const hijos = [];
    for (const u of m.slice(0, 10)) hijos.push((await graph(ig + "/media", { image_url: u, is_carousel_item: "true", access_token: t })).id);
    cont = (await graph(ig + "/media", { media_type: "CAROUSEL", children: hijos.join(","), caption: p.texto, ...extra, access_token: t })).id;
  } else if (p.esVideo) {
    cont = (await graph(ig + "/media", { media_type: historia ? "STORIES" : "REELS", video_url: m[0], caption: historia ? "" : p.texto, ...extra, access_token: t })).id;
    await esperarContenedor(cont, t);
  } else {
    const q = { image_url: m[0], ...(historia ? {} : { collaborators: extra.collaborators }), access_token: t };
    if (!q.collaborators) delete q.collaborators;
    if (historia) q.media_type = "STORIES"; else q.caption = p.texto;
    cont = (await graph(ig + "/media", q)).id;
  }
  return (await graph(ig + "/media_publish", { creation_id: cont, access_token: t })).id;
}
async function facebook(env, p) {
  if (!env.META_TOKEN || !env.FB_PAGE_ID) throw new Error("Facebook sin conectar (falta META_TOKEN / FB_PAGE_ID)");
  const pg = "/" + env.FB_PAGE_ID, m = p.medios || [];
  if (p.esVideo && m[0]) return (await graph(pg + "/videos", { file_url: m[0], description: p.texto, access_token: env.META_TOKEN })).id;
  if (m[0]) return (await graph(pg + "/photos", { url: m[0], message: p.texto, access_token: env.META_TOKEN })).id;
  return (await graph(pg + "/feed", { message: p.texto, access_token: env.META_TOKEN })).id;
}
async function tiktok(env, p) {
  if (!env.TIKTOK_TOKEN) throw new Error("TikTok sin conectar (falta TIKTOK_TOKEN)");
  const m = p.medios || [];
  if (!m.length) throw new Error("TikTok necesita vídeo o fotos");
  // Ojo: hasta que TikTok audite la app, solo deja publicar en privado (SELF_ONLY)
  const privacidad = env.TIKTOK_PRIVACIDAD || "SELF_ONLY";
  const cab = { Authorization: "Bearer " + env.TIKTOK_TOKEN, "Content-Type": "application/json; charset=UTF-8" };
  const cuerpo = p.esVideo
    ? { post_info: { title: (p.texto || "").slice(0, 2200), privacy_level: privacidad }, source_info: { source: "PULL_FROM_URL", video_url: m[0] } }
    : { post_info: { title: (p.titulo || "").slice(0, 90), description: (p.texto || "").slice(0, 4000), privacy_level: privacidad }, source_info: { source: "PULL_FROM_URL", photo_images: m.slice(0, 35), photo_cover_index: 0 }, post_mode: "DIRECT_POST", media_type: "PHOTO" };
  const r = await fetch("https://open.tiktokapis.com/v2/post/publish/" + (p.esVideo ? "video" : "content") + "/init/", { method: "POST", headers: cab, body: JSON.stringify(cuerpo) });
  const j = await r.json();
  if (!r.ok || (j.error && j.error.code !== "ok")) throw new Error("TikTok: " + ((j.error && j.error.message) || r.status));
  return j.data && j.data.publish_id;
}
export async function tokenGoogle(env) {
  if (env.GOOGLE_ACCESS) return env.GOOGLE_ACCESS; // el servidor de varios negocios ya lo trae renovado
  if (!env.GOOGLE_REFRESH) throw new Error("Google sin conectar (falta GOOGLE_REFRESH)");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH, grant_type: "refresh_token" }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("Google: no se pudo renovar el permiso");
  return j.access_token;
}
async function youtube(env, p) {
  const m = p.medios || [];
  if (!p.esVideo || !m[0]) throw new Error("YouTube Shorts necesita un vídeo vertical");
  const tk = await tokenGoogle(env);
  const meta = { snippet: { title: ((p.titulo || "") + " #Shorts").slice(0, 100), description: p.texto || "", categoryId: "26" }, status: { privacyStatus: "public", selfDeclaredMadeForKids: false } };
  const ini = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", { method: "POST", headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json; charset=UTF-8" }, body: JSON.stringify(meta) });
  if (!ini.ok) throw new Error("YouTube: " + ini.status);
  const video = await fetch(m[0]);
  const sub = await fetch(ini.headers.get("Location"), { method: "PUT", headers: { "Content-Type": video.headers.get("Content-Type") || "video/mp4" }, body: video.body });
  const j = await sub.json();
  if (!sub.ok) throw new Error("YouTube: " + ((j.error && j.error.message) || sub.status));
  return j.id;
}
async function googleNegocio(env, p) {
  if (!env.GBP_CUENTA || !env.GBP_LOCAL) throw new Error("Ficha de Google sin conectar (faltan GBP_CUENTA / GBP_LOCAL)");
  const tk = await tokenGoogle(env), m = (p.medios || []).filter((u) => !/\.(mp4|webm|mov)(\?|$)/i.test(u));
  const cuerpo = { languageCode: "es", topicType: "STANDARD", summary: (p.texto || "").slice(0, 1500) };
  if (m[0]) cuerpo.media = [{ mediaFormat: "PHOTO", sourceUrl: m[0] }];
  if (env.RESERVAS_URL) cuerpo.callToAction = { actionType: "BOOK", url: env.RESERVAS_URL };
  const r = await fetch("https://mybusiness.googleapis.com/v4/" + env.GBP_CUENTA + "/" + env.GBP_LOCAL + "/localPosts", { method: "POST", headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = await r.json();
  if (!r.ok) throw new Error("Google: " + ((j.error && j.error.message) || r.status));
  return j.name;
}

/* ---------- estadísticas para el panel ---------- */
export async function estadisticas(env) {
  const out = { cuentas: [], publicaciones: [] };
  if (env.META_TOKEN && env.IG_USER_ID) {
    const t = env.META_TOKEN;
    const c = await graph("/" + env.IG_USER_ID, { fields: "username,followers_count,media_count", access_token: t }, "GET");
    out.cuentas.push({ red: "igf", usuario: c.username, seguidores: c.followers_count, publicaciones: c.media_count });
    const lista = await graph("/" + env.IG_USER_ID + "/media", { fields: "id,caption,media_type,media_product_type,timestamp", limit: "25", access_token: t }, "GET");
    for (const m of lista.data || []) {
      try {
        const ins = await graph("/" + m.id + "/insights", { metric: "views,reach,likes,comments,saved,shares,follows", access_token: t }, "GET");
        const v = {}; (ins.data || []).forEach((d) => (v[d.name] = (d.values && d.values[0] && d.values[0].value) || d.total_value?.value || 0));
        const f = m.media_product_type === "REELS" ? "reel" : m.media_type === "CAROUSEL_ALBUM" ? "carrusel" : m.media_product_type === "STORY" ? "historia" : "post";
        out.publicaciones.push({ extId: "ig:" + m.id, titulo: (m.caption || "Publicación").split("\n")[0].slice(0, 60), red: "igf", formato: f, fecha: m.timestamp, hora: new Date(m.timestamp).getHours(),
          vistas: v.views || 0, alcance: v.reach || 0, megusta: v.likes || 0, comentarios: v.comments || 0, guardados: v.saved || 0, compartidos: v.shares || 0, seguidores: v.follows || 0, fuente: "Instagram" });
      } catch (e) { /* publicación sin estadísticas disponibles */ }
    }
  }
  if ((env.GOOGLE_REFRESH || env.GOOGLE_ACCESS) && env.YT_CANAL) {
    const tk = await tokenGoogle(env), hoy = new Date().toISOString().slice(0, 10), ini = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const r = await fetch("https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&dimensions=video&sort=-views&maxResults=25&metrics=views,likes,comments,shares,subscribersGained&startDate=" + ini + "&endDate=" + hoy, { headers: { Authorization: "Bearer " + tk } });
    const j = await r.json();
    (j.rows || []).forEach((row) => out.publicaciones.push({ extId: "yt:" + row[0], titulo: "Short " + row[0], red: "yt", formato: "reel", fecha: hoy, vistas: row[1], alcance: row[1], megusta: row[2], comentarios: row[3], compartidos: row[4], guardados: 0, seguidores: row[5], fuente: "YouTube" }));
  }
  return out;
}
