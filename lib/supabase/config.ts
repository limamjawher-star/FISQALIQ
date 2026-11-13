/**
 * FISCALIQ — Supabase Integration Preparation Layer
 *
 * Prepares future connections to:
 * - Supabase PostgreSQL (with Row Level Security per company_id tenant)
 * - Supabase Auth (email/password, magic link, MFA for directors & accountants)
 * - Supabase Storage (encrypted bucket for FEC files, URSSAF DSN receipts, liasses 2065)
 *
 * SECURITY RULE:
 * No real database connection is active in this prototype build, and no secrets
 * are hardcoded. Server-side service keys must only ever be read from process.env
 * inside server routes.
 */

export interface SupabaseEnvironmentStatus {
  isConfigured: boolean;
  hasPublicUrl: boolean;
  hasAnonKey: boolean;
  hasServerServiceRole: boolean;
  storageBucketName: string;
  mode: 'demo_in_memory' | 'supabase_ready';
}

export function getSupabaseIntegrationStatus(): SupabaseEnvironmentStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'fiscaliq-documents';

  const hasValidUrl = Boolean(
    url && url.startsWith('https://') && !url.includes('your-project-ref')
  );
  const hasValidAnon = Boolean(anonKey && !anonKey.includes('placeholder'));
  const hasValidService = Boolean(serviceRole && !serviceRole.includes('server-only'));

  return {
    isConfigured: hasValidUrl && hasValidAnon,
    hasPublicUrl: hasValidUrl,
    hasAnonKey: hasValidAnon,
    hasServerServiceRole: hasValidService,
    storageBucketName: bucket,
    mode: hasValidUrl && hasValidAnon ? 'supabase_ready' : 'demo_in_memory',
  };
}

export function getSupabasePublicConfig(): {
  isConfigured: boolean;
  url: string | null;
  anonKey: string | null;
} {
  const status = getSupabaseIntegrationStatus();
  return {
    isConfigured: status.isConfigured,
    url: status.hasPublicUrl ? process.env.NEXT_PUBLIC_SUPABASE_URL || null : null,
    anonKey: status.hasAnonKey ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null : null,
  };
}

/**
 * Reference PostgreSQL DDL & Row-Level Security (RLS) blueprint for production deployment
 * on Supabase PostgreSQL. Enforces strict multi-tenant company isolation.
 */
export const SUPABASE_RLS_SCHEMA_BLUEPRINT = `-- FISCALIQ Production Schema & Row-Level Security (Supabase PostgreSQL)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  siren char(9) not null unique,
  legal_name text not null,
  legal_form text not null check (legal_form in ('SAS', 'SASU', 'SARL', 'EURL', 'SA')),
  tax_regime text not null,
  vat_regime text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('dirigeant', 'daf', 'expert_comptable', 'lecteur')),
  unique (company_id, user_id)
);

alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;

create policy "Tenant isolation: users only read their own companies"
  on public.companies for select
  using (
    exists (
      select 1 from public.company_memberships cm
      where cm.company_id = companies.id
        and cm.user_id = auth.uid()
    )
  );

create table if not exists public.saved_calculations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  calculation_type text not null check (calculation_type in ('IS_CGI_219', 'PAIE_RGDU_2026', 'RENTABILITE_SIG')),
  tax_year smallint not null default 2026,
  parameter_version text not null,
  classification text not null check (classification in ('CALCUL_VERIFIE', 'ESTIMATION', 'DONNEE_FICTIVE_DEMO')),
  input_summary text not null,
  primary_output_label text not null,
  primary_output_amount_eur numeric(14,2) not null,
  secondary_output_label text not null,
  secondary_output_value text not null,
  statutory_reference text not null,
  is_demo_scenario boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null check (category in ('simulation', 'conformite', 'optimisation', 'dossier')),
  title text not null,
  detail text not null,
  actor text not null,
  classification text not null check (classification in ('CALCUL_VERIFIE', 'ESTIMATION', 'DONNEE_FICTIVE_DEMO')),
  created_at timestamptz not null default now()
);

alter table public.saved_calculations enable row level security;
alter table public.activity_logs enable row level security;

create policy "Tenant isolation: saved_calculations by company_id"
  on public.saved_calculations for all
  using (
    exists (
      select 1 from public.company_memberships cm
      where cm.company_id = saved_calculations.company_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Tenant isolation: activity_logs by company_id"
  on public.activity_logs for select
  using (
    exists (
      select 1 from public.company_memberships cm
      where cm.company_id = activity_logs.company_id
        and cm.user_id = auth.uid()
    )
  );`;

export interface SupabaseDashboardRepositoryContract {
  mode: 'demo_in_memory' | 'supabase_ready';
  tenantIsolationColumn: 'company_id';
  tables: {
    companies: 'public.companies';
    memberships: 'public.company_memberships';
    savedCalculations: 'public.saved_calculations';
    activityLogs: 'public.activity_logs';
  };
}

export const SUPABASE_DASHBOARD_REPOSITORY_META: SupabaseDashboardRepositoryContract = {
  mode: 'demo_in_memory',
  tenantIsolationColumn: 'company_id',
  tables: {
    companies: 'public.companies',
    memberships: 'public.company_memberships',
    savedCalculations: 'public.saved_calculations',
    activityLogs: 'public.activity_logs',
  },
};

/**
 * Reference PostgreSQL DDL & Row-Level Security (RLS) blueprint for Personal Tax Onboarding
 * (`public.personal_tax_profiles`). Enforces strict household isolation by `auth.uid() = user_id`
 * and forbids storing tax portal passwords, bank credentials, or identity document files.
 */
