-- Store the single Hero Donor certificate issued to each eligible donor.
-- Certificate creation and delivery are performed only by PawChain's
-- server-side Admin API using the Supabase service-role client.

create table if not exists public.hero_certificates (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null,
  certificate_number text not null,
  donor_name text not null,
  donor_email text not null,
  donor_wallet_address text null,
  badge_level text not null default 'hero',
  achieved_at timestamp with time zone null,
  issued_at timestamp with time zone not null default now(),
  issued_by_wallet text not null,
  certificate_storage_path text null,
  emailed_from text null,
  emailed_to text null,
  sent_at timestamp with time zone null,
  delivery_status text not null default 'draft',
  provider_message_id text null,
  delivery_error text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint hero_certificates_donor_id_fkey
    foreign key (donor_id) references public.profiles (id) on delete cascade,
  constraint hero_certificates_certificate_number_key unique (certificate_number),
  constraint hero_certificates_badge_level_check check (badge_level = 'hero'),
  constraint hero_certificates_delivery_status_check
    check (delivery_status in ('draft', 'sending', 'sent', 'failed')),
  constraint hero_certificates_sent_fields_check
    check (
      delivery_status <> 'sent'
      or (
        sent_at is not null
        and emailed_from is not null
        and emailed_to is not null
      )
    )
);

create unique index if not exists hero_certificates_donor_id_unique
  on public.hero_certificates (donor_id);

create index if not exists hero_certificates_delivery_status_idx
  on public.hero_certificates (delivery_status, created_at desc);

create or replace function public.set_hero_certificates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hero_certificates_set_updated_at
  on public.hero_certificates;

create trigger hero_certificates_set_updated_at
before update on public.hero_certificates
for each row
execute function public.set_hero_certificates_updated_at();

alter table public.hero_certificates enable row level security;

comment on table public.hero_certificates is
  'Tracks one emailed Hero Donor certificate per donor.';

comment on column public.hero_certificates.delivery_status is
  'Certificate email state: draft, sending, sent, or failed.';
