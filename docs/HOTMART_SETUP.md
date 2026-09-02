# Configuración de Hotmart en producción

Guía paso a paso para activar los cobros de Premium con Hotmart.
La app ya está preparada: webhooks firmados con idempotencia, y desde **V9**
Premium es un **producto único, vendido 100% fuera de la app** — igual que el
Reto de 21 Días. Ya no existe una vista `/premium` ni un botón "comprar"
dentro de AppIngles: el acceso (entrar a la app) y el nivel de funcionalidades
(IA completa) son el MISMO eje — cualquier compra aprobada da TODO. Los
planes mensual/anual (V4-V7) se conservan en el código solo para quien ya
tenía una suscripción recurrente activa antes de V8.

Flujo en producción (V9, pago único, 100% externo):
Landing externa (Hotmart o `ingresosdigitalesit.com`) → checkout de Hotmart →
Hotmart envía `PURCHASE_APPROVED` a
`https://appingles-km24.onrender.com/webhooks/hotmart` → el backend resuelve
al comprador por email (crea la cuenta en Firebase Auth si no existía, igual
que el Reto21 — ver más abajo "Compra externa") → activa
`plan: premium-lifetime, status: active` **de forma permanente** (ninguna
fecha lo expira; solo un reembolso/chargeback lo revoca) → envía el email de
activación con el enlace a `/appingles/activar` → el cliente entra directo
con acceso completo, sin ningún upsell interno que atravesar.

> Los endpoints `GET /api/subscription/checkout` y `GET /api/subscription/plans`
> siguen existiendo en el backend (por si se necesitan más adelante) pero
> **ningún flujo actual los llama** — la compra no depende de que el
> comprador tenga sesión iniciada en la app.

## Paso 0 — Crear el producto de pago único (Premium de por vida)

