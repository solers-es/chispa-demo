/* =====================================================================
   Chispa · ALTA SOLA, PRUEBA, PLANES, LÍMITES Y PAGO (trabajador H)
   ---------------------------------------------------------------------
   Módulo aparte del servidor (lo importa chispa-api-worker.js) para no
   pisar a los demás. Precios y límites: ../precios.js (la única tabla).

   Rutas públicas (sin sesión):
     GET  /planes                   → planes, días de prueba, si el pago está encendido, anti-abuso
     GET  /alta/reto                → reto firmado para la «prueba de trabajo» del navegador
     POST /alta {nombre, sector, idioma, correo, plan, acepto, reto, solucion, turnstile?, web?}
                                    → {negocio, nombre, codigo, sesion, plan, estado:"prueba", pruebaHasta}
     POST /stripe/webhook           → Stripe (firma comprobada con STRIPE_WEBHOOK_SECRET)
   Con sesión:
     GET  /cuenta                   → plan, estado, fin de la prueba, límites y uso
     POST /pago/checkout {plan}     (dueño) → {url} de Stripe Checkout · 503 si el pago está apagado
     POST /pago/portal              (dueño) → {url} del portal de cliente de Stripe (cambiar plan, baja, facturas)
     POST /cuenta/baja {confirmar:"BORRAR"} (dueño) → cancela en Stripe y borra el negocio y todo lo suyo
   Administración (cabecera X-Chispa-Admin):
     GET    /admin/clientes         → todos los negocios con plan, estado de pago y uso
     POST   /admin/clientes/:id {plan?, estado?, pruebaHasta?, dias?}  (p. ej. cobro por transferencia)
     DELETE /admin/negocios/:id     → borra el negocio y TODO lo suyo (no deja borrar el-paraiso)

   Anti-abuso del alta (todo gratis, sin cuentas de terceros):
     · límite por IP (huella, no la IP en claro): 3 altas/hora, 6/día, 30 intentos/hora
     · tope global de altas al día (ALTA_MAX_DIA, 200 por defecto)
     · reto firmado + prueba de trabajo SHA-256 en el navegador (≈0,5 s), de un solo uso,
       y no vale antes de 3 s (los robots rellenan al instante)
     · campo trampa «web» (invisible: si viene relleno, es un robot)
     · Cloudflare Turnstile (captcha gratuito) SI se ponen TURNSTILE_SITIO (var) y
       TURNSTILE_SECRETO (secreto). Sin ellos, funciona con lo anterior.
     · El correo NO se verifica todavía (hace falta un proveedor de correo): se guarda
       y se marca «sin verificar». Ver docs/VENDER-CHISPA.md.

   Pago (Stripe), APAGADO hasta que existan los secretos:
     STRIPE_SECRET_KEY        secreto  sk_live_… / sk_test_…
     STRIPE_WEBHOOK_SECRET    secreto  whsec_…
     STRIPE_PRECIO_BASICO / _PRO / _AGENCIA   var (opcional) id de precio price_…;
                              si no están, Checkout crea el precio al vuelo con precios.js
     STRIPE_TASA_IVA          var (opcional) txr_… (IVA 21 %) · o STRIPE_IVA_AUTOMATICO="1" (Stripe Tax)
     PAGO_ENCENDIDO           var "1" para cobrar (aunque estén las claves, sin esto no se cobra)

   Negocios SIN fila en «cuentas» (los de Solers, como el-paraiso) = plan «interno»
   sin límites: nada de lo de antes deja de funcionar.
   ===================================================================== */
import "../precios.js";
const PRECIOS = globalThis.ChispaPrecios;

const DIA = 864e5;
const LEGAL_VERSION = "2026-10-07";
const ESTADOS_ACTIVOS = ["prueba", "activa"];

export const ESQUEMA_SUSCRIPCIONES = [
  "CREATE TABLE IF NOT EXISTS cuentas (negocio TEXT PRIMARY KEY, plan TEXT NOT NULL, estado TEXT NOT NULL, prueba_hasta INTEGER, correo TEXT, correo_verificado INTEGER NOT NULL DEFAULT 0, sector TEXT, idioma TEXT, acepto_legal INTEGER, version_legal TEXT, ip_huella TEXT, stripe_cliente TEXT, stripe_suscripcion TEXT, stripe_estado TEXT, pagado_hasta INTEGER, nota TEXT, creado INTEGER NOT NULL, actualizado INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS alta_intentos (ip TEXT NOT NULL, cuando INTEGER NOT NULL, ok INTEGER NOT NULL DEFAULT 0)",
  "CREATE INDEX IF NOT EXISTS alta_intentos_ip ON alta_intentos (ip, cuando)",
  "CREATE TABLE IF NOT EXISTS alta_retos (huella TEXT PRIMARY KEY, cuando INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS stripe_eventos (id TEXT PRIMARY KEY, tipo TEXT, recibido INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS uso (negocio TEXT NOT NULL, clave TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (negocio, clave))",
];

