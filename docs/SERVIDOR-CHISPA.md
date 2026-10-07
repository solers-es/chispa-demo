# Servidor de Chispa · todo igual en todas las páginas y en el móvil

> **Lo que pidió Stalin:** «una vez Chispa esté enlazado con todas las plataformas, que en todas las
> páginas y en el teléfono se vea actualizado sin volver a enlazarlo».

**Estado (07/10/2026):** el código está escrito y **probado en local** con un simulador (sin cuenta y
sin red): 22 comprobaciones del servidor y 11 en el navegador (portátil + iPhone) en verde.
**Falta desplegarlo**: crear la cuenta gratuita de Cloudflare y poner los secretos. Eso se hace con
Stalin delante, siguiendo la guía de abajo. Hasta entonces Chispa sigue en **modo demostración**
(todo en el navegador de cada aparato) y lo dice en *Panel → Conexiones*.

| Fichero | Qué es |
|---|---|
| `conectores/chispa-api-worker.js` | El servidor (Cloudflare Worker): estado por negocio, conexiones OAuth, publicación y cron |
| `conectores/wrangler-api.toml` | Su configuración. **Sin ids reales ni secretos**: lleva marcadores `PEGA_AQUI…` / `PON_AQUI…` |
| `conectores/ia.js` | **IA gratis (Workers AI):** imagen FLUX, voz MeloTTS + subtítulos Whisper, textos/reaprovechar/traducir con Llama 3.3, cupo diario (trabajador G) |
| `conectores/api-publica.js` | **API pública `/v1/…` con claves por negocio y servidor MCP `/mcp`** (ver [`API-CHISPA.md`](API-CHISPA.md)) |
| `chispa-ia.js` | En la página: «Crear imagen con IA» de verdad, vídeo con voz y subtítulos, otros idiomas, reaprovechar, claves de API |
| `conectores/redes.js` | Llamadas a Instagram, Facebook, TikTok, YouTube y Google. Compartidas con `publicador-worker.js` |
| `chispa-sync.js` | En la página (cargado al final de `index.html`): baja, sube y junta los cambios |
| `pruebas/servidor-simulador.cjs` | Simulador local: el Worker de verdad en Node, con D1 imitada (SQLite) y redes falsas |
| `pruebas/servidor-api.cjs` · `pruebas/servidor-navegador.cjs` | Las pruebas (ver «Cómo se prueba») |
| `capturas/servidor/` | Capturas: modo demostración, portátil y iPhone conectados |

---

## 1 · Cómo funciona

```
 Portátil ─┐                         ┌─ Google (ficha) · YouTube
 iPhone  ──┼─ chispa-sync.js ──► Worker «chispa-api» ──► Meta (Instagram + Facebook)
 Tablet  ──┘   (sesión, sin tokens)  │  D1: estado, conexiones   └─ TikTok
                                     │  (tokens CIFRADOS)
                                     └─ Cron cada 5 min: publica lo programado
```

1. **Entrar una vez por aparato.** Cada negocio tiene un **código de acceso** (`ABCD-EFGH-JKLM`).
   Se escribe una vez en *Conexiones*; el servidor lo cambia por una **sesión de 1 año** guardada en
   ese aparato. Para el móvil no hace falta teclear: *Enlazar otro móvil* da un enlace
   `…#acceso=el-paraiso.CÓDIGO` que vale **15 minutos y una sola vez** (dueño o equipo, a elegir).
2. **Estado con versión.** Lo que hoy está en `localStorage` (el objeto `S` del panel: negocio,
   agenda, bandeja, anuncios…, y las reseñas) se guarda en el servidor como «documentos» con número
   de versión. Al guardar se manda la versión de la que se partía; si otro aparato guardó antes, el
   servidor responde **409** con lo nuevo y la página **junta los dos** (cada uno conserva lo que
   cambió; en listas con `id`, como la agenda, se junta elemento a elemento). Nunca se pisa a ciegas.
