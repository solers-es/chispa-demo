/* =====================================================================
   Chispa · AUTOMATIZACIONES que ejecuta el servidor (cron cada 5 min)
   ---------------------------------------------------------------------
   Reglas por negocio (tabla reglas). Funcionan con la app CERRADA.
     palabra_dm      comentario con la palabra (p. ej. CARTA) en Instagram
                     o Facebook → mensaje privado con el enlace (respuesta
                     privada oficial de Meta) y, si se quiere, respuesta
                     pública corta («¡Te lo mandamos por privado!»).
     resena          reseña nueva → respuesta sugerida siempre; si el modo
                     es «automática» y la nota llega al mínimo (4★ por
                     defecto), se publica sola. Las de 1-3★ NUNCA se
                     contestan solas: aviso al dueño.
     recordatorio    los días y la hora elegidos, si no hay nada
                     programado en las próximas horas → aviso.
     resumen_semanal el día y la hora elegidos → resumen de la semana
                     (estadísticas, bandeja, reseñas, anuncios) por
                     CORREO si hay proveedor (RESEND_API_KEY) y correo;
                     si no, como aviso dentro de la app.
   Además: aviso cuando a la prueba gratis le quedan 3 días o menos.
   Todo lo que hacen queda en el registro (auto_registro) y los avisos en
   la tabla avisos (GET /avisos). Horas en hora de Madrid.
   ===================================================================== */
import { normalizar } from "./respuestas.js";
import { ajuste, datosNegocio, leerFila, marcarRespondido, enviarRespuesta, respuestaPrivada } from "./bandeja.js";
import { leerMetricas } from "./metricas.js";
import { resumen } from "./consejos.js";
import { listarAnuncios } from "./anuncios.js";

export const ESQUEMA_AUTOS = [
  "CREATE TABLE IF NOT EXISTS reglas (negocio TEXT NOT NULL, id TEXT NOT NULL, tipo TEXT NOT NULL, activa INTEGER NOT NULL DEFAULT 1, config TEXT NOT NULL, ultima INTEGER, veces INTEGER NOT NULL DEFAULT 0, creado INTEGER NOT NULL, PRIMARY KEY (negocio, id))",
  "CREATE TABLE IF NOT EXISTS avisos (negocio TEXT NOT NULL, id TEXT NOT NULL, tipo TEXT NOT NULL, titulo TEXT NOT NULL, texto TEXT, enlace TEXT, creado INTEGER NOT NULL, leido INTEGER, PRIMARY KEY (negocio, id))",
  "CREATE TABLE IF NOT EXISTS auto_registro (negocio TEXT NOT NULL, cuando INTEGER NOT NULL, regla TEXT, resultado TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS auto_registro_neg ON auto_registro (negocio, cuando)",
];

export const TIPOS = {
  palabra_dm: { nm: "Palabra clave en un comentario → mensaje privado con enlace", plan: "respuestas",
    def: { palabra: "CARTA", redes: ["ig", "fb"], mensaje: "¡Hola! 👋 Aquí la tienes: {enlace}\n¿Te reservamos mesa?", enlace: "", publica: "¡Te la mandamos por privado! 📩" } },
  resena: { nm: "Reseña nueva → respuesta sugerida o automática según la nota", plan: "respuestas",
    def: { modo: "sugerir", minimo: 4 } },
  recordatorio: { nm: "Recordatorio de publicar", plan: null,
    def: { dias: [1, 2, 3, 4, 5, 6, 0], hora: "10:00", horas: 24 } },
  resumen_semanal: { nm: "Resumen semanal", plan: null,
    def: { dia: 1, hora: "09:00", correo: "" } },
};
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/* Hora de Madrid: {dia(0-6), hm:"HH:MM", fecha:"AAAA-MM-DD"} */
export function horaMadrid(t = Date.now()) {
  const p = {};
  for (const x of new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(t))) p[x.type] = x.value;
  const dias = { dom: 0, lun: 1, mar: 2, mié: 3, mie: 3, jue: 4, vie: 5, sáb: 6, sab: 6 };
  const wd = String(p.weekday || "").toLowerCase().replace(".", "");
  return { dia: dias[wd] != null ? dias[wd] : new Date(t).getUTCDay(), hm: (p.hour === "24" ? "00" : p.hour) + ":" + p.minute, fecha: p.year + "-" + p.month + "-" + p.day };
}
/* ¿Toca ya hoy y aún no se hizo hoy? (el cron va cada 5 min: vale cualquier pasada desde la hora) */
function toca(hm, ahoraM, ultima) {
  if (ahoraM.hm < hm) return false;
  return !ultima || horaMadrid(ultima).fecha !== ahoraM.fecha;
}

