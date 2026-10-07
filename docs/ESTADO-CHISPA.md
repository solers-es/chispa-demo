# Estado de Chispa · 07/10/2026 (por la mañana)

> **Para Stalin, en una línea:** lo que es **programar** está hecho y probado: **≈ 84 % de todo el código**
> (≈ 88 % sin el «Estudio de contenido», que espera una decisión tuya). Lo poco que falta de código depende
> de una decisión o de un trámite (proveedor de vídeo IA, permisos). Lo que queda para venderla son
> **trámites**: CIF, Stripe, permisos de las redes, abogado, dominio y correo. Abajo, cada uno con sus
> pasos exactos.

- App: <https://solers-es.github.io/chispa-demo/> (móvil y ordenador, se instala como app)
- Servidor: <https://chispa-api.solers.workers.dev/salud> (Cloudflare, gratis; base D1 en Europa)
- Repositorio: `solers-es/chispa-demo` (público: no hay claves dentro)
- Medido sobre `main` el 07/10/2026, con las pruebas de la sección 4 en verde.

---

## 1 · Nivel por áreas (solo PROGRAMACIÓN)

«Antes» es el informe privado `chispa-analisis-2026-10-07` (02:50 de esta noche), que medía «producto
cobrable» y mezclaba código y trámites. «Ahora» mide **solo el código**: 100 % = no queda nada que
programar; lo que no se puede probar sin un permiso de la red se cuenta como hecho **solo si está
probado con el simulador** y se dice.

| Área | Antes | Ahora | Qué hay | Qué falta de código (si falta) |
|---|---|---|---|---|
| Diseño, portada y app instalable | 85 % | **95 %** | Un solo precio (39/79/149 + IVA, `precios.js`), textos legales enlazados, chat con IA de verdad, sin promesas viejas | Pasar a dominio propio cuando exista (cambiar 2 líneas) |
| Crear publicaciones (texto, imagen, vídeo) | 55 % | **90 %** | Texto e imagen con IA de verdad (Workers AI: Llama 3.3 y FLUX), vídeo con fotos + voz + subtítulos, otros idiomas, reaprovechar contenido largo, **cortar un vídeo largo en clips verticales** | Vídeo 100 % generado por IA: el hueco `POST /ia/video` está hecho; falta **elegir proveedor** (decisión) y escribir su llamada (≈ 1 h) |
| Calendario y publicación automática | 40 % | **90 %** | Franjas, día entero, promo para llenar, órdenes en lenguaje normal; el servidor publica solo cada 5 min en Instagram, Facebook, TikTok, YouTube y Google | Nada. Sin probar contra las redes de verdad hasta tener los permisos |
| Reseñas | 50 % | **90 %** | El servidor lee las de Google y las contesta (a mano, o solas las de 4-5★); las de 1-3★ nunca solas, aviso. Respuesta sugerida en el idioma del cliente | TripAdvisor y TheFork no tienen API para contestar: se copia y se abre su panel (no es código) |
| Ficha de Google (novedades, horario, fotos) | 35 % | **85 %** | Conector en el servidor; publica novedades desde el calendario | Nada. Espera la aprobación de Google (caso 5-5969000041337) |
| Mi negocio y Conexiones | 60 % | **90 %** | Datos reales, sectores, conexión OAuth UNA vez en el servidor (tokens cifrados) para todos los aparatos | Nada |
| **Comentarios y mensajes (bandeja)** | 20 % | **90 %** | Instagram y Facebook (comentarios y mensajes), Google (reseñas), YouTube (comentarios): leer, contestar, respuesta privada, etiquetas automáticas y a mano, estados (sin responder, respondido, archivado, spam), filtros. El servidor mira cada 15 min | TikTok no deja leer comentarios a apps normales; WhatsApp necesita WhatsApp Business (trámite) |
| **Estadísticas** | 20 % | **90 %** | Recogida diaria por el cron (Instagram, Facebook, Google, YouTube, TikTok), guardado por día, gráfica «Día a día», totales de 7 días frente a los 7 anteriores y **consejos con los datos propios**. Sin conexión: EJEMPLO marcado | Nada |
| **Anuncios** | 15 % | **85 %** | Meta: campaña + público local (radio y edad) + creatividad + anuncio, **en pausa**; el dueño la activa; resultados (impresiones, clics, gasto). Google: campaña **preparada** con las operaciones exactas de Google Ads | Google Ads se envía solo cuando haya token de desarrollador (trámite); sin probar contra Meta de verdad |
| **Automatizaciones** | 15 % | **90 %** | En el servidor con la app cerrada: palabra clave en comentario → mensaje privado con enlace; reseña nueva → respuesta sugerida o automática según nota; recordatorio de publicar; resumen semanal (correo si hay proveedor; si no, aviso en la app); aviso de fin de prueba | Correo: falta el proveedor (trámite). WhatsApp: trámite |
| Chat y «Habla con Chispa» | 30 % | **85 %** | El chat de la portada y «Habla con Chispa» contestan con IA de verdad (Llama 3.3 en el servidor, con topes por visitante y por día); si no hay cupo, frases preparadas | La voz de «Habla» es la del navegador; pasarla a la voz del servidor ≈ 2 h |
| Estudio de contenido (canales, miniseries) | 30 % | 30 % | Herramienta interna de ideas | **Decisión** de Stalin: ¿se vende o se queda interna? Si se vende, hay que conectarla al servidor |
| Cuentas, varios negocios, sectores, modo Solers | 5 % | **85 %** | Alta sola, código de acceso, sesiones, roles dueño/equipo, 8 sectores, «Mis clientes», «Altas y pagos» con avisos | Verificación del correo del alta: necesita proveedor de correo (trámite) |
| Cobro, seguridad y RGPD | 0 % | **80 %** | Stripe programado y **apagado**, límites por plan en el servidor (también Anuncios y Respuestas solo en Pro y Agencia), tokens cifrados AES-GCM, baja y borrado de datos, textos legales | Encender Stripe (trámite); copia de la base fuera de Cloudflare (D1 guarda sola 7 días de historia en el plan gratuito, 30 en el de pago; exportar: `npx wrangler d1 export chispa --remote`, ≈ 1 h para programarla) |
| **Chispa entera (media de las 14 áreas)** | ≈ 35 % (cobrable) | **≈ 84 % del código** · ≈ 88 % sin el Estudio | | |

