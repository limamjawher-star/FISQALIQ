'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { DataOriginBadge } from '@/components/ui/design-system';
import {
  AnimatedNumber,
  PageTransition,
} from '@/components/ui/interactive-primitives';
import {
  calculatePersonalIncomeTax,
  calculateFamilyQuotientParts,
  FamilyMaritalStatus,
  PersonalTaxOnboardingState,
  OnboardingHouseholdStatus,
  TaxResidencyChoice,
  TriStateAnswer,
  IncomeCategoryKey,
  ExpenseSituationKey,
  evaluatePersonalOnboardingProfile,
} from '@/lib/calculations/personal-tax-engine';
import { PERSONAL_TAX_SUPABASE_RLS_SCHEMA } from '@/lib/supabase/config';
import {
  Users,
  CheckCircle2,
  HelpCircle,
  BookmarkPlus,
  ExternalLink,
  Scale,
  Globe,
  Baby,
  Wallet,
  Sparkles,
  FileText,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Database,
  SkipForward,
  Info,
} from 'lucide-react';

interface WizardStepMeta {
  stepNumber: number;
  shortTitle: string;
  fullTitle: string;
  subtitle: string;
}

const WIZARD_STEPS: WizardStepMeta[] = [
  {
    stepNumber: 1,
    shortTitle: '1. Résidence fiscale',
    fullTitle: 'Étape 1 sur 7 · Où habitez-vous fiscalement ?',
    subtitle:
      'Les règles de calcul de l’impôt français dépendent d’abord de votre lieu de résidence fiscale.',
  },
  {
    stepNumber: 2,
    shortTitle: '2. Situation familiale',
    fullTitle: 'Étape 2 sur 7 · Quelle est votre situation familiale ?',
    subtitle:
      'Votre statut familial détermine si vous déclarez seul(e) ou à deux, ainsi que votre nombre de parts de base.',
  },
  {
    stepNumber: 3,
    shortTitle: '3. Enfants & proches',
    fullTitle: 'Étape 3 sur 7 · Avez-vous des enfants ou personnes à charge ?',
    subtitle:
      'Nous vous demandons uniquement les informations nécessaires au calcul de vos parts fiscales et crédits d’impôt.',
  },
  {
    stepNumber: 4,
    shortTitle: '4. Mes revenus',
    fullTitle: 'Étape 4 sur 7 · Quels types de revenus percevez-vous ?',
    subtitle:
      'Sélectionnez un ou plusieurs revenus. Si vous ne connaissez pas un montant exact, vous pouvez le passer.',
  },
  {
    stepNumber: 5,
    shortTitle: '5. Dépenses & aides',
    fullTitle: 'Étape 5 sur 7 · Avez-vous des dépenses ouvrant droit à un avantage fiscal ?',
    subtitle:
      'Indiquez vos dépenses éventuelles (garde d’enfant, emploi à domicile, dons, frais réels, pension, PER).',
  },
  {
    stepNumber: 6,
    shortTitle: '6. Avis d’impôt (Optionnel)',
    fullTitle: 'Étape 6 sur 7 · Informations figurant sur votre dernier avis d’impôt (100 % optionnel)',
    subtitle:
      'Si vous avez votre dernier avis d’impôt ou votre fiche de paie sous les yeux, ces repères affinent l’estimation. Sinon, passez librement cette étape.',
  },
  {
    stepNumber: 7,
    shortTitle: '7. Vérification & sauvegarde',
    fullTitle: 'Étape 7 sur 7 · Vérifiez et enregistrez votre profil fiscal personnel',
    subtitle:
      'Synthèse claire de vos réponses, de vos parts fiscales vérifiées et des points restant à confirmer.',
  },
];

const INCOME_CATEGORIES_META: {
  key: IncomeCategoryKey;
  title: string;
  boxRef: string;
  simpleExplanation: string;
  placeholderEur: number;
}[] = [
  {
    key: 'salaires',
    title: 'Salaires, traitements ou revenus d’emploi',
    boxRef: 'Cases 1AJ / 1BJ',
    simpleExplanation:
      'Le « net imposable » annuel inscrit sur votre fiche de paie de décembre (avant prélèvement à la source).',
    placeholderEur: 36000,
  },
  {
    key: 'pensions_retraite',
    title: 'Pensions de retraite ou d’invalidité',
    boxRef: 'Cases 1AS / 1BS',
    simpleExplanation:
      'Pensions versées par vos caisses de retraite de base et complémentaires (abattement automatique de 10 % plafonné).',
    placeholderEur: 24000,
  },
  {
    key: 'allocations_chomage',
    title: 'Allocations chômage (France Travail / ARE) ou indemnités',
    boxRef: 'Cases 1AP / 1BP',
    simpleExplanation:
      'Allocations de retour à l’emploi ou indemnités journalières imposables perçues dans l’année.',
    placeholderEur: 14000,
  },
  {
    key: 'independant_bic_bnc',
    title: 'Activité indépendante, freelance ou micro-entrepreneur',
    boxRef: 'Formulaire 2042 C PRO',
    simpleExplanation:
      'Bénéfice net imposable (ou chiffre d’affaires après abattement forfaitaire micro-BIC / micro-BNC).',
    placeholderEur: 18000,
  },
  {
    key: 'revenus_locatifs',
    title: 'Revenus locatifs (appartement loué nu ou meublé)',
    boxRef: 'Cases 4BE / 4BA',
    simpleExplanation:
      'Loyers nets imposables après abattement micro-foncier (30 %) ou charges réelles déductibles.',
    placeholderEur: 7200,
  },
  {
    key: 'revenus_placements',
    title: 'Revenus de placements (intérêts, dividendes, plus-values)',
    boxRef: 'Cases 2TR / 2DC / 2OP',
    simpleExplanation:
      'Soumis par défaut au Prélèvement Forfaitaire Unique (PFU 30 %) ou, sur option (case 2OP), au barème progressif.',
    placeholderEur: 1500,
  },
];

