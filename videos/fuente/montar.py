#!/usr/bin/env python3
"""Monta el vídeo: fotogramas grabados + voz colocada en su sitio + subtítulos incrustados.
Uso: python3 montar.py largo|corto [crf] [salida.mp4] [--sin-subs]"""
import json, os, sys, wave, subprocess, re

W = os.path.dirname(os.path.abspath(__file__))
FF = '/Users/usuario/herramientas/bin/ffmpeg'
modo = sys.argv[1] if len(sys.argv) > 1 else 'largo'
crf = sys.argv[2] if len(sys.argv) > 2 else '18'
salida = sys.argv[3] if len(sys.argv) > 3 else f'{W}/salida/chispa-{modo}.mp4'
os.makedirs(os.path.dirname(salida), exist_ok=True)
G = f'{W}/grab/{modo}'
A = f'{W}/audio/{modo}'
textos = json.load(open(f'{A}/textos.json'))
orden = list(textos.keys())
RATE = 48000

lista = []      # (fichero, duración)
voz = []        # (inicio_s, wav)
subs = []       # (ini, fin, texto)
off = 0.0
for esc in orden:
    fj = f'{G}/{esc}/frames.json'
    if not os.path.exists(fj):
        print('falta escena', esc); continue
    d = json.load(open(fj))
    D, marcas, frames = d['D'], d['marcas'], d['frames']
    frames = [f for f in frames if f['t'] < D]
    if not frames:
        print('sin fotogramas', esc); continue
    ts = [max(0.0, f['t']) for f in frames]
    ts[0] = 0.0
    for i, f in enumerate(frames):
        fin = ts[i + 1] if i + 1 < len(frames) else D
        dd = max(0.0, fin - ts[i])
        if dd > 0 or i == len(frames) - 1:
            lista.append((f'{G}/{esc}/{f["f"]}', dd))
    for i, m in enumerate(marcas):
        w = f'{A}/{esc}-{i}.wav'
        voz.append((off + m, w))
        with wave.open(w) as wf:
            dur = wf.getnframes() / wf.getframerate()
        # subtítulos: trocear la frase en bloques de ≤ 84 caracteres, tiempo proporcional
        t = textos[esc][i]
        trozos, cur = [], ''
        for pal in re.split(r'(?<=[\.,:;\?!»])\s+', t):
            if len(cur) + len(pal) + 1 <= 84:
                cur = (cur + ' ' + pal).strip()
            else:
                if cur: trozos.append(cur)
                while len(pal) > 84:
                    corte = pal.rfind(' ', 0, 84)
                    trozos.append(pal[:corte]); pal = pal[corte + 1:]
                cur = pal
        if cur: trozos.append(cur)
        tot = sum(len(x) for x in trozos)
        ini = off + m
        for x in trozos:
            dd = dur * len(x) / tot
            subs.append((ini, ini + dd, x))
            ini += dd
    off += D
total = off
print(f'duración total {total:.1f} s ({int(total//60)}:{int(total%60):02d}), {len(lista)} fotogramas, {len(voz)} frases')

# lista de fotogramas para el concat demuxer
with open(f'{G}/lista.txt', 'w') as fh:
    for f, dd in lista:
        fh.write(f"file '{f}'\nduration {dd:.4f}\n")
    fh.write(f"file '{lista[-1][0]}'\n")

# pista de voz
n = int(total * RATE) + RATE
buf = bytearray(n * 2)
for ini, w in voz:
    with wave.open(w) as wf:
        assert wf.getframerate() == RATE and wf.getnchannels() == 1
        data = wf.readframes(wf.getnframes())
    p = int(ini * RATE) * 2
    buf[p:p + len(data)] = data[:max(0, len(buf) - p)]
with wave.open(f'{G}/voz.wav', 'wb') as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(RATE); wf.writeframes(bytes(buf))

def ts(s):
    ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); se, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{se:02d},{ms:03d}'
srt = os.path.splitext(salida)[0] + '.srt'
with open(srt, 'w', encoding='utf-8') as fh:
    for i, (a, b, x) in enumerate(subs, 1):
        fh.write(f'{i}\n{ts(a)} --> {ts(b)}\n{x}\n\n')

vf = 'fps=30,scale=1920:1080:flags=lanczos'
if '--sin-subs' not in sys.argv:
    estilo = "FontName=Helvetica Neue,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H40101018,BackColour=&H40101018,BorderStyle=3,Outline=7,Shadow=0,MarginV=14,MarginL=40,MarginR=40,Bold=1"
    srt_esc = srt.replace(':', r'\:').replace("'", r"\'")
    vf += f",subtitles='{srt_esc}':force_style='{estilo}'"
vf += ',format=yuv420p'
cmd = [FF, '-y', '-v', 'error', '-stats', '-f', 'concat', '-safe', '0', '-i', f'{G}/lista.txt', '-i', f'{G}/voz.wav',
       '-vf', vf, '-af', 'highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=120,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-tune', 'stillimage' if False else 'film',
       '-c:a', 'aac', '-b:a', '160k', '-t', f'{total:.3f}', '-movflags', '+faststart', salida]
print(' '.join(cmd[:6]), '…')
subprocess.run(cmd, check=True)
print('hecho', salida, f'{os.path.getsize(salida)/1e6:.1f} MB')
