# Port plan: CNG transaction sync + checkout hardening

This is how Calabash Studio actually implemented Cash N’ Go / PayLanes history sync and the later settlement hardening. Copy this into the other portal and implement in the numbered order. Do not invent a second design.

**Source repo:** `salutethegenius/calabash-studio`  
**Shipped on** `main`**:** PR #7 (sync), PR #8 (query-param auth), PR #9 (hardening)  
**Reference commit:** `98bd569`

The other portal is the same shape: Next.js App Router, Supabase service-role server access, payment links, checkout sessions, signed CNG webhook, browser redirect to PayLanes. If a table or route name differs, keep the **behavior** below and only rename identifiers.

---



## 0. What problem this solves

Webhooks alone are not enough.


| Failure                          | What the customer sees                 | What this stack does                                                               |
| -------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| Webhook never arrives            | Pay page still says unpaid             | Sync finds the CNG row by `webOrderNumber` and settles the matching session + link |
| Webhook arrives without fees     | Transaction exists, net/fee blank      | Webhook calls `transaction-info`; later sync overwrites fees/net                   |
| Two people click Pay Now         | Two CNG checkouts for one invoice      | One `pending` session per link, reused for 60 minutes                              |
| Forged / wrong webhook amount    | Link marked paid for the wrong dollars | Webhook rejects unless parsed cents === `expected_amount_cents`                    |
| Abandoned Pay Now + unique index | Invoice locked forever                 | Pending older than 60 minutes is expired, then a new session is inserted           |


Settlement (mark session completed + mark link paid) is **not** owned by the webhook route. It lives in one function used by **both** webhook and sync: `settlePaidCheckout`.

```
Pay Now
  → POST /api/cng-url          insert or reuse checkout_sessions
  → GET  /api/cng/redirect/:id 302 to PayLanes (API_KEY in the URL — required)
  → customer pays on PayLanes
       ├─ POST /api/webhooks/cng   signed; amount-checked; settle + upsert
       └─ POST /api/cng/sync       admin; list API; settle + upsert
          GET  /api/cron/cng-sync  same sync, last 7 days, CRON_SECRET
```

Browser return pages (`/cng/return/success|cancel|error`) are **display only**. They never mark a link paid.

---



## 1. Do this in this order

Do not start with UI. The other portal will look “done” and still be wrong if auth or upsert identity is wrong.

1. Schema columns + unique indexes
2. Amount helpers (`parseDollarsToCents`)
3. PayLanes HTTP client (`AUTH_ID` + `API_KEY` as **query params**)
4. Field map + upsert
5. `settlePaidCheckout`
6. Wire webhook to settle + enrich
7. `syncCngTransactions` + admin route + dashboard button
8. Cron (optional if the Vercel plan has cron)
9. One-pending-checkout + unique partial index
10. Promo in settings (only if the other portal has a promo)
11. Business timezone for “today”
12. Tests from the source files, then a live sync against QA

---



## 2. Schema (copy exactly, then rename tables if needed)



### 2.1 Base tables Calabash already had

```sql
payment_links (
  id uuid pk,
  label text,
  amount_cents integer,          -- invoice / list price
  status text default 'pending', -- pending | paid
  link_token text unique,        -- public /pay/{token}
  created_at timestamptz,
  paid_at timestamptz
)

checkout_sessions (
  id uuid pk,
  link_id uuid not null references payment_links(id) on delete cascade,
  order_number text not null unique,   -- sent to PayLanes as ORDER_NUMBER
  expected_amount_cents integer not null, -- amount we told PayLanes (promo applied)
  status text default 'pending',       -- pending | completed | expired
  created_at timestamptz,
  completed_at timestamptz
)

transactions (
  id uuid pk,
  link_id uuid null references payment_links(id) on delete set null,
  customer_ref text,
  amount_cents integer not null,       -- GROSS (customer paid)
  status text not null,                -- successful | pending | failed
  created_at timestamptz,
  raw_payload jsonb
)

settings (key text unique, value text)
```

