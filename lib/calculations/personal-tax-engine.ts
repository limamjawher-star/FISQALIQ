/**
 * FISCALIQ — Deterministic French Personal Income Tax (Impôt sur le Revenu - IR)
 * & Salary Gross-to-Net / Withholding Tax (Prélèvement à la Source) Engine
 *
 * Official sources:
 * - Code général des impôts (CGI) Art. 193 à 199 (Quotient familial, barème progressif, plafonnement, décote)
 * - CGI Art. 83-3° (Déduction forfaitaire de 10 % pour frais professionnels)
 * - service-public.fr (Barème de l'impôt sur le revenu 2026 sur revenus 2025 & 2025 sur revenus 2024)
 * - impots.gouv.fr (Brochure pratique de la déclaration des revenus)
 *
 * IMPORTANT:
 * - Zero corporate tax (IS) or employer recruitment formulas are used in personal tax calculations.
 * - All arithmetic is 100% deterministic, versioned by applicable tax year (2026 default, 2025 historical).
 */

import { roundCurrency, roundRate } from './engine';
import { SupportedTaxYear } from './tax-parameters';
export type { SupportedTaxYear };

export type FamilyMaritalStatus =
  | 'celibataire'
  | 'marie_pacse'
  | 'parent_isole'
  | 'divorce_separe'
  | 'veuf';

export type HouseholdActivityProfile =
  | 'salarie'
  | 'retraite'
  | 'independant'
  | 'etudiant'
  | 'proprietaire_bailleur';

export interface PersonalTaxBracket {
  minEur: number;
  maxEur: number | null;
  rate: number; // e.g., 0, 0.11, 0.30, 0.41, 0.45
  label: string;
}

export interface PersonalTaxYearParameters {
  declarationYear: SupportedTaxYear; // 2026 (for 2025 income) or 2025 (for 2024 income)
  incomeYear: number; // 2025 or 2024
  versionId: string;
  verifiedDate: string;
  officialSourceUrl: string;
  brackets: PersonalTaxBracket[];
  deduction10PercentFloorEur: number;
  deduction10PercentCeilingEur: number;
  quotientCapPerHalfPartEur: number;
  quotientCapSingleParentFirstChildEur: number;
  decoteSingleThresholdEur: number;
  decoteSingleLumpSumEur: number;
  decoteCoupleThresholdEur: number;
  decoteCoupleLumpSumEur: number;
  decoteRate: number;
  minimumCollectionThresholdEur: number; // 61 € (CGI Art. 1657-1 bis)
}

export const PERSONAL_TAX_PARAMETERS_2026: PersonalTaxYearParameters = {
  declarationYear: 2026,
  incomeYear: 2025,
  versionId: 'FR-IR-2026-REV2025',
  verifiedDate: '2026-11-08',
  officialSourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F1419',
  brackets: [
    { minEur: 0, maxEur: 11600, rate: 0, label: 'Jusqu’à 11 600 € (0 %)' },
    { minEur: 11600, maxEur: 29579, rate: 0.11, label: 'De 11 601 € à 29 579 € (11 %)' },
    { minEur: 29579, maxEur: 84577, rate: 0.3, label: 'De 29 580 € à 84 577 € (30 %)' },
    { minEur: 84577, maxEur: 181917, rate: 0.41, label: 'De 84 578 € à 181 917 € (41 %)' },
    { minEur: 181917, maxEur: null, rate: 0.45, label: 'Plus de 181 917 € (45 %)' },
  ],
  deduction10PercentFloorEur: 509,
  deduction10PercentCeilingEur: 14555,
  quotientCapPerHalfPartEur: 1807,
  quotientCapSingleParentFirstChildEur: 4262,
  decoteSingleThresholdEur: 1982,
  decoteSingleLumpSumEur: 897,
  decoteCoupleThresholdEur: 3277,
  decoteCoupleLumpSumEur: 1483,
  decoteRate: 0.4525,
  minimumCollectionThresholdEur: 61,
};

export const PERSONAL_TAX_PARAMETERS_2025: PersonalTaxYearParameters = {
  declarationYear: 2025,
  incomeYear: 2024,
  versionId: 'FR-IR-2025-REV2024',
  verifiedDate: '2026-11-08',
  officialSourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F1419',
  brackets: [
    { minEur: 0, maxEur: 11497, rate: 0, label: 'Jusqu’à 11 497 € (0 %)' },
    { minEur: 11497, maxEur: 29315, rate: 0.11, label: 'De 11 498 € à 29 315 € (11 %)' },
    { minEur: 29315, maxEur: 83823, rate: 0.3, label: 'De 29 316 € à 83 823 € (30 %)' },
    { minEur: 83823, maxEur: 180294, rate: 0.41, label: 'De 83 824 € à 180 294 € (41 %)' },
    { minEur: 180294, maxEur: null, rate: 0.45, label: 'Plus de 180 294 € (45 %)' },
  ],
  deduction10PercentFloorEur: 499,
  deduction10PercentCeilingEur: 13522,
  quotientCapPerHalfPartEur: 1791,
  quotientCapSingleParentFirstChildEur: 4224,
  decoteSingleThresholdEur: 1964,
  decoteSingleLumpSumEur: 889,
  decoteCoupleThresholdEur: 3248,
  decoteCoupleLumpSumEur: 1470,
  decoteRate: 0.4525,
  minimumCollectionThresholdEur: 61,
};

export function getPersonalTaxParameters(
  year: SupportedTaxYear = 2026
): PersonalTaxYearParameters {
  return year === 2025 ? PERSONAL_TAX_PARAMETERS_2025 : PERSONAL_TAX_PARAMETERS_2026;
}

/**
 * Deterministic calculation of French household tax shares (Nombre de parts de quotient familial)
 * according to CGI Art. 194.
 */
export function calculateFamilyQuotientParts(input: {
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
}): {
  baseParts: number;
  totalParts: number;
  extraHalfPartsCount: number;
  explanation: string;
} {
  const children = Math.max(0, Math.floor(input.dependantsCount));
  const isCouple = input.maritalStatus === 'marie_pacse';
  const isWidowWithChildren = input.maritalStatus === 'veuf' && children > 0;

  const baseParts = isCouple || isWidowWithChildren ? 2 : 1;

  let childrenParts = 0;
  if (children === 1) {
    childrenParts = 0.5;
  } else if (children === 2) {
    childrenParts = 1.0;
  } else if (children >= 3) {
    childrenParts = 1.0 + (children - 2) * 1.0;
  }

  // Case T (parent isolé): +0.5 part additional when raising at least 1 child alone
  const singleParentBonus =
    input.maritalStatus === 'parent_isole' && children >= 1 ? 0.5 : 0;

  // For a widow with children, base is already 2 parts; standard child additions apply on top of 1 part or 2 parts
  const totalParts = isWidowWithChildren
    ? 1 + childrenParts + 1 // widow with dependent children retains spouse part (+1 part)
    : baseParts + childrenParts + singleParentBonus;

  const extraHalfPartsCount = Math.round((totalParts - (isCouple ? 2 : 1)) * 2);

  const statusLabels: Record<FamilyMaritalStatus, string> = {
    celibataire: 'Célibataire',
    marie_pacse: 'Marié(e) ou Pacsé(e)',
    parent_isole: 'Parent isolé (case T)',
    divorce_separe: 'Divorcé(e) ou Séparé(e)',
    veuf: 'Veuf / Veuve',
  };

  const explanation =
    children === 0
      ? `${statusLabels[input.maritalStatus]} sans personne à charge (${totalParts} ${
          totalParts > 1 ? 'parts' : 'part'
        })`
      : `${statusLabels[input.maritalStatus]} avec ${children} ${
          children > 1 ? 'enfants/personnes à charge' : 'enfant/personne à charge'
        } (${totalParts.toLocaleString('fr-FR')} parts)`;

  return {
    baseParts: isCouple ? 2 : 1,
    totalParts,
    extraHalfPartsCount,
    explanation,
  };
}

export interface PersonalIncomeTaxInput {
  /** Annual net taxable salary/pension/income before 10% deduction (Revenu net déclaré annuel) in EUR */
  annualDeclaredIncomeEur: number;
  /** Optional additional net taxable income (ex: revenus fonciers nets ou BNC nets) in EUR */
  additionalTaxableIncomeEur?: number;
  /** Family marital status */
  maritalStatus: FamilyMaritalStatus;
  /** Number of dependent children / persons */
  dependantsCount: number;
  /** Expense deduction mode: 'abattement_10' (default automatic 10%) or 'frais_reels' */
  expenseDeductionMode?: 'abattement_10' | 'frais_reels';
  /** Deductible professional expenses if 'frais_reels' is selected */
  realExpensesAmountEur?: number;
  /** Deductible retirement savings (Versements PER déductibles, CGI Art. 163 quatervicies) */
  perDeductibleContributionEur?: number;
  /** Eligible tax credits/reductions (ex: garde d'enfant, emploi à domicile, dons) */
  estimatedTaxCreditsEur?: number;
  /** Declaration year (2026 default on 2025 income, or 2025 historical on 2024 income) */
  taxYear?: SupportedTaxYear;
}

export interface PersonalBracketSliceResult {
  label: string;
  ratePercent: number;
  taxableSlicePerPartEur: number;
  taxPerPartEur: number;
}

export interface PersonalIncomeTaxResult {
  declarationYear: SupportedTaxYear;
  incomeYear: number;
  parameterVersion: string;
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
  familyQuotientParts: number;
  familyQuotientExplanation: string;
  annualDeclaredIncomeEur: number;
  additionalTaxableIncomeEur: number;
  deductionAppliedEur: number;
  perDeductibleContributionEur: number;
  netTaxableIncomeEur: number; // Revenu net imposable (RNI)
  taxableIncomePerPartEur: number; // Quotient familial = RNI / parts
  marginalTaxRatePercent: number; // TMI (0, 11, 30, 41, 45)
  bracketSlices: PersonalBracketSliceResult[];
  grossTaxBeforeCapEur: number;
  isQuotientCapApplied: boolean;
  quotientCapIncreaseEur: number;
  grossTaxAfterCapEur: number;
  decoteAmountEur: number;
  taxBeforeCreditsEur: number;
  taxCreditsAppliedEur: number;
  finalEstimatedTaxEur: number;
  effectiveWithholdingRatePercent: number; // Taux de prélèvement à la source estimé (%)
  monthlyWithholdingTaxEur: number;
  monthlyDisposableIncomeAfterTaxEur: number;
  annualDisposableIncomeAfterTaxEur: number;
  classification: 'CALCUL_VERIFIE';
  officialSourceUrl: string;
  disclaimer: string;
}

function computeProgressiveTaxForParts(
  netTaxableIncomeEur: number,
  parts: number,
  brackets: PersonalTaxBracket[]
): {
  totalTaxEur: number;
  marginalRatePercent: number;
  slices: PersonalBracketSliceResult[];
} {
  const incomePerPart = parts > 0 ? Math.max(0, netTaxableIncomeEur / parts) : 0;
  let taxPerPart = 0;
  let marginalRate = 0;
  const slices: PersonalBracketSliceResult[] = [];

  for (const b of brackets) {
    if (incomePerPart > b.minEur) {
      const upper = b.maxEur !== null ? Math.min(incomePerPart, b.maxEur) : incomePerPart;
      const sliceBase = Math.max(0, upper - b.minEur);
      const sliceTax = sliceBase * b.rate;
      taxPerPart += sliceTax;
      if (sliceBase > 0) {
        marginalRate = Math.round(b.rate * 100);
      }
      slices.push({
        label: b.label,
        ratePercent: Math.round(b.rate * 100),
        taxableSlicePerPartEur: roundCurrency(sliceBase),
        taxPerPartEur: roundCurrency(sliceTax),
      });
    } else {
      slices.push({
        label: b.label,
        ratePercent: Math.round(b.rate * 100),
        taxableSlicePerPartEur: 0,
        taxPerPartEur: 0,
      });
    }
  }

  return {
    totalTaxEur: Math.round(taxPerPart * parts),
    marginalRatePercent: marginalRate,
    slices,
  };
}

/**
 * Deterministic calculation of French Personal Income Tax (Impôt sur le revenu - IR)
 * with 10% deduction, family quotient, quotient cap (plafonnement), décote, TMI, and PAS rate.
 */
export function calculatePersonalIncomeTax(
  input: PersonalIncomeTaxInput
): PersonalIncomeTaxResult {
  const params = getPersonalTaxParameters(input.taxYear ?? 2026);
  const declaredSalary = Math.max(0, input.annualDeclaredIncomeEur);
  const additionalIncome = Math.max(0, input.additionalTaxableIncomeEur ?? 0);
  const perDeduction = Math.max(0, input.perDeductibleContributionEur ?? 0);
  const taxCredits = Math.max(0, input.estimatedTaxCreditsEur ?? 0);

  const quotientInfo = calculateFamilyQuotientParts({
    maritalStatus: input.maritalStatus,
    dependantsCount: input.dependantsCount,
  });

  // 1. Professional expenses deduction (10% automatic vs Frais réels)
  let deductionAppliedEur = 0;
  if (declaredSalary > 0) {
    if (
      input.expenseDeductionMode === 'frais_reels' &&
      input.realExpensesAmountEur !== undefined &&
      input.realExpensesAmountEur > 0
    ) {
      deductionAppliedEur = Math.min(declaredSalary, Math.round(input.realExpensesAmountEur));
    } else {
      const raw10 = Math.round(declaredSalary * 0.1);
      const minFloor = Math.min(declaredSalary, params.deduction10PercentFloorEur);
      // For a couple, ceiling applies per declarant; we apply standard ceiling for primary declarant or 1.5x for couple aggregate
      const maxCeiling =
        input.maritalStatus === 'marie_pacse'
          ? Math.round(params.deduction10PercentCeilingEur * 1.6)
          : params.deduction10PercentCeilingEur;
      deductionAppliedEur = Math.max(minFloor, Math.min(maxCeiling, raw10));
    }
  }

  const netSalaryAfterDeduction = Math.max(0, declaredSalary - deductionAppliedEur);
  const netTaxableIncomeEur = Math.max(
    0,
    Math.round(netSalaryAfterDeduction + additionalIncome - perDeduction)
  );

  // 2. Progressive tax with full household parts vs base parts (for quotient familial cap check)
  const withFullParts = computeProgressiveTaxForParts(
    netTaxableIncomeEur,
    quotientInfo.totalParts,
    params.brackets
  );
  const withBaseParts = computeProgressiveTaxForParts(
    netTaxableIncomeEur,
    quotientInfo.baseParts,
    params.brackets
  );

  // 3. Plafonnement du quotient familial (CGI Art. 197-I-2)
  let maxQuotientAdvantage = 0;
  if (quotientInfo.extraHalfPartsCount > 0) {
    if (input.maritalStatus === 'parent_isole' && input.dependantsCount >= 1) {
      // First child of a single parent gives 2 half-parts (1 full part) capped at 4 262 € (2026)
      const remainingHalfParts = Math.max(0, quotientInfo.extraHalfPartsCount - 2);
      maxQuotientAdvantage =
        params.quotientCapSingleParentFirstChildEur +
        remainingHalfParts * params.quotientCapPerHalfPartEur;
    } else {
      maxQuotientAdvantage =
        quotientInfo.extraHalfPartsCount * params.quotientCapPerHalfPartEur;
    }
  }

  const minAllowedTaxAfterCap = Math.max(
    0,
    withBaseParts.totalTaxEur - maxQuotientAdvantage
  );
  const isQuotientCapApplied =
    quotientInfo.extraHalfPartsCount > 0 &&
    withFullParts.totalTaxEur < minAllowedTaxAfterCap;
  const grossTaxAfterCapEur = isQuotientCapApplied
    ? minAllowedTaxAfterCap
    : withFullParts.totalTaxEur;
  const quotientCapIncreaseEur = Math.max(
    0,
    grossTaxAfterCapEur - withFullParts.totalTaxEur
  );

  // 4. Décote (CGI Art. 197-I-4)
  const isCouple = input.maritalStatus === 'marie_pacse';
  const decoteThreshold = isCouple
    ? params.decoteCoupleThresholdEur
    : params.decoteSingleThresholdEur;
  const decoteLumpSum = isCouple
    ? params.decoteCoupleLumpSumEur
    : params.decoteSingleLumpSumEur;

  let decoteAmountEur = 0;
  if (grossTaxAfterCapEur > 0 && grossTaxAfterCapEur < decoteThreshold) {
    const rawDecote = Math.round(decoteLumpSum - grossTaxAfterCapEur * params.decoteRate);
    decoteAmountEur = Math.max(0, Math.min(grossTaxAfterCapEur, rawDecote));
  }

  const taxBeforeCreditsEur = Math.max(0, grossTaxAfterCapEur - decoteAmountEur);

  // 5. Apply tax reductions / credits & minimum collection threshold (61 € before refundable credits)
  let finalEstimatedTaxEur = Math.max(0, taxBeforeCreditsEur - taxCredits);
  if (
    taxCredits === 0 &&
    finalEstimatedTaxEur > 0 &&
    finalEstimatedTaxEur < params.minimumCollectionThresholdEur
  ) {
    finalEstimatedTaxEur = 0;
  }

  const totalAnnualIncomeBeforeDeduction = declaredSalary + additionalIncome;
  const effectiveWithholdingRatePercent =
    totalAnnualIncomeBeforeDeduction > 0
      ? Math.round((finalEstimatedTaxEur / totalAnnualIncomeBeforeDeduction) * 1000) / 10
      : 0;

  const monthlyWithholdingTaxEur = roundCurrency(finalEstimatedTaxEur / 12);
  const annualDisposableIncomeAfterTaxEur = Math.max(
    0,
    totalAnnualIncomeBeforeDeduction - finalEstimatedTaxEur
  );
  const monthlyDisposableIncomeAfterTaxEur = roundCurrency(
    annualDisposableIncomeAfterTaxEur / 12
  );

  return {
    declarationYear: params.declarationYear,
    incomeYear: params.incomeYear,
    parameterVersion: params.versionId,
    maritalStatus: input.maritalStatus,
    dependantsCount: input.dependantsCount,
    familyQuotientParts: quotientInfo.totalParts,
    familyQuotientExplanation: quotientInfo.explanation,
    annualDeclaredIncomeEur: declaredSalary,
    additionalTaxableIncomeEur: additionalIncome,
    deductionAppliedEur,
    perDeductibleContributionEur: perDeduction,
    netTaxableIncomeEur,
    taxableIncomePerPartEur:
      quotientInfo.totalParts > 0
        ? Math.round(netTaxableIncomeEur / quotientInfo.totalParts)
        : netTaxableIncomeEur,
    marginalTaxRatePercent: withFullParts.marginalRatePercent,
    bracketSlices: withFullParts.slices,
    grossTaxBeforeCapEur: withFullParts.totalTaxEur,
    isQuotientCapApplied,
    quotientCapIncreaseEur,
    grossTaxAfterCapEur,
    decoteAmountEur,
    taxBeforeCreditsEur,
    taxCreditsAppliedEur: Math.min(taxBeforeCreditsEur + taxCredits, taxCredits),
    finalEstimatedTaxEur,
    effectiveWithholdingRatePercent,
    monthlyWithholdingTaxEur,
    monthlyDisposableIncomeAfterTaxEur,
    annualDisposableIncomeAfterTaxEur,
    classification: 'CALCUL_VERIFIE',
    officialSourceUrl: params.officialSourceUrl,
    disclaimer:
      'Estimation déterministe établie selon le barème progressif officiel de l’impôt sur le revenu (article 197 du CGI). Outil d’information pédagogique indépendant : ne remplace pas votre avis d’imposition officiel sur impots.gouv.fr.',
  };
}

export interface PersonalSalarySimulatorInput {
  grossMonthlySalaryEur: number;
  status: 'non_cadre' | 'cadre' | 'fonction_publique';
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
  taxYear?: SupportedTaxYear;
}

export interface PersonalSalarySimulatorResult {
  grossMonthlySalaryEur: number;
  grossAnnualSalaryEur: number;
  employeeSocialContributionsMonthlyEur: number;
  employeeSocialContributionRatePercent: number;
  netBeforeTaxMonthlyEur: number; // Salaire net avant impôt
  netTaxableMonthlyEur: number; // Salaire net imposable (incluant CSG/CRDS non déductible 2,9 %)
  withholdingTaxRatePercent: number; // Taux de prélèvement à la source (PAS)
  withholdingTaxMonthlyEur: number; // Montant prélevé à la source chaque mois
  netAfterTaxMonthlyEur: number; // Salaire net versé sur le compte bancaire après impôt
  netAfterTaxAnnualEur: number;
  marginalTaxRatePercent: number;
  familyQuotientParts: number;
}

