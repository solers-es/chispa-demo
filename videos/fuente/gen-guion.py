#!/usr/bin/env python3
"""Escribe GUION.md (las dos versiones) con tiempos reales de la grabación (ya con los cortes de espera)."""
import json, os, sys
W = os.path.dirname(os.path.abspath(__file__))
salida = sys.argv[1]
TIT = {
 'portada': ('Portada', 'Tarjeta de título «Chispa · Tu marketing en automático».'),
 'que-es': ('1 · Qué es Chispa', 'Portada de la web: para negocios y creadores, en cualquier idioma.'),
 'alta': ('2 · Darse de alta', 'Alta sola en #alta: nombre, sector, idioma, correo, plan (39/79/149 € + IVA, de precios.js), 14 días gratis. El código de acceso sale TAPADO. Negocio de prueba «Café Aurora (ejemplo)», borrado después.'),
 'mi-negocio': ('3 · Mi negocio', 'El Paraíso: datos y botones, pegar un enlace, tipo de negocio (sector) e idioma del contenido.'),
 'conexiones': ('4 · Conexiones', 'Negocio de prueba con sesión: «Conectado en el servidor · vale para todos tus dispositivos», redes sin conectar, guía de 5 minutos.'),
 'crear': ('5 · Crear una publicación', 'Idea → 4 versiones → «Otra versión» con IMAGEN IA REAL del servidor (FLUX) → sello de marca → «Otros idiomas» (traducción real al inglés y al alemán) → «Reaprovechar».'),
 'video': ('6 · Vídeo con voz y subtítulos', 'Ventana «Descargar para redes»: voz de la IA y subtítulos; se graba el vídeo vertical (espera recortada) y se reproduce con su sonido.'),
 'cliente': ('7 · Así lo ve tu cliente', '10 vistas previas y demostración de publicar (marcada: «No se sube nada de verdad»).'),
 'calendario': ('8 · Calendario', 'Semana, franja de promo, «Promo para llenar» (historias + publicación + estado de WhatsApp, «Todo cuadrado»), «promo el sábado todo el día».'),
 'bandeja': ('9 · Comentarios y mensajes', 'Bandeja con etiquetas y respuesta propuesta (con el enlace de reservas); «Enviar»; datos de EJEMPLO.'),
 'resenas': ('10 · Reseñas', 'Google, TripAdvisor y TheFork; respuesta en inglés; negativas siempre a mano; reseñas de ejemplo.'),
 'automatizaciones': ('11 · Automatizaciones', 'Palabra clave → mensaje privado, reseñas según nota, recordatorio, resumen semanal; con cuenta, lo hace el servidor.'),
 'anuncios': ('12 · Anuncios', 'Campaña Meta o Google, presupuesto, tope «ni un euro más», simulación (con cuenta se crea en pausa).'),
 'estadisticas': ('13 · Estadísticas', 'Día a día (cifras de EJEMPLO marcadas), consejos con tus datos, Instagram real (1.206 seguidores).'),
 'estudio': ('14 · Estudio para creadores', 'Miniserie con IA real sobre «Recetas de café para hacer en casa», pasada al calendario como borrador; Pro y Agencia.'),
 'crecer': ('15 · Crecer', 'Guía para crecer: OFICIAL / ESTUDIO / OPINIÓN, mejores horas, no te penalicen.'),
 'tour': ('16 · Visita guiada', '«Ver cómo funciona»: elegir sector y recorrido paso a paso con Siguiente.'),
 'plan': ('17 · Mi plan', 'Plan Pro en prueba, uso, elegir plan, pago aún no activado, baja con borrado (correo y negocio tapados).'),
 'cierre': ('18 · Cierre', 'Tarjeta final: 14 días gratis y la dirección de la demo.'),
 'c-portada': ('Portada', '«¿No te da la vida para las redes?»'),
 'c-crear': ('1 · Le dices la idea', 'Publicación escrita, imagen IA real con sello y traducción al inglés y al alemán.'),
 'c-video': ('2 · Y el vídeo', 'Vídeo vertical con voz y subtítulos, con su sonido.'),
 'c-asi': ('3 · Así lo ve tu cliente', 'Vistas previas en todas las redes.'),
 'c-cal': ('4 · Calendario', '«Promo para llenar» y «Todo cuadrado».'),
 'c-msg': ('5 · Mensajes y reseñas', 'Respuesta lista para aprobar.'),
 'c-precio': ('6 · 14 días gratis', 'Precios de la web (desde 39 € + IVA).'),
 'c-cierre': ('Cierre', 'Llamada a la acción.'),
}
def mmss(s): return f'{int(s//60)}:{int(s%60):02d}'
def duracion(modo, k):
    d = json.load(open(f'{W}/grab/{modo}/{k}/frames.json'))
    return d['D'] - sum(b - a for a, b in (d.get('cortes') or []))
out = ['# Guion · vídeos explicativos de Chispa (08/10/2026)', '',
       'Voz: «Marisol (Premium)», voz española del Mac (frente a la voz en español del servidor de Chispa, MeloTTS, Marisol suena más natural; la del servidor sí se oye, tal cual, dentro del vídeo que hace Chispa en la sección 6). Grabado con el Chromium propio de Playwright sobre https://solers-es.github.io/chispa-demo/ con el servidor encendido (1920×1080, 30 fps). Subtítulos incrustados y en .srt. Sin música.', '',
       'Lo que se dice con honestidad: «cuando conectes tus cuentas y cada red dé su permiso, se publica solo»; la demostración de publicar avisa «No se sube nada de verdad»; bandeja, reseñas y estadísticas de El Paraíso son de EJEMPLO (salvo Instagram, real); el pago con tarjeta aún no está activado. Lo que necesita sesión se grabó con un negocio de prueba («Café Aurora (ejemplo)») creado con el alta y borrado después; su código de acceso, su correo y su identificador salen tapados. No sale el modo Solers ni ningún código de El Paraíso.', '',
       'Cómo se rehace: `videos/fuente/` (node tts.js largo → node motor.js largo → python3 montar.py largo → node entregar.js). Hace falta `privado/estado-b.json` (sesión de un negocio de prueba creado con el alta; no se sube nunca).', '']
for modo, nombre in (('largo', 'Vídeo explicativo completo'), ('corto', 'Corte corto para redes')):
    tx = json.load(open(f'{W}/audio/{modo}/textos.json'))
    esc = [k for k in tx if os.path.exists(f'{W}/grab/{modo}/{k}/frames.json')]
    tot = sum(duracion(modo, k) for k in esc)
    out += [f'## {nombre} ({mmss(tot)})', '']
    off = 0
    for k in esc:
        t, d = TIT.get(k, (k, ''))
        out += [f'### {mmss(off)} · {t}', '']
        if d: out += [f'*En pantalla:* {d}', '']
        for f in tx[k]: out.append(f'> {f}')
        out.append('')
        off += duracion(modo, k)
open(salida, 'w').write('\n'.join(out))
print('escrito', salida)
