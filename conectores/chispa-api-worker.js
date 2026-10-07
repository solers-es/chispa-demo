/* =====================================================================
   Chispa · servidor de datos y conexiones (Cloudflare Worker + D1)
   ---------------------------------------------------------------------
   Para qué: que Chispa, una vez enlazado con las redes, se vea IGUAL y
   actualizado en todas las páginas y en el móvil, sin volver a enlazar.

     · ESTADO POR NEGOCIO  → lo que hoy vive en localStorage (S, reseñas…)
       se guarda aquí, con número de versión para no pisar cambios.
     · CONEXIONES OAUTH    → Google (ficha), YouTube, Meta (Instagram +
       Facebook) y TikTok. Los tokens se guardan CIFRADOS (AES-GCM) y
       NUNCA vuelven al navegador: el servidor llama a las APIs y renueva
       los permisos con el refresh_token cuando caducan.
     · ACCESO               → cada negocio entra con un CÓDIGO DE ACCESO.
       El código se cambia por una sesión larga (1 año) en ese dispositivo.
     · PUBLICACIÓN          → las mismas rutas que publicador-worker.js
       (/programar, /agenda, /subir, /publicar, /estadisticas), pero por
       negocio y con los tokens de la base. Cron cada 5 min.

   Las llamadas a las redes son las de conectores/redes.js (compartidas con
   publicador-worker.js). Guía de despliegue: docs/SERVIDOR-CHISPA.md.

   ESTADO: probado en local con un simulador (pruebas/servidor-simulador.cjs)
   que imita D1 con SQLite y a Google/Meta/TikTok con respuestas falsas.
   SIN PROBAR contra las redes de verdad (no hay app aprobada todavía).

   Enlaces (bindings) y secretos — ver wrangler-api.toml:
     DB                      base D1 (se crean las tablas solas la 1.ª vez)
     MEDIOS (opcional)       bucket R2 para fotos y vídeos que las redes descargan
     CLAVE_CIFRADO   secreto  32 bytes en base64 (openssl rand -base64 32)
     ADMIN_CLAVE     secreto  para dar de alta negocios (cabecera X-Chispa-Admin)
     GOOGLE_CLIENT_ID (var, público) / GOOGLE_CLIENT_SECRET (secreto)   (Google y YouTube)
     META_APP_ID / META_APP_SECRET [/ META_CONFIG_ID]
     TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET
     URL_BASE        var      https://chispa-api.<cuenta>.workers.dev
     PANEL_URL       var      https://solers-es.github.io/chispa-demo/
     ORIGENES        var      orígenes permitidos, separados por comas
     MEDIA_PUBLICA   var      URL pública del bucket R2 (si hay MEDIOS)

   Rutas (todas devuelven JSON):
     GET    /salud                         público: {ok, version}
     POST   /sesion   {negocio, codigo}    → {sesion, negocio, nombre, rol, esAdministrador}
     GET    /yo                            → {negocio, nombre, rol, esAdministrador}
     DELETE /sesion                        cierra este dispositivo
     DELETE /sesiones                      (dueño) cierra TODOS los dispositivos
     POST   /enlace                        (dueño) código de 15 min y un solo uso para otro móvil
     GET    /estado/:doc[?v=N]             → {version, datos, actualizado} | {sinCambios:true, version}
     PUT    /estado/:doc {base, datos}     → {version} | 409 {conflicto:true, version, datos}
     GET    /conexiones                    → [{red, cuenta, estado, detalle, actualizado}] (SIN tokens)
     POST   /conectar/:red {volver?}       (dueño) → {url} de Google/Meta/TikTok
     GET    /oauth/vuelta?code&state       público: lo llama la red y vuelve al panel
     DELETE /conexiones/:red               (dueño) desconecta
     POST   /conexiones/meta/pagina {id}   (dueño) elige la página de Facebook
     POST   /api/:red {metodo,url,cuerpo}  el servidor llama a la API con el token (lista blanca de dominios)
     POST   /programar · DELETE /programar/:id · GET /agenda · POST /subir · POST /publicar · GET /estadisticas
     POST   /admin/negocios {id, nombre}   (X-Chispa-Admin) → {codigo} del dueño
     GET    /admin/negocios                (X-Chispa-Admin) → lista
     Alta sola, /planes, /cuenta, /pago/*, /stripe/webhook, /admin/clientes: ver suscripciones.js
     --- IA (Workers AI, plan gratuito; ver conectores/ia.js) ---
     POST   /ia/imagen {texto,titulo,sector,prompt?,cantidad?}  → {urls:[…/medio/ID.jpg]}
     POST   /ia/voz {texto, idioma}        → {audio (data:), palabras:[{t,i,f}], duracion}
     POST   /ia/texto {accion: escribir|reaprovechar|traducir, …}
     POST   /ia/video                      HUECO: 501 hasta elegir proveedor (docs/VIDEO-IA.md)
     GET    /ia/uso                        lo gastado hoy y los límites
     GET    /medio/:id.jpg                 público: imagen generada (las redes la descargan)
     --- API pública y MCP (ver conectores/api-publica.js y docs/API-CHISPA.md) ---
     GET    /claves · POST /claves {nombre} · DELETE /claves/:id   (dueño) claves de API
     /v1/…                                 con «Authorization: Bearer chispa_…» (o la sesión)
     POST   /mcp                           servidor MCP para Claude y otros agentes
   ===================================================================== */
import { publicarEn, estadisticas } from "./redes.js";
import * as IA from "./ia.js";
import { crearApiPublica } from "./api-publica.js";
// Alta sola, prueba, planes, límites y pago (trabajador H): todo en su módulo
import { rutasPublicas, rutasConSesion, antesDeRuta, asegurarTablasSuscripciones, puedePublicar } from "./suscripciones.js";

const VERSION = "2";
const MAX_ESTADO = 1_500_000; // D1 admite filas de hasta 2 MB
const DIA = 864e5;
const SESION_DIAS = 365;

/* Redes que se conectan por OAuth y qué códigos de publicación cubre cada una */
const REDES = {
  google: { nombre: "Google (ficha del negocio)", publica: ["gbp"] },
  youtube: { nombre: "YouTube", publica: ["yt"] },
  meta: { nombre: "Instagram y Facebook", publica: ["igf", "igs", "fb"] },
  tiktok: { nombre: "TikTok", publica: ["tt"] },
};
const RED_DE = { gbp: "google", yt: "youtube", igf: "meta", igs: "meta", fb: "meta", tt: "tiktok" };

