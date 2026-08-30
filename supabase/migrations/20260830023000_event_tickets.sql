-- Event tickets: reusable payment links with a sales window and optional capacity.

alter table payment_links
  add column if not exists kind text not null default 'invoice',
  add column if not exists sales_end_at timestamptz,
  add column if not exists capacity integer,
  add column if not exists sold_count integer not null default 0;

alter table checkout_sessions
  add column if not exists single_use boolean not null default true;

drop index if exists idx_checkout_sessions_one_pending;

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
