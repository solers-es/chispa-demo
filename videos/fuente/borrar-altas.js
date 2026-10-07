// Borra (baja con borrado total, la misma que «Darme de baja y borrar mis datos») los negocios de
// prueba creados para la grabación: privado/alta-explora.json y privado/altas-grabacion.json.
// Uso: node borrar-altas.js            (solo lista)   ·   node borrar-altas.js --borrar
const fs = require('fs');
const P = __dirname + '/privado/';
const S = 'https://chispa-api.solers.workers.dev';
const lista = [];
if (fs.existsSync(P + 'alta-explora.json')) { const j = JSON.parse(fs.readFileSync(P + 'alta-explora.json', 'utf8')); lista.push({ negocio: j.negocio, sesion: j.sesion }); }
if (fs.existsSync(P + 'altas-grabacion.json')) for (const x of JSON.parse(fs.readFileSync(P + 'altas-grabacion.json', 'utf8'))) if (x.sesion) lista.push(x);
(async () => {
  for (const x of lista) {
    const h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + x.sesion, Origin: 'https://solers-es.github.io' };
    const c = await fetch(S + '/cuenta', { headers: h }).then(r => r.status + ' ' + (r.ok ? 'existe' : 'no existe / sin sesión'));
    console.log(x.negocio, '·', c);
    if (process.argv.includes('--borrar') && /existe$/.test(c) && !/no existe/.test(c)) {
      const r = await fetch(S + '/cuenta/baja', { method: 'POST', headers: h, body: JSON.stringify({ confirmar: 'BORRAR' }) });
      console.log('   baja →', r.status, (await r.text()).slice(0, 120));
      const c2 = await fetch(S + '/cuenta', { headers: h }).then(r => r.status);
      console.log('   comprobado después:', c2, c2 === 200 ? '¡SIGUE EXISTIENDO!' : 'borrado');
    }
  }
})();