`link_id` on transactions is **nullable**. CNG history includes payments that never went through this portal. Those rows stay with `link_id` null and the UI labels them “External / pre-Calabash”.

### 2.2 Sync columns — Calabash migration `20260817184600_cng_transaction_fields.sql`

Apply this first on the other portal if the columns are missing:

```sql
alter table transactions
  add column if not exists cng_payment_id text,      -- CNG specialId
  add column if not exists order_number text,        -- CNG webOrderNumber
  add column if not exists fee_cents integer,        -- CNG fee
  add column if not exists net_cents integer,        -- CNG total (merchant net)
  add column if not exists payer_email text,
  add column if not exists payer_phone text,
  add column if not exists payment_method text,
  add column if not exists card_type text,
  add column if not exists processed boolean,
  add column if not exists cng_created_at timestamptz,
  add column if not exists synced_at timestamptz;

create unique index if not exists idx_transactions_cng_payment_id
  on transactions (cng_payment_id)
  where cng_payment_id is not null;

create unique index if not exists idx_transactions_order_number
  on transactions (order_number)
  where order_number is not null;

create index if not exists idx_transactions_cng_created_at
  on transactions (cng_created_at desc);
```

Those unique indexes are the dedup contract. Webhook and sync must upsert through the same identity or you will double-insert.

### 2.3 One pending checkout — Calabash migration `20260829162000_one_pending_checkout_and_promo.sql`

**Before creating the unique index**, expire extras. Live Calabash had 18 pending sessions on one link; the index will fail without this cleanup.

```sql
update checkout_sessions cs
set status = 'expired'
where status = 'pending'
  and exists (
    select 1
    from checkout_sessions newer
    where newer.link_id = cs.link_id
      and newer.status = 'pending'
      and (
        newer.created_at > cs.created_at
        or (newer.created_at = cs.created_at and newer.id > cs.id)
      )
  );

create unique index if not exists idx_checkout_sessions_one_pending
  on checkout_sessions (link_id)
  where status = 'pending';
```

Keep `scripts/migration.sql` (or the other portal’s bootstrap SQL) in sync with the incremental migration. Fresh installs must get the same index.

### 2.4 Settings keys used by this work


| key                     | purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `cng_merchant_id`       | PayLanes `AUTH_ID`                                          |
| `cng_api_key`           | PayLanes `API_KEY` (encrypted at rest)                      |
| `cng_webhook_secret`    | HMAC for `/api/webhooks/cng` (encrypted)                    |
| `cng_environment`       | `qa` | `prod`                                               |
| `cng_endpoint_override` | optional HTTPS auth URL                                     |
| `cng_last_sync_at`      | ISO timestamp, written only when a sync has zero row errors |
| `promo_code`            | empty = promo off                                           |
| `promo_percent`         | `1`–`99`; empty / 0 = promo off                             |


Calabash seeded `SAP0726` / `10` with `on conflict do nothing` so live links kept working. The other portal should seed **its** current live promo, or seed empty if it has none.

---



## 3. Money: never use `Number("45.00") * 100` for webhook amounts

CNG webhook `AMOUNT` is a string like `"45.00"`. `Number` + float multiply can be off by a cent.

Calabash helpers in `lib/utils.ts`:

```ts
// dollars number from the list API → cents (OK for 1.5, 0.04)
dollarsToCents(dollars: number): number
  return Math.round(dollars * 100)

// webhook / string dollars → cents or null (no float)
parseDollarsToCents(value: string): number | null
  // /^\d+(?:\.\d{1,2})?$/
  // "45" → 4500, "45.0" → 4500, "45.00" → 4500
  // "$45.00" → null  (reject; do not strip currency)

toDollarsString(cents: number): string
  // (cents / 100).toFixed(2)  → PayLanes AMOUNT query param
```

`toCents` in `lib/cashango/map.ts`:

- `typeof number` → `dollarsToCents`
- `typeof string` → `parseDollarsToCents`
- else → `null`

Webhook settlement **must** use `parseDollarsToCents`. Sync mapping uses `toCents` because the list API often sends numbers.

---



## 4. PayLanes HTTP client (the part that failed first)



### 4.1 Endpoints — `lib/cashango/endpoints.ts`

```
QA auth:   https://paylanes-qa.sprocket.solutions/merchant/web-payment/auth
Prod auth: https://paylanes.sprocket.solutions/merchant/web-payment/auth

API paths (same host, strip /merchant/web-payment/auth):
  GET /merchant/web-payment/transaction-info
  GET /merchant/web-payment/transactions
```

`resolveCngBaseUrl(authEndpoint)`:

1. Parse the stored auth URL
2. Strip a trailing `/merchant/web-payment/auth`
3. Drop search/hash
4. Return `origin + remaining path`

So an override of `https://paylanes.sprocket.solutions/merchant/web-payment/auth` becomes `https://paylanes.sprocket.solutions`.

### 4.2 Auth — this is not optional

PayLanes **rejects** list/detail calls if `API_KEY` is only an HTTP header. The error we hit in production was:

```
Missing required query parameters
```

`buildCngApiUrl` in `lib/cashango/api.ts` **always** sets query params last so callers cannot overwrite them:

```
AUTH_ID = merchantId
API_KEY = apiKey
```

Also send header `API_KEY` and `Accept: application/json`. Cache: `no-store`.

Tests that must exist (copy `lib/cashango/api.test.ts`):

- Query always contains `AUTH_ID` and `API_KEY`
- Extra params named `AUTH_ID` / `API_KEY` do not win



### 4.3 List call

```
GET {base}/merchant/web-payment/transactions
  ?PAGE=1
  &LIMIT=50          // clamp 1..50
  &FROM_DATE=YYYY-MM-DD
  &TO_DATE=YYYY-MM-DD
  &SORT_DIR=desc
  &AUTH_ID=...
  &API_KEY=...
```

Response shape we coded against:

```ts
{
  success?: boolean
  data?: CngTransaction[]
  pagination?: {
    page, limit, totalCount, totalPages,
    hasNextPage, hasPrevPage
  }
  message?: string
}
```

If HTTP not OK, or `success === false`, throw `CngApiError` with `body.message` when present.

### 4.4 Detail call (webhook enrichment)

```
GET {base}/merchant/web-payment/transaction-info
  ?ORDER_NUMBER=...   // or PAYMENT_ID or PASSPHRASE
  &AUTH_ID=...
  &API_KEY=...
```

Response: `{ success, transaction }`. Return `transaction ?? null`.

### 4.5 CNG transaction fields we actually use


| CNG field                            | Our column             | Notes                                               |
| ------------------------------------ | ---------------------- | --------------------------------------------------- |
| `specialId`                          | `cng_payment_id`       | Primary upsert key                                  |
| `webOrderNumber`                     | `order_number`         | Joins to `checkout_sessions.order_number`           |
| `amount`                             | `amount_cents`         | Gross                                               |
| `fee`                                | `fee_cents`            | PayLanes fee                                        |
| `total`                              | `net_cents`            | Merchant net after fees                             |
| `processed`                          | `processed` + `status` | `1` / `true` / `"1"` → `successful`; else `pending` |
| `ownerEmail`                         | `payer_email`          |                                                     |
| `owner`                              | `payer_phone`          | Often a phone number                                |
| `transactionType`                    | `payment_method`       | e.g. `Web Payment`                                  |
| `cardType`                           | `card_type`            |                                                     |
| `datetimestamp` then `dateProcessed` | `cng_created_at`       | **Unix seconds**, not ms                            |
| whole object                         | `raw_payload`          |                                                     |


Skip a list row if **both** `specialId` and `webOrderNumber` are missing. That is a `skipped` count, not an error. Live Calabash skipped 1 row like this on the first successful sync.

