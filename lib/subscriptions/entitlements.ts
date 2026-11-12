/**
 * FISCALIQ — Architecture d'Abonnements Simplifiée :
 * Deux formules claires : Gratuit (0 €) et Premium (5 € / mois).
 *
 * SÉCURITÉ :
 * - Persistance partagée via `shared-store` (Upstash Redis / Supabase PostgreSQL).
 * - Les changements de formule en production ne sont appliqués qu'après vérification
 *   cryptographique d'un webhook de paiement signé (HMAC-SHA256).
 */

import crypto from 'crypto';
import {
  sharedStoreGetJson,
  sharedStoreSetJson,
  getSharedStoreBackend,
} from '@/lib/security/shared-store';

export type SubscriptionPlanId = 'FREE' | 'PREMIUM';

export const PUBLIC_SUBSCRIPTION_PLANS: SubscriptionPlanId[] = ['FREE', 'PREMIUM'];

export type PersonalReportType =
  | 'BILAN_FISCAL_COMPLET'
  | 'SYNTHESE_SALAIRE_ET_PAS'
  | 'DOSSIER_OPTIMISATION_ET_2042';

export interface PlanEntitlementConfig {
  planId: SubscriptionPlanId;
  nameFr: string;
  taglineFr: string;
  pricingDisplayLabelFr: string;
  pricingStatusNoteFr: string;
  limits: {
    savedSimulationsMax: number;
    monthlyAssistantQuestionsMax: number;
    monthlyPdfReportsMax: number;
  };
  features: {
    allowedReportTypes: PersonalReportType[];
    canGenerateDetailedPdfReport: boolean;
    canGenerateOptimizationAnd2042Dossier: boolean;
    canCompareMultiYear2025And2026: boolean;
    canSaveUnlimitedHouseholdScenarios: boolean;
    signedDownloadLinkTtlSeconds: number;
  };
  includedBulletsFr: string[];
  limitationsBulletsFr: string[];
}

const PREMIUM_CONFIG: PlanEntitlementConfig = {
  planId: 'PREMIUM',
  nameFr: 'Premium',
  taglineFr: 'Toute la puissance fiscale, l’assistant IA et vos dossiers PDF 2042 complets.',
  pricingDisplayLabelFr: '5 € / mois',
  pricingStatusNoteFr: 'Sans engagement · Activation après paiement vérifié.',
  limits: {
    savedSimulationsMax: 200,
    monthlyAssistantQuestionsMax: 250,
    monthlyPdfReportsMax: 50,
  },
  features: {
    allowedReportTypes: [
      'BILAN_FISCAL_COMPLET',
      'SYNTHESE_SALAIRE_ET_PAS',
      'DOSSIER_OPTIMISATION_ET_2042',
    ],
    canGenerateDetailedPdfReport: true,
    canGenerateOptimizationAnd2042Dossier: true,
    canCompareMultiYear2025And2026: true,
    canSaveUnlimitedHouseholdScenarios: true,
    signedDownloadLinkTtlSeconds: 900,
  },
  includedBulletsFr: [
    'Optimisations fiscales complètes (frais réels, PER, garde, dons)',
    'Dossier PDF 2042 complet & comparateur multi-scénarios',
    'Assistant IA vérifié & simulations quasi-illimitées (250/mois)',
  ],
  limitationsBulletsFr: [
    'Outil d’aide à la décision basé sur le barème officiel.',
  ],
};

export const SUBSCRIPTION_PLANS_CONFIG: Record<SubscriptionPlanId, PlanEntitlementConfig> = {
  FREE: {
    planId: 'FREE',
    nameFr: 'Gratuit',
    taglineFr: 'L’essentiel pour estimer votre impôt et votre salaire net.',
    pricingDisplayLabelFr: '0 € / mois',
    pricingStatusNoteFr: 'Gratuit sans carte bancaire.',
    limits: {
      savedSimulationsMax: 3,
      monthlyAssistantQuestionsMax: 5,
      monthlyPdfReportsMax: 1,
    },
    features: {
      allowedReportTypes: ['BILAN_FISCAL_COMPLET', 'SYNTHESE_SALAIRE_ET_PAS'],
      canGenerateDetailedPdfReport: true,
      canGenerateOptimizationAnd2042Dossier: false,
      canCompareMultiYear2025And2026: false,
      canSaveUnlimitedHouseholdScenarios: false,
      signedDownloadLinkTtlSeconds: 900,
    },
    includedBulletsFr: [
      'Calculateur d’impôt 2026 & quotient familial',
      'Simulateur salaire brut / net & taux PAS',
      '1 rapport PDF/mois · 3 simulations · 5 questions IA',
    ],
    limitationsBulletsFr: [
      'Dossier PDF 2042 complet réservé à l’offre Premium (5 €)',
    ],
  },
  PREMIUM: PREMIUM_CONFIG,
};