3. **Se pone al día solo:** al abrir, al volver a la pestaña, al recuperar conexión y cada ~15 s
   mientras la pestaña está a la vista. Si alguien está escribiendo, espera a que termine para
   repintar.
4. **Las redes se conectan UNA vez, en el servidor.** El botón *Conectar* lleva a la pantalla de
   permiso de Google / Meta / TikTok; al volver, el servidor guarda los tokens **cifrados** y desde
   ese momento todos los aparatos ven «✓ Conectada» sin volver a enlazar.
5. **El servidor llama a las APIs.** Publicar, programar (cron), estadísticas y cualquier llamada
   de los módulos (`ChispaSync.api`) pasan por el servidor, que pone el token y lo **renueva solo**
   con el `refresh_token` cuando caduca.

**Sin servidor configurado** (hoy): `chispa-sync.js` no hace nada más que poner en *Conexiones* la
tarjeta «🧪 Modo demostración». Todo sigue exactamente como antes.

**Con otro negocio abierto** (modo Solers de `chispa-cuentas.js`): la sincronización se **pausa**
para no subir los datos de un negocio encima de otro, y la tarjeta lo explica.

---

## 2 · Seguridad

- **Los tokens de las redes nunca llegan al navegador.** Se guardan en D1 cifrados con **AES-GCM**
  (clave de 256 bits en el secreto `CLAVE_CIFRADO`), atados a su negocio y red (datos adicionales
  `negocio|red`: no se pueden copiar de un negocio a otro). `GET /conexiones` solo devuelve nombre de
  cuenta y estado. Lo comprueban las pruebas: ni la base en claro ni el `localStorage` contienen tokens.
- **Códigos y sesiones** no se guardan tal cual: solo su huella HMAC-SHA-256. Si alguien se llevara la
  base, no le servirían para entrar.
- **Roles:** *dueño* (conecta y quita redes, enlaza móviles, cierra todas las sesiones) y *equipo*
  (usa Chispa, no toca conexiones).
- **OAuth:** `state` aleatorio de un solo uso y 15 min de vida; Google además con **PKCE**. La vuelta
  solo redirige a páginas de `ORIGENES` (nunca a una dirección de fuera).
- **`/api/:red`** solo llama a los dominios oficiales de cada red (lista blanca): el servidor no sirve
  de puente a cualquier sitio.
- **CORS** limitado a `ORIGENES` (`https://solers-es.github.io`).
- El service worker (`sw.js`) **no guarda en caché** nada que lleve `Authorization`.
- **Secretos solo con `wrangler secret put`**: nunca en el código ni en el `.toml`.
- Si se pierde un móvil: *Conexiones → (dueño)* → `DELETE /sesiones` cierra todos los aparatos
  (hoy por la API; el botón se puede añadir), y se entra de nuevo con el código.

**Límites conocidos (dicho claro):**
- Fotos y vídeos subidos desde un aparato viven en su IndexedDB: en otro aparato no aparecen hasta
  que se activa R2 (almacén de archivos) y se suben al servidor.
- Las reseñas se sincronizan como dato, pero `resenas.js` las tiene en memoria: en el otro aparato
  se ven al recargar, hasta que C use `ChispaSync.suscribir('resenas', …)` (ver «Enganches»).
- Un documento puede ocupar como mucho **1,5 MB** (D1 admite filas de 2 MB). Con documentos muy
  grandes el plan gratuito (10 ms de CPU por petición) se puede quedar corto.
- **Sin probar contra las redes de verdad**: no hay app aprobada en Meta/TikTok/Google todavía. Los
  formatos están sacados de la documentación oficial de cada una.

---

## 3 · Coste: plan gratuito de Cloudflare

