-- Calabash Studio V1 — app schema
-- Better Auth owns user / session / account / verification (created via Better Auth CLI or seed).
-- Apply this file against your Supabase Postgres (SQL editor or supabase db execute).

create extension if not exists "pgcrypto";

-- Better Auth core tables (idempotent; matches Better Auth drizzle/pg defaults)
create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "session" (
  id text primary key,
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  user_id text not null references "user"(id) on delete cascade
);

create table if not exists "account" (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references "user"(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "verification" (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- App tables
create table if not exists payment_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount_cents integer not null,
  status text not null default 'pending',
  link_token text not null unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  kind text not null default 'invoice',
  sales_end_at timestamptz,
  capacity integer,
  sold_count integer not null default 0
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references payment_links(id) on delete set null,
  customer_ref text,
  amount_cents integer not null,
  status text not null,
  created_at timestamptz not null default now(),
  raw_payload jsonb,
  cng_payment_id text,
  order_number text,
  fee_cents integer,
  net_cents integer,
  payer_email text,
  payer_phone text,
  payment_method text,
  card_type text,
  processed boolean,
  cng_created_at timestamptz,
  synced_at timestamptz
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text
);

create table if not exists checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references payment_links(id) on delete cascade,
  order_number text not null unique,
  expected_amount_cents integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  single_use boolean not null default true
);

create index if not exists idx_payment_links_status on payment_links(status);
create index if not exists idx_payment_links_created_at on payment_links(created_at desc);
create index if not exists idx_transactions_created_at on transactions(created_at desc);
create unique index if not exists idx_transactions_cng_payment_id
  on transactions (cng_payment_id)
  where cng_payment_id is not null;
create unique index if not exists idx_transactions_order_number
  on transactions (order_number)
  where order_number is not null;
create index if not exists idx_transactions_cng_created_at
  on transactions (cng_created_at desc);
create index if not exists idx_checkout_sessions_order on checkout_sessions(order_number);

-- Keep the newest pending session per link so the unique index can apply.
update checkout_sessions cs
set status = 'expired'
where status = 'pending'
  and single_use = true
  and exists (
    select 1
    from checkout_sessions newer
    where newer.link_id = cs.link_id
      and newer.status = 'pending'
      and newer.single_use = true
      and (
        newer.created_at > cs.created_at
        or (newer.created_at = cs.created_at and newer.id > cs.id)
      )
  );

create unique index if not exists idx_checkout_sessions_one_pending
  on checkout_sessions (link_id)
  where status = 'pending' and single_use = true;
create index if not exists idx_payment_links_kind on payment_links (kind);

create or replace function increment_event_sold_count(p_link_id uuid)
returns void
language sql
as $$
  update payment_links
  set sold_count = (
    select count(*)::int
    from checkout_sessions
    where link_id = p_link_id and status = 'completed'
  )
  where id = p_link_id and kind = 'event';
$$;

-- RLS: only service_role can read/write app tables.
-- The /pay/[linkId] page is public at HTTP, but the Next.js server reads via
-- SUPABASE_SERVICE_ROLE_KEY — the customer never touches Supabase directly.
alter table payment_links enable row level security;
alter table transactions enable row level security;
alter table settings enable row level security;
alter table checkout_sessions enable row level security;

-- No anon/authenticated policies = blocked for those roles.
-- service_role bypasses RLS by default in Supabase.

-- Default business settings
insert into settings (key, value) values
  ('business_name', 'The Calabash Studio'),
  ('cng_environment', 'qa'),
  ('promo_code', 'SAP0726'),
  ('promo_percent', '10')
on conflict (key) do nothing;

-- Storage bucket for logos (run in Supabase dashboard or via API if needed):
-- insert into storage.buckets (id, name, public) values ('calabash-assets', 'calabash-assets', true)
-- on conflict (id) do nothing;