export interface HouseholdUsageSnapshot {
  householdId: string;
  planId: SubscriptionPlanId;
  periodMonth: string;
  savedSimulationsUsed: number;
  assistantQuestionsUsed: number;
  pdfReportsGeneratedUsed: number;
  updatedAtIso: string;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  httpStatus: 200 | 403 | 429;
  reasonCode:
    | 'ALLOWED'
    | 'UNAUTHORIZED_HOUSEHOLD_ISOLATION'
    | 'PLAN_FEATURE_RESTRICTED'
    | 'QUOTA_LIMIT_REACHED';
  messageFr: string;
  planConfig: PlanEntitlementConfig;
  usage: HouseholdUsageSnapshot;
}

export interface PaymentProviderAbstraction {
  providerId: 'unconfigured_abstraction' | 'stripe_hosted_checkout_ready';
  paymentsActiveInEnvironment: false;
  cardStoragePolicy: 'NEVER_STORE_CARD_DETAILS_EXTERNAL_CHECKOUT_ONLY';
  sharedStoreBackend: ReturnType<typeof getSharedStoreBackend>;
  preparePlanUpgradeIntent(params: {
    householdId: string;
    targetPlanId: SubscriptionPlanId;
  }): {
    status: 'ABSTRACTION_READY_NO_PAYMENT_COLLECTED';
    providerId: string;
    explanationFr: string;
  };
}

export const paymentProviderAdapter: PaymentProviderAbstraction = {
  providerId: 'unconfigured_abstraction',
  paymentsActiveInEnvironment: false,
  cardStoragePolicy: 'NEVER_STORE_CARD_DETAILS_EXTERNAL_CHECKOUT_ONLY',
  get sharedStoreBackend() {
    return getSharedStoreBackend();
  },
  preparePlanUpgradeIntent({ targetPlanId }) {
    const plan = SUBSCRIPTION_PLANS_CONFIG[targetPlanId];
    return {
      status: 'ABSTRACTION_READY_NO_PAYMENT_COLLECTED',
      providerId: 'unconfigured_abstraction',
      explanationFr: `Offre « ${plan.nameFr} (${plan.pricingDisplayLabelFr}) » : les changements d’abonnement sont activés uniquement après réception d’un webhook de paiement signé (zéro carte stockée).`,
    };
  },
};

const INITIAL_SUBSCRIPTIONS: Record<string, HouseholdUsageSnapshot> = {
  'foyer-utilisateur': {
    householdId: 'foyer-utilisateur',
    planId: 'FREE',
    periodMonth: '2026-11',
    savedSimulationsUsed: 0,
    assistantQuestionsUsed: 0,
    pdfReportsGeneratedUsed: 0,
    updatedAtIso: '2026-11-10T09:00:00.000Z',
  },
  'foyer-couple-2-enfants': {
    householdId: 'foyer-couple-2-enfants',
    planId: 'PREMIUM',
    periodMonth: '2026-11',
    savedSimulationsUsed: 4,
    assistantQuestionsUsed: 6,
    pdfReportsGeneratedUsed: 1,
    updatedAtIso: '2026-11-10T09:00:00.000Z',
  },
  'foyer-celibataire-salarie': {
    householdId: 'foyer-celibataire-salarie',
    planId: 'FREE',
    periodMonth: '2026-11',
    savedSimulationsUsed: 1,
    assistantQuestionsUsed: 2,
    pdfReportsGeneratedUsed: 0,
    updatedAtIso: '2026-11-10T09:00:00.000Z',
  },
  'foyer-parent-isole': {
    householdId: 'foyer-parent-isole',
    planId: 'PREMIUM',
    periodMonth: '2026-11',
    savedSimulationsUsed: 2,
    assistantQuestionsUsed: 3,
    pdfReportsGeneratedUsed: 0,
    updatedAtIso: '2026-11-10T09:00:00.000Z',
  },
  'foyer-couple-retraites': {
    householdId: 'foyer-couple-retraites',
    planId: 'PREMIUM',
    periodMonth: '2026-11',
    savedSimulationsUsed: 3,
    assistantQuestionsUsed: 4,
    pdfReportsGeneratedUsed: 1,
    updatedAtIso: '2026-11-10T09:00:00.000Z',
  },
};