const ahora = () => Date.now();
const enc = (s) => new TextEncoder().encode(s);
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return decodeURIComponent(escape(atob(s))); };
const ALFA = "23456789abcdefghjkmnpqrstuvwxyz";
const azarTexto = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALFA[b % ALFA.length]).join("");
function slug(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "negocio"; }
function igualSeguro(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
async function hmacHex(clave, texto) {
  const k = await crypto.subtle.importKey("raw", enc(clave), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc(texto)));
}
const mesDe = (t) => new Date(t).toISOString().slice(0, 7);
const diaDe = (t) => new Date(t).toISOString().slice(0, 10);

export function pagoEncendido(env) { return !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.PAGO_ENCENDIDO === "1"); }
function planDe(id) { const p = PRECIOS.plan(id); return p; }

/* ---------------- cuenta y plan efectivo ---------------- */
export async function cuentaDe(env, negocio) {
  const c = await env.DB.prepare("SELECT * FROM cuentas WHERE negocio = ?").bind(negocio).first();
  if (!c) return { negocio, plan: "interno", estado: "interno", limites: null, interno: true };
  let estado = c.estado;
  if (estado === "prueba" && c.prueba_hasta && c.prueba_hasta < ahora()) estado = "caducada";
  const p = planDe(c.plan) || planDe("basico");
  return {
    negocio, plan: p.id, nombrePlan: p.nombre, precio: p.precio, estado, estadoGuardado: c.estado,
    pruebaHasta: c.prueba_hasta, diasQuedan: c.prueba_hasta ? Math.max(0, Math.ceil((c.prueba_hasta - ahora()) / DIA)) : null,
    correo: c.correo, correoVerificado: !!c.correo_verificado, sector: c.sector, idioma: c.idioma,
    stripeEstado: c.stripe_estado || null, pagadoHasta: c.pagado_hasta || null, tieneStripe: !!c.stripe_cliente,
    limites: p.limites, creado: c.creado,
  };
}
async function uso(env, negocio, cta) {
  const mes = mesDe(ahora()), ini = Date.parse(mes + "-01T00:00:00Z"), fin = Date.parse(new Date(new Date(ini).setUTCMonth(new Date(ini).getUTCMonth() + 1)).toISOString());
  const pub = await env.DB.prepare("SELECT COUNT(*) AS n FROM agenda WHERE negocio = ? AND cuando >= ? AND cuando < ?").bind(negocio, ini, fin).first();
  const red = await env.DB.prepare("SELECT COUNT(*) AS n FROM conexiones WHERE negocio = ?").bind(negocio).first();
  // imágenes IA: el contador es el de conectores/ia.js (tabla uso_ia de G), para no contar dos veces
  let img = null; try { img = await env.DB.prepare("SELECT veces AS n FROM uso_ia WHERE dia = ? AND negocio = ? AND tipo = 'imagen'").bind(diaDe(ahora()), negocio).first(); } catch (e) {}
  const usu = await usuarios(env, negocio);
  return { publicacionesMes: pub ? pub.n : 0, redes: red ? red.n : 0, imagenesDia: img ? img.n : 0, usuarios: usu };
}
async function usuarios(env, negocio) {
  // el dueño cuenta como 1; más cada aparato o invitación del equipo vigente
  const s = await env.DB.prepare("SELECT COUNT(*) AS n FROM sesiones WHERE negocio = ? AND rol = 'equipo' AND caduca > ?").bind(negocio, ahora()).first();
  const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM codigos WHERE negocio = ? AND rol = 'equipo' AND (caduca IS NULL OR caduca > ?)").bind(negocio, ahora()).first();
  return 1 + (s ? s.n : 0) + (c ? c.n : 0);
}

