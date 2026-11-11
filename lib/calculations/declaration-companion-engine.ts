/**
 * FISCALIQ — Moteur Déterministe du Compagnon de Déclaration Annuelle (Formulaire 2042 / 2042 RICI / 2044)
 *
 * Ce module génère une liste de contrôle personnalisée, structure les 6 étapes de préparation
 * de la déclaration de revenus des particuliers, identifie les pièces justificatives et les
 * informations manquantes, et calcule de manière déterministe le solde prévisionnel d'été
 * (reste à payer ou remboursement DGFiP) sans jamais inventer de règles ni d'échéances.
 */

import {
  calculatePersonalIncomeTax,
  FamilyMaritalStatus,
  SupportedTaxYear,
} from './personal-tax-engine';

export type DeclarationWorkflowSectionId =
  | 'SITUATION_FOYER'
  | 'REVENUS_ACTIVITE_PENSIONS_FONCIER'
  | 'FRAIS_PROFESSIONNELS'
  | 'DEDUCTIONS_REVENU_GLOBAL'
  | 'REDUCTIONS_CREDITS_IMPOT'
  | 'PRELEVEMENT_SOURCE_SOLDE';

export type ChecklistItemStatus =
  | 'verifie_pret'
  | 'a_verifier'
  | 'en_attente_justificatif'
  | 'non_concerne';

export interface SupportingDocumentGuide {
  id: string;
  title: string;
  issuer: string;
  whenAvailable: string;
  whatToCheck: string;
  associatedBoxes: string[];
  retentionRule: string;
  applicableToUser: boolean;
}

export interface DeclarationChecklistItem {
  id: string;
  sectionId: DeclarationWorkflowSectionId;
  boxCodes: string[];
  formName: 'Formulaire 2042' | 'Formulaire 2042 RICI' | 'Formulaire 2044' | 'Formulaire 2042 C PRO';
  title: string;
  isPreFilledByAdministration: boolean;
  relevanceReason: string;
  plainExplanation: string;
  whatToVerifyOrEnter: string;
  commonMistakeToAvoid: string;
  supportingDocumentTitle: string;
  suggestedAmountOrValue: string;
  statutoryReference: string;
  officialUrl: string;
  defaultStatus: ChecklistItemStatus;
  isMandatoryForProfile: boolean;
}

export interface VerifiedTaxCalendarDeadline {
  id: string;
  taxYear: SupportedTaxYear;
  incomeYear: number;
  periodLabel: string;
  datePrecisionType: 'DATE_LEGALE_FIXE' | 'CALENDRIER_CAMPAGNE_DGFIP';
  title: string;
  whoIsConcerned: string;
  plainExplanation: string;
  actionRequired: string;
  statutoryOrOfficialRef: string;
  officialUrl: string;
  verificationDate: string;
}

export interface OfficialDeclarationResource {
  id: string;
  title: string;
  authority: 'impots.gouv.fr' | 'Service-Public.fr' | 'Legifrance' | 'BOFiP';
  description: string;
  url: string;
  category: 'Portail déclaratif' | 'Notices & Formulaires' | 'Simulateur & Barèmes' | 'Correction & Droit à l’erreur';
}

export interface DeclarationCompanionInput {
  taxYear: SupportedTaxYear;
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
  hasSharedCustodyChildren: boolean;
  hasAdultChildStudent: boolean;
  hasSalaries: boolean;
  annualNetImposableSalaryEur: number;
  hasPensions: boolean;
  annualNetImposablePensionEur: number;
  hasRentalIncome: boolean;
  annualGrossRentalIncomeEur: number;
  optsForRealProfessionalExpenses: boolean;
  estimatedRealProfessionalExpensesEur: number;
  hasPerContributions: boolean;
  annualPerContributionEur: number;
  paysAlimony: boolean;
  annualAlimonyPaidEur: number;
  hasChildcareUnder6: boolean;
  annualChildcareNetOfCafEur: number;
  hasHomeServices: boolean;
  annualHomeServicesNetEur: number;
  hasCharitableDonations: boolean;
  annualDonationsEur: number;
  alreadyWithheldPasAnnualEur: number;
  january60PctAdvanceReceivedEur: number;
}

export interface DeclarationCompanionEvaluationResult {
  taxYear: SupportedTaxYear;
  incomeYear: number;
  familyQuotientParts: number;
  standard10PctSalaryDeductionEur: number;
  appliedProfessionalDeductionMode: 'abattement_10' | 'frais_reels';
  appliedProfessionalDeductionEur: number;
  netTaxableGlobalIncomeEur: number;
  marginalTaxRatePercent: number;
  averageTaxRatePercent: number;
  grossTaxAfterDecoteBeforeCreditsEur: number;
  totalReductionsAndCreditsEur: number;
  refundableCreditsEur: number;
  nonRefundableReductionsEur: number;
  finalAnnualNetIncomeTaxEur: number;
  alreadyWithheldPasAnnualEur: number;
  january60PctAdvanceReceivedEur: number;
  estimatedSummerTaxBalanceEur: number; // > 0 = Reste à payer en sept-déc ; < 0 = Remboursement par virement DGFiP en été
  balanceType: 'REMBOURSEMENT_DGFIP' | 'RESTE_A_PAYER_UNIQUE_SEPTEMBRE' | 'RESTE_A_PAYER_4_ECHEANCES' | 'EQUILIBRE';
  monthlyAutumnInstallmentEur: number;
  automaticDeclarationEligible: boolean;
  automaticDeclarationExclusionReasons: string[];
  checklistItems: DeclarationChecklistItem[];
  supportingDocuments: SupportingDocumentGuide[];
  verifiedCalendar: VerifiedTaxCalendarDeadline[];
}

export const OFFICIAL_DECLARATION_RESOURCES: OfficialDeclarationResource[] = [
  {
    id: 'res-portail-declaration',
    title: 'Rubrique « Déclarer mes revenus » — Portail officiel DGFiP',
    authority: 'impots.gouv.fr',
    description:
      'Accès officiel aux étapes de la déclaration en ligne, à la brochure pratique de l’impôt sur le revenu et aux notices explicatives.',
    url: 'https://www.impots.gouv.fr/particulier/declarermesrevenus',
    category: 'Portail déclaratif',
  },
  {
    id: 'res-service-public-2042',
    title: 'Déclaration des revenus (papier ou en ligne) : règles et délais',
    authority: 'Service-Public.fr',
    description:
      'Fiche officielle vérifiée détaillant qui doit déclarer, comment corriger une déclaration préremplie et les dates limites par département.',
    url: 'https://www.service-public.fr/particuliers/vosdroits/F359',
    category: 'Notices & Formulaires',
  },
  {
    id: 'res-simulateur-dgfip',
    title: 'Simulateur officiel de calcul de l’impôt sur le revenu',
    authority: 'impots.gouv.fr',
    description:
      'Outil officiel de la Direction générale des Finances publiques permettant de vérifier votre impôt selon les formulaires 2042 et 2042 RICI.',
    url: 'https://simulateur-ir-ifi.impots.gouv.fr/calcul_impot/2026/',
    category: 'Simulateur & Barèmes',
  },
  {
    id: 'res-corriger-declaration',
    title: 'Service « Corriger ma déclaration en ligne » & Droit à l’erreur',
    authority: 'impots.gouv.fr',
    description:
      'Guide officiel pour rectifier une erreur ou un oubli sur votre déclaration en ligne, même après réception de votre avis d’impôt en été.',
    url: 'https://www.impots.gouv.fr/particulier/questions/jai-oublie-de-declarer-un-revenu-ou-une-charge-que-faire',
    category: 'Correction & Droit à l’erreur',
  },
];

