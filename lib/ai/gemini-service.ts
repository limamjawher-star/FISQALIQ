/**
 * FISCALIQ — Service Serveur de l'Assistant Fiscal Personnel (Particuliers & Foyers)
 *
 * Exécuté exclusivement côté serveur :
 * - SDK '@google/genai' avec modèle 'gemini-3.8-flash' et en-tête 'User-Agent': 'aistudio-build'
 * - Recherche documentaire obligatoire (RAG) filtrée par millésime fiscal (2026 / 2025) et date d'effet
 * - Calculs numériques 100 % déterministes via lib/calculations/personal-tax-engine.ts
 * - Isolation stricte des données du foyer autorisé (aucune exposition de données d'un autre profil)
 * - Défenses contre l'injection de prompt, limitation de débit (rate limiting) et validation Zod
 */

import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  ExplainedTerm,
  OfficialLegalReference,
  OfficialPersonalTaxDocument,
  retrievePersonalTaxReferences,
  retrieveRelevantReferences,
} from './knowledge-base';
import {
  calculateDetailedPersonalSalary,
  calculatePersonalIncomeTax,
} from '@/lib/calculations/personal-tax-engine';
import { calculateCorporateTax } from '@/lib/calculations/engine';
import { personalTaxAssistantStructuredModelSchema } from '@/lib/validation/schemas';
import {
  enforceDataMinimizationOnInput,
  verifyOfficialCitationIntegrity,
} from '@/lib/security/security-audit-and-gdpr';

// ============================================================================
// 1. LIMITATION DE DÉBIT (SLIDING-WINDOW RATE LIMITER CÔTÉ SERVEUR)
// ============================================================================

interface RateLimitBucket {
  timestamps: number[];
}

const RATE_LIMIT_WINDOW_MS = 60_000; // Fenêtre de 60 secondes
const RATE_LIMIT_MAX_REQUESTS = 18; // Max 18 requêtes par minute par session/client
const rateLimitStore = new Map<string, RateLimitBucket>();

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInSeconds: number;
}

export function checkAssistantRateLimit(clientKey: string): RateLimitStatus {
  const now = Date.now();
  const bucket = rateLimitStore.get(clientKey) ?? { timestamps: [] };
  const validTimestamps = bucket.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = validTimestamps[0] ?? now;
    const resetInSeconds = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)
    );
    rateLimitStore.set(clientKey, { timestamps: validTimestamps });
    return {
      allowed: false,
      remaining: 0,
      limit: RATE_LIMIT_MAX_REQUESTS,
      resetInSeconds,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(clientKey, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - validTimestamps.length),
    limit: RATE_LIMIT_MAX_REQUESTS,
    resetInSeconds: 60,
  };
}

// ============================================================================
// 2. DÉFENSE CONTRE L'INJECTION DE PROMPT & PROTECTION DES DONNÉES
// ============================================================================

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /oublie\s+(toutes\s+)?(tes|les)\s+(instructions|règles|consignes)/i,
  /ignore\s+(toutes\s+)?(tes|les)\s+(instructions|règles|consignes)/i,
  /system\s*prompt/i,
  /jailbreak/i,
  /invente\s+une\s+(loi|règle|déduction|niche)/i,
  /donne[-\s]moi\s+les\s+données\s+d['’]un\s+autre\s+(utilisateur|foyer|client)/i,
  /affiche\s+les\s+(autres\s+utilisateurs|clés?\s+api|secrets?)/i,
  /GEMINI_API_KEY/i,
  /<script[\s>]/i,
];

export interface PromptSecurityCheckResult {
  safe: boolean;
  reason?: string;
  sanitizedQuestion: string;
}

export function inspectPromptSecurity(rawQuestion: string): PromptSecurityCheckResult {
  const trimmed = rawQuestion.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason:
          'Tentative de contournement des règles de sécurité ou d’accès non autorisé détectée.',
        sanitizedQuestion: trimmed.slice(0, 300),
      };
    }
  }

  return {
    safe: true,
    sanitizedQuestion: trimmed,
  };
}

// ============================================================================
// 3. INTERFACES DE L'ASSISTANT FISCAL PERSONNEL
// ============================================================================

export interface PersonalAssistantHouseholdContext {
  householdId: string;
  householdName: string;
  maritalStatus:
    | 'celibataire'
    | 'marie_pacse'
    | 'parent_isole'
    | 'divorce_separe'
    | 'veuf';
  dependantsCount: number;
  isIsolatedParent?: boolean;
  annualDeclaredSalaryNetImposableEur: number;
  additionalNetTaxableIncomeEur?: number;
  grossMonthlySalaryEur?: number;
  employmentCategory?:
    | 'salarie_non_cadre'
    | 'salarie_cadre'
    | 'fonction_publique'
    | 'non_cadre'
    | 'cadre'
    | 'retraite'
    | 'independant';
  perContributionAnnualEur?: number;
  estimatedEligibleTaxCreditsEur?: number;
}

