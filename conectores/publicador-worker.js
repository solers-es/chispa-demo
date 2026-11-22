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
import { publicarEn, estadisticas } from "./redes.js"; // llamadas a las redes, compartidas con chispa-api-worker.js

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
          await publicarEn(env, red, { texto: it.texto, titulo: it.titulo, medios: it.medios || [], esVideo, formato: it.formato, prueba: it.prueba || "", colaboradores: it.colaboradores || [] });
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