| Servicio | Gratis | Lo que gasta Chispa (aprox.) | Fuente |
|---|---|---|---|
| Workers | **100.000 peticiones/día**, 10 ms de CPU por petición, 50 subpeticiones, 5 cron | Un aparato con Chispa abierta y a la vista: ~4 peticiones/min (2 documentos cada 15 s) ≈ **2.900 en 12 h**. Da para ~30 aparatos abiertos todo el día. El cron: 288/día | [Workers · límites](https://developers.cloudflare.com/workers/platform/limits/) |
| D1 (base) | **5 millones de filas leídas/día**, **100.000 escritas/día**, **5 GB** | Cada consulta «¿hay algo nuevo?» lee 2-3 filas | [D1 · precios](https://developers.cloudflare.com/d1/platform/pricing/) |
| R2 (fotos, opcional) | **10 GB-mes**, 1 M operaciones A y 10 M B al mes, **salida gratis** | Fotos y vídeos que las redes descargan | [R2 · precios](https://developers.cloudflare.com/r2/pricing/) |

**Coste para El Paraíso: 0 €.** Si se pasa del límite diario, Cloudflare corta hasta medianoche
(UTC) — no cobra solo. Para muchos clientes de Solers, el plan de pago de Workers son 5 $/mes.
R2: Cloudflare puede pedir una tarjeta para activarlo aunque no cobre dentro del gratuito; por eso es
**opcional** y se puede dejar para después.

---

## 3 bis · IA en el servidor, API pública y MCP (07/10/2026, trabajador G)

**Desplegado** en `chispa-api.solers.workers.dev` (versión `2`, `/salud` → `"ia": true`) y comprobado
**una vez con IA real**: imagen generada en producción (`capturas/ia/servidor-real-paella.jpg`, 1024×1024,
servida en `/medio/…` con CORS). Enlace `[ai] binding = "AI"` en `wrangler-api.toml`; **sin claves nuevas**
(Workers AI va con la cuenta).

| Ruta | Qué hace | Modelo |
|---|---|---|
| `POST /ia/imagen` | Imagen acorde al texto y al sector → URL pública `/medio/ID.jpg` (30 días; las redes la descargan) | `@cf/black-forest-labs/flux-1-schnell` |
| `POST /ia/voz` | Voz + tiempos palabra a palabra para subtítulos (es, en, fr, zh, ja, ko) | `@cf/myshell-ai/melotts` + `@cf/openai/whisper-large-v3-turbo` |
| `POST /ia/texto` | `accion`: `escribir`, `reaprovechar` (texto largo → piezas) o `traducir` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (reserva: `@cf/meta/m2m100-1.2b`) |
| `GET /ia/uso` | Lo gastado hoy y los límites | — |
| `POST /ia/video` | **Hueco**: 501 hasta elegir proveedor de pago ([`VIDEO-IA.md`](VIDEO-IA.md)) | — |
| `/claves` | (dueño) crear, listar y revocar claves de API; se guarda solo la huella | — |
| `/v1/…` · `POST /mcp` | API pública y MCP: [`API-CHISPA.md`](API-CHISPA.md) | — |

**Cupo gratis:** 10.000 neuronas/día por cuenta. El servidor apunta lo gastado en `uso_ia` y corta a
9.000 (Cloudflare daría error, no cobra). Por negocio y día: 20 imágenes, 40 voces, 25 textos.
Medido: **una imagen ≈ 173 neuronas** (≈ 52 al día en toda la cuenta), voz ≈ 20-25, texto ≈ 30-260.
De pago (Workers Paid 5 $/mes): 0,011 $ por 1.000 neuronas → imagen ≈ 0,0019 $.

**En la página (`chispa-ia.js`):** las propuestas automáticas del Estudio siguen con **fotos libres**
(no gastan cupo); la IA solo se usa al pulsar **«✨ Crear imagen con IA» / «↻ Otra versión»**. Sin
servidor o sin sesión, sale una foto libre y lo dice. Tablas nuevas (se crean solas): `uso_ia`,
`medios_ia`, `api_claves`.

**Idiomas de verdad:** ver la tabla de [`API-CHISPA.md` §7](API-CHISPA.md). Resumen: textos en
cualquier idioma (8 garantizados, el resto con aviso), voz solo en 6, y m2m100 solo de reserva porque
se equivoca.

## 4 · Guía de despliegue, paso a paso (con Stalin en pantalla)

Se hace **una sola vez**. Todo en la carpeta del repositorio `chispa-demo`. En este Mac:

```bash
export PATH="/Users/usuario/herramientas/node/bin:$PATH"
cd <carpeta de chispa-demo>
```

### Paso 1 · Cuenta gratuita de Cloudflare
1. Abrir <https://dash.cloudflare.com/sign-up> → correo y contraseña (recomendado: la cuenta de
   Solers, `admin@solers.es`) → confirmar el correo.
2. No hace falta dominio ni tarjeta. En *Workers & Pages* elegir un **subdominio** `workers.dev`
   (p. ej. `solers`): el servidor quedará en `https://chispa-api.solers.workers.dev`.

### Paso 2 · Iniciar sesión desde el Mac
```bash
npx wrangler login          # abre el navegador → «Allow»
npx wrangler whoami         # comprobar que sale la cuenta buena
```

### Paso 3 · Crear la base de datos (D1)
```bash
npx wrangler d1 create chispa
```
Copiar el `database_id` que imprime y pegarlo en `conectores/wrangler-api.toml`, en
`database_id = "PEGA_AQUI_EL_ID_DE_LA_BASE_D1"`. (El id no es secreto.) Las tablas las crea el
servidor solo la primera vez.

### Paso 4 · (Opcional) Almacén de fotos R2
Solo si se quiere que las redes descarguen fotos y vídeos subidos desde el móvil:
```bash
npx wrangler r2 bucket create chispa-medios
```
En el panel de Cloudflare → R2 → `chispa-medios` → *Settings* → *Public access* → activar el
dominio `r2.dev`. Después, en `wrangler-api.toml`, quitar el `#` de las líneas `[[r2_buckets]]`,
`binding`, `bucket_name` y `MEDIA_PUBLICA` (con la URL `https://pub-….r2.dev`).

### Paso 5 · Poner la dirección del servidor
En `conectores/wrangler-api.toml`: `URL_BASE = "https://chispa-api.<subdominio>.workers.dev"`.

### Paso 6 · Secretos (NUNCA en el código)
Cada orden pide pegar el valor; no se ve en pantalla ni queda en ningún fichero.
```bash
C="-c conectores/wrangler-api.toml"
openssl rand -base64 32                       # → copiar el resultado
npx wrangler secret put CLAVE_CIFRADO $C      # pegar ese resultado (¡guardarlo también en el gestor de contraseñas!)
openssl rand -base64 24                       # → otra clave distinta
npx wrangler secret put ADMIN_CLAVE $C        # para dar de alta negocios
npx wrangler secret put GOOGLE_CLIENT_SECRET $C
npx wrangler secret put META_APP_ID $C        # del paso 9 (cuando esté)
npx wrangler secret put META_APP_SECRET $C
npx wrangler secret put TIKTOK_CLIENT_KEY $C  # del paso 10 (cuando esté)
npx wrangler secret put TIKTOK_CLIENT_SECRET $C
```
> ⚠️ **`CLAVE_CIFRADO` no se puede cambiar** después sin volver a conectar todas las redes (los
> tokens guardados ya no se podrían descifrar). Guardarla en un sitio seguro.
> Las redes que aún no tengan app se pueden dejar sin secreto: su botón dirá «Falta … en el servidor».

### Paso 7 · Desplegar
```bash
npx wrangler deploy -c conectores/wrangler-api.toml
curl https://chispa-api.<subdominio>.workers.dev/salud      # → {"ok":true,"version":"1","redes":[…]}
```
Dar de alta El Paraíso y **apuntar el código** que devuelve (es la llave del dueño):
```bash
curl -X POST https://chispa-api.<subdominio>.workers.dev/admin/negocios \
  -H "X-Chispa-Admin: <ADMIN_CLAVE>" -H "Content-Type: application/json" \
  -d '{"id":"el-paraiso","nombre":"El Paraíso"}'
# → {"negocio":"el-paraiso","codigo":"ABCD-EFGH-JKLM"}
```

### Paso 8 · Google (ficha del negocio + YouTube)
**Ya creado el 07/10/2026 con Stalin:** proyecto **«Chispa El Paraiso»** (id `hispa-el-paraiso`,
nº 518008968805), cuenta `elparaisobarrestaurante1968@gmail.com`.
- **ID de cliente** (público, ya puesto en `wrangler-api.toml` como `GOOGLE_CLIENT_ID`):
  `518008968805-va0k5v0m5i6k8kipflhschaqk07ki35e.apps.googleusercontent.com`
- **Origen JavaScript autorizado:** `https://solers-es.github.io` ✓
- **Usuarios de prueba:** `elparaisobarrestaurante1968@gmail.com` y `stalindelacruzgomez29@gmail.com` ✓
- **APIs activadas:** My Business Business Information y Account Management ✓ — con **cuota 0 hasta
  que Google apruebe el caso 5-5969000041337** (7-10 días hábiles). Mientras tanto Google se puede
  conectar igual: la tarjeta de Conexiones dice «⏳ Google todavía no ha aprobado el acceso a la API de
  la ficha…» y, cuando lo aprueben, la ficha empieza a funcionar **sola**, sin volver a conectar
  (el servidor vuelve a buscarla en cada uso).

**Lo que falta hacer en el despliegue:**
1. *Credenciales → el ID de cliente → URI de redirección autorizados → Añadir:*
   **`https://chispa-api.<subdominio>.workers.dev/oauth/vuelta`** (exacta, sin barra final; el
   `<subdominio>` es el del paso 1).
2. `npx wrangler secret put GOOGLE_CLIENT_SECRET -c conectores/wrangler-api.toml` y pegar el secreto
   (está guardado fuera del repositorio; no se escribe en ningún fichero).
3. Para YouTube: habilitar también **YouTube Data API v3** y **YouTube Analytics API** en
   *APIs y servicios → Biblioteca* (no necesitan aprobación para los usuarios de prueba).

Permisos que pide Chispa: `business.manage` (ficha) y `youtube.upload`, `youtube.readonly`,
`youtube.force-ssl`, `yt-analytics.readonly` (YouTube), más `openid email` para mostrar la cuenta.
Pide `access_type=offline` + `prompt=consent` para obtener el **refresh_token** (permiso permanente).

### Paso 9 · Meta (Instagram + Facebook)
En <https://developers.facebook.com/apps> → la app de Solers (tipo *Empresa*) → producto
**Inicio de sesión con Facebook para empresas** → *Configuración*:
- **URI de redireccionamiento de OAuth válidos:** `https://chispa-api.<subdominio>.workers.dev/oauth/vuelta`
- *Configuración básica*: copiar **Identificador de la app** y **Clave secreta** → `META_APP_ID`, `META_APP_SECRET`.
- Si se crea una *configuración* de Login para empresas, su id va en `META_CONFIG_ID` (opcional).

Permisos: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`,
`instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`,
`business_management`. Hasta que Meta haga la **revisión de la app**, solo funcionan con las personas
que tengan rol en la app (Stalin como administrador).

### Paso 10 · TikTok
En <https://developers.tiktok.com/> → la app → **Login Kit** y **Content Posting API**:
- **Redirect URI:** `https://chispa-api.<subdominio>.workers.dev/oauth/vuelta`
- Copiar **Client key** y **Client secret** → `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.
- Permisos: `user.info.basic`, `video.publish`, `video.upload`. Hasta la auditoría de TikTok solo
  publica en privado (`TIKTOK_PRIVACIDAD = "SELF_ONLY"` en el `.toml`).

> **La misma dirección de vuelta para las tres:** `https://chispa-api.<subdominio>.workers.dev/oauth/vuelta`.

### Paso 11 · Encender la sincronización en la web
En `index.html`, en la línea de `chispa-sync.js`:
```html
<script>window.CHISPA_SERVIDOR=window.CHISPA_SERVIDOR||"https://chispa-api.<subdominio>.workers.dev";…</script>
```
(La dirección no es secreta.) Commit y push → GitHub Pages lo publica.

Para probar **antes** de tocar `index.html`: abrir
`https://solers-es.github.io/chispa-demo/?servidor=https://chispa-api.<subdominio>.workers.dev#conectar`
(se recuerda en ese navegador; `?servidor=no` lo quita).

### Paso 12 · Primera vez con Stalin
1. En el **portátil**: *Panel → Conexiones* → código del paso 7 → **Entrar**. Lo que ya tenía en ese
   navegador sube al servidor (el servidor está vacío).
2. **Conectar** Google, YouTube, Instagram y Facebook, TikTok (cada uno abre su pantalla de permiso → «Permitir»).
3. **📱 Enlazar otro móvil → Para mí** → mandar el enlace al iPhone (WhatsApp a sí mismo) y abrirlo.
   El iPhone entra solo y ve todo conectado.
4. Comprobar: cambiar algo en el iPhone → en el portátil aparece en menos de 20 s.

### Si algo falla
| Síntoma | Causa | Arreglo |
|---|---|---|
| `redirect_uri_mismatch` (Google) | La dirección de vuelta no coincide letra a letra | Paso 8.4: `…workers.dev/oauth/vuelta`, sin barra final |
| «Google no dio permiso permanente» | Google ya había dado permiso antes y no repite el refresh_token | Quitar Chispa en <https://myaccount.google.com/permissions> y volver a conectar |
| La tarjeta dice «⚠️ Hay que volver a conectar» | Se cambió la contraseña o se quitó el permiso | Pulsar *Volver a conectar* |
| Error de CORS en la consola | La página no está en `ORIGENES` | Añadirla en el `.toml` y `wrangler deploy` |
| `Falta CLAVE_CIFRADO` | No se puso el secreto | Paso 6 |
| Error 1027 | Pasado el límite diario gratuito | Espera a medianoche UTC o plan de 5 $/mes |

---

## 5 · Enganches: cómo usa cada módulo el servidor

`chispa-sync.js` no modifica ningún otro fichero. Lo que ya funciona **sin tocar nada**:

| Módulo | Cómo queda enganchado |
|---|---|
| Panel (`index.html`, `S`, `guardar()`) | Documento `principal`. `chispa-sync.js` vigila `localStorage.setItem` de la clave `KEY` y, al llegar cambios, actualiza `S` **en su sitio** y repinta la pestaña abierta |
| Agenda (D, `chispa-agenda.js`) | Sus datos viven en `S.agenda` → viajan con `principal` (se juntan por `id`). Además, con alguna red conectada, `chispa-sync.js` pone `window.CHISPA_PUBLICADOR` apuntando al servidor (`base`, `clave` = sesión, `conectada(red)`): `/programar`, `/agenda`, `/subir` y el cron funcionan por negocio |
| Estudio (`chispa-estudio.js`) | Publicación directa por `CHISPA_PUBLICADOR.url` (`/publicar?s=…`) y `conectada(red)` |
| Mi negocio / Conexiones (B, `mi-negocio.js`) | Datos en `S.negocio` y `S.conexiones` (viajan solos). `chispa-sync.js` envuelve `panel()` para añadir su tarjeta arriba de *Conexiones* y marca en cada tarjeta de la guía «☁️ Conectada en el servidor» |
| Reseñas (C, `resenas.js`) | Documento `resenas` (clave `chispa_resenas_v1`) |
| Cuentas (E, `chispa-cuentas.js`) | Si `ChispaCuentas.idActual()` no es el negocio con el que se entró, la sincronización se pausa |

Lo que **cada trabajador puede añadir** cuando quiera (opcional):

```js
// C · reseñas: refrescar en vivo cuando llegan de otro aparato
if (window.ChispaSync) ChispaSync.suscribir('resenas', function (datos) { R = datos; panel(TAB); });

// C y B · leer/contestar reseñas o tocar la ficha con el token del SERVIDOR (sin Client ID en la página)
if (window.ChispaSync && ChispaSync.estado().modo === 'servidor')
  ChispaSync.api('google', 'GET', 'https://mybusiness.googleapis.com/v4/accounts/…/locations/…/reviews')
    .then(function (r) { /* r.status, r.datos */ });

// Cualquier módulo nuevo con datos propios (fuera de S):
ChispaSync.guardar('mi-modulo', datos);       // sube
ChispaSync.leer('mi-modulo');                 // lo último
ChispaSync.suscribir('mi-modulo', fn);        // fn(datos, {origen:'servidor'})
// …o, si ya guarda en localStorage:
ChispaSync.vincular('mi-modulo', 'chispa_mi_clave', function (datos) { /* repintar */ });

// E · cuentas de verdad: el servidor ya separa negocios y roles
ChispaSync.estado();           // {modo, negocio, nombre, esAdministrador, pausado}
ChispaSync.esAdministrador();  // dueño del negocio en el servidor
ChispaSync.negocioActual();    // {id, nombre}
```

Alta de más negocios (clientes de Solers): `POST /admin/negocios` con `X-Chispa-Admin` (paso 7).
Cada uno tiene sus datos y sus redes separados en la base.

---

## 6 · Cómo se prueba (sin cuenta y sin red)

```bash
export PATH="/Users/usuario/herramientas/node/bin:$PATH"
mkdir -p ~/Proyectos/chispa-f-pruebas && cd ~/Proyectos/chispa-f-pruebas && npm init -y && npm i sql.js playwright-core@1.62.1
cd <chispa-demo>
NODE_PATH=~/Proyectos/chispa-f-pruebas/node_modules node pruebas/servidor-api.cjs         # 22 comprobaciones
NODE_PATH=~/Proyectos/chispa-f-pruebas/node_modules node pruebas/servidor-navegador.cjs   # 11, portátil + iPhone
NODE_PATH=~/Proyectos/chispa-f-pruebas/node_modules node pruebas/servidor-ia-api.cjs      # 35: IA imitada, cupo, claves, /v1, MCP
CHISPA_FOTO_IA=<una foto.jpg> NODE_PATH=~/Proyectos/chispa-f-pruebas/node_modules node pruebas/ia-navegador.cjs  # 10, escritorio + iPhone
NODE_PATH=~/Proyectos/chispa-f-pruebas/node_modules node pruebas/servidor-simulador.cjs   # para mirarlo a mano
```
El simulador ejecuta el Worker de verdad (`chispa-api-worker.js`) con D1 imitada por SQLite y
Google/Meta/TikTok imitados. Lo que comprueba, entre otras cosas: código malo rechazado; enlace de
móvil de un solo uso; versión y 409 sin pisar; OAuth de las cuatro redes; tokens cifrados y nunca en
el navegador; renovación con refresh_token; lista blanca de `/api`; cron que publica; cambios a la
vez en portátil e iPhone que se juntan; el portátil se pone al día solo; pausa con otro negocio
abierto; cero errores de JavaScript.

---

## Alta sola, planes, límites y pago (trabajador H, 07/10/2026)

Va en un módulo aparte, `conectores/suscripciones.js`, importado por el Worker: `/planes`, `/alta/reto`,
`/alta`, `/cuenta`, `/cuenta/baja`, `/pago/checkout`, `/pago/portal`, `/stripe/webhook`, `/admin/clientes`
y `DELETE /admin/negocios/:id`. Precios y límites: `precios.js`. Los negocios dados de alta por Solers con
`/admin/negocios` (como `el-paraiso`) no tienen fila en `cuentas` y siguen **sin límites**.
Todo lo que falta para vender y los pasos exactos: [`docs/VENDER-CHISPA.md`](VENDER-CHISPA.md).