export interface PersonalAssistantQueryInput {
  question: string;
  taxYear?: 2026 | 2025;
  effectiveDate?: string;
  useHouseholdProfile?: boolean;
  authorizedHouseholdId?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  householdContext?: PersonalAssistantHouseholdContext;
}

export interface DeterministicPersonalCalculationSnapshot {
  profileUsed: boolean;
  profileLabel: string;
  taxYear: 2026 | 2025;
  familyQuotientParts: number;
  netTaxableIncomeEur: number;
  grossTaxBeforeDecoteEur: number;
  decoteAppliedEur: number;
  familyQuotientCapReductionLostEur: number;
  estimatedNetIncomeTaxEur: number;
  marginalTaxRatePercent: number;
  averageTaxRatePercent: number;
  estimatedWithholdingRatePercent: number;
  monthlyNetBeforeTaxEur?: number;
  monthlyNetTaxableEur?: number;
  monthlyWithholdingAmountEur?: number;
  monthlyNetAfterTaxEur?: number;
  standard10PctDeductionEur: number;
}

export interface PersonalTaxAssistantResponsePayload {
  answerMarkdown: string;
  structured: {
    directAnswer: string;
    verifiedLegalFacts: string[];
    assumptionsAndLimits: string[];
    personalRecommendations: string[];
    explainedTerms: ExplainedTerm[];
    simpleExample: string;
    clarifyingQuestions: string[];
    insufficientInformationNotice: string | null;
  };
  citations: OfficialPersonalTaxDocument[];
  deterministicSnapshot: DeterministicPersonalCalculationSnapshot | null;
  securityStatus: {
    promptValidated: boolean;
    profileIsolationVerified: boolean;
    profileUsedInAnswer: boolean;
    taxYearFilter: 2026 | 2025;
    effectiveDateFilter: string;
  };
  rateLimit?: RateLimitStatus;
  generationMode: 'gemini_rag_verified' | 'deterministic_corpus_synthesis' | 'security_guardrail';
  disclaimer: string;
}

/**
 * Vérifie si le profil personnel du foyer est autorisé et pertinent pour la question posée.
 */
function resolveAuthorizedHouseholdSnapshot(
  input: PersonalAssistantQueryInput
): {
  snapshot: DeterministicPersonalCalculationSnapshot | null;
  isolationVerified: boolean;
  profileUsed: boolean;
} {
  if (!input.useHouseholdProfile || !input.householdContext) {
    return {
      snapshot: null,
      isolationVerified: true,
      profileUsed: false,
    };
  }

  // Isolation stricte : l'identifiant du foyer autorisé doit être présent et correspondre exactement au contexte transmis
  if (
    !input.authorizedHouseholdId ||
    input.authorizedHouseholdId.trim().length === 0 ||
    input.authorizedHouseholdId !== input.householdContext.householdId
  ) {
    return {
      snapshot: null,
      isolationVerified: false,
      profileUsed: false,
    };
  }

  const taxYear: 2026 | 2025 = input.taxYear === 2025 ? 2025 : 2026;
  const ctx = input.householdContext;

  const irCalc = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: ctx.annualDeclaredSalaryNetImposableEur,
    additionalTaxableIncomeEur: ctx.additionalNetTaxableIncomeEur ?? 0,
    maritalStatus: ctx.maritalStatus,
    dependantsCount: ctx.dependantsCount,
    perDeductibleContributionEur: ctx.perContributionAnnualEur ?? 0,
    estimatedTaxCreditsEur: ctx.estimatedEligibleTaxCreditsEur ?? 0,
    taxYear,
  });

  let monthlyNetBeforeTaxEur: number | undefined;
  let monthlyNetTaxableEur: number | undefined;
  let monthlyWithholdingAmountEur: number | undefined;
  let monthlyNetAfterTaxEur: number | undefined;

  if (ctx.grossMonthlySalaryEur && ctx.grossMonthlySalaryEur > 0) {
    const mappedStatus =
      ctx.employmentCategory === 'salarie_cadre' ||
      ctx.employmentCategory === 'cadre'
        ? 'cadre'
        : ctx.employmentCategory === 'fonction_publique'
        ? 'fonction_publique'
        : 'non_cadre';
    const salCalc = calculateDetailedPersonalSalary({
      entryMode: 'STATUTORY_ESTIMATE',
      grossMonthlySalaryEur: ctx.grossMonthlySalaryEur,
      status: mappedStatus,
      maritalStatus: ctx.maritalStatus,
      dependantsCount: ctx.dependantsCount,
      taxYear,
    });
    monthlyNetBeforeTaxEur = salCalc.netBeforeTaxMonthlyEur;
    monthlyNetTaxableEur = salCalc.netTaxableMonthlyEur;
    monthlyWithholdingAmountEur = salCalc.withholdingTaxMonthlyEur;
    monthlyNetAfterTaxEur = salCalc.netAfterTaxMonthlyEur;
  }

  const averageTaxRatePercent =
    irCalc.netTaxableIncomeEur > 0
      ? Math.round(
          (irCalc.finalEstimatedTaxEur / irCalc.netTaxableIncomeEur) * 1000
        ) / 10
      : 0;

  return {
    isolationVerified: true,
    profileUsed: true,
    snapshot: {
      profileUsed: true,
      profileLabel: ctx.householdName,
      taxYear,
      familyQuotientParts: irCalc.familyQuotientParts,
      netTaxableIncomeEur: irCalc.netTaxableIncomeEur,
      grossTaxBeforeDecoteEur: irCalc.grossTaxAfterCapEur,
      decoteAppliedEur: irCalc.decoteAmountEur,
      familyQuotientCapReductionLostEur: irCalc.quotientCapIncreaseEur,
      estimatedNetIncomeTaxEur: irCalc.finalEstimatedTaxEur,
      marginalTaxRatePercent: irCalc.marginalTaxRatePercent,
      averageTaxRatePercent,
      estimatedWithholdingRatePercent: irCalc.effectiveWithholdingRatePercent,
      monthlyNetBeforeTaxEur,
      monthlyNetTaxableEur,
      monthlyWithholdingAmountEur,
      monthlyNetAfterTaxEur,
      standard10PctDeductionEur: irCalc.deductionAppliedEur,
    },
  };
}

