/* =====================================================================
   Chispa · lo del panel que funciona en el SERVIDOR (trabajador J)
   ---------------------------------------------------------------------
   Une en el Worker (chispa-api-worker.js) cuatro módulos:
     bandeja.js           comentarios, mensajes y reseñas (leer, contestar, etiquetas, estados)
     metricas.js          estadísticas por día + consejos (consejos.js)
     anuncios.js          campañas en Meta (y Google preparado)
     automatizaciones.js  reglas que ejecuta el cron y avisos en la app
   El Worker solo hace tres cosas: añadir ESQUEMA_PANEL a sus tablas,
   llamar a rutasPanel() antes de su «No existe» y a cronPanel() en el cron.

   Rutas (con sesión del negocio):
     GET  /bandeja[?estado&red&tipo&etiqueta] · POST /bandeja/recoger
     GET|PATCH /bandeja/:id · POST /bandeja/:id/responder {texto, privado?}
     POST /bandeja/:id/sugerencia {variante} · POST|DELETE /bandeja/ejemplos
     GET  /metricas?dias=28 · POST /metricas/recoger
     GET|POST /anuncios · POST /anuncios/:id/(activar|pausar|resultados) · DELETE /anuncios/:id
     GET|POST /reglas · PATCH|DELETE /reglas/:id · POST /reglas/ejecutar
     GET  /avisos · POST /avisos/leidos · DELETE /avisos/:id
   Administración (cabecera X-Chispa-Admin):
     GET  /admin/avisos      avisos de todos los negocios (p. ej. pruebas que acaban)

   Planes (precios.js, lo que promete la portada):
     «Respuestas a comentarios y reseñas» y «Anuncios preparados» → Pro y Agencia.
     Básico puede LEER la bandeja y las estadísticas, no contestar desde
     Chispa ni lanzar anuncios. Negocios internos (El Paraíso): todo.
   ===================================================================== */
import { ESQUEMA_BANDEJA, rutasBandeja, recoger, ajuste } from "./bandeja.js";
import { ESQUEMA_METRICAS, rutasMetricas, recogerMetricas } from "./metricas.js";
import { ESQUEMA_ANUNCIOS, rutasAnuncios, cronAnuncios } from "./anuncios.js";
import { ESQUEMA_AUTOS, rutasAutos, ejecutarReglas, avisoPrueba, horaMadrid } from "./automatizaciones.js";
import { cuentaDe, comprobarLimite } from "./suscripciones.js";

export const ESQUEMA_PANEL = [...ESQUEMA_BANDEJA, ...ESQUEMA_METRICAS, ...ESQUEMA_ANUNCIOS, ...ESQUEMA_AUTOS];

/* Qué plan incluye cada función (mismas frases que precios.js) */
export const FUNCIONES = {
  respuestas: { planes: ["pro", "agencia"], frase: "Respuestas a comentarios y reseñas" },
  anuncios: { planes: ["pro", "agencia"], frase: "Anuncios preparados" },
};