export async function aviso(env, negocio, tipo, titulo, texto, enlace, idFijo) {
  const id = idFijo || "av" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await env.DB.prepare("INSERT INTO avisos (negocio, id, tipo, titulo, texto, enlace, creado) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (negocio, id) DO NOTHING").bind(negocio, id, tipo, titulo, texto || "", enlace || null, Date.now()).run();
  return id;
}
async function registrar(env, negocio, regla, resultado) {
  await env.DB.prepare("INSERT INTO auto_registro (negocio, cuando, regla, resultado) VALUES (?, ?, ?, ?)").bind(negocio, Date.now(), regla, String(resultado).slice(0, 500)).run();
}
async function marcarRegla(env, negocio, id, hizo) {
  await env.DB.prepare("UPDATE reglas SET ultima = ?, veces = veces + ? WHERE negocio = ? AND id = ?").bind(Date.now(), hizo ? 1 : 0, negocio, id).run();
}
async function marcarItem(env, negocio, itemId, reglaId) {
  const f = await env.DB.prepare("SELECT auto FROM bandeja WHERE negocio = ? AND id = ?").bind(negocio, itemId).first();
  const a = JSON.parse((f && f.auto) || "{}"); a[reglaId] = Date.now();
  await env.DB.prepare("UPDATE bandeja SET auto = ? WHERE negocio = ? AND id = ?").bind(JSON.stringify(a), negocio, itemId).run();
}

export function contienePalabra(texto, palabra) {
  const p = normalizar(palabra).trim(); if (!p) return false;
  const t = " " + normalizar(texto).replace(/[^a-z0-9ñ]+/g, " ") + " ";
  return t.includes(" " + p.replace(/[^a-z0-9ñ]+/g, " ").trim() + " ");
}

