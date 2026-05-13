/*
  # Paiements FedaPay pour les commandes AyaMarket

  Les commandes existantes restent creees dans `commandes`.
  Cette migration ajoute uniquement Celtiis Cash et le suivi paiement.
*/

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.commandes'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%mode_paiement%';

  if constraint_name is not null then
    execute format('alter table public.commandes drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.commandes
  add constraint commandes_mode_paiement_check
  check (mode_paiement in ('mtn', 'moov', 'celtiis', 'livraison'));

alter table public.commandes
  add column if not exists payment_status text not null default 'not_started'
    check (payment_status in ('not_started', 'pending', 'approved', 'declined', 'canceled', 'refunded', 'transferred')),
  add column if not exists fedapay_transaction_id text,
  add column if not exists fedapay_payment_url text;

create index if not exists idx_commandes_fedapay_transaction
  on public.commandes(fedapay_transaction_id);
