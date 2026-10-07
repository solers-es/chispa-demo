# API de Chispa · n8n, Make, scripts y Claude (MCP)

> Lo mismo que ofrece Blotato («API + n8n/Make + MCP»), pero en **nuestro propio servidor** y sin
> herramientas puente de pago. Servidor: **`https://chispa-api.solers.workers.dev`**
> (Cloudflare Worker `chispa-api`, código en `conectores/api-publica.js` y `conectores/ia.js`).

**Estado (07/10/2026):** desplegado y probado (35 comprobaciones en `pruebas/servidor-ia-api.cjs`;
imagen real generada en el servidor desplegado). La **publicación en las redes** depende de que cada
red esté conectada en *Conexiones* y de los permisos de Meta/TikTok/YouTube (ver
[`PERMISOS-REDES.md`](PERMISOS-REDES.md)). Crear, programar, listar, imágenes, voz, textos y
traducciones funcionan ya.

---

## 1 · La clave de API

1. Chispa → *Panel → Conexiones* (hay que haber entrado con el código del negocio, como **dueño**).
2. Tarjeta **🔑 API de Chispa** → escribir para qué es (p. ej. «n8n») → **Crear clave**.
3. Copiarla en ese momento: **no se vuelve a enseñar** (en la base solo queda su huella HMAC).
   Si se pierde: **Revocar** y crear otra. Máximo 10 claves activas por negocio.

Se manda en cada llamada:

```
Authorization: Bearer chispa_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Una clave **solo abre `/v1/…` y `/mcp`** de su negocio: no ve los datos privados del panel ni las
conexiones (los tokens de las redes nunca salen del servidor).

---

## 2 · Rutas

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/v1/yo` | Negocio y redes conectadas |
| GET | `/v1/cuentas` | Redes conectadas (sin tokens) |
| POST | `/v1/publicaciones` | Crear: borrador (sin `cuando`), programada (con `cuando`) o `publicar_ya: true` |
| POST | `/v1/programar` | Igual, pero `cuando` es obligatorio |
| GET | `/v1/publicaciones?estado=programada&limite=50` | Listar (`borrador`, `programada`, `publicada`, `fallo`, `cancelada`) |
| GET | `/v1/publicaciones/:id` | Estado de una y resultado en cada red |
| POST | `/v1/publicaciones/:id/publicar` | Publicar ahora |
| DELETE | `/v1/publicaciones/:id` | Cancelar (si no está publicada) |
| POST | `/v1/imagen` | Imagen con IA → URL pública (`…/medio/ID.jpg`, dura 30 días) |
| POST | `/v1/voz` | Voz + subtítulos (`{texto, idioma}`) → audio WAV en base64 y palabras con tiempos |
| POST | `/v1/texto` | Escribir una publicación desde una idea (`{idea, idioma, formato}`) |
| POST | `/v1/reaprovechar` | Texto largo → piezas (`{texto, idioma, piezas:[…]}`) |
| POST | `/v1/traducir` | `{textos:[…], idiomas:["en","de"], origen?}` |
| GET | `/v1/uso` | Lo gastado hoy del cupo gratuito de IA |
| POST | `/v1/video` | **Hueco**: responde 501 hasta elegir proveedor ([`VIDEO-IA.md`](VIDEO-IA.md)) |
| POST | `/mcp` | Servidor MCP (para Claude y otros agentes) |

### Campos de una publicación (`/v1/publicaciones`, `/v1/programar`)

| Campo | Tipo | Notas |
|---|---|---|
| `texto` | texto | Lo que se publica. Si falta, se usa `idea` y lo escribe la IA |
| `idea` | texto | «paella del domingo» → la IA escribe texto + hashtags en `idioma` |
| `redes` | lista | `instagram`, `instagram_stories`, `facebook`, `tiktok`, `youtube`, `google` (o `igf`, `igs`, `fb`, `tt`, `yt`, `gbp`) |
| `cuando` | fecha ISO 8601 | `2026-10-12T19:30:00+02:00`. El servidor publica solo (revisa cada 5 min) |
| `medios` | lista de URLs `https://` | Fotos o vídeos públicos que las redes puedan descargar |
| `imagen_ia` | `true` o texto | Crea una imagen con IA acorde al texto (o con ese prompt en inglés) |
| `formato` | `post` · `carrusel` · `historia` · `reel` | |
| `titulo` | texto | Titular corto |
| `idioma` | código ISO | Idioma del texto (`es` por defecto) |
| `idiomas` | lista | Traducir además a estos idiomas |
| `multilingue` | `juntos` · `separadas` | `juntos` (por defecto): un solo texto con 🇪🇸 … 🇬🇧 … ; `separadas`: una publicación por idioma |
| `publicar_ya` | `true` | Publica en el momento en las redes conectadas |

