# Estado de Chispa · 07/10/2026 (revisado por el trabajador K; + Plan de ofertas del trabajador L)

> **08/10/2026 · Servidor APAGADO en la web.** El Worker `chispa-api` (y su base D1 `chispa`) vive en la
> cuenta de Cloudflare de **El Paraíso** (Dominican Balearic Drinks SL), que no es de Solers. Para separar las
> dos empresas, `CHISPA_SERVIDOR` está vacío en `index.html` (y también los valores por defecto de `alta.js` y
> `chispa-habla.html`): **la web pública de Chispa queda solo como demostración**. El Worker `chispa-api` y sus
> datos **no se han borrado**; se moverán a la cuenta de Cloudflare de Solers cuando la haya, y entonces se
> vuelve a poner su dirección aquí.


> **Para Stalin, en una línea:** lo que es **programar** está hecho y probado: **≈ 99 % del código**.
> Lo único de código que queda es el **vídeo 100 % generado por IA** (≈ 1 h), y no se puede escribir
> hasta que elijas proveedor y pongas tarjeta (decisión D1). Todo lo demás son **trámites** (CIF,
> Stripe, permisos de las redes, abogado, dominio, correo) y **decisiones** tuyas. Abajo, cada uno con
> sus pasos exactos y quién lo hace.

- App: <https://solers-es.github.io/chispa-demo/> (móvil y ordenador, se instala como app)
- Servidor: <https://chispa-api.solers.workers.dev/salud> (Cloudflare, gratis; base D1 en Europa) — desplegado hoy con lo de K, `/salud` ok
- Copias de la base: repositorio **privado** `solers-es/chispa-copias` (diarias, cifradas, 30 días)
- Repositorio: `solers-es/chispa-demo` (público: no hay claves dentro)
- Medido sobre `main` el 07/10/2026, con las pruebas de la sección 4 en verde.

---

## 1 · Nivel por áreas (solo PROGRAMACIÓN)

«J» es lo que medía el trabajador J esta mañana; «K» es después de este repaso. **100 % = no queda
nada que programar.** Aparte se dice si está **probado contra la red de verdad**: casi nada lo está,
porque faltan los permisos de cada red (trámite T5). Hasta entonces está probado con un simulador que
imita sus respuestas. Ojo: el primer día con permisos puede salir algún ajuste pequeño de código al ver
la primera respuesta real de cada red (riesgo, no tarea pendiente).

| Área | J | K | ¿Probado con la red real? | Qué falta (y de qué tipo) |
|---|---|---|---|---|
| Diseño, portada y app instalable | 95 % | **100 %** | — | Dominio propio: trámite T6 (cambiar 2 líneas al tenerlo) |
| Crear publicaciones (texto, imagen, vídeo) | 90 % | **95 %** | Sí (IA de Cloudflare) | **Vídeo 100 % IA**: hueco `POST /ia/video` hecho; ≈ 1 h de código cuando se decida proveedor (**decisión D1**) |
| Calendario y publicación automática | 90 % | **100 %** | No (T5) | Nada de código |
| Reseñas | 90 % | **100 %** | No (Google, caso abierto) | TripAdvisor y TheFork no tienen API para contestar (no es código: se copia y se abre su panel) |
| Ficha de Google | 85 % | **100 %** | No (T5) | Espera la aprobación de Google (caso 5-5969000041337) |
| Mi negocio y Conexiones | 90 % | **100 %** | Google sí; resto T5 | Nada |
| Comentarios y mensajes (bandeja) | 90 % | **100 %** | No (T5) | TikTok no deja leer comentarios a apps normales; WhatsApp: decisión D3 |
| Estadísticas | 90 % | **100 %** | No (T5) | Nada |
| Anuncios | 85 % | **100 %** | No (T5) | Google Ads se envía solo al poner el token de desarrollador (trámite T5) |
| Automatizaciones | 90 % | **100 %** | No (T5) | El correo sale solo al poner el proveedor (trámite T7) |
| Chat y «Habla con Chispa» | 95 % | **100 %** | Sí | Alemán y catalán con la voz del navegador: no hay voz gratuita en el servidor (si se quiere, es una voz de pago = decisión) |
| **Estudio para creadores** (antes «Estudio de contenido») | 30 % | **100 %** | Sí (IA real, probado 1 vez) | Nada. Ver sección 1 bis |
| **📅 Plan de ofertas** (nuevo, L) | — | **100 %** | Tiempo y festivos sí (APIs gratis); IA real, 1 vez | Nada de código. La carta de El Paraíso no tiene bebidas: añadirlas con precio. Ver sección 1 ter |
| Cuentas, varios negocios, sectores, modo Solers | 85 % | **100 %** | — | **Verificación del correo hecha** (K): se enciende sola con el proveedor (T7) |
| Cobro, seguridad y RGPD | 80 % | **100 %** | Stripe no (T4) | **Copia de la base fuera de Cloudflare hecha** (K). **La baja ya borra TODO** (K). Encender Stripe: trámite T4 |
| **Chispa entera (media de las 14 áreas)** | ≈ 85 % | **≈ 99 %** | | Solo el vídeo IA (decisión D1) |

