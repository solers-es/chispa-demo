# Vídeo generado por IA · opciones, precio y recomendación

> Encargo de Stalin: lo que Blotato tiene y Chispa no, **sin contratar nada todavía y sin meter
> tarjeta**. Este documento es para decidir. Precios consultados el **07/10/2026**.

## 08/10/2026 · Lo que ya está hecho

- **Vídeo con IA GRATIS, funcionando**: Estudio → «🎞️ Crear vídeo con IA» (`chispa-video-ia.js`): guion por
  escenas con IA, una imagen IA por escena (FLUX), voz IA por escena, subtítulos palabra a palabra, sello,
  música suave generada en el navegador, MP4/WebM y «📅 Programar». Ejemplo real:
  `capturas/video-ia/ejemplo-recetas-caribenas-08-10-2026.mp4`.
- **Vídeo realista (de pago) PROGRAMADO y APAGADO**: `conectores/video-ia.js` (Veo 3.1 Lite o fal.ai LTX-2 Fast).
  Para encenderlo, cuando Stalin decida y meta tarjeta en el proveedor:
  ```bash
  cd conectores
  npx wrangler secret put VIDEO_IA_PROVEEDOR -c wrangler-api.toml   # escribe: veo   (o: fal)
  npx wrangler secret put GEMINI_API_KEY     -c wrangler-api.toml   # (o FAL_KEY si es fal)
  # opcionales: VIDEO_IA_MODELO (nombre exacto del modelo), VIDEO_IA_TOPE_USD_MES (20 por defecto)
  ```
  Límite: Básico 0, Pro 8, Agencia 30 clips al mes (`precios.js` → `videoIAMes`), coste apuntado por clip.
  **Sin probar contra el proveedor** (no hay clave): el primer día, una prueba y mirar la respuesta. Comprobar
  también el nombre exacto del modelo Lite en la documentación de Google ese día.

## Qué había antes (07/10/2026)

- **Cloudflare Workers AI no genera vídeo** (solo imagen, voz, texto, transcripción): no hay opción
  gratuita en nuestro propio servidor.
- Mientras tanto, el **Estudio monta el vídeo con las fotos** (gratis, en el propio móvil u ordenador):
  movimiento lento tipo *Ken Burns*, luz que cruza, texto que entra palabra a palabra, sello de marca,
  **voz en off de la IA** (español, inglés, francés, chino, japonés, coreano) y **subtítulos palabra a
  palabra**; en carruseles pasa por **todas las fotos**. Dura lo que la voz (6-45 s).
- **El hueco ya está hecho:** `POST /ia/video` y `POST /v1/video` en el servidor
  (`conectores/ia.js → generarVideo`) responden «todavía no activado» (501). Al elegir proveedor solo
  hay que poner su clave con `wrangler secret put` y rellenar esa función.

## Opciones reales (pago por uso, sin cuota mensual)

| Opción | Calidad / qué trae | Precio oficial | **Un clip de redes** | Fuente |
|---|---|---|---|---|
| **Google Veo 3.1 Lite** (API de Gemini) | Muy buena, vertical 9:16, **con sonido** | 0,05 $/s (720p) · 0,08 $/s (1080p) | **8 s 720p ≈ 0,40 $** | <https://ai.google.dev/gemini-api/docs/pricing> |
| Google Veo 3.1 Fast | Mejor, con sonido | 0,10 $/s (720p) · 0,12 $/s (1080p) | 8 s 720p ≈ 0,80 $ | misma |
| **LTX-2 Fast** (fal.ai) | Buena, rápida, con sonido, 6-20 s | 0,04 $/s (1080p) | **6 s 1080p ≈ 0,24 $** | <https://fal.ai/models/fal-ai/ltx-2/text-to-video/fast> |
| Wan 2.2 (fal.ai, modelo abierto) | Correcta, sin sonido | 0,04 $/s (480p) · 0,08 $/s (720p) | 5 s 480p ≈ 0,20 $ | <https://fal.ai/models/fal-ai/wan/v2.2-a14b/text-to-video> |
| MiniMax / Kling (fal.ai) | Muy buena | 0,025-0,14 $/s según modelo | 6 s ≈ 0,15-0,84 $ | <https://fal.ai/pricing> |

Notas: Veo **no tiene capa gratuita** (dice «Not available» en el plan gratuito de la API de Gemini).
fal.ai funciona con **saldo prepagado** (hay que meter tarjeta para recargar). Todos cobran por
segundo generado, también si el resultado no gusta: por eso conviene limitar clips por negocio y día.

## Recomendación

1. **Para empezar: Google Veo 3.1 Lite.** ≈ 0,40 $ por clip vertical de 8 s con sonido, calidad muy
   buena, y **ya tenemos el proyecto de Google Cloud** «Chispa El Paraiso» (mismo sitio donde está
   OAuth): solo hay que activar la facturación de ese proyecto y crear una clave de la API de Gemini
   (`wrangler secret put GEMINI_API_KEY`). Sin intermediarios.
2. **Si se quiere lo más barato:** LTX-2 Fast en fal.ai (≈ 0,24 $ por 6 s en 1080p).
3. **Precio al cliente:** incluir 4-8 clips/mes en el plan Pro (≈ 2-3 $ de coste) y vender packs
   extra. El vídeo con fotos + voz + subtítulos sigue siendo **ilimitado y gratis**.

**Hace falta decisión de Stalin** (y tarjeta en el proveedor elegido) antes de activarlo. Nada de esto
está contratado.
