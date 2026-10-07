/* =====================================================================
   Chispa · BANDEJA, ESTADÍSTICAS por día, ANUNCIOS y AUTOMATIZACIONES
   en el panel del negocio (trabajador J)
   ---------------------------------------------------------------------
   Se carga como módulo AL FINAL de index.html (después de chispa-sync.js)
   y envuelve panel():
     · «Comentarios y DMs»  → bandeja real (servidor) o de EJEMPLO
     · «Anuncios»           → campaña en Meta (en pausa) / Google preparada
     · «Automatizaciones»   → reglas que ejecuta el servidor + avisos
     · «Estadísticas»       → añade arriba «Día a día» con gráfica y
                              consejos (lo demás es de chispa-agenda.js)
   Con servidor y sesión (ChispaSync.estado().modo === "servidor") todo va
   contra conectores/panel-real.js. Sin servidor, modo demostración: datos
   de EJEMPLO marcados y NADA se envía a ninguna red (y se dice).
   Las respuestas sugeridas y los consejos son el MISMO código que usa el
   servidor (conectores/respuestas.js y conectores/consejos.js).
   ===================================================================== */
import { sugerir, etiquetar, ETIQUETAS } from "./conectores/respuestas.js";
import { resumen, serieEjemplo, REDES_M, NOMBRE_CAMPO } from "./conectores/consejos.js";