export function getVerifiedDeclarationCalendar(
  taxYear: SupportedTaxYear = 2026
): VerifiedTaxCalendarDeadline[] {
  const incomeYear = taxYear - 1;
  return [
    {
      id: `cal-decl-jan-${taxYear}`,
      taxYear,
      incomeYear,
      periodLabel: `Mi-janvier ${taxYear}`,
      datePrecisionType: 'DATE_LEGALE_FIXE',
      title: 'Versement de l’avance de 60 % des crédits et réductions d’impôt récurrents',
      whoIsConcerned:
        'Foyers ayant déclaré en N-1 des frais de garde d’enfant (< 6 ans), un emploi à domicile ou des dons aux associations.',
      plainExplanation:
        'La DGFiP verse automatiquement par virement bancaire un acompte égal à 60 % des réductions et crédits d’impôt récurrents accordés l’année précédente (CGI Art. 1665 bis).',
      actionRequired:
        'Notez le montant reçu en janvier : il sera automatiquement déduit du remboursement final calculé cet été lors de votre avis d’impôt.',
      statutoryOrOfficialRef: 'CGI Art. 1665 bis — Avance de 60 %',
      officialUrl:
        'https://www.impots.gouv.fr/particulier/questions/comment-fonctionne-lavance-de-reductions-et-credits-dimpot',
      verificationDate: '2026-11-10',
    },
    {
      id: `cal-decl-avr-${taxYear}`,
      taxYear,
      incomeYear,
      periodLabel: `Mi-avril ${taxYear}`,
      datePrecisionType: 'CALENDRIER_CAMPAGNE_DGFIP',
      title: `Ouverture du service de déclaration en ligne des revenus ${incomeYear}`,
      whoIsConcerned: 'Tous les contribuables résidant en France (imposables ou non imposables).',
      plainExplanation:
        'Le service de télédéclaration ouvre chaque année à la mi-avril sur impots.gouv.fr. Les salaires, retraites et allocations transmis par les tiers déclarants sont préremplis.',
      actionRequired:
        'Rassemblez vos attestations fiscales annuelles (bulletin de paie de décembre, PAJEMPLOI/crèche, URSSAF emploi à domicile, reçus de dons) et vérifiez les montants préremplis.',
      statutoryOrOfficialRef: 'CGI Art. 170 & Calendrier annuel DGFiP',
      officialUrl: 'https://www.impots.gouv.fr/particulier/declarermesrevenus',
      verificationDate: '2026-11-10',
    },
    {
      id: `cal-decl-mai-juin-${taxYear}`,
      taxYear,
      incomeYear,
      periodLabel: `Fin mai à début juin ${taxYear} (selon département)`,
      datePrecisionType: 'CALENDRIER_CAMPAGNE_DGFIP',
      title: 'Dates limites de validation de la déclaration en ligne par zone géographique',
      whoIsConcerned:
        'Zone 1 (départements 01 à 19 et non-résidents), Zone 2 (départements 20 à 54), Zone 3 (départements 55 à 976). Déclaration papier : mi-mai.',
      plainExplanation:
        'Les dates exactes de clôture par zone sont publiées chaque printemps par arrêté ministériel. Toute déclaration déposée hors délai s’expose à une majoration légale de 10 % (CGI Art. 1728).',
      actionRequired:
        'Signez électroniquement votre déclaration avant la date limite de votre département (même si vous n’avez aucun impôt à payer).',
      statutoryOrOfficialRef: 'CGI Art. 175 & Art. 1728 / Service-Public.fr F359',
      officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F359',
      verificationDate: '2026-11-10',
    },
    {
      id: `cal-decl-juil-aout-${taxYear}`,
      taxYear,
      incomeYear,
      periodLabel: `Fin juillet à août ${taxYear}`,
      datePrecisionType: 'CALENDRIER_CAMPAGNE_DGFIP',
      title: 'Mise à disposition de l’Avis d’impôt et virement des remboursements DGFiP',
      whoIsConcerned:
        'Tous les foyers fiscaux ; remboursement automatique en cas de trop-perçu de prélèvement à la source ou de solde de crédit d’impôt.',
      plainExplanation:
        'L’administration compare l’impôt définitif calculé sur vos revenus déclarés avec les retenues à la source déjà prélevées en N-1 et l’avance de 60 % versée en janvier.',
      actionRequired:
        'Téléchargez votre avis d’imposition (indispensable pour vos démarches CAF, banque, crèche) et vérifiez votre coordonnée bancaire RIB sur impots.gouv.fr.',
      statutoryOrOfficialRef: 'CGI Art. 204 K & Avis d’impôt DGFiP',
      officialUrl: 'https://www.impots.gouv.fr/particulier/avis-dimpot',
      verificationDate: '2026-11-10',
    },
    {
      id: `cal-decl-sept-dec-${taxYear}`,
      taxYear,
      incomeYear,
      periodLabel: `Septembre à décembre ${taxYear}`,
      datePrecisionType: 'DATE_LEGALE_FIXE',
      title: 'Actualisation du taux PAS et prélèvement du solde d’impôt éventuel',
      whoIsConcerned:
        'Tous les foyers pour l’actualisation du taux PAS au 1er septembre ; foyers ayant un reste à payer pour les échéances d’automne.',
      plainExplanation:
        'Au 1er septembre, votre nouveau taux de prélèvement à la source (ou le taux individualisé par défaut des couples) est transmis à votre employeur. Si vous avez un solde d’impôt à régler : il est prélevé en 1 seule fois en septembre s’il est ≤ 300 €, ou étalé automatiquement en 4 prélèvements égaux (septembre, octobre, novembre, décembre) s’il dépasse 300 €.',
      actionRequired:
        'En cas d’oubli constaté sur votre avis d’impôt, utilisez le service « Corriger ma déclaration en ligne » ouvert d’août à début décembre.',
      statutoryOrOfficialRef: 'CGI Art. 1663 C & Art. 204 E / 204 M',
      officialUrl:
        'https://www.impots.gouv.fr/particulier/questions/jai-un-solde-dimpot-payer-comment-sera-t-il-preleve',
      verificationDate: '2026-11-10',
    },
  ];
}