const MSG = {
  publicacionesMes: (l) => "Has llegado a las " + l + " publicaciones de este mes de tu plan. Sube de plan para seguir programando.",
  redes: (l) => "Tu plan permite " + l + " red" + (l === 1 ? "" : "es") + " conectada" + (l === 1 ? "" : "s") + ". Sube de plan para conectar más.",
  imagenesDia: (l) => "Has usado las " + l + " imágenes IA de hoy de tu plan. Mañana tienes más, o sube de plan.",
  usuarios: (l) => "Tu plan permite " + l + " usuario" + (l === 1 ? "" : "s") + ". Sube de plan para añadir más personas.",
};
function bloqueo(Fallo, c) {
  if (c.estado === "caducada") throw new Fallo("Tu prueba gratuita de " + PRECIOS.DIAS_PRUEBA + " días ha terminado. Elige un plan para seguir publicando (tus datos siguen guardados).", 402, { motivo: "prueba-terminada", cuenta: c });
  if (c.estado === "cancelada") throw new Fallo("Tu suscripción está cancelada. Vuelve a elegir un plan para seguir publicando (tus datos siguen guardados).", 402, { motivo: "cancelada", cuenta: c });
  if (c.estado === "impago") throw new Fallo("No se ha podido cobrar tu plan. Actualiza la tarjeta en «Mi plan» para seguir publicando.", 402, { motivo: "impago", cuenta: c });
}
/* Lanza Fallo 402/429 si el negocio no puede hacer «tipo». Negocios internos: siempre pueden. */
export async function comprobarLimite(env, Fallo, negocio, tipo, suma = 1) {
  const c = await cuentaDe(env, negocio);
  if (c.interno) return c;
  bloqueo(Fallo, c);
  if (!tipo) return c;
  const u = await uso(env, negocio, c), lim = c.limites[tipo];
  if (lim != null && u[tipo] + suma > lim) throw new Fallo(MSG[tipo](lim), 429, { motivo: "limite", limite: tipo, maximo: lim, usado: u[tipo], plan: c.plan });
  return c;
}
/* Se llama ANTES de atender una ruta con sesión: aplica los límites del plan */
export async function antesDeRuta(req, env, h, s, m, ruta, partes) {
  const { Fallo } = h;
  if (m === "POST" && ruta === "/programar") {
    let it = {}; try { it = await req.clone().json(); } catch (e) {}
    const viejo = it.id ? await env.DB.prepare("SELECT 1 AS x FROM agenda WHERE negocio = ? AND id = ?").bind(s.negocio, String(it.id)).first() : null;
    await comprobarLimite(env, Fallo, s.negocio, viejo ? null : "publicacionesMes");
  } else if (m === "POST" && (ruta === "/v1/publicaciones" || ruta === "/v1/programar")) {
    let it = {}; try { it = await req.clone().json(); } catch (e) {}
    const viejo = it.id ? await env.DB.prepare("SELECT 1 AS x FROM agenda WHERE negocio = ? AND id = ?").bind(s.negocio, String(it.id)).first() : null;
    await comprobarLimite(env, Fallo, s.negocio, viejo ? null : "publicacionesMes");
  } else if (m === "POST" && (ruta === "/ia/imagen" || ruta === "/v1/imagen")) {
    let q = {}; try { q = await req.clone().json(); } catch (e) {}
    await comprobarLimite(env, Fallo, s.negocio, "imagenesDia", Math.min(Math.max(parseInt(q.cantidad) || 1, 1), 3));
  } else if (m === "POST" && (ruta === "/publicar" || /^\/v1\/publicaciones\/[^/]+\/publicar$/.test(ruta) || partes[0] === "ia" || /^\/v1\/(voz|texto|reaprovechar|traducir)$/.test(ruta))) {
    await comprobarLimite(env, Fallo, s.negocio, null); // prueba terminada, cancelada o impago: no se publica ni se gasta IA
  } else if (m === "POST" && partes[0] === "conectar" && partes.length === 2) {
    const ya = await env.DB.prepare("SELECT 1 AS x FROM conexiones WHERE negocio = ? AND red = ?").bind(s.negocio, partes[1]).first();
    await comprobarLimite(env, Fallo, s.negocio, ya ? null : "redes");
  } else if (m === "POST" && ruta === "/enlace") {
    let c = {}; try { c = await req.clone().json(); } catch (e) {}
    if (c.rol !== "dueno") await comprobarLimite(env, Fallo, s.negocio, "usuarios");
  }
}