/**
 * Deterministic Personal Salary Simulator (Brut -> Net avant impôt -> Prélèvement à la source -> Net après impôt).
 * Designed for ordinary employees to understand their payslip without employer/company jargon.
 */
export function calculatePersonalSalaryToNetAfterTax(
  input: PersonalSalarySimulatorInput
): PersonalSalarySimulatorResult {
  const grossMonthly = Math.max(0, input.grossMonthlySalaryEur);
  // Statutory employee social contributions (~21.4% non-cadre, ~21.7% cadre, ~17.5% fonction publique)
  const socialRate =
    input.status === 'fonction_publique'
      ? 0.175
      : input.status === 'cadre'
      ? 0.215
      : 0.212;

  const employeeSocialContributionsMonthlyEur = roundCurrency(grossMonthly * socialRate);
  const netBeforeTaxMonthlyEur = roundCurrency(
    Math.max(0, grossMonthly - employeeSocialContributionsMonthlyEur)
  );
  // Net imposable includes non-deductible CSG/CRDS (2.90% of 98.25% of gross ≈ 2.85% of gross)
  const nonDeductibleCsgMonthly = roundCurrency(grossMonthly * 0.9825 * 0.029);
  const netTaxableMonthlyEur = roundCurrency(
    netBeforeTaxMonthlyEur + nonDeductibleCsgMonthly
  );

  const irCalc = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: Math.round(netTaxableMonthlyEur * 12),
    maritalStatus: input.maritalStatus,
    dependantsCount: input.dependantsCount,
    taxYear: input.taxYear ?? 2026,
  });

  const withholdingTaxMonthlyEur = roundCurrency(irCalc.finalEstimatedTaxEur / 12);
  const netAfterTaxMonthlyEur = roundCurrency(
    Math.max(0, netBeforeTaxMonthlyEur - withholdingTaxMonthlyEur)
  );

  return {
    grossMonthlySalaryEur: grossMonthly,
    grossAnnualSalaryEur: roundCurrency(grossMonthly * 12),
    employeeSocialContributionsMonthlyEur,
    employeeSocialContributionRatePercent: roundRate(socialRate * 100),
    netBeforeTaxMonthlyEur,
    netTaxableMonthlyEur,
    withholdingTaxRatePercent: irCalc.effectiveWithholdingRatePercent,
    withholdingTaxMonthlyEur,
    netAfterTaxMonthlyEur,
    netAfterTaxAnnualEur: roundCurrency(netAfterTaxMonthlyEur * 12),
    marginalTaxRatePercent: irCalc.marginalTaxRatePercent,
    familyQuotientParts: irCalc.familyQuotientParts,
  };
}

/**
 * ============================================================================
 * 7-STEP PERSONAL TAX ONBOARDING WIZARD — DETERMINISTIC ENGINE & VALIDATION
 * ============================================================================
 * Designed for users with little or no tax knowledge:
 * - Supports French tax residency check + dedicated future non-resident workflow
 * - Supports all 6 household statuses (single, married, PACS, divorced, separated, widowed)
 * - Supports exclusive custody vs shared custody (garde alternée) & disability half-parts
 * - Never makes legal eligibility assumptions when answers are skipped or unknown
 */

export type TaxResidencyChoice =
  | 'resident_france'
  | 'non_resident_revenus_france'
  | 'incertain_a_verifier';

export type OnboardingHouseholdStatus =
  | 'celibataire'
  | 'marie'
  | 'pacse'
  | 'divorce'
  | 'separe'
  | 'veuf';

export type TriStateAnswer = 'oui' | 'non' | 'ne_sait_pas';

export type IncomeCategoryKey =
  | 'salaires'
  | 'pensions_retraite'
  | 'allocations_chomage'
  | 'independant_bic_bnc'
  | 'revenus_locatifs'
  | 'revenus_placements';

export type ExpenseSituationKey =
  | 'frais_professionnels_reels'
  | 'garde_enfants_moins_6_ans'
  | 'emploi_domicile'
  | 'dons_associations'
  | 'pension_alimentaire_versee'
  | 'epargne_retraite_per';

export interface OnboardingIncomeEntry {
  selected: boolean;
  annualAmountEur: number;
  amountUnknownOrSkipped: boolean;
}

export interface OnboardingExpenseEntry {
  selected: boolean;
  annualAmountEur: number;
  amountUnknownOrSkipped: boolean;
  conditionsConfirmed: TriStateAnswer;
}

export interface PersonalTaxOnboardingState {
  // Step 1: Residency
  profileLabel: string;
  residencyStatus: TaxResidencyChoice;
  countryOfResidence: string;
  nonResidentHasFrenchSourceIncome: TriStateAnswer;

  // Step 2: Household situation
  householdStatus: OnboardingHouseholdStatus;
  livesAloneOnJan1: TriStateAnswer; // For Case T (parent isolé) when unmarried with children
  spousePassedAwayCurrentYear: TriStateAnswer; // For widowed status

  // Step 3: Children & dependants
  hasDependants: boolean;
  childrenUnder6Count: number;
  children6To17Count: number;
  adultChildrenAttachedCount: number; // 18-21 or <25 students attached to household
  exclusiveCustodyChildrenCount: number;
  sharedCustodyChildrenCount: number; // Garde alternée (divisés par 2 pour les parts)
  dependantsWithDisabilityCardCount: number; // CMI mention invalidité (+0,5 part CGI Art. 195)

  // Step 4: Income (Multiple income types allowed, unknown amounts skippable)
  incomes: Record<IncomeCategoryKey, OnboardingIncomeEntry>;

  // Step 5: Expenses & tax-related situations
  expenses: Record<ExpenseSituationKey, OnboardingExpenseEntry>;

  // Step 6: Existing tax information (100% optional)
  skipExistingTaxNoticeStep: boolean;
  previousReferenceTaxIncomeEur: number | null; // Revenu fiscal de référence N-1
  availablePerCeilingEur: number | null; // Plafond épargne retraite sur avis N-1
  currentWithholdingRatePct: number | null; // Taux PAS actuel (%)
  taxAlreadyWithheldOrPaidEur: number | null; // Montant déjà prélevé cette année (€)
}

export interface OnboardingQuotientResult {
  baseParts: number;
  exclusiveChildrenParts: number;
  sharedCustodyChildrenParts: number;
  singleParentCaseTBonusParts: number;
  disabilityBonusParts: number;
  totalParts: number;
  mappedEngineMaritalStatus: FamilyMaritalStatus;
  totalDependantsCount: number;
  caseTApplied: boolean;
  caseTNeedsVerification: boolean;
  explanationLines: string[];
}

/**
 * Deterministic calculation of French tax shares (parts fiscales) from the onboarding wizard,
 * including exclusive custody vs shared custody (garde alternée, CGI Art. 194-I) and Case T.
 * Never assumes Case T if `livesAloneOnJan1` is 'ne_sait_pas' or 'non'.
 */
export function calculateOnboardingQuotientParts(input: {
  householdStatus: OnboardingHouseholdStatus;
  livesAloneOnJan1: TriStateAnswer;
  spousePassedAwayCurrentYear?: TriStateAnswer;
  exclusiveCustodyChildrenCount: number;
  sharedCustodyChildrenCount: number;
  dependantsWithDisabilityCardCount?: number;
}): OnboardingQuotientResult {
  const exclusiveCount = Math.max(0, Math.floor(input.exclusiveCustodyChildrenCount));
  const sharedCount = Math.max(0, Math.floor(input.sharedCustodyChildrenCount));
  const disabilityCount = Math.max(
    0,
    Math.floor(input.dependantsWithDisabilityCardCount || 0)
  );
  const totalChildren = exclusiveCount + sharedCount;

  const isCouple =
    input.householdStatus === 'marie' || input.householdStatus === 'pacse';
  const isWidowWithCoupleParts =
    input.householdStatus === 'veuf' &&
    (totalChildren > 0 || input.spousePassedAwayCurrentYear === 'oui');

  const baseParts = isCouple || isWidowWithCoupleParts ? 2 : 1;

  // Exclusive custody children: +0.5 for 1st & 2nd, +1.0 for 3rd and beyond (CGI Art. 194-I)
  let exclusiveChildrenParts = 0;
  for (let i = 1; i <= exclusiveCount; i++) {
    exclusiveChildrenParts += i <= 2 ? 0.5 : 1.0;
  }

  // Shared custody children (garde alternée) rank after exclusive custody children:
  // +0.25 for rank 1 or 2, +0.5 for rank 3 and beyond (CGI Art. 194-I)
  let sharedCustodyChildrenParts = 0;
  for (let j = 1; j <= sharedCount; j++) {
    const childRank = exclusiveCount + j;
    sharedCustodyChildrenParts += childRank <= 2 ? 0.25 : 0.5;
  }

  // Case T (Parent isolé): only if unmarried/divorced/separated, has >=1 child, and explicitly confirmed living alone on Jan 1st
  const isUnmarriedStatus =
    input.householdStatus === 'celibataire' ||
    input.householdStatus === 'divorce' ||
    input.householdStatus === 'separe';

  const caseTApplied =
    isUnmarriedStatus && totalChildren >= 1 && input.livesAloneOnJan1 === 'oui';
  const caseTNeedsVerification =
    isUnmarriedStatus &&
    totalChildren >= 1 &&
    input.livesAloneOnJan1 === 'ne_sait_pas';

  let singleParentCaseTBonusParts = 0;
  if (caseTApplied) {
    // +0.5 part if at least 1 exclusive child, or +0.25 if only shared custody children
    singleParentCaseTBonusParts = exclusiveCount >= 1 ? 0.5 : 0.25;
  }

  const disabilityBonusParts = disabilityCount * 0.5;

  const totalParts =
    baseParts +
    exclusiveChildrenParts +
    sharedCustodyChildrenParts +
    singleParentCaseTBonusParts +
    disabilityBonusParts;

  const explanationLines: string[] = [];
  if (isCouple) {
    explanationLines.push('Couple marié ou pacsé (imposition commune) : 2,0 parts de base.');
  } else if (isWidowWithCoupleParts) {
    explanationLines.push(
      'Veuf / Veuve avec enfant(s) à charge ou décès en cours d’année : maintien de 2,0 parts de base (CGI Art. 194).'
    );
  } else {
    explanationLines.push('Déclarant seul (célibataire, divorcé, séparé ou veuf sans enfant) : 1,0 part de base.');
  }

  if (exclusiveCount > 0) {
    explanationLines.push(
      `${exclusiveCount} enfant(s) en charge exclusive : +${exclusiveChildrenParts.toLocaleString(
        'fr-FR'
      )} part(s) (0,5 part pour chacun des 2 premiers, 1 part entière dès le 3e).`
    );
  }

  if (sharedCount > 0) {
    explanationLines.push(
      `${sharedCount} enfant(s) en garde alternée : +${sharedCustodyChildrenParts.toLocaleString(
        'fr-FR'
      )} part(s) (avantage partagé par moitié entre les deux parents).`
    );
  }

  if (caseTApplied) {
    explanationLines.push(
      `Parent isolé vivant seul au 1er janvier (Case T confirmée) : +${singleParentCaseTBonusParts.toLocaleString(
        'fr-FR'
      )} part supplémentaire.`
    );
  } else if (caseTNeedsVerification) {
    explanationLines.push(
      'Condition « vivre seul au 1er janvier » (Case T) indiquée comme « Je ne sais pas » : la demi-part parent isolé n’est pas appliquée par prudence tant qu’elle n’est pas vérifiée.'
    );
  }

  if (disabilityCount > 0) {
    explanationLines.push(
      `Carte mobilité inclusion (CMI mention invalidité) : +${disabilityBonusParts.toLocaleString(
        'fr-FR'
      )} part(s) (CGI Art. 195).`
    );
  }

  let mappedEngineMaritalStatus: FamilyMaritalStatus = 'celibataire';
  if (isCouple) {
    mappedEngineMaritalStatus = 'marie_pacse';
  } else if (input.householdStatus === 'veuf') {
    mappedEngineMaritalStatus = 'veuf';
  } else if (caseTApplied) {
    mappedEngineMaritalStatus = 'parent_isole';
  } else if (
    input.householdStatus === 'divorce' ||
    input.householdStatus === 'separe'
  ) {
    mappedEngineMaritalStatus = 'divorce_separe';
  }

  return {
    baseParts,
    exclusiveChildrenParts,
    sharedCustodyChildrenParts,
    singleParentCaseTBonusParts,
    disabilityBonusParts,
    totalParts,
    mappedEngineMaritalStatus,
    totalDependantsCount: totalChildren,
    caseTApplied,
    caseTNeedsVerification,
    explanationLines,
  };
}

export interface OnboardingProfileEvaluation {
  isFrenchTaxResident: boolean;
  requiresNonResidentWorkflow: boolean;
  quotient: OnboardingQuotientResult;
  totalKnownSalaryPensionUnemploymentEur: number;
  totalKnownAdditionalTaxableIncomeEur: number;
  confirmedRealExpensesEur: number;
  confirmedDeductiblePerAndAlimonyEur: number;
  confirmedTaxCreditsAndReductionsEur: number;
  unconfirmedPotentialBenefitsEur: number;
  incompleteItemsToVerify: string[];
  taxEstimate: PersonalIncomeTaxResult;
  estimatedRemainingBalanceEur: number | null;
}

/**
 * Evaluates a complete 7-step PersonalTaxOnboardingState:
 * - Aggregates known incomes and confirmed tax deductions/credits
 * - Never includes unconfirmed or skipped items in the deterministic tax reduction
 * - Lists every skipped or unverified item in `incompleteItemsToVerify`
 */
export function evaluatePersonalOnboardingProfile(
  state: PersonalTaxOnboardingState
): OnboardingProfileEvaluation {
  const isFrenchTaxResident = state.residencyStatus === 'resident_france';
  const requiresNonResidentWorkflow = state.residencyStatus !== 'resident_france';

  const quotient = calculateOnboardingQuotientParts({
    householdStatus: state.householdStatus,
    livesAloneOnJan1: state.livesAloneOnJan1,
    spousePassedAwayCurrentYear: state.spousePassedAwayCurrentYear,
    exclusiveCustodyChildrenCount: state. hasDependants
      ? state.exclusiveCustodyChildrenCount
      : 0,
    sharedCustodyChildrenCount: state.hasDependants
      ? state.sharedCustodyChildrenCount
      : 0,
    dependantsWithDisabilityCardCount: state.hasDependants
      ? state.dependantsWithDisabilityCardCount
      : 0,
  });

  const incompleteItemsToVerify: string[] = [];

  if (state.residencyStatus === 'incertain_a_verifier') {
    incompleteItemsToVerify.push(
      'Résidence fiscale à confirmer selon les critères de l’article 4 B du CGI (foyer, séjour principal > 183 jours ou activité principale en France).'
    );
  } else if (state.residencyStatus === 'non_resident_revenus_france') {
    incompleteItemsToVerify.push(
      'Contribuable non-résident : application du parcours spécifique non-résident (retenue à la source et taux minimum de 20 % / 30 % CGI Art. 197 A sous réserve des conventions internationales).'
    );
  }

  if (quotient.caseTNeedsVerification) {
    incompleteItemsToVerify.push(
      'Case T (Parent isolé) : vérifiez si vous viviez seul(e) au 1er janvier pour savoir si vous avez droit à la demi-part supplémentaire.'
    );
  }

  const incomeLabels: Record<IncomeCategoryKey, string> = {
    salaires: 'Salaires et traitements (cases 1AJ/1BJ)',
    pensions_retraite: 'Pensions de retraite ou d’invalidité (cases 1AS/1BS)',
    allocations_chomage: 'Allocations chômage ARE (cases 1AP/1BP)',
    independant_bic_bnc: 'Revenus d’indépendant / micro-entreprise (BIC/BNC)',
    revenus_locatifs: 'Revenus locatifs / fonciers',
    revenus_placements: 'Revenus de placements financiers',
  };

  let totalKnownSalaryPensionUnemploymentEur = 0;
  let totalKnownAdditionalTaxableIncomeEur = 0;

  (Object.keys(state.incomes) as IncomeCategoryKey[]).forEach((key) => {
    const entry = state.incomes[key];
    if (!entry.selected) return;

    if (entry.amountUnknownOrSkipped) {
      incompleteItemsToVerify.push(
        `Montant annuel à compléter pour : ${incomeLabels[key]} (marqué comme « Je ne connais pas encore le montant »).`
      );
      return;
    }

    const amount = Math.max(0, entry.annualAmountEur);
    if (
      key === 'salaires' ||
      key === 'pensions_retraite' ||
      key === 'allocations_chomage'
    ) {
      totalKnownSalaryPensionUnemploymentEur += amount;
    } else {
      totalKnownAdditionalTaxableIncomeEur += amount;
    }
  });

  // Evaluate expenses & tax credits without assuming eligibility when conditionsConfirmed !== 'oui'
  let confirmedRealExpensesEur = 0;
  let confirmedDeductiblePerAndAlimonyEur = 0;
  let confirmedTaxCreditsAndReductionsEur = 0;
  let unconfirmedPotentialBenefitsEur = 0;

  // 1. Frais professionnels réels
  const fraisPro = state.expenses.frais_professionnels_reels;
  if (fraisPro.selected) {
    if (fraisPro.amountUnknownOrSkipped) {
      incompleteItemsToVerify.push(
        'Frais professionnels réels : montant à estimer avec le barème kilométrique officiel (l’abattement automatique de 10 % est appliqué par défaut).'
      );
    } else if (fraisPro.conditionsConfirmed !== 'oui') {
      incompleteItemsToVerify.push(
        'Frais professionnels réels : justificatifs de trajets/repas à vérifier avant de renoncer à l’abattement automatique de 10 %.'
      );
    } else {
      confirmedRealExpensesEur = Math.max(0, fraisPro.annualAmountEur);
    }
  }

  // 2. Garde d'enfants < 6 ans (50 % plafonné à 3 500 € par enfant < 6 ans)
  const garde = state.expenses.garde_enfants_moins_6_ans;
  if (garde.selected) {
    const eligibleKids = Math.max(1, state.childrenUnder6Count);
    const maxBase = eligibleKids * 3500;
    const rawCredit = Math.round(Math.min(maxBase, Math.max(0, garde.annualAmountEur)) * 0.5);
    if (garde.amountUnknownOrSkipped) {
      incompleteItemsToVerify.push(
        'Crédit d’impôt garde d’enfant (< 6 ans) : montant net des aides CAF/PAJE à renseigner (case 7GA).'
      );
    } else if (garde.conditionsConfirmed !== 'oui') {
      unconfirmedPotentialBenefitsEur += rawCredit;
      incompleteItemsToVerify.push(
        `Crédit d’impôt garde d’enfant (~${rawCredit.toLocaleString(
          'fr-FR'
        )} €) : non inclus par prudence tant que la déduction des aides CAF/CMG et l’âge (< 6 ans au 1er janvier) ne sont pas confirmés.`
      );
    } else {
      confirmedTaxCreditsAndReductionsEur += rawCredit;
    }
  }

  // 3. Emploi à domicile (50 % plafonné à 12 000 € + 1 500 €/enfant max 15 000 €)
  const domicile = state.expenses.emploi_domicile;
  if (domicile.selected) {
    const maxCeiling = Math.min(15000, 12000 + quotient.totalDependantsCount * 1500);
    const rawCredit = Math.round(
      Math.min(maxCeiling, Math.max(0, domicile.annualAmountEur)) * 0.5
    );
    if (domicile.amountUnknownOrSkipped) {
      incompleteItemsToVerify.push(
        'Crédit d’impôt emploi à domicile (case 7DB) : montant annuel resté à votre charge à compléter.'
      );
    } else if (domicile.conditionsConfirmed !== 'oui') {
      unconfirmedPotentialBenefitsEur += rawCredit;
      incompleteItemsToVerify.push(
        `Crédit d’impôt emploi à domicile (~${rawCredit.toLocaleString(
          'fr-FR'
        )} €) : à vérifier (attestation annuelle URSSAF / CESU hors avance immédiate déjà perçue).`
      );
    } else {
      confirmedTaxCreditsAndReductionsEur += rawCredit;
    }
  }

  // 4. Dons aux associations (66 %)
  const dons = state.expenses.dons_associations;
  if (dons.selected) {
    const rawReduction = Math.round(Math.max(0, dons.annualAmountEur) * 0.66);
    if (dons.amountUnknownOrSkipped) {
      incompleteItemsToVerify.push(
        'Réduction d’impôt pour dons (cases 7UF/7UD) : montant des reçus fiscaux à compléter.'
      );
    } else if (dons.conditionsConfirmed !== 'oui') {
      unconfirmedPotentialBenefitsEur += rawReduction;
      incompleteItemsToVerify.push(
        `Réduction pour dons (~${rawReduction.toLocaleString(
          'fr-FR'
        )} €) : nécessite de vérifier que l’organisme délivre bien un reçu fiscal d’intérêt général.`
      );
    } else {
      confirmedTaxCreditsAndReductionsEur += rawReduction;
    }
  }

  // 5. Pension alimentaire versée (Déduction du revenu global)
  const pension = state.expenses.pension_alimentaire_versee;
  if (pension.selected) {
    if (pension.amountUnknownOrSkipped) {
      incompleteItemsToVerify.push(
        'Pension alimentaire versée (cases 6EL/6GU) : montant annuel versé à compléter.'
      );
    } else if (pension.conditionsConfirmed !== 'oui') {
      incompleteItemsToVerify.push(
        'Pension alimentaire versée : non déduite tant qu’il n’est pas confirmé que le bénéficiaire n’est pas rattaché à votre foyer fiscal.'
      );
    } else {
      confirmedDeductiblePerAndAlimonyEur += Math.max(0, pension.annualAmountEur);
    }
  }

  // 6. Épargne retraite PER (Déduction du revenu global)
  const per = state.expenses.epargne_retraite_per;
  if (per.selected) {
    if (per.amountUnknownOrSkipped) {
      incompleteItemsToVerify.push(
        'Versements PER (cases 6NS/6NT) : montant annuel versé à compléter d’après votre imprimé fiscal unique (IFU).'
      );
    } else if (per.conditionsConfirmed !== 'oui') {
      incompleteItemsToVerify.push(
        'Versements PER : plafond disponible sur votre dernier avis d’imposition à vérifier.'
      );
    } else {
      const cappedPer =
        state.availablePerCeilingEur && state.availablePerCeilingEur > 0
          ? Math.min(state.availablePerCeilingEur, Math.max(0, per.annualAmountEur))
          : Math.max(0, per.annualAmountEur);
      confirmedDeductiblePerAndAlimonyEur += cappedPer;
    }
  }

  const taxEstimate = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: totalKnownSalaryPensionUnemploymentEur,
    additionalTaxableIncomeEur: totalKnownAdditionalTaxableIncomeEur,
    maritalStatus: quotient.mappedEngineMaritalStatus,
    dependantsCount: quotient.totalDependantsCount,
    expenseDeductionMode:
      confirmedRealExpensesEur > 0 ? 'frais_reels' : 'abattement_10',
    realExpensesAmountEur:
      confirmedRealExpensesEur > 0 ? confirmedRealExpensesEur : undefined,
    perDeductibleContributionEur: confirmedDeductiblePerAndAlimonyEur,
    estimatedTaxCreditsEur: confirmedTaxCreditsAndReductionsEur,
    taxYear: 2026,
  });

  const estimatedRemainingBalanceEur =
    !state.skipExistingTaxNoticeStep &&
    state.taxAlreadyWithheldOrPaidEur !== null &&
    state.taxAlreadyWithheldOrPaidEur >= 0
      ? roundCurrency(taxEstimate.finalEstimatedTaxEur - state.taxAlreadyWithheldOrPaidEur)
      : null;

  return {
    isFrenchTaxResident,
    requiresNonResidentWorkflow,
    quotient,
    totalKnownSalaryPensionUnemploymentEur,
    totalKnownAdditionalTaxableIncomeEur,
    confirmedRealExpensesEur,
    confirmedDeductiblePerAndAlimonyEur,
    confirmedTaxCreditsAndReductionsEur,
    unconfirmedPotentialBenefitsEur,
    incompleteItemsToVerify,
    taxEstimate,
    estimatedRemainingBalanceEur,
  };
}