Unix helper: `n > 0` finite → `new Date(n * 1000).toISOString()`. `0` is null.

`customer_ref` = email || phone || order number.

---



## 5. Upsert identity — `lib/cashango/upsert.ts`

Do **not** use a blind Postgres `INSERT ... ON CONFLICT` unless both unique indexes are guaranteed and you have a single conflict target. Calabash does an application-level find-then-write:

1. If `cng_payment_id` is set, `select` by that column (`maybeSingle`)
2. Else if `order_number` is set, `select` by that column
3. If found: `update` that id
  - Keep existing `customer_ref` if the new one is empty-ish (Calabash keeps the old `customer_ref` whenever the existing row already has one)  
  - Keep existing `link_id` if the incoming row has `link_id` null (sync of an external-looking row must not wipe a webhook’s link)
4. If not found: `insert`
  - If `cng_created_at` is set, also set `created_at = cng_created_at` so “today” and sort match CNG time, not insert time
5. If incoming `synced_at` is missing, delete that key from the payload so a webhook update does not null out a previous sync stamp

Return `"inserted"` | `"updated"` for the dashboard summary.

Webhook path: first map a minimal row from the webhook body (`ORDER_NUMBER`, `AMOUNT`, `STATUS`, `EMAIL`, `PHONE`, `PAYMENT_ID`, `TIMESTAMP`, `PAYMENT_PLATFORM`). Then try `transaction-info`. If that throws, keep the minimal row. Sync later fills fees.

---



## 6. Shared settlement — `lib/cashango/settle.ts`

This is the hardening core. Both webhook and sync call it.

```ts
settlePaidCheckout(supabase, { id, link_id, status })
```

Exact behavior:

1. If `status !== "completed"`, update that session to `completed` + `completed_at = now`
2. Update `payment_links` to `paid` + `paid_at = now` **only if** `status <> 'paid'` (do not rewrite `paid_at` on a replay)
3. Expire **other** pending sessions on the same `link_id` (`status = pending` and `id <> session.id`)

Why step 3 exists: the 60-minute TTL can expire session A and insert session B. If the customer still pays A on an old PayLanes tab, A is the one that settled. B must not stay pending or a second customer can pay it.

Idempotent: calling again on an already-completed session still runs steps 2–3.

**Webhook** also requires amount match **before** calling this.  
**Sync** does **not** re-check amount. A successful CNG row (`processed`) for a known `order_number` is treated as paid. That is how a missed webhook still closes the invoice.

After a successful settle in the sync loop, set `session.status = "completed"` in the in-memory map so the same page does not settle twice.

---



## 7. Webhook — `POST /api/webhooks/cng`

Copy this sequence. Do not mark the link paid before the amount check.

1. Read **raw body text** first (HMAC is over the raw bytes)
2. Load webhook secret from settings, fallback `CASHANGO_WEBHOOK_SECRET`
3. HMAC-SHA256 hex, timing-safe compare
  Headers: `x-calabash-signature` or `x-webhook-signature`  
   Implementation: `lib/cashango/webhook.ts`
4. JSON parse; require `ORDER_NUMBER`, `AMOUNT`, `STATUS === "PAID"`
5. `paidCents = parseDollarsToCents(AMOUNT)`; 400 if null
6. Load session by `order_number` (id, link_id, status, expected_amount_cents)
  - lookup error → generic 500, **never** PostgREST `error.message`  
  - missing → 404 `Unknown order`
7. If `paidCents !== expected_amount_cents` → 400 `Amount does not match checkout`
  **Do not settle**
8. `settlePaidCheckout`
9. Map webhook row; try `transaction-info`; upsert
10. Return `{ ok: true, alreadySettled }`
  (`alreadySettled` uses the **pre-settle** session status — cosmetic)

Never return raw database errors to the client. Same rule on payment-link create/list/delete.

---