/* ---------------- cada tipo de regla ---------------- */
async function palabraDm(env, ctx, negocio, r, cfg, neg) {
  const { results } = await env.DB.prepare("SELECT id FROM bandeja WHERE negocio = ? AND tipo = 'comentario' AND estado = 'nuevo' AND recibido > ? ORDER BY recibido LIMIT 20").bind(negocio, r.creado - 36e5).all();
  let n = 0;
  for (const { id } of results || []) {
    const it = await leerFila(env, negocio, id);
    if (!it || it.auto[r.id] || !(cfg.redes || []).includes(it.red) || !contienePalabra(it.texto, cfg.palabra)) continue;
    await marcarItem(env, negocio, id, r.id); // se marca ANTES: si algo falla, no se manda dos veces
    const texto = String(cfg.mensaje || TIPOS.palabra_dm.def.mensaje).replace(/\{enlace\}/g, cfg.enlace || neg.web || neg.reservas || "").replace(/\{nombre\}/g, String(it.autor || "").replace(/^@/, ""));
    try {
      if (it.ejemplo) { await marcarRespondido(env, negocio, id, texto, "automática (ejemplo, no se envía)"); n++; await registrar(env, negocio, r.id, "Ejemplo: mensaje privado preparado para " + it.autor); continue; }
      await respuestaPrivada(env, ctx, negocio, it, texto);
      if (cfg.publica) { try { await enviarRespuesta(env, ctx, negocio, it, cfg.publica); } catch (e) {} }
      await marcarRespondido(env, negocio, id, texto, "automática · mensaje privado");
      await registrar(env, negocio, r.id, "Mensaje privado enviado a " + it.autor + " («" + cfg.palabra + "»)");
      n++;
    } catch (e) { await registrar(env, negocio, r.id, "No se pudo mandar el mensaje a " + it.autor + ": " + (e.message || e)); }
  }
  return n;
}
async function resena(env, ctx, negocio, r, cfg) {
  const { results } = await env.DB.prepare("SELECT id FROM bandeja WHERE negocio = ? AND tipo = 'resena' AND estado = 'nuevo' ORDER BY recibido LIMIT 20").bind(negocio).all();
  let n = 0;
  for (const { id } of results || []) {
    const it = await leerFila(env, negocio, id);
    if (!it || it.auto[r.id]) continue;
    await marcarItem(env, negocio, id, r.id);
    const nota = it.nota || 0;
    if (nota && nota <= 3) {
      await aviso(env, negocio, "resena-negativa", "Reseña de " + nota + "★ de " + it.autor, "«" + String(it.texto || "").slice(0, 160) + "». Chispa no la contesta sola: tienes la respuesta propuesta en «Comentarios y DMs».", "#bandeja");
      await registrar(env, negocio, r.id, "Aviso: reseña de " + nota + "★ de " + it.autor + " (no se contesta sola)"); n++; continue;
    }
    if (cfg.modo === "automatica" && nota >= (Number(cfg.minimo) || 4) && it.sugerencia) {
      try {
        if (it.ejemplo) await marcarRespondido(env, negocio, id, it.sugerencia, "automática (ejemplo, no se envía)");
        else { await enviarRespuesta(env, ctx, negocio, it, it.sugerencia); await marcarRespondido(env, negocio, id, it.sugerencia, "automática · Google"); }
        await registrar(env, negocio, r.id, "Contestada sola la reseña de " + nota + "★ de " + it.autor); n++;
      } catch (e) { await registrar(env, negocio, r.id, "No se pudo contestar la reseña de " + it.autor + ": " + (e.message || e)); }
    } else { await registrar(env, negocio, r.id, "Respuesta propuesta lista para la reseña de " + (nota || "?") + "★ de " + it.autor); n++; }
  }
  return n;
}
async function recordatorio(env, negocio, r, cfg, ahoraM) {
  if (!(cfg.dias || []).includes(ahoraM.dia) || !toca(cfg.hora || "10:00", ahoraM, r.ultima)) return null;
  const hasta = Date.now() + (Number(cfg.horas) || 24) * 36e5;
  const prog = await env.DB.prepare("SELECT COUNT(*) AS n FROM agenda WHERE negocio = ? AND estado = 'programada' AND cuando >= ? AND cuando <= ?").bind(negocio, Date.now(), hasta).first();
  // lo programado en el calendario del panel (documento «principal», S.agenda) también cuenta
  let enPanel = 0;
  try {
    const f = await env.DB.prepare("SELECT datos FROM estado WHERE negocio = ? AND doc = 'principal'").bind(negocio).first();
    const S = f ? JSON.parse(f.datos) : {};
    enPanel = (S.agenda || []).filter((a) => a && a.estado !== "publicada" && !a.ejemplo && Date.parse(a.cuando) >= Date.now() && Date.parse(a.cuando) <= hasta).length;
  } catch (e) {}
  if ((prog && prog.n) || enPanel) { await registrar(env, negocio, r.id, "Recordatorio: ya hay " + (((prog && prog.n) || 0) + enPanel) + " publicaciones programadas, no hace falta avisar"); return 0; }
  await aviso(env, negocio, "recordatorio", "Hoy no tienes nada programado", "En las próximas " + (Number(cfg.horas) || 24) + " horas no sale ninguna publicación. Abre el Asistente: con una frase Chispa te la deja lista.", "#panel");
  await registrar(env, negocio, r.id, "Aviso de recordatorio: nada programado");
  return 1;
}
export async function textoResumen(env, negocio) {
  const neg = await datosNegocio(env, negocio);
  const filas = await leerMetricas(env, negocio, 14), R = filas.length ? resumen(filas) : null;
  const semana = Date.now() - 7 * 864e5;
  const b = await env.DB.prepare("SELECT tipo, estado, COUNT(*) AS n FROM bandeja WHERE negocio = ? AND recibido >= ? AND ejemplo = 0 GROUP BY tipo, estado").bind(negocio, semana).all();
  const cuenta = (tipo, estado) => (b.results || []).filter((x) => (!tipo || x.tipo === tipo) && (!estado || x.estado === estado)).reduce((a, x) => a + x.n, 0);
  const notas = await env.DB.prepare("SELECT AVG(nota) AS media, COUNT(*) AS n FROM bandeja WHERE negocio = ? AND tipo = 'resena' AND recibido >= ? AND ejemplo = 0").bind(negocio, semana).first();
  const pubs = await env.DB.prepare("SELECT COUNT(*) AS n FROM agenda WHERE negocio = ? AND estado = 'publicada' AND cuando >= ?").bind(negocio, semana).first();
  const an = (await listarAnuncios(env, negocio)).filter((a) => !a.ejemplo && a.resultados);
  const L = ["Resumen de la semana de " + neg.nombre, ""];
  L.push("Publicaciones hechas por Chispa: " + ((pubs && pubs.n) || 0));
  if (R && R.totales) {
    const t = R.totales, f = (k) => (t[k] ? Math.round(t[k].ahora).toLocaleString("es-ES") + " (" + (t[k].cambio >= 0 ? "+" : "") + t[k].cambio + " %)" : null);
    for (const [k, nm] of [["alcance", "Alcance"], ["vistas", "Visualizaciones"], ["interacciones", "Interacciones"], ["como_llegar", "«Cómo llegar» en Google"], ["llamadas", "Llamadas desde Google"]]) if (f(k)) L.push(nm + ": " + f(k));
    if (t.seguidores) L.push("Seguidores: " + Math.round(t.seguidores.ahora).toLocaleString("es-ES") + " (" + (t.seguidores.dif >= 0 ? "+" : "") + t.seguidores.dif + ")");
  } else L.push("Estadísticas: aún sin redes conectadas.");
  L.push("Comentarios y mensajes recibidos: " + (cuenta("comentario") + cuenta("mensaje")) + " · sin responder: " + (cuenta("comentario", "nuevo") + cuenta("mensaje", "nuevo")));
  if (notas && notas.n) L.push("Reseñas nuevas: " + notas.n + " · nota media " + Number(notas.media).toFixed(1).replace(".", ",") + " ★");
  for (const a of an) L.push("Anuncio «" + a.datos.nombre + "»: " + a.resultados.clics + " clics, " + a.resultados.gastado.toFixed(2).replace(".", ",") + " € gastados");
  if (R && R.consejos && R.consejos.length) { L.push("", "Consejo de Chispa: " + R.consejos[0].titulo + ". " + R.consejos[0].texto); }
  return L.join("\n");
}
async function enviarCorreo(env, ctx, para, asunto, texto) {
  if (!env.RESEND_API_KEY || !env.CORREO_REMITENTE) return false;
  const r = await ctx.http("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.CORREO_REMITENTE, to: [para], subject: asunto, text: texto }) });
  if (!r.ok) throw new Error("El proveedor de correo respondió " + r.status);
  return true;
}
async function resumenSemanal(env, ctx, negocio, r, cfg, ahoraM, forzar) {
  if (!forzar && (Number(cfg.dia) !== ahoraM.dia || !toca(cfg.hora || "09:00", ahoraM, r.ultima))) return null;
  const texto = await textoResumen(env, negocio);
  let porCorreo = false;
  if (cfg.correo && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cfg.correo)) { try { porCorreo = await enviarCorreo(env, ctx, cfg.correo, "Chispa · tu semana", texto); } catch (e) { await registrar(env, negocio, r.id, "Correo no enviado: " + (e.message || e)); } }
  await aviso(env, negocio, "resumen", "Tu resumen de la semana" + (porCorreo ? " (enviado a " + cfg.correo + ")" : ""), texto, "#stats");
  await registrar(env, negocio, r.id, porCorreo ? "Resumen enviado por correo a " + cfg.correo : "Resumen dejado en la app (sin proveedor de correo)");
  return 1;
}
/* Aviso de fin de prueba: una vez por día que quede (3, 2, 1) */
export async function avisoPrueba(env, negocio, cuentaDe) {
  if (!cuentaDe) return;
  let c; try { c = await cuentaDe(env, negocio); } catch (e) { return; }
  if (!c || c.interno || c.estado !== "prueba" || c.diasQuedan == null || c.diasQuedan > 3) return;
  const d = c.diasQuedan;
  await aviso(env, negocio, "prueba", d === 0 ? "Tu prueba gratis termina hoy" : "Te queda" + (d === 1 ? " 1 día" : "n " + d + " días") + " de prueba gratis",
    "Plan " + (c.nombrePlan || c.plan) + ". Para seguir publicando cuando acabe, elige tu plan en «Mi plan». Tus datos se quedan guardados.", "#plan", "prueba-" + d);
}

