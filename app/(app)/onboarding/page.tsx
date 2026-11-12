'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { PageTransition } from '@/components/ui/interactive-primitives';
import {
  PersonalTaxOnboardingState,
  OnboardingHouseholdStatus,
  IncomeCategoryKey,
  ExpenseSituationKey,
  evaluatePersonalOnboardingProfile,
} from '@/lib/calculations/personal-tax-engine';
import {
  EMPTY_USER_HOUSEHOLD,
  PersonalHouseholdProfile,
} from '@/lib/data/personal-tax-dataset';
import { Step1Residency } from '@/components/onboarding/step-1-residency';
import { Step2Household } from '@/components/onboarding/step-2-household';
import { Step3Dependants } from '@/components/onboarding/step-3-dependants';
import { Step4Income } from '@/components/onboarding/step-4-income';
import { Step5Expenses } from '@/components/onboarding/step-5-expenses';
import { Step6TaxNotice } from '@/components/onboarding/step-6-tax-notice';
import { Step7Summary } from '@/components/onboarding/step-7-summary';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface WizardStepMeta {
  stepNumber: number;
  shortTitle: string;
}

const WIZARD_STEPS: WizardStepMeta[] = [
  { stepNumber: 1, shortTitle: 'Résidence' },
  { stepNumber: 2, shortTitle: 'Situation' },
  { stepNumber: 3, shortTitle: 'Enfants' },
  { stepNumber: 4, shortTitle: 'Revenus' },
  { stepNumber: 5, shortTitle: 'Dépenses' },
  { stepNumber: 6, shortTitle: 'Prélèvement' },
  { stepNumber: 7, shortTitle: 'Résultat' },
];

function createWizardStateFromHousehold(
  profile: PersonalHouseholdProfile
): PersonalTaxOnboardingState {
  return {
    profileLabel: profile.householdName.split(' (')[0] || 'Mon foyer',
    residencyStatus: 'resident_france',
    countryOfResidence: 'France',
    nonResidentHasFrenchSourceIncome: 'oui',

    householdStatus:
      profile.maritalStatus === 'marie_pacse'
        ? 'marie'
        : profile.maritalStatus === 'parent_isole'
        ? 'separe'
        : 'celibataire',
    livesAloneOnJan1: profile.maritalStatus === 'parent_isole' ? 'oui' : 'non',
    spousePassedAwayCurrentYear: 'non',

    hasDependants: profile.dependantsCount > 0,
    childrenUnder6Count: 0,
    children6To17Count: profile.dependantsCount,
    adultChildrenAttachedCount: 0,
    exclusiveCustodyChildrenCount: profile.dependantsCount,
    sharedCustodyChildrenCount: 0,
    dependantsWithDisabilityCardCount: 0,

    incomes: {
      salaires: {
        selected: profile.annualDeclaredSalaryNetImposableEur > 0,
        annualAmountEur: profile.annualDeclaredSalaryNetImposableEur,
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
        selected: profile.additionalNetTaxableIncomeEur > 0,
        annualAmountEur: profile.additionalNetTaxableIncomeEur,
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
        selected: profile.estimatedEligibleTaxCreditsEur > 0,
        annualAmountEur: profile.estimatedEligibleTaxCreditsEur * 2,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'oui',
      },
      emploi_domicile: {
        selected: false,
        annualAmountEur: 0,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'ne_sait_pas',
      },
      dons_associations: {
        selected: false,
        annualAmountEur: 0,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'oui',
      },
      frais_professionnels_reels: {
        selected: false,
        annualAmountEur: 0,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'ne_sait_pas',
      },
      pension_alimentaire_versee: {
        selected: false,
        annualAmountEur: 0,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'ne_sait_pas',
      },
      epargne_retraite_per: {
        selected: profile.perContributionAnnualEur > 0,
        annualAmountEur: profile.perContributionAnnualEur,
        amountUnknownOrSkipped: false,
        conditionsConfirmed: 'oui',
      },
    },

    skipExistingTaxNoticeStep: false,
    previousReferenceTaxIncomeEur: null,
    availablePerCeilingEur: null,
    currentWithholdingRatePct: null,
    taxAlreadyWithheldOrPaidEur: null,
  };
}