## 8. One checkout per unpaid link — `POST /api/cng-url`

Constants: `PENDING_TTL_MS = 60 * 60 * 1000`.

### 8.1 Lookup the link

Public pay URLs use `link_token`, not UUID. PostgREST 22P02 if you put a nanoid into `id.eq`.

```ts
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(linkId)
.eq(isUuid ? "id" : "link_token", linkId)
```

Refuse `link.status === "paid"` with 400.

### 8.2 Promo (server-authoritative)

```ts
applyPromo(link.amount_cents, enteredCode, { code: settings.promoCode, percent: settings.promoPercent })
```

Rules in `lib/promo.ts`:

- Empty entered code → full price, `applied: false`
- Configured code empty or percent ≤ 0 → any entered code is invalid
- Case-insensitive match → `Math.round(amount * (100 - percent) / 100)`
- Anything else → `Invalid promo code`

Do **not** keep a hardcoded `PROMO_CODE` fallback in the bundle after settings are seeded.

### 8.3 Reuse / expire / insert

1. Load newest `pending` session for `link.id`
2. If age `< 60m`:
  - If `expected_amount_cents !== promo.amountCents`, **update that row** (do not insert a second pending — unique index forbids it)
  - Return the **same** `order_number` and redirect path
3. If age `≥ 60m`: set that row `expired` (only if still `pending`), then insert a new session
4. Insert: `order_number = {linkToken}__{Date.now()}__{nanoid(6)}`, `expected_amount_cents = promo.amountCents`, `status = pending`
5. Unique violation `23505`:
  - Re-fetch the current pending row and reuse it (double-click / race)
  - If none, 409 `Checkout already in progress`

Return JSON:

```ts
{
  redirectPath: `/api/cng/redirect/${encodeURIComponent(orderNumber)}`,
  orderNumber,
  amountCents,
  promoApplied
}
```

The browser then `window.location.href = redirectPath`. The redirect route builds the PayLanes URL from the **current** `expected_amount_cents` on that session.

### 8.4 Known leftover (do not “fix” unless the other portal needs it)

If customer A is already on PayLanes at full price and customer B applies promo, we update `expected_amount_cents` on the **same** order. A later webhook for the original amount can 400 until sync settles it. That is the tradeoff of “one pending session, update amount in place.”

### 8.5 Redirect route — `GET /api/cng/redirect/[orderNumber]`

- Unknown session → `/cng/return/error?reason=unknown_order`
- `status === completed` → success page (do not send them to PayLanes again)
- Else 302 to PayLanes with `API_KEY`, `AUTH_ID`, `AMOUNT`, `ORDER_NUMBER`, `URL_SUCCESS`, `URL_CANCEL`, `PAYMENT_OPTIONS`

PayLanes **requires** `API_KEY` on this browser URL. Do not remove it. Rotate the key; treat it as customer-visible.

Success/cancel pages do not settle.

---



## 9. Sync loop — `lib/cashango/sync.ts`

One function, two callers.


| Caller                   | Auth                                   | Default range                                                       |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------- |
| `POST /api/cng/sync`     | Better Auth admin session              | last **30** days, body `{ fromDate, toDate }` optional `YYYY-MM-DD` |
| `GET /api/cron/cng-sync` | `Authorization: Bearer ${CRON_SECRET}` | last **7** days                                                     |


`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/cng-sync", "schedule": "0 6 * * *" }] }
```

Vercel cron is 06:00 **UTC**. Hobby plans may not run cron; the dashboard button is the fallback. Set `CRON_SECRET` on Preview + Production.

### 9.1 Date parsing

```ts
isoDate(date) = date.toISOString().slice(0, 10)   // UTC calendar date
defaultDateRange(days) = [todayUTC - days, todayUTC]
parseSyncDates(from, to, fallbackDays)
  // missing → fallback
  // must match /^\d{4}-\d{2}-\d{2}$/
  // from <= to
```

