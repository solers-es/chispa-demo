/* Chispa · prueba ÚNICA contra el servidor REAL (gasta cupo de IA: ≈ 1.500 neuronas de 10.000/día).
   NO va en las pruebas de cada día. Hace lo que vio Stalin y comprueba que ya sale bien:
     1) Miniserie «Recetas caribeñas en 60 segundos», TikTok, 5 episodios, español → escrita por la IA.
     2) «🎬 Crear vídeo con IA» completo en la web (Playwright con su propio Chromium, como iPhone):
        guion IA, 5 imágenes IA, voz IA, subtítulos, música → MP4 en capturas/video-ia/.
   Usa un negocio de prueba temporal que se crea con la clave de administración y SE BORRA al final.
     ADMIN_CLAVE=… NODE_PATH=<node_modules con playwright-core> node pruebas/video-ia-real-una-vez.cjs */
const assert = require('assert'), fs = require('fs'), path = require('path'), http = require('http');
const { chromium, devices } = require('playwright-core');
const API = process.env.CHISPA_API || 'https://chispa-api.solers.workers.dev';
const WEB = 'https://solers-es.github.io/chispa-demo/'; // el origen que el servidor admite; los ficheros se sirven del repo local
const RAIZ = path.join(__dirname, '..'), OUT = path.join(RAIZ, 'capturas', 'video-ia');
const TEMA = 'Recetas caribeñas en 60 segundos';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  let admin = process.env.ADMIN_CLAVE;
  if (!admin) { try { const l = fs.readFileSync(path.join(require('os').homedir(), 'herramientas', 'chispa-servidor-claves.txt'), 'utf8').split('\n').filter((x) => /^ADMIN_CLAVE=/.test(x))[0]; admin = l && l.slice(12).trim(); } catch (e) {} }
  assert.ok(admin, 'falta ADMIN_CLAVE (o ~/herramientas/chispa-servidor-claves.txt)');
  const pedir = async (m, ruta, cuerpo, ses, extra) => {
    const h = { 'Content-Type': 'application/json', Origin: 'https://solers-es.github.io', ...(extra || {}) };
    if (ses) h.Authorization = 'Bearer ' + ses;
    const r = await fetch(API + ruta, { method: m, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    return { st: r.status, j, t };
  };
  const id = 'prueba-video-ia-' + Date.now().toString(36);
  let r = await pedir('POST', '/admin/negocios', { id, nombre: 'Prueba vídeo IA (se borra)' }, null, { 'X-Chispa-Admin': admin });
  assert.equal(r.st, 200, r.t);
  const codigo = r.j.codigo;
  let fallo = null;
  try {
    r = await pedir('POST', '/sesion', { negocio: id, codigo });
    const ses = r.j.sesion;
    // 1) la miniserie que falló
    const t0 = Date.now();
    r = await pedir('POST', '/ia/texto', { accion: 'serie', tema: TEMA, plataforma: 'tiktok', episodios: 5, idioma: 'es', sector: 'Creador de contenido' }, ses);
    assert.equal(r.st, 200, r.t); assert.equal(r.j.episodios.length, 5);
    fs.writeFileSync(path.join(OUT, 'miniserie-real.json'), JSON.stringify(r.j, null, 2));
    console.log('  ✓ miniserie con IA real en ' + Math.round((Date.now() - t0) / 1000) + ' s: «' + r.j.titulo + '» · ' + r.j.episodios.map((e) => e.titulo).join(' | '));

    // 2) vídeo gratis completo en la web
    const b = await chromium.launch();
    const ctx = await b.newContext({ ...devices['iPhone 13'] });
    await ctx.route(WEB + '**', (route) => {
      const u = new URL(route.request().url()); let f = decodeURIComponent(u.pathname.replace(/^\/chispa-demo\/?/, '')) || 'index.html';
      const ruta = path.join(RAIZ, f); if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) return route.fulfill({ status: 404, body: '' });
      const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.jpg': 'image/jpeg' };
      route.fulfill({ status: 200, body: fs.readFileSync(ruta), headers: { 'Content-Type': tipos[path.extname(ruta)] || 'application/octet-stream' } });
    });
    const pg = await ctx.newPage(); const errores = []; pg.on('pageerror', (e) => errores.push(e.message)); pg.on('dialog', (d) => d.accept());
    await pg.goto(WEB + 'index.html?servidor=' + encodeURIComponent(API) + '#conectar', { waitUntil: 'load' }); await pg.waitForTimeout(1200);
    await pg.fill('#csNegocio', id).catch(() => {}); await pg.fill('#csCodigo', codigo);
    await pg.locator('#chispaSyncCard button:has-text("Entrar")').first().click();
    await pg.waitForFunction(() => /Conectado en el servidor/.test((document.getElementById('chispaSyncCard') || {}).innerText || ''), null, { timeout: 20000 });
    await pg.evaluate(() => { vista('estudio'); estudio('video'); });
    await pg.fill('#viTema', TEMA); await pg.selectOption('#viN', '5'); await pg.check('#viMus');
    const t1 = Date.now();
    await pg.locator('#viBoton').click();
    await pg.waitForFunction(() => { const v = ChispaVideoIA._estado; return !v.ocupado && (v.ultimo && v.ultimo.blob || /No se pudo/.test((document.getElementById('viRes') || {}).innerText || '')); }, null, { timeout: 300000 });
    const G = await pg.evaluate(() => { const G = ChispaVideoIA._estado.ultimo; return G ? { titulo: G.titulo, ej: !!G.ejemplo, deIA: G.deIA, voz: G.conVoz, total: G.total, tipo: G.blob.type, tam: G.blob.size, escenas: G.escenas.map((e) => ({ dice: e.dice, tipo: e.tipo, url: e.url })), avisos: G.avisos } : null; });
    assert.ok(G, 'no se creó el vídeo: ' + await pg.locator('#viRes').innerText());
    const ext = /mp4/.test(G.tipo) ? 'mp4' : 'webm';
    const bytes = await pg.evaluate(() => ChispaVideoIA._estado.ultimo.blob.arrayBuffer().then((b) => Array.from(new Uint8Array(b))));
    const nombre = 'ejemplo-recetas-caribenas-08-10-2026.' + ext;
    fs.writeFileSync(path.join(OUT, nombre), Buffer.from(bytes));
    await pg.locator('#viRes').screenshot({ path: path.join(OUT, 'real-resultado-iphone.png') });
    await pg.evaluate(() => { const v = document.getElementById('viVideo'); v.currentTime = 4; });
    await pg.waitForTimeout(1500);
    await pg.locator('#viVideo').screenshot({ path: path.join(OUT, 'real-fotograma.png') });
    fs.writeFileSync(path.join(OUT, 'ejemplo-recetas-caribenas.json'), JSON.stringify(G, null, 2));
    console.log('  ✓ vídeo gratis completo en ' + Math.round((Date.now() - t1) / 1000) + ' s: ' + G.escenas.length + ' escenas, ' + G.deIA + ' imágenes IA, voz ' + (G.voz ? 'IA' : 'no') + ', ' + Math.round(G.total) + ' s, ' + ext + ' ' + Math.round(G.tam / 1024) + ' KB → capturas/video-ia/' + nombre);
    if (G.avisos && G.avisos.length) console.log('    avisos: ' + G.avisos.join(' | '));
    assert.ok(!G.ej && G.deIA >= 4 && G.voz, JSON.stringify(G));
    assert.deepEqual(errores, []);
    await b.close();
  } catch (e) { fallo = e; }
  r = await pedir('DELETE', '/admin/negocios/' + id, undefined, null, { 'X-Chispa-Admin': admin });
  console.log('  ' + (r.st === 200 ? '✓' : '✗') + ' negocio de prueba borrado (' + r.st + ')');
  if (fallo) { console.error(fallo); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