export const PERSONAL_TAX_SUPABASE_RLS_SCHEMA = `-- FISCALIQ Personal Tax Profile Schema & Row-Level Security (Supabase PostgreSQL)
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

create policy "Household owner isolation: users only read/write their own personal_tax_profiles"
  on public.personal_tax_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`;

/**
 * Reference PostgreSQL + pgvector DDL, Immutable Version History & Semantic Search RPC
 * for FISCALIQ's Official French Personal Taxation Knowledge Base.
 *
 * Enforces:
 * 1. Explicit normative tier hierarchy (LEGISLATION_CGI_LOI, DOCTRINE_BOFIP,
 *    EXPLICATION_OFFICIELLE_ADMINISTRATION, CONTENU_PEDAGOGIQUE_FISCALIQ)
 * 2. Historical version preservation (updates append to `tax_knowledge_source_versions`
 *    and never silently overwrite older tax-year rules)
 * 3. Authoritative answer guardrail (`match_verified_tax_chunks` filters strictly
 *    on `s.verification_status = 'APPROVED_VERIFIED'`)
 */
export const SUPABASE_PGVECTOR_KNOWLEDGE_BASE_SCHEMA = `-- FISCALIQ Official French Personal Taxation Knowledge Base (Supabase PostgreSQL + pgvector)
create extension if not exists vector with schema extensions;

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

-- Table immuable d'archivage des versions historiques (interdiction d'écraser silencieusement une ancienne règle)
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

-- Table des segments vectorisés (chunks) pour la recherche sémantique hybride pgvector
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

-- Lecture publique uniquement pour les sources approuvées et vérifiées ou archivées avec mention
create policy "Public read access to verified tax knowledge sources"
  on public.tax_knowledge_sources for select
  using (verification_status in ('APPROVED_VERIFIED', 'ARCHIVED_HISTORICAL'));

-- Fonction RPC de recherche sémantique : SEULES les sources APPROVED_VERIFIED peuvent fonder une réponse fiscale
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
$$;`;

/**
 * Reference PostgreSQL DDL & Private Supabase Storage RLS Policies for:
 * 1. User Subscriptions & Entitlements (`public.user_subscriptions` & `public.subscription_usage_counters`)
 *    - Never stores payment card details (zero PAN/CVV/expiry columns; external provider references only).
 * 2. Personal Tax PDF Reports (`public.personal_tax_reports`)
 *    - Strict owner isolation (`auth.uid() = user_id`).
 * 3. Private Supabase Storage Bucket (`fiscaliq-personal-reports`)
 *    - Public access disabled (`public = false`).
 *    - Access only via server-generated short-lived signed URLs after verifying `auth.uid() = user_id`.
 */
export const SUPABASE_REPORTS_AND_SUBSCRIPTIONS_RLS_SCHEMA = `-- FISCALIQ Subscriptions, Usage Quotas & Private Personal Tax Reports (Supabase PostgreSQL + Storage RLS)

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  household_id text not null,
  plan_tier text not null default 'FREE' check (plan_tier in ('FREE', 'PREMIUM')),
  subscription_status text not null default 'ACTIVE_CONFIGURATION' check (
    subscription_status in ('ACTIVE_CONFIGURATION', 'TRIALING', 'CANCELED')
  ),
  payment_provider_name text not null default 'UNCONFIGURED_ABSTRACTION',
  external_customer_ref text,
  external_subscription_ref text,
  -- SECURITY RULE: Never store payment card numbers, CVV, or bank credentials
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id text not null,
  period_month char(7) not null, -- e.g. '2026-11'
  saved_simulations_count integer not null default 0,
  assistant_questions_count integer not null default 0,
  generated_reports_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, household_id, period_month)
);

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

create policy "Strict owner isolation: user_subscriptions"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Strict owner isolation: subscription_usage_counters"
  on public.subscription_usage_counters for select
  using (auth.uid() = user_id);

create policy "Strict owner isolation: personal_tax_reports"
  on public.personal_tax_reports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Private Supabase Storage bucket for personal PDF reports (public = false)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fiscaliq-personal-reports', 'fiscaliq-personal-reports', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "Private bucket owner isolation: only owner can read own folder in fiscaliq-personal-reports"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'fiscaliq-personal-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Private bucket owner erasure: only owner can delete own folder in fiscaliq-personal-reports"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fiscaliq-personal-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );`;

/**
 * Reference PostgreSQL DDL & RLS for AI Tax Conversations, GDPR Data Subject Requests (Art. 15, 17, 20),
 * Automated Retention Expiry (Art. 5-1-e), and Revocation of Anonymous Privileges.
 */
export const SUPABASE_GDPR_AND_CONVERSATIONS_RLS_SCHEMA = `-- FISCALIQ Personal AI Conversations, GDPR Rights & Strict Anon Revocation (Supabase PostgreSQL)

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

create policy "Strict owner isolation: personal_tax_conversations"
  on public.personal_tax_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Strict owner isolation: personal_tax_messages"
  on public.personal_tax_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Strict owner isolation: gdpr_data_subject_requests"
  on public.gdpr_data_subject_requests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Defense in depth: revoke all direct table privileges from unauthenticated 'anon' role
revoke all on public.personal_tax_profiles from anon;
revoke all on public.user_subscriptions from anon;
revoke all on public.subscription_usage_counters from anon;
revoke all on public.personal_tax_reports from anon;
revoke all on public.personal_tax_conversations from anon;
revoke all on public.personal_tax_messages from anon;
revoke all on public.gdpr_data_subject_requests from anon;`;





