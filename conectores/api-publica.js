/* =====================================================================
   Chispa · API PÚBLICA (/v1/…) y servidor MCP (/mcp)
   ---------------------------------------------------------------------
   Para usar Chispa desde n8n, Make, Zapier, un script… o desde Claude.
   Cada negocio crea sus CLAVES DE API en Conexiones (solo el dueño). La
   clave se enseña UNA vez; en la base solo queda su huella (HMAC).
     Authorization: Bearer chispa_XXXXXXXX…
   Documentación con ejemplos (curl, n8n, Make, Claude): docs/API-CHISPA.md

   Rutas:
     GET    /v1/yo                         negocio y redes conectadas
     GET    /v1/cuentas                    redes conectadas (sin tokens)
     POST   /v1/publicaciones              crear (borrador, programada o publicar ya)
     POST   /v1/programar                  igual, con «cuando» obligatorio
     GET    /v1/publicaciones[?estado=]    listar
     GET    /v1/publicaciones/:id          estado de una
     POST   /v1/publicaciones/:id/publicar publicar ahora
     DELETE /v1/publicaciones/:id          cancelar (si no está publicada)
     POST   /v1/imagen                     imagen con IA (URL pública)
     POST   /v1/voz                        voz + subtítulos (audio en base64)
     POST   /v1/texto                      escribir una publicación desde una idea
     POST   /v1/reaprovechar               texto largo → varias piezas
     POST   /v1/traducir                   texto → varios idiomas
     GET    /v1/uso                        lo gastado hoy del cupo de IA
     POST   /mcp                           Model Context Protocol (HTTP «streamable», sin estado)
   ===================================================================== */
import * as IA from "./ia.js";

export const ALIAS_RED = {
  igf: "igf", igs: "igs", fb: "fb", tt: "tt", yt: "yt", gbp: "gbp",
  instagram: "igf", instagram_feed: "igf", instagram_stories: "igs", stories: "igs", historias: "igs",
  facebook: "fb", tiktok: "tt", youtube: "yt", youtube_shorts: "yt", shorts: "yt", google: "gbp", google_business: "gbp", ficha: "gbp",
};
const FORMATOS = ["post", "carrusel", "historia", "reel"];
const ESTADOS = ["borrador", "programada", "publicada", "fallo", "cancelada"];

