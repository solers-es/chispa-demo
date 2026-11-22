/* =====================================================================
   Chispa · BANDEJA de comentarios, mensajes y reseñas (servidor)
   ---------------------------------------------------------------------
   Lee y contesta por las APIs OFICIALES de cada red, con los tokens que
   el servidor guarda cifrados (chispa-api-worker.js → credPara):

     Instagram  comentarios  GET  /{ig}/media → /{media}/comments
                             POST /{comentario}/replies
                mensajes     GET  /{página}/conversations?platform=instagram
                             POST /{página}/messages  (ventana de 24 h)
     Facebook   comentarios  GET  /{página}/feed?fields=comments{…}
                             POST /{comentario}/comments
                mensajes     GET  /{página}/conversations?platform=messenger
                             POST /{página}/messages
     Google     reseñas      GET  mybusiness v4 …/reviews
                             PUT  …/reviews/{id}/reply
     YouTube    comentarios  GET  youtube/v3/commentThreads?allThreadsRelatedToChannelId=
                             POST youtube/v3/comments (parentId)
     TikTok     NO: la API de TikTok para cuentas normales no deja leer ni
                contestar comentarios (solo la API de empresa, con otra
                aprobación). Se dice en la bandeja y se abre la app.

   Cada elemento queda con: estado (nuevo · respondido · archivado · spam),
   etiquetas (automáticas + las que pone el negocio), respuesta sugerida
   (respuestas.js) y, si se contestó, con qué texto y cuándo.
   Probado con el simulador (pruebas/bandeja-servidor.cjs). SIN probar
   contra las redes de verdad: faltan los permisos de Meta/Google/YouTube.
   ===================================================================== */
import { etiquetar, sugerir, ETIQUETAS } from "./respuestas.js";

export const ESQUEMA_BANDEJA = [
  "CREATE TABLE IF NOT EXISTS bandeja (negocio TEXT NOT NULL, id TEXT NOT NULL, red TEXT NOT NULL, tipo TEXT NOT NULL, hilo TEXT, autor TEXT, autor_id TEXT, texto TEXT, nota INTEGER, enlace TEXT, contexto TEXT, recibido INTEGER NOT NULL, estado TEXT NOT NULL DEFAULT 'nuevo', etiquetas TEXT NOT NULL DEFAULT '[]', sugerencia TEXT, respuesta TEXT, respondido INTEGER, respondido_por TEXT, datos TEXT, auto TEXT NOT NULL DEFAULT '{}', ejemplo INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (negocio, id))",
  "CREATE INDEX IF NOT EXISTS bandeja_fecha ON bandeja (negocio, recibido)",
  "CREATE TABLE IF NOT EXISTS ajustes_j (negocio TEXT NOT NULL, clave TEXT NOT NULL, valor TEXT, PRIMARY KEY (negocio, clave))",
];
export const ESTADOS = ["nuevo", "respondido", "archivado", "spam"];
export const RED_BANDEJA = { ig: "Instagram", fb: "Facebook", gbp: "Google", yt: "YouTube", tt: "TikTok" };

/* ---------------- ajustes sencillos por negocio ---------------- */
export async function ajuste(env, negocio, clave, valor) {
  if (valor === undefined) {
    const f = await env.DB.prepare("SELECT valor FROM ajustes_j WHERE negocio = ? AND clave = ?").bind(negocio, clave).first();
    return f ? JSON.parse(f.valor) : null;
  }
  await env.DB.prepare("INSERT INTO ajustes_j (negocio, clave, valor) VALUES (?, ?, ?) ON CONFLICT (negocio, clave) DO UPDATE SET valor = excluded.valor").bind(negocio, clave, JSON.stringify(valor)).run();
  return valor;
}

/* Datos del negocio para las respuestas (lo que el panel guarda en «principal») */
export async function datosNegocio(env, negocio) {
  const f = await env.DB.prepare("SELECT datos FROM estado WHERE negocio = ? AND doc = 'principal'").bind(negocio).first();
  const n = await env.DB.prepare("SELECT nombre FROM negocios WHERE id = ?").bind(negocio).first();
  let S = {}; try { S = f ? JSON.parse(f.datos) : {}; } catch (e) {}
  const d = (S && S.negocio) || {};
  return { nombre: d.nombre || (n && n.nombre) || negocio, reservas: d.reserva || d.reservas || env.RESERVAS_URL || "", telefono: d.telefono || "", horario: d.horario || "", web: d.web || "", lat: d.lat, lng: d.lng, ciudad: d.ciudad || "" };
}

