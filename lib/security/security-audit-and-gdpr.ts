/**
 * FISCALIQ — Gouvernance de Sécurité en Production, Isolation des Données Personnelles & Ingénierie RGPD
 *
 * Ce module centralise :
 * 1. La limitation de débit (Rate Limiting) par route API et par foyer/IP
 * 2. La validation d'origine / protection CSRF sur les mutations serveur (POST / DELETE)
 * 3. L'isolation stricte des données fiscales entre foyers (prévention IDOR / Cross-Tenant)
 * 4. La minimisation des données personnelles (Art. 5-1-c RGPD) : détection et masquage automatique
 *    du NIR (numéro de sécurité sociale), du numéro fiscal SPI à 13 chiffres, des IBAN et mots de passe DGFiP
 * 5. La sécurité IA : détection d'injection de prompt directe et indirecte (documents malveillants),
 *    et vérification anti-hallucination des citations et domaines officiels autorisés
 * 6. L'exercice technique des droits RGPD (Art. 15 Accès, Art. 17 Effacement, Art. 20 Portabilité)
 * 7. Le rapport d'audit de sécurité (Critique / Élevé / Moyen / Faible), le criblage AIPD (Art. 35 RGPD)
 *    et la liste de contrôle avant mise en production (sans revendiquer de conformité juridique non vérifiée).
 */

import { NextRequest } from 'next/server';
import { OfficialPersonalTaxDocument } from '@/lib/ai/knowledge-base';
import {
  checkAndIncrementRateLimitSync,
  getSharedStoreBackend,
} from '@/lib/security/shared-store';

// ============================================================================
// 1. DOMAINES OFFICIELS AUTORISÉS (ANTI-FABRICATION DE CITATIONS & ANTI-SSRF/XSS)
// ============================================================================

export const ALLOWED_OFFICIAL_TAX_DOMAINS: readonly string[] = [
  'www.impots.gouv.fr',
  'impots.gouv.fr',
  'bofip.impots.gouv.fr',
  'www.service-public.fr',
  'service-public.fr',
  'entreprendre.service-public.fr',
  'www.economie.gouv.fr',
  'economie.gouv.fr',
  'www.legifrance.gouv.fr',
  'legifrance.gouv.fr',
  'www.urssaf.fr',
  'urssaf.fr',
] as const;

export interface CitationIntegrityCheckResult {
  valid: boolean;
  verifiedCount: number;
  rejectedUrls: string[];
  reasonFr: string;
}

/**
 * Vérifie qu'aucune citation retournée par l'assistant ou le moteur documentaire
 * ne pointe vers un domaine externe non officiel, un schéma dangereux (`javascript:`, `data:`)
 * ou une source non présente dans le registre vérifié (`APPROVED_VERIFIED`).
 */
export function verifyOfficialCitationIntegrity(
  citations: OfficialPersonalTaxDocument[]
): CitationIntegrityCheckResult {
  const rejectedUrls: string[] = [];

  for (const doc of citations) {
    if (doc.verificationStatus !== 'APPROVED_VERIFIED') {
      rejectedUrls.push(`${doc.id} (statut=${doc.verificationStatus})`);
      continue;
    }

    const urlsToInspect = [doc.sourceUrl, doc.officialUrl].filter(Boolean);
    for (const rawUrl of urlsToInspect) {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'https:') {
          rejectedUrls.push(rawUrl);
          continue;
        }
        const host = parsed.hostname.toLowerCase();
        const isAllowed = ALLOWED_OFFICIAL_TAX_DOMAINS.some(
          (domain) => host === domain || host.endsWith(`.${domain}`)
        );
        if (!isAllowed) {
          rejectedUrls.push(rawUrl);
        }
      } catch {
        rejectedUrls.push(rawUrl);
      }
    }
  }

  if (rejectedUrls.length > 0) {
    return {
      valid: false,
      verifiedCount: Math.max(0, citations.length - rejectedUrls.length),
      rejectedUrls,
      reasonFr:
        'Une ou plusieurs références ne respectent pas la liste blanche stricte des portails officiels français en HTTPS ou le statut APPROVED_VERIFIED.',
    };
  }

  return {
    valid: true,
    verifiedCount: citations.length,
    rejectedUrls: [],
    reasonFr:
      'Toutes les citations proviennent exclusivement du registre officiel vérifié (HTTPS + domaine public français autorisé).',
  };
}