/**
 * Détecte si la question manque d'éléments essentiels ou porte sur un sujet hors périmètre vérifié.
 */
function detectInsufficientInformationNotice(
  question: string,
  profileUsed: boolean
): string | null {
  const q = question.toLowerCase();

  if (
    (q.includes('combien vais-je payer') ||
      q.includes('quel sera mon impôt') ||
      q.includes('mon taux') ||
      q.includes('ai-je intérêt')) &&
    !profileUsed &&
    !/\d{3,}/.test(q)
  ) {
    return 'Vous avez désactivé l’utilisation de votre profil fiscal et votre question ne précise pas vos revenus ni votre situation familiale. Les explications ci-dessous présentent la règle générale vérifiée ; activez votre profil ou indiquez vos montants pour un chiffrage personnalisé.';
  }

  if (
    q.includes('crypto') ||
    q.includes('bitcoin') ||
    q.includes('plus-value immobilière') ||
    q.includes('succession') ||
    q.includes('donation notariée') ||
    q.includes('ifi') ||
    q.includes('impôt sur la fortune')
  ) {
    return 'Précision importante : Ce sujet relève d’une fiscalité patrimoniale spécifique (plus-values, succession ou IFI) qui nécessite l’examen d’actes notariés ou de prix d’acquisition datés non couverts par le simulateur courant de revenus. Nous vous présentons les principes généraux vérifiés sans inventer de calcul approximatif.';
  }

  return null;
}

/**
 * Génère une réponse structurée, bienveillante et sourcée pour un contribuable particulier.
 */