/* ---------------- guardar lo que llega ---------------- */
function fila(f) {
  return {
    id: f.id, red: f.red, tipo: f.tipo, hilo: f.hilo, autor: f.autor, texto: f.texto, nota: f.nota, enlace: f.enlace, contexto: f.contexto,
    recibido: f.recibido, estado: f.estado, etiquetas: JSON.parse(f.etiquetas || "[]"), sugerencia: f.sugerencia, respuesta: f.respuesta,
    respondido: f.respondido, respondidoPor: f.respondido_por, ejemplo: !!f.ejemplo, historial: (JSON.parse(f.datos || "{}").historial) || undefined,
  };
}
/* Inserta o actualiza. Lo que el negocio ya tocó (estado, etiquetas puestas a mano, respuesta) se respeta. */
export async function guardarEntrada(env, negocio, e, neg) {
  const viejo = await env.DB.prepare("SELECT estado, etiquetas, respuesta, texto FROM bandeja WHERE negocio = ? AND id = ?").bind(negocio, e.id).first();
  const auto = etiquetar(e);
  if (!viejo) {
    const estado = e.respondidoFuera ? "respondido" : auto.includes("spam") ? "spam" : "nuevo";
    await env.DB.prepare("INSERT INTO bandeja (negocio, id, red, tipo, hilo, autor, autor_id, texto, nota, enlace, contexto, recibido, estado, etiquetas, sugerencia, respuesta, respondido, respondido_por, datos, ejemplo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(negocio, e.id, e.red, e.tipo, e.hilo || null, e.autor || "", e.autorId || null, e.texto || "", e.nota == null ? null : e.nota, e.enlace || null, e.contexto || null, e.recibido || Date.now(), estado,
        JSON.stringify(auto), sugerir({ ...e, etiquetas: auto }, neg), e.respondidoFuera || null, e.respondidoFuera ? e.recibido : null, e.respondidoFuera ? "en la red" : null, JSON.stringify(e.datos || {}), e.ejemplo ? 1 : 0).run();
    return { nuevo: true };
  }
  if (viejo.texto !== e.texto || e.datos) { // un mensaje nuevo en la misma conversación, o la reseña cambió
    const cambioTexto = viejo.texto !== e.texto;
    const etiquetas = [...new Set([...JSON.parse(viejo.etiquetas || "[]"), ...auto])];
    await env.DB.prepare("UPDATE bandeja SET texto = ?, nota = ?, recibido = ?, datos = ?, etiquetas = ?, sugerencia = ?" + (cambioTexto && viejo.estado === "respondido" && e.tipo === "mensaje" ? ", estado = 'nuevo'" : "") + " WHERE negocio = ? AND id = ?")
      .bind(e.texto || "", e.nota == null ? null : e.nota, e.recibido || Date.now(), JSON.stringify(e.datos || {}), JSON.stringify(etiquetas), sugerir({ ...e, etiquetas }, neg), negocio, e.id).run();
    return { nuevo: false, cambiado: cambioTexto };
  }
  return { nuevo: false };
}

