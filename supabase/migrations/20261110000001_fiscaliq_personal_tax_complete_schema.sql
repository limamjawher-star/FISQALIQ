-- ============================================================================
-- FISCALIQ — Migration Supabase PostgreSQL Complète (Particuliers & Foyers)
-- Fichier : supabase/migrations/20261110000001_fiscaliq_personal_tax_complete_schema.sql
--
-- Contenu :
-- 1. Extension pgvector (recherche sémantique hybride sur les sources officielles)
-- 2. Profils fiscaux personnels (`public.personal_tax_profiles`) avec RLS propriétaire
-- 3. Registre officiel des sources fiscales, versions historiques immuables & chunks
--    vectorisés (`public.tax_knowledge_sources`, `public.tax_knowledge_source_versions`,
--    `public.tax_knowledge_chunks`) + fonction RPC `match_verified_tax_chunks`
-- 4. Abonnements & quotas (`public.user_subscriptions`, `public.subscription_usage_counters`)
--    SANS AUCUNE COLONNE DE CARTE BANCAIRE
-- 5. Métadonnées des rapports PDF (`public.personal_tax_reports`) & compartiment privé
--    Supabase Storage (`fiscaliq-personal-reports`, `public = false`)
-- 6. Conversations IA avec expiration automatique à 30 jours (`public.personal_tax_conversations`,
--    `public.personal_tax_messages`) et demandes RGPD (`public.gdpr_data_subject_requests`)
-- 7. Révocation stricte des privilèges `anon` sur toutes les tables personnelles
-- ============================================================================

begin;

-- 1. Extension pgvector
create schema if not exists extensions;
create extension if not exists vector with schema extensions;

-- 2. Table des profils fiscaux personnels (Minimisation RGPD Art. 5-1-c : ni NIR, ni SPI, ni IBAN)
create table if not exists public.personal_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_label text not null,
  tax_year smallint not null default 2026,
  residency_status text not null check (residency_status in ('resident_france', 'non_resident_revenus_france', 'incertain_a_verifier')),
  country_of_residence text not null default 'France',
  household_status text not null check (household_status in ('celibataire', 'marie', 'pacse', 'divorce', 'separe', 'veuf')),
  lives_alone_jan1 text not null check (lives_alone_jan1 in ('oui', 'non', 'ne_sait_pas')),
  dependants_payload jsonb not null default '{}'::jsonb,
  incomes_payload jsonb not null default '{}'::jsonb,
  expenses_payload jsonb not null default '{}'::jsonb,
  optional_notice_payload jsonb not null default '{}'::jsonb,
  computed_parts numeric(4,2) not null default 1.0,
  estimated_net_tax_eur numeric(12,2) not null default 0,
  incomplete_items_to_verify jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.personal_tax_profiles enable row level security;

drop policy if exists "Household owner isolation: users only read/write their own personal_tax_profiles" on public.personal_tax_profiles;
create policy "Household owner isolation: users only read/write their own personal_tax_profiles"
  on public.personal_tax_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Base de connaissances fiscale officielle & Historique immuable des versions
