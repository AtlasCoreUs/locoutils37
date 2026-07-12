-- ============================================================
-- LOCOUTILS — SETUP SUPABASE
-- À exécuter UNE FOIS dans : Supabase Dashboard → SQL Editor → New query → RUN
-- ============================================================

create extension if not exists btree_gist;

-- Table des réservations
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null,
  tool_name text not null,
  duration text not null,
  date_start date not null,
  date_end date not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  amount_location integer not null,
  amount_caution integer not null,
  stripe_session_id text unique,
  status text not null default 'confirmed',        -- confirmed | returned | cancelled
  caution_status text not null default 'held',     -- held | refunded | captured
  created_at timestamptz not null default now()
);

alter table public.reservations enable row level security;

-- Un client connecté ne voit QUE ses propres réservations (par email)
drop policy if exists "read own by email" on public.reservations;
create policy "read own by email" on public.reservations
  for select to authenticated
  using ((auth.jwt()->>'email') = customer_email);

-- ANTI DOUBLE-RÉSERVATION : garanti par la base elle-même.
-- Deux réservations confirmées ne peuvent JAMAIS se chevaucher pour le même outil.
alter table public.reservations drop constraint if exists no_double_booking;
alter table public.reservations add constraint no_double_booking
  exclude using gist (
    tool_id with =,
    daterange(date_start, date_end, '[]') with &&
  ) where (status = 'confirmed');

-- Vue publique des disponibilités : expose UNIQUEMENT outil + dates (zéro donnée perso)
create or replace view public.public_availability as
  select tool_id, date_start, date_end
  from public.reservations
  where status = 'confirmed';

grant select on public.public_availability to anon, authenticated;

-- Vérification
select 'Setup OK — table reservations + contrainte anti double-booking + vue publique créées' as resultat;