// ============================================================================
// 2. MINIMISATION DES DONNÉES (ART. 5-1-c RGPD) & MASQUAGE DES IDENTIFIANTS SENSIBLES
// ============================================================================

export interface PiiMinimizationScanResult {
  containsExcessivePii: boolean;
  detectedCategories: Array<
    | 'NIR_SECURITE_SOCIALE'
    | 'NUMERO_FISCAL_SPI_13_CHIFFRES'
    | 'IBAN_COMPTE_BANCAIRE'
    | 'MOT_DE_PASSE_PORTAIL_FISCAL'
    | 'CARTE_BANCAIRE_PAN'
  >;
  redactedText: string;
  warningNoticeFr: string | null;
}

// Expressions régulières pour détecter les identifiants que FISCALIQ refuse de collecter
const NIR_REGEX = /\b[12]\s?\d{2}\s?(?:0[1-9]|1[0-2]|2[0-9])\s?(?:\d{2}|2[AB])\s?\d{3}\s?\d{3}(?:\s?\d{2})?\b/g;
const IBAN_FR_REGEX = /\bFR\s?\d{2}(?:\s?[0-9A-Z]{4}){5}\s?[0-9A-Z]{3}\b/gi;
const SPI_CONTEXT_REGEX = /(?:num[ée]ro\s+fiscal|spi|identifiant\s+impots)\s*[:=#-]?\s*(\d[\d\s]{11,14}\d)/gi;
const TAX_PASSWORD_REGEX = /(?:mot\s+de\s+passe\s+impots|code\s+secret\s+dgfip|password\s+impots\.gouv)\s*[:=]\s*\S+/gi;
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;

/**
 * Analyse et masque automatiquement les identifiants hautement sensibles non nécessaires
 * au calcul fiscal (NIR, numéro fiscal à 13 chiffres, IBAN, carte bancaire, mot de passe DGFiP)
 * avant tout traitement IA ou journalisation.
 */
export function enforceDataMinimizationOnInput(rawText: string): PiiMinimizationScanResult {
  let redacted = rawText;
  const detected = new Set<PiiMinimizationScanResult['detectedCategories'][number]>();

  if (NIR_REGEX.test(redacted)) {
    detected.add('NIR_SECURITE_SOCIALE');
    redacted = redacted.replace(NIR_REGEX, '[NIR_MASQUÉ_MINIMISATION_RGPD]');
  }
  NIR_REGEX.lastIndex = 0;

  if (IBAN_FR_REGEX.test(redacted)) {
    detected.add('IBAN_COMPTE_BANCAIRE');
    redacted = redacted.replace(IBAN_FR_REGEX, '[IBAN_MASQUÉ_MINIMISATION_RGPD]');
  }
  IBAN_FR_REGEX.lastIndex = 0;

  if (SPI_CONTEXT_REGEX.test(redacted)) {
    detected.add('NUMERO_FISCAL_SPI_13_CHIFFRES');
    redacted = redacted.replace(
      SPI_CONTEXT_REGEX,
      'numéro fiscal : [SPI_13_CHIFFRES_MASQUÉ_RGPD]'
    );
  }
  SPI_CONTEXT_REGEX.lastIndex = 0;

  if (TAX_PASSWORD_REGEX.test(redacted)) {
    detected.add('MOT_DE_PASSE_PORTAIL_FISCAL');
    redacted = redacted.replace(
      TAX_PASSWORD_REGEX,
      '[MOT_DE_PASSE_IMPOTS_GOUV_REFUSÉ_ET_MASQUÉ]'
    );
  }
  TAX_PASSWORD_REGEX.lastIndex = 0;

  // Vérification prudente des séquences de 16 chiffres ressemblant à une carte bancaire
  const cardMatches = redacted.match(CREDIT_CARD_REGEX) || [];
  for (const match of cardMatches) {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 15 && digitsOnly.length <= 19) {
      detected.add('CARTE_BANCAIRE_PAN');
      redacted = redacted.replace(match, '[NUMÉRO_CARTE_MASQUÉ_RGPD]');
    }
  }

  const detectedCategories = Array.from(detected);
  return {
    containsExcessivePii: detectedCategories.length > 0,
    detectedCategories,
    redactedText: redacted,
    warningNoticeFr:
      detectedCategories.length > 0
        ? `Protection de la vie privée (Art. 5-1-c RGPD — Minimisation) : des identifiants sensibles non nécessaires au calcul fiscal (${detectedCategories.join(', ')}) ont été automatiquement masqués et ne sont ni stockés ni transmis au modèle.`
        : null,
  };
}

