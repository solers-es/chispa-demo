// Copia los vídeos montados al repositorio (videos/) y al Escritorio (SOLERS - PROGRAMAS/VIDEOS CHISPA),
// con la fecha en el nombre. Si el largo pasa de 90 MB, al repositorio va una versión ligera.
const fs = require('fs');
const { execFileSync } = require('child_process');
const W = __dirname, S = W + '/salida';
const R = '/Users/usuario/Proyectos/chispa-video/videos';
const E = '/Users/usuario/Desktop/SOLERS - PROGRAMAS/VIDEOS CHISPA';
const FF = '/Users/usuario/herramientas/bin/ffmpeg';
const F = '08-10-2026';
const cp = (a, b) => { fs.copyFileSync(a, b); console.log('→', b, (fs.statSync(b).size / 1e6).toFixed(1), 'MB'); };
const mb = f => fs.statSync(f).size / 1e6;
fs.mkdirSync(E, { recursive: true });
// largo: al repo, ligera si pasa de 90 MB
let largoRepo = `${S}/chispa-largo.mp4`;
if (mb(largoRepo) > 90) {
  const lig = `${S}/chispa-largo-ligero.mp4`;
  if (!fs.existsSync(lig) || fs.statSync(lig).mtimeMs < fs.statSync(largoRepo).mtimeMs)
    execFileSync(FF, ['-y', '-v', 'error', '-i', largoRepo, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-maxrate', '1300k', '-bufsize', '2600k', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', lig], { stdio: 'inherit' });
  largoRepo = lig;
}
cp(largoRepo, `${R}/chispa-explicativo-${F}.mp4`);
cp(`${S}/chispa-corto.mp4`, `${R}/chispa-corto-redes-${F}.mp4`);
cp(`${S}/chispa-largo.srt`, `${R}/chispa-explicativo-${F}.srt`);
cp(`${S}/chispa-corto.srt`, `${R}/chispa-corto-redes-${F}.srt`);
execFileSync('python3', [`${W}/gen-guion.py`, `${R}/GUION.md`], { stdio: 'inherit' });
execFileSync(FF, ['-v', 'error', '-y', '-ss', '4', '-i', `${S}/chispa-largo.mp4`, '-frames:v', '1', '-q:v', '3', `${R}/chispa-explicativo-${F}-portada.jpg`]);
execFileSync(FF, ['-v', 'error', '-y', '-ss', '3', '-i', `${S}/chispa-corto.mp4`, '-frames:v', '1', '-q:v', '3', `${R}/chispa-corto-redes-${F}-portada.jpg`]);
cp(`${S}/chispa-largo.mp4`, `${E}/Chispa - video explicativo completo 1080p (${F}).mp4`);
if (largoRepo !== `${S}/chispa-largo.mp4`) cp(largoRepo, `${E}/Chispa - video explicativo version ligera (${F}).mp4`);
cp(`${S}/chispa-corto.mp4`, `${E}/Chispa - corte para redes 90 s (${F}).mp4`);
cp(`${S}/chispa-largo.srt`, `${E}/Chispa - video explicativo (${F}).srt`);
cp(`${S}/chispa-corto.srt`, `${E}/Chispa - corte para redes (${F}).srt`);
cp(`${R}/GUION.md`, `${E}/GUION - videos Chispa (${F}).md`);
// fuentes al repo (sin privado/, grab/, audio/, salida/)
const FU = `${R}/fuente`;
for (const f of ['motor.js', 'comun.js', 'cache-ia.js', 'overlay.js', 'tts.js', 'guion-largo.js', 'guion-corto.js', 'montar.py', 'gen-guion.py', 'hoja.py', 'huecos.js', 'entregar.js', 'borrar-altas.js'])
  fs.copyFileSync(`${W}/${f}`, `${FU}/${f}`);
console.log('fuentes copiadas a', FU);
