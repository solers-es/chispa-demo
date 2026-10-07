// Busca huecos sin fotogramas en cada escena grabada: node huecos.js largo|corto
const fs = require('fs');
const modo = process.argv[2] || 'largo';
const G = __dirname + '/grab/' + modo;
for (const e of fs.readdirSync(G)) {
  const f = G + '/' + e + '/frames.json'; if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, 'utf8')); const t = d.frames.map(x => x.t);
  let g = 0, gi = 0; for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] > g) { g = t[i] - t[i - 1]; gi = t[i - 1]; }
  const fin = d.D - t[t.length - 1];
  console.log(e.padEnd(18), 'primero', t[0].toFixed(1), ' hueco', g.toFixed(1), 'en', gi.toFixed(1), ' final', fin.toFixed(1), ' D', d.D.toFixed(1), (t[0] > 1.5 || g > 4 ? '  <<< REVISAR' : ''));
}