Cómo se ha medido «ahora»: recorrido automático de **todas las pantallas y botones** (sección 4), las
pruebas del servidor y del navegador en verde, y leyendo el código de cada área. Lo que no se ha
podido probar contra las redes de verdad (porque no hay permisos) está dicho en cada fila.

### Lo que NO es trámite y queda de código (dicho claro)
1. **Vídeo generado por IA**: ≈ 1 h cuando Stalin elija proveedor (recomendado Google Veo 3.1 Lite, ≈ 0,40 $ por clip de 8 s; ver `docs/VIDEO-IA.md`). Sin la decisión y la clave no se puede escribir ni probar.
2. **«Habla con Chispa» con la voz del servidor**: ≈ 2 h. Hoy piensa con la IA del servidor pero habla con la voz del navegador (funciona, suena peor).
3. **Copia de la base fuera de Cloudflare** con un guion programado: ≈ 1 h (hoy D1 guarda 7 días de historia sola).
4. **Estudio de contenido**: depende de la decisión de si se vende.

---

## 2 · TRÁMITES (lo que queda para vender), con los pasos exactos

Ninguno lo puede hacer un Claude: piden la cara, el DNI, el CIF o la tarjeta de Stalin.

### T1 · CIF de la sociedad nueva y datos en los textos legales · ⏱ 10 min cuando esté inscrita
1. Cuando la sociedad esté inscrita, pasar a Claude: denominación social completa, CIF, domicilio,
   datos del Registro Mercantil y teléfono.
2. Claude los pone en `legal/aviso-legal.html`, `privacidad.html`, `terminos.html`, `cookies.html` y
   `encargo-tratamiento.html` (donde dice `[CIF]`, `[domicilio]`, `[denominación social completa]`…).
   **Bloquea**: vender legalmente (LSSI art. 10) y enviar las revisiones de Meta, TikTok y YouTube.

### T2 · Revisión legal por un abogado · ⏱ 1-2 h del abogado
1. Mandarle las 5 páginas de `legal/` (ya escritas en español e inglés).
2. Que confirme también: aviso de contenido hecho con IA y el contrato de encargado del tratamiento.

### T3 · Precio final · ⏱ 5 min
Hoy: Básico 39 €, Pro 79 €, Agencia 149 € al mes + IVA, 14 días gratis. Stalin decide; se cambia solo en
`precios.js` y en la tabla de `legal/terminos.html`.
**Ojo:** los vídeos ya grabados (`videos/`) dicen precios viejos → **regrabarlos** después (lo hace un
Claude con el guion de `videos/GUION.md`, ≈ 1 h).

### T4 · Cuenta de Stripe (cobrar con tarjeta) · ⏱ 30 min + verificación de Stripe · necesita T1
Pasos exactos en `docs/VENDER-CHISPA.md` → «D · El día de vender» (cuenta con `admin@solers.es`,
portal de cliente, IVA 21 %, webhook a `https://chispa-api.solers.workers.dev/stripe/webhook`, 2
secretos con `wrangler secret put`, y `PAGO_ENCENDIDO = "1"`). Probar antes en modo de prueba con la
tarjeta 4242 4242 4242 4242. Decidir también quién emite las facturas (Stripe o GestorOS; VeriFactu).