/* Dominios a los que /api/:red puede llamar (evita que el servidor sirva de puente a cualquier sitio) */
const LISTA_BLANCA = {
  google: ["mybusiness.googleapis.com", "mybusinessaccountmanagement.googleapis.com", "mybusinessbusinessinformation.googleapis.com", "businessprofileperformance.googleapis.com", "mybusinessnotifications.googleapis.com"],
  youtube: ["www.googleapis.com", "youtubeanalytics.googleapis.com"],
  meta: ["graph.facebook.com"],
  tiktok: ["open.tiktokapis.com"],
};

const GRAPH = "https://graph.facebook.com/v21.0";
const ALCANCES = {
  google: "openid email https://www.googleapis.com/auth/business.manage",
  youtube: "openid email https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly",
  meta: "pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,business_management",
  tiktok: "user.info.basic,video.publish,video.upload",
};

/* ---------------- tablas (se crean solas) ---------------- */
const ESQUEMA = [
  "CREATE TABLE IF NOT EXISTS negocios (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, creado INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS codigos (huella TEXT PRIMARY KEY, negocio TEXT NOT NULL, rol TEXT NOT NULL, nota TEXT, un_uso INTEGER NOT NULL DEFAULT 0, caduca INTEGER, creado INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sesiones (huella TEXT PRIMARY KEY, negocio TEXT NOT NULL, rol TEXT NOT NULL, caduca INTEGER NOT NULL, creado INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS estado (negocio TEXT NOT NULL, doc TEXT NOT NULL, version INTEGER NOT NULL, datos TEXT NOT NULL, actualizado INTEGER NOT NULL, PRIMARY KEY (negocio, doc))",
  "CREATE TABLE IF NOT EXISTS conexiones (negocio TEXT NOT NULL, red TEXT NOT NULL, cifrado TEXT NOT NULL, iv TEXT NOT NULL, cuenta TEXT, detalle TEXT, estado TEXT NOT NULL, actualizado INTEGER NOT NULL, PRIMARY KEY (negocio, red))",
  "CREATE TABLE IF NOT EXISTS oauth_estados (estado TEXT PRIMARY KEY, negocio TEXT NOT NULL, red TEXT NOT NULL, verificador TEXT, volver TEXT, caduca INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS agenda (negocio TEXT NOT NULL, id TEXT NOT NULL, datos TEXT NOT NULL, cuando INTEGER NOT NULL, estado TEXT NOT NULL, PRIMARY KEY (negocio, id))",
  "CREATE INDEX IF NOT EXISTS agenda_pendiente ON agenda (estado, cuando)",
  "CREATE TABLE IF NOT EXISTS api_claves (id TEXT PRIMARY KEY, huella TEXT NOT NULL UNIQUE, negocio TEXT NOT NULL, nombre TEXT, prefijo TEXT NOT NULL, creado INTEGER NOT NULL, usado INTEGER, revocada INTEGER NOT NULL DEFAULT 0)",
  ...IA.ESQUEMA_IA,
];
let tablasListas = false;
async function asegurarTablas(env) {
  if (tablasListas) return;
  await env.DB.batch(ESQUEMA.map((s) => env.DB.prepare(s)));
  tablasListas = true;
}

/* ---------------- utilidades ---------------- */
class Fallo extends Error { constructor(msg, status = 400, extra) { super(msg); this.status = status; this.extra = extra; } }
const ahora = () => Date.now();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (buf) => b64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const azar = (n) => crypto.getRandomValues(new Uint8Array(n));
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin 0/O ni 1/I: se dicta bien por teléfono
function codigoNuevo() { // 12 caracteres = 60 bits, en tres grupos: ABCD-EFGH-JKLM
  const a = azar(12); let s = "";
  for (let i = 0; i < 12; i++) s += ALFABETO[a[i] % 32] + (i === 3 || i === 7 ? "-" : "");
  return s;
}
const normalizarCodigo = (c) => String(c || "").toUpperCase().replace(/[^0-9A-Z]/g, "");

let claveCache = null, claveHmacCache = null;
async function claveAes(env) {
  if (claveCache) return claveCache;
  if (!env.CLAVE_CIFRADO) throw new Fallo("Falta el secreto CLAVE_CIFRADO en el servidor", 500);
  const raw = deB64(env.CLAVE_CIFRADO);
  if (raw.length !== 32) throw new Fallo("CLAVE_CIFRADO debe ser de 32 bytes en base64 (openssl rand -base64 32)", 500);
  claveCache = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  return claveCache;
}
/* huella de códigos y sesiones: HMAC-SHA-256 con una clave derivada (si roban la base, no sirven) */
async function huella(env, texto) {
  if (!claveHmacCache) {
    const raw = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("chispa-huella:" + (env.CLAVE_CIFRADO || ""))));
    claveHmacCache = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  }
  return b64url(await crypto.subtle.sign("HMAC", claveHmacCache, new TextEncoder().encode(texto)));
}
async function cifrar(env, obj, aad) {
  const iv = azar(12);
  const c = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) }, await claveAes(env), new TextEncoder().encode(JSON.stringify(obj)));
  return { cifrado: b64(c), iv: b64(iv) };
}
async function descifrar(env, fila, aad) {
  const p = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(fila.iv), additionalData: new TextEncoder().encode(aad) }, await claveAes(env), deB64(fila.cifrado));
  return JSON.parse(new TextDecoder().decode(p));
}

