/**
 * FISCALIQ — Personal & Household Tax Dataset (Clearly Labelled Fictional Demo Profiles)
 *
 * Target audience: French employees, couples, families, single parents, students,
 * retirees, freelancers, and individual landlords.
 *
 * IMPORTANT: All household profiles and numbers below are strictly FICTIONAL DEMO DATA
 * ("EXEMPLE FICTIF DE DÉMONSTRATION"). No fake savings are ever presented as guaranteed.
 */

import {
  FamilyMaritalStatus,
  HouseholdActivityProfile,
} from '@/lib/calculations/personal-tax-engine';
import { DataOriginClassification } from './demo-dataset';

export const USER_HOUSEHOLD_ID = 'foyer-utilisateur';

export interface PersonalHouseholdProfile {
  id: string;
  isDemoData: boolean;
  householdName: string;
  situationSummary: string;
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
  activityProfile: HouseholdActivityProfile;
  employmentCategory: 'cadre' | 'non_cadre' | 'fonction_publique';
  cityRegion: string;
  housingStatus: 'Locataire' | 'Propriétaire (résidence principale)' | 'Propriétaire & Bailleur';
  grossMonthlySalaryEur: number;
  annualDeclaredSalaryNetImposableEur: number;
  additionalNetTaxableIncomeEur: number; // ex: revenus fonciers nets ou micro-BNC
  additionalIncomeLabel: string;
  monthlyEssentialExpensesEur: number; // logement, alimentation, transport, énergie
  perContributionAnnualEur: number;
  estimatedEligibleTaxCreditsEur: number;
  savingsReserveEur: number;
}

export const EMPTY_USER_HOUSEHOLD: PersonalHouseholdProfile = {
  id: USER_HOUSEHOLD_ID,
  isDemoData: false,
  householdName: 'Mon foyer',
  situationSummary: 'Célibataire · 0 enfant (1 part)',
  maritalStatus: 'celibataire',
  dependantsCount: 0,
  activityProfile: 'salarie',
  employmentCategory: 'non_cadre',
  cityRegion: 'France',
  housingStatus: 'Locataire',
  grossMonthlySalaryEur: 0,
  annualDeclaredSalaryNetImposableEur: 0,
  additionalNetTaxableIncomeEur: 0,
  additionalIncomeLabel: 'Aucun revenu annexe',
  monthlyEssentialExpensesEur: 0,
  perContributionAnnualEur: 0,
  estimatedEligibleTaxCreditsEur: 0,
  savingsReserveEur: 0,
};

export interface PersonalMonthlyBudgetPoint {
  month: string;
  netBeforeTaxEur: number;
  withholdingTaxEur: number;
  netAfterTaxDisposableEur: number;
  essentialExpensesEur: number;
  netMonthlySavingsEur: number;
}

export interface PersonalTaxAdvantageOpportunity {
  id: string;
  title: string;
  category:
    | 'Famille & Enfants'
    | 'Vie quotidienne & Domicile'
    | 'Salariés & Frais professionnels'
    | 'Épargne & Solidarité';
  mechanismType: 'Crédit d’impôt (remboursable)' | 'Réduction d’impôt' | 'Déduction du revenu imposable';
  status: 'eligible_a_verifier' | 'deja_applique' | 'non_concerne';
  statutoryReference: string;
  officialSourceUrl: string;
  applicableYear: number;
  simpleExplanation: string;
  officialRuleSummary: string;
  ceilingAndConditions: string;
}

export interface PersonalTaxCalendarItem {
  id: string;
  dueDate: string;
  periodLabel: string;
  title: string;
  formOrService: string;
  status: 'a_preparer' | 'a_verifier' | 'effectue';
  simpleExplanation: string;
  officialUrl: string;
}

export interface SavedPersonalSimulation {
  id: string;
  householdId: string;
  createdAt: string;
  title: string;
  moduleType: 'IR_FOYER' | 'SALAIRE_NET_PAS' | 'AVANTAGE_FISCAL';
  taxYear: 2026 | 2025;
  classification: DataOriginClassification;
  inputsSummary: string;
  mainResultLabel: string;
  mainResultAmountEur: number;
  secondaryDetail: string;
  statutoryRef: string;
}

