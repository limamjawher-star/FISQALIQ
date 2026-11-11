/**
 * FISCALIQ — Deterministic Financial, Payroll & Tax Calculation Engine
 *
 * All calculations in this module are pure, deterministic TypeScript functions.
 * Default tax year: 2026 (with 2026 RGDU — Réduction générale dégressive unique).
 * Historical tax year supported: 2025 (with 2025 RGCP).
 */

import {
  DEFAULT_TAX_YEAR,
  getTaxParametersForYear,
  SupportedTaxYear,
  TAX_PARAMETERS_FR_2026,
  TaxParameterSet,
} from './tax-parameters';

export type EligibilityKnowledgeMode = 'verified_eligible' | 'verified_ineligible' | 'unknown_verify';

export interface CorporateTaxInput {
  /** Annual turnover excluding VAT (Chiffre d'affaires HT) in EUR */
  annualTurnoverHt: number;
  /** Taxable profit before corporate tax (Résultat fiscal avant IS) in EUR */
  taxableProfit: number;
  /** Whether share capital is 100% paid up (Capital entièrement libéré) */
  isCapitalFullyPaidUp: boolean;
  /** Share of capital held by individuals (Détention par des personnes physiques, 0 to 1) */
  physicalPersonOwnershipShare: number;
  /** Length of fiscal year in months (default 12) */
  fiscalYearMonths?: number;
  /** Optional explicit eligibility knowledge status (when user has not verified all 3 legal conditions) */
  eligibilityMode?: 'auto' | 'unknown';
  /** Applicable tax year (default 2026) */
  taxYear?: SupportedTaxYear;
}

export interface CorporateTaxScenarioBreakdown {
  label: string;
  reducedRateSliceBase: number;
  reducedRateTaxAmount: number;
  standardRateSliceBase: number;
  standardRateTaxAmount: number;
  totalCorporateTax: number;
  netProfitAfterTax: number;
  effectiveTaxRate: number;
}

export interface CorporateTaxResult {
  applicableYear: SupportedTaxYear;
  isEligibleForPmeReducedRate: boolean;
  verificationRequired: boolean;
  eligibilityReasons: string[];
  reducedRateSliceBase: number;
  reducedRateTaxAmount: number;
  standardRateSliceBase: number;
  standardRateTaxAmount: number;
  totalCorporateTax: number;
  netProfitAfterTax: number;
  effectiveTaxRate: number;
  potentialSavingsFromPmeRate: number;
  /** Both scenarios computed deterministically for comparison when eligibility is unknown or audited */
  scenarios: {
    pmeReducedScenario: CorporateTaxScenarioBreakdown;
    standardRateOnlyScenario: CorporateTaxScenarioBreakdown;
  };
  parameterVersion: string;
  resultStatusLabel: 'ESTIMATION DÉTERMINISTE — DÉMONSTRATION';
  disclaimer: string;
}

/**
 * Deterministic calculation of French Corporate Income Tax (Impôt sur les Sociétés - IS)
 * according to CGI Art. 219-I (25% standard rate) and Art. 219-I-b (15% PME reduced rate on first 42,500 €).
 */
export function calculateCorporateTax(
  input: CorporateTaxInput,
  params: TaxParameterSet = input.taxYear
    ? getTaxParametersForYear(input.taxYear)
    : TAX_PARAMETERS_FR_2026
): CorporateTaxResult {
  const months = input.fiscalYearMonths && input.fiscalYearMonths > 0 ? input.fiscalYearMonths : 12;
  const prorationFactor = months / 12;

  const annualizedTurnover = input.annualTurnoverHt / prorationFactor;
  const turnoverCeiling = params.corporateTax.pmeTurnoverCeiling.value;
  const minOwnership = params.corporateTax.pmeMinPhysicalPersonOwnership.value;
  const reducedRate = params.corporateTax.pmeReducedRate.value;
  const standardRate = params.corporateTax.standardRate.value;
  const proratedProfitCap = roundCurrency(params.corporateTax.pmeProfitCap.value * prorationFactor);

  const eligibilityReasons: string[] = [];
  let isEligible = true;
  const verificationRequired = input.eligibilityMode === 'unknown';

  if (annualizedTurnover >= turnoverCeiling) {
    isEligible = false;
    eligibilityReasons.push(
      `Chiffre d’affaires HT annualisé (${formatFrenchEuros(annualizedTurnover)}) supérieur ou égal au plafond légal de 10 000 000 €.`
    );
  } else {
    eligibilityReasons.push('Chiffre d’affaires HT inférieur au plafond légal de 10 000 000 €.');
  }

  if (!input.isCapitalFullyPaidUp) {
    isEligible = false;
    eligibilityReasons.push(
      'Le capital social n’est pas intégralement libéré à la clôture (condition cumulative de l’article 219-I-b du CGI).'
    );
  } else {
    eligibilityReasons.push('Capital social intégralement libéré (100 %).');
  }

  if (input.physicalPersonOwnershipShare < minOwnership) {
    isEligible = false;
    eligibilityReasons.push(
      `Détention par des personnes physiques (${Math.round(input.physicalPersonOwnershipShare * 100)} %) inférieure au seuil légal de 75 %.`
    );
  } else {
    eligibilityReasons.push('Capital détenu à au moins 75 % par des personnes physiques.');
  }

  if (verificationRequired) {
    eligibilityReasons.push(
      'Éligibilité à vérifier : comparaison affichée entre le scénario PME (15 % + 25 %) et le scénario au taux normal seul (25 %).'
    );
  }

  const positiveProfit = Math.max(0, input.taxableProfit);

  // Scenario A: Eligible for PME reduced rate (15% up to 42,500 €, 25% above)
  const pmeReducedBase = Math.min(positiveProfit, proratedProfitCap);
  const pmeStandardBase = Math.max(0, positiveProfit - pmeReducedBase);
  const pmeReducedTax = roundCurrency(pmeReducedBase * reducedRate);
  const pmeStandardTax = roundCurrency(pmeStandardBase * standardRate);
  const pmeTotalTax = roundCurrency(pmeReducedTax + pmeStandardTax);

  const pmeReducedScenario: CorporateTaxScenarioBreakdown = {
    label: 'Scénario PME éligible (15 % jusqu’à 42 500 € puis 25 %)',
    reducedRateSliceBase: pmeReducedBase,
    reducedRateTaxAmount: pmeReducedTax,
    standardRateSliceBase: pmeStandardBase,
    standardRateTaxAmount: pmeStandardTax,
    totalCorporateTax: pmeTotalTax,
    netProfitAfterTax: roundCurrency(input.taxableProfit - pmeTotalTax),
    effectiveTaxRate: positiveProfit > 0 ? roundRate(pmeTotalTax / positiveProfit) : 0,
  };

  // Scenario B: Standard rate only (25% on all taxable profit)
  const stdOnlyTax = roundCurrency(positiveProfit * standardRate);
  const standardRateOnlyScenario: CorporateTaxScenarioBreakdown = {
    label: 'Scénario taux normal seul (25 % dès le 1er euro)',
    reducedRateSliceBase: 0,
    reducedRateTaxAmount: 0,
    standardRateSliceBase: positiveProfit,
    standardRateTaxAmount: stdOnlyTax,
    totalCorporateTax: stdOnlyTax,
    netProfitAfterTax: roundCurrency(input.taxableProfit - stdOnlyTax),
    effectiveTaxRate: positiveProfit > 0 ? roundRate(stdOnlyTax / positiveProfit) : 0,
  };

  const activeScenario = isEligible ? pmeReducedScenario : standardRateOnlyScenario;
  const potentialSavingsFromPmeRate = roundCurrency(
    standardRateOnlyScenario.totalCorporateTax - pmeReducedScenario.totalCorporateTax
  );

  return {
    applicableYear: params.applicableYear,
    isEligibleForPmeReducedRate: isEligible,
    verificationRequired,
    eligibilityReasons,
    reducedRateSliceBase: activeScenario.reducedRateSliceBase,
    reducedRateTaxAmount: activeScenario.reducedRateTaxAmount,
    standardRateSliceBase: activeScenario.standardRateSliceBase,
    standardRateTaxAmount: activeScenario.standardRateTaxAmount,
    totalCorporateTax: activeScenario.totalCorporateTax,
    netProfitAfterTax: activeScenario.netProfitAfterTax,
    effectiveTaxRate: activeScenario.effectiveTaxRate,
    potentialSavingsFromPmeRate,
    scenarios: {
      pmeReducedScenario,
      standardRateOnlyScenario,
    },
    parameterVersion: params.versionId,
    resultStatusLabel: 'ESTIMATION DÉTERMINISTE — DÉMONSTRATION',
    disclaimer:
      'ESTIMATION DE DÉMONSTRATION basée sur l’article 219 du CGI (hors contribution sociale sur l’IS de 3,3 % applicable uniquement si l’IS excède 763 000 €). Ne constitue pas un conseil fiscal personnalisé.',
  };
}

export type EmployeeStatus = 'non_cadre' | 'cadre';
export type CompanySizeBracket = 'under_11' | '11_to_49' | '50_or_more';

export interface PayrollSimulationInput {
  /** Monthly gross salary (Salaire brut mensuel) in EUR */
  grossMonthlySalary: number;
  /** Employee category */
  status: EmployeeStatus;
  /** Employer headcount bracket */
  companySize: CompanySizeBracket;
  /** Number of employees with identical profile for batch cost projection */
  headcount?: number;
  /** Working time ratio relative to 35h full time (0.1 to 1, default 1) */
  workingTimeRatio?: number;
  /** Applicable tax year (default 2026) */
  taxYear?: SupportedTaxYear;
}

export interface StatutoryContributionLine {
  code: string;
  label: string;
  baseAmountMonthly: number;
  rate: number;
  amountMonthly: number;
  sourceRef: string;
}

export interface PayrollSimulationResult {
  applicableYear: SupportedTaxYear;
  reductionMechanismCode: 'RGDU' | 'RGCP';
  reductionMechanismName: string;
  reductionExitSmicMultiple: number;
  reductionExitMonthlyCeilingEur: number;
  reductionCoefficient: number;
  grossMonthlySalary: number;
  grossAnnualSalary: number;
  smicReferenceMonthly: number;
  smicMultiple: number;
  pmssMonthly: number;
  employerContributionLines: StatutoryContributionLine[];
  employeeContributionLines: StatutoryContributionLine[];
  employerChargesBeforeReductionMonthly: number;
  /** Official 2026 RGDU (or 2025 RGCP) reduction amount */
  estimatedRgduReductionMonthly: number;
  /** Alias preserved for backward compatibility with existing components */
  estimatedRgcpReductionMonthly: number;
  netEmployerChargesMonthly: number;
  totalEmployerCostMonthly: number;
  totalEmployerCostAnnual: number;
  estimatedEmployeeContributionsMonthly: number;
  estimatedNetBeforeTaxMonthly: number;
  estimatedNetBeforeTaxAnnual: number;
  employerGrossChargeRate: number;
  employerChargeRateEffective: number;
  employeeChargeRateEffective: number;
  netToEmployerCostRatio: number;
  batchHeadcount: number;
  batchTotalAnnualEmployerCost: number;
  parameterVersion: string;
  resultStatusLabel: 'ESTIMATION DÉTERMINISTE — DÉMONSTRATION';
  excludedCompanySpecificItems: string[];
  disclaimer: string;
}

/**
 * Deterministic simulator for French Employer Costs (Coût total d'emploi), Statutory Contributions,
 * and the 2026 RGDU (Réduction générale dégressive unique) or historical 2025 RGCP.
 *
 * Strictly separates:
 * 1. Salaire brut mensuel (Gross salary)
 * 2. Cotisations salariales légales -> Salaire net avant impôt = Salaire brut - Cotisations salariales
 * 3. Cotisations patronales légales brutes -> Réduction RGDU/RGCP -> Cotisations patronales nettes
 * 4. Coût total d'emploi (Super-brut) = Salaire brut + Cotisations patronales nettes
 */
export function calculatePayrollEmployerCost(
  input: PayrollSimulationInput,
  params: TaxParameterSet = input.taxYear
    ? getTaxParametersForYear(input.taxYear)
    : TAX_PARAMETERS_FR_2026
): PayrollSimulationResult {
  const grossMonthly = Math.max(0, input.grossMonthlySalary);
  const workingRatio =
    input.workingTimeRatio && input.workingTimeRatio > 0
      ? Math.min(1, input.workingTimeRatio)
      : 1;
  const headcount =
    input.headcount && input.headcount >= 1 ? Math.floor(input.headcount) : 1;

  const smicReferenceMonthly = roundCurrency(
    params.payroll.smicMensuelBrut35h.value * workingRatio
  );
  const pmssMonthly = roundCurrency(params.payroll.pmssMensuel.value * workingRatio);
  const smicMultiple =
    smicReferenceMonthly > 0 ? roundRate(grossMonthly / smicReferenceMonthly) : 0;

  const tranche1Base = Math.min(grossMonthly, pmssMonthly);
  const tranche2Base = Math.max(0, Math.min(grossMonthly, pmssMonthly * 8) - pmssMonthly);
  const fourPassBase = Math.min(grossMonthly, pmssMonthly * 4);
  const eightPassBase = Math.min(grossMonthly, pmssMonthly * 8);
  const isAboveOnePass = grossMonthly > pmssMonthly;

  // --- 1. STATUTORY EMPLOYER CONTRIBUTIONS (LINE BY LINE) ---
  const employerContributionLines: StatutoryContributionLine[] = [];

  const addEmployerLine = (
    code: string,
    label: string,
    baseAmountMonthly: number,
    rate: number,
    sourceRef: string
  ) => {
    const amountMonthly = roundCurrency(baseAmountMonthly * rate);
    employerContributionLines.push({
      code,
      label,
      baseAmountMonthly: roundCurrency(baseAmountMonthly),
      rate,
      amountMonthly,
      sourceRef,
    });
  };

  addEmployerLine(
    'MALADIE',
    'Assurance maladie, maternité, invalidité, décès',
    grossMonthly,
    params.payroll.employerMaladieRate.value,
    'URSSAF (13,00 % totalité)'
  );
  addEmployerLine(
    'VIEILLESSE_PLAF',
    'Assurance vieillesse plafonnée (≤ 1 PMSS)',
    tranche1Base,
    params.payroll.employerVieillessePlafonneeRate.value,
    'URSSAF (8,55 % T1)'
  );
  addEmployerLine(
    'VIEILLESSE_DEPLAF',
    'Assurance vieillesse déplafonnée (totalité)',
    grossMonthly,
    params.payroll.employerVieillesseDeplafonneeRate.value,
    `URSSAF (${(params.payroll.employerVieillesseDeplafonneeRate.value * 100).toFixed(2)} %)`
  );
  addEmployerLine(
    'ALLOC_FAM',
    'Allocations familiales',
    grossMonthly,
    params.payroll.employerAllocationsFamilialesRate.value,
    'URSSAF (5,25 % totalité)'
  );
  addEmployerLine(
    'CSA',
    'Contribution Solidarité Autonomie (CSA)',
    grossMonthly,
    params.payroll.employerCsaRate.value,
    'URSSAF (0,30 %)'
  );

  if (input.companySize === '50_or_more') {
    addEmployerLine(
      'FNAL',
      'FNAL déplafonné (employeur ≥ 50 salariés)',
      grossMonthly,
      params.payroll.employerFnal50OrMoreRate.value,
      'URSSAF (0,50 % totalité)'
    );
  } else {
    addEmployerLine(
      'FNAL',
      'FNAL plafonné (employeur < 50 salariés, ≤ 1 PMSS)',
      tranche1Base,
      params.payroll.employerFnalUnder50Rate.value,
      'URSSAF (0,10 % T1)'
    );
  }

  addEmployerLine(
    'CHOMAGE_AGS',
    'Assurance chômage (4,00 %) & AGS (0,25 %)',
    fourPassBase,
    params.payroll.employerChomageRate.value + params.payroll.employerAgsRate.value,
    'URSSAF / Unédic (4,25 % ≤ 4 PMSS)'
  );

  addEmployerLine(
    'AGIRC_ARRCO_T1',
    'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 1',
    tranche1Base,
    params.payroll.employerAgircArrcoT1Rate.value,
    'AGIRC-ARRCO (6,01 % T1)'
  );

  if (tranche2Base > 0) {
    addEmployerLine(
      'AGIRC_ARRCO_T2',
      'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 2',
      tranche2Base,
      params.payroll.employerAgircArrcoT2Rate.value,
      'AGIRC-ARRCO (14,57 % T2)'
    );
  }

  if (isAboveOnePass) {
    addEmployerLine(
      'CET',
      'Contribution d’Équilibre Technique (CET, si brut > 1 PMSS)',
      eightPassBase,
      params.payroll.employerCetRate.value,
      'AGIRC-ARRCO (0,21 %)'
    );
  }

  if (input.status === 'cadre') {
    addEmployerLine(
      'APEC',
      'Cotisation APEC (Cadres, ≤ 4 PMSS)',
      fourPassBase,
      params.payroll.employerApecCadreRate.value,
      'APEC (0,036 %)'
    );
  }

  const employerChargesBeforeReductionMonthly = roundCurrency(
    employerContributionLines.reduce((acc, item) => acc + item.amountMonthly, 0)
  );

  // --- 2. GENERAL REDUCTION CALCULATION (2026 RGDU vs 2025 RGCP) ---
  const exitMultiplier = params.payroll.reductionSmicMultiplierCeiling.value;
  const reductionExitMonthlyCeilingEur = roundCurrency(
    smicReferenceMonthly * exitMultiplier
  );

  let reductionCoefficient = 0;

  if (
    grossMonthly > 0 &&
    grossMonthly >= smicReferenceMonthly * 0.95 &&
    grossMonthly < reductionExitMonthlyCeilingEur
  ) {
    if (params.reductionMechanismCode === 'RGDU') {
      // Official 2026 RGDU formula (Décret n° 2025-887 & Décret n° 2025-1446):
      // C = T_min + (T_delta * [ (1/2) * ( (3 * SMIC / R) - 1 ) ]^P )
      const tMin = params.payroll.rgduTMin?.value ?? 0.02;
      const tDelta =
        input.companySize === '50_or_more'
          ? (params.payroll.rgduTDelta50OrMore?.value ?? 0.3821)
          : (params.payroll.rgduTDeltaUnder50?.value ?? 0.3781);
      const powerP = params.payroll.rgduPowerExponent?.value ?? 1.75;
      const maxCoeff = roundRate(tMin + tDelta);

      const ratioTerm = 0.5 * ((3 * smicReferenceMonthly) / grossMonthly - 1);
      if (ratioTerm <= 0) {
        reductionCoefficient = 0;
      } else {
        const rawC = tMin + tDelta * Math.pow(ratioTerm, powerP);
        reductionCoefficient = Math.max(0, Math.min(maxCoeff, roundRate(rawC)));
      }
    } else {
      // Historical 2025 RGCP formula (linear up to 1.6 SMIC):
      // C = (T / 0.6) * (1.6 * SMIC / R - 1)
      const maxT =
        input.companySize === '50_or_more'
          ? params.payroll.rgcpMaxCoeff50OrMore.value
          : params.payroll.rgcpMaxCoeffUnder50.value;
      const rawC = (maxT / 0.6) * ((1.6 * smicReferenceMonthly) / grossMonthly - 1);
      reductionCoefficient = Math.max(0, Math.min(maxT, roundRate(rawC)));
    }
  }

  const estimatedRgduReductionMonthly = roundCurrency(
    Math.min(employerChargesBeforeReductionMonthly, grossMonthly * reductionCoefficient)
  );

  const netEmployerChargesMonthly = roundCurrency(
    Math.max(0, employerChargesBeforeReductionMonthly - estimatedRgduReductionMonthly)
  );

  const totalEmployerCostMonthly = roundCurrency(
    grossMonthly + netEmployerChargesMonthly
  );
  const totalEmployerCostAnnual = roundCurrency(totalEmployerCostMonthly * 12);

  // --- 3. STATUTORY EMPLOYEE CONTRIBUTIONS (LINE BY LINE) ---
  const employeeContributionLines: StatutoryContributionLine[] = [];

  const addEmployeeLine = (
    code: string,
    label: string,
    baseAmountMonthly: number,
    rate: number,
    sourceRef: string
  ) => {
    const amountMonthly = roundCurrency(baseAmountMonthly * rate);
    employeeContributionLines.push({
      code,
      label,
      baseAmountMonthly: roundCurrency(baseAmountMonthly),
      rate,
      amountMonthly,
      sourceRef,
    });
  };

  addEmployeeLine(
    'SAL_VIEILLESSE_PLAF',
    'Assurance vieillesse plafonnée (≤ 1 PMSS)',
    tranche1Base,
    params.payroll.employeeVieillessePlafonneeRate.value,
    'URSSAF (6,90 % T1)'
  );
  addEmployeeLine(
    'SAL_VIEILLESSE_DEPLAF',
    'Assurance vieillesse déplafonnée (totalité)',
    grossMonthly,
    params.payroll.employeeVieillesseDeplafonneeRate.value,
    'URSSAF (0,40 % totalité)'
  );
  addEmployeeLine(
    'SAL_AGIRC_ARRCO_T1',
    'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 1',
    tranche1Base,
    params.payroll.employeeAgircArrcoT1Rate.value,
    'AGIRC-ARRCO (4,01 % T1)'
  );

  if (tranche2Base > 0) {
    addEmployeeLine(
      'SAL_AGIRC_ARRCO_T2',
      'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 2',
      tranche2Base,
      params.payroll.employeeAgircArrcoT2Rate.value,
      'AGIRC-ARRCO (9,72 % T2)'
    );
  }

  if (isAboveOnePass) {
    addEmployeeLine(
      'SAL_CET',
      'Contribution d’Équilibre Technique (CET, si brut > 1 PMSS)',
      eightPassBase,
      params.payroll.employeeCetRate.value,
      'AGIRC-ARRCO (0,14 %)'
    );
  }

  if (input.status === 'cadre') {
    addEmployeeLine(
      'SAL_APEC',
      'Cotisation APEC (Cadres, ≤ 4 PMSS)',
      fourPassBase,
      params.payroll.employeeApecCadreRate.value,
      'APEC (0,024 %)'
    );
  }

  // CSG/CRDS: 9.70% on 98.25% of gross up to 4 PASS, and 100% above 4 PASS
  const csgBaseAbated =
    Math.min(grossMonthly, pmssMonthly * 4) *
    params.payroll.employeeCsgAssietteRatio.value;
  const csgBaseUnabated = Math.max(0, grossMonthly - pmssMonthly * 4);
  const csgTotalBase = roundCurrency(csgBaseAbated + csgBaseUnabated);

  addEmployeeLine(
    'SAL_CSG_CRDS',
    'CSG (9,20 %) & CRDS (0,50 %) sur 98,25 % du brut',
    csgTotalBase,
    params.payroll.employeeCsgCrdsRate.value,
    'URSSAF (9,70 % sur assiette abattue)'
  );

  const estimatedEmployeeContributionsMonthly = roundCurrency(
    employeeContributionLines.reduce((acc, item) => acc + item.amountMonthly, 0)
  );

  const estimatedNetBeforeTaxMonthly = roundCurrency(
    Math.max(0, grossMonthly - estimatedEmployeeContributionsMonthly)
  );
  const estimatedNetBeforeTaxAnnual = roundCurrency(
    estimatedNetBeforeTaxMonthly * 12
  );

  const employerGrossChargeRate =
    grossMonthly > 0
      ? roundRate(employerChargesBeforeReductionMonthly / grossMonthly)
      : 0;
  const employerChargeRateEffective =
    grossMonthly > 0 ? roundRate(netEmployerChargesMonthly / grossMonthly) : 0;
  const employeeChargeRateEffective =
    grossMonthly > 0
      ? roundRate(estimatedEmployeeContributionsMonthly / grossMonthly)
      : 0;
  const netToEmployerCostRatio =
    totalEmployerCostMonthly > 0
      ? roundRate(estimatedNetBeforeTaxMonthly / totalEmployerCostMonthly)
      : 0;

  return {
    applicableYear: params.applicableYear,
    reductionMechanismCode: params.reductionMechanismCode,
    reductionMechanismName: params.reductionMechanismName,
    reductionExitSmicMultiple: exitMultiplier,
    reductionExitMonthlyCeilingEur,
    reductionCoefficient,
    grossMonthlySalary: grossMonthly,
    grossAnnualSalary: roundCurrency(grossMonthly * 12),
    smicReferenceMonthly,
    smicMultiple,
    pmssMonthly,
    employerContributionLines,
    employeeContributionLines,
    employerChargesBeforeReductionMonthly,
    estimatedRgduReductionMonthly,
    estimatedRgcpReductionMonthly: estimatedRgduReductionMonthly,
    netEmployerChargesMonthly,
    totalEmployerCostMonthly,
    totalEmployerCostAnnual,
    estimatedEmployeeContributionsMonthly,
    estimatedNetBeforeTaxMonthly,
    estimatedNetBeforeTaxAnnual,
    employerGrossChargeRate,
    employerChargeRateEffective,
    employeeChargeRateEffective,
    netToEmployerCostRatio,
    batchHeadcount: headcount,
    batchTotalAnnualEmployerCost: roundCurrency(
      totalEmployerCostAnnual * headcount
    ),
    parameterVersion: params.versionId,
    resultStatusLabel: 'ESTIMATION DÉTERMINISTE — DÉMONSTRATION',
    excludedCompanySpecificItems: [
      'Cotisation AT/MP propre à l’entreprise (taux notifié annuellement par la CARSAT)',
      'Complémentaire santé (mutuelle obligatoire) et prévoyance conventionnelle (IDCC)',
      'Versement mobilité communal (selon commune et effectif ≥ 11 salariés)',
      'Prélèvement à la source (PAS) propre au foyer fiscal du salarié',
    ],
    disclaimer:
      'ESTIMATION DE DÉMONSTRATION calculée sur le socle des cotisations légales obligatoires (URSSAF / AGIRC-ARRCO), hors taux AT/MP propre à l’entreprise, mutuelle, prévoyance conventionnelle IDCC et versement mobilité.',
  };
}

export interface ProfitabilityInput {
  /** Annual revenue excluding VAT (Chiffre d'affaires HT) */
  annualRevenueHt: number;
  /** Variable costs / direct purchases (Achats consommés & charges variables) */
  variableCostsHt: number;
  /** External fixed operating expenses (Charges externes fixes) */
  fixedExternalExpensesHt: number;
  /** Operating taxes other than IS (Impôts et taxes d'exploitation) */
  operatingTaxesHt: number;
  /** Total employer payroll cost (Masse salariale chargée totale) */
  totalPayrollCost: number;
  /** Annual depreciation & amortization (Dotations aux amortissements) */
  depreciationAndAmortization: number;
  /** Eligible for PME reduced IS rate */
  isPmeReducedRateEligible: boolean;
  /** Applicable tax year (default 2026) */
  taxYear?: SupportedTaxYear;
}

export interface ProfitabilityResult {
  annualRevenueHt: number;
  grossMargin: number;
  grossMarginRate: number;
  addedValue: number;
  ebe: number;
  ebeMarginRate: number;
  operatingResult: number;
  corporateTaxAmount: number;
  netResult: number;
  netMarginRate: number;
  selfFinancingCapacity: number;
  breakEvenRevenueHt: number;
  breakEvenDays: number;
  safetyMarginPercent: number;
}

export function calculateProfitabilityMetrics(
  input: ProfitabilityInput,
  params: TaxParameterSet = input.taxYear
    ? getTaxParametersForYear(input.taxYear)
    : getTaxParametersForYear(DEFAULT_TAX_YEAR)
): ProfitabilityResult {
  const revenue = Math.max(0, input.annualRevenueHt);
  const variableCosts = Math.max(0, input.variableCostsHt);
  const fixedExternal = Math.max(0, input.fixedExternalExpensesHt);
  const opTaxes = Math.max(0, input.operatingTaxesHt);
  const payroll = Math.max(0, input.totalPayrollCost);
  const depreciation = Math.max(0, input.depreciationAndAmortization);

  const grossMargin = roundCurrency(revenue - variableCosts);
  const grossMarginRate = revenue > 0 ? roundRate(grossMargin / revenue) : 0;

  const addedValue = roundCurrency(grossMargin - fixedExternal);
  const ebe = roundCurrency(addedValue - opTaxes - payroll);
  const ebeMarginRate = revenue > 0 ? roundRate(ebe / revenue) : 0;

  const operatingResult = roundCurrency(ebe - depreciation);

  const taxResult = calculateCorporateTax(
    {
      annualTurnoverHt: revenue,
      taxableProfit: Math.max(0, operatingResult),
      isCapitalFullyPaidUp: input.isPmeReducedRateEligible,
      physicalPersonOwnershipShare: input.isPmeReducedRateEligible ? 1 : 0,
    },
    params
  );

  const corporateTaxAmount = taxResult.totalCorporateTax;
  const netResult = roundCurrency(operatingResult - corporateTaxAmount);
  const netMarginRate = revenue > 0 ? roundRate(netResult / revenue) : 0;
  const selfFinancingCapacity = roundCurrency(netResult + depreciation);

  const totalFixedCosts = roundCurrency(
    fixedExternal + opTaxes + payroll + depreciation
  );
  const breakEvenRevenueHt =
    grossMarginRate > 0
      ? roundCurrency(totalFixedCosts / grossMarginRate)
      : totalFixedCosts;

  const breakEvenDays =
    revenue > 0
      ? Math.min(365, Math.max(0, Math.round((breakEvenRevenueHt / revenue) * 365)))
      : 365;

  const safetyMarginPercent =
    revenue > 0 ? roundRate((revenue - breakEvenRevenueHt) / revenue) : 0;

  return {
    annualRevenueHt: revenue,
    grossMargin,
    grossMarginRate,
    addedValue,
    ebe,
    ebeMarginRate,
    operatingResult,
    corporateTaxAmount,
    netResult,
    netMarginRate,
    selfFinancingCapacity,
    breakEvenRevenueHt,
    breakEvenDays,
    safetyMarginPercent,
  };
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundRate(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/**
 * Formats a number in French Euros with non-breaking spaces and optional fraction digits.
 */
export function formatFrenchEuros(
  amount: number,
  options: { decimals?: number } = {}
): string {
  const decimals = options.decimals ?? 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export type DashboardPeriodFilter = 'ALL_12M' | 'S1' | 'S2' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface RawMonthlySeriesPoint {
  month: string;
  revenueHt: number;
  operatingExpensesHt: number;
  payrollCost: number;
  ebe: number;
  netCashFlow: number;
}

export interface EnrichedDashboardSeriesPoint {
  month: string;
  revenueHt: number;
  nonPayrollExpensesHt: number;
  payrollCost: number;
  totalExpensesHt: number;
  ebe: number;
  ebeMarginPercent: number;
  netCashFlow: number;
  cumulativeCashPosition: number;
}

export interface DashboardPeriodAggregation {
  period: DashboardPeriodFilter;
  monthsCount: number;
  points: EnrichedDashboardSeriesPoint[];
  periodRevenueHt: number;
  periodNonPayrollExpensesHt: number;
  periodPayrollCost: number;
  periodTotalExpensesHt: number;
  periodEbe: number;
  periodEbeMarginRate: number;
  periodNetCashFlow: number;
  endingCashPosition: number;
}

const PERIOD_SLICE_RANGES: Record<DashboardPeriodFilter, [number, number]> = {
  ALL_12M: [0, 12],
  S1: [0, 6],
  S2: [6, 12],
  Q1: [0, 3],
  Q2: [3, 6],
  Q3: [6, 9],
  Q4: [9, 12],
};

/**
 * Deterministic aggregation of monthly revenue, expenses, EBE margin, and cash-flow series
 * filtered by period (Full Year, Half-Year S1/S2, or Quarter Q1-Q4).
 */
export function aggregateDashboardFinancialSeries(
  baseSeries: RawMonthlySeriesPoint[],
  options: {
    scaleFactor?: number;
    openingCashPositionEur?: number;
    period?: DashboardPeriodFilter;
  } = {}
): DashboardPeriodAggregation {
  const scale = options.scaleFactor && options.scaleFactor > 0 ? options.scaleFactor : 1;
  const openingCash = options.openingCashPositionEur ?? 0;
  const period: DashboardPeriodFilter = options.period ?? 'ALL_12M';

  // Compute full 12-month scaled trajectory so cumulative cash position is consistent across quarters
  let runningCash = roundCurrency(openingCash);
  const fullYearEnriched: EnrichedDashboardSeriesPoint[] = baseSeries.map((pt) => {
    const revenueHt = Math.round(pt.revenueHt * scale);
    const nonPayrollExpensesHt = Math.round(pt.operatingExpensesHt * scale);
    const payrollCost = Math.round(pt.payrollCost * scale);
    const totalExpensesHt = nonPayrollExpensesHt + payrollCost;
    const ebe = revenueHt - totalExpensesHt;
    const ebeMarginPercent =
      revenueHt > 0 ? Math.round((ebe / revenueHt) * 1000) / 10 : 0;
    const netCashFlow = Math.round(pt.netCashFlow * scale);
    runningCash = roundCurrency(runningCash + netCashFlow);

    return {
      month: pt.month,
      revenueHt,
      nonPayrollExpensesHt,
      payrollCost,
      totalExpensesHt,
      ebe,
      ebeMarginPercent,
      netCashFlow,
      cumulativeCashPosition: runningCash,
    };
  });

  const [startIdx, endIdx] = PERIOD_SLICE_RANGES[period] || [0, 12];
  const points = fullYearEnriched.slice(startIdx, endIdx);

  const periodRevenueHt = points.reduce((sum, p) => sum + p.revenueHt, 0);
  const periodNonPayrollExpensesHt = points.reduce(
    (sum, p) => sum + p.nonPayrollExpensesHt,
    0
  );
  const periodPayrollCost = points.reduce((sum, p) => sum + p.payrollCost, 0);
  const periodTotalExpensesHt = points.reduce((sum, p) => sum + p.totalExpensesHt, 0);
  const periodEbe = points.reduce((sum, p) => sum + p.ebe, 0);
  const periodEbeMarginRate =
    periodRevenueHt > 0 ? roundRate(periodEbe / periodRevenueHt) : 0;
  const periodNetCashFlow = points.reduce((sum, p) => sum + p.netCashFlow, 0);
  const endingCashPosition =
    points.length > 0
      ? points[points.length - 1].cumulativeCashPosition
      : roundCurrency(openingCash);

  return {
    period,
    monthsCount: points.length,
    points,
    periodRevenueHt,
    periodNonPayrollExpensesHt,
    periodPayrollCost,
    periodTotalExpensesHt,
    periodEbe,
    periodEbeMarginRate,
    periodNetCashFlow,
    endingCashPosition,
  };
}

