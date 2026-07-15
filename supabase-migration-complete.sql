-- LOCOUTILS37 — migration complète Supabase
-- Exécuter dans Supabase SQL Editor sur un projet de STAGING avant production.
create extension if not exists btree_gist;
create extension if not exists pgcrypto;

do $$ begin
  create type public.payment_status as enum ('pending','paid','refunded','failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.deposit_status as enum ('not_created','created','authorized','released','captured','failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.reservation_status as enum ('pending','confirmed','active','completed','canceled');
exception when duplicate_object then null; end $$;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null,
  tool_name text not null,
  duration text not null check (duration in ('demi','jour','we','semaine')),
  date_start date not null,
  date_end date not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  amount_location integer not null check (amount_location > 0),
  amount_deposit integer not null check (amount_deposit > 0),
  deposit_captured_amount integer not null default 0 check (deposit_captured_amount >= 0),
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  deposit_payment_intent_id text unique,
  payment_status public.payment_status not null default 'pending',
  deposit_status public.deposit_status not null default 'not_created',
  reservation_status public.reservation_status not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_end >= date_start),
  check (deposit_captured_amount <= amount_deposit)
);

-- Les réservations en attente ne bloquent que pendant 30 minutes via expires_at.
-- La contrainte SQL protège les créneaux confirmés/actifs contre toute concurrence.
do $$ begin
  alter table public.reservations add constraint reservations_no_overlap
  exclude using gist (tool_id with =, daterange(date_start,date_end,'[]') with &&)
  where (reservation_status in ('pending','confirmed','active'));
exception when duplicate_object then null; end $$;

create index if not exists reservations_email_idx on public.reservations(lower(customer_email));
create index if not exists reservations_dates_idx on public.reservations(tool_id,date_start,date_end);
create index if not exists reservations_expiry_idx on public.reservations(expires_at) where reservation_status='pending';

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  status text not null check (status in ('processing','completed','failed')),
  payload_hash text,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at before update on public.reservations for each row execute function public.set_updated_at();

create or replace function public.cleanup_expired_reservation_locks() returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  update public.reservations set reservation_status='canceled',payment_status='failed'
  where reservation_status='pending' and payment_status='pending' and expires_at < now();
  get diagnostics n=row_count; return n;
end $$;

create or replace view public.public_availability with (security_invoker=true) as
select tool_id,date_start,date_end from public.reservations
where reservation_status in ('pending','confirmed','active')
  and (reservation_status <> 'pending' or expires_at > now());

grant select on public.public_availability to anon, authenticated;
revoke all on public.reservations from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;
alter table public.reservations enable row level security;
alter table public.stripe_events enable row level security;
-- Les Netlify Functions utilisent uniquement la clé service_role, qui contourne RLS côté serveur.
