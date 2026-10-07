# Vender Chispa · lista hasta el 100 %

> **Objetivo de Stalin:** que un negocio o un creador entre en la web, se dé de alta solo, pruebe,
> pague y empiece, sin errores.
> **Decisión de Stalin (07/10/2026):** la cuenta de Stripe y el CIF se dejan **para el final**.
> Primero, que funcione ya: alta sola, prueba gratis, modo cliente, límites por plan y legales con
> `[CIF]` / `[domicilio]` marcados. El pago está programado y probado, pero **apagado**.

Web: <https://solers-es.github.io/chispa-demo/> · Alta directa: <https://solers-es.github.io/chispa-demo/#alta>
Servidor: <https://chispa-api.solers.workers.dev> (Cloudflare Worker `chispa-api`, base D1 «chispa»)

---

## 1 · Lo que YA funciona (07/10/2026)

| | Qué | Dónde está | Comprobado |
|---|---|---|---|
| ✅ | **Una sola tabla de precios**: Básico 39 €, Pro 79 €, Agencia 149 € al mes + IVA, prueba 14 días. La portada, el chat, «Chispa habla», el alta, «Mi plan» y el servidor leen de ahí | `precios.js` | 35 + 16 pruebas |
| ✅ | **Alta sola** (`#alta` o cualquier botón «Probar 14 días gratis»): nombre, sector, idioma, correo, plan y aceptación obligatoria de términos, privacidad y encargo | `alta.js` + `POST /alta` | iPhone y ordenador |
| ✅ | **Anti-robots gratis**: límite por IP (3 altas/hora, 6/día), tope de 200 altas/día, reto firmado + prueba de trabajo en el navegador, campo trampa. Turnstile listo para encender | `conectores/suscripciones.js` | sí |
| ✅ | Al acabar el alta: **código de acceso** en pantalla (copiar / enviarse por correo) y **entra solo en modo cliente** con su sector e idioma; sus datos ya se guardan en el servidor | `alta.js` + `chispa-cuentas.js` | sí |
| ✅ | **Prueba 14 días**: aviso arriba con los días que quedan; al acabar no deja publicar (sus datos siguen) | servidor | sí |
| ✅ | **Límites por plan en el servidor**: publicaciones/mes, redes conectadas, imágenes IA/día y usuarios. El Paraíso (de Solers) sigue sin límites | `suscripciones.js` | sí |
| ✅ | **«💳 Mi plan»** en el panel del cliente: plan, días, uso con barras, elegir plan, baja y **borrar sus datos** (RGPD) | `alta.js` | sí |
| ✅ | **Modo Solers → Mis clientes → «☁️ Altas y pagos»**: todos los negocios del servidor con plan, prueba, estado de pago y uso; activar a mano (pago por transferencia), +14 días, cambiar plan, borrar | `alta.js` + `/admin/clientes` | sí |
| ✅ | **Pago con Stripe programado** (Checkout de suscripción, webhook firmado que activa/cancela/marca impago, portal de cliente, baja que cancela en Stripe). **Apagado**: el alta dice «modo prueba sin cobro» | `suscripciones.js` | simulador con firmas reales |
| ✅ | **Textos legales** en español e inglés, enlazados en el pie y en el alta: aviso legal (LSSI art. 10), privacidad (RGPD), términos con desistimiento y baja, cookies (no usa cookies de terceros), encargo del tratamiento (art. 28) | `legal/` | abren los 5 |
| ✅ | Servidor desplegado el 07/10/2026 con todo lo anterior (y la IA de G) | `chispa-api` | /salud + 1 alta real, borrada |

Pruebas (sin red ni cuenta):
```bash
export PATH="/Users/usuario/herramientas/node/bin:$PATH"
export NODE_PATH=/Users/usuario/Proyectos/chispa-f-pruebas/node_modules   # sql.js y playwright-core
node pruebas/suscripciones-api.cjs   # 35: alta, anti-robots, límites, Stripe simulado, baja
node pruebas/alta-navegador.cjs      # 16: el alta de verdad en iPhone y ordenador (capturas en capturas/alta/)
node pruebas/servidor-api.cjs        # 22 (F) · node pruebas/servidor-ia-api.cjs  # 34 (G)
```

