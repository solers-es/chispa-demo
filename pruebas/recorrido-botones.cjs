/* =====================================================================
   Chispa · recorrido de TODOS los botones (Playwright, su propio Chromium)
   ---------------------------------------------------------------------
   Abre la web en modo demostración (sin servidor), entra en cada pantalla
   (portada, cada pestaña del panel, cada pestaña del Estudio) y pulsa uno
   a uno todos los botones visibles. Por cada uno mira si HACE algo: abre
   ventana, cambia la pantalla, avisa, navega, abre pestaña o descarga.
   Apunta: errores de programa, botones que no hacen nada y avisos que
   prometen sin hacer («próximamente», «(demo)»).
   Uso: PUERTO_API=8848 PUERTO_WEB=8845 NODE_PATH=<…> node pruebas/recorrido-botones.cjs [ordenador|iphone] [servidor]
   ===================================================================== */
const { chromium, devices } = require('playwright-core');
const { arrancar } = require('./servidor-simulador.cjs');

(async () => {
  const s = await arrancar();
  const b = await chromium.launch();
  const modo = process.argv[2] || 'ordenador';
  const ctx = await b.newContext(modo === 'iphone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 900 } });
  // nada sale a internet salvo lo necesario para pintar (fotos, tipografías, cdnjs)
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => (/cdnjs|fonts\.|unsplash|images\./.test(r.request().url()) ? r.continue() : r.fulfill({ status: 204, body: '' })));
  const pg = await ctx.newPage();
  const errores = [], promesas = [], muertos = [], fallosClic = [];
  pg.on('pageerror', (e) => errores.push(e.message));
  pg.on('dialog', (d) => d.dismiss().catch(() => {}));
  let popups = 0; ctx.on('page', (p) => { if (p !== pg) { popups++; p.close().catch(() => {}); } });
  let descargas = 0; pg.on('download', () => descargas++);
  // con «servidor» como 2.º argumento: como un visitante SIN código con el servidor encendido (CHISPA_SERVIDOR)
  const PAGINA = s.web + '/index.html' + (process.argv[3] === 'servidor' ? '?servidor=' + encodeURIComponent(s.base) : '?servidor=no');
  await pg.goto(PAGINA, { waitUntil: 'load' });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { try { localStorage.setItem('chispa_tour_visto', '1'); } catch (e) {} });

  const tabs = await pg.evaluate(() => TABS.map((t) => t.id));
  const pantallas = [['landing', null]].concat(tabs.map((t) => ['panel', t]));
  const etabs = await pg.evaluate(() => (typeof ETABS !== 'undefined' ? ETABS.map((t) => t.id) : []));
  etabs.forEach((t) => pantallas.push(['estudio', t]));
  let pulsados = 0;
  const abrirPantalla = async (v, t) => pg.evaluate(([v, t]) => { try { window.ChispaTour && ChispaTour.cerrar(); } catch (e) {} try { cerrarModal(); } catch (e) {} try { document.querySelectorAll('.ov.on,#chatOv.on').forEach((x) => x.classList.remove('on')); } catch (e) {} vista(v); if (v === 'panel') panel(t); if (v === 'estudio') estudio(t); window.scrollTo(0, 0); }, [v, t]);
  const firma = () => pg.evaluate(() => {
    const m = document.getElementById(document.getElementById('app').classList.contains('on') ? 'main' : document.getElementById('estudioApp').classList.contains('on') ? 'estudioApp' : 'landing');
    const mo = document.getElementById('modalOv'), t = document.getElementById('toast');
    const ovs = [...document.querySelectorAll('[class*="ov"].on, [class*="modal"].on, [class*="Ov"].on, dialog[open], [role="dialog"]')].length;
    const h = (x) => { let n = 7; for (let i = 0; i < x.length; i++) n = (n * 31 + x.charCodeAt(i)) | 0; return n; };
    return { html: (m ? h(m.innerHTML) : '') + ':' + h(document.body.innerHTML), modal: !!(mo && mo.classList.contains('on')), toast: t ? t.textContent + (t.classList.contains('on') ? '1' : '0') : '', url: location.href, ovs, scroll: Math.round(window.scrollY) };
  });
  for (const [v, t] of pantallas) {
    await abrirPantalla(v, t); await pg.waitForTimeout(400);
    const raiz = v === 'panel' ? '#main' : v === 'estudio' ? '#estudioApp' : '#landing';
    const n = await pg.locator(raiz + ' button:visible, ' + raiz + ' a.btn:visible').count();
    for (let i = 0; i < n; i++) {
      await abrirPantalla(v, t); await pg.waitForTimeout(150);
      const bs = pg.locator(raiz + ' button:visible, ' + raiz + ' a.btn:visible');
      if (i >= (await bs.count())) break;
      let bt = bs.nth(i);
      // si algo lo tapa (una ventana que no se cierra con cerrarModal, p. ej. el alta), se recarga la página
      const tapado = async (x) => x.evaluate((el) => { el.scrollIntoView({ block: 'center' }); const q = el.getBoundingClientRect(); const y = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return !(y && (y === el || el.contains(y))); }).catch(() => true);
      if (await tapado(bt)) {
        await pg.goto(PAGINA, { waitUntil: 'load' }); await pg.waitForTimeout(900); await abrirPantalla(v, t); await pg.waitForTimeout(200);
        bt = pg.locator(raiz + ' button:visible, ' + raiz + ' a.btn:visible').nth(i);
        if (await tapado(bt)) { fallosClic.push((t || v) + ' › botón ' + i + ': tapado por otra cosa'); continue; }
      }
      const nombre = ((await bt.innerText().catch(() => '')) || (await bt.getAttribute('aria-label').catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 50);
      await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.textContent = ''; });
      const antes = await firma(), pop = popups, des = descargas;
      try { await bt.click({ timeout: 1500, force: true }); } catch (e) { fallosClic.push((t || v) + ' › «' + nombre + '»: ' + String(e.message).split('\n')[0].slice(0, 120)); continue; }
      await pg.waitForTimeout(450);
      const desp = await firma().catch(() => antes);
      pulsados++;
      const tostada = desp.toast !== antes.toast ? desp.toast.slice(0, -1) : '';
      if (/pr[oó]ximamente|\(demo\)/i.test(tostada)) promesas.push((t || v) + ' › «' + nombre + '» → ' + tostada);
      const hizo = desp.html !== antes.html || desp.modal !== antes.modal || tostada || desp.url !== antes.url || popups > pop || descargas > des || desp.ovs !== antes.ovs || desp.scroll !== antes.scroll;
      if (!hizo) muertos.push((t || v) + ' › «' + nombre + '»');
      if (pg.url().indexOf(s.web) !== 0) { await pg.goto(PAGINA, { waitUntil: 'load' }); await pg.waitForTimeout(800); }
    }
  }
  console.log('Pantallas: ' + pantallas.length + ' · botones pulsados: ' + pulsados);
  console.log('Errores de programa (' + errores.length + '):\n  ' + [...new Set(errores)].join('\n  '));
  console.log('Avisos que prometen sin hacer (' + promesas.length + '):\n  ' + promesas.join('\n  '));
  console.log('Botones que no parecen hacer nada (' + muertos.length + '):\n  ' + muertos.join('\n  '));
  console.log('Botones que no se pudieron pulsar (' + fallosClic.length + '):\n  ' + fallosClic.slice(0, 40).join('\n  '));
  await b.close(); s.cerrar();
  process.exit(errores.length || promesas.length ? 1 : 0);
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