export const DEMO_PERSONAL_HOUSEHOLDS: PersonalHouseholdProfile[] = [
  {
    id: 'foyer-couple-2-enfants',
    isDemoData: true,
    householdName: 'Camille & Julien (Exemple Fictif — Couple salarié, 2 enfants)',
    situationSummary: 'Mariés · 2 enfants à charge (3 parts) · Salariés du secteur privé',
    maritalStatus: 'marie_pacse',
    dependantsCount: 2,
    activityProfile: 'salarie',
    employmentCategory: 'cadre',
    cityRegion: 'Lyon (Auvergne-Rhône-Alpes)',
    housingStatus: 'Propriétaire (résidence principale)',
    grossMonthlySalaryEur: 6900,
    annualDeclaredSalaryNetImposableEur: 67800,
    additionalNetTaxableIncomeEur: 0,
    additionalIncomeLabel: 'Aucun revenu annexe',
    monthlyEssentialExpensesEur: 3150,
    perContributionAnnualEur: 1200,
    estimatedEligibleTaxCreditsEur: 1150, // Garde d'enfant < 6 ans (crédit d'impôt 50% plafonné)
    savingsReserveEur: 18400,
  },
  {
    id: 'foyer-celibataire-salarie',
    isDemoData: true,
    householdName: 'Sarah (Exemple Fictif — Salariée célibataire)',
    situationSummary: 'Célibataire · Sans enfant (1 part) · Salariée en CDI',
    maritalStatus: 'celibataire',
    dependantsCount: 0,
    activityProfile: 'salarie',
    employmentCategory: 'non_cadre',
    cityRegion: 'Nantes (Pays de la Loire)',
    housingStatus: 'Locataire',
    grossMonthlySalaryEur: 2850,
    annualDeclaredSalaryNetImposableEur: 27900,
    additionalNetTaxableIncomeEur: 0,
    additionalIncomeLabel: 'Aucun revenu annexe',
    monthlyEssentialExpensesEur: 1490,
    perContributionAnnualEur: 0,
    estimatedEligibleTaxCreditsEur: 200, // Dons aux associations (66%)
    savingsReserveEur: 7200,
  },
  {
    id: 'foyer-parent-isole',
    isDemoData: true,
    householdName: 'Karim (Exemple Fictif — Parent isolé, 1 enfant)',
    situationSummary: 'Parent isolé (Case T) · 1 enfant à charge (2 parts) · Salarié',
    maritalStatus: 'parent_isole',
    dependantsCount: 1,
    activityProfile: 'salarie',
    employmentCategory: 'cadre',
    cityRegion: 'Lille (Hauts-de-France)',
    housingStatus: 'Locataire',
    grossMonthlySalaryEur: 3400,
    annualDeclaredSalaryNetImposableEur: 33200,
    additionalNetTaxableIncomeEur: 0,
    additionalIncomeLabel: 'Aucun revenu annexe',
    monthlyEssentialExpensesEur: 1820,
    perContributionAnnualEur: 0,
    estimatedEligibleTaxCreditsEur: 600, // Garde périscolaire / emploi à domicile
    savingsReserveEur: 9500,
  },
  {
    id: 'foyer-retraite-bailleur',
    isDemoData: true,
    householdName: 'Hélène & Marc (Exemple Fictif — Retraités & Revenus locatifs)',
    situationSummary: 'Mariés · Sans personne à charge (2 parts) · Pensions + Location nue',
    maritalStatus: 'marie_pacse',
    dependantsCount: 0,
    activityProfile: 'retraite',
    employmentCategory: 'non_cadre',
    cityRegion: 'Bordeaux (Nouvelle-Aquitaine)',
    housingStatus: 'Propriétaire & Bailleur',
    grossMonthlySalaryEur: 3900,
    annualDeclaredSalaryNetImposableEur: 41500,
    additionalNetTaxableIncomeEur: 6300, // Revenu foncier net après abattement micro-foncier 30%
    additionalIncomeLabel: 'Revenus fonciers nets imposables (6 300 €/an)',
    monthlyEssentialExpensesEur: 2250,
    perContributionAnnualEur: 0,
    estimatedEligibleTaxCreditsEur: 750, // Emploi à domicile (jardinage / aide ménagère 50%)
    savingsReserveEur: 34000,
  },
];