The dashboard date inputs use the **browser** local calendar. That is fine. Cron uses UTC dates. Do not mix “today revenue” (Nassau) into the CNG `FROM_DATE` filter unless you deliberately want that.

### 9.2 Loop

```
page = 1
while hasNextPage:
  fetchCngTransactions({ page, limit: 50, fromDate, toDate, sortDir: "desc" })
  batch-load checkout_sessions where order_number in this page's webOrderNumbers
  for each tx:
    skip if !specialId && !webOrderNumber
    map row (linkId from session match, else null)
    upsert
    if session && row.status === "successful":
      settlePaidCheckout
  page++
  stop at 200 pages (guard)
if errors.length === 0:
  write settings cng_last_sync_at
return { synced, inserted, updated, skipped, errors, fromDate, toDate }
```

Per-row try/catch: one bad upsert does not abort the page. Push `"{specialId|orderNumber}: message"` into `errors`.

`synced` = number of CNG rows seen (not inserts).

### 9.3 Dashboard button — `components/dashboard/sync-transactions-button.tsx`

- Default from/to = local today minus 30 days
- POST `/api/cng/sync`
- Show `inserted / updated / skipped / errors`
- `router.refresh()` so the table reloads
- “Last synced” from `settings.cng_last_sync_at`, formatted in the business timezone

Transactions table sort key: `cng_created_at || created_at`, newest first.

---



## 10. Promo in Settings (Calabash-specific; copy if the other portal has a promo)

Hardcoded `SAP0726` / 10% was removed from `lib/promo.ts`.

1. Settings form fields: `promoCode`, `promoPercent` (1–99)
2. `POST /api/settings` stores uppercase code; empty percent stores `""`
3. `getAppSettings()` reads them; empty code or percent 0 → promo off
4. Pay page passes `{ promoCode, promoPercent }` into `PayButton`
5. `PayButton` hides the input when `!configuredCode || percent <= 0`
6. Client strikethrough is preview only (`isValidPromoPreview` / `previewPromoAmount`)
7. Server `applyPromo` is the only thing that changes `expected_amount_cents`

Promo codes are treated as public (they appear on the pay page).

---



## 11. Timezone hardening

Vercel is UTC. Calabash business day is **America/Nassau** (EST/EDT).

Copy `lib/time.ts` and `lib/time.test.ts`. Change `BUSINESS_TIMEZONE` if the other portal is not Nassau.

Use:

- `startOfDayInTimeZone()` for dashboard “today’s revenue / today’s fees”
- `formatBusinessDateTime` for transaction timestamps and last-synced
- `formatBusinessDate` for payment-link created dates

Tests that must pass:

- 2026-08-29T16:00:00.000Z → start `2026-08-29T04:00:00.000Z` (EDT, UTC−4)
- 2026-08-29T03:00:00.000Z → start `2026-08-28T04:00:00.000Z` (still 28 Aug in Nassau)
- 2026-01-15T16:00:00.000Z → start `2026-01-15T05:00:00.000Z` (EST, UTC−5)

Today’s revenue: successful transactions where `(cng_created_at || created_at) >= startOfDay`. Prefer `net_cents` when not null, else `amount_cents`. Fees sum `fee_cents`.

---



## 12. Hygiene we also shipped (do these while you are in the files)

- Dashboard home / links / transactions / settings: on DB failure show a short error, do not render an empty happy state
- Payment APIs: generic 500 messages, no PostgREST text
- Logo upload: jpg/png/webp/gif only — drop SVG
- Delete unused `lib/supabase/client.ts` if the other portal has the same dead browser client
- Do not loosen RLS on app tables to “fix” the public pay page. HTTP is public; the server uses the service role. No anon policies.

Out of scope on Calabash (mention only, do not invent):

- Removing `API_KEY` from checkout URLs
- Redis / rate limits
- Blocking delete of a paid link

---



## 13. File checklist (Calabash paths → copy or port)



### Sync (PR #7 + #8)