### T5 · Permisos de las redes (para publicar y leer en cuentas de clientes) · necesita T1
Pasos exactos en `docs/PERMISOS-REDES.md` (ya incluye los permisos nuevos de la bandeja, las
estadísticas y los anuncios). Resumen:
- **Meta (Instagram + Facebook)** · 2-4 semanas: verificar la empresa en Business Suite → app «Chispa»
  tipo Empresa → URL de privacidad, condiciones y borrado → vuelta `https://chispa-api.solers.workers.dev/oauth/vuelta`
  → secretos `META_APP_ID` y `META_APP_SECRET` → probar con la página de El Paraíso (como administrador
  funciona ya, sin revisión) → **App Review** con vídeo de cada permiso: publicar
  (`pages_manage_posts`, `instagram_content_publish`), comentarios (`pages_manage_engagement`,
  `instagram_manage_comments`), mensajes (`pages_messaging`, `instagram_manage_messages`), estadísticas
  (`read_insights`, `instagram_manage_insights`) y anuncios (`ads_management`, `ads_read`).
  Para anuncios, cada negocio necesita además una **cuenta publicitaria con forma de pago**.
- **TikTok** · 1-3 semanas: app en developers.tiktok.com, Login Kit + Content Posting API + Display API,
  ámbitos `user.info.basic`, `user.info.stats`, `video.list`, `video.publish`, `video.upload`, revisión
  con vídeo y luego auditoría para publicar en público (cambiar `TIKTOK_PRIVACIDAD`).
- **YouTube** · 1-6 semanas: activar YouTube Data API v3 y YouTube Analytics API en el proyecto
  «Chispa El Paraiso», pantalla de consentimiento, **verificación de la app** y **auditoría de la API**
  (sin ella los vídeos suben en privado).
- **Google (ficha de empresa)**: ya pedido, **caso 5-5969000041337** (7-10 días hábiles). Cuando lo
  aprueben, funciona solo, sin tocar nada. Si lo rechazan: contestar al correo con la web de Solers y
  el uso (publicar novedades y contestar reseñas de los negocios clientes).
- **Google Ads** (opcional, para anuncios en Google): pedir el **token de desarrollador** en
  ads.google.com → Herramientas → Centro de API (con la cuenta de administrador de Solers); ponerlo con
  `wrangler secret put GOOGLE_ADS_DEVELOPER_TOKEN`; añadir el permiso `adwords` a la conexión de Google.
  Hasta entonces las campañas de Google quedan «preparadas».

### T6 · Dominio propio (`chispa.solers.es`) · ⏱ 20 min
`docs/VENDER-CHISPA.md` → «G»: CNAME `chispa → solers-es.github.io`, dominio en GitHub Pages, y cambiar
`ORIGENES` y `PANEL_URL` en `conectores/wrangler-api.toml` + `wrangler deploy`.

### T7 · Correo de salida · ⏱ 20 min · mejor después de T6
Para: verificar el correo del alta, mandar el código, el resumen semanal y el aviso de fin de prueba
por correo. Con **Resend** (o Cloudflare Email): verificar el dominio, crear la clave y ponerla:
`wrangler secret put RESEND_API_KEY` y en `[vars]` `CORREO_REMITENTE = "Chispa <hola@chispa.solers.es>"`.
El resumen semanal ya lo usa solo en cuanto existan esas dos cosas. Mientras tanto, todo llega como
aviso dentro de la app y en «Altas y pagos» del modo Solers.

### T8 · Pasar las cuentas a `admin@solers.es` · ⏱ 30 min
- **Cloudflare** (hoy en `elparaisobarrestaurante1968@gmail.com`; Alex ya es administrador): invitar a
  `admin@solers.es` como Super Administrator y, si se quiere, transferir la propiedad.
- **Google Cloud** «Chispa El Paraiso»: *IAM → Conceder acceso* a `admin@solers.es` como Propietario.
- **GitHub**: el repo ya es de `solers-es`.
- Cuentas de APIs nuevas (Meta, TikTok, Stripe, Resend): crearlas ya con `admin@solers.es` (a nombre de la
  sociedad nueva).

### T9 · Turnstile («No soy un robot» en el alta, opcional) · ⏱ 5 min
`docs/VENDER-CHISPA.md` → «I». La sesión de wrangler de este Mac no tiene permiso de Turnstile.

### T10 · Decisiones de Stalin (no son trámites con nadie, pero bloquean algo)
- **Proveedor de vídeo con IA** (`docs/VIDEO-IA.md`): recomendado Veo 3.1 Lite (≈ 0,40 $/clip). Hace
  falta activar la facturación del proyecto de Google Cloud.
