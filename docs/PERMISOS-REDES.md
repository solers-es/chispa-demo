# Permisos de las redes · lista de pasos para hacerlos con Stalin en pantalla

> Chispa ya **publica por las APIs oficiales** desde su servidor (`chispa-api.solers.workers.dev`),
> pero cada red exige que su app pase **revisión**. Eso solo lo puede hacer una persona: hay que
> entrar con las cuentas, verificar la empresa y grabar vídeos de demostración. Todo **a nombre de
> Solers** (cuenta `admin@solers.es`).
>
> **Dirección de vuelta para todas (OAuth):** `https://chispa-api.solers.workers.dev/oauth/vuelta`

## 0 · Antes de nada (lo piden las tres)

| Qué | Dónde | Estado |
|---|---|---|
| **Política de privacidad** (RGPD) | `https://solers-es.github.io/chispa-demo/legal/privacidad.html` | ⚠️ Escrita (trabajador H, `legal/`), falta rellenar **[CIF]** y **[domicilio]** |
| **Condiciones del servicio** | `…/legal/terminos.html` | ⚠️ Igual: falta CIF y domicilio |
| **Instrucciones para borrar los datos** (Meta lo exige: URL o *callback*) | apartado de derechos de `…/legal/privacidad.html` (o una página aparte) | ⚠️ Comprobar que explica cómo pedir el borrado |
| Icono 1024×1024 de Chispa | `icono-512.png` ampliado | ⚠️ Hay de 512 |
| Correo de contacto | `admin@solers.es` | ✓ |
| Datos de la empresa (razón social, CIF, dirección) para verificar el negocio | — | La **sociedad nueva** de Solers (ver memoria «Chispa: titular y cuentas») |

Sin las páginas legales completas (con CIF y domicilio) no se puede enviar ninguna revisión.
Conviene que las revise un abogado/gestoría.

---

## 1 · Meta (Instagram + Facebook) · ⏱ 2-4 semanas

1. **Meta Business Suite** (`business.facebook.com`) con `admin@solers.es` → crear el **portfolio
   empresarial «Solers»** → *Configuración → Centro de seguridad → **Verificación de la empresa***:
   subir documento con razón social y CIF, y verificar por correo o teléfono del dominio.
2. **developers.facebook.com** → *Mis apps → Crear app* → tipo **Empresa** → vincularla al portfolio
   «Solers». Nombre: «Chispa».
3. *Configuración → Básica*: URL de **privacidad**, **condiciones**, **borrado de datos**, icono,
   categoría «Empresa y páginas», dominio `solers-es.github.io`.
4. Añadir productos: **Inicio de sesión con Facebook para empresas** e **Instagram (API con inicio de
   sesión de Facebook)**. En el inicio de sesión: *URI de redireccionamiento OAuth válidos* →
   `https://chispa-api.solers.workers.dev/oauth/vuelta`.
5. Copiar **Identificador de la app** y **Clave secreta** y ponerlos en el servidor (Claude lo hace,
   sin escribirlos en ningún fichero):
   `npx wrangler secret put META_APP_ID` · `npx wrangler secret put META_APP_SECRET` (`-c conectores/wrangler-api.toml`).
6. Probar con Stalin (rol de administrador de la app = funciona sin revisión): Chispa → Conexiones →
   **Conectar Instagram y Facebook** → elegir la página de El Paraíso → publicar una prueba.
7. **Revisión de la app** (*Revisión de la app → Permisos y funciones*), pedir **acceso avanzado** a:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`,
   `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`,
   `instagram_manage_insights`, `business_management`.
   Para cada uno: explicar el uso en una frase y **un vídeo de pantalla** (Chispa → Conectar →
   permiso → crear publicación → aparece en Instagram/Facebook). Lo grabamos con Stalin.
8. Pasar la app a **modo «Activo»** (Live).

## 2 · TikTok · ⏱ 1-3 semanas

1. `developers.tiktok.com` → entrar con la cuenta de TikTok de Solers (crearla con `admin@solers.es`
   si no existe) → *Manage apps → Connect an app* → organización «Solers».
2. Datos de la app: nombre «Chispa», icono, categoría, descripción, **URL de privacidad y de
   condiciones**, y **verificar el dominio** donde están (TikTok da un fichero o registro para subir).
3. Añadir productos **Login Kit** y **Content Posting API** (activar *Direct Post*).
   *Redirect URI*: `https://chispa-api.solers.workers.dev/oauth/vuelta`.