function origenes(env) { return String(env.ORIGENES || "https://solers-es.github.io").split(",").map((s) => s.trim()).filter(Boolean); }
function cabecerasCors(req, env) {
  const o = req.headers.get("Origin") || "", ok = origenes(env);
  return {
    "Access-Control-Allow-Origin": ok.includes(o) ? o : ok[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Chispa-Clave, X-Chispa-Admin, Stripe-Signature",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
const urlBase = (env, req) => (env.URL_BASE || new URL(req.url).origin).replace(/\/$/, "");
const urlVuelta = (env, req) => urlBase(env, req) + "/oauth/vuelta";

async function leerJson(req) { try { return await req.json(); } catch (e) { throw new Fallo("El cuerpo no es JSON válido"); } }

/* ---------------- sesiones ---------------- */
function tokenDe(req) {
  const a = req.headers.get("Authorization") || "";
  if (/^Bearer /i.test(a)) return a.slice(7).trim();
  const q = new URL(req.url).searchParams;
  return req.headers.get("X-Chispa-Clave") || q.get("s") || q.get("clave") || "";
}
const PREFIJO_CLAVE = "chispa_";
async function sesionDe(req, env) {
  const t = tokenDe(req);
  if (!t) throw new Fallo("Hace falta entrar con el código de acceso", 401);
  if (t.startsWith(PREFIJO_CLAVE)) { // clave de API (n8n, Make, MCP…): solo vale para /v1 y /mcp
    const k = await env.DB.prepare("SELECT k.id, k.negocio, k.usado, n.nombre FROM api_claves k JOIN negocios n ON n.id = k.negocio WHERE k.huella = ? AND k.revocada = 0").bind(await huella(env, "k:" + t)).first();
    if (!k) throw new Fallo("Clave de API incorrecta o revocada", 401);
    if (!k.usado || ahora() - k.usado > 36e5) await env.DB.prepare("UPDATE api_claves SET usado = ? WHERE id = ?").bind(ahora(), k.id).run();
    return { negocio: k.negocio, rol: "api", nombre: k.nombre, esAdministrador: false, api: true, claveId: k.id, token: t };
  }
  const f = await env.DB.prepare("SELECT s.negocio, s.rol, s.caduca, n.nombre FROM sesiones s JOIN negocios n ON n.id = s.negocio WHERE s.huella = ?").bind(await huella(env, "s:" + t)).first();
  if (!f || f.caduca < ahora()) throw new Fallo("La sesión ha caducado: vuelve a entrar con el código", 401);
  return { negocio: f.negocio, rol: f.rol, nombre: f.nombre, esAdministrador: f.rol === "dueno", token: t };
}
function soloDueno(s) { if (!s.esAdministrador) throw new Fallo("Solo el dueño del negocio puede hacer esto", 403); }
async function crearSesion(env, negocio, rol) {
  const t = b64url(azar(32));
  await env.DB.prepare("INSERT INTO sesiones (huella, negocio, rol, caduca, creado) VALUES (?, ?, ?, ?, ?)").bind(await huella(env, "s:" + t), negocio, rol, ahora() + SESION_DIAS * DIA, ahora()).run();
  return t;
}
async function entrar(env, cuerpo) {
  const negocio = String(cuerpo.negocio || "").trim().toLowerCase(), cod = normalizarCodigo(cuerpo.codigo);
  if (!negocio || cod.length < 8) throw new Fallo("Escribe el negocio y el código de acceso");
  const h = await huella(env, "c:" + negocio + ":" + cod);
  const c = await env.DB.prepare("SELECT c.rol, c.un_uso, c.caduca, n.nombre FROM codigos c JOIN negocios n ON n.id = c.negocio WHERE c.huella = ? AND c.negocio = ?").bind(h, negocio).first();
  if (!c || (c.caduca && c.caduca < ahora())) throw new Fallo("Código de acceso incorrecto o caducado", 401);
  if (c.un_uso) await env.DB.prepare("DELETE FROM codigos WHERE huella = ?").bind(h).run();
  const sesion = await crearSesion(env, negocio, c.rol);
  return { sesion, negocio, nombre: c.nombre, rol: c.rol, esAdministrador: c.rol === "dueno" };
}
async function guardarCodigo(env, negocio, rol, { unUso = false, minutos = 0, nota = "" } = {}) {
  const codigo = codigoNuevo();
  await env.DB.prepare("INSERT INTO codigos (huella, negocio, rol, nota, un_uso, caduca, creado) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(await huella(env, "c:" + negocio + ":" + normalizarCodigo(codigo)), negocio, rol, nota, unUso ? 1 : 0, minutos ? ahora() + minutos * 60e3 : null, ahora()).run();
  return codigo;
}

/* ---------------- estado con versión ---------------- */
function docValido(d) { if (!/^[a-z0-9_-]{1,40}$/.test(d)) throw new Fallo("Nombre de documento no válido"); return d; }
async function leerEstado(env, negocio, doc, vCliente) {
  const f = await env.DB.prepare("SELECT version, datos, actualizado FROM estado WHERE negocio = ? AND doc = ?").bind(negocio, doc).first();
  if (!f) return { version: 0, datos: null, actualizado: null };
  if (vCliente != null && Number(vCliente) === f.version) return { sinCambios: true, version: f.version };
  // se devuelve el texto tal cual (sin JSON.parse + JSON.stringify) para gastar poca CPU: el plan gratuito da 10 ms
  return { __crudo: '{"version":' + f.version + ',"actualizado":' + f.actualizado + ',"datos":' + f.datos + "}" };
}
async function escribirEstado(env, negocio, doc, cuerpo) {
  const base = Number(cuerpo.base) || 0;
  if (cuerpo.datos === undefined) throw new Fallo("Faltan los datos");
  const texto = JSON.stringify(cuerpo.datos);
  if (texto.length > MAX_ESTADO) throw new Fallo("Los datos ocupan demasiado (" + Math.round(texto.length / 1024) + " KB; máximo " + Math.round(MAX_ESTADO / 1024) + " KB)", 413);
  const r = base === 0
    ? await env.DB.prepare("INSERT INTO estado (negocio, doc, version, datos, actualizado) VALUES (?, ?, 1, ?, ?) ON CONFLICT (negocio, doc) DO NOTHING").bind(negocio, doc, texto, ahora()).run()
    : await env.DB.prepare("UPDATE estado SET version = version + 1, datos = ?, actualizado = ? WHERE negocio = ? AND doc = ? AND version = ?").bind(texto, ahora(), negocio, doc, base).run();
  if (r.meta && r.meta.changes === 1) return { version: base + 1 };
  // Alguien guardó antes (otro móvil u otra pestaña): se devuelve lo que hay para que el navegador lo junte
  const actual = await env.DB.prepare("SELECT version, datos FROM estado WHERE negocio = ? AND doc = ?").bind(negocio, doc).first();
  throw new Fallo("Hay cambios más nuevos en otro dispositivo", 409, { conflicto: true, version: actual ? actual.version : 0, datos: actual ? JSON.parse(actual.datos) : null });
}

/* ---------------- conexiones (tokens cifrados) ---------------- */
async function guardarConexion(env, negocio, red, secreto, cuenta, detalle, estado = "conectada") {
  const c = await cifrar(env, secreto, negocio + "|" + red);
  await env.DB.prepare("INSERT INTO conexiones (negocio, red, cifrado, iv, cuenta, detalle, estado, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
    "ON CONFLICT (negocio, red) DO UPDATE SET cifrado = excluded.cifrado, iv = excluded.iv, cuenta = excluded.cuenta, detalle = excluded.detalle, estado = excluded.estado, actualizado = excluded.actualizado")
    .bind(negocio, red, c.cifrado, c.iv, cuenta || "", JSON.stringify(detalle || {}), estado, ahora()).run();
}
async function listarConexiones(env, negocio) {
  const { results } = await env.DB.prepare("SELECT red, cuenta, detalle, estado, actualizado FROM conexiones WHERE negocio = ?").bind(negocio).all();
  return (results || []).map((f) => ({ red: f.red, nombre: (REDES[f.red] || {}).nombre || f.red, publica: (REDES[f.red] || {}).publica || [], cuenta: f.cuenta, estado: f.estado, detalle: JSON.parse(f.detalle || "{}"), actualizado: f.actualizado }));
}
async function marcarCaducada(env, negocio, red, motivo) {
  await env.DB.prepare("UPDATE conexiones SET estado = 'caducada', detalle = json_set(COALESCE(detalle, '{}'), '$.motivo', ?), actualizado = ? WHERE negocio = ? AND red = ?").bind(motivo, ahora(), negocio, red).run();
}

/* Devuelve los tokens descifrados, renovándolos si caducan en menos de 5 minutos */
async function tokensDe(env, negocio, red) {
  const f = await env.DB.prepare("SELECT cifrado, iv, cuenta, detalle, estado FROM conexiones WHERE negocio = ? AND red = ?").bind(negocio, red).first();
  if (!f) throw new Fallo((REDES[red] || {}).nombre + " sin conectar: pulsa «Conectar» en Conexiones", 409);
  const t = await descifrar(env, f, negocio + "|" + red);
  const detalle = JSON.parse(f.detalle || "{}");
  if (t.caduca && t.caduca - ahora() < 5 * 60e3) {
    try {
      const n = await renovar(env, red, t);
      Object.assign(t, n);
      await guardarConexion(env, negocio, red, t, f.cuenta, detalle);
    } catch (e) {
      await marcarCaducada(env, negocio, red, String(e.message || e));
      throw new Fallo((REDES[red] || {}).nombre + ": el permiso ha caducado, hay que volver a conectar (" + (e.message || e) + ")", 409);
    }
  }
  return { t, detalle };
}
async function renovar(env, red, t) {
  if (!t.refresh) throw new Error("no hay refresh_token");
  if (red === "google" || red === "youtube") {
    const j = await formulario("https://oauth2.googleapis.com/token", { client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: t.refresh, grant_type: "refresh_token" });
    if (!j.access_token) throw new Error(j.error_description || j.error || "Google no renovó el permiso");
    return { access: j.access_token, caduca: ahora() + (j.expires_in || 3600) * 1000 };
  }
  if (red === "tiktok") {
    const j = await formulario("https://open.tiktokapis.com/v2/oauth/token/", { client_key: env.TIKTOK_CLIENT_KEY, client_secret: env.TIKTOK_CLIENT_SECRET, refresh_token: t.refresh, grant_type: "refresh_token" });
    if (!j.access_token) throw new Error(j.error_description || j.error || "TikTok no renovó el permiso");
    return { access: j.access_token, caduca: ahora() + (j.expires_in || 86400) * 1000, refresh: j.refresh_token || t.refresh };
  }
  throw new Error("Esta red no se renueva así");
}
async function formulario(url, campos) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(campos) });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok && !j.error) j.error = "HTTP " + r.status;
  return j;
}
async function getJson(url, token) {
  const r = await fetch(url, token ? { headers: { Authorization: "Bearer " + token } } : {});
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok || j.error) throw new Error((j.error && (j.error.message || j.error_description || j.error)) || "HTTP " + r.status);
  return j;
}

