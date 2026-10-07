// Genera la voz de cada frase con la voz del Mac «Marisol (Premium)» y mide su duración.
// Uso: node tts.js largo|corto
const { execFileSync } = require('child_process');
const fs = require('fs');
const modo = process.argv[2] || 'largo';
const VOZ = process.env.VOZ || 'Marisol (Premium)';
const RATE = process.env.RATE || '178';
const FF = '/Users/usuario/herramientas/bin/ffmpeg', FP = '/Users/usuario/herramientas/bin/ffprobe';
const g = require(`${__dirname}/guion-${modo}.js`);
const dir = `${__dirname}/audio/${modo}`;
fs.mkdirSync(dir, { recursive: true });
const dur = {}, textos = {};
for (const e of g.escenas) {
  dur[e.id] = []; textos[e.id] = [];
  e.segs.forEach((s, i) => {
    const base = `${dir}/${e.id}-${i}`;
    const texto = (s.voz || s.t).replace(/[«»]/g, '');
    const firma = VOZ + '|' + RATE + '|' + texto;
    const firmaF = base + '.txt';
    if (!(fs.existsSync(base + '.wav') && fs.existsSync(firmaF) && fs.readFileSync(firmaF, 'utf8') === firma)) {
      execFileSync('say', ['-v', VOZ, '-r', RATE, '-o', base + '.aiff', texto]);
      execFileSync(FF, ['-y', '-v', 'error', '-i', base + '.aiff', '-af', 'aresample=48000:resampler=soxr,silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', base + '.wav']);
      fs.unlinkSync(base + '.aiff');
      fs.writeFileSync(firmaF, firma);
    }
    const d = parseFloat(execFileSync(FP, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', base + '.wav']).toString());
    dur[e.id].push(d); textos[e.id].push(s.t);
  });
  console.log(e.id, dur[e.id].map(x => x.toFixed(1)).join(' '), '=', dur[e.id].reduce((a, b) => a + b, 0).toFixed(1), 's');
}
fs.writeFileSync(`${dir}/duraciones.json`, JSON.stringify(dur, null, 1));
fs.writeFileSync(`${dir}/textos.json`, JSON.stringify(textos, null, 1));
const tot = Object.values(dur).flat().reduce((a, b) => a + b, 0);
console.log('TOTAL voz', tot.toFixed(1), 's');