4. Ámbitos: `user.info.basic`, `video.publish`, `video.upload`.
5. Copiar **Client key** y **Client secret** → `wrangler secret put TIKTOK_CLIENT_KEY` y `TIKTOK_CLIENT_SECRET`.
6. **Submit for review** con vídeo de demostración. Mientras no se apruebe, la app es *sandbox*:
   solo cuentas de prueba añadidas y los vídeos salen **solo para mí** (por eso el servidor tiene
   `TIKTOK_PRIVACIDAD = "SELF_ONLY"`).
7. Tras aprobar: pedir la **auditoría de Content Posting** para publicar en público y cambiar
   `TIKTOK_PRIVACIDAD` a `PUBLIC_TO_EVERYONE` en `conectores/wrangler-api.toml` (+ `wrangler deploy`).

## 3 · YouTube · ⏱ 1-6 semanas

Proyecto de Google Cloud ya creado: **«Chispa El Paraiso»** (nº 518008968805, cuenta
`elparaisobarrestaurante1968@gmail.com`). Recomendable añadir `admin@solers.es` como **Propietario**
del proyecto (*IAM → Conceder acceso*) para que quede a nombre de Solers.

1. *APIs y servicios → Biblioteca*: activar **YouTube Data API v3** y **YouTube Analytics API**.
2. *Credenciales → el ID de cliente OAuth*: en *URI de redirección autorizados* añadir
   `https://chispa-api.solers.workers.dev/oauth/vuelta` (si no está).
3. *Pantalla de consentimiento (Google Auth Platform)*: nombre «Chispa», correo `admin@solers.es`,
   logotipo, **página principal, privacidad y condiciones**, dominio autorizado `solers-es.github.io`
   (verificarlo en Search Console).
4. **Verificación de la app** (los permisos `youtube.upload` y `youtube.force-ssl` son «sensibles»):
   *Publicar la app → Preparar para la verificación* → explicar el uso de cada permiso + **vídeo en
   YouTube (oculto)** enseñando el flujo de OAuth y la subida. Hasta verificar: máximo 100 usuarios
   de prueba y pantalla de «app no verificada».
5. **Auditoría de la API de YouTube** (formulario *YouTube API Services – Audit and Quota Extension*):
   **sin ella, todo vídeo subido por la API queda en PRIVADO** (norma para proyectos creados después
   del 28/07/2020 — <https://developers.google.com/youtube/v3/docs/videos/insert>). También sube la
   cuota (por defecto 10.000 unidades/día, y cada subida de vídeo gasta muchas: mirar el coste actual en la documentación de cuotas).

## 4 · Google (ficha de empresa)

Ya pedido: acceso a la **API de Business Profile**, caso **5-5969000041337** (7-10 días hábiles).
Cuando Google lo apruebe la ficha funciona sola (el servidor vuelve a mirar en cada uso). Si lo
rechazan: responder al correo con la web de Solers, el uso (publicar novedades y contestar reseñas
de los negocios clientes) y que la cuenta gestiona la ficha de El Paraíso desde hace tiempo.

---

## Orden recomendado para la sesión con Stalin (≈ 2 h)

1. Páginas legales de `legal/` con CIF y domicilio rellenados (Stalin los da y las aprueba).
2. Meta: verificación de empresa (lo que más tarda: empezar por aquí) → app → secretos → prueba con
   la página de El Paraíso → grabar vídeo → enviar revisión.
3. TikTok: app → dominio → secretos → prueba en sandbox → vídeo → enviar.
4. YouTube: activar APIs → pantalla de consentimiento → enviar verificación → formulario de auditoría.
5. Apuntar en `docs/SERVIDOR-CHISPA.md` qué quedó enviado y con qué número de caso.