### 1 bis · Lo que hizo K hoy (todo en `main` y el servidor desplegado)

1. **Copia de seguridad gratuita de la base** (era «≈ 1 h de código»):
   - Cada día a las **04:17** el MacBook de Stalin (launchd `es.solers.chispa-copia`) exporta la base
     con su sesión de wrangler, comprueba que se puede volver a cargar, la **cifra** (AES-256 con
     `COPIA_CLAVE`, que está SOLO en `~/herramientas/chispa-servidor-claves.txt`, permisos 600), la
     descifra para comprobarla y la sube a **`solers-es/chispa-copias` (privado)**. Guarda **30 días**
     y borra lo más viejo también de la historia de GitHub (RGPD). Si falla, aviso en la pantalla del Mac.
   - **Restaurar, probado** en una base D1 local: 23 tablas con las mismas filas y las imágenes enteras.
     D1 no acepta sentencias de más de 100 KB (las imágenes pasan de eso): `trocear.py` lo resuelve.
     Pasos en el `LEEME.md` de `chispa-copias` (y Time Travel de Cloudflare para los últimos 7 días).
   - No hay ningún token nuevo en el Worker.
2. **Estudio de contenido → «Estudio para creadores», vendible.** J lo dejó al 30 % esperando la
   decisión «¿se vende o se queda interno?». Respuesta de Stalin: **todo va para vender**. Hecho:
   - **Miniserie y Guion con IA de verdad** (servidor: `POST /ia/texto` con `accion: "serie" | "guion"`,
     Llama 3.3), para **cualquier tema**, en el **idioma** que se elija (por defecto el del negocio), con
     el **sector** y el nombre del negocio, para TikTok, Reels o Shorts. Reglas dentro del encargo a la
     IA: no inventar datos, cifras ni citas, nada de promesas médicas, legales o de dinero.
     Probado una vez contra el servidor real (serie de 3 episodios en español y guion en inglés).
   - **«Pasar al calendario»**: los episodios entran en el **calendario real** (el que publica el
     servidor) como **borrador** con fecha y hora propuestas y su red. Borrador porque falta el vídeo:
     nada se publica sin vídeo. Lista en «En el calendario» con «Abrir» y «Quitar».
   - **Portada con el sello de marca** de cada episodio o guion (imagen IA o foto libre) para descargar.
   - **Canales**: los de muestra salen marcados **EJEMPLO** y se quitan con un toque.
   - **Sin promesas falsas**: «Monetizar» quita las cifras sin fuente (RPM, 100-500 $…) y los textos
     internos («promocionar Brigada y GestorOS», «foso»); deja solo los requisitos oficiales de YouTube
     con enlace a la fuente y avisos de comprobarlo en cada red.
   - **Plan**: Pro y Agencia (`precios.js` lo promete y el servidor lo exige: `FUNCIONES.estudio`).
     En Básico se ve todo con plantillas de EJEMPLO y la IA contesta «viene en Pro y Agencia».
   - Sin servidor (visitante): plantillas marcadas EJEMPLO, sin gastar IA.
   - Ficheros: `chispa-creadores.js` (sustituye las vistas del Estudio de `index.html`),
     `conectores/ia.js` (`serie`, `guion`), `conectores/panel-real.js` (`exigirFuncion`).