export async function generatePersonalTaxAssistantAnswer(
  input: PersonalAssistantQueryInput,
  clientIdentifier = 'default-session'
): Promise<PersonalTaxAssistantResponsePayload> {
  const taxYear: 2026 | 2025 = input.taxYear === 2025 ? 2025 : 2026;
  const effectiveDate = input.effectiveDate || '2026-11-10';
  const disclaimer =
    'Information pédagogique et d’aide à la décision basée sur les textes officiels vérifiés (impots.gouv.fr, Service-Public.fr, BOFiP, Légifrance). Ne remplace pas un avis d’imposition officiel de la DGFiP ni les conseils d’un professionnel habilité.';

  // 1. Contrôle de limitation de débit (Rate Limiting)
  const rateLimit = checkAssistantRateLimit(clientIdentifier);
  if (!rateLimit.allowed) {
    const fallbackCitations = retrievePersonalTaxReferences(input.question, {
      taxYear,
      effectiveDate,
      maxResults: 2,
    });
    const waitMsg = `Pour garantir la qualité du service et la sécurité de vos données, le nombre de questions est limité à ${rateLimit.limit} par minute. Merci de patienter environ ${rateLimit.resetInSeconds} secondes avant d’envoyer une nouvelle question.`;
    return {
      answerMarkdown: waitMsg,
      structured: {
        directAnswer: waitMsg,
        verifiedLegalFacts: fallbackCitations.map(
          (c) => `${c.title} (${c.officialReference}) : ${c.plainFrenchSummary}`
        ),
        assumptionsAndLimits: ['Limite temporaire de requêtes atteinte sur la session active.'],
        personalRecommendations: [
          'Vous pouvez consulter les fiches officielles ci-dessous ou utiliser les simulateurs déterministes pendant ce court délai.',
        ],
        explainedTerms: fallbackCitations[0]?.explainedTerms ?? [],
        simpleExample: fallbackCitations[0]?.simpleExample ?? '',
        clarifyingQuestions: [],
        insufficientInformationNotice: null,
      },
      citations: fallbackCitations,
      deterministicSnapshot: null,
      securityStatus: {
        promptValidated: true,
        profileIsolationVerified: true,
        profileUsedInAnswer: false,
        taxYearFilter: taxYear,
        effectiveDateFilter: effectiveDate,
      },
      rateLimit,
      generationMode: 'security_guardrail',
      disclaimer,
    };
  }

  // 2. Minimisation RGPD (Art. 5-1-c) : masquage automatique des NIR, SPI, IBAN, PAN et mots de passe
  const piiScan = enforceDataMinimizationOnInput(input.question);

  // 3. Contrôle anti-injection de prompt
  const securityCheck = inspectPromptSecurity(piiScan.redactedText);
  if (!securityCheck.safe) {
    const safeCitations = retrievePersonalTaxReferences('impôt sur le revenu déclaration', {
      taxYear,
      effectiveDate,
      maxResults: 2,
    });
    const refusalMessage =
      'Je suis l’assistant fiscal personnel de FISCALIQ. Pour votre sécurité et la fiabilité juridique de mes réponses, je réponds uniquement aux questions portant sur la fiscalité personnelle française en m’appuyant sur les textes officiels vérifiés et sur votre propre profil autorisé. Je ne peux ni ignorer ces règles de vérification, ni inventer de dispositions fiscales, ni accéder aux données d’un autre foyer.';
    return {
      answerMarkdown: refusalMessage,
      structured: {
        directAnswer: refusalMessage,
        verifiedLegalFacts: [
          'Chaque réponse de FISCALIQ est obligatoirement rattachée aux textes officiels en vigueur (Code général des impôts, BOFiP, Service-Public.fr, impots.gouv.fr).',
          'Les données fiscales sont strictement isolées par foyer : aucun profil tiers n’est accessible.',
        ],
        assumptionsAndLimits: [
          securityCheck.reason ?? 'Requête bloquée par le filtre de sécurité.',
        ],
        personalRecommendations: [
          'Reformulez votre question sur un sujet fiscal concret : impôt sur le revenu, salaire, prélèvement à la source, parts fiscales, crédits d’impôt ou déclaration annuelle.',
        ],
        explainedTerms: [],
        simpleExample:
          'Exemple de question valide : « Comment fonctionne le crédit d’impôt pour la garde de mon enfant de moins de 6 ans ? »',
        clarifyingQuestions: [
          'Souhaitez-vous comprendre le calcul de votre impôt sur le revenu 2026 ?',
          'Cherchez-vous à vérifier votre éligibilité à une réduction ou un crédit d’impôt ?',
        ],
        insufficientInformationNotice: securityCheck.reason ?? null,
      },
      citations: safeCitations,
      deterministicSnapshot: null,
      securityStatus: {
        promptValidated: false,
        profileIsolationVerified: true,
        profileUsedInAnswer: false,
        taxYearFilter: taxYear,
        effectiveDateFilter: effectiveDate,
      },
      rateLimit,
      generationMode: 'security_guardrail',
      disclaimer,
    };
  }

  // 4. Recherche documentaire obligatoire (RAG) filtrée par millésime et date d'effet
  const rawCitations = retrievePersonalTaxReferences(securityCheck.sanitizedQuestion, {
    taxYear,
    effectiveDate,
    maxResults: 3,
  });
  const citationIntegrity = verifyOfficialCitationIntegrity(rawCitations);
  const citations = citationIntegrity.valid
    ? rawCitations
    : rawCitations.filter((c) => c.verificationStatus === 'APPROVED_VERIFIED');

  // 5. Résolution du profil autorisé et calculs déterministes côté serveur
  const { snapshot, isolationVerified, profileUsed } =
    resolveAuthorizedHouseholdSnapshot(input);

  const detectedInsufficientNotice = detectInsufficientInformationNotice(
    securityCheck.sanitizedQuestion,
    profileUsed
  );
  const insufficientInfoNotice = piiScan.warningNoticeFr
    ? detectedInsufficientNotice
      ? `${piiScan.warningNoticeFr} ${detectedInsufficientNotice}`
      : piiScan.warningNoticeFr
    : detectedInsufficientNotice;

  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = Boolean(
    apiKey && apiKey.trim().length > 10 && apiKey !== 'MY_GEMINI_API_KEY'
  );

  // Construction du contexte documentaire vérifié
  const corpusContextText = citations
    .map(
      (doc, idx) =>
        `[DOCUMENT OFFICIEL #${idx + 1} — ID: ${doc.id}]
Titre : ${doc.title}
Autorité : ${doc.authority} | Référence légale : ${doc.officialReference}
Millésime fiscal : ${doc.applicableTaxYear} | Entrée en vigueur : ${doc.effectiveFromDate} | Vérifié le : ${doc.verifiedDate}
URL officielle : ${doc.sourceUrl}
Explication en français courant : ${doc.plainFrenchSummary}
Pourquoi cette règle s'applique : ${doc.whyItApplies}
Conditions d'éligibilité :
- ${doc.eligibilityConditions.join('\n- ')}
Limites et exclusions :
- ${doc.exclusionsAndLimits.join('\n- ')}
Cases de déclaration 2042 : ${doc.declarationBoxes.join(', ')}
Exemple type : ${doc.simpleExample}`
    )
    .join('\n\n');

  const deterministicContextText = snapshot
    ? `\n[CALCULS DÉTERMINISTES DU FOYER AUTORISÉ (Calculés par le moteur serveur FISCALIQ — INTERDICTION D'INVENTER D'AUTRES CHIFFRES)]
- Profil actif autorisé : ${snapshot.profileLabel} (Millésime ${snapshot.taxYear})
- Quotient familial : ${snapshot.familyQuotientParts} part(s)
- Revenu net imposable soumis au barème (après abattement 10 % de ${snapshot.standard10PctDeductionEur.toLocaleString('fr-FR')} €) : ${snapshot.netTaxableIncomeEur.toLocaleString('fr-FR')} €
- Impôt brut avant décote : ${snapshot.grossTaxBeforeDecoteEur.toLocaleString('fr-FR')} €
- Décote appliquée : ${snapshot.decoteAppliedEur.toLocaleString('fr-FR')} €
- Impôt sur le revenu net estimé : ${snapshot.estimatedNetIncomeTaxEur.toLocaleString('fr-FR')} € / an
- Tranche marginale d'imposition (TMI) : ${snapshot.marginalTaxRatePercent} %
- Taux moyen d'imposition : ${snapshot.averageTaxRatePercent.toFixed(1)} %
- Taux de prélèvement à la source (PAS) estimé : ${snapshot.estimatedWithholdingRatePercent.toFixed(1)} %${
        snapshot.monthlyNetBeforeTaxEur !== undefined
          ? `\n- Salaire mensuel estimé : Net avant impôt ${snapshot.monthlyNetBeforeTaxEur.toLocaleString('fr-FR')} € | Net imposable ${snapshot.monthlyNetTaxableEur?.toLocaleString('fr-FR')} € | PAS mensuel ${snapshot.monthlyWithholdingAmountEur?.toLocaleString('fr-FR')} € | Net après impôt ${snapshot.monthlyNetAfterTaxEur?.toLocaleString('fr-FR')} €`
          : ''
      }`
    : `\n[MODE SANS PROFIL PERSONNEL ACTIF : L'utilisateur pose une question générale ou en mode anonyme. N'utilisez aucune donnée personnelle et appuyez-vous sur les exemples chiffrés des documents officiels.]`;

  const historyContextText =
    input.conversationHistory && input.conversationHistory.length > 0
      ? `\n[HISTORIQUE RÉCENT DE LA CONVERSATION]\n` +
        input.conversationHistory
          .slice(-4)
          .map(
            (turn) =>
              `${turn.role === 'user' ? 'Contribuable' : 'Assistant FISCALIQ'} : ${turn.content.slice(0, 500)}`
          )
          .join('\n')
      : '';

  if (!isKeyConfigured) {
    const deterministicPayload = buildPersonalTaxDeterministicResponse(
      securityCheck.sanitizedQuestion,
      citations,
      snapshot,
      insufficientInfoNotice
    );
    return {
      ...deterministicPayload,
      citations,
      deterministicSnapshot: snapshot,
      securityStatus: {
        promptValidated: true,
        profileIsolationVerified: isolationVerified,
        profileUsedInAnswer: profileUsed,
        taxYearFilter: taxYear,
        effectiveDateFilter: effectiveDate,
      },
      rateLimit,
      generationMode: 'deterministic_corpus_synthesis',
      disclaimer,
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `Vous êtes l'assistant fiscal personnel de FISCALIQ, conçu pour expliquer la fiscalité française aux particuliers (salariés, couples, familles, parents isolés, étudiants, retraités, propriétaires bailleurs) en français courant, rassurant, patient et pédagogique.

RÈGLES OBLIGATOIRES ET STRICTES :
1. Ton et pédagogie : Utilisez un français simple, chaleureux et accessible à quelqu'un qui n'a jamais étudié la fiscalité. Expliquez systématiquement les termes techniques (ex: quotient familial, TMI, décote, salaire net imposable, crédit vs réduction d'impôt).
2. Exactitude juridique absolue : Appuyez-vous EXCLUSIVEMENT sur les documents fournis dans [DOCUMENT OFFICIEL]. N'inventez jamais de lois, de seuils, de plafonds, de dates limites, de cases 2042 ou de conditions d'éligibilité. Si l'information fournie par l'utilisateur est incomplète pour trancher son cas précis, dites-le explicitement et posez des questions de clarification.
3. Exactitude numérique absolue : Utilisez EXCLUSIVEMENT les montants figurant dans [CALCULS DÉTERMINISTES DU FOYER AUTORISÉ] ou dans les barèmes officiels cités. N'inventez jamais de montant d'impôt de votre propre chef.
4. Distinction épistémique : Séparez clairement les faits légaux vérifiés (verifiedLegalFacts), les hypothèses et limites (assumptionsAndLimits), et les conseils pratiques de vérification (personalRecommendations).
5. Confidentialité : Utilisez le profil du foyer uniquement lorsqu'il est présent dans le bloc autorisé et pertinent pour la question.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `${corpusContextText}\n${deterministicContextText}\n${historyContextText}\n\nQUESTION DU CONTRIBUABLE (Millésime demandé : ${taxYear}) :\n${securityCheck.sanitizedQuestion}`,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            directAnswer: {
              type: Type.STRING,
              description:
                'Réponse principale claire, bienveillante et accessible en français de tous les jours (2 à 4 paragraphes).',
            },
            verifiedLegalFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Liste de 2 à 4 faits légaux vérifiés avec la référence officielle exacte (ex: CGI Art. 200 quater B) et le millésime.',
            },
            assumptionsAndLimits: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Liste de 1 à 3 hypothèses retenues, plafonds ou conditions à vérifier avant d’appliquer la règle.',
            },
            personalRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Liste de 2 à 3 actions concrètes ou vérifications à effectuer sur impots.gouv.fr ou dans les simulateurs FISCALIQ.',
            },
            explainedTerms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  plainExplanation: { type: Type.STRING },
                },
                required: ['term', 'plainExplanation'],
              },
              description:
                'Définitions simples des termes fiscaux techniques utilisés dans la réponse.',
            },
            simpleExample: {
              type: Type.STRING,
              description:
                'Un exemple concret, court et parlant illustrant la règle en euros.',
            },
            clarifyingQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                '2 ou 3 questions courtes à poser à l’utilisateur pour affiner sa situation personnelle.',
            },
            insufficientInformationNotice: {
              type: Type.STRING,
              nullable: true,
              description:
                'Mention explicite si des informations manquent pour confirmer l’éligibilité exacte, sinon null.',
            },
            citedDocumentIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Liste des IDs des documents officiels réellement utilisés parmi ceux fournis dans le contexte.',
            },
          },
          required: [
            'directAnswer',
            'verifiedLegalFacts',
            'assumptionsAndLimits',
            'personalRecommendations',
            'explainedTerms',
            'simpleExample',
            'clarifyingQuestions',
            'citedDocumentIds',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Réponse vide du modèle Gemini.');
    }

    const parsedJson = JSON.parse(rawText);
    const validated = personalTaxAssistantStructuredModelSchema.parse(parsedJson);

    // Filtrage strict des citations pour empêcher toute citation inventée
    const matchedCitations = citations.filter((doc) =>
      validated.citedDocumentIds.includes(doc.id)
    );
    const finalCitations = matchedCitations.length > 0 ? matchedCitations : citations;

    const finalInsufficientNotice =
      validated.insufficientInformationNotice || insufficientInfoNotice || null;

    const structured = {
      directAnswer: validated.directAnswer,
      verifiedLegalFacts: validated.verifiedLegalFacts,
      assumptionsAndLimits: validated.assumptionsAndLimits,
      personalRecommendations: validated.personalRecommendations,
      explainedTerms:
        validated.explainedTerms.length > 0
          ? validated.explainedTerms
          : finalCitations[0]?.explainedTerms ?? [],
      simpleExample: validated.simpleExample,
      clarifyingQuestions: validated.clarifyingQuestions,
      insufficientInformationNotice: finalInsufficientNotice,
    };

    return {
      answerMarkdown: formatStructuredToMarkdown(structured, snapshot, finalCitations),
      structured,
      citations: finalCitations,
      deterministicSnapshot: snapshot,
      securityStatus: {
        promptValidated: true,
        profileIsolationVerified: isolationVerified,
        profileUsedInAnswer: profileUsed,
        taxYearFilter: taxYear,
        effectiveDateFilter: effectiveDate,
      },
      rateLimit,
      generationMode: 'gemini_rag_verified',
      disclaimer,
    };
  } catch {
    // Repli déterministe intégralement vérifié si la clé API n'est pas active ou en cas d'erreur réseau
    const deterministicPayload = buildPersonalTaxDeterministicResponse(
      securityCheck.sanitizedQuestion,
      citations,
      snapshot,
      insufficientInfoNotice
    );
    return {
      ...deterministicPayload,
      citations,
      deterministicSnapshot: snapshot,
      securityStatus: {
        promptValidated: true,
        profileIsolationVerified: isolationVerified,
        profileUsedInAnswer: profileUsed,
        taxYearFilter: taxYear,
        effectiveDateFilter: effectiveDate,
      },
      rateLimit,
      generationMode: 'deterministic_corpus_synthesis',
      disclaimer,
    };
  }
}

/**
 * Synthèse déterministe structurée, chaleureuse et sourcée à partir de la base de connaissances vérifiée
 * et du moteur de calcul déterministe FISCALIQ.
 */
function buildPersonalTaxDeterministicResponse(
  question: string,
  citations: OfficialPersonalTaxDocument[],
  snapshot: DeterministicPersonalCalculationSnapshot | null,
  insufficientInfoNotice: string | null
): Pick<PersonalTaxAssistantResponsePayload, 'answerMarkdown' | 'structured'> {
  const primary = citations[0];
  const secondary = citations.slice(1);

  const profileIntro = snapshot
    ? `\n\n**Ce que cela donne pour votre profil actif (${snapshot.profileLabel} — Barème ${snapshot.taxYear}) :**\nAvec **${snapshot.familyQuotientParts} part${snapshot.familyQuotientParts > 1 ? 's' : ''} fiscale${snapshot.familyQuotientParts > 1 ? 's' : ''}** et un revenu net imposable de **${snapshot.netTaxableIncomeEur.toLocaleString('fr-FR')} €** (après abattement de 10 % de ${snapshot.standard10PctDeductionEur.toLocaleString('fr-FR')} €), notre moteur déterministe calcule un impôt sur le revenu annuel estimé à **${snapshot.estimatedNetIncomeTaxEur.toLocaleString('fr-FR')} €**. Votre tranche marginale d’imposition (TMI) est de **${snapshot.marginalTaxRatePercent} %**, mais votre **taux moyen réel** n’est que de **${snapshot.averageTaxRatePercent.toFixed(1)} %** (taux de prélèvement à la source estimé : **${snapshot.estimatedWithholdingRatePercent.toFixed(1)} %**).`
    : '';

  const directAnswer = `Voici l’explication simple de la règle fiscale qui s’applique à votre question (« *${question}* ») :\n\n${primary.plainFrenchSummary}${profileIntro}`;

  const verifiedLegalFacts = [
    `${primary.title} (${primary.authority} — ${primary.officialReference}, millésime ${primary.applicableTaxYear}) : ${primary.whyItApplies}`,
    ...primary.eligibilityConditions.slice(0, 3),
    ...secondary.slice(0, 1).map(
      (doc) =>
        `Règle complémentaire (${doc.officialReference}) : ${doc.plainFrenchSummary}`
    ),
  ];

  const assumptionsAndLimits = [
    ...primary.exclusionsAndLimits.slice(0, 3),
    snapshot
      ? `Chiffrage établi selon le profil autorisé « ${snapshot.profileLabel} » (barème officiel ${snapshot.taxYear}).`
      : 'Simulation générale hors profil personnel : les montants exacts dépendent de votre revenu net imposable et du nombre de parts de votre foyer.',
  ];

  const personalRecommendations = [
    `Cases à vérifier sur votre déclaration 2042 : ${primary.declarationBoxes.join(', ')}.`,
    `Conservez vos justificatifs pendant 3 ans en cas de demande de l’administration fiscale (vous n’avez pas à les joindre lors de la déclaration en ligne).`,
    `Consultez la notice officielle sur ${primary.authority} (${primary.sourceUrl}) ou testez l’impact chiffré dans nos simulateurs « Mes impôts », « Optimisation fiscale » et « Mon salaire ».`,
  ];

  const clarifyingQuestions = buildContextualClarifyingQuestions(primary.domain);

  const structured = {
    directAnswer,
    verifiedLegalFacts,
    assumptionsAndLimits,
    personalRecommendations,
    explainedTerms: primary.explainedTerms,
    simpleExample: primary.simpleExample,
    clarifyingQuestions,
    insufficientInformationNotice: insufficientInfoNotice,
  };

  return {
    answerMarkdown: formatStructuredToMarkdown(structured, snapshot, citations),
    structured,
  };
}

function buildContextualClarifyingQuestions(
  domain: OfficialPersonalTaxDocument['domain']
): string[] {
  switch (domain) {
    case 'FRAIS_PROFESSIONNELS':
      return [
        'Quelle est la distance quotidienne aller-retour entre votre domicile et votre lieu de travail ?',
        'Votre employeur vous rembourse-t-il une partie de vos frais de transport ou de repas ?',
        'Quel est votre salaire net imposable annuel figurant sur votre bulletin de décembre ?',
      ];
    case 'CREDITS_REDUCTIONS_IMPOT':
      return [
        'Quel est le montant resté réellement à votre charge après déduction des aides CAF (CMG) ou CESU employeur ?',
        'Quel âge avait votre enfant au 1er janvier de l’année des revenus ?',
        'Avez-vous déjà perçu un acompte de 60 % de la DGFiP à la mi-janvier ?',
      ];
    case 'QUOTIENT_FAMILIAL_ENFANTS':
      return [
        'Vos enfants sont-ils en résidence principale chez vous ou en garde alternée ?',
        'Vivez-vous seul(e) au 1er janvier de l’année d’imposition (condition de la case T) ?',
        'Avez-vous un enfant majeur étudiant de moins de 25 ans pour lequel vous hésitez entre rattachement et pension alimentaire ?',
      ];
    case 'SALAIRE_PRELEVEMENT_SOURCE':
      return [
        'Êtes-vous marié(e) ou pacsé(e) avec un écart de revenus entre vous et votre conjoint(e) ?',
        'Vos revenus ou votre nombre de parts ont-ils évolué récemment (naissance, changement de salaire) ?',
        'Souhaitez-vous comparer le taux personnalisé du foyer avec le taux individualisé ?',
      ];
    case 'REVENUS_FONCIERS_LOCATIFS':
      return [
        'Votre logement est-il loué vide (location nue) ou meublé (LMNP) ?',
        'Vos loyers bruts annuels hors charges dépassent-ils le seuil de 15 000 € ?',
        'Avez-vous réalisé des travaux d’entretien ou de réparation cette année ?',
      ];
    default:
      return [
        'Souhaitez-vous appliquer cette règle au revenu imposable de votre foyer actif ?',
        'Préférez-vous vérifier le barème 2026 (revenus 2025) ou le barème 2025 (revenus 2024) ?',
        'Avez-vous des réductions ou crédits d’impôt particuliers à déclarer cette année ?',
      ];
  }
}

function formatStructuredToMarkdown(
  structured: PersonalTaxAssistantResponsePayload['structured'],
  snapshot: DeterministicPersonalCalculationSnapshot | null,
  citations: OfficialPersonalTaxDocument[]
): string {
  const parts: string[] = [structured.directAnswer];

  if (structured.insufficientInformationNotice) {
    parts.push(`\n> **Note de prudence :** ${structured.insufficientInformationNotice}`);
  }

  parts.push(
    `\n### 1. Faits légaux vérifiés`,
    ...structured.verifiedLegalFacts.map((fact) => `- ${fact}`)
  );

  if (snapshot) {
    parts.push(
      `\n### 2. Chiffrage déterministe pour votre foyer (${snapshot.profileLabel})`,
      `- **Quotient familial :** ${snapshot.familyQuotientParts} part(s) | **Revenu net imposable :** ${snapshot.netTaxableIncomeEur.toLocaleString('fr-FR')} €`,
      `- **Impôt annuel estimé (Barème ${snapshot.taxYear}) :** **${snapshot.estimatedNetIncomeTaxEur.toLocaleString('fr-FR')} €** (Tranche marginale : **${snapshot.marginalTaxRatePercent} %** · Taux moyen : **${snapshot.averageTaxRatePercent.toFixed(1)} %**)`,
      `- **Taux de prélèvement à la source (PAS) estimé :** **${snapshot.estimatedWithholdingRatePercent.toFixed(1)} %**`
    );
  }

  parts.push(
    `\n### 3. Exemple concret`,
    structured.simpleExample,
    `\n### 4. Hypothèses & conditions à vérifier`,
    ...structured.assumptionsAndLimits.map((item) => `- ${item}`),
    `\n### 5. Recommandations pratiques`,
    ...structured.personalRecommendations.map((rec) => `- ${rec}`),
    `\n### 6. Sources officielles citées`,
    ...citations.map(
      (c) =>
        `- **${c.title}** — *${c.authority} (${c.officialReference}, millésime ${c.applicableTaxYear})* : ${c.sourceUrl}`
    )
  );

  return parts.join('\n');
}

// ============================================================================
// 4. COMPATIBILITÉ DESCENDANTE AVEC L'ANCIENNE SIGNATURE (API /api/ai/assistant)
// ============================================================================

export interface AssistantQueryInput {
  question: string;
  companyContext?: {
    legalForm: string;
    annualTurnoverHt: number;
    headcount: number;
    taxableProfit: number;
  };
}

export interface AssistantResponsePayload {
  answerMarkdown: string;
  citations: OfficialLegalReference[];
  deterministicSnapshot?: {
    totalCorporateTax: number;
    effectiveTaxRatePercent: number;
    isEligibleForPmeReducedRate: boolean;
  };
  generationMode: 'gemini_rag_verified' | 'deterministic_corpus_synthesis';
  disclaimer: string;
}

export async function generateFiscalAssistantAnswer(
  input: AssistantQueryInput
): Promise<AssistantResponsePayload> {
  const personalResult = await generatePersonalTaxAssistantAnswer({
    question: input.question,
    taxYear: 2026,
    useHouseholdProfile: false,
  });

  let deterministicSnapshot: AssistantResponsePayload['deterministicSnapshot'] = undefined;
  if (input.companyContext) {
    const taxCalc = calculateCorporateTax({
      annualTurnoverHt: input.companyContext.annualTurnoverHt,
      taxableProfit: input.companyContext.taxableProfit,
      isCapitalFullyPaidUp: true,
      physicalPersonOwnershipShare: 1.0,
    });
    deterministicSnapshot = {
      totalCorporateTax: taxCalc.totalCorporateTax,
      effectiveTaxRatePercent: Math.round(taxCalc.effectiveTaxRate * 10000) / 100,
      isEligibleForPmeReducedRate: taxCalc.isEligibleForPmeReducedRate,
    };
  }

  return {
    answerMarkdown: personalResult.answerMarkdown,
    citations: retrieveRelevantReferences(input.question, 3),
    deterministicSnapshot,
    generationMode:
      personalResult.generationMode === 'gemini_rag_verified'
        ? 'gemini_rag_verified'
        : 'deterministic_corpus_synthesis',
    disclaimer: personalResult.disclaimer,
  };
}