/* ---------------- anti-abuso ---------------- */
const DIFICULTAD = 14; // bits a cero: ≈16.000 intentos de media en el navegador (≈0,3-1 s)
async function claveRetos(env) { return "chispa-reto:" + (env.CLAVE_CIFRADO || "sin-clave"); }
async function retoNuevo(env) {
  const cuerpo = b64url(JSON.stringify({ t: ahora(), a: azarTexto(10), d: DIFICULTAD }));
  return { reto: cuerpo + "." + (await hmacHex(await claveRetos(env), cuerpo)), dificultad: DIFICULTAD };
}
async function bitsCero(texto) {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", enc(texto)));
  let n = 0;
  for (const x of b) { if (x === 0) { n += 8; continue; } n += Math.clz32(x) - 24; break; }
  return n;
}
async function comprobarReto(env, Fallo, reto, solucion) {
  const [cuerpo, firma] = String(reto || "").split(".");
  if (!cuerpo || !firma || !igualSeguro(firma, await hmacHex(await claveRetos(env), cuerpo))) throw new Fallo("Vuelve a cargar la página e inténtalo otra vez (comprobación anti-robots)", 400, { motivo: "reto" });
  let d; try { d = JSON.parse(deB64url(cuerpo)); } catch (e) { throw new Fallo("Comprobación anti-robots no válida", 400, { motivo: "reto" }); }
  const edad = ahora() - d.t;
  if (edad < 3000) throw new Fallo("Demasiado rápido: espera un par de segundos y vuelve a pulsar", 400, { motivo: "reto-rapido" });
  if (edad > 3600e3) throw new Fallo("La página lleva mucho rato abierta: vuelve a pulsar «Crear mi Chispa»", 400, { motivo: "reto-caducado" });
  if ((await bitsCero(reto + ":" + String(solucion || ""))) < d.d) throw new Fallo("Comprobación anti-robots no superada", 400, { motivo: "reto" });
  const h = await hmacHex(await claveRetos(env), "usado:" + reto);
  await env.DB.prepare("DELETE FROM alta_retos WHERE cuando < ?").bind(ahora() - 2 * 3600e3).run();
  const r = await env.DB.prepare("INSERT INTO alta_retos (huella, cuando) VALUES (?, ?) ON CONFLICT (huella) DO NOTHING").bind(h, ahora()).run();
  if (!r.meta || r.meta.changes !== 1) throw new Fallo("Esa comprobación ya se usó: vuelve a pulsar", 400, { motivo: "reto-usado" });
}
async function comprobarTurnstile(env, Fallo, token, ip) {
  if (!env.TURNSTILE_SECRETO) return;
  if (!token) throw new Fallo("Marca la casilla «No soy un robot»", 400, { motivo: "turnstile" });
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret: env.TURNSTILE_SECRETO, response: token, remoteip: ip || "" }) });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!j.success) throw new Fallo("La casilla «No soy un robot» no se ha validado: vuelve a marcarla", 400, { motivo: "turnstile" });
}
async function limitarIp(env, Fallo, ipH) {
  await env.DB.prepare("DELETE FROM alta_intentos WHERE cuando < ?").bind(ahora() - 2 * DIA).run();
  const q = (desde, ok) => env.DB.prepare("SELECT COUNT(*) AS n FROM alta_intentos WHERE ip = ? AND cuando > ?" + (ok ? " AND ok = 1" : "")).bind(ipH, desde).first();
  const intentos = (await q(ahora() - 3600e3, false)).n, horaOk = (await q(ahora() - 3600e3, true)).n, diaOk = (await q(ahora() - DIA, true)).n;
  if (intentos >= 30 || horaOk >= 3 || diaOk >= 6) throw new Fallo("Demasiadas altas desde esta conexión. Prueba más tarde o escríbenos a admin@solers.es", 429, { motivo: "ip" });
  const glob = await env.DB.prepare("SELECT COUNT(*) AS n FROM alta_intentos WHERE ok = 1 AND cuando > ?").bind(ahora() - DIA).first();
  if (glob.n >= Number(env.ALTA_MAX_DIA || 200)) throw new Fallo("Hoy ya no se admiten más altas automáticas. Escríbenos a admin@solers.es y te damos de alta a mano.", 429, { motivo: "global" });
  await env.DB.prepare("INSERT INTO alta_intentos (ip, cuando, ok) VALUES (?, ?, 0)").bind(ipH, ahora()).run();
}

