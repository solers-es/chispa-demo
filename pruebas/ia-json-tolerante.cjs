/* Chispa · la IA a veces devuelve JSON mal formado (07/10/2026: miniserie «Recetas caribeñas en 60 segundos»
   salió con una «}» de más al final → «La IA respondió algo que no se pudo leer»). Sin red:
     node pruebas/ia-json-tolerante.cjs
   Comprueba que sacarJson lo lee y que llmJson repite la petición en modo JSON si la primera sale mal. */
const assert = require('assert');
const path = require('path');
(async () => {
  const IA = await import(path.join(__dirname, '..', 'conectores', 'ia.js'));
  let ok = 0; const paso = (t) => { ok++; console.log('  ✓ ' + t); };

  // 1) la respuesta REAL que falló (recortada): una llave de más al final
  const real = '{"titulo":"Sabor Caribe en 60s","premisa":"Descubre recetas caribeñas","episodios":[{"titulo":"Arroz con pollo caribeño","gancho":"¿Quieres un plato fácil?","guion":"Mezcla arroz\\nAñade especias","cliffhanger":"¿Y si le añado coco?","texto_pantalla":"Arroz"},{"titulo":"Salsa de mango","gancho":"¿Te gusta el mango?","guion":"Pela el mango","cliffhanger":"¿Cómo la uso?","texto_pantalla":"Salsa"}],"hashtags":["#RecetasCaribeñas"]}}';
  let j = IA.sacarJson(real);
  assert.equal(j.episodios.length, 2); assert.equal(j.titulo, 'Sabor Caribe en 60s');
  paso('lee la respuesta real que falló hoy (una «}» de más al final)');

  j = IA.sacarJson('Aquí tienes:\n```json\n{"a":"línea 1\nlínea 2","b":[1,2,],}\n```\nEspero que te guste {}');
  assert.equal(j.a, 'línea 1\nlínea 2'); assert.deepEqual(j.b, [1, 2]);
  paso('texto antes y después, ```json, saltos de línea dentro de las comillas y comas finales');

  j = IA.sacarJson('{"titulo":"Serie","episodios":[{"titulo":"Uno","gancho":"Hola"},{"titulo":"Dos","gancho":"Adi');
  assert.equal(j.titulo, 'Serie'); assert.ok(j.episodios.length >= 1); assert.equal(j.episodios[0].titulo, 'Uno');
  paso('respuesta cortada a medias (max_tokens): cierra lo abierto y se queda con lo completo');

  j = IA.sacarJson('{"t":"dice \\"hola\\" y {llaves} dentro"} }');
  assert.equal(j.t, 'dice "hola" y {llaves} dentro');
  paso('comillas escapadas y llaves DENTRO de los textos no confunden al lector');

  assert.throws(() => IA.sacarJson('lo siento, no puedo'), /formato esperado/);
  paso('si no hay JSON, error claro');

  // 2) llmJson: primera respuesta ilegible → repite en modo JSON y más estricto
  const llamadas = [];
  const respuestas = ['nada de json aquí', JSON.stringify({ escenas: [{ dice: 'Uno dos tres cuatro', imagen: 'a beach' }, { dice: 'Cinco seis siete', imagen: 'a pan' }], titulo: 'Caribe' })];
  const filas = {};
  const DB = { prepare: (sql) => ({ bind: (...a) => ({ first: async () => (/SUM/.test(sql) ? { n: 0 } : null), run: async () => ({}), all: async () => ({ results: [] }) }) }) };
  const env = { DB, AI: { run: async (m, e) => { llamadas.push(e); return { choices: [{ message: { content: respuestas.shift() } }], usage: { neurons: 100 } }; } } };
  const r = await IA.escenasVideo(env, 'prueba', { tema: 'Recetas caribeñas en 60 segundos', escenas: 5, idioma: 'es' });
  assert.equal(llamadas.length, 2); assert.deepEqual(llamadas[0].response_format, { type: 'json_object' });
  assert.match(llamadas[1].messages[1].content, /could not be parsed/); assert.equal(r.escenas.length, 2); assert.equal(r.vozServidor, true);
  paso('si la primera respuesta no se lee, la pide otra vez (modo JSON, más estricta) y sale bien');

  const env2 = { DB, AI: { run: async () => ({ choices: [{ message: { content: 'basura' } }] }) } };
  await assert.rejects(() => IA.serie(env2, 'prueba', { tema: 'Recetas caribeñas', episodios: 5 }), (e) => e.status === 502);
  paso('si fallan los dos intentos: error 502 (la página pone la plantilla CON EL TEMA pedido)');
  void filas;
  console.log(ok + ' comprobaciones en verde');
})().catch((e) => { console.error(e); process.exit(1); });