export function crearApiPublica(ctx) {
  const { Fallo, leerJson, guardarItem, listarAgenda, leerItem, publicarItem, listarConexiones } = ctx;

  function redesDe(lista) {
    if (lista == null) return [];
    const arr = Array.isArray(lista) ? lista : String(lista).split(",");
    const out = [];
    for (const r of arr) {
      const c = ALIAS_RED[String(r).trim().toLowerCase()];
      if (!c) throw new Fallo("Red desconocida: «" + r + "». Valen: instagram, instagram_stories, facebook, tiktok, youtube, google (o igf, igs, fb, tt, yt, gbp)");
      if (!out.includes(c)) out.push(c);
    }
    return out;
  }
  function fechaDe(c) {
    if (c == null || c === "") return null;
    const t = new Date(c);
    if (isNaN(t)) throw new Fallo("«cuando» no es una fecha válida. Usa ISO 8601, p. ej. 2026-10-12T19:30:00+02:00");
    return t.toISOString();
  }
  const publico = (it) => ({ id: it.id, estado: it.estado, cuando: it.cuando || null, redes: it.redes || [], formato: it.formato || "post", titulo: it.titulo || "", texto: it.texto || "", medios: it.medios || [], idioma: it.idioma || null, resultado: it.res || {}, motivo: it.motivo || null, publicadaEn: it.publicadaEn || null, creada: it.creada || null, origen: it.origen || null });
  const idNuevo = () => "api-" + Date.now().toString(36) + "-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("");

  /* ---------- crear publicación(es) ---------- */
  async function crear(env, req, s, q, { exigirFecha = false } = {}) {
    const redes = redesDe(q.redes);
    const cuando = fechaDe(q.cuando || q.fecha);
    if (exigirFecha && !cuando) throw new Fallo("Falta «cuando» (fecha y hora de publicación, ISO 8601)");
    const formato = FORMATOS.includes(q.formato) ? q.formato : "post";
    const lc = String(q.idioma || "es").toLowerCase().slice(0, 2);
    const avisos = [];
    let texto = String(q.texto || "").trim(), titulo = String(q.titulo || "").slice(0, 120);
    // Sin texto pero con idea: lo escribe la IA, en el idioma pedido
    if (!texto && q.idea) {
      const e = await IA.escribir(env, s.negocio, { idea: q.idea, idioma: lc, negocio: s.nombre, sector: q.sector, formato });
      texto = e.texto + (e.hashtags.length ? "\n\n" + e.hashtags.join(" ") : ""); if (!titulo) titulo = e.titulo;
      if (e.aviso) avisos.push(e.aviso);
    }
    if (!texto) throw new Fallo("Falta «texto» (o «idea» para que lo escriba la IA)");
    if (texto.length > 6000) throw new Fallo("El texto es demasiado largo (máximo 6.000 letras)");
    let medios = Array.isArray(q.medios) ? q.medios.map(String).filter((u) => /^https:\/\//.test(u)).slice(0, 10) : [];
    if (q.imagen_ia) {
      const img = await IA.generarImagen(env, s.negocio, { prompt: typeof q.imagen_ia === "string" ? q.imagen_ia : null, texto, titulo, sector: q.sector }, ctx.urlBase(env, req));
      medios = medios.concat(img.urls);
    }
    // Varios idiomas: una sola publicación con todos («juntos», por defecto) o una por idioma («separadas»)
    const otros = (Array.isArray(q.idiomas) ? q.idiomas : []).map((c) => String(c).toLowerCase().slice(0, 2)).filter((c) => c && c !== lc);
    let versiones = [{ idioma: lc, texto }];
    if (otros.length) {
      const t = await IA.traducir(env, s.negocio, { textos: [texto], idiomas: otros, origen: lc });
      if (t.aviso) avisos.push(t.aviso);
      const trad = {}; for (const c of otros) trad[c] = t.traducciones[c][0];
      if (q.multilingue === "separadas") versiones = versiones.concat(otros.map((c) => ({ idioma: c, texto: trad[c] })));
      else versiones = [{ idioma: [lc].concat(otros).join("+"), texto: IA.juntarIdiomas(texto, lc, trad) }];
    }
    const estado = cuando ? "programada" : "borrador";
    if ((estado === "programada" || q.publicar_ya) && !redes.length) throw new Fallo("Falta «redes» (dónde publicar)");
    const creadas = [];
    for (const v of versiones) {
      if (ctx.comprobarPlan) await ctx.comprobarPlan(req, env, s); // 402/429 si el plan no da para más
      const it = { id: idNuevo(), cuando: cuando || new Date().toISOString(), redes, texto: v.texto, titulo, medios, formato, idioma: v.idioma, estado, res: {}, origen: s.api ? "api" : "chispa", creada: new Date().toISOString() };
      if (!cuando) it.sinFecha = true;
      if (q.publicar_ya) await publicarItem(env, s.negocio, it, {});
      else await guardarItem(env, s.negocio, it);
      creadas.push(publico(it));
    }
    return { publicaciones: creadas, avisos };
  }

  /* ---------- /v1 ---------- */
  async function v1(req, env, s, ruta, partes, url) {
    const m = req.method;
    if (m === "GET" && ruta === "/v1/yo") return { negocio: s.negocio, nombre: s.nombre, via: s.api ? "clave de API" : "sesión", redes: (await listarConexiones(env, s.negocio)).filter((c) => c.estado === "conectada").flatMap((c) => c.publica) };
    if (m === "GET" && ruta === "/v1/cuentas") return { cuentas: (await listarConexiones(env, s.negocio)).map((c) => ({ red: c.red, nombre: c.nombre, cuenta: c.cuenta, estado: c.estado, publica: c.publica })) };
    if (m === "GET" && ruta === "/v1/uso") return IA.usoHoy(env, s.negocio);
    if (m === "POST" && ruta === "/v1/publicaciones") return crear(env, req, s, await leerJson(req));
    if (m === "POST" && ruta === "/v1/programar") return crear(env, req, s, await leerJson(req), { exigirFecha: true });
    if (m === "GET" && ruta === "/v1/publicaciones") {
      const e = url.searchParams.get("estado"); const lim = Math.min(200, parseInt(url.searchParams.get("limite")) || 50);
      if (e && !ESTADOS.includes(e)) throw new Fallo("estado: " + ESTADOS.join(" | "));
      const todas = (await listarAgenda(env, s.negocio)).filter((it) => !e || it.estado === e);
      return { publicaciones: todas.slice(-lim).map(publico), total: todas.length };
    }
    if (partes[1] === "publicaciones" && partes.length >= 3) {
      const it = await leerItem(env, s.negocio, partes[2]);
      if (!it) throw new Fallo("No existe esa publicación", 404);
      if (m === "GET" && partes.length === 3) return { publicacion: publico(it) };
      if (m === "DELETE" && partes.length === 3) {
        if (it.estado === "publicada") throw new Fallo("Ya está publicada: hay que borrarla en la red", 409);
        it.estado = "cancelada"; await guardarItem(env, s.negocio, it); return { publicacion: publico(it) };
      }
      if (m === "POST" && partes[3] === "publicar") {
        if (!(it.redes || []).length) throw new Fallo("La publicación no tiene redes");
        await publicarItem(env, s.negocio, it, {}); return { publicacion: publico(it) };
      }
    }
    if (m === "POST" && ruta === "/v1/imagen") { const q = await leerJson(req); return IA.generarImagen(env, s.negocio, q, ctx.urlBase(env, req)); }
    if (m === "POST" && ruta === "/v1/voz") return { __crudo: await IA.generarVoz(env, s.negocio, await leerJson(req)) };
    if (m === "POST" && ruta === "/v1/texto") return IA.escribir(env, s.negocio, { ...(await leerJson(req)), negocio: s.nombre });
    if (m === "POST" && ruta === "/v1/reaprovechar") return IA.reaprovechar(env, s.negocio, { ...(await leerJson(req)), negocio: s.nombre });
    if (m === "POST" && ruta === "/v1/traducir") return IA.traducir(env, s.negocio, await leerJson(req));
    throw new Fallo("No existe", 404);
  }

  /* ---------- MCP ---------- */
  const PROP_REDES = { type: "array", items: { type: "string", enum: ["instagram", "instagram_stories", "facebook", "tiktok", "youtube", "google"] }, description: "Dónde publicar" };
  const PROP_PUB = {
    texto: { type: "string", description: "Texto de la publicación (si no se da, usa «idea» y la IA lo escribe)" },
    idea: { type: "string", description: "Idea en una frase para que la IA escriba el texto" },
    redes: PROP_REDES,
    medios: { type: "array", items: { type: "string" }, description: "URLs https públicas de fotos o vídeos" },
    imagen_ia: { type: ["boolean", "string"], description: "true = crear una imagen con IA acorde al texto; o un prompt en inglés" },
    formato: { type: "string", enum: FORMATOS },
    titulo: { type: "string", description: "Titular corto" },
    idioma: { type: "string", description: "Código ISO del idioma del texto (es, en, de, fr…)" },
    idiomas: { type: "array", items: { type: "string" }, description: "Otros idiomas a los que traducir (p. ej. [\"en\",\"de\"])" },
    multilingue: { type: "string", enum: ["juntos", "separadas"], description: "juntos = un texto con todos los idiomas; separadas = una publicación por idioma" },
  };
  const HERRAMIENTAS = [
    { name: "crear_publicacion", description: "Crea una publicación de Chispa. Sin «cuando» queda como borrador; con publicar_ya=true se publica en el momento en las redes conectadas.", inputSchema: { type: "object", properties: { ...PROP_PUB, cuando: { type: "string", description: "Fecha ISO 8601 para programarla (opcional)" }, publicar_ya: { type: "boolean" } } } },
    { name: "programar", description: "Programa una publicación para una fecha y hora. El servidor de Chispa la publica sola (revisa cada 5 minutos).", inputSchema: { type: "object", required: ["cuando", "redes"], properties: { ...PROP_PUB, cuando: { type: "string", description: "Fecha y hora ISO 8601, p. ej. 2026-10-12T19:30:00+02:00" } } } },
    { name: "listar_programadas", description: "Lista las publicaciones del negocio (por defecto, las programadas que faltan por salir).", inputSchema: { type: "object", properties: { estado: { type: "string", enum: ESTADOS }, limite: { type: "number" } } } },
    { name: "estado_publicacion", description: "Dice en qué estado está una publicación y el resultado en cada red.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "cancelar_publicacion", description: "Cancela una publicación programada o un borrador.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
    { name: "crear_imagen", description: "Genera una imagen con IA (FLUX.1 schnell en Cloudflare, gratis dentro del cupo diario) y devuelve su URL pública.", inputSchema: { type: "object", properties: { prompt: { type: "string", description: "Descripción en inglés (opcional)" }, texto: { type: "string", description: "O el texto de la publicación: Chispa hace el prompt" }, sector: { type: "string" } } } },
    { name: "reaprovechar_texto", description: "Convierte un texto largo (artículo, guion, transcripción) en varias piezas: posts, hilo, carrusel, guion de reel, historias, newsletter. En el idioma que se pida.", inputSchema: { type: "object", required: ["texto"], properties: { texto: { type: "string" }, idioma: { type: "string" }, piezas: { type: "array", items: { type: "string", enum: Object.keys(IA.PIEZAS) } } } } },
    { name: "traducir", description: "Traduce uno o varios textos de redes a varios idiomas, manteniendo emojis y hashtags.", inputSchema: { type: "object", required: ["idiomas"], properties: { texto: { type: "string" }, textos: { type: "array", items: { type: "string" } }, idiomas: { type: "array", items: { type: "string" } }, origen: { type: "string" } } } },
    { name: "cuentas_conectadas", description: "Qué redes tiene conectadas el negocio en Chispa.", inputSchema: { type: "object", properties: {} } },
  ];
  async function llamarHerramienta(env, req, s, nombre, a) {
    a = a || {};
    switch (nombre) {
      case "crear_publicacion": return crear(env, req, s, a);
      case "programar": return crear(env, req, s, a, { exigirFecha: true });
      case "listar_programadas": {
        const e = a.estado || "programada";
        const l = (await listarAgenda(env, s.negocio)).filter((it) => it.estado === e);
        return { publicaciones: l.slice(-(Math.min(100, a.limite || 30))).map(publico), total: l.length };
      }
      case "estado_publicacion": { const it = await leerItem(env, s.negocio, String(a.id || "")); if (!it) throw new Fallo("No existe esa publicación", 404); return { publicacion: publico(it) }; }
      case "cancelar_publicacion": {
        const it = await leerItem(env, s.negocio, String(a.id || "")); if (!it) throw new Fallo("No existe esa publicación", 404);
        if (it.estado === "publicada") throw new Fallo("Ya está publicada", 409);
        it.estado = "cancelada"; await guardarItem(env, s.negocio, it); return { publicacion: publico(it) };
      }
      case "crear_imagen": return IA.generarImagen(env, s.negocio, a, ctx.urlBase(env, req));
      case "reaprovechar_texto": return IA.reaprovechar(env, s.negocio, { ...a, negocio: s.nombre });
      case "traducir": return IA.traducir(env, s.negocio, a);
      case "cuentas_conectadas": return { cuentas: (await listarConexiones(env, s.negocio)).map((c) => ({ red: c.red, cuenta: c.cuenta, estado: c.estado })) };
      default: throw new Fallo("Herramienta desconocida: " + nombre, 404);
    }
  }
  async function mcpUno(env, req, s, msg) {
    const id = msg && msg.id, metodo = msg && msg.method;
    const res = (result) => ({ jsonrpc: "2.0", id, result });
    const err = (code, message) => ({ jsonrpc: "2.0", id: id === undefined ? null : id, error: { code, message } });
    if (!msg || msg.jsonrpc !== "2.0" || typeof metodo !== "string") return err(-32600, "Petición JSON-RPC no válida");
    if (id === undefined || id === null) return null; // notificación (p. ej. notifications/initialized): no se contesta
    if (metodo === "initialize") {
      const pv = msg.params && msg.params.protocolVersion;
      return res({ protocolVersion: ["2025-06-18", "2025-03-26", "2024-11-05"].includes(pv) ? pv : "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "chispa", title: "Chispa · redes sociales", version: "1.0.0" }, instructions: "Chispa publica y programa en Instagram, Facebook, TikTok, YouTube y Google para el negocio " + s.nombre + ". Los textos se pueden pedir en cualquier idioma (parámetro idioma) y traducir (idiomas)." });
    }
    if (metodo === "ping") return res({});
    if (metodo === "tools/list") return res({ tools: HERRAMIENTAS });
    if (metodo === "tools/call") {
      const p = msg.params || {};
      try {
        const r = await llamarHerramienta(env, req, s, p.name, p.arguments);
        return res({ content: [{ type: "text", text: JSON.stringify(r, null, 2) }], structuredContent: r, isError: false });
      } catch (e) {
        if (e instanceof Fallo && e.status === 404 && /Herramienta/.test(e.message)) return err(-32602, e.message);
        return res({ content: [{ type: "text", text: "Error: " + (e.message || e) }], isError: true });
      }
    }
    if (metodo === "resources/list") return res({ resources: [] });
    if (metodo === "prompts/list") return res({ prompts: [] });
    return err(-32601, "Método no soportado: " + metodo);
  }
  async function mcp(req, env, s) {
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Usa POST (MCP HTTP sin estado)" }), { status: 405, headers: { Allow: "POST", "Content-Type": "application/json" } });
    let cuerpo; try { cuerpo = await req.json(); } catch (e) { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON no válido" } }, { status: 400 }); }
    const lista = Array.isArray(cuerpo) ? cuerpo : [cuerpo];
    const salidas = [];
    for (const m of lista) { const r = await mcpUno(env, req, s, m); if (r) salidas.push(r); }
    if (!salidas.length) return new Response(null, { status: 202 });
    return new Response(JSON.stringify(Array.isArray(cuerpo) ? salidas : salidas[0]), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  }

  return { v1, mcp, HERRAMIENTAS };
}