---

## 2 · Lo que necesita a una PERSONA

| # | Qué | Quién | Bloquea | Tiempo |
|---|---|---|---|---|
| A | **Decidir el precio final** (hoy 39/79/149 + IVA) | **Stalin** | Nada (se cambia en `precios.js` y en la tabla de `legal/terminos.html`) | 5 min |
| B | **Revisión de los textos legales por un abogado** | Stalin + abogado | Vender con garantías | 1-2 h del abogado |
| C | **CIF, domicilio y datos registrales** de la sociedad nueva → rellenar `[CIF]`, `[domicilio]`, `[denominación social completa]`, `[Registro Mercantil…]`, `[teléfono]` en los 5 textos de `legal/` | Stalin (cuando esté inscrita) | Vender legalmente (LSSI art. 10) | 10 min |
| D | **Cuenta de Stripe de Solers** (necesita el CIF) y poner 2 secretos | Stalin en pantalla | Cobrar con tarjeta | 30 min + verificación de Stripe |
| E | **Facturas**: decidir si factura Stripe (Invoicing) o GestorOS. Ojo VeriFactu: en 2027 las facturas de una sociedad deben salir de un sistema que cumpla | Stalin / asesor | Cobrar en regla | — |
| F | **Permisos de Meta, TikTok, YouTube y Google** (revisión de app de cada red) para publicar en cuentas de clientes | Stalin en pantalla | Publicar de verdad en redes de clientes | Días/semanas (lo deciden ellas) |
| G | **Dominio propio**, p. ej. `chispa.solers.es` | Stalin | Imagen y confianza (no bloquea) | 20 min |
| H | **Correo saliente** (verificar el correo del alta, avisar del fin de la prueba, mandar el código) — p. ej. Cloudflare Email con el dominio de G | Stalin en pantalla | Avisos automáticos (hoy se avisa a mano desde «Altas y pagos») | 20 min |
| I | **Turnstile** (casilla «No soy un robot», gratis) | Stalin en pantalla | Nada: ya hay anti-robots | 5 min |

---

## 3 · Pasos exactos (con Stalin en pantalla)

Todo en este Mac. Antes de cada bloque:
```bash
export PATH="/Users/usuario/herramientas/node/bin:$PATH"
cd /Users/usuario/Proyectos/<tu clon de chispa-demo>/conectores
```

### D · El día de vender: encender el cobro (lista corta)
1. **Crear la cuenta**: <https://dashboard.stripe.com/register> con `admin@solers.es` → «Activar pagos»: CIF, domicilio, IBAN de la sociedad, DNI del administrador.
2. **Portal de cliente**: Stripe → *Configuración → Facturación → Portal de clientes* → activar «Cancelar suscripciones», «Cambiar de plan» y «Actualizar método de pago» → **Guardar** (sin esto el botón «Gestionar pago» da error).
3. **IVA**: Stripe → *Productos → Tipos impositivos* → crear «IVA 21 %», exclusivo, España → copiar su id `txr_…`. (O activar Stripe Tax y usar `STRIPE_IVA_AUTOMATICO = "1"`.)
4. **Webhook**: Stripe → *Desarrolladores → Webhooks → Añadir destino*: URL `https://chispa-api.solers.workers.dev/stripe/webhook`, eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` → copiar el **secreto de firma** `whsec_…`.
5. **Los 2 secretos** (se pegan cuando los pide; no quedan en ningún fichero):
   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY -c wrangler-api.toml      # sk_live_… (Desarrolladores → Claves de API)
   npx wrangler secret put STRIPE_WEBHOOK_SECRET -c wrangler-api.toml  # whsec_… del paso 4
   ```
6. **Encender**: en `conectores/wrangler-api.toml`, dentro de `[vars]`, añadir
   ```toml
   PAGO_ENCENDIDO = "1"
   STRIPE_TASA_IVA = "txr_…"   # el del paso 3
   ```
   y `npx wrangler deploy -c wrangler-api.toml`. (Sin `PAGO_ENCENDIDO = "1"` no se cobra aunque estén las claves: es un doble seguro.)