3. **Verificación del correo del alta** (antes «necesita proveedor»): ya programada. Con proveedor, al
   darse de alta llega un correo con **su código y un enlace para confirmar** (7 días, un uso, el
   token se guarda solo como huella); «Mi plan» enseña «Reenviar» (1 cada 10 min). Si el proveedor
   falla, el alta sale bien igual. Se enciende sola al hacer el trámite T7.
4. **Fallo de RGPD arreglado**: la baja («Darme de baja y borrar mis datos») borraba 9 tablas y dejaba
   en la base la bandeja (comentarios y mensajes de los clientes del negocio), estadísticas, anuncios,
   reglas, avisos, claves de API e imágenes. Ahora borra **las 19**, comprobado tabla por tabla.
5. En el móvil, el botón flotante «Ver cómo funciona» tapaba el último botón de la pantalla: hueco abajo.

### 1 ter · 📅 Tu plan de ofertas (trabajador L, 07/10/2026 tarde)

Encargo de Stalin: «que me salga la maqueta de cada día de lo que puedo poner de oferta, según el
tiempo, el algoritmo y el día». Sección nueva del panel **«Plan de ofertas»** (`#ofertas`) y tarjeta
arriba del **Asistente** con la propuesta de hoy/mañana.

- **Una maqueta por día** (7 días, o 14): plato (o servicio / contenido según el sector), bebida (o
  extra / gancho), oferta, franja horaria, red y formato con su hora, texto listo, imagen propuesta
  (foto libre; «🎨 Imagen con IA» solo al pulsar, para cuidar el cupo) y el **«por qué» en una línea**.
- **Señales reales y gratis** (nada inventado):
  - Tiempo de la ciudad de «Mi negocio»: **Open-Meteo** (sin clave): máxima, lluvia, viento → calor =
    cóctel frío y terraza; lluvia = cuchara, para llevar y publicar antes; viento = vender el interior.
  - Festivos: **Nager.Date** (España + la comunidad: Baleares para Palma). Si no responde, la lista 2026
    copiada de Nager.Date (nacionales + Baleares) y Sant Sebastià (fiesta local de Palma).
  - Fechas calculadas: puentes, vísperas, principio de mes (nóminas), fin de mes, San Valentín, Día de
    la Madre, Halloween… **Partidos y eventos NO**: no hay fuente gratuita fiable, no se inventan.
  - El día: **cerrado** (horario de Mi negocio; El Paraíso, miércoles) y **horas flojas** de la «Promo
    para llenar» del calendario. Reglas de las redes de `docs/CRECIMIENTO-ALGORITMOS.md` (formato y hora
    por día). Temporada turística (Baleares). Estadísticas **reales** del negocio si hay ≥ 3 medidas.
- **La carta**: «📖 Importar tu carta» lee el enlace (El Paraíso: la carta pública
  `carta-paraiso.html`, 46 platos con precio; el enlace de Mi negocio, `carta.html`, es el **editor** y
  Chispa lo dice), webs con schema.org o texto con precios; o se pega / edita a mano. **Nunca se inventa
  un precio**: sin precio sale el hueco «… €». La carta de El Paraíso **no tiene bebidas**: las bebidas
  salen como sugerencia «no está en tu carta: pon el precio tú» hasta que se añadan.
- **Botones**: «Usar esta propuesta» (la publicación a su hora + la franja de promo con historias y
  estado de WhatsApp, en el calendario REAL como **borrador**, y «Abrir en Publicar»), «Otra idea»,
  «Cambiar plato/bebida», «👎 No me gusta» (aprende: no vuelve a salir; se guarda en `S.ofertasDia`, que
  el servidor sincroniza por negocio) y «⚡ Planificar la semana entera» de un toque.
- **Sectores e idioma**: peluquería → servicio del día + extra; creador → contenido + gancho + llamada a
  la acción; precios de ejemplo de los sectores cambiados por «… €». Texto en el idioma del negocio.
- **IA del servidor**: `POST /ofertas/textos` escribe los textos de todos los días en **una sola
  llamada** (Llama 3.3), en el idioma del negocio; cualquier precio que no venga de la carta se cambia por
  «… €». Sin servidor: plantillas en es, en, de y fr.
