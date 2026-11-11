/**
 * FISCALIQ — Architecture d'Abonnements Simplifiée :
 * Deux formules claires : Gratuit (0 €) et Premium (5 € / mois).
 */

export type SubscriptionPlanId = 'FREE' | 'PREMIUM' | 'PLUS';

export const PUBLIC_SUBSCRIPTION_PLANS: ('FREE' | 'PREMIUM')[] = ['FREE', 'PREMIUM'];

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
  pricingStatusNoteFr: 'Sans engagement · Aucun paiement facturé en démo.',
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
  // Legacy alias mapped directly to Premium (5 €) for backwards compatibility
  PLUS: {
    ...PREMIUM_CONFIG,
    planId: 'PLUS',
  },
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
  preparePlanUpgradeIntent({ targetPlanId }) {
    const plan = SUBSCRIPTION_PLANS_CONFIG[targetPlanId];
    return {
      status: 'ABSTRACTION_READY_NO_PAYMENT_COLLECTED',
      providerId: 'unconfigured_abstraction',
      explanationFr: `Offre « ${plan.nameFr} (${plan.pricingDisplayLabelFr}) » prête (aucun paiement facturé en démo, zéro carte stockée).`,
    };
  },
};

const globalForSubscriptions = globalThis as unknown as {
  __fiscaliqSubscriptionsStore?: Map<string, HouseholdUsageSnapshot>;
};

const householdSubscriptionsStore =
  globalForSubscriptions.__fiscaliqSubscriptionsStore ??
  (globalForSubscriptions.__fiscaliqSubscriptionsStore = new Map<string, HouseholdUsageSnapshot>([
    [
      'foyer-couple-2-enfants',
      {
        householdId: 'foyer-couple-2-enfants',
        planId: 'PREMIUM',
        periodMonth: '2026-11',
        savedSimulationsUsed: 4,
        assistantQuestionsUsed: 6,
        pdfReportsGeneratedUsed: 1,
        updatedAtIso: '2026-11-10T09:00:00.000Z',
      },
    ],
    [
      'foyer-celibataire-salarie',
      {
        householdId: 'foyer-celibataire-salarie',
        planId: 'FREE',
        periodMonth: '2026-11',
        savedSimulationsUsed: 1,
        assistantQuestionsUsed: 2,
        pdfReportsGeneratedUsed: 0,
        updatedAtIso: '2026-11-10T09:00:00.000Z',
      },
    ],
    [
      'foyer-parent-isole',
      {
        householdId: 'foyer-parent-isole',
        planId: 'PREMIUM',
        periodMonth: '2026-11',
        savedSimulationsUsed: 2,
        assistantQuestionsUsed: 3,
        pdfReportsGeneratedUsed: 0,
        updatedAtIso: '2026-11-10T09:00:00.000Z',
      },
    ],
    [
      'foyer-couple-retraites',
      {
        householdId: 'foyer-couple-retraites',
        planId: 'PREMIUM',
        periodMonth: '2026-11',
        savedSimulationsUsed: 3,
        assistantQuestionsUsed: 4,
        pdfReportsGeneratedUsed: 1,
        updatedAtIso: '2026-11-10T09:00:00.000Z',
      },
    ],
  ]));

export function getOrCreateHouseholdSubscription(
  householdId: string
): HouseholdUsageSnapshot {
  const existing = householdSubscriptionsStore.get(householdId);
  if (existing) {
    return { ...existing };
  }
  const initial: HouseholdUsageSnapshot = {
    householdId,
    planId: 'PREMIUM',
    periodMonth: '2026-11',
    savedSimulationsUsed: 1,
    assistantQuestionsUsed: 1,
    pdfReportsGeneratedUsed: 0,
    updatedAtIso: new Date().toISOString(),
  };
  householdSubscriptionsStore.set(householdId, initial);
  return { ...initial };
}

export function setHouseholdPlanForSimulation(
  authenticatedHouseholdId: string,
  targetHouseholdId: string,
  newPlanId: SubscriptionPlanId
): EntitlementCheckResult {
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
  householdSubscriptionsStore.set(targetHouseholdId, updated);

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
    householdSubscriptionsStore.set(targetHouseholdId, updated);
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
  householdSubscriptionsStore.set('foyer-celibataire-salarie', {
    householdId: 'foyer-celibataire-salarie',
    planId: 'FREE',
    periodMonth: '2026-11',
    savedSimulationsUsed: 1,
    assistantQuestionsUsed: 2,
    pdfReportsGeneratedUsed: 0,
    updatedAtIso: '2026-11-10T09:00:00.000Z',
  });
  householdSubscriptionsStore.set('foyer-couple-2-enfants', {
    householdId: 'foyer-couple-2-enfants',
    planId: 'PREMIUM',
    periodMonth: '2026-11',
    savedSimulationsUsed: 4,
    assistantQuestionsUsed: 6,
    pdfReportsGeneratedUsed: 1,
    updatedAtIso: '2026-11-10T09:00:00.000Z',
  });
}