function subKey(householdId: string): string {
  return `sub:${householdId}`;
}

export function getOrCreateHouseholdSubscription(
  householdId: string
): HouseholdUsageSnapshot {
  const existing = sharedStoreGetJson<HouseholdUsageSnapshot>(subKey(householdId));
  if (existing) {
    return { ...existing };
  }
  const seeded = INITIAL_SUBSCRIPTIONS[householdId];
  if (seeded) {
    sharedStoreSetJson(subKey(householdId), seeded);
    return { ...seeded };
  }
  const initial: HouseholdUsageSnapshot = {
    householdId,
    planId: 'FREE',
    periodMonth: '2026-11',
    savedSimulationsUsed: 0,
    assistantQuestionsUsed: 0,
    pdfReportsGeneratedUsed: 0,
    updatedAtIso: new Date().toISOString(),
  };
  sharedStoreSetJson(subKey(householdId), initial);
  return { ...initial };
}

/**
 * Updates a household's subscription plan ONLY after verifying an HMAC-SHA256
 * payment webhook signature (`x-payment-webhook-signature`).
 */
export function applyVerifiedPaymentWebhook(params: {
  rawBody: string;
  signatureHeader: string;
}): EntitlementCheckResult {
  const webhookSecret = process.env.FISCALIQ_PAYMENT_WEBHOOK_SECRET?.trim();
  if (
    !webhookSecret ||
    webhookSecret.length < 24 ||
    webhookSecret.includes('replace-with')
  ) {
    const fallbackUsage = getOrCreateHouseholdSubscription('unknown');
    return {
      allowed: false,
      httpStatus: 403,
      reasonCode: 'PLAN_FEATURE_RESTRICTED',
      messageFr:
        'Webhook de paiement refusé (403) : FISCALIQ_PAYMENT_WEBHOOK_SECRET non configuré côté serveur.',
      planConfig: SUBSCRIPTION_PLANS_CONFIG[fallbackUsage.planId],
      usage: fallbackUsage,
    };
  }

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(params.rawBody)
    .digest('hex');

  const sigA = Buffer.from(params.signatureHeader || '', 'utf8');
  const sigB = Buffer.from(expectedSig, 'utf8');
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    const fallbackUsage = getOrCreateHouseholdSubscription('unknown');
    return {
      allowed: false,
      httpStatus: 403,
      reasonCode: 'PLAN_FEATURE_RESTRICTED',
      messageFr:
        'Webhook de paiement refusé (403) : signature cryptographique invalide.',
      planConfig: SUBSCRIPTION_PLANS_CONFIG[fallbackUsage.planId],
      usage: fallbackUsage,
    };
  }

  const parsed = JSON.parse(params.rawBody) as {
    householdId?: string;
    newPlanId?: SubscriptionPlanId;
  };
  const householdId = String(parsed.householdId || '').trim();
  const newPlanId: SubscriptionPlanId =
    parsed.newPlanId === 'PREMIUM' ? 'PREMIUM' : 'FREE';

  const current = getOrCreateHouseholdSubscription(householdId);
  const updated: HouseholdUsageSnapshot = {
    ...current,
    planId: newPlanId,
    updatedAtIso: new Date().toISOString(),
  };
  sharedStoreSetJson(subKey(householdId), updated);

  return {
    allowed: true,
    httpStatus: 200,
    reasonCode: 'ALLOWED',
    messageFr: `Abonnement mis à jour par webhook vérifié : ${SUBSCRIPTION_PLANS_CONFIG[newPlanId].nameFr}.`,
    planConfig: SUBSCRIPTION_PLANS_CONFIG[newPlanId],
    usage: updated,
  };
}

/**
 * Test-only helper disabled in production.
 * In production, plan changes only happen via `applyVerifiedPaymentWebhook`.
 */