1. En Hotmart, crea un producto de tipo **pago único** (NO suscripción) llamado
   algo que incluya "de por vida" o "vitalicio" en el nombre (ej. "AppIngles
   Premium de por vida") — la app lo detecta automáticamente por ese texto en
   el nombre. Precio: **US$ 9.99**, debe coincidir con `PRICE_LIFETIME_USD`.
2. Guarda la URL de venta (`https://pay.hotmart.com/XXXXXXXX`) → variable
   `HOTMART_CHECKOUT_URL_LIFETIME` (Paso 4).
3. (Opcional, más robusto que detectar por nombre) copia el `product_id` de
   ese producto → variable `HOTMART_PRODUCT_LIFETIME_ID`.
4. Este producto no genera eventos de suscripción (`SUBSCRIPTION_*`) porque no
   es recurrente — solo `PURCHASE_APPROVED` (activa) y, si aplica,
   `PURCHASE_REFUNDED`/`PURCHASE_CHARGEBACK` (revoca el acceso). No hace falta
   configurar nada especial para esto: los mismos eventos del Paso 3 ya cubren
   este producto.

---

## (Legacy) Suscripciones recurrentes mensual/anual — solo para clientes previos a V8

Estos pasos ya NO aplican para vender Premium a compradores nuevos — se dejan
documentados porque el código todavía soporta y factura correctamente a quien
ya tenía una de estas suscripciones activa antes de la migración a pago único.

> **Importante (V9):** la página `/premium` (donde un suscriptor legacy podía
> ver su próximo cobro o cancelar) **ya no existe** — se eliminó junto con el
> paywall interno. Si necesitas cancelar manualmente una suscripción legacy
> por soporte, usa `POST /api/subscription/cancel` autenticado como ese
> usuario, o gestiona la cancelación directamente desde el panel de Hotmart
> (el webhook `SUBSCRIPTION_CANCELED` sincroniza el estado igual). Ten esto en
> cuenta si todavía tienes suscriptores mensuales/anuales activos en
> producción: perdieron la forma de auto-gestionar su suscripción in-app.

---

## Requisitos previos

- Cuenta Hotmart con el medio de pago configurado (afiliación activa).
- El backend desplegado en Render (`appingles-km24`, dominio
  `https://appingles-km24.onrender.com`).
- El frontend desplegado en Netlify (anota el dominio, ej.
  `https://tuapp.netlify.app`).
- Antes de empezar: `git push` a `main` para que el deploy incluya el código V7.

---

## Paso 1 — Crear los productos recurrentes en Hotmart

Crea **dos productos** de tipo **suscripción recurrente** con los precios del
modelo freemium vigente (deben coincidir EXACTAMENTE con `PRICE_MONTHLY_USD` /
`PRICE_ANNUAL_USD`, default 4.99/39.99):

| Producto | Precio | Equivalente | Nota |
|---|---|---|---|
| AppIngles Premium Mensual | US$ 4.99/mes | — | Plan `monthly` |
| AppIngles Premium Anual | US$ 39.99/año | US$ 3.33/mes (−33%) | Plan `annual` |

> Si los precios configurados en Hotmart no coinciden con los de la app,
> la implementación NO debe considerarse terminada: reportar la diferencia.

Al crearlos, Hotmart te da la URL de venta:
`https://pay.hotmart.com/XXXXXXXX`. Guarda los dos códigos (el número final).

Recomendado: activa **checkout transparente / boleto** según tu público (los
boletos reducen MRR; valora tarjeta + PIX por defecto).

---

## Paso 2 — Obtener el `product_id` del plan anual (opcional)

La app detecta el plan anual automáticamente por el **nombre** del producto
(contiene "anual"/"annual"), así que este paso es opcional.

Para ser 100% exacto, consigue el `product_id` del producto anual:
1. En el panel, ve a la URL de venta del anual → `https://pay.hotmart.com/<ID>`.
   Ese `<ID>` es el product id (en la mayoría de cuentas).
2. Déjalo en la variable `HOTMART_PRODUCT_ANNUAL_ID`.

> Si lo dejas vacío, el código usa la coincidencia por nombre:
> `if (/annual|anual/i.test(productName)) plan = 'premium-annual'`.

---

## Paso 3 — Crear el Webhook en Hotmart

1. En el panel de Hotmart, entra a **Developer Tools → Webhooks**
   (o **Automações / Integrações → Webhooks**, según el plan de tu cuenta).
2. Crea un webhook con los eventos de **compras y suscripciones**:
   - `PURCHASE_APPROVED`
   - `PURCHASE_CANCELED`
   - `PURCHASE_REFUNDED`
   - `PURCHASE_EXPIRED`
   - `SUBSCRIPTION_CANCELED`
   - `SUBSCRIPTION_STATUS_UPDATE` / `SUBSCRIPTION_SUSPENDED` (overdue)
   - `SUBSCRIPTION_DEBT_RECOVERY`
   - `SUBSCRIPTION_REACTIVATION`
3. URL del webhook:

   ```
   https://appingles-km24.onrender.com/webhooks/hotmart
   ```

4. Hotmart te entrega un **secreto/firma** y un **token** de notificación.
   Guárdalos para el Paso 4 (nunca los compartas).
5. En el panel del webhook usa el botón **"Enviar evento de prueba"** (sandbox)
   para verificar que el endpoint responde `200`. Nuestro backend responderá
   `{ ok: true, ignored: true }` si el evento no cambia la suscripción, o
   `{ ok: true }` si lo aplica.

---

## Paso 4 — Variables de entorno en Render

En Render: **tu servicio → Environment** y agrega (botón "Add Secret File"
o variables individuales):

| Variable | Valor |
|---|---|
| `HOTMART_WEBHOOK_SECRET` | Secreto/firma del webhook (Paso 3) |
| `HOTMART_WEBHOOK_TOKEN` | Token de notificación del webhook (Paso 3) |
| `HOTMART_CHECKOUT_URL_LIFETIME` | `https://pay.hotmart.com/ZZZZ` (pago único, Paso 0) |
| `HOTMART_PRODUCT_LIFETIME_ID` | product_id del pago único (Paso 0, opcional) |
| `HOTMART_CHECKOUT_URL_MONTHLY` | *(legacy)* `https://pay.hotmart.com/XXXX` (plan mensual) |
| `HOTMART_CHECKOUT_URL_ANNUAL` | *(legacy)* `https://pay.hotmart.com/YYYY` (plan anual) |
| `HOTMART_PRODUCT_ANNUAL_ID` | *(legacy)* product_id del anual (opcional) |
| `HOTMART_SUCCESS_URL` | `https://TU-DOMINIO.netlify.app/premium?status=success` |
| `HOTMART_CANCEL_URL` | `https://TU-DOMINIO.netlify.app/premium?status=canceled` |
| `PRICE_LIFETIME_USD` | `9.99` |
| `PRICE_MONTHLY_USD` | `4.99` *(legacy, solo referencia para suscriptores previos)* |
| `PRICE_ANNUAL_USD` | `39.99` *(legacy, solo referencia para suscriptores previos)* |

Revisa también que ya estén configuradas:
`NODE_ENV=production`, `AUTH_MODE=firebase`, `STORE_MODE=firestore` (o tu
proveedor de datos real), `GROQ_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`,
`CORS_ORIGIN=https://TU-DOMINIO.netlify.app`.

> `HOTMART_CHECKOUT_URL` (sin sufijo) funciona como plan por defecto si no
> defines las dos URLs por separado. Con las dos definidas, se usa la correcta.

Render redepliega solo al guardar. Verifica con:
`curl https://appingles-km24.onrender.com/api/health`

---

## Paso 5 — Cómo se conecta el pago con la cuenta del usuario

Cuando el usuario entra a `/premium` y elige un plan, el frontend llama a
`GET /api/subscription/checkout?plan=monthly|annual`. El backend construye la
URL de Hotmart agregando:

- `email=<email del usuario logueado>`
- `custom=<userId de Firebase>`  ← clave para reconocer al comprador
- `return_to=<HOTMART_SUCCESS_URL>`
- `cancel_url=<HOTMART_CANCEL_URL>`

Al llegar el evento al webhook, la app resuelve el usuario en este orden:
1. `custom` (userId directo) — el flujo normal.
2. Índice `userEmails` (email → userId, se llena cuando el usuario se loguea y
   `registerSession` guarda su email).
3. En dev (`AUTH_MODE=dev`) un `devUserId` manual para simular.

Si no puede resolver el usuario, responde `422 user_not_resolvable` y NO activa
nada. Para evitarlo: el comprador debe estar logueado en la app cuando compra.

---

## Paso 6 — Prueba de pago en sandbox

1. Abre `https://TU-DOMINIO.netlify.app/premium`, inicia sesión con un usuario
   de prueba y elige **Mensual** → te redirige al checkout de Hotmart.
2. Paga con la **tarjeta de prueba de Hotmart** (`4242 4242 4242 4242`,
   cualquier fecha futura, CVC cualquiera). Para recurrencia, usa el cartão de
   teste que Hotmart habilita para suscripciones.
3. Hotmart envía `PURCHASE_APPROVED` al webhook → la app activa el plan.
4. Vuelve a la app y verifica en
   `GET /api/subscription/status` (logueado) que el usuario tiene
   `status: "active"` y `entitlements.canScorePronunciation: true`,
   `canGenerateLessons: true`, `canUseVocabularyBank: true`.
5. Revisa en el panel de Hotmart que el webhook marcó el envío como `200 OK`.
6. (Opcional) En "Enviar evento de prueba" del webhook puedes disparar
   `SUBSCRIPTION_CANCELED` y confirmar que el usuario pasa a `canceled` y
   pierde los flags de IA.

---

## Paso 7 — Verificar MRR y eventos

Con una compra real en el store:

```
GET /api/admin/analytics   (requiere ADMIN_USER_ID)
```

Debe mostrar:
- `subscriptionCounts.active` ≥ 1, `paying` ≥ 1.
- `mrr` calculado solo con planes recurrentes legacy (anual → `39.99 / 12`); las
  compras `premium-lifetime` NO suman a MRR (no es ingreso recurrente) — se
  reportan aparte en `lifetimeRevenue` y `subscriptionCounts.lifetimeBuyers`.
- Eventos `subscription_started`, `subscription_renewed`,
  `subscription_canceled` registrados en la colección `analyticsEvents`.

Renovaciones: Hotmart reenvía `PURCHASE_APPROVED` con `recurrency_number > 1`
→ la app registra `subscription_renewed` y actualiza `nextBillingDate` desde
`purchase.next_cycle_date` (si Hotmart lo incluye).

---

## Solución de problemas

| Problema | Causa | Solución |
|---|---|---|
| El webhook responde `invalid_signature` | `HOTMART_WEBHOOK_SECRET` vacío o distinto al del panel | Copia exacto el secreto de Hotmart |
| `422 user_not_resolvable` | El comprador no estaba logueado o el email no está indexado | Pide login antes de comprar; revisa `userEmails` |
| El plan queda como mensual en anual | `HOTMART_PRODUCT_ANNUAL_ID` incorrecto o nombre sin "anual" | Corrige el id o el nombre del producto |
| No llega el webhook | URL mal escrita o eventos no seleccionados | Verifica `https://appingles-km24.onrender.com/webhooks/hotmart` |
| `dev` en checkout (`url: null, dev: true`) | Falta `HOTMART_CHECKOUT_URL_MONTHLY` | Configura las URLs de checkout en Render |

---

## Pruebas locales (opcional)

Sin credenciales, en `AUTH_MODE=dev`:

```bash
# Activar Premium de prueba (solo dev)
curl -X POST http://localhost:3001/api/subscription/activate \
  -H "X-Dev-User: u1" -H "Content-Type: application/json" \
  -d '{"plan":"premium","trialDays":7}'

# Simular una compra de Premium de por vida (pago único, V8)
curl -X POST http://localhost:3001/webhooks/hotmart \
  -H "Content-Type: application/json" \
  -d '{"event":"PURCHASE_APPROVED","devUserId":"u1","data":{"product":{"name":"AppIngles Premium de por vida"},"purchase":{"status":"approved","transaction":"TX-TEST-1"}}}'

# (legacy) Simular una suscripción mensual, para probar el código heredado
curl -X POST http://localhost:3001/webhooks/hotmart \
  -H "Content-Type: application/json" \
  -d '{"event":"PURCHASE_APPROVED","devUserId":"u1","data":{"product":{"name":"AppIngles Premium Mensual"},"purchase":{"status":"approved","recurrency_number":1}}}'
```

---

# Compra externa (Reto de Inglés en 21 Días) → activación de cuenta

Este flujo atiende al cliente que **compra en la landing sin tener cuenta previa**:
no hay registro antes de pagar, y la contraseña se crea después de la compra.
Funciona junto con el flujo recurrente de `/premium` (más arriba); ambos llegan
por el mismo webhook y se diferencian por el nombre/id del producto.

```
Landing (ingresosdigitalesit.com/reto21ingles)
  → checkout Hotmart (producto "Reto de Inglés en 21 Días")
  → PURCHASE_APPROVED → https://.../webhooks/hotmart
  → el backend crea el usuario en Firebase Auth (email del comprador)
  → envía email desde acceso@ingresosdigitalesit.com con enlace seguro
  → cliente crea su contraseña en NUESTRA página /appingles/activar
  → login automático → acceso al Reto (Día 1)
```

Puntos clave:

- **Sin contraseña en el backend**: el cliente NUNCA se registra antes de comprar
  y ninguna contraseña se guarda en Firestore ni en el backend. El backend crea
  una cuenta de Firebase Auth **sin contraseña** y genera un enlace oficial de
  restablecimiento (`admin.generatePasswordResetLink`), del que extrae el
  `oobCode` y arma un enlace propio que apunta **directamente a nuestra página**
  (no a la página alojada de Firebase). La contraseña la crea el usuario en
  `/appingles/activar` y vive solo en Firebase Auth.
- **Página de activación propia**: `/appingles/activar` valida el `oobCode` con
  `verifyPasswordResetCode`, muestra el email destino y recoge la contraseña con
  reglas de seguridad (≥ 8 caracteres, una mayúscula, una minúscula, un número y
  un carácter especial). Al crearla (`confirmPasswordReset`), hace
  **login automático** e ingresa de inmediato a la app.
- **El webhook es la única fuente de verdad del pago.** El enlace de activación
  se envía **solo** cuando el evento aplica y deja la suscripción `active`.
- **Idempotente**: reenvíos/duplicados de Hotmart no duplican usuario, acceso ni
  email (registro global `hotmartEvents` + `paymentEvents/{uid}.processedIds`).
- **Reembolso / chargeback** (`PURCHASE_REFUNDED`, `PURCHASE_CHARGEBACK`) pasan la
  suscripción a `expired` sin borrar la cuenta.
- **Plan**: el producto con nombre que coincida con `reto|21 días` se registra
  como plan `reto21` (compra única); los demás se tratan como premium
  mensual/anual (ver flujo recurrente).

## Eventos de webhook a habilitar (además de los del Paso 3)

Agrega al webhook de Hotmart:

- `PURCHASE_CHARGEBACK` (equivale a reembolso: deja la suscripción `expired`).

## Variables de entorno nuevas (Render)

| Variable | Valor |
|---|---|
| `ACTIVATION_URL` | `https://www.ingresosdigitalesit.com/appingles/activar` |
| `HOTMART_PRODUCT_IDS` | *(opcional)* lista separada por comas de ids de producto; si se define, solo se procesan esos ids |
| `MAIL_FROM` | `acceso@ingresosdigitalesit.com` |
| `MAIL_HOST` / `MAIL_PORT` | Host SMTP (p. ej. Hostinger: `smtp.hostinger.com`, `465`/`587`) |
| `MAIL_SECURE` | `true` (465) o `false` (587 con STARTTLS) |
| `MAIL_USER` / `MAIL_PASSWORD` | credenciales del **buzón principal** (los alias se envían "en nombre de" el principal, autenticando con él) |
| `SUPPORT_EMAIL` | `acceso@ingresosdigitalesit.com` |
| `APP_PUBLIC_URL` | `https://www.ingresosdigitalesit.com` |
| `RESEND_MAX_PER_HOUR` | `10` (límite de reenvíos por IP/hora en `/activar-acceso`) |

> **Modo dry-run**: si `MAIL_HOST`/`MAIL_USER`/`MAIL_PASSWORD` están vacíos, la
> API **no envía** correos; los registra en la colección `mailOutbox` (con el
> enlace) y en logs. Útil para probar el flujo antes de conectar el SMTP real.

## Firebase: dominios autorizados

Con la página de activación propia, extraemos el `oobCode` del enlace oficial y
armamos un enlace directo a `/appingles/activar`, por lo que **no es obligatorio**
autorizar el dominio. Aun así conviene añadirlo en **Firebase Console →
Authentication → Settings → Authorized domains**, como red de seguridad ante el
fallback al enlace alojado:

- `www.ingresosdigitalesit.com` (producción)
- `ingresosdigitalesit.com` (sin www, por si acaso)

(`localhost` está siempre autorizado, por eso el flujo E2E local funciona sin
configuración adicional.)

## Entregabilidad del correo (SPF / DKIM / DMARC)

El remitente `acceso@ingresosdigitalesit.com` (Hostinger) necesita estos
registros DNS para no caer en spam. En el panel DNS de Hostinger:

- **SPF** (registro TXT en la raíz `@`): si ya tienes el SPF de Hostinger,
  asegúrate de incluir `include:spf.hostinger.com` (o el que indique tu plan):
  ```
  v=spf1 include:spf.hostinger.com ~all
  ```
- **DKIM**: activa DKIM para el dominio en Hostinger (se generan un registro TXT
  `default._domainkey` con la clave pública). Copia el registro exacto que te
  muestre el panel.
- **DMARC** (registro TXT `_dmarc`):
  ```
  v=DMARC1; p=none; rua=mailto:acceso@ingresosdigitalesit.com; sp=none; adkim=r; aspf=r
  ```

Después de publicar los registros, verifica con
`https://www.mail-tester.com` enviando un correo de prueba; apunta a una
puntuación ≥ 8/10.

## Endpoints de acceso (frontend)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/access/status` | (auth) `{ hasAccess, plan, status }` para el gate de acceso |
| `POST` | `/api/access/activated` | (auth) marca la cuenta como activada + evento `account_activated` |
| `POST` | `/api/access/resend-activation` | (público, rate-limited) reenvía el enlace; respuesta siempre genérica |
| `POST` | `/api/access/dev-grant` | *(solo no-prod)* concede acceso de prueba (plan `reto21`) |
| `GET` | `/api/access/dev-outbox?email=` | *(solo no-prod)* lee el buzón dry-run (`mailOutbox`) |

## Pruebas locales del flujo de compra externa (E2E)

```bash
# 1. API con .env local (ACTIVATION_URL=http://localhost:5173/activar)
# 2. Compra simulada firmada (lee HOTMART_WEBHOOK_SECRET de api/.env)
# 3. Lee el enlace del buzón dry-run:
curl "http://localhost:3001/api/access/dev-outbox?email=COMPRADOR@example.com"
# 4. Abre el enlace → crea la contraseña → login (cubierto por e2e/tests/hotmart-flow.spec.ts)
```