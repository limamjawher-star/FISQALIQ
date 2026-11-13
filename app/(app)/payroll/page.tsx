'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { ExpandableDetail } from '@/components/ui/design-system';
import { DocumentScannerModal } from '@/components/declaration/document-scanner-modal';
import type { ScannedFiscalDocumentResult } from '@/lib/ai/document-scanner';
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
  ExternalLink,
  RefreshCw,
  FileUp,
} from 'lucide-react';

export default function PersonalSalaryPage() {
  const { activeHousehold } = useFiscaliq();
  const profileSyncKey = `${activeHousehold.id}-${activeHousehold.grossMonthlySalaryEur}-${activeHousehold.employmentCategory}-${activeHousehold.maritalStatus}-${activeHousehold.dependantsCount}`;
  return <PersonalSalaryContent key={profileSyncKey} />;
}

function PersonalSalaryContent() {
  const { activeHousehold, updateActiveHousehold, savePersonalSimulation } = useFiscaliq();

  const [taxYear, setTaxYear] = useState<SupportedTaxYear>(2026);
  const [entryMode, setEntryMode] = useState<SalaryEntryMode>('STATUTORY_ESTIMATE');
  const [grossMonthlySalaryEur, setGrossMonthlySalaryEur] = useState<number>(
    activeHousehold.grossMonthlySalaryEur || 3000
  );
  const [salaryMonthsPerYear, setSalaryMonthsPerYear] = useState<12 | 13>(12);
  const [status, setStatus] = useState<'non_cadre' | 'cadre' | 'fonction_publique'>(
    activeHousehold.employmentCategory || 'cadre'
  );
  const [employeeMutuelleMonthlyEur, setEmployeeMutuelleMonthlyEur] = useState<number>(35);
  const [employerMutuelleMonthlyEur, setEmployerMutuelleMonthlyEur] = useState<number>(45);

  const [manualNetBeforeTaxMonthlyEur, setManualNetBeforeTaxMonthlyEur] = useState<number>(2340);
  const [manualNetTaxableMonthlyEur, setManualNetTaxableMonthlyEur] = useState<number>(2450);
  const [manualNetSocialMonthlyEur, setManualNetSocialMonthlyEur] = useState<number>(2360);
  const [useCustomManualPasRate, setUseCustomManualPasRate] = useState<boolean>(false);
  const [manualWithholdingRatePercent, setManualWithholdingRatePercent] = useState<number>(6.5);

  const [maritalStatus, setMaritalStatus] = useState<FamilyMaritalStatus>(
    activeHousehold.maritalStatus
  );
  const [dependantsCount, setDependantsCount] = useState<number>(
    activeHousehold.dependantsCount
  );
  const [withholdingRateOption, setWithholdingRateOption] =
    useState<WithholdingRateOptionType>('PERSONNALISE_FOYER');
  const [spouseMonthlyNetTaxableEur, setSpouseMonthlyNetTaxableEur] = useState<number>(2400);

  const [changeSimNewMonthlyNetTaxableEur, setChangeSimNewMonthlyNetTaxableEur] =
    useState<number>(3000);
  const [changeSimNewDependantsCount, setChangeSimNewDependantsCount] = useState<number>(
    activeHousehold.dependantsCount
  );
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  const handleApplyScannedPayslip = (fields: ScannedFiscalDocumentResult) => {
    if (fields.grossMonthlySalaryEur !== null) {
      setGrossMonthlySalaryEur(fields.grossMonthlySalaryEur);
    }
    if (fields.annualNetTaxableSalaryEur !== null) {
      setEntryMode('MANUAL_PAYSLIP');
      const netTaxableMonthly = Math.round(fields.annualNetTaxableSalaryEur / 12);
      setManualNetTaxableMonthlyEur(netTaxableMonthly);
      setManualNetBeforeTaxMonthlyEur(Math.round(netTaxableMonthly * 0.962));
      if (fields.grossMonthlySalaryEur === null) {
        setGrossMonthlySalaryEur(Math.round(netTaxableMonthly / 0.78));
      }
    }
    if (fields.withholdingRatePercent !== null) {
      setUseCustomManualPasRate(true);
      setManualWithholdingRatePercent(fields.withholdingRatePercent);
    }
    setSaveBanner('Paramètres de fiche de paie importés automatiquement.');
  };

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
        maritalStatus === 'marie_pacse' ? spouseMonthlyNetTaxableEur : 0,
      newMaritalStatus: maritalStatus,
      newDependantsCount: changeSimNewDependantsCount,
    });
  }, [
    taxYear,
    salaryResult.netTaxableMonthlyEur,
    maritalStatus,
    spouseMonthlyNetTaxableEur,
    dependantsCount,
    changeSimNewMonthlyNetTaxableEur,
    changeSimNewDependantsCount,
  ]);

  const handleGrossMonthlyChange = (nextMonthly: number) => {
    setGrossMonthlySalaryEur(Math.max(0, Math.round(nextMonthly)));
  };

  const handleGrossAnnualChange = (nextAnnual: number) => {
    const cleanAnnual = Math.max(0, Math.round(nextAnnual));
    setGrossMonthlySalaryEur(Math.round(cleanAnnual / salaryMonthsPerYear));
  };

  const handleSyncFromHousehold = () => {
    setGrossMonthlySalaryEur(activeHousehold.grossMonthlySalaryEur || 3000);
    setStatus(activeHousehold.employmentCategory);
    setMaritalStatus(activeHousehold.maritalStatus);
    setDependantsCount(activeHousehold.dependantsCount);
    setChangeSimNewDependantsCount(activeHousehold.dependantsCount);
    setSaveBanner('Paramètres synchronisés avec votre profil.');
  };

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
      title: `Salaire : ${salaryResult.grossMonthlySalaryEur.toLocaleString('fr-FR')} € brut → ${salaryResult.netAfterTaxMonthlyEur.toLocaleString('fr-FR')} € net`,
      inputsSummary: `Brut annuel ${salaryResult.grossAnnualSalaryEur.toLocaleString('fr-FR')} € · Taux PAS ${salaryResult.appliedWithholdingRatePercent.toLocaleString('fr-FR')} %`,
      mainResultLabel: 'Salaire net en banque',
      mainResultAmountEur: salaryResult.netAfterTaxMonthlyEur,
      secondaryDetail: `Prélèvement : ${salaryResult.withholdingTaxMonthlyEur.toLocaleString('fr-FR')} €/mois · Net annuel : ${salaryResult.netAfterTaxAnnualEur.toLocaleString('fr-FR')} €`,
      classification: entryMode === 'MANUAL_PAYSLIP' ? 'CALCUL_VERIFIE' : 'ESTIMATION',
      statutoryRef: 'CGI Art. 83, 197, 204 A à 204 M & Barèmes URSSAF',
    });

    setSaveBanner('Votre simulation de salaire a été enregistrée.');
  };

  return (
    <AppShell title="Mon salaire net">
      <div className="space-y-5">
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

        {/* BLOC 1 : Résultat principal en premier */}
        <section className="gw-panel p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-900 font-semibold">
                NET EN BANQUE (APRÈS IMPÔT)
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
                {salaryResult.netAfterTaxMonthlyEur.toLocaleString('fr-FR')} € / mois
              </div>
              <div className="text-[11px] text-emerald-900 mt-1 font-mono">
                {salaryResult.netAfterTaxAnnualEur.toLocaleString('fr-FR')} € / an
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-600 font-semibold">
                NET AVANT IMPÔT
              </div>
              <div className="text-xl font-bold font-mono text-[#101827] mt-1">
                {salaryResult.netBeforeTaxMonthlyEur.toLocaleString('fr-FR')} € / mois
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Cotisations : -{salaryResult.employeeSocialContributionsMonthlyEur.toLocaleString('fr-FR')} €/mois
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-600 font-semibold">
                PRÉLÈVEMENT À LA SOURCE
              </div>
              <div className="text-xl font-bold font-mono text-[#101827] mt-1">
                -{salaryResult.withholdingTaxMonthlyEur.toLocaleString('fr-FR')} € / mois
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Taux appliqué : {salaryResult.appliedWithholdingRatePercent.toLocaleString('fr-FR')} %
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-600 font-semibold">
                SALAIRE NET IMPOSABLE
              </div>
              <div className="text-xl font-bold font-mono text-[#101827] mt-1">
                {salaryResult.netTaxableMonthlyEur.toLocaleString('fr-FR')} € / mois
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {salaryResult.netTaxableAnnualEur.toLocaleString('fr-FR')} € / an
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Estimation indicative, non contractuelle. Le salaire net imposable est légèrement supérieur au net avant impôt car il inclut la CSG non déductible et la part employeur de la mutuelle.
          </p>
        </section>

        {/* BLOC 2 : Saisie rapide du salaire et choix du taux */}
        <section className="gw-panel p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-[#101827]">
                1. Vos paramètres de salaire
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50/70 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <FileUp className="w-3.5 h-3.5 text-emerald-700" />
                Importer ma fiche de paie
              </button>
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                {([2026, 2025] as const).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setTaxYear(yr)}
                    className={`px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors ${
                      taxYear === yr
                        ? 'bg-[#10B981] text-white'
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reprendre mon profil
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEntryMode('STATUTORY_ESTIMATE')}
                  className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                    entryMode === 'STATUTORY_ESTIMATE'
                      ? 'bg-[#10B981] text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Estimation automatique
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('MANUAL_PAYSLIP')}
                  className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                    entryMode === 'MANUAL_PAYSLIP'
                      ? 'bg-[#10B981] text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Saisir ma fiche de paie
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salaire brut mensuel (€)
                  </label>
                  <input
                    type="number"
                    min={0}
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
                    min={0}
                    step={500}
                    value={salaryResult.grossAnnualSalaryEur}
                    onChange={(e) => handleGrossAnnualChange(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                  />
                </div>
              </div>

              {entryMode === 'STATUTORY_ESTIMATE' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as 'non_cadre' | 'cadre' | 'fonction_publique')
                      }
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    >
                      <option value="non_cadre">Salarié non-cadre</option>
                      <option value="cadre">Salarié cadre</option>
                      <option value="fonction_publique">Fonction publique</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre de mois
                    </label>
                    <select
                      value={salaryMonthsPerYear}
                      onChange={(e) =>
                        setSalaryMonthsPerYear(Number(e.target.value) === 13 ? 13 : 12)
                      }
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    >
                      <option value={12}>Sur 12 mois</option>
                      <option value={13}>Sur 13 mois</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Net avant impôt (€/mois)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={manualNetBeforeTaxMonthlyEur}
                      onChange={(e) =>
                        setManualNetBeforeTaxMonthlyEur(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Net imposable (€/mois)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={manualNetTaxableMonthlyEur}
                      onChange={(e) =>
                        setManualNetTaxableMonthlyEur(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Situation familiale
                  </label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value as FamilyMaritalStatus)}
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
                    Personnes à charge ({salaryResult.familyQuotientParts} parts)
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
                  Type de taux de prélèvement à la source
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {
                      id: 'PERSONNALISE_FOYER',
                      label: `Foyer (${salaryResult.personalizedHouseholdRatePercent} %)`,
                    },
                    {
                      id: 'INDIVIDUALISE_COUPLE',
                      label: `Individualisé (${salaryResult.individualizedEmployeeRatePercent} %)`,
                    },
                    {
                      id: 'NEUTRE_DEFAUT',
                      label: `Neutre (${salaryResult.neutralDefaultRatePercent} %)`,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setWithholdingRateOption(opt.id as WithholdingRateOptionType)}
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
                    Salaire net imposable du conjoint (€/mois)
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

              <button
                type="button"
                onClick={handleSavePayslipSimulation}
                className="gw-button gw-button-primary w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4 text-white" />
                Enregistrer ce salaire dans mon profil
              </button>
            </div>
          </div>
        </section>

        {/* BLOC 3 : Simuler un changement de salaire ou d'enfant */}
        <section className="gw-panel p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#101827]">
            2. Simuler un changement de revenus ou la naissance d’un enfant
          </h2>
          <p className="text-xs text-slate-600">
            Testez l’impact d’une évolution de salaire ou d’une naissance sur votre prélèvement mensuel.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nouveau net imposable (€/mois)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={changeSimNewMonthlyNetTaxableEur}
                onChange={(e) =>
                  setChangeSimNewMonthlyNetTaxableEur(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nouveau nombre d’enfants
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
                className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="text-slate-500">Nouveau taux estimé :</div>
              <div className="font-mono font-bold text-[#101827] text-sm">
                {pasChangeResult.newPersonalizedRatePercent.toLocaleString('fr-FR')} % (
                {pasChangeResult.newMonthlyWithholdingIfModulatedTotalEur.toLocaleString('fr-FR')} €/mois)
              </div>
            </div>
          </div>
        </section>

        {/* BLOC 4 : Détails de la fiche de paie et cotisations repliés */}
        <section className="gw-panel p-5">
          <ExpandableDetail
            summary="En savoir plus : voir le détail des cotisations et de la fiche de paie"
            officialRef="CGI Art. 83, 197, 204 A à 204 M & Barèmes URSSAF"
          >
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mutuelle part salarié (€/mois)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={employeeMutuelleMonthlyEur}
                    onChange={(e) =>
                      setEmployeeMutuelleMonthlyEur(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mutuelle part employeur (€/mois)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={employerMutuelleMonthlyEur}
                    onChange={(e) =>
                      setEmployerMutuelleMonthlyEur(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                  />
                </div>
                {entryMode === 'MANUAL_PAYSLIP' && (
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1">
                      <input
                        type="checkbox"
                        checked={useCustomManualPasRate}
                        onChange={(e) => setUseCustomManualPasRate(e.target.checked)}
                      />
                      Taux PAS personnalisé (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={43}
                      step={0.1}
                      disabled={!useCustomManualPasRate}
                      value={manualWithholdingRatePercent}
                      onChange={(e) =>
                        setManualWithholdingRatePercent(Number(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                    />
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-600">
                      <th className="py-2 px-3">Rubrique</th>
                      <th className="py-2 px-3 text-right">Taux</th>
                      <th className="py-2 px-3 text-right">Mensuel (€)</th>
                      <th className="py-2 px-3 text-right">Annuel (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {salaryResult.contributionLines.map((line) => (
                      <tr key={line.code}>
                        <td className="py-2 px-3 font-medium text-slate-800">{line.label}</td>
                        <td className="py-2 px-3 text-right font-mono">{line.ratePercent} %</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-700">
                          -{line.amountMonthlyEur.toLocaleString('fr-FR')} €
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          -{Math.round(line.amountMonthlyEur * salaryResult.salaryMonthsPerYear).toLocaleString('fr-FR')} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px]">
                <a
                  href="https://www.impots.gouv.fr/particulier/gerer-mon-prelevement-la-source"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                >
                  impots.gouv.fr — Gérer mon prélèvement à la source
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                >
                  urssaf.fr — Taux de cotisations
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </ExpandableDetail>
        </section>

        <DocumentScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onApplyExtractedValues={handleApplyScannedPayslip}
        />
      </div>
    </AppShell>
  );
}