create table if not exists public.tax_knowledge_sources (
  id text primary key,
  title text not null,
  publisher text not null check (publisher in (
    'impots.gouv.fr',
    'BOFiP',
    'Service-Public Particuliers',
    'economie.gouv.fr',
    'Legifrance'
  )),
  official_url text not null,
  official_reference text not null,
  publication_date date not null,
  modification_date date not null,
  retrieval_date date not null,
  applicable_income_year smallint not null,
  applicable_tax_year smallint not null,
  effective_date date not null,
  topic text not null check (topic in (
    'IMPOT_REVENU_BAREME',
    'COMPOSITION_FOYER',
    'QUOTIENT_FAMILIAL_PARTS',
    'SALAIRES_TRAITEMENTS',
    'PENSIONS_RETRAITES',
    'REVENUS_FONCIERS_LOCATIFS',
    'DEDUCTIONS_REVENU_GLOBAL',
    'REDUCTIONS_IMPOT',
    'CREDITS_IMPOT',
    'PRELEVEMENT_A_LA_SOURCE',
    'PROCEDURES_DECLARATION',
    'OBLIGATIONS_PAIEMENT_RECOUVREMENT'
  )),
  normative_tier text not null check (normative_tier in (
    'LEGISLATION_CGI_LOI',
    'DOCTRINE_BOFIP',
    'EXPLICATION_OFFICIELLE_ADMINISTRATION',
    'CONTENU_PEDAGOGIQUE_FISCALIQ'
  )),
  verification_status text not null check (verification_status in (
    'APPROVED_VERIFIED',
    'PENDING_REVIEW',
    'REJECTED',
    'ARCHIVED_HISTORICAL'
  )),
  version_number integer not null default 1,
  supersedes_source_id text references public.tax_knowledge_sources(id),
  reviewed_by text,
  review_notes text,
  copyright_license text not null default 'Licence Ouverte Etalab 2.0 / Reproduction publique autorisée avec mention de la source officielle',
  ingestion_method text not null check (ingestion_method in (
    'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION',
    'LEGIFRANCE_BOFIP_OPEN_DATA_EXTRACT'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_knowledge_source_versions (
  version_id uuid primary key default gen_random_uuid(),
  source_id text not null references public.tax_knowledge_sources(id) on delete restrict,
  version_number integer not null,
  applicable_income_year smallint not null,
  applicable_tax_year smallint not null,
  effective_date date not null,
  publication_date date not null,
  modification_date date not null,
  official_reference text not null,
  plain_french_summary text not null,
  normative_excerpt text not null,
  change_reason text not null,
  archived_at timestamptz not null default now(),
  unique (source_id, version_number)
);

create table if not exists public.tax_knowledge_chunks (
  chunk_id text primary key,
  source_id text not null references public.tax_knowledge_sources(id) on delete cascade,
  version_number integer not null default 1,
  chunk_index smallint not null,
  section_heading text not null,
  chunk_text text not null,
  token_estimate integer not null,
  applicable_income_year smallint not null,
  applicable_tax_year smallint not null,
  effective_date date not null,
  topic text not null,
  publisher text not null,
  normative_tier text not null,
  verification_status text not null,
  embedding extensions.vector(768) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tax_knowledge_chunks_hnsw
  on public.tax_knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists idx_tax_knowledge_chunks_metadata
  on public.tax_knowledge_chunks (verification_status, applicable_income_year, topic, publisher, normative_tier);

alter table public.tax_knowledge_sources enable row level security;
alter table public.tax_knowledge_source_versions enable row level security;
alter table public.tax_knowledge_chunks enable row level security;

drop policy if exists "Public read access to verified tax knowledge sources" on public.tax_knowledge_sources;
create policy "Public read access to verified tax knowledge sources"
  on public.tax_knowledge_sources for select
  using (verification_status in ('APPROVED_VERIFIED', 'ARCHIVED_HISTORICAL'));

create or replace function public.match_verified_tax_chunks(
  query_embedding extensions.vector(768),
  filter_income_year smallint default 2025,
  filter_effective_date date default current_date,
  filter_topic text default null,
  filter_publisher text default null,
  match_threshold float default 0.35,
  match_count int default 5
)
returns table (
  chunk_id text,
  source_id text,
  title text,
  publisher text,
  official_url text,
  official_reference text,
  applicable_income_year smallint,
  applicable_tax_year smallint,
  effective_date date,
  topic text,
  normative_tier text,
  verification_status text,
  section_heading text,
  chunk_text text,
  similarity float
)
language sql stable
as $$
  select
    c.chunk_id,
    c.source_id,
    s.title,
    s.publisher,
    s.official_url,
    s.official_reference,
    c.applicable_income_year,
    c.applicable_tax_year,
    c.effective_date,
    c.topic,
    c.normative_tier,
    s.verification_status,
    c.section_heading,
    c.chunk_text,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.tax_knowledge_chunks c
  join public.tax_knowledge_sources s on s.id = c.source_id
  where s.verification_status = 'APPROVED_VERIFIED'
    and c.verification_status = 'APPROVED_VERIFIED'
    and c.applicable_income_year = filter_income_year
    and c.effective_date <= filter_effective_date
    and (filter_topic is null or c.topic = filter_topic)
    and (filter_publisher is null or c.publisher = filter_publisher)
    and 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 4. Abonnements & Compteurs d'usage (Aucune donnée de carte bancaire stockée)
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  household_id text not null,
  plan_tier text not null default 'FREE' check (plan_tier in ('FREE', 'PLUS', 'PREMIUM')),
  subscription_status text not null default 'ACTIVE_CONFIGURATION' check (
    subscription_status in ('ACTIVE_CONFIGURATION', 'TRIALING', 'CANCELED')
  ),
  payment_provider_name text not null default 'UNCONFIGURED_ABSTRACTION',
  external_customer_ref text,
  external_subscription_ref text,
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id text not null,
  period_month char(7) not null,
  saved_simulations_count integer not null default 0,
  assistant_questions_count integer not null default 0,
  generated_reports_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, household_id, period_month)
);

-- 5. Métadonnées des rapports PDF & Compartiment privé Supabase Storage
create table if not exists public.personal_tax_reports (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id text not null,
  report_type text not null check (report_type in (
    'BILAN_FISCAL_COMPLET',
    'SYNTHESE_SALAIRE_ET_PAS',
    'DOSSIER_OPTIMISATION_ET_2042'
  )),
  title text not null,
  tax_year smallint not null default 2026,
  income_year smallint not null default 2025,
  storage_bucket text not null default 'fiscaliq-personal-reports',
  storage_object_path text not null unique,
  byte_size integer not null,
  sha256_checksum text not null,
  verification_status text not null default 'CALCUL_DETERMINISTE_VERIFIE',
  created_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;
alter table public.subscription_usage_counters enable row level security;
alter table public.personal_tax_reports enable row level security;

drop policy if exists "Strict owner isolation: user_subscriptions" on public.user_subscriptions;
create policy "Strict owner isolation: user_subscriptions"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Strict owner isolation: subscription_usage_counters" on public.subscription_usage_counters;
create policy "Strict owner isolation: subscription_usage_counters"
  on public.subscription_usage_counters for select
  using (auth.uid() = user_id);

drop policy if exists "Strict owner isolation: personal_tax_reports" on public.personal_tax_reports;
create policy "Strict owner isolation: personal_tax_reports"
  on public.personal_tax_reports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fiscaliq-personal-reports', 'fiscaliq-personal-reports', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Private bucket owner isolation: only owner can read own folder in fiscaliq-personal-reports" on storage.objects;
create policy "Private bucket owner isolation: only owner can read own folder in fiscaliq-personal-reports"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'fiscaliq-personal-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Private bucket owner erasure: only owner can delete own folder in fiscaliq-personal-reports" on storage.objects;
create policy "Private bucket owner erasure: only owner can delete own folder in fiscaliq-personal-reports"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fiscaliq-personal-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. Conversations IA (expiration 30 jours) & Journal d'exercice des droits RGPD (Art. 15, 17, 20)
create table if not exists public.personal_tax_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id text not null,
  tax_year smallint not null default 2026,
  used_household_profile boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.personal_tax_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.personal_tax_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  redacted_content text not null,
  cited_source_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gdpr_data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id text not null,
  request_type text not null check (request_type in ('ART_15_ACCESS', 'ART_17_ERASURE', 'ART_20_PORTABILITY')),
  status text not null default 'COMPLETED' check (status in ('PENDING', 'COMPLETED')),
  completed_at timestamptz not null default now()
);

alter table public.personal_tax_conversations enable row level security;
alter table public.personal_tax_messages enable row level security;
alter table public.gdpr_data_subject_requests enable row level security;

drop policy if exists "Strict owner isolation: personal_tax_conversations" on public.personal_tax_conversations;
create policy "Strict owner isolation: personal_tax_conversations"
  on public.personal_tax_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Strict owner isolation: personal_tax_messages" on public.personal_tax_messages;
create policy "Strict owner isolation: personal_tax_messages"
  on public.personal_tax_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Strict owner isolation: gdpr_data_subject_requests" on public.gdpr_data_subject_requests;
create policy "Strict owner isolation: gdpr_data_subject_requests"
  on public.gdpr_data_subject_requests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Défense en profondeur : révocation de tous les privilèges directs du rôle `anon`
revoke all on public.personal_tax_profiles from anon;
revoke all on public.user_subscriptions from anon;
revoke all on public.subscription_usage_counters from anon;
revoke all on public.personal_tax_reports from anon;
revoke all on public.personal_tax_conversations from anon;
revoke all on public.personal_tax_messages from anon;
revoke all on public.gdpr_data_subject_requests from anon;

commit;
