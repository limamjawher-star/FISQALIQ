'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { ExpandableDetail } from '@/components/ui/design-system';
import {
  evaluateTaxOptimizationDiscovery,
  calculateOfficialRealProfessionalExpenses,
  calculatePerAndDonationTaxArbitrage,
  PersonalTaxDiscoveryInput,
  DiscoveredTaxOpportunity,
  SupportedTaxYear,
  FiscalHorsepowerRating,
} from '@/lib/calculations/personal-tax-engine';
import {
  CheckCircle2,
  HelpCircle,
  BookmarkCheck,
  Car,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export default function PersonalTaxOptimizationPage() {
  const { activeHousehold } = useFiscaliq();
  const profileSyncKey = `${activeHousehold.id}-${activeHousehold.annualDeclaredSalaryNetImposableEur}-${activeHousehold.maritalStatus}-${activeHousehold.dependantsCount}-${activeHousehold.perContributionAnnualEur}`;
  return <PersonalTaxOptimizationContent key={profileSyncKey} />;
}

function PersonalTaxOptimizationContent() {
  const { activeHousehold, updateActiveHousehold, savePersonalSimulation } =
    useFiscaliq();

  const [taxYear, setTaxYear] = useState<SupportedTaxYear>(2026);
  const [discoveryInput, setDiscoveryInput] = useState<PersonalTaxDiscoveryInput>(
    () => ({
      taxYear: 2026,
      maritalStatus: activeHousehold.maritalStatus,
      dependantsCount: activeHousehold.dependantsCount,
      annualGrossSalaryOrPensionImposableEur:
        activeHousehold.annualDeclaredSalaryNetImposableEur || 36000,
      hasCommuteOrProfessionalExpenses: false,
      estimatedAnnualRealProfessionalExpensesEur: 0,
      canJustifyRealProfessionalExpenses: 'oui',
      childrenUnder6Count: 0,
      annualChildcareExpensesNetOfCafEur: 0,
      childcareOutsideHomeAndCafDeductedConfirmed: 'oui',
      usesHomeEmploymentServices: false,
      annualHomeServicesNetExpenseEur: 0,
      homeServicesUrssafAttestationConfirmed: 'oui',
      makesCharitableDonations: false,
      annualDonations75PctHelpPeopleEur: 0,
      annualDonations66PctGeneralInterestEur: 0,
      donationsReceiptsConfirmed: 'oui',
      paysAlimony: false,
      alimonyBeneficiaryCount: 1,
      annualAlimonyPaidEur: 0,
      alimonyBeneficiaryNotAttachedToHouseholdConfirmed: 'oui',
      contributesToPer: activeHousehold.perContributionAnnualEur > 0,
      annualPerContributionEur: activeHousehold.perContributionAnnualEur,
      availablePerCeilingOnNoticeEur: 5000,
      perCeilingVerifiedOnTaxNoticeConfirmed: 'oui',
      hasUnfurnishedRentalIncome:
        activeHousehold.additionalNetTaxableIncomeEur > 0,
      annualGrossRentalIncomeEur: activeHousehold.additionalNetTaxableIncomeEur,
      annualDeductibleRentalExpensesEur: 0,
      rentalExpensesJustifiedAndUnfurnishedConfirmed: 'oui',
      livesAloneWithChildrenOnJan1Confirmed:
        activeHousehold.maritalStatus === 'parent_isole' ? 'oui' : 'non',
      childrenInMiddleSchoolCount: 0,
      childrenInHighSchoolCount: 0,
      childrenInHigherEducationCount: 0,
    })
  );

  // Built-in Barème Kilométrique 2026 + Frais de Repas state
  const [oneWayKm, setOneWayKm] = useState<number>(22);
  const [workedDays, setWorkedDays] = useState<number>(180);
  const [horsepower, setHorsepower] = useState<FiscalHorsepowerRating>(5);
  const [isElectric, setIsElectric] = useState<boolean>(false);
  const [mealDays, setMealDays] = useState<number>(160);
  const [teleworkDays, setTeleworkDays] = useState<number>(35);

  const [savedBannerMessage, setSavedBannerMessage] = useState<string | null>(
    null
  );

  const realExpensesCalc = useMemo(() => {
    return calculateOfficialRealProfessionalExpenses({
      taxYear,
      annualNetTaxableSalaryEur:
        discoveryInput.annualGrossSalaryOrPensionImposableEur,
      maritalStatus: discoveryInput.maritalStatus,
      dependantsCount: discoveryInput.dependantsCount,
      oneWayCommuteKm: oneWayKm,
      workedDaysOnSitePerYear: workedDays,
      fiscalHorsepower: horsepower,
      isElectricVehicle: isElectric,
      mealsOnSiteWithoutCanteenDays: mealDays,
      teleworkDaysPerYear: teleworkDays,
    });
  }, [
    taxYear,
    discoveryInput.annualGrossSalaryOrPensionImposableEur,
    discoveryInput.maritalStatus,
    discoveryInput.dependantsCount,
    oneWayKm,
    workedDays,
    horsepower,
    isElectric,
    mealDays,
    teleworkDays,
  ]);

  const perAndDonsArbitrage = useMemo(() => {
    return calculatePerAndDonationTaxArbitrage({
      taxYear,
      annualNetTaxableIncomeEur:
        discoveryInput.annualGrossSalaryOrPensionImposableEur,
      maritalStatus: discoveryInput.maritalStatus,
      dependantsCount: discoveryInput.dependantsCount,
      plannedPerContributionEur: discoveryInput.annualPerContributionEur,
      availablePerCeilingEur: discoveryInput.availablePerCeilingOnNoticeEur,
      plannedDonation66PctEur:
        discoveryInput.annualDonations66PctGeneralInterestEur,
    });
  }, [
    taxYear,
    discoveryInput.annualGrossSalaryOrPensionImposableEur,
    discoveryInput.maritalStatus,
    discoveryInput.dependantsCount,
    discoveryInput.annualPerContributionEur,
    discoveryInput.availablePerCeilingOnNoticeEur,
    discoveryInput.annualDonations66PctGeneralInterestEur,
  ]);

  const discoveryResult = useMemo(() => {
    return evaluateTaxOptimizationDiscovery({
      ...discoveryInput,
      taxYear,
    });
  }, [discoveryInput, taxYear]);

  const eligibleOpportunities = useMemo(
    () =>
      discoveryResult.opportunities.filter(
        (o) =>
          o.eligibilityStatus === 'ELIGIBLE_VERIFIE' ||
          o.eligibilityStatus === 'INCERTAIN_QUESTIONS_REQUISES'
      ),
    [discoveryResult.opportunities]
  );

  const handleApplyCalculatedRealExpenses = () => {
    setDiscoveryInput((prev) => ({
      ...prev,
      hasCommuteOrProfessionalExpenses:
        realExpensesCalc.totalComputedRealExpensesEur > 0,
      estimatedAnnualRealProfessionalExpensesEur:
        realExpensesCalc.totalComputedRealExpensesEur,
    }));
    setSavedBannerMessage(
      `Frais réels calculés (${realExpensesCalc.totalComputedRealExpensesEur.toLocaleString('fr-FR')} €) appliqués à votre simulation.`
    );
  };

  const handleApplyVerifiedScenarioToHousehold = () => {
    const opt = discoveryResult.optimizedScenario;
    const totalCreditsAndReductions =
      opt.nonRefundableReductionsAppliedEur + opt.refundableTaxCreditsAppliedEur;

    updateActiveHousehold({
      maritalStatus: discoveryInput.maritalStatus,
      dependantsCount: discoveryInput.dependantsCount,
      annualDeclaredSalaryNetImposableEur:
        discoveryInput.annualGrossSalaryOrPensionImposableEur,
      perContributionAnnualEur: opt.deductiblePerEur + opt.deductibleAlimonyEur,
      estimatedEligibleTaxCreditsEur: totalCreditsAndReductions,
    });

    savePersonalSimulation({
      householdId: activeHousehold.id,
      title: `Mes économies (${discoveryResult.declarationYear})`,
      moduleType: 'AVANTAGE_FISCAL',
      taxYear: discoveryResult.declarationYear,
      classification: 'CALCUL_VERIFIE',
      inputsSummary: `Revenu ${discoveryInput.annualGrossSalaryOrPensionImposableEur.toLocaleString('fr-FR')} € · ${opt.familyQuotientParts} part(s)`,
      mainResultLabel: 'Économie annuelle estimée',
      mainResultAmountEur: discoveryResult.verifiedNetAnnualDifferenceEur,
      secondaryDetail: `Impôt après réductions : ${opt.finalNetTaxToPayEur.toLocaleString('fr-FR')} €`,
      statutoryRef:
        'CGI Art. 83-3°, 156, 163 quatervicies, 199 sexdecies, 200, 200 quater B',
    });

    setSavedBannerMessage(
      'Vos économies ont été enregistrées dans votre profil.'
    );
  };

  return (
    <AppShell title="Mes économies">
      <div className="space-y-4">
        {savedBannerMessage && (
          <div className="gw-panel flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-[#242b27]">
              <CheckCircle2 className="w-4 h-4 text-[#326b54] shrink-0" />
              <span>{savedBannerMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSavedBannerMessage(null)}
              className="text-[#326b54] hover:underline font-semibold"
            >
              Fermer
            </button>
          </div>
        )}

        {/* BLOC 1 : Résultat principal en premier */}
        <section className="gw-panel p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-xl bg-[#dce9da]/80 border border-[#326b54]/25 p-4">
              <div className="text-[11px] font-semibold text-[#242b27]">
                Économie d’impôt annuelle estimée
              </div>
              <div className="text-2xl font-bold font-mono text-[#274b39] mt-1">
                {discoveryResult.verifiedNetAnnualDifferenceEur.toLocaleString(
                  'fr-FR'
                )}{' '}
                € / an
              </div>
              <div className="text-[11px] text-[#384238] mt-1">
                Calculée selon vos dépenses éligibles
              </div>
            </div>

            <div className="rounded-xl bg-white/75 border border-black/10 p-4">
              <div className="text-[11px] font-semibold text-[#384238]">
                Impôt avant économies
              </div>
              <div className="text-xl font-bold font-mono text-[#242b27] mt-1">
                {discoveryResult.baselineScenario.finalNetTaxToPayEur.toLocaleString(
                  'fr-FR'
                )}{' '}
                € / an
              </div>
              <div className="text-[11px] text-[#384238] mt-1">
                Avec abattement automatique de 10 % (
                {discoveryResult.baselineScenario.professionalDeductionEur.toLocaleString(
                  'fr-FR'
                )}{' '}
                €)
              </div>
            </div>

            <div className="rounded-xl bg-white/75 border border-black/10 p-4">
              <div className="text-[11px] font-semibold text-[#384238]">
                Impôt après économies
              </div>
              <div className="text-xl font-bold font-mono text-[#242b27] mt-1">
                {discoveryResult.optimizedScenario.finalNetTaxToPayEur.toLocaleString(
                  'fr-FR'
                )}{' '}
                € / an
              </div>
              <div className="text-[11px] text-[#384238] mt-1">
                {discoveryResult.optimizedScenario.estimatedRefundFromDgfipEur > 0
                  ? `Remboursement DGFiP estimé : +${discoveryResult.optimizedScenario.estimatedRefundFromDgfipEur.toLocaleString('fr-FR')} €`
                  : `Plafond niches utilisé : ${discoveryResult.globalNicheCeilingUsedEur.toLocaleString('fr-FR')} € / 10 000 €`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#384238]">
              Estimation indicative, non contractuelle. Conservez vos justificatifs pendant 3 ans.
            </p>
            <div className="flex items-center gap-2">
              <div className="gw-segment">
                {([2026, 2025] as const).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    aria-pressed={taxYear === yr}
                    onClick={() => setTaxYear(yr)}
                  >
                    Barème {yr}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleApplyVerifiedScenarioToHousehold}
                className="gw-button"
              >
                <BookmarkCheck size={14} />
                <span>Enregistrer dans mon profil</span>
              </button>
            </div>
          </div>
        </section>

        {/* BLOC 2 : Calculateur officiel Frais Réels (Barème Kilométrique 2026 + Repas) */}
        <section className="gw-panel p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-[#326b54]" />
              <div>
                <h2 className="text-sm font-bold text-[#242b27]">
                  1. Calculateur officiel Frais réels vs Abattement 10 % (Case 1AK)
                </h2>
                <p className="text-xs text-[#384238]">
                  Calculez automatiquement vos indemnités kilométriques et vos frais de repas sans cantine.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyCalculatedRealExpenses}
              className="gw-button"
            >
              <span>
                Appliquer {realExpensesCalc.totalComputedRealExpensesEur.toLocaleString('fr-FR')} € (Case 1AK)
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Trajet aller simple (km)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={oneWayKm}
                onChange={(e) => setOneWayKm(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-[#242b27]"
              />
              <span className="text-[10px] text-[#384238]">
                Retenu : {realExpensesCalc.effectiveOneWayKm} km × 2 / jour
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Puissance fiscale (CV)
              </label>
              <select
                value={horsepower}
                onChange={(e) =>
                  setHorsepower(Number(e.target.value) as FiscalHorsepowerRating)
                }
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-semibold text-[#242b27]"
              >
                <option value={3}>3 CV et moins</option>
                <option value={4}>4 CV</option>
                <option value={5}>5 CV</option>
                <option value={6}>6 CV</option>
                <option value={7}>7 CV et plus</option>
              </select>
              <label className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-medium text-[#242b27] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isElectric}
                  onChange={(e) => setIsElectric(e.target.checked)}
                />
                <span>Véhicule électrique (+20 %)</span>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Jours sur site / an
              </label>
              <input
                type="number"
                min={0}
                max={250}
                value={workedDays}
                onChange={(e) => setWorkedDays(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-[#242b27]"
              />
              <span className="text-[10px] text-[#384238]">
                {realExpensesCalc.annualCommuteDistanceKm.toLocaleString('fr-FR')} km/an
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Repas hors domicile (jours)
              </label>
              <input
                type="number"
                min={0}
                max={250}
                value={mealDays}
                onChange={(e) => setMealDays(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-[#242b27]"
              />
              <span className="text-[10px] text-[#384238]">
                Forfait 5,45 €/repas : {realExpensesCalc.mealsDeductionEur.toLocaleString('fr-FR')} €
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Télétravail (jours/an)
              </label>
              <input
                type="number"
                min={0}
                max={220}
                value={teleworkDays}
                onChange={(e) =>
                  setTeleworkDays(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-[#242b27]"
              />
              <span className="text-[10px] text-[#384238]">
                Forfait 2,70 €/j : {realExpensesCalc.teleworkDeductionEur} €
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white/75 border border-black/10 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <strong className="text-[#242b27]">
                Total Frais réels calculés :{' '}
                <span className="font-mono">
                  {realExpensesCalc.totalComputedRealExpensesEur.toLocaleString('fr-FR')} €
                </span>
              </strong>
              <span className="block text-[11px] text-[#384238]">
                Formule barème : {realExpensesCalc.formulaAppliedTextFr} ={' '}
                {realExpensesCalc.totalMileageDeductionEur.toLocaleString('fr-FR')} € + Repas{' '}
                {realExpensesCalc.mealsDeductionEur.toLocaleString('fr-FR')} €
              </span>
            </div>

            <div className="text-right">
              {realExpensesCalc.isRealExpensesAdvantageous ? (
                <span className="inline-block px-3 py-1 rounded-full bg-[#dce9da] text-[#274b39] font-bold">
                  Gain net d’impôt : −{realExpensesCalc.annualTaxSavedEur.toLocaleString('fr-FR')} € / an vs 10 %
                </span>
              ) : (
                <span className="inline-block px-3 py-1 rounded-full bg-black/5 text-[#384238] font-medium">
                  L’abattement automatique de 10 % ({realExpensesCalc.standard10PercentDeductionEur.toLocaleString('fr-FR')} €) reste plus avantageux
                </span>
              )}
            </div>
          </div>
        </section>

        {/* BLOC 3 : Simulateur PER (6NS), Dons (7UF), Garde d'enfant (7GA) et Emploi à domicile (7DB) */}
        <section className="gw-panel p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#326b54]" />
              <h2 className="text-sm font-bold text-[#242b27]">
                2. Vos réductions et crédits d’impôt (PER, Dons, Domicile, Garde)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setDiscoveryInput((prev) => ({
                  ...prev,
                  annualGrossSalaryOrPensionImposableEur:
                    activeHousehold.annualDeclaredSalaryNetImposableEur || 36000,
                }));
              }}
              className="gw-text-button text-xs font-semibold"
            >
              <RefreshCw size={13} />
              <span>Synchroniser avec mon profil</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Revenu net imposable annuel (€)
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
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono font-semibold text-[#242b27]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Frais réels retenus case 1AK (€/an)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={discoveryInput.estimatedAnnualRealProfessionalExpensesEur}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setDiscoveryInput((prev) => ({
                    ...prev,
                    hasCommuteOrProfessionalExpenses: val > 0,
                    estimatedAnnualRealProfessionalExpensesEur: val,
                  }));
                }}
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono font-semibold text-[#242b27]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Versement PER avant le 31 déc. (case 6NS)
              </label>
              <input
                type="number"
                min={0}
                step={200}
                value={discoveryInput.annualPerContributionEur}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setDiscoveryInput((prev) => ({
                    ...prev,
                    contributesToPer: val > 0,
                    annualPerContributionEur: val,
                  }));
                }}
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono font-semibold text-[#242b27]"
              />
              {perAndDonsArbitrage.deductiblePerAppliedEur > 0 && (
                <span className="text-[10px] text-[#326b54] font-semibold">
                  Effort réel après impôt : {perAndDonsArbitrage.realNetEffortAfterTaxEur.toLocaleString('fr-FR')} €
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Emploi à domicile / ménage (case 7DB)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={discoveryInput.annualHomeServicesNetExpenseEur}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setDiscoveryInput((prev) => ({
                    ...prev,
                    usesHomeEmploymentServices: val > 0,
                    annualHomeServicesNetExpenseEur: val,
                  }));
                }}
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono font-semibold text-[#242b27]"
              />
              <span className="text-[10px] text-[#384238]">
                Crédit remboursable de 50 %
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Garde d’enfant &lt; 6 ans (case 7GA)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={discoveryInput.annualChildcareExpensesNetOfCafEur}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setDiscoveryInput((prev) => ({
                    ...prev,
                    childrenUnder6Count:
                      val > 0 ? Math.max(1, prev.childrenUnder6Count) : 0,
                    annualChildcareExpensesNetOfCafEur: val,
                  }));
                }}
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono font-semibold text-[#242b27]"
              />
              <span className="text-[10px] text-[#384238]">
                Crédit 50 % (plafond 3 500 €/enfant)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#242b27] mb-1">
                Dons aux associations (case 7UF)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={discoveryInput.annualDonations66PctGeneralInterestEur}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setDiscoveryInput((prev) => ({
                    ...prev,
                    makesCharitableDonations: val > 0,
                    annualDonations66PctGeneralInterestEur: val,
                  }));
                }}
                className="w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono font-semibold text-[#242b27]"
              />
              <span className="text-[10px] text-[#384238]">
                Réduction de 66 % de l’impôt
              </span>
            </div>
          </div>
        </section>

        {/* BLOC 4 : Dispositifs retenus et références officielles */}
        <section className="gw-panel p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#242b27]">
            3. Dispositifs retenus pour votre foyer ({eligibleOpportunities.length})
          </h2>

          {eligibleOpportunities.length === 0 ? (
            <p className="text-xs text-[#384238]">
              Utilisez le calculateur de frais réels ci-dessus ou saisissez une dépense (PER, emploi à domicile, garde d’enfant, dons) pour afficher vos économies.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eligibleOpportunities.map((opp: DiscoveredTaxOpportunity) => (
                <div
                  key={opp.id}
                  className="p-4 rounded-xl border border-black/10 bg-white/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#242b27]">
                      {opp.title}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#326b54]">
                      −
                      {opp.possibleFinancialImpact.estimatedAnnualTaxDeltaEur.toLocaleString(
                        'fr-FR'
                      )}{' '}
                      €
                    </span>
                  </div>
                  <p className="text-[11px] text-[#384238]">{opp.whatItIs}</p>
                  <div className="flex items-center justify-between text-[11px] text-[#384238] pt-1">
                    <span className="inline-flex items-center gap-1">
                      {opp.eligibilityStatus === 'ELIGIBLE_VERIFIE' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#326b54]" />
                      ) : (
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {opp.eligibilityBadgeText}
                    </span>
                    <span className="font-mono">
                      {opp.officialSource.statutoryReference}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <ExpandableDetail
              summary="En savoir plus : règles officielles (Barème kilométrique, PER, Crédits et Réductions)"
              officialRef="CGI Art. 83-3°, 163 quatervicies, 199 sexdecies, 200, 200 quater B · BOI-BAREME-000001"
            >
              <div className="space-y-2 pt-2 text-xs text-[#384238]">
                <p>
                  <strong>Barème kilométrique et frais de repas (case 1AK) :</strong> remplace l’abattement automatique de 10 % dès que vos frais réels justifiés sont supérieurs. Le trajet domicile-travail est retenu jusqu’à 40 km aller simple (80 km AR/jour) sauf circonstances particulières justifiées.
                </p>
                <p>
                  <strong>Épargne retraite PER (case 6NS) :</strong> déductible du revenu global dans la limite du plafond inscrit sur votre avis d’impôt. L’économie d’impôt est proportionnelle à votre tranche marginale (11 %, 30 %, 41 % ou 45 %).
                </p>
                <div className="flex flex-wrap gap-3 pt-1 text-[11px]">
                  <a
                    href="https://www.service-public.fr/particuliers/vosdroits/F1989"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#326b54] font-semibold hover:underline"
                  >
                    Service-Public.fr — Barème kilométrique officiel
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://www.impots.gouv.fr/particulier/les-reductions-et-credits-dimpot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#326b54] font-semibold hover:underline"
                  >
                    impots.gouv.fr — Réductions et crédits d’impôt
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </ExpandableDetail>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
