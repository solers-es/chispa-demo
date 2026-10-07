// Graba el vídeo de Chispa escena a escena con el Chromium de Playwright (nunca el Chrome del Mac).
// Uso: node motor.js largo|corto [escenaId ...]   (con ids, graba solo esas: para probar)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const EXE = '/Users/usuario/Library/Caches/ms-playwright/chromium-1234/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = 'https://solers-es.github.io/chispa-demo/';
const modo = process.argv[2] || 'largo';
const solo = process.argv.slice(3);
const W = __dirname;
const guion = require(`${W}/guion-${modo}.js`);
const dur = JSON.parse(fs.readFileSync(`${W}/audio/${modo}/duraciones.json`, 'utf8'));
const OUT = `${W}/grab/${modo}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ahora = () => Date.now() / 1000;

class H {
  constructor(page) { this.p = page; }
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
    const b = await this.caja(sel);
    await this.v(([x, y, w, h]) => window.__V.resaltar(x, y, w, h), [b.x, b.y, b.width, b.height]);
    if (ms) { await sleep(ms); await this.v(() => window.__V.apagar()); await sleep(250); }
  }
  async clic(sel, opt = {}) {
    try {
      const { x, y, b } = await this.apuntar(sel, opt);
      if (opt.resaltar !== false) await this.v(([x, y, w, h]) => window.__V.resaltar(x, y, w, h), [b.x, b.y, b.width, b.height]);
      await sleep(opt.pausa || 280);
      await this.v(([x, y]) => window.__V.clic(x, y), [x, y]);
      await this.p.mouse.click(x, y);
      await sleep(180);
      await this.v(() => window.__V.apagar());
      await sleep(opt.despues || 500);
      return true;
    } catch (e) { console.log('   ! clic fallido', String(sel), e.message.split('\n')[0]); return false; }
  }
  async escribir(sel, texto, delay = 55) {
    await this.clic(sel, { despues: 200 });
    await this.p.keyboard.type(texto, { delay });
    await sleep(300);
  }
  async rueda(dy, pasos = 12, ms = 900) {
    // desplazamiento suave con la rueda en el sitio del cursor
    for (let i = 0; i < pasos; i++) { await this.p.mouse.wheel(0, dy / pasos); await sleep(ms / pasos); }
    await sleep(250);
  }
  async scrollSuave(sel, y) { // y absoluto dentro de un contenedor (o la página si sel=null)
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
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  let principal = null;
  ctx.on('page', pg => { if (!principal) return; setTimeout(() => { console.log('   (pestaña nueva cerrada: ' + pg.url() + ')'); pg.close().catch(() => { }); }, 1500); });
  await ctx.addInitScript({ path: `${W}/overlay.js` });
  const page = await ctx.newPage(); principal = page;
  page.on('dialog', d => d.dismiss().catch(() => { }));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await sleep(1500);
  const h = new H(page);
  const cdp = await ctx.newCDPSession(page);
  let cur = null;
  cdp.on('Page.screencastFrame', f => {
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => { });
    if (!cur) return;
    const n = cur.frames.length;
    const file = `${cur.dir}/${String(n).padStart(5, '0')}.jpg`;
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    cur.frames.push({ f: path.basename(file), ts: f.metadata.timestamp, wall: ahora() });
  });

  const resumen = fs.existsSync(`${OUT}/escenas.json`) ? JSON.parse(fs.readFileSync(`${OUT}/escenas.json`, 'utf8')) : {};
  for (const esc of guion.escenas) {
    if (solo.length && !solo.includes(esc.id)) { if (esc.preparar && solo.length) { /* nada */ } continue; }
    console.log('== escena', esc.id);
    const dir = `${OUT}/${esc.id}`;
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    if (esc.preparar) { try { await esc.preparar(h); } catch (e) { console.log('   ! preparar', e.message.split('\n')[0]); } }
    await h.v(() => window.__V.negro(true)); await sleep(500);
    cur = { dir, frames: [] };
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 2 });
    const t0 = ahora();
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
    await cdp.send('Page.stopScreencast');
    await sleep(200);
    const fr = cur.frames; cur = null;
    const offs = fr.map(x => x.wall - x.ts).sort((a, b) => a - b);
    const off = offs[Math.floor(offs.length / 2)] || 0;
    const frames = fr.map(x => ({ f: x.f, t: x.ts + off - t0 }));
    resumen[esc.id] = { D, marcas, frames: frames.length };
    fs.writeFileSync(`${dir}/frames.json`, JSON.stringify({ D, marcas, frames }));
    fs.writeFileSync(`${OUT}/escenas.json`, JSON.stringify(resumen, null, 1));
    console.log(`   ${D.toFixed(1)} s, ${frames.length} fotogramas (${(frames.length / D).toFixed(1)} fps)`);
    if (esc.despues) { try { await esc.despues(h); } catch (e) { } }
  }
  await b.close();
})();
