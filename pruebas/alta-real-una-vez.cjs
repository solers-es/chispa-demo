/* Chispa · comprobación ÚNICA contra el servidor desplegado: /salud, /planes, un alta de prueba
   (con su reto y prueba de trabajo), /cuenta, y se borra el alta. No repetir en bucle.
   Uso (la clave se lee de herramientas/chispa-servidor-claves.txt del Mac, o CHISPA_ADMIN): node pruebas/alta-real-una-vez.cjs */
const crypto = require('crypto');
const B = process.env.CHISPA_SERVIDOR || 'https://chispa-api.solers.workers.dev';
const ADMIN = process.env.CHISPA_ADMIN || (() => { try { return (require('fs').readFileSync('/Users/usuario/herramientas/chispa-servidor-claves.txt', 'utf8').match(/^ADMIN_CLAVE=(.+)$/m) || [])[1].trim(); } catch (e) { return ''; } })();
const j = async (m, ruta, cuerpo, cab = {}) => { const r = await fetch(B + ruta, { method: m, headers: { 'Content-Type': 'application/json', ...cab }, body: cuerpo ? JSON.stringify(cuerpo) : undefined }); return { st: r.status, j: await r.json().catch(() => ({})) }; };
function resolver(reto, dif) { for (let n = 0; ; n++) { const h = crypto.createHash('sha256').update(reto + ':' + n).digest(); let b = 0; for (const x of h) { if (x === 0) { b += 8; continue; } b += Math.clz32(x) - 24; break; } if (b >= dif) return String(n); } }
(async () => {
  let r = await j('GET', '/salud'); console.log('salud', r.st, JSON.stringify(r.j));
  r = await j('GET', '/planes'); console.log('planes', r.st, r.j.planes.map((p) => p.id + ' ' + p.precio + '€').join(' · '), 'prueba', r.j.diasPrueba, 'pago', r.j.pago.encendido);
  const t = (await j('GET', '/alta/reto')).j;
  await new Promise((ok) => setTimeout(ok, 3500));
  r = await j('POST', '/alta', { nombre: 'Prueba H borrar', sector: 'cafeteria', idioma: 'es', correo: 'prueba-h@solers.es', plan: 'basico', acepto: true, reto: t.reto, solucion: resolver(t.reto, t.dificultad) });
  console.log('alta', r.st, r.j.negocio || r.j.error, r.j.estado || '', r.j.pruebaHasta ? new Date(r.j.pruebaHasta).toISOString().slice(0, 10) : '');
  if (r.st !== 200) process.exit(1);
  const neg = r.j.negocio, ses = r.j.sesion;
  r = await j('GET', '/cuenta', null, { Authorization: 'Bearer ' + ses }); console.log('cuenta', r.st, r.j.plan, r.j.estado, r.j.diasQuedan + ' días', JSON.stringify(r.j.uso));
  r = await j('POST', '/pago/checkout', { plan: 'pro' }, { Authorization: 'Bearer ' + ses }); console.log('checkout (debe ser 503 modo prueba)', r.st, r.j.modoPrueba);
  r = await j('GET', '/admin/clientes', null, { 'X-Chispa-Admin': ADMIN }); console.log('admin/clientes', r.st, (r.j.clientes || []).map((c) => c.id + ':' + c.plan + ':' + c.estado).join(' | '));
  r = await j('DELETE', '/admin/negocios/' + neg, null, { 'X-Chispa-Admin': ADMIN }); console.log('borrado', r.st, JSON.stringify(r.j));
  r = await j('GET', '/cuenta', null, { Authorization: 'Bearer ' + ses }); console.log('tras borrar, sesión', r.st);
})();