/* Credenciales con los nombres que entiende redes.js, para un código de publicación (igf, fb, tt, yt, gbp) */
async function credPara(env, negocio, codigoRed, cache = {}) {
  const red = RED_DE[codigoRed];
  if (!red) throw new Fallo("Red desconocida: " + codigoRed);
  if (!cache[red]) cache[red] = await tokensDe(env, negocio, red);
  const { t, detalle } = cache[red];
  const base = { RESERVAS_URL: env.RESERVAS_URL, MEDIA_PUBLICA: env.MEDIA_PUBLICA, TIKTOK_PRIVACIDAD: env.TIKTOK_PRIVACIDAD };
  if (red === "meta") {
    const p = (t.paginas || []).find((x) => x.id === t.elegida) || (t.paginas || [])[0];
    if (!p) throw new Fallo("Meta conectado pero sin página de Facebook: crea o elige una página", 409);
    return { ...base, META_TOKEN: p.token, FB_PAGE_ID: p.id, IG_USER_ID: p.ig || "" };
  }
  if (red === "tiktok") return { ...base, TIKTOK_TOKEN: t.access };
  if (red === "youtube") return { ...base, GOOGLE_ACCESS: t.access, YT_CANAL: detalle.canal || "" };
  if (!detalle.local) { // aún sin ficha (p. ej. Google no había aprobado la API): se vuelve a mirar
    Object.assign(detalle, await descubrirFicha(t.access));
    if (detalle.local) await env.DB.prepare("UPDATE conexiones SET detalle = ? WHERE negocio = ? AND red = 'google'").bind(JSON.stringify(detalle), negocio).run();
    else throw new Fallo(detalle.aviso || AVISO_GBP, 409);
  }
  return { ...base, GOOGLE_ACCESS: t.access, GBP_CUENTA: detalle.cuentaGbp || "", GBP_LOCAL: detalle.local || "" };
}