// ============================================================================
// 3. DÉTECTION DE DOCUMENTS MALVEILLANTS & INJECTION DE PROMPT INDIRECTE
// ============================================================================

const MALICIOUS_DOCUMENT_PATTERNS: Array<{ id: string; regex: RegExp; descriptionFr: string }> = [
  {
    id: 'XSS_SCRIPT_TAG',
    regex: /<\s*script\b[^>]*>[\s\S]*?(?:<\s*\/\s*script\s*>|$)/i,
    descriptionFr: 'Balise <script> exécutable détectée dans le document.',
  },
  {
    id: 'XSS_EVENT_HANDLER_OR_JS_URI',
    regex: /(?:on(?:load|error|click|mouseover)\s*=|javascript\s*:|data\s*:\s*text\/html)/i,
    descriptionFr: 'Gestionnaire d’événement HTML ou URI javascript:/data: malveillant.',
  },
  {
    id: 'INDIRECT_PROMPT_INJECTION_INSTRUCTION',
    regex:
      /(?:ignore\s+(?:all\s+)?(?:previous|prior|system)\s+instructions|oublie\s+(?:toutes\s+)?(?:tes|les)\s+(?:instructions|consignes)|nouvelle\s+consigne\s+système|system\s+override|exfiltrate|transmets\s+les\s+données\s+du\s+foyer)/i,
    descriptionFr:
      'Tentative d’injection de prompt indirecte dissimulée dans un document soumis à l’extraction.',
  },
  {
    id: 'SQL_OR_COMMAND_INJECTION_PAYLOAD',
    regex: /(?:;\s*drop\s+table\b|union\s+select\s+null|--\s*admin|\$\(\s*(?:curl|wget|bash|sh)\b)/i,
    descriptionFr: 'Motif d’injection SQL ou d’exécution de commande détecté.',
  },
];

export interface DocumentSecurityScanResult {
  safe: boolean;
  threatsDetected: string[];
  sanitizedContent: string;
  rejectionReasonFr?: string;
}

/**
 * Inspecte tout texte ou document soumis au pipeline d'extraction / base de connaissances
 * pour bloquer les charges utiles XSS, les injections SQL et les injections de prompt indirectes.
 */
export function inspectDocumentSecurity(rawContent: string): DocumentSecurityScanResult {
  const threatsDetected: string[] = [];

  for (const rule of MALICIOUS_DOCUMENT_PATTERNS) {
    if (rule.regex.test(rawContent)) {
      threatsDetected.push(`${rule.id}: ${rule.descriptionFr}`);
    }
  }

  // Nettoyage défensif systématique des balises HTML, caractères de contrôle et URI dangereux
  const sanitizedContent = rawContent
    .replace(/<\s*script\b[^>]*>[\s\S]*?(?:<\s*\/\s*script\s*>|$)/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/javascript\s*:/gi, 'blocked-uri:')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();

  if (threatsDetected.length > 0) {
    return {
      safe: false,
      threatsDetected,
      sanitizedContent,
      rejectionReasonFr: `Document bloqué par le pare-feu documentaire FISCALIQ : ${threatsDetected.join(' | ')}`,
    };
  }

  return {
    safe: true,
    threatsDetected: [],
    sanitizedContent,
  };
}

// ============================================================================
// 4. LIMITATION DE DÉBIT UNIFIÉE (RATE LIMITING PAR ROUTE API)
// ============================================================================

export type ApiEndpointCategory =
  | 'AI_ASSISTANT'
  | 'TAX_CALCULATOR'
  | 'PDF_REPORTS'
  | 'KNOWLEDGE_BASE_READ'
  | 'KNOWLEDGE_BASE_ADMIN'
  | 'GDPR_PRIVACY_RIGHTS';

interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
}

