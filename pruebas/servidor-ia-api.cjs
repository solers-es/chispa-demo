/* Chispa · pruebas de IA, API pública (/v1) y MCP, sin red ni cupo:
     NODE_PATH=~/Proyectos/chispa-f-pruebas/node_modules node pruebas/servidor-ia-api.cjs
   La IA es la imitada del simulador (pruebas/servidor-simulador.cjs). La IA de verdad
   se comprueba aparte, una vez, contra el servidor desplegado (docs/SERVIDOR-CHISPA.md). */
const assert = require('assert');
process.env.PUERTO_API = process.env.PUERTO_API || '8791';
const { arrancar } = require('./servidor-simulador.cjs');

(async () => {
  const s = await arrancar({ web: false });
  const B = s.base;
  let ok = 0;
  const paso = (t) => { ok++; console.log('  ✓ ' + t); };
  const pedir = async (metodo, ruta, cuerpo, ses) => {
    const h = { 'Content-Type': 'application/json' };
    if (ses) h.Authorization = 'Bearer ' + ses;
    const r = await fetch(B + ruta, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), redirect: 'manual' });
    let j = null; const txt = await r.clone().text(); try { j = JSON.parse(txt); } catch (e) {}
    return { st: r.status, j, r, txt };
  };

  let r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: s.codigo });
  const duenio = r.j.sesion;
  r = await pedir('POST', '/enlace', { rol: 'equipo' }, duenio);
  r = await pedir('POST', '/sesion', { negocio: 'el-paraiso', codigo: r.j.codigo });
  const equipo = r.j.sesion;

  r = await pedir('GET', '/salud');
  assert.equal(r.j.ia, true); assert.equal(r.j.version, '2'); paso('/salud dice que la IA está activa');

  // --- IMAGEN ---
  r = await pedir('POST', '/ia/imagen', { texto: 'Paella el domingo en la terraza', titulo: 'Paella', sector: 'restaurante' });
  assert.equal(r.st, 401); paso('sin sesión no se genera nada');
  r = await pedir('POST', '/ia/imagen', { texto: 'Paella el domingo en la terraza', titulo: 'Paella', sector: 'restaurante', ciudad: 'Palma' }, equipo);
  assert.equal(r.st, 200, r.txt); assert.equal(r.j.urls.length, 1); assert.match(r.j.urls[0], /\/medio\/[A-Za-z0-9_-]+\.jpg$/);
  const pr = s.llamadasIA.filter((c) => /flux/.test(c.modelo)).pop().e.prompt;
  assert.match(pr, /restaurant/); assert.match(pr, /Paella el domingo/); assert.match(pr, /no text/);
  paso('imagen con IA: prompt según el sector y el texto, URL pública');
  const im = await fetch(r.j.urls[0]);
  assert.equal(im.status, 200); assert.equal(im.headers.get('content-type'), 'image/jpeg'); assert.equal(im.headers.get('access-control-allow-origin'), '*');
  const bytes = Buffer.from(await im.arrayBuffer()); assert.equal(bytes[0], 0xff); assert.equal(bytes[1], 0xd8);
  paso('/medio sirve el JPEG sin sesión (las redes lo descargan) y con CORS para dibujarlo en el lienzo');
  r = await pedir('GET', '/medio/' + 'x'.repeat(24) + '.jpg');
  assert.equal(r.st, 404); paso('un medio que no existe da 404');

  // --- CUPO ---
  s.db.run("UPDATE uso_ia SET veces = 20 WHERE tipo = 'imagen'");
  r = await pedir('POST', '/ia/imagen', { texto: 'otra' }, equipo);
  assert.equal(r.st, 429); assert.match(r.j.error, /límite de hoy/); paso('límite diario por negocio: 429 con mensaje claro');
  s.db.run("UPDATE uso_ia SET veces = 0, neuronas = 8990 WHERE tipo = 'imagen'");
  r = await pedir('POST', '/ia/imagen', { texto: 'otra' }, equipo);
  assert.equal(r.st, 429); assert.match(r.j.error, /cupo gratuito/); paso('tope de la cuenta (9.000 neuronas): corta antes de que Cloudflare dé error');
  s.db.run("UPDATE uso_ia SET neuronas = 173 WHERE tipo = 'imagen'");
  r = await pedir('GET', '/ia/uso', undefined, equipo);
  assert.equal(r.j.limites.imagen, 20); assert.ok(r.j.neuronasCuenta >= 173); paso('/ia/uso enseña lo gastado hoy');

  // --- VOZ + SUBTÍTULOS ---
  r = await pedir('POST', '/ia/voz', { texto: 'Hola mundo. #Palma 🔥', idioma: 'es' }, equipo);
  assert.equal(r.st, 200, r.txt); assert.match(r.j.audio, /^data:audio\/wav;base64,/); assert.equal(r.j.texto, 'Hola mundo.');
  assert.deepEqual(r.j.palabras.map((p) => p.t), ['Hola', 'mundo.']); assert.equal(r.j.palabras[1].i, 0.5);
  assert.equal(s.llamadasIA.filter((c) => /melotts/.test(c.modelo)).pop().e.lang, 'es');
  paso('voz en español + subtítulos con los tiempos de Whisper (sin hashtags ni emojis en la voz)');
  r = await pedir('POST', '/ia/voz', { texto: 'こんにちは', idioma: 'ja' }, equipo);
  assert.equal(r.st, 200); assert.equal(s.llamadasIA.filter((c) => /melotts/.test(c.modelo)).pop().e.lang, 'jp'); paso('japonés: se pide a MeloTTS como «jp» (su código)');
  r = await pedir('POST', '/ia/voz', { texto: 'Guten Abend', idioma: 'de' }, equipo);
  assert.equal(r.st, 422); assert.equal(r.j.alternativa, 'navegador'); assert.match(r.j.error, /alemán/); paso('alemán: el servidor no tiene voz y lo dice (alternativa: voz del navegador)');

  r = await pedir('POST', '/ia/video', { texto: 'x' }, equipo);
  assert.equal(r.st, 501); assert.match(r.j.error, /se activa al conectar el proveedor \(de pago\)/); paso('vídeo realista con IA: apagado y lo dice claro (501, «se activa al conectar el proveedor (de pago)»)');

  // --- TEXTO ---
  r = await pedir('POST', '/ia/texto', { accion: 'reaprovechar', texto: 'Este fin de semana celebramos 56 años con paella y música en directo en la terraza. '.repeat(2), idioma: 'de', piezas: ['posts', 'hilo', 'carrusel'] }, equipo);
  assert.equal(r.st, 200, r.txt); assert.ok(r.j.piezas.length >= 3); assert.equal(r.j.piezas[0].idioma, 'de');
  assert.match(s.llamadasIA.filter((c) => /llama/.test(c.modelo)).pop().e.messages[0].content, /German/); paso('reaprovechar: texto largo → posts, hilo y carrusel en el idioma pedido');
  r = await pedir('POST', '/ia/texto', { accion: 'reaprovechar', texto: 'corto', idioma: 'es' }, equipo);
  assert.equal(r.st, 400); paso('reaprovechar pide un texto largo de verdad');
  r = await pedir('POST', '/ia/texto', { accion: 'traducir', textos: ['Hola', 'Adiós'], idiomas: ['en', 'nl'] }, equipo);
  assert.deepEqual(r.j.traducciones, { en: ['[en] Hola', '[en] Adiós'], nl: ['[nl] Hola', '[nl] Adiós'] });
  assert.match(r.j.aviso, /neerlandés/); paso('traducir en lote a varios idiomas; avisa de los que el modelo no garantiza');

  // --- CLAVES DE API ---
  r = await pedir('POST', '/claves', { nombre: 'n8n' }, equipo);
  assert.equal(r.st, 403); paso('solo el dueño crea claves de API');
  r = await pedir('POST', '/claves', { nombre: 'n8n' }, duenio);
  const clave = r.j.clave, idClave = r.j.id;
  assert.match(clave, /^chispa_[A-Za-z0-9_-]{32}$/);
  r = await pedir('GET', '/claves', undefined, duenio);
  assert.equal(r.j.claves.length, 1); assert.ok(!JSON.stringify(r.j).includes(clave)); assert.ok(!JSON.stringify(s.db.exec('SELECT * FROM api_claves')).includes(clave));
  paso('la clave se enseña una vez; ni el listado ni la base la guardan (solo su huella)');
  r = await pedir('GET', '/estado/principal', undefined, clave);
  assert.equal(r.st, 403); paso('una clave de API no abre el estado privado del panel (solo /v1 y /mcp)');

  // --- /v1 ---
  r = await pedir('GET', '/v1/yo', undefined, clave);
  assert.equal(r.j.negocio, 'el-paraiso'); assert.equal(r.j.via, 'clave de API'); paso('/v1/yo con la clave');
  r = await pedir('POST', '/v1/publicaciones', { texto: 'Borrador desde n8n' }, clave);
  assert.equal(r.st, 200, r.txt); assert.equal(r.j.publicaciones[0].estado, 'borrador'); paso('crear sin fecha → borrador');
  r = await pedir('POST', '/v1/programar', { texto: 'x', redes: ['instagram'] }, clave);
  assert.equal(r.st, 400); assert.match(r.j.error, /cuando/); paso('programar sin fecha → error claro');
  r = await pedir('POST', '/v1/programar', { texto: 'x', redes: ['myspace'], cuando: '2030-01-01T10:00:00Z' }, clave);
  assert.equal(r.st, 400); assert.match(r.j.error, /Red desconocida/); paso('red desconocida → error claro');
  r = await pedir('POST', '/v1/programar', { idea: 'paella del domingo', redes: ['facebook', 'google'], cuando: '2030-01-01T10:00:00+01:00', idioma: 'es', idiomas: ['en', 'de'], imagen_ia: true }, clave);
  assert.equal(r.st, 200, r.txt);
  const p1 = r.j.publicaciones[0];
  assert.equal(p1.estado, 'programada'); assert.deepEqual(p1.redes, ['fb', 'gbp']); assert.equal(p1.cuando, '2030-01-01T09:00:00.000Z');
  assert.match(p1.texto, /^🇪🇸 Texto escrito por la IA/); assert.match(p1.texto, /🇬🇧 \[en\]/); assert.match(p1.texto, /🇩🇪 \[de\]/);
  assert.equal(p1.medios.length, 1); assert.match(p1.medios[0], /\/medio\//); assert.equal(p1.idioma, 'es+en+de');
  paso('programar con idea + imagen IA + 3 idiomas juntos: la IA escribe, traduce y pone la imagen');
  r = await pedir('POST', '/v1/publicaciones', { texto: 'Hola', redes: ['tiktok'], cuando: '2030-02-01T10:00:00Z', idiomas: ['en'], multilingue: 'separadas' }, clave);
  assert.equal(r.j.publicaciones.length, 2); assert.deepEqual(r.j.publicaciones.map((p) => p.idioma), ['es', 'en']); paso('multilingüe «separadas»: una publicación por idioma');
  r = await pedir('GET', '/v1/publicaciones?estado=programada', undefined, clave);
  assert.equal(r.j.total, 3); paso('listar programadas');
  r = await pedir('GET', '/v1/publicaciones/' + p1.id, undefined, clave);
  assert.equal(r.j.publicacion.id, p1.id);
  r = await pedir('DELETE', '/v1/publicaciones/' + p1.id, undefined, clave);
  assert.equal(r.j.publicacion.estado, 'cancelada'); paso('estado y cancelar');
  r = await pedir('GET', '/agenda', undefined, duenio);
  assert.ok(r.j.items.some((x) => x.origen === 'api')); paso('lo creado por la API aparece en la agenda del panel');

  // --- MCP ---
  const mcp = (cuerpo, ses = clave) => fetch(B + '/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: 'Bearer ' + ses }, body: JSON.stringify(cuerpo) });
  let x = await mcp({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'prueba', version: '1' } } });
  let j = await x.json();
  assert.equal(j.result.serverInfo.name, 'chispa'); assert.equal(j.result.protocolVersion, '2025-06-18');
  x = await mcp({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(x.status, 202); paso('MCP: initialize y notificación (202)');
  j = await (await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
  const nombres = j.result.tools.map((t) => t.name);
  for (const n of ['crear_publicacion', 'programar', 'listar_programadas']) assert.ok(nombres.includes(n), n);
  paso('MCP: tools/list con crear_publicacion, programar, listar_programadas (y ' + (nombres.length - 3) + ' más)');
  j = await (await mcp({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'programar', arguments: { texto: 'Desde Claude', redes: ['instagram'], cuando: '2030-03-01T12:00:00Z' } } })).json();
  assert.equal(j.result.isError, false); assert.equal(j.result.structuredContent.publicaciones[0].estado, 'programada');
  j = await (await mcp({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'listar_programadas', arguments: {} } })).json();
  assert.ok(JSON.parse(j.result.content[0].text).publicaciones.some((p) => p.texto === 'Desde Claude')); paso('MCP: programar y listar desde Claude');
  j = await (await mcp({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'programar', arguments: { texto: 'sin fecha' } } })).json();
  assert.equal(j.result.isError, true); paso('MCP: un error de la herramienta vuelve como isError (no rompe la sesión)');
  x = await mcp({ jsonrpc: '2.0', id: 6, method: 'tools/list' }, 'chispa_falsa');
  assert.equal(x.status, 401); paso('MCP sin clave buena → 401');

  // --- cron publica lo programado por la API ---
  r = await pedir('POST', '/conectar/meta', {}, duenio);
  await pedir('GET', '/oauth/vuelta?code=x&state=' + new URL(r.j.url).searchParams.get('state'));
  r = await pedir('POST', '/v1/programar', { texto: 'Ya toca', redes: ['facebook'], cuando: new Date(Date.now() - 1000).toISOString() }, clave);
  const idYa = r.j.publicaciones[0].id;
  await s.cron();
  r = await pedir('GET', '/v1/publicaciones/' + idYa, undefined, clave);
  assert.equal(r.j.publicacion.estado, 'publicada', r.j.publicacion.motivo); paso('el cron publica en Facebook lo programado por la API');

  // --- revocar ---
  r = await pedir('DELETE', '/claves/' + idClave, undefined, duenio);
  r = await pedir('GET', '/v1/yo', undefined, clave);
  assert.equal(r.st, 401); paso('clave revocada → deja de valer al momento');

  // --- JSON torcido de la IA (saltos de línea dentro de las comillas) ---
  const IA = await import('../conectores/ia.js');
  assert.deepEqual(IA.sacarJson('```json\n{"piezas":[{"texto":"1/ hola\n2/ adiós"}]}\n```'), { piezas: [{ texto: '1/ hola\n2/ adiós' }] });
  assert.deepEqual(IA.alinear('Hola qué tal', [], 3).map((p) => p.t), ['Hola', 'qué', 'tal']);
  paso('la respuesta de la IA se lee aunque traiga saltos de línea sin escapar');

  console.log('\n' + ok + ' comprobaciones en verde');
  s.cerrar();
})().catch((e) => { console.error('✗ FALLO:', e); process.exit(1); });