const EXPENSE_SITUATIONS_META: {
  key: ExpenseSituationKey;
  title: string;
  mechanismBadge: string;
  statutoryRef: string;
  simpleExplanation: string;
  conditionQuestion: string;
  defaultAmountEur: number;
}[] = [
  {
    key: 'garde_enfants_moins_6_ans',
    title: 'Frais de garde d’enfants de moins de 6 ans (crèche, assistante maternelle, garderie)',
    mechanismBadge: 'Crédit d’impôt 50 % (Remboursable)',
    statutoryRef: 'CGI Art. 200 quater B · Cases 7GA/7GB',
    simpleExplanation:
      '50 % des sommes payées hors domicile (plafond légal de 3 500 € de dépenses par enfant, soit jusqu’à 1 750 € remboursés).',
    conditionQuestion:
      'Confirmez-vous que ce montant exclut les aides reçues de la CAF (CMG/PAJE) et de votre employeur ?',
    defaultAmountEur: 2300,
  },
  {
    key: 'emploi_domicile',
    title: 'Emploi d’un salarié à domicile (ménage, soutien scolaire, garde à domicile, jardinage)',
    mechanismBadge: 'Crédit d’impôt 50 % (Remboursable)',
    statutoryRef: 'CGI Art. 199 sexdecies · Case 7DB',
    simpleExplanation:
      '50 % des dépenses effectivement restées à votre charge (plafond général de 12 000 € majoré de 1 500 € par enfant).',
    conditionQuestion:
      'Disposez-vous d’une attestation annuelle URSSAF / CESU ou d’un organisme agréé (hors avance immédiate déjà déduite) ?',
    defaultAmountEur: 2000,
  },
  {
    key: 'dons_associations',
    title: 'Dons aux associations et fondations d’intérêt général',
    mechanismBadge: 'Réduction d’impôt 66 % / 75 %',
    statutoryRef: 'CGI Art. 200 · Cases 7UF / 7UD',
    simpleExplanation:
      'Réduit votre impôt de 66 % (intérêt général) ou 75 % (aide aux personnes en difficulté). Non remboursable si votre impôt est de 0 €.',
    conditionQuestion:
      'Avez-vous conservé le reçu fiscal officiel délivré par l’association bénéficiaire ?',
    defaultAmountEur: 300,
  },
  {
    key: 'frais_professionnels_reels',
    title: 'Frais professionnels réels élevés (trajets domicile-travail, repas)',
    mechanismBadge: 'Déduction du revenu (Optionnelle)',
    statutoryRef: 'CGI Art. 83-3° · Cases 1AK / 1BK',
    simpleExplanation:
      'Par défaut, les impôts déduisent automatiquement 10 % de votre salaire. Les frais réels ne sont utiles que s’ils dépassent ces 10 %.',
    conditionQuestion:
      'Pouvez-vous justifier vos déplacements professionnels et frais de repas par des factures ou le barème kilométrique officiel ?',
    defaultAmountEur: 4800,
  },
  {
    key: 'pension_alimentaire_versee',
    title: 'Pension alimentaire versée à un enfant ou ex-conjoint',
    mechanismBadge: 'Déduction du revenu imposable',
    statutoryRef: 'CGI Art. 156-II-2° · Cases 6EL / 6GU',
    simpleExplanation:
      'Les pensions alimentaires versées sont déductibles de votre revenu imposable (plafond légal pour un enfant majeur non rattaché).',
    conditionQuestion:
      'Confirmez-vous que le bénéficiaire de la pension n’est pas rattaché à votre propre déclaration de revenus ?',
    defaultAmountEur: 3600,
  },
  {
    key: 'epargne_retraite_per',
    title: 'Versements volontaires sur un Plan d’Épargne Retraite (PER)',
    mechanismBadge: 'Déduction du revenu imposable',
    statutoryRef: 'CGI Art. 163 quatervicies · Cases 6NS / 6NT',
    simpleExplanation:
      'Les sommes versées sur un PER individuel diminuent votre revenu imposable dans la limite de votre plafond d’épargne retraite.',
    conditionQuestion:
      'Le montant versé respecte-t-il le plafond d’épargne retraite inscrit sur votre dernier avis d’imposition ?',
    defaultAmountEur: 1500,
  },
];