Respuesta: `{ "publicaciones": [ { id, estado, cuando, redes, texto, medios, idioma, resultado, motivo } ], "avisos": [] }`.
Lo creado por la API aparece también en la agenda del servidor (`origen: "api"`) y **cuenta contra el
límite de publicaciones del plan** (`suscripciones.js`), igual que lo programado desde el panel.

Errores: JSON `{ "error": "…en español…" }` con 400 (datos), 401 (clave), 402/429 (plan o cupo de
IA), 404, 409 (ya publicada) y 501 (vídeo IA aún sin proveedor).

---

## 3 · Ejemplos con curl

```bash
CLAVE=chispa_XXXXXXXX   # la de Conexiones
B=https://chispa-api.solers.workers.dev

# ¿Quién soy y qué redes tengo?
curl -s $B/v1/yo -H "Authorization: Bearer $CLAVE"

# Programar con texto propio en Instagram y Facebook
curl -s -X POST $B/v1/programar -H "Authorization: Bearer $CLAVE" -H "Content-Type: application/json" -d '{
  "texto": "🔥 Este domingo, paella en la terraza. ¡Reserva tu mesa! #Palma",
  "redes": ["instagram", "facebook"],
  "cuando": "2026-10-12T11:30:00+02:00",
  "medios": ["https://ejemplo.com/paella.jpg"]
}'

# Que lo escriba la IA, con imagen IA, en español + inglés + alemán (un solo texto)
curl -s -X POST $B/v1/programar -H "Authorization: Bearer $CLAVE" -H "Content-Type: application/json" -d '{
  "idea": "paella del domingo en la terraza",
  "idioma": "es", "idiomas": ["en", "de"],
  "imagen_ia": true,
  "redes": ["instagram"], "cuando": "2026-10-12T11:30:00+02:00"
}'

# Listar lo programado y cancelar una
curl -s "$B/v1/publicaciones?estado=programada" -H "Authorization: Bearer $CLAVE"
curl -s -X DELETE $B/v1/publicaciones/api-xxxx -H "Authorization: Bearer $CLAVE"

# Reaprovechar un texto largo en piezas, en inglés
curl -s -X POST $B/v1/reaprovechar -H "Authorization: Bearer $CLAVE" -H "Content-Type: application/json" -d '{
  "texto": "…artículo o transcripción…", "idioma": "en", "piezas": ["posts", "hilo", "carrusel", "guion"]
}'
```

---

## 4 · n8n (nodo «HTTP Request»)

1. *Credentials → New → Header Auth*: **Name** `Authorization`, **Value** `Bearer chispa_XXXX…`.
2. Nodo **HTTP Request**:
   - **Method:** `POST` · **URL:** `https://chispa-api.solers.workers.dev/v1/programar`
   - **Authentication:** *Generic Credential Type → Header Auth* → la credencial del paso 1
   - **Send Body:** sí · **Body Content Type:** JSON · **Specify Body:** *Using JSON*:
     ```json
     {
       "texto": "{{ $json.texto }}",
       "redes": ["instagram", "facebook"],
       "cuando": "{{ $json.fecha }}",
       "idioma": "es",
       "idiomas": ["en"]
     }
     ```
3. Para saber cuándo salió: otro HTTP Request `GET …/v1/publicaciones/{{ $json.publicaciones[0].id }}`
   (p. ej. tras un nodo *Wait*).

Flujo de ejemplo para importar en n8n (*⋯ → Import from clipboard*; luego elegir la credencial):

```json
{
  "name": "Chispa · de Google Sheets a programado",
  "nodes": [
    { "parameters": {}, "name": "Manual", "type": "n8n-nodes-base.manualTrigger", "typeVersion": 1, "position": [0, 0] },
    { "parameters": { "method": "POST", "url": "https://chispa-api.solers.workers.dev/v1/programar",
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendBody": true, "specifyBody": "json",
        "jsonBody": "={ \"idea\": \"oferta de brunch del sábado\", \"idioma\": \"es\", \"imagen_ia\": true, \"redes\": [\"instagram\"], \"cuando\": \"{{ $now.plus(1, 'day').set({hour: 11, minute: 0}).toISO() }}\" }",
        "options": {} },
      "name": "Programar en Chispa", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": [260, 0] }
  ],
  "connections": { "Manual": { "main": [[{ "node": "Programar en Chispa", "type": "main", "index": 0 }]] } }
}
```

