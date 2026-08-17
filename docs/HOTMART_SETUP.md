# Configuración de Hotmart en producción (pagos recurrentes)

Guía paso a paso para activar los cobros recurrentes (Premium IA) con Hotmart.
La app ya está preparada: webhooks firmados, checkout con `custom=userId`, planes
mensual/anual, renovaciones y estados (activo / cancelado / vencido / overdue).

Flujo en producción:
`/premium` (paywall) → `/api/subscription/checkout?plan=monthly|annual` → checkout
de Hotmart con `email` + `custom=<userId>` → Hotmart envía eventos a
`https://appingles-km24.onrender.com/webhooks/hotmart` → el backend activa/cancela
Premium y registra el cobro (MRR).

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

Crea **dos productos** de tipo **suscripción recurrente**:

| Producto | Precio | Precio anualizado | Nota |
|---|---|---|---|
| AppIngles Premium Mensual | US$ 15.00 | — | Plan `monthly` |
| AppIngles Premium Anual | US$ 99.00 | US$ 8.25/mes | Plan `annual` |

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
| `HOTMART_CHECKOUT_URL_MONTHLY` | `https://pay.hotmart.com/XXXX` (plan mensual) |
| `HOTMART_CHECKOUT_URL_ANNUAL` | `https://pay.hotmart.com/YYYY` (plan anual) |
| `HOTMART_PRODUCT_ANNUAL_ID` | product_id del anual (Paso 2, opcional) |
| `HOTMART_SUCCESS_URL` | `https://TU-DOMINIO.netlify.app/premium?status=success` |
| `HOTMART_CANCEL_URL` | `https://TU-DOMINIO.netlify.app/premium?status=canceled` |
| `PRICE_MONTHLY_USD` | `15` |
| `PRICE_ANNUAL_USD` | `99` |

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
- `mrr` calculado con el plan (anual → `99 / 12`).
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

# Simular un evento de Hotmart
curl -X POST http://localhost:3001/webhooks/hotmart \
  -H "Content-Type: application/json" \
  -d '{"event":"PURCHASE_APPROVED","devUserId":"u1","data":{"product":{"name":"AppIngles Premium Mensual"},"purchase":{"status":"approved","recurrency_number":1}}}'
```