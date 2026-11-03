-- Ordela global subscription foundation.
-- Additive only: existing POS data and routes remain unchanged.
create schema if not exists billing;
revoke all on schema billing from public, anon, authenticated;
grant usage on schema billing to service_role;

create table if not exists billing.plans (
  code text primary key,
  name text not null,
  description text not null default '',
  features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing.prices (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null references billing.plans(code) on update cascade,
  interval text not null check (interval in ('monthly','yearly')),
  currency char(3) not null default 'USD',
  amount_minor bigint not null check (amount_minor >= 0),
  display_amount text not null default '',
  country_codes text[] not null default '{}',
  provider text,
  provider_price_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(plan_code, interval, currency)
);

create table if not exists billing.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id bigint not null references pos.stores(id) on delete restrict,
  plan_code text not null references billing.plans(code),
  status text not null check (status in ('trialing','active','past_due','cancelled','expired','grandfathered','suspended')),
  interval text check (interval in ('monthly','yearly')),
  currency char(3) not null default 'USD',
  amount_minor bigint not null default 0 check (amount_minor >= 0),
  started_at timestamptz not null default now(),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscriptions_one_current_per_store
  on billing.subscriptions(store_id)
  where status in ('trialing','active','past_due','grandfathered','suspended');
create index if not exists subscriptions_store_history_idx on billing.subscriptions(store_id, created_at desc);
create index if not exists subscriptions_plan_code_idx on billing.subscriptions(plan_code);

create table if not exists billing.invoices (
  id uuid primary key default gen_random_uuid(),
  store_id bigint not null references pos.stores(id) on delete restrict,
  subscription_id uuid references billing.subscriptions(id) on delete set null,
  invoice_number text not null unique,
  status text not null check (status in ('draft','open','paid','void','uncollectible','refunded')),
  currency char(3) not null,
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  period_start timestamptz,
  period_end timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  provider text,
  provider_invoice_id text,
  hosted_invoice_url text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invoices_store_created_idx on billing.invoices(store_id, created_at desc);
create index if not exists invoices_subscription_id_idx on billing.invoices(subscription_id);

create table if not exists billing.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  store_id bigint references pos.stores(id) on delete set null,
  invoice_id uuid references billing.invoices(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);
create index if not exists payment_events_invoice_id_idx on billing.payment_events(invoice_id);
create index if not exists payment_events_store_id_idx on billing.payment_events(store_id);

create table if not exists billing.audit_log (
  id bigint generated always as identity primary key,
  store_id bigint references pos.stores(id) on delete set null,
  actor_type text not null check (actor_type in ('system','owner','admin','provider')),
  actor_id text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists billing_audit_store_created_idx on billing.audit_log(store_id, created_at desc);

alter table billing.plans enable row level security;
alter table billing.prices enable row level security;
alter table billing.subscriptions enable row level security;
alter table billing.invoices enable row level security;
alter table billing.payment_events enable row level security;
alter table billing.audit_log enable row level security;
revoke all on all tables in schema billing from public, anon, authenticated;
revoke all on all sequences in schema billing from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema billing to service_role;
grant usage, select on all sequences in schema billing to service_role;

insert into billing.plans(code,name,description,features,limits,sort_order)
values
('free','Starter','Essential tools to start running a store.',
 '{"pos":true,"menu":true,"transactions":true,"basic_reports":true,"qr_menu":true,"receipt_printing":true,"inventory_advanced":false,"staff_attendance":false,"ai_manager":false,"multi_outlet":false,"api_integrations":false,"loyalty":false,"audit_log":false}',
 '{"outlets":1,"staff":2,"ai_messages_month":0,"monthly_orders":500}',1),
('pro','Pro','Advanced daily operations for growing stores.',
 '{"pos":true,"menu":true,"transactions":true,"basic_reports":true,"qr_menu":true,"receipt_printing":true,"inventory_advanced":true,"staff_attendance":true,"supplier_management":true,"advanced_reports":true,"qr_ordering":true,"exports":true,"ai_manager":false,"multi_outlet":false,"api_integrations":false,"loyalty":false,"audit_log":false}',
 '{"outlets":1,"staff":10,"ai_messages_month":0,"monthly_orders":5000}',2),
('business','Business','AI-assisted management and growing teams.',
 '{"pos":true,"menu":true,"transactions":true,"basic_reports":true,"qr_menu":true,"receipt_printing":true,"inventory_advanced":true,"staff_attendance":true,"supplier_management":true,"advanced_reports":true,"qr_ordering":true,"exports":true,"ai_manager":true,"ai_sales_analysis":true,"ai_recommendations":true,"loyalty":true,"promotions":true,"kds":true,"api_integrations":true,"multi_outlet":true,"audit_log":true}',
 '{"outlets":3,"staff":30,"ai_messages_month":500,"monthly_orders":25000}',3),
('enterprise','Enterprise','Centralized controls for multi-location operations.',
 '{"pos":true,"menu":true,"transactions":true,"basic_reports":true,"qr_menu":true,"receipt_printing":true,"inventory_advanced":true,"staff_attendance":true,"supplier_management":true,"advanced_reports":true,"qr_ordering":true,"exports":true,"ai_manager":true,"ai_sales_analysis":true,"ai_recommendations":true,"loyalty":true,"promotions":true,"kds":true,"api_integrations":true,"multi_outlet":true,"central_dashboard":true,"audit_log":true,"advanced_permissions":true,"priority_support":true}',
 '{"outlets":-1,"staff":-1,"ai_messages_month":2000,"monthly_orders":-1}',4),
('legacy','Legacy Access','Existing Ordela stores retained on their current feature set.',
 '{"pos":true,"menu":true,"transactions":true,"basic_reports":true,"qr_menu":true,"receipt_printing":true,"inventory_advanced":true,"staff_attendance":true,"supplier_management":true,"advanced_reports":true,"qr_ordering":true,"exports":true,"ai_manager":true,"ai_sales_analysis":true,"ai_recommendations":true,"loyalty":true,"promotions":true,"kds":true,"api_integrations":true,"multi_outlet":true,"central_dashboard":true,"audit_log":true,"advanced_permissions":true,"priority_support":true}',
 '{"outlets":-1,"staff":-1,"ai_messages_month":-1,"monthly_orders":-1}',99)
on conflict (code) do update set name=excluded.name, description=excluded.description,
 features=excluded.features, limits=excluded.limits, sort_order=excluded.sort_order, updated_at=now();

insert into billing.prices(plan_code,interval,currency,amount_minor,display_amount)
values
('pro','monthly','USD',1900,'$19 / month'),('pro','yearly','USD',19000,'$190 / year'),
('business','monthly','USD',4900,'$49 / month'),('business','yearly','USD',49000,'$490 / year'),
('enterprise','monthly','USD',9900,'$99 / month'),('enterprise','yearly','USD',99000,'$990 / year')
on conflict (plan_code,interval,currency) do update set amount_minor=excluded.amount_minor,
 display_amount=excluded.display_amount,is_active=true;

create or replace function billing.add_default_subscription()
returns trigger language plpgsql security definer
set search_path = pg_catalog, billing, pg_temp
as $$
begin
  insert into billing.subscriptions(store_id,plan_code,status,currency,amount_minor,metadata)
  values(new.id,'free','active','USD',0,jsonb_build_object('source','automatic_new_store'));
  return new;
end;
$$;
revoke all on function billing.add_default_subscription() from public, anon, authenticated;
drop trigger if exists trg_store_default_subscription on pos.stores;
create trigger trg_store_default_subscription after insert on pos.stores
for each row execute function billing.add_default_subscription();

insert into billing.subscriptions(store_id,plan_code,status,currency,amount_minor,metadata)
select s.id,'legacy','grandfathered','USD',0,
 jsonb_build_object('source','pre_subscription_migration','preserve_existing_features',true)
from pos.stores s
where not exists(select 1 from billing.subscriptions sub where sub.store_id=s.id
 and sub.status in ('trialing','active','past_due','grandfathered','suspended'));

insert into billing.audit_log(store_id,actor_type,action,details)
select s.id,'system','legacy_access_granted',
 jsonb_build_object('plan','legacy','reason','Preserve existing Ordela functionality during subscription rollout')
from pos.stores s
where not exists(select 1 from billing.audit_log a where a.store_id=s.id and a.action='legacy_access_granted');