- **Plan**: Básico 3 días, Pro y Agencia 14 (`precios.js` → `limites.diasOfertas`), y el servidor lo
  aplica también (`GET /ofertas/plan`; días de más, fuera).
- Ficheros: `ofertas-dia.js` + `ofertas-dia.css` (página), `ofertas-carta.js` (leer cartas, vale en la
  página y en el servidor), `conectores/ofertas.js` (rutas `/ofertas/…`), y una línea en
  `chispa-api-worker.js` e `ia.js` (exporta `llm`). Pruebas: `ofertas-api.cjs` (15) y
  `ofertas-navegador.cjs` (17).

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
**Vídeos regrabados el 07/10 por la tarde** (fecha en el nombre: 08-10-2026) con 39/79/149 € + IVA y todo
lo nuevo: <https://solers-es.github.io/chispa-demo/videos/>. Si cambia el precio, se regraban con
`videos/fuente/` (pasos en `videos/GUION.md`).

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
**Todo el código ya está** (K): en cuanto existan esas dos cosas, sin tocar nada más, el alta manda el
correo con el código y el enlace para confirmar el correo, «Mi plan» enseña «Reenviar», y salen por
correo el resumen semanal y el aviso de fin de prueba. Para probarlo: darse de alta con un correo
propio en `#alta` y pulsar el enlace. Mientras tanto, todo llega como aviso dentro de la app y en
«Altas y pagos» del modo Solers.

### T8 · Pasar las cuentas a `admin@solers.es` · ⏱ 30 min
- **Cloudflare** (hoy en `elparaisobarrestaurante1968@gmail.com`; Alex ya es administrador): invitar a
  `admin@solers.es` como Super Administrator y, si se quiere, transferir la propiedad.
- **Google Cloud** «Chispa El Paraiso»: *IAM → Conceder acceso* a `admin@solers.es` como Propietario.
- **GitHub**: el repo ya es de `solers-es`.
- Cuentas de APIs nuevas (Meta, TikTok, Stripe, Resend): crearlas ya con `admin@solers.es` (a nombre de la
  sociedad nueva).

### T9 · Turnstile («No soy un robot» en el alta, opcional) · ⏱ 5 min
`docs/VENDER-CHISPA.md` → «I». La sesión de wrangler de este Mac no tiene permiso de Turnstile.

### T10 · Guardar la clave de las copias en un sitio seguro · ⏱ 2 min · Stalin
`COPIA_CLAVE` está **solo** en `~/herramientas/chispa-servidor-claves.txt` del MacBook. Si el Mac se
pierde, las copias de `solers-es/chispa-copias` no se pueden abrir. Copiarla al gestor de contraseñas
(o en papel, guardado). Y dejar el MacBook encendido o que despierte de noche: si está apagado varios
días no hay copia esos días (Cloudflare guarda 7 días de Time Travel aparte).

---

## 2 bis · DECISIONES de Stalin (no son trámites con nadie, pero bloquean algo)

| # | Decisión | Qué bloquea | Qué pasa al decidir |
|---|---|---|---|
| D1 | **Proveedor de vídeo con IA** (`docs/VIDEO-IA.md`): recomendado Google Veo 3.1 Lite (≈ 0,40 $ por clip de 8 s) | El vídeo 100 % generado por IA (lo único de código que queda) | Stalin activa la facturación del proyecto de Google Cloud «Chispa El Paraiso» y crea la clave; un Claude la pone con `wrangler secret put` y escribe la llamada en `generarVideo` de `conectores/ia.js` (≈ 1 h) |
| D2 | **Precio final** (hoy 39/79/149 € + IVA) y **qué plan lleva el Estudio para creadores** (K lo ha puesto en Pro y Agencia) | Vender con el precio bueno | Se cambia en `precios.js` (y `FUNCIONES.estudio` en `conectores/panel-real.js` si el Estudio cambia de plan) + `legal/terminos.html`; regrabar los vídeos (T3) |
| D3 | **Número de WhatsApp Business** para recordatorios y bandeja de WhatsApp | WhatsApp en la bandeja y en automatizaciones | WhatsApp Business Platform: empresa verificada (T1), número propio y plantillas aprobadas por Meta; luego ≈ ½ día de código |
| D4 | **Voz de pago para alemán y catalán** (opcional) | Que «Habla con Chispa» y los vídeos tengan voz del servidor en esos idiomas (hoy, voz del navegador y subtítulos) | Elegir proveedor (p. ej. ElevenLabs o Google TTS) y clave; ≈ 1 h de código |