/* ---------------- ejecutar todas las reglas de un negocio ---------------- */
export async function ejecutarReglas(env, ctx, negocio, opciones = {}) {
  const { results } = await env.DB.prepare("SELECT * FROM reglas WHERE negocio = ? AND activa = 1").bind(negocio).all();
  const neg = await datosNegocio(env, negocio), ahoraM = horaMadrid(opciones.ahora || Date.now()), hechas = [];
  for (const f of results || []) {
    const r = { ...f, config: JSON.parse(f.config || "{}") }, cfg = { ...(TIPOS[r.tipo] || {}).def, ...r.config };
    let n = null;
    try {
      if (TIPOS[r.tipo] && TIPOS[r.tipo].plan && !(await ctx.planPermite(env, negocio, TIPOS[r.tipo].plan))) { hechas.push({ regla: r.id, tipo: r.tipo, saltada: "plan" }); continue; }
      if (r.tipo === "palabra_dm") n = await palabraDm(env, ctx, negocio, r, cfg, neg);
      else if (r.tipo === "resena") n = await resena(env, ctx, negocio, r, cfg);
      else if (r.tipo === "recordatorio") n = await recordatorio(env, negocio, r, cfg, ahoraM);
      else if (r.tipo === "resumen_semanal") n = await resumenSemanal(env, ctx, negocio, r, cfg, ahoraM, opciones.forzarResumen);
      if (n !== null) await marcarRegla(env, negocio, r.id, n > 0);
    } catch (e) { await registrar(env, negocio, r.id, "Fallo: " + (e.message || e)); }
    hechas.push({ regla: r.id, tipo: r.tipo, hizo: n });
  }
  return hechas;
}