export const API_RATE_LIMIT_POLICIES: Record<ApiEndpointCategory, RateLimitPolicy> = {
  AI_ASSISTANT: { windowMs: 60_000, maxRequests: 18 },
  TAX_CALCULATOR: { windowMs: 60_000, maxRequests: 60 },
  PDF_REPORTS: { windowMs: 60_000, maxRequests: 25 },
  KNOWLEDGE_BASE_READ: { windowMs: 60_000, maxRequests: 60 },
  KNOWLEDGE_BASE_ADMIN: { windowMs: 60_000, maxRequests: 15 },
  GDPR_PRIVACY_RIGHTS: { windowMs: 60_000, maxRequests: 15 },
};

export function enforceApiRateLimit(params: {
  category: ApiEndpointCategory;
  clientIdentifier: string;
}): {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInSeconds: number;
} {
  const { category, clientIdentifier } = params;
  const policy = API_RATE_LIMIT_POLICIES[category];
  const key = `${category}:${clientIdentifier}`;

  return checkAndIncrementRateLimitSync({
    key,
    windowMs: policy.windowMs,
    maxRequests: policy.maxRequests,
  });
}

export function extractClientIdentifier(req: NextRequest, householdId?: string): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? 'local';
  const ip = forwarded.split(',')[0]?.trim() || 'local';
  return `${ip}:${householdId || 'anon'}`;
}

// ============================================================================
// 5. PROTECTION CSRF / VÉRIFICATION D'ORIGINE SUR LES MUTATIONS (POST / DELETE)
// ============================================================================

export function verifyRequestOriginAndCsrf(req: NextRequest): {
  allowed: boolean;
  reasonFr?: string;
} {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { allowed: true };
  }

  // En-tête Fetch Metadata moderne : bloque explicitement les requêtes cross-site forgées par un site tiers
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite.toLowerCase() === 'cross-site') {
    return {
      allowed: false,
      reasonFr:
        'Requête bloquée par la protection anti-CSRF (en-tête Sec-Fetch-Site: cross-site interdit sur les mutations).',
    };
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      const normalizedHost = host.split(':')[0]?.toLowerCase();
      const originHost = originUrl.hostname.toLowerCase();
      if (
        normalizedHost &&
        originHost !== normalizedHost &&
        originHost !== 'localhost' &&
        originHost !== '127.0.0.1' &&
        !originHost.endsWith('.run.app')
      ) {
        return {
          allowed: false,
          reasonFr: `Requête bloquée par la protection anti-CSRF : l’origine (${originHost}) ne correspond pas à l’hôte autorisé (${normalizedHost}).`,
        };
      }
    } catch {
      return {
        allowed: false,
        reasonFr: 'En-tête Origin mal formé rejeté par la protection anti-CSRF.',
      };
    }
  }

  return { allowed: true };
}

// ============================================================================
// 6. VÉRIFICATION CENTRALISÉE DE L'ISOLATION DES DONNÉES DU FOYER FISCAL
// ============================================================================

export function verifyHouseholdDataIsolation(params: {
  authenticatedHouseholdId: string | null | undefined;
  targetHouseholdId: string | null | undefined;
  requireNonEmpty?: boolean;
}): {
  authorized: boolean;
  httpStatus: 200 | 401 | 403;
  errorFr?: string;
} {
  const authId = (params.authenticatedHouseholdId || '').trim();
  const targetId = (params.targetHouseholdId || '').trim();
  const requireNonEmpty = params.requireNonEmpty ?? true;

  if (requireNonEmpty && (!authId || !targetId)) {
    return {
      authorized: false,
      httpStatus: 403,
      errorFr:
        'Accès refusé (403) : identifiant de session du foyer fiscal manquant. Toute opération sur des données fiscales personnelles requiert un foyer authentifié explicite.',
    };
  }

  if (authId !== targetId) {
    return {
      authorized: false,
      httpStatus: 403,
      errorFr:
        'Accès refusé (403) : violation d’isolation des données personnelles détectée. Un utilisateur ne peut jamais accéder aux revenus, à la composition familiale, aux conversations ni aux rapports d’un autre foyer fiscal.',
    };
  }

  return {
    authorized: true,
    httpStatus: 200,
  };
}