| File                                                            | Role                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| `lib/cashango/types.ts`                                         | CNG list/detail types                                         |
| `lib/cashango/endpoints.ts`                                     | QA/prod URLs, `resolveCngBaseUrl`                             |
| `lib/cashango/api.ts`                                           | `buildCngApiUrl`, list + detail                               |
| `lib/cashango/api.test.ts`                                      | query-param auth tests                                        |
| `lib/cashango/map.ts`                                           | `toCents`, `mapCngTransactionToRow`, `mapWebhookPayloadToRow` |
| `lib/cashango/map.test.ts`                                      | including `toCents("45.00") === 4500`                         |
| `lib/cashango/upsert.ts`                                        | find by payment id then order number                          |
| `lib/cashango/sync.ts`                                          | paginated sync + settle                                       |
| `app/api/cng/sync/route.ts`                                     | admin POST                                                    |
| `app/api/cron/cng-sync/route.ts`                                | Bearer cron GET                                               |
| `app/api/webhooks/cng/route.ts`                                 | settle + enrich + upsert                                      |
| `components/dashboard/sync-transactions-button.tsx`             | date range + POST                                             |
| `app/dashboard/transactions/page.tsx`                           | table + last synced                                           |
| `supabase/migrations/20260817184600_cng_transaction_fields.sql` | columns + unique indexes                                      |
| `vercel.json`                                                   | daily cron                                                    |
| `lib/db/schema.ts`                                              | drizzle + `SETTINGS_KEYS.cngLastSyncAt`                       |




### Hardening (PR #9)


| File                                                                    | Role                                    |
| ----------------------------------------------------------------------- | --------------------------------------- |
| `lib/cashango/settle.ts`                                                | shared settle                           |
| `app/api/cng-url/route.ts`                                              | reuse / expire / unique-violation reuse |
| `app/api/webhooks/cng/route.ts`                                         | amount check + generic errors           |
| `lib/promo.ts` + `lib/promo.test.ts`                                    | settings-driven promo                   |
| `lib/settings.ts` + settings API/form/pay page                          | `promo_code` / `promo_percent`          |
| `lib/time.ts` + `lib/time.test.ts`                                      | America/Nassau                          |
| `lib/analytics.ts`                                                      | today’s stats from Nassau midnight      |
| `lib/utils.ts`                                                          | `parseDollarsToCents`                   |
| `supabase/migrations/20260829162000_one_pending_checkout_and_promo.sql` | unique pending + promo seed             |
| `scripts/migration.sql`                                                 | same index/seed on bootstrap            |


`package.json` test script:

```
tsx --test lib/cashango/map.test.ts lib/cashango/api.test.ts lib/promo.test.ts lib/time.test.ts
```

Also run `npx tsc --noEmit`.

---



## 14. Environment the other portal must have

```
NEXT_PUBLIC_APP_URL          # public origin used in PayLanes return URLs
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY    # server only; never NEXT_PUBLIC
CREDENTIAL_ENCRYPTION_KEY    # AES-GCM for cng_api_key / webhook secret
CASHANGO_MERCHANT_ID         # fallback if settings row empty
CASHANGO_API_KEY
CASHANGO_WEBHOOK_SECRET
CASHANGO_DEFAULT_ENV         # qa | prod
CRON_SECRET                  # Preview + Production
```

Webhook URL to give PayLanes:

```
https://<production-host>/api/webhooks/cng
```

Sign with HMAC-SHA256 hex of the **raw body**.

---



## 15. Verify on the other portal (do not skip)



### Sync

