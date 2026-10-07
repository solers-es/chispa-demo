/* =====================================================================
   Chispa · servidor de publicación automática (Cloudflare Worker + Cron)
   ---------------------------------------------------------------------
   Publica a su hora aunque la página esté cerrada, DIRECTAMENTE por las
   APIs oficiales (sin herramientas puente de pago):
     · Instagram  → Meta Graph API (instagram_content_publish)
     · Facebook   → Meta Graph API (pages_manage_posts)
     · TikTok     → Content Posting API (video.publish)
     · YouTube    → YouTube Data API v3 (youtube.upload)
     · Google     → Business Profile API, localPosts (business.manage)
   Y lee estadísticas (Instagram Insights, YouTube Analytics) para el panel.

   ESTADO: programado y revisado contra la documentación oficial, SIN
   PROBAR contra las redes de verdad porque todavía no hay tokens.

   Despliegue (plan gratuito de Cloudflare):
     1. npx wrangler kv namespace create AGENDA      → pega el id en wrangler-publicador.toml
     2. npx wrangler r2 bucket create chispa-medios  → y hazlo público (dominio r2.dev o propio)
     3. npx wrangler deploy -c conectores/wrangler-publicador.toml
     4. Secretos (NUNCA en el código):  npx wrangler secret put <NOMBRE> -c conectores/wrangler-publicador.toml
          CHISPA_CLAVE          clave que el panel manda en X-Chispa-Clave
          ORIGEN                https://solers-es.github.io
          MEDIA_PUBLICA         https://<tu-bucket>.r2.dev   (URL pública de R2)
          META_TOKEN            token de página de larga duración (Meta)
          IG_USER_ID            id de la cuenta profesional de Instagram
          FB_PAGE_ID            id de la página de Facebook
          TIKTOK_TOKEN          access token de TikTok (y TIKTOK_REFRESH, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET)
          GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH   (YouTube y Google Business)
          GBP_CUENTA / GBP_LOCAL  accounts/{id} y locations/{id} de la ficha de Google
     5. En index.html, antes de chispa-estudio.js:
          <script>window.CHISPA_PUBLICADOR={base:"https://chispa-publicador.<cuenta>.workers.dev",url:"https://chispa-publicador.<cuenta>.workers.dev/publicar",clave:"<CHISPA_CLAVE>"}</script>

   Rutas:
     POST   /programar        {id, redes[], texto, titulo, formato, cuando(ISO), medios[]}
     DELETE /programar/:id
     GET    /agenda           estado de todo lo programado
     POST   /subir            (multipart «archivo») → {url} pública en R2
     POST   /publicar         (multipart red, texto, archivo) → publica ya en esa red
     GET    /estadisticas     cifras de Instagram y YouTube para el panel
   Cron: cada 5 minutos publica lo que ya toca.
   ===================================================================== */
const GRAPH = "https://graph.facebook.com/v21.0";

export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ORIGEN || "https://solers-es.github.io",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Chispa-Clave",
      "Access-Control-Allow-Credentials": "true",
    };
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!env.CHISPA_CLAVE || req.headers.get("X-Chispa-Clave") !== env.CHISPA_CLAVE) return json({ error: "Sin permiso" }, 401);

    const url = new URL(req.url), ruta = url.pathname.replace(/\/+$/, "");
    try {
      if (req.method === "POST" && ruta === "/programar") {
        const it = await req.json();
        if (!it.id || !it.cuando || !Array.isArray(it.redes)) return json({ error: "Faltan datos" }, 400);
        const viejo = JSON.parse((await env.AGENDA.get("item:" + it.id)) || "null");
        const nuevo = { ...viejo, ...it, estado: "programada", res: (viejo && viejo.res) || {} };
        await env.AGENDA.put("item:" + it.id, JSON.stringify(nuevo));
        return json({ ok: true });
      }
      if (req.method === "DELETE" && ruta.startsWith("/programar/")) {
        await env.AGENDA.delete("item:" + decodeURIComponent(ruta.split("/").pop()));
        return json({ ok: true });
      }
      if (req.method === "GET" && ruta === "/agenda") return json({ items: await listar(env) });
      if (req.method === "POST" && ruta === "/subir") {
        const fd = await req.formData(), f = fd.get("archivo");
        if (!f) return json({ error: "Falta el archivo" }, 400);
        return json({ url: await subirR2(env, f) });
      }
      if (req.method === "POST" && ruta === "/publicar") {
        const fd = await req.formData(), f = fd.get("archivo"), red = String(fd.get("red") || "");
        const medio = f ? await subirR2(env, f) : null;
        const esVideo = f && /^video\//.test(f.type);
        const r = await publicarEn(env, red, { texto: String(fd.get("texto") || ""), medios: medio ? [medio] : [], esVideo, formato: esVideo ? "reel" : "post" });
        return json({ ok: true, id: r });
      }
      if (req.method === "GET" && ruta === "/estadisticas") return json(await estadisticas(env));
      return json({ error: "No existe" }, 404);
    } catch (e) {
      return json({ error: String(e.message || e) }, 502);
    }
  },

  // Cron Trigger: publica lo que toca
  async scheduled(event, env, ctx) {
    const ahora = Date.now();
    for (const it of await listar(env)) {
      if (it.estado !== "programada" || new Date(it.cuando).getTime() > ahora) continue;
      it.res = it.res || {};
      const fallos = [];
      for (const red of it.redes) {
        if (it.res[red] === "publicada") continue;
        try {
          const esVideo = it.formato === "reel" || it.formato === "historia" || (it.medios || []).some((m) => /\.(mp4|webm|mov)(\?|$)/i.test(m));
          await publicarEn(env, red, { texto: it.texto, titulo: it.titulo, medios: it.medios || [], esVideo, formato: it.formato });
          it.res[red] = "publicada";
        } catch (e) {
          it.res[red] = "fallo";
          fallos.push(red + ": " + (e.message || e));
        }
      }
      it.estado = fallos.length ? "fallo" : "publicada";
      it.motivo = fallos.join(" · ");
      it.publicadaEn = new Date().toISOString();
      await env.AGENDA.put("item:" + it.id, JSON.stringify(it));
    }
  },
};