/* ---------------- alta ---------------- */
async function alta(req, env, h) {
  const { Fallo } = h;
  const ip = req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For") || "local";
  const ipH = await h.huella(env, "ip:" + ip);
  await limitarIp(env, Fallo, ipH);
  const c = await h.leerJson(req);
  if (c.web) throw new Fallo("No se ha podido completar el alta", 400, { motivo: "trampa" }); // campo trampa: solo lo rellenan robots
  await comprobarReto(env, Fallo, c.reto, c.solucion);
  await comprobarTurnstile(env, Fallo, c.turnstile, ip);
  const nombre = String(c.nombre || "").trim().replace(/\s+/g, " ");
  if (nombre.length < 2 || nombre.length > 80) throw new Fallo("Escribe el nombre de tu negocio o de tu marca (de 2 a 80 letras)", 400, { campo: "nombre" });
  const correo = String(c.correo || "").trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/.test(correo)) throw new Fallo("Ese correo no parece válido", 400, { campo: "correo" });
  const sector = String(c.sector || "restaurante");
  if (!/^[a-z][a-z-]{1,30}$/.test(sector)) throw new Fallo("Elige tu sector", 400, { campo: "sector" });
  const idioma = String(c.idioma || "es");
  if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8}){0,2}$/.test(idioma)) throw new Fallo("Idioma no válido", 400, { campo: "idioma" });
  const p = planDe(c.plan);
  if (!p) throw new Fallo("Elige un plan", 400, { campo: "plan" });
  if (c.acepto !== true) throw new Fallo("Para darte de alta tienes que aceptar los términos y la política de privacidad", 400, { campo: "acepto" });

  const yaCorreo = await env.DB.prepare("SELECT COUNT(*) AS n FROM cuentas WHERE correo = ?").bind(correo).first();
  if (yaCorreo.n >= 3) throw new Fallo("Ese correo ya tiene varias Chispas. Si has perdido tu código, escríbenos a admin@solers.es", 409, { campo: "correo" });

  let id = "";
  for (let i = 0; i < 5 && !id; i++) {
    const cand = slug(nombre) + "-" + azarTexto(4);
    const r = await env.DB.prepare("INSERT INTO negocios (id, nombre, creado) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING").bind(cand, nombre, ahora()).run();
    if (r.meta && r.meta.changes === 1) id = cand;
  }
  if (!id) throw new Fallo("No se pudo crear el negocio, inténtalo otra vez", 500);
  const hasta = ahora() + PRECIOS.DIAS_PRUEBA * DIA;
  await env.DB.prepare("INSERT INTO cuentas (negocio, plan, estado, prueba_hasta, correo, sector, idioma, acepto_legal, version_legal, ip_huella, creado, actualizado) VALUES (?, ?, 'prueba', ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, p.id, hasta, correo, sector, idioma, ahora(), LEGAL_VERSION, ipH, ahora(), ahora()).run();
  await env.DB.prepare("UPDATE alta_intentos SET ok = 1 WHERE rowid = (SELECT rowid FROM alta_intentos WHERE ip = ? ORDER BY cuando DESC LIMIT 1)").bind(ipH).run();
  const codigo = await h.guardarCodigo(env, id, "dueno", { nota: "alta sola" });
  const sesion = await h.crearSesion(env, id, "dueno");
  return { negocio: id, nombre, codigo, sesion, rol: "dueno", esAdministrador: true, plan: p.id, nombrePlan: p.nombre, estado: "prueba", pruebaHasta: hasta, diasPrueba: PRECIOS.DIAS_PRUEBA, sector, idioma, pago: { encendido: pagoEncendido(env) } };
}

