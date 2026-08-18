# The Calabash Studio — Payment Link Dashboard (V1)

Standalone payment-link generator for **The Calabash Studio** (`thecalabashstudio.com`).  
Single-admin login → generate a Cash N' Go payment link → customer pays on a branded `/pay/[linkId]` page.

Powered by KemisPay patterns. Separate deploy from kemispay.com — no affiliation in the codebase beyond the footer credit.

## Stack

- Next.js 15 (App Router) + Tailwind CSS
- Better Auth (email/password, single admin, no public sign-up)
- Supabase (Postgres + Storage)
- Cash N' Go / PayLanes redirect checkout

## Branding

| Token | Value |
|-------|-------|
| Headers | Cormorant Garamond |
| Body | Jost |
| Dark Green | `#124940` |
| Orange | `#E9851C` |
| Light Green | `#A9C6C1` |
| Light Beige | `#F9EEDC` |
| White | `#FFFFFF` |

Logo: [`public/calabash-logo.png`](public/calabash-logo.png)

## Local development (recommended first)

Uses Docker + Supabase CLI — no cloud project slot required.

1. **Prerequisites:** Docker Desktop running, Node 20+

2. **Install & start local Supabase**
   ```bash
   cd calabash
   npm install
   npm run db:start          # first run pulls images; applies migrations
   ```

3. **Env file** — `.env.local` should point at local keys from `npm run db:status`:
   - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`
   - anon + service_role keys from status output
   - `BETTER_AUTH_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

4. **Seed admin (once)**
   ```bash
   npm run seed:admin
   ```

5. **Run the app**
   ```bash
   npm run dev
   ```
   - App: http://localhost:3000/login  
   - Studio: http://127.0.0.1:54323  

6. **Stop local DB when done**
   ```bash
   npm run db:stop
   ```

### Promoting to cloud Supabase later

When you have a free cloud slot (or pause unused projects):
1. Create a Supabase project
2. Swap `.env` / Vercel env to cloud URL + keys + `DATABASE_URL`
3. Run `scripts/migration.sql` (or `supabase db push`) against cloud
4. Create public bucket `calabash-assets`
5. Re-seed admin if needed
6. Point Cash N' Go webhooks at your Vercel URL

## Cash N' Go (when ready to test payments)

Open **Settings** and save Merchant ID + the Headers API key (`apikey`).  
Choose QA or Production endpoint. Webhook URL (needs a public host — not localhost):
```
https://<your-vercel-domain>/api/webhooks/cng
```
Sign webhooks with HMAC-SHA256 hex in the `x-calabash-signature` header using your webhook secret.

## RLS note

App tables (`payment_links`, `transactions`, `settings`, `checkout_sessions`) have RLS enabled with **no anon policies**. The `/pay/[linkId]` page is public at HTTP, but the Next.js server reads via `SUPABASE_SERVICE_ROLE_KEY` — the customer never talks to Supabase directly. Do not loosen RLS to “fix” the public pay page.

## Routes

| Path | Purpose |
|------|---------|
| `/login` | Admin sign-in |
| `/dashboard` | Summary cards + link generator |
| `/dashboard/links` | All payment links |
| `/dashboard/transactions` | CNG-backed history (webhook + sync) |
| `/dashboard/settings` | Business + Cash N' Go config |
| `/pay/[linkId]` | Customer payment page |
| `/api/webhooks/cng` | Authoritative settlement + transaction-info enrichment |
| `/api/cng/sync` | Admin-only manual CNG history sync |
| `/api/cron/cng-sync` | Daily Vercel cron sync (`CRON_SECRET`) |

## Cash N' Go flow

1. Admin generates a link → stored in `payment_links`
2. Customer opens `/pay/{token}` → **Pay Now** → `POST /api/cng-url`
3. Browser hits `GET /api/cng/redirect/{orderNumber}` → 302 to PayLanes with `API_KEY` + `AUTH_ID`
4. Customer returns to `/cng/return/success` (display only)
5. Signed webhook `POST /api/webhooks/cng` marks the link paid, then looks up the payment via CNG `transaction-info` and **upserts** a `transactions` row (fees, net, payment ID). If that lookup fails, a minimal row is stored and later syncs enrich it.

Sensitive settings (`cng_api_key`, `cng_webhook_secret`) are encrypted with AES-256-GCM (`lib/crypto.ts`) before storage.

## Transaction history (CNG Payment API v1.0)

Calabash no longer relies on webhooks alone. The dashboard can pull authoritative history from:

- `GET /merchant/web-payment/transaction-info` — single payment (used after each webhook)
- `GET /merchant/web-payment/transactions` — paginated list with `FROM_DATE` / `TO_DATE`

**Manual sync:** on `/dashboard/transactions`, pick a date range (default last 30 days) and click **Sync from CNG**.

**Daily cron:** `GET /api/cron/cng-sync` runs at 06:00 UTC (`vercel.json`) for the last 7 days. Vercel sends `Authorization: Bearer ${CRON_SECRET}`. Cron jobs require a Vercel plan that supports them; if cron is unavailable, use the dashboard button.

Rows upsert by `cng_payment_id` (`specialId`), falling back to `order_number` (`webOrderNumber`), so webhook + sync do not create duplicates. CNG payments with no matching Calabash checkout session are stored with `link_id` null and shown as **External / pre-Calabash**.

### Revenue fields

| Column | Meaning |
|--------|---------|
| `amount_cents` | Gross — what the customer paid |
| `net_cents` | Net — merchant amount after PayLanes fees |
| `fee_cents` | PayLanes fee |

Dashboard **Today's Revenue** uses `net_cents` when present, otherwise gross. **Today's Fees** sums `fee_cents`.

## Deploy (Vercel)

Point a Vercel project at this repo, add the same env vars (including `CRON_SECRET`), run the migration + seed against production Supabase, then configure the Cash N' Go webhook to your Vercel URL.