export const PERSONAL_MONTHLY_SERIES_BASE: PersonalMonthlyBudgetPoint[] = [
  { month: 'Jan', netBeforeTaxEur: 4380, withholdingTaxEur: 195, netAfterTaxDisposableEur: 4185, essentialExpensesEur: 2820, netMonthlySavingsEur: 1365 },
  { month: 'Fév', netBeforeTaxEur: 4380, withholdingTaxEur: 195, netAfterTaxDisposableEur: 4185, essentialExpensesEur: 2790, netMonthlySavingsEur: 1395 },
  { month: 'Mar', netBeforeTaxEur: 4520, withholdingTaxEur: 205, netAfterTaxDisposableEur: 4315, essentialExpensesEur: 2860, netMonthlySavingsEur: 1455 },
  { month: 'Avr', netBeforeTaxEur: 4380, withholdingTaxEur: 195, netAfterTaxDisposableEur: 4185, essentialExpensesEur: 2840, netMonthlySavingsEur: 1345 },
  { month: 'Mai', netBeforeTaxEur: 4380, withholdingTaxEur: 195, netAfterTaxDisposableEur: 4185, essentialExpensesEur: 2810, netMonthlySavingsEur: 1375 },
  { month: 'Juin', netBeforeTaxEur: 4850, withholdingTaxEur: 220, netAfterTaxDisposableEur: 4630, essentialExpensesEur: 2950, netMonthlySavingsEur: 1680 },
  { month: 'Juil', netBeforeTaxEur: 4380, withholdingTaxEur: 195, netAfterTaxDisposableEur: 4185, essentialExpensesEur: 3120, netMonthlySavingsEur: 1065 },
  { month: 'Août', netBeforeTaxEur: 4380, withholdingTaxEur: 195, netAfterTaxDisposableEur: 4185, essentialExpensesEur: 3080, netMonthlySavingsEur: 1105 },
  { month: 'Sep', netBeforeTaxEur: 4420, withholdingTaxEur: 198, netAfterTaxDisposableEur: 4222, essentialExpensesEur: 2990, netMonthlySavingsEur: 1232 },
  { month: 'Oct', netBeforeTaxEur: 4420, withholdingTaxEur: 198, netAfterTaxDisposableEur: 4222, essentialExpensesEur: 2850, netMonthlySavingsEur: 1372 },
  { month: 'Nov', netBeforeTaxEur: 4420, withholdingTaxEur: 198, netAfterTaxDisposableEur: 4222, essentialExpensesEur: 2870, netMonthlySavingsEur: 1352 },
  { month: 'Déc', netBeforeTaxEur: 4920, withholdingTaxEur: 225, netAfterTaxDisposableEur: 4695, essentialExpensesEur: 3190, netMonthlySavingsEur: 1505 },
];

