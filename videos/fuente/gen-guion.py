#!/usr/bin/env python3
"""Escribe GUION.md (las dos versiones) con tiempos reales de la grabación."""
import json, os, sys
W = os.path.dirname(os.path.abspath(__file__))
salida = sys.argv[1]
TIT = {
 'portada': ('Portada', 'Tarjeta de título «Chispa · Tu marketing en automático».'),
 'que-es': ('1 · Qué es Chispa y para quién', 'Página de presentación: titular y las seis cosas que hace; botón «Ver cómo funciona por dentro».'),
 'asistente': ('2 · El Asistente', 'Escribir la idea, «Que Chispa lo escriba», versiones con enfoques distintos, chat «Pídeselo a Chispa».'),
 'estudio': ('3 · Estudio de contenido', 'Imagen con movimiento (zoom), sello de marca con el logo, botones Reservar/Ver carta/Cómo llegar, otra versión, subir foto, Editar.'),
 'publicar': ('4 · Publicar en todas las redes y «Así lo ve tu cliente»', '10 vistas previas (Instagram feed/Stories/Reels, TikTok, Facebook, WhatsApp, Google, YouTube) y la demostración de publicación (marcada como demostración).'),
 'calendario': ('5 · Calendario', 'Semana con colores por red y estados, mejores horas, «Planificar mi semana», promo por franja, vista mes.'),
 'resenas': ('6 · Reseñas', 'Google, TripAdvisor y TheFork; respuesta en el idioma del cliente; otra versión; responder; negativas siempre a mano; reseñas de ejemplo.'),
 'mensajes': ('7 · Comentarios y mensajes', 'Respuesta sugerida y «Aprobar y enviar».'),
 'automatizaciones': ('8 · Automatizaciones', 'Interruptores, qué funciona ya y qué permiso falta; «Ver cómo queda» del menú del día.'),
 'anuncios': ('9 · Anuncios', 'Objetivo, público y presupuesto; Chispa prepara texto, botones y gasto al mes.'),
 'estadisticas': ('10 · Estadísticas', 'Instagram real (1.206 seguidores), cifras de EJEMPLO marcadas, consejos del algoritmo.'),
 'mi-negocio': ('11 · Mi negocio', 'Datos del negocio, botones Reservar/Ver carta/Cómo llegar, ficha de Google, pegar un enlace.'),
 'conexiones': ('12 · Conexiones', 'Guía de 5 minutos: Google, Instagram, Facebook, TikTok, YouTube, WhatsApp.'),
 'cierre': ('Cierre', 'Tarjeta final con la llamada a la acción y la dirección de la demo.'),
 'c-portada': ('Portada', '«¿No te da la vida para las redes?»'),
 'c-crear': ('1 · Le dices la idea', 'Escribir la idea, versiones con foto en movimiento y sello de marca, otra versión.'),
 'c-asi': ('2 · Así lo ve tu cliente', 'Vistas previas en todas las redes.'),
 'c-pub': ('3 · Publicar', 'Demostración de publicación (marcada como demostración).'),
 'c-cal': ('4 · Calendario', '«Planificar mi semana» y promo por franja.'),
 'c-msg': ('5 · Comentarios y mensajes', 'Respuesta lista para aprobar.'),
 'c-res': ('6 · Reseñas', 'Respuesta en inglés y filtro de negativas.'),
 'c-stats': ('7 · Estadísticas', 'Cifras y consejos.'),
 'c-cierre': ('Cierre', 'Llamada a la acción.'),
}
def mmss(s): return f'{int(s//60)}:{int(s%60):02d}'
out = ['# Guion · vídeos explicativos de Chispa', '',
       'Voz: «Marisol (Premium)», voz española del Mac. Grabado con el Chromium propio de Playwright sobre https://solers-es.github.io/chispa-demo/ (1920×1080, 30 fps). Subtítulos incrustados y en .srt.', '',
       'Lo que se dice con honestidad en el vídeo: la publicación real aún no está activada (la demo de publicar avisa «No se sube nada de verdad»; «cuando conectes tus cuentas y cada red dé su permiso, se publica sola»), las reseñas y algunas estadísticas son de EJEMPLO, y la ficha de Google espera el permiso de Google. No salen precios, ni datos personales, ni el modo de administración.', '']
for modo, nombre in (('largo', 'Vídeo explicativo completo'), ('corto', 'Corte corto para redes')):
    tx = json.load(open(f'{W}/audio/{modo}/textos.json'))
    esc = json.load(open(f'{W}/grab/{modo}/escenas.json'))
    tot = sum(esc[k]['D'] for k in tx if k in esc)
    out += [f'## {nombre} ({mmss(tot)})', '']
    off = 0
    for k, frases in tx.items():
        if k not in esc: continue
        t, d = TIT.get(k, (k, ''))
        out += [f'### {mmss(off)} · {t}', '']
        if d: out += [f'*En pantalla:* {d}', '']
        for f in frases: out.append(f'> {f}')
        out.append('')
        off += esc[k]['D']
open(salida, 'w').write('\n'.join(out))
print('escrito', salida)
