/* Chispa · ejecuta TODAS las pruebas del servidor (sin red, sin cuenta), una detrás de otra.
   Uso: NODE_PATH=<node_modules con sql.js> node pruebas/servidor-todas.cjs
   Puertos: PUERTO_API / PUERTO_WEB (por defecto 8848 / 8845, para no chocar con otro simulador abierto). */
const { spawnSync } = require('child_process');
const path = require('path');
const PRUEBAS = ['servidor-api.cjs', 'suscripciones-api.cjs', 'servidor-ia-api.cjs', 'panel-servidor.cjs'];
const env = { ...process.env, PUERTO_API: process.env.PUERTO_API || '8848', PUERTO_WEB: process.env.PUERTO_WEB || '8845' };
let mal = 0;
for (const p of PRUEBAS) {
  const r = spawnSync(process.execPath, [path.join(__dirname, p)], { env, encoding: 'utf8' });
  const salida = (r.stdout || '') + (r.stderr || '');
  const ultima = salida.trim().split('\n').pop();
  console.log((r.status === 0 ? '✓ ' : '✗ ') + p + ' · ' + ultima);
  if (r.status !== 0) { mal++; console.log(salida.split('\n').slice(-25).join('\n')); }
}
console.log(mal ? '\n' + mal + ' prueba(s) en ROJO' : '\nTodas las pruebas del servidor en verde');
process.exit(mal ? 1 : 0);