export const PERSONAL_TAX_OPPORTUNITIES: PersonalTaxAdvantageOpportunity[] = [
  {
    id: 'opp-frais-garde-enfants',
    title: 'Crédit d’impôt pour frais de garde d’enfants de moins de 6 ans',
    category: 'Famille & Enfants',
    mechanismType: 'Crédit d’impôt (remboursable)',
    status: 'deja_applique',
    statutoryReference: 'CGI Art. 200 quater B (Cases 7GA à 7GG)',
    officialSourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F8',
    applicableYear: 2026,
    simpleExplanation:
      'Si vous faites garder votre enfant de moins de 6 ans hors de votre domicile (crèche, assistante maternelle agréée, garderie périscolaire), l’État vous rembourse 50 % des sommes versées (déduction faite des aides CAF/PAJE).',
    officialRuleSummary: 'Taux officiel de 50 % des dépenses réellement supportées.',
    ceilingAndConditions:
      'Dépenses plafonnées à 3 500 € par enfant à charge (soit un crédit d’impôt maximal de 1 750 € par enfant). Enfants âgés de moins de 6 ans au 1er janvier de l’année d’imposition.',
  },
  {
    id: 'opp-emploi-domicile',
    title: 'Crédit d’impôt de 50 % pour l’emploi d’un salarié à domicile',
    category: 'Vie quotidienne & Domicile',
    mechanismType: 'Crédit d’impôt (remboursable)',
    status: 'eligible_a_verifier',
    statutoryReference: 'CGI Art. 199 sexdecies (Case 7DB)',
    officialSourceUrl: 'https://www.impots.gouv.fr/particulier/emploi-domicile',
    applicableYear: 2026,
    simpleExplanation:
      'Ménage, soutien scolaire, garde d’enfant à domicile, petits travaux de jardinage ou assistance aux personnes âgées : 50 % des dépenses engagées ouvrent droit à un crédit d’impôt, même si vous n’êtes pas imposable.',
    officialRuleSummary: 'Crédit d’impôt égal à 50 % des dépenses annuelles nettes d’aides.',
    ceilingAndConditions:
      'Plafond général de 12 000 € de dépenses par an (+ 1 500 € par enfant à charge, dans la limite de 15 000 €). Sous-plafonds spécifiques pour le jardinage (5 000 €) et le petit bricolage (500 €).',
  },
  {
    id: 'opp-frais-reels-vs-10',
    title: 'Comparaison entre l’abattement automatique de 10 % et les Frais réels',
    category: 'Salariés & Frais professionnels',
    mechanismType: 'Déduction du revenu imposable',
    status: 'eligible_a_verifier',
    statutoryReference: 'CGI Art. 83-3° (Cases 1AK à 1DK)',
    officialSourceUrl: 'https://www.impots.gouv.fr/particulier/je-declare-mes-frais-professionnels',
    applicableYear: 2026,
    simpleExplanation:
      'Par défaut, les impôts retirent automatiquement 10 % de votre salaire imposable. Si vous parcourez une distance importante pour aller travailler ou engagez des frais de repas/télétravail élevés, déclarer vos frais réels peut réduire votre revenu imposable.',
    officialRuleSummary:
      'Abattement automatique de 10 % (min. 509 €, max. 14 555 € en 2026 sur revenus 2025) ou déduction des frais réels justifiés (barème kilométrique officiel).',
    ceilingAndConditions:
      'Nécessite de conserver tous les justificatifs pendant 3 ans et d’intégrer dans le revenu imposable les remboursements de frais versés par l’employeur.',
  },
  {
    id: 'opp-dons-associations',
    title: 'Réduction d’impôt pour dons aux associations et organismes d’intérêt général',
    category: 'Épargne & Solidarité',
    mechanismType: 'Réduction d’impôt',
    status: 'deja_applique',
    statutoryReference: 'CGI Art. 200 (Cases 7UD et 7UF)',
    officialSourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F426',
    applicableYear: 2026,
    simpleExplanation:
      'Vos dons aux associations d’aide aux personnes en difficulté (repas, soins, logement) réduisent votre impôt de 75 % du montant donné. Les dons aux autres associations d’intérêt général ouvrent droit à une réduction de 66 %.',
    officialRuleSummary:
      '75 % de réduction (organismes d’aide aux personnes en difficulté, plafonné à 1 000 € de dons) et 66 % dans la limite de 20 % du revenu imposable.',
    ceilingAndConditions:
      'Attention : il s’agit d’une réduction d’impôt (et non d’un crédit remboursable). Elle diminue l’impôt dû mais n’est pas remboursée si votre impôt est déjà égal à 0 €.',
  },
  {
    id: 'opp-per-epargne-retraite',
    title: 'Versements volontaires sur un Plan d’Épargne Retraite (PER)',
    category: 'Épargne & Solidarité',
    mechanismType: 'Déduction du revenu imposable',
    status: 'eligible_a_verifier',
    statutoryReference: 'CGI Art. 163 quatervicies (Cases 6NS à 6QU)',
    officialSourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F34982',
    applicableYear: 2026,
    simpleExplanation:
      'Les sommes épargnées sur un PER individuel sont déduites de votre revenu imposable de l’année. L’allègement dépend directement de votre Tranche Marginale d’Imposition (11 %, 30 %, 41 % ou 45 %).',
    officialRuleSummary:
      'Déduction du revenu global dans la limite du plafond d’épargne retraite figurant sur votre dernier avis d’imposition (10 % des revenus professionnels de N-1).',
    ceilingAndConditions:
      'Épargne bloquée jusqu’à l’âge de la retraite (sauf cas de déblocage anticipé légal : achat de la résidence principale ou accident de la vie). Fiscalisée à la sortie.',
  },
  {
    id: 'opp-case-t-parent-isole',
    title: 'Demi-part supplémentaire de Parent Isolé (Case T de la déclaration)',
    category: 'Famille & Enfants',
    mechanismType: 'Déduction du revenu imposable',
    status: 'eligible_a_verifier',
    statutoryReference: 'CGI Art. 194-II (Case T)',
    officialSourceUrl: 'https://www.impots.gouv.fr/particulier/questions/je-vis-seul-avec-mes-enfants-quelle-case-dois-je-cocher',
    applicableYear: 2026,
    simpleExplanation:
      'Si vous vivez seul(e) au 1er janvier de l’année d’imposition et assurez la charge exclusive ou principale d’au moins un enfant, cocher la case T vous accorde une demi-part supplémentaire (soit 2 parts dès le 1er enfant).',
    officialRuleSummary:
      'Plafond d’avantage fiscal spécifique de 4 262 € pour la part entière accordée au titre du premier enfant à charge.',
    ceilingAndConditions:
      'Vous devez vivre seul(e) (sans concubinage) au 1er janvier de l’année des revenus (ou au 31 décembre en cas de séparation en cours d’année).',
  },
];