(La decisión «Estudio de contenido: ¿producto o herramienta interna?» ya está tomada: **producto**.)

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
node pruebas/servidor-todas.cjs        # servidor: 22 + 35 + 35 + 39 + 10 + 6 comprobaciones (F, H, G, J, K)
node pruebas/navegador-todas.cjs       # navegador: 11 + 13 + 16 + 10 + 5 + 11 (… y el Estudio para creadores de K)
node pruebas/panel-navegador.cjs       # bandeja, día a día, anuncios y reglas: ordenador + iPhone, sin y con servidor
node pruebas/clips-navegador.cjs       # cortar un vídeo largo en clips
node pruebas/recorrido-botones.cjs     # TODAS las pantallas y botones: errores, botones muertos y avisos que prometen
node pruebas/alta-navegador.cjs        # alta sola (H)
```
(Los puertos se cambian con `PUERTO_API` y `PUERTO_WEB` si hay otro simulador abierto.)

Resultado con el Plan de ofertas (07/10/2026, trabajador L): servidor **162** (147 + 15 de
`ofertas-api.cjs`), navegador **83** (66 + 17 de `ofertas-navegador.cjs`: ordenador sin servidor con
tiempo/festivos/carta imitados, iPhone 390 px con servidor e IA, plan Básico), recorrido de botones
18 pantallas: **328** en ordenador y **410** en iPhone con servidor, **0 errores, 0 avisos que prometen**.

Resultado (07/10/2026, repaso de K):
- Servidor: **22 + 35 + 35 + 39 + 10 + 6 = 147 comprobaciones en verde** (`servidor-todas.cjs`; nuevas:
  `creadores-api.cjs` y `correo-api.cjs`).
- Navegador: **11 + 13 + 16 + 10 + 5 + 11 = 66 en verde** (`navegador-todas.cjs`; nueva:
  `creadores-navegador.cjs`, ordenador sin servidor + iPhone con servidor + plan Básico), más las del calendario de D (30 + 8).
- Recorrido de botones de K (ordenador, sin servidor): 17 pantallas, **289 botones**, **0 errores, 0 avisos que prometen**.
- IA real del Estudio probada **una vez** contra el servidor desplegado (serie y guion) y `/salud` una vez.
- Copia de la base: hecha a mano y por launchd, subida y comprobada en GitHub; restauración probada en D1 local.
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
  publicación). Con `.nojekyll` se publica tal cual. Desde las 05:55 la web enseña todo lo de G, H, la
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
- **Encontrado al regrabar los vídeos (07/10 tarde):**
  - **«Crear imagen con IA» fallaba SIEMPRE desde la web**: la página manda `semilla` y el servidor se la pasaba
    a FLUX como `seed`, que Workers AI no admite (error 5006) → salía «Foto libre (la IA no estaba disponible)».
    **Arreglado en `conectores/ia.js` pero SIN DESPLEGAR** (no tuve permiso para desplegar): falta
    `npx wrangler deploy -c conectores/wrangler-api.toml`. Pruebas del servidor en verde (147).
  - **Estadísticas da error en un negocio recién dado de alta** (`vStats2` en `chispa-agenda.js`:
    «Cannot read properties of undefined (reading 'fecha')») cuando aún no hay datos. Sin arreglar.
  - El vídeo vertical que hace la app sale **sin imagen** en el Chromium de pruebas de Playwright cuando elige
    MP4 (con WebM sí sale bien). En Chrome/Safari normales no se ha visto; vigilarlo en Chrome de Windows/Linux.
- **Copias**: dependen de que el MacBook de Stalin esté encendido a las 04:17 (si dormía, launchd la hace
  al despertar). La exportación deja la base ocupada unos segundos (de noche, sin efecto visible).
- **Estudio para creadores**: escribe el plan y los guiones; **no graba** los vídeos. Los episodios
  entran como borrador hasta que se sube el vídeo. La IA (Llama 3.3) puede equivocarse en datos: el
  encargo le prohíbe inventarlos y la pantalla pide revisar antes de publicar.
