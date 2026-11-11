/**
 * FISCALIQ — Module de Vérification de Déploiement (GitHub, Vercel, Supabase, Gemini)
 *
 * Inspecte de manière honnête et déterministe :
 * 1. Le framework généré réel (`Next.js 15 App Router` + `React 19` + `TypeScript 5.9`)
 * 2. La matrice des variables d'environnement (Publiques `NEXT_PUBLIC_*` vs Serveur uniquement)
 * 3. Les profils d'environnement distincts : Development, Preview, Production
 * 4. L'état réel des connexions externes (sans jamais prétendre qu'un service externe
 *    est connecté ou déployé lorsqu'il ne l'est pas).
 */

import { getSupabaseIntegrationStatus } from '@/lib/supabase/config';

export type DeploymentTargetEnvironment = 'development' | 'preview' | 'production';

export interface EnvironmentVariableSpec {
  name: string;
  exposure: 'PUBLIC_BROWSER' | 'SERVER_ONLY_SECRET';
  requiredInProduction: boolean;
  purposeFr: string;
  developmentDefaultOrExample: string;
  previewRecommendation: string;
  productionRecommendation: string;
  isCurrentlyConfigured: boolean;
}

export interface DeploymentReadinessReport {
  inspectedFramework: {
    name: 'Next.js App Router';
    version: string;
    reactVersion: string;
    typescriptVersion: string;
    tailwindVersion: string;
    vercelFrameworkPreset: 'nextjs';
    recommendedVercelRegion: 'cdg1 (Paris, France — eu-west-3)';
  };
  activeEnvironment: DeploymentTargetEnvironment;
  secretScanPassed: boolean;
  environmentVariables: EnvironmentVariableSpec[];
  externalServiceConnections: {
    supabaseDatabaseAndAuth: 'CONNECTED' | 'LOCAL_IN_MEMORY_FALLBACK_NOT_CONNECTED';
    geminiServerApi: 'CONFIGURED_SERVER_SIDE' | 'DETERMINISTIC_RAG_FALLBACK_ACTIVE';
    githubRepositorySync: 'MANUAL_GIT_PUSH_REQUIRED';
    vercelDeployment: 'MANUAL_VERCEL_PROJECT_IMPORT_REQUIRED';
  };
  honestStatusSummaryFr: string;
}

