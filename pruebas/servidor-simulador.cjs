/* =====================================================================
   Chispa · simulador LOCAL del servidor (conectores/chispa-api-worker.js)
   ---------------------------------------------------------------------
   Sin cuenta de Cloudflare y sin red: ejecuta el Worker de verdad en Node
   con una base D1 imitada con SQLite (sql.js) y con Google, Meta y TikTok
   imitados (respuestas falsas). Sirve también la web en :8765.

   Uso:
     NODE_PATH=<carpeta con node_modules de sql.js> node pruebas/servidor-simulador.cjs
       → web en http://localhost:8765/index.html?servidor=http://localhost:8788
       → imprime el código de acceso del negocio «el-paraiso»
   Desde otra prueba:  const sim = await require('./servidor-simulador.cjs').arrancar();
   ===================================================================== */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const PUERTO_API = Number(process.env.PUERTO_API || 8788), PUERTO_WEB = Number(process.env.PUERTO_WEB || 8765);

/* ---------- D1 imitada con SQLite ---------- */
function crearD1(db) {
  function sentencia(sql, params) {
    return {
      bind: (...p) => sentencia(sql, p.map((x) => (x === undefined ? null : x))),
      async first() { const r = await this.all(); return r.results[0] || null; },
      async all() {
        const st = db.prepare(sql); st.bind(params || []); const out = [];
        while (st.step()) out.push(st.getAsObject());
        st.free(); return { results: out, success: true };
      },
      async run() { db.run(sql, params || []); return { success: true, meta: { changes: db.getRowsModified() } }; },
    };
  }
  return { prepare: (sql) => sentencia(sql, []), batch: async (lista) => { const r = []; for (const s of lista) r.push(await s.run()); return r; }, _db: db };
}

/* ---------- redes imitadas ---------- */
const estado = { cuotaGbp0: false }; // true = Google aún no ha aprobado la API de la ficha (cuota 0)
const registro = []; // lo que el Worker ha pedido a las «redes»
let nGoogle = 0;
const respuestas = [
  [/oauth2\.googleapis\.com\/token/, (u, o, cuerpo) => {
    const q = new URLSearchParams(cuerpo);
    if (q.get('grant_type') === 'authorization_code') {
      if (q.get('code') !== 'codigo-bueno') return [400, { error: 'invalid_grant' }];
      if (!q.get('code_verifier')) return [400, { error: 'falta code_verifier' }];
      nGoogle++; return [200, { access_token: 'g-acceso-' + nGoogle, refresh_token: 'g-refresco-SECRETO', expires_in: 60, scope: 'x' }]; // caduca en 60 s: fuerza a renovar
    }
    if (q.get('refresh_token') !== 'g-refresco-SECRETO') return [400, { error: 'invalid_grant' }];
    nGoogle++; return [200, { access_token: 'g-acceso-' + nGoogle, expires_in: 3600 }];
  }],
  [/openidconnect\.googleapis\.com\/v1\/userinfo/, () => [200, { email: 'cuenta-prueba@ejemplo.com' }]],
  [/mybusinessaccountmanagement\.googleapis\.com\/v1\/accounts/, () => (estado.cuotaGbp0 ? [429, { error: { code: 429, message: "Quota exceeded for quota metric 'Requests' (0 per minute)", status: 'RESOURCE_EXHAUSTED' } }] : [200, { accounts: [{ name: 'accounts/111' }] }])],
  [/mybusinessbusinessinformation\.googleapis\.com\/v1\/accounts\/111\/locations/, () => [200, { locations: [{ name: 'locations/222', title: 'El Paraíso (prueba)' }] }]],
  [/mybusiness\.googleapis\.com\/v4\/accounts\/111\/locations\/222\/localPosts/, () => [200, { name: 'accounts/111/locations/222/localPosts/9' }]],
  [/mybusiness\.googleapis\.com\/v4\/accounts\/111\/locations\/222\/reviews/, () => [200, { reviews: [{ reviewId: 'r1', starRating: 'FIVE', comment: '¡Muy bueno!' }] }]],
  [/www\.googleapis\.com\/youtube\/v3\/channels/, () => [200, { items: [{ id: 'UC123', snippet: { title: 'El Paraíso TV' } }] }]],
  [/graph\.facebook\.com\/v21\.0\/oauth\/access_token/, (u) => [200, u.searchParams.get('grant_type') === 'fb_exchange_token' ? { access_token: 'm-usuario-largo-SECRETO', expires_in: 5184000 } : { access_token: 'm-usuario-corto' }]],
  [/graph\.facebook\.com\/v21\.0\/me\/accounts/, () => [200, { data: [
    { id: 'p1', name: 'Página sin IG', access_token: 'm-pagina1-SECRETO' },
    { id: 'p2', name: 'El Paraíso Palma', access_token: 'm-pagina2-SECRETO', instagram_business_account: { id: 'ig9', username: 'elparaiso' } }] }]],
  [/graph\.facebook\.com\/v21\.0\/p2\/feed/, () => [200, { id: 'p2_post1' }]],
  [/graph\.facebook\.com\/v21\.0\/p2(\?|$)/, () => [200, { id: 'p2', name: 'El Paraíso Palma' }]],
  [/open\.tiktokapis\.com\/v2\/oauth\/token/, () => [200, { access_token: 't-acceso-SECRETO', refresh_token: 't-refresco-SECRETO', expires_in: 86400, refresh_expires_in: 31536000, open_id: 'o1' }]],
  [/open\.tiktokapis\.com\/v2\/user\/info/, () => [200, { data: { user: { display_name: 'elparaiso_tt' } } }]],
];
const fetchReal = globalThis.fetch;
globalThis.fetch = async function (entrada, o = {}) {
  const url = new URL(typeof entrada === 'string' ? entrada : entrada.url);
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return fetchReal(entrada, o);
  const cuerpo = o.body ? String(o.body) : '';
  const cab = o.headers || {};
  registro.push({ url: url.toString(), metodo: o.method || 'GET', auth: cab.Authorization || cab.authorization || '', cuerpo });
  for (const [re, fn] of respuestas) if (re.test(url.toString())) { const [st, j] = fn(url, o, cuerpo); return new Response(JSON.stringify(j), { status: st, headers: { 'Content-Type': 'application/json' } }); }
  return new Response(JSON.stringify({ error: { message: 'el simulador no conoce ' + url.hostname } }), { status: 404, headers: { 'Content-Type': 'application/json' } });
};