export function evaluateDeclarationCompanion(
  input: DeclarationCompanionInput
): DeclarationCompanionEvaluationResult {
  const taxYear = input.taxYear;
  const incomeYear = taxYear - 1;

  // 1. Calcul de l'abattement de 10 % sur les salaires (plancher 509 €, plafond 14 555 € en 2026)
  const floor10 = taxYear === 2026 ? 509 : 499;
  const ceiling10 = taxYear === 2026 ? 14555 : 13522;
  const raw10 = Math.round(input.annualNetImposableSalaryEur * 0.1);
  const standard10PctSalaryDeductionEur =
    input.annualNetImposableSalaryEur > 0
      ? Math.min(ceiling10, Math.max(floor10, raw10))
      : 0;

  const useRealExpenses =
    input.optsForRealProfessionalExpenses &&
    input.estimatedRealProfessionalExpensesEur > standard10PctSalaryDeductionEur;

  const appliedProfessionalDeductionMode: 'abattement_10' | 'frais_reels' =
    useRealExpenses ? 'frais_reels' : 'abattement_10';

  const appliedProfessionalDeductionEur = useRealExpenses
    ? Math.round(input.estimatedRealProfessionalExpensesEur)
    : standard10PctSalaryDeductionEur;

  // 2. Pensions de retraite (abattement de 10 % plafonné à 4 439 € par foyer en 2026)
  const pensionCeiling = taxYear === 2026 ? 4439 : 4399;
  const pensionFloor = taxYear === 2026 ? 454 : 450;
  const rawPension10 = Math.round(input.annualNetImposablePensionEur * 0.1);
  const pensionDeductionEur =
    input.hasPensions && input.annualNetImposablePensionEur > 0
      ? Math.min(
          pensionCeiling,
          Math.max(
            Math.min(pensionFloor, input.annualNetImposablePensionEur),
            rawPension10
          )
        )
      : 0;
  const netTaxablePensionEur = Math.max(
    0,
    input.annualNetImposablePensionEur - pensionDeductionEur
  );

  // 3. Revenus fonciers (Micro-foncier abattement 30 % par défaut si ≤ 15 000 €)
  const netTaxableRentalEur =
    input.hasRentalIncome && input.annualGrossRentalIncomeEur > 0
      ? Math.round(input.annualGrossRentalIncomeEur * 0.7)
      : 0;

  // 4. Déductions du revenu global (Pension alimentaire plafonnée à 6 794 € + PER)
  const alimonyCeiling = taxYear === 2026 ? 6794 : 6733;
  const deductibleAlimonyEur =
    input.paysAlimony && input.annualAlimonyPaidEur > 0
      ? Math.min(alimonyCeiling, Math.round(input.annualAlimonyPaidEur))
      : 0;

  const deductiblePerEur =
    input.hasPerContributions && input.annualPerContributionEur > 0
      ? Math.round(input.annualPerContributionEur)
      : 0;

  // 5. Réductions d'impôt (non remboursables : Dons 66 %) vs Crédits d'impôt (remboursables : Garde < 6 ans 50 % plafonné 3 500 €, Emploi à domicile 50 % plafonné 12 000 €)
  const nonRefundableDonationsReductionEur =
    input.hasCharitableDonations && input.annualDonationsEur > 0
      ? Math.round(input.annualDonationsEur * 0.66)
      : 0;

  const childcareCap = 3500 * Math.max(1, input.dependantsCount);
  const childcareCreditEur =
    input.hasChildcareUnder6 && input.annualChildcareNetOfCafEur > 0
      ? Math.round(Math.min(childcareCap, input.annualChildcareNetOfCafEur) * 0.5)
      : 0;

  const homeServicesCap = Math.min(15000, 12000 + input.dependantsCount * 1500);
  const homeServicesCreditEur =
    input.hasHomeServices && input.annualHomeServicesNetEur > 0
      ? Math.round(Math.min(homeServicesCap, input.annualHomeServicesNetEur) * 0.5)
      : 0;

  const refundableCreditsEur = childcareCreditEur + homeServicesCreditEur;
  const totalReductionsAndCreditsEur =
    nonRefundableDonationsReductionEur + refundableCreditsEur;

  // 6. Appel au moteur déterministe IR
  const baseIrCalc = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: input.annualNetImposableSalaryEur,
    additionalTaxableIncomeEur: Math.max(
      0,
      netTaxablePensionEur + netTaxableRentalEur - deductibleAlimonyEur
    ),
    maritalStatus: input.maritalStatus,
    dependantsCount: input.dependantsCount,
    expenseDeductionMode: appliedProfessionalDeductionMode,
    realExpensesAmountEur: useRealExpenses
      ? appliedProfessionalDeductionEur
      : undefined,
    perDeductibleContributionEur: deductiblePerEur,
    estimatedTaxCreditsEur: 0,
    taxYear,
  });

  const grossTaxAfterDecoteBeforeCreditsEur = baseIrCalc.taxBeforeCreditsEur;
  const appliedNonRefundableReductionEur = Math.min(
    grossTaxAfterDecoteBeforeCreditsEur,
    nonRefundableDonationsReductionEur
  );
  const taxAfterNonRefundableEur = Math.max(
    0,
    grossTaxAfterDecoteBeforeCreditsEur - appliedNonRefundableReductionEur
  );

  // Impôt annuel net (peut être 0 si les crédits remboursables couvrent l'impôt)
  const finalAnnualNetIncomeTaxEur = Math.max(
    0,
    taxAfterNonRefundableEur - refundableCreditsEur
  );

  // Solde d'été DGFiP :
  // Impôt dû après réductions non remboursables - Crédits remboursables - PAS déjà prélevé - (+ Avance 60 % déjà reçue en janvier à régulariser)
  const netFiscalLiabilityOrCreditSignedEur =
    taxAfterNonRefundableEur - refundableCreditsEur;
  const estimatedSummerTaxBalanceEur = Math.round(
    netFiscalLiabilityOrCreditSignedEur -
      input.alreadyWithheldPasAnnualEur +
      input.january60PctAdvanceReceivedEur
  );

  let balanceType: DeclarationCompanionEvaluationResult['balanceType'] = 'EQUILIBRE';
  let monthlyAutumnInstallmentEur = 0;

  if (estimatedSummerTaxBalanceEur < -5) {
    balanceType = 'REMBOURSEMENT_DGFIP';
  } else if (estimatedSummerTaxBalanceEur > 300) {
    balanceType = 'RESTE_A_PAYER_4_ECHEANCES';
    monthlyAutumnInstallmentEur = Math.round(estimatedSummerTaxBalanceEur / 4);
  } else if (estimatedSummerTaxBalanceEur > 5) {
    balanceType = 'RESTE_A_PAYER_UNIQUE_SEPTEMBRE';
    monthlyAutumnInstallmentEur = estimatedSummerTaxBalanceEur;
  }

  const averageTaxRatePercent =
    baseIrCalc.netTaxableIncomeEur > 0
      ? Math.round(
          (finalAnnualNetIncomeTaxEur / baseIrCalc.netTaxableIncomeEur) * 1000
        ) / 10
      : 0;

  // 7. Vérification de l'éligibilité à la déclaration automatique (CGI Art. 171)
  const automaticDeclarationExclusionReasons: string[] = [];
  if (useRealExpenses) {
    automaticDeclarationExclusionReasons.push(
      'Option pour la déduction des frais professionnels réels (cases 1AK / 1BK).'
    );
  }
  if (input.hasRentalIncome) {
    automaticDeclarationExclusionReasons.push(
      'Perception de revenus fonciers / locatifs (case 4BE ou déclaration 2044) à renseigner.'
    );
  }
  if (
    input.hasChildcareUnder6 ||
    input.hasHomeServices ||
    input.hasCharitableDonations
  ) {
    automaticDeclarationExclusionReasons.push(
      'Présence de réductions ou crédits d’impôt (garde d’enfant, emploi à domicile, dons) à vérifier ou déclarer sur la 2042 RICI.'
    );
  }
  if (input.paysAlimony || input.hasPerContributions) {
    automaticDeclarationExclusionReasons.push(
      'Charges déductibles du revenu global (pension alimentaire ou versements PER) à inscrire.'
    );
  }
  if (input.maritalStatus === 'parent_isole') {
    automaticDeclarationExclusionReasons.push(
      'Vérification annuelle obligatoire de la case T (parent isolé vivant seul avec enfant à charge).'
    );
  }

  // 8. Construction des justificatifs personnalisés
  const supportingDocuments: SupportingDocumentGuide[] = [
    {
      id: 'doc-guide-paie-decembre',
      title: 'Bulletin de paie de décembre & Attestation fiscale annuelle employeur',
      issuer: 'Votre employeur (ou portail RH / coffre-fort numérique)',
      whenAvailable: `Janvier à mars ${taxYear}`,
      whatToCheck:
        'Repérez la ligne « Cumul net imposable annuel » au bas du bulletin de décembre et comparez-la au montant prérempli en case 1AJ / 1BJ.',
      associatedBoxes: ['1AJ', '1BJ', '8HV', '8IV'],
      retentionRule: 'À conserver 3 ans (ne pas joindre à la déclaration en ligne).',
      applicableToUser: input.hasSalaries,
    },
    {
      id: 'doc-guide-pension-retraite',
      title: 'Attestation fiscale annuelle des caisses de retraite (CNAV / AGIRC-ARRCO)',
      issuer: 'info-retraite.fr / L’Assurance Retraite / AGIRC-ARRCO',
      whenAvailable: `Février à mars ${taxYear}`,
      whatToCheck:
        'Vérifiez le montant net imposable annuel des pensions prérempli en cases 1AS / 1BS avant l’abattement automatique de 10 %.',
      associatedBoxes: ['1AS', '1BS'],
      retentionRule: 'À conserver 3 ans.',
      applicableToUser: input.hasPensions,
    },
    {
      id: 'doc-guide-garde-enfant',
      title: 'Attestation fiscale annuelle PAJEMPLOI (CAF) ou facture annuelle de la crèche',
      issuer: 'URSSAF Pajemploi / Crèche municipale ou privée / Accueil périscolaire',
      whenAvailable: `Mars à avril ${taxYear}`,
      whatToCheck:
        'Prenez uniquement le montant resté réellement à votre charge après déduction du Complément de libre choix du mode de garde (CMG de la CAF) et des aides employeur (CESU préfinancé).',
      associatedBoxes: ['7GA', '7GB', '7GC'],
      retentionRule: 'À conserver 3 ans en cas de contrôle sur pièces.',
      applicableToUser: input.hasChildcareUnder6,
    },
    {
      id: 'doc-guide-emploi-domicile',
      title: 'Attestation fiscale annuelle URSSAF CESU ou de l’organisme de services à la personne',
      issuer: 'URSSAF CESU / Prestataire agréé de services à domicile',
      whenAvailable: `Février à avril ${taxYear}`,
      whatToCheck:
        'Vérifiez les dépenses nettes d’aides (et hors avance immédiate URSSAF déjà déduite) ainsi que la nature de l’organisme prestataire.',
      associatedBoxes: ['7DB', '7DR', '7DL'],
      retentionRule: 'À conserver 3 ans.',
      applicableToUser: input.hasHomeServices,
    },
    {
      id: 'doc-guide-dons-cerfa',
      title: 'Reçus fiscaux de dons aux associations et fondations (Cerfa n° 11580)',
      issuer: 'Associations d’aide aux personnes en difficulté ou d’intérêt général',
      whenAvailable: 'Dès le versement ou en début d’année suivante',
      whatToCheck:
        'Distinguez les dons aux organismes d’aide aux personnes en difficulté (75 % en case 7UD jusqu’à 1 000 €) des dons d’intérêt général (66 % en case 7UF).',
      associatedBoxes: ['7UD', '7UF'],
      retentionRule: 'Conserver les reçus Cerfa pendant 3 ans (contrôle fréquent).',
      applicableToUser: input.hasCharitableDonations,
    },
    {
      id: 'doc-guide-per-ifu',
      title: 'Imprimé Fiscal Unique (IFU — Formulaire 2561) & Attestation de versements PER',
      issuer: 'Votre banque, assureur ou gestionnaire d’épargne retraite + dernier Avis d’impôt',
      whenAvailable: `Mars à avril ${taxYear}`,
      whatToCheck:
        'Vérifiez le montant versé en case 6NS/6NT et contrôlez votre « Plafond épargne retraite » figurant à la fin de votre dernier avis d’impôt.',
      associatedBoxes: ['6NS', '6NT', '6QR'],
      retentionRule: 'À conserver 3 ans.',
      applicableToUser: input.hasPerContributions,
    },
    {
      id: 'doc-guide-revenus-fonciers',
      title: 'Récapitulatif annuel des loyers encaissés, avis de taxe foncière & factures de travaux',
      issuer: 'Gestionnaire locatif / Quittances / Syndic de copropriété / Banque',
      whenAvailable: `Janvier à avril ${taxYear}`,
      whatToCheck:
        'Additionnez les loyers bruts hors charges locatives. Si ≤ 15 000 €, comparez l’abattement micro-foncier de 30 % (case 4BE) avec vos charges réelles (formulaire 2044).',
      associatedBoxes: ['4BE', '4BA', '4BB', '4BC'],
      retentionRule: 'À conserver 3 ans (ou jusqu’à 3 ans après la fin d’imputation d’un déficit foncier).',
      applicableToUser: input.hasRentalIncome,
    },
    {
      id: 'doc-guide-frais-reels-pension',
      title: 'Justificatifs de frais réels (carte grise, factures repas) ou de pension alimentaire',
      issuer: 'Salarié (calcul kilométrique, factures) / Preuves de virements bancaires',
      whenAvailable: `Toute l’année ${incomeYear}`,
      whatToCheck:
        'Pour les frais réels : puissance fiscale sur la carte grise et distance domicile-travail (max 40 km aller simple par défaut). Pour une pension alimentaire : preuves de versement et état de besoin du bénéficiaire.',
      associatedBoxes: ['1AK', '1BK', '6EL', '6GU'],
      retentionRule: 'À conserver impérativement pendant 3 ans.',
      applicableToUser: input.optsForRealProfessionalExpenses || input.paysAlimony,
    },
  ];

  // 9. Construction de la liste de contrôle personnalisée à travers les 6 sections du workflow
  const checklistItems: DeclarationChecklistItem[] = [];

  // SECTION 1 : SITUATION DU FOYER
  checklistItems.push({
    id: 'chk-foyer-statut',
    sectionId: 'SITUATION_FOYER',
    boxCodes: ['Cases M / O / C / D / V'],
    formName: 'Formulaire 2042',
    title: 'État civil, situation familiale et nombre de parts du foyer',
    isPreFilledByAdministration: true,
    relevanceReason: `Foyer de ${baseIrCalc.familyQuotientParts} part(s) fiscale(s).`,
    plainExplanation:
      'Votre situation de famille est appréciée au 1er janvier de l’année des revenus (ou au 31 décembre en cas de mariage, PACS, divorce ou naissance en cours d’année).',
    whatToVerifyOrEnter:
      'Vérifiez que votre situation maritale et le nombre d’enfants à charge (cases F pour résidence exclusive, H pour garde alternée) sont exacts.',
    commonMistakeToAvoid:
      'En concubinage (union libre), chaque parent dépose une déclaration séparée : les enfants ne peuvent pas être comptés à charge à 100 % sur les deux déclarations.',
    supportingDocumentTitle: 'Livret de famille / Convention de PACS ou jugement',
    suggestedAmountOrValue: `${baseIrCalc.familyQuotientParts} part(s) fiscale(s)`,
    statutoryReference: 'CGI Art. 194 & 196',
    officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2705',
    defaultStatus: 'verifie_pret',
    isMandatoryForProfile: true,
  });

  if (input.maritalStatus === 'parent_isole' || (input.dependantsCount > 0 && input.maritalStatus !== 'marie_pacse')) {
    checklistItems.push({
      id: 'chk-foyer-case-t',
      sectionId: 'SITUATION_FOYER',
      boxCodes: ['Case T'],
      formName: 'Formulaire 2042',
      title: 'Case T — Parent isolé vivant seul avec enfant(s) à charge',
      isPreFilledByAdministration: false,
      relevanceReason: 'Vous déclarez un ou plusieurs enfants à charge sans être marié(e) ni pacsé(e).',
      plainExplanation:
        'Si vous viviez seul(e) au 1er janvier et assumiez à titre exclusif ou principal la charge d’au moins un enfant, la case T accorde une demi-part supplémentaire (plafonnée à 4 262 € pour la 1re part).',
      whatToVerifyOrEnter:
        'Vérifiez que la case T est bien cochée à l’étape 2 de la déclaration en ligne si vous ne vivez pas en concubinage.',
      commonMistakeToAvoid:
        'La case T n’est pas toujours reconduite automatiquement : un oubli fait perdre jusqu’à 0,5 part fiscale.',
      supportingDocumentTitle: 'Déclaration sur l’honneur de vie seule (case T)',
      suggestedAmountOrValue:
        input.maritalStatus === 'parent_isole' ? 'À cocher (+0,5 part)' : 'À vérifier selon vie seule au 01/01',
      statutoryReference: 'CGI Art. 194-II',
      officialUrl:
        'https://www.impots.gouv.fr/particulier/questions/je-vis-seul-avec-mes-enfants-quelle-case-dois-je-cocher',
      defaultStatus: input.maritalStatus === 'parent_isole' ? 'a_verifier' : 'non_concerne',
      isMandatoryForProfile: input.maritalStatus === 'parent_isole',
    });
  }

  if (input.hasAdultChildStudent) {
    checklistItems.push({
      id: 'chk-foyer-enfant-majeur',
      sectionId: 'SITUATION_FOYER',
      boxCodes: ['Case J', 'Case 7EA / 7EC / 7EF'],
      formName: 'Formulaire 2042',
      title: 'Enfant majeur étudiant (< 25 ans) : Rattachement (case J) & Réduction frais de scolarité',
      isPreFilledByAdministration: false,
      relevanceReason: 'Vous avez indiqué un enfant étudiant ou scolarisé.',
      plainExplanation:
        'Un enfant majeur de moins de 25 ans poursuivant des études peut demander son rattachement à votre foyer (case J) et ouvrir droit à la réduction d’impôt pour frais de scolarité (61 € collège, 153 € lycée, 183 € enseignement supérieur).',
      whatToVerifyOrEnter:
        'Comparez le gain du rattachement (+0,5 ou +1 part + réduction scolarité 183 €) avec la déduction d’une pension alimentaire (jusqu’à 6 794 € en case 6EL si non rattaché). Les cases 7EA/7EC/7EF ne sont jamais préremplies.',
      commonMistakeToAvoid:
        'Interdiction absolue de cumuler le rattachement d’un enfant (case J) et la déduction d’une pension alimentaire (case 6EL) pour ce même enfant.',
      supportingDocumentTitle: 'Certificat de scolarité & demande de rattachement signée par l’enfant majeur',
      suggestedAmountOrValue: 'Arbitrage Case J vs Case 6EL + Case 7EF (183 €)',
      statutoryReference: 'CGI Art. 6-3, Art. 156-II-2° & Art. 199 quater F',
      officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F1228',
      defaultStatus: 'a_verifier',
      isMandatoryForProfile: true,
    });
  }

  // SECTION 2 : REVENUS D'ACTIVITÉ, PENSIONS & FONCIER
  if (input.hasSalaries) {
    checklistItems.push({
      id: 'chk-rev-salaires',
      sectionId: 'REVENUS_ACTIVITE_PENSIONS_FONCIER',
      boxCodes: ['Cases 1AJ / 1BJ', 'Cases 1GH / 1HH'],
      formName: 'Formulaire 2042',
      title: 'Salaires nets imposables annuels préremplis',
      isPreFilledByAdministration: true,
      relevanceReason: 'Vous percevez des salaires ou traitements.',
      plainExplanation:
        'Vos employeurs transmettent directement à la DGFiP votre cumul annuel de salaire net imposable. Vous devez toutefois contrôler ce montant.',
      whatToVerifyOrEnter:
        'Comparez le montant inscrit en case 1AJ (et 1BJ pour le conjoint) avec le cumul net imposable figurant sur votre bulletin de paie de décembre. Vérifiez que vos éventuelles heures supplémentaires exonérées figurent bien à part en case 1GH (dans la limite de 7 500 € nets imposables).',
      commonMistakeToAvoid:
        'Ne remplacez jamais le montant prérempli par votre « salaire net payé en banque » : c’est bien le « salaire net imposable » qui doit figurer en 1AJ.',
      supportingDocumentTitle: 'Bulletin de paie de décembre & attestation fiscale employeur',
      suggestedAmountOrValue: `${input.annualNetImposableSalaryEur.toLocaleString('fr-FR')} €`,
      statutoryReference: 'CGI Art. 79 & Art. 81 quater',
      officialUrl: 'https://www.impots.gouv.fr/particulier/questions/comment-declarer-mes-salaires',
      defaultStatus: 'verifie_pret',
      isMandatoryForProfile: true,
    });
  }

  if (input.hasPensions) {
    checklistItems.push({
      id: 'chk-rev-pensions',
      sectionId: 'REVENUS_ACTIVITE_PENSIONS_FONCIER',
      boxCodes: ['Cases 1AS / 1BS'],
      formName: 'Formulaire 2042',
      title: 'Pensions de retraite et rentes imposables',
      isPreFilledByAdministration: true,
      relevanceReason: 'Vous percevez des pensions de retraite.',
      plainExplanation:
        'Les pensions de base et complémentaires sont préremplies en cases 1AS / 1BS. L’administration applique automatiquement l’abattement de 10 % (plafonné à 4 439 € pour l’ensemble du foyer en 2026).',
      whatToVerifyOrEnter:
        'Vérifiez la concordance avec le relevé fiscal annuel disponible sur info-retraite.fr.',
      commonMistakeToAvoid:
        'Ne déduisez pas vous-même l’abattement de 10 % avant de remplir la case 1AS : il est calculé automatiquement par la DGFiP.',
      supportingDocumentTitle: 'Attestation fiscale annuelle des caisses de retraite',
      suggestedAmountOrValue: `${input.annualNetImposablePensionEur.toLocaleString('fr-FR')} € (abattement auto : -${pensionDeductionEur.toLocaleString('fr-FR')} €)`,
      statutoryReference: 'CGI Art. 79 & Art. 158-5-a',
      officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F417',
      defaultStatus: 'a_verifier',
      isMandatoryForProfile: true,
    });
  }

  if (input.hasRentalIncome) {
    checklistItems.push({
      id: 'chk-rev-foncier',
      sectionId: 'REVENUS_ACTIVITE_PENSIONS_FONCIER',
      boxCodes: ['Case 4BE', 'Cases 4BA / 4BB / 4BC'],
      formName: input.annualGrossRentalIncomeEur > 15000 ? 'Formulaire 2044' : 'Formulaire 2042',
      title: 'Revenus fonciers (Location non meublée : Micro-foncier 30 % vs Régime réel)',
      isPreFilledByAdministration: false,
      relevanceReason: 'Vous déclarez des revenus locatifs.',
      plainExplanation:
        'Les revenus locatifs ne sont jamais préremplis. Jusqu’à 15 000 € de loyers bruts hors charges par an, vous pouvez inscrire le montant brut en case 4BE (abattement automatique de 30 %). Si vos charges réelles dépassent 30 % ou si vos loyers dépassent 15 000 €, utilisez la déclaration annexe 2044.',
      whatToVerifyOrEnter:
        'Additionnez les loyers hors charges encaissés sur l’année civile (sans compter le dépôt de garantie ni les provisions pour charges récupérables).',
      commonMistakeToAvoid:
        'En micro-foncier (case 4BE), inscrivez le loyer brut encaissé sans déduire vous-même les 30 %.',
      supportingDocumentTitle: 'Récapitulatif annuel des loyers, avis de taxe foncière & factures de travaux',
      suggestedAmountOrValue: `${input.annualGrossRentalIncomeEur.toLocaleString('fr-FR')} € bruts (net imposable micro-foncier : ${netTaxableRentalEur.toLocaleString('fr-FR')} €)`,
      statutoryReference: 'CGI Art. 28, 31 & 32',
      officialUrl: 'https://www.impots.gouv.fr/particulier/les-revenus-fonciers',
      defaultStatus: 'en_attente_justificatif',
      isMandatoryForProfile: true,
    });
  }

  // SECTION 3 : FRAIS PROFESSIONNELS
  if (input.hasSalaries) {
    checklistItems.push({
      id: 'chk-frais-pro',
      sectionId: 'FRAIS_PROFESSIONNELS',
      boxCodes: ['Cases 1AK / 1BK'],
      formName: 'Formulaire 2042',
      title: 'Choix entre l’abattement automatique de 10 % et les Frais professionnels réels',
      isPreFilledByAdministration: false,
      relevanceReason: `Votre abattement automatique de 10 % s’élève à ${standard10PctSalaryDeductionEur.toLocaleString('fr-FR')} €.`,
      plainExplanation:
        useRealExpenses
          ? `Vos frais réels estimés (${appliedProfessionalDeductionEur.toLocaleString('fr-FR')} €) dépassent votre abattement automatique de 10 % (${standard10PctSalaryDeductionEur.toLocaleString('fr-FR')} €) : l’option pour les frais réels en case 1AK est plus avantageuse.`
          : `L’abattement automatique de 10 % (${standard10PctSalaryDeductionEur.toLocaleString('fr-FR')} €) est plus élevé ou égal à vos frais réels : laissez les cases 1AK / 1BK vides pour conserver l’abattement automatique sans justificatif.`,
      whatToVerifyOrEnter:
        useRealExpenses
          ? 'Inscrivez le total de vos frais réels en case 1AK/1BK, joignez une note explicative dans l’espace prévu en ligne, et réintégrez en 1AJ les remboursements de frais employeur.'
          : 'Laissez les cases 1AK et 1BK strictement vides : les 10 % sont déduits automatiquement.',
      commonMistakeToAvoid:
        'Ne remplissez jamais la case 1AK si vos frais réels sont inférieurs à 10 % de votre salaire imposable, car la saisie en 1AK annule l’abattement automatique de 10 %.',
      supportingDocumentTitle: 'Carte grise du véhicule, justificatifs kilométriques et factures de repas',
      suggestedAmountOrValue: useRealExpenses
        ? `Option Frais réels : ${appliedProfessionalDeductionEur.toLocaleString('fr-FR')} € (Case 1AK)`
        : `Conserver l’abattement 10 % auto (${standard10PctSalaryDeductionEur.toLocaleString('fr-FR')} €)`,
      statutoryReference: 'CGI Art. 83-3°',
      officialUrl: 'https://www.impots.gouv.fr/particulier/frais-de-transport',
      defaultStatus: useRealExpenses ? 'en_attente_justificatif' : 'verifie_pret',
      isMandatoryForProfile: true,
    });
  }

  // SECTION 4 : DÉDUCTIONS DU REVENU GLOBAL
  if (input.hasPerContributions) {
    checklistItems.push({
      id: 'chk-ded-per',
      sectionId: 'DEDUCTIONS_REVENU_GLOBAL',
      boxCodes: ['Cases 6NS / 6NT', 'Case 6QR'],
      formName: 'Formulaire 2042',
      title: 'Versements volontaires sur un Plan d’Épargne Retraite (PER)',
      isPreFilledByAdministration: true,
      relevanceReason: `Versement annuel déclaré : ${deductiblePerEur.toLocaleString('fr-FR')} €.`,
      plainExplanation:
        'Les cotisations versées sur un PER individuel sont déduites de votre revenu global imposable dans la limite de votre plafond d’épargne retraite (indiqué sur votre dernier avis d’impôt).',
      whatToVerifyOrEnter:
        'Vérifiez que le montant figure bien en case 6NS/6NT et cochez la case 6QR si vous êtes marié(e) ou pacsé(e) et souhaitez mutualiser vos plafonds de déduction entre conjoints.',
      commonMistakeToAvoid:
        'Même si le montant est parfois prérempli grâce à l’IFU de l’assureur, vérifiez toujours que votre plafond disponible des 3 dernières années est bien reporté.',
      supportingDocumentTitle: 'Attestation fiscale annuelle de l’organisme gestionnaire du PER & dernier Avis d’impôt',
      suggestedAmountOrValue: `${deductiblePerEur.toLocaleString('fr-FR')} € (Cases 6NS / 6NT)`,
      statutoryReference: 'CGI Art. 163 quatervicies',
      officialUrl: 'https://www.impots.gouv.fr/particulier/epargne-retraite',
      defaultStatus: 'a_verifier',
      isMandatoryForProfile: true,
    });
  }

  if (input.paysAlimony) {
    checklistItems.push({
      id: 'chk-ded-pension-alim',
      sectionId: 'DEDUCTIONS_REVENU_GLOBAL',
      boxCodes: ['Cases 6EL / 6EM', 'Case 6GU'],
      formName: 'Formulaire 2042',
      title: 'Pensions alimentaires versées (enfant majeur non rattaché ou ex-conjoint)',
      isPreFilledByAdministration: false,
      relevanceReason: `Pension alimentaire déclarée : ${input.annualAlimonyPaidEur.toLocaleString('fr-FR')} €.`,
      plainExplanation:
        `Pour un enfant majeur dans le besoin non rattaché à votre foyer, la déduction est plafonnée à ${alimonyCeiling.toLocaleString('fr-FR')} € par enfant en ${taxYear}. Le bénéficiaire doit déclarer la somme correspondante sur sa propre déclaration (case 1AO).`,
      whatToVerifyOrEnter:
        'Inscrivez le montant réellement versé et justifié en case 6EL (enfant majeur) ou 6GU (enfant mineur dont vous n’avez pas la garde) et indiquez les nom et adresse du bénéficiaire.',
      commonMistakeToAvoid:
        'Aucune pension alimentaire n’est déductible pour un enfant mineur en garde alternée (car vous bénéficiez déjà du partage des parts fiscales).',
      supportingDocumentTitle: 'Relevés de virements bancaires, justificatifs de dépenses ou jugement',
      suggestedAmountOrValue: `${deductibleAlimonyEur.toLocaleString('fr-FR')} € déductibles (plafond ${alimonyCeiling.toLocaleString('fr-FR')} €)`,
      statutoryReference: 'CGI Art. 156-II-2°',
      officialUrl: 'https://www.impots.gouv.fr/particulier/questions/puis-je-deduire-la-pension-alimentaire-que-je-verse-mon-enfant-majeur',
      defaultStatus: 'en_attente_justificatif',
      isMandatoryForProfile: true,
    });
  }

  // SECTION 5 : RÉDUCTIONS & CRÉDITS D'IMPÔT (2042 RICI)
  if (input.hasChildcareUnder6) {
    checklistItems.push({
      id: 'chk-cred-garde',
      sectionId: 'REDUCTIONS_CREDITS_IMPOT',
      boxCodes: ['Cases 7GA / 7GB / 7GC'],
      formName: 'Formulaire 2042 RICI',
      title: 'Crédit d’impôt (50 %) pour frais de garde d’enfant de moins de 6 ans hors du domicile',
      isPreFilledByAdministration: false,
      relevanceReason: 'Vous déclarez des frais de crèche, assistante maternelle ou garderie (< 6 ans).',
      plainExplanation:
        'Ce crédit d’impôt remboursable est égal à 50 % des dépenses retenues dans la limite de 3 500 € par enfant (soit 1 750 € de crédit max par enfant ; plafonds divisés par 2 en garde alternée).',
      whatToVerifyOrEnter:
        'Si vous utilisez PAJEMPLOI, le montant est souvent prérempli : vérifiez impérativement que les aides CAF (CMG) et employeur ont bien été déduites. Pour une crèche municipale ou privée, saisissez vous-même le montant net en 7GA.',
      commonMistakeToAvoid:
        'Ne déclarez jamais les frais de repas (cantine/goûter) facturés par la crèche ou la garderie : seuls les frais de garde pure sont éligibles.',
      supportingDocumentTitle: 'Attestation fiscale annuelle PAJEMPLOI ou attestation annuelle de la crèche',
      suggestedAmountOrValue: `Dépense nette : ${input.annualChildcareNetOfCafEur.toLocaleString('fr-FR')} € → Crédit d’impôt : ${childcareCreditEur.toLocaleString('fr-FR')} €`,
      statutoryReference: 'CGI Art. 200 quater B',
      officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F8',
      defaultStatus: 'a_verifier',
      isMandatoryForProfile: true,
    });
  }

  if (input.hasHomeServices) {
    checklistItems.push({
      id: 'chk-cred-domicile',
      sectionId: 'REDUCTIONS_CREDITS_IMPOT',
      boxCodes: ['Case 7DB', 'Case 7DR'],
      formName: 'Formulaire 2042 RICI',
      title: 'Crédit d’impôt (50 %) pour emploi d’un salarié à domicile (ménage, soutien scolaire, jardinage)',
      isPreFilledByAdministration: false,
      relevanceReason: 'Vous déclarez des dépenses de services à la personne à domicile.',
      plainExplanation:
        `Crédit d’impôt remboursable de 50 % des sommes restées à votre charge dans la limite de ${homeServicesCap.toLocaleString('fr-FR')} € pour votre foyer.`,
      whatToVerifyOrEnter:
        'Inscrivez le total net en case 7DB, précisez le type de prestation dans le détail de la 2042 RICI, et indiquez en case 7DR les aides reçues (APA, CESU préfinancé, avance immédiate URSSAF).',
      commonMistakeToAvoid:
        'Si vous avez activé « l’Avance immédiate de crédit d’impôt » de l’URSSAF en cours d’année, vérifiez que cette avance est bien déduite afin de ne pas demander deux fois le même crédit d’impôt.',
      supportingDocumentTitle: 'Attestation fiscale annuelle URSSAF CESU ou de l’organisme prestataire agréé',
      suggestedAmountOrValue: `Dépense nette : ${input.annualHomeServicesNetEur.toLocaleString('fr-FR')} € → Crédit d’impôt : ${homeServicesCreditEur.toLocaleString('fr-FR')} €`,
      statutoryReference: 'CGI Art. 199 quater F',
      officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F12',
      defaultStatus: 'en_attente_justificatif',
      isMandatoryForProfile: true,
    });
  }

  if (input.hasCharitableDonations) {
    checklistItems.push({
      id: 'chk-red-dons',
      sectionId: 'REDUCTIONS_CREDITS_IMPOT',
      boxCodes: ['Case 7UD (75 %)', 'Case 7UF (66 %)'],
      formName: 'Formulaire 2042 RICI',
      title: 'Réduction d’impôt pour dons aux associations et fondations',
      isPreFilledByAdministration: false,
      relevanceReason: `Dons déclarés : ${input.annualDonationsEur.toLocaleString('fr-FR')} €.`,
      plainExplanation:
        'Attention : il s’agit d’une réduction d’impôt (non remboursable si votre impôt est de 0 €), jamais préremplie par l’administration.',
      whatToVerifyOrEnter:
        'Saisissez vos dons d’aide aux personnes en difficulté en case 7UD (75 % jusqu’à 1 000 €) et vos dons aux organismes d’intérêt général en case 7UF (66 % dans la limite de 20 % du revenu imposable).',
      commonMistakeToAvoid:
        'Conservez précieusement chaque reçu fiscal Cerfa n° 11580 : les dons ne sont jamais transmis automatiquement aux impôts par les associations.',
      supportingDocumentTitle: 'Reçus fiscaux de dons aux associations (Cerfa n° 11580)',
      suggestedAmountOrValue: `Dons : ${input.annualDonationsEur.toLocaleString('fr-FR')} € → Réduction appliquée : ${appliedNonRefundableReductionEur.toLocaleString('fr-FR')} €`,
      statutoryReference: 'CGI Art. 200',
      officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F426',
      defaultStatus: 'en_attente_justificatif',
      isMandatoryForProfile: true,
    });
  }

  // SECTION 6 : PRÉLÈVEMENT À LA SOURCE (PAS) & SOLDE ANNUEL
  checklistItems.push({
    id: 'chk-pas-retenues',
    sectionId: 'PRELEVEMENT_SOURCE_SOLDE',
    boxCodes: ['Cases 8HV / 8IV', 'Cases 8HW / 8IW'],
    formName: 'Formulaire 2042',
    title: 'Contrôle des retenues de prélèvement à la source déjà payées et du solde d’été',
    isPreFilledByAdministration: true,
    relevanceReason: 'Vérification finale obligatoire avant signature de la déclaration.',
    plainExplanation:
      'Les sommes déjà retenues chaque mois sur vos salaires ou retraites (cases 8HV / 8IV) ainsi que l’avance de 60 % versée en janvier viennent en déduction de votre impôt annuel pour déterminer votre solde d’été.',
    whatToVerifyOrEnter:
      'Vérifiez que le total prérempli en case 8HV / 8IV correspond bien au cumul annuel du prélèvement à la source figurant sur votre bulletin de paie de décembre, et contrôlez votre RIB bancaire à la fin de la télédéclaration.',
    commonMistakeToAvoid:
      'Un RIB bancaire obsolète sur impots.gouv.fr bloque le virement de votre remboursement d’impôt en juillet-août.',
    supportingDocumentTitle: 'Bulletin de paie de décembre (cumul PAS) & Relevé d’Identité Bancaire (RIB)',
    suggestedAmountOrValue: `PAS retenu : ${input.alreadyWithheldPasAnnualEur.toLocaleString('fr-FR')} € · Avance janv. : ${input.january60PctAdvanceReceivedEur.toLocaleString('fr-FR')} €`,
    statutoryReference: 'CGI Art. 204 A, 204 K & 1665 bis',
    officialUrl: 'https://www.impots.gouv.fr/particulier/gerer-mon-prelevement-la-source',
    defaultStatus: 'a_verifier',
    isMandatoryForProfile: true,
  });

  return {
    taxYear,
    incomeYear,
    familyQuotientParts: baseIrCalc.familyQuotientParts,
    standard10PctSalaryDeductionEur,
    appliedProfessionalDeductionMode,
    appliedProfessionalDeductionEur,
    netTaxableGlobalIncomeEur: baseIrCalc.netTaxableIncomeEur,
    marginalTaxRatePercent: baseIrCalc.marginalTaxRatePercent,
    averageTaxRatePercent,
    grossTaxAfterDecoteBeforeCreditsEur,
    totalReductionsAndCreditsEur,
    refundableCreditsEur,
    nonRefundableReductionsEur: appliedNonRefundableReductionEur,
    finalAnnualNetIncomeTaxEur,
    alreadyWithheldPasAnnualEur: input.alreadyWithheldPasAnnualEur,
    january60PctAdvanceReceivedEur: input.january60PctAdvanceReceivedEur,
    estimatedSummerTaxBalanceEur,
    balanceType,
    monthlyAutumnInstallmentEur,
    automaticDeclarationEligible: automaticDeclarationExclusionReasons.length === 0,
    automaticDeclarationExclusionReasons,
    checklistItems,
    supportingDocuments,
    verifiedCalendar: getVerifiedDeclarationCalendar(taxYear),
  };
}
