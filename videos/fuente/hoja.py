#!/usr/bin/env python3
"""Hoja de contactos de una escena grabada: python3 hoja.py largo escena [n]"""
import json, sys, os
from PIL import Image
W = os.path.dirname(os.path.abspath(__file__))
modo, esc = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 12
d = json.load(open(f'{W}/grab/{modo}/{esc}/frames.json'))
fr = d['frames']; D = d['D']
ims = []
for k in range(n):
    t = D * (k + 0.5) / n
    best = max([f for f in fr if f['t'] <= t] or fr[:1], key=lambda f: f['t'])
    im = Image.open(f'{W}/grab/{modo}/{esc}/{best["f"]}').resize((640, 360))
    ims.append(im)
cols = 3
s = Image.new('RGB', (640 * cols, 360 * ((n + cols - 1) // cols)))
for i, im in enumerate(ims): s.paste(im, ((i % cols) * 640, (i // cols) * 360))
os.makedirs(f'{W}/revisar', exist_ok=True)
s.save(f'{W}/revisar/h-{esc}.jpg', quality=80)
print(f'{W}/revisar/h-{esc}.jpg', 'marcas', [round(m, 1) for m in d['marcas']], 'D', round(D, 1))