/* ---------- Workers AI imitada (sin red ni cupo) ---------- */
const JPEG_MINI = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const llamadasIA = [];
const aiFalsa = {
  async run(modelo, e) {
    llamadasIA.push({ modelo, e });
    if (/flux/.test(modelo)) return { image: JPEG_MINI };
    if (/melotts/.test(modelo)) { if (!['en', 'es', 'fr', 'jp', 'kr', 'zh'].includes(e.lang)) throw new Error("8007: Unsupported language"); return { audio: Buffer.from('RIFF....WAVEfmt prueba').toString('base64') }; }
    if (/whisper/.test(modelo)) return { transcription_info: { language: e.language, duration: 2.5 }, segments: [{ words: [{ word: ' Hola', start: 0, end: 0.4 }, { word: ' mundo.', start: 0.5, end: 1.1 }] }], usage: { neurons: 2 } };
    if (/m2m100/.test(modelo)) return { translated_text: '[' + e.target_lang + '] ' + e.text, usage: { neurons: 1 } };
    if (/llama/.test(modelo)) {
      const u = e.messages[1].content;
      let r;
      if (/Translate each text/.test(u)) {
        const textos = JSON.parse(u.split('Texts (JSON array):\n')[1].split('\nReturn exactly')[0]);
        const cods = [...u.matchAll(/(\b[a-z]{2}) \(/g)].map((x) => x[1]);
        r = {}; for (const c of cods) r[c] = textos.map((t) => '[' + c + '] ' + t);
      } else if (/Source content/.test(u)) r = { piezas: [{ tipo: 'posts', titulo: 'P1', texto: 'Post uno' }, { tipo: 'hilo', titulo: 'Hilo', texto: '1/ a\n\n2/ b' }, { tipo: 'carrusel', titulo: 'C', texto: 'Pie', diapositivas: [{ titulo: 'a', texto: 'b' }] }] };
      else r = { titulo: 'Paella del domingo', texto: 'Texto escrito por la IA', hashtags: ['#Palma'] };
      return { choices: [{ message: { content: '```json\n' + JSON.stringify(r) + '\n```' } }], usage: { neurons: 120 } };
    }
    throw new Error('modelo no imitado: ' + modelo);
  },
};

/* ---------- servidor HTTP que ejecuta el Worker ---------- */
async function arrancar(opciones = {}) {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const medios = new Map();
  const env = {
    DB: crearD1(db),
    AI: aiFalsa,
    MEDIOS: { put: async (k, stream, o) => { medios.set(k, { datos: Buffer.from(await new Response(stream).arrayBuffer()), tipo: o.httpMetadata.contentType }); } },
    MEDIA_PUBLICA: 'http://localhost:' + PUERTO_API + '/_medios',
    CLAVE_CIFRADO: crypto.randomBytes(32).toString('base64'),
    ADMIN_CLAVE: 'admin-de-prueba',
    GOOGLE_CLIENT_ID: 'cliente-google-falso', GOOGLE_CLIENT_SECRET: 'secreto-google-falso',
    META_APP_ID: 'app-meta-falsa', META_APP_SECRET: 'secreto-meta-falso',
    TIKTOK_CLIENT_KEY: 'clave-tiktok-falsa', TIKTOK_CLIENT_SECRET: 'secreto-tiktok-falso',
    URL_BASE: 'http://localhost:' + PUERTO_API,
    PANEL_URL: 'http://localhost:' + PUERTO_WEB + '/index.html',
    ORIGENES: 'http://localhost:' + PUERTO_WEB,
    RESERVAS_URL: 'https://el-paraiso-eight.vercel.app/reservas.html',
  };
  const worker = (await import(path.join(RAIZ, 'conectores', 'chispa-api-worker.js'))).default;

  const api = http.createServer(async (rq, rs) => {
    try {
      if (rq.url.startsWith('/_medios/')) { const m = medios.get(rq.url.slice(9)); rs.writeHead(m ? 200 : 404, { 'Content-Type': m ? m.tipo : 'text/plain' }); return rs.end(m ? m.datos : ''); }
      const trozos = []; for await (const t of rq) trozos.push(t);
      const cuerpo = Buffer.concat(trozos);
      const req = new Request('http://localhost:' + PUERTO_API + rq.url, { method: rq.method, headers: rq.headers, body: ['GET', 'HEAD'].includes(rq.method) ? undefined : cuerpo, duplex: 'half' });
      const r = await worker.fetch(req, env);
      const cab = {}; r.headers.forEach((v, k) => (cab[k] = v));
      rs.writeHead(r.status, cab); rs.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { rs.writeHead(500); rs.end(String(e.stack || e)); }
  });
  const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
  const web = http.createServer((rq, rs) => {
    const f = path.join(RAIZ, decodeURIComponent(rq.url.split('?')[0].split('#')[0]).replace(/^\/+/, '') || 'index.html');
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end(); }
    rs.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(rs);
  });
  await new Promise((ok) => api.listen(PUERTO_API, ok));
  if (opciones.web !== false) await new Promise((ok) => web.listen(PUERTO_WEB, ok));

  // alta del negocio de prueba
  const alta = await worker.fetch(new Request(env.URL_BASE + '/admin/negocios', { method: 'POST', headers: { 'X-Chispa-Admin': env.ADMIN_CLAVE, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'el-paraiso', nombre: 'El Paraíso' }) }), env);
  const { codigo } = await alta.json();
  return {
    env, worker, db, registro, estado, codigo, medios, llamadasIA,
    base: env.URL_BASE, web: 'http://localhost:' + PUERTO_WEB,
    cron: () => worker.scheduled({}, env),
    cerrar: () => { api.close(); web.close(); },
  };
}
module.exports = { arrancar };

if (require.main === module) {
  arrancar().then((s) => {
    console.log('Servidor de Chispa simulado en ' + s.base);
    console.log('Web: ' + s.web + '/index.html?servidor=' + encodeURIComponent(s.base) + '#conectar');
    console.log('Negocio: el-paraiso · código de acceso: ' + s.codigo);
  });
}