/* ---------------- Stripe ---------------- */
async function stripe(env, metodo, ruta, campos) {
  const r = await fetch("https://api.stripe.com/v1" + ruta, {
    method: metodo,
    headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": env.STRIPE_VERSION || "2024-06-20" },
    body: campos ? new URLSearchParams(campos) : undefined,
  });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error((j.error && j.error.message) || "Stripe respondió " + r.status);
  return j;
}
function volverA(env, sufijo) { return String(env.PANEL_URL || "https://solers-es.github.io/chispa-demo/").replace(/#.*$/, "") + sufijo; }
async function checkout(env, h, s, cuerpo) {
  const { Fallo } = h;
  if (!s.esAdministrador) throw new Fallo("Solo el dueño puede contratar el plan", 403);
  if (!pagoEncendido(env)) throw new Fallo("El pago con tarjeta todavía no está activado. Sigues en tu prueba gratuita; Solers te avisará antes de que termine.", 503, { modoPrueba: true });
  const c = await env.DB.prepare("SELECT * FROM cuentas WHERE negocio = ?").bind(s.negocio).first();
  if (!c) throw new Fallo("Este negocio lo lleva Solers directamente: no hace falta pagar aquí", 400);
  const p = planDe(cuerpo.plan || c.plan);
  if (!p) throw new Fallo("Elige un plan");
  const f = {
    mode: "subscription", client_reference_id: s.negocio, "line_items[0][quantity]": "1",
    success_url: volverA(env, "#pago-ok"), cancel_url: volverA(env, "#pago-cancelado"),
    "subscription_data[metadata][negocio]": s.negocio, "subscription_data[metadata][plan]": p.id,
    "metadata[negocio]": s.negocio, "metadata[plan]": p.id, allow_promotion_codes: "true",
    billing_address_collection: "required", "tax_id_collection[enabled]": "true", locale: "auto",
  };
  const precioId = env["STRIPE_PRECIO_" + p.id.toUpperCase()];
  if (precioId) f["line_items[0][price]"] = precioId;
  else Object.assign(f, { "line_items[0][price_data][currency]": "eur", "line_items[0][price_data][unit_amount]": String(Math.round(p.precio * 100)), "line_items[0][price_data][recurring][interval]": "month", "line_items[0][price_data][product_data][name]": "Chispa " + p.nombre, "line_items[0][price_data][tax_behavior]": "exclusive" });
  if (env.STRIPE_IVA_AUTOMATICO === "1") f["automatic_tax[enabled]"] = "true";
  else if (env.STRIPE_TASA_IVA) f["subscription_data[default_tax_rates][0]"] = env.STRIPE_TASA_IVA;
  // lo que le quede de prueba se respeta (Stripe pide al menos 48 h)
  if (c.estado === "prueba" && c.prueba_hasta && c.prueba_hasta - ahora() > 49 * 3600e3) f["subscription_data[trial_end]"] = String(Math.floor(c.prueba_hasta / 1000));
  if (c.stripe_cliente) Object.assign(f, { customer: c.stripe_cliente, "customer_update[name]": "auto", "customer_update[address]": "auto" });
  else f.customer_email = c.correo;
  const ses = await stripe(env, "POST", "/checkout/sessions", f);
  return { url: ses.url };
}
async function portal(env, h, s) {
  const { Fallo } = h;
  if (!s.esAdministrador) throw new Fallo("Solo el dueño puede gestionar el plan", 403);
  if (!pagoEncendido(env)) throw new Fallo("El pago con tarjeta todavía no está activado: no hay nada que gestionar aún. Para darte de baja escribe a admin@solers.es.", 503, { modoPrueba: true });
  const c = await env.DB.prepare("SELECT stripe_cliente FROM cuentas WHERE negocio = ?").bind(s.negocio).first();
  if (!c || !c.stripe_cliente) throw new Fallo("Todavía no has contratado ningún plan con tarjeta", 400);
  const p = await stripe(env, "POST", "/billing_portal/sessions", { customer: c.stripe_cliente, return_url: volverA(env, "#mi-plan") });
  return { url: p.url };
}

/* Firma de Stripe: cabecera «t=…,v1=…»; HMAC-SHA256(secreto, t + "." + cuerpo) en hex. Tolerancia 5 min. */
export async function firmaStripeValida(secreto, cabecera, cuerpo, tolerancia = 300) {
  const partes = String(cabecera || "").split(",").map((x) => x.trim().split("="));
  const t = (partes.find((x) => x[0] === "t") || [])[1];
  const v1 = partes.filter((x) => x[0] === "v1").map((x) => x[1]);
  if (!t || !v1.length) return false;
  if (Math.abs(Math.floor(ahora() / 1000) - Number(t)) > tolerancia) return false;
  const esperada = await hmacHex(secreto, t + "." + cuerpo);
  return v1.some((f) => igualSeguro(f, esperada));
}
function estadoDeStripe(st) {
  if (st === "active" || st === "trialing") return "activa";
  if (st === "past_due" || st === "unpaid") return "impago";
  if (st === "canceled" || st === "incomplete_expired") return "cancelada";
  return null; // incomplete, paused…: no se cambia
}
async function negocioDeObjeto(env, o) {
  const m = (o.metadata || {}).negocio || o.client_reference_id;
  if (m) return m;
  const f = await env.DB.prepare("SELECT negocio FROM cuentas WHERE stripe_suscripcion = ? OR stripe_cliente = ?").bind(o.subscription || o.id || "", o.customer || "").first();
  return f ? f.negocio : null;
}
async function webhook(req, env, h) {
  const { Fallo } = h;
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Fallo("Pago no configurado", 503);
  const cuerpo = await req.text();
  if (!(await firmaStripeValida(env.STRIPE_WEBHOOK_SECRET, req.headers.get("Stripe-Signature"), cuerpo))) throw new Fallo("Firma de Stripe no válida", 400);
  const ev = JSON.parse(cuerpo);
  const r = await env.DB.prepare("INSERT INTO stripe_eventos (id, tipo, recibido) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING").bind(ev.id, ev.type, ahora()).run();
  if (!r.meta || r.meta.changes !== 1) return { recibido: true, repetido: true };
  const o = (ev.data && ev.data.object) || {};
  const negocio = await negocioDeObjeto(env, o);
  if (!negocio) return { recibido: true, sinNegocio: true };
  const set = async (campos) => {
    const k = Object.keys(campos);
    await env.DB.prepare("UPDATE cuentas SET " + k.map((x) => x + " = ?").join(", ") + ", actualizado = ? WHERE negocio = ?").bind(...k.map((x) => campos[x]), ahora(), negocio).run();
  };
  if (ev.type === "checkout.session.completed") {
    await set({ stripe_cliente: o.customer || null, stripe_suscripcion: o.subscription || null, ...(planDe((o.metadata || {}).plan) ? { plan: planDe(o.metadata.plan).id } : {}) });
  } else if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev.type)) {
    const st = ev.type.endsWith("deleted") ? "canceled" : o.status;
    const fin = o.current_period_end || (o.items && o.items.data && o.items.data[0] && o.items.data[0].current_period_end) || null;
    const c = { stripe_estado: st, stripe_suscripcion: o.id, stripe_cliente: o.customer || null, pagado_hasta: fin ? fin * 1000 : null };
    const e = estadoDeStripe(st); if (e) c.estado = e;
    const pl = planDe((o.metadata || {}).plan); if (pl) c.plan = pl.id;
    await set(c);
  } else if (ev.type === "invoice.payment_failed") {
    await set({ estado: "impago", stripe_estado: "past_due" });
  } else if (ev.type === "invoice.paid") {
    await set({ estado: "activa" });
  }
  return { recibido: true };
}

/* Baja del propio cliente: cancela la suscripción en Stripe (si la hay) y borra el negocio entero */
async function baja(env, h, s, cuerpo) {
  const { Fallo } = h;
  if (!s.esAdministrador) throw new Fallo("Solo el dueño puede dar de baja el negocio", 403);
  if (cuerpo.confirmar !== "BORRAR") throw new Fallo("Escribe BORRAR para confirmar");
  const c = await env.DB.prepare("SELECT stripe_suscripcion FROM cuentas WHERE negocio = ?").bind(s.negocio).first();
  if (!c) throw new Fallo("Este negocio lo lleva Solers: para darlo de baja escribe a admin@solers.es", 403);
  if (c.stripe_suscripcion && env.STRIPE_SECRET_KEY) await stripe(env, "DELETE", "/subscriptions/" + encodeURIComponent(c.stripe_suscripcion));
  return borrarNegocio(env, h, s.negocio);
}

/* ---------------- administración ---------------- */
async function listarClientes(env) {
  const { results } = await env.DB.prepare("SELECT n.id, n.nombre, n.creado FROM negocios n ORDER BY n.creado DESC").all();
  const out = [];
  for (const n of results || []) {
    const c = await cuentaDe(env, n.id);
    out.push({ id: n.id, nombre: n.nombre, creado: n.creado, ...c, uso: await uso(env, n.id, c) });
  }
  return { clientes: out, pago: { encendido: pagoEncendido(env) } };
}
async function editarCliente(env, h, id, c) {
  const { Fallo } = h;
  const ya = await env.DB.prepare("SELECT negocio FROM cuentas WHERE negocio = ?").bind(id).first();
  if (!ya) {
    const n = await env.DB.prepare("SELECT id FROM negocios WHERE id = ?").bind(id).first();
    if (!n) throw new Fallo("No existe ese negocio", 404);
    await env.DB.prepare("INSERT INTO cuentas (negocio, plan, estado, creado, actualizado) VALUES (?, 'basico', 'activa', ?, ?)").bind(id, ahora(), ahora()).run();
  }
  const set = {};
  if (c.plan != null) { const p = planDe(c.plan); if (!p) throw new Fallo("Plan no válido"); set.plan = p.id; }
  if (c.estado != null) { if (!["prueba", "activa", "impago", "cancelada"].includes(c.estado)) throw new Fallo("Estado no válido"); set.estado = c.estado; }
  if (c.dias != null) set.prueba_hasta = ahora() + Number(c.dias) * DIA;
  if (c.pruebaHasta != null) set.prueba_hasta = Number(c.pruebaHasta);
  if (c.nota != null) set.nota = String(c.nota).slice(0, 500);
  const k = Object.keys(set);
  if (k.length) await env.DB.prepare("UPDATE cuentas SET " + k.map((x) => x + " = ?").join(", ") + ", actualizado = ? WHERE negocio = ?").bind(...k.map((x) => set[x]), ahora(), id).run();
  return cuentaDe(env, id);
}
async function borrarNegocio(env, h, id) {
  if (id === "el-paraiso") throw new h.Fallo("El Paraíso no se borra", 403);
  for (const t of ["negocios:id", "codigos:negocio", "sesiones:negocio", "estado:negocio", "conexiones:negocio", "oauth_estados:negocio", "agenda:negocio", "cuentas:negocio", "uso:negocio"]) {
    const [tabla, col] = t.split(":");
    await env.DB.prepare("DELETE FROM " + tabla + " WHERE " + col + " = ?").bind(id).run();
  }
  return { ok: true, borrado: id };
}