## 5 · Make (módulo «HTTP → Make a request»)

URL `https://chispa-api.solers.workers.dev/v1/programar` · Method `POST` · Headers:
`Authorization: Bearer chispa_…` · Body type *Raw* · Content type *JSON (application/json)* · el mismo
JSON de arriba. Respuesta: activar *Parse response*.

---

## 6 · Claude y otros agentes (MCP)

Endpoint MCP (HTTP «streamable», sin estado): **`https://chispa-api.solers.workers.dev/mcp`**.
Herramientas: `crear_publicacion`, `programar`, `listar_programadas`, `estado_publicacion`,
`cancelar_publicacion`, `crear_imagen`, `reaprovechar_texto`, `traducir`, `cuentas_conectadas`.

**Claude Code** (terminal):
```bash
claude mcp add --transport http chispa https://chispa-api.solers.workers.dev/mcp \
  --header "Authorization: Bearer chispa_XXXX…"
```
Luego: «Programa en Instagram para el viernes a las 20:00 una publicación sobre el concierto, en
español e inglés, con imagen IA».

**Claude Desktop** (`claude_desktop_config.json`), con el puente gratuito y de código abierto
`mcp-remote`:
```json
{ "mcpServers": { "chispa": { "command": "npx", "args": ["-y", "mcp-remote",
  "https://chispa-api.solers.workers.dev/mcp", "--header", "Authorization: Bearer chispa_XXXX…"] } } }
```

**Clientes que no dejan poner cabeceras:** se puede usar `…/mcp?clave=chispa_XXXX…`. Ojo: la clave
queda en la dirección (historial, registros); úsalo solo si no hay otra forma y revócala si se comparte.

---

## 7 · Idiomas: lo que hace de verdad cada cosa (medido el 07/10/2026)

| Qué | Modelo (Cloudflare Workers AI) | Idiomas |
|---|---|---|
| Textos, reaprovechar, traducir | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | **Garantizados por Meta:** español, inglés, alemán, francés, italiano, portugués, hindi y tailandés. Otros (catalán, neerlandés, chino, japonés, coreano, árabe…) **funcionan en la práctica pero sin garantía**: la respuesta trae un `aviso` para revisarlo antes de publicar |
| Traducción de reserva | `@cf/meta/m2m100-1.2b` | ~100 idiomas, **peor calidad** (en la prueba tradujo «domingo» por «Dienstag»/martes). Solo se usa si falla el anterior, y lo avisa |
| Voz | `@cf/myshell-ai/melotts` | **Solo** español, inglés, francés, chino, japonés y coreano (el modelo rechaza los demás). Otros idiomas: la página usa la voz del navegador para escuchar, pero no se puede grabar dentro del vídeo |
| Subtítulos (tiempos) | `@cf/openai/whisper-large-v3-turbo` | Los mismos de la voz (los tiempos salen del audio) |
| Imagen | `@cf/black-forest-labs/flux-1-schnell` | El prompt lo arma el servidor en inglés (es lo que mejor entiende FLUX); la imagen va **sin texto** y el titular lo pone Chispa encima |

---

## 8 · Cupo y coste

Todo va con el **plan gratuito de Workers AI: 10.000 «neuronas» al día por cuenta** (todas las IA
juntas). Pasado eso Cloudflare **no cobra**: da error hasta las 00:00 UTC. El servidor corta antes
(tope de 9.000) y por negocio:

| Uso | Neuronas (medidas) | Tope por negocio y día | Con 9.000 al día da para |
|---|---|---|---|
| Imagen 1024×1024 | ≈ 173 | 20 | ≈ 52 imágenes en toda la cuenta |
| Voz + subtítulos (20 s) | ≈ 20-25 | 40 | ≈ 400 |
| Texto / reaprovechar / traducir | ≈ 30-260 | 25 | ≈ 35-300 |

Con muchos clientes: plan Workers Paid (5 $/mes) y **0,011 $ por 1.000 neuronas** → una imagen
≈ **0,0019 $**, un reaprovechado ≈ 0,002 $.
Fuente: <https://developers.cloudflare.com/workers-ai/platform/pricing/>