/* ---------------- OAuth: inicio ---------------- */
async function inicioOAuth(req, env, s, red, cuerpo) {
  if (!REDES[red]) throw new Fallo("Red desconocida: " + red);
  const estado = b64url(azar(24));
  let verificador = null;
  const vuelta = urlVuelta(env, req);
  let volver = String(cuerpo.volver || env.PANEL_URL || "");
  if (!origenes(env).some((o) => volver.startsWith(o + "/") || volver === o)) volver = env.PANEL_URL || origenes(env)[0] + "/";
  let url;
  if (red === "google" || red === "youtube") {
    if (!env.GOOGLE_CLIENT_ID) throw new Fallo("Falta GOOGLE_CLIENT_ID en el servidor", 500);
    verificador = b64url(azar(32));
    const reto = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador)));
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID, redirect_uri: vuelta, response_type: "code", scope: ALCANCES[red],
      access_type: "offline", prompt: "consent", include_granted_scopes: "true", state: estado,
      code_challenge: reto, code_challenge_method: "S256",
    });
  } else if (red === "meta") {
    if (!env.META_APP_ID) throw new Fallo("Falta META_APP_ID en el servidor", 500);
    const q = { client_id: env.META_APP_ID, redirect_uri: vuelta, state: estado, response_type: "code" };
    if (env.META_CONFIG_ID) q.config_id = env.META_CONFIG_ID; else q.scope = ALCANCES.meta;
    url = "https://www.facebook.com/v21.0/dialog/oauth?" + new URLSearchParams(q);
  } else {
    if (!env.TIKTOK_CLIENT_KEY) throw new Fallo("Falta TIKTOK_CLIENT_KEY en el servidor", 500);
    url = "https://www.tiktok.com/v2/auth/authorize/?" + new URLSearchParams({ client_key: env.TIKTOK_CLIENT_KEY, scope: ALCANCES.tiktok, response_type: "code", redirect_uri: vuelta, state: estado });
  }
  await env.DB.prepare("DELETE FROM oauth_estados WHERE caduca < ?").bind(ahora()).run();
  await env.DB.prepare("INSERT INTO oauth_estados (estado, negocio, red, verificador, volver, caduca) VALUES (?, ?, ?, ?, ?, ?)").bind(estado, s.negocio, red, verificador, volver, ahora() + 15 * 60e3).run();
  return { url };
}

