/* =====================================================================
   Chispa · ALTA SOLA, MI PLAN, CLIENTES DEL SERVIDOR Y PIE LEGAL (trabajador H)
   ---------------------------------------------------------------------
   · #alta (o cualquier botón de precios → elegir(plan)): nombre del negocio
     o creador, sector (sectores.js), idioma, correo y plan → crea el
     negocio EN EL SERVIDOR (POST /alta, con anti-robots), le da su código
     de acceso y le deja DENTRO en modo cliente con su sector, en prueba
     gratis de ChispaPrecios.DIAS_PRUEBA días.
   · «💳 Mi plan» en el panel (solo negocios con cuenta en el servidor):
     plan, días de prueba, uso frente a los límites, contratar (Stripe
     Checkout, si está encendido), gestionar/baja (portal de Stripe) y
     borrar la cuenta.
   · En «Mis clientes» (modo Solers): tarjeta «☁️ Altas y pagos» con todos
     los negocios del servidor, su plan y su estado de pago.
   · Pie con los textos legales (legal/) en el panel.

   Cómo entra en modo cliente: reutiliza el enlace de cliente de
   chispa-cuentas.js (?cliente=…&d=…) para que el aparato quede SOLO con su
   negocio y su sector. Antes guarda una copia de lo que hubiera en este
   navegador (clave chispa_cuentas_respaldo) por si era el de El Paraíso:
   #recuperar la devuelve.
   Sin FileReader. Todo en español.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.ChispaPrecios) return;
  var P = window.ChispaPrecios;
  var LS_ALTA = 'chispa_cuentas_alta', LS_RESPALDO = 'chispa_cuentas_respaldo', LS_ADMIN_SRV = 'chispa_admin_servidor';
  var POR_DEFECTO = 'https://chispa-api.solers.workers.dev';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (s == null ? '' : '' + s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } return true; }
  function lsJson(k) { try { return JSON.parse(ls(k) || 'null'); } catch (e) { return null; } }
  function aviso(m) { try { window.toast(m); } catch (e) {} }
  function fecha(t) { try { return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }

  var IDIOMAS = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português', nl: 'Nederlands', ca: 'Català', ar: 'العربية', zh: '中文', ja: '日本語', ru: 'Русский' };
  function nombreIdioma(c) { return IDIOMAS[c] || IDIOMAS[String(c).slice(0, 2)] || c; }

  /* ---------- servidor ---------- */
  var ALTA = lsJson(LS_ALTA);
  (function () { try { var p = new URLSearchParams(location.search).get('servidor'); if (p && p !== 'no' && (/^https:\/\//.test(p) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(p))) ls('chispa_servidor', p.replace(/\/$/, '')); } catch (e) {} })();
  function servidor() { return String(window.CHISPA_SERVIDOR || ls('chispa_servidor') || (ALTA && ALTA.servidor) || POR_DEFECTO).replace(/\/$/, ''); }
  function sesion() { var s = lsJson('chispa_sesion'); return s && s.sesion ? s : null; }
  function llamar(metodo, ruta, cuerpo, cab) {
    var h = { 'Content-Type': 'application/json' };
    var s = sesion(); if (s && s.servidor === servidor()) h.Authorization = 'Bearer ' + s.sesion;
    for (var k in (cab || {})) h[k] = cab[k];
    return fetch(servidor() + ruta, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || ('Error ' + r.status)); e.status = r.status; e.datos = j; throw e; } return j; }); },
        function () { throw new Error('Sin conexión con el servidor de Chispa. Revisa internet y vuelve a probar.'); });
  }

  /* Un aparato dado de alta aquí: la sincronización usa su servidor (chispa-sync.js se carga después) */
  function esReg() { return lsJson('chispa_cuentas_v1'); }
  (function () {
    var R = esReg();
    if (ALTA && R && R.cliente === ALTA.negocio) {
      if (!window.CHISPA_SERVIDOR) window.CHISPA_SERVIDOR = ALTA.servidor;
      if (!ALTA.preparado && window.S && S.negocio && S.negocio._cuenta === ALTA.negocio) { // primera vez dentro: su idioma y sin la ciudad de El Paraíso
        S.negocio.idioma = { codigo: ALTA.idioma || 'es', nombre: nombreIdioma(ALTA.idioma || 'es') };
        if (S.negocio.ciudad === 'Palma de Mallorca') S.negocio.ciudad = '';
        S.negocio.correo = ALTA.correo || '';
        try { window.guardar(); } catch (e) {}
        ALTA.preparado = 1; ls(LS_ALTA, JSON.stringify(ALTA));
      }
    }
  })();
  function esClienteServidor() { var R = esReg(); return !!(ALTA && R && R.cliente === ALTA.negocio); }


  /* ---------- estilos ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#altaPag{position:fixed;inset:0;z-index:60;background:var(--bg,#0b0b14);overflow-y:auto;display:none;-webkit-overflow-scrolling:touch}' +
    '#altaPag.on{display:block}#altaPag .al-w{max-width:620px;margin:0 auto;padding:18px 16px 60px}' +
    '#altaPag .al-top{display:flex;align-items:center;gap:10px;margin-bottom:6px}#altaPag .al-top .x{margin-left:auto;background:none;border:1px solid var(--line);color:var(--tx2);border-radius:10px;padding:8px 12px;cursor:pointer;font-size:14px}' +
    '#altaPag h1{font-size:24px;margin:8px 0 4px}#altaPag .al-sub{color:var(--tx2);font-size:14px;margin:0 0 14px}' +
    '#altaPag .lb{display:block;font-weight:700;font-size:13px;margin:14px 0 6px}' +
    '#altaPag .al-secs{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}' +
    '#altaPag .al-sec{display:flex;align-items:center;gap:8px;background:var(--panel2);border:1px solid var(--line);color:var(--tx);border-radius:12px;padding:10px;cursor:pointer;font-size:13px;text-align:left;min-height:44px}' +
    '#altaPag .al-sec.on{border-color:var(--purple);background:rgba(139,92,246,.18)}#altaPag .al-sec .i{font-size:20px}' +
    '#altaPag .al-planes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}@media(max-width:520px){#altaPag .al-planes{grid-template-columns:1fr}}' +
    '#altaPag .al-plan{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:10px;cursor:pointer;color:var(--tx);text-align:left}' +
    '#altaPag .al-plan.on{border-color:var(--purple);box-shadow:0 0 0 2px rgba(139,92,246,.3)}#altaPag .al-plan b{display:block;font-size:15px}#altaPag .al-plan .pr{font-size:18px;font-weight:800;margin:2px 0}#altaPag .al-plan small{color:var(--tx3);font-size:11.5px;display:block}' +
    '#altaPag .al-chk{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--tx2);margin-top:14px;line-height:1.45}#altaPag .al-chk input{width:20px;height:20px;flex:none;margin-top:1px}' +
    '#altaPag a{color:var(--purple2,#a78bfa)}#altaPag .al-err{color:#fb7185;font-size:13px;min-height:18px;margin-top:10px}' +
    '#altaPag .al-info{font-size:11.5px;color:var(--tx3);line-height:1.45;margin-top:16px;border-top:1px solid var(--line);padding-top:10px}' +
    '#altaPag .al-cod{font-family:ui-monospace,Menlo,monospace;font-size:26px;font-weight:800;letter-spacing:2px;text-align:center;background:var(--panel2);border:1px dashed var(--purple);border-radius:14px;padding:14px;margin:10px 0;user-select:all}' +
    '#altaPag .al-trampa{position:absolute;left:-5000px;width:1px;height:1px;overflow:hidden}' +
    '.al-ban{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;background:rgba(52,211,153,.10);border:1px solid rgba(52,211,153,.4);border-radius:12px;padding:9px 12px;margin-bottom:12px}.al-ban span{flex:1 1 200px}.al-ban.mal{background:rgba(251,113,133,.10);border-color:rgba(251,113,133,.5)}' +
    '.al-uso{margin:8px 0}.al-uso .t{display:flex;justify-content:space-between;font-size:13px}.al-uso .b{height:8px;border-radius:6px;background:var(--panel2);overflow:hidden;margin-top:4px}.al-uso .b i{display:block;height:100%;background:var(--purple)}' +
    '.al-pie{font-size:11.5px;color:var(--tx3);text-align:center;margin:26px 0 70px;line-height:1.8}.al-pie a{color:var(--tx3)}' +
    '.al-tabla{width:100%;border-collapse:collapse;font-size:12.5px}.al-tabla td,.al-tabla th{border-bottom:1px solid var(--line);padding:7px 5px;text-align:left;vertical-align:top}.al-tabla th{color:var(--tx3);font-weight:700}' +
    '.al-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}' +
    '.al-est{font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:20px;border:1px solid var(--line);white-space:nowrap}.al-est.prueba{color:var(--amber);border-color:rgba(255,176,32,.5)}.al-est.activa,.al-est.interno{color:var(--verde);border-color:rgba(52,211,153,.5)}.al-est.caducada,.al-est.cancelada,.al-est.impago{color:#fb7185;border-color:rgba(251,113,133,.5)}';
  document.head.appendChild(css);

  /* ---------- página de alta ---------- */
  var F = { plan: 'pro', sector: '', aMano: false, reto: null, enviando: false, turnstile: null, tsWidget: null };
  var pag = document.createElement('div'); pag.id = 'altaPag'; pag.setAttribute('role', 'dialog'); pag.setAttribute('aria-label', 'Alta en Chispa');
  document.body.appendChild(pag);

  function sectores() { try { return window.ChispaSector ? ChispaSector.lista() : []; } catch (e) { return []; } }
  function htmlForm() {
    var idiomas = Object.keys(IDIOMAS).map(function (c) { return '<option value="' + c + '"' + (c === 'es' ? ' selected' : '') + '>' + esc(IDIOMAS[c]) + '</option>'; }).join('') + '<option value="otro">Otro…</option>';
    return '<div class="al-w"><div class="al-top"><div class="logo"><span class="bolt">⚡</span> <span class="sp">Chispa</span></div><button class="x" onclick="ChispaAlta.cerrar()">✕ Cerrar</button></div>' +
      '<h1>Empieza gratis ' + P.DIAS_PRUEBA + ' días</h1><p class="al-sub">Sin tarjeta y sin permanencia. En un minuto tienes tu Chispa con todo lo de tu sector puesto.</p>' +
      '<form id="alForm" onsubmit="ChispaAlta.enviar();return false" novalidate autocomplete="on">' +
      '<label class="lb" for="alNom">Nombre de tu negocio o de tu marca</label><input class="inp" id="alNom" name="organization" maxlength="80" placeholder="Ej: Peluquería Marga, @recetasdeana…" oninput="ChispaAlta.detectar()" required>' +
      '<label class="lb">¿A qué te dedicas?</label><div class="al-secs" id="alSecs">' +
      sectores().map(function (s) { return '<button type="button" class="al-sec" data-s="' + s.id + '" onclick="ChispaAlta.sector(\'' + s.id + '\',true)"><span class="i">' + s.icono + '</span><span>' + esc(s.nombre) + '</span></button>'; }).join('') +
      '</div><div id="alSug" style="font-size:12px;color:var(--tx3);margin-top:6px;min-height:15px"></div>' +
      '<label class="lb" for="alIdi">Idioma de tus publicaciones</label><select class="inp" id="alIdi" onchange="document.getElementById(\'alIdiO\').style.display=this.value===\'otro\'?\'block\':\'none\'">' + idiomas + '</select>' +
      '<input class="inp" id="alIdiO" style="display:none;margin-top:6px" placeholder="Código del idioma: pt-BR, sv, pl…" maxlength="16" autocapitalize="off">' +
      '<label class="lb" for="alCor">Tu correo</label><input class="inp" id="alCor" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="off" placeholder="tu@correo.com" required>' +
      '<div class="al-trampa" aria-hidden="true"><label>Web (no rellenar)<input id="alWeb" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="lb">Plan (pagas solo si sigues después de la prueba)</label><div class="al-planes" id="alPlanes">' +
      P.planes.map(function (p) { return '<button type="button" class="al-plan' + (p.id === F.plan ? ' on' : '') + '" data-p="' + p.id + '" onclick="ChispaAlta.plan(\'' + p.id + '\')"><b>' + esc(p.nombre) + '</b><div class="pr">' + p.precio + ' €<span style="font-size:12px;font-weight:600">/mes</span></div><small>+ IVA · ' + p.limites.publicacionesMes + ' publicaciones/mes · ' + p.limites.usuarios + ' usuario' + (p.limites.usuarios === 1 ? '' : 's') + '</small></button>'; }).join('') +
      '</div>' +
      '<label class="al-chk"><input type="checkbox" id="alAcepto"><span>He leído y acepto los <a href="legal/terminos.html" target="_blank" rel="noopener">Términos de contratación</a> y la <a href="legal/privacidad.html" target="_blank" rel="noopener">Política de privacidad</a>, y el <a href="legal/encargo-tratamiento.html" target="_blank" rel="noopener">Contrato de encargo del tratamiento</a> para los datos de mis clientes.</span></label>' +
      '<div id="alTs" style="margin-top:12px"></div>' +
      '<div class="al-err" id="alErr" role="alert"></div>' +
      '<button class="btn pp" id="alBtn" type="submit" style="width:100%;margin-top:6px;min-height:48px;font-size:16px">✨ Crear mi Chispa gratis</button>' +
      '</form>' +
      '<div class="al-info"><b>Protección de datos (información básica).</b> Responsable: Solers (sociedad en constitución). Finalidad: crear y gestionar tu cuenta de Chispa y prestarte el servicio. Base: el contrato que aceptas. Destinatarios: proveedores que alojan el servicio (Cloudflare) y, si contratas, el de pagos (Stripe); no vendemos datos. Derechos: acceso, rectificación, supresión, oposición, limitación y portabilidad en admin@solers.es. Más información en la <a href="legal/privacidad.html" target="_blank" rel="noopener">Política de privacidad</a>.' +
      ' · <a href="legal/aviso-legal.html" target="_blank" rel="noopener">Aviso legal</a> · <a href="legal/cookies.html" target="_blank" rel="noopener">Cookies</a></div></div>';
  }
  function pedirReto() {
    F.reto = null;
    return llamar('GET', '/alta/reto').then(function (r) {
      F.reto = r; F.retoCuando = Date.now();
      if (r.turnstile) ponerTurnstile(r.turnstile);
      return r;
    }, function (e) { $('alErr') && ($('alErr').textContent = e.message); });
  }
  function ponerTurnstile(sitio) {
    var caja = $('alTs'); if (!caja || F.tsWidget != null) return;
    function pintar() { try { F.tsWidget = window.turnstile.render(caja, { sitekey: sitio, language: 'es', callback: function (t) { F.turnstile = t; }, 'expired-callback': function () { F.turnstile = null; } }); } catch (e) {} }
    if (window.turnstile) return pintar();
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = pintar; document.head.appendChild(s);
  }
  /* prueba de trabajo: SHA-256(reto:n) con «dificultad» bits a cero */
  function resolver(reto, dif) {
    var enc = new TextEncoder(), n = 0;
    function bits(b) { var c = 0; for (var i = 0; i < b.length; i++) { if (b[i] === 0) { c += 8; continue; } c += Math.clz32(b[i]) - 24; break; } return c; }
    return new Promise(function (ok, mal) {
      (function lote() {
        var prom = [];
        for (var k = 0; k < 256; k++) prom.push(crypto.subtle.digest('SHA-256', enc.encode(reto + ':' + (n + k))));
        Promise.all(prom).then(function (hs) {
          for (var k = 0; k < hs.length; k++) if (bits(new Uint8Array(hs[k])) >= dif) return ok(String(n + k));
          n += 256; if (n > 5e6) return mal(new Error('No se pudo comprobar')); setTimeout(lote, 0);
        }, mal);
      })();
    });
  }
  function err(m) { var e = $('alErr'); if (e) e.textContent = m || ''; }
  var API = {
    abrir: function (plan) {
      if (plan && P.plan(plan)) F.plan = P.plan(plan).id;
      F.tsWidget = null; F.turnstile = null;
      pag.innerHTML = htmlForm(); pag.classList.add('on'); pag.scrollTop = 0;
      try { document.body.style.overflow = 'hidden'; } catch (e) {}
      if (location.hash !== '#alta') try { history.replaceState(null, '', location.pathname + location.search + '#alta'); } catch (e) {}
      pedirReto();
      setTimeout(function () { var i = $('alNom'); if (i && window.innerWidth > 700) i.focus(); }, 60);
    },
    cerrar: function () {
      pag.classList.remove('on'); try { document.body.style.overflow = ''; } catch (e) {}
      if (/alta/.test(location.hash)) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    },
    plan: function (id) { F.plan = id; Array.prototype.forEach.call(document.querySelectorAll('#alPlanes .al-plan'), function (b) { b.classList.toggle('on', b.getAttribute('data-p') === id); }); },
    sector: function (id, aMano) { F.sector = id; if (aMano) F.aMano = true; Array.prototype.forEach.call(document.querySelectorAll('#alSecs .al-sec'), function (b) { b.classList.toggle('on', b.getAttribute('data-s') === id); }); },
    detectar: function () {
      var v = ($('alNom') || {}).value || '', id = null;
      try { id = window.ChispaSector && ChispaSector.detectar(v); } catch (e) {}
      if (/^@/.test(v.trim())) id = id || 'creador';
      var ok = id && sectores().some(function (s) { return s.id === id; });
      if (ok && !F.aMano) { API.sector(id); var s = ChispaSector.get(id); $('alSug').innerHTML = 'Por el nombre parece <b>' + esc(s.icono + ' ' + s.nombre) + '</b> (puedes tocar otro)'; }
    },
    enviar: function () {
      if (F.enviando) return;
      var nom = ($('alNom').value || '').trim(), cor = ($('alCor').value || '').trim(), idi = $('alIdi').value;
      if (idi === 'otro') idi = ($('alIdiO').value || '').trim();
      if (nom.length < 2) { err('Escribe el nombre de tu negocio o de tu marca'); $('alNom').focus(); return; }
      if (!F.sector) { err('Toca a qué te dedicas'); return; }
      if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8}){0,2}$/.test(idi)) { err('Ese código de idioma no vale (ejemplos: pt-BR, sv, pl)'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(cor)) { err('Escribe un correo válido: ahí te avisamos antes de que acabe la prueba'); $('alCor').focus(); return; }
      if (!$('alAcepto').checked) { err('Para seguir, marca que aceptas los términos y la política de privacidad'); return; }
      if (F.reto && F.reto.turnstile && !F.turnstile) { err('Marca la casilla «No soy un robot»'); return; }
      F.enviando = true; err('');
      var b = $('alBtn'); b.disabled = true; b.textContent = '🤖 Comprobando que no eres un robot…';
      var listo = F.reto ? Promise.resolve(F.reto) : pedirReto();
      listo.then(function (r) {
        if (!r) throw new Error('Sin conexión con el servidor de Chispa');
        var espera = Math.max(0, 3200 - (Date.now() - F.retoCuando)); // el servidor no admite altas instantáneas
        return resolver(r.reto, r.dificultad).then(function (sol) { return new Promise(function (ok) { setTimeout(function () { ok(sol); }, espera); }); }).then(function (sol) {
          b.textContent = '✨ Creando tu Chispa…';
          return llamar('POST', '/alta', { nombre: nom, sector: F.sector, idioma: idi, correo: cor, plan: F.plan, acepto: true, reto: r.reto, solucion: sol, turnstile: F.turnstile, web: ($('alWeb') || {}).value || '' });
        });
      }).then(function (j) { F.enviando = false; listoAlta(j, cor); }, function (e) {
        F.enviando = false; b.disabled = false; b.textContent = '✨ Crear mi Chispa gratis';
        err(e.message || 'No se pudo crear');
        if (e.datos && /^reto/.test(e.datos.motivo || '')) pedirReto();
        if (e.datos && e.datos.motivo === 'turnstile') { try { window.turnstile.reset(F.tsWidget); } catch (x) {} F.turnstile = null; }
      });
    },
    entrar: function () { entrarAhora(); },
    restaurar: restaurar
  };
  window.ChispaAlta = API;

  var HECHA = null;
  function listoAlta(j, correo) {
    HECHA = { j: j, correo: correo };
    var pago = j.pago && j.pago.encendido;
    var adminAqui = !!(window.ChispaCuentas && ChispaCuentas.esAdministrador && ChispaCuentas.esAdministrador());
    pag.innerHTML = '<div class="al-w"><div class="al-top"><div class="logo"><span class="bolt">⚡</span> <span class="sp">Chispa</span></div></div>' +
      '<h1>🎉 ¡Tu Chispa está lista!</h1><p class="al-sub"><b>' + esc(j.nombre) + '</b> · plan ' + esc(j.nombrePlan) + ' · prueba gratis hasta el <b>' + esc(fecha(j.pruebaHasta)) + '</b>.</p>' +
      '<label class="lb">Tu código de acceso (guárdalo: con él entras desde cualquier móvil u ordenador)</label>' +
      '<div class="al-cod" id="alCod">' + esc(j.codigo) + '</div>' +
      '<div style="font-size:12.5px;color:var(--tx2);text-align:center">Tu negocio en Chispa: <b>' + esc(j.negocio) + '</b></div>' +
      '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn g" style="flex:1" onclick="ChispaAlta._copiar()">📋 Copiar</button>' +
      '<button class="btn g" style="flex:1" onclick="ChispaAlta._mail()">✉️ Enviármelo al correo</button></div>' +
      '<div class="card" style="margin-top:14px;font-size:13px;color:var(--tx2)">' + (pago ? '💳 Durante la prueba no se cobra nada. Antes de que acabe podrás elegir pagar con tarjeta en «💳 Mi plan».' :
        '🧪 <b>Modo prueba sin cobro:</b> el pago con tarjeta todavía no está activado, así que no se te cobrará nada. Antes de que termine la prueba te escribimos a <b>' + esc(correo) + '</b> para seguir.') + '</div>' +
      (adminAqui ? '<div class="cc-aviso" style="margin-top:12px">Este navegador está en <b>modo Solers</b>: no te meto aquí para no mezclar tus clientes. Abre este enlace en otro navegador o en el móvil del cliente:<input class="inp" readonly style="margin-top:6px" onclick="this.select()" value="' + esc(enlaceCliente(j)) + '"></div>' :
        '<button class="btn pp" style="width:100%;margin-top:14px;min-height:50px;font-size:16px" onclick="ChispaAlta.entrar()">Entrar en mi Chispa ›</button>') +
      '</div>';
    try { history.replaceState(null, '', location.pathname + location.search + '#alta-lista'); } catch (e) {}
  }
  API._copiar = function () {
    var t = HECHA ? 'Chispa · negocio ' + HECHA.j.negocio + ' · código ' + HECHA.j.codigo : '';
    var ok = function () { aviso('📋 Copiado'); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(ok, function () { aviso('Mantén pulsado el código para copiarlo'); }); return; } } catch (e) {}
    aviso('Mantén pulsado el código para copiarlo');
  };
  API._mail = function () {
    if (!HECHA) return;
    location.href = 'mailto:' + encodeURIComponent(HECHA.correo) + '?subject=' + encodeURIComponent('Mi acceso a Chispa') + '&body=' + encodeURIComponent('Negocio: ' + HECHA.j.negocio + '\nCódigo de acceso: ' + HECHA.j.codigo + '\nEntrar: ' + location.origin + location.pathname + '#conectar\n');
  };
  function b64(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function enlaceCliente(j) { return location.origin + location.pathname + '?cliente=' + encodeURIComponent(j.codigo) + '&d=' + b64({ i: j.negocio, n: j.nombre, s: j.sector, c: j.codigo }); }
  function entrarAhora() {
    if (!HECHA) return;
    var j = HECHA.j;
    // copia de lo que hubiera en este navegador (p. ej. El Paraíso) antes de dejarlo solo con el negocio nuevo
    try {
      var R = esReg(), copia = {};
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && /^chispa/.test(k) && k !== LS_RESPALDO && k !== LS_ALTA) copia[k] = localStorage.getItem(k); }
      if (R && !R.cliente && Object.keys(copia).length) localStorage.setItem(LS_RESPALDO, JSON.stringify({ cuando: Date.now(), claves: copia }));
    } catch (e) { /* sin espacio: se sigue (los datos de un cliente nuevo no se pierden: están en el servidor) */ }
    ALTA = { servidor: servidor(), negocio: j.negocio, nombre: j.nombre, sector: j.sector, idioma: j.idioma, correo: HECHA.correo, plan: j.plan, pruebaHasta: j.pruebaHasta, creado: Date.now() };
    ls(LS_ALTA, JSON.stringify(ALTA));
    ls('chispa_sesion', JSON.stringify({ servidor: servidor(), sesion: j.sesion, negocio: j.negocio, nombre: j.nombre, rol: 'dueno', esAdministrador: true, cuentasId: j.negocio }));
    location.replace(enlaceCliente(j).replace(/#.*$/, '') + '#panel');
  }
  function restaurar() {
    var r = lsJson(LS_RESPALDO);
    if (!r) { aviso('No hay ninguna copia guardada en este navegador'); return; }
    if (!confirm('¿Volver a poner en este navegador lo que había antes del alta (' + fecha(r.cuando) + ')? Tu negocio nuevo sigue guardado en el servidor: entras otra vez con tu código.')) return;
    try {
      var quitar = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && /^chispa/.test(k) && k !== LS_RESPALDO) quitar.push(k); }
      quitar.forEach(function (k) { localStorage.removeItem(k); });
      Object.keys(r.claves).forEach(function (k) { localStorage.setItem(k, r.claves[k]); });
      localStorage.removeItem(LS_RESPALDO);
    } catch (e) { aviso('No se pudo: ' + e.message); return; }
    location.replace(location.pathname + '#panel'); location.reload();
  }

  /* ---------- los botones de precios llevan al alta ---------- */
  window.elegir = function (plan) { API.abrir(plan); };
  (function heroCta() {
    var h = document.querySelector('#landing .heroCta');
    if (h && !$('alHero')) { var b = document.createElement('button'); b.id = 'alHero'; b.className = 'btn pp'; b.textContent = '🚀 Empieza gratis ' + P.DIAS_PRUEBA + ' días'; b.onclick = function () { API.abrir('pro'); }; h.insertBefore(b, h.firstChild.nextSibling); }
  })();

  /* ---------- «💳 Mi plan» ---------- */
  var TAB_PLAN = { id: 'plan', ic: '💳', nm: 'Mi plan' };
  function ponerTab() { if (esClienteServidor() && window.TABS && TABS.indexOf(TAB_PLAN) < 0) { TABS.push(TAB_PLAN); try { pintarNav(); } catch (e) {} } }
  var CUENTA = null;
  function cargarCuenta() { return llamar('GET', '/cuenta').then(function (c) { CUENTA = c; return c; }); }
  function barra(nm, usado, max) {
    var pc = max ? Math.min(100, Math.round(usado / max * 100)) : 0;
    return '<div class="al-uso"><div class="t"><span>' + nm + '</span><b>' + usado + ' / ' + max + '</b></div><div class="b"><i style="width:' + pc + '%' + (pc >= 100 ? ';background:#fb7185' : '') + '"></i></div></div>';
  }
  var NOMBRE_ESTADO = { prueba: 'En prueba gratis', activa: 'Activa', caducada: 'Prueba terminada', cancelada: 'Cancelada', impago: 'Pago pendiente', interno: 'Solers' };
  function vPlan(c) {
    if (!c) return '<div class="card">Cargando tu plan…</div>';
    if (c.interno) return '<div class="card"><h2>💳 Mi plan</h2><p style="color:var(--tx2)">Este negocio lo lleva Solers directamente: no tiene límites ni pagos aquí.</p></div>';
    var pago = c.pago && c.pago.encendido, u = c.uso || {}, L = c.limites || {};
    var h = '<div class="hd"><h2>💳 Mi plan</h2></div>' +
      '<div class="card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-size:18px">' + esc(c.nombrePlan) + '</b><span>' + c.precio + ' €/mes + IVA</span><span class="al-est ' + c.estado + '">' + esc(NOMBRE_ESTADO[c.estado] || c.estado) + '</span></div>' +
      (c.estado === 'prueba' ? '<p style="color:var(--tx2);font-size:13.5px;margin:8px 0 0">Te quedan <b>' + c.diasQuedan + ' día' + (c.diasQuedan === 1 ? '' : 's') + '</b> de prueba (hasta el ' + esc(fecha(c.pruebaHasta)) + ').</p>' : '') +
      (c.estado === 'caducada' ? '<p style="color:#fb7185;font-size:13.5px;margin:8px 0 0">Tu prueba terminó el ' + esc(fecha(c.pruebaHasta)) + '. Tus datos siguen guardados; elige un plan para volver a publicar.</p>' : '') +
      (c.estado === 'impago' ? '<p style="color:#fb7185;font-size:13.5px;margin:8px 0 0">No se pudo cobrar. Actualiza la tarjeta en «Gestionar pago».</p>' : '') +
      (c.pagadoHasta && c.estado === 'activa' ? '<p style="color:var(--tx2);font-size:13.5px;margin:8px 0 0">Pagado hasta el ' + esc(fecha(c.pagadoHasta)) + '.</p>' : '') +
      '</div><div class="card"><b>Lo que llevas usado</b>' +
      barra('Publicaciones este mes', u.publicacionesMes || 0, L.publicacionesMes) + barra('Redes conectadas', u.redes || 0, L.redes) +
      barra('Imágenes IA hoy', u.imagenesDia || 0, L.imagenesDia) + barra('Usuarios', u.usuarios || 1, L.usuarios) + '</div>' +
      '<div class="card"><b>' + (c.estado === 'activa' ? 'Cambiar de plan' : 'Elegir plan') + '</b><div class="al-planes" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-top:8px">' +
      P.planes.map(function (p) { return '<div class="card" style="margin:0' + (p.id === c.plan ? ';border-color:var(--purple)' : '') + '"><b>' + esc(p.nombre) + '</b><div style="font-size:18px;font-weight:800">' + p.precio + ' €<small style="font-size:11px">/mes + IVA</small></div>' +
        '<button class="btn ' + (p.id === c.plan ? 'pp' : 'g') + ' sm" style="width:100%;margin-top:6px" onclick="ChispaAlta._pagar(\'' + p.id + '\')">' + (pago ? (p.id === c.plan && c.estado === 'activa' ? 'Tu plan' : 'Contratar') : 'Quiero este') + '</button></div>'; }).join('') + '</div>' +
      (pago ? '' : '<p style="color:var(--tx3);font-size:12.5px;margin:10px 0 0">🧪 El pago con tarjeta todavía no está activado: sigues gratis y no se te cobra nada. Antes de que acabe la prueba Solers te escribe para seguir.</p>') + '</div>' +
      '<div class="card"><b>Baja y datos</b><p style="color:var(--tx2);font-size:13px;margin:6px 0">Sin permanencia. ' + (c.tieneStripe ? 'Desde «Gestionar pago» cambias la tarjeta, descargas facturas o te das de baja.' : 'Puedes darte de baja cuando quieras.') + ' Al borrar la cuenta se eliminan tu negocio, tus publicaciones y tus conexiones con las redes.</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap">' + (c.tieneStripe && pago ? '<button class="btn g sm" style="flex:none" onclick="ChispaAlta._portal()">⚙️ Gestionar pago y facturas</button>' : '') +
      '<button class="btn g sm" style="flex:none" onclick="ChispaAlta._baja()">🗑️ Darme de baja y borrar mis datos</button></div></div>' +
      '<p style="font-size:12px;color:var(--tx3)">Negocio <b>' + esc(c.negocio) + '</b> · correo ' + esc(c.correo || '') + (c.correoVerificado ? '' : ' (sin verificar)') + '</p>';
    return h;
  }
  API._pagar = function (plan) {
    llamar('POST', '/pago/checkout', { plan: plan }).then(function (j) { location.href = j.url; }, function (e) {
      if (e.datos && e.datos.modoPrueba) {
        var n = (CUENTA && CUENTA.negocio) || '';
        modal('<h3>💜 Plan ' + esc(P.plan(plan).nombre) + '</h3><p style="color:var(--tx2)">' + esc(e.message) + '</p><button class="btn pp" style="width:100%" onclick="location.href=\'mailto:admin@solers.es?subject=' + encodeURIComponent('Chispa · quiero el plan ' + P.plan(plan).nombre + ' · ' + n) + '\'">✉️ Avisar a Solers de que lo quiero</button>');
      } else aviso(e.message);
    });
  };
  API._portal = function () { llamar('POST', '/pago/portal').then(function (j) { location.href = j.url; }, function (e) { aviso(e.message); }); };
  API._baja = function () {
    modal('<h3>🗑️ Darme de baja</h3><p style="color:var(--tx2);font-size:13.5px">Se cancela tu plan (si lo pagas con tarjeta, deja de cobrarse) y se <b>borran</b> tu negocio, tus publicaciones, tus conexiones con las redes y tus accesos en todos los aparatos. No se puede deshacer.</p>' +
      '<label class="lb">Escribe BORRAR para confirmar</label><input class="inp" id="alBorrar" autocapitalize="characters" autocomplete="off"><button class="btn pp" style="width:100%;margin-top:10px;background:#e11d48" onclick="ChispaAlta._bajaOk()">Darme de baja y borrar</button>');
  };
  API._bajaOk = function () {
    if ((($('alBorrar') || {}).value || '').trim().toUpperCase() !== 'BORRAR') { aviso('Escribe BORRAR'); return; }
    llamar('POST', '/cuenta/baja', { confirmar: 'BORRAR' }).then(function () {
      try { var q = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && /^chispa/.test(k)) q.push(k); } q.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
      cerrarModal(); alert('Hecho: te has dado de baja y tus datos se han borrado. Gracias por probar Chispa.'); location.replace(location.pathname); location.reload();
    }, function (e) { aviso(e.message); });
  };
  function banda(c) {
    if (!c || c.interno) return '';
    if (c.estado === 'prueba') return '<div class="al-ban" data-sin-sector>🎁 <span>Prueba gratis: te quedan <b>' + c.diasQuedan + ' día' + (c.diasQuedan === 1 ? '' : 's') + '</b> del plan ' + esc(c.nombrePlan) + '.</span><button class="btn g sm" onclick="panel(\'plan\')">Mi plan ›</button></div>';
    if (c.estado !== 'activa') return '<div class="al-ban mal" data-sin-sector>⚠️ <span><b>' + esc(NOMBRE_ESTADO[c.estado]) + ':</b> no se publica nada hasta que elijas un plan. Tus datos siguen guardados.</span><button class="btn pp sm" onclick="panel(\'plan\')">Elegir plan ›</button></div>';
    return '';
  }

  /* ---------- «☁️ Altas y pagos» en Mis clientes (modo Solers) ---------- */
  function tarjetaAdmin() {
    return '<div class="card" id="alAdm" data-sin-sector style="margin-top:14px"><div class="hd" style="margin:0"><h3 style="margin:0">☁️ Altas y pagos (servidor)</h3><button class="btn pp sm" onclick="ChispaAlta._admin()">Ver todos</button></div>' +
      '<p style="color:var(--tx3);font-size:12.5px;margin:6px 0 0">Los negocios que se han dado de alta solos (y los de Solers), con su plan, prueba, estado de pago y uso. Esto sí es del servidor: vale en cualquier aparato.</p><div id="alAdmL"></div></div>';
  }
  function claveAdmin() { return ls(LS_ADMIN_SRV) || ''; }
  API._admin = function () {
    if (!claveAdmin()) {
      modal('<h3>☁️ Clave de administración del servidor</h3><p style="color:var(--tx2);font-size:13px">Es ADMIN_CLAVE (está en el Mac de Stalin, en herramientas/chispa-servidor-claves.txt). Se guarda solo en este navegador.</p><input class="inp" id="alAdmK" type="password" autocomplete="off"><button class="btn pp" style="width:100%;margin-top:10px" onclick="ChispaAlta._adminK()">Guardar y ver</button>');
      return;
    }
    var d = $('alAdmL'); if (d) d.innerHTML = '<p style="color:var(--tx3)">Cargando…</p>';
    llamar('GET', '/admin/clientes', undefined, { 'X-Chispa-Admin': claveAdmin() }).then(function (r) {
      var d = $('alAdmL'); if (!d) return;
      var filas = r.clientes.map(function (c) {
        var u = c.uso || {}, L = c.limites || {};
        return '<tr><td><b>' + esc(c.nombre) + '</b><br><span style="color:var(--tx3)">' + esc(c.id) + (c.sector ? ' · ' + esc(c.sector) : '') + '</span><br><span style="color:var(--tx3)">' + esc(c.correo || '') + '</span></td>' +
          '<td>' + esc(c.nombrePlan || c.plan) + (c.precio ? '<br>' + c.precio + ' €' : '') + '</td>' +
          '<td><span class="al-est ' + c.estado + '">' + esc(NOMBRE_ESTADO[c.estado] || c.estado) + '</span>' + (c.estado === 'prueba' ? '<br>' + c.diasQuedan + ' días' : '') + '</td>' +
          '<td>' + (c.stripeEstado ? esc(c.stripeEstado) : (c.interno ? '—' : 'sin tarjeta')) + (c.pagadoHasta ? '<br>hasta ' + esc(fecha(c.pagadoHasta)) : '') + '</td>' +
          '<td>' + (c.interno ? '—' : (u.publicacionesMes || 0) + '/' + L.publicacionesMes + ' pub · ' + (u.redes || 0) + '/' + L.redes + ' redes · ' + (u.usuarios || 1) + '/' + L.usuarios + ' usu.') + '</td>' +
          '<td>' + (c.interno ? '' : '<select class="inp" style="min-width:110px;padding:6px" onchange="ChispaAlta._adminSet(\'' + c.id + '\',this.value)"><option value="">Cambiar…</option>' +
            P.planes.map(function (p) { return '<option value="plan:' + p.id + '">Plan ' + esc(p.nombre) + '</option>'; }).join('') +
            '<option value="estado:activa">Activar (pagado aparte)</option><option value="dias:14">+14 días de prueba</option><option value="estado:cancelada">Cancelar</option><option value="borrar">🗑️ Borrar negocio</option></select>') + '</td></tr>';
      }).join('');
      d.innerHTML = '<p style="font-size:12.5px;color:var(--tx2);margin:8px 0">' + r.clientes.length + ' negocios · pago con tarjeta: <b>' + (r.pago.encendido ? 'encendido' : 'apagado (modo prueba, no se cobra)') + '</b></p>' +
        '<div class="al-scroll"><table class="al-tabla"><tr><th>Negocio</th><th>Plan</th><th>Estado</th><th>Pago</th><th>Uso</th><th></th></tr>' + filas + '</table></div>';
      // avisos del servidor (trabajador J, panel-real.js): pruebas que acaban en 3 días o menos y reseñas negativas
      llamar('GET', '/admin/avisos', undefined, { 'X-Chispa-Admin': claveAdmin() }).then(function (av) {
        var d2 = $('alAdmL'); if (!d2 || !av.avisos || !av.avisos.length) return;
        d2.insertAdjacentHTML('beforeend', '<h4 style="margin:14px 0 6px">🔔 Avisos</h4>' + av.avisos.slice(0, 20).map(function (a) {
          return '<div style="font-size:12.5px;color:var(--tx2);border-top:1px solid var(--line);padding:5px 0"><b>' + esc(a.nombre || a.negocio) + '</b> · ' + esc(a.titulo) + ' <span style="color:var(--tx3)">' + esc(fecha(a.creado)) + '</span></div>';
        }).join(''));
      }, function () {});
    }, function (e) { if (e.status === 401) ls(LS_ADMIN_SRV, null); var d = $('alAdmL'); if (d) d.innerHTML = '<p style="color:#fb7185">' + esc(e.message) + '</p>'; });
  };
  API._adminK = function () { var v = (($('alAdmK') || {}).value || '').trim(); if (!v) return; ls(LS_ADMIN_SRV, v); cerrarModal(); API._admin(); };
  API._adminSet = function (id, v) {
    if (!v) return;
    var cab = { 'X-Chispa-Admin': claveAdmin() }, p;
    if (v === 'borrar') { if (!confirm('¿Borrar ' + id + ' y TODO lo suyo del servidor? No se puede deshacer.')) return API._admin(); p = llamar('DELETE', '/admin/negocios/' + encodeURIComponent(id), undefined, cab); }
    else { var k = v.split(':'), c = {}; c[k[0] === 'dias' ? 'dias' : k[0]] = k[0] === 'dias' ? Number(k[1]) : k[1]; if (k[0] === 'dias') c.estado = 'prueba'; p = llamar('POST', '/admin/clientes/' + encodeURIComponent(id), c, cab); }
    p.then(function () { aviso('Hecho ✓'); API._admin(); }, function (e) { aviso(e.message); });
  };

  /* ---------- pie legal ---------- */
  var PIE = '<div class="al-pie" data-sin-sector>© 2026 Solers · <a href="legal/aviso-legal.html" target="_blank" rel="noopener">Aviso legal</a> · <a href="legal/privacidad.html" target="_blank" rel="noopener">Privacidad</a> · <a href="legal/terminos.html" target="_blank" rel="noopener">Términos</a> · <a href="legal/cookies.html" target="_blank" rel="noopener">Cookies</a> · <a href="legal/encargo-tratamiento.html" target="_blank" rel="noopener">Encargo del tratamiento</a></div>';

  /* ---------- engancharse a panel() ---------- */
  var panelAntes = window.panel;
  window.panel = function (tab) {
    if (tab === 'plan') {
      if (!esClienteServidor()) tab = 'asistente';
      else {
        TAB = 'plan'; pintarNav(); $('main').innerHTML = vPlan(CUENTA) + PIE; window.scrollTo(0, 0);
        cargarCuenta().then(function (c) { if (TAB === 'plan') $('main').innerHTML = vPlan(c) + PIE; }, function (e) { if (TAB === 'plan') $('main').innerHTML = '<div class="card">' + esc(e.message) + '</div>' + PIE; });
        return;
      }
    }
    var r = panelAntes.apply(this, arguments);
    var m = $('main');
    if (m) {
      if (!m.querySelector('.al-pie')) m.insertAdjacentHTML('beforeend', PIE);
      if (esClienteServidor() && CUENTA && !m.querySelector('.al-ban')) { var b = banda(CUENTA); if (b) m.insertAdjacentHTML('afterbegin', b); }
      if (tab === 'clientes' && window.ChispaCuentas && ChispaCuentas.adminUI && ChispaCuentas.adminUI() && !$('alAdm')) {
        var ult = m.querySelector('#ccLista'); if (ult) ult.insertAdjacentHTML('afterend', tarjetaAdmin());
      }
    }
    return r;
  };

  /* ---------- arranque ---------- */
  ponerTab();
  if (esClienteServidor()) cargarCuenta().then(function () { if ($('app') && $('app').classList.contains('on') && typeof TAB !== 'undefined' && TAB !== 'plan') window.panel(TAB); }, function () {});
  var h = location.hash || '';
  if (/^#alta$/.test(h)) setTimeout(function () { API.abrir(); }, 0);
  else if (/pago-ok/.test(h)) { setTimeout(function () { vista('panel'); window.panel('plan'); aviso('✓ Pago hecho: tu plan se activa en unos segundos'); }, 0); }
  else if (/pago-cancelado/.test(h)) { setTimeout(function () { vista('panel'); window.panel('plan'); aviso('Pago cancelado: no se ha cobrado nada'); }, 0); }
  else if (/mi-plan/.test(h)) setTimeout(function () { vista('panel'); window.panel('plan'); }, 0);
  else if (/recuperar/.test(h)) setTimeout(restaurar, 300);
  else if (/clientes/.test(h) || (typeof TAB !== 'undefined' && TAB === 'clientes' && $('app') && $('app').classList.contains('on'))) { try { if (TAB === 'clientes') window.panel('clientes'); } catch (e) {} }
  else if ($('app') && $('app').classList.contains('on') && typeof TAB !== 'undefined') { try { window.panel(TAB); } catch (e) {} }
  window.addEventListener('hashchange', function () { if (location.hash === '#alta') API.abrir(); });
})();
