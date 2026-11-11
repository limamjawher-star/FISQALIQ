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

const globalForRateLimits = globalThis as unknown as {
  __fiscaliqUnifiedRateLimitStore?: Map<string, number[]>;
};

const unifiedRateLimitStore =
  globalForRateLimits.__fiscaliqUnifiedRateLimitStore ??
  (globalForRateLimits.__fiscaliqUnifiedRateLimitStore = new Map<string, number[]>());

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
  const now = Date.now();

  const existing = unifiedRateLimitStore.get(key) ?? [];
  const validTimestamps = existing.filter((ts) => now - ts < policy.windowMs);

  if (validTimestamps.length >= policy.maxRequests) {
    const oldest = validTimestamps[0] ?? now;
    const resetInSeconds = Math.max(
      1,
      Math.ceil((policy.windowMs - (now - oldest)) / 1000)
    );
    unifiedRateLimitStore.set(key, validTimestamps);
    return {
      allowed: false,
      remaining: 0,
      limit: policy.maxRequests,
      resetInSeconds,
    };
  }

  validTimestamps.push(now);
  unifiedRateLimitStore.set(key, validTimestamps);

  return {
    allowed: true,
    remaining: Math.max(0, policy.maxRequests - validTimestamps.length),
    limit: policy.maxRequests,
    resetInSeconds: Math.ceil(policy.windowMs / 1000),
  };
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
      'Obligation stricte de concordance entre l’identifiant de session authentifié et le profil fiscal transmis à l’Assistant IA',
    descriptionFr:
      'Avant correction, si un appel API à /api/tax-assistant ou /api/ai/assistant omettait le champ `authorizedHouseholdId` tout en fournissant un objet `householdContext`, la fonction `resolveAuthorizedHouseholdSnapshot` pouvait accepter le contexte sans preuve de concordance avec l’en-tête d’authentification.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : `resolveAuthorizedHouseholdSnapshot` exige désormais que `authorizedHouseholdId` soit non vide et strictement égal à `householdContext.householdId`, et les routes `/api/tax-assistant` et `/api/ai/assistant` bloquent avec un code HTTP 403 toute divergence avec l’en-tête `x-authenticated-household-id`.',
    affectedFiles: [
      'lib/ai/gemini-service.ts',
      'app/api/tax-assistant/route.ts',
      'app/api/ai/assistant/route.ts',
    ],
  },
  {
    id: 'SEC-HIGH-01',
    severity: 'HIGH',
    category: 'AUTHENTIFICATION_ET_AUTORISATION',
    titleFr:
      'Protection des actions d’administration de la base de connaissances fiscale (/api/ai/knowledge-base) et filtrage des documents soumis',
    descriptionFr:
      'Les actions POST d’administration (`APPROVE`, `REJECT`, `ARCHIVE`, `UPDATE_NEW_VERSION`, `RESET`) et l’inspecteur d’extraction documentaire devaient vérifier l’autorisation du rôle administrateur, appliquer une limitation de débit et analyser les textes contre l’injection de prompt indirecte et les balises XSS.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : contrôle d’autorisation administrateur (`x-fiscaliq-admin-role`), limitation de débit (`KNOWLEDGE_BASE_ADMIN`), protection anti-CSRF et pare-feu documentaire `inspectDocumentSecurity` actifs sur `/api/ai/knowledge-base`.',
    affectedFiles: [
      'app/api/ai/knowledge-base/route.ts',
      'lib/ai/knowledge-base.ts',
      'lib/security/security-audit-and-gdpr.ts',
    ],
  },
  {
    id: 'SEC-HIGH-02',
    severity: 'HIGH',
    category: 'STOCKAGE_PRIVE_ET_CRYPTOGRAPHIE',
    titleFr:
      'Comparaison cryptographique en temps constant (`timingSafeEqual`) et en-têtes de sécurité sur les téléchargements PDF signés',
    descriptionFr:
      'La vérification de signature HMAC-SHA256 des liens de téléchargement temporaires utilisait une comparaison de chaînes standard (`!==`) potentiellement exposée aux attaques temporelles, et la réponse binaire PDF devait inclure des en-têtes `X-Content-Type-Options: nosniff` et `Content-Security-Policy: sandbox`.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : utilisation de `crypto.timingSafeEqual` sur les empreintes HMAC-SHA256 dans `verifySignedDownloadToken` et ajout des en-têtes `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src \'none\'; sandbox` et `Referrer-Policy: no-referrer` sur `/api/reports/download`.',
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
      'Un contribuable particulier pouvait saisir par inadvertance son numéro de sécurité sociale (NIR), son numéro fiscal SPI à 13 chiffres ou son IBAN dans une question adressée à l’Assistant IA.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : `enforceDataMinimizationOnInput` masque automatiquement les NIR, SPI à 13 chiffres, IBAN, numéros de carte et mots de passe fiscaux avant tout traitement, et `verifyOfficialCitationIntegrity` garantit que seules des URLs HTTPS des portails officiels français (`impots.gouv.fr`, `bofip.impots.gouv.fr`, `service-public.fr`, `economie.gouv.fr`, `legifrance.gouv.fr`) au statut `APPROVED_VERIFIED` sont restituées.',
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
      'Généralisation de la limitation de débit (Rate Limiting), de la validation CSRF et des en-têtes HTTP de sécurité',
    descriptionFr:
      'La limitation de débit devait être étendue à l’ensemble des routes API (`/api/calculations`, `/api/reports`, `/api/reports/download`, `/api/ai/knowledge-base`) avec vérification `Sec-Fetch-Site` / `Origin` et en-têtes HTTP globaux.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : `enforceApiRateLimit` et `verifyRequestOriginAndCsrf` déployés sur toutes les routes API, et en-têtes de sécurité configurés dans `next.config.ts`.',
    affectedFiles: [
      'next.config.ts',
      'app/api/calculations/route.ts',
      'app/api/reports/route.ts',
      'app/api/reports/download/route.ts',
    ],
  },
  {
    id: 'SEC-MED-02',
    severity: 'MEDIUM',
    category: 'MINIMISATION_RGPD_ET_VIE_PRIVEE',
    titleFr:
      'Isolement de l’historique de conversation IA lors du changement de foyer fiscal et mécanisme d’exercice des droits RGPD (Art. 15, 17, 20)',
    descriptionFr:
      'Le changement de profil de foyer dans l’interface devait purger ou isoler les échanges de l’Assistant IA par foyer, et les utilisateurs devaient disposer d’une fonction effective d’export (Art. 15/20) et d’effacement immédiat (Art. 17) de leurs rapports et données.',
    status: 'REMEDIATED_VERIFIED',
    remediationAppliedFr:
      'Correction appliquée : historique de conversation indexé par `activeHousehold.id` dans `/app/ai-assistant/page.tsx` et route serveur `/api/security-audit` permettant l’export JSON structuré (Art. 15/20) et la purge immédiate des rapports PDF et compteurs (Art. 17).',
    affectedFiles: [
      'app/ai-assistant/page.tsx',
      'app/api/security-audit/route.ts',
      'app/settings/page.tsx',
      'app/privacy/page.tsx',
    ],
  },
  {
    id: 'SEC-LOW-01',
    severity: 'LOW',
    category: 'DEPENDANCES_ET_CONFIGURATION',
    titleFr:
      'Persistance en mémoire de démonstration vs connexion Supabase Auth / PostgreSQL RLS en production réelle',
    descriptionFr:
      'Dans cet environnement d’aperçu, les foyers et coffres-forts de rapports sont gérés en mémoire côté serveur (`mode: demo_in_memory`) tant que les variables `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` ne pointent pas vers une instance Supabase de production.',
    status: 'ARCHITECTURAL_PREPARATION_REQUIRED_BEFORE_LIVE_PROD',
    remediationAppliedFr:
      'Les schémas SQL DDL complets avec politiques RLS (`auth.uid() = user_id`), révocation des droits anonymes (`REVOKE ALL FROM anon`) et compartiment privé Supabase Storage sont prêts dans `lib/supabase/config.ts`. Une revue juridique du DPO et le branchement Supabase Auth (JWT + MFA) restent requis avant ouverture commerciale.',
    affectedFiles: ['lib/supabase/config.ts', '.env.example'],
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
      'Aucun champ ne demande le NIR, le numéro fiscal SPI à 13 chiffres, l’IBAN, l’adresse postale exacte ni le mot de passe impots.gouv.fr. Le filtre `enforceDataMinimizationOnInput` masque automatiquement ces identifiants s’ils sont saisis dans un champ libre.',
  },
  {
    id: 'GDPR-02',
    gdprArticle: 'Art. 6-1 RGPD (Bases légales du traitement)',
    requirementTitleFr: 'Définition granulaire des bases légales par finalité',
    technicalImplementationStatus: 'REQUIRES_LEGAL_AND_DPO_SIGN_OFF',
    detailsFr:
      'Exécution contractuelle/précontractuelle (Art. 6-1-b) pour les simulateurs et rapports PDF ; consentement explicite révocable par case à cocher (Art. 6-1-a) pour l’inclusion du profil du foyer dans une question à l’Assistant IA ; intérêt légitime (Art. 6-1-f) limité à la sécurité anti-abus (Rate Limiting). Validation formelle du registre des activités de traitement (Art. 30) par un DPO requise.',
  },
  {
    id: 'GDPR-03',
    gdprArticle: 'Art. 13 & 14 RGPD (Transparence et information des personnes)',
    requirementTitleFr:
      'Politique de confidentialité claire en français accessible aux particuliers',
    technicalImplementationStatus: 'IMPLEMENTED_IN_CODE',
    detailsFr:
      'Notice complète publiée sur `/privacy` détaillant les finalités, la minimisation, l’isolation par foyer, les durées de conservation, les sous-traitants, l’absence de revente des données et les modalités d’exercice des droits.',
  },
  {
    id: 'GDPR-04',
    gdprArticle: 'Art. 15, 17 & 20 RGPD (Droits d’accès, d’effacement et de portabilité)',
    requirementTitleFr:
      'Mécanisme libre-service d’export JSON (Art. 15/20) et de suppression immédiate des rapports et données (Art. 17)',
    technicalImplementationStatus: 'IMPLEMENTED_IN_CODE',
    detailsFr:
      'Disponible via `/api/security-audit` et dans `/settings` (onglet Audit Sécurité & Droits RGPD) : export structuré des données du foyer authentifié et purge immédiate des rapports PDF stockés dans le coffre privé.',
  },
  {
    id: 'GDPR-05',
    gdprArticle: 'Art. 5-1-e RGPD (Limitation de la conservation)',
    requirementTitleFr:
      'Politique de rétention et d’expiration automatique des fichiers et journaux',
    technicalImplementationStatus: 'IMPLEMENTED_IN_CODE',
    detailsFr:
      'Liens signés de téléchargement PDF limités à 15 minutes (900 s), purge immédiate à la demande (Art. 17), conservation SQL prévue à 30 jours pour les rapports temporaires et conversations IA (`expires_at`), et 90 jours pour les journaux de sécurité pseudonymisés.',
  },
  {
    id: 'GDPR-06',
    gdprArticle: 'Art. 28 & Chapitre V RGPD (Sous-traitants et transferts internationaux)',
    requirementTitleFr:
      'Encadrement contractuel (DPA) et localisation européenne prioritaire des données',
    technicalImplementationStatus: 'REQUIRES_LEGAL_AND_DPO_SIGN_OFF',
    detailsFr:
      'Architecture préparée pour Supabase PostgreSQL / Storage en région UE (`eu-west-1` / `eu-central-1`) et Google Cloud / Gemini API côté serveur (`europe-west1`). Avant mise en production, signature des accords de sous-traitance (DPA Art. 28) et vérification des Clauses Contractuelles Types (CCT) / EU-US Data Privacy Framework obligatoires.',
  },
  {
    id: 'GDPR-07',
    gdprArticle: 'Art. 32 RGPD (Sécurité du traitement)',
    requirementTitleFr:
      'Isolation Row-Level Security (`auth.uid() = user_id`), chiffrement et contrôle d’accès serveur',
    technicalImplementationStatus: 'IMPLEMENTED_IN_CODE',
    detailsFr:
      'Isolation stricte entre foyers vérifiée par tests automatisés (`403 Forbidden`), signature HMAC-SHA256 vérifiée par `crypto.timingSafeEqual`, aucun secret exposé côté client et révocation des privilèges SQL `anon` sur les tables personnelles.',
  },
  {
    id: 'GDPR-08',
    gdprArticle: 'Art. 35 RGPD & Lignes directrices CNIL (Criblage AIPD / DPIA)',
    requirementTitleFr:
      'Criblage d’Analyse d’Impact relative à la Protection des Données (AIPD)',
    technicalImplementationStatus: 'REQUIRES_LEGAL_AND_DPO_SIGN_OFF',
    detailsFr:
      'Criblage effectué selon les 9 critères CNIL/CEPD : traitement de données financières personnelles et d’évaluation patrimoniale combiné à l’usage d’un modèle d’IA documentaire. Bien que FISCALIQ ne prenne aucune décision produisant des effets juridiques automatisés (Art. 22 RGPD), la réalisation et la validation d’une AIPD formelle par le responsable de traitement et son DPO sont requises avant ouverture publique.',
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
    auditDateIso: '2026-11-10',
    scope:
      'Données fiscales personnelles des particuliers et foyers (Revenus, Quotient familial, Salaires, Déclaration 2042, Assistant IA, Rapports PDF privés, Abonnements)',
    counts,
    findings: SECURITY_AUDIT_FINDINGS_REGISTRY,
    gdprChecklist: GDPR_IMPLEMENTATION_CHECKLIST,
    productionReadinessStatementFr:
      'Toutes les vulnérabilités critiques, élevées et moyennes identifiées dans le code applicatif ont été corrigées et vérifiées par des tests automatisés (0 vulnérabilité critique ouverte). Conformément aux règles d’ingénierie responsable, FISCALIQ ne revendique pas de certification juridique RGPD définitive tant que l’instance Supabase PostgreSQL de production (UE), les contrats sous-traitants (DPA Art. 28) et l’AIPD formelle (Art. 35) n’ont pas été validés par un DPO ou un cabinet d’avocats.',
  };
}
