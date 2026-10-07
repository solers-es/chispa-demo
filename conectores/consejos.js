/* =====================================================================
   Chispa · estadísticas por día: totales, comparación y CONSEJOS con
   los datos del propio negocio (código COMPARTIDO servidor + web)
   ---------------------------------------------------------------------
   Entrada: filas por red y día  {red, dia:"AAAA-MM-DD", seguidores,
   alcance, vistas, interacciones, visitas_perfil, clics_web, llamadas,
   como_llegar, reservas}  (lo que no da una red, ausente o null).
   Salida de resumen(): series ordenadas, totales de 7 días frente a los
   7 anteriores y una lista de consejos con su porqué (cifras propias).
   serieEjemplo() genera datos INVENTADOS, siempre con ejemplo:true.
   ===================================================================== */

export const REDES_M = {
  ig: { nm: "Instagram", ic: "📸", color: "#e1306c" },
  fb: { nm: "Facebook", ic: "📘", color: "#4267b2" },
  gbp: { nm: "Google (ficha)", ic: "📍", color: "#34a853" },
  yt: { nm: "YouTube", ic: "▶️", color: "#ff0000" },
  tt: { nm: "TikTok", ic: "🎵", color: "#25f4ee" },
};
export const CAMPOS = ["seguidores", "alcance", "vistas", "interacciones", "visitas_perfil", "clics_web", "llamadas", "como_llegar", "reservas"];
export const NOMBRE_CAMPO = { seguidores: "Seguidores", alcance: "Alcance", vistas: "Visualizaciones", interacciones: "Interacciones", visitas_perfil: "Visitas al perfil", clics_web: "Clics en la web", llamadas: "Llamadas", como_llegar: "«Cómo llegar»", reservas: "Reservas" };
const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function diaISO(t) { const d = new Date(t); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
const suma = (filas, c) => filas.reduce((a, f) => a + num(f[c]), 0);
function pct(a, b) { if (!b) return a ? 100 : 0; return Math.round(((a - b) / b) * 100); }
function fmt(n) { return Math.round(n).toLocaleString("es-ES"); }

/* Agrupa por red y ordena por día */
export function series(filas) {
  const out = {};
  for (const f of filas || []) (out[f.red] = out[f.red] || []).push(f);
  for (const r in out) out[r].sort((a, b) => (a.dia < b.dia ? -1 : 1));
  return out;
}

export function resumen(filas, extra = {}) {
  const S = series(filas), redes = Object.keys(S);
  const todos = [].concat(...redes.map((r) => S[r]));
  const dias = [...new Set(todos.map((f) => f.dia))].sort();
  const ult = dias.slice(-7), ant = dias.slice(-14, -7);
  const de = (lista) => todos.filter((f) => lista.includes(f.dia));
  const totales = {};
  for (const c of CAMPOS) {
    if (c === "seguidores") {
      // seguidores = el último valor de cada red (no se suman días)
      let hoy = 0, antes = 0, hay = false;
      for (const r of redes) {
        const conS = S[r].filter((f) => typeof f.seguidores === "number");
        if (!conS.length) continue;
        hay = true; hoy += conS[conS.length - 1].seguidores;
        const viejo = conS.filter((f) => f.dia <= (ant[ant.length - 1] || ult[0]));
        antes += (viejo.length ? viejo[viejo.length - 1] : conS[0]).seguidores;
      }
      if (hay) totales.seguidores = { ahora: hoy, antes, cambio: pct(hoy, antes), dif: hoy - antes };
      continue;
    }
    const a = suma(de(ult), c), b = suma(de(ant), c);
    if (todos.some((f) => typeof f[c] === "number")) totales[c] = { ahora: a, antes: b, cambio: pct(a, b), dif: a - b };
  }
  return { redes, dias, series: S, totales, consejos: consejos(S, totales, extra), ejemplo: todos.some((f) => f.ejemplo) };
}

/* Consejos: cada uno con su cifra. nivel: bien | ojo | idea */
export function consejos(S, totales, extra = {}) {
  const out = [];
  const t = totales || {};
  // 1. Tendencia de alcance o visualizaciones
  const base = t.alcance && (t.alcance.ahora || t.alcance.antes) ? ["alcance", t.alcance] : t.vistas && (t.vistas.ahora || t.vistas.antes) ? ["vistas", t.vistas] : null;
  if (base && base[1].antes) {
    const [c, v] = base;
    if (v.cambio <= -15) out.push({ nivel: "ojo", titulo: NOMBRE_CAMPO[c] + " a la baja (" + v.cambio + " %)", texto: "Esta semana " + fmt(v.ahora) + " frente a " + fmt(v.antes) + " la anterior. Publica al menos 3 veces esta semana y prueba un reel corto: es el formato que más alcance da a cuentas pequeñas." });
    else if (v.cambio >= 15) out.push({ nivel: "bien", titulo: NOMBRE_CAMPO[c] + " al alza (+" + v.cambio + " %)", texto: fmt(v.ahora) + " esta semana frente a " + fmt(v.antes) + ". Repite lo que publicaste estos días: el mismo formato y a la misma hora." });
  }
  // 2. Mejor día de la semana (por interacciones o vistas), con al menos 14 días de datos
  const metrica = Object.values(S).some((f) => f.some((x) => num(x.interacciones))) ? "interacciones" : "vistas";
  const porDia = [0, 0, 0, 0, 0, 0, 0], cuenta = [0, 0, 0, 0, 0, 0, 0];
  let nDias = 0;
  for (const r in S) for (const f of S[r]) { const d = new Date(f.dia + "T12:00:00Z").getUTCDay(); porDia[d] += num(f[metrica]); cuenta[d]++; nDias++; }
  if (nDias >= 14) {
    const medias = porDia.map((v, i) => (cuenta[i] ? v / cuenta[i] : 0));
    const orden = medias.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    const media = medias.reduce((a, b) => a + b, 0) / 7;
    if (orden[0][0] > media * 1.2) {
      const d1 = DIAS_SEMANA[orden[0][1]], d2 = DIAS_SEMANA[orden[1][1]], antes = DIAS_SEMANA[(orden[0][1] + 6) % 7];
      out.push({ nivel: "idea", titulo: "Tus días fuertes: " + d1 + " y " + d2, texto: "Son los días con más " + NOMBRE_CAMPO[metrica].toLowerCase() + " (un " + Math.round((orden[0][0] / (media || 1) - 1) * 100) + " % por encima de tu media). Deja programado lo importante para el " + antes + " por la tarde o la misma mañana del " + d1 + "." });
    }
  }
  // 3. Ficha de Google: gente que pide cómo llegar o llama
  if (t.como_llegar || t.llamadas) {
    const cl = (t.como_llegar || {}).ahora || 0, ll = (t.llamadas || {}).ahora || 0, web = (t.clics_web || {}).ahora || 0;
    if (cl + ll > 0) out.push({ nivel: "bien", titulo: fmt(cl + ll) + " personas con intención de venir esta semana", texto: "En tu ficha de Google: " + fmt(cl) + " pidieron «cómo llegar» y " + fmt(ll) + " te llamaron" + (web ? ", y " + fmt(web) + " entraron en tu web" : "") + ". Publica una novedad en la ficha cada semana y contesta todas las reseñas: Google lo tiene en cuenta para enseñarte en el mapa." });
  }
  // 4. Interacción frente a alcance (Instagram/Facebook)
  if (t.alcance && t.interacciones && t.alcance.ahora > 200) {
    const tasa = (t.interacciones.ahora / t.alcance.ahora) * 100;
    if (tasa < 2) out.push({ nivel: "ojo", titulo: "Te ven, pero interactúan poco (" + tasa.toFixed(1).replace(".", ",") + " %)", texto: "De " + fmt(t.alcance.ahora) + " personas alcanzadas, " + fmt(t.interacciones.ahora) + " interactuaron. Termina cada publicación con una pregunta fácil («¿Paella o fideuá?») y contesta los comentarios en la primera hora." });
    else if (tasa >= 5) out.push({ nivel: "bien", titulo: "Muy buena interacción (" + tasa.toFixed(1).replace(".", ",") + " %)", texto: "Por encima del 5 % es muy bueno para un negocio local. Aprovecha: pide que te etiqueten y comparte en historias lo que te mandan." });
  }
  // 5. Seguidores
  if (t.seguidores && t.seguidores.antes) {
    if (t.seguidores.dif > 0) out.push({ nivel: "bien", titulo: "+" + fmt(t.seguidores.dif) + " seguidores en 7 días", texto: "Ya sois " + fmt(t.seguidores.ahora) + " entre todas las redes conectadas." });
    else if (t.seguidores.dif < 0) out.push({ nivel: "ojo", titulo: fmt(t.seguidores.dif) + " seguidores en 7 días", texto: "Pierdes algo de seguidores. Suele pasar cuando se publica mucha promoción seguida: alterna con platos, equipo y clientes." });
  }
  // 6. Bandeja y reseñas (datos del propio servidor)
  if (extra.sinResponder > 0) out.push({ nivel: "ojo", titulo: extra.sinResponder + " mensaje" + (extra.sinResponder > 1 ? "s" : "") + " sin responder", texto: "Contestar rápido convierte: un mensaje de reserva contestado en menos de una hora casi siempre acaba en mesa. Están en «Comentarios y DMs», cada uno con su respuesta propuesta." });
  if (extra.notaMedia) out.push({ nivel: extra.notaMedia >= 4.5 ? "bien" : extra.notaMedia >= 4 ? "idea" : "ojo", titulo: "Nota media de tus reseñas: " + extra.notaMedia.toFixed(1).replace(".", ",") + " ★", texto: extra.notaMedia >= 4.5 ? "Excelente. Pide reseña a los clientes contentos al cobrar: un QR en la mesa funciona." : "Contesta todas, sobre todo las negativas, con calma y por su nombre: los que leen las reseñas miran cómo respondes." });
  if (!out.length) out.push({ nivel: "idea", titulo: "Aún hay pocos datos", texto: "Con una o dos semanas de datos Chispa te dirá qué días y qué formatos te funcionan mejor." });
  return out;
}

/* Datos INVENTADOS (marcados ejemplo:true) para enseñar el panel sin conexión.
   Deterministas: siempre salen iguales para el mismo día de hoy. */
export function serieEjemplo(dias = 28, hoy = Date.now()) {
  const filas = [];
  let s = 20261007;
  const azar = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const fuerza = [0.8, 0.7, 0.75, 0.85, 1.25, 1.45, 1.1]; // dom..sáb: viernes y sábado fuertes
  let segIg = 1206 - dias * 2, segFb = 890 - dias;
  for (let i = dias; i >= 1; i--) {
    const t = hoy - i * 864e5, d = new Date(t).getUTCDay(), k = fuerza[d] * (0.85 + azar() * 0.3) * (1 + (dias - i) * 0.006);
    segIg += Math.round(1 + azar() * 4); segFb += Math.round(azar() * 2);
    const dia = diaISO(t);
    filas.push({ red: "ig", dia, ejemplo: true, seguidores: segIg, alcance: Math.round(420 * k), vistas: Math.round(980 * k), interacciones: Math.round(31 * k), visitas_perfil: Math.round(38 * k), clics_web: Math.round(6 * k) });
    filas.push({ red: "fb", dia, ejemplo: true, seguidores: segFb, alcance: Math.round(160 * k), vistas: Math.round(260 * k), interacciones: Math.round(9 * k) });
    filas.push({ red: "gbp", dia, ejemplo: true, vistas: Math.round(210 * k), como_llegar: Math.round(11 * k), llamadas: Math.round(3 * k), clics_web: Math.round(7 * k), reservas: Math.round(1.5 * k) });
  }
  return filas;
}