7. **Probar con 1 €**: antes del paso 5 en real, se puede repetir todo en *modo de prueba* de Stripe (`sk_test_…`, tarjeta `4242 4242 4242 4242`) y ver en «Altas y pagos» que el negocio pasa a «Activa».
8. **Rellenar `[CIF]` y `[domicilio]`** (punto C) y subir.

Los precios de Stripe se crean solos con los importes de `precios.js`. Si se prefiere tenerlos como productos en Stripe: crear «Chispa Básico/Pro/Agencia» con precio mensual y poner sus ids en `[vars]` como `STRIPE_PRECIO_BASICO`, `STRIPE_PRECIO_PRO`, `STRIPE_PRECIO_AGENCIA`.

### I · Turnstile (opcional, 5 min, gratis)
1. <https://dash.cloudflare.com> → *Turnstile → Añadir widget* → nombre «Chispa alta», dominio `solers-es.github.io` (y el propio si se pone), modo «Gestionado».
2. Copiar la **clave del sitio** (pública) y la **clave secreta**.
3. En `[vars]`: `TURNSTILE_SITIO = "0x…"`; y `npx wrangler secret put TURNSTILE_SECRETO -c wrangler-api.toml`; `npx wrangler deploy -c wrangler-api.toml`. El alta enseña la casilla sola.
   (La sesión de wrangler de este Mac no tiene permiso de Turnstile, por eso no se pudo crear desde aquí.)

### G · Dominio propio `chispa.solers.es`
1. En el proveedor DNS de `solers.es`: registro `CNAME chispa → solers-es.github.io`.
2. GitHub → repo `chispa-demo` → *Settings → Pages → Custom domain* `chispa.solers.es` → «Enforce HTTPS».
3. En `wrangler-api.toml`: `ORIGENES = "https://solers-es.github.io,https://chispa.solers.es"` y `PANEL_URL = "https://chispa.solers.es/"` → deploy. Reapuntar en Google/Meta/TikTok nada (la vuelta OAuth es del servidor, no cambia).

### H · Correo saliente
Necesita el dominio (G) en Cloudflare o un proveedor (Resend, Brevo…). Con él: correo de bienvenida con el código, verificación del correo del alta y aviso 3 días antes de que acabe la prueba. Mientras tanto, Solers ve en «Altas y pagos» quién está en prueba y cuántos días le quedan, con su correo, y avisa a mano.

### F · Permisos de las redes
Es lo que dice `docs/SERVIDOR-CHISPA.md`: cada red revisa la app (Meta *App Review* con vídeo de uso, TikTok *Content Posting API audit*, Google *Business Profile API* y verificación OAuth de YouTube). Sin eso, los clientes pueden usar todo menos publicar en sus propias cuentas.

---

## 4 · Límites conocidos (dicho claro)

- Las **diferencias entre planes que hace cumplir el servidor** son las cuatro cifras (publicaciones/mes, redes, imágenes IA/día, usuarios), que tras la prueba sin pagar no publica, y (desde el 07/10, `conectores/panel-real.js`) que **«Anuncios preparados»** y **«Respuestas a comentarios y reseñas»** (contestar desde Chispa y las reglas automáticas de respuesta) son solo de **Pro y Agencia**. «Soporte prioritario» es un compromiso de personas, no de código.
- La IA de imágenes tiene además el **cupo gratuito de la cuenta de Cloudflare** (lo lleva `conectores/ia.js` de G): con muchos clientes hay que pasar Workers AI a pago.
- El **correo no se verifica** todavía (punto H). Hay tope de 3 Chispas por correo.
- La entrada en modo cliente usa el enlace de cliente de `chispa-cuentas.js`. Si en ese navegador había otra cosa (p. ej. la demostración de El Paraíso), se guarda una copia y se recupera abriendo `…/index.html#recuperar`.
- **Sin probar con Stripe de verdad** (no hay cuenta): probado con un simulador que firma los webhooks igual que Stripe.
- El precio final lo decide **Stalin**; la revisión legal, **un abogado**.