// ============================================================================
// 7. REGISTRE D'AUDIT DE SÉCURITÉ, CRIBLAGE AIPD (DPIA) & LISTE DE CONTRÔLE RGPD
// ============================================================================

export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SecurityAuditFinding {
  id: string;
  severity: SecuritySeverity;
  category:
    | 'ISOLATION_DONNEES_FOYER'
    | 'AUTHENTIFICATION_ET_AUTORISATION'
    | 'STOCKAGE_PRIVE_ET_CRYPTOGRAPHIE'
    | 'SECURITE_IA_ET_CITATIONS'
    | 'PROTECTION_API_CSRF_RATE_LIMIT'
    | 'MINIMISATION_RGPD_ET_VIE_PRIVEE'
    | 'DEPENDANCES_ET_CONFIGURATION';
  titleFr: string;
  descriptionFr: string;
  status: 'REMEDIATED_VERIFIED' | 'ARCHITECTURAL_PREPARATION_REQUIRED_BEFORE_LIVE_PROD';
  remediationAppliedFr: string;
  affectedFiles: string[];
}

export const SECURITY_AUDIT_FINDINGS_REGISTRY: SecurityAuditFinding[] = [
  {
    id: 'SEC-CRIT-01',
    severity: 'CRITICAL',
    category: 'ISOLATION_DONNEES_FOYER',
    titleFr:
      'Dérivation de l’identité du foyer exclusivement depuis une session serveur vérifiée (refus des en-têtes et identifiants non vérifiés)',
    descriptionFr:
      'Les routes API ne doivent jamais faire confiance à l’en-tête `x-authenticated-household-id` ni aux identifiants transmis dans le corps de la requête (`authenticatedHouseholdId`, `targetHouseholdId`).',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : `resolveVerifiedHouseholdSession` dérive le foyer depuis un jeton ou cookie de session signé HMAC-SHA256 côté serveur et rejette avec HTTP 403 toute divergence avec la cible demandée.',
    affectedFiles: [
      'lib/security/session-auth.ts',
      'app/api/reports/route.ts',
      'app/api/reports/download/route.ts',
      'app/api/security-audit/route.ts',
      'app/api/ai/assistant/route.ts',
    ],
  },
  {
    id: 'SEC-HIGH-01',
    severity: 'HIGH',
    category: 'AUTHENTIFICATION_ET_AUTORISATION',
    titleFr:
      'Refus par défaut sur `/api/ai/knowledge-base` POST et filtrage strict des sources non approuvées en GET pour les non-administrateurs',
    descriptionFr:
      'La route `/api/ai/knowledge-base` ne doit jamais accorder de rôle administrateur par défaut via un en-tête client et ne doit retourner que les sources `APPROVED_VERIFIED` aux utilisateurs non administrateurs.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : suppression de l’en-tête par défaut `x-fiscaliq-admin-role`, vérification stricte via `verifyAdminSession` (refus 403 par défaut en POST) et filtrage `includeNonApproved: adminSession.authorized` en GET.',
    affectedFiles: [
      'app/api/ai/knowledge-base/route.ts',
      'lib/security/session-auth.ts',
    ],
  },
  {
    id: 'SEC-HIGH-02',
    severity: 'HIGH',
    category: 'STOCKAGE_PRIVE_ET_CRYPTOGRAPHIE',
    titleFr:
      'Obligation stricte de `FISCALIQ_REPORT_SIGNING_SECRET` en production et comparaison HMAC en temps constant (`timingSafeEqual`)',
    descriptionFr:
      'Aucun secret HMAC codé en dur ne doit subsister en production pour signer les liens PDF temporaires.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : suppression du secret de secours codé en dur, arrêt immédiat au démarrage en production si `FISCALIQ_REPORT_SIGNING_SECRET` (< 32 caractères) est absent, et vérification `crypto.timingSafeEqual`.',
    affectedFiles: [
      'lib/reports/pdf-report-service.ts',
      'app/api/reports/download/route.ts',
    ],
  },
  {
    id: 'SEC-HIGH-03',
    severity: 'HIGH',
    category: 'SECURITE_IA_ET_CITATIONS',
    titleFr:
      'Minimisation automatique des identifiants sensibles (NIR, SPI, IBAN) et validation stricte des domaines officiels cités',
    descriptionFr:
      'Un utilisateur pouvait saisir par inadvertance son numéro de sécurité sociale (NIR), son numéro fiscal SPI à 13 chiffres ou son IBAN dans une question adressée à l’Assistant IA.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : `enforceDataMinimizationOnInput` masque automatiquement les NIR, SPI à 13 chiffres, IBAN, numéros de carte et mots de passe fiscaux avant tout traitement, et `verifyOfficialCitationIntegrity` vérifie les URLs HTTPS officielles.',
    affectedFiles: [
      'lib/security/security-audit-and-gdpr.ts',
      'lib/ai/gemini-service.ts',
    ],
  },
  {
    id: 'SEC-MED-01',
    severity: 'MEDIUM',
    category: 'PROTECTION_API_CSRF_RATE_LIMIT',
    titleFr:
      'En-tête `Content-Security-Policy`, validation CSRF, désactivation de `SWITCH_PLAN_SIMULATION` en production et magasin partagé Upstash/Supabase',
    descriptionFr:
      'Les changements d’abonnement ne doivent intervenir qu’après un webhook de paiement vérifié, la CSP doit être active dans `next.config.ts`, et la limitation de débit / abonnements doivent utiliser un magasin partagé.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : `Content-Security-Policy` et `eslint.ignoreDuringBuilds: false` dans `next.config.ts`, suppression de `SWITCH_PLAN_SIMULATION` au profit de `applyVerifiedPaymentWebhook`, et adaptateur `shared-store.ts` (Upstash Redis / Supabase PostgreSQL).',
    affectedFiles: [
      'next.config.ts',
      'lib/security/shared-store.ts',
      'lib/subscriptions/entitlements.ts',
      'app/api/reports/route.ts',
    ],
  },
  {
    id: 'SEC-LOW-01',
    severity: 'LOW',
    category: 'DEPENDANCES_ET_CONFIGURATION',
    titleFr:
      'Branchement des variables d’environnement externes (Supabase PostgreSQL / Upstash Redis) requis en déploiement de production',
    descriptionFr:
      'Tant que les variables `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `UPSTASH_REDIS_REST_URL` ne sont pas renseignées dans l’environnement d’hébergement, le profil utilisateur est stocké dans `localStorage` et les compteurs serveur utilisent le magasin mémoire local de développement.',
    status: 'ARCHITECTURAL_PREPARATION_REQUIRED_BEFORE_LIVE_PROD',
    remediationAppliedFr:
      'L’adaptateur `lib/security/shared-store.ts` bascule automatiquement vers Upstash Redis ou Supabase PostgreSQL dès que les clés d’environnement sont configurées.',
    affectedFiles: ['lib/security/shared-store.ts', 'lib/supabase/config.ts', '.env.example'],
  },
];

