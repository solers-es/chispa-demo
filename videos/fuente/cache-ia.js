// Guarda la PRIMERA imagen real que devuelve la IA del servidor y la reutiliza en las tomas
// siguientes (misma imagen de verdad, sin gastar más cupo: como mucho 5 imágenes en total).
const fs = require('fs');
const DIR = __dirname + '/privado/ia-cache/';
fs.mkdirSync(DIR, { recursive: true });
let gastadas = 0;
async function instalar(ctx, { permitirNuevas = true, log = console.log } = {}) {
  const idx = DIR + 'indice.json';
  const leer = () => (fs.existsSync(idx) ? JSON.parse(fs.readFileSync(idx, 'utf8')) : []);
  await ctx.route(/\/ia\/imagen$/, async route => {
    const lista = leer();
    if (lista.length && (!permitirNuevas || lista.length >= 1)) {
      const e = lista[0];
      log('   (imagen IA: la guardada ' + e.id + ')');
      await new Promise(r => setTimeout(r, 4000)); // lo que tarda de verdad
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(e.json) });
    }
    // El servidor desplegado aún manda «seed» a FLUX (error 5006): se quita la semilla del pedido
    // (el arreglo está en conectores/ia.js, pendiente de desplegar).
    let cuerpo = {}; try { cuerpo = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
    delete cuerpo.semilla; cuerpo.cantidad = 1;
    const resp = await route.fetch({ postData: JSON.stringify(cuerpo) });
    const j = await resp.json();
    if (!j.urls || !j.urls.length) { log('   (imagen IA: el servidor dijo ' + JSON.stringify(j).slice(0, 200) + ')'); return route.fulfill({ response: resp, body: JSON.stringify(j) }); }
    gastadas++;
    const id = 'img' + Date.now();
    const urls = [];
    for (const u of j.urls || []) {
      const r = await ctx.request.get(u);
      const f = DIR + id + '-' + urls.length + '.bin';
      fs.writeFileSync(f, await r.body());
      urls.push({ u, f, ct: r.headers()['content-type'] || 'image/jpeg' });
    }
    lista.push({ id, json: j, urls });
    fs.writeFileSync(idx, JSON.stringify(lista, null, 1));
    log('   (imagen IA NUEVA gastada: ' + id + ')');
    return route.fulfill({ response: resp, body: JSON.stringify(j) });
  });
  await ctx.route(/\/medio\//, async route => {
    const u = route.request().url();
    for (const e of leer()) for (const x of e.urls) if (x.u === u) return route.fulfill({ status: 200, contentType: x.ct, headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(x.f) });
    return route.continue();
  });
}
module.exports = { instalar, gastadas: () => gastadas };