/* ---------------- rutas ---------------- */
function validarRegla(tipo, cfg, Fallo) {
  if (!TIPOS[tipo]) throw new Fallo("Tipo de regla desconocido: " + tipo);
  const c = { ...TIPOS[tipo].def, ...(cfg || {}) };
  if (tipo === "palabra_dm") {
    c.palabra = String(c.palabra || "").trim().slice(0, 30);
    if (!c.palabra) throw new Fallo("Escribe la palabra clave (por ejemplo CARTA)");
    c.redes = (Array.isArray(c.redes) ? c.redes : []).filter((x) => x === "ig" || x === "fb");
    if (!c.redes.length) throw new Fallo("Elige Instagram, Facebook o las dos");
    c.mensaje = String(c.mensaje || "").slice(0, 900);
    if (c.enlace && !/^https:\/\//.test(c.enlace)) throw new Fallo("El enlace tiene que empezar por https://");
    c.publica = String(c.publica || "").slice(0, 200);
  }
  if (tipo === "resena") { c.modo = c.modo === "automatica" ? "automatica" : "sugerir"; c.minimo = Math.min(5, Math.max(4, Number(c.minimo) || 4)); }
  if (tipo === "recordatorio" || tipo === "resumen_semanal") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.hora)) throw new Fallo("La hora va como 10:00");
    if (tipo === "recordatorio") { c.dias = (c.dias || []).map(Number).filter((d) => d >= 0 && d <= 6); c.horas = Math.min(72, Math.max(2, Number(c.horas) || 24)); }
    else { c.dia = Math.min(6, Math.max(0, Number(c.dia))); c.correo = String(c.correo || "").trim().slice(0, 120); if (c.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.correo)) throw new Fallo("El correo no parece válido"); }
  }
  return c;
}
const aRegla = (f) => ({ id: f.id, tipo: f.tipo, nombre: (TIPOS[f.tipo] || {}).nm, activa: !!f.activa, config: JSON.parse(f.config || "{}"), ultima: f.ultima, veces: f.veces, creado: f.creado });

