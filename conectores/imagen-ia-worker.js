/* =====================================================================
   Chispa · servidor de imágenes con IA (ejemplo listo para desplegar)
   ---------------------------------------------------------------------
   Es el proveedor "servidor" del MOTOR DE IMAGEN de chispa-estudio.js.
   Se puede cambiar por NUESTRO propio servidor de IA cuando exista: basta
   con que acepte lo mismo y devuelva lo mismo.

   Recibe (POST JSON):  { prompt, formato, ancho, alto, cantidad }
   Devuelve (JSON):     { urls: ["https://…" | "data:image/png;base64,…"] }

   Despliegue (Cloudflare Workers, plan gratis):
     1. npx wrangler deploy conectores/imagen-ia-worker.js --name chispa-imagen
     2. Secretos (NUNCA en el código):
          npx wrangler secret put PROVEEDOR       → openai | replicate
          npx wrangler secret put OPENAI_API_KEY  → si PROVEEDOR=openai
          npx wrangler secret put REPLICATE_API_TOKEN → si PROVEEDOR=replicate
          npx wrangler secret put ORIGEN          → https://solers-es.github.io
     3. En index.html, ANTES de chispa-estudio.js:
          <script>window.CHISPA_MOTOR={proveedor:"servidor",url:"https://chispa-imagen.<cuenta>.workers.dev"}</script>

   Coste orientativo: OpenAI gpt-image-1 ≈ 0,02-0,07 $ por imagen;
   Replicate flux-schnell ≈ 0,003 $ por imagen.
   ===================================================================== */
export default {
  async fetch(req, env) {
    const origen = env.ORIGEN || "https://solers-es.github.io";
    const cors = {
      "Access-Control-Allow-Origin": origen,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Solo POST", { status: 405, headers: cors });
    const responder = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    let q;
    try { q = await req.json(); } catch { return responder({ error: "JSON no válido" }, 400); }
    const prompt = String(q.prompt || "").slice(0, 1500);
    if (!prompt) return responder({ error: "Falta el texto" }, 400);
    const cantidad = Math.min(Math.max(parseInt(q.cantidad) || 1, 1), 3);
    const vertical = (q.alto || 0) > (q.ancho || 0) * 1.3;

    try {
      if ((env.PROVEEDOR || "openai") === "replicate") {
        // Flux schnell en Replicate: rápido y barato
        const r = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
          method: "POST",
          headers: { Authorization: "Bearer " + env.REPLICATE_API_TOKEN, "Content-Type": "application/json", Prefer: "wait" },
          body: JSON.stringify({ input: { prompt, num_outputs: cantidad, aspect_ratio: vertical ? "9:16" : (q.formato === "carrusel" ? "4:5" : "1:1"), output_format: "jpg" } }),
        });
        const j = await r.json();
        if (!r.ok || !j.output) return responder({ error: "Replicate: " + (j.detail || r.status) }, 502);
        return responder({ urls: [].concat(j.output) });
      }
      // OpenAI Images (gpt-image-1)
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt, n: cantidad, size: vertical ? "1024x1536" : "1024x1024" }),
      });
      const j = await r.json();
      if (!r.ok || !j.data) return responder({ error: "OpenAI: " + ((j.error && j.error.message) || r.status) }, 502);
      return responder({ urls: j.data.map((d) => d.url || "data:image/png;base64," + d.b64_json) });
    } catch (e) {
      return responder({ error: "Fallo del servidor de imágenes" }, 500);
    }
  },
};