- **Número de WhatsApp Business** para recordatorios de reserva (WhatsApp Business Platform: empresa
  verificada, número propio y plantilla aprobada por Meta).
- **Estudio de contenido**: ¿producto o herramienta interna?

---

## 3 · El servidor encendido en la web pública

Desde esta revisión `index.html` lleva `window.CHISPA_SERVIDOR = "https://chispa-api.solers.workers.dev"`
(ver la sección 4 para lo comprobado). Qué cambia:
- **Visitante sin código**: ve la demostración entera, igual que antes, con los EJEMPLOS marcados y el
  aviso «entra con el código de tu negocio en Conexiones». El chat de la portada contesta con IA.
- **El Paraíso** (y cualquier negocio dado de alta): en *Conexiones* entra con su código una vez por
  aparato y desde ahí todo va contra el servidor (bandeja, estadísticas, anuncios, reglas, IA, publicar).
- **Alta sola** (`#alta`): igual que antes (ya usaba el servidor).

---

## 4 · Cómo se ha comprobado

```bash
export NODE_PATH=/Users/usuario/Proyectos/chispa-f-pruebas/node_modules   # sql.js y playwright-core
node pruebas/servidor-todas.cjs        # servidor: 22 + 35 + 35 + 39 comprobaciones (F, H, G, J)
node pruebas/panel-navegador.cjs       # bandeja, día a día, anuncios y reglas: ordenador + iPhone, sin y con servidor
node pruebas/clips-navegador.cjs       # cortar un vídeo largo en clips
node pruebas/recorrido-botones.cjs     # TODAS las pantallas y botones: errores, botones muertos y avisos que prometen
node pruebas/alta-navegador.cjs        # alta sola (H)
```
(Los puertos se cambian con `PUERTO_API` y `PUERTO_WEB` si hay otro simulador abierto.)

Resultado (07/10/2026, mañana):
- Servidor: **22 + 35 + 35 + 39 = 131 comprobaciones en verde** (`servidor-todas.cjs`).
- Navegador: **11 + 13 + 16 + 10 + 5 = 55 en verde** (`navegador-todas.cjs`), más las del calendario de D (30 + 8).
- **Recorrido de TODOS los botones**: 17 pantallas, **294 botones** pulsados en ordenador (sin servidor) y
  **347 en iPhone** como visitante con el servidor encendido: **0 errores de programa, 0 avisos que prometan
  sin hacer** (se quitaron «Piloto automático (demo)», «la voz real se conecta con ElevenLabs», «plan Equipo»
  y «le pongo música»). Los ≈ 45 botones que el recorrido marca «sin cambio» son enlaces que abren otra
  pestaña, la pestaña en la que ya estás o fotos que cambian después; se miraron uno a uno. Se arregló uno de
  verdad: en el iPhone las flechas ‹ › del calendario (vista lista) no movían nada.
- Web PUBLICADA con el servidor encendido: `servidor-encendido-publicada.cjs` (visitante en iPhone y
  ordenador, chat con IA, El Paraíso entra con su código; solo lee) y `alta-publicada.cjs` de H.

## 5 · Fallos conocidos y límites (sin adornos)

- **Arreglado esta noche:** la web pública **no se actualizaba desde las ≈ 02:00** (GitHub Pages pasaba
  los ficheros por Jekyll y `docs/API-CHISPA.md`, con expresiones `{{ … }}` de n8n, rompía la
  publicación). Con `.nojekyll` se publica tal cual. Desde las 06:00 la web enseña todo lo de G, H, la
  visita guiada y lo de este documento. Efecto secundario: los `.md` de `docs/` se ven como texto en
  github.io; para leerlos bonitos, en GitHub (enlaces de arriba).

- **Nada se ha probado contra las redes de verdad** (Meta, TikTok, YouTube, Google Ads): no hay app
  aprobada. Las llamadas siguen la documentación oficial y están probadas con un simulador que imita
  sus respuestas. El primer día con permisos hay que mirar con calma la primera respuesta real de cada una.
- **Plan gratuito de Cloudflare**: 50 llamadas por pasada del cron. El servidor reparte: la bandeja de
  un negocio cada pasada (cada uno como mucho cada 15 min) y las estadísticas de uno por pasada. Con
  muchos clientes (≈ 50+) hay que pasar a Workers de pago (5 $/mes).
- **Meta cambia y retira métricas** de páginas a menudo: si una deja de existir, el servidor guarda
  las que sí lleguen (al menos seguidores) y no se rompe.
- **TikTok**: estadísticas sí (seguidores y vistas de los últimos 20 vídeos), comentarios no.
- **Reseñas de TripAdvisor y TheFork**: no tienen API para contestar; Chispa redacta, copia y abre su panel.
- Los **vídeos explicativos** grabados tienen los precios viejos (regrabar tras T3).