export const PERSONAL_TAX_CALENDAR_2026: PersonalTaxCalendarItem[] = [
  {
    id: 'cal-perso-01',
    dueDate: '2026-01-15',
    periodLabel: 'Mi-janvier 2026',
    title: 'Versement de l’avance de 60 % sur les crédits et réductions d’impôt récurrents',
    formOrService: 'Virement DGFiP sur votre compte bancaire',
    status: 'effectue',
    simpleExplanation:
      'Si vous avez bénéficié en N-1 d’un crédit d’impôt (garde d’enfant, emploi à domicile, dons), les impôts vous versent automatiquement un acompte de 60 % en janvier.',
    officialUrl: 'https://www.impots.gouv.fr/particulier/questions/comment-fonctionne-lavance-de-reductions-et-credits-dimpot',
  },
  {
    id: 'cal-perso-02',
    dueDate: '2026-04-10',
    periodLabel: 'Avril 2026',
    title: 'Ouverture de la déclaration en ligne des revenus 2025',
    formOrService: 'Espace Particulier sur impots.gouv.fr (Formulaire 2042)',
    status: 'a_preparer',
    simpleExplanation:
      'Vérifiez les salaires préremplis par votre employeur, indiquez vos frais de garde, dons ou frais réels, et contrôlez votre situation de famille.',
    officialUrl: 'https://www.impots.gouv.fr/particulier/declarermesrevenus',
  },
  {
    id: 'cal-perso-03',
    dueDate: '2026-05-28',
    periodLabel: 'Fin mai / début juin 2026',
    title: 'Date limite de validation de votre déclaration de revenus (selon votre département)',
    formOrService: 'Zones 1 (dép. 01-19), 2 (dép. 20-54) et 3 (dép. 55-976)',
    status: 'a_preparer',
    simpleExplanation:
      'Validez votre déclaration en ligne avant la date limite fixée pour votre département afin d’éviter la majoration de retard de 10 %.',
    officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F359',
  },
  {
    id: 'cal-perso-04',
    dueDate: '2026-07-31',
    periodLabel: 'Fin juillet / août 2026',
    title: 'Réception de votre Avis d’imposition 2026 et remboursement éventuel',
    formOrService: 'Avis d’impôt disponible dans votre Espace Particulier',
    status: 'a_verifier',
    simpleExplanation:
      'Si les montants prélevés à la source en 2025 dépassent votre impôt réel (ou grâce à vos crédits d’impôt), la DGFiP vous rembourse la différence par virement.',
    officialUrl: 'https://www.impots.gouv.fr/particulier/avis-dimpot',
  },
  {
    id: 'cal-perso-05',
    dueDate: '2026-09-01',
    periodLabel: 'Septembre 2026',
    title: 'Mise à jour automatique de votre taux de prélèvement à la source (PAS)',
    formOrService: 'Transmis automatiquement à votre employeur ou caisse de retraite',
    status: 'a_verifier',
    simpleExplanation:
      'Votre nouveau taux de prélèvement à la source calculé d’après votre déclaration du printemps s’applique sur votre fiche de paie de septembre.',
    officialUrl: 'https://www.impots.gouv.fr/particulier/gerer-mon-prelevement-la-source',
  },
];

