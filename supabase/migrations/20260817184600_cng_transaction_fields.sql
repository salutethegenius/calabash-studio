-- CNG Payment API v1.0 — enriched transaction columns + dedup indexes

alter table transactions
  add column if not exists cng_payment_id text,
  add column if not exists order_number text,
  add column if not exists fee_cents integer,
  add column if not exists net_cents integer,
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