export default function PersonalTaxOnboardingPage() {
  const router = useRouter();
  const {
    userHousehold,
    saveUserProfile,
    savePersonalSimulation,
    clearUserData,
  } = useFiscaliq();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [wizardState, setWizardState] = useState<PersonalTaxOnboardingState>(() =>
    createWizardStateFromHousehold(userHousehold)
  );

  const evaluation = useMemo(() => {
    return evaluatePersonalOnboardingProfile(wizardState);
  }, [wizardState]);

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

  const handleSaveAndGoToOptimization = () => {
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

    // Always creates/updates the user's own profile (never overwrites demo households)
    saveUserProfile({
      householdName: wizardState.profileLabel || 'Mon foyer',
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
      householdId: userHousehold.id,
      moduleType: 'IR_FOYER',
      taxYear: 2026,
      title: `Mon estimation 2026 (${evaluation.quotient.totalParts.toLocaleString(
        'fr-FR'
      )} parts)`,
      inputsSummary: `Revenus ${(
        evaluation.totalKnownSalaryPensionUnemploymentEur +
        evaluation.totalKnownAdditionalTaxableIncomeEur
      ).toLocaleString('fr-FR')} € · Crédits ${evaluation.confirmedTaxCreditsAndReductionsEur.toLocaleString(
        'fr-FR'
      )} €`,
      mainResultLabel: 'Impôt annuel estimé (Barème 2026)',
      mainResultAmountEur: evaluation.taxEstimate.finalEstimatedTaxEur,
      secondaryDetail: `Taux ${evaluation.taxEstimate.effectiveWithholdingRatePercent.toLocaleString(
        'fr-FR'
      )} %`,
      classification: 'ESTIMATION',
      statutoryRef: 'CGI Art. 4 B, Art. 194 & Art. 197 (Barème 2026)',
    });

    router.push('/tax-optimization');
  };

  const progressPercent = Math.round((currentStep / WIZARD_STEPS.length) * 100);

  return (
    <AppShell title="Mon impôt">
      <div className="space-y-6">
        {/* Progression : "Étape X sur 7" affiché une seule fois */}
        <section
          aria-label="Progression du simulateur"
          className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-700">
              Étape {currentStep} sur {WIZARD_STEPS.length}
            </span>
            <button
              type="button"
              onClick={() => {
                clearUserData();
                setWizardState(createWizardStateFromHousehold(EMPTY_USER_HOUSEHOLD));
                setCurrentStep(1);
              }}
              className="text-[11px] font-medium text-slate-500 hover:text-rose-700 transition-colors"
            >
              Effacer mes données
            </button>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

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

        {/* Étape active */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-6">
          <PageTransition transitionKey={`onboarding-step-${currentStep}`}>
            {currentStep === 1 && (
              <Step1Residency
                wizardState={wizardState}
                setWizardState={setWizardState}
              />
            )}
            {currentStep === 2 && (
              <Step2Household
                wizardState={wizardState}
                setWizardState={setWizardState}
              />
            )}
            {currentStep === 3 && (
              <Step3Dependants
                wizardState={wizardState}
                setWizardState={setWizardState}
                onSkipStep={() => setCurrentStep(4)}
              />
            )}
            {currentStep === 4 && (
              <Step4Income
                wizardState={wizardState}
                updateIncome={updateIncome}
              />
            )}
            {currentStep === 5 && (
              <Step5Expenses
                wizardState={wizardState}
                updateExpense={updateExpense}
                onSkipStep={() => setCurrentStep(6)}
              />
            )}
            {currentStep === 6 && (
              <Step6TaxNotice
                wizardState={wizardState}
                setWizardState={setWizardState}
                onSkipStep={() => setCurrentStep(7)}
              />
            )}
            {currentStep === 7 && (
              <Step7Summary
                evaluation={evaluation}
                onSaveAndGoToOptimization={handleSaveAndGoToOptimization}
              />
            )}
          </PageTransition>

          {/* Navigation bas de carte */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Précédent
            </button>

            {currentStep < WIZARD_STEPS.length && (
              <button
                type="button"
                onClick={() =>
                  setCurrentStep((prev) => Math.min(WIZARD_STEPS.length, prev + 1))
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs"
              >
                Continuer
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