export interface GdprRequirementChecklistItem {
  id: string;
  gdprArticle: string;
  requirementTitleFr: string;
  technicalImplementationStatus: 'IMPLEMENTED_IN_CODE' | 'REQUIRES_LEGAL_AND_DPO_SIGN_OFF';
  detailsFr: string;
}

export const GDPR_IMPLEMENTATION_CHECKLIST: GdprRequirementChecklistItem[] = [
  {
    id: 'GDPR-01',
    gdprArticle: 'Art. 5-1-c RGPD (Minimisation des données)',
    requirementTitleFr:
      'Collecte strictement limitée aux paramètres nécessaires au calcul de l’impôt',
    technicalImplementationStatus: 'IMPLEMENTED_IN_CODE',
    detailsFr:
      'Aucun champ ne demande le NIR, le numéro fiscal SPI à 13 chiffres, l’IBAN, l’adresse postale exacte ni le mot de passe impots.gouv.fr. Le filtre `enforceDataMinimizationOnInput` masque automatiquement ces identifiants dans les champs libres.',
  },
  {
    id: 'GDPR-02',
    gdprArticle: 'Art. 17 RGPD (Effacement local et purge des rapports de session)',
    requirementTitleFr:
      'Bouton « Effacer mes données » (localStorage) et purge des rapports PDF générés en session',
    technicalImplementationStatus: 'IMPLEMENTED_IN_CODE',
    detailsFr:
      'Les nouveaux visiteurs démarrent avec un profil vierge. Le profil et les simulations sont enregistrés localement dans le navigateur (`localStorage`) et effaçables immédiatement via « Effacer mes données ». Les rapports PDF en session sont purgés via `/api/security-audit`.',
  },
  {
    id: 'GDPR-03',
    gdprArticle: 'Art. 32 RGPD (Sécurité applicative active dans le code)',
    requirementTitleFr:
      'Session serveur signée HMAC-SHA256, CSP, anti-CSRF et filtrage des sources officielles',
    technicalImplementationStatus: 'IMPLEMENTED_IN_CODE',
    detailsFr:
      'En-têtes `Content-Security-Policy`, vérification d’origine CSRF (`Sec-Fetch-Site` / `Origin`), signature HMAC-SHA256 (`timingSafeEqual`) sur les liens PDF (TTL 15 min) et accès restreint aux sources approuvées (`APPROVED_VERIFIED`).',
  },
  {
    id: 'GDPR-04',
    gdprArticle: 'Art. 28, 30 & 35 RGPD (Hébergement de production, DPA et AIPD)',
    requirementTitleFr:
      'Configuration de production Supabase / Upstash Redis, contrats sous-traitants (DPA) et validation DPO',
    technicalImplementationStatus: 'REQUIRES_LEGAL_AND_DPO_SIGN_OFF',
    detailsFr:
      'En l’absence de clés externes configurées, l’application fonctionne en mode local sans base de données externe active. Avant ouverture commerciale : configurer Supabase PostgreSQL/Storage (UE) et Upstash Redis, signer les DPA (Art. 28) et faire valider l’AIPD (Art. 35) par un DPO.',
  },
];