/**
 * ============================================================================
 * PERSONAL TAX OPTIMIZATION DISCOVERY ENGINE — DETERMINISTIC & NON-SPECULATIVE
 * ============================================================================
 * Evaluates 8 official French personal tax opportunity categories:
 * 1. Frais professionnels : Frais réels vs Abattement forfaitaire de 10 % (CGI Art. 83-3°)
 * 2. Frais de garde d’enfants de moins de 6 ans hors domicile (CGI Art. 200 quater B)
 * 3. Emploi d’un salarié à domicile / Services à la personne (CGI Art. 199 sexdecies)
 * 4. Dons aux associations d’intérêt général (66 %) et aide aux personnes en difficulté (75 %) (CGI Art. 200)
 * 5. Pension alimentaire versée à un enfant majeur non rattaché ou ex-conjoint (CGI Art. 156-II-2°)
 * 6. Versements volontaires sur un Plan d’Épargne Retraite - PER (CGI Art. 163 quatervicies)
 * 7. Charges foncières déductibles : Régime réel vs Micro-foncier 30 % & Déficit foncier (CGI Art. 28, 31 & 156-I-3°)
 * 8. Autres avantages familiaux vérifiés : Demi-part Parent Isolé (Case T, CGI Art. 194-II) & Frais de scolarité (CGI Art. 199 quater F)
 *
 * Strict anti-double-counting & legal accuracy rules:
 * - Never suggests an opportunity merely because it exists: checks household/income profile + explicit conditions.
 * - Replaces 10% standard deduction if and only if verified Frais réels > 10% deduction.
 * - Enforces non-cumulation between attaching an adult child (parts fiscales) and deducting alimony for that child.
 * - Distinguishes Deductions (reduce taxable income), Non-refundable Reductions (capped at tax after décote),
 *   and Refundable Tax Credits (refundable even if tax is 0 €, subject to 10 000 € global niche cap CGI Art. 200-0 A).
 */

export type TaxMechanismCategory =
  | 'DEDUCTION_REVENU'
  | 'REDUCTION_IMPOT_NON_REMBOURSABLE'
  | 'CREDIT_IMPOT_REMBOURSABLE';

export type DiscoveryEligibilityStatus =
  | 'ELIGIBLE_VERIFIE'
  | 'INCERTAIN_QUESTIONS_REQUISES'
  | 'NON_AVANTAGEUX_OU_PLAFONNE'
  | 'NON_APPLICABLE_EXCLUSION';

export type DiscoveryCategoryKey =
  | 'frais_professionnels'
  | 'garde_enfants'
  | 'emploi_domicile'
  | 'dons_associations'
  | 'pension_alimentaire'
  | 'epargne_retraite_per'
  | 'revenus_fonciers'
  | 'autres_avantages_foyer';

export interface PersonalTaxDiscoveryInput {
  taxYear?: SupportedTaxYear;
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number; // Minor children + attached dependants
  annualGrossSalaryOrPensionImposableEur: number;

  // 1. Professional expenses (Frais réels vs 10%)
  hasCommuteOrProfessionalExpenses: boolean;
  estimatedAnnualRealProfessionalExpensesEur: number;
  canJustifyRealProfessionalExpenses: TriStateAnswer; // Factures, barème km <= 40km

  // 2. Childcare (< 6 years old outside home)
  childrenUnder6Count: number;
  annualChildcareExpensesNetOfCafEur: number; // Hors aides CAF CMG/PAJE et employeur
  childcareOutsideHomeAndCafDeductedConfirmed: TriStateAnswer;

  // 3. Home employment services (Emploi à domicile)
  usesHomeEmploymentServices: boolean;
  annualHomeServicesNetExpenseEur: number; // Hors avance immédiate URSSAF déjà perçue
  homeServicesUrssafAttestationConfirmed: TriStateAnswer;

  // 4. Charitable donations (Dons)
  makesCharitableDonations: boolean;
  annualDonations75PctHelpPeopleEur: number; // Aide aux personnes en difficulté (plafond 1000 €)
  annualDonations66PctGeneralInterestEur: number; // Intérêt général (dans la limite de 20% du revenu imposable)
  donationsReceiptsConfirmed: TriStateAnswer;

  // 5. Alimony (Pension alimentaire versée à un enfant majeur ou ex-conjoint)
  paysAlimony: boolean;
  alimonyBeneficiaryCount: number;
  annualAlimonyPaidEur: number;
  alimonyBeneficiaryNotAttachedToHouseholdConfirmed: TriStateAnswer; // Règle stricte de non-cumul

  // 6. Retirement savings (PER individuel)
  contributesToPer: boolean;
  annualPerContributionEur: number;
  availablePerCeilingOnNoticeEur: number; // Plafond épargne retraite sur avis N-1
  perCeilingVerifiedOnTaxNoticeConfirmed: TriStateAnswer;

  // 7. Qualifying rental expenses (Revenus fonciers : Micro-foncier 30% vs Régime réel / Déficit foncier)
  hasUnfurnishedRentalIncome: boolean;
  annualGrossRentalIncomeEur: number; // Loyers bruts hors charges
  annualDeductibleRentalExpensesEur: number; // Travaux d'entretien, intérêts d'emprunt, taxe foncière, assurance
  rentalExpensesJustifiedAndUnfurnishedConfirmed: TriStateAnswer;

  // 8. Other verified household benefits (Case T Parent isolé & Scolarité)
  livesAloneWithChildrenOnJan1Confirmed: TriStateAnswer; // Pour Case T si célibataire/divorcé/séparé
  childrenInMiddleSchoolCount: number; // Collège : 61 € / enfant
  childrenInHighSchoolCount: number; // Lycée : 153 € / enfant
  childrenInHigherEducationCount: number; // Études supérieures : 183 € / enfant
}

export interface DiscoveredTaxOpportunity {
  id: string;
  categoryKey: DiscoveryCategoryKey;
  categoryLabel: string;
  title: string;
  mechanismType: TaxMechanismCategory;
  mechanismLabel: string;
  eligibilityStatus: DiscoveryEligibilityStatus;
  eligibilityBadgeText: string;

  // All 9 mandatory transparency fields requested by user:
  whatItIs: string;
  whoMayQualify: string;
  requiredConditions: string[];
  possibleFinancialImpact: {
    estimatedAnnualTaxDeltaEur: number;
    impactSummaryText: string;
    isIncludedInOptimizedScenario: boolean;
  };
  supportingDocuments: string[];
  applicableTaxYear: string;
  exclusionsAndNonCumulation: string[];
  officialSource: {
    sourceName: string;
    statutoryReference: string;
    url: string;
  };
  verificationDate: string;

  // Follow-up questions when eligibility is uncertain
  uncertaintyQuestions: string[];
}

export interface TaxScenarioBreakdown {
  scenarioLabel: string;
  familyQuotientParts: number;
  grossSalaryDeclaredEur: number;
  professionalDeductionMode: 'abattement_10' | 'frais_reels';
  professionalDeductionEur: number;
  netRentalIncomeAddedEur: number;
  rentalDeficitDeductedFromGlobalIncomeEur: number;
  deductibleAlimonyEur: number;
  deductiblePerEur: number;
  netTaxableGlobalIncomeEur: number;
  marginalTaxRatePercent: number;
  effectiveAverageTaxRatePercent: number;
  grossTaxFromBracketsEur: number;
  quotientCapIncreaseEur: number;
  decoteAmountEur: number;
  taxAfterDecoteBeforeReductionsEur: number;
  nonRefundableReductionsAppliedEur: number; // Plafonné à l'impôt après décote
  nonRefundableReductionsLostEur: number; // Excédent non remboursable perdu
  taxAfterNonRefundableReductionsEur: number;
  refundableTaxCreditsAppliedEur: number; // Soumis au plafond global des niches fiscales (10 000 €)
  nicheCeilingCappedLossEur: number;
  finalNetTaxToPayEur: number; // >= 0
  estimatedRefundFromDgfipEur: number; // > 0 si crédits remboursables > impôt dû
  netBalanceEur: number; // Positif = impôt à payer, Négatif = remboursement DGFiP
}

export interface TaxOptimizationDiscoveryResult {
  declarationYear: SupportedTaxYear;
  incomeYear: number;
  baselineScenario: TaxScenarioBreakdown;
  optimizedScenario: TaxScenarioBreakdown;
  verifiedNetAnnualDifferenceEur: number; // Baseline net balance - Optimized net balance
  unconfirmedPotentialDifferenceEur: number;
  globalNicheCeilingLimitEur: number;
  globalNicheCeilingUsedEur: number;
  opportunities: DiscoveredTaxOpportunity[];
}

const ALIMONY_ADULT_CHILD_CAP_2026 = 6794; // Plafond légal déduction pension alimentaire par enfant majeur non rattaché (CGI Art. 156-II-2°)
const GLOBAL_TAX_NICHE_CEILING_EUR = 10000; // Plafonnement global des avantages fiscaux (CGI Art. 200-0 A)
const DEFICIT_FONCIER_GLOBAL_CAP_EUR = 10700; // Plafond d'imputation du déficit foncier sur le revenu global (CGI Art. 156-I-3°)

function computeDetailedScenario(params: {
  taxYear: SupportedTaxYear;
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
  grossSalaryEur: number;
  useRealExpenses: boolean;
  realExpensesEur: number;
  netRentalIncomeAddedEur: number;
  rentalDeficitOnGlobalIncomeEur: number;
  deductibleAlimonyEur: number;
  deductiblePerEur: number;
  nonRefundableReductionsRawEur: number;
  refundableCreditsSubjectToNicheCapRawEur: number;
  scenarioLabel: string;
}): TaxScenarioBreakdown {
  const yearParams = getPersonalTaxParameters(params.taxYear);
  const salary = Math.max(0, params.grossSalaryEur);

  const standard10Deduction =
    salary > 0
      ? Math.min(
          yearParams.deduction10PercentCeilingEur,
          Math.max(yearParams.deduction10PercentFloorEur, Math.round(salary * 0.1))
        )
      : 0;

  const professionalDeductionMode: 'abattement_10' | 'frais_reels' =
    params.useRealExpenses && params.realExpensesEur > standard10Deduction
      ? 'frais_reels'
      : 'abattement_10';

  const professionalDeductionEur =
    professionalDeductionMode === 'frais_reels'
      ? Math.min(salary, Math.round(params.realExpensesEur))
      : Math.min(salary, standard10Deduction);

  const netSalaryAfterProDeduction = Math.max(0, salary - professionalDeductionEur);

  const totalGrossTaxableBeforeGlobalDeductions =
    netSalaryAfterProDeduction + Math.max(0, params.netRentalIncomeAddedEur);

  const totalGlobalDeductions =
    Math.max(0, params.rentalDeficitOnGlobalIncomeEur) +
    Math.max(0, params.deductibleAlimonyEur) +
    Math.max(0, params.deductiblePerEur);

  const netTaxableGlobalIncomeEur = Math.max(
    0,
    totalGrossTaxableBeforeGlobalDeductions - totalGlobalDeductions
  );

  // Use core progressive engine for bracket tax, quotient familial cap, and décote
  const baseIr = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: salary,
    additionalTaxableIncomeEur: Math.max(0, params.netRentalIncomeAddedEur),
    maritalStatus: params.maritalStatus,
    dependantsCount: params.dependantsCount,
    expenseDeductionMode: professionalDeductionMode,
    realExpensesAmountEur: professionalDeductionEur,
    perDeductibleContributionEur: totalGlobalDeductions,
    estimatedTaxCreditsEur: 0,
    taxYear: params.taxYear,
  });

  const taxAfterDecoteBeforeReductionsEur = baseIr.taxBeforeCreditsEur;

  // 1. Apply non-refundable tax reductions (Dons, Scolarité) -> capped at taxAfterDecoteBeforeReductionsEur
  const rawReductions = Math.max(0, Math.round(params.nonRefundableReductionsRawEur));
  const nonRefundableReductionsAppliedEur = Math.min(
    taxAfterDecoteBeforeReductionsEur,
    rawReductions
  );
  const nonRefundableReductionsLostEur = Math.max(
    0,
    rawReductions - nonRefundableReductionsAppliedEur
  );

  const taxAfterNonRefundableReductionsEur = Math.max(
    0,
    taxAfterDecoteBeforeReductionsEur - nonRefundableReductionsAppliedEur
  );

  // 2. Apply refundable tax credits subject to 10 000 € global niche cap (CGI Art. 200-0 A)
  const rawCredits = Math.max(
    0,
    Math.round(params.refundableCreditsSubjectToNicheCapRawEur)
  );
  const refundableTaxCreditsAppliedEur = Math.min(
    GLOBAL_TAX_NICHE_CEILING_EUR,
    rawCredits
  );
  const nicheCeilingCappedLossEur = Math.max(
    0,
    rawCredits - refundableTaxCreditsAppliedEur
  );

  const netBalanceEur =
    taxAfterNonRefundableReductionsEur - refundableTaxCreditsAppliedEur;

  const finalNetTaxToPayEur = netBalanceEur > 0 ? netBalanceEur : 0;
  const estimatedRefundFromDgfipEur =
    netBalanceEur < 0 ? Math.abs(netBalanceEur) : 0;

  const totalReferenceIncome =
    salary + Math.max(0, params.netRentalIncomeAddedEur);
  const effectiveAverageTaxRatePercent =
    totalReferenceIncome > 0
      ? Math.round((finalNetTaxToPayEur / totalReferenceIncome) * 1000) / 10
      : 0;

  return {
    scenarioLabel: params.scenarioLabel,
    familyQuotientParts: baseIr.familyQuotientParts,
    grossSalaryDeclaredEur: salary,
    professionalDeductionMode,
    professionalDeductionEur,
    netRentalIncomeAddedEur: Math.max(0, params.netRentalIncomeAddedEur),
    rentalDeficitDeductedFromGlobalIncomeEur: Math.max(
      0,
      params.rentalDeficitOnGlobalIncomeEur
    ),
    deductibleAlimonyEur: Math.max(0, params.deductibleAlimonyEur),
    deductiblePerEur: Math.max(0, params.deductiblePerEur),
    netTaxableGlobalIncomeEur,
    marginalTaxRatePercent: baseIr.marginalTaxRatePercent,
    effectiveAverageTaxRatePercent,
    grossTaxFromBracketsEur: baseIr.grossTaxBeforeCapEur,
    quotientCapIncreaseEur: baseIr.quotientCapIncreaseEur,
    decoteAmountEur: baseIr.decoteAmountEur,
    taxAfterDecoteBeforeReductionsEur,
    nonRefundableReductionsAppliedEur,
    nonRefundableReductionsLostEur,
    taxAfterNonRefundableReductionsEur,
    refundableTaxCreditsAppliedEur,
    nicheCeilingCappedLossEur,
    finalNetTaxToPayEur,
    estimatedRefundFromDgfipEur,
    netBalanceEur,
  };
}