async function listar(env) {
  const out = [];
  let cursor;
  do {
    const r = await env.AGENDA.list({ prefix: "item:", cursor });
    for (const k of r.keys) { const v = await env.AGENDA.get(k.name); if (v) out.push(JSON.parse(v)); }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out;
}

async function subirR2(env, f) {
  const ext = (f.type.split("/")[1] || "bin").replace("jpeg", "jpg").replace(/;.*/, "");
  const clave = "m/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + "." + ext;
  await env.MEDIOS.put(clave, f.stream(), { httpMetadata: { contentType: f.type } });
  return env.MEDIA_PUBLICA.replace(/\/$/, "") + "/" + clave;
}

/* ---------- publicar en cada red ---------- */
async function publicarEn(env, red, p) {
  if (red === "igf" || red === "igs") return instagram(env, p, red === "igs");
  if (red === "fb") return facebook(env, p);
  if (red === "tt") return tiktok(env, p);
  if (red === "yt") return youtube(env, p);
  if (red === "gbp") return googleNegocio(env, p);
  if (red === "wa") throw new Error("WhatsApp no permite publicar Estados por API: se avisa para subirlo con un toque");
  throw new Error("Red desconocida: " + red);
}
async function graph(ruta, params, metodo = "POST") {
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
  if (!historia && m.length > 1 && !p.esVideo) {
    const hijos = [];
    for (const u of m.slice(0, 10)) hijos.push((await graph(ig + "/media", { image_url: u, is_carousel_item: "true", access_token: t })).id);
    cont = (await graph(ig + "/media", { media_type: "CAROUSEL", children: hijos.join(","), caption: p.texto, access_token: t })).id;
  } else if (p.esVideo) {
    cont = (await graph(ig + "/media", { media_type: historia ? "STORIES" : "REELS", video_url: m[0], caption: historia ? "" : p.texto, access_token: t })).id;
    await esperarContenedor(cont, t);
  } else {
    const q = { image_url: m[0], access_token: t };
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
async function tokenGoogle(env) {
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
async function estadisticas(env) {
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
  if (env.GOOGLE_REFRESH && env.YT_CANAL) {
    const tk = await tokenGoogle(env), hoy = new Date().toISOString().slice(0, 10), ini = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const r = await fetch("https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&dimensions=video&sort=-views&maxResults=25&metrics=views,likes,comments,shares,subscribersGained&startDate=" + ini + "&endDate=" + hoy, { headers: { Authorization: "Bearer " + tk } });
    const j = await r.json();
    (j.rows || []).forEach((row) => out.publicaciones.push({ extId: "yt:" + row[0], titulo: "Short " + row[0], red: "yt", formato: "reel", fecha: hoy, vistas: row[1], alcance: row[1], megusta: row[2], comentarios: row[3], compartidos: row[4], guardados: 0, seguidores: row[5], fuente: "YouTube" }));
  }
  return out;
}
