/**
 * FISCALIQ — Versioned French Tax & Social Parameters (2026 Default + Historical 2025)
 *
 * LEGAL ACCURACY & TRANSPARENCY NOTICE:
 * Each parameter records its applicable tax year, effective date, verification date,
 * verification level, and official public reference URL:
 * - 'verified_official': Statutory rate, threshold, or formula parameter verified from
 *   impots.gouv.fr, BOFiP, URSSAF, Service-Public Entreprendre, or Légifrance.
 * - 'unverified_company_specific': Parameter that legally depends on a company's own
 *   administrative notifications (e.g., CARSAT AT/MP rate, municipal Versement Mobilité,
 *   collective agreement IDCC prévoyance, or healthcare mutuelle contract). Never invented
 *   as a universal statutory rule; any simulation including it is marked ESTIMATION / DÉMONSTRATION.
 */

export type SupportedTaxYear = 2026 | 2025;
export const DEFAULT_TAX_YEAR: SupportedTaxYear = 2026;
export const SUPPORTED_TAX_YEARS: SupportedTaxYear[] = [2026, 2025];

export type VerificationLevel = 'verified_official' | 'unverified_company_specific';

export interface VersionedTaxParameter<T = number> {
  key: string;
  label: string;
  value: T;
  unit: 'rate' | 'currency_eur' | 'multiple' | 'exponent';
  applicableYear: SupportedTaxYear;
  effectiveDate: string;
  verifiedDate: string;
  verificationLevel: VerificationLevel;
  sourceName: string;
  sourceRef: string;
  sourceUrl: string;
  notes: string;
}

export interface UnverifiedParameterDisclosure {
  key: string;
  label: string;
  reasonUnverified: string;
  officialVerificationSource: string;
  sourceUrl: string;
}

export interface TaxParameterSet {
  versionId: string;
  applicableYear: SupportedTaxYear;
  isDefaultYear: boolean;
  lastReviewedDate: string;
  reductionMechanismCode: 'RGDU' | 'RGCP';
  reductionMechanismName: string;
  reductionMechanismDescription: string;
  corporateTax: {
    standardRate: VersionedTaxParameter<number>;
    pmeReducedRate: VersionedTaxParameter<number>;
    pmeProfitCap: VersionedTaxParameter<number>;
    pmeTurnoverCeiling: VersionedTaxParameter<number>;
    pmeMinPhysicalPersonOwnership: VersionedTaxParameter<number>;
  };
  payroll: {
    smicHoraireBrutRef: VersionedTaxParameter<number>;
    smicMensuelBrut35h: VersionedTaxParameter<number>;
    smicMensuelCourantJuin2026?: VersionedTaxParameter<number>;
    passAnnuel: VersionedTaxParameter<number>;
    pmssMensuel: VersionedTaxParameter<number>;
    // Reduction parameters (2026 RGDU vs 2025 RGCP)
    reductionSmicMultiplierCeiling: VersionedTaxParameter<number>;
    rgduTMin?: VersionedTaxParameter<number>;
    rgduTDeltaUnder50?: VersionedTaxParameter<number>;
    rgduTDelta50OrMore?: VersionedTaxParameter<number>;
    rgduPowerExponent?: VersionedTaxParameter<number>;
    rgcpMaxCoeffUnder50: VersionedTaxParameter<number>;
    rgcpMaxCoeff50OrMore: VersionedTaxParameter<number>;
    rgcpSmicMultiplierCeiling: VersionedTaxParameter<number>;
    // Statutory line-item contribution rates (URSSAF / AGIRC-ARRCO)
    employerMaladieRate: VersionedTaxParameter<number>;
    employerVieillessePlafonneeRate: VersionedTaxParameter<number>;
    employerVieillesseDeplafonneeRate: VersionedTaxParameter<number>;
    employerAllocationsFamilialesRate: VersionedTaxParameter<number>;
    employerCsaRate: VersionedTaxParameter<number>;
    employerFnalUnder50Rate: VersionedTaxParameter<number>;
    employerFnal50OrMoreRate: VersionedTaxParameter<number>;
    employerChomageRate: VersionedTaxParameter<number>;
    employerAgsRate: VersionedTaxParameter<number>;
    employerAgircArrcoT1Rate: VersionedTaxParameter<number>;
    employerAgircArrcoT2Rate: VersionedTaxParameter<number>;
    employerCetRate: VersionedTaxParameter<number>;
    employerApecCadreRate: VersionedTaxParameter<number>;
    employeeVieillessePlafonneeRate: VersionedTaxParameter<number>;
    employeeVieillesseDeplafonneeRate: VersionedTaxParameter<number>;
    employeeAgircArrcoT1Rate: VersionedTaxParameter<number>;
    employeeAgircArrcoT2Rate: VersionedTaxParameter<number>;
    employeeCetRate: VersionedTaxParameter<number>;
    employeeApecCadreRate: VersionedTaxParameter<number>;
    employeeCsgCrdsRate: VersionedTaxParameter<number>;
    employeeCsgAssietteRatio: VersionedTaxParameter<number>;
    // Legacy compatibility aliases used by existing components
    illustrativeEmployerRateNonCadre: VersionedTaxParameter<number>;
    illustrativeEmployerRateCadre: VersionedTaxParameter<number>;
    illustrativeEmployeeRateNonCadre: VersionedTaxParameter<number>;
    illustrativeEmployeeRateCadre: VersionedTaxParameter<number>;
  };
  unverifiedCompanyParameters: UnverifiedParameterDisclosure[];
}

export const UNVERIFIED_COMPANY_SPECIFIC_DISCLOSURES: UnverifiedParameterDisclosure[] = [
  {
    key: 'AT_MP_RATE',
    label: 'Cotisation Accidents du Travail et Maladies Professionnelles (AT/MP)',
    reasonUnverified:
      'Le taux AT/MP n’est pas uniforme : il dépend du code risque (activité NAF/APE), de la sinistralité et de la notification annuelle de la CARSAT propre à chaque établissement.',
    officialVerificationSource: 'Compte AT/MP sur Net-Entreprises / URSSAF',
    sourceUrl:
      'https://www.urssaf.fr/accueil/employeur/cotisations/liste-cotisations/at-mp.html',
  },
  {
    key: 'VERSEMENT_MOBILITE',
    label: 'Versement mobilité (employeurs de 11 salariés et plus)',
    reasonUnverified:
      'Le taux dépend exclusivement de la commune ou de l’autorité organisatrice de la mobilité (AOM) où est situé l’établissement.',
    officialVerificationSource: 'Table des taux de versement mobilité URSSAF',
    sourceUrl:
      'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/versement-mobilite.html',
  },
  {
    key: 'PREVOYANCE_MUTUELLE_IDCC',
    label: 'Complémentaire santé (Frais de santé) & Prévoyance conventionnelle (IDCC)',
    reasonUnverified:
      'Les montants dépendent du contrat d’assurance souscrit par l’entreprise et des minima de la convention collective nationale applicable (IDCC).',
    officialVerificationSource: 'Légifrance — Conventions collectives',
    sourceUrl: 'https://www.legifrance.gouv.fr/liste/idcc',
  },
  {
    key: 'PAS_TAUX_INDIVIDUEL',
    label: 'Prélèvement à la source de l’impôt sur le revenu (PAS)',
    reasonUnverified:
      'Le taux de PAS est propre au foyer fiscal de chaque salarié et transmis par la DGFiP via le compte rendu métier (CRM) de la DSN.',
    officialVerificationSource: 'impots.gouv.fr — Prélèvement à la source',
    sourceUrl: 'https://www.impots.gouv.fr/professionnel/le-prelevement-la-source',
  },
];

export const TAX_PARAMETERS_FR_2026: TaxParameterSet = {
  versionId: 'FR-2026-RGDU-REV1',
  applicableYear: 2026,
  isDefaultYear: true,
  lastReviewedDate: '2026-11-08',
  reductionMechanismCode: 'RGDU',
  reductionMechanismName: 'Réduction Générale Dégressive Unique (RGDU 2026)',
  reductionMechanismDescription:
    'À compter du 1er janvier 2026, la Réduction Générale Dégressive Unique (RGDU) fusionne l’ancienne réduction générale et les réductions de taux maladie et allocations familiales. Elle est maximale au niveau du SMIC et décroît selon une courbe de puissance (P = 1,75) jusqu’à s’annuler à 3 SMIC.',
  corporateTax: {
    standardRate: {
      key: 'IS_STANDARD_RATE_2026',
      label: 'Taux normal de l’Impôt sur les Sociétés (IS)',
      value: 0.25,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2022-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'Légifrance / Code général des impôts',
      sourceRef: 'CGI Art. 219-I',
      sourceUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044986934',
      notes: 'Taux normal de droit commun de 25 % applicable au bénéfice imposable hors tranche PME à 15 %.',
    },
    pmeReducedRate: {
      key: 'IS_PME_REDUCED_RATE_2026',
      label: 'Taux réduit d’IS applicable aux PME éligibles',
      value: 0.15,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2023-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'impots.gouv.fr / BOFiP',
      sourceRef: 'CGI Art. 219-I-b / BOI-IS-LIQ-20-10',
      sourceUrl: 'https://www.impots.gouv.fr/professionnel/impot-sur-les-societes',
      notes: 'Taux réduit de 15 % sur la première tranche de 42 500 € de bénéfice imposable par période de 12 mois.',
    },
    pmeProfitCap: {
      key: 'IS_PME_PROFIT_CAP_2026',
      label: 'Plafond annuel de bénéfice imposable au taux réduit PME (15 %)',
      value: 42500,
      unit: 'currency_eur',
      applicableYear: 2026,
      effectiveDate: '2023-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'Service-Public Entreprendre / Légifrance',
      sourceRef: 'CGI Art. 219-I-b',
      sourceUrl: 'https://entreprendre.service-public.fr/vosdroits/F23575',
      notes: 'Plafond légal de 42 500 € de bénéfice fiscal par période de 12 mois.',
    },
    pmeTurnoverCeiling: {
      key: 'IS_PME_TURNOVER_CEILING_2026',
      label: 'Plafond de chiffre d’affaires HT pour l’éligibilité au taux réduit d’IS',
      value: 10000000,
      unit: 'currency_eur',
      applicableYear: 2026,
      effectiveDate: '2021-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'Service-Public Entreprendre',
      sourceRef: 'CGI Art. 219-I-b',
      sourceUrl: 'https://entreprendre.service-public.fr/vosdroits/F23575',
      notes: 'Chiffre d’affaires HT inférieur à 10 000 000 € ramené le cas échéant à 12 mois.',
    },
    pmeMinPhysicalPersonOwnership: {
      key: 'IS_PME_MIN_OWNERSHIP_2026',
      label: 'Seuil minimal de détention du capital par des personnes physiques',
      value: 0.75,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2001-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'BOFiP - Impôts',
      sourceRef: 'BOI-IS-LIQ-20-10',
      sourceUrl: 'https://bofip.impots.gouv.fr/bofip/4360-PGP.html',
      notes: 'Capital entièrement libéré et détenu de manière continue pour 75 % au moins par des personnes physiques.',
    },
  },
  payroll: {
    smicHoraireBrutRef: {
      key: 'SMIC_HORAIRE_REF_RGDU_2026',
      label: 'SMIC horaire brut de référence pour le calcul RGDU 2026',
      value: 12.02,
      unit: 'currency_eur',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / Légifrance',
      sourceRef: 'Décret n° 2026-509 du 12 juin 2026',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/montant-smic.html',
      notes: 'Valeur du SMIC horaire au 1er janvier 2026 (12,02 €) maintenue pour le calcul annuel de la RGDU sur l’ensemble de l’année 2026.',
    },
    smicMensuelBrut35h: {
      key: 'SMIC_MENSUEL_BRUT_35H_2026',
      label: 'SMIC mensuel brut de référence RGDU (base 35h / 151,67h au 01/01/2026)',
      value: 1823.03,
      unit: 'currency_eur',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: '12,02 €/h × 151,67h (Décret n° 2026-509 du 12 juin 2026)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/montant-smic.html',
      notes: 'SMIC mensuel de référence pour le paramètre SMIC de la formule RGDU 2026 (1 823,03 €/mois). Note : le SMIC courant a été revalorisé à 1 867,02 € (12,31 €/h) au 1er juin 2026.',
    },
    smicMensuelCourantJuin2026: {
      key: 'SMIC_MENSUEL_COURANT_JUIN_2026',
      label: 'SMIC mensuel brut courant à compter du 1er juin 2026 (base 35h)',
      value: 1867.02,
      unit: 'currency_eur',
      applicableYear: 2026,
      effectiveDate: '2026-06-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Revalorisation du SMIC au 1er juin 2026 (12,31 €/h)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/montant-smic.html',
      notes: 'Minimum légal de rémunération mensuelle pour 151,67h à compter du 1er juin 2026.',
    },
    passAnnuel: {
      key: 'PASS_ANNUEL_2026',
      label: 'Plafond Annuel de la Sécurité Sociale (PASS 2026)',
      value: 48060,
      unit: 'currency_eur',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / BOSS',
      sourceRef: 'Arrêté du 22 décembre 2025',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/plafonds-securite-sociale.html',
      notes: 'Plafond annuel fixé à 48 060 € pour 2026.',
    },
    pmssMensuel: {
      key: 'PMSS_MENSUEL_2026',
      label: 'Plafond Mensuel de la Sécurité Sociale (PMSS 2026)',
      value: 4005,
      unit: 'currency_eur',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / BOSS',
      sourceRef: 'Arrêté du 22 décembre 2025',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/plafonds-securite-sociale.html',
      notes: 'Plafond mensuel fixé à 4 005 € pour 2026.',
    },
    reductionSmicMultiplierCeiling: {
      key: 'RGDU_EXIT_THRESHOLD_2026',
      label: 'Seuil de sortie de la Réduction Générale Dégressive Unique (RGDU)',
      value: 3.0,
      unit: 'multiple',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / Légifrance',
      sourceRef: 'LFSS 2025 Art. 18 & Décret n° 2025-887 du 4 septembre 2025 (CSS Art. L241-13)',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'La RGDU est maximale au niveau du SMIC et décroît jusqu’à s’annuler lorsque la rémunération brute atteint 3 SMIC (soit 5 469,09 €/mois sur base SMIC de référence 1 823,03 €).',
    },
    rgduTMin: {
      key: 'RGDU_T_MIN_2026',
      label: 'Paramètre plancher T_min de la formule RGDU 2026',
      value: 0.02,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / Légifrance',
      sourceRef: 'Décret n° 2025-887 du 4 septembre 2025 & Décret n° 2025-1446 du 31 décembre 2025',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Socle minimal de 0,0200 dans la formule du coefficient RGDU avant le seuil de sortie de 3 SMIC.',
    },
    rgduTDeltaUnder50: {
      key: 'RGDU_T_DELTA_UNDER_50_2026',
      label: 'Paramètre T_delta RGDU (entreprises < 50 salariés, FNAL 0,10 %)',
      value: 0.3781,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / Légifrance',
      sourceRef: 'Décret n° 2025-1446 du 31 décembre 2025',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Au SMIC, le coefficient maximal T_min + T_delta atteint 0,3981 (39,81 %) pour les entreprises de moins de 50 salariés.',
    },
    rgduTDelta50OrMore: {
      key: 'RGDU_T_DELTA_50_PLUS_2026',
      label: 'Paramètre T_delta RGDU (entreprises ≥ 50 salariés, FNAL 0,50 %)',
      value: 0.3821,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / Légifrance',
      sourceRef: 'Décret n° 2025-1446 du 31 décembre 2025',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Au SMIC, le coefficient maximal T_min + T_delta atteint 0,4021 (40,21 %) pour les entreprises de 50 salariés et plus.',
    },
    rgduPowerExponent: {
      key: 'RGDU_POWER_P_2026',
      label: 'Exposant de dégressivité P de la formule RGDU 2026',
      value: 1.75,
      unit: 'exponent',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / Légifrance',
      sourceRef: 'Décret n° 2025-887 du 4 septembre 2025',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Puissance P = 1,75 appliquée au terme [1/2 × (3 × SMIC / Rémunération brute - 1)].',
    },
    rgcpMaxCoeffUnder50: {
      key: 'RGDU_MAX_COEFF_UNDER_50_2026',
      label: 'Coefficient maximal RGDU au niveau du SMIC (< 50 salariés)',
      value: 0.3981,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'T_min (0,0200) + T_delta (0,3781)',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Somme de T_min et T_delta au niveau du SMIC pour un employeur soumis au FNAL à 0,10 %.',
    },
    rgcpMaxCoeff50OrMore: {
      key: 'RGDU_MAX_COEFF_50_PLUS_2026',
      label: 'Coefficient maximal RGDU au niveau du SMIC (≥ 50 salariés)',
      value: 0.4021,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'T_min (0,0200) + T_delta (0,3821)',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Somme de T_min et T_delta au niveau du SMIC pour un employeur soumis au FNAL à 0,50 %.',
    },
    rgcpSmicMultiplierCeiling: {
      key: 'RGDU_SMIC_CEILING_ALIAS_2026',
      label: 'Seuil de sortie RGDU (3 SMIC)',
      value: 3.0,
      unit: 'multiple',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'CSS Art. L241-13 (LFSS 2025 Art. 18)',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Sortie du dispositif à 3 SMIC.',
    },
    employerMaladieRate: {
      key: 'EMP_MALADIE_2026',
      label: 'Assurance maladie, maternité, invalidité, décès (part patronale)',
      value: 0.13,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Taux de droit commun avant RGDU (13,00 %)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Sur la totalité du salaire brut (l’allègement bas salaires étant désormais intégré dans la RGDU).',
    },
    employerVieillessePlafonneeRate: {
      key: 'EMP_VIEILLESSE_PLAF_2026',
      label: 'Assurance vieillesse plafonnée (part patronale, ≤ 1 PMSS)',
      value: 0.0855,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Barème secteur privé 2026 (8,55 %)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Calculée dans la limite du PMSS (4 005 €/mois en 2026).',
    },
    employerVieillesseDeplafonneeRate: {
      key: 'EMP_VIEILLESSE_DEPLAF_2026',
      label: 'Assurance vieillesse déplafonnée (part patronale, totalité du brut)',
      value: 0.0211,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Taux revalorisé à 2,11 % au 1er janvier 2026',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Sur la totalité de la rémunération brute.',
    },
    employerAllocationsFamilialesRate: {
      key: 'EMP_ALLOC_FAM_2026',
      label: 'Allocations familiales (part patronale)',
      value: 0.0525,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Taux de droit commun avant RGDU (5,25 %)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Sur la totalité du salaire brut.',
    },
    employerCsaRate: {
      key: 'EMP_CSA_2026',
      label: 'Contribution Solidarité Autonomie (CSA)',
      value: 0.003,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Barème secteur privé (0,30 %)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Sur la totalité du salaire brut.',
    },
    employerFnalUnder50Rate: {
      key: 'EMP_FNAL_UNDER_50_2026',
      label: 'Cotisation FNAL (employeurs < 50 salariés, plafonnée à 1 PMSS)',
      value: 0.001,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'FNAL plafonné à 0,10 %',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Sur la part de rémunération limitée au PMSS.',
    },
    employerFnal50OrMoreRate: {
      key: 'EMP_FNAL_50_PLUS_2026',
      label: 'Cotisation FNAL (employeurs ≥ 50 salariés, totalité du brut)',
      value: 0.005,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'FNAL déplafonné à 0,50 %',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Sur la totalité du salaire brut.',
    },
    employerChomageRate: {
      key: 'EMP_CHOMAGE_2026',
      label: 'Assurance chômage (part patronale, limitée à 4 PMSS)',
      value: 0.04,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / Unédic',
      sourceRef: 'Taux de contribution d’assurance chômage (4,00 %)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Dans la limite de 4 fois le plafond mensuel de la Sécurité sociale.',
    },
    employerAgsRate: {
      key: 'EMP_AGS_2026',
      label: 'Cotisation AGS (Garantie des salaires, limitée à 4 PMSS)',
      value: 0.0025,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2024-07-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Taux AGS 0,25 %',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'À la charge exclusive de l’employeur dans la limite de 4 PMSS.',
    },
    employerAgircArrcoT1Rate: {
      key: 'EMP_AGIRC_ARRCO_T1_2026',
      label: 'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 1 (part patronale, ≤ 1 PMSS)',
      value: 0.0601,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'AGIRC-ARRCO / URSSAF',
      sourceRef: 'Retraite T1 (4,72 %) + CEG T1 (1,29 %) = 6,01 %',
      sourceUrl: 'https://www.agirc-arrco.fr/',
      notes: 'Taux légal de droit commun (répartition 60 % employeur / 40 % salarié).',
    },
    employerAgircArrcoT2Rate: {
      key: 'EMP_AGIRC_ARRCO_T2_2026',
      label: 'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 2 (part patronale, 1 à 8 PMSS)',
      value: 0.1457,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'AGIRC-ARRCO',
      sourceRef: 'Retraite T2 (12,95 %) + CEG T2 (1,62 %) = 14,57 %',
      sourceUrl: 'https://www.agirc-arrco.fr/',
      notes: 'Sur la fraction de rémunération comprise entre 1 et 8 PMSS.',
    },
    employerCetRate: {
      key: 'EMP_CET_2026',
      label: 'Contribution d’Équilibre Technique (CET part patronale, si brut > 1 PMSS)',
      value: 0.0021,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'AGIRC-ARRCO',
      sourceRef: 'CET part patronale 0,21 % (T1 + T2)',
      sourceUrl: 'https://www.agirc-arrco.fr/',
      notes: 'Due sur les tranches 1 et 2 uniquement lorsque la rémunération brute excède 1 PMSS.',
    },
    employerApecCadreRate: {
      key: 'EMP_APEC_CADRE_2026',
      label: 'Cotisation APEC (Cadres uniquement, part patronale ≤ 4 PMSS)',
      value: 0.00036,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'APEC / AGIRC-ARRCO',
      sourceRef: 'Taux APEC employeur 0,036 %',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Applicable aux salariés cadres dans la limite de 4 PMSS.',
    },
    employeeVieillessePlafonneeRate: {
      key: 'SAL_VIEILLESSE_PLAF_2026',
      label: 'Assurance vieillesse plafonnée (part salariale, ≤ 1 PMSS)',
      value: 0.069,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Taux salarial 6,90 %',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Sur la tranche limitée à 1 PMSS.',
    },
    employeeVieillesseDeplafonneeRate: {
      key: 'SAL_VIEILLESSE_DEPLAF_2026',
      label: 'Assurance vieillesse déplafonnée (part salariale, totalité du brut)',
      value: 0.004,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Taux salarial 0,40 %',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Sur la totalité du salaire brut.',
    },
    employeeAgircArrcoT1Rate: {
      key: 'SAL_AGIRC_ARRCO_T1_2026',
      label: 'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 1 (part salariale, ≤ 1 PMSS)',
      value: 0.0401,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'AGIRC-ARRCO',
      sourceRef: 'Retraite T1 (3,15 %) + CEG T1 (0,86 %) = 4,01 %',
      sourceUrl: 'https://www.agirc-arrco.fr/',
      notes: 'Sur la tranche limitée à 1 PMSS.',
    },
    employeeAgircArrcoT2Rate: {
      key: 'SAL_AGIRC_ARRCO_T2_2026',
      label: 'Retraite complémentaire AGIRC-ARRCO + CEG Tranche 2 (part salariale, 1 à 8 PMSS)',
      value: 0.0972,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'AGIRC-ARRCO',
      sourceRef: 'Retraite T2 (8,64 %) + CEG T2 (1,08 %) = 9,72 %',
      sourceUrl: 'https://www.agirc-arrco.fr/',
      notes: 'Sur la tranche de 1 à 8 PMSS.',
    },
    employeeCetRate: {
      key: 'SAL_CET_2026',
      label: 'Contribution d’Équilibre Technique (CET part salariale, si brut > 1 PMSS)',
      value: 0.0014,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'AGIRC-ARRCO',
      sourceRef: 'CET part salariale 0,14 %',
      sourceUrl: 'https://www.agirc-arrco.fr/',
      notes: 'Due lorsque le salaire brut dépasse 1 PMSS.',
    },
    employeeApecCadreRate: {
      key: 'SAL_APEC_CADRE_2026',
      label: 'Cotisation APEC (Cadres uniquement, part salariale ≤ 4 PMSS)',
      value: 0.00024,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'APEC / AGIRC-ARRCO',
      sourceRef: 'Taux APEC salarié 0,024 %',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Applicable aux salariés cadres dans la limite de 4 PMSS.',
    },
    employeeCsgCrdsRate: {
      key: 'SAL_CSG_CRDS_2026',
      label: 'CSG (9,20 %) + CRDS (0,50 %) sur revenus d’activité',
      value: 0.097,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2018-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'CSG déductible (6,80 %) + CSG non déductible (2,40 %) + CRDS (0,50 %)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Appliquée sur 98,25 % du salaire brut (abattement légal de 1,75 % pour frais professionnels dans la limite de 4 PASS).',
    },
    employeeCsgAssietteRatio: {
      key: 'SAL_CSG_ASSIETTE_RATIO_2026',
      label: 'Assiette CSG/CRDS après abattement de 1,75 % (≤ 4 PASS)',
      value: 0.9825,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2012-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'CSS Art. L136-2',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Assiette égale à 98,25 % du salaire brut.',
    },
    illustrativeEmployerRateNonCadre: {
      key: 'SOCLE_LEGAL_PATRONAL_T1_2026',
      label: 'Cumul des taux patronaux légaux obligatoires sur Tranche 1 (avant RGDU, hors AT/MP et mutuelle)',
      value: 0.3957,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF & AGIRC-ARRCO',
      sourceRef: 'Maladie 13% + Vieillesse 10,66% + AF 5,25% + CSA 0,30% + FNAL 0,10% + Chômage/AGS 4,25% + Retraite T1 6,01%',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Somme exacte des cotisations patronales légales de droit commun en Tranche 1 (< 50 salariés) avant RGDU.',
    },
    illustrativeEmployerRateCadre: {
      key: 'SOCLE_LEGAL_PATRONAL_CADRE_T1_2026',
      label: 'Cumul des taux patronaux légaux obligatoires Cadre sur Tranche 1 (avant RGDU, hors prévoyance/AT-MP)',
      value: 0.39606,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF & AGIRC-ARRCO',
      sourceRef: 'Socle T1 (39,57 %) + APEC employeur (0,036 %)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Somme exacte des cotisations patronales légales sur Tranche 1 pour un cadre avant RGDU et hors prévoyance conventionnelle.',
    },
    illustrativeEmployeeRateNonCadre: {
      key: 'SOCLE_LEGAL_SALARIAL_T1_2026',
      label: 'Cumul des cotisations salariales légales sur Tranche 1 (Vieillesse + AGIRC-ARRCO + CSG/CRDS)',
      value: 0.2084,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF & AGIRC-ARRCO',
      sourceRef: 'Vieillesse (7,30 %) + AGIRC-ARRCO T1 (4,01 %) + CSG/CRDS effective (9,53 %)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Taux salarial légal effectif sur Tranche 1 (hors part salariale de mutuelle et hors PAS).',
    },
    illustrativeEmployeeRateCadre: {
      key: 'SOCLE_LEGAL_SALARIAL_CADRE_T1_2026',
      label: 'Cumul des cotisations salariales légales Cadre sur Tranche 1',
      value: 0.20864,
      unit: 'rate',
      applicableYear: 2026,
      effectiveDate: '2026-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF & AGIRC-ARRCO',
      sourceRef: 'Socle T1 (20,84 %) + APEC salarié (0,024 %)',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Taux salarial légal effectif sur Tranche 1 pour un cadre.',
    },
  },
  unverifiedCompanyParameters: UNVERIFIED_COMPANY_SPECIFIC_DISCLOSURES,
};

export const TAX_PARAMETERS_FR_2025: TaxParameterSet = {
  versionId: 'FR-2025-RGCP-HIST',
  applicableYear: 2025,
  isDefaultYear: false,
  lastReviewedDate: '2026-11-08',
  reductionMechanismCode: 'RGCP',
  reductionMechanismName: 'Réduction Générale des Cotisations Patronales (RGCP historique 2025)',
  reductionMechanismDescription:
    'Millésime historique 2025 : la réduction générale (ex-Fillon) s’appliquait de manière linéaire dégressive aux salaires inférieurs à 1,6 SMIC selon la formule C = (T / 0,6) × (1,6 × SMIC / Rémunération brute - 1).',
  corporateTax: {
    ...TAX_PARAMETERS_FR_2026.corporateTax,
    standardRate: {
      ...TAX_PARAMETERS_FR_2026.corporateTax.standardRate,
      key: 'IS_STANDARD_RATE_2025',
      applicableYear: 2025,
    },
    pmeReducedRate: {
      ...TAX_PARAMETERS_FR_2026.corporateTax.pmeReducedRate,
      key: 'IS_PME_REDUCED_RATE_2025',
      applicableYear: 2025,
    },
    pmeProfitCap: {
      ...TAX_PARAMETERS_FR_2026.corporateTax.pmeProfitCap,
      key: 'IS_PME_PROFIT_CAP_2025',
      applicableYear: 2025,
    },
    pmeTurnoverCeiling: {
      ...TAX_PARAMETERS_FR_2026.corporateTax.pmeTurnoverCeiling,
      key: 'IS_PME_TURNOVER_CEILING_2025',
      applicableYear: 2025,
    },
    pmeMinPhysicalPersonOwnership: {
      ...TAX_PARAMETERS_FR_2026.corporateTax.pmeMinPhysicalPersonOwnership,
      key: 'IS_PME_MIN_OWNERSHIP_2025',
      applicableYear: 2025,
    },
  },
  payroll: {
    ...TAX_PARAMETERS_FR_2026.payroll,
    smicHoraireBrutRef: {
      key: 'SMIC_HORAIRE_2025',
      label: 'SMIC horaire brut 2025',
      value: 11.88,
      unit: 'currency_eur',
      applicableYear: 2025,
      effectiveDate: '2024-11-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Décret n° 2024-951 du 23 octobre 2024',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/montant-smic.html',
      notes: 'Taux horaire de 11,88 € en vigueur au 1er janvier 2025.',
    },
    smicMensuelBrut35h: {
      key: 'SMIC_MENSUEL_BRUT_35H_2025',
      label: 'SMIC mensuel brut 2025 (base 35h / 151,67h)',
      value: 1801.8,
      unit: 'currency_eur',
      applicableYear: 2025,
      effectiveDate: '2024-11-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Décret n° 2024-951 du 23 octobre 2024',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/montant-smic.html',
      notes: 'Base 11,88 € brut/heure soit 1 801,80 € mensuel brut pour 151,67 heures.',
    },
    passAnnuel: {
      key: 'PASS_ANNUEL_2025',
      label: 'Plafond Annuel de la Sécurité Sociale (PASS 2025)',
      value: 47100,
      unit: 'currency_eur',
      applicableYear: 2025,
      effectiveDate: '2025-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / BOSS',
      sourceRef: 'Arrêté du 19 décembre 2024',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/plafonds-securite-sociale.html',
      notes: 'Plafond annuel fixé à 47 100 € pour 2025.',
    },
    pmssMensuel: {
      key: 'PMSS_MENSUEL_2025',
      label: 'Plafond Mensuel de la Sécurité Sociale (PMSS 2025)',
      value: 3925,
      unit: 'currency_eur',
      applicableYear: 2025,
      effectiveDate: '2025-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF / BOSS',
      sourceRef: 'Arrêté du 19 décembre 2024',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/plafonds-securite-sociale.html',
      notes: 'Plafond mensuel fixé à 3 925 € pour 2025.',
    },
    reductionSmicMultiplierCeiling: {
      key: 'RGCP_EXIT_THRESHOLD_2025',
      label: 'Seuil de sortie de la Réduction Générale (RGCP 2025)',
      value: 1.6,
      unit: 'multiple',
      applicableYear: 2025,
      effectiveDate: '2019-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'CSS Art. L241-13 (version 2025)',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Sortie du dispositif à 1,6 SMIC en 2025.',
    },
    rgcpMaxCoeffUnder50: {
      key: 'RGCP_MAX_COEFF_UNDER_50_2025',
      label: 'Coefficient maximal RGCP 2025 (< 50 salariés)',
      value: 0.3194,
      unit: 'rate',
      applicableYear: 2025,
      effectiveDate: '2025-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'CSS Art. L241-13 (paramètre T 2025)',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Paramètre T maximal de 0,3194 au 1er janvier 2025 (< 50 salariés).',
    },
    rgcpMaxCoeff50OrMore: {
      key: 'RGCP_MAX_COEFF_50_PLUS_2025',
      label: 'Coefficient maximal RGCP 2025 (≥ 50 salariés)',
      value: 0.3234,
      unit: 'rate',
      applicableYear: 2025,
      effectiveDate: '2025-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'CSS Art. L241-13 (paramètre T 2025)',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Paramètre T maximal de 0,3234 au 1er janvier 2025 (≥ 50 salariés).',
    },
    rgcpSmicMultiplierCeiling: {
      key: 'RGCP_SMIC_MULTIPLIER_CEILING_2025',
      label: 'Seuil de sortie RGCP 2025 (1,6 SMIC)',
      value: 1.6,
      unit: 'multiple',
      applicableYear: 2025,
      effectiveDate: '2019-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'CSS Art. L241-13',
      sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
      notes: 'Seuil de sortie 1,6 SMIC en 2025.',
    },
    employerVieillesseDeplafonneeRate: {
      key: 'EMP_VIEILLESSE_DEPLAF_2025',
      label: 'Assurance vieillesse déplafonnée (part patronale 2025)',
      value: 0.0202,
      unit: 'rate',
      applicableYear: 2025,
      effectiveDate: '2024-01-01',
      verifiedDate: '2026-11-08',
      verificationLevel: 'verified_official',
      sourceName: 'URSSAF',
      sourceRef: 'Taux 2,02 % en vigueur en 2025',
      sourceUrl: 'https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html',
      notes: 'Taux patronal vieillesse déplafonnée en 2025 avant passage à 2,11 % en 2026.',
    },
  },
  unverifiedCompanyParameters: UNVERIFIED_COMPANY_SPECIFIC_DISCLOSURES,
};

export const TAX_PARAMETERS_BY_YEAR: Record<SupportedTaxYear, TaxParameterSet> = {
  2026: TAX_PARAMETERS_FR_2026,
  2025: TAX_PARAMETERS_FR_2025,
};

export function getTaxParametersForYear(
  year: SupportedTaxYear = DEFAULT_TAX_YEAR
): TaxParameterSet {
  return TAX_PARAMETERS_BY_YEAR[year] ?? TAX_PARAMETERS_FR_2026;
}
