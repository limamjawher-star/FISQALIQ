import { z } from 'zod';

export const corporateTaxSchema = z.object({
  annualTurnoverHt: z.number().min(0, 'Le chiffre d’affaires HT doit être positif ou nul.'),
  taxableProfit: z.number().min(-10000000, 'Le résultat fiscal est invalide.'),
  isCapitalFullyPaidUp: z.boolean(),
  physicalPersonOwnershipShare: z
    .number()
    .min(0, 'La part de détention doit être comprise entre 0 et 1.')
    .max(1, 'La part de détention ne peut excéder 100 %.'),
  fiscalYearMonths: z.number().min(1).max(24).optional(),
  taxYear: z.union([z.literal(2026), z.literal(2025)]).optional(),
  eligibilityMode: z.enum(['auto', 'unknown']).optional(),
});

export const payrollSimulationSchema = z.object({
  grossMonthlySalary: z
    .number()
    .min(500, 'Veuillez saisir un salaire mensuel brut supérieur ou égal à 500 €.')
    .max(100000, 'Montant mensuel brut hors limites de simulation.'),
  status: z.enum(['non_cadre', 'cadre']),
  companySize: z.enum(['under_11', '11_to_49', '50_or_more']),
  headcount: z.number().int().min(1).max(500).optional(),
  workingTimeRatio: z.number().min(0.1).max(1).optional(),
  taxYear: z.union([z.literal(2026), z.literal(2025)]).optional(),
});

export const profitabilitySchema = z.object({
  annualRevenueHt: z.number().min(1000, 'Le chiffre d’affaires annuel doit être d’au moins 1 000 €.'),
  variableCostsHt: z.number().min(0),
  fixedExternalExpensesHt: z.number().min(0),
  operatingTaxesHt: z.number().min(0),
  totalPayrollCost: z.number().min(0),
  depreciationAndAmortization: z.number().min(0),
  isPmeReducedRateEligible: z.boolean(),
  taxYear: z.union([z.literal(2026), z.literal(2025)]).optional(),
});

export const onboardingCompanySchema = z.object({
  companyName: z.string().min(2, 'La raison sociale doit comporter au moins 2 caractères.'),
  siren: z
    .string()
    .regex(/^\d{9}$/, 'Le numéro SIREN doit comporter exactement 9 chiffres (ex: 892341502).'),
  legalForm: z.enum(['SAS', 'SASU', 'SARL', 'EURL', 'SA']),
  taxRegime: z.enum(['IS_REEL_SIMPLIFIE', 'IS_REEL_NORMAL', 'IR_BIC_BNC']),
  vatRegime: z.enum(['REEL_NORMAL_MENSUEL', 'REEL_SIMPLIFIE_ANNUEL', 'FRANCHISE_BASE']),
  companySize: z.enum(['under_11', '11_to_49', '50_or_more']),
  annualTurnoverHt: z.number().min(0, 'Le chiffre d’affaires HT doit être positif.'),
  taxableProfitEstimate: z.number(),
  headcount: z.number().int().min(0).max(2000),
  isCapitalFullyPaidUp: z.boolean(),
  physicalPersonOwnershipShare: z.number().min(0).max(100),
  collectiveAgreementCode: z.string().min(2, 'Veuillez indiquer la convention collective (ex: IDCC 1486 Syntec).'),
});

export const contactFormSchema = z.object({
  fullName: z.string().min(2, 'Veuillez indiquer votre nom complet.'),
  workEmail: z.string().email('Veuillez saisir une adresse e-mail professionnelle valide.'),
  companyName: z.string().min(2, 'Veuillez indiquer le nom de votre entreprise.'),
  headcountRange: z.enum(['1-9', '10-49', '50-249', '250+']),
  topic: z.enum(['demo_plateforme', 'simulation_paie_is', 'partenariat_cabinet', 'securite_rgpd']),
  message: z.string().min(15, 'Votre message doit contenir au moins 15 caractères.'),
});

export const personalContactFormSchema = z.object({
  fullName: z.string().min(2, 'Veuillez indiquer votre prénom et votre nom.'),
  email: z.string().email('Veuillez saisir une adresse e-mail valide.'),
  householdSituation: z.enum([
    'salarie_celibataire',
    'couple_famille',
    'parent_isole',
    'retraite_bailleur',
    'independant_etudiant',
  ]),
  topic: z.enum([
    'question_simulateur_ir',
    'credits_reductions_impot',
    'prelevement_source_salaire',
    'confidentialite_rgpd',
  ]),
  message: z.string().min(15, 'Votre message doit contenir au moins 15 caractères.'),
});

export const aiQuerySchema = z.object({
  question: z
    .string()
    .min(3, 'Veuillez formuler une question fiscale d’au moins 3 caractères.')
    .max(1200, 'La question ne doit pas dépasser 1 200 caractères.'),
  companyContext: z
    .object({
      legalForm: z.string(),
      annualTurnoverHt: z.number(),
      headcount: z.number(),
      taxableProfit: z.number(),
    })
    .optional(),
});

export const personalTaxAssistantQuerySchema = z.object({
  question: z
    .string()
    .min(3, 'Veuillez formuler une question d’au moins 3 caractères.')
    .max(1200, 'Votre question ne peut pas dépasser 1 200 caractères.'),
  taxYear: z.union([z.literal(2026), z.literal(2025)]).optional().default(2026),
  effectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ).')
    .optional()
    .default('2026-11-10'),
  useHouseholdProfile: z.boolean().optional().default(true),
  authorizedHouseholdId: z.string().min(1).max(120).optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(3000),
      })
    )
    .max(10)
    .optional()
    .default([]),
  householdContext: z
    .object({
      householdId: z.string().min(1).max(120),
      householdName: z.string().max(140),
      maritalStatus: z.enum([
        'celibataire',
        'marie_pacse',
        'parent_isole',
        'divorce_separe',
        'veuf',
      ]),
      dependantsCount: z.number().int().min(0).max(15),
      isIsolatedParent: z.boolean().optional().default(false),
      annualDeclaredSalaryNetImposableEur: z.number().min(0).max(5000000),
      additionalNetTaxableIncomeEur: z.number().min(0).max(5000000).optional().default(0),
      grossMonthlySalaryEur: z.number().min(0).max(500000).optional().default(0),
      employmentCategory: z
        .enum([
          'salarie_non_cadre',
          'salarie_cadre',
          'fonction_publique',
          'non_cadre',
          'cadre',
          'retraite',
          'independant',
        ])
        .optional()
        .default('salarie_non_cadre'),
      perContributionAnnualEur: z.number().min(0).max(500000).optional().default(0),
      estimatedEligibleTaxCreditsEur: z.number().min(0).max(200000).optional().default(0),
    })
    .optional(),
});

export const personalTaxAssistantStructuredModelSchema = z.object({
  directAnswer: z.string().min(10),
  verifiedLegalFacts: z.array(z.string()).min(1).max(6),
  assumptionsAndLimits: z.array(z.string()).min(1).max(5),
  personalRecommendations: z.array(z.string()).min(1).max(5),
  explainedTerms: z
    .array(
      z.object({
        term: z.string(),
        plainExplanation: z.string(),
      })
    )
    .max(5),
  simpleExample: z.string().min(10),
  clarifyingQuestions: z.array(z.string()).min(1).max(4),
  insufficientInformationNotice: z.string().nullable().optional(),
  citedDocumentIds: z.array(z.string()).min(1).max(4),
});