export function evaluateTaxOptimizationDiscovery(
  input: PersonalTaxDiscoveryInput
): TaxOptimizationDiscoveryResult {
  const taxYear: SupportedTaxYear = input.taxYear ?? 2026;
  const yearParams = getPersonalTaxParameters(taxYear);
  const verificationDate = '2026-11-10';
  const applicableTaxYearLabel = `Barème ${yearParams.declarationYear} (sur revenus ${yearParams.incomeYear})`;

  const salary = Math.max(0, input.annualGrossSalaryOrPensionImposableEur);
  const standard10DeductionEur =
    salary > 0
      ? Math.min(
          yearParams.deduction10PercentCeilingEur,
          Math.max(yearParams.deduction10PercentFloorEur, Math.round(salary * 0.1))
        )
      : 0;

  // Baseline rental income: Micro-foncier (30% deduction if gross rent <= 15 000 €) or raw net
  const grossRent = input.hasUnfurnishedRentalIncome
    ? Math.max(0, input.annualGrossRentalIncomeEur)
    : 0;
  const baselineNetRentalIncomeEur =
    grossRent > 0
      ? grossRent <= 15000
        ? Math.round(grossRent * 0.7) // Micro-foncier 30% abattement
        : Math.max(0, grossRent - Math.max(0, input.annualDeductibleRentalExpensesEur))
      : 0;

  // Baseline marital status (without unverified Case T promotion)
  const baselineMaritalStatus: FamilyMaritalStatus =
    input.maritalStatus === 'parent_isole' &&
    input.livesAloneWithChildrenOnJan1Confirmed !== 'oui'
      ? 'divorce_separe'
      : input.maritalStatus;

  const baselineScenario = computeDetailedScenario({
    taxYear,
    maritalStatus: baselineMaritalStatus,
    dependantsCount: input.dependantsCount,
    grossSalaryEur: salary,
    useRealExpenses: false,
    realExpensesEur: 0,
    netRentalIncomeAddedEur: baselineNetRentalIncomeEur,
    rentalDeficitOnGlobalIncomeEur: 0,
    deductibleAlimonyEur: 0,
    deductiblePerEur: 0,
    nonRefundableReductionsRawEur: 0,
    refundableCreditsSubjectToNicheCapRawEur: 0,
    scenarioLabel: 'Situation de référence (Abattements forfaitaires par défaut)',
  });

  // Track verified optimizations for the combined Optimized Scenario
  let optUseRealExpenses = false;
  let optRealExpensesEur = 0;
  let optNetRentalIncomeAddedEur = baselineNetRentalIncomeEur;
  let optRentalDeficitOnGlobalIncomeEur = 0;
  let optDeductibleAlimonyEur = 0;
  let optDeductiblePerEur = 0;
  let optNonRefundableReductionsRawEur = 0;
  let optRefundableCreditsRawEur = 0;
  let optMaritalStatus: FamilyMaritalStatus = baselineMaritalStatus;
  let unconfirmedPotentialDifferenceEur = 0;

  const opportunities: DiscoveredTaxOpportunity[] = [];

  // ==========================================================================
  // 1. FRAIS PROFESSIONNELS : FRAIS RÉELS VS ABATTEMENT FORFAITAIRE DE 10 %
  // ==========================================================================
  {
    const realExp = Math.max(0, Math.round(input.estimatedAnnualRealProfessionalExpensesEur));
    const exceeds10Pct = realExp > standard10DeductionEur;
    const extraDeductionBase = Math.max(0, realExp - standard10DeductionEur);

    // Compute exact marginal effect via deterministic engine
    const testWithFraisReels = computeDetailedScenario({
      taxYear,
      maritalStatus: baselineMaritalStatus,
      dependantsCount: input.dependantsCount,
      grossSalaryEur: salary,
      useRealExpenses: true,
      realExpensesEur: realExp,
      netRentalIncomeAddedEur: baselineNetRentalIncomeEur,
      rentalDeficitOnGlobalIncomeEur: 0,
      deductibleAlimonyEur: 0,
      deductiblePerEur: 0,
      nonRefundableReductionsRawEur: 0,
      refundableCreditsSubjectToNicheCapRawEur: 0,
      scenarioLabel: 'Test Frais Réels',
    });
    const exactDeltaEur = Math.max(
      0,
      baselineScenario.netBalanceEur - testWithFraisReels.netBalanceEur
    );

    let status: DiscoveryEligibilityStatus = 'NON_APPLICABLE_EXCLUSION';
    let badge = 'Non applicable';
    let impactText = 'Aucun gain fiscal par rapport à l’abattement automatique de 10 %.';
    const uncertaintyQs: string[] = [];
    let includedInOpt = false;

    if (salary === 0 || !input.hasCommuteOrProfessionalExpenses) {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Abattement 10 % conservé';
      impactText = `L’abattement automatique de 10 % (${standard10DeductionEur.toLocaleString(
        'fr-FR'
      )} €) s’applique d’office sans justificatif.`;
    } else if (!exceeds10Pct) {
      status = 'NON_AVANTAGEUX_OU_PLAFONNE';
      badge = '10 % plus avantageux';
      impactText = `Vos frais réels estimés (${realExp.toLocaleString(
        'fr-FR'
      )} €) sont inférieurs ou égaux à votre abattement automatique de 10 % (${standard10DeductionEur.toLocaleString(
        'fr-FR'
      )} €). Conservez l’abattement de 10 %.`;
    } else if (input.canJustifyRealProfessionalExpenses === 'oui') {
      status = 'ELIGIBLE_VERIFIE';
      badge = 'Éligible & Avantageux';
      includedInOpt = true;
      optUseRealExpenses = true;
      optRealExpensesEur = realExp;
      impactText = `Vos frais réels (${realExp.toLocaleString(
        'fr-FR'
      )} €) dépassent l’abattement de 10 % de ${extraDeductionBase.toLocaleString(
        'fr-FR'
      )} €, réduisant votre impôt estimé de ${exactDeltaEur.toLocaleString('fr-FR')} €.`;
    } else if (input.canJustifyRealProfessionalExpenses === 'ne_sait_pas') {
      status = 'INCERTAIN_QUESTIONS_REQUISES';
      badge = 'Justificatifs à vérifier';
      unconfirmedPotentialDifferenceEur += exactDeltaEur;
      impactText = `Allègement potentiel estimé à ${exactDeltaEur.toLocaleString(
        'fr-FR'
      )} € (non inclus par prudence tant que les justificatifs ne sont pas confirmés).`;
      uncertaintyQs.push(
        'Disposez-vous des factures ou d’un relevé de trajets domicile-travail (plafonné à 40 km l’aller simple sauf circonstances particulières) ?'
      );
      uncertaintyQs.push(
        'Avez-vous bien réintégré dans votre salaire imposable les remboursements de frais professionnels versés par votre employeur ?'
      );
    } else {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Sans justificatifs (10 %)';
      impactText =
        'En l’absence de justificatifs conservables 3 ans, l’option pour les frais réels est exclue : l’abattement forfaitaire de 10 % est maintenu.';
    }

    opportunities.push({
      id: 'opp-frais-reels',
      categoryKey: 'frais_professionnels',
      categoryLabel: 'Salariés · Frais professionnels (10 % vs Frais réels)',
      title: 'Option pour les Frais professionnels réels (au lieu de l’abattement de 10 %)',
      mechanismType: 'DEDUCTION_REVENU',
      mechanismLabel: 'Déduction du revenu imposable',
      eligibilityStatus: status,
      eligibilityBadgeText: badge,
      whatItIs:
        'Par défaut, l’administration fiscale déduit automatiquement 10 % de votre salaire imposable. Si vos dépenses professionnelles réelles (trajets domicile-travail, repas, télétravail) dépassent ces 10 %, vous pouvez opter pour la déduction de vos frais réels.',
      whoMayQualify:
        'Tout salarié dont les dépenses professionnelles effectives et justifiées excèdent l’abattement forfaitaire de 10 % (plancher de 509 € et plafond de 14 555 € au barème 2026).',
      requiredConditions: [
        'Les dépenses doivent être directement nécessitées par l’exercice de votre activité salariée.',
        'La distance domicile-travail prise en compte de plein droit est limitée à 40 km (aller simple), sauf circonstances particulières justifiées (emploi précaire, mutation, bassin d’emploi).',
        'Vous devez obligatoirement ajouter à votre salaire imposable les allocations et remboursements pour frais versés par votre employeur.',
      ],
      possibleFinancialImpact: {
        estimatedAnnualTaxDeltaEur: exactDeltaEur,
        impactSummaryText: impactText,
        isIncludedInOptimizedScenario: includedInOpt,
      },
      supportingDocuments: [
        'Certificat d’immatriculation (carte grise) du véhicule pour le barème kilométrique officiel',
        'Factures de carburant, d’entretien, de péage ou d’abonnement de transport public',
        'Justificatifs des frais de repas et attestation d’absence de restauration collective',
      ],
      applicableTaxYear: applicableTaxYearLabel,
      exclusionsAndNonCumulation: [
        'Règle stricte de non-cumul : l’option pour les frais réels remplace intégralement l’abattement forfaitaire de 10 % (aucun double comptage possible).',
        'L’option est individuelle : au sein d’un couple, un conjoint peut opter pour les frais réels et l’autre conserver l’abattement de 10 %.',
      ],
      officialSource: {
        sourceName: 'impots.gouv.fr & Code général des impôts',
        statutoryReference: 'CGI Art. 83-3° · BOI-RSA-BASE-30-50 · Cases 1AK à 1DK',
        url: 'https://www.impots.gouv.fr/particulier/je-declare-mes-frais-professionnels',
      },
      verificationDate,
      uncertaintyQuestions: uncertaintyQs,
    });
  }

  // ==========================================================================
  // 2. FRAIS DE GARDE D'ENFANTS DE MOINS DE 6 ANS HORS DOMICILE
  // ==========================================================================
  {
    const kidsUnder6 = Math.max(0, Math.floor(input.childrenUnder6Count));
    const maxEligibleBaseEur = kidsUnder6 * 3500;
    const declaredNetExpense = Math.min(
      maxEligibleBaseEur,
      Math.max(0, Math.round(input.annualChildcareExpensesNetOfCafEur))
    );
    const creditAmountEur = Math.round(declaredNetExpense * 0.5);

    let status: DiscoveryEligibilityStatus = 'NON_APPLICABLE_EXCLUSION';
    let badge = 'Non concerné';
    let impactText = 'Aucun enfant de moins de 6 ans déclaré dans votre profil.';
    const uncertaintyQs: string[] = [];
    let includedInOpt = false;

    if (kidsUnder6 === 0 || input.annualChildcareExpensesNetOfCafEur <= 0) {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Non applicable';
      impactText =
        'Ce crédit d’impôt s’applique uniquement aux enfants âgés de moins de 6 ans au 1er janvier de l’année d’imposition.';
    } else if (input.childcareOutsideHomeAndCafDeductedConfirmed === 'oui') {
      status = 'ELIGIBLE_VERIFIE';
      badge = 'Crédit 50 % vérifié';
      includedInOpt = true;
      optRefundableCreditsRawEur += creditAmountEur;
      impactText = `Crédit d’impôt remboursable de ${creditAmountEur.toLocaleString(
        'fr-FR'
      )} € (50 % de ${declaredNetExpense.toLocaleString(
        'fr-FR'
      )} € retenus dans la limite légale de ${maxEligibleBaseEur.toLocaleString(
        'fr-FR'
      )} €).`;
    } else if (input.childcareOutsideHomeAndCafDeductedConfirmed === 'ne_sait_pas') {
      status = 'INCERTAIN_QUESTIONS_REQUISES';
      badge = 'Aides CAF à déduire';
      unconfirmedPotentialDifferenceEur += creditAmountEur;
      impactText = `Crédit potentiel de ${creditAmountEur.toLocaleString(
        'fr-FR'
      )} € (en attente de confirmation que les aides CAF/CMG ont bien été déduites).`;
      uncertaintyQs.push(
        'Avez-vous bien soustrait le Complément de libre choix du mode de garde (CMG versé par la CAF/Pajemploi) et l’aide éventuelle de votre employeur (CESU préfinancé) ?'
      );
      uncertaintyQs.push(
        'L’enfant était-il bien âgé de moins de 6 ans au 1er janvier de l’année des revenus ?'
      );
    } else {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Conditions non remplies';
      impactText =
        'Seules les dépenses de garde hors du domicile (crèche, assistante maternelle agréée, garderie) nettes des aides CAF sont éligibles en case 7GA.';
    }

    opportunities.push({
      id: 'opp-garde-enfants',
      categoryKey: 'garde_enfants',
      categoryLabel: 'Famille · Garde d’enfants (< 6 ans)',
      title: 'Crédit d’impôt de 50 % pour frais de garde hors du domicile (< 6 ans)',
      mechanismType: 'CREDIT_IMPOT_REMBOURSABLE',
      mechanismLabel: 'Crédit d’impôt remboursable',
      eligibilityStatus: status,
      eligibilityBadgeText: badge,
      whatItIs:
        'Un crédit d’impôt égal à 50 % des dépenses engagées pour faire garder vos jeunes enfants à l’extérieur de votre domicile (crèche, halte-garderie, assistante maternelle agréée, centre de loisirs).',
      whoMayQualify:
        'Parents ayant à charge un ou plusieurs enfants âgés de moins de 6 ans au 1er janvier de l’année d’imposition (y compris si vous êtes non imposable, car il s’agit d’un crédit remboursable).',
      requiredConditions: [
        'L’enfant doit avoir moins de 6 ans au 1er janvier de l’année des revenus.',
        'La garde doit être assurée hors du domicile par une assistante maternelle agréée ou un établissement agréé.',
        'Vous devez déduire toutes les aides publiques ou privées reçues (CMG de la CAF/MSA, indemnités de garde de l’employeur).',
      ],
      possibleFinancialImpact: {
        estimatedAnnualTaxDeltaEur: creditAmountEur,
        impactSummaryText: impactText,
        isIncludedInOptimizedScenario: includedInOpt,
      },
      supportingDocuments: [
        'Attestation fiscale annuelle Pajemploi (URSSAF) ou facture acquittée de la crèche / garderie',
        'Relevé annuel des prestations versées par la CAF / MSA',
      ],
      applicableTaxYear: applicableTaxYearLabel,
      exclusionsAndNonCumulation: [
        'Plafond légal de dépenses : 3 500 € par enfant en garde exclusive (soit 1 750 € de crédit maximal par enfant), ou 1 750 € de dépenses en garde alternée (875 € de crédit maximal).',
        'Exclusions : les frais de nourriture (repas/goûters) facturés par la crèche ou l’assistante maternelle ne sont jamais éligibles.',
        'Soumis au plafonnement global des niches fiscales de 10 000 € par an (CGI Art. 200-0 A).',
      ],
      officialSource: {
        sourceName: 'impots.gouv.fr & Code général des impôts',
        statutoryReference: 'CGI Art. 200 quater B · BOI-IR-RICI-300 · Cases 7GA à 7GG',
        url: 'https://www.impots.gouv.fr/particulier/frais-de-garde-denfants-de-moins-de-6-ans',
      },
      verificationDate,
      uncertaintyQuestions: uncertaintyQs,
    });
  }

  // ==========================================================================
  // 3. EMPLOI D'UN SALARIÉ À DOMICILE / SERVICES À LA PERSONNE
  // ==========================================================================
  {
    const maxHomeServiceBaseEur = Math.min(
      15000,
      12000 + Math.max(0, input.dependantsCount) * 1500
    );
    const eligibleHomeExpense = Math.min(
      maxHomeServiceBaseEur,
      Math.max(0, Math.round(input.annualHomeServicesNetExpenseEur))
    );
    const homeCreditEur = Math.round(eligibleHomeExpense * 0.5);

    let status: DiscoveryEligibilityStatus = 'NON_APPLICABLE_EXCLUSION';
    let badge = 'Non concerné';
    let impactText = 'Aucune dépense d’emploi à domicile renseignée.';
    const uncertaintyQs: string[] = [];
    let includedInOpt = false;

    if (!input.usesHomeEmploymentServices || eligibleHomeExpense <= 0) {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Non applicable';
      impactText =
        'Applicable uniquement si vous employez un salarié à votre résidence principale ou secondaire située en France.';
    } else if (input.homeServicesUrssafAttestationConfirmed === 'oui') {
      status = 'ELIGIBLE_VERIFIE';
      badge = 'Crédit 50 % vérifié';
      includedInOpt = true;
      optRefundableCreditsRawEur += homeCreditEur;
      impactText = `Crédit d’impôt remboursable de ${homeCreditEur.toLocaleString(
        'fr-FR'
      )} € (50 % de ${eligibleHomeExpense.toLocaleString(
        'fr-FR'
      )} €, plafond de votre foyer : ${maxHomeServiceBaseEur.toLocaleString('fr-FR')} €).`;
    } else if (input.homeServicesUrssafAttestationConfirmed === 'ne_sait_pas') {
      status = 'INCERTAIN_QUESTIONS_REQUISES';
      badge = 'Attestation à vérifier';
      unconfirmedPotentialDifferenceEur += homeCreditEur;
      impactText = `Crédit potentiel de ${homeCreditEur.toLocaleString(
        'fr-FR'
      )} € (à confirmer hors avance immédiate URSSAF déjà perçue).`;
      uncertaintyQs.push(
        'Si vous avez activé le service « Avance immédiate » de l’URSSAF (paiement de 50 % seulement chaque mois), avez-vous bien retiré l’avance déjà perçue pour éviter tout double comptage ?'
      );
      uncertaintyQs.push(
        'Les prestations (jardinage plafonné à 5 000 €, bricolage 500 €, assistance informatique 3 000 €) respectent-elles leurs sous-plafonds spécifiques ?'
      );
    } else {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Conditions non remplies';
      impactText =
        'Les prestations réglées en espèces ou sans déclaration CESU / organisme agréé sont strictement exclues du crédit d’impôt.';
    }

    opportunities.push({
      id: 'opp-emploi-domicile',
      categoryKey: 'emploi_domicile',
      categoryLabel: 'Domicile · Services à la personne',
      title: 'Crédit d’impôt de 50 % pour l’emploi d’un salarié à domicile',
      mechanismType: 'CREDIT_IMPOT_REMBOURSABLE',
      mechanismLabel: 'Crédit d’impôt remboursable',
      eligibilityStatus: status,
      eligibilityBadgeText: badge,
      whatItIs:
        'Un crédit d’impôt remboursable égal à 50 % des sommes versées pour des services à la personne rendus à votre domicile (ménage, soutien scolaire, garde d’enfant à domicile, jardinage, aide aux personnes âgées).',
      whoMayQualify:
        'Tout contribuable employant directement un salarié via le CESU ou faisant appel à une association, entreprise ou organisme déclaré de services à la personne en France.',
      requiredConditions: [
        'Les prestations doivent être effectuées à votre résidence principale ou secondaire située en France.',
        'Le paiement doit être effectué par virement, chèque, carte bancaire ou CESU (jamais en espèces).',
        'Vous devez déduire les aides perçues (APA, PCH, CESU préfinancé par l’employeur) ainsi que l’avance immédiate URSSAF déjà consommée.',
      ],
      possibleFinancialImpact: {
        estimatedAnnualTaxDeltaEur: homeCreditEur,
        impactSummaryText: impactText,
        isIncludedInOptimizedScenario: includedInOpt,
      },
      supportingDocuments: [
        'Attestation fiscale annuelle délivrée par le Centre National CESU (URSSAF) ou par le prestataire agréé',
      ],
      applicableTaxYear: applicableTaxYearLabel,
      exclusionsAndNonCumulation: [
        `Plafond annuel de dépenses pour votre foyer : ${maxHomeServiceBaseEur.toLocaleString(
          'fr-FR'
        )} € (12 000 € + 1 500 € par personne à charge, plafonné à 15 000 € hors première année ou invalidité).`,
        'Sous-plafonds annuels stricts : 5 000 € pour les petits travaux de jardinage, 3 000 € pour l’assistance informatique et 500 € pour le petit bricolage.',
        'Inclus dans le plafond global des niches fiscales de 10 000 € par an (CGI Art. 200-0 A).',
      ],
      officialSource: {
        sourceName: 'impots.gouv.fr & Code général des impôts',
        statutoryReference: 'CGI Art. 199 sexdecies · BOI-IR-RICI-150 · Case 7DB',
        url: 'https://www.impots.gouv.fr/particulier/emploi-domicile',
      },
      verificationDate,
      uncertaintyQuestions: uncertaintyQs,
    });
  }

  // ==========================================================================
  // 4. DONS AUX ASSOCIATIONS (RÉDUCTION D'IMPÔT NON REMBOURSABLE 66 % / 75 %)
  // ==========================================================================
  {
    const dons75Base = Math.min(
      1000,
      Math.max(0, Math.round(input.annualDonations75PctHelpPeopleEur))
    );
    const excessDons75TransferredTo66 = Math.max(
      0,
      Math.round(input.annualDonations75PctHelpPeopleEur) - 1000
    );
    const totalDons66Raw =
      Math.max(0, Math.round(input.annualDonations66PctGeneralInterestEur)) +
      excessDons75TransferredTo66;

    // Plafond de 20 % du revenu net imposable (CGI Art. 200)
    const max20PctIncomeLimit = Math.round(baselineScenario.netTaxableGlobalIncomeEur * 0.2);
    const eligibleDons66Base = Math.min(max20PctIncomeLimit, totalDons66Raw);

    const rawReductionEur =
      Math.round(dons75Base * 0.75) + Math.round(eligibleDons66Base * 0.66);

    // Since it is a NON-REFUNDABLE reduction, effective gain cannot exceed tax due after décote!
    const effectiveReductionCappedAtTaxDueEur = Math.min(
      baselineScenario.taxAfterDecoteBeforeReductionsEur,
      rawReductionEur
    );

    let status: DiscoveryEligibilityStatus = 'NON_APPLICABLE_EXCLUSION';
    let badge = 'Non concerné';
    let impactText = 'Aucun don déclaré.';
    const uncertaintyQs: string[] = [];
    let includedInOpt = false;

    if (!input.makesCharitableDonations || rawReductionEur <= 0) {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Non applicable';
      impactText =
        'La réduction s’applique uniquement aux dons sans contrepartie versés à des organismes d’intérêt général ou reconnus d’utilité publique.';
    } else if (baselineScenario.taxAfterDecoteBeforeReductionsEur === 0) {
      status = 'NON_AVANTAGEUX_OU_PLAFONNE';
      badge = 'Impôt déjà à 0 € (Non remboursable)';
      impactText = `Votre réduction théorique est de ${rawReductionEur.toLocaleString(
        'fr-FR'
      )} €, mais comme il s’agit d’une réduction d’impôt (et non d’un crédit remboursable) et que votre impôt avant réduction est de 0 €, elle ne donne lieu à aucun remboursement.`;
    } else if (input.donationsReceiptsConfirmed === 'oui') {
      status = 'ELIGIBLE_VERIFIE';
      badge = 'Réduction vérifiée';
      includedInOpt = true;
      optNonRefundableReductionsRawEur += rawReductionEur;
      impactText =
        effectiveReductionCappedAtTaxDueEur < rawReductionEur
          ? `Réduction brute de ${rawReductionEur.toLocaleString(
              'fr-FR'
            )} €, plafonnée à ${effectiveReductionCappedAtTaxDueEur.toLocaleString(
              'fr-FR'
            )} € (montant de votre impôt dû, car une réduction n’est pas remboursable).`
          : `Réduction d’impôt de ${effectiveReductionCappedAtTaxDueEur.toLocaleString(
              'fr-FR'
            )} € déduite de votre impôt annuel.`;
    } else if (input.donationsReceiptsConfirmed === 'ne_sait_pas') {
      status = 'INCERTAIN_QUESTIONS_REQUISES';
      badge = 'Reçu fiscal à vérifier';
      unconfirmedPotentialDifferenceEur += effectiveReductionCappedAtTaxDueEur;
      impactText = `Réduction potentielle de ${effectiveReductionCappedAtTaxDueEur.toLocaleString(
        'fr-FR'
      )} € (en attente de vérification de vos reçus fiscaux Cerfa n° 11580).`;
      uncertaintyQs.push(
        'L’association vous a-t-elle délivré un reçu fiscal officiel (Cerfa) attestant qu’elle est d’intérêt général et que le versement ne comporte aucune contrepartie ?'
      );
    } else {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Sans reçu fiscal';
      impactText =
        'Sans reçu fiscal officiel ou en présence d’une contrepartie matérielle, le versement n’ouvre pas droit à la réduction d’impôt.';
    }

    opportunities.push({
      id: 'opp-dons-associations',
      categoryKey: 'dons_associations',
      categoryLabel: 'Solidarité · Dons aux associations',
      title: 'Réduction d’impôt pour dons (75 % aide aux personnes / 66 % intérêt général)',
      mechanismType: 'REDUCTION_IMPOT_NON_REMBOURSABLE',
      mechanismLabel: 'Réduction d’impôt non remboursable',
      eligibilityStatus: status,
      eligibilityBadgeText: badge,
      whatItIs:
        'Une réduction d’impôt de 75 % pour les dons aux organismes d’aide aux personnes en difficulté (repas, soins, logement, dans la limite de 1 000 € de dons) et de 66 % pour les dons aux organismes d’intérêt général.',
      whoMayQualify:
        'Contribuables imposables effectuant des dons ou cotisations sans contrepartie à des organismes éligibles établis en France ou dans l’Union européenne.',
      requiredConditions: [
        'Le versement doit être effectué à titre gratuit, sans aucune contrepartie directe ou indirecte.',
        'Vous devez détenir le reçu fiscal réglementaire délivré par l’organisme bénéficiaire.',
      ],
      possibleFinancialImpact: {
        estimatedAnnualTaxDeltaEur: effectiveReductionCappedAtTaxDueEur,
        impactSummaryText: impactText,
        isIncludedInOptimizedScenario: includedInOpt,
      },
      supportingDocuments: [
        'Reçus fiscaux annuels aux normes Cerfa n° 11580 délivrés par chaque association',
      ],
      applicableTaxYear: applicableTaxYearLabel,
      exclusionsAndNonCumulation: [
        'Attention : il s’agit d’une réduction d’impôt non remboursable. Si la réduction dépasse votre impôt sur le revenu, la différence n’est jamais remboursée par la DGFiP.',
        'Plafond global : les dons à 66 % sont retenus dans la limite de 20 % de votre revenu net imposable (l’excédent éventuel est reportable sur les 5 années suivantes).',
        'Hors plafonnement global des niches fiscales de 10 000 €.',
      ],
      officialSource: {
        sourceName: 'service-public.fr & Code général des impôts',
        statutoryReference: 'CGI Art. 200 · BOI-IR-RICI-250 · Cases 7UD et 7UF',
        url: 'https://www.service-public.fr/particuliers/vosdroits/F426',
      },
      verificationDate,
      uncertaintyQuestions: uncertaintyQs,
    });
  }

  // ==========================================================================
  // 5. PENSION ALIMENTAIRE VERSÉE (AVEC RÈGLE STRICTE DE NON-CUMUL)
  // ==========================================================================
  {
    const beneficiaries = Math.max(1, Math.floor(input.alimonyBeneficiaryCount));
    const maxAlimonyCapEur = beneficiaries * ALIMONY_ADULT_CHILD_CAP_2026;
    const cappedAlimonyEur = Math.min(
      maxAlimonyCapEur,
      Math.max(0, Math.round(input.annualAlimonyPaidEur))
    );

    const testWithAlimony = computeDetailedScenario({
      taxYear,
      maritalStatus: baselineMaritalStatus,
      dependantsCount: input.dependantsCount,
      grossSalaryEur: salary,
      useRealExpenses: false,
      realExpensesEur: 0,
      netRentalIncomeAddedEur: baselineNetRentalIncomeEur,
      rentalDeficitOnGlobalIncomeEur: 0,
      deductibleAlimonyEur: cappedAlimonyEur,
      deductiblePerEur: 0,
      nonRefundableReductionsRawEur: 0,
      refundableCreditsSubjectToNicheCapRawEur: 0,
      scenarioLabel: 'Test Pension Alimentaire',
    });
    const exactDeltaEur = Math.max(
      0,
      baselineScenario.netBalanceEur - testWithAlimony.netBalanceEur
    );

    let status: DiscoveryEligibilityStatus = 'NON_APPLICABLE_EXCLUSION';
    let badge = 'Non concerné';
    let impactText = 'Aucune pension alimentaire versée renseignée.';
    const uncertaintyQs: string[] = [];
    let includedInOpt = false;

    if (!input.paysAlimony || cappedAlimonyEur <= 0) {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Non applicable';
      impactText =
        'Concerne uniquement les contribuables versant une pension alimentaire à un enfant majeur dans le besoin, à un enfant mineur dont ils n’ont pas la garde ou à un ascendant.';
    } else if (input.alimonyBeneficiaryNotAttachedToHouseholdConfirmed === 'non') {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Exclu (Règle de non-cumul)';
      impactText =
        'Règle légale stricte de non-cumul (CGI Art. 156-II-2°) : vous ne pouvez jamais déduire une pension alimentaire versée à un enfant qui est déjà rattaché à votre foyer fiscal pour le calcul de vos parts.';
    } else if (input.alimonyBeneficiaryNotAttachedToHouseholdConfirmed === 'oui') {
      status = 'ELIGIBLE_VERIFIE';
      badge = 'Déduction vérifiée';
      includedInOpt = true;
      optDeductibleAlimonyEur += cappedAlimonyEur;
      impactText = `Déduction de ${cappedAlimonyEur.toLocaleString(
        'fr-FR'
      )} € sur votre revenu global (plafond légal de ${ALIMONY_ADULT_CHILD_CAP_2026.toLocaleString(
        'fr-FR'
      )} € par enfant majeur non rattaché), soit un allègement d’impôt estimé à ${exactDeltaEur.toLocaleString(
        'fr-FR'
      )} €.`;
    } else {
      status = 'INCERTAIN_QUESTIONS_REQUISES';
      badge = 'Non-cumul à vérifier';
      unconfirmedPotentialDifferenceEur += exactDeltaEur;
      impactText = `Allègement potentiel de ${exactDeltaEur.toLocaleString(
        'fr-FR'
      )} € (en attente de confirmation que l’enfant majeur dépose sa propre déclaration séparée).`;
      uncertaintyQs.push(
        'L’enfant majeur bénéficiaire est-il bien détaché de votre foyer fiscal (il ne compte pas dans vos parts fiscales et déclare lui-même la pension reçue) ?'
      );
      uncertaintyQs.push(
        'Pouvez-vous justifier l’état de besoin du bénéficiaire (études, recherche d’emploi, faibles ressources) et la réalité des virements ?'
      );
    }

    opportunities.push({
      id: 'opp-pension-alimentaire',
      categoryKey: 'pension_alimentaire',
      categoryLabel: 'Famille · Pension alimentaire versée',
      title: 'Déduction de la pension alimentaire versée (Enfant majeur non rattaché / Ex-conjoint)',
      mechanismType: 'DEDUCTION_REVENU',
      mechanismLabel: 'Déduction du revenu imposable',
      eligibilityStatus: status,
      eligibilityBadgeText: badge,
      whatItIs:
        'La possibilité de déduire de votre revenu global l’aide financière (pension alimentaire) versée à un enfant majeur non rattaché à votre foyer fiscal et disposant de faibles ressources, ou versée en vertu d’une décision de justice.',
      whoMayQualify:
        'Parents aidant financièrement un enfant majeur détaché du foyer fiscal (étudiant ou sans ressources suffisantes) ou ex-conjoints versant une pension alimentaire suite à une séparation.',
      requiredConditions: [
        'Le bénéficiaire ne doit pas être rattaché à votre foyer fiscal.',
        'Le bénéficiaire doit être dans l’impossibilité de subvenir seul à ses besoins essentiels.',
        'La somme déduite par le parent doit être déclarée comme revenu par le bénéficiaire sur sa propre déclaration.',
      ],
      possibleFinancialImpact: {
        estimatedAnnualTaxDeltaEur: exactDeltaEur,
        impactSummaryText: impactText,
        isIncludedInOptimizedScenario: includedInOpt,
      },
      supportingDocuments: [
        'Relevés bancaires prouvant les virements réguliers ou factures acquittées (loyer, scolarité)',
        'Jugement de divorce ou convention homologuée (en cas de pension pour enfant mineur ou ex-conjoint)',
      ],
      applicableTaxYear: applicableTaxYearLabel,
      exclusionsAndNonCumulation: [
        `Non-cumul absolu : il est interdit de cumuler le rattachement d’un enfant majeur (majoration de parts fiscales) et la déduction d’une pension alimentaire pour ce même enfant.`,
        `Plafond légal : ${ALIMONY_ADULT_CHILD_CAP_2026.toLocaleString(
          'fr-FR'
        )} € par enfant majeur célibataire non rattaché.`,
        'Non-cumul avec la garde alternée : aucune pension alimentaire n’est déductible pour un enfant mineur pris en compte en garde alternée.',
      ],
      officialSource: {
        sourceName: 'impots.gouv.fr & Code général des impôts',
        statutoryReference: 'CGI Art. 156-II-2° · BOI-IR-BASE-20-30 · Cases 6EL / 6GU',
        url: 'https://www.impots.gouv.fr/particulier/deduire-une-pension-alimentaire',
      },
      verificationDate,
      uncertaintyQuestions: uncertaintyQs,
    });
  }

  // ==========================================================================
  // 6. ÉPARGNE RETRAITE : VERSEMENTS VOLONTAIRES SUR UN PER
  // ==========================================================================
  {
    const perCeiling = Math.max(0, Math.round(input.availablePerCeilingOnNoticeEur));
    const cappedPerEur = Math.min(
      perCeiling > 0 ? perCeiling : Math.round(salary * 0.1),
      Math.max(0, Math.round(input.annualPerContributionEur))
    );

    const testWithPer = computeDetailedScenario({
      taxYear,
      maritalStatus: baselineMaritalStatus,
      dependantsCount: input.dependantsCount,
      grossSalaryEur: salary,
      useRealExpenses: false,
      realExpensesEur: 0,
      netRentalIncomeAddedEur: baselineNetRentalIncomeEur,
      rentalDeficitOnGlobalIncomeEur: 0,
      deductibleAlimonyEur: 0,
      deductiblePerEur: cappedPerEur,
      nonRefundableReductionsRawEur: 0,
      refundableCreditsSubjectToNicheCapRawEur: 0,
      scenarioLabel: 'Test PER',
    });
    const exactDeltaEur = Math.max(
      0,
      baselineScenario.netBalanceEur - testWithPer.netBalanceEur
    );

    let status: DiscoveryEligibilityStatus = 'NON_APPLICABLE_EXCLUSION';
    let badge = 'Non concerné';
    let impactText = 'Aucun versement sur un Plan d’Épargne Retraite (PER) renseigné.';
    const uncertaintyQs: string[] = [];
    let includedInOpt = false;

    if (!input.contributesToPer || cappedPerEur <= 0) {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Non applicable';
      impactText =
        'Applicable uniquement aux versements volontaires effectués avant le 31 décembre sur un PER individuel ou d’entreprise.';
    } else if (baselineScenario.marginalTaxRatePercent === 0) {
      status = 'NON_AVANTAGEUX_OU_PLAFONNE';
      badge = 'Non avantageux (TMI 0 %)';
      impactText =
        'Votre foyer est dans la tranche à 0 % (non imposable). Déduire un versement PER n’apporte aucune économie d’impôt à l’entrée et fiscaliserait inutilement votre épargne à la sortie.';
    } else if (input.perCeilingVerifiedOnTaxNoticeConfirmed === 'oui') {
      status = 'ELIGIBLE_VERIFIE';
      badge = `Déduction TMI ${baselineScenario.marginalTaxRatePercent} % vérifiée`;
      includedInOpt = true;
      optDeductiblePerEur += cappedPerEur;
      impactText = `Versement déductible de ${cappedPerEur.toLocaleString(
        'fr-FR'
      )} € (dans la limite de votre plafond disponible), générant un allègement d’impôt de ${exactDeltaEur.toLocaleString(
        'fr-FR'
      )} € à votre TMI de ${baselineScenario.marginalTaxRatePercent} %.`;
    } else {
      status = 'INCERTAIN_QUESTIONS_REQUISES';
      badge = 'Plafond PER à vérifier';
      unconfirmedPotentialDifferenceEur += exactDeltaEur;
      impactText = `Allègement potentiel de ${exactDeltaEur.toLocaleString(
        'fr-FR'
      )} € (en attente de vérification de votre plafond d’épargne retraite sur votre dernier avis d’impôt).`;
      uncertaintyQs.push(
        'Avez-vous vérifié le « Plafond épargne retraite disponible » figurant à la dernière page de votre avis d’impôt N-1 ?'
      );
      uncertaintyQs.push(
        'Acceptez-vous que l’épargne versée sur un PER soit bloquée jusqu’à l’âge de la retraite (hors achat de la résidence principale ou accident de la vie) ?'
      );
    }

    opportunities.push({
      id: 'opp-epargne-per',
      categoryKey: 'epargne_retraite_per',
      categoryLabel: 'Épargne retraite · Plan d’Épargne Retraite (PER)',
      title: 'Déduction des versements volontaires sur un Plan d’Épargne Retraite (PER)',
      mechanismType: 'DEDUCTION_REVENU',
      mechanismLabel: 'Déduction du revenu imposable',
      eligibilityStatus: status,
      eligibilityBadgeText: badge,
      whatItIs:
        'Les sommes versées volontairement sur un PER sont déduites de votre revenu global imposable, dans la limite d’un plafond annuel (10 % des revenus professionnels de N-1 + plafonds non utilisés des 3 années précédentes).',
      whoMayQualify:
        'Contribuables imposables (particulièrement dans les tranches marginales à 30 %, 41 % ou 45 %) souhaitant préparer leur retraite.',
      requiredConditions: [
        'Le versement doit être effectué sur un contrat PER réglementé avant le 31 décembre de l’année d’imposition.',
        'Vous ne devez pas avoir renoncé à la déductibilité à l’entrée lors du versement.',
      ],
      possibleFinancialImpact: {
        estimatedAnnualTaxDeltaEur: exactDeltaEur,
        impactSummaryText: impactText,
        isIncludedInOptimizedScenario: includedInOpt,
      },
      supportingDocuments: [
        'Imprimé Fiscal Unique (IFU n° 2561) transmis par l’assureur ou le gestionnaire du PER',
        'Dernier avis d’imposition mentionnant le plafond d’épargne retraite disponible',
      ],
      applicableTaxYear: applicableTaxYearLabel,
      exclusionsAndNonCumulation: [
        'Épargne bloquée jusqu’à la liquidation de la retraite (sauf cas légaux de déblocage anticipé : acquisition de la résidence principale, invalidité, décès du conjoint, surendettement, fin de droits chômage).',
        'Fiscalité à la sortie : le capital ou la rente issus de versements ayant été déduits à l’entrée seront imposés lors du retrait à la retraite.',
      ],
      officialSource: {
        sourceName: 'service-public.fr & Code général des impôts',
        statutoryReference: 'CGI Art. 163 quatervicies · BOI-IR-BASE-20-50 · Cases 6NS à 6QU',
        url: 'https://www.service-public.fr/particuliers/vosdroits/F34982',
      },
      verificationDate,
      uncertaintyQuestions: uncertaintyQs,
    });
  }

  // ==========================================================================
  // 7. CHARGES FONCIÈRES QUALIFIANTES : RÉGIME RÉEL VS MICRO-FONCIER 30 %
  // ==========================================================================
  {
    const rentalCharges = Math.max(0, Math.round(input.annualDeductibleRentalExpensesEur));
    const microAbatementEur = grossRent <= 15000 ? Math.round(grossRent * 0.3) : 0;
    const realNetRentalResult = grossRent - rentalCharges;
    const realNetPositiveIncome = Math.max(0, realNetRentalResult);
    const rawRentalDeficit = realNetRentalResult < 0 ? Math.abs(realNetRentalResult) : 0;
    const imputableDeficitOnGlobalIncome = Math.min(
      DEFICIT_FONCIER_GLOBAL_CAP_EUR,
      rawRentalDeficit
    );

    const testWithRealRental = computeDetailedScenario({
      taxYear,
      maritalStatus: baselineMaritalStatus,
      dependantsCount: input.dependantsCount,
      grossSalaryEur: salary,
      useRealExpenses: false,
      realExpensesEur: 0,
      netRentalIncomeAddedEur: realNetPositiveIncome,
      rentalDeficitOnGlobalIncomeEur: imputableDeficitOnGlobalIncome,
      deductibleAlimonyEur: 0,
      deductiblePerEur: 0,
      nonRefundableReductionsRawEur: 0,
      refundableCreditsSubjectToNicheCapRawEur: 0,
      scenarioLabel: 'Test Régime Réel Foncier',
    });
    const exactDeltaEur = Math.max(
      0,
      baselineScenario.netBalanceEur - testWithRealRental.netBalanceEur
    );

    let status: DiscoveryEligibilityStatus = 'NON_APPLICABLE_EXCLUSION';
    let badge = 'Non concerné';
    let impactText = 'Aucun revenu locatif non meublé renseigné.';
    const uncertaintyQs: string[] = [];
    let includedInOpt = false;

    if (!input.hasUnfurnishedRentalIncome || grossRent <= 0) {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Non applicable';
      impactText =
        'Concerne uniquement les propriétaires bailleurs percevant des loyers issus d’une location nue (non meublée).';
    } else if (grossRent <= 15000 && rentalCharges <= microAbatementEur) {
      status = 'NON_AVANTAGEUX_OU_PLAFONNE';
      badge = 'Micro-foncier 30 % plus avantageux';
      impactText = `Vos charges réelles (${rentalCharges.toLocaleString(
        'fr-FR'
      )} €) sont inférieures ou égales à l’abattement forfaitaire micro-foncier de 30 % (${microAbatementEur.toLocaleString(
        'fr-FR'
      )} €). Conservez le régime micro-foncier (case 4BE).`;
    } else if (input.rentalExpensesJustifiedAndUnfurnishedConfirmed === 'oui') {
      status = 'ELIGIBLE_VERIFIE';
      badge = 'Régime réel foncier avantageux';
      includedInOpt = true;
      optNetRentalIncomeAddedEur = realNetPositiveIncome;
      optRentalDeficitOnGlobalIncomeEur = imputableDeficitOnGlobalIncome;
      impactText =
        imputableDeficitOnGlobalIncome > 0
          ? `Vos charges réelles (${rentalCharges.toLocaleString(
              'fr-FR'
            )} €) génèrent un déficit foncier imputable de ${imputableDeficitOnGlobalIncome.toLocaleString(
              'fr-FR'
            )} € sur votre revenu global, réduisant votre impôt de ${exactDeltaEur.toLocaleString(
              'fr-FR'
            )} €.`
          : `Le passage au régime réel foncier (Formulaire 2044) réduit votre bénéfice foncier imposable à ${realNetPositiveIncome.toLocaleString(
              'fr-FR'
            )} €, soit un allègement d’impôt de ${exactDeltaEur.toLocaleString('fr-FR')} €.`;
    } else {
      status = 'INCERTAIN_QUESTIONS_REQUISES';
      badge = 'Charges foncières à vérifier';
      unconfirmedPotentialDifferenceEur += exactDeltaEur;
      impactText = `Allègement potentiel de ${exactDeltaEur.toLocaleString(
        'fr-FR'
      )} € (en attente de vérification de la nature des travaux et de l’engagement de 3 ans au régime réel).`;
      uncertaintyQs.push(
        'Les travaux concernent-ils bien de l’entretien, de la réparation ou de l’amélioration (les travaux de construction, reconstruction ou agrandissement sont exclus) ?'
      );
      uncertaintyQs.push(
        'Savez-vous que l’option pour le régime réel foncier (Formulaire 2044) est irrévocable pendant 3 ans et vous engage à louer le bien jusqu’au 31 décembre de la 3e année suivant l’imputation d’un déficit foncier ?'
      );
    }

    opportunities.push({
      id: 'opp-revenus-fonciers',
      categoryKey: 'revenus_fonciers',
      categoryLabel: 'Immobilier locatif · Charges foncières & Déficit foncier',
      title: 'Option pour le Régime réel foncier & Imputation du déficit foncier (vs Micro-foncier 30 %)',
      mechanismType: 'DEDUCTION_REVENU',
      mechanismLabel: 'Déduction des revenus fonciers / Revenu global',
      eligibilityStatus: status,
      eligibilityBadgeText: badge,
      whatItIs:
        'Si vos loyers bruts non meublés ne dépassent pas 15 000 €, le régime micro-foncier applique un abattement automatique de 30 %. Si vos charges réelles (travaux d’entretien/amélioration, taxe foncière, intérêts d’emprunt, frais de gestion) dépassent 30 %, vous pouvez opter pour le régime réel (n° 2044) et imputer un éventuel déficit foncier (hors intérêts d’emprunt) sur votre revenu global jusqu’à 10 700 €/an.',
      whoMayQualify:
        'Propriétaires bailleurs de logements loués nus (non meublés) supportant des charges de travaux, de copropriété ou de taxe foncière supérieures à 30 % des loyers encaissés.',
      requiredConditions: [
        'Le bien doit être loué nu (non meublé) à titre de résidence principale ou normale.',
        'En cas d’imputation d’un déficit foncier sur le revenu global, le bien doit obligatoirement rester loué jusqu’au 31 décembre de la 3e année qui suit l’imputation.',
        'L’option pour le régime réel (Formulaire 2044) s’applique pour une période irrévocable de 3 ans.',
      ],
      possibleFinancialImpact: {
        estimatedAnnualTaxDeltaEur: exactDeltaEur,
        impactSummaryText: impactText,
        isIncludedInOptimizedScenario: includedInOpt,
      },
      supportingDocuments: [
        'Factures détaillées des artisans pour les travaux de réparation, d’entretien ou d’amélioration',
        'Avis de taxe foncière (hors taxe d’enlèvement des ordures ménagères TEOM récupérable sur le locataire)',
        'Décompte annuel des charges de copropriété et tableau d’amortissement des intérêts d’emprunt',
      ],
      applicableTaxYear: applicableTaxYearLabel,
      exclusionsAndNonCumulation: [
        'Exclusions strictes (CGI Art. 31) : les travaux de construction, de reconstruction ou d’agrandissement ne sont jamais déductibles des revenus fonciers.',
        'Les intérêts d’emprunt sont déductibles uniquement des loyers fonciers et ne peuvent jamais créer de déficit imputable sur votre salaire global.',
        'Non-cumul : le régime réel remplace l’abattement micro-foncier de 30 %.',
      ],
      officialSource: {
        sourceName: 'impots.gouv.fr & Code général des impôts',
        statutoryReference: 'CGI Art. 28, 31 & 156-I-3° · BOI-RFPI-DEFI · Formulaire 2044 / Case 4BA',
        url: 'https://www.impots.gouv.fr/particulier/les-revenus-fonciers',
      },
      verificationDate,
      uncertaintyQuestions: uncertaintyQs,
    });
  }

  // ==========================================================================
  // 8. AUTRES AVANTAGES VÉRIFIÉS : SCOLARITÉ DES ENFANTS & CASE T PARENT ISOLÉ
  // ==========================================================================
  {
    const schoolReductionRawEur =
      Math.max(0, Math.floor(input.childrenInMiddleSchoolCount)) * 61 +
      Math.max(0, Math.floor(input.childrenInHighSchoolCount)) * 153 +
      Math.max(0, Math.floor(input.childrenInHigherEducationCount)) * 183;

    const isUnmarriedWithChildren =
      (input.maritalStatus === 'celibataire' ||
        input.maritalStatus === 'divorce_separe' ||
        input.maritalStatus === 'parent_isole') &&
      input.dependantsCount >= 1;

    const targetMaritalWithCaseT: FamilyMaritalStatus =
      isUnmarriedWithChildren && input.livesAloneWithChildrenOnJan1Confirmed === 'oui'
        ? 'parent_isole'
        : baselineMaritalStatus;

    const testWithOtherBenefits = computeDetailedScenario({
      taxYear,
      maritalStatus: targetMaritalWithCaseT,
      dependantsCount: input.dependantsCount,
      grossSalaryEur: salary,
      useRealExpenses: false,
      realExpensesEur: 0,
      netRentalIncomeAddedEur: baselineNetRentalIncomeEur,
      rentalDeficitOnGlobalIncomeEur: 0,
      deductibleAlimonyEur: 0,
      deductiblePerEur: 0,
      nonRefundableReductionsRawEur: schoolReductionRawEur,
      refundableCreditsSubjectToNicheCapRawEur: 0,
      scenarioLabel: 'Test Case T & Scolarité',
    });

    const exactDeltaEur = Math.max(
      0,
      baselineScenario.netBalanceEur - testWithOtherBenefits.netBalanceEur
    );

    let status: DiscoveryEligibilityStatus = 'NON_APPLICABLE_EXCLUSION';
    let badge = 'Non concerné';
    let impactText = 'Aucun enfant scolarisé au collège/lycée/supérieur ni situation de parent isolé.';
    const uncertaintyQs: string[] = [];
    let includedInOpt = false;

    if (input.dependantsCount === 0 && schoolReductionRawEur === 0) {
      status = 'NON_APPLICABLE_EXCLUSION';
      badge = 'Non applicable';
      impactText =
        'Ces dispositifs concernent uniquement les foyers ayant au moins un enfant à charge.';
    } else if (
      isUnmarriedWithChildren &&
      input.livesAloneWithChildrenOnJan1Confirmed === 'ne_sait_pas'
    ) {
      status = 'INCERTAIN_QUESTIONS_REQUISES';
      badge = 'Case T à vérifier';
      unconfirmedPotentialDifferenceEur += Math.max(schoolReductionRawEur, exactDeltaEur);
      impactText = `Vérifiez si vous viviez seul(e) au 1er janvier pour bénéficier de la demi-part supplémentaire Parent Isolé (Case T) et de la réduction scolarité (${schoolReductionRawEur} €).`;
      uncertaintyQs.push(
        'Viviez-vous seul(e) (sans concubinage) au 1er janvier de l’année d’imposition tout en assurant la charge de votre ou vos enfants (Case T) ?'
      );
    } else if (exactDeltaEur > 0) {
      status = 'ELIGIBLE_VERIFIE';
      badge = 'Avantage familial vérifié';
      includedInOpt = true;
      optMaritalStatus = targetMaritalWithCaseT;
      optNonRefundableReductionsRawEur += schoolReductionRawEur;
      impactText = `Allègement vérifié de ${exactDeltaEur.toLocaleString('fr-FR')} € (${
        targetMaritalWithCaseT === 'parent_isole' ? 'Demi-part Parent isolé Case T incluse · ' : ''
      }Réduction frais de scolarité : ${schoolReductionRawEur.toLocaleString('fr-FR')} €).`;
    } else if (schoolReductionRawEur > 0 && baselineScenario.taxAfterDecoteBeforeReductionsEur === 0) {
      status = 'NON_AVANTAGEUX_OU_PLAFONNE';
      badge = 'Impôt déjà à 0 € (Non remboursable)';
      impactText = `La réduction pour frais de scolarité (${schoolReductionRawEur} €) est une réduction d’impôt non remboursable : votre impôt étant déjà égal à 0 €, elle ne donne pas lieu à remboursement.`;
    }

    opportunities.push({
      id: 'opp-autres-avantages-foyer',
      categoryKey: 'autres_avantages_foyer',
      categoryLabel: 'Famille · Case T (Parent isolé) & Scolarité des enfants',
      title: 'Demi-part Parent Isolé (Case T) & Réduction pour frais de scolarité (Collège, Lycée, Supérieur)',
      mechanismType: 'REDUCTION_IMPOT_NON_REMBOURSABLE',
      mechanismLabel: 'Quotient familial & Réduction d’impôt non remboursable',
      eligibilityStatus: status,
      eligibilityBadgeText: badge,
      whatItIs:
        'Deux dispositifs familiaux complémentaires : (1) la demi-part supplémentaire de Parent Isolé (Case T) si vous élevez seul(e) vos enfants au 1er janvier, et (2) la réduction d’impôt forfaitaire pour enfants scolarisés au 31 décembre (61 € au collège, 153 € au lycée, 183 € dans l’enseignement supérieur).',
      whoMayQualify:
        'Parents isolés vivant seuls avec enfant(s) à charge (Case T) et familles dont les enfants à charge poursuivent des études secondaires ou supérieures.',
      requiredConditions: [
        'Pour la Case T : vivre seul(e) au 1er janvier de l’année d’imposition (ou au 31 décembre en cas de séparation dans l’année) avec au moins un enfant à charge.',
        'Pour la réduction scolarité : l’enfant doit être rattaché au foyer fiscal, scolarisé au 31 décembre et ne pas être lié par un contrat de travail ni rémunéré.',
      ],
      possibleFinancialImpact: {
        estimatedAnnualTaxDeltaEur: exactDeltaEur,
        impactSummaryText: impactText,
        isIncludedInOptimizedScenario: includedInOpt,
      },
      supportingDocuments: [
        'Certificat de scolarité au 31 décembre de l’année d’imposition',
        'Justificatif de domicile attestant de l’isolement du parent au 1er janvier (pour la Case T)',
      ],
      applicableTaxYear: applicableTaxYearLabel,
      exclusionsAndNonCumulation: [
        'Plafond spécifique Parent Isolé (Barème 2026) : l’avantage en impôt procuré par la part entière du 1er enfant d’un parent isolé est plafonné à 4 262 €.',
        'La réduction pour frais de scolarité est divisée par 2 en cas de garde alternée (30,50 € collège, 76,50 € lycée, 91,50 € supérieur) et n’est pas remboursable si votre impôt est de 0 €.',
        'Exclusions scolarité : les enfants en contrat d’apprentissage ou en congé formation rémunéré n’ouvrent pas droit à la réduction.',
      ],
      officialSource: {
        sourceName: 'service-public.fr & Code général des impôts',
        statutoryReference: 'CGI Art. 194-II (Case T) & Art. 199 quater F (Cases 7EA / 7EC / 7EF)',
        url: 'https://www.service-public.fr/particuliers/vosdroits/F9',
      },
      verificationDate,
      uncertaintyQuestions: uncertaintyQs,
    });
  }

  // Compute the combined Optimized Scenario with all verified selections (Zero double counting!)
  const optimizedScenario = computeDetailedScenario({
    taxYear,
    maritalStatus: optMaritalStatus,
    dependantsCount: input.dependantsCount,
    grossSalaryEur: salary,
    useRealExpenses: optUseRealExpenses,
    realExpensesEur: optRealExpensesEur,
    netRentalIncomeAddedEur: optNetRentalIncomeAddedEur,
    rentalDeficitOnGlobalIncomeEur: optRentalDeficitOnGlobalIncomeEur,
    deductibleAlimonyEur: optDeductibleAlimonyEur,
    deductiblePerEur: optDeductiblePerEur,
    nonRefundableReductionsRawEur: optNonRefundableReductionsRawEur,
    refundableCreditsSubjectToNicheCapRawEur: optRefundableCreditsRawEur,
    scenarioLabel: 'Alternative légale vérifiée (Dispositifs confirmés appliqués)',
  });

  const verifiedNetAnnualDifferenceEur = Math.max(
    0,
    baselineScenario.netBalanceEur - optimizedScenario.netBalanceEur
  );

  return {
    declarationYear: yearParams.declarationYear,
    incomeYear: yearParams.incomeYear,
    baselineScenario,
    optimizedScenario,
    verifiedNetAnnualDifferenceEur,
    unconfirmedPotentialDifferenceEur,
    globalNicheCeilingLimitEur: GLOBAL_TAX_NICHE_CEILING_EUR,
    globalNicheCeilingUsedEur: optimizedScenario.refundableTaxCreditsAppliedEur,
    opportunities,
  };
}

/**
 * ============================================================================
 * PERSONAL SALARY, PAYSLIP & PRÉLÈVEMENT À LA SOURCE (PAS) SIMULATOR ENGINE
 * ============================================================================
 * Official sources:
 * - Code général des impôts (CGI) Art. 204 A à 204 N (Prélèvement à la source : assiette, taux personnalisé, taux individualisé, taux neutre, modulation)
 * - URSSAF & AGIRC-ARRCO (Taux des cotisations salariales 2026 & 2025, PMSS 4 005 € en 2026 / 3 925 € en 2025, CSG déductible 6,80 % et CSG/CRDS non déductible 2,90 % sur 98,25 % du brut)
 * - Bulletin Officiel de la Sécurité Sociale (BOSS) — Montant net social & Net imposable
 */

export type SalaryEntryMode = 'STATUTORY_ESTIMATE' | 'MANUAL_PAYSLIP';
export type WithholdingRateOptionType = 'PERSONNALISE_FOYER' | 'INDIVIDUALISE_COUPLE' | 'NEUTRE_DEFAUT';

export interface NeutralTaxGridBracket {
  upToMonthlyNetTaxableEur: number | null;
  ratePercent: number;
}

/**
 * Grille officielle du taux par défaut (taux non personnalisé / taux neutre) — France métropolitaine
 * Source : CGI Art. 204 H / impots.gouv.fr (Barème mensuel selon la base nette imposable mensuelle)
 */
export const NEUTRAL_PAS_GRID_METROPOLE_2026: NeutralTaxGridBracket[] = [
  { upToMonthlyNetTaxableEur: 1626, ratePercent: 0 },
  { upToMonthlyNetTaxableEur: 1689, ratePercent: 0.5 },
  { upToMonthlyNetTaxableEur: 1802, ratePercent: 1.3 },
  { upToMonthlyNetTaxableEur: 1929, ratePercent: 2.1 },
  { upToMonthlyNetTaxableEur: 2064, ratePercent: 2.9 },
  { upToMonthlyNetTaxableEur: 2176, ratePercent: 3.5 },
  { upToMonthlyNetTaxableEur: 2321, ratePercent: 4.1 },
  { upToMonthlyNetTaxableEur: 2750, ratePercent: 5.3 },
  { upToMonthlyNetTaxableEur: 3147, ratePercent: 7.5 },
  { upToMonthlyNetTaxableEur: 3583, ratePercent: 9.9 },
  { upToMonthlyNetTaxableEur: 4031, ratePercent: 11.9 },
  { upToMonthlyNetTaxableEur: 4709, ratePercent: 13.8 },
  { upToMonthlyNetTaxableEur: 5646, ratePercent: 15.8 },
  { upToMonthlyNetTaxableEur: 7066, ratePercent: 17.9 },
  { upToMonthlyNetTaxableEur: 8827, ratePercent: 20.0 },
  { upToMonthlyNetTaxableEur: 12257, ratePercent: 24.0 },
  { upToMonthlyNetTaxableEur: 16590, ratePercent: 28.0 },
  { upToMonthlyNetTaxableEur: 26003, ratePercent: 33.0 },
  { upToMonthlyNetTaxableEur: 55712, ratePercent: 38.0 },
  { upToMonthlyNetTaxableEur: null, ratePercent: 43.0 },
];

export const NEUTRAL_PAS_GRID_METROPOLE_2025: NeutralTaxGridBracket[] = [
  { upToMonthlyNetTaxableEur: 1611, ratePercent: 0 },
  { upToMonthlyNetTaxableEur: 1674, ratePercent: 0.5 },
  { upToMonthlyNetTaxableEur: 1786, ratePercent: 1.3 },
  { upToMonthlyNetTaxableEur: 1912, ratePercent: 2.1 },
  { upToMonthlyNetTaxableEur: 2046, ratePercent: 2.9 },
  { upToMonthlyNetTaxableEur: 2157, ratePercent: 3.5 },
  { upToMonthlyNetTaxableEur: 2300, ratePercent: 4.1 },
  { upToMonthlyNetTaxableEur: 2725, ratePercent: 5.3 },
  { upToMonthlyNetTaxableEur: 3119, ratePercent: 7.5 },
  { upToMonthlyNetTaxableEur: 3551, ratePercent: 9.9 },
  { upToMonthlyNetTaxableEur: 3995, ratePercent: 11.9 },
  { upToMonthlyNetTaxableEur: 4667, ratePercent: 13.8 },
  { upToMonthlyNetTaxableEur: 5596, ratePercent: 15.8 },
  { upToMonthlyNetTaxableEur: 7003, ratePercent: 17.9 },
  { upToMonthlyNetTaxableEur: 8748, ratePercent: 20.0 },
  { upToMonthlyNetTaxableEur: 12148, ratePercent: 24.0 },
  { upToMonthlyNetTaxableEur: 16442, ratePercent: 28.0 },
  { upToMonthlyNetTaxableEur: 25771, ratePercent: 33.0 },
  { upToMonthlyNetTaxableEur: 55215, ratePercent: 38.0 },
  { upToMonthlyNetTaxableEur: null, ratePercent: 43.0 },
];

/**
 * Computes the official statutory neutral (non-personalized) withholding rate
 * from the monthly net taxable salary (CGI Art. 204 H).
 */
export function computeNeutralWithholdingRate(
  monthlyNetTaxableEur: number,
  taxYear: SupportedTaxYear = 2026
): { ratePercent: number; bracketThresholdLabel: string } {
  const netTaxable = Math.max(0, monthlyNetTaxableEur);
  const grid =
    taxYear === 2025 ? NEUTRAL_PAS_GRID_METROPOLE_2025 : NEUTRAL_PAS_GRID_METROPOLE_2026;

  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    const prevMax = i > 0 ? grid[i - 1].upToMonthlyNetTaxableEur ?? 0 : 0;
    if (row.upToMonthlyNetTaxableEur === null) {
      return {
        ratePercent: row.ratePercent,
        bracketThresholdLabel: `Au-delà de ${prevMax.toLocaleString('fr-FR')} € net imposable / mois`,
      };
    }
    if (netTaxable <= row.upToMonthlyNetTaxableEur) {
      return {
        ratePercent: row.ratePercent,
        bracketThresholdLabel:
          prevMax === 0
            ? `Jusqu’à ${row.upToMonthlyNetTaxableEur.toLocaleString('fr-FR')} € net imposable / mois`
            : `De ${(prevMax + 1).toLocaleString('fr-FR')} € à ${row.upToMonthlyNetTaxableEur.toLocaleString('fr-FR')} € net imposable / mois`,
      };
    }
  }
  return { ratePercent: 43.0, bracketThresholdLabel: 'Tranche supérieure (43 %)' };
}

export interface PayslipContributionLine {
  code: string;
  label: string;
  baseEur: number;
  ratePercent: number;
  amountMonthlyEur: number;
  isTaxDeductible: boolean;
  statutoryRef: string;
}

export interface DetailedPersonalSalaryInput {
  entryMode: SalaryEntryMode;
  taxYear?: SupportedTaxYear;

  // Gross salary & schedule
  grossMonthlySalaryEur: number;
  salaryMonthsPerYear?: 12 | 13; // 12 mois par défaut ou 13e mois inclus
  status: 'non_cadre' | 'cadre' | 'fonction_publique';

  // Optional company-specific employee/employer mutuelle parameters (for statutory estimate)
  employeeMutuelleMonthlyEur?: number; // Part salariale mutuelle obligatoire (déduite du net à payer et du net imposable)
  employerMutuelleMonthlyEur?: number; // Part patronale mutuelle obligatoire (ajoutée au net imposable — CGI Art. 83)

  // Manual payslip overrides (used when entryMode === 'MANUAL_PAYSLIP')
  manualNetBeforeTaxMonthlyEur?: number;
  manualNetTaxableMonthlyEur?: number;
  manualNetSocialMonthlyEur?: number;
  manualWithholdingRatePercent?: number | null; // Optional custom PAS rate on payslip

  // Household & tax parameters for annual taxable income & PAS calculation
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
  expenseDeductionMode?: 'abattement_10' | 'frais_reels';
  realExpensesAnnualEur?: number;
  withholdingRateOption?: WithholdingRateOptionType;
  spouseMonthlyNetTaxableEur?: number; // Used when withholdingRateOption === 'INDIVIDUALISE_COUPLE'
}

export interface DetailedPersonalSalaryResult {
  entryMode: SalaryEntryMode;
  taxYear: SupportedTaxYear;
  pmssMonthlyEur: number;
  passAnnualEur: number;
  salaryMonthsPerYear: number;

  // 1. Gross salary
  grossMonthlySalaryEur: number;
  grossAnnualSalaryEur: number;

  // 2. Social contributions
  employeeSocialContributionsMonthlyEur: number;
  employeeSocialContributionsAnnualEur: number;
  effectiveEmployeeContributionRatePercent: number;
  contributionLines: PayslipContributionLine[];

  // 3. Net before income tax & Net social
  netBeforeTaxMonthlyEur: number;
  netBeforeTaxAnnualEur: number;
  netSocialMonthlyEur: number;

  // 4. Net taxable salary (Salaire net imposable) & explanation of gap
  nonDeductibleCsgCrdsMonthlyEur: number;
  employerMutuelleTaxableShareMonthlyEur: number;
  netTaxableMonthlyEur: number;
  netTaxableAnnualEur: number;
  differenceNetTaxableVsNetBeforeTaxMonthlyEur: number;

  // 5. Annual taxable income (Revenu imposable soumis au barème après abattement 10% ou frais réels)
  professionalDeductionAppliedAnnualEur: number;
  annualTaxableIncomeAfterDeductionEur: number;
  familyQuotientParts: number;
  marginalTaxRatePercent: number;
  estimatedAnnualIncomeTaxEur: number;

  // 6. Income tax withholding (Prélèvement à la source) & Net after withholding
  appliedWithholdingRateOption: WithholdingRateOptionType;
  appliedWithholdingRatePercent: number;
  personalizedHouseholdRatePercent: number;
  individualizedEmployeeRatePercent: number;
  individualizedSpouseRatePercent: number;
  neutralDefaultRatePercent: number;
  neutralBracketLabel: string;
  withholdingTaxMonthlyEur: number; // Calculated on netTaxableMonthlyEur (CGI Art. 204 F)
  withholdingTaxAnnualEur: number;
  netAfterTaxMonthlyEur: number; // Net payé en banque
  netAfterTaxAnnualEur: number;

  // Methodological assumptions & caveats
  assumptionsAndLimitations: string[];
}

/**
 * Deterministic Detailed Personal Salary & Payslip Calculator.
 * Supports both Statutory URSSAF/AGIRC-ARRCO estimation (with Tranche 1 / Tranche 2 PMSS caps)
 * and Manual Payslip Entry mode.
 */
export function calculateDetailedPersonalSalary(
  input: DetailedPersonalSalaryInput
): DetailedPersonalSalaryResult {
  const taxYear: SupportedTaxYear = input.taxYear ?? 2026;
  const pmssMonthlyEur = taxYear === 2025 ? 3925 : 4005;
  const passAnnualEur = pmssMonthlyEur * 12;
  const months = input.salaryMonthsPerYear === 13 ? 13 : 12;

  const grossMonthly = Math.max(0, roundCurrency(input.grossMonthlySalaryEur));
  const grossAnnual = roundCurrency(grossMonthly * months);

  const employeeMutuelle = Math.max(0, roundCurrency(input.employeeMutuelleMonthlyEur ?? 0));
  const employerMutuelle = Math.max(0, roundCurrency(input.employerMutuelleMonthlyEur ?? 0));

  // Compute statutory employee contribution lines (Tranche 1 <= 1 PMSS, Tranche 2 from 1 to 8 PMSS)
  const tranche1Base = Math.min(grossMonthly, pmssMonthlyEur);
  const tranche2Base = Math.max(0, Math.min(grossMonthly, pmssMonthlyEur * 8) - pmssMonthlyEur);
  const apecBase = Math.min(grossMonthly, pmssMonthlyEur * 4);
  const csgBase = roundCurrency(Math.min(grossMonthly, pmssMonthlyEur * 4) * 0.9825 + Math.max(0, grossMonthly - pmssMonthlyEur * 4));

  const contributionLines: PayslipContributionLine[] = [];

  if (input.status === 'fonction_publique') {
    const pensionCivile = roundCurrency(grossMonthly * 0.111);
    const csgDeductible = roundCurrency(csgBase * 0.068);
    const csgCrdsNonDeductible = roundCurrency(csgBase * 0.029);

    contributionLines.push(
      {
        code: 'PENSION_CIVILE_FP',
        label: 'Retenue pension civile / RAFP (Fonction publique)',
        baseEur: grossMonthly,
        ratePercent: 11.1,
        amountMonthlyEur: pensionCivile,
        isTaxDeductible: true,
        statutoryRef: 'Code des pensions civiles et militaires',
      },
      {
        code: 'CSG_DEDUCTIBLE',
        label: 'CSG déductible de l’impôt sur le revenu (6,80 % sur 98,25 % du brut)',
        baseEur: csgBase,
        ratePercent: 6.8,
        amountMonthlyEur: csgDeductible,
        isTaxDeductible: true,
        statutoryRef: 'CSS Art. L136-2 & CGI Art. 154 quinquies',
      },
      {
        code: 'CSG_CRDS_NON_DEDUCTIBLE',
        label: 'CSG non déductible (2,40 %) + CRDS (0,50 %) — Réintégrées au Net imposable',
        baseEur: csgBase,
        ratePercent: 2.9,
        amountMonthlyEur: csgCrdsNonDeductible,
        isTaxDeductible: false,
        statutoryRef: 'CSS Art. L136-8 & Ordonnance n° 96-50',
      }
    );
  } else {
    // Secteur privé (Non-cadre ou Cadre)
    const vieillessePlaf = roundCurrency(tranche1Base * 0.069);
    const vieillesseDeplaf = roundCurrency(grossMonthly * 0.004);
    const agircArrcoT1 = roundCurrency(tranche1Base * 0.0401);
    const agircArrcoT2 = roundCurrency(tranche2Base * 0.0972);
    const cet = grossMonthly > pmssMonthlyEur ? roundCurrency((tranche1Base + tranche2Base) * 0.0014) : 0;
    const apec = input.status === 'cadre' ? roundCurrency(apecBase * 0.00024) : 0;
    const csgDeductible = roundCurrency(csgBase * 0.068);
    const csgCrdsNonDeductible = roundCurrency(csgBase * 0.029);

    contributionLines.push(
      {
        code: 'VIEILLESSE_PLAFONNEE',
        label: `Assurance vieillesse plafonnée (≤ 1 PMSS : ${pmssMonthlyEur.toLocaleString('fr-FR')} €)`,
        baseEur: tranche1Base,
        ratePercent: 6.9,
        amountMonthlyEur: vieillessePlaf,
        isTaxDeductible: true,
        statutoryRef: 'CSS Art. D242-4 (URSSAF)',
      },
      {
        code: 'VIEILLESSE_DEPLAFONNEE',
        label: 'Assurance vieillesse déplafonnée (Totalité du salaire brut)',
        baseEur: grossMonthly,
        ratePercent: 0.4,
        amountMonthlyEur: vieillesseDeplaf,
        isTaxDeductible: true,
        statutoryRef: 'CSS Art. D242-4 (URSSAF)',
      },
      {
        code: 'AGIRC_ARRCO_T1',
        label: 'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 1 (≤ 1 PMSS)',
        baseEur: tranche1Base,
        ratePercent: 4.01,
        amountMonthlyEur: agircArrcoT1,
        isTaxDeductible: true,
        statutoryRef: 'ANI AGIRC-ARRCO (3,15 % + CEG 0,86 %)',
      }
    );

    if (tranche2Base > 0) {
      contributionLines.push({
        code: 'AGIRC_ARRCO_T2',
        label: 'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 2 (> 1 PMSS)',
        baseEur: tranche2Base,
        ratePercent: 9.72,
        amountMonthlyEur: agircArrcoT2,
        isTaxDeductible: true,
        statutoryRef: 'ANI AGIRC-ARRCO (8,64 % + CEG 1,08 %)',
      });
    }

    if (cet > 0) {
      contributionLines.push({
        code: 'CET_RETRAITE',
        label: 'Contribution d’Équilibre Technique (CET, si salaire brut > 1 PMSS)',
        baseEur: tranche1Base + tranche2Base,
        ratePercent: 0.14,
        amountMonthlyEur: cet,
        isTaxDeductible: true,
        statutoryRef: 'ANI AGIRC-ARRCO (CET part salariale 0,14 %)',
      });
    }

    if (apec > 0) {
      contributionLines.push({
        code: 'APEC_CADRE',
        label: 'Cotisation APEC (Statut Cadre, limitée à 4 PMSS)',
        baseEur: apecBase,
        ratePercent: 0.024,
        amountMonthlyEur: apec,
        isTaxDeductible: true,
        statutoryRef: 'Accord APEC (Part salariale 0,024 %)',
      });
    }

    contributionLines.push(
      {
        code: 'CSG_DEDUCTIBLE',
        label: 'CSG déductible de l’impôt sur le revenu (6,80 % sur 98,25 % du brut)',
        baseEur: csgBase,
        ratePercent: 6.8,
        amountMonthlyEur: csgDeductible,
        isTaxDeductible: true,
        statutoryRef: 'CSS Art. L136-2 & CGI Art. 154 quinquies',
      },
      {
        code: 'CSG_CRDS_NON_DEDUCTIBLE',
        label: 'CSG non déductible (2,40 %) + CRDS (0,50 %) — Incluses dans le Net imposable',
        baseEur: csgBase,
        ratePercent: 2.9,
        amountMonthlyEur: csgCrdsNonDeductible,
        isTaxDeductible: false,
        statutoryRef: 'CSS Art. L136-8 & Ordonnance n° 96-50',
      }
    );
  }

  const statutoryContributionsMonthly = roundCurrency(
    contributionLines.reduce((sum, l) => sum + l.amountMonthlyEur, 0) + employeeMutuelle
  );
  const statutoryNonDeductibleCsgCrdsMonthly =
    contributionLines.find((l) => l.code === 'CSG_CRDS_NON_DEDUCTIBLE')?.amountMonthlyEur ??
    roundCurrency(csgBase * 0.029);

  const statutoryNetBeforeTaxMonthly = roundCurrency(
    Math.max(0, grossMonthly - statutoryContributionsMonthly)
  );
  const statutoryNetTaxableMonthly = roundCurrency(
    statutoryNetBeforeTaxMonthly + statutoryNonDeductibleCsgCrdsMonthly + employerMutuelle
  );
  const statutoryNetSocialMonthly = roundCurrency(
    Math.max(0, grossMonthly - statutoryContributionsMonthly + employeeMutuelle)
  );

  // Determine active monthly figures based on entryMode ('STATUTORY_ESTIMATE' vs 'MANUAL_PAYSLIP')
  const netBeforeTaxMonthlyEur =
    input.entryMode === 'MANUAL_PAYSLIP' &&
    typeof input.manualNetBeforeTaxMonthlyEur === 'number' &&
    input.manualNetBeforeTaxMonthlyEur >= 0
      ? roundCurrency(input.manualNetBeforeTaxMonthlyEur)
      : statutoryNetBeforeTaxMonthly;

  const netTaxableMonthlyEur =
    input.entryMode === 'MANUAL_PAYSLIP' &&
    typeof input.manualNetTaxableMonthlyEur === 'number' &&
    input.manualNetTaxableMonthlyEur >= 0
      ? roundCurrency(input.manualNetTaxableMonthlyEur)
      : statutoryNetTaxableMonthly;

  const netSocialMonthlyEur =
    input.entryMode === 'MANUAL_PAYSLIP' &&
    typeof input.manualNetSocialMonthlyEur === 'number' &&
    input.manualNetSocialMonthlyEur >= 0
      ? roundCurrency(input.manualNetSocialMonthlyEur)
      : statutoryNetSocialMonthly;

  const employeeSocialContributionsMonthlyEur =
    input.entryMode === 'MANUAL_PAYSLIP'
      ? roundCurrency(Math.max(0, grossMonthly - netBeforeTaxMonthlyEur))
      : statutoryContributionsMonthly;

  const employeeSocialContributionsAnnualEur = roundCurrency(
    employeeSocialContributionsMonthlyEur * months
  );
  const effectiveEmployeeContributionRatePercent =
    grossMonthly > 0
      ? roundRate((employeeSocialContributionsMonthlyEur / grossMonthly) * 100)
      : 0;

  const netBeforeTaxAnnualEur = roundCurrency(netBeforeTaxMonthlyEur * months);
  const netTaxableAnnualEur = roundCurrency(netTaxableMonthlyEur * months);
  const differenceNetTaxableVsNetBeforeTaxMonthlyEur = roundCurrency(
    netTaxableMonthlyEur - netBeforeTaxMonthlyEur
  );

  // Calculate household & individualized income tax rates
  const spouseAnnualNetTaxableEur =
    input.maritalStatus === 'marie_pacse' &&
    typeof input.spouseMonthlyNetTaxableEur === 'number' &&
    input.spouseMonthlyNetTaxableEur > 0
      ? roundCurrency(input.spouseMonthlyNetTaxableEur * 12)
      : 0;

  const householdIr = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: Math.round(netTaxableAnnualEur + spouseAnnualNetTaxableEur),
    maritalStatus: input.maritalStatus,
    dependantsCount: input.dependantsCount,
    expenseDeductionMode: input.expenseDeductionMode ?? 'abattement_10',
    realExpensesAmountEur: input.realExpensesAnnualEur ?? 0,
    taxYear,
  });

  // Standalone employee tax calculation (for annual taxable income breakdown & individualized rate)
  const employeeSingleEquivalentIr = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: Math.round(netTaxableAnnualEur),
    maritalStatus: input.maritalStatus === 'marie_pacse' ? 'celibataire' : input.maritalStatus,
    dependantsCount: input.dependantsCount,
    expenseDeductionMode: input.expenseDeductionMode ?? 'abattement_10',
    realExpensesAmountEur: input.realExpensesAnnualEur ?? 0,
    taxYear,
  });

  const personalizedHouseholdRatePercent = householdIr.effectiveWithholdingRatePercent;

  // Compute individualized rates for couples (CGI Art. 204 M)
  let individualizedEmployeeRatePercent = personalizedHouseholdRatePercent;
  let individualizedSpouseRatePercent = personalizedHouseholdRatePercent;

  if (input.maritalStatus === 'marie_pacse' && spouseAnnualNetTaxableEur > 0) {
    const halfDependants = input.dependantsCount / 2;
    const empAloneIr = calculatePersonalIncomeTax({
      annualDeclaredIncomeEur: Math.round(netTaxableAnnualEur),
      maritalStatus: 'celibataire',
      dependantsCount: Math.floor(halfDependants),
      taxYear,
    });
    const spouseAloneIr = calculatePersonalIncomeTax({
      annualDeclaredIncomeEur: Math.round(spouseAnnualNetTaxableEur),
      maritalStatus: 'celibataire',
      dependantsCount: Math.floor(halfDependants),
      taxYear,
    });

    if (netTaxableAnnualEur <= spouseAnnualNetTaxableEur) {
      individualizedEmployeeRatePercent = Math.min(
        personalizedHouseholdRatePercent,
        empAloneIr.effectiveWithholdingRatePercent
      );
      const empTaxShare = (netTaxableAnnualEur * individualizedEmployeeRatePercent) / 100;
      const remainingHouseholdTax = Math.max(0, householdIr.finalEstimatedTaxEur - empTaxShare);
      individualizedSpouseRatePercent =
        spouseAnnualNetTaxableEur > 0
          ? roundRate((remainingHouseholdTax / spouseAnnualNetTaxableEur) * 100)
          : personalizedHouseholdRatePercent;
    } else {
      individualizedSpouseRatePercent = Math.min(
        personalizedHouseholdRatePercent,
        spouseAloneIr.effectiveWithholdingRatePercent
      );
      const spouseTaxShare = (spouseAnnualNetTaxableEur * individualizedSpouseRatePercent) / 100;
      const remainingHouseholdTax = Math.max(0, householdIr.finalEstimatedTaxEur - spouseTaxShare);
      individualizedEmployeeRatePercent =
        netTaxableAnnualEur > 0
          ? roundRate((remainingHouseholdTax / netTaxableAnnualEur) * 100)
          : personalizedHouseholdRatePercent;
    }
  }

  // Neutral / Non-personalized rate (CGI Art. 204 H)
  const neutralInfo = computeNeutralWithholdingRate(netTaxableMonthlyEur, taxYear);
  const neutralDefaultRatePercent = neutralInfo.ratePercent;

  const appliedWithholdingRateOption: WithholdingRateOptionType =
    input.withholdingRateOption ?? 'PERSONNALISE_FOYER';

  let appliedWithholdingRatePercent = personalizedHouseholdRatePercent;
  if (
    input.entryMode === 'MANUAL_PAYSLIP' &&
    typeof input.manualWithholdingRatePercent === 'number' &&
    input.manualWithholdingRatePercent >= 0
  ) {
    appliedWithholdingRatePercent = roundRate(input.manualWithholdingRatePercent);
  } else if (appliedWithholdingRateOption === 'INDIVIDUALISE_COUPLE') {
    appliedWithholdingRatePercent = individualizedEmployeeRatePercent;
  } else if (appliedWithholdingRateOption === 'NEUTRE_DEFAUT') {
    appliedWithholdingRatePercent = neutralDefaultRatePercent;
  }

  // CGI Art. 204 F: Prélèvement à la source is legally applied to the Net Taxable Salary (Assiette = Salaire net imposable)
  const withholdingTaxMonthlyEur = roundCurrency(
    (netTaxableMonthlyEur * appliedWithholdingRatePercent) / 100
  );
  const withholdingTaxAnnualEur = roundCurrency(withholdingTaxMonthlyEur * months);

  const netAfterTaxMonthlyEur = roundCurrency(
    Math.max(0, netBeforeTaxMonthlyEur - withholdingTaxMonthlyEur)
  );
  const netAfterTaxAnnualEur = roundCurrency(netAfterTaxMonthlyEur * months);

  const assumptionsAndLimitations = [
    `Barème social et plafond de Sécurité sociale appliqués : PMSS ${taxYear} = ${pmssMonthlyEur.toLocaleString(
      'fr-FR'
    )} €/mois (PASS = ${passAnnualEur.toLocaleString('fr-FR')} €/an).`,
    'Assiette légale du Prélèvement à la Source (CGI Art. 204 F) : le taux PAS s’applique au « Salaire net imposable » et le montant obtenu est retranché du « Salaire net avant impôt ».',
    'Pourquoi un calculateur Brut → Net ne peut jamais être exact au centime près sans votre bulletin de paie : les cotisations de mutuelle santé obligatoire, de prévoyance conventionnelle (IDCC), les titres-restaurant, le remboursement transport et les heures supplémentaires exonérées dépendent de votre contrat et de votre entreprise.',
  ];

  return {
    entryMode: input.entryMode,
    taxYear,
    pmssMonthlyEur,
    passAnnualEur,
    salaryMonthsPerYear: months,
    grossMonthlySalaryEur: grossMonthly,
    grossAnnualSalaryEur: grossAnnual,
    employeeSocialContributionsMonthlyEur,
    employeeSocialContributionsAnnualEur,
    effectiveEmployeeContributionRatePercent,
    contributionLines,
    netBeforeTaxMonthlyEur,
    netBeforeTaxAnnualEur,
    netSocialMonthlyEur,
    nonDeductibleCsgCrdsMonthlyEur: statutoryNonDeductibleCsgCrdsMonthly,
    employerMutuelleTaxableShareMonthlyEur: employerMutuelle,
    netTaxableMonthlyEur,
    netTaxableAnnualEur,
    differenceNetTaxableVsNetBeforeTaxMonthlyEur,
    professionalDeductionAppliedAnnualEur: employeeSingleEquivalentIr.deductionAppliedEur,
    annualTaxableIncomeAfterDeductionEur: employeeSingleEquivalentIr.netTaxableIncomeEur,
    familyQuotientParts: householdIr.familyQuotientParts,
    marginalTaxRatePercent: householdIr.marginalTaxRatePercent,
    estimatedAnnualIncomeTaxEur: householdIr.finalEstimatedTaxEur,
    appliedWithholdingRateOption,
    appliedWithholdingRatePercent,
    personalizedHouseholdRatePercent,
    individualizedEmployeeRatePercent,
    individualizedSpouseRatePercent,
    neutralDefaultRatePercent,
    neutralBracketLabel: neutralInfo.bracketThresholdLabel,
    withholdingTaxMonthlyEur,
    withholdingTaxAnnualEur,
    netAfterTaxMonthlyEur,
    netAfterTaxAnnualEur,
    assumptionsAndLimitations,
  };
}

export interface WithholdingSituationChangeInput {
  taxYear?: SupportedTaxYear;

  // Current (Baseline) situation
  currentMonthlyNetTaxableSalaryEur: number;
  currentSpouseMonthlyNetTaxableSalaryEur: number;
  currentMaritalStatus: FamilyMaritalStatus;
  currentDependantsCount: number;
  currentAnnualTaxCreditsEur?: number;

  // New (Changed) situation (income change or family event)
  newMonthlyNetTaxableSalaryEur: number;
  newSpouseMonthlyNetTaxableSalaryEur: number;
  newMaritalStatus: FamilyMaritalStatus;
  newDependantsCount: number;
  newAnnualTaxCreditsEur?: number;
}

export interface WithholdingSituationChangeResult {
  taxYear: SupportedTaxYear;

  // Baseline (Before change)
  currentQuotientParts: number;
  currentPersonalizedRatePercent: number;
  currentIndividualizedSpouse1RatePercent: number;
  currentIndividualizedSpouse2RatePercent: number;
  currentNeutralRateSpouse1Percent: number;
  currentMonthlyWithholdingTotalEur: number;
  currentAnnualTaxEur: number;

  // New situation (After change)
  newQuotientParts: number;
  newPersonalizedRatePercent: number;
  newIndividualizedSpouse1RatePercent: number;
  newIndividualizedSpouse2RatePercent: number;
  newNeutralRateSpouse1Percent: number;
  newMonthlyWithholdingIfModulatedTotalEur: number;
  newActualAnnualTaxDueEur: number;

  // Impact & Annual Tax Balance Comparison (Septembre N+1)
  rateDeltaPoints: number;
  monthlyWithholdingDeltaEur: number;
  totalWithheldOver12MonthsIfOldRateKeptEur: number;
  annualTaxBalanceIfOldRateKeptEur: number; // > 0 = Reste à payer à la DGFiP, < 0 = Trop-perçu remboursé par la DGFiP
  annualTaxBalanceIfModulatedPromptlyEur: number;

  // Neutral rate complement warning (CGI Art. 204 H)
  neutralRateMonthlyComplementToDgfipEur: number;
}

/**
 * Deterministic simulator for Prélèvement à la Source (PAS) rate options and
 * life/income change impact on monthly withholding and final annual tax balance.
 */
export function simulateWithholdingTaxAndSituationChange(
  input: WithholdingSituationChangeInput
): WithholdingSituationChangeResult {
  const taxYear: SupportedTaxYear = input.taxYear ?? 2026;

  // 1. Current situation
  const curSpouse1Annual = Math.max(0, roundCurrency(input.currentMonthlyNetTaxableSalaryEur * 12));
  const curSpouse2Annual =
    input.currentMaritalStatus === 'marie_pacse'
      ? Math.max(0, roundCurrency(input.currentSpouseMonthlyNetTaxableSalaryEur * 12))
      : 0;
  const curTotalAnnualIncome = curSpouse1Annual + curSpouse2Annual;

  const curIr = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: curTotalAnnualIncome,
    maritalStatus: input.currentMaritalStatus,
    dependantsCount: input.currentDependantsCount,
    estimatedTaxCreditsEur: input.currentAnnualTaxCreditsEur ?? 0,
    taxYear,
  });

  const currentPersonalizedRatePercent = curIr.effectiveWithholdingRatePercent;
  const currentMonthlyWithholdingTotalEur = roundCurrency(
    ((curTotalAnnualIncome / 12) * currentPersonalizedRatePercent) / 100
  );

  // Current individualized rates
  const curDetailed = calculateDetailedPersonalSalary({
    entryMode: 'MANUAL_PAYSLIP',
    taxYear,
    grossMonthlySalaryEur: roundCurrency(input.currentMonthlyNetTaxableSalaryEur * 1.25),
    manualNetBeforeTaxMonthlyEur: roundCurrency(input.currentMonthlyNetTaxableSalaryEur * 0.965),
    manualNetTaxableMonthlyEur: input.currentMonthlyNetTaxableSalaryEur,
    status: 'cadre',
    maritalStatus: input.currentMaritalStatus,
    dependantsCount: input.currentDependantsCount,
    spouseMonthlyNetTaxableEur:
      input.currentMaritalStatus === 'marie_pacse'
        ? input.currentSpouseMonthlyNetTaxableSalaryEur
        : 0,
  });

  // 2. New situation (after income or family change)
  const newSpouse1Annual = Math.max(0, roundCurrency(input.newMonthlyNetTaxableSalaryEur * 12));
  const newSpouse2Annual =
    input.newMaritalStatus === 'marie_pacse'
      ? Math.max(0, roundCurrency(input.newSpouseMonthlyNetTaxableSalaryEur * 12))
      : 0;
  const newTotalAnnualIncome = newSpouse1Annual + newSpouse2Annual;

  const newIr = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: newTotalAnnualIncome,
    maritalStatus: input.newMaritalStatus,
    dependantsCount: input.newDependantsCount,
    estimatedTaxCreditsEur: input.newAnnualTaxCreditsEur ?? 0,
    taxYear,
  });

  const newPersonalizedRatePercent = newIr.effectiveWithholdingRatePercent;
  const newMonthlyWithholdingIfModulatedTotalEur = roundCurrency(
    ((newTotalAnnualIncome / 12) * newPersonalizedRatePercent) / 100
  );

  const newDetailed = calculateDetailedPersonalSalary({
    entryMode: 'MANUAL_PAYSLIP',
    taxYear,
    grossMonthlySalaryEur: roundCurrency(input.newMonthlyNetTaxableSalaryEur * 1.25),
    manualNetBeforeTaxMonthlyEur: roundCurrency(input.newMonthlyNetTaxableSalaryEur * 0.965),
    manualNetTaxableMonthlyEur: input.newMonthlyNetTaxableSalaryEur,
    status: 'cadre',
    maritalStatus: input.newMaritalStatus,
    dependantsCount: input.newDependantsCount,
    spouseMonthlyNetTaxableEur:
      input.newMaritalStatus === 'marie_pacse'
        ? input.newSpouseMonthlyNetTaxableSalaryEur
        : 0,
  });

  // What happens if the user does NOT update their PAS rate on impots.gouv.fr?
  // Their employer continues applying `currentPersonalizedRatePercent` to the new monthly income!
  const totalWithheldOver12MonthsIfOldRateKeptEur = roundCurrency(
    (newTotalAnnualIncome * currentPersonalizedRatePercent) / 100
  );

  // Positive = Reste à payer en septembre N+1 ; Negative = Trop-perçu remboursé par la DGFiP
  const annualTaxBalanceIfOldRateKeptEur = roundCurrency(
    newIr.finalEstimatedTaxEur - totalWithheldOver12MonthsIfOldRateKeptEur
  );

  const totalWithheldIfModulatedEur = roundCurrency(
    newMonthlyWithholdingIfModulatedTotalEur * 12
  );
  const annualTaxBalanceIfModulatedPromptlyEur = roundCurrency(
    newIr.finalEstimatedTaxEur - totalWithheldIfModulatedEur
  );

  // Neutral rate complement to DGFiP if neutral rate < personalized rate
  const neutralWithholdingMonthly = roundCurrency(
    (input.newMonthlyNetTaxableSalaryEur * newDetailed.neutralDefaultRatePercent) / 100
  );
  const personalizedSpouse1Monthly = roundCurrency(
    (input.newMonthlyNetTaxableSalaryEur * newPersonalizedRatePercent) / 100
  );
  const neutralRateMonthlyComplementToDgfipEur = Math.max(
    0,
    roundCurrency(personalizedSpouse1Monthly - neutralWithholdingMonthly)
  );

  return {
    taxYear,
    currentQuotientParts: curIr.familyQuotientParts,
    currentPersonalizedRatePercent,
    currentIndividualizedSpouse1RatePercent: curDetailed.individualizedEmployeeRatePercent,
    currentIndividualizedSpouse2RatePercent: curDetailed.individualizedSpouseRatePercent,
    currentNeutralRateSpouse1Percent: curDetailed.neutralDefaultRatePercent,
    currentMonthlyWithholdingTotalEur,
    currentAnnualTaxEur: curIr.finalEstimatedTaxEur,
    newQuotientParts: newIr.familyQuotientParts,
    newPersonalizedRatePercent,
    newIndividualizedSpouse1RatePercent: newDetailed.individualizedEmployeeRatePercent,
    newIndividualizedSpouse2RatePercent: newDetailed.individualizedSpouseRatePercent,
    newNeutralRateSpouse1Percent: newDetailed.neutralDefaultRatePercent,
    newMonthlyWithholdingIfModulatedTotalEur,
    newActualAnnualTaxDueEur: newIr.finalEstimatedTaxEur,
    rateDeltaPoints: roundRate(newPersonalizedRatePercent - currentPersonalizedRatePercent),
    monthlyWithholdingDeltaEur: roundCurrency(
      newMonthlyWithholdingIfModulatedTotalEur - currentMonthlyWithholdingTotalEur
    ),
    totalWithheldOver12MonthsIfOldRateKeptEur,
    annualTaxBalanceIfOldRateKeptEur,
    annualTaxBalanceIfModulatedPromptlyEur,
    neutralRateMonthlyComplementToDgfipEur,
  };
}

// ============================================================================
// BARÈME KILOMÉTRIQUE OFFICIEL & CALCULATEUR DE FRAIS RÉELS (CGI Art. 83-3°)
// ============================================================================

export type FiscalHorsepowerRating = 3 | 4 | 5 | 6 | 7;

export interface OfficialRealExpensesCalculatorInput {
  taxYear?: SupportedTaxYear;
  annualNetTaxableSalaryEur: number;
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
  oneWayCommuteKm: number; // Plafonné à 40 km aller simple par défaut sauf circonstances justifiées
  exceed40KmJustified?: boolean;
  workedDaysOnSitePerYear: number; // ex: 160 à 218 jours
  fiscalHorsepower: FiscalHorsepowerRating; // 3 CV à 7 CV et +
  isElectricVehicle: boolean; // Bonus légal +20 %
  mealsOnSiteWithoutCanteenDays: number;
  deductibleMealGapPerDayEur?: number; // Déduction forfaitaire par repas (5.45 €)
  teleworkDaysPerYear?: number; // Forfait 2.70 €/jour plafonné à 594 €/an
  otherJustifiedProfessionalExpensesEur?: number;
}

export interface OfficialRealExpensesCalculatorResult {
  effectiveOneWayKm: number;
  annualCommuteDistanceKm: number;
  mileageDeductionBaseEur: number;
  electricBonusEur: number;
  totalMileageDeductionEur: number;
  mealsDeductionEur: number;
  teleworkDeductionEur: number;
  otherProfessionalExpensesEur: number;
  totalComputedRealExpensesEur: number;
  standard10PercentDeductionEur: number;
  extraDeductionOver10PercentEur: number;
  isRealExpensesAdvantageous: boolean;
  taxWith10PercentEur: number;
  taxWithRealExpensesEur: number;
  annualTaxSavedEur: number;
  formulaAppliedTextFr: string;
  officialSourceUrl: string;
  statutoryReference: string;
}

const CAR_MILEAGE_SCHEDULE: Record<
  FiscalHorsepowerRating,
  {
    upTo5000Rate: number;
    midRate: number;
    midFixedEur: number;
    over20000Rate: number;
  }
> = {
  3: { upTo5000Rate: 0.529, midRate: 0.316, midFixedEur: 1065, over20000Rate: 0.37 },
  4: { upTo5000Rate: 0.606, midRate: 0.34, midFixedEur: 1330, over20000Rate: 0.407 },
  5: { upTo5000Rate: 0.636, midRate: 0.357, midFixedEur: 1395, over20000Rate: 0.427 },
  6: { upTo5000Rate: 0.665, midRate: 0.374, midFixedEur: 1457, over20000Rate: 0.447 },
  7: { upTo5000Rate: 0.697, midRate: 0.394, midFixedEur: 1515, over20000Rate: 0.47 },
};

export function calculateOfficialRealProfessionalExpenses(
  input: OfficialRealExpensesCalculatorInput
): OfficialRealExpensesCalculatorResult {
  const taxYear = input.taxYear ?? 2026;
  const rawOneWayKm = Math.max(0, Math.round(input.oneWayCommuteKm));
  const effectiveOneWayKm = input.exceed40KmJustified
    ? rawOneWayKm
    : Math.min(40, rawOneWayKm);
  const workedDays = Math.max(0, Math.min(260, Math.round(input.workedDaysOnSitePerYear)));

  const annualCommuteDistanceKm = effectiveOneWayKm * 2 * workedDays;
  const schedule = CAR_MILEAGE_SCHEDULE[input.fiscalHorsepower] || CAR_MILEAGE_SCHEDULE[5];

  let mileageRaw = 0;
  let formulaAppliedTextFr = '';

  if (annualCommuteDistanceKm <= 0) {
    mileageRaw = 0;
    formulaAppliedTextFr = '0 km parcouru';
  } else if (annualCommuteDistanceKm <= 5000) {
    mileageRaw = annualCommuteDistanceKm * schedule.upTo5000Rate;
    formulaAppliedTextFr = `${annualCommuteDistanceKm.toLocaleString('fr-FR')} km × ${schedule.upTo5000Rate.toLocaleString('fr-FR')} € (${input.fiscalHorsepower} CV)`;
  } else if (annualCommuteDistanceKm <= 20000) {
    mileageRaw =
      annualCommuteDistanceKm * schedule.midRate + schedule.midFixedEur;
    formulaAppliedTextFr = `(${annualCommuteDistanceKm.toLocaleString('fr-FR')} km × ${schedule.midRate.toLocaleString('fr-FR')} €) + ${schedule.midFixedEur.toLocaleString('fr-FR')} € (${input.fiscalHorsepower} CV)`;
  } else {
    mileageRaw = annualCommuteDistanceKm * schedule.over20000Rate;
    formulaAppliedTextFr = `${annualCommuteDistanceKm.toLocaleString('fr-FR')} km × ${schedule.over20000Rate.toLocaleString('fr-FR')} € (${input.fiscalHorsepower} CV)`;
  }

  const mileageDeductionBaseEur = Math.round(mileageRaw);
  const electricBonusEur = input.isElectricVehicle
    ? Math.round(mileageRaw * 0.2)
    : 0;
  const totalMileageDeductionEur = mileageDeductionBaseEur + electricBonusEur;

  const mealGap = input.deductibleMealGapPerDayEur ?? 5.45;
  const mealDays = Math.max(
    0,
    Math.min(workedDays, Math.round(input.mealsOnSiteWithoutCanteenDays))
  );
  const mealsDeductionEur = Math.round(mealDays * mealGap);

  const teleworkDays = Math.max(0, Math.min(230, Math.round(input.teleworkDaysPerYear ?? 0)));
  const teleworkDeductionEur = Math.min(594, Math.round(teleworkDays * 2.7));

  const otherProfessionalExpensesEur = Math.max(
    0,
    Math.round(input.otherJustifiedProfessionalExpensesEur ?? 0)
  );

  const totalComputedRealExpensesEur =
    totalMileageDeductionEur +
    mealsDeductionEur +
    teleworkDeductionEur +
    otherProfessionalExpensesEur;

  const tax10Pct = calculatePersonalIncomeTax({
    taxYear,
    annualDeclaredIncomeEur: input.annualNetTaxableSalaryEur,
    expenseDeductionMode: 'abattement_10',
    maritalStatus: input.maritalStatus,
    dependantsCount: input.dependantsCount,
  });

  const taxReal = calculatePersonalIncomeTax({
    taxYear,
    annualDeclaredIncomeEur: input.annualNetTaxableSalaryEur,
    expenseDeductionMode: 'frais_reels',
    realExpensesAmountEur: totalComputedRealExpensesEur,
    maritalStatus: input.maritalStatus,
    dependantsCount: input.dependantsCount,
  });

  const standard10PercentDeductionEur = tax10Pct.deductionAppliedEur;
  const extraDeductionOver10PercentEur = Math.max(
    0,
    totalComputedRealExpensesEur - standard10PercentDeductionEur
  );
  const isRealExpensesAdvantageous =
    totalComputedRealExpensesEur > standard10PercentDeductionEur;
  const annualTaxSavedEur = Math.max(
    0,
    tax10Pct.finalEstimatedTaxEur - taxReal.finalEstimatedTaxEur
  );

  return {
    effectiveOneWayKm,
    annualCommuteDistanceKm,
    mileageDeductionBaseEur,
    electricBonusEur,
    totalMileageDeductionEur,
    mealsDeductionEur,
    teleworkDeductionEur,
    otherProfessionalExpensesEur,
    totalComputedRealExpensesEur,
    standard10PercentDeductionEur,
    extraDeductionOver10PercentEur,
    isRealExpensesAdvantageous,
    taxWith10PercentEur: tax10Pct.finalEstimatedTaxEur,
    taxWithRealExpensesEur: taxReal.finalEstimatedTaxEur,
    annualTaxSavedEur,
    formulaAppliedTextFr: input.isElectricVehicle
      ? `${formulaAppliedTextFr} + 20 % véhicule électrique`
      : formulaAppliedTextFr,
    officialSourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F1989',
    statutoryReference: 'CGI Art. 83-3° · BOI-BAREME-000001 (Cases 1AK / 1BK)',
  };
}

export interface PerAndDonationArbitrageInput {
  taxYear?: SupportedTaxYear;
  annualNetTaxableIncomeEur: number;
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
  plannedPerContributionEur: number;
  availablePerCeilingEur?: number;
  plannedDonation66PctEur: number;
  plannedDonation75PctEur?: number;
}

export interface PerAndDonationArbitrageResult {
  deductiblePerAppliedEur: number;
  donationReductionAppliedEur: number;
  taxBeforeActionEur: number;
  taxAfterActionEur: number;
  totalTaxSavedEur: number;
  totalCashOutflowEur: number;
  realNetEffortAfterTaxEur: number;
  effectiveDiscountPercent: number;
}

export function calculatePerAndDonationTaxArbitrage(
  input: PerAndDonationArbitrageInput
): PerAndDonationArbitrageResult {
  const taxYear = input.taxYear ?? 2026;
  const defaultPerCeiling = Math.max(
    4399,
    Math.min(35194, Math.round(input.annualNetTaxableIncomeEur * 0.1))
  );
  const perCeiling = Math.max(0, input.availablePerCeilingEur ?? defaultPerCeiling);
  const deductiblePerAppliedEur = Math.min(
    perCeiling,
    Math.max(0, Math.round(input.plannedPerContributionEur))
  );

  const baselineTax = calculatePersonalIncomeTax({
    taxYear,
    annualDeclaredIncomeEur: input.annualNetTaxableIncomeEur,
    maritalStatus: input.maritalStatus,
    dependantsCount: input.dependantsCount,
    perDeductibleContributionEur: 0,
  });

  const taxAfterPer = calculatePersonalIncomeTax({
    taxYear,
    annualDeclaredIncomeEur: input.annualNetTaxableIncomeEur,
    maritalStatus: input.maritalStatus,
    dependantsCount: input.dependantsCount,
    perDeductibleContributionEur: deductiblePerAppliedEur,
  });

  const dons75 = Math.min(1000, Math.max(0, Math.round(input.plannedDonation75PctEur ?? 0)));
  const dons66Raw =
    Math.max(0, Math.round(input.plannedDonation66PctEur)) +
    Math.max(0, Math.round((input.plannedDonation75PctEur ?? 0) - 1000));
  const max20PctIncome = Math.round(taxAfterPer.netTaxableIncomeEur * 0.2);
  const dons66Eligible = Math.min(max20PctIncome, dons66Raw);

  const rawDonationReduction =
    Math.round(dons75 * 0.75) + Math.round(dons66Eligible * 0.66);
  const donationReductionAppliedEur = Math.min(
    taxAfterPer.finalEstimatedTaxEur,
    rawDonationReduction
  );

  const taxBeforeActionEur = baselineTax.finalEstimatedTaxEur;
  const taxAfterActionEur = Math.max(
    0,
    taxAfterPer.finalEstimatedTaxEur - donationReductionAppliedEur
  );
  const totalTaxSavedEur = Math.max(0, taxBeforeActionEur - taxAfterActionEur);

  const totalCashOutflowEur =
    deductiblePerAppliedEur +
    Math.max(0, Math.round(input.plannedDonation66PctEur)) +
    Math.max(0, Math.round(input.plannedDonation75PctEur ?? 0));
  const realNetEffortAfterTaxEur = Math.max(0, totalCashOutflowEur - totalTaxSavedEur);
  const effectiveDiscountPercent =
    totalCashOutflowEur > 0
      ? Math.round((totalTaxSavedEur / totalCashOutflowEur) * 100)
      : 0;

  return {
    deductiblePerAppliedEur,
    donationReductionAppliedEur,
    taxBeforeActionEur,
    taxAfterActionEur,
    totalTaxSavedEur,
    totalCashOutflowEur,
    realNetEffortAfterTaxEur,
    effectiveDiscountPercent,
  };
}