/* ---------------- OAuth: vuelta ---------------- */
async function vueltaOAuth(req, env) {
  const q = new URL(req.url).searchParams;
  const est = await env.DB.prepare("SELECT negocio, red, verificador, volver, caduca FROM oauth_estados WHERE estado = ?").bind(q.get("state") || "").first();
  if (!est || est.caduca < ahora()) return paginaSimple("El enlace ha caducado", "Vuelve a Chispa y pulsa «Conectar» otra vez.", 400);
  await env.DB.prepare("DELETE FROM oauth_estados WHERE estado = ?").bind(q.get("state")).run();
  const volver = (ok, msg) => Response.redirect(est.volver.replace(/#.*$/, "") + "#conectar-" + (ok ? "ok" : "error") + "-" + est.red + (msg ? "-" + encodeURIComponent(msg.slice(0, 140)) : ""), 302);
  if (q.get("error")) return volver(false, q.get("error_description") || q.get("error"));
  const code = q.get("code");
  if (!code) return volver(false, "La red no devolvió el permiso");
  try {
    const vuelta = urlVuelta(env, req);
    if (est.red === "google" || est.red === "youtube") await vueltaGoogle(env, est, code, vuelta);
    else if (est.red === "meta") await vueltaMeta(env, est, code, vuelta);
    else await vueltaTikTok(env, est, code, vuelta);
    return volver(true);
  } catch (e) {
    return volver(false, String(e.message || e));
  }
}
async function vueltaGoogle(env, est, code, vuelta) {
  const j = await formulario("https://oauth2.googleapis.com/token", { code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: vuelta, grant_type: "authorization_code", code_verifier: est.verificador || "" });
  if (!j.access_token) throw new Error(j.error_description || j.error || "Google no dio el permiso");
  if (!j.refresh_token) throw new Error("Google no dio permiso permanente (refresh_token). Quita el acceso de Chispa en myaccount.google.com/permissions y vuelve a conectar");
  const t = { access: j.access_token, refresh: j.refresh_token, caduca: ahora() + (j.expires_in || 3600) * 1000, alcances: j.scope || "" };
  const detalle = {};
  let cuenta = "";
  try { cuenta = (await getJson("https://openidconnect.googleapis.com/v1/userinfo", t.access)).email || ""; } catch (e) {}
  if (est.red === "google") {
    Object.assign(detalle, await descubrirFicha(t.access));
  } else {
    try {
      const ch = await getJson("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", t.access);
      const c = (ch.items || [])[0];
      if (c) { detalle.canal = c.id; detalle.nombreCanal = c.snippet && c.snippet.title; }
      else detalle.aviso = "Esta cuenta de Google no tiene canal de YouTube";
    } catch (e) { detalle.aviso = "Conectado, pero no se pudo leer el canal: " + (e.message || e); }
  }
  await guardarConexion(env, est.negocio, est.red, t, cuenta, detalle);
}
async function vueltaMeta(env, est, code, vuelta) {
  const corto = await getJson(GRAPH + "/oauth/access_token?" + new URLSearchParams({ client_id: env.META_APP_ID, client_secret: env.META_APP_SECRET, redirect_uri: vuelta, code }));
  // token de usuario de larga duración (~60 días)…
  const largo = await getJson(GRAPH + "/oauth/access_token?" + new URLSearchParams({ grant_type: "fb_exchange_token", client_id: env.META_APP_ID, client_secret: env.META_APP_SECRET, fb_exchange_token: corto.access_token }));
  // …y con él, los tokens de PÁGINA, que no caducan mientras nadie cambie la contraseña ni quite el permiso
  const ps = await getJson(GRAPH + "/me/accounts?" + new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100", access_token: largo.access_token }));
  const paginas = (ps.data || []).map((p) => ({ id: p.id, nombre: p.name, token: p.access_token, ig: p.instagram_business_account && p.instagram_business_account.id, igUsuario: p.instagram_business_account && p.instagram_business_account.username }));
  if (!paginas.length) throw new Error("Esa cuenta de Facebook no gestiona ninguna página");
  const elegida = (paginas.find((p) => p.ig) || paginas[0]).id;
  const t = { usuario: largo.access_token, usuarioCaduca: largo.expires_in ? ahora() + largo.expires_in * 1000 : null, paginas, elegida };
  await guardarConexion(env, est.negocio, "meta", t, cuentaMeta(t), detalleMeta(t));
}
/* La primera ficha de Google de la cuenta. Mientras Google no aprueba el acceso a la API de Business
   Profile la cuota es 0 y falla: se dice claro y se vuelve a intentar sola en cada uso. */
const AVISO_GBP = "Google todavía no ha aprobado el acceso a la API de la ficha (solicitud en revisión, 7-10 días hábiles). " +
  "La conexión ya está guardada: cuando Google lo apruebe, la ficha funcionará sola, sin volver a conectar.";
async function descubrirFicha(access) {
  try {
    const cs = await getJson("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", access);
    const c = (cs.accounts || [])[0];
    if (!c) return { aviso: "Esta cuenta de Google no gestiona ninguna ficha de negocio" };
    const ls = await getJson("https://mybusinessbusinessinformation.googleapis.com/v1/" + c.name + "/locations?readMask=name,title&pageSize=100", access);
    const l = (ls.locations || [])[0];
    if (!l) return { cuentaGbp: c.name, aviso: "La cuenta de Google no tiene fichas de negocio" };
    return { cuentaGbp: c.name, local: l.name, ficha: l.title, aviso: null };
  } catch (e) {
    const m = String(e.message || e);
    return { aviso: /quota|cuota|429|rate|RESOURCE_EXHAUSTED|has not been used|disabled|PERMISSION_DENIED/i.test(m) ? AVISO_GBP : "Conectado, pero aún no se pueden leer las fichas: " + m };
  }
}
const cuentaMeta = (t) => { const p = t.paginas.find((x) => x.id === t.elegida) || t.paginas[0]; return p.nombre + (p.igUsuario ? " · @" + p.igUsuario : ""); };
const detalleMeta = (t) => ({ elegida: t.elegida, paginas: t.paginas.map((p) => ({ id: p.id, nombre: p.nombre, instagram: p.igUsuario || null })), aviso: (t.paginas.find((x) => x.id === t.elegida) || {}).ig ? undefined : "La página elegida no tiene Instagram profesional enlazado" });
async function vueltaTikTok(env, est, code, vuelta) {
  const j = await formulario("https://open.tiktokapis.com/v2/oauth/token/", { client_key: env.TIKTOK_CLIENT_KEY, client_secret: env.TIKTOK_CLIENT_SECRET, code, grant_type: "authorization_code", redirect_uri: vuelta });
  if (!j.access_token) throw new Error(j.error_description || j.error || "TikTok no dio el permiso");
  const t = { access: j.access_token, refresh: j.refresh_token, caduca: ahora() + (j.expires_in || 86400) * 1000, refreshCaduca: j.refresh_expires_in ? ahora() + j.refresh_expires_in * 1000 : null, openId: j.open_id };
  let cuenta = "";
  try { const u = await getJson("https://open.tiktokapis.com/v2/user/info/?fields=display_name", t.access); cuenta = (u.data && u.data.user && u.data.user.display_name) || ""; } catch (e) {}
  await guardarConexion(env, est.negocio, "tiktok", t, cuenta, {});
}
function paginaSimple(titulo, texto, status = 200) {
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chispa</title><body style="font-family:system-ui;padding:24px;max-width:520px;margin:auto"><h2>' + e(titulo) + "</h2><p>" + e(texto) + "</p>", { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/* ---------------- /api/:red · el servidor llama con el token ---------------- */
async function proxyApi(env, s, red, cuerpo) {
  if (!LISTA_BLANCA[red]) throw new Fallo("Red desconocida: " + red);
  let u;
  try { u = new URL(String(cuerpo.url || "")); } catch (e) { throw new Fallo("Falta la dirección de la API"); }
  if (u.protocol !== "https:" || !LISTA_BLANCA[red].includes(u.hostname)) throw new Fallo("Esa dirección no está permitida para " + red, 403);
  if (red === "youtube" && u.hostname === "www.googleapis.com" && !/^\/(upload\/)?youtube\//.test(u.pathname)) throw new Fallo("Esa dirección no está permitida para youtube", 403);
  const metodo = String(cuerpo.metodo || "GET").toUpperCase();
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(metodo)) throw new Fallo("Método no permitido");
  const { t, detalle } = await tokensDe(env, s.negocio, red);
  const cab = { "Content-Type": "application/json" };
  if (red === "meta") {
    if (!u.searchParams.has("access_token")) {
      const p = (t.paginas || []).find((x) => x.id === t.elegida) || (t.paginas || [])[0];
      u.searchParams.set("access_token", cuerpo.token === "usuario" ? t.usuario : p.token);
    }
  } else cab.Authorization = "Bearer " + t.access;
  const r = await fetch(u.toString(), { method: metodo, headers: cab, body: metodo === "GET" || metodo === "DELETE" || cuerpo.cuerpo == null ? undefined : JSON.stringify(cuerpo.cuerpo) });
  let j; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) { j = { texto: txt.slice(0, 2000) }; }
  return { status: r.status, datos: j, detalle };
}

/* ---------------- agenda y publicación (como publicador-worker.js, por negocio) ---------------- */
async function subirR2(env, negocio, f) {
  if (!env.MEDIOS || !env.MEDIA_PUBLICA) throw new Fallo("El servidor no tiene almacén de fotos (R2) configurado", 501);
  const ext = (f.type.split("/")[1] || "bin").replace("jpeg", "jpg").replace(/;.*/, "");
  const clave = "m/" + negocio + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + "." + ext;
  await env.MEDIOS.put(clave, f.stream(), { httpMetadata: { contentType: f.type } });
  return env.MEDIA_PUBLICA.replace(/\/$/, "") + "/" + clave;
}
async function listarAgenda(env, negocio) {
  const { results } = await env.DB.prepare("SELECT datos FROM agenda WHERE negocio = ? ORDER BY cuando").bind(negocio).all();
  return (results || []).map((f) => JSON.parse(f.datos));
}
async function guardarItem(env, negocio, it) {
  await env.DB.prepare("INSERT INTO agenda (negocio, id, datos, cuando, estado) VALUES (?, ?, ?, ?, ?) ON CONFLICT (negocio, id) DO UPDATE SET datos = excluded.datos, cuando = excluded.cuando, estado = excluded.estado")
    .bind(negocio, it.id, JSON.stringify(it), new Date(it.cuando).getTime() || 0, it.estado).run();
}
async function leerItem(env, negocio, id) {
  const f = await env.DB.prepare("SELECT datos FROM agenda WHERE negocio = ? AND id = ?").bind(negocio, String(id)).first();
  return f ? JSON.parse(f.datos) : null;
}
async function publicarItem(env, negocio, it, cache) {
  it.res = it.res || {};
  const fallos = [];
  for (const red of it.redes || []) {
    if (it.res[red] === "publicada") continue;
    try {
      const esVideo = it.formato === "reel" || it.formato === "historia" || (it.medios || []).some((m) => /\.(mp4|webm|mov)(\?|$)/i.test(m));
      await publicarEn(await credPara(env, negocio, red, cache), red, { texto: it.texto, titulo: it.titulo, medios: it.medios || [], esVideo, formato: it.formato });
      it.res[red] = "publicada";
    } catch (e) { it.res[red] = "fallo"; fallos.push(red + ": " + (e.message || e)); }
  }
  it.estado = fallos.length ? "fallo" : "publicada";
  it.motivo = fallos.join(" · ");
  it.publicadaEn = new Date().toISOString();
  await guardarItem(env, negocio, it);
}
async function estadisticasNegocio(env, negocio) {
  const cred = {};
  for (const r of ["igf", "yt"]) { try { Object.assign(cred, await credPara(env, negocio, r)); } catch (e) {} }
  return estadisticas(cred);
}

/* ---------------- admin ---------------- */
function soloAdmin(req, env) {
  const a = req.headers.get("X-Chispa-Admin") || "";
  if (!env.ADMIN_CLAVE || a.length !== env.ADMIN_CLAVE.length || a !== env.ADMIN_CLAVE) throw new Fallo("Sin permiso de administración", 401);
}

/* ---------------- claves de API (se enseñan UNA vez; se guarda la huella) ---------------- */
async function crearClave(env, s, cuerpo) {
  soloDueno(s);
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM api_claves WHERE negocio = ? AND revocada = 0").bind(s.negocio).first();
  if (n && n.n >= 10) throw new Fallo("Máximo 10 claves activas por negocio: revoca alguna");
  const clave = PREFIJO_CLAVE + b64url(azar(24)), id = b64url(azar(9));
  const nombre = String(cuerpo.nombre || "Clave de API").slice(0, 60);
  await env.DB.prepare("INSERT INTO api_claves (id, huella, negocio, nombre, prefijo, creado, usado, revocada) VALUES (?, ?, ?, ?, ?, ?, NULL, 0)")
    .bind(id, await huella(env, "k:" + clave), s.negocio, nombre, clave.slice(0, 13) + "…", ahora()).run();
  return { id, nombre, clave, prefijo: clave.slice(0, 13) + "…", aviso: "Cópiala ahora: no se vuelve a enseñar. Si la pierdes, revócala y crea otra." };
}
async function listarClaves(env, s) {
  soloDueno(s);
  const { results } = await env.DB.prepare("SELECT id, nombre, prefijo, creado, usado FROM api_claves WHERE negocio = ? AND revocada = 0 ORDER BY creado DESC").bind(s.negocio).all();
  return { claves: results || [] };
}
const API_PUBLICA = crearApiPublica({ Fallo, leerJson, guardarItem, listarAgenda, leerItem, publicarItem, listarConexiones, urlBase,
  // lo creado por la API cuenta igual que lo programado desde el panel (límites del plan de suscripciones.js)
  comprobarPlan: (req, env, s) => antesDeRuta(req, env, { Fallo, huella, guardarCodigo, crearSesion, leerJson, soloAdmin }, s, "POST", "/programar", ["programar"]) });

/* ---------------- enrutador ---------------- */
async function atender(req, env) {
  const url = new URL(req.url), ruta = url.pathname.replace(/\/+$/, "") || "/", m = req.method;
  const partes = ruta.split("/").filter(Boolean).map(decodeURIComponent);

  if (m === "GET" && ruta === "/salud") return { ok: true, version: VERSION, ia: !!env.AI, redes: Object.keys(REDES).filter((r) => (r === "meta" ? env.META_APP_ID : r === "tiktok" ? env.TIKTOK_CLIENT_KEY : env.GOOGLE_CLIENT_ID)) };
  await asegurarTablas(env);
  await asegurarTablasSuscripciones(env);
  const ayuda = { Fallo, huella, guardarCodigo, crearSesion, leerJson, soloAdmin };
  const publica = await rutasPublicas(req, env, ayuda, m, ruta);
  if (publica !== undefined) return publica;
  if (m === "GET" && ruta === "/oauth/vuelta") return vueltaOAuth(req, env);
  if (m === "POST" && ruta === "/sesion") return entrar(env, await leerJson(req));
  if (m === "GET" && partes[0] === "medio" && partes.length === 2) return IA.servirMedio(env, partes[1]);

  if (partes[0] === "admin") {
    soloAdmin(req, env);
    if (m === "GET" && ruta === "/admin/negocios") return { negocios: (await env.DB.prepare("SELECT id, nombre, creado FROM negocios ORDER BY creado").all()).results || [] };
    if (m === "POST" && ruta === "/admin/negocios") {
      const c = await leerJson(req), id = String(c.id || "").trim().toLowerCase();
      if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new Fallo("El id del negocio va en minúsculas, números y guiones (ej. el-paraiso)");
      await env.DB.prepare("INSERT INTO negocios (id, nombre, creado) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET nombre = excluded.nombre").bind(id, String(c.nombre || id), ahora()).run();
      return { negocio: id, codigo: await guardarCodigo(env, id, c.rol === "equipo" ? "equipo" : "dueno", { nota: "alta" }) };
    }
    throw new Fallo("No existe", 404);
  }

  const s = await sesionDe(req, env);
  const deCuenta = await rutasConSesion(req, env, ayuda, s, m, ruta);
  if (deCuenta !== undefined) return deCuenta;
  await antesDeRuta(req, env, ayuda, s, m, ruta, partes); // límites del plan (lanza 402/429)
  if (ruta === "/mcp") return API_PUBLICA.mcp(req, env, s);
  if (partes[0] === "v1") return API_PUBLICA.v1(req, env, s, ruta, partes, url);
  if (s.api) throw new Fallo("Una clave de API solo vale para /v1/… y /mcp", 403);
  if (partes[0] === "ia") {
    if (m === "GET" && ruta === "/ia/uso") return IA.usoHoy(env, s.negocio);
    if (m === "POST" && ruta === "/ia/imagen") return IA.generarImagen(env, s.negocio, await leerJson(req), urlBase(env, req));
    if (m === "POST" && ruta === "/ia/voz") return { __crudo: await IA.generarVoz(env, s.negocio, await leerJson(req)) };
    if (m === "POST" && ruta === "/ia/video") return IA.generarVideo(env, s.negocio, await leerJson(req).catch(() => ({})));
    if (m === "POST" && ruta === "/ia/texto") {
      const c = await leerJson(req), q = { ...c, negocio: c.negocio || s.nombre };
      if (c.accion === "reaprovechar") return IA.reaprovechar(env, s.negocio, q);
      if (c.accion === "traducir") return IA.traducir(env, s.negocio, q);
      if (c.accion === "escribir") return IA.escribir(env, s.negocio, q);
      throw new Fallo("accion: escribir | reaprovechar | traducir");
    }
    throw new Fallo("No existe", 404);
  }
  if (ruta === "/claves") { if (m === "GET") return listarClaves(env, s); if (m === "POST") return crearClave(env, s, await leerJson(req).catch(() => ({}))); }
  if (m === "DELETE" && partes[0] === "claves" && partes.length === 2) {
    soloDueno(s);
    await env.DB.prepare("UPDATE api_claves SET revocada = 1 WHERE negocio = ? AND id = ?").bind(s.negocio, partes[1]).run();
    return { ok: true };
  }
  if (m === "GET" && ruta === "/yo") return { negocio: s.negocio, nombre: s.nombre, rol: s.rol, esAdministrador: s.esAdministrador };
  if (m === "DELETE" && ruta === "/sesion") { await env.DB.prepare("DELETE FROM sesiones WHERE huella = ?").bind(await huella(env, "s:" + s.token)).run(); return { ok: true }; }
  if (m === "DELETE" && ruta === "/sesiones") { soloDueno(s); await env.DB.prepare("DELETE FROM sesiones WHERE negocio = ?").bind(s.negocio).run(); return { ok: true }; }
  if (m === "POST" && ruta === "/enlace") {
    soloDueno(s);
    const c = await leerJson(req).catch(() => ({}));
    return { negocio: s.negocio, codigo: await guardarCodigo(env, s.negocio, c.rol === "dueno" ? "dueno" : "equipo", { unUso: true, minutos: 15, nota: "enlace" }), minutos: 15 };
  }
  if (partes[0] === "estado" && partes.length === 2) {
    const doc = docValido(partes[1]);
    if (m === "GET") return leerEstado(env, s.negocio, doc, url.searchParams.get("v"));
    if (m === "PUT") return escribirEstado(env, s.negocio, doc, await leerJson(req));
  }
  if (m === "GET" && ruta === "/conexiones") return { conexiones: await listarConexiones(env, s.negocio), disponibles: REDES };
  if (m === "POST" && partes[0] === "conectar" && partes.length === 2) { soloDueno(s); return inicioOAuth(req, env, s, partes[1], await leerJson(req).catch(() => ({}))); }
  if (m === "DELETE" && partes[0] === "conexiones" && partes.length === 2) { soloDueno(s); await env.DB.prepare("DELETE FROM conexiones WHERE negocio = ? AND red = ?").bind(s.negocio, partes[1]).run(); return { ok: true }; }
  if (m === "POST" && ruta === "/conexiones/meta/pagina") {
    soloDueno(s);
    const c = await leerJson(req), { t } = await tokensDe(env, s.negocio, "meta");
    if (!(t.paginas || []).some((p) => p.id === String(c.id))) throw new Fallo("Esa página no está en la cuenta conectada");
    t.elegida = String(c.id);
    await guardarConexion(env, s.negocio, "meta", t, cuentaMeta(t), detalleMeta(t));
    return { ok: true, cuenta: cuentaMeta(t) };
  }
  if (m === "POST" && partes[0] === "api" && partes.length === 2) return proxyApi(env, s, partes[1], await leerJson(req));

  if (m === "POST" && ruta === "/programar") {
    const it = await leerJson(req);
    if (!it.id || !it.cuando || !Array.isArray(it.redes)) throw new Fallo("Faltan datos");
    const viejo = (await env.DB.prepare("SELECT datos FROM agenda WHERE negocio = ? AND id = ?").bind(s.negocio, String(it.id)).first()) || null;
    const v = viejo ? JSON.parse(viejo.datos) : {};
    await guardarItem(env, s.negocio, { ...v, ...it, id: String(it.id), estado: "programada", res: v.res || {} });
    return { ok: true };
  }
  if (m === "DELETE" && partes[0] === "programar" && partes.length === 2) { await env.DB.prepare("DELETE FROM agenda WHERE negocio = ? AND id = ?").bind(s.negocio, partes[1]).run(); return { ok: true }; }
  if (m === "GET" && ruta === "/agenda") return { items: await listarAgenda(env, s.negocio) };
  if (m === "POST" && ruta === "/subir") {
    const fd = await req.formData(), f = fd.get("archivo");
    if (!f || typeof f === "string") throw new Fallo("Falta el archivo");
    return { url: await subirR2(env, s.negocio, f) };
  }
  if (m === "POST" && ruta === "/publicar") {
    const fd = await req.formData(), f = fd.get("archivo"), red = String(fd.get("red") || "");
    const medio = f && typeof f !== "string" ? await subirR2(env, s.negocio, f) : null;
    const esVideo = !!(medio && /^video\//.test(f.type));
    const id = await publicarEn(await credPara(env, s.negocio, red), red, { texto: String(fd.get("texto") || ""), medios: medio ? [medio] : [], esVideo, formato: esVideo ? "reel" : "post" });
    return { ok: true, id };
  }
  if (m === "GET" && ruta === "/estadisticas") return estadisticasNegocio(env, s.negocio);
  throw new Fallo("No existe", 404);
}

export default {
  async fetch(req, env) {
    const cors = cabecerasCors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const r = await atender(req, env);
      if (r instanceof Response) return r;
      return new Response(r && r.__crudo ? r.__crudo : JSON.stringify(r), { headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    } catch (e) {
      const status = e && typeof e.status === "number" ? e.status : 500;
      const cuerpo = { error: String((e && e.message) || e), ...(e && e.extra) };
      return new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    }
  },

  // Cron: publica lo que ya toca, de todos los negocios
  async scheduled(event, env) {
    await asegurarTablas(env);
    const { results } = await env.DB.prepare("SELECT negocio, datos FROM agenda WHERE estado = 'programada' AND cuando <= ? ORDER BY cuando LIMIT 25").bind(ahora()).all();
    const caches = {};
    if (new Date().getUTCMinutes() < 5) { try { await IA.limpiarMedios(env); } catch (e) {} } // una vez por hora
    for (const f of results || []) {
      const it = JSON.parse(f.datos);
      if (!(await puedePublicar(env, f.negocio))) continue; // prueba terminada, cancelada o impago
      await publicarItem(env, f.negocio, it, (caches[f.negocio] = caches[f.negocio] || {}));
    }
  },
};

/* Solo para las pruebas locales (pruebas/servidor-simulador.cjs) */
export const _pruebas = { codigoNuevo, normalizarCodigo, credPara, tokensDe, REDES, RED_DE };