export function setHouseholdPlanForSimulation(
  authenticatedHouseholdId: string,
  targetHouseholdId: string,
  newPlanId: SubscriptionPlanId
): EntitlementCheckResult {
  if (process.env.NODE_ENV === 'production') {
    const fallbackUsage = getOrCreateHouseholdSubscription(targetHouseholdId || 'unknown');
    return {
      allowed: false,
      httpStatus: 403,
      reasonCode: 'PLAN_FEATURE_RESTRICTED',
      messageFr:
        'Accès refusé (403) : le changement de formule sans paiement vérifié est désactivé en production.',
      planConfig: SUBSCRIPTION_PLANS_CONFIG[fallbackUsage.planId],
      usage: fallbackUsage,
    };
  }

  if (!authenticatedHouseholdId || authenticatedHouseholdId !== targetHouseholdId) {
    const fallbackUsage = getOrCreateHouseholdSubscription(targetHouseholdId || 'unknown');
    return {
      allowed: false,
      httpStatus: 403,
      reasonCode: 'UNAUTHORIZED_HOUSEHOLD_ISOLATION',
      messageFr: 'Accès refusé (403) : foyer non autorisé.',
      planConfig: SUBSCRIPTION_PLANS_CONFIG[fallbackUsage.planId],
      usage: fallbackUsage,
    };
  }

  const current = getOrCreateHouseholdSubscription(targetHouseholdId);
  const updated: HouseholdUsageSnapshot = {
    ...current,
    planId: newPlanId,
    updatedAtIso: new Date().toISOString(),
  };
  sharedStoreSetJson(subKey(targetHouseholdId), updated);

  return {
    allowed: true,
    httpStatus: 200,
    reasonCode: 'ALLOWED',
    messageFr: `Formule activée : ${SUBSCRIPTION_PLANS_CONFIG[newPlanId].nameFr} (${SUBSCRIPTION_PLANS_CONFIG[newPlanId].pricingDisplayLabelFr}).`,
    planConfig: SUBSCRIPTION_PLANS_CONFIG[newPlanId],
    usage: updated,
  };
}

export function verifyReportGenerationEntitlement(params: {
  authenticatedHouseholdId: string;
  targetHouseholdId: string;
  reportType: PersonalReportType;
  consumeQuotaOnSuccess?: boolean;
}): EntitlementCheckResult {
  const {
    authenticatedHouseholdId,
    targetHouseholdId,
    reportType,
    consumeQuotaOnSuccess = false,
  } = params;

  const usage = getOrCreateHouseholdSubscription(targetHouseholdId);
  const planConfig = SUBSCRIPTION_PLANS_CONFIG[usage.planId];

  if (!authenticatedHouseholdId || authenticatedHouseholdId !== targetHouseholdId) {
    return {
      allowed: false,
      httpStatus: 403,
      reasonCode: 'UNAUTHORIZED_HOUSEHOLD_ISOLATION',
      messageFr: 'Accès refusé (403) : foyer non autorisé.',
      planConfig,
      usage,
    };
  }

  if (!planConfig.features.allowedReportTypes.includes(reportType)) {
    return {
      allowed: false,
      httpStatus: 403,
      reasonCode: 'PLAN_FEATURE_RESTRICTED',
      messageFr: `Ce rapport complet est inclus dans l’offre Premium (5 € / mois).`,
      planConfig,
      usage,
    };
  }

  if (usage.pdfReportsGeneratedUsed >= planConfig.limits.monthlyPdfReportsMax) {
    return {
      allowed: false,
      httpStatus: 429,
      reasonCode: 'QUOTA_LIMIT_REACHED',
      messageFr: `Quota atteint (${usage.pdfReportsGeneratedUsed}/${planConfig.limits.monthlyPdfReportsMax}). Passez en Premium (5 € / mois).`,
      planConfig,
      usage,
    };
  }

  if (consumeQuotaOnSuccess) {
    const updated: HouseholdUsageSnapshot = {
      ...usage,
      pdfReportsGeneratedUsed: usage.pdfReportsGeneratedUsed + 1,
      updatedAtIso: new Date().toISOString(),
    };
    sharedStoreSetJson(subKey(targetHouseholdId), updated);
    return {
      allowed: true,
      httpStatus: 200,
      reasonCode: 'ALLOWED',
      messageFr: 'Rapport PDF généré.',
      planConfig,
      usage: updated,
    };
  }

  return {
    allowed: true,
    httpStatus: 200,
    reasonCode: 'ALLOWED',
    messageFr: 'Droits vérifiés.',
    planConfig,
    usage,
  };
}

export function resetSubscriptionStoreForTests(): void {
  for (const [id, snapshot] of Object.entries(INITIAL_SUBSCRIPTIONS)) {
    sharedStoreSetJson(subKey(id), snapshot);
  }
}