/* ---------------- contexto que reciben los módulos ---------------- */
export function crearContexto(base, presupuesto = 40) {
  // base: {Fallo, leerJson, tokensDe, credPara}  (del Worker)
  let gastadas = 0;
  const ctx = { ...base };
  ctx.http = async (url, op) => {
    if (++gastadas > presupuesto) throw new Error("Tope de llamadas de esta pasada: sigue en la siguiente");
    return fetch(url, op);
  };
  ctx.gastadas = () => gastadas;
  // Graph API de Meta. GET → query; POST → formulario (objetos ya en JSON.stringify)
  ctx.graph = async (ruta, params = {}, metodo = "POST") => {
    const q = new URLSearchParams(params), url = "https://graph.facebook.com/v21.0" + ruta;
    const r = await ctx.http(metodo === "GET" ? url + "?" + q : url, metodo === "GET" ? {} : { method: metodo, body: q });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || j.error) throw new Error((j.error && (j.error.error_user_msg || j.error.message)) || "Meta " + r.status);
    return j;
  };
  // APIs de Google/TikTok con «Authorization: Bearer»
  ctx.gjson = async (url, token, metodo = "GET", cuerpo) => {
    const r = await ctx.http(url, { method: metodo, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    const err = j.error && (typeof j.error === "string" ? j.error : j.error.code && j.error.code !== "ok" ? j.error.message || j.error.code : j.error.message && !j.error.code ? j.error.message : null);
    if (!r.ok || err) throw new Error(err || "HTTP " + r.status);
    return j;
  };
  ctx.planPermite = async (env, negocio, funcion) => {
    const c = await cuentaDe(env, negocio);
    if (c.interno) return true;
    if (["caducada", "cancelada", "impago"].includes(c.estado)) return false;
    return (FUNCIONES[funcion] || { planes: [] }).planes.includes(c.plan);
  };
  ctx.exigirPlan = async (env, negocio, funcion) => {
    const c = await comprobarLimite(env, base.Fallo, negocio, null); // prueba terminada / impago → 402
    if (c.interno) return c;
    const f = FUNCIONES[funcion];
    if (f && !f.planes.includes(c.plan)) throw new base.Fallo("«" + f.frase + "» viene en los planes Pro y Agencia. Tu plan es " + (c.nombrePlan || c.plan) + ": súbelo en «Mi plan».", 402, { motivo: "plan", funcion, plan: c.plan });
    return c;
  };
  return ctx;
}

/* ---------------- rutas ---------------- */
const MIAS = ["bandeja", "metricas", "anuncios", "reglas", "avisos"];
export async function rutasPanel(req, env, base, s, m, ruta, partes, url) {
  if (!MIAS.includes(partes[0])) return undefined;
  if (s.api) throw new base.Fallo("Una clave de API solo vale para /v1/… y /mcp", 403);
  const ctx = crearContexto(base, 45);
  // contestar desde Chispa: según plan (leer siempre se puede)
  if (partes[0] === "bandeja" && m === "POST" && partes[2] === "responder") {
    const it = await env.DB.prepare("SELECT ejemplo FROM bandeja WHERE negocio = ? AND id = ?").bind(s.negocio, partes[1]).first();
    if (it && !it.ejemplo) await ctx.exigirPlan(env, s.negocio, "respuestas");
  }
  for (const r of [rutasBandeja, rutasMetricas, rutasAnuncios, rutasAutos]) {
    const x = await r(req, env, ctx, s, m, ruta, partes, url);
    if (x !== undefined) return x;
  }
  return undefined;
}
export async function rutasAdminPanel(req, env, m, ruta) {
  if (m === "GET" && ruta === "/admin/avisos") {
    const { results } = await env.DB.prepare("SELECT a.negocio, n.nombre, a.id, a.tipo, a.titulo, a.texto, a.creado, a.leido FROM avisos a LEFT JOIN negocios n ON n.id = a.negocio WHERE a.tipo IN ('prueba', 'resena-negativa') ORDER BY a.creado DESC LIMIT 100").all();
    return { avisos: results || [] };
  }
  return undefined;
}

/* ---------------- cron (cada 5 min) ----------------
   El plan gratuito de Workers deja 50 llamadas por pasada: se reparten.
   Cada pasada atiende a UN negocio para la bandeja (el que lleva más rato sin
   mirar, como mucho cada 15 min), las estadísticas una vez al día a partir de
   las 07:00 de Madrid, y las reglas de todos los negocios que tengan. */
export async function cronPanel(env, base) {
  const ctx = crearContexto(base, 30), hecho = { bandeja: null, metricas: null, reglas: 0 };
  const ahoraM = horaMadrid();
  const { results: conectados } = await env.DB.prepare("SELECT DISTINCT negocio FROM conexiones WHERE estado = 'conectada'").all();
  // 1. bandeja: el negocio con la recogida más vieja
  let elegido = null, masViejo = Infinity;
  for (const { negocio } of conectados || []) {
    const r = await ajuste(env, negocio, "bandeja_recogida"), t = (r && r.cuando) || 0;
    if (t < masViejo) { masViejo = t; elegido = negocio; }
  }
  if (elegido && Date.now() - masViejo > 14 * 60e3) { try { hecho.bandeja = { negocio: elegido, ...(await recoger(env, ctx, elegido)) }; } catch (e) { hecho.bandeja = { negocio: elegido, error: String(e.message || e) }; } }
  // 2. estadísticas: una vez al día por negocio
  if (ahoraM.hm >= "07:00") {
    for (const { negocio } of conectados || []) {
      const r = await ajuste(env, negocio, "metricas_recogida");
      if (r && horaMadrid(r.cuando).fecha === ahoraM.fecha) continue;
      if (ctx.gastadas() > 18) break;
      try { hecho.metricas = { negocio, ...(await recogerMetricas(env, ctx, negocio)) }; } catch (e) { hecho.metricas = { negocio, error: String(e.message || e) }; }
      try { await cronAnuncios(env, ctx, negocio); } catch (e) {}
      break; // uno por pasada
    }
  }
  // 3. reglas de todos los negocios que las tienen + aviso de fin de prueba (una vez al día, a partir de las 10:00)
  const { results: conReglas } = await env.DB.prepare("SELECT DISTINCT negocio FROM reglas WHERE activa = 1").all();
  for (const { negocio } of conReglas || []) { try { await ejecutarReglas(env, ctx, negocio); hecho.reglas++; } catch (e) {} }
  if (ahoraM.hm >= "10:00") {
    const marca = await ajuste(env, "_sistema", "avisos_prueba");
    if (marca !== ahoraM.fecha) {
      try {
        const { results } = await env.DB.prepare("SELECT negocio FROM cuentas WHERE estado = 'prueba' AND prueba_hasta IS NOT NULL AND prueba_hasta < ?").bind(Date.now() + 4 * 864e5).all();
        for (const { negocio } of results || []) await avisoPrueba(env, negocio, cuentaDe);
      } catch (e) {}
      await ajuste(env, "_sistema", "avisos_prueba", ahoraM.fecha);
    }
  }
  return hecho;
}