export function getSecurityAuditSummary() {
  const counts = {
    criticalOpen: SECURITY_AUDIT_FINDINGS_REGISTRY.filter(
      (f) => f.severity === 'CRITICAL' && f.status !== 'REMEDIATED_VERIFIED'
    ).length,
    criticalRemediated: SECURITY_AUDIT_FINDINGS_REGISTRY.filter(
      (f) => f.severity === 'CRITICAL' && f.status === 'REMEDIATED_VERIFIED'
    ).length,
    highRemediated: SECURITY_AUDIT_FINDINGS_REGISTRY.filter(
      (f) => f.severity === 'HIGH' && f.status === 'REMEDIATED_VERIFIED'
    ).length,
    mediumRemediated: SECURITY_AUDIT_FINDINGS_REGISTRY.filter(
      (f) => f.severity === 'MEDIUM' && f.status === 'REMEDIATED_VERIFIED'
    ).length,
    lowOpenArchitectural: SECURITY_AUDIT_FINDINGS_REGISTRY.filter(
      (f) => f.severity === 'LOW'
    ).length,
  };

  return {
    auditDateIso: '2026-11-11',
    sharedStoreBackend: getSharedStoreBackend(),
    scope:
      'Sécurité applicative, sessions signées, CSP, base de connaissances et transparence RGPD',
    counts,
    findings: SECURITY_AUDIT_FINDINGS_REGISTRY,
    gdprChecklist: GDPR_IMPLEMENTATION_CHECKLIST,
    productionReadinessStatementFr:
      'Les contrôles de sécurité applicatifs (sessions vérifiées, refus par défaut sur l’administration de la base de connaissances, secret HMAC obligatoire en production, CSP et validation ESLint au build) sont actifs. La persistance base de données externe et la validation juridique RGPD dépendent de la configuration de production.',
  };
}
