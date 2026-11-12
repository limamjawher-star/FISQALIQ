'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { DataOriginBadge, ExpandableDetail } from '@/components/ui/design-system';
import {
  calculateDetailedPersonalSalary,
  simulateWithholdingTaxAndSituationChange,
  SalaryEntryMode,
  WithholdingRateOptionType,
  FamilyMaritalStatus,
  SupportedTaxYear,
} from '@/lib/calculations/personal-tax-engine';
import {
  Wallet,
  BookmarkPlus,
  CheckCircle2,
  FileText,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

export default function PersonalSalaryPage() {
  const { activeHousehold, updateActiveHousehold, savePersonalSimulation } = useFiscaliq();

  // Simulator parameters
  const [taxYear, setTaxYear] = useState<SupportedTaxYear>(2026);
  const [entryMode, setEntryMode] = useState<SalaryEntryMode>('STATUTORY_ESTIMATE');
  const [grossMonthlySalaryEur, setGrossMonthlySalaryEur] = useState<number>(
    activeHousehold.grossMonthlySalaryEur || 3600
  );
  const [salaryMonthsPerYear, setSalaryMonthsPerYear] = useState<12 | 13>(12);
  const [status, setStatus] = useState<'non_cadre' | 'cadre' | 'fonction_publique'>(
    activeHousehold.employmentCategory || 'cadre'
  );
  const [employeeMutuelleMonthlyEur, setEmployeeMutuelleMonthlyEur] = useState<number>(35);
  const [employerMutuelleMonthlyEur, setEmployerMutuelleMonthlyEur] = useState<number>(45);

  // Manual payslip inputs
  const [manualNetBeforeTaxMonthlyEur, setManualNetBeforeTaxMonthlyEur] = useState<number>(2810);
  const [manualNetTaxableMonthlyEur, setManualNetTaxableMonthlyEur] = useState<number>(2955);
  const [manualNetSocialMonthlyEur, setManualNetSocialMonthlyEur] = useState<number>(2845);
  const [useCustomManualPasRate, setUseCustomManualPasRate] = useState<boolean>(false);
  const [manualWithholdingRatePercent, setManualWithholdingRatePercent] = useState<number>(6.5);

  // Household & PAS option parameters
  const [maritalStatus, setMaritalStatus] = useState<FamilyMaritalStatus>(
    activeHousehold.maritalStatus
  );
  const [dependantsCount, setDependantsCount] = useState<number>(
    activeHousehold.dependantsCount
  );
  const [withholdingRateOption, setWithholdingRateOption] =
    useState<WithholdingRateOptionType>('PERSONNALISE_FOYER');
  const [spouseMonthlyNetTaxableEur, setSpouseMonthlyNetTaxableEur] = useState<number>(2400);

  // Prélèvement à la source & Situation Change Simulator State
  const [changeSimNewMonthlyNetTaxableEur, setChangeSimNewMonthlyNetTaxableEur] =
    useState<number>(3450);
  const [changeSimNewSpouseMonthlyNetTaxableEur, setChangeSimNewSpouseMonthlyNetTaxableEur] =
    useState<number>(2400);
  const [changeSimNewMaritalStatus, setChangeSimNewMaritalStatus] =
    useState<FamilyMaritalStatus>(activeHousehold.maritalStatus);
  const [changeSimNewDependantsCount, setChangeSimNewDependantsCount] = useState<number>(
    activeHousehold.dependantsCount
  );

  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Run deterministic Detailed Salary & Payslip Calculator
  const salaryResult = useMemo(() => {
    return calculateDetailedPersonalSalary({
      entryMode,
      taxYear,
      grossMonthlySalaryEur,
      salaryMonthsPerYear,
      status,
      employeeMutuelleMonthlyEur,
      employerMutuelleMonthlyEur,
      manualNetBeforeTaxMonthlyEur,
      manualNetTaxableMonthlyEur,
      manualNetSocialMonthlyEur,
      manualWithholdingRatePercent:
        entryMode === 'MANUAL_PAYSLIP' && useCustomManualPasRate
          ? manualWithholdingRatePercent
          : null,
      maritalStatus,
      dependantsCount,
      withholdingRateOption,
      spouseMonthlyNetTaxableEur,
    });
  }, [
    entryMode,
    taxYear,
    grossMonthlySalaryEur,
    salaryMonthsPerYear,
    status,
    employeeMutuelleMonthlyEur,
    employerMutuelleMonthlyEur,
    manualNetBeforeTaxMonthlyEur,
    manualNetTaxableMonthlyEur,
    manualNetSocialMonthlyEur,
    useCustomManualPasRate,
    manualWithholdingRatePercent,
    maritalStatus,
    dependantsCount,
    withholdingRateOption,
    spouseMonthlyNetTaxableEur,
  ]);

  // Run deterministic PAS & Situation Change Simulator
  const pasChangeResult = useMemo(() => {
    return simulateWithholdingTaxAndSituationChange({
      taxYear,
      currentMonthlyNetTaxableSalaryEur: salaryResult.netTaxableMonthlyEur,
      currentSpouseMonthlyNetTaxableSalaryEur:
        maritalStatus === 'marie_pacse' ? spouseMonthlyNetTaxableEur : 0,
      currentMaritalStatus: maritalStatus,
      currentDependantsCount: dependantsCount,
      newMonthlyNetTaxableSalaryEur: changeSimNewMonthlyNetTaxableEur,
      newSpouseMonthlyNetTaxableSalaryEur:
        changeSimNewMaritalStatus === 'marie_pacse'
          ? changeSimNewSpouseMonthlyNetTaxableEur
          : 0,
      newMaritalStatus: changeSimNewMaritalStatus,
      newDependantsCount: changeSimNewDependantsCount,
    });
  }, [
    taxYear,
    salaryResult.netTaxableMonthlyEur,
    maritalStatus,
    spouseMonthlyNetTaxableEur,
    dependantsCount,
    changeSimNewMonthlyNetTaxableEur,
    changeSimNewSpouseMonthlyNetTaxableEur,
    changeSimNewMaritalStatus,
    changeSimNewDependantsCount,
  ]);

  // Handlers for bidirectional Gross Monthly <-> Gross Annual input
  const handleGrossMonthlyChange = (nextMonthly: number) => {
    const clean = Math.max(0, Math.round(nextMonthly));
    setGrossMonthlySalaryEur(clean);
  };

  const handleGrossAnnualChange = (nextAnnual: number) => {
    const cleanAnnual = Math.max(0, Math.round(nextAnnual));
    setGrossMonthlySalaryEur(Math.round(cleanAnnual / salaryMonthsPerYear));
  };

  // Sync with active household profile
  const handleSyncFromHousehold = () => {
    setGrossMonthlySalaryEur(activeHousehold.grossMonthlySalaryEur);
    setStatus(activeHousehold.employmentCategory);
    setMaritalStatus(activeHousehold.maritalStatus);
    setDependantsCount(activeHousehold.dependantsCount);
    setChangeSimNewMaritalStatus(activeHousehold.maritalStatus);
    setChangeSimNewDependantsCount(activeHousehold.dependantsCount);
    setSaveBanner(`Paramètres synchronisés avec le profil « ${activeHousehold.householdName} ».`);
  };

  // Load quick change-of-situation preset
  const applyPasChangePreset = (
    preset: 'promotion' | 'baisse_revenus' | 'naissance_enfant' | 'mariage_pacs'
  ) => {
    const baseNetTaxable = salaryResult.netTaxableMonthlyEur;
    if (preset === 'promotion') {
      setChangeSimNewMonthlyNetTaxableEur(baseNetTaxable + 650);
      setChangeSimNewSpouseMonthlyNetTaxableEur(spouseMonthlyNetTaxableEur);
      setChangeSimNewMaritalStatus(maritalStatus);
      setChangeSimNewDependantsCount(dependantsCount);
    } else if (preset === 'baisse_revenus') {
      setChangeSimNewMonthlyNetTaxableEur(Math.max(1200, baseNetTaxable - 700));
      setChangeSimNewSpouseMonthlyNetTaxableEur(spouseMonthlyNetTaxableEur);
      setChangeSimNewMaritalStatus(maritalStatus);
      setChangeSimNewDependantsCount(dependantsCount);
    } else if (preset === 'naissance_enfant') {
      setChangeSimNewMonthlyNetTaxableEur(baseNetTaxable);
      setChangeSimNewSpouseMonthlyNetTaxableEur(spouseMonthlyNetTaxableEur);
      setChangeSimNewMaritalStatus(maritalStatus);
      setChangeSimNewDependantsCount(dependantsCount + 1);
    } else if (preset === 'mariage_pacs') {
      setChangeSimNewMonthlyNetTaxableEur(baseNetTaxable);
      setChangeSimNewSpouseMonthlyNetTaxableEur(2100);
      setChangeSimNewMaritalStatus('marie_pacse');
      setChangeSimNewDependantsCount(dependantsCount);
    }
  };

  // Save simulation to household history and update household profile
  const handleSavePayslipSimulation = () => {
    updateActiveHousehold({
      grossMonthlySalaryEur: salaryResult.grossMonthlySalaryEur,
      employmentCategory: status,
      maritalStatus,
      dependantsCount,
      annualDeclaredSalaryNetImposableEur: salaryResult.netTaxableAnnualEur,
    });

    savePersonalSimulation({
      householdId: activeHousehold.id,
      moduleType: 'SALAIRE_NET_PAS',
      taxYear,
      title: `Salaire ${
        entryMode === 'MANUAL_PAYSLIP' ? '(Fiche de paie saisie)' : '(Barème URSSAF)'
      } : ${salaryResult.grossMonthlySalaryEur.toLocaleString('fr-FR')} € brut → ${salaryResult.netAfterTaxMonthlyEur.toLocaleString('fr-FR')} € net en banque`,
      inputsSummary: `Brut annuel ${salaryResult.grossAnnualSalaryEur.toLocaleString(
        'fr-FR'
      )} € · Net imposable ${salaryResult.netTaxableMonthlyEur.toLocaleString(
        'fr-FR'
      )} €/mois · Taux PAS ${salaryResult.appliedWithholdingRatePercent.toLocaleString('fr-FR')} %`,
      mainResultLabel: 'Salaire net payé en banque (après PAS)',
      mainResultAmountEur: salaryResult.netAfterTaxMonthlyEur,
      secondaryDetail: `PAS : ${salaryResult.withholdingTaxMonthlyEur.toLocaleString(
        'fr-FR'
      )} €/mois · Net annuel après impôt : ${salaryResult.netAfterTaxAnnualEur.toLocaleString(
        'fr-FR'
      )} €`,
      classification: entryMode === 'MANUAL_PAYSLIP' ? 'CALCUL_VERIFIE' : 'ESTIMATION',
      statutoryRef: 'CGI Art. 83, 197, 204 A à 204 M & Barèmes URSSAF / AGIRC-ARRCO',
    });

    setSaveBanner(
      'Simulation de salaire et de prélèvement à la source enregistrée dans votre dossier.'
    );
  };

  return (
    <AppShell title="Mon salaire net">
      <div className="space-y-6">
        <p className="text-xs text-slate-600 -mt-2">
          Calculez votre salaire net en banque et votre prélèvement à la source.
        </p>
        {saveBanner && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveBanner(null)}
              className="text-emerald-700 hover:underline font-semibold"
            >
              Fermer
            </button>
          </div>
        )}

        {/* SECTION 1 : Synthèse immédiate des 6 indicateurs clés (Mensuel & Annuel) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              1. SALAIRE BRUT MENSUEL
            </div>
            <div className="text-lg font-bold font-mono text-[#101827] mt-1">
              {salaryResult.grossMonthlySalaryEur.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Contrat ({salaryResult.salaryMonthsPerYear} mois/an)
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              2. SALAIRE BRUT ANNUEL
            </div>
            <div className="text-lg font-bold font-mono text-[#101827] mt-1">
              {salaryResult.grossAnnualSalaryEur.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Cotisations : -{salaryResult.effectiveEmployeeContributionRatePercent.toLocaleString('fr-FR')} %
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-700 font-semibold">
              3. NET AVANT IMPÔT
            </div>
            <div className="text-lg font-bold font-mono text-[#101827] mt-1">
              {salaryResult.netBeforeTaxMonthlyEur.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {salaryResult.netBeforeTaxAnnualEur.toLocaleString('fr-FR')} € / an
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-900 font-semibold">
              4. SALAIRE NET IMPOSABLE
            </div>
            <div className="text-lg font-bold font-mono text-amber-950 mt-1">
              {salaryResult.netTaxableMonthlyEur.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-amber-800 mt-1 font-mono">
              {salaryResult.netTaxableAnnualEur.toLocaleString('fr-FR')} € / an (Assiette PAS)
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E8EDF2] rounded-xl p-4 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-semibold">
              5. NET APRÈS IMPÔT (BANQUE)
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
              {salaryResult.netAfterTaxMonthlyEur.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              PAS : -{salaryResult.withholdingTaxMonthlyEur.toLocaleString('fr-FR')} €/mois ({salaryResult.appliedWithholdingRatePercent.toLocaleString('fr-FR')} %)
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-900 font-semibold">
              6. REVENU ANNUEL ESTIMÉ
            </div>
            <div className="text-lg font-bold font-mono text-emerald-950 mt-1">
              {salaryResult.netAfterTaxAnnualEur.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-emerald-800 mt-1 font-mono">
              Base IR après -10 % : {salaryResult.annualTaxableIncomeAfterDeductionEur.toLocaleString('fr-FR')} €
            </div>
          </div>
        </section>

        {/* SECTION 2 : Explication pédagogique claire des 4 notions clés */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                FICHE DE PAIE EN FRANÇAIS SIMPLE
              </span>
              <h2 className="text-sm sm:text-base font-bold text-[#172033]">
                Les 4 montants clés de votre bulletin expliqués en 1 coup d’œil
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Règles de votre fiche de paie
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
              <span className="font-mono text-[10px] uppercase font-bold text-slate-600 block">
                1. Cotisations sociales
              </span>
              <p className="font-semibold text-slate-900">Retraite et sécurité sociale</p>
              <p className="text-[11px] text-slate-600">Financent votre retraite et votre couverture santé.</p>
              <div className="pt-1.5 border-t border-slate-200 font-mono text-[11px] text-rose-700 font-bold">
                -{salaryResult.employeeSocialContributionsMonthlyEur.toLocaleString('fr-FR')} € / mois
              </div>
            </div>

            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-1">
              <span className="font-mono text-[10px] uppercase font-bold text-amber-900 block">
                2. Salaire net imposable
              </span>
              <p className="font-semibold text-slate-900">Montant transmis aux impôts</p>
              <p className="text-[11px] text-slate-600">Intègre la CSG non déductible (2,4 %) et la mutuelle employeur.</p>
              <div className="pt-1.5 border-t border-amber-200 font-mono text-[11px] text-amber-900 font-bold">
                +{salaryResult.differenceNetTaxableVsNetBeforeTaxMonthlyEur.toLocaleString('fr-FR')} € vs net avant impôt
              </div>
            </div>

            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 space-y-1">
              <span className="font-mono text-[10px] uppercase font-bold text-blue-900 block">
                3. Revenu imposable annuel
              </span>
              <p className="font-semibold text-slate-900">Après déduction de 10 %</p>
              <p className="text-[11px] text-slate-600">Base du barème progressif après abattement pour frais pro.</p>
              <div className="pt-1.5 border-t border-blue-200 font-mono text-[11px] text-blue-900 font-bold">
                Abattement 10 % : -{salaryResult.professionalDeductionAppliedAnnualEur.toLocaleString('fr-FR')} € / an
              </div>
            </div>

            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-1">
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-900 block">
                4. Prélèvement à la source
              </span>
              <p className="font-semibold text-slate-900">Retenu directement chaque mois</p>
              <p className="text-[11px] text-slate-600">Calculé sur le net imposable avec le taux officiel DGFiP.</p>
              <div className="pt-1.5 border-t border-emerald-200 font-mono text-[11px] text-emerald-900 font-bold">
                -{salaryResult.withholdingTaxMonthlyEur.toLocaleString('fr-FR')} € / mois ({salaryResult.appliedWithholdingRatePercent.toLocaleString('fr-FR')} %)
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 : Simulateur de salaire et de fiche de paie (Mode Barème Légal vs Mode Saisie Manuelle) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Colonne gauche : Contrôles de saisie (Barème légal ou Saisie manuelle du bulletin) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-[#101827]">
                  Paramètres du salaire & de la fiche de paie
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                  {([2026, 2025] as const).map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setTaxYear(yr)}
                      className={`px-2 py-1 text-[11px] font-mono font-semibold rounded transition-colors ${
                        taxYear === yr
                          ? 'bg-[#10B981] text-white shadow-xs'
                          : 'text-slate-600 hover:text-[#172033]'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSyncFromHousehold}
                  title="Synchroniser avec le profil du foyer actif"
                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sélecteur de mode : Estimation Barème Légal vs Saisie Manuelle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mode de calcul de votre fiche de paie
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEntryMode('STATUTORY_ESTIMATE')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                    entryMode === 'STATUTORY_ESTIMATE'
                      ? 'bg-[#10B981] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#172033]'
                  }`}
                >
                  Estimation barème URSSAF
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('MANUAL_PAYSLIP')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                    entryMode === 'MANUAL_PAYSLIP'
                      ? 'bg-[#10B981] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#172033]'
                  }`}
                >
                  Saisir ma fiche de paie
                </button>
              </div>
            </div>

            {/* Saisie bidirectionnelle Salaire Brut Mensuel <-> Annuel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Salaire brut mensuel (€)
                </label>
                <input
                  type="number"
                  min={500}
                  step={50}
                  value={grossMonthlySalaryEur}
                  onChange={(e) => handleGrossMonthlyChange(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Salaire brut annuel (€)
                </label>
                <input
                  type="number"
                  min={6000}
                  step={500}
                  value={salaryResult.grossAnnualSalaryEur}
                  onChange={(e) => handleGrossAnnualChange(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                />
              </div>
            </div>

            <div>
              <input
                type="range"
                min={1400}
                max={12000}
                step={50}
                value={Math.min(12000, Math.max(1400, grossMonthlySalaryEur))}
                onChange={(e) => handleGrossMonthlyChange(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>1 400 €</span>
                <span>SMIC 2026 : 1 823 €</span>
                <span>PMSS {taxYear} : {salaryResult.pmssMonthlyEur.toLocaleString('fr-FR')} €</span>
                <span>12 000 €</span>
              </div>
            </div>

            {/* Paramètres spécifiques au mode Estimation Barème URSSAF */}
            {entryMode === 'STATUTORY_ESTIMATE' ? (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Statut professionnel
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target.value as 'non_cadre' | 'cadre' | 'fonction_publique'
                        )
                      }
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    >
                      <option value="non_cadre">Salarié Non-cadre (Privé)</option>
                      <option value="cadre">Salarié Cadre (Privé + APEC)</option>
                      <option value="fonction_publique">Fonction publique</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rythme de versement annuel
                    </label>
                    <select
                      value={salaryMonthsPerYear}
                      onChange={(e) =>
                        setSalaryMonthsPerYear(Number(e.target.value) === 13 ? 13 : 12)
                      }
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    >
                      <option value={12}>Sur 12 mois</option>
                      <option value={13}>Sur 13 mois (13e mois inclus)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mutuelle obligatoire — Part salariale (€/mois)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={employeeMutuelleMonthlyEur}
                      onChange={(e) =>
                        setEmployeeMutuelleMonthlyEur(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                    <span className="text-[10px] text-slate-500">
                      Déduite du net à payer et du net imposable
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mutuelle obligatoire — Part employeur (€/mois)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={employerMutuelleMonthlyEur}
                      onChange={(e) =>
                        setEmployerMutuelleMonthlyEur(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                    <span className="text-[10px] text-amber-800">
                      Ajoutée à votre salaire net imposable
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode Saisie manuelle de la fiche de paie */
              <div className="space-y-3.5 pt-2 border-t border-slate-100 bg-emerald-50/30 p-3.5 rounded-lg border border-emerald-200/80">
                <div className="text-xs font-bold text-[#101827] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  Recopiez les montants figurant au bas de votre bulletin de paie :
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Net à payer avant impôt sur le revenu (€)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={manualNetBeforeTaxMonthlyEur}
                      onChange={(e) =>
                        setManualNetBeforeTaxMonthlyEur(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Salaire net imposable mensuel (€)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={manualNetTaxableMonthlyEur}
                      onChange={(e) =>
                        setManualNetTaxableMonthlyEur(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Montant net social (€, facultatif)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={manualNetSocialMonthlyEur}
                      onChange={(e) =>
                        setManualNetSocialMonthlyEur(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCustomManualPasRate}
                        onChange={(e) => setUseCustomManualPasRate(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      Saisir le taux PAS du bulletin (%)
                    </label>
                    {useCustomManualPasRate ? (
                      <input
                        type="number"
                        min={0}
                        max={43}
                        step={0.1}
                        value={manualWithholdingRatePercent}
                        onChange={(e) =>
                          setManualWithholdingRatePercent(
                            Math.max(0, Math.min(43, Number(e.target.value) || 0))
                          )
                        }
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827]"
                      />
                    ) : (
                      <div className="px-3 py-1.5 text-xs font-mono bg-slate-100 rounded-md text-slate-600">
                        Taux calculé : {salaryResult.appliedWithholdingRatePercent.toLocaleString('fr-FR')} %
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Situation familiale & Option de taux PAS */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Situation familiale
                  </label>
                  <select
                    value={maritalStatus}
                    onChange={(e) =>
                      setMaritalStatus(e.target.value as FamilyMaritalStatus)
                    }
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                  >
                    <option value="celibataire">Célibataire</option>
                    <option value="marie_pacse">Marié(e) ou Pacsé(e)</option>
                    <option value="parent_isole">Parent isolé (Case T)</option>
                    <option value="divorce_separe">Divorcé(e) / Séparé(e)</option>
                    <option value="veuf">Veuf / Veuve</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enfants / personnes à charge ({salaryResult.familyQuotientParts} parts)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={dependantsCount}
                    onChange={(e) =>
                      setDependantsCount(Math.max(0, Math.min(10, Number(e.target.value) || 0)))
                    }
                    className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choisir votre taux de prélèvement à la source
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {
                      id: 'PERSONNALISE_FOYER',
                      label: `Personnalisé (${salaryResult.personalizedHouseholdRatePercent} %)`,
                    },
                    {
                      id: 'INDIVIDUALISE_COUPLE',
                      label: `Individualisé (${salaryResult.individualizedEmployeeRatePercent} %)`,
                    },
                    {
                      id: 'NEUTRE_DEFAUT',
                      label: `Taux neutre (${salaryResult.neutralDefaultRatePercent} %)`,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setWithholdingRateOption(opt.id as WithholdingRateOptionType)
                      }
                      className={`py-2 px-2 rounded-md text-[11px] font-semibold border transition-colors ${
                        withholdingRateOption === opt.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {maritalStatus === 'marie_pacse' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salaire net imposable mensuel du conjoint (€/mois — pour le taux individualisé)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={spouseMonthlyNetTaxableEur}
                    onChange={(e) =>
                      setSpouseMonthlyNetTaxableEur(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSavePayslipSimulation}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold bg-[#10B981] text-white hover:bg-[#059669] transition-colors cursor-pointer shadow-xs"
            >
              <BookmarkPlus className="w-4 h-4 text-white" />
              Appliquer au foyer & sauvegarder cette simulation
            </button>
          </div>

          {/* Colonne droite : Bulletin de paie détaillé ligne par ligne & Hypothèses explicites */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                  DÉCOMPOSITION DÉTAILLÉE DU BULLETIN DE PAIE ({taxYear})
                </span>
                <h3 className="text-base font-bold text-[#101827]">
                  Du salaire brut au salaire net versé après prélèvement à la source
                </h3>
              </div>
              <DataOriginBadge
                classification={
                  entryMode === 'MANUAL_PAYSLIP' ? 'CALCUL_VERIFIE' : 'ESTIMATION'
                }
              />
            </div>

            {/* Tableau ligne par ligne des cotisations et des soldes intermédiaires */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-600">
                    <th className="py-2.5 px-3.5">Rubrique du bulletin de paie</th>
                    <th className="py-2.5 px-3 text-right">Base / Taux</th>
                    <th className="py-2.5 px-3.5 text-right">Mensuel (€)</th>
                    <th className="py-2.5 px-3.5 text-right">Annuel ({salaryResult.salaryMonthsPerYear} mois)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  <tr className="bg-slate-50 font-bold text-[#101827]">
                    <td className="py-2.5 px-3.5">Salaire brut de base</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">100 %</td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {salaryResult.grossMonthlySalaryEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {salaryResult.grossAnnualSalaryEur.toLocaleString('fr-FR')} €
                    </td>
                  </tr>

                  {entryMode === 'STATUTORY_ESTIMATE' &&
                    salaryResult.contributionLines.map((line) => (
                      <tr key={line.code} className="text-slate-600">
                        <td className="py-2 px-3.5">
                          <div className="font-medium text-slate-800">{line.label}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {line.statutoryRef} ·{' '}
                            {line.isTaxDeductible
                              ? 'Déductible du net imposable'
                              : 'Non déductible (inclus dans le net imposable)'}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[11px]">
                          {line.baseEur.toLocaleString('fr-FR')} € × {line.ratePercent} %
                        </td>
                        <td className="py-2 px-3.5 text-right font-mono text-rose-700">
                          -{line.amountMonthlyEur.toLocaleString('fr-FR')} €
                        </td>
                        <td className="py-2 px-3.5 text-right font-mono text-slate-500">
                          -{Math.round(line.amountMonthlyEur * salaryResult.salaryMonthsPerYear).toLocaleString('fr-FR')} €
                        </td>
                      </tr>
                    ))}

                  <tr className="bg-slate-50/90 font-semibold text-rose-800">
                    <td className="py-2.5 px-3.5">
                      Total des cotisations sociales salariales retenues
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {salaryResult.effectiveEmployeeContributionRatePercent.toLocaleString('fr-FR')} %
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      -{salaryResult.employeeSocialContributionsMonthlyEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      -{salaryResult.employeeSocialContributionsAnnualEur.toLocaleString('fr-FR')} €
                    </td>
                  </tr>

                  <tr className="bg-white font-semibold text-slate-700">
                    <td className="py-2.5 px-3.5">
                      Montant net social (référence CAF / Prime d’activité)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-400">
                      Arrêté BOSS
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {salaryResult.netSocialMonthlyEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {Math.round(salaryResult.netSocialMonthlyEur * salaryResult.salaryMonthsPerYear).toLocaleString('fr-FR')} €
                    </td>
                  </tr>

                  <tr className="bg-amber-50/60 font-bold text-amber-950">
                    <td className="py-2.5 px-3.5">
                      <div>Salaire net imposable (Assiette du Prélèvement à la Source)</div>
                      <div className="text-[10px] font-normal text-amber-800">
                        Inclut la CSG/CRDS non déductible ({salaryResult.nonDeductibleCsgCrdsMonthlyEur.toLocaleString('fr-FR')} €) et la part patronale mutuelle ({salaryResult.employerMutuelleTaxableShareMonthlyEur.toLocaleString('fr-FR')} €)
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                      Imposable
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {salaryResult.netTaxableMonthlyEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {salaryResult.netTaxableAnnualEur.toLocaleString('fr-FR')} €
                    </td>
                  </tr>

                  <tr className="bg-slate-100 font-bold text-[#101827]">
                    <td className="py-2.5 px-3.5">
                      Salaire net à payer avant impôt sur le revenu
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-500">
                      Brut - Cotisations
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {salaryResult.netBeforeTaxMonthlyEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {salaryResult.netBeforeTaxAnnualEur.toLocaleString('fr-FR')} €
                    </td>
                  </tr>

                  <tr className="bg-emerald-50/40 font-semibold text-emerald-900">
                    <td className="py-2.5 px-3.5">
                      <div>Prélèvement à la source de l’impôt sur le revenu (PAS)</div>
                      <div className="text-[10px] font-normal text-emerald-800">
                        Calculé sur le Net imposable ({salaryResult.netTaxableMonthlyEur.toLocaleString('fr-FR')} € × {salaryResult.appliedWithholdingRatePercent.toLocaleString('fr-FR')} %)
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {salaryResult.appliedWithholdingRatePercent.toLocaleString('fr-FR')} %
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      -{salaryResult.withholdingTaxMonthlyEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      -{salaryResult.withholdingTaxAnnualEur.toLocaleString('fr-FR')} €
                    </td>
                  </tr>

                  <tr className="bg-emerald-50/70 border-t-2 border-emerald-500 text-[#172033] font-bold">
                    <td className="py-3 px-3.5">
                      Salaire net payé en banque (après prélèvement à la source)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-emerald-800">
                      Net en poche
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-sm text-emerald-800">
                      {salaryResult.netAfterTaxMonthlyEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-sm text-emerald-800">
                      {salaryResult.netAfterTaxAnnualEur.toLocaleString('fr-FR')} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Transparence méthodologique : Pourquoi le Brut -> Net dépend des paramètres propres au contrat */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/90 space-y-2 text-xs text-slate-600">
              <div className="font-bold text-[#101827] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Hypothèses de calcul & Pourquoi un simulateur Brut → Net comporte toujours des variables propres à l’entreprise :
              </div>
              <ul className="list-disc list-inside space-y-1 leading-relaxed">
                {salaryResult.assumptionsAndLimitations.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 4 : Comparaison des 3 Taux de Prélèvement à la Source */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                COMPARER VOS 3 OPTIONS DE TAUX DE PRÉLÈVEMENT
              </span>
              <h2 className="text-base font-bold text-[#101827]">
                Taux du foyer, taux individualisé en couple ou taux neutre ?
              </h2>
            </div>
            <DataOriginBadge classification="CALCUL_VERIFIE" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option 1 : Taux personnalisé */}
            <div
              className={`rounded-xl border p-4 flex flex-col justify-between ${
                withholdingRateOption === 'PERSONNALISE_FOYER'
                  ? 'border-emerald-500 bg-emerald-50/20'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                    OPTION 1 · TAUX DU FOYER
                  </span>
                  <span className="text-sm font-mono font-bold text-[#101827]">
                    {salaryResult.personalizedHouseholdRatePercent.toLocaleString('fr-FR')} %
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#101827] mt-1">
                  Taux personnalisé du foyer fiscal
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Calculé sur l’ensemble des revenus et des parts ({salaryResult.familyQuotientParts} part{salaryResult.familyQuotientParts > 1 ? 's' : ''}) de votre foyer. Les deux conjoints ont le même taux sur leur fiche de paie.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600">Prélèvement mensuel :</span>
                <span className="font-mono font-bold text-[#101827]">
                  {Math.round(
                    (salaryResult.netTaxableMonthlyEur *
                      salaryResult.personalizedHouseholdRatePercent) /
                      100
                  ).toLocaleString('fr-FR')}{' '}
                  € / mois
                </span>
              </div>
            </div>

            {/* Option 2 : Taux individualisé (Couples) */}
            <div
              className={`rounded-xl border p-4 flex flex-col justify-between ${
                withholdingRateOption === 'INDIVIDUALISE_COUPLE'
                  ? 'border-emerald-500 bg-emerald-50/20'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-800">
                    OPTION 2 · EN COUPLE
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-800">
                    Vous : {salaryResult.individualizedEmployeeRatePercent.toLocaleString('fr-FR')} % · Conjoint :{' '}
                    {salaryResult.individualizedSpouseRatePercent.toLocaleString('fr-FR')} %
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#101827] mt-1">
                  Taux individualisé (Répartition en couple)
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Utile quand les deux conjoints ont un écart de salaire : chacun paie selon son revenu. Le montant total payé par le couple reste identique.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600">Votre prélèvement :</span>
                <span className="font-mono font-bold text-emerald-800">
                  {Math.round(
                    (salaryResult.netTaxableMonthlyEur *
                      salaryResult.individualizedEmployeeRatePercent) /
                      100
                  ).toLocaleString('fr-FR')}{' '}
                  € / mois
                </span>
              </div>
            </div>

            {/* Option 3 : Taux non personnalisé / Taux neutre */}
            <div
              className={`rounded-xl border p-4 flex flex-col justify-between ${
                withholdingRateOption === 'NEUTRE_DEFAUT'
                  ? 'border-emerald-500 bg-emerald-50/20'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-900">
                    OPTION 3 · CONFIDENTIALITÉ
                  </span>
                  <span className="text-sm font-mono font-bold text-amber-900">
                    {salaryResult.neutralDefaultRatePercent.toLocaleString('fr-FR')} %
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#101827] mt-1">
                  Taux neutre (Sans détail à l’employeur)
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Appliqué si vous ne souhaitez pas transmettre le taux de votre foyer à votre employeur. Il suit la grille d’un célibataire sans enfant.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600">Prélèvement au taux neutre :</span>
                <span className="font-mono font-bold text-amber-900">
                  {Math.round(
                    (salaryResult.netTaxableMonthlyEur *
                      salaryResult.neutralDefaultRatePercent) /
                      100
                  ).toLocaleString('fr-FR')}{' '}
                  € / mois
                </span>
              </div>
            </div>
          </div>

          <ExpandableDetail
            summary="Détails"
            officialRef="CGI Art. 83, Art. 204 E, Art. 204 F, Art. 204 H et Art. 204 M"
          >
            <p>
              Le prélèvement à la source s’applique sur le salaire net imposable (qui inclut la CSG/CRDS non déductible et la part employeur de la mutuelle obligatoire).
            </p>
          </ExpandableDetail>
        </section>

        {/* SECTION 5 : Simulateur de Prélèvement à la Source — Changement de revenus ou de situation familiale */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-bold text-[#101827]">
                  Simulateur de modulation du Prélèvement à la Source & Solde annuel d’impôt
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Simulez l’impact d’une hausse ou baisse de salaire, d’une naissance ou d’un mariage/PACS sur votre taux PAS, votre prélèvement mensuel et votre régularisation d’impôt en septembre N+1.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">
                Scénarios rapides :
              </span>
              <button
                type="button"
                onClick={() => applyPasChangePreset('promotion')}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Hausse de salaire (+650 €/mois)
              </button>
              <button
                type="button"
                onClick={() => applyPasChangePreset('baisse_revenus')}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Baisse de revenus (-700 €/mois)
              </button>
              <button
                type="button"
                onClick={() => applyPasChangePreset('naissance_enfant')}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Naissance d’un enfant (+parts)
              </button>
              <button
                type="button"
                onClick={() => applyPasChangePreset('mariage_pacs')}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Mariage / PACS
              </button>
            </div>
          </div>

          {/* Paramètres de la nouvelle situation */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nouveau salaire net imposable mensuel (€)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={changeSimNewMonthlyNetTaxableEur}
                onChange={(e) =>
                  setChangeSimNewMonthlyNetTaxableEur(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827]"
              />
              <span className="text-[11px] text-slate-500">
                Actuel : {salaryResult.netTaxableMonthlyEur.toLocaleString('fr-FR')} € / mois
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nouvelle situation familiale
              </label>
              <select
                value={changeSimNewMaritalStatus}
                onChange={(e) =>
                  setChangeSimNewMaritalStatus(e.target.value as FamilyMaritalStatus)
                }
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-md text-[#101827]"
              >
                <option value="celibataire">Célibataire</option>
                <option value="marie_pacse">Marié(e) ou Pacsé(e)</option>
                <option value="parent_isole">Parent isolé (Case T)</option>
                <option value="divorce_separe">Divorcé(e) / Séparé(e)</option>
                <option value="veuf">Veuf / Veuve</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nouveau nombre d’enfants à charge
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={changeSimNewDependantsCount}
                onChange={(e) =>
                  setChangeSimNewDependantsCount(
                    Math.max(0, Math.min(10, Number(e.target.value) || 0))
                  )
                }
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827]"
              />
              <span className="text-[11px] text-slate-500">
                Parts : {pasChangeResult.currentQuotientParts} → {pasChangeResult.newQuotientParts} part(s)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Revenu net imposable mensuel du conjoint (€)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                disabled={changeSimNewMaritalStatus !== 'marie_pacse'}
                value={
                  changeSimNewMaritalStatus === 'marie_pacse'
                    ? changeSimNewSpouseMonthlyNetTaxableEur
                    : 0
                }
                onChange={(e) =>
                  setChangeSimNewSpouseMonthlyNetTaxableEur(
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Résultats comparatifs : Taux PAS, Prélèvement mensuel & Solde annuel d'impôt */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                1. ÉVOLUTION DU TAUX PERSONNALISÉ
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-lg font-mono font-bold text-slate-500 line-through">
                  {pasChangeResult.currentPersonalizedRatePercent.toLocaleString('fr-FR')} %
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="text-2xl font-mono font-bold text-[#101827]">
                  {pasChangeResult.newPersonalizedRatePercent.toLocaleString('fr-FR')} %
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                Variation :{' '}
                <strong className="font-mono">
                  {pasChangeResult.rateDeltaPoints >= 0 ? '+' : ''}
                  {pasChangeResult.rateDeltaPoints.toLocaleString('fr-FR')} pt(s)
                </strong>{' '}
                (Taux individualisé : {pasChangeResult.newIndividualizedSpouse1RatePercent.toLocaleString('fr-FR')} %)
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                2. PRÉLÈVEMENT MENSUEL DU FOYER
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-lg font-mono font-bold text-slate-500 line-through">
                  {pasChangeResult.currentMonthlyWithholdingTotalEur.toLocaleString('fr-FR')} €
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="text-2xl font-mono font-bold text-emerald-700">
                  {pasChangeResult.newMonthlyWithholdingIfModulatedTotalEur.toLocaleString('fr-FR')} € / mois
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                Impôt annuel total estimé sur la nouvelle situation :{' '}
                <strong className="font-mono text-[#101827]">
                  {pasChangeResult.newActualAnnualTaxDueEur.toLocaleString('fr-FR')} € / an
                </strong>
              </p>
            </div>

            <div
              className={`p-4 rounded-lg border ${
                pasChangeResult.annualTaxBalanceIfOldRateKeptEur > 50
                  ? 'border-amber-300 bg-amber-50/40'
                  : pasChangeResult.annualTaxBalanceIfOldRateKeptEur < -50
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-700">
                3. SOLDE ANNUEL SI VOUS NE MODULEZ PAS VOTRE TAUX
              </div>
              <div className="text-xl font-mono font-bold mt-1.5 text-[#101827]">
                {pasChangeResult.annualTaxBalanceIfOldRateKeptEur > 0
                  ? `Reste à payer : +${pasChangeResult.annualTaxBalanceIfOldRateKeptEur.toLocaleString('fr-FR')} €`
                  : pasChangeResult.annualTaxBalanceIfOldRateKeptEur < 0
                  ? `Trop-perçu remboursé : ${Math.abs(pasChangeResult.annualTaxBalanceIfOldRateKeptEur).toLocaleString('fr-FR')} €`
                  : 'Solde équilibré (0 €)'}
              </div>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {pasChangeResult.annualTaxBalanceIfOldRateKeptEur > 0
                  ? `Si vous gardez votre ancien taux (${pasChangeResult.currentPersonalizedRatePercent} %), seulement ${pasChangeResult.totalWithheldOver12MonthsIfOldRateKeptEur.toLocaleString('fr-FR')} € seront prélevés sur l’année : la DGFiP prélèvera le solde en septembre N+1.`
                  : pasChangeResult.annualTaxBalanceIfOldRateKeptEur < 0
                  ? `Sans actualisation de votre taux sur impots.gouv.fr, vous avancez trop d’impôt chaque mois : la DGFiP vous remboursera la différence l’été suivant.`
                  : 'Vos prélèvements mensuels couvrent exactement votre impôt annuel estimé.'}
              </p>
            </div>
          </div>

          {/* Avertissement officiel : Redirection vers impots.gouv.fr pour toute modification réelle */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 border border-emerald-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3 max-w-3xl">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-slate-700">
                <strong className="text-[#172033] block mb-0.5">
                  Information officielle importante : FISCALIQ ne modifie jamais votre taux auprès de votre employeur ni de l’administration fiscale.
                </strong>
                Pour déclarer un changement de situation familiale (mariage, PACS, naissance), moduler votre taux suite à une variation de revenus ou opter pour le taux individualisé / neutre, connectez-vous exclusivement à votre espace particulier sur <strong>impots.gouv.fr</strong> (rubrique <em>« Gérer mon prélèvement à la source »</em>). La DGFiP transmettra ensuite automatiquement votre nouveau taux à votre employeur via la DSN.
              </div>
            </div>

            <a
              href="https://www.impots.gouv.fr/particulier/gerer-mon-prelevement-la-source"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] transition-colors shrink-0 shadow-xs"
            >
              Accéder au service officiel impots.gouv.fr <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
