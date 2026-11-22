/* Chispa · Plan de ofertas contra el servidor DESPLEGADO, UNA vez (gasta 1 llamada de IA de texto).
   Lee el código de El Paraíso de ~/herramientas/chispa-servidor-claves.txt (no lo imprime),
   abre sesión, lee el plan, la carta real de El Paraíso y pide los textos de 2 días; cierra la sesión.
     node pruebas/ofertas-real-una-vez.cjs */
const fs = require('fs'), os = require('os'), path = require('path');
const B = 'https://chispa-api.solers.workers.dev';
const claves = fs.readFileSync(path.join(os.homedir(), 'herramientas', 'chispa-servidor-claves.txt'), 'utf8');
const codigos = [...claves.matchAll(/^ALTA_EL_PARAISO=(.+)$/gm)].map((m) => { try { return JSON.parse(m[1]).codigo; } catch (e) { return m[1].trim(); } }).filter(Boolean);
(async () => {
  const pedir = async (m, r, c, ses) => { const h = { 'Content-Type': 'application/json', Origin: 'https://solers-es.github.io' }; if (ses) h.Authorization = 'Bearer ' + ses; const x = await fetch(B + r, { method: m, headers: h, body: c ? JSON.stringify(c) : undefined }); return { st: x.status, j: await x.json().catch(() => null) }; };
  let ses = null;
  for (const c of codigos) { const r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: c }); if (r.st === 200) { ses = r.j.sesion; break; } }
  if (!ses) throw new Error('no se pudo abrir sesión con los códigos guardados');
  try {
    let r = await pedir('GET', '/ofertas/plan', null, ses); console.log('plan:', r.st, JSON.stringify(r.j));
    r = await pedir('POST', '/ofertas/carta', { url: 'https://el-paraiso-eight.vercel.app/carta-paraiso.html' }, ses);
    console.log('carta:', r.st, r.j.fuente, r.j.items.length, 'platos ·', r.j.items.slice(0, 3).map((x) => x.nombre + ' ' + x.precio).join(' | '));
    const f = (n) => new Date(Date.now() + 2 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
    r = await pedir('POST', '/ofertas/textos', { idioma: 'es', negocio: 'El Paraíso', sector: 'Restaurante y bar', ciudad: 'Palma de Mallorca', cta: 'Reserva tu mesa', dias: [
      { clave: f(1) + '|a', fecha: f(1), dia: 'jueves', plato: 'Paella Mixta', precioPlato: '2p 46 · 3p 64 · 4p 74 €', bebida: 'Sangría', precioBebida: '', oferta: '2x1 en sangría de 18:00 a 21:00', franja: '18:00-21:00', red: 'Instagram + TikTok', formato: 'reel', motivo: 'la tarde del jueves es floja', tiempo: '23 °C' },
      { clave: f(2) + '|b', fecha: f(2), dia: 'viernes', plato: 'Mofongo Tradicional', precioPlato: '18,00 €', bebida: 'Mojito', precioBebida: '', oferta: 'Mofongo Tradicional + mojito por … €', franja: '16:30-19:30', red: 'Instagram + TikTok', formato: 'reel', motivo: 'viernes: la tarde es lo flojo', tiempo: '22 °C' }] }, ses);
    console.log('textos:', r.st); (r.j.textos || []).forEach((t) => console.log('---\n' + t.texto + '\n' + (t.hashtags || []).join(' '))); if (r.st !== 200) console.log(r.j);
  } finally { await pedir('DELETE', '/sesion', null, ses); }
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