export const INITIAL_SAVED_PERSONAL_SIMULATIONS: SavedPersonalSimulation[] = [
  {
    id: 'sim-perso-01',
    householdId: 'foyer-couple-2-enfants',
    createdAt: '08/11/2026 · 09:20',
    title: 'Calcul IR 2026 — Couple marié avec 2 enfants (3 parts fiscales)',
    moduleType: 'IR_FOYER',
    taxYear: 2026,
    classification: 'CALCUL_VERIFIE',
    inputsSummary: 'Revenus déclarés 54 800 € · Abattement 10 % (-5 480 €) · Crédit garde enfant -1 150 €',
    mainResultLabel: 'Impôt annuel net estimé',
    mainResultAmountEur: 1219,
    secondaryDetail: 'Tranche marginale (TMI) : 11 % · Taux moyen après crédit : 2,2 %',
    statutoryRef: 'CGI Art. 197 & Art. 200 quater B (Barème 2026)',
  },
  {
    id: 'sim-perso-02',
    householdId: 'foyer-celibataire-salarie',
    createdAt: '07/11/2026 · 18:15',
    title: 'Simulation Salaire Brut → Net après impôt (2 850 € brut / mois)',
    moduleType: 'SALAIRE_NET_PAS',
    taxYear: 2026,
    classification: 'ESTIMATION',
    inputsSummary: 'Célibataire (1 part) · Salaire brut 2 850 €/mois · Non-cadre',
    mainResultLabel: 'Salaire net après impôt / mois',
    mainResultAmountEur: 2116,
    secondaryDetail: 'Net avant impôt : 2 246 € · Prélèvement à la source : ~130 € / mois',
    statutoryRef: 'Barème IR 2026 & Prélèvement à la source (PAS)',
  },
  {
    id: 'sim-perso-03',
    householdId: 'foyer-parent-isole',
    createdAt: '06/11/2026 · 14:30',
    title: 'Impact de la Case T (Parent isolé avec 1 enfant — 2 parts)',
    moduleType: 'AVANTAGE_FISCAL',
    taxYear: 2026,
    classification: 'CALCUL_VERIFIE',
    inputsSummary: 'Revenu déclaré 33 200 € · Parent isolé (2 parts au lieu de 1,5 part)',
    mainResultLabel: 'Impôt final après décote et crédit',
    mainResultAmountEur: 0,
    secondaryDetail: 'Foyer non imposable grâce au quotient familial 2 parts et à la décote',
    statutoryRef: 'CGI Art. 194-II (Case T) & Art. 197-I-4 (Décote)',
  },
];
