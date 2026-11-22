// Graba el vídeo de Chispa escena a escena con el Chromium de Playwright (nunca el Chrome del Mac).
// Uso: node motor.js largo|corto [escenaId ...]   (con ids, graba solo esas: para probar)
// Tres navegadores aislados (contextos):
//   a = visitante: El Paraíso y negocios de EJEMPLO, sin sesión
//   b = negocio de prueba «Café Aurora (ejemplo)» creado con el alta para la grabación (privado/estado-b.json)
//   c = navegador limpio para grabar el alta (el negocio que crea se borra después: borrar-altas.js)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const cache = require('./cache-ia');
const EXE = '/Users/usuario/Library/Caches/ms-playwright/chromium-1234/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = 'https://solers-es.github.io/chispa-demo/';
const modo = process.argv[2] || 'largo';
const solo = process.argv.slice(3);
const W = __dirname;
const P = W + '/privado/';
const guion = require(`${W}/guion-${modo}.js`);
const dur = JSON.parse(fs.readFileSync(`${W}/audio/${modo}/duraciones.json`, 'utf8'));
const OUT = `${W}/grab/${modo}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ahora = () => Date.now() / 1000;
// Lo que nunca debe verse: códigos de acceso, id del negocio y correo.
const OCULTAR = `#alCod,.al-cod{filter:blur(16px)!important}
#altaPag .al-w > div[style*="text-align:center"] b{filter:blur(9px)}
.v-oculto{filter:blur(9px)!important}`;

class H {
  constructor(page, nombre) { this.p = page; this.nombre = nombre; this.extra = null; this.t0 = 0; }
  loc(sel) { return typeof sel === 'string' ? this.p.locator(sel).first() : sel; }
  async v(fn, ...a) { return this.p.evaluate(fn, ...a); }
  async esperar(ms) { await sleep(ms); }
  async verEn(sel, block = 'center') {
    const l = this.loc(sel);
    await l.waitFor({ state: 'attached', timeout: 8000 });
    await l.evaluate((e, b) => e.scrollIntoView({ behavior: 'smooth', block: b }), block);
    await sleep(900);
    return l;
  }
  async caja(sel) {
    const l = this.loc(sel);
    await l.waitFor({ state: 'visible', timeout: 8000 });
    return l.boundingBox();
  }
  async mover(x, y, ms) {
    const p0 = await this.v(() => window.__V.pos());
    const d = Math.hypot(x - p0.x, y - p0.y);
    ms = ms || Math.max(350, Math.min(1100, d * 1.1));
    await this.v(([x, y, ms]) => window.__V.mover(x, y, ms), [x, y, ms]);
    await sleep(ms + 60);
  }
  async apuntar(sel, opt = {}) {
    let b = await this.caja(sel);
    const vh = 810;
    if (b.y < 70 || b.y + Math.min(b.height, 200) > vh - 20) { await this.verEn(sel, opt.block || 'center'); b = await this.caja(sel); }
    const x = b.x + (opt.dx != null ? opt.dx : b.width / 2), y = b.y + (opt.dy != null ? opt.dy : b.height / 2);
    await this.mover(x, y);
    return { x, y, b };
  }
  async resaltar(sel, ms = 1400) {
    try {
      const b = await this.caja(sel);
      await this.v(([x, y, w, h]) => window.__V.resaltar(x, y, w, h), [b.x, b.y, b.width, b.height]);
      if (ms) { await sleep(ms); await this.v(() => window.__V.apagar()); await sleep(250); }
    } catch (e) { console.log('   ! resaltar', String(sel), e.message.split('\n')[0]); }
  }
  async clic(sel, opt = {}) {
    try {
      const { x, y, b } = await this.apuntar(sel, opt);
      if (opt.resaltar !== false) await this.v(([x, y, w, h]) => window.__V.resaltar(x, y, w, h), [b.x, b.y, b.width, b.height]);
      await sleep(opt.pausa || 280);
      await this.v(([x, y]) => window.__V.clic(x, y), [x, y]);
      await this.p.mouse.click(x, y);
      await sleep(180);
      await this.v(() => window.__V.apagar()).catch(() => { });
      await sleep(opt.despues || 500);
      return true;
    } catch (e) { console.log('   ! clic fallido', String(sel), e.message.split('\n')[0]); return false; }
  }
  async escribir(sel, texto, delay = 55) {
    await this.loc(sel).fill('').catch(() => { });
    await this.clic(sel, { despues: 200 });
    await this.p.keyboard.type(texto, { delay });
    await sleep(300);
  }
  async rueda(dy, pasos = 12, ms = 900) {
    for (let i = 0; i < pasos; i++) { await this.p.mouse.wheel(0, dy / pasos); await sleep(ms / pasos); }
    await sleep(250);
  }
  async scrollSuave(sel, y) {
    await this.v(([s, y]) => { const e = s ? document.querySelector(s) : window; e.scrollTo({ top: y, behavior: 'smooth' }); }, [sel, y]);
    await sleep(1000);
  }
  async zoom(sel, s = 1.35, opt = {}) {
    const cont = opt.cont || 'body';
    const b = await this.caja(sel);
    await this.v(([cont, bx, by, bw, bh, s, ms]) => {
      const e = document.querySelector(cont); const r = e.getBoundingClientRect();
      const cx = bx + bw / 2, cy = by + bh / 2;
      const Tx = cx + (720 - cx) * 0.55, Ty = cy + (440 - cy) * 0.55;
      e.style.transition = 'transform ' + ms + 'ms cubic-bezier(.4,0,.2,1)';
      e.style.transformOrigin = (cx - r.left) + 'px ' + (cy - r.top) + 'px';
      e.style.transform = 'translate(' + (Tx - cx) + 'px,' + (Ty - cy) + 'px) scale(' + s + ')';
      window.__zoomEl = cont;
    }, [cont, b.x, b.y, b.width, b.height, s, opt.ms || 1100]);
    await sleep((opt.ms || 1100) + 100);
  }
  async sinZoom(ms = 900) {
    await this.v(ms => {
      const c = window.__zoomEl; if (!c) return; const e = document.querySelector(c); if (!e) return;
      e.style.transition = 'transform ' + ms + 'ms cubic-bezier(.4,0,.2,1)'; e.style.transform = 'none';
      setTimeout(() => { e.style.transition = ''; e.style.transform = ''; e.style.transformOrigin = ''; }, ms + 50);
      window.__zoomEl = null;
    }, ms);
    await sleep(ms + 120);
  }
  async rotulo(n, t, s) { await this.v(([n, t, s]) => window.__V.rotulo(n, t, s), [n, t, s || '']); }
  async quitarRotulo() { await this.v(() => window.__V.quitarRotulo()); }
  async tarjeta(html) { await this.v(h => window.__V.tarjeta(h), html); }
  async quitarTarjeta() { await this.v(() => window.__V.quitarTarjeta()); await sleep(650); }
  async cerrarTodo() {
    await this.v(() => { ['cmCerrar', 'cerrarModal', 'cerrarChat'].forEach(f => { try { window[f](); } catch (e) { } }); });
    await sleep(400);
  }
  async pestana(nombre) { return this.clic(this.p.locator('#nav button', { hasText: nombre }).first(), { despues: 900 }); }
  async panel(tab) { await this.v(t => { vista('panel'); if (t) panel(t); window.scrollTo(0, 0); }, tab || null); await sleep(900); }
  // ocultar con desenfoque lo que contenga este texto (correo, id del negocio…)
  async ocultarTexto(re) {
    await this.v(src => { const r = new RegExp(src); document.querySelectorAll('#main p, #main div, #main small, #main span').forEach(e => { if (e.children.length < 4 && r.test(e.textContent || '') && (e.textContent || '').length < 220) e.classList.add('v-oculto'); }); }, re);
  }
  // sonido extra (p. ej. el vídeo que hace Chispa) a partir de ahora en la escena
  audioExtra(fichero) { if (this.extra) this.extra.push({ t: ahora() - this.t0, f: fichero }); }
  // quitar del montaje un rato de espera (p. ej. mientras se graba el vídeo): cortarDesde() … cortarHasta()
  cortarDesde() { this._corte = ahora() - this.t0; }
  cortarHasta() { if (this._corte != null && this.cortes) { const b = ahora() - this.t0; if (b - this._corte > 1) this.cortes.push([this._corte, b]); } this._corte = null; }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(P + 'descargas', { recursive: true });
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'] });
  const base = { viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3, locale: 'es-ES', timezoneId: 'Europe/Madrid', acceptDownloads: true };
  const H_ = {};
  async function abrir(nombre) {
    if (H_[nombre]) return H_[nombre];
    const o = Object.assign({}, base);
    if (nombre === 'b') o.storageState = P + 'estado-b.json';
    const ctx = await b.newContext(o);
    if (nombre === 'b') await cache.instalar(ctx);
    await ctx.addInitScript({ path: `${W}/overlay.js` });
    await ctx.addInitScript(css => { const f = () => { if (document.getElementById('v-ocultar')) return; const s = document.createElement('style'); s.id = 'v-ocultar'; s.textContent = css; document.documentElement.appendChild(s); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }, OCULTAR);
    const page = await ctx.newPage();
    const principal = page;
    ctx.on('page', pg => { if (pg === principal) return; setTimeout(() => { console.log('   (pestaña nueva cerrada: ' + pg.url() + ')'); pg.close().catch(() => { }); }, 1500); });
    page.on('dialog', d => { console.log('   (diálogo: ' + d.message().slice(0, 80) + ')'); d.dismiss().catch(() => { }); });
    page.on('pageerror', e => console.log('   ! error de la página (' + nombre + '):', e.message.split('\n')[0]));
    page.on('download', async d => { const f = P + 'descargas/' + Date.now() + '-' + d.suggestedFilename(); await d.saveAs(f).catch(() => { }); H_[nombre].ultimaDescarga = f; console.log('   (descarga ' + path.basename(f) + ')'); });
    if (nombre === 'c') page.on('response', async r => { if (/\/alta$/.test(r.url()) && r.request().method() === 'POST') { try { const j = await r.json(); const f = P + 'altas-grabacion.json'; const l = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []; l.push({ cuando: new Date().toISOString(), negocio: j.negocio, sesion: j.sesion, estado: r.status() }); fs.writeFileSync(f, JSON.stringify(l, null, 1)); console.log('   (alta creada: ' + j.negocio + ')'); } catch (e) { } } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await sleep(1500);
    const h = new H(page, nombre);
    const cdp = await ctx.newCDPSession(page);
    h.cdp = cdp; h.cur = null;
    cdp.on('Page.screencastFrame', f => {
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => { });
      const cur = h.cur; if (!cur) return;
      const n = cur.frames.length;
      const file = `${cur.dir}/${String(n).padStart(5, '0')}.jpg`;
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      cur.frames.push({ f: path.basename(file), ts: f.metadata.timestamp, wall: ahora() });
    });
    H_[nombre] = h;
    return h;
  }

  const resumen = fs.existsSync(`${OUT}/escenas.json`) ? JSON.parse(fs.readFileSync(`${OUT}/escenas.json`, 'utf8')) : {};
  for (const esc of guion.escenas) {
    if (solo.length && !solo.includes(esc.id)) continue;
    console.log('== escena', esc.id, '(' + (esc.ctx || 'a') + ')');
    const h = await abrir(esc.ctx || 'a');
    await h.p.bringToFront(); await sleep(300);   // si no, la página de otro navegador queda en segundo plano y no da fotogramas
    const dir = `${OUT}/${esc.id}`;
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    if (esc.preparar) { try { await esc.preparar(h); } catch (e) { console.log('   ! preparar', e.message.split('\n')[0]); } }
    await h.v(() => window.__V.negro(true)); await sleep(500);
    h.cur = { dir, frames: [] };
    h.extra = []; h.cortes = [];
    await h.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 2 });
    const t0 = ahora(); h.t0 = t0;
    await sleep(100);
    await h.v(() => window.__V.negro(false));
    if (esc.rotulo) await h.rotulo(...esc.rotulo);
    await sleep(esc.entrada || 700);
    const marcas = [];
    const ds = dur[esc.id];
    for (let i = 0; i < esc.segs.length; i++) {
      const s = esc.segs[i];
      const ini = ahora() - t0 + (s.retraso || 0);
      marcas.push(ini);
      const fin = t0 + ini + ds[i];
      if (i === 1 && esc.rotulo) setTimeout(() => h.quitarRotulo().catch(() => { }), 300);
      if (s.a) { try { await s.a(h); } catch (e) { console.log('   ! acción', i, e.message.split('\n')[0]); } }
      const resto = fin - ahora();
      if (resto > 0) await sleep(resto * 1000);
      await sleep((s.pausa != null ? s.pausa : 0.35) * 1000);
    }
    if (esc.rotulo && esc.segs.length < 2) await h.quitarRotulo();
    await sleep((esc.salida || 0.6) * 1000);
    await h.v(() => window.__V.negro(true));
    await sleep(500);
    const D = ahora() - t0;
    await h.cdp.send('Page.stopScreencast');
    await sleep(200);
    const fr = h.cur.frames; h.cur = null;
    const offs = fr.map(x => x.wall - x.ts).sort((a, b) => a - b);
    const off = offs[Math.floor(offs.length / 2)] || 0;
    const frames = fr.map(x => ({ f: x.f, t: x.ts + off - t0 }));
    resumen[esc.id] = { D, marcas, frames: frames.length };
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify({ D, marcas, frames, extra: h.extra, cortes: h.cortes }));
    fs.writeFileSync(`${OUT}/escenas.json`, JSON.stringify(resumen, null, 1));
    console.log(`   ${D.toFixed(1)} s, ${frames.length} fotogramas (${(frames.length / D).toFixed(1)} fps)`);
    h.extra = null; h.cortes = null;
    if (esc.despues) { try { await esc.despues(h); } catch (e) { } }
  }
  console.log('imágenes IA nuevas gastadas en esta pasada:', cache.gastadas());
  await b.close();
})();
