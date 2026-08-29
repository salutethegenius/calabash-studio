-- One in-flight checkout per payment link, plus seed the live Independence promo.

-- Keep the newest pending session per link so the unique index can apply.
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

insert into settings (key, value) values
  ('promo_code', 'SAP0726'),
  ('promo_percent', '10')
on conflict (key) do nothing;
