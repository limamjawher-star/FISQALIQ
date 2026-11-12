'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { DataOriginBadge, ExpandableDetail } from '@/components/ui/design-system';
import {
  evaluateTaxOptimizationDiscovery,
  PersonalTaxDiscoveryInput,
  DiscoveredTaxOpportunity,
  DiscoveryEligibilityStatus,
  TriStateAnswer,
  SupportedTaxYear,
} from '@/lib/calculations/personal-tax-engine';
import {
  Sparkles,
  ExternalLink,
  Filter,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  FileText,
  Scale,
  ArrowRight,
  BookmarkCheck,
  SlidersHorizontal,
  Ban,
  CalendarCheck,
  RefreshCw,
} from 'lucide-react';

type StatusFilter =
  | 'ALL'
  | 'ELIGIBLE_VERIFIE'
  | 'INCERTAIN_QUESTIONS_REQUISES'
  | 'NON_RETENU';

export default function PersonalTaxOptimizationPage() {
  const { activeHousehold, updateActiveHousehold, savePersonalSimulation } = useFiscaliq();

  // Initialize questionnaire state from activeHousehold with realistic initial discovery values
  const [taxYear, setTaxYear] = useState<SupportedTaxYear>(2026);
  const [discoveryInput, setDiscoveryInput] = useState<PersonalTaxDiscoveryInput>(() => ({
    taxYear: 2026,
    maritalStatus: activeHousehold.maritalStatus,
    dependantsCount: activeHousehold.dependantsCount,
    annualGrossSalaryOrPensionImposableEur:
      activeHousehold.annualDeclaredSalaryNetImposableEur,

    // 1. Frais professionnels (Frais réels vs 10%)
    hasCommuteOrProfessionalExpenses: true,
    estimatedAnnualRealProfessionalExpensesEur: Math.round(
      activeHousehold.annualDeclaredSalaryNetImposableEur * 0.135
    ),
    canJustifyRealProfessionalExpenses: 'oui',

    // 2. Garde d'enfants < 6 ans hors domicile
    childrenUnder6Count: activeHousehold.dependantsCount >= 1 ? 1 : 0,
    annualChildcareExpensesNetOfCafEur: activeHousehold.dependantsCount >= 1 ? 3200 : 0,
    childcareOutsideHomeAndCafDeductedConfirmed:
      activeHousehold.dependantsCount >= 1 ? 'oui' : 'non',

    // 3. Services à la personne / Emploi à domicile
    usesHomeEmploymentServices: true,
    annualHomeServicesNetExpenseEur: 2400,
    homeServicesUrssafAttestationConfirmed: 'ne_sait_pas',

    // 4. Dons aux associations (75% et 66%)
    makesCharitableDonations: true,
    annualDonations75PctHelpPeopleEur: 200,
    annualDonations66PctGeneralInterestEur: 400,
    donationsReceiptsConfirmed: 'oui',

    // 5. Pension alimentaire versée
    paysAlimony: false,
    alimonyBeneficiaryCount: 1,
    annualAlimonyPaidEur: 3600,
    alimonyBeneficiaryNotAttachedToHouseholdConfirmed: 'ne_sait_pas',

    // 6. Plan d'Épargne Retraite (PER)
    contributesToPer: true,
    annualPerContributionEur:
      activeHousehold.perContributionAnnualEur > 0
        ? activeHousehold.perContributionAnnualEur
        : 2500,
    availablePerCeilingOnNoticeEur: 4800,
    perCeilingVerifiedOnTaxNoticeConfirmed: 'ne_sait_pas',

    // 7. Revenus fonciers (Micro-foncier 30% vs Régime réel & Déficit foncier)
    hasUnfurnishedRentalIncome: activeHousehold.additionalNetTaxableIncomeEur > 0,
    annualGrossRentalIncomeEur:
      activeHousehold.additionalNetTaxableIncomeEur > 0
        ? activeHousehold.additionalNetTaxableIncomeEur
        : 9600,
    annualDeductibleRentalExpensesEur: 4900,
    rentalExpensesJustifiedAndUnfurnishedConfirmed: 'ne_sait_pas',

    // 8. Autres avantages familiaux (Case T & Scolarité)
    livesAloneWithChildrenOnJan1Confirmed:
      activeHousehold.maritalStatus === 'parent_isole' ? 'oui' : 'non',
    childrenInMiddleSchoolCount: activeHousehold.dependantsCount >= 2 ? 1 : 0,
    childrenInHighSchoolCount: 0,
    childrenInHigherEducationCount: 0,
  }));

  const [activeQuestionnaireTab, setActiveQuestionnaireTab] = useState<
    'foyer_salaires' | 'famille_domicile' | 'epargne_dons_foncier'
  >('foyer_salaires');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [savedBannerMessage, setSavedBannerMessage] = useState<string | null>(null);

  // Sync helper when user switches household profile or clicks "Synchroniser avec mon profil actif"
  const syncFromActiveHousehold = () => {
    setDiscoveryInput((prev) => ({
      ...prev,
      maritalStatus: activeHousehold.maritalStatus,
      dependantsCount: activeHousehold.dependantsCount,
      annualGrossSalaryOrPensionImposableEur:
        activeHousehold.annualDeclaredSalaryNetImposableEur,
      childrenUnder6Count: activeHousehold.dependantsCount >= 1 ? 1 : 0,
      livesAloneWithChildrenOnJan1Confirmed:
        activeHousehold.maritalStatus === 'parent_isole' ? 'oui' : 'non',
    }));
    setSavedBannerMessage(
      `Données synchronisées avec le profil « ${activeHousehold.householdName} ».`
    );
  };

  // Load curated demonstration profiles to test edge cases (non-refundable vs refundable, real expenses, rental deficit)
  const loadDiscoveryPreset = (
    preset: 'famille_active' | 'salarie_frais_reels' | 'parent_isole_modeste' | 'bailleur_per'
  ) => {
    if (preset === 'famille_active') {
      setDiscoveryInput({
        taxYear,
        maritalStatus: 'marie_pacse',
        dependantsCount: 2,
        annualGrossSalaryOrPensionImposableEur: 68000,
        hasCommuteOrProfessionalExpenses: true,
        estimatedAnnualRealProfessionalExpensesEur: 5200, // < 10% (6 800 €) -> 10% kept automatically!
        canJustifyRealProfessionalExpenses: 'oui',
        childrenUnder6Count: 1,
        annualChildcareExpensesNetOfCafEur: 3500,
        childcareOutsideHomeAndCafDeductedConfirmed: 'oui',
        usesHomeEmploymentServices: true,
        annualHomeServicesNetExpenseEur: 3000,
        homeServicesUrssafAttestationConfirmed: 'oui',
        makesCharitableDonations: true,
        annualDonations75PctHelpPeopleEur: 300,
        annualDonations66PctGeneralInterestEur: 500,
        donationsReceiptsConfirmed: 'oui',
        paysAlimony: false,
        alimonyBeneficiaryCount: 1,
        annualAlimonyPaidEur: 0,
        alimonyBeneficiaryNotAttachedToHouseholdConfirmed: 'non',
        contributesToPer: true,
        annualPerContributionEur: 3000,
        availablePerCeilingOnNoticeEur: 5500,
        perCeilingVerifiedOnTaxNoticeConfirmed: 'ne_sait_pas',
        hasUnfurnishedRentalIncome: false,
        annualGrossRentalIncomeEur: 0,
        annualDeductibleRentalExpensesEur: 0,
        rentalExpensesJustifiedAndUnfurnishedConfirmed: 'non',
        livesAloneWithChildrenOnJan1Confirmed: 'non',
        childrenInMiddleSchoolCount: 1,
        childrenInHighSchoolCount: 0,
        childrenInHigherEducationCount: 0,
      });
    } else if (preset === 'salarie_frais_reels') {
      setDiscoveryInput({
        taxYear,
        maritalStatus: 'celibataire',
        dependantsCount: 0,
        annualGrossSalaryOrPensionImposableEur: 38000,
        hasCommuteOrProfessionalExpenses: true,
        estimatedAnnualRealProfessionalExpensesEur: 6400, // > 10% (3 800 €) -> Frais réels advantageous!
        canJustifyRealProfessionalExpenses: 'oui',
        childrenUnder6Count: 0,
        annualChildcareExpensesNetOfCafEur: 0,
        childcareOutsideHomeAndCafDeductedConfirmed: 'non',
        usesHomeEmploymentServices: true,
        annualHomeServicesNetExpenseEur: 1600,
        homeServicesUrssafAttestationConfirmed: 'oui',
        makesCharitableDonations: true,
        annualDonations75PctHelpPeopleEur: 150,
        annualDonations66PctGeneralInterestEur: 250,
        donationsReceiptsConfirmed: 'oui',
        paysAlimony: false,
        alimonyBeneficiaryCount: 1,
        annualAlimonyPaidEur: 0,
        alimonyBeneficiaryNotAttachedToHouseholdConfirmed: 'non',
        contributesToPer: true,
        annualPerContributionEur: 2500,
        availablePerCeilingOnNoticeEur: 3800,
        perCeilingVerifiedOnTaxNoticeConfirmed: 'oui',
        hasUnfurnishedRentalIncome: false,
        annualGrossRentalIncomeEur: 0,
        annualDeductibleRentalExpensesEur: 0,
        rentalExpensesJustifiedAndUnfurnishedConfirmed: 'non',
        livesAloneWithChildrenOnJan1Confirmed: 'non',
        childrenInMiddleSchoolCount: 0,
        childrenInHighSchoolCount: 0,
        childrenInHigherEducationCount: 0,
      });
    } else if (preset === 'parent_isole_modeste') {
      setDiscoveryInput({
        taxYear,
        maritalStatus: 'parent_isole',
        dependantsCount: 1,
        annualGrossSalaryOrPensionImposableEur: 23500, // Tax before credits is 0 € -> demonstrates Refundable Credit vs Non-refundable Reduction!
        hasCommuteOrProfessionalExpenses: false,
        estimatedAnnualRealProfessionalExpensesEur: 1200,
        canJustifyRealProfessionalExpenses: 'non',
        childrenUnder6Count: 1,
        annualChildcareExpensesNetOfCafEur: 2800,
        childcareOutsideHomeAndCafDeductedConfirmed: 'oui',
        usesHomeEmploymentServices: false,
        annualHomeServicesNetExpenseEur: 0,
        homeServicesUrssafAttestationConfirmed: 'non',
        makesCharitableDonations: true,
        annualDonations75PctHelpPeopleEur: 100,
        annualDonations66PctGeneralInterestEur: 200,
        donationsReceiptsConfirmed: 'oui',
        paysAlimony: false,
        alimonyBeneficiaryCount: 1,
        annualAlimonyPaidEur: 0,
        alimonyBeneficiaryNotAttachedToHouseholdConfirmed: 'non',
        contributesToPer: false,
        annualPerContributionEur: 0,
        availablePerCeilingOnNoticeEur: 2000,
        perCeilingVerifiedOnTaxNoticeConfirmed: 'non',
        hasUnfurnishedRentalIncome: false,
        annualGrossRentalIncomeEur: 0,
        annualDeductibleRentalExpensesEur: 0,
        rentalExpensesJustifiedAndUnfurnishedConfirmed: 'non',
        livesAloneWithChildrenOnJan1Confirmed: 'oui',
        childrenInMiddleSchoolCount: 0,
        childrenInHighSchoolCount: 0,
        childrenInHigherEducationCount: 0,
      });
    } else if (preset === 'bailleur_per') {
      setDiscoveryInput({
        taxYear,
        maritalStatus: 'marie_pacse',
        dependantsCount: 1,
        annualGrossSalaryOrPensionImposableEur: 86000,
        hasCommuteOrProfessionalExpenses: true,
        estimatedAnnualRealProfessionalExpensesEur: 11200,
        canJustifyRealProfessionalExpenses: 'oui',
        childrenUnder6Count: 0,
        annualChildcareExpensesNetOfCafEur: 0,
        childcareOutsideHomeAndCafDeductedConfirmed: 'non',
        usesHomeEmploymentServices: true,
        annualHomeServicesNetExpenseEur: 4200,
        homeServicesUrssafAttestationConfirmed: 'oui',
        makesCharitableDonations: true,
        annualDonations75PctHelpPeopleEur: 500,
        annualDonations66PctGeneralInterestEur: 1000,
        donationsReceiptsConfirmed: 'oui',
        paysAlimony: true,
        alimonyBeneficiaryCount: 1,
        annualAlimonyPaidEur: 5800,
        alimonyBeneficiaryNotAttachedToHouseholdConfirmed: 'oui',
        contributesToPer: true,
        annualPerContributionEur: 6000,
        availablePerCeilingOnNoticeEur: 8200,
        perCeilingVerifiedOnTaxNoticeConfirmed: 'oui',
        hasUnfurnishedRentalIncome: true,
        annualGrossRentalIncomeEur: 12000,
        annualDeductibleRentalExpensesEur: 16500, // Creates 4 500 € Déficit foncier imputable!
        rentalExpensesJustifiedAndUnfurnishedConfirmed: 'oui',
        livesAloneWithChildrenOnJan1Confirmed: 'non',
        childrenInMiddleSchoolCount: 0,
        childrenInHighSchoolCount: 0,
        childrenInHigherEducationCount: 1,
      });
    }
    setSavedBannerMessage(null);
  };

  // Run deterministic discovery engine
  const discoveryResult = useMemo(() => {
    return evaluateTaxOptimizationDiscovery({
      ...discoveryInput,
      taxYear,
    });
  }, [discoveryInput, taxYear]);

  const countsByStatus = useMemo(() => {
    const eligible = discoveryResult.opportunities.filter(
      (o) => o.eligibilityStatus === 'ELIGIBLE_VERIFIE'
    ).length;
    const uncertain = discoveryResult.opportunities.filter(
      (o) => o.eligibilityStatus === 'INCERTAIN_QUESTIONS_REQUISES'
    ).length;
    const nonRetenu = discoveryResult.opportunities.filter(
      (o) =>
        o.eligibilityStatus === 'NON_AVANTAGEUX_OU_PLAFONNE' ||
        o.eligibilityStatus === 'NON_APPLICABLE_EXCLUSION'
    ).length;
    return { eligible, uncertain, nonRetenu };
  }, [discoveryResult.opportunities]);

  const filteredOpportunities = useMemo(() => {
    if (statusFilter === 'ALL') return discoveryResult.opportunities;
    if (statusFilter === 'NON_RETENU') {
      return discoveryResult.opportunities.filter(
        (o) =>
          o.eligibilityStatus === 'NON_AVANTAGEUX_OU_PLAFONNE' ||
          o.eligibilityStatus === 'NON_APPLICABLE_EXCLUSION'
      );
    }
    return discoveryResult.opportunities.filter((o) => o.eligibilityStatus === statusFilter);
  }, [discoveryResult.opportunities, statusFilter]);

  // Direct resolution of uncertainty questions from an opportunity card
  const resolveOpportunityUncertainty = (
    categoryKey: DiscoveredTaxOpportunity['categoryKey'],
    answer: TriStateAnswer
  ) => {
    setDiscoveryInput((prev) => {
      switch (categoryKey) {
        case 'frais_professionnels':
          return { ...prev, canJustifyRealProfessionalExpenses: answer };
        case 'garde_enfants':
          return { ...prev, childcareOutsideHomeAndCafDeductedConfirmed: answer };
        case 'emploi_domicile':
          return { ...prev, homeServicesUrssafAttestationConfirmed: answer };
        case 'dons_associations':
          return { ...prev, donationsReceiptsConfirmed: answer };
        case 'pension_alimentaire':
          return { ...prev, alimonyBeneficiaryNotAttachedToHouseholdConfirmed: answer };
        case 'epargne_retraite_per':
          return { ...prev, perCeilingVerifiedOnTaxNoticeConfirmed: answer };
        case 'revenus_fonciers':
          return { ...prev, rentalExpensesJustifiedAndUnfurnishedConfirmed: answer };
        case 'autres_avantages_foyer':
          return { ...prev, livesAloneWithChildrenOnJan1Confirmed: answer };
        default:
          return prev;
      }
    });
  };

  // Apply verified scenario to active household and save simulation
  const handleApplyVerifiedScenarioToHousehold = () => {
    const opt = discoveryResult.optimizedScenario;
    const totalCreditsAndReductions =
      opt.nonRefundableReductionsAppliedEur + opt.refundableTaxCreditsAppliedEur;

    updateActiveHousehold({
      maritalStatus:
        discoveryInput.livesAloneWithChildrenOnJan1Confirmed === 'oui' &&
        (discoveryInput.maritalStatus === 'celibataire' ||
          discoveryInput.maritalStatus === 'divorce_separe' ||
          discoveryInput.maritalStatus === 'parent_isole') &&
        discoveryInput.dependantsCount >= 1
          ? 'parent_isole'
          : discoveryInput.maritalStatus,
      dependantsCount: discoveryInput.dependantsCount,
      annualDeclaredSalaryNetImposableEur:
        discoveryInput.annualGrossSalaryOrPensionImposableEur,
      additionalNetTaxableIncomeEur: opt.netRentalIncomeAddedEur,
      perContributionAnnualEur: opt.deductiblePerEur + opt.deductibleAlimonyEur,
      estimatedEligibleTaxCreditsEur: totalCreditsAndReductions,
    });

    savePersonalSimulation({
      householdId: activeHousehold.id,
      title: `Découverte fiscale vérifiée (${discoveryResult.declarationYear}) · ${countsByStatus.eligible} dispositif(s) retenu(s)`,
      moduleType: 'AVANTAGE_FISCAL',
      taxYear: discoveryResult.declarationYear,
      classification: 'CALCUL_VERIFIE',
      inputsSummary: `Revenu ${discoveryInput.annualGrossSalaryOrPensionImposableEur.toLocaleString(
        'fr-FR'
      )} € · ${opt.familyQuotientParts} part(s) · ${
        opt.professionalDeductionMode === 'frais_reels' ? 'Frais réels' : 'Abattement 10 %'
      }`,
      mainResultLabel:
        opt.estimatedRefundFromDgfipEur > 0
          ? 'Remboursement DGFiP estimé'
          : 'Impôt net annuel après optimisation légale',
      mainResultAmountEur:
        opt.estimatedRefundFromDgfipEur > 0
          ? opt.estimatedRefundFromDgfipEur
          : opt.finalNetTaxToPayEur,
      secondaryDetail: `Écart annuel vérifié : -${discoveryResult.verifiedNetAnnualDifferenceEur.toLocaleString(
        'fr-FR'
      )} € · Niches fiscales : ${discoveryResult.globalNicheCeilingUsedEur.toLocaleString(
        'fr-FR'
      )} € / 10 000 €`,
      statutoryRef: 'CGI Art. 83-3°, 156, 163 quatervicies, 199 sexdecies, 200, 200 quater B',
    });

    setSavedBannerMessage(
      `Simulation vérifiée enregistrée et appliquée à votre foyer (${countsByStatus.eligible} avantage(s) confirmé(s), 0 double comptage).`
    );
  };

  const renderEligibilityBadge = (status: DiscoveryEligibilityStatus, text: string) => {
    if (status === 'ELIGIBLE_VERIFIE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          {text}
        </span>
      );
    }
    if (status === 'INCERTAIN_QUESTIONS_REQUISES') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          {text}
        </span>
      );
    }
    if (status === 'NON_AVANTAGEUX_OU_PLAFONNE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <Scale className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {text}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        {text}
      </span>
    );
  };

  const renderMechanismBadge = (type: DiscoveredTaxOpportunity['mechanismType'], label: string) => {
    if (type === 'CREDIT_IMPOT_REMBOURSABLE') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-emerald-100/80 text-emerald-900 border border-emerald-300">
          {label}
        </span>
      );
    }
    if (type === 'REDUCTION_IMPOT_NON_REMBOURSABLE') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-100/80 text-amber-900 border border-amber-300">
          {label}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-blue-50 text-blue-900 border border-blue-200">
        {label}
      </span>
    );
  };

  const renderTriStateSelector = (
    value: TriStateAnswer,
    onChange: (next: TriStateAnswer) => void,
    yesLabel = 'Oui, confirmé',
    unknownLabel = 'Je ne sais pas (à vérifier)',
    noLabel = 'Non'
  ) => (
    <div className="inline-flex flex-wrap rounded-md border border-slate-300 bg-white p-0.5 gap-0.5">
      {(
        [
          { id: 'oui', label: yesLabel, activeClass: 'bg-emerald-600 text-white' },
          { id: 'ne_sait_pas', label: unknownLabel, activeClass: 'bg-amber-500 text-[#101827]' },
          { id: 'non', label: noLabel, activeClass: 'bg-slate-200 text-slate-800 font-bold' },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
            value === opt.id ? opt.activeClass : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <AppShell title="Mes économies">
      <div className="space-y-6">
        <p className="text-xs text-slate-600 -mt-2">
          Découvrez les déductions, réductions et crédits d’impôt adaptés à votre foyer.
        </p>
        {/* Banner de sauvegarde / synchronisation */}
        {savedBannerMessage && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedBannerMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSavedBannerMessage(null)}
              className="text-emerald-700 hover:underline font-semibold"
            >
              Fermer
            </button>
          </div>
        )}

        {/* SECTION 1 : Pédagogie — Distinguer Déduction, Réduction non remboursable et Crédit d'impôt remboursable */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                RÈGLES OFFICIELLES DGFIP
              </span>
              <h2 className="text-sm sm:text-base font-bold text-[#172033]">
                Les 3 types d’économies fiscales expliqués en 1 phrase
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Ordre légal d’imputation DGFiP appliqué
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-[10px] uppercase text-blue-900">1. Déduction fiscale</span>
                <span className="text-[10px] bg-white text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">Sur le revenu</span>
              </div>
              <p className="font-semibold text-slate-900">Diminue votre revenu avant le barème</p>
              <p className="text-slate-600 text-[11px]">Ex : Frais réels kilométriques, PER, pensions. L’économie dépend de votre tranche (TMI).</p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-[10px] uppercase text-amber-900">2. Réduction d’impôt</span>
                <span className="text-[10px] bg-white text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">Non remboursable</span>
              </div>
              <p className="font-semibold text-slate-900">Diminue votre impôt jusqu’à 0 € max</p>
              <p className="text-slate-600 text-[11px]">Ex : Dons aux associations (66 % / 75 %). Si votre impôt est de 0 €, le surplus est perdu.</p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-[10px] uppercase text-emerald-900">3. Crédit d’impôt</span>
                <span className="text-[10px] bg-white text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">Remboursable</span>
              </div>
              <p className="font-semibold text-slate-900">Remboursé même si vous payez 0 €</p>
              <p className="text-slate-600 text-[11px]">Ex : Garde &lt; 6 ans (50 %), emploi à domicile (50 %). Virement direct sur votre compte.</p>
            </div>
          </div>
        </section>

        {/* SECTION 2 : Questionnaire interactif de découverte fiscale basé sur le profil du foyer */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-bold text-[#101827]">
                  Questionnaire de découverte fiscale & vérification des conditions
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Renseignez votre situation réelle. Le moteur ne retient dans le scénario optimisé <strong>que les dispositifs à la fois avantageux financièrement et dont les conditions légales sont confirmées</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                {([2026, 2025] as const).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setTaxYear(yr)}
                    className={`px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors ${
                      taxYear === yr
                        ? 'bg-[#10B981] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#172033]'
                    }`}
                  >
                    Barème {yr}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={syncFromActiveHousehold}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Synchroniser avec {activeHousehold.householdName}
              </button>
            </div>
          </div>

          {/* Barre de profils types pour tester les cas limites */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-3 px-3.5 my-4 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <DataOriginBadge classification="DONNEE_FICTIVE_DEMO" />
              <span className="font-medium">Charger un cas pratique de démonstration :</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadDiscoveryPreset('famille_active')}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 transition-colors"
              >
                Couple 2 enfants (Garde + Domicile + Dons)
              </button>
              <button
                type="button"
                onClick={() => loadDiscoveryPreset('salarie_frais_reels')}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 transition-colors"
              >
                Salarié (Frais réels &gt; 10 % + PER)
              </button>
              <button
                type="button"
                onClick={() => loadDiscoveryPreset('parent_isole_modeste')}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 transition-colors"
              >
                Parent isolé non imposable (Crédit remboursé vs Réduction non remboursée)
              </button>
              <button
                type="button"
                onClick={() => loadDiscoveryPreset('bailleur_per')}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 transition-colors"
              >
                Propriétaire bailleur (Déficit foncier + Pension + PER)
              </button>
            </div>
          </div>

          {/* Navigation par étape du questionnaire */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
            {[
              {
                id: 'foyer_salaires',
                step: 'Partie 1/3',
                title: 'Foyer, Salaires & Frais professionnels (10 % vs Frais réels)',
              },
              {
                id: 'famille_domicile',
                step: 'Partie 2/3',
                title: 'Famille : Garde < 6 ans, Emploi à domicile, Pension & Scolarité',
              },
              {
                id: 'epargne_dons_foncier',
                step: 'Partie 3/3',
                title: 'Dons associatifs, Épargne Retraite (PER) & Immobilier locatif',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveQuestionnaireTab(
                    tab.id as 'foyer_salaires' | 'famille_domicile' | 'epargne_dons_foncier'
                  )
                }
                className={`p-3 rounded-lg border text-left transition-all ${
                  activeQuestionnaireTab === tab.id
                    ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                    : 'bg-slate-50/70 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                    activeQuestionnaireTab === tab.id ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  {tab.step}
                </div>
                <div className="text-xs font-bold mt-0.5 leading-snug">{tab.title}</div>
              </button>
            ))}
          </div>

          {/* PARTIE 1 : FOYER, SALAIRES & FRAIS PROFESSIONNELS */}
          {activeQuestionnaireTab === 'foyer_salaires' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Situation familiale du foyer
                  </label>
                  <select
                    value={discoveryInput.maritalStatus}
                    onChange={(e) =>
                      setDiscoveryInput((prev) => ({
                        ...prev,
                        maritalStatus: e.target.value as PersonalTaxDiscoveryInput['maritalStatus'],
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-md text-[#101827]"
                  >
                    <option value="celibataire">Célibataire (1 part de base)</option>
                    <option value="divorce_separe">Divorcé(e) / Séparé(e) (1 part de base)</option>
                    <option value="parent_isole">Parent isolé — Case T (majoration +0,5 part)</option>
                    <option value="marie_pacse">Marié(e) ou Pacsé(e) (2 parts de base)</option>
                    <option value="veuf">Veuf / Veuve</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Personnes à charge rattachées au foyer
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={discoveryInput.dependantsCount}
                    onChange={(e) =>
                      setDiscoveryInput((prev) => ({
                        ...prev,
                        dependantsCount: Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-md text-[#101827]"
                  />
                  <span className="text-[11px] text-slate-500">
                    Quotient calculé :{' '}
                    <strong>{discoveryResult.optimizedScenario.familyQuotientParts} part(s)</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salaires ou pensions nets imposables annuels (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={discoveryInput.annualGrossSalaryOrPensionImposableEur}
                    onChange={(e) =>
                      setDiscoveryInput((prev) => ({
                        ...prev,
                        annualGrossSalaryOrPensionImposableEur: Math.max(
                          0,
                          Number(e.target.value) || 0
                        ),
                      }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-md text-[#101827]"
                  />
                  <span className="text-[11px] text-slate-500 font-mono">
                    Abattement 10 % automatique :{' '}
                    {discoveryResult.baselineScenario.professionalDeductionEur.toLocaleString(
                      'fr-FR'
                    )}{' '}
                    €
                  </span>
                </div>
              </div>

              {/* Catégorie 1 : Frais professionnels réels vs 10% */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-800">
                      CATÉGORIE 1 · FRAIS PROFESSIONNELS
                    </span>
                    <h3 className="text-sm font-bold text-[#101827]">
                      Frais professionnels : Frais réels vs Abattement forfaitaire de 10 %
                    </h3>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discoveryInput.hasCommuteOrProfessionalExpenses}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          hasCommuteOrProfessionalExpenses: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    J’ai des frais de trajet domicile-travail, de repas ou de télétravail
                  </label>
                </div>

                {discoveryInput.hasCommuteOrProfessionalExpenses && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Montant annuel estimé de vos frais professionnels réels (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={discoveryInput.estimatedAnnualRealProfessionalExpensesEur}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            estimatedAnnualRealProfessionalExpensesEur: Math.max(
                              0,
                              Number(e.target.value) || 0
                            ),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Seuil de rentabilité face à vos 10 % : vos frais réels doivent dépasser{' '}
                        <strong className="text-[#101827]">
                          {discoveryResult.baselineScenario.professionalDeductionEur.toLocaleString(
                            'fr-FR'
                          )}{' '}
                          €
                        </strong>
                        .
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pouvez-vous justifier ces dépenses (factures, carte grise, trajet ≤ 40 km) ?
                      </label>
                      {renderTriStateSelector(
                        discoveryInput.canJustifyRealProfessionalExpenses,
                        (val) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            canJustifyRealProfessionalExpenses: val,
                          }))
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">
                        Règle anti-double comptage : si retenus, les frais réels remplacent l’abattement de 10 %.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Catégorie 8 : Case T & Scolarité */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-800">
                      CATÉGORIE 8 · SITUATION FAMILIALE &amp; SCOLARITÉ
                    </span>
                    <h3 className="text-sm font-bold text-[#101827]">
                      Parent isolé (Case T) &amp; Frais de scolarité
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Viviez-vous seul(e) au 1er janvier avec vos enfants (Case T) ?
                    </label>
                    {renderTriStateSelector(
                      discoveryInput.livesAloneWithChildrenOnJan1Confirmed,
                      (val) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          livesAloneWithChildrenOnJan1Confirmed: val,
                        })),
                      'Oui (Parent isolé)',
                      'À vérifier',
                      'Non / En couple'
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Enfants au Collège (61 €/an)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={8}
                      value={discoveryInput.childrenInMiddleSchoolCount}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          childrenInMiddleSchoolCount: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Enfants au Lycée (153 €/an)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={8}
                      value={discoveryInput.childrenInHighSchoolCount}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          childrenInHighSchoolCount: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Études supérieures (183 €/an)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={8}
                      value={discoveryInput.childrenInHigherEducationCount}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          childrenInHigherEducationCount: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PARTIE 2 : FAMILLE, GARDE < 6 ANS, EMPLOI À DOMICILE & PENSION ALIMENTAIRE */}
          {activeQuestionnaireTab === 'famille_domicile' && (
            <div className="space-y-4">
              {/* Catégorie 2 : Garde d'enfants < 6 ans */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-800">
                      CATÉGORIE 2 · CRÉDIT D’IMPÔT REMBOURSABLE (50 %)
                    </span>
                    <h3 className="text-sm font-bold text-[#101827]">
                      Frais de garde d’enfants de moins de 6 ans hors du domicile (Crèche, Assistante maternelle)
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre d’enfants de moins de 6 ans au 1er janvier
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={discoveryInput.childrenUnder6Count}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          childrenUnder6Count: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dépenses annuelles nettes (aides CAF/CMG déduites, hors repas) (€)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={discoveryInput.annualChildcareExpensesNetOfCafEur}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          annualChildcareExpensesNetOfCafEur: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                    <span className="text-[11px] text-slate-500">
                      Plafond légal : 3 500 € / enfant (soit 1 750 € de crédit max / enfant).
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Garde hors domicile agréée et aides CAF/employeur bien soustraites ?
                    </label>
                    {renderTriStateSelector(
                      discoveryInput.childcareOutsideHomeAndCafDeductedConfirmed,
                      (val) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          childcareOutsideHomeAndCafDeductedConfirmed: val,
                        }))
                    )}
                  </div>
                </div>
              </div>

              {/* Catégorie 3 : Services à la personne / Emploi à domicile */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-800">
                      CATÉGORIE 3 · CRÉDIT D’IMPÔT REMBOURSABLE (50 %)
                    </span>
                    <h3 className="text-sm font-bold text-[#101827]">
                      Services à la personne &amp; Emploi d’un salarié à domicile (Ménage, Soutien scolaire, Jardinage)
                    </h3>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discoveryInput.usesHomeEmploymentServices}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          usesHomeEmploymentServices: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    J’utilise des services à domicile déclarés
                  </label>
                </div>

                {discoveryInput.usesHomeEmploymentServices && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Dépenses nettes annuelles restant à votre charge (hors avance immédiate URSSAF) (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={discoveryInput.annualHomeServicesNetExpenseEur}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            annualHomeServicesNetExpenseEur: Math.max(
                              0,
                              Number(e.target.value) || 0
                            ),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Attestation CESU/prestataire disponible et avance immédiate URSSAF déduite ?
                      </label>
                      {renderTriStateSelector(
                        discoveryInput.homeServicesUrssafAttestationConfirmed,
                        (val) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            homeServicesUrssafAttestationConfirmed: val,
                          }))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Catégorie 5 : Pension alimentaire versée (avec règle de non-cumul) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-800">
                      CATÉGORIE 5 · DÉDUCTION DU REVENU
                    </span>
                    <h3 className="text-sm font-bold text-[#101827]">
                      Pension alimentaire versée (Enfant majeur dans le besoin ou Ex-conjoint)
                    </h3>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discoveryInput.paysAlimony}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          paysAlimony: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Je verse une pension alimentaire
                  </label>
                </div>

                {discoveryInput.paysAlimony && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre de bénéficiaires
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={discoveryInput.alimonyBeneficiaryCount}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            alimonyBeneficiaryCount: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Montant annuel versé et justifié (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={200}
                        value={discoveryInput.annualAlimonyPaidEur}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            annualAlimonyPaidEur: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                      <span className="text-[11px] text-slate-500">
                        Plafond enfant majeur non rattaché : 6 794 € / an.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Le bénéficiaire est-il bien détaché de votre foyer fiscal (non-cumul des parts) ?
                      </label>
                      {renderTriStateSelector(
                        discoveryInput.alimonyBeneficiaryNotAttachedToHouseholdConfirmed,
                        (val) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            alimonyBeneficiaryNotAttachedToHouseholdConfirmed: val,
                          })),
                        'Oui (Non rattaché)',
                        'À vérifier',
                        'Non (Rattaché à mes parts)'
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PARTIE 3 : DONS, ÉPARGNE RETRAITE (PER) & IMMOBILIER LOCATIF */}
          {activeQuestionnaireTab === 'epargne_dons_foncier' && (
            <div className="space-y-4">
              {/* Catégorie 4 : Dons aux associations */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-800">
                      CATÉGORIE 4 · RÉDUCTION D’IMPÔT (75 % / 66 %)
                    </span>
                    <h3 className="text-sm font-bold text-[#101827]">
                      Dons aux associations d’aide aux personnes (75 %) et d’intérêt général (66 %)
                    </h3>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discoveryInput.makesCharitableDonations}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          makesCharitableDonations: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    J’effectue des dons à des associations
                  </label>
                </div>

                {discoveryInput.makesCharitableDonations && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Dons aide aux personnes en difficulté (75 %, plafond 1 000 €)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={discoveryInput.annualDonations75PctHelpPeopleEur}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            annualDonations75PctHelpPeopleEur: Math.max(
                              0,
                              Number(e.target.value) || 0
                            ),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Dons d’intérêt général / utilité publique (66 %) (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={discoveryInput.annualDonations66PctGeneralInterestEur}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            annualDonations66PctGeneralInterestEur: Math.max(
                              0,
                              Number(e.target.value) || 0
                            ),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reçus fiscaux officiels (Cerfa) sans contrepartie disponibles ?
                      </label>
                      {renderTriStateSelector(discoveryInput.donationsReceiptsConfirmed, (val) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          donationsReceiptsConfirmed: val,
                        }))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Catégorie 6 : Plan d'Épargne Retraite (PER) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-800">
                      CATÉGORIE 6 · DÉDUCTION DU REVENU
                    </span>
                    <h3 className="text-sm font-bold text-[#101827]">
                      Versements volontaires sur un Plan d’Épargne Retraite (PER)
                    </h3>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discoveryInput.contributesToPer}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          contributesToPer: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    J’effectue (ou simule) un versement sur un PER
                  </label>
                </div>

                {discoveryInput.contributesToPer && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Versement annuel volontaire sur le PER (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={250}
                        value={discoveryInput.annualPerContributionEur}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            annualPerContributionEur: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Plafond épargne retraite disponible (Avis d’impôt N-1) (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={250}
                        value={discoveryInput.availablePerCeilingOnNoticeEur}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            availablePerCeilingOnNoticeEur: Math.max(
                              0,
                              Number(e.target.value) || 0
                            ),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Plafond vérifié sur l’avis d’impôt et blocage retraite accepté ?
                      </label>
                      {renderTriStateSelector(
                        discoveryInput.perCeilingVerifiedOnTaxNoticeConfirmed,
                        (val) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            perCeilingVerifiedOnTaxNoticeConfirmed: val,
                          }))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Catégorie 7 : Charges foncières qualifiantes (Micro-foncier 30% vs Régime réel & Déficit foncier) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-800">
                      CATÉGORIE 7 · REVENUS LOCATIFS
                    </span>
                    <h3 className="text-sm font-bold text-[#101827]">
                      Revenus locatifs non meublés : Charges réelles vs Micro-foncier (30 %)
                    </h3>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discoveryInput.hasUnfurnishedRentalIncome}
                      onChange={(e) =>
                        setDiscoveryInput((prev) => ({
                          ...prev,
                          hasUnfurnishedRentalIncome: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Je perçois des loyers d’une location nue (non meublée)
                  </label>
                </div>

                {discoveryInput.hasUnfurnishedRentalIncome && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Loyers bruts annuels encaissés (hors charges) (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={discoveryInput.annualGrossRentalIncomeEur}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            annualGrossRentalIncomeEur: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                      <span className="text-[11px] text-slate-500">
                        Micro-foncier applicable de plein droit si ≤ 15 000 € (abattement 30 %).
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Charges foncières réelles déductibles (travaux entretien, taxe foncière, gestion) (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={discoveryInput.annualDeductibleRentalExpensesEur}
                        onChange={(e) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            annualDeductibleRentalExpensesEur: Math.max(
                              0,
                              Number(e.target.value) || 0
                            ),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Travaux déductibles (hors agrandissement) et location maintenue 3 ans confirmés ?
                      </label>
                      {renderTriStateSelector(
                        discoveryInput.rentalExpensesJustifiedAndUnfurnishedConfirmed,
                        (val) =>
                          setDiscoveryInput((prev) => ({
                            ...prev,
                            rentalExpensesJustifiedAndUnfurnishedConfirmed: val,
                          }))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3 : Comparaison transparente côte à côte (Situation actuelle vs Alternative légale vérifiée) */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-bold text-[#101827]">
                  Comparaison transparente : Situation de référence vs Alternative légale vérifiée
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Calculé par le moteur fiscal déterministe ({discoveryResult.declarationYear} sur revenus {discoveryResult.incomeYear}) sans aucun double comptage. Les pistes incertaines (« Je ne sais pas ») sont isolées tant qu’elles ne sont pas confirmées.
              </p>
            </div>
            <DataOriginBadge classification="CALCUL_VERIFIE" />
          </div>

          {/* Cartes de synthèse de l'impact */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
                1. SITUATION DE RÉFÉRENCE (PAR DÉFAUT)
              </div>
              <div className="text-xl font-bold font-mono text-[#101827] mt-1">
                {discoveryResult.baselineScenario.finalNetTaxToPayEur.toLocaleString('fr-FR')} €
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Abattement 10 % ({discoveryResult.baselineScenario.professionalDeductionEur.toLocaleString('fr-FR')} €) · TMI {discoveryResult.baselineScenario.marginalTaxRatePercent} %
              </div>
            </div>

            <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50/50">
              <div className="text-[11px] font-mono uppercase text-emerald-900 font-semibold">
                2. ALTERNATIVE LÉGALE VÉRIFIÉE
              </div>
              <div className="text-xl font-bold font-mono text-emerald-800 mt-1">
                {discoveryResult.optimizedScenario.estimatedRefundFromDgfipEur > 0
                  ? `Remboursement +${discoveryResult.optimizedScenario.estimatedRefundFromDgfipEur.toLocaleString('fr-FR')} €`
                  : `${discoveryResult.optimizedScenario.finalNetTaxToPayEur.toLocaleString('fr-FR')} €`}
              </div>
              <div className="text-[11px] text-emerald-800 mt-1">
                {countsByStatus.eligible} dispositif(s) vérifié(s) appliqué(s) · TMI {discoveryResult.optimizedScenario.marginalTaxRatePercent} %
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E8EDF2] shadow-2xs">
              <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
                3. ALLÈGEMENT ANNUEL VÉRIFIÉ
              </div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {discoveryResult.verifiedNetAnnualDifferenceEur.toLocaleString('fr-FR')} € / an
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Soit env. {Math.round(discoveryResult.verifiedNetAnnualDifferenceEur / 12).toLocaleString('fr-FR')} € / mois sur votre budget
              </div>
            </div>

            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/40 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono uppercase text-amber-900 font-semibold">
                  4. EN ATTENTE DE VÉRIFICATION
                </div>
                <div className="text-xl font-bold font-mono text-amber-800 mt-1">
                  {discoveryResult.unconfirmedPotentialDifferenceEur.toLocaleString('fr-FR')} €
                </div>
                <div className="text-[11px] text-amber-800 mt-1">
                  {countsByStatus.uncertain} piste(s) « Je ne sais pas » non incluses par prudence
                </div>
              </div>
            </div>
          </div>

          {/* Tableau comparatif ligne par ligne */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 mb-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-600">
                  <th className="py-2.5 px-4">Étape du calcul de l’impôt</th>
                  <th className="py-2.5 px-4 text-right">
                    Situation actuelle (Par défaut)
                  </th>
                  <th className="py-2.5 px-4 text-right bg-emerald-50/60 text-emerald-950">
                    Alternative légale vérifiée
                  </th>
                  <th className="py-2.5 px-4">Règle appliquée &amp; anti-double comptage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#101827]">
                    Quotient familial (Parts fiscales)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {discoveryResult.baselineScenario.familyQuotientParts} part(s)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold bg-emerald-50/30">
                    {discoveryResult.optimizedScenario.familyQuotientParts} part(s)
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Case T appliquée uniquement si isolement au 1er janvier confirmé
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#101827]">
                    Salaires / Pensions déclarés avant déduction pro
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {discoveryResult.baselineScenario.grossSalaryDeclaredEur.toLocaleString('fr-FR')} €
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono bg-emerald-50/30">
                    {discoveryResult.optimizedScenario.grossSalaryDeclaredEur.toLocaleString('fr-FR')} €
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">Base salariale identique</td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#101827]">
                    Déduction des frais professionnels (10 % OU Frais réels)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                    -{discoveryResult.baselineScenario.professionalDeductionEur.toLocaleString('fr-FR')} € (10 %)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-800 bg-emerald-50/30">
                    -{discoveryResult.optimizedScenario.professionalDeductionEur.toLocaleString('fr-FR')} € (
                    {discoveryResult.optimizedScenario.professionalDeductionMode === 'frais_reels'
                      ? 'Frais réels'
                      : '10 %'}
                    )
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Non-cumul strict : les frais réels remplacent l’abattement de 10 % uniquement s’ils sont supérieurs et justifiés
                  </td>
                </tr>

                {(discoveryInput.hasUnfurnishedRentalIncome ||
                  discoveryResult.baselineScenario.netRentalIncomeAddedEur > 0 ||
                  discoveryResult.optimizedScenario.rentalDeficitDeductedFromGlobalIncomeEur > 0) && (
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-[#101827]">
                      Revenus fonciers nets imposables / Déficit foncier imputé
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      +{discoveryResult.baselineScenario.netRentalIncomeAddedEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold bg-emerald-50/30">
                      {discoveryResult.optimizedScenario.rentalDeficitDeductedFromGlobalIncomeEur > 0
                        ? `-${discoveryResult.optimizedScenario.rentalDeficitDeductedFromGlobalIncomeEur.toLocaleString('fr-FR')} € (Déficit foncier)`
                        : `+${discoveryResult.optimizedScenario.netRentalIncomeAddedEur.toLocaleString('fr-FR')} €`}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      Comparaison Micro-foncier (abattement 30 %) vs Régime réel 2044 (déficit plafonné à 10 700 €)
                    </td>
                  </tr>
                )}

                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#101827]">
                    Déductions du revenu global (Pension alimentaire + PER)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">0 €</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-800 bg-emerald-50/30">
                    -
                    {(
                      discoveryResult.optimizedScenario.deductibleAlimonyEur +
                      discoveryResult.optimizedScenario.deductiblePerEur
                    ).toLocaleString('fr-FR')}{' '}
                    €
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Pension alimentaire (enfant non rattaché uniquement) + PER (dans la limite du plafond disponible)
                  </td>
                </tr>

                <tr className="bg-slate-50/80 font-semibold">
                  <td className="py-2.5 px-4 text-[#101827]">
                    Revenu net global imposable soumis au barème progressif
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-[#101827]">
                    {discoveryResult.baselineScenario.netTaxableGlobalIncomeEur.toLocaleString('fr-FR')} €
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-900 bg-emerald-50/50">
                    {discoveryResult.optimizedScenario.netTaxableGlobalIncomeEur.toLocaleString('fr-FR')} €
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 font-normal">
                    TMI : {discoveryResult.baselineScenario.marginalTaxRatePercent} % →{' '}
                    {discoveryResult.optimizedScenario.marginalTaxRatePercent} %
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-medium text-[#101827]">
                    Impôt après barème, plafonnement du quotient et Décote (Art. 197)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {discoveryResult.baselineScenario.taxAfterDecoteBeforeReductionsEur.toLocaleString('fr-FR')} €
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold bg-emerald-50/30">
                    {discoveryResult.optimizedScenario.taxAfterDecoteBeforeReductionsEur.toLocaleString('fr-FR')} €
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Décote appliquée : {discoveryResult.optimizedScenario.decoteAmountEur.toLocaleString('fr-FR')} €
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-medium text-amber-900">
                    Réductions d’impôt NON remboursables (Dons, Scolarité)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">0 €</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-800 bg-emerald-50/30">
                    -{discoveryResult.optimizedScenario.nonRefundableReductionsAppliedEur.toLocaleString('fr-FR')} €
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {discoveryResult.optimizedScenario.nonRefundableReductionsLostEur > 0
                      ? `Plafonné à l'impôt dû (${discoveryResult.optimizedScenario.nonRefundableReductionsLostEur.toLocaleString('fr-FR')} € d'excédent non remboursable)`
                      : 'Imputées avant les crédits d’impôt, dans la limite de l’impôt dû'}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-medium text-emerald-900">
                    Crédits d’impôt REMBOURSABLES (Garde &lt; 6 ans, Emploi à domicile)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">0 €</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 bg-emerald-50/30">
                    -{discoveryResult.optimizedScenario.refundableTaxCreditsAppliedEur.toLocaleString('fr-FR')} €
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Remboursé par la DGFiP si supérieur à l’impôt · Plafond des niches fiscales :{' '}
                    {discoveryResult.globalNicheCeilingUsedEur.toLocaleString('fr-FR')} € / 10 000 €
                  </td>
                </tr>

                <tr className="bg-emerald-50/70 border-t-2 border-emerald-500 text-[#172033] font-bold">
                  <td className="py-3 px-4">
                    Solde final : Impôt net à payer (ou Remboursement DGFiP)
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    {discoveryResult.baselineScenario.finalNetTaxToPayEur.toLocaleString('fr-FR')} € à payer
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-emerald-800">
                    {discoveryResult.optimizedScenario.estimatedRefundFromDgfipEur > 0
                      ? `0 € à payer (Remboursement DGFiP : +${discoveryResult.optimizedScenario.estimatedRefundFromDgfipEur.toLocaleString('fr-FR')} €)`
                      : `${discoveryResult.optimizedScenario.finalNetTaxToPayEur.toLocaleString('fr-FR')} € à payer`}
                  </td>
                  <td className="py-3 px-4 text-xs font-normal text-slate-600">
                    Écart net annuel vérifié :{' '}
                    <strong className="text-emerald-700 font-mono">
                      -{discoveryResult.verifiedNetAnnualDifferenceEur.toLocaleString('fr-FR')} €
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Barre de plafonnement global des niches fiscales (10 000 € CGI Art. 200-0 A) & bouton d'application */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex-1 min-w-[260px]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-[#101827]">
                  Jauge du plafond annuel des avantages fiscaux (10 000 €)
                </span>
                <span className="font-mono font-bold text-slate-700">
                  {discoveryResult.globalNicheCeilingUsedEur.toLocaleString('fr-FR')} € /{' '}
                  {discoveryResult.globalNicheCeilingLimitEur.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (discoveryResult.globalNicheCeilingUsedEur /
                          discoveryResult.globalNicheCeilingLimitEur) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Les crédits Garde d’enfant et Emploi à domicile s’imputent sur le plafond annuel de 10 000 €. Les dons aux associations et les frais de scolarité sont hors plafond.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleApplyVerifiedScenarioToHousehold}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] transition-colors cursor-pointer shadow-xs"
              >
                <BookmarkCheck className="w-4 h-4 text-white" />
                Appliquer et sauvegarder ce scénario vérifié dans mon dossier
              </button>

              <Link
                href="/echeances"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#101827] hover:bg-slate-100 transition-colors"
              >
                Préparer mes cases 2042 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 4 : Catalogue complet des 8 catégories avec les 9 champs obligatoires par opportunité */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-bold text-[#101827]">
                  Analyse détaillée des 8 dispositifs fiscaux ({filteredOpportunities.length} affichés)
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Chaque fiche présente les 9 informations réglementaires obligatoires : définition, bénéficiaires, conditions, impact calculé, justificatifs, année fiscale, exclusions/non-cumul, source officielle et date de vérification.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
              {[
                { id: 'ALL', label: `Tous (${discoveryResult.opportunities.length})` },
                {
                  id: 'ELIGIBLE_VERIFIE',
                  label: `Éligibles & Vérifiés (${countsByStatus.eligible})`,
                },
                {
                  id: 'INCERTAIN_QUESTIONS_REQUISES',
                  label: `À vérifier (${countsByStatus.uncertain})`,
                },
                {
                  id: 'NON_RETENU',
                  label: `Non avantageux / Non applicables (${countsByStatus.nonRetenu})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as StatusFilter)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-[#10B981] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-[#172033] hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {filteredOpportunities.map((opp) => (
              <article
                key={opp.id}
                className={`rounded-xl border p-5 transition-all ${
                  opp.eligibilityStatus === 'ELIGIBLE_VERIFIE'
                    ? 'border-emerald-300 bg-emerald-50/15'
                    : opp.eligibilityStatus === 'INCERTAIN_QUESTIONS_REQUISES'
                    ? 'border-amber-300 bg-amber-50/15'
                    : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                {/* En-tête de l'opportunité */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-slate-200/80">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">
                        {opp.categoryLabel}
                      </span>
                      {renderMechanismBadge(opp.mechanismType, opp.mechanismLabel)}
                    </div>
                    <h3 className="text-base font-bold text-[#101827]">{opp.title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {renderEligibilityBadge(opp.eligibilityStatus, opp.eligibilityBadgeText)}
                    <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-950 border border-emerald-200 text-xs font-mono font-bold">
                      Impact :{' '}
                      <span className="text-emerald-700">
                        {opp.possibleFinancialImpact.estimatedAnnualTaxDeltaEur.toLocaleString(
                          'fr-FR'
                        )}{' '}
                        € / an
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alerte interactive si l'éligibilité est incertaine (Questions complémentaires) */}
                {opp.eligibilityStatus === 'INCERTAIN_QUESTIONS_REQUISES' &&
                  opp.uncertaintyQuestions.length > 0 && (
                    <div className="my-4 p-4 rounded-lg bg-amber-50 border border-amber-300/90 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Questions complémentaires requises avant d’inclure cet avantage dans votre calcul :
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => resolveOpportunityUncertainty(opp.categoryKey, 'oui')}
                            className="px-2.5 py-1 rounded-md bg-[#10B981] text-white text-[11px] font-bold hover:bg-[#059669] transition-colors shadow-2xs"
                          >
                            Confirmer les conditions (Oui)
                          </button>
                          <button
                            type="button"
                            onClick={() => resolveOpportunityUncertainty(opp.categoryKey, 'non')}
                            className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-slate-100 transition-colors shadow-2xs"
                          >
                            Conditions non remplies (Non)
                          </button>
                        </div>
                      </div>
                      <ul className="list-disc list-inside text-xs text-amber-900 space-y-1">
                        {opp.uncertaintyQuestions.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Grille des 9 champs obligatoires */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 text-xs">
                  {/* 1. Qu'est-ce que c'est ? */}
                  <div className="p-3.5 rounded-lg bg-white border border-slate-200/90">
                    <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 mb-1">
                      1. QU’EST-CE QUE C’EST ?
                    </div>
                    <p className="text-slate-700 leading-relaxed">{opp.whatItIs}</p>
                  </div>

                  {/* 2. Qui peut en bénéficier ? */}
                  <div className="p-3.5 rounded-lg bg-white border border-slate-200/90">
                    <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 mb-1">
                      2. QUI PEUT EN BÉNÉFICIER ?
                    </div>
                    <p className="text-slate-700 leading-relaxed">{opp.whoMayQualify}</p>
                  </div>

                  {/* 4. Impact financier possible */}
                  <div className="p-3.5 rounded-lg bg-white border border-slate-200/90">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-800">
                        4. IMPACT FINANCIER POSSIBLE
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {opp.possibleFinancialImpact.isIncludedInOptimizedScenario
                          ? 'Inclus dans le scénario vérifié'
                          : 'Non inclus'}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {opp.possibleFinancialImpact.impactSummaryText}
                    </p>
                  </div>

                  {/* 3. Conditions légales requises */}
                  <div className="p-3.5 rounded-lg bg-white border border-slate-200/90">
                    <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 mb-1">
                      3. CONDITIONS REQUISES
                    </div>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 leading-relaxed">
                      {opp.requiredConditions.map((cond, idx) => (
                        <li key={idx}>{cond}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 5. Justificatifs à conserver */}
                  <div className="p-3.5 rounded-lg bg-white border border-slate-200/90">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 mb-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>5. PIÈCES JUSTIFICATIVES À CONSERVER</span>
                    </div>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 leading-relaxed">
                      {opp.supportingDocuments.map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 7. Exclusions, plafonds & règles de non-cumul */}
                  <div className="p-3.5 rounded-lg bg-white border border-slate-200/90">
                    <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-800 mb-1">
                      7. EXCLUSIONS, PLAFONDS & NON-CUMUL
                    </div>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 leading-relaxed">
                      {opp.exclusionsAndNonCumulation.map((ex, idx) => (
                        <li key={idx}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Pied de carte : 6. Année fiscale applicable, 8. Source officielle, 9. Date de vérification */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
                  <div className="flex flex-wrap items-center gap-4">
                    <span>
                      <strong className="text-[#101827]">6. Année fiscale :</strong>{' '}
                      <span className="font-mono">{opp.applicableTaxYear}</span>
                    </span>
                    <span>
                      <strong className="text-[#101827]">8. Référence légale :</strong>{' '}
                      <span className="font-mono">{opp.officialSource.statutoryReference}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <strong className="text-[#101827]">9. Date de vérification :</strong>{' '}
                      <span className="font-mono">{opp.verificationDate}</span>
                    </span>
                  </div>

                  <a
                    href={opp.officialSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                  >
                    Source officielle ({opp.officialSource.sourceName}){' '}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Note de transparence et d'aide à la décision */}
        <section className="p-4 rounded-lg bg-slate-100 border border-slate-200/90 space-y-2 text-xs text-slate-600">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#101827] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#101827]">
                Rappel important :
              </strong>{' '}
              Cet outil vérifie vos plafonds légaux et empêche tout double comptage. Conservez vos justificatifs pendant 3 ans.
            </div>
          </div>
          <ExpandableDetail
            summary="Détails"
            officialRef="CGI Art. 83-3°, 156, 163 quatervicies, 194-II, 199 sexdecies, 200, 200 quater B et 200-0 A"
          >
            <p>
              L’ordre légal d’imputation est respecté : déductions du revenu, barème progressif, décote, réductions non remboursables puis crédits remboursables, sous le plafond annuel de 10 000 €.
            </p>
          </ExpandableDetail>
        </section>
      </div>
    </AppShell>
  );
}