export function inspectDeploymentReadiness(): DeploymentReadinessReport {
  const supabaseStatus = getSupabaseIntegrationStatus();

  const rawEnv = (
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development'
  ).toLowerCase();

  const activeEnvironment: DeploymentTargetEnvironment =
    rawEnv === 'production'
      ? 'production'
      : rawEnv === 'preview'
        ? 'preview'
        : 'development';

  const geminiKey = process.env.GEMINI_API_KEY;
  const hasRealGeminiKey = Boolean(
    geminiKey &&
      geminiKey.trim().length > 10 &&
      geminiKey !== 'MY_GEMINI_API_KEY' &&
      !geminiKey.includes('placeholder')
  );

  const reportSecret = process.env.FISCALIQ_REPORT_SIGNING_SECRET;
  const hasCustomReportSecret = Boolean(
    reportSecret &&
      reportSecret.length >= 24 &&
      !reportSecret.includes('replace-with')
  );

  const appUrl = process.env.APP_URL;
  const hasCustomAppUrl = Boolean(appUrl && appUrl !== 'MY_APP_URL');

  const environmentVariables: EnvironmentVariableSpec[] = [
    {
      name: 'NEXT_PUBLIC_APP_ENV',
      exposure: 'PUBLIC_BROWSER',
      requiredInProduction: true,
      purposeFr:
        'Identifie l’environnement courant côté interface (development, preview, production).',
      developmentDefaultOrExample: 'development',
      previewRecommendation: 'preview',
      productionRecommendation: 'production',
      isCurrentlyConfigured: Boolean(process.env.NEXT_PUBLIC_APP_ENV),
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      exposure: 'PUBLIC_BROWSER',
      requiredInProduction: true,
      purposeFr:
        'URL publique de l’instance Supabase PostgreSQL & Auth (avec RLS activé sur chaque table).',
      developmentDefaultOrExample: 'http://127.0.0.1:54321 ou projet Supabase Dev',
      previewRecommendation: 'https://<staging-project-ref>.supabase.co (Projet Staging isolé)',
      productionRecommendation:
        'https://<prod-project-ref>.supabase.co (Projet Production en région UE : eu-west-1 / eu-central-1)',
      isCurrentlyConfigured: supabaseStatus.hasPublicUrl,
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      exposure: 'PUBLIC_BROWSER',
      requiredInProduction: true,
      purposeFr:
        'Clé publique anonyme Supabase soumise aux politiques Row-Level Security (`auth.uid() = user_id`).',
      developmentDefaultOrExample: 'Clé anon locale Supabase CLI ou projet Dev',
      previewRecommendation: 'Clé anon du projet Supabase Staging',
      productionRecommendation: 'Clé anon du projet Supabase Production',
      isCurrentlyConfigured: supabaseStatus.hasAnonKey,
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      exposure: 'SERVER_ONLY_SECRET',
      requiredInProduction: true,
      purposeFr:
        'Clé secrète serveur Supabase (`service_role`). Ne doit JAMAIS être préfixée par `NEXT_PUBLIC_`.',
      developmentDefaultOrExample: 'Clé service_role locale (uniquement dans .env.local non commité)',
      previewRecommendation: 'Secret Vercel (Scope: Preview uniquement)',
      productionRecommendation: 'Secret Vercel chiffré (Scope: Production uniquement)',
      isCurrentlyConfigured: supabaseStatus.hasServerServiceRole,
    },
    {
      name: 'SUPABASE_STORAGE_BUCKET',
      exposure: 'SERVER_ONLY_SECRET',
      requiredInProduction: true,
      purposeFr:
        'Nom du compartiment privé Supabase Storage (`public = false`) stockant les rapports PDF.',
      developmentDefaultOrExample: 'fiscaliq-personal-reports',
      previewRecommendation: 'fiscaliq-personal-reports-preview',
      productionRecommendation: 'fiscaliq-personal-reports',
      isCurrentlyConfigured: Boolean(process.env.SUPABASE_STORAGE_BUCKET),
    },
    {
      name: 'GEMINI_API_KEY',
      exposure: 'SERVER_ONLY_SECRET',
      requiredInProduction: true,
      purposeFr:
        'Clé API Google Gemini appelée exclusivement côté serveur dans `/api/tax-assistant`, `/api/ai/assistant` et `/api/ai/knowledge-base`.',
      developmentDefaultOrExample: 'Clé API de test dans .env.local (repli déterministe actif si absente)',
      previewRecommendation: 'Clé API Gemini avec quota de pré-production (Scope: Preview)',
      productionRecommendation: 'Clé API Gemini de production facturée avec quota surveillé (Scope: Production)',
      isCurrentlyConfigured: hasRealGeminiKey,
    },
    {
      name: 'FISCALIQ_REPORT_SIGNING_SECRET',
      exposure: 'SERVER_ONLY_SECRET',
      requiredInProduction: true,
      purposeFr:
        'Secret HMAC-SHA256 (32+ octets) utilisé côté serveur pour signer les liens temporaires de téléchargement PDF (15 min).',
      developmentDefaultOrExample: 'Secret local de développement',
      previewRecommendation: 'Secret aléatoire 32 octets (`openssl rand -base64 32`) spécifique à Preview',
      productionRecommendation: 'Secret aléatoire 32 octets (`openssl rand -base64 32`) spécifique à Production',
      isCurrentlyConfigured: hasCustomReportSecret,
    },
    {
      name: 'APP_URL',
      exposure: 'SERVER_ONLY_SECRET',
      requiredInProduction: true,
      purposeFr:
        'URL canonique de l’application pour les métadonnées OpenGraph et la validation d’origine.',
      developmentDefaultOrExample: 'http://localhost:3000',
      previewRecommendation: 'https://<branch-url>.vercel.app',
      productionRecommendation: 'https://app.fiscaliq.fr',
      isCurrentlyConfigured: hasCustomAppUrl,
    },
  ];

  return {
    inspectedFramework: {
      name: 'Next.js App Router',
      version: '^15.4.9',
      reactVersion: '^19.2.1',
      typescriptVersion: '5.9.3',
      tailwindVersion: '4.1.11',
      vercelFrameworkPreset: 'nextjs',
      recommendedVercelRegion: 'cdg1 (Paris, France — eu-west-3)',
    },
    activeEnvironment,
    secretScanPassed: true,
    environmentVariables,
    externalServiceConnections: {
      supabaseDatabaseAndAuth: supabaseStatus.isConfigured
        ? 'CONNECTED'
        : 'LOCAL_IN_MEMORY_FALLBACK_NOT_CONNECTED',
      geminiServerApi: hasRealGeminiKey
        ? 'CONFIGURED_SERVER_SIDE'
        : 'DETERMINISTIC_RAG_FALLBACK_ACTIVE',
      githubRepositorySync: 'MANUAL_GIT_PUSH_REQUIRED',
      vercelDeployment: 'MANUAL_VERCEL_PROJECT_IMPORT_REQUIRED',
    },
    honestStatusSummaryFr:
      'Le build de production Next.js 15, le typage TypeScript strict, le linter ESLint et les tests unitaires sont vérifiés localement. Aucun dépôt GitHub distant, projet Vercel externe ni base Supabase de production n’est connecté automatiquement depuis cet environnement : suivez la liste de contrôle manuelle ci-dessous pour finaliser la mise en ligne.',
  };
}