/* ---------------- enrutadores (los llama chispa-api-worker.js) ---------------- */
let listas = false;
export async function asegurarTablasSuscripciones(env) {
  if (listas) return;
  await env.DB.batch(ESQUEMA_SUSCRIPCIONES.map((s) => env.DB.prepare(s)));
  listas = true;
}
/* Rutas sin sesión. Devuelve undefined si no es suya. */
export async function rutasPublicas(req, env, h, m, ruta) {
  if (m === "GET" && ruta === "/planes") return { planes: PRECIOS.planes, diasPrueba: PRECIOS.DIAS_PRUEBA, iva: PRECIOS.iva, ivaIncluido: PRECIOS.ivaIncluido, pago: { encendido: pagoEncendido(env) }, turnstile: env.TURNSTILE_SITIO || null, dificultad: DIFICULTAD, versionLegal: LEGAL_VERSION };
  if (!["/alta/reto", "/alta", "/stripe/webhook"].includes(ruta) && !ruta.startsWith("/admin/clientes") && !/^\/admin\/negocios\/[^/]+$/.test(ruta)) return undefined;
  await asegurarTablasSuscripciones(env);
  if (m === "GET" && ruta === "/alta/reto") return { ...(await retoNuevo(env)), turnstile: env.TURNSTILE_SITIO || null };
  if (m === "POST" && ruta === "/alta") return alta(req, env, h);
  if (m === "POST" && ruta === "/stripe/webhook") return webhook(req, env, h);
  if (ruta.startsWith("/admin/")) {
    h.soloAdmin(req, env);
    if (m === "GET" && ruta === "/admin/clientes") return listarClientes(env);
    const id = decodeURIComponent(ruta.split("/")[3] || "");
    if (m === "POST" && ruta.startsWith("/admin/clientes/")) return editarCliente(env, h, id, await h.leerJson(req));
    if (m === "DELETE" && ruta.startsWith("/admin/negocios/")) return borrarNegocio(env, h, id);
  }
  return undefined;
}
/* Rutas con sesión. Devuelve undefined si no es suya. */
export async function rutasConSesion(req, env, h, s, m, ruta) {
  if (!["/cuenta", "/cuenta/baja", "/pago/checkout", "/pago/portal"].includes(ruta)) return undefined;
  await asegurarTablasSuscripciones(env);
  if (m === "GET" && ruta === "/cuenta") {
    const c = await cuentaDe(env, s.negocio);
    return { ...c, uso: c.interno ? null : await uso(env, s.negocio, c), pago: { encendido: pagoEncendido(env) }, diasPrueba: PRECIOS.DIAS_PRUEBA };
  }
  if (m === "POST" && ruta === "/pago/checkout") return checkout(env, h, s, await h.leerJson(req).catch(() => ({})));
  if (m === "POST" && ruta === "/pago/portal") return portal(env, h, s);
  if (m === "POST" && ruta === "/cuenta/baja") return baja(env, h, s, await h.leerJson(req).catch(() => ({})));
  return undefined;
}
/* Para el cron: ¿puede este negocio publicar ahora? (prueba terminada, cancelada o impago → no) */
export async function puedePublicar(env, negocio) {
  await asegurarTablasSuscripciones(env);
  const c = await cuentaDe(env, negocio);
  return c.interno || ESTADOS_ACTIVOS.includes(c.estado);
}
export const _pruebasSuscripciones = { bitsCero, firmaStripeValida, estadoDeStripe, DIFICULTAD };