(function () {
  "use strict";
  if (typeof window.panel !== "function" || typeof TABS === "undefined") return;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => (s == null ? "" : String(s)).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const aviso = (m) => { try { window.toast(m); } catch (e) {} };
  const js = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  const fmt = (n) => Math.round(n || 0).toLocaleString("es-ES");

  /* ---------------- modo ---------------- */
  const CS = () => window.ChispaSync;
  function enServidor() { try { const e = CS() && CS().estado(); return !!(e && e.modo === "servidor" && !e.pausado); } catch (e) { return false; } }
  function pedir(metodo, ruta, cuerpo) { return CS().pedir(metodo, ruta, cuerpo); }
  function fallo(e) { aviso("⚠️ " + (e && e.message ? e.message : "No se pudo")); }

  /* ---------------- demostración (solo en este navegador) ---------------- */
  const CLAVE = "chispa_panel_j_v1";
  let D = null;
  function demo() {
    if (D) return D;
    try { D = JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) { D = null; }
    if (!D || !Array.isArray(D.bandeja)) D = { bandeja: ejemplosBandeja(), anuncios: [], reglas: reglasIniciales(), avisos: [], registro: [] };
    return D;
  }
  function guardarDemo() { try { localStorage.setItem(CLAVE, JSON.stringify(D)); } catch (e) {} }
  function neg() { const n = (window.S && S.negocio) || {}; return { nombre: n.nombre || "tu negocio", reservas: n.reserva || "https://el-paraiso-eight.vercel.app/reservas.html", telefono: n.telefono || "", horario: n.horario || "", web: n.web || "" }; }
  function ejemplosBandeja() {
    const h = Date.now();
    const L = [
      { id: "ej:1", red: "ig", tipo: "comentario", autor: "@marta.palma", texto: "¿Abrís los domingos a mediodía?", contexto: "En tu publicación: Paella de los domingos 🥘", recibido: h - 20 * 60e3 },
      { id: "ej:2", red: "ig", tipo: "mensaje", autor: "Toni Ferrer", texto: "Hola! Quiero reservar para 8 personas el viernes a las 21h", contexto: "Mensaje directo", recibido: h - 55 * 60e3 },
      { id: "ej:3", red: "fb", tipo: "comentario", autor: "Carmen López", texto: "La paella estaba buenísima 😍", contexto: "En tu publicación: Menú del día", recibido: h - 3 * 36e5 },
      { id: "ej:4", red: "gbp", tipo: "resena", autor: "Peter Schmidt", nota: 5, texto: "Sehr leckeres Essen und super freundlich. Wir kommen wieder!", contexto: "Reseña en tu ficha de Google", recibido: h - 5 * 36e5 },
      { id: "ej:5", red: "gbp", tipo: "resena", autor: "Laura M.", nota: 2, texto: "Tardaron 40 minutos en traer los segundos y la carne llegó fría.", contexto: "Reseña en tu ficha de Google", recibido: h - 26 * 36e5 },
      { id: "ej:6", red: "yt", tipo: "comentario", autor: "Sergi", texto: "¿Cuánto cuesta el menú del día?", contexto: "Comentario en tu vídeo", recibido: h - 30 * 36e5 },
      { id: "ej:7", red: "ig", tipo: "comentario", autor: "@promo_followers_24", texto: "Free followers 👉 check my profile!!", contexto: "En tu publicación: Brunch del sábado", recibido: h - 32 * 36e5 },
      { id: "ej:8", red: "ig", tipo: "comentario", autor: "@joana.mallorca", texto: "CARTA", contexto: "En tu publicación: «Comenta CARTA y te la mandamos»", recibido: h - 10 * 60e3 },
    ];
    return L.map((e) => { const et = etiquetar(e); return { ...e, ejemplo: true, etiquetas: et, estado: et.includes("spam") ? "spam" : "nuevo", sugerencia: sugerir({ ...e, etiquetas: et }, neg()) }; });
  }
  function reglasIniciales() { return []; }

  /* =====================================================================
     BANDEJA
     ===================================================================== */
  const RED = { ig: ["📸", "Instagram"], fb: ["📘", "Facebook"], gbp: ["📍", "Google"], yt: ["▶️", "YouTube"], tt: ["🎵", "TikTok"] };
  const TIPO = { comentario: "Comentario", mensaje: "Mensaje directo", resena: "Reseña" };
  const F = { estado: "nuevo", tipo: "", red: "", etiqueta: "" };
  let BAND = null, cargandoB = false, errorB = "";
  function lista() { return enServidor() ? (BAND && BAND.elementos) || [] : demo().bandeja; }
  function cuandoTxt(t) {
    const m = Math.round((Date.now() - t) / 60e3);
    if (m < 1) return "ahora"; if (m < 60) return "hace " + m + " min";
    const h = Math.round(m / 60); if (h < 24) return "hace " + h + " h";
    const d = Math.round(h / 24); return d === 1 ? "ayer" : "hace " + d + " días";
  }
  function cargarBandeja() {
    if (!enServidor() || cargandoB) return;
    cargandoB = true;
    const q = new URLSearchParams(); if (F.estado && F.estado !== "todos") q.set("estado", F.estado); if (F.red) q.set("red", F.red); if (F.tipo) q.set("tipo", F.tipo); if (F.etiqueta) q.set("etiqueta", F.etiqueta);
    pedir("GET", "/bandeja?" + q).then((j) => { BAND = j; errorB = ""; }, (e) => { errorB = e.message; }).then(() => { cargandoB = false; if (TAB === "bandeja") pintar("bandeja"); else pintarNav(); });
  }
  function filtrada() {
    return lista().filter((e) => {
      if (enServidor()) return true; // el servidor ya filtra
      if (F.estado && F.estado !== "todos") { if (e.estado !== F.estado) return false; }
      if (F.red && e.red !== F.red) return false;
      if (F.tipo && e.tipo !== F.tipo) return false;
      if (F.etiqueta && !(e.etiquetas || []).includes(F.etiqueta)) return false;
      return true;
    }).sort((a, b) => b.recibido - a.recibido);
  }
  function sinResponder() {
    if (enServidor()) return BAND && BAND.porEstado ? BAND.porEstado.nuevo || 0 : 0;
    return demo().bandeja.filter((e) => e.estado === "nuevo").length;
  }
  function bannerModo(que) {
    if (enServidor()) {
      const r = BAND && BAND.recogida;
      let h = '<div class="cp-modo ok">☁️ <b>Conectado al servidor.</b> ' + (que === "bandeja" ? "Chispa mira tus redes cada 15 minutos aunque tengas la app cerrada." : "Lo que hagas aquí vale en todos tus aparatos.");
      if (que === "bandeja" && r && r.porRed) {
        h += '<div class="cp-redes">' + Object.keys(RED).map((k) => {
          const x = r.porRed[k] || {};
          const est = k === "tt" ? "no deja leerlos" : x.error ? "⚠️ " + x.error : x.conectada ? "✓" : "sin conectar";
          return '<span class="cp-red' + (x.conectada && !x.error ? " on" : "") + '" title="' + esc(x.aviso || x.error || "") + '">' + RED[k][0] + " " + RED[k][1] + ": " + esc(est) + "</span>";
        }).join("") + '<span class="cp-red">Última vez: ' + cuandoTxt(r.cuando) + "</span></div>";
      }
      return h + "</div>";
    }
    const e = CS() ? CS().estado() : { modo: "demostracion" };
    return '<div class="cp-modo demo">🧪 <b>Datos de EJEMPLO.</b> ' +
      (e.modo === "sin-sesion" ? "Entra con el código de tu negocio en «Conexiones» y aquí verás lo de verdad." : e.pausado ? "En este aparato estás viendo otro negocio: aquí no se envía nada." : "Esta demostración no se envía a ninguna red. Con tu cuenta de Chispa y tus redes conectadas, se lee y se contesta de verdad.") +
      ' <button class="btn g sm" onclick="vista(\'panel\');panel(\'conectar\')">🔗 Conexiones</button></div>';
  }
  function vBandeja() {
    const L = filtrada(), srv = enServidor();
    const cuenta = (est) => (srv ? (BAND && BAND.porEstado && BAND.porEstado[est]) || 0 : demo().bandeja.filter((e) => e.estado === est).length);
    let h = '<div class="hd"><h2>💬 Comentarios, mensajes y reseñas</h2><div class="cp-acc">' +
      (srv ? '<button class="btn pp sm" onclick="cpRecoger()">↻ Traer nuevos</button>' : '<button class="btn g sm" onclick="cpReiniciarEjemplos()">↺ Reiniciar ejemplos</button>') + "</div></div>";
    h += bannerModo("bandeja");
    if (errorB) h += '<div class="cp-modo err">⚠️ ' + esc(errorB) + "</div>";
    h += '<div class="cp-fil" role="group" aria-label="Filtrar por estado">' + [["nuevo", "Sin responder"], ["respondido", "Respondidos"], ["archivado", "Archivados"], ["spam", "Spam"], ["todos", "Todos"]].map(([k, nm]) =>
      '<button class="' + (F.estado === k ? "on" : "") + '" aria-pressed="' + (F.estado === k) + '" onclick="cpFiltro(\'estado\',\'' + k + '\')">' + nm + (k !== "todos" ? " <span>" + cuenta(k) + "</span>" : "") + "</button>").join("") + "</div>";
    h += '<div class="cp-fil2"><select aria-label="Tipo" onchange="cpFiltro(\'tipo\',this.value)"><option value="">Todo</option>' + Object.keys(TIPO).map((k) => '<option value="' + k + '"' + (F.tipo === k ? " selected" : "") + ">" + TIPO[k] + "s</option>").join("") + "</select>" +
      '<select aria-label="Red" onchange="cpFiltro(\'red\',this.value)"><option value="">Todas las redes</option>' + Object.keys(RED).filter((k) => k !== "tt").map((k) => '<option value="' + k + '"' + (F.red === k ? " selected" : "") + ">" + RED[k][1] + "</option>").join("") + "</select>" +
      '<select aria-label="Etiqueta" onchange="cpFiltro(\'etiqueta\',this.value)"><option value="">Todas las etiquetas</option>' + Object.keys(ETIQUETAS).map((k) => '<option value="' + k + '"' + (F.etiqueta === k ? " selected" : "") + ">" + ETIQUETAS[k].ic + " " + ETIQUETAS[k].nm + "</option>").join("") + "</select></div>";
    if (srv && !BAND) { cargarBandeja(); return h + '<div class="empty">Cargando…</div>'; }
    if (!L.length) return h + '<div class="empty">' + (F.estado === "nuevo" ? "Todo contestado 🎉" : "No hay nada con este filtro.") + "</div>" + notaTikTok();
    return h + L.map(tarjeta).join("") + notaTikTok();
  }
  function notaTikTok() { return '<p class="cp-nota">🎵 TikTok no deja a otras apps leer ni contestar comentarios de cuentas normales: esos se contestan en la app de TikTok. WhatsApp entra cuando el negocio tenga WhatsApp Business Platform (trámite con Meta).</p>'; }
  function estrellas(n) { return n ? '<span class="cp-st" aria-label="' + n + ' de 5 estrellas">' + "★".repeat(n) + "☆".repeat(5 - n) + "</span>" : ""; }
  function tarjeta(e) {
    const id = js(e.id), r = RED[e.red] || ["💬", e.red];
    let h = '<div class="cp-it' + ((e.etiquetas || []).includes("queja") ? " neg" : "") + (e.estado !== "nuevo" ? " hecho" : "") + '">' +
      '<div class="cp-ith"><span class="cp-chipred ' + e.red + '">' + r[0] + " " + r[1] + '</span><span class="cp-tipo">' + (TIPO[e.tipo] || e.tipo) + "</span><b>" + esc(e.autor) + "</b>" + estrellas(e.nota) +
      '<span class="cp-cuando">' + cuandoTxt(e.recibido) + "</span>" + (e.ejemplo ? '<span class="cp-ej">EJEMPLO</span>' : "") + "</div>" +
      (e.contexto ? '<div class="cp-ctx">' + esc(e.contexto) + "</div>" : "");
    if (e.historial && e.historial.length > 1) h += '<div class="cp-hilo">' + e.historial.slice(-4).map((m) => '<div class="' + (m.yo ? "yo" : "") + '">' + esc(m.texto) + "</div>").join("") + "</div>";
    else h += '<div class="cp-tx">' + esc(e.texto || "(solo estrellas, sin texto)") + "</div>";
    h += '<div class="cp-et">' + (e.etiquetas || []).map((t) => '<span class="cp-tag">' + ((ETIQUETAS[t] || {}).ic || "🏷") + " " + esc((ETIQUETAS[t] || {}).nm || t) + "</span>").join("") +
      '<button class="cp-tagb" onclick="cpEtiquetas(' + id + ')" aria-label="Cambiar etiquetas">🏷 Etiquetas</button></div>';
    if (e.estado === "respondido") {
      h += '<div class="cp-ok"><div class="lbl">✓ Respondido' + (e.respondidoPor ? " · " + esc(e.respondidoPor) : "") + "</div>" + esc(e.respuesta || "") + "</div>";
    } else if (e.estado === "spam") {
      h += '<div class="cp-acts"><button class="btn g sm" onclick="cpEstado(' + id + ',\'nuevo\')">No es spam</button></div>';
    } else {
      if (e.sugerencia) h += '<div class="cp-prop"><div class="lbl">⚡ Respuesta que propone Chispa</div>' + esc(e.sugerencia) + "</div>";
      h += '<div class="cp-acts">' + (e.red !== "tt" && e.sugerencia ? '<button class="btn pp sm" onclick="cpResponder(' + id + ')">✓ Enviar</button>' : "") +
        '<button class="btn g sm" onclick="cpEditar(' + id + ')">✎ Escribir / editar</button>' +
        (e.sugerencia ? '<button class="btn g sm" onclick="cpOtra(' + id + ')">↻ Otra versión</button>' : "") +
        (e.estado === "archivado" ? '<button class="btn g sm" onclick="cpEstado(' + id + ',\'nuevo\')">Sacar del archivo</button>' : '<button class="btn g sm" onclick="cpEstado(' + id + ',\'archivado\')">Archivar</button>') +
        '<button class="btn g sm" onclick="cpEstado(' + id + ',\'spam\')">Spam</button>' +
        (e.enlace ? '<a class="btn g sm" href="' + esc(e.enlace) + '" target="_blank" rel="noopener">Abrir en ' + r[1] + "</a>" : "") + "</div>";
    }
    return h + "</div>";
  }
  function buscar(id) { return lista().find((e) => e.id === id); }
  function trasCambio(el) {
    if (el && BAND) { const i = BAND.elementos.findIndex((x) => x.id === el.id); if (i >= 0) BAND.elementos[i] = el; }
    cargarBandeja(); pintar("bandeja");
  }
  window.cpFiltro = (k, v) => { F[k] = v; if (enServidor()) { BAND = BAND ? { ...BAND, elementos: [] } : null; cargarBandeja(); } pintar("bandeja"); };
  window.cpRecoger = () => { aviso("Mirando tus redes…"); pedir("POST", "/bandeja/recoger").then((j) => { aviso(j.nuevos ? "📥 " + j.nuevos + " nuevo(s)" : "No hay nada nuevo"); BAND = null; cargarBandeja(); }, fallo); };
  window.cpReiniciarEjemplos = () => { demo().bandeja = ejemplosBandeja(); guardarDemo(); pintar("bandeja"); aviso("Ejemplos como al principio"); };
  function responder(id, texto, privado) {
    const e = buscar(id); if (!e) return;
    texto = String(texto || "").trim(); if (!texto) { aviso("La respuesta está vacía"); return; }
    if (!enServidor()) {
      e.estado = "respondido"; e.respuesta = texto; e.respondidoPor = "ejemplo · no se envía"; guardarDemo(); pintar("bandeja"); pintarNav();
      aviso("✓ Guardada (ejemplo: con tu cuenta y tus redes conectadas se envía de verdad)"); return;
    }
    aviso("Enviando…");
    pedir("POST", "/bandeja/" + encodeURIComponent(id) + "/responder", { texto, privado: !!privado }).then((j) => { aviso(j.ejemplo ? "✓ Guardada (ejemplo, no se envía)" : "✅ Enviada por " + j.via); trasCambio(j.elemento); }, fallo);
  }
  window.cpResponder = (id) => { const e = buscar(id); if (e) responder(id, e.sugerencia); };
  window.cpEditar = (id) => {
    const e = buscar(id); if (!e) return;
    const priv = e.tipo === "comentario" && (e.red === "ig" || e.red === "fb");
    modal('<h3>Responder a ' + esc(e.autor) + "</h3><div class=\"cp-ctx\">" + esc(e.texto) + '</div><label class="lb" for="cpTxt">Tu respuesta</label><textarea id="cpTxt" style="min-height:150px">' + esc(e.sugerencia || "") + "</textarea>" +
      (priv ? '<label class="cp-chk"><input type="checkbox" id="cpPriv"> Mandarla por mensaje privado (respuesta privada de ' + RED[e.red][1] + ", una por comentario)</label>" : "") +
      '<button class="btn pp" style="width:100%;margin-top:12px" onclick="cpEnviarEd(' + js(id) + ')">Enviar</button>');
  };
  window.cpEnviarEd = (id) => { const t = $("cpTxt").value, p = $("cpPriv") && $("cpPriv").checked; cerrarModal(); responder(id, t, p); };
  window.cpOtra = (id) => {
    const e = buscar(id); if (!e) return;
    e._v = (e._v || 0) + 1;
    if (!enServidor()) { e.sugerencia = sugerir(e, neg(), e._v); guardarDemo(); pintar("bandeja"); return; }
    pedir("POST", "/bandeja/" + encodeURIComponent(id) + "/sugerencia", { variante: e._v }).then((j) => { e.sugerencia = j.sugerencia; pintar("bandeja"); }, fallo);
  };
  window.cpEstado = (id, est) => {
    const e = buscar(id); if (!e) return;
    const txt = { archivado: "Archivado", spam: "Marcado como spam", nuevo: "Vuelve a «sin responder»" }[est];
    if (!enServidor()) { e.estado = est; guardarDemo(); pintar("bandeja"); pintarNav(); aviso(txt); return; }
    pedir("PATCH", "/bandeja/" + encodeURIComponent(id), { estado: est }).then((el) => { aviso(txt); BAND.elementos = BAND.elementos.filter((x) => x.id !== id); trasCambio(el); }, fallo);
  };
  window.cpEtiquetas = (id) => {
    const e = buscar(id); if (!e) return;
    const t = e.etiquetas || [];
    modal("<h3>Etiquetas</h3><p class=\"cp-nota\">Chispa pone las suyas solas; tú puedes quitar o añadir.</p><div class=\"cp-etsel\">" + Object.keys(ETIQUETAS).map((k) => '<label><input type="checkbox" value="' + k + '"' + (t.includes(k) ? " checked" : "") + "> " + ETIQUETAS[k].ic + " " + ETIQUETAS[k].nm + "</label>").join("") + "</div>" +
      '<label class="lb" for="cpEtOtra">Otra (opcional)</label><input class="inp" id="cpEtOtra" maxlength="24" placeholder="p. ej. cumpleaños" value="' + esc(t.filter((x) => !ETIQUETAS[x]).join(", ")) + '">' +
      '<button class="btn pp" style="width:100%;margin-top:12px" onclick="cpGuardarEt(' + js(id) + ')">Guardar</button>');
  };
  window.cpGuardarEt = (id) => {
    const e = buscar(id); if (!e) return;
    const et = [...document.querySelectorAll(".cp-etsel input:checked")].map((x) => x.value).concat(($("cpEtOtra").value || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean));
    cerrarModal();
    if (!enServidor()) { e.etiquetas = [...new Set(et)]; guardarDemo(); pintar("bandeja"); aviso("Etiquetas guardadas"); return; }
    pedir("PATCH", "/bandeja/" + encodeURIComponent(id), { etiquetas: et }).then((el) => { aviso("Etiquetas guardadas"); trasCambio(el); }, fallo);
  };

  /* =====================================================================
     ESTADÍSTICAS DÍA A DÍA (se añade arriba de la vista de chispa-agenda.js)
     ===================================================================== */
  let MET = null, cargandoM = false, campoM = "alcance", graf = null;
  function datosMet() {
    if (enServidor()) return MET;
    return { ...resumen(serieEjemplo(28)), ejemplo: true };
  }
  function cargarMetricas() {
    if (!enServidor() || cargandoM) return;
    cargandoM = true;
    pedir("GET", "/metricas?dias=28").then((j) => { MET = j; }, (e) => { MET = { error: e.message }; }).then(() => { cargandoM = false; if (TAB === "stats") pintar("stats"); });
  }
  function bloqueStats() {
    const M = datosMet();
    if (!M) { cargarMetricas(); return '<div class="card cp-dia"><h3>📊 Día a día</h3><div class="empty">Cargando…</div></div>'; }
    if (M.error) return '<div class="card cp-dia"><h3>📊 Día a día</h3><div class="cp-modo err">⚠️ ' + esc(M.error) + "</div></div>";
    const ej = M.ejemplo, T = M.totales || {};
    const tiles = ["alcance", "vistas", "interacciones", "seguidores", "como_llegar", "llamadas"].filter((k) => T[k]).map((k) => {
      const t = T[k], sube = k === "seguidores" ? t.dif >= 0 : t.cambio >= 0;
      return '<button class="kpi cp-kpi' + (campoM === k ? " on" : "") + '" onclick="cpCampo(\'' + k + '\')" aria-pressed="' + (campoM === k) + '"><div class="l">' + NOMBRE_CAMPO[k] + (k === "seguidores" ? "" : " · 7 días") + '</div><div class="n">' + fmt(t.ahora) + '</div><div class="l ' + (sube ? "cp-up" : "cp-down") + '">' +
        (k === "seguidores" ? (t.dif >= 0 ? "+" : "") + fmt(t.dif) + " en 7 días" : (t.cambio >= 0 ? "▲ " : "▼ ") + Math.abs(t.cambio) + " % frente a la semana anterior") + "</div></button>";
    }).join("");
    const ic = { bien: "✅", ojo: "⚠️", idea: "💡" };
    return '<div class="card cp-dia"><div class="hd" style="margin-bottom:8px"><h3 style="margin:0">📊 Día a día' + (ej ? ' <span class="cp-ej">EJEMPLO</span>' : "") + "</h3>" +
      (enServidor() ? '<button class="btn g sm" onclick="cpLeerMetricas()">↻ Leer ahora</button>' : "") + "</div>" +
      (ej ? '<div class="cp-modo demo">' + esc(M.aviso || "Cifras de EJEMPLO, inventadas para enseñar el panel. Con tus redes conectadas el servidor las recoge solas cada mañana.") + "</div>" :
        '<p class="cp-nota">Datos de tus redes, recogidos por el servidor cada mañana' + (M.recogida ? " (última vez: " + new Date(M.recogida.cuando).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + ")" : "") + ". Google da los suyos con unos 3 días de retraso.</p>") +
      '<div class="kpis cp-kpis">' + tiles + "</div>" +
      '<div class="chbox cp-chbox"><canvas id="cpGraf" aria-label="' + esc(NOMBRE_CAMPO[campoM]) + ' por día y red"></canvas></div>' +
      '<h3 style="margin:14px 0 6px">💡 Consejos con tus datos</h3><div class="cp-cons">' + (M.consejos || []).map((c) => '<div class="cp-con ' + c.nivel + '"><b>' + ic[c.nivel] + " " + esc(c.titulo) + "</b><div>" + esc(c.texto) + "</div></div>").join("") + "</div></div>";
  }
  function dibujarGraf() {
    const M = datosMet(), cv = $("cpGraf");
    if (!M || !M.series || !cv || typeof Chart === "undefined") return;
    try { if (graf) graf.destroy(); } catch (e) {}
    const dias = M.dias || [];
    const sets = Object.keys(M.series).filter((r) => M.series[r].some((f) => typeof f[campoM] === "number")).map((r) => {
      const por = {}; M.series[r].forEach((f) => (por[f.dia] = f[campoM]));
      const c = (REDES_M[r] || {}).color || "#a78bfa";
      return { label: (REDES_M[r] || { nm: r }).nm, data: dias.map((d) => (por[d] == null ? null : por[d])), borderColor: c, backgroundColor: c + "33", tension: 0.3, borderWidth: 2, pointRadius: 0, spanGaps: true };
    });
    graf = new Chart(cv, { type: "line", data: { labels: dias.map((d) => d.slice(8, 10) + "/" + d.slice(5, 7)), datasets: sets },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { labels: { color: "#a3adbf", boxWidth: 12 } } },
        scales: { x: { grid: { color: "#232a38" }, ticks: { color: "#a3adbf", maxTicksLimit: 8 } }, y: { grid: { color: "#232a38" }, ticks: { color: "#a3adbf" }, beginAtZero: campoM !== "seguidores" } } } });
  }
  window.cpCampo = (k) => { campoM = k; pintar("stats"); };
  window.cpLeerMetricas = () => { aviso("Leyendo de tus redes…"); pedir("POST", "/metricas/recoger").then(() => { MET = null; cargarMetricas(); aviso("✓ Estadísticas al día"); }, fallo); };

  /* =====================================================================
     ANUNCIOS
     ===================================================================== */
  let ANU = null, cargandoA = false;
  const PALMA = { lat: 39.5696, lng: 2.6502 };
  function cargarAnuncios() {
    if (!enServidor() || cargandoA) return;
    cargandoA = true;
    pedir("GET", "/anuncios").then((j) => { ANU = j; }, (e) => { ANU = { anuncios: [], error: e.message }; }).then(() => { cargandoA = false; if (TAB === "anuncios") pintar("anuncios"); });
  }
  function anuncios() { return enServidor() ? (ANU && ANU.anuncios) || [] : demo().anuncios; }
  const EST_AN = { "en-pausa": ["⏸ En pausa · no gasta", "amb"], activa: ["▶ Activa", "ok"], terminada: ["✓ Terminada", ""], fallo: ["⚠️ Falló", "err"], preparada: ["📝 Preparada", "amb"], simulada: ["🧪 Simulación", ""], "simulada-activa": ["🧪 Simulación activa", ""] };
  function vAnuncios() {
    const n = (window.S && S.negocio) || {}, srv = enServidor();
    if (srv && !ANU) cargarAnuncios();
    const lat = n.lat || PALMA.lat, lng = n.lng || PALMA.lng;
    const texto = (n.oferta ? "🔥 " + n.oferta + " en " : "Ven a ") + (n.nombre || "nuestro local") + (n.ciudad ? ", en " + n.ciudad : "") + ". Reserva tu mesa en un minuto 😋";
    let h = '<div class="hd"><h2>📣 Anuncios</h2></div>' + bannerModo("anuncios");
    if (ANU && ANU.error) h += '<div class="cp-modo err">⚠️ ' + esc(ANU.error) + "</div>";
    h += '<div class="card"><h3>Nueva campaña</h3><div class="cp-grid">' +
      '<div><label class="lb" for="anRed">Dónde</label><select id="anRed"><option value="meta">Facebook + Instagram (Meta)</option><option value="google">Google (búsquedas)</option></select></div>' +
      '<div><label class="lb" for="anObj">Objetivo</label><select id="anObj"><option value="visitas">Más visitas a tu web o reservas</option><option value="alcance">Que te conozca más gente cerca</option></select></div>' +
      '<div class="cp-full"><label class="lb" for="anTxt">Texto del anuncio</label><textarea id="anTxt" maxlength="600">' + esc(texto) + "</textarea></div>" +
      '<div><label class="lb" for="anTit">Título</label><input class="inp" id="anTit" maxlength="40" value="' + esc(n.nombre || "") + '"></div>' +
      '<div><label class="lb" for="anBot">Botón</label><select id="anBot"><option value="reservar">Reservar</option><option value="mas">Más información</option><option value="pedir">Pedir ahora</option><option value="llamar">Llamar</option><option value="comprar">Comprar</option></select></div>' +
      '<div class="cp-full"><label class="lb" for="anImg">Imagen (dirección https://; la del Estudio o una foto subida a tu web)</label><input class="inp" id="anImg" placeholder="https://…/foto.jpg"></div>' +
      '<div class="cp-full"><label class="lb" for="anLink">Enlace al que lleva</label><input class="inp" id="anLink" value="' + esc(n.reserva || "https://el-paraiso-eight.vercel.app/reservas.html") + '"></div>' +
      '<div><label class="lb" for="anDia">Presupuesto al día (€)</label><input class="inp" id="anDia" type="number" min="1" max="500" step="1" value="5" oninput="cpTotal()"></div>' +
      '<div><label class="lb" for="anDias">Días</label><input class="inp" id="anDias" type="number" min="1" max="60" value="7" oninput="cpTotal()"></div>' +
      '<div><label class="lb" for="anRad">Radio alrededor del local (km)</label><input class="inp" id="anRad" type="number" min="1" max="80" value="5"></div>' +
      '<div><label class="lb">Edad</label><div class="cp-edad"><input class="inp" id="anEmin" type="number" min="18" max="65" value="18" aria-label="Edad mínima"><span>a</span><input class="inp" id="anEmax" type="number" min="18" max="65" value="65" aria-label="Edad máxima"></div></div>' +
      '<div class="cp-full cp-nota">📍 Centro del público: ' + lat.toFixed(4) + ", " + lng.toFixed(4) + (n.lat ? " (tu dirección de «Mi negocio»)" : " (centro de Palma; pon tu dirección en «Mi negocio» para afinarlo)") + '<input type="hidden" id="anLat" value="' + lat + '"><input type="hidden" id="anLng" value="' + lng + '"></div>' +
      '</div><div class="cp-total" id="anTotal"></div>' +
      '<div class="cp-acts" style="margin-top:12px">' + (srv ? '<button class="btn pp" onclick="cpCrearAnuncio(false)">Crear (queda en pausa, no gasta)</button><button class="btn g" onclick="cpCrearAnuncio(true)">Simular</button>' : '<button class="btn pp" onclick="cpCrearAnuncio(true)">Simular (no se envía)</button>') + "</div>" +
      '<p class="cp-nota">' + (srv ? "Meta: se crea la campaña EN PAUSA y solo empieza a gastar cuando el dueño pulsa «Activar». Hace falta una cuenta publicitaria con forma de pago en business.facebook.com. Google: queda preparada con todo y se envía cuando haya cuenta de Google Ads y su permiso." : "En la demostración no se crea nada en Meta ni en Google y no se gasta nada.") + "</p></div>";
    const L = anuncios();
    if (L.length) h += '<div class="card"><h3>Tus campañas</h3>' + L.map(fichaAnuncio).join("") + "</div>";
    setTimeout(() => window.cpTotal && window.cpTotal(), 0);
    return h;
  }
  function fichaAnuncio(a) {
    const d = a.datos || {}, e = EST_AN[a.estado] || [a.estado, ""], id = js(a.id), r = a.resultados;
    return '<div class="cp-an"><div class="cp-ith"><b>' + esc(d.nombre) + '</b><span class="cp-est ' + e[1] + '">' + e[0] + "</span>" + (a.ejemplo ? '<span class="cp-ej">SIMULACIÓN</span>' : "") + "</div>" +
      '<div class="cp-ctx">' + (a.red === "google" ? "Google" : "Facebook + Instagram") + " · " + esc(d.diario) + " €/día · " + esc(d.dias) + " días (máx. " + esc(d.total) + " €) · " + esc(d.radioKm) + " km · " + esc(d.edadMin) + "-" + esc(d.edadMax) + " años</div>" +
      '<div class="cp-tx">' + esc(d.texto) + "</div>" + (a.motivo ? '<div class="cp-nota">' + esc(a.motivo) + "</div>" : "") +
      (r ? '<div class="cp-res">' + [["Impresiones", r.impresiones], ["Alcance", r.alcance], ["Clics", r.clics], ["Gastado", (r.gastado || 0).toFixed(2).replace(".", ",") + " €"]].map(([k, v]) => "<div><b>" + (typeof v === "number" ? fmt(v) : v) + "</b><span>" + k + "</span></div>").join("") + "</div>" : "") +
      '<div class="cp-acts">' + (a.estado === "en-pausa" || a.estado === "simulada" ? '<button class="btn pp sm" onclick="cpAn(' + id + ',\'activar\')">▶ Activar</button>' : "") +
      (a.estado === "activa" || a.estado === "simulada-activa" ? '<button class="btn g sm" onclick="cpAn(' + id + ',\'pausar\')">⏸ Pausar</button>' : "") +
      (["en-pausa", "activa", "terminada"].includes(a.estado) ? '<button class="btn g sm" onclick="cpAn(' + id + ',\'resultados\')">↻ Resultados</button>' : "") +
      (a.estado !== "activa" ? '<button class="btn g sm" onclick="cpQuitarAn(' + id + ')">Quitar</button>' : "") + "</div></div>";
  }
  window.cpTotal = () => { const t = $("anTotal"); if (!t) return; const d = Number($("anDia").value) || 0, n = Number($("anDias").value) || 0; t.innerHTML = "Como mucho <b>" + (d * n).toLocaleString("es-ES") + " €</b> en total (" + d + " €/día × " + n + " días). Ni un euro más."; };
  function leerForm() {
    const v = (id) => $(id).value;
    return { red: v("anRed"), objetivo: v("anObj"), texto: v("anTxt"), titulo: v("anTit"), boton: v("anBot"), imagen: v("anImg"), enlace: v("anLink"), diario: Number(v("anDia")), dias: Number(v("anDias")), radioKm: Number(v("anRad")), edadMin: Number(v("anEmin")), edadMax: Number(v("anEmax")), lat: Number(v("anLat")), lng: Number(v("anLng")) };
  }
  function validarLocal(c) {
    if (!c.texto.trim()) return "Escribe el texto del anuncio";
    if (!(c.diario >= 1 && c.diario <= 500)) return "El presupuesto diario va de 1 € a 500 €";
    if (!(c.dias >= 1 && c.dias <= 60)) return "La campaña dura de 1 a 60 días";
    if (!(c.radioKm >= 1 && c.radioKm <= 80)) return "El radio va de 1 a 80 km";
    if (!(c.edadMin >= 18 && c.edadMax <= 65 && c.edadMin <= c.edadMax)) return "La edad va de 18 a 65 años";
    if (!/^https:\/\//.test(c.enlace)) return "El enlace tiene que empezar por https://";
    if (c.imagen && !/^https:\/\//.test(c.imagen)) return "La imagen tiene que ser una dirección https://";
    return "";
  }
  window.cpCrearAnuncio = (simular) => {
    const c = leerForm(), mal = validarLocal(c);
    if (mal) { aviso(mal); return; }
    if (!enServidor()) {
      const ini = Date.now() + 3600e3;
      demo().anuncios.unshift({ id: "sim" + Date.now().toString(36), red: c.red, estado: "simulada", ejemplo: true, motivo: "Simulación: no se ha enviado a " + (c.red === "google" ? "Google" : "Meta") + " ni se gasta nada.", datos: { ...c, nombre: "Chispa · " + (c.objetivo === "visitas" ? "Más visitas" : "Más alcance") + " · " + new Date(ini).toISOString().slice(0, 10), total: c.diario * c.dias, inicio: ini, fin: ini + c.dias * 864e5 }, creado: Date.now() });
      guardarDemo(); pintar("anuncios"); aviso("🧪 Simulación guardada"); return;
    }
    aviso(simular ? "Guardando simulación…" : "Creando en " + (c.red === "google" ? "Google" : "Meta") + "…");
    pedir("POST", "/anuncios", { ...c, simular: !!simular }).then((a) => { aviso(a.estado === "en-pausa" ? "✅ Creada en Meta, en pausa" : a.estado === "preparada" ? "📝 Preparada para Google" : "Guardado"); ANU = null; cargarAnuncios(); }, (e) => { fallo(e); ANU = null; cargarAnuncios(); });
  };
  window.cpAn = (id, accion) => {
    const a = anuncios().find((x) => x.id === id); if (!a) return;
    if (accion === "activar" && !a.ejemplo && !confirm("¿Activar la campaña? Empieza a gastar hasta " + a.datos.diario + " €/día durante " + a.datos.dias + " días (máx. " + a.datos.total + " €).")) return;
    if (!enServidor()) { a.estado = accion === "activar" ? "simulada-activa" : "simulada"; guardarDemo(); pintar("anuncios"); aviso("🧪 Simulación: no se gasta nada"); return; }
    pedir("POST", "/anuncios/" + encodeURIComponent(id) + "/" + accion).then(() => { aviso({ activar: "▶ Activa", pausar: "⏸ En pausa", resultados: "✓ Resultados al día" }[accion]); ANU = null; cargarAnuncios(); }, fallo);
  };
  window.cpQuitarAn = (id) => {
    if (!confirm("¿Quitarla de la lista? (En Meta queda en pausa, sin gastar.)")) return;
    if (!enServidor()) { demo().anuncios = demo().anuncios.filter((x) => x.id !== id); guardarDemo(); pintar("anuncios"); return; }
    pedir("DELETE", "/anuncios/" + encodeURIComponent(id)).then(() => { ANU = null; cargarAnuncios(); }, fallo);
  };

  /* =====================================================================
     AUTOMATIZACIONES (reglas del servidor) y AVISOS
     ===================================================================== */
  let REG = null, AVI = null, cargandoR = false, avisado = false;
  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const TIPOS_R = {
    palabra_dm: { ic: "📩", nm: "Palabra clave en un comentario → mensaje privado con enlace", d: "Alguien comenta la palabra (por ejemplo CARTA) en Instagram o Facebook y le llega por privado el enlace. Es la «respuesta privada» oficial de Meta: una por comentario.", def: { palabra: "CARTA", redes: ["ig", "fb"], mensaje: "¡Hola! 👋 Aquí la tienes: {enlace}\n¿Te reservamos mesa?", enlace: "", publica: "¡Te la mandamos por privado! 📩" }, pro: true },
    resena: { ic: "⭐", nm: "Reseña nueva → respuesta sugerida o automática", d: "Cada reseña nueva de Google trae su respuesta propuesta. En modo automático, las de 4-5★ se contestan solas; las de 1-3★ NUNCA: te avisa para que la veas tú.", def: { modo: "sugerir", minimo: 4 }, pro: true },
    recordatorio: { ic: "⏰", nm: "Recordatorio de publicar", d: "Los días y la hora que digas, si no hay nada programado en las próximas horas, Chispa te avisa.", def: { dias: [1, 2, 3, 4, 5, 6, 0], hora: "10:00", horas: 24 } },
    resumen_semanal: { ic: "📬", nm: "Resumen semanal", d: "Cada semana: publicaciones, alcance, mensajes, reseñas y anuncios, con un consejo. Por correo si hay correo de envío configurado; si no, aquí en la app.", def: { dia: 1, hora: "09:00", correo: "" } },
  };
  function cargarReglas() {
    if (!enServidor() || cargandoR) return;
    cargandoR = true;
    Promise.all([pedir("GET", "/reglas"), pedir("GET", "/avisos")]).then(([r, a]) => { REG = r; AVI = a; }, (e) => { REG = { reglas: [], registro: [], error: e.message }; AVI = { avisos: [] }; })
      .then(() => {
        cargandoR = false; pintarNav(); if (TAB === "automatizaciones") pintar("automatizaciones");
        const nuevos = avisos().filter((a) => !a.leido);
        if (nuevos.length && !avisado) { avisado = true; const p = nuevos.find((a) => a.tipo === "prueba"); aviso("🔔 " + (p ? p.titulo : nuevos.length + " aviso(s) de Chispa") + " · míralo en Automatizaciones"); }
      });
  }
  function reglas() { return enServidor() ? (REG && REG.reglas) || [] : demo().reglas; }
  function avisos() { return enServidor() ? (AVI && AVI.avisos) || [] : demo().avisos; }
  function registro() { return enServidor() ? (REG && REG.registro) || [] : demo().registro; }
  function vAutos() {
    const srv = enServidor();
    if (srv && !REG) cargarReglas();
    let h = '<div class="hd"><h2>🤖 Automatizaciones</h2><div class="cp-acc"><button class="btn g sm" onclick="cpEjecutar()">▶ ' + (srv ? "Ejecutar ahora" : "Probar con los ejemplos") + "</button></div></div>" + bannerModo("autos");
    if (REG && REG.error) h += '<div class="cp-modo err">⚠️ ' + esc(REG.error) + "</div>";
    const av = avisos();
    if (av.length) {
      h += '<div class="card"><div class="hd" style="margin-bottom:6px"><h3 style="margin:0">🔔 Avisos de Chispa</h3>' + (av.some((a) => !a.leido) ? '<button class="btn g sm" onclick="cpLeidos()">Marcar todo como leído</button>' : "") + "</div>" +
        av.slice(0, 12).map((a) => '<details class="cp-av' + (a.leido ? "" : " nuevo") + '"><summary>' + (a.leido ? "" : "● ") + esc(a.titulo) + ' <span class="cp-cuando">' + cuandoTxt(a.creado) + "</span></summary><div>" + esc(a.texto).replace(/\n/g, "<br>") + "</div></details>").join("") + "</div>";
    }
    h += '<p class="cp-nota">' + (srv ? "Estas reglas las ejecuta el servidor cada 5 minutos, con la app cerrada." : "En la demostración las reglas se guardan en este navegador y se prueban con los mensajes de EJEMPLO de «Comentarios y DMs». Con tu cuenta de Chispa las ejecuta el servidor con la app cerrada.") + "</p>";
    for (const tipo of Object.keys(TIPOS_R)) {
      const T = TIPOS_R[tipo], r = reglas().find((x) => x.tipo === tipo), cfg = { ...T.def, ...((r && r.config) || {}) }, on = !!(r && r.activa);
      h += '<div class="au cp-regla"><div class="au-h"><div class="au-t"><b id="rg-' + tipo + '">' + T.ic + " " + T.nm + '</b><div class="au-d">' + T.d + (T.pro ? ' <span class="chip">Pro y Agencia</span>' : "") + "</div>" +
        (r ? '<span class="au-es ' + (on ? "ya" : "off") + '">' + (on ? "✅ Encendida" : "⏸ Apagada") + (r.veces ? " · " + r.veces + " vez/veces" : "") + (r.ultima ? " · última: " + cuandoTxt(r.ultima) : "") + "</span>" : '<span class="au-es off">⏸ Sin crear</span>') + "</div>" +
        '<button class="sw2' + (on ? " on" : "") + '" role="switch" aria-checked="' + on + '" aria-labelledby="rg-' + tipo + '" onclick="cpRegla(\'' + tipo + '\')"></button></div>' +
        '<div class="au-x">' + formRegla(tipo, cfg) + '<button class="btn g sm" style="margin-top:8px" onclick="cpGuardarRegla(\'' + tipo + '\')">Guardar ajustes</button></div></div>';
    }
    if (srv && REG && !REG.correo) h += '<p class="cp-nota">📬 Correo de envío sin configurar en el servidor: el resumen semanal llega como aviso aquí. Para mandarlo por correo hace falta un proveedor (trámite: ver docs/ESTADO-CHISPA.md).</p>';
    const reg = registro();
    if (reg.length) h += '<div class="card"><h3>Lo último que han hecho</h3>' + reg.slice(0, 12).map((x) => '<div class="cp-log"><span>' + new Date(x.cuando).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + "</span> " + esc(x.resultado) + "</div>").join("") + "</div>";
    h += '<div class="card cp-mas"><h3>También</h3><p class="cp-nota">📅 <b>Menú del día a las 11:00</b>: prográmalo en el Calendario (puedes copiarlo cada día); el servidor lo publica a su hora en cuanto Instagram y Facebook estén conectados. <button class="btn g sm" onclick="rsMenu&&rsMenu()">👀 Ver cómo queda</button></p>' +
      '<p class="cp-nota">💬 <b>Recordar la reserva por WhatsApp</b>: necesita WhatsApp Business Platform (empresa verificada, número propio y plantilla aprobada por Meta). Es un trámite; el texto ya está: <button class="btn g sm" onclick="rsWhats&&rsWhats()">Ver el mensaje</button></p></div>';
    return h;
  }
  function formRegla(tipo, c) {
    const id = (k) => "rg_" + tipo + "_" + k;
    if (tipo === "palabra_dm") return '<div class="cp-grid"><div><label class="lb" for="' + id("palabra") + '">Palabra clave</label><input class="inp" id="' + id("palabra") + '" maxlength="30" value="' + esc(c.palabra) + '"></div>' +
      '<div><label class="lb">Redes</label><div class="cp-chks"><label><input type="checkbox" id="' + id("ig") + '"' + (c.redes.includes("ig") ? " checked" : "") + "> Instagram</label><label><input type=\"checkbox\" id=\"" + id("fb") + '"' + (c.redes.includes("fb") ? " checked" : "") + "> Facebook</label></div></div>" +
      '<div class="cp-full"><label class="lb" for="' + id("enlace") + '">Enlace que se manda</label><input class="inp" id="' + id("enlace") + '" placeholder="https://… (la carta, reservas…)" value="' + esc(c.enlace || ((window.S && S.negocio && S.negocio.reserva) || "")) + '"></div>' +
      '<div class="cp-full"><label class="lb" for="' + id("mensaje") + '">Mensaje privado ({enlace} y {nombre} se rellenan solos)</label><textarea id="' + id("mensaje") + '" maxlength="900">' + esc(c.mensaje) + "</textarea></div>" +
      '<div class="cp-full"><label class="lb" for="' + id("publica") + '">Respuesta pública en el comentario (vacío = ninguna)</label><input class="inp" id="' + id("publica") + '" maxlength="200" value="' + esc(c.publica) + '"></div></div>';
    if (tipo === "resena") return '<div class="cp-grid"><div><label class="lb" for="' + id("modo") + '">Modo</label><select id="' + id("modo") + '"><option value="sugerir"' + (c.modo !== "automatica" ? " selected" : "") + '>Solo proponer la respuesta</option><option value="automatica"' + (c.modo === "automatica" ? " selected" : "") + ">Contestar sola las buenas</option></select></div>" +
      '<div><label class="lb" for="' + id("minimo") + '">Contestar sola desde</label><select id="' + id("minimo") + '"><option value="4"' + (Number(c.minimo) === 4 ? " selected" : "") + '>4★ y 5★</option><option value="5"' + (Number(c.minimo) === 5 ? " selected" : "") + ">Solo 5★</option></select></div></div>";
    if (tipo === "recordatorio") return '<div class="cp-grid"><div class="cp-full"><label class="lb">Días</label><div class="cp-chks">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<label><input type="checkbox" class="' + id("dia") + '" value="' + d + '"' + (c.dias.includes(d) ? " checked" : "") + "> " + DIAS[d] + "</label>").join("") + "</div></div>" +
      '<div><label class="lb" for="' + id("hora") + '">Hora</label><input class="inp" id="' + id("hora") + '" type="time" value="' + esc(c.hora) + '"></div>' +
      '<div><label class="lb" for="' + id("horas") + '">Avisar si no hay nada en las próximas (horas)</label><input class="inp" id="' + id("horas") + '" type="number" min="2" max="72" value="' + esc(c.horas) + '"></div></div>';
    return '<div class="cp-grid"><div><label class="lb" for="' + id("dia") + '">Día</label><select id="' + id("dia") + '">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<option value="' + d + '"' + (Number(c.dia) === d ? " selected" : "") + ">" + ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d] + "</option>").join("") + "</select></div>" +
      '<div><label class="lb" for="' + id("hora") + '">Hora</label><input class="inp" id="' + id("hora") + '" type="time" value="' + esc(c.hora) + '"></div>' +
      '<div class="cp-full"><label class="lb" for="' + id("correo") + '">Correo (opcional)</label><input class="inp" id="' + id("correo") + '" type="email" placeholder="tucorreo@ejemplo.com" value="' + esc(c.correo) + '"></div></div>';
  }
  function leerRegla(tipo) {
    const v = (k) => { const e = $("rg_" + tipo + "_" + k); return e ? e.value : ""; };
    if (tipo === "palabra_dm") return { palabra: v("palabra").trim(), redes: ["ig", "fb"].filter((r) => $("rg_" + tipo + "_" + r).checked), enlace: v("enlace").trim(), mensaje: v("mensaje"), publica: v("publica") };
    if (tipo === "resena") return { modo: v("modo"), minimo: Number(v("minimo")) };
    if (tipo === "recordatorio") return { dias: [...document.querySelectorAll(".rg_recordatorio_dia:checked")].map((x) => Number(x.value)), hora: v("hora") || "10:00", horas: Number(v("horas")) || 24 };
    return { dia: Number(v("dia")), hora: v("hora") || "09:00", correo: v("correo").trim() };
  }
  function validarRegla(tipo, c) {
    if (tipo === "palabra_dm") { if (!c.palabra) return "Escribe la palabra clave"; if (!c.redes.length) return "Elige Instagram, Facebook o las dos"; if (c.enlace && !/^https:\/\//.test(c.enlace)) return "El enlace tiene que empezar por https://"; }
    if (tipo === "recordatorio" && !c.dias.length) return "Elige al menos un día";
    if (tipo === "resumen_semanal" && c.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.correo)) return "El correo no parece válido";
    return "";
  }
  function guardarRegla(tipo, activar) {
    const r = reglas().find((x) => x.tipo === tipo), form = $("rg_" + tipo + "_" + (tipo === "palabra_dm" ? "palabra" : tipo === "resena" ? "modo" : "hora"));
    const cfg = form ? leerRegla(tipo) : { ...TIPOS_R[tipo].def, ...((r && r.config) || {}) };
    const mal = validarRegla(tipo, cfg); if (mal) { aviso(mal); return; }
    const activa = activar === undefined ? (r ? r.activa : true) : activar;
    if (!enServidor()) {
      if (r) { r.config = cfg; r.activa = activa; } else demo().reglas.push({ id: "rgl" + Date.now().toString(36), tipo, config: cfg, activa, veces: 0, creado: Date.now() });
      guardarDemo(); pintar("automatizaciones"); aviso(activa ? "✓ Encendida (demostración)" : "Apagada"); return;
    }
    const p = r ? pedir("PATCH", "/reglas/" + r.id, { config: cfg, activa }) : pedir("POST", "/reglas", { tipo, config: cfg });
    p.then(() => { aviso(activa ? "✓ Guardada y encendida" : "Apagada"); REG = null; cargarReglas(); }, fallo);
  }
  window.cpRegla = (tipo) => { const r = reglas().find((x) => x.tipo === tipo); guardarRegla(tipo, !(r && r.activa)); };
  window.cpGuardarRegla = (tipo) => guardarRegla(tipo);
  window.cpLeidos = () => {
    if (!enServidor()) { demo().avisos.forEach((a) => (a.leido = Date.now())); guardarDemo(); pintar("automatizaciones"); pintarNav(); return; }
    pedir("POST", "/avisos/leidos").then(() => { REG = null; cargarReglas(); }, fallo);
  };
  window.cpEjecutar = () => {
    if (enServidor()) { aviso("Ejecutando las reglas…"); pedir("POST", "/reglas/ejecutar", {}).then((j) => { aviso("✓ Hecho (" + j.hechas.length + " regla/s)"); REG = null; cargarReglas(); BAND = null; }, fallo); return; }
    const n = probarDemo(); guardarDemo(); pintar("automatizaciones"); pintarNav();
    aviso(n ? "🤖 " + n + " cosa(s) hecha(s) con los ejemplos: míralo en «Lo último que han hecho»" : "Enciende alguna regla y vuelve a probar");
  };
  /* Simulación en el navegador con los ejemplos de la bandeja (mismas reglas que el servidor) */
  function probarDemo() {
    const d = demo(), log = (t) => d.registro.unshift({ cuando: Date.now(), resultado: t });
    const av = (tipo, titulo, texto) => d.avisos.unshift({ id: "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tipo, titulo, texto, creado: Date.now() });
    let n = 0;
    for (const r of d.reglas.filter((x) => x.activa)) {
      const c = r.config;
      if (r.tipo === "palabra_dm") {
        for (const e of d.bandeja.filter((x) => x.tipo === "comentario" && x.estado === "nuevo" && c.redes.includes(x.red))) {
          const t = " " + String(e.texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]+/g, " ") + " ";
          if (!t.includes(" " + c.palabra.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + " ")) continue;
          e.estado = "respondido"; e.respuesta = c.mensaje.replace(/\{enlace\}/g, c.enlace || "").replace(/\{nombre\}/g, e.autor.replace(/^@/, "")); e.respondidoPor = "automática · mensaje privado (ejemplo, no se envía)";
          log("Ejemplo: mensaje privado preparado para " + e.autor + " («" + c.palabra + "»)"); n++;
        }
      }
      if (r.tipo === "resena") {
        for (const e of d.bandeja.filter((x) => x.tipo === "resena" && x.estado === "nuevo")) {
          if (e.nota <= 3) { if (!d.avisos.some((a) => a.ref === e.id)) { av("resena-negativa", "Reseña de " + e.nota + "★ de " + e.autor, "«" + e.texto + "». Chispa no la contesta sola: tienes la respuesta propuesta en «Comentarios y DMs»."); d.avisos[0].ref = e.id; log("Aviso: reseña de " + e.nota + "★ de " + e.autor); n++; } continue; }
          if (c.modo === "automatica" && e.nota >= c.minimo) { e.estado = "respondido"; e.respuesta = e.sugerencia; e.respondidoPor = "automática (ejemplo, no se envía)"; log("Ejemplo: contestada sola la reseña de " + e.nota + "★ de " + e.autor); n++; }
        }
      }
      if (r.tipo === "recordatorio") { av("recordatorio", "Hoy no tienes nada programado (ejemplo)", "Así te avisará Chispa cuando no haya nada programado en las próximas " + c.horas + " horas."); log("Ejemplo: aviso de recordatorio"); n++; }
      if (r.tipo === "resumen_semanal") {
        const R = resumen(serieEjemplo(14)), t = R.totales;
        av("resumen", "Tu resumen de la semana (ejemplo)", "Resumen de la semana de " + neg().nombre + " (cifras de EJEMPLO)\n\nAlcance: " + fmt(t.alcance.ahora) + " (" + t.alcance.cambio + " %)\nVisualizaciones: " + fmt(t.vistas.ahora) + "\n«Cómo llegar» en Google: " + fmt(t.como_llegar.ahora) + "\nMensajes sin responder: " + d.bandeja.filter((x) => x.estado === "nuevo").length + "\n\nConsejo de Chispa: " + R.consejos[0].titulo + ". " + R.consejos[0].texto);
        log("Ejemplo: resumen semanal dejado en la app"); n++;
      }
      r.ultima = Date.now(); r.veces = (r.veces || 0) + 1;
    }
    return n;
  }

  /* =====================================================================
     ENGANCHE: envuelve panel() y pone los números en el menú
     ===================================================================== */
  const MIAS = ["bandeja", "anuncios", "automatizaciones", "stats"];
  const panelAntes = window.panel;
  function pintar(tab) {
    if (TAB !== tab) return;
    const y = window.scrollY;
    window.panel(tab);
    window.scrollTo(0, y);
  }
  window.panel = function (tab) {
    if (!MIAS.includes(tab)) return panelAntes.apply(this, arguments);
    if (tab === "stats") { // la vista es de chispa-agenda.js: se añade «Día a día» arriba
      const r = panelAntes.apply(this, arguments);
      const m = $("main"), hd = m && m.querySelector(".hd");
      if (hd) { const div = document.createElement("div"); div.innerHTML = bloqueStats(); hd.parentNode.insertBefore(div.firstChild, hd.nextSibling); setTimeout(dibujarGraf, 40); }
      return r;
    }
    TAB = tab; pintarNav();
    $("main").innerHTML = tab === "bandeja" ? vBandeja() : tab === "anuncios" ? vAnuncios() : vAutos();
    if (tab === "anuncios") window.cpTotal();
  };
  // números en el menú
  for (const t of TABS) {
    if (t.id === "bandeja") Object.defineProperty(t, "nm", { configurable: true, enumerable: true, get: () => "Comentarios y DMs" });
    if (t.id === "automatizaciones") Object.defineProperty(t, "nm", { configurable: true, enumerable: true, get: () => { const n = avisos().filter((a) => !a.leido).length; return "Automatizaciones" + (n ? ' <span class="chip" style="margin-left:auto">' + n + "</span>" : ""); } });
  }
  // el chip de «Comentarios y DMs» lo pinta index.html con pendientes(): que cuente lo de verdad
  window.pendientes = sinResponder;
  // al cambiar de modo (entrar, salir) se vuelve a cargar todo
  let modoAntes = enServidor();
  setInterval(() => {
    const m = enServidor();
    if (m !== modoAntes) { modoAntes = m; BAND = MET = ANU = REG = AVI = null; if (m) { cargarBandeja(); cargarReglas(); } if (MIAS.includes(TAB) && $("app").classList.contains("on")) pintar(TAB); else pintarNav(); }
  }, 3000);
  if (enServidor()) { cargarBandeja(); cargarReglas(); setInterval(() => { if (document.visibilityState === "visible" && enServidor()) { if (TAB !== "bandeja" || !document.querySelector("#modalOv.on")) cargarBandeja(); } }, 120e3); }
  // si la página se abrió en una de estas pestañas (#bandeja, #anuncios…), se pinta ya con lo nuevo
  const hs = location.hash || "";
  const pedida = /bandeja|mensajes/.test(hs) ? "bandeja" : /anuncios/.test(hs) ? "anuncios" : /automatizaciones/.test(hs) ? "automatizaciones" : null;
  if (pedida) { try { vista("panel"); window.panel(pedida); } catch (e) {} }
  else if ($("app") && $("app").classList.contains("on") && MIAS.includes(TAB)) { try { window.panel(TAB); } catch (e) {} }
  else { try { pintarNav(); } catch (e) {} }
  /* ---------------- chat de la portada con IA (POST /chat del servidor, público) ----------------
     Los botones de preguntas rápidas siguen siendo instantáneos; lo que se ESCRIBE va a la IA si hay
     servidor configurado. Si el servidor no puede (sin cupo, sin red), contesta lo preparado. */
  const historial = [];
  const preguntarAntes = window.preguntarLibre, abrirChatAntes = window.abrirChat;
  if (typeof abrirChatAntes === "function") window.abrirChat = function () { historial.length = 0; return abrirChatAntes.apply(this, arguments); };
  if (typeof preguntarAntes === "function") window.preguntarLibre = function () {
    const srv = CS() && CS().estado().servidor, i = $("chatTxt"), v = ((i && i.value) || "").trim();
    if (!srv || !v) return preguntarAntes.apply(this, arguments);
    i.value = ""; $("qs").innerHTML = "";
    const st = $("stream"), yo = document.createElement("div"); yo.className = "bub me"; yo.textContent = v; st.appendChild(yo);
    const esc2 = document.createElement("div"); esc2.className = "typing"; esc2.textContent = "Chispa está escribiendo…"; st.appendChild(esc2); st.scrollTop = st.scrollHeight;
    historial.push({ yo: true, texto: v });
    fetch(srv + "/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensajes: historial.slice(-8) }) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))).then((j) => j.texto).catch(() => (typeof cerebroChat === "function" ? cerebroChat(v) : "Ahora mismo no puedo contestar, prueba en un momento 🙏"))
      .then((txt) => { try { st.removeChild(esc2); } catch (e) {} historial.push({ yo: false, texto: txt }); const b = document.createElement("div"); b.className = "bub ia"; b.textContent = txt; st.appendChild(b); st.scrollTop = st.scrollHeight; try { pintarPregs(); } catch (e) {} });
  };
  window.ChispaPanel = { enServidor, recargar: () => { BAND = MET = ANU = REG = AVI = null; if (MIAS.includes(TAB)) pintar(TAB); }, _demo: demo };
})();