1. Save Merchant ID + Headers `apikey` in Settings. QA first.
2. Call list in isolation if needed: a 400 “Missing required query parameters” means `API_KEY` is still header-only. Fix `buildCngApiUrl` before writing more UI.
3. Dashboard **Sync from CNG** over a range that you know has payments.
4. Expect: `synced` ≈ CNG rows, `inserted` new, `updated` webhook rows gaining fees, `skipped` only rows with no `specialId` and no `webOrderNumber`.
5. A Calabash-originated `webOrderNumber` that is `processed` must flip the matching `payment_links.status` to `paid` even if the webhook never ran.
6. Re-run the same range: `inserted` should be 0, `updated` should rise. No duplicate `cng_payment_id`.
7. A CNG payment with no checkout session appears with empty link and “External / pre-Calabash” (or the other portal’s equivalent).



### Webhook / checkout

1. Wrong `AMOUNT` (signed) → 400, link stays unpaid.
2. Matching `AMOUNT` → session `completed`, link `paid`, transaction upserted.
3. Two Pay Now clicks within 60 minutes → same `order_number`.
4. Pending session older than 60 minutes → old row `expired`, new `order_number`.
5. After a unique-index race, the client still redirects (reuse), not a stuck 409.
6. Paid link refuses a new checkout.



### Promo / timezone (if ported)

1. Empty promo code → pay page has no promo field.
2. Set code + percent → preview strikethrough; Pay Now amount is server-validated.
3. A payment at 11pm Nassau is “today”, not tomorrow.



### Schema

1. `\d transactions` shows the unique partial indexes.
2. `\d checkout_sessions` shows `idx_checkout_sessions_one_pending`.
3. `select link_id, count(*) from checkout_sessions where status = 'pending' group by 1 having count(*) > 1` returns zero rows.

---



## 16. Pitfalls we already paid for — do not rediscover

1. `API_KEY` **must be a query param** on Transaction API calls. Header-only → “Missing required query parameters”.
2. `API_KEY` **must stay on the browser checkout URL.** PayLanes will not start the payment without it.
3. **Webhook** `AMOUNT` **is a string.** Use `parseDollarsToCents`, not `Number`.
4. `datetimestamp` **is Unix seconds**, not milliseconds.
5. **Public link ids are tokens**, not UUIDs. Filter `link_token` unless the value is a UUID.
6. **Never settle from the success return page.** Display only.
7. **Never return PostgREST** `error.message` on public or admin JSON APIs.
8. **Create the unique pending index only after expiring duplicate pending rows.**
9. **Sync skip ≠ error.** No `specialId` and no `webOrderNumber` → increment `skipped`.
10. `cng_last_sync_at` **is written only when** `errors` **is empty.** A partial sync must not look healthy.
11. **Hobby Vercel can block deploys** if the GitHub user pushing is not the Vercel-connected account. Unrelated to CNG, but it blocked Calabash `main` once.
12. **Do not apply Calabash migrations to a different Supabase project** that happens to have a `payment_links` table (e.g. KemisPay). Confirm `NEXT_PUBLIC_SUPABASE_URL` first.

---



## 17. Suggested implementation tickets for the other portal

Copy-paste these as the other repo’s todos.

1. Add transaction enrichment columns + unique indexes; backfill nothing.
2. Port `parseDollarsToCents`, `toCents`, map tests.
3. Port `buildCngApiUrl` + list/detail client + api tests. Prove a QA list call works.
4. Port `upsertTransactionRow`.
5. Port `settlePaidCheckout`. Point the existing webhook at it **and** add the amount check.
6. Port `syncCngTransactions` + admin POST + dashboard button. Manual QA sync.
7. Add cron + `CRON_SECRET` if the plan allows.
8. Expire duplicate pending sessions; add unique partial index; port `/api/cng-url` reuse/TTL/23505 reuse.
9. Move promo to settings if the portal has one. Seed current live values.
10. Port `America/Nassau` (or that business’s zone) for “today” and displayed timestamps.
11. Hide DB errors on dashboard pages; strip SVG logos if they have the same upload route.
12. `npm test` + `tsc --noEmit` + the verify list in §15.

When those twelve are green, the other portal matches Calabash’s sync and hardening. Do not add Redis, rate limits, or checkout-URL key removal in the same pass.