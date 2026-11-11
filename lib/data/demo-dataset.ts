/**
 * FISCALIQ — Fictional Demo Dataset (Clearly Labelled)
 *
 * IMPORTANT: All company profiles, ledger rows, employee lines, and financial schedules
 * in this module are strictly FICTIONAL DEMO DATA ("DONNÉES FICTIVES DE DÉMONSTRATION")
 * created to illustrate the platform interface for French TPE/PME directors.
 */

import { CompanySizeBracket, EmployeeStatus } from '@/lib/calculations/engine';

export interface DemoCompanyProfile {
  id: string;
  isDemoData: true;
  demoLabel: string;
  companyName: string;
  siren: string;
  nafCode: string;
  sectorLabel: string;
  legalForm: 'SAS' | 'SASU' | 'SARL' | 'EURL' | 'SA';
  taxRegime: 'IS_REEL_SIMPLIFIE' | 'IS_REEL_NORMAL' | 'IR_BIC_BNC';
  vatRegime: 'REEL_NORMAL_MENSUEL' | 'REEL_SIMPLIFIE_ANNUEL' | 'FRANCHISE_BASE';
  companySize: CompanySizeBracket;
  collectiveAgreementCode: string;
  fiscalYearClosingMonth: string;
  annualTurnoverHt: number;
  variableCostsHt: number;
  fixedExternalExpensesHt: number;
  operatingTaxesHt: number;
  totalPayrollCost: number;
  depreciationAndAmortization: number;
  taxableProfitEstimate: number;
  headcount: number;
  isCapitalFullyPaidUp: boolean;
  physicalPersonOwnershipShare: number;
  cashPositionEur: number;
}

export interface DemoEmployeeRecord {
  id: string;
  fullName: string;
  roleTitle: string;
  department: string;
  status: EmployeeStatus;
  contractType: 'CDI' | 'CDD' | 'Apprentissage';
  grossMonthlySalary: number;
  workingTimeRatio: number;
}

export interface LegalTaxLever {
  id: string;
  title: string;
  category: 'IS & Structure' | 'Rémunération & Épargne Salariale' | 'Crédits d’Impôt & Innovation' | 'Trésorerie & TVA';
  status: 'applicable' | 'a_analyser' | 'condition_non_remplie';
  statutoryReference: string;
  officialAuthority: string;
  officialUrl: string;
  applicableYear: number;
  verifiedDate: string;
  description: string;
  keyConditions: string[];
  illustrativeImpactNote: string;
}

export interface RegulatoryDeadline {
  id: string;
  dueDate: string;
  title: string;
  authority: 'DGFiP / impots.gouv.fr' | 'URSSAF / Net-Entreprises' | 'Greffe du Tribunal de Commerce';
  formCode: string;
  frequency: 'Mensuel' | 'Trimestriel' | 'Annuel';
  status: 'prepare' | 'a_verifier' | 'valide';
  illustrativeAmountEur: number | null;
  officialReferenceUrl: string;
  notes: string;
}

export interface MonthlyFinancialPoint {
  month: string;
  revenueHt: number;
  operatingExpensesHt: number;
  payrollCost: number;
  ebe: number;
  netCashFlow: number;
}

export const DEMO_COMPANIES: DemoCompanyProfile[] = [
  {
    id: 'demo-atelier-lumiere',
    isDemoData: true,
    demoLabel: 'DÉMO FICTIVE — PME Ingénierie & Conseil',
    companyName: 'Atelier Lumière & Associés SAS (Démo)',
    siren: '892341502',
    nafCode: '7112B',
    sectorLabel: 'Ingénierie, études techniques & architecture énergétique',
    legalForm: 'SAS',
    taxRegime: 'IS_REEL_NORMAL',
    vatRegime: 'REEL_NORMAL_MENSUEL',
    companySize: '11_to_49',
    collectiveAgreementCode: 'IDCC 1486 — Bureaux d’études techniques (Syntec)',
    fiscalYearClosingMonth: '31 décembre',
    annualTurnoverHt: 1480000,
    variableCostsHt: 295000,
    fixedExternalExpensesHt: 185000,
    operatingTaxesHt: 22000,
    totalPayrollCost: 715000,
    depreciationAndAmortization: 38000,
    taxableProfitEstimate: 225000,
    headcount: 14,
    isCapitalFullyPaidUp: true,
    physicalPersonOwnershipShare: 85,
    cashPositionEur: 312000,
  },
  {
    id: 'demo-atelier-parc-sarl',
    isDemoData: true,
    demoLabel: 'DÉMO FICTIVE — TPE Production Artisanale',
    companyName: 'Manufacture du Parc SARL (Démo)',
    siren: '514920381',
    nafCode: '1071C',
    sectorLabel: 'Fabrication artisanale & distribution B2B alimentaire',
    legalForm: 'SARL',
    taxRegime: 'IS_REEL_SIMPLIFIE',
    vatRegime: 'REEL_NORMAL_MENSUEL',
    companySize: 'under_11',
    collectiveAgreementCode: 'IDCC 0843 — Boulangerie-pâtisserie artisanale',
    fiscalYearClosingMonth: '30 septembre',
    annualTurnoverHt: 620000,
    variableCostsHt: 215000,
    fixedExternalExpensesHt: 74000,
    operatingTaxesHt: 9500,
    totalPayrollCost: 238000,
    depreciationAndAmortization: 21500,
    taxableProfitEstimate: 62000,
    headcount: 6,
    isCapitalFullyPaidUp: true,
    physicalPersonOwnershipShare: 100,
    cashPositionEur: 94500,
  },
  {
    id: 'demo-nexalogistique-sas',
    isDemoData: true,
    demoLabel: 'DÉMO FICTIVE — PME Logistique Urbaine',
    companyName: 'NexaLogistique France SAS (Démo)',
    siren: '903118447',
    nafCode: '5229B',
    sectorLabel: 'Affrètement et organisation des transports B2B',
    legalForm: 'SAS',
    taxRegime: 'IS_REEL_NORMAL',
    vatRegime: 'REEL_NORMAL_MENSUEL',
    companySize: '11_to_49',
    collectiveAgreementCode: 'IDCC 0016 — Transports routiers et activités auxiliaires',
    fiscalYearClosingMonth: '31 décembre',
    annualTurnoverHt: 3450000,
    variableCostsHt: 1490000,
    fixedExternalExpensesHt: 390000,
    operatingTaxesHt: 48000,
    totalPayrollCost: 1180000,
    depreciationAndAmortization: 92000,
    taxableProfitEstimate: 250000,
    headcount: 29,
    isCapitalFullyPaidUp: true,
    physicalPersonOwnershipShare: 60, // Held at 40% by an institutional holding -> tests PME reduced rate ineligibility!
    cashPositionEur: 428000,
  },
];

export const DEMO_EMPLOYEES: DemoEmployeeRecord[] = [
  {
    id: 'emp-01',
    fullName: 'Claire Moreau (Profil Fictif)',
    roleTitle: 'Directrice Technique & Associée',
    department: 'Direction & R&D',
    status: 'cadre',
    contractType: 'CDI',
    grossMonthlySalary: 5400,
    workingTimeRatio: 1,
  },
  {
    id: 'emp-02',
    fullName: 'Thomas Lefèvre (Profil Fictif)',
    roleTitle: 'Ingénieur Études Thermiques Senior',
    department: 'Ingénierie',
    status: 'cadre',
    contractType: 'CDI',
    grossMonthlySalary: 4100,
    workingTimeRatio: 1,
  },
  {
    id: 'emp-03',
    fullName: 'Amélie Garnier (Profil Fictif)',
    roleTitle: 'Chargée d’Affaires B2B',
    department: 'Développement Commercial',
    status: 'cadre',
    contractType: 'CDI',
    grossMonthlySalary: 3450,
    workingTimeRatio: 1,
  },
  {
    id: 'emp-04',
    fullName: 'Lucas Bernard (Profil Fictif)',
    roleTitle: 'Technicien Bureau d’Études',
    department: 'Opérations Techniques',
    status: 'non_cadre',
    contractType: 'CDI',
    grossMonthlySalary: 2350,
    workingTimeRatio: 1,
  },
  {
    id: 'emp-05',
    fullName: 'Nadia Benali (Profil Fictif)',
    roleTitle: 'Gestionnaire Administrative & Facturation',
    department: 'Administration & Finance',
    status: 'non_cadre',
    contractType: 'CDI',
    grossMonthlySalary: 2150,
    workingTimeRatio: 1,
  },
];

export const DEMO_MONTHLY_FINANCIALS: MonthlyFinancialPoint[] = [
  { month: 'Jan', revenueHt: 112000, operatingExpensesHt: 38000, payrollCost: 58500, ebe: 15500, netCashFlow: 11800 },
  { month: 'Fév', revenueHt: 118000, operatingExpensesHt: 39500, payrollCost: 58500, ebe: 20000, netCashFlow: 15200 },
  { month: 'Mar', revenueHt: 126000, operatingExpensesHt: 41000, payrollCost: 59000, ebe: 26000, netCashFlow: 18400 },
  { month: 'Avr', revenueHt: 121000, operatingExpensesHt: 40000, payrollCost: 59000, ebe: 22000, netCashFlow: 16100 },
  { month: 'Mai', revenueHt: 115000, operatingExpensesHt: 38500, payrollCost: 59500, ebe: 17000, netCashFlow: 12900 },
  { month: 'Juin', revenueHt: 134000, operatingExpensesHt: 43000, payrollCost: 60000, ebe: 31000, netCashFlow: 21500 },
  { month: 'Juil', revenueHt: 119000, operatingExpensesHt: 39000, payrollCost: 60000, ebe: 20000, netCashFlow: 14700 },
  { month: 'Août', revenueHt: 96000, operatingExpensesHt: 34000, payrollCost: 59000, ebe: 3000, netCashFlow: 2100 },
  { month: 'Sep', revenueHt: 132000, operatingExpensesHt: 42500, payrollCost: 60500, ebe: 29000, netCashFlow: 22400 },
  { month: 'Oct', revenueHt: 136000, operatingExpensesHt: 43500, payrollCost: 60500, ebe: 32000, netCashFlow: 24800 },
  { month: 'Nov', revenueHt: 131000, operatingExpensesHt: 41500, payrollCost: 60000, ebe: 29500, netCashFlow: 22100 },
  { month: 'Déc', revenueHt: 140000, operatingExpensesHt: 45000, payrollCost: 60500, ebe: 34500, netCashFlow: 25900 },
];

export const LEGAL_TAX_OPTIMIZATION_LEVERS: LegalTaxLever[] = [
  {
    id: 'lever-is-pme',
    title: 'Application du taux réduit d’IS à 15 % sur la première tranche de 42 500 €',
    category: 'IS & Structure',
    status: 'applicable',
    statutoryReference: 'CGI Art. 219-I-b / BOI-IS-LIQ-20-10',
    officialAuthority: 'impots.gouv.fr / Légifrance',
    officialUrl: 'https://entreprendre.service-public.fr/vosdroits/F23575',
    applicableYear: 2026,
    verifiedDate: '2026-11-08',
    description:
      'Vérification systématique des trois conditions cumulatives permettant de soumettre les premiers 42 500 € de bénéfice fiscal au taux réduit de 15 % au lieu du taux normal de 25 %.',
    keyConditions: [
      'CA HT annuel inférieur à 10 000 000 € sur l’exercice.',
      'Capital social intégralement libéré avant la clôture de l’exercice.',
      'Détention continue d’au moins 75 % par des personnes physiques.',
    ],
    illustrativeImpactNote:
      'Différentiel maximal légal de 4 250 € d’IS par exercice de 12 mois lorsque le bénéfice imposable atteint ou dépasse 42 500 €.',
  },
  {
    id: 'lever-rgdu-audit',
    title: 'Contrôle du paramétrage de la Réduction Générale Dégressive Unique (RGDU 2026)',
    category: 'Rémunération & Épargne Salariale',
    status: 'applicable',
    statutoryReference: 'CSS Art. L241-13 / LFSS 2025 Art. 18 / Décrets 2025-887 & 2026-509',
    officialAuthority: 'URSSAF / Légifrance',
    officialUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale.html',
    applicableYear: 2026,
    verifiedDate: '2026-11-08',
    description:
      'Audit annuel de la formule de Réduction générale dégressive unique (RGDU, entrée en vigueur le 1er janvier 2026) applicable aux salaires inférieurs à 3 SMIC (maximale au SMIC, dégressive avec exposant P = 1,75 jusqu’au seuil de sortie de 3 SMIC).',
    keyConditions: [
      'Salariés relevant du régime d’assurance chômage avec rémunération brute annuelle < 3 SMIC de référence (1 823,03 €/mois base 35h fixé pour 2026 par le Décret n° 2026-509).',
      'Application des paramètres officiels 2026 : T_min = 0,0200, T_delta = 0,3781 (< 50 salariés) ou 0,3821 (≥ 50 salariés), exposant P = 1,75.',
    ],
    illustrativeImpactNote:
      'Sécurise les allègements URSSAF 2026 (qui remplacent l’ancienne RGCP limitée à 1,6 SMIC et les anciens bandeaux maladie/allocations familiales) et prévient les erreurs de paramétrage DSN.',
  },
  {
    id: 'lever-epargne-salariale',
    title: 'Mise en place d’un Plan d’Épargne Entreprise (PEE) et Accord d’Intéressement',
    category: 'Rémunération & Épargne Salariale',
    status: 'a_analyser',
    statutoryReference: 'Code du travail Art. L3312-1 à L3332-28',
    officialAuthority: 'Service-Public Entreprendre / URSSAF',
    officialUrl: 'https://entreprendre.service-public.fr/vosdroits/F31622',
    applicableYear: 2026,
    verifiedDate: '2026-11-08',
    description:
      'Les sommes versées au titre de l’intéressement et de l’abondement employeur sur PEE/PERECO sont déductibles du bénéfice imposable à l’IS et exonérées de forfait social pour les entreprises de moins de 50 salariés (pour l’abondement et l’intéressement, ou < 250 salariés pour l’intéressement).',
    keyConditions: [
      'Présence d’au moins 1 salarié titulaire d’un contrat de travail (en sus du mandataire social) pour ouvrir le bénéfice aux dirigeants d’entreprises de 1 à 249 salariés.',
      'Caractère aléatoire et collectif de la formule de calcul de l’intéressement.',
      'Dépôt de l’accord sur la plateforme TéléAccords du ministère du Travail.',
    ],
    illustrativeImpactNote:
      'Alternative légale aux primes classiques soumises aux cotisations patronales et salariales de droit commun (simulation au cas par cas selon accord).',
  },
  {
    id: 'lever-cir-cii',
    title: 'Qualification documentaire au Crédit d’Impôt Recherche (CIR) ou Innovation (CII)',
    category: 'Crédits d’Impôt & Innovation',
    status: 'a_analyser',
    statutoryReference: 'CGI Art. 244 quater B / BOI-BIC-RICI-10-10',
    officialAuthority: 'impots.gouv.fr / BOFiP',
    officialUrl: 'https://www.impots.gouv.fr/professionnel/credit-dimpot-recherche',
    applicableYear: 2026,
    verifiedDate: '2026-11-08',
    description:
      'Recensement des heures d’ingénieurs consacrées à la levée de verrous scientifiques ou techniques (CIR : 30 % des dépenses éligibles) ou à la conception de prototypes de nouveaux produits (CII pour les PME au sens communautaire).',
    keyConditions: [
      'Justification d’un état de l’art et d’incertitudes techniques non résolues par les connaissances accessibles.',
      'Suivi analytique du temps passé par les personnels qualifiés diplômés.',
      'Constitution d’un dossier justificatif technique contemporain des travaux.',
    ],
    illustrativeImpactNote:
      'Soumis à l’éligibilité stricte des travaux R&D et à la validation du dossier scientifique. Possibilité de solliciter un rescrit fiscal préalable (Art. L80 B du LPF).',
  },
  {
    id: 'lever-modulation-acomptes-is',
    title: 'Ajustement prévisionnel des acomptes trimestriels d’IS en cas de baisse du résultat',
    category: 'Trésorerie & TVA',
    status: 'applicable',
    statutoryReference: 'CGI Art. 1668-4 bis / BOI-IS-DECLA-20-10',
    officialAuthority: 'impots.gouv.fr',
    officialUrl: 'https://www.impots.gouv.fr/professionnel/impot-sur-les-societes',
    applicableYear: 2026,
    verifiedDate: '2026-11-08',
    description:
      'Faculté légale de limiter ou suspendre le versement des acomptes trimestriels d’IS (15 mars, 15 juin, 15 septembre, 15 décembre) lorsque les acomptes déjà versés atteignent le montant de l’IS estimé de l’exercice en cours.',
    keyConditions: [
      'Établissement d’un arrêté comptable intermédiaire fiable avant l’échéance de l’acompte.',
      'Attention : une sous-estimation entraînant une insuffisance de versement expose à la majoration légale de 5 % et aux intérêts de retard (CGI Art. 1731).',
    ],
    illustrativeImpactNote:
      'Préserve la trésorerie d’exploitation sans coût financier lorsque la baisse du bénéfice imposable est documentée.',
  },
];

export const REGULATORY_DEADLINES_DEMO: RegulatoryDeadline[] = [
  {
    id: 'dl-01',
    dueDate: '2026-03-05',
    title: 'Déclaration Sociale Nominative (DSN) — Paie de février',
    authority: 'URSSAF / Net-Entreprises',
    formCode: 'DSN Mensuelle (norme NEODeS)',
    frequency: 'Mensuel',
    status: 'valide',
    illustrativeAmountEur: 24650,
    officialReferenceUrl: 'https://www.net-entreprises.fr/declaration/dsn/',
    notes: 'Échéance au 5 ou au 15 du mois M+1 selon l’effectif et la date de paiement des salaires.',
  },
  {
    id: 'dl-02',
    dueDate: '2026-03-15',
    title: '1er Acompte trimestriel d’Impôt sur les Sociétés (IS)',
    authority: 'DGFiP / impots.gouv.fr',
    formCode: 'Relevé d’acompte n° 2571-SD',
    frequency: 'Trimestriel',
    status: 'prepare',
    illustrativeAmountEur: 11250,
    officialReferenceUrl: 'https://www.impots.gouv.fr/professionnel/calendrier-fiscal',
    notes: 'Télétransmission et télérèglement obligatoires via l’espace professionnel impots.gouv.fr.',
  },
  {
    id: 'dl-03',
    dueDate: '2026-03-21',
    title: 'Déclaration et télérèglement de TVA mensuelle (Régime réel normal)',
    authority: 'DGFiP / impots.gouv.fr',
    formCode: 'Formulaire n° 3310-CA3-SD',
    frequency: 'Mensuel',
    status: 'prepare',
    illustrativeAmountEur: 16400,
    officialReferenceUrl: 'https://entreprendre.service-public.fr/vosdroits/F23566',
    notes: 'Date limite comprise entre le 15 et le 24 du mois selon le département et la forme juridique.',
  },
  {
    id: 'dl-04',
    dueDate: '2026-05-15',
    title: 'Relevé de solde d’Impôt sur les Sociétés (clôture au 31/12)',
    authority: 'DGFiP / impots.gouv.fr',
    formCode: 'Formulaire n° 2572-SD & Liasse 2065-SD',
    frequency: 'Annuel',
    status: 'a_verifier',
    illustrativeAmountEur: 5850,
    officialReferenceUrl: 'https://www.impots.gouv.fr/professionnel/impot-sur-les-societes',
    notes: 'Liquidation définitive de l’IS de l’exercice clos le 31 décembre et imputation des crédits d’impôt.',
  },
  {
    id: 'dl-05',
    dueDate: '2026-12-15',
    title: 'Solde de la Cotisation Foncière des Entreprises (CFE)',
    authority: 'DGFiP / impots.gouv.fr',
    formCode: 'Avis CFE dématérialisé',
    frequency: 'Annuel',
    status: 'a_verifier',
    illustrativeAmountEur: 3420,
    officialReferenceUrl: 'https://entreprendre.service-public.fr/vosdroits/F23547',
    notes: 'Consultable dans l’espace professionnel impots.gouv.fr avant l’échéance de décembre.',
  },
];

export type DataOriginClassification =
  | 'CALCUL_VERIFIE'
  | 'ESTIMATION'
  | 'DONNEE_FICTIVE_DEMO';

export interface SavedCalculationRecord {
  id: string;
  companyId: string;
  createdAt: string;
  title: string;
  calculationType: 'IS_CGI_219' | 'PAIE_RGDU_2026' | 'RENTABILITE_SIG';
  taxYear: 2026 | 2025;
  parameterVersion: string;
  classification: DataOriginClassification;
  inputSummary: string;
  primaryOutputLabel: string;
  primaryOutputAmountEur: number;
  secondaryOutputLabel: string;
  secondaryOutputValue: string;
  statutoryReference: string;
  isDemoScenario: boolean;
}

export interface DashboardActivityRecord {
  id: string;
  companyId: string;
  timestamp: string;
  category: 'simulation' | 'conformite' | 'optimisation' | 'dossier';
  title: string;
  detail: string;
  actor: string;
  classification: DataOriginClassification;
}

export const INITIAL_SAVED_CALCULATIONS: SavedCalculationRecord[] = [
  {
    id: 'calc-is-lumiere-2026',
    companyId: 'demo-atelier-lumiere',
    createdAt: '2026-11-08 09:15',
    title: 'Liquidation IS 2026 — Barème PME 15 % + 25 % (Scénario de clôture)',
    calculationType: 'IS_CGI_219',
    taxYear: 2026,
    parameterVersion: 'FR-2026-RGDU-REV1',
    classification: 'CALCUL_VERIFIE',
    inputSummary: 'CA HT 1 480 000 € · Résultat fiscal 225 000 € · Détention pers. physiques 85 %',
    primaryOutputLabel: 'IS total déterministe',
    primaryOutputAmountEur: 52000,
    secondaryOutputLabel: 'Taux effectif / Tranche 15 %',
    secondaryOutputValue: '23,11 % (6 375 € à 15 % + 45 625 € à 25 %)',
    statutoryReference: 'CGI Art. 219-I-b (Plafond 42 500 €)',
    isDemoScenario: true,
  },
  {
    id: 'calc-paie-lumiere-rgdu',
    companyId: 'demo-atelier-lumiere',
    createdAt: '2026-11-07 16:40',
    title: 'Embauche Ingénieur Thermique Cadre (3 450 € brut / mois)',
    calculationType: 'PAIE_RGDU_2026',
    taxYear: 2026,
    parameterVersion: 'FR-2026-RGDU-REV1',
    classification: 'ESTIMATION',
    inputSummary: 'Brut 3 450 €/mois (1,89 × SMIC) · Cadre · Effectif 11–49 sal. (< 50)',
    primaryOutputLabel: 'Coût total employeur mensuel',
    primaryOutputAmountEur: 4588.62,
    secondaryOutputLabel: 'Allègement RGDU 2026 inclus',
    secondaryOutputValue: '-213,56 € / mois (hors AT/MP & mutuelle IDCC)',
    statutoryReference: 'CSS Art. L241-13 · Décrets 2025-887 & 2026-509',
    isDemoScenario: true,
  },
  {
    id: 'calc-sig-lumiere-2026',
    companyId: 'demo-atelier-lumiere',
    createdAt: '2026-11-06 11:20',
    title: 'Cascade des SIG & Seuil de rentabilité annuel (PCG)',
    calculationType: 'RENTABILITE_SIG',
    taxYear: 2026,
    parameterVersion: 'FR-2026-RGDU-REV1',
    classification: 'DONNEE_FICTIVE_DEMO',
    inputSummary: 'CA HT 1 480 000 € · Marge brute 1 185 000 € · Masse salariale 715 000 €',
    primaryOutputLabel: 'Excédent Brut d’Exploitation (EBE)',
    primaryOutputAmountEur: 263000,
    secondaryOutputLabel: 'Point mort / Marge de sécurité',
    secondaryOutputValue: '1 198 951 € HT (296 jours · sécurité 19,0 %)',
    statutoryReference: 'Plan Comptable Général (PCG)',
    isDemoScenario: true,
  },
  {
    id: 'calc-is-parc-2026',
    companyId: 'demo-atelier-parc-sarl',
    createdAt: '2026-11-07 14:10',
    title: 'Liquidation IS 2026 — SARL Artisanale (Taux réduit PME 15 % actif)',
    calculationType: 'IS_CGI_219',
    taxYear: 2026,
    parameterVersion: 'FR-2026-RGDU-REV1',
    classification: 'CALCUL_VERIFIE',
    inputSummary: 'CA HT 620 000 € · Résultat fiscal 62 000 € · Détention 100 % pers. physiques',
    primaryOutputLabel: 'IS total déterministe',
    primaryOutputAmountEur: 11250,
    secondaryOutputLabel: 'Taux effectif d’IS',
    secondaryOutputValue: '18,15 % (6 375 € à 15 % + 4 875 € à 25 %)',
    statutoryReference: 'CGI Art. 219-I-b',
    isDemoScenario: true,
  },
  {
    id: 'calc-is-nexa-2026',
    companyId: 'demo-nexalogistique-sas',
    createdAt: '2026-11-07 10:05',
    title: 'Diagnostic IS 2026 — Exclusion du taux réduit PME (Détention 60 % < 75 %)',
    calculationType: 'IS_CGI_219',
    taxYear: 2026,
    parameterVersion: 'FR-2026-RGDU-REV1',
    classification: 'CALCUL_VERIFIE',
    inputSummary: 'CA HT 3 450 000 € · Résultat fiscal 250 000 € · Détention pers. physiques 60 %',
    primaryOutputLabel: 'IS total au taux normal (25 %)',
    primaryOutputAmountEur: 62500,
    secondaryOutputLabel: 'Écart vs scénario PME 15 %',
    secondaryOutputValue: '+4 250 € d’IS (condition Art. 219-I-b non remplie)',
    statutoryReference: 'CGI Art. 219-I & 219-I-b',
    isDemoScenario: true,
  },
];

export const INITIAL_DASHBOARD_ACTIVITIES: DashboardActivityRecord[] = [
  {
    id: 'act-01',
    companyId: 'demo-atelier-lumiere',
    timestamp: '08/11/2026 · 09:15',
    category: 'simulation',
    title: 'Calcul déterministe d’IS 2026 enregistré',
    detail: 'Vérification des 3 critères CGI Art. 219-I-b : IS total calculé à 52 000 € (taux effectif 23,11 %).',
    actor: 'Moteur déterministe FR-2026-RGDU-REV1',
    classification: 'CALCUL_VERIFIE',
  },
  {
    id: 'act-02',
    companyId: 'demo-atelier-lumiere',
    timestamp: '07/11/2026 · 16:40',
    category: 'simulation',
    title: 'Simulation d’embauche Cadre (RGDU 2026)',
    detail: 'Salaire brut 3 450 €/mois : allègement RGDU estimé à 213,56 €/mois (seuil < 3 SMIC).',
    actor: 'Module Paie & Coût employeur',
    classification: 'ESTIMATION',
  },
  {
    id: 'act-03',
    companyId: 'demo-atelier-lumiere',
    timestamp: '06/11/2026 · 15:05',
    category: 'conformite',
    title: 'DSN mensuelle (février 2026) marquée comme validée',
    detail: 'Norme NEODeS — Montant illustratif de démonstration : 24 650 €.',
    actor: 'Direction Administrative (Démo)',
    classification: 'DONNEE_FICTIVE_DEMO',
  },
  {
    id: 'act-04',
    companyId: 'demo-atelier-lumiere',
    timestamp: '05/11/2026 · 11:30',
    category: 'optimisation',
    title: 'Revue du dispositif d’épargne salariale (PEE / Intéressement)',
    detail: 'Statut maintenu sur « À analyser avec l’expert-comptable » (Code du travail Art. L3312-1).',
    actor: 'Espace Dirigeant',
    classification: 'ESTIMATION',
  },
];