/* ---------------- leer de cada red ---------------- */
const textoCorto = (t, n = 80) => { const s = String(t || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

async function leerInstagram(ctx, c) {
  const out = [];
  const yo = await ctx.graph("/" + c.IG_USER_ID, { fields: "username", access_token: c.META_TOKEN }, "GET");
  const medios = await ctx.graph("/" + c.IG_USER_ID + "/media", { fields: "id,caption,permalink,timestamp,comments_count", limit: "10", access_token: c.META_TOKEN }, "GET");
  for (const m of (medios.data || []).filter((x) => x.comments_count > 0).slice(0, 6)) {
    const cs = await ctx.graph("/" + m.id + "/comments", { fields: "id,text,username,timestamp,from,replies{id,username}", limit: "50", access_token: c.META_TOKEN }, "GET");
    for (const k of cs.data || []) {
      if (k.username && yo.username && k.username === yo.username) continue;
      const contestado = ((k.replies && k.replies.data) || []).some((r) => r.username === yo.username);
      out.push({ id: "ig:c:" + k.id, red: "ig", tipo: "comentario", hilo: m.id, autor: "@" + (k.username || (k.from && k.from.username) || "usuario"), autorId: k.from && k.from.id,
        texto: k.text, enlace: m.permalink, contexto: "En tu publicación: " + textoCorto(m.caption || "sin texto"), recibido: Date.parse(k.timestamp) || Date.now(),
        respondidoFuera: contestado ? "(contestado desde Instagram)" : null, datos: { comentario: k.id, media: m.id } });
    }
  }
  return out;
}
async function leerFacebookComentarios(ctx, c) {
  const out = [];
  const feed = await ctx.graph("/" + c.FB_PAGE_ID + "/feed", { fields: "id,message,permalink_url,created_time,comments.limit(50){id,message,from,created_time,permalink_url,comments.limit(5){from}}", limit: "10", access_token: c.META_TOKEN }, "GET");
  for (const p of feed.data || []) {
    for (const k of (p.comments && p.comments.data) || []) {
      if (k.from && k.from.id === c.FB_PAGE_ID) continue;
      const contestado = ((k.comments && k.comments.data) || []).some((r) => r.from && r.from.id === c.FB_PAGE_ID);
      out.push({ id: "fb:c:" + k.id, red: "fb", tipo: "comentario", hilo: p.id, autor: (k.from && k.from.name) || "Usuario de Facebook", autorId: k.from && k.from.id,
        texto: k.message, enlace: k.permalink_url || p.permalink_url, contexto: "En tu publicación: " + textoCorto(p.message || "sin texto"), recibido: Date.parse(k.created_time) || Date.now(),
        respondidoFuera: contestado ? "(contestado desde Facebook)" : null, datos: { comentario: k.id } });
    }
  }
  return out;
}
async function leerConversaciones(ctx, c, plataforma) {
  const red = plataforma === "instagram" ? "ig" : "fb", out = [];
  const yoId = plataforma === "instagram" ? c.IG_USER_ID : c.FB_PAGE_ID;
  const cs = await ctx.graph("/" + c.FB_PAGE_ID + "/conversations", { platform: plataforma, fields: "id,updated_time,link,participants,messages.limit(6){id,message,from,created_time}", limit: "20", access_token: c.META_TOKEN }, "GET");
  for (const v of cs.data || []) {
    const msgs = ((v.messages && v.messages.data) || []).slice().reverse(); // de más viejo a más nuevo
    if (!msgs.length) continue;
    const ultimo = msgs[msgs.length - 1];
    const otro = ((v.participants && v.participants.data) || []).find((p) => p.id !== yoId && p.id !== c.FB_PAGE_ID) || ultimo.from || {};
    const deEllos = msgs.filter((m) => m.from && m.from.id !== yoId && m.from.id !== c.FB_PAGE_ID);
    if (!deEllos.length) continue;
    const ultimoSuyo = deEllos[deEllos.length - 1];
    out.push({ id: red + ":m:" + v.id, red, tipo: "mensaje", hilo: v.id, autor: otro.name || otro.username || "Cliente", autorId: otro.id,
      texto: ultimoSuyo.message, enlace: v.link ? "https://www.facebook.com" + v.link : null, contexto: "Mensaje directo", recibido: Date.parse(ultimoSuyo.created_time) || Date.now(),
      respondidoFuera: ultimo !== ultimoSuyo && ultimo.from && (ultimo.from.id === yoId || ultimo.from.id === c.FB_PAGE_ID) ? ultimo.message : null,
      datos: { destinatario: otro.id, plataforma, historial: msgs.map((m) => ({ yo: !!(m.from && (m.from.id === yoId || m.from.id === c.FB_PAGE_ID)), texto: m.message, cuando: Date.parse(m.created_time) || 0 })) } });
  }
  return out;
}
const ESTRELLAS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
async function leerResenasGoogle(ctx, c) {
  const j = await ctx.gjson("https://mybusiness.googleapis.com/v4/" + c.GBP_CUENTA + "/" + c.GBP_LOCAL + "/reviews?pageSize=50&orderBy=updateTime%20desc", c.GOOGLE_ACCESS);
  return (j.reviews || []).map((r) => ({
    id: "gbp:r:" + r.reviewId, red: "gbp", tipo: "resena", hilo: r.name, autor: (r.reviewer && r.reviewer.displayName) || "Cliente de Google",
    texto: r.comment || "", nota: ESTRELLAS[r.starRating] || null, contexto: "Reseña en tu ficha de Google", recibido: Date.parse(r.updateTime || r.createTime) || Date.now(),
    enlace: "https://business.google.com/reviews", respondidoFuera: r.reviewReply && r.reviewReply.comment ? r.reviewReply.comment : null,
    datos: { nombre: r.name || c.GBP_CUENTA + "/" + c.GBP_LOCAL + "/reviews/" + r.reviewId },
  }));
}
async function leerYouTube(ctx, c) {
  const j = await ctx.gjson("https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&maxResults=50&order=time&allThreadsRelatedToChannelId=" + encodeURIComponent(c.YT_CANAL), c.GOOGLE_ACCESS);
  const out = [];
  for (const t of j.items || []) {
    const s = (t.snippet && t.snippet.topLevelComment && t.snippet.topLevelComment.snippet) || {};
    if (s.authorChannelId && s.authorChannelId.value === c.YT_CANAL) continue;
    out.push({ id: "yt:c:" + t.id, red: "yt", tipo: "comentario", hilo: t.id, autor: s.authorDisplayName || "Usuario de YouTube", autorId: s.authorChannelId && s.authorChannelId.value,
      texto: s.textOriginal || s.textDisplay || "", enlace: s.videoId ? "https://www.youtube.com/watch?v=" + s.videoId + "&lc=" + t.id : null, contexto: "Comentario en tu vídeo",
      recibido: Date.parse(s.publishedAt) || Date.now(), datos: { hilo: t.id, video: s.videoId } });
  }
  return out;
}

/* Recoge todo lo nuevo de todas las redes conectadas. Devuelve {nuevos, porRed:{red:{n|error}}} */
export async function recoger(env, ctx, negocio) {
  const neg = await datosNegocio(env, negocio), cache = {}, porRed = {};
  let nuevos = 0;
  const tareas = [
    ["ig", "igf", (c) => (c.IG_USER_ID ? Promise.all([leerInstagram(ctx, c), leerConversaciones(ctx, c, "instagram")]).then((a) => a.flat()) : Promise.reject(new Error("La página de Facebook no tiene Instagram profesional enlazado")))],
    ["fb", "fb", (c) => Promise.all([leerFacebookComentarios(ctx, c), leerConversaciones(ctx, c, "messenger")]).then((a) => a.flat())],
    ["gbp", "gbp", (c) => leerResenasGoogle(ctx, c)],
    ["yt", "yt", (c) => leerYouTube(ctx, c)],
  ];
  for (const [red, cod, leer] of tareas) {
    let cred;
    try { cred = await ctx.credPara(env, negocio, cod, cache); } catch (e) { porRed[red] = { conectada: false, aviso: String(e.message || e) }; continue; }
    try {
      const lista = await leer(cred);
      let n = 0;
      for (const e of lista) { const r = await guardarEntrada(env, negocio, e, neg); if (r.nuevo || r.cambiado) n++; }
      porRed[red] = { conectada: true, leidos: lista.length, nuevos: n };
      nuevos += n;
    } catch (e) { porRed[red] = { conectada: true, error: String(e.message || e) }; }
  }
  porRed.tt = { conectada: null, aviso: "TikTok no deja leer ni contestar comentarios desde otras apps a las cuentas normales: se contestan en la app de TikTok." };
  await ajuste(env, negocio, "bandeja_recogida", { cuando: Date.now(), porRed });
  return { nuevos, porRed };
}

/* ---------------- contestar ---------------- */
export async function enviarRespuesta(env, ctx, negocio, item, texto) {
  const d = item.datos || {}, cache = {};
  if (item.red === "tt") throw new ctx.Fallo("TikTok no deja contestar desde otras apps: cópiala y pégala en TikTok", 409);
  if (item.red === "ig" || item.red === "fb") {
    const c = await ctx.credPara(env, negocio, item.red === "ig" ? "igf" : "fb", cache);
    if (item.tipo === "comentario") {
      const r = item.red === "ig"
        ? await ctx.graph("/" + d.comentario + "/replies", { message: texto, access_token: c.META_TOKEN })
        : await ctx.graph("/" + d.comentario + "/comments", { message: texto, access_token: c.META_TOKEN });
      return { id: r.id, via: item.red === "ig" ? "Instagram" : "Facebook" };
    }
    const r = await ctx.graph("/" + c.FB_PAGE_ID + "/messages", { recipient: JSON.stringify({ id: d.destinatario }), message: JSON.stringify({ text: texto }), messaging_type: "RESPONSE", access_token: c.META_TOKEN });
    return { id: r.message_id, via: item.red === "ig" ? "Instagram Direct" : "Messenger" };
  }
  if (item.red === "gbp") {
    const c = await ctx.credPara(env, negocio, "gbp", cache);
    await ctx.gjson("https://mybusiness.googleapis.com/v4/" + d.nombre + "/reply", c.GOOGLE_ACCESS, "PUT", { comment: texto });
    return { via: "Google" };
  }
  if (item.red === "yt") {
    const c = await ctx.credPara(env, negocio, "yt", cache);
    const r = await ctx.gjson("https://www.googleapis.com/youtube/v3/comments?part=snippet", c.GOOGLE_ACCESS, "POST", { snippet: { parentId: d.hilo, textOriginal: texto } });
    return { id: r.id, via: "YouTube" };
  }
  throw new ctx.Fallo("Red desconocida: " + item.red);
}
/* Mensaje privado a quien comentó (Instagram/Facebook «respuesta privada», una por comentario) */
export async function respuestaPrivada(env, ctx, negocio, item, texto) {
  if (item.tipo !== "comentario" || (item.red !== "ig" && item.red !== "fb")) throw new ctx.Fallo("La respuesta privada solo existe para comentarios de Instagram y Facebook");
  const c = await ctx.credPara(env, negocio, item.red === "ig" ? "igf" : "fb", {});
  const r = await ctx.graph("/" + c.FB_PAGE_ID + "/messages", { recipient: JSON.stringify({ comment_id: item.datos.comentario }), message: JSON.stringify({ text: texto }), access_token: c.META_TOKEN });
  return { id: r.message_id, via: "mensaje privado" };
}

async function leerFila(env, negocio, id) {
  const f = await env.DB.prepare("SELECT * FROM bandeja WHERE negocio = ? AND id = ?").bind(negocio, id).first();
  if (!f) return null;
  const x = fila(f); x.datos = JSON.parse(f.datos || "{}"); x.auto = JSON.parse(f.auto || "{}");
  return x;
}
export { leerFila };

export async function marcarRespondido(env, negocio, id, texto, por) {
  await env.DB.prepare("UPDATE bandeja SET estado = 'respondido', respuesta = ?, respondido = ?, respondido_por = ? WHERE negocio = ? AND id = ?").bind(texto, Date.now(), por, negocio, id).run();
}

/* ---------------- rutas ---------------- */
export async function rutasBandeja(req, env, ctx, s, m, ruta, partes, url) {
  if (partes[0] !== "bandeja") return undefined;
  const neg = s.negocio;
  if (m === "GET" && ruta === "/bandeja") {
    const q = url.searchParams, cond = ["negocio = ?"], args = [neg];
    if (q.get("estado")) { cond.push("estado = ?"); args.push(q.get("estado")); } else { cond.push("estado != 'archivado'"); cond.push("estado != 'spam'"); }
    if (q.get("red")) { cond.push("red = ?"); args.push(q.get("red")); }
    if (q.get("tipo")) { cond.push("tipo = ?"); args.push(q.get("tipo")); }
    if (q.get("etiqueta")) { cond.push("etiquetas LIKE ?"); args.push('%"' + q.get("etiqueta").replace(/[%_"]/g, "") + '"%'); }
    const { results } = await env.DB.prepare("SELECT * FROM bandeja WHERE " + cond.join(" AND ") + " ORDER BY recibido DESC LIMIT 200").bind(...args).all();
    const cuenta = await env.DB.prepare("SELECT estado, COUNT(*) AS n FROM bandeja WHERE negocio = ? GROUP BY estado").bind(neg).all();
    const porEstado = {}; (cuenta.results || []).forEach((r) => (porEstado[r.estado] = r.n));
    return { elementos: (results || []).map(fila), porEstado, recogida: await ajuste(env, neg, "bandeja_recogida"), etiquetas: ETIQUETAS };
  }
  if (m === "POST" && ruta === "/bandeja/recoger") return recoger(env, ctx, neg);
  if (m === "POST" && ruta === "/bandeja/ejemplos") return { creados: await crearEjemplos(env, neg) };
  if (m === "DELETE" && ruta === "/bandeja/ejemplos") { await env.DB.prepare("DELETE FROM bandeja WHERE negocio = ? AND ejemplo = 1").bind(neg).run(); return { ok: true }; }
  if (partes.length >= 2) {
    const id = partes[1], it = await leerFila(env, neg, id);
    if (!it) throw new ctx.Fallo("No existe ese mensaje", 404);
    if (m === "GET" && partes.length === 2) return it;
    if (m === "PATCH" && partes.length === 2) {
      const c = await ctx.leerJson(req);
      if (c.estado !== undefined) { if (!ESTADOS.includes(c.estado)) throw new ctx.Fallo("Estado no válido"); await env.DB.prepare("UPDATE bandeja SET estado = ? WHERE negocio = ? AND id = ?").bind(c.estado, neg, id).run(); }
      if (c.etiquetas !== undefined) {
        if (!Array.isArray(c.etiquetas)) throw new ctx.Fallo("etiquetas va en una lista");
        const et = [...new Set(c.etiquetas.map((x) => String(x).toLowerCase().trim().slice(0, 24)).filter(Boolean))].slice(0, 10);
        await env.DB.prepare("UPDATE bandeja SET etiquetas = ? WHERE negocio = ? AND id = ?").bind(JSON.stringify(et), neg, id).run();
      }
      return leerFila(env, neg, id);
    }
    if (m === "POST" && partes[2] === "sugerencia") {
      const c = await ctx.leerJson(req).catch(() => ({}));
      return { sugerencia: sugerir(it, await datosNegocio(env, neg), Number(c.variante) || 0) };
    }
    if (m === "POST" && partes[2] === "responder") {
      const c = await ctx.leerJson(req);
      const texto = String(c.texto || "").trim();
      if (!texto) throw new ctx.Fallo("La respuesta está vacía");
      if (texto.length > 2000) throw new ctx.Fallo("La respuesta es demasiado larga (máximo 2.000 caracteres)");
      if (it.ejemplo) { await marcarRespondido(env, neg, id, texto, "ejemplo (no se envía)"); return { ok: true, ejemplo: true, elemento: await leerFila(env, neg, id) }; }
      const r = c.privado ? await respuestaPrivada(env, ctx, neg, it, texto) : await enviarRespuesta(env, ctx, neg, it, texto);
      await marcarRespondido(env, neg, id, texto, r.via + (s.rol === "api" ? " · API" : ""));
      return { ok: true, via: r.via, elemento: await leerFila(env, neg, id) };
    }
  }
  throw new ctx.Fallo("No existe", 404);
}

/* ---------------- ejemplos (marcados ejemplo=1; no se envían a ninguna red) ---------------- */
export async function crearEjemplos(env, negocio) {
  const neg = await datosNegocio(env, negocio), h = Date.now();
  const lista = [
    { id: "ej:1", red: "ig", tipo: "comentario", autor: "@marta.palma", texto: "¿Abrís los domingos a mediodía?", contexto: "En tu publicación: Paella de los domingos 🥘", recibido: h - 20 * 60e3 },
    { id: "ej:2", red: "ig", tipo: "mensaje", autor: "Toni Ferrer", texto: "Hola! Quiero reservar para 8 personas el viernes a las 21h", contexto: "Mensaje directo", recibido: h - 55 * 60e3 },
    { id: "ej:3", red: "fb", tipo: "comentario", autor: "Carmen López", texto: "La paella estaba buenísima 😍", contexto: "En tu publicación: Menú del día", recibido: h - 3 * 36e5 },
    { id: "ej:4", red: "gbp", tipo: "resena", autor: "Peter Schmidt", nota: 5, texto: "Sehr leckeres Essen und super freundlich. Wir kommen wieder!", contexto: "Reseña en tu ficha de Google", recibido: h - 5 * 36e5 },
    { id: "ej:5", red: "gbp", tipo: "resena", autor: "Laura M.", nota: 2, texto: "Tardaron 40 minutos en traer los segundos y la carne llegó fría.", contexto: "Reseña en tu ficha de Google", recibido: h - 26 * 36e5 },
    { id: "ej:6", red: "yt", tipo: "comentario", autor: "Sergi", texto: "¿Cuánto cuesta el menú del día?", contexto: "Comentario en tu vídeo", recibido: h - 30 * 36e5 },
    { id: "ej:7", red: "ig", tipo: "comentario", autor: "@promo_followers_24", texto: "Free followers 👉 check my profile!!", contexto: "En tu publicación: Brunch del sábado", recibido: h - 32 * 36e5 },
    { id: "ej:8", red: "ig", tipo: "comentario", autor: "@joana.mallorca", texto: "CARTA", contexto: "En tu publicación: «Comenta CARTA y te la mandamos»", recibido: h - 10 * 60e3 },
  ];
  for (const e of lista) await guardarEntrada(env, negocio, { ...e, ejemplo: true, datos: { ejemplo: true, comentario: e.id } }, neg);
  return lista.length;
}