export default function PersonalTaxOnboardingPage() {
  const {
    households,
    activeHousehold,
    selectHouseholdById,
    updateActiveHousehold,
    savePersonalSimulation,
    logActivity,
  } = useFiscaliq();

  // Mode toggle: 'wizard' (7-step guided onboarding) vs 'direct_simulator' (existing direct calculator preserved)
  const [viewMode, setViewMode] = useState<'wizard' | 'direct_simulator'>('wizard');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<string | null>(null);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState<boolean>(false);
  const [showSupabaseSqlModal, setShowSupabaseSqlModal] = useState<boolean>(false);
  const [nonResidentWaitlistSaved, setNonResidentWaitlistSaved] = useState<boolean>(false);

  // 7-Step Wizard State initialized with accessible defaults
  const [wizardState, setWizardState] = useState<PersonalTaxOnboardingState>({
    profileLabel: activeHousehold.householdName.split(' (')[0] || 'Mon foyer fiscal',
    residencyStatus: 'resident_france',
    countryOfResidence: 'France',
    nonResidentHasFrenchSourceIncome: 'oui',

    householdStatus:
      activeHousehold.maritalStatus === 'marie_pacse'
        ? 'marie'
        : activeHousehold.maritalStatus === 'parent_isole'
        ? 'separe'
        : 'celibataire',
    livesAloneOnJan1:
      activeHousehold.maritalStatus === 'parent_isole' ? 'oui' : 'non',
    spousePassedAwayCurrentYear: 'non',

    hasDependants: activeHousehold.dependantsCount > 0,
    childrenUnder6Count: activeHousehold.dependantsCount > 0 ? 1 : 0,
    children6To17Count:
      activeHousehold.dependantsCount > 1 ? activeHousehold.dependantsCount - 1 : 0,
    adultChildrenAttachedCount: 0,
    exclusiveCustodyChildrenCount: activeHousehold.dependantsCount,
    sharedCustodyChildrenCount: 0,
    dependantsWithDisabilityCardCount: 0,

    incomes: {
      salaires: {
        selected: true,
        annualAmountEur: activeHousehold.annualDeclaredSalaryNetImposableEur,
        amountUnknownOrSkipped: false,
      },
      pensions_retraite: {
        selected: false,
        annualAmountEur: 0,
        amountUnknownOrSkipped: false,
      },
      allocations_chomage: {
        selected: false,
        annualAmountEur: 0,
        amountUnknownOrSkipped: false,
      },
      independant_bic_bnc: {
        selected: false,
        annualAmountEur: 0,
        amountUnknownOrSkipped: false,
      },
      revenus_locatifs: {
        selected: activeHousehold.additionalNetTaxableIncomeEur > 0,
        annualAmountEur: activeHousehold.additionalNetTaxableIncomeEur,
        amountUnknownOrSkipped: false,
      },
      revenus_placements: {
        selected: false,
        annualAmountEur: 0,
        amountUnknownOrSkipped: false,
      },
    },

    expenses: {
      garde_enfants_moins_6_ans: {
        selected: activeHousehold.estimatedEligibleTaxCreditsEur > 0,
        annualAmountEur: 2300,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'oui',
      },
      emploi_domicile: {
        selected: false,
        annualAmountEur: 2000,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'ne_sait_pas',
      },
      dons_associations: {
        selected: false,
        annualAmountEur: 300,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'oui',
      },
      frais_professionnels_reels: {
        selected: false,
        annualAmountEur: 4800,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'ne_sait_pas',
      },
      pension_alimentaire_versee: {
        selected: false,
        annualAmountEur: 3600,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'ne_sait_pas',
      },
      epargne_retraite_per: {
        selected: activeHousehold.perContributionAnnualEur > 0,
        annualAmountEur: activeHousehold.perContributionAnnualEur || 1200,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'oui',
      },
    },

    skipExistingTaxNoticeStep: false,
    previousReferenceTaxIncomeEur: 58400,
    availablePerCeilingEur: 5400,
    currentWithholdingRatePct: 3.9,
    taxAlreadyWithheldOrPaidEur: 1320,
  });

  // Deterministic evaluation of the 7-step wizard state
  const evaluation = useMemo(() => {
    return evaluatePersonalOnboardingProfile(wizardState);
  }, [wizardState]);

  // Direct simulator state (preserved for users switching to 'direct_simulator')
  const [taxYear, setTaxYear] = useState<2026 | 2025>(2026);
  const [fraisReelsInput, setFraisReelsInput] = useState<number>(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const directTaxResult = useMemo(() => {
    return calculatePersonalIncomeTax({
      annualDeclaredIncomeEur: activeHousehold.annualDeclaredSalaryNetImposableEur,
      additionalTaxableIncomeEur: activeHousehold.additionalNetTaxableIncomeEur,
      maritalStatus: activeHousehold.maritalStatus,
      dependantsCount: activeHousehold.dependantsCount,
      expenseDeductionMode: fraisReelsInput > 0 ? 'frais_reels' : 'abattement_10',
      realExpensesAmountEur: fraisReelsInput > 0 ? fraisReelsInput : undefined,
      perDeductibleContributionEur: activeHousehold.perContributionAnnualEur,
      estimatedTaxCreditsEur: activeHousehold.estimatedEligibleTaxCreditsEur,
      taxYear,
    });
  }, [activeHousehold, fraisReelsInput, taxYear]);

  const directPartsDetail = useMemo(() => {
    return calculateFamilyQuotientParts({
      maritalStatus: activeHousehold.maritalStatus,
      dependantsCount: activeHousehold.dependantsCount,
    });
  }, [activeHousehold.maritalStatus, activeHousehold.dependantsCount]);

  // Helper to update income entry
  const updateIncome = (
    key: IncomeCategoryKey,
    patch: Partial<PersonalTaxOnboardingState['incomes'][IncomeCategoryKey]>
  ) => {
    setWizardState((prev) => ({
      ...prev,
      incomes: {
        ...prev.incomes,
        [key]: { ...prev.incomes[key], ...patch },
      },
    }));
  };

  // Helper to update expense entry
  const updateExpense = (
    key: ExpenseSituationKey,
    patch: Partial<PersonalTaxOnboardingState['expenses'][ExpenseSituationKey]>
  ) => {
    setWizardState((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        [key]: { ...prev.expenses[key], ...patch },
      },
    }));
  };

  // Save completed onboarding profile into FiscaliqProvider and prepare Supabase payload
  const handleSaveOnboardingProfile = () => {
    const statusLabels: Record<OnboardingHouseholdStatus, string> = {
      celibataire: 'Célibataire',
      marie: 'Marié(e)',
      pacse: 'Pacsé(e)',
      divorce: 'Divorcé(e)',
      separe: 'Séparé(e)',
      veuf: 'Veuf / Veuve',
    };

    const summaryText = `${statusLabels[wizardState.householdStatus]} · ${
      evaluation.quotient.totalDependantsCount
    } personne(s) à charge (${evaluation.quotient.totalParts.toLocaleString(
      'fr-FR'
    )} part${evaluation.quotient.totalParts > 1 ? 's' : ''})`;

    updateActiveHousehold({
      householdName: `${wizardState.profileLabel} (Profil personnalisé)`,
      situationSummary: summaryText,
      maritalStatus: evaluation.quotient.mappedEngineMaritalStatus,
      dependantsCount: evaluation.quotient.totalDependantsCount,
      annualDeclaredSalaryNetImposableEur:
        evaluation.totalKnownSalaryPensionUnemploymentEur,
      additionalNetTaxableIncomeEur:
        evaluation.totalKnownAdditionalTaxableIncomeEur,
      perContributionAnnualEur: evaluation.confirmedDeductiblePerAndAlimonyEur,
      estimatedEligibleTaxCreditsEur:
        evaluation.confirmedTaxCreditsAndReductionsEur,
    });

    savePersonalSimulation({
      householdId: activeHousehold.id,
      moduleType: 'IR_FOYER',
      taxYear: 2026,
      title: `Profil fiscal complété — ${wizardState.profileLabel} (${evaluation.quotient.totalParts.toLocaleString(
        'fr-FR'
      )} parts)`,
      inputsSummary: `Revenus connus ${(
        evaluation.totalKnownSalaryPensionUnemploymentEur +
        evaluation.totalKnownAdditionalTaxableIncomeEur
      ).toLocaleString('fr-FR')} € · Crédits confirmés ${evaluation.confirmedTaxCreditsAndReductionsEur.toLocaleString(
        'fr-FR'
      )} €`,
      mainResultLabel: 'Impôt annuel estimé (Barème 2026)',
      mainResultAmountEur: evaluation.taxEstimate.finalEstimatedTaxEur,
      secondaryDetail: `${evaluation.incompleteItemsToVerify.length} point(s) à vérifier · TMI ${evaluation.taxEstimate.marginalTaxRatePercent} %`,
      classification: 'ESTIMATION',
      statutoryRef: 'CGI Art. 4 B, Art. 194 & Art. 197 (Barème 2026)',
    });

    logActivity({
      companyId: activeHousehold.id,
      category: 'dossier',
      title: `Parcours d’onboarding fiscal personnel complété (${evaluation.quotient.totalParts.toLocaleString(
        'fr-FR'
      )} parts)`,
      detail: `Impôt annuel estimé : ${evaluation.taxEstimate.finalEstimatedTaxEur.toLocaleString(
        'fr-FR'
      )} € (${evaluation.incompleteItemsToVerify.length} élément(s) signalé(s) à vérifier sans supposition d’éligibilité).`,
      actor: 'Assistant de configuration fiscale (7 étapes)',
      classification: 'ESTIMATION',
    });

    setProfileSavedSuccess(true);
  };

  const activeStepMeta = WIZARD_STEPS[currentStep - 1] || WIZARD_STEPS[0];
  const progressPercent = Math.round((currentStep / WIZARD_STEPS.length) * 100);

  // Sanitized Supabase JSON preview (Strictly zero passwords, bank credentials, or ID documents)
  const supabasePreparedPayload = useMemo(() => {
    return {
      table: 'public.personal_tax_profiles',
      rlsPolicy: 'auth.uid() = user_id',
      record: {
        profile_label: wizardState.profileLabel,
        tax_year: 2026,
        residency_status: wizardState.residencyStatus,
        country_of_residence: wizardState.countryOfResidence,
        household_status: wizardState.householdStatus,
        lives_alone_jan1: wizardState.livesAloneOnJan1,
        dependants_payload: {
          has_dependants: wizardState.hasDependants,
          exclusive_custody_count: wizardState.exclusiveCustodyChildrenCount,
          shared_custody_count: wizardState.sharedCustodyChildrenCount,
          children_under_6_count: wizardState.childrenUnder6Count,
          children_6_to_17_count: wizardState.children6To17Count,
          adult_children_attached_count: wizardState.adultChildrenAttachedCount,
          disability_card_count: wizardState.dependantsWithDisabilityCardCount,
        },
        incomes_payload: wizardState.incomes,
        expenses_payload: wizardState.expenses,
        optional_notice_payload: wizardState.skipExistingTaxNoticeStep
          ? { skipped_by_user: true }
          : {
              rfr_n_minus_1_eur: wizardState.previousReferenceTaxIncomeEur,
              per_ceiling_eur: wizardState.availablePerCeilingEur,
              current_pas_rate_pct: wizardState.currentWithholdingRatePct,
              tax_already_paid_eur: wizardState.taxAlreadyWithheldOrPaidEur,
            },
        computed_parts: evaluation.quotient.totalParts,
        estimated_net_tax_eur: evaluation.taxEstimate.finalEstimatedTaxEur,
        incomplete_items_to_verify: evaluation.incompleteItemsToVerify,
      },
    };
  }, [wizardState, evaluation]);

  return (
    <AppShell
      title="Mes impôts · Parcours guidé en 7 étapes & Simulateur personnel"
      subtitle="Répondez à des questions simples en français courant pour construire votre profil fiscal, comprendre vos parts et estimer votre impôt sans jargon."
      badge="PARCOURS GUIDÉ 7 ÉTAPES · ZÉRO MOT DE PASSE REQUIS"
    >
      <div className="space-y-6">
        {/* Barre supérieure : Choix du mode (Parcours guidé en 7 étapes vs Simulateur direct) */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setViewMode('wizard')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'wizard'
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#172033]'
                }`}
              >
                Parcours guidé en 7 étapes (Recommandé)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('direct_simulator')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'direct_simulator'
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#172033]'
                }`}
              >
                Simulateur rapide & Détail des tranches
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Garantie confidentialité :</strong> Aucun mot de passe impots.gouv.fr, RIB ou pièce d’identité n’est demandé.
            </span>
          </div>
        </section>

        {viewMode === 'wizard' ? (
          <div className="space-y-6">
            {/* Indicateur de progression des 7 étapes */}
            <section
              aria-label="Progression du parcours fiscal en 7 étapes"
              className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                    PROGRESSION DU PROFIL FISCAL · {progressPercent} % COMPLÉTÉ
                  </span>
                  <h2 className="text-base font-bold text-[#101827] mt-0.5">
                    {activeStepMeta.fullTitle}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">{activeStepMeta.subtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-mono font-semibold text-[#101827] tabular-nums">
                    {evaluation.quotient.totalParts.toLocaleString('fr-FR')} part
                    {evaluation.quotient.totalParts > 1 ? 's' : ''}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-xs font-mono font-bold text-emerald-800 tabular-nums">
                    Impôt estimé :{' '}
                    <AnimatedNumber
                      value={evaluation.taxEstimate.finalEstimatedTaxEur}
                      suffix=" € / an"
                    />
                  </span>
                </div>
              </div>

              {/* Barre visuelle de progression */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Onglets d'accès direct aux 7 étapes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
                {WIZARD_STEPS.map((st) => {
                  const isCurrent = st.stepNumber === currentStep;
                  const isDone = st.stepNumber < currentStep;
                  return (
                    <button
                      key={st.stepNumber}
                      type="button"
                      onClick={() => setCurrentStep(st.stepNumber)}
                      className={`px-2.5 py-2 rounded-md text-left border transition-colors flex items-center justify-between gap-1.5 ${
                        isCurrent
                          ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                          : isDone
                          ? 'bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:bg-emerald-100/70'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[11px] font-semibold truncate">
                        {st.shortTitle}
                      </span>
                      {isDone && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Contenu principal : Colonne gauche = Étape active (8 cols), Colonne droite = Résumé temps réel & Glossaire (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-6">
                <PageTransition transitionKey={`onboarding-step-${currentStep}`}>
                {/* ==================== STEP 1: RESIDENCE & TAX RESIDENCY ==================== */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                      <Globe className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
                        <div className="font-bold text-[#101827]">
                          Qu’est-ce qu’un « résident fiscal français » ? (Explication simple)
                        </div>
                        <p>
                          Selon la loi (article 4 B du Code général des impôts), vous êtes résident fiscal en France si vous remplissez <strong>au moins l’une</strong> de ces 3 conditions :
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                          <li>
                            Votre <strong>foyer</strong> (vous, votre conjoint ou vos enfants) habite principalement en France (ou vous y séjournez plus de 183 jours par an).
                          </li>
                          <li>
                            Vous exercez votre <strong>activité professionnelle principale</strong> en France (salarié ou indépendant).
                          </li>
                          <li>
                            Le centre de vos <strong>intérêts économiques</strong> (vos principaux revenus ou investissements) se trouve en France.
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="onboarding-profile-label"
                        className="block text-xs font-bold text-[#101827] mb-1.5"
                      >
                        Comment souhaitez-vous nommer votre profil fiscal ?
                      </label>
                      <input
                        id="onboarding-profile-label"
                        type="text"
                        value={wizardState.profileLabel}
                        onChange={(e) =>
                          setWizardState((prev) => ({
                            ...prev,
                            profileLabel: e.target.value,
                          }))
                        }
                        placeholder="Ex : Mon foyer fiscal 2026"
                        className={`w-full sm:w-96 px-3.5 py-2 text-xs font-semibold bg-slate-50 border rounded-md text-[#101827] transition-colors ${
                          wizardState.profileLabel.trim().length < 2
                            ? 'border-amber-400 focus:border-amber-600'
                            : 'border-slate-300 focus:border-emerald-600'
                        }`}
                      />
                      {wizardState.profileLabel.trim().length < 2 && (
                        <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          Veuillez saisir au moins 2 caractères pour identifier ce profil dans votre tableau de bord.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-xs font-bold text-[#101827]">
                        Quelle est votre situation de résidence fiscale pour l’année ?
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {[
                          {
                            value: 'resident_france' as TaxResidencyChoice,
                            title: 'Oui, je vis et je suis résident(e) fiscal(e) en France',
                            desc: 'Cas général : j’habite en France (métropole ou DOM) et j’y déclare mes revenus.',
                          },
                          {
                            value: 'non_resident_revenus_france' as TaxResidencyChoice,
                            title:
                              'Non, je réside fiscalement à l’étranger mais je perçois des revenus de source française',
                            desc: 'Parcours spécifique Non-Résident (ex : loyers en France, pension ou salaire de source française).',
                          },
                          {
                            value: 'incertain_a_verifier' as TaxResidencyChoice,
                            title:
                              'Je ne suis pas certain(e) (déménagement international en cours d’année, expatriation, frontalier)',
                            desc: 'Nous noterons ce point comme « À vérifier » sans faire d’hypothèse juridique automatique.',
                          },
                        ].map((option) => {
                          const isSelected =
                            wizardState.residencyStatus === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setWizardState((prev) => ({
                                  ...prev,
                                  residencyStatus: option.value,
                                  countryOfResidence:
                                    option.value === 'resident_france'
                                      ? 'France'
                                      : prev.countryOfResidence === 'France'
                                      ? 'Suisse / Belgique / Autre pays'
                                      : prev.countryOfResidence,
                                }))
                              }
                              className={`p-4 rounded-lg border text-left transition-all flex items-start justify-between gap-3 ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                                  : 'border-slate-200 bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-bold text-[#101827]">
                                  {option.title}
                                </div>
                                <div className="text-[11px] text-slate-600 mt-0.5">
                                  {option.desc}
                                </div>
                              </div>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Parcours dédié Non-Résident ou Incertain */}
                    {wizardState.residencyStatus !== 'resident_france' && (
                      <div className="p-4 rounded-lg border border-amber-300 bg-amber-50/70 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-950 space-y-1">
                            <div className="font-bold">
                              Parcours spécifique « Non-Résident & Conventions Internationales »
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Les non-résidents fiscaux français relèvent du <strong>Service des Impôts des Particuliers Non-Résidents (SIPNR)</strong> et de règles particulières (taux minimum de 20 % / 30 % prévu à l’article 197 A du CGI, retenue à la source spécifique et conventions fiscales bilatérales).
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                              Pays de résidence principale actuel
                            </label>
                            <input
                              type="text"
                              value={wizardState.countryOfResidence}
                              onChange={(e) =>
                                setWizardState((prev) => ({
                                  ...prev,
                                  countryOfResidence: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded text-[#101827]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                              Percevez-vous des revenus de source française ?
                            </label>
                            <select
                              value={wizardState.nonResidentHasFrenchSourceIncome}
                              onChange={(e) =>
                                setWizardState((prev) => ({
                                  ...prev,
                                  nonResidentHasFrenchSourceIncome: e.target
                                    .value as TriStateAnswer,
                                }))
                              }
                              className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded text-[#101827]"
                            >
                              <option value="oui">Oui (loyers, salaires ou pensions de France)</option>
                              <option value="non">Non, aucun revenu en France</option>
                              <option value="ne_sait_pas">Je ne sais pas / À vérifier</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/80">
                          <span className="text-[11px] text-amber-900">
                            Vous pouvez enregistrer votre pré-orientation non-résident ou poursuivre à titre purement indicatif.
                          </span>
                          <button
                            type="button"
                            onClick={() => setNonResidentWaitlistSaved(true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs"
                          >
                            Activer le mode Non-Résident (SIPNR)
                          </button>
                        </div>

                        {nonResidentWaitlistSaved && (
                          <div className="p-2.5 rounded bg-white border border-emerald-300 text-[11px] text-emerald-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              <strong>Orientation Non-Résident activée :</strong> votre profil conservera un avertissement explicite indiquant que le barème résident ne s’applique pas automatiquement sans vérification de votre convention fiscale.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== STEP 2: HOUSEHOLD SITUATION ==================== */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      <strong className="text-[#101827]">Pourquoi cette question ?</strong> En France, l’impôt est calculé par <strong>foyer fiscal</strong>. Un adulte seul débute avec <strong>1 part fiscale</strong>, tandis qu’un couple marié ou pacsé soumettant une déclaration commune débute avec <strong>2 parts fiscales</strong>.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          value: 'celibataire' as OnboardingHouseholdStatus,
                          label: 'Célibataire',
                          sub: '1 part de base · Déclaration individuelle',
                        },
                        {
                          value: 'marie' as OnboardingHouseholdStatus,
                          label: 'Marié(e)',
                          sub: '2 parts de base · Déclaration commune du couple',
                        },
                        {
                          value: 'pacse' as OnboardingHouseholdStatus,
                          label: 'Pacsé(e) (PACS)',
                          sub: '2 parts de base · Imposition commune avec votre partenaire',
                        },
                        {
                          value: 'divorce' as OnboardingHouseholdStatus,
                          label: 'Divorcé(e)',
                          sub: '1 part de base (+ demi-part Parent Isolé éventuelle si enfant)',
                        },
                        {
                          value: 'separe' as OnboardingHouseholdStatus,
                          label: 'Séparé(e)',
                          sub: '1 part de base · Imposition distincte de votre ex-conjoint',
                        },
                        {
                          value: 'veuf' as OnboardingHouseholdStatus,
                          label: 'Veuf / Veuve',
                          sub: '1 part (ou maintien de 2 parts si enfants à charge)',
                        },
                      ].map((item) => {
                        const isSelected = wizardState.householdStatus === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() =>
                              setWizardState((prev) => ({
                                ...prev,
                                householdStatus: item.value,
                              }))
                            }
                            className={`p-4 rounded-lg border text-left transition-all ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xs font-bold text-[#101827]">
                              {item.label}
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {item.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Question conditionnelle : Parent isolé (Case T) si célibataire, divorcé ou séparé */}
                    {(wizardState.householdStatus === 'celibataire' ||
                      wizardState.householdStatus === 'divorce' ||
                      wizardState.householdStatus === 'separe') && (
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                        <div className="text-xs font-bold text-[#101827] flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-emerald-600" />
                          Question complémentaire (pour la « Case T · Parent isolé ») :
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Au 1er janvier de l’année d’imposition, viviez-vous <strong>seul(e)</strong> (sans concubinage) ? Si vous avez au moins un enfant à charge et vivez seul(e), cela ouvre droit à une demi-part fiscale supplémentaire (+0,5 part).
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'oui' as TriStateAnswer, label: 'Oui, je vis seul(e)' },
                            {
                              id: 'non' as TriStateAnswer,
                              label: 'Non, je vis en concubinage / union libre',
                            },
                            {
                              id: 'ne_sait_pas' as TriStateAnswer,
                              label: 'Je ne sais pas / Je vérifierai plus tard',
                            },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setWizardState((prev) => ({
                                  ...prev,
                                  livesAloneOnJan1: opt.id,
                                }))
                              }
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                                wizardState.livesAloneOnJan1 === opt.id
                                  ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Question conditionnelle : Veuf / Veuve */}
                    {wizardState.householdStatus === 'veuf' && (
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="text-xs font-bold text-[#101827]">
                          Précision pour le statut Veuf / Veuve :
                        </div>
                        <p className="text-xs text-slate-600">
                          Si vous avez au moins un enfant à charge, vous conservez automatiquement le quotient familial de <strong>2 parts de base</strong> comme un couple marié (article 194 du CGI).
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== STEP 3: CHILDREN & DEPENDANTS ==================== */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      <strong className="text-[#101827]">Comment les enfants réduisent votre impôt :</strong> Les 2 premiers enfants à charge donnent chacun <strong>+0,5 part</strong>. À partir du <strong>3e enfant</strong>, chaque enfant donne <strong>+1 part entière</strong>. En garde alternée, cet avantage est partagé par moitié entre les deux parents.
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-[#101827]">
                        Avez-vous des enfants mineurs, des enfants majeurs rattachés ou une personne invalide à votre charge ?
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setWizardState((prev) => ({
                              ...prev,
                              hasDependants: true,
                              exclusiveCustodyChildrenCount:
                                prev.exclusiveCustodyChildrenCount === 0 &&
                                prev.sharedCustodyChildrenCount === 0
                                  ? 1
                                  : prev.exclusiveCustodyChildrenCount,
                            }))
                          }
                          className={`px-4 py-2 rounded-md text-xs font-semibold border transition-colors ${
                            wizardState.hasDependants
                              ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Oui, j’ai au moins une personne à charge
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setWizardState((prev) => ({
                              ...prev,
                              hasDependants: false,
                              exclusiveCustodyChildrenCount: 0,
                              sharedCustodyChildrenCount: 0,
                              childrenUnder6Count: 0,
                              children6To17Count: 0,
                              adultChildrenAttachedCount: 0,
                              dependantsWithDisabilityCardCount: 0,
                            }))
                          }
                          className={`px-4 py-2 rounded-md text-xs font-semibold border transition-colors ${
                            !wizardState.hasDependants
                              ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Non, aucune personne à charge
                        </button>
                      </div>
                    </div>

                    {wizardState.hasDependants && (
                      <div className="space-y-5 pt-2 border-t border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                            <label className="block text-xs font-bold text-[#101827] mb-1">
                              Enfants en garde principale / charge exclusive
                            </label>
                            <p className="text-[11px] text-slate-500 mb-2">
                              Enfants vivant principalement chez vous (+0,5 part pour les 2 premiers, +1 part dès le 3e).
                            </p>
                            <input
                              type="number"
                              min={0}
                              max={8}
                              value={wizardState.exclusiveCustodyChildrenCount}
                              onChange={(e) =>
                                setWizardState((prev) => ({
                                  ...prev,
                                  exclusiveCustodyChildrenCount: Math.max(
                                    0,
                                    Math.min(8, Number(e.target.value) || 0)
                                  ),
                                }))
                              }
                              className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827]"
                            />
                          </div>

                          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                            <label className="block text-xs font-bold text-[#101827] mb-1">
                              Enfants en garde alternée (résidence partagée)
                            </label>
                            <p className="text-[11px] text-slate-500 mb-2">
                              Enfants dont la garde est partagée à égalité avec l’autre parent (+0,25 part ou +0,5 part).
                            </p>
                            <input
                              type="number"
                              min={0}
                              max={8}
                              value={wizardState.sharedCustodyChildrenCount}
                              onChange={(e) =>
                                setWizardState((prev) => ({
                                  ...prev,
                                  sharedCustodyChildrenCount: Math.max(
                                    0,
                                    Math.min(8, Number(e.target.value) || 0)
                                  ),
                                }))
                              }
                              className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827]"
                            />
                          </div>
                        </div>

                        {/* Catégories d'âge utiles uniquement pour les crédits/réductions d'impôt */}
                        <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                          <div className="text-xs font-bold text-[#101827] flex items-center gap-1.5">
                            <Baby className="w-4 h-4 text-emerald-600" />
                            Tranches d’âge (utiles uniquement pour vos crédits de garde et réductions de scolarité)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Moins de 6 ans (Garde 50 %)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={6}
                                value={wizardState.childrenUnder6Count}
                                onChange={(e) =>
                                  setWizardState((prev) => ({
                                    ...prev,
                                    childrenUnder6Count: Math.max(
                                      0,
                                      Number(e.target.value) || 0
                                    ),
                                  }))
                                }
                                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded text-[#101827]"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                6 à 17 ans (Collège / Lycée)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={8}
                                value={wizardState.children6To17Count}
                                onChange={(e) =>
                                  setWizardState((prev) => ({
                                    ...prev,
                                    children6To17Count: Math.max(
                                      0,
                                      Number(e.target.value) || 0
                                    ),
                                  }))
                                }
                                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded text-[#101827]"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Majeurs rattachés (&lt; 21 ou &lt; 25 étudiants)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={6}
                                value={wizardState.adultChildrenAttachedCount}
                                onChange={(e) =>
                                  setWizardState((prev) => ({
                                    ...prev,
                                    adultChildrenAttachedCount: Math.max(
                                      0,
                                      Number(e.target.value) || 0
                                    ),
                                  }))
                                }
                                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded text-[#101827]"
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-[11px] text-slate-600">
                              Membre(s) du foyer titulaire(s) d’une <strong>Carte Mobilité Inclusion (CMI mention invalidité)</strong> (+0,5 part légale) :
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={4}
                              value={wizardState.dependantsWithDisabilityCardCount}
                              onChange={(e) =>
                                setWizardState((prev) => ({
                                  ...prev,
                                  dependantsWithDisabilityCardCount: Math.max(
                                    0,
                                    Number(e.target.value) || 0
                                  ),
                                }))
                              }
                              className="w-24 px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded text-[#101827]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== STEP 4: INCOME (MULTIPLE TYPES + SKIP UNKNOWN) ==================== */}
                {currentStep === 4 && (
                  <div className="space-y-5">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                      <Wallet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#101827]">Plusieurs revenus possibles :</strong> Cochez toutes les catégories de revenus perçues par votre foyer. Si vous ne connaissez pas encore un montant exact, cochez simplement <strong>« Je ne connais pas encore le montant exact »</strong> : vous pourrez le compléter plus tard.
                      </div>
                    </div>

                    <div className="space-y-3">
                      {INCOME_CATEGORIES_META.map((cat) => {
                        const entry = wizardState.incomes[cat.key];
                        return (
                          <div
                            key={cat.key}
                            className={`p-4 rounded-lg border transition-all ${
                              entry.selected
                                ? 'border-emerald-600 bg-emerald-50/25'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={entry.selected}
                                  onChange={(e) =>
                                    updateIncome(cat.key, {
                                      selected: e.target.checked,
                                      annualAmountEur:
                                        e.target.checked && entry.annualAmountEur === 0
                                          ? cat.placeholderEur
                                          : entry.annualAmountEur,
                                    })
                                  }
                                  className="mt-1 accent-emerald-600"
                                />
                                <div>
                                  <div className="text-xs font-bold text-[#101827]">
                                    {cat.title}
                                  </div>
                                  <div className="text-[11px] text-slate-600 mt-0.5">
                                    {cat.simpleExplanation}
                                  </div>
                                </div>
                              </label>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded">
                                {cat.boxRef}
                              </span>
                            </div>

                            {entry.selected && (
                              <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-semibold text-slate-700">
                                    Montant annuel net imposable (€ / an) :
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={500}
                                    disabled={entry.amountUnknownOrSkipped}
                                    value={
                                      entry.amountUnknownOrSkipped
                                        ? 0
                                        : entry.annualAmountEur
                                    }
                                    onChange={(e) =>
                                      updateIncome(cat.key, {
                                        annualAmountEur: Math.max(
                                          0,
                                          Number(e.target.value) || 0
                                        ),
                                      })
                                    }
                                    className="w-36 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-[#101827] disabled:opacity-50"
                                  />
                                </div>

                                <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={entry.amountUnknownOrSkipped}
                                    onChange={(e) =>
                                      updateIncome(cat.key, {
                                        amountUnknownOrSkipped: e.target.checked,
                                      })
                                    }
                                    className="accent-emerald-600"
                                  />
                                  <span>
                                    Je ne connais pas encore le montant exact (passer)
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ==================== STEP 5: EXPENSES & TAX SITUATIONS ==================== */}
                {currentStep === 5 && (
                  <div className="space-y-5">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#101827]">Prudence juridique FISCALIQ :</strong> Nous ne supposons jamais qu’un avantage fiscal est acquis si ses conditions légales ne sont pas confirmées. Si vous sélectionnez <em>« À vérifier »</em>, la dépense est notée dans votre liste de contrôle sans fausser votre impôt garanti.
                      </div>
                    </div>

                    <div className="space-y-3">
                      {EXPENSE_SITUATIONS_META.map((exp) => {
                        const entry = wizardState.expenses[exp.key];
                        return (
                          <div
                            key={exp.key}
                            className={`p-4 rounded-lg border transition-all ${
                              entry.selected
                                ? 'border-emerald-600 bg-emerald-50/25'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <label className="flex items-start gap-2.5 cursor-pointer max-w-xl">
                                <input
                                  type="checkbox"
                                  checked={entry.selected}
                                  onChange={(e) =>
                                    updateExpense(exp.key, {
                                      selected: e.target.checked,
                                      annualAmountEur:
                                        e.target.checked && entry.annualAmountEur === 0
                                          ? exp.defaultAmountEur
                                          : entry.annualAmountEur,
                                    })
                                  }
                                  className="mt-1 accent-emerald-600"
                                />
                                <div>
                                  <div className="text-xs font-bold text-[#101827]">
                                    {exp.title}
                                  </div>
                                  <div className="text-[11px] text-slate-600 mt-0.5">
                                    {exp.simpleExplanation}
                                  </div>
                                </div>
                              </label>

                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {exp.mechanismBadge}
                              </span>
                            </div>

                            {entry.selected && (
                              <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs font-semibold text-slate-700">
                                      Dépense annuelle (€ / an) :
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={100}
                                      disabled={entry.amountUnknownOrSkipped}
                                      value={
                                        entry.amountUnknownOrSkipped
                                          ? 0
                                          : entry.annualAmountEur
                                      }
                                      onChange={(e) =>
                                        updateExpense(exp.key, {
                                          annualAmountEur: Math.max(
                                            0,
                                            Number(e.target.value) || 0
                                          ),
                                        })
                                      }
                                      className="w-32 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-[#101827] disabled:opacity-50"
                                    />
                                  </div>

                                  <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={entry.amountUnknownOrSkipped}
                                      onChange={(e) =>
                                        updateExpense(exp.key, {
                                          amountUnknownOrSkipped: e.target.checked,
                                        })
                                      }
                                      className="accent-emerald-600"
                                    />
                                    <span>Montant exact inconnu (passer)</span>
                                  </label>
                                </div>

                                <div className="p-2.5 rounded bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <span className="text-[11px] text-slate-700">
                                    {exp.conditionQuestion}
                                  </span>
                                  <div className="inline-flex rounded border border-slate-200 p-0.5 bg-slate-100 shrink-0">
                                    {[
                                      { id: 'oui' as TriStateAnswer, label: 'Oui, confirmé' },
                                      {
                                        id: 'ne_sait_pas' as TriStateAnswer,
                                        label: 'À vérifier',
                                      },
                                    ].map((cond) => (
                                      <button
                                        key={cond.id}
                                        type="button"
                                        onClick={() =>
                                          updateExpense(exp.key, {
                                            conditionsConfirmed: cond.id,
                                          })
                                        }
                                        className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                                          entry.conditionsConfirmed === cond.id
                                            ? 'bg-[#10B981] text-white shadow-xs'
                                            : 'text-slate-600 hover:text-[#172033]'
                                        }`}
                                      >
                                        {cond.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ==================== STEP 6: EXISTING TAX INFORMATION (100% OPTIONAL) ==================== */}
                {currentStep === 6 && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-emerald-950">
                          Cette étape est 100 % facultative
                        </div>
                        <p className="text-[11px] text-emerald-900">
                          Vous n’avez pas votre dernier avis d’impôt sous les yeux ? Cliquez sur le bouton ci-contre pour passer directement au récapitulatif.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWizardState((prev) => ({
                            ...prev,
                            skipExistingTaxNoticeStep: true,
                          }));
                          setCurrentStep(7);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#10B981] text-white hover:bg-[#059669] shrink-0 shadow-xs"
                      >
                        <SkipForward className="w-3.5 h-3.5 text-white" />
                        Passer cette étape
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                        <label className="block text-xs font-bold text-[#101827] mb-1">
                          Revenu fiscal de référence (RFR) N-1 (Optionnel)
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Inscrit en haut de la 1re page de votre dernier avis d’impôt. Sert à vérifier certaines aides sous conditions de ressources.
                        </p>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          value={wizardState.previousReferenceTaxIncomeEur ?? ''}
                          onChange={(e) =>
                            setWizardState((prev) => ({
                              ...prev,
                              skipExistingTaxNoticeStep: false,
                              previousReferenceTaxIncomeEur:
                                e.target.value === ''
                                  ? null
                                  : Math.max(0, Number(e.target.value)),
                            }))
                          }
                          placeholder="Optionnel (ex : 42 000 €)"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded text-[#101827]"
                        />
                      </div>

                      <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                        <label className="block text-xs font-bold text-[#101827] mb-1">
                          Taux de prélèvement à la source actuel (%) (Optionnel)
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Inscrit au bas de votre bulletin de salaire ou sur votre espace particulier impots.gouv.fr.
                        </p>
                        <input
                          type="number"
                          min={0}
                          max={45}
                          step={0.1}
                          value={wizardState.currentWithholdingRatePct ?? ''}
                          onChange={(e) =>
                            setWizardState((prev) => ({
                              ...prev,
                              skipExistingTaxNoticeStep: false,
                              currentWithholdingRatePct:
                                e.target.value === ''
                                  ? null
                                  : Math.max(0, Math.min(45, Number(e.target.value))),
                            }))
                          }
                          placeholder="Optionnel (ex : 4,5 %)"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded text-[#101827]"
                        />
                      </div>

                      <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                        <label className="block text-xs font-bold text-[#101827] mb-1">
                          Impôt déjà prélevé à la source cette année (€) (Optionnel)
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Permet d’estimer s’il vous restera un solde à payer en septembre ou si vous serez remboursé(e).
                        </p>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={wizardState.taxAlreadyWithheldOrPaidEur ?? ''}
                          onChange={(e) =>
                            setWizardState((prev) => ({
                              ...prev,
                              skipExistingTaxNoticeStep: false,
                              taxAlreadyWithheldOrPaidEur:
                                e.target.value === ''
                                  ? null
                                  : Math.max(0, Number(e.target.value)),
                            }))
                          }
                          placeholder="Optionnel (ex : 1 200 €)"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded text-[#101827]"
                        />
                      </div>

                      <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                        <label className="block text-xs font-bold text-[#101827] mb-1">
                          Plafond Épargne Retraite (PER) disponible (€) (Optionnel)
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Figure en dernière page de votre avis d’impôt (utile uniquement si vous versez sur un PER).
                        </p>
                        <input
                          type="number"
                          min={0}
                          step={200}
                          value={wizardState.availablePerCeilingEur ?? ''}
                          onChange={(e) =>
                            setWizardState((prev) => ({
                              ...prev,
                              skipExistingTaxNoticeStep: false,
                              availablePerCeilingEur:
                                e.target.value === ''
                                  ? null
                                  : Math.max(0, Number(e.target.value)),
                            }))
                          }
                          placeholder="Optionnel (ex : 5 400 €)"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded text-[#101827]"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-600">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Protection de vos données :</strong> Ne saisissez jamais votre numéro fiscal à 13 chiffres, votre mot de passe impots.gouv.fr, ni vos coordonnées bancaires (IBAN). FISCALIQ n’en a pas besoin pour calculer vos impôts.
                      </span>
                    </div>
                  </div>
                )}

                {/* ==================== STEP 7: REVIEW & SAVE PERSONAL TAX PROFILE ==================== */}
                {currentStep === 7 && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                          SYNTHÈSE DE VOTRE PROFIL FISCAL PERSONNEL
                        </span>
                        <h3 className="text-base font-bold text-[#101827]">
                          {wizardState.profileLabel} — Prêt à être enregistré
                        </h3>
                      </div>
                      <DataOriginBadge classification="ESTIMATION" />
                    </div>

                    {/* 3 cartes de synthèse : Quotient familial vérifié, Impôt estimé, Solde ou Avantages à vérifier */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E8EDF2] shadow-2xs">
                        <div className="text-[11px] text-slate-500">
                          Impôt annuel estimé (Barème 2026)
                        </div>
                        <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                          {evaluation.taxEstimate.finalEstimatedTaxEur.toLocaleString('fr-FR')} €
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Taux moyen : {evaluation.taxEstimate.effectiveWithholdingRatePercent.toLocaleString('fr-FR')} % · TMI {evaluation.taxEstimate.marginalTaxRatePercent} %
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-[11px] text-slate-500">
                          Parts fiscales (Quotient familial)
                        </div>
                        <div className="text-2xl font-bold font-mono text-[#101827] mt-1">
                          {evaluation.quotient.totalParts.toLocaleString('fr-FR')} part
                          {evaluation.quotient.totalParts > 1 ? 's' : ''}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                          Calcul vérifié (CGI Art. 194)
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-[11px] text-slate-500">
                          {evaluation.estimatedRemainingBalanceEur !== null
                            ? 'Solde estimé après acomptes déjà payés'
                            : 'Avantages confirmés déduits'}
                        </div>
                        <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                          {evaluation.estimatedRemainingBalanceEur !== null
                            ? `${evaluation.estimatedRemainingBalanceEur.toLocaleString('fr-FR')} €`
                            : `${evaluation.confirmedTaxCreditsAndReductionsEur.toLocaleString('fr-FR')} €`}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          {evaluation.unconfirmedPotentialBenefitsEur > 0
                            ? `+ ${evaluation.unconfirmedPotentialBenefitsEur.toLocaleString('fr-FR')} € potentiels à vérifier`
                            : 'Aucun avantage non vérifié supposé'}
                        </div>
                      </div>
                    </div>

                    {/* Explication détaillée des parts fiscales */}
                    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                      <div className="text-xs font-bold text-[#101827]">
                        Détail du calcul de vos parts fiscales ({evaluation.quotient.totalParts.toLocaleString('fr-FR')} parts) :
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                        {evaluation.quotient.explanationLines.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Liste explicite des points incomplets ou à vérifier (Zéro supposition juridique) */}
                    {evaluation.incompleteItemsToVerify.length > 0 && (
                      <div className="p-4 rounded-lg border border-amber-300 bg-amber-50/70 space-y-2">
                        <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          Points incomplets ou conditions légales à vérifier ({evaluation.incompleteItemsToVerify.length}) — Aucune supposition d’éligibilité appliquée :
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-amber-900">
                          {evaluation.incompleteItemsToVerify.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Boutons d'action finaux : Sauvegarder dans le tableau de bord + Aperçu Supabase RLS */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowSupabaseSqlModal((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        {showSupabaseSqlModal
                          ? 'Masquer la structure Supabase RLS'
                          : 'Voir la préparation Supabase & RGPD'}
                      </button>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleSaveOnboardingProfile}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Enregistrer mon profil fiscal personnel
                        </button>
                      </div>
                    </div>

                    {profileSavedSuccess && (
                      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold">
                              Votre profil fiscal personnel a bien été enregistré !
                            </div>
                            <p className="text-[11px] text-emerald-800 mt-0.5">
                              Votre tableau de bord, votre simulateur de fiche de paie et vos recommandations fiscales ont été mis à jour avec vos réponses.
                            </p>
                          </div>
                        </div>
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#10B981] text-white hover:bg-[#059669] shrink-0 shadow-xs"
                        >
                          Ouvrir mon tableau de bord <ArrowRight className="w-3.5 h-3.5 text-white" />
                        </Link>
                      </div>
                    )}

                    {showSupabaseSqlModal && (
                      <div className="p-4 rounded-xl bg-[#F8FAFC] text-slate-800 border border-[#E8EDF2] space-y-3 text-[11px] font-mono overflow-x-auto shadow-2xs">
                        <div className="text-emerald-700 font-bold">
                           Enregistrement JSON préparé pour Supabase PostgreSQL (RLS par auth.uid() = user_id) :
                        </div>
                        <pre className="text-[10px] leading-relaxed text-slate-700">
                          {JSON.stringify(supabasePreparedPayload, null, 2)}
                        </pre>
                        <div className="text-emerald-700 font-bold pt-2 border-t border-slate-200">
                          Schéma SQL & Politique Row-Level Security :
                        </div>
                        <pre className="text-[10px] leading-relaxed text-slate-600">
                          {PERSONAL_TAX_SUPABASE_RLS_SCHEMA}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
                </PageTransition>

                {/* Navigation Bas de carte : Étape précédente / Étape suivante */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={currentStep === 1}
                    onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Étape précédente
                  </button>

                  <div className="text-[11px] font-mono text-slate-500">
                    Étape {currentStep} / {WIZARD_STEPS.length}
                  </div>

                  {currentStep < WIZARD_STEPS.length ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentStep((prev) => Math.min(WIZARD_STEPS.length, prev + 1))
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs"
                    >
                      Continuer vers l’étape {currentStep + 1}
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveOnboardingProfile}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sauvegarder mon profil
                    </button>
                  )}
                </div>
              </div>

              {/* Colonne droite (4 cols) : Aperçu temps réel + Mini-glossaire des mots fiscaux expliqués simplement */}
              <aside className="lg:col-span-4 space-y-4">
                <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                      APERÇU EN DIRECT
                    </span>
                    <DataOriginBadge classification="ESTIMATION" />
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Résidence fiscale :</span>
                      <span className="font-semibold text-[#101827]">
                        {wizardState.residencyStatus === 'resident_france'
                          ? 'France (Résident)'
                          : wizardState.residencyStatus === 'non_resident_revenus_france'
                          ? 'Non-résident (SIPNR)'
                          : 'À vérifier'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Parts fiscales calculées :</span>
                      <span className="font-mono font-bold text-[#101827]">
                        {evaluation.quotient.totalParts.toLocaleString('fr-FR')} part
                        {evaluation.quotient.totalParts > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Revenus connus déclarés :</span>
                      <span className="font-mono font-semibold text-[#101827] tabular-nums">
                        <AnimatedNumber
                          value={
                            evaluation.totalKnownSalaryPensionUnemploymentEur +
                            evaluation.totalKnownAdditionalTaxableIncomeEur
                          }
                          suffix=" €"
                        />
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Crédits & réductions confirmés :</span>
                      <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                        <AnimatedNumber
                          value={evaluation.confirmedTaxCreditsAndReductionsEur}
                          prefix="- "
                          suffix=" €"
                        />
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-[#101827]">Impôt net annuel estimé :</span>
                      <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                        <AnimatedNumber
                          value={evaluation.taxEstimate.finalEstimatedTaxEur}
                          suffix=" € / an"
                        />
                      </span>
                    </div>
                  </div>

                  {evaluation.incompleteItemsToVerify.length > 0 && (
                    <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                      <strong>{evaluation.incompleteItemsToVerify.length} élément(s)</strong> noté(s) comme « incomplet ou à vérifier » (aucune éligibilité supposée).
                    </div>
                  )}
                </div>

                {/* Glossaire interactif des termes fiscaux expliqués simplement */}
                <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#101827]">
                      Mots fiscaux expliqués simplement
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      {
                        id: 'qf',
                        term: 'Quotient familial (Parts fiscales)',
                        def: 'Le nombre de parts divise votre revenu imposable avant d’appliquer le barème de l’impôt. Plus vous avez de parts, moins votre revenu grimpe dans les tranches élevées.',
                      },
                      {
                        id: 'net-imp',
                        term: 'Salaire net imposable vs Net payé',
                        def: 'Le « net imposable » figure au bas de votre fiche de paie : il est légèrement supérieur au salaire versé sur votre compte bancaire car il inclut une partie de la CSG/CRDS.',
                      },
                      {
                        id: 'credit-vs-red',
                        term: 'Crédit d’impôt vs Réduction d’impôt',
                        def: 'Un crédit d’impôt (garde d’enfant, emploi à domicile) vous est remboursé par virement même si votre impôt est de 0 €. Une réduction d’impôt (dons) diminue votre impôt mais n’est jamais remboursée au-delà de 0 €.',
                      },
                      {
                        id: 'case-t',
                        term: 'Case T (Parent isolé)',
                        def: 'Si vous vivez seul(e) au 1er janvier avec au moins un enfant à charge, la case T accorde +0,5 part supplémentaire.',
                      },
                    ].map((g) => {
                      const isOpen = activeGlossaryTerm === g.id;
                      return (
                        <div
                          key={g.id}
                          className="border border-slate-200 rounded-md overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActiveGlossaryTerm(isOpen ? null : g.id)
                            }
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-[#101827] bg-slate-50 hover:bg-slate-100 flex items-center justify-between"
                          >
                            <span>{g.term}</span>
                            <span className="text-emerald-600 font-mono">
                              {isOpen ? '−' : '+'}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="p-3 bg-white text-[11px] text-slate-600 leading-relaxed">
                              {g.def}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          /* ==================== MODE SIMULATEUR DIRECT PRÉSERVÉ ==================== */
          <div className="space-y-6">
            <section className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                    PROFIL FISCAL DU FOYER
                  </span>
                  <DataOriginBadge classification="DONNEE_FICTIVE_DEMO" />
                </div>
                <h2 className="text-base font-bold text-[#101827]">
                  {activeHousehold.householdName} — {activeHousehold.situationSummary}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Choisir un foyer de démonstration"
                  value={activeHousehold.id}
                  onChange={(e) => selectHouseholdById(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-md border border-slate-300 bg-slate-50 text-[#101827]"
                >
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.householdName}
                    </option>
                  ))}
                </select>

                <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setTaxYear(2026)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      taxYear === 2026
                        ? 'bg-[#10B981] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#172033]'
                    }`}
                  >
                    Barème 2026 (Défaut)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxYear(2025)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      taxYear === 2025
                        ? 'bg-[#10B981] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#172033]'
                    }`}
                  >
                    Barème 2025 (Historique)
                  </button>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-[#101827]">
                      1. Ma situation familiale & mes revenus
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {directPartsDetail.totalParts.toLocaleString('fr-FR')} part
                    {directPartsDetail.totalParts > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Situation familiale
                    </label>
                    <select
                      value={activeHousehold.maritalStatus}
                      onChange={(e) => {
                        const status = e.target.value as FamilyMaritalStatus;
                        updateActiveHousehold({ maritalStatus: status });
                      }}
                      className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    >
                      <option value="celibataire">Célibataire / Divorcé(e)</option>
                      <option value="marie_pacse">Marié(e) ou Pacsé(e)</option>
                      <option value="parent_isole">Parent isolé (Case T)</option>
                      <option value="veuf">Veuf / Veuve</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Personnes à charge (enfants)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={8}
                      value={activeHousehold.dependantsCount}
                      onChange={(e) =>
                        updateActiveHousehold({
                          dependantsCount: Math.max(
                            0,
                            Math.min(8, Number(e.target.value) || 0)
                          ),
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salaires ou pensions nets imposables annuels du foyer (€ / an)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={activeHousehold.annualDeclaredSalaryNetImposableEur}
                    onChange={(e) =>
                      updateActiveHousehold({
                        annualDeclaredSalaryNetImposableEur: Math.max(
                          0,
                          Number(e.target.value) || 0
                        ),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Frais professionnels réels (€/an)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={fraisReelsInput}
                    onChange={(e) =>
                      setFraisReelsInput(Math.max(0, Number(e.target.value) || 0))
                    }
                    placeholder="0 (Abattement 10 % auto)"
                    className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                  />
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#101827]">
                    Synthèse du barème progressif ({directTaxResult.declarationYear})
                  </h3>
                  <DataOriginBadge classification="CALCUL_VERIFIE" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E8EDF2] shadow-2xs">
                    <div className="text-[11px] text-slate-500">Impôt net annuel estimé</div>
                    <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                      {directTaxResult.finalEstimatedTaxEur.toLocaleString('fr-FR')} €
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">Taux moyen</div>
                    <div className="text-2xl font-bold font-mono text-[#101827] mt-1">
                      {directTaxResult.effectiveWithholdingRatePercent.toLocaleString('fr-FR')} %
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">Tranche marginale (TMI)</div>
                    <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                      {directTaxResult.marginalTaxRatePercent} %
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {directTaxResult.bracketSlices.map((b) => (
                    <div
                      key={b.label}
                      className="p-2.5 rounded-md border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#101827] mr-2">
                          Tranche {b.ratePercent} %
                        </span>
                        <span className="text-slate-600">{b.label}</span>
                      </div>
                      <div className="font-mono font-bold text-[#101827]">
                        {b.taxPerPartEur.toLocaleString('fr-FR')} € / part
                      </div>
                    </div>
                  ))}
                </div>

                {saveMessage && (
                  <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                    {saveMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