export async function rutasAutos(req, env, ctx, s, m, ruta, partes) {
  const neg = s.negocio;
  if (partes[0] === "avisos") {
    if (m === "GET" && ruta === "/avisos") {
      const { results } = await env.DB.prepare("SELECT id, tipo, titulo, texto, enlace, creado, leido FROM avisos WHERE negocio = ? ORDER BY creado DESC LIMIT 50").bind(neg).all();
      return { avisos: results || [], sinLeer: (results || []).filter((a) => !a.leido).length };
    }
    if (m === "POST" && ruta === "/avisos/leidos") { await env.DB.prepare("UPDATE avisos SET leido = ? WHERE negocio = ? AND leido IS NULL").bind(Date.now(), neg).run(); return { ok: true }; }
    if (m === "DELETE" && partes.length === 2) { await env.DB.prepare("DELETE FROM avisos WHERE negocio = ? AND id = ?").bind(neg, partes[1]).run(); return { ok: true }; }
    throw new ctx.Fallo("No existe", 404);
  }
  if (partes[0] !== "reglas") return undefined;
  if (m === "GET" && ruta === "/reglas") {
    const { results } = await env.DB.prepare("SELECT * FROM reglas WHERE negocio = ? ORDER BY creado").bind(neg).all();
    const reg = await env.DB.prepare("SELECT cuando, regla, resultado FROM auto_registro WHERE negocio = ? ORDER BY cuando DESC LIMIT 30").bind(neg).all();
    const correo = !!(env.RESEND_API_KEY && env.CORREO_REMITENTE);
    return { reglas: (results || []).map(aRegla), tipos: TIPOS, registro: reg.results || [], correo, dias: DIAS };
  }
  if (m === "POST" && ruta === "/reglas") {
    const c = await ctx.leerJson(req);
    if (TIPOS[c.tipo] && TIPOS[c.tipo].plan) await ctx.exigirPlan(env, neg, TIPOS[c.tipo].plan);
    const cfg = validarRegla(c.tipo, c.config, ctx.Fallo);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM reglas WHERE negocio = ?").bind(neg).first();
    if (n && n.n >= 20) throw new ctx.Fallo("Máximo 20 reglas por negocio");
    const id = "rg" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    await env.DB.prepare("INSERT INTO reglas (negocio, id, tipo, activa, config, creado) VALUES (?, ?, ?, 1, ?, ?)").bind(neg, id, c.tipo, JSON.stringify(cfg), Date.now()).run();
    return aRegla(await env.DB.prepare("SELECT * FROM reglas WHERE negocio = ? AND id = ?").bind(neg, id).first());
  }
  if (m === "POST" && ruta === "/reglas/ejecutar") {
    const c = await ctx.leerJson(req).catch(() => ({}));
    return { hechas: await ejecutarReglas(env, ctx, neg, { forzarResumen: !!c.resumen }) };
  }
  if (partes.length === 2) {
    const f = await env.DB.prepare("SELECT * FROM reglas WHERE negocio = ? AND id = ?").bind(neg, partes[1]).first();
    if (!f) throw new ctx.Fallo("No existe esa regla", 404);
    if (m === "PATCH") {
      const c = await ctx.leerJson(req);
      if (c.activa !== undefined) {
        if (c.activa && TIPOS[f.tipo] && TIPOS[f.tipo].plan) await ctx.exigirPlan(env, neg, TIPOS[f.tipo].plan);
        await env.DB.prepare("UPDATE reglas SET activa = ? WHERE negocio = ? AND id = ?").bind(c.activa ? 1 : 0, neg, f.id).run();
      }
      if (c.config !== undefined) await env.DB.prepare("UPDATE reglas SET config = ? WHERE negocio = ? AND id = ?").bind(JSON.stringify(validarRegla(f.tipo, c.config, ctx.Fallo)), neg, f.id).run();
      return aRegla(await env.DB.prepare("SELECT * FROM reglas WHERE negocio = ? AND id = ?").bind(neg, f.id).first());
    }
    if (m === "DELETE") { await env.DB.prepare("DELETE FROM reglas WHERE negocio = ? AND id = ?").bind(neg, f.id).run(); return { ok: true }; }
  }
  throw new ctx.Fallo("No existe", 404);
}
