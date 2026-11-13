'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { ExpandableDetail } from '@/components/ui/design-system';
import { DocumentScannerModal } from '@/components/declaration/document-scanner-modal';
import {
  evaluateDeclarationCompanion,
  OFFICIAL_DECLARATION_RESOURCES,
  ChecklistItemStatus,
} from '@/lib/calculations/declaration-companion-engine';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  BookmarkCheck,
  Sparkles,
} from 'lucide-react';

export default function PersonalDeclarationPage() {
  const { activeHousehold } = useFiscaliq();
  const profileSyncKey = `${activeHousehold.id}-${activeHousehold.annualDeclaredSalaryNetImposableEur}-${activeHousehold.perContributionAnnualEur}-${activeHousehold.maritalStatus}-${activeHousehold.dependantsCount}`;
  return <PersonalDeclarationContent key={profileSyncKey} />;
}

function PersonalDeclarationContent() {
  const {
    activeHousehold,
    updateActiveHousehold,
    personalTaxSummary,
    savePersonalSimulation,
  } = useFiscaliq();

  const [taxYear, setTaxYear] = useState<2026 | 2025>(2026);
  const [annualSalary, setAnnualSalary] = useState<number>(
    activeHousehold.annualDeclaredSalaryNetImposableEur
  );
  const [optsRealExpenses, setOptsRealExpenses] = useState<boolean>(false);
  const [realExpensesEur, setRealExpensesEur] = useState<number>(0);
  const [perContributionEur, setPerContributionEur] = useState<number>(
    activeHousehold.perContributionAnnualEur
  );
  const [childcareEur, setChildcareEur] = useState<number>(0);
  const [homeServicesEur, setHomeServicesEur] = useState<number>(0);
  const [donationsEur, setDonationsEur] = useState<number>(0);
  const [withheldPasEur, setWithheldPasEur] = useState<number>(
    personalTaxSummary.monthlyWithholdingTaxEur * 12
  );
  const [januaryAdvanceEur, setJanuaryAdvanceEur] = useState<number>(0);
  const [itemStatuses, setItemStatuses] = useState<
    Record<string, ChecklistItemStatus>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const isRetiree = activeHousehold.activityProfile === 'retraite';

  const evaluation = useMemo(() => {
    return evaluateDeclarationCompanion({
      taxYear,
      maritalStatus: activeHousehold.maritalStatus,
      dependantsCount: activeHousehold.dependantsCount,
      hasSharedCustodyChildren: false,
      hasAdultChildStudent: false,
      hasSalaries: !isRetiree,
      annualNetImposableSalaryEur: !isRetiree ? annualSalary : 0,
      hasPensions: isRetiree,
      annualNetImposablePensionEur: isRetiree ? annualSalary : 0,
      hasRentalIncome: activeHousehold.additionalNetTaxableIncomeEur > 0,
      annualGrossRentalIncomeEur:
        activeHousehold.additionalNetTaxableIncomeEur > 0
          ? Math.round(activeHousehold.additionalNetTaxableIncomeEur / 0.7)
          : 0,
      optsForRealProfessionalExpenses: optsRealExpenses,
      estimatedRealProfessionalExpensesEur: realExpensesEur,
      hasPerContributions: perContributionEur > 0,
      annualPerContributionEur: perContributionEur,
      paysAlimony: false,
      annualAlimonyPaidEur: 0,
      hasChildcareUnder6: childcareEur > 0,
      annualChildcareNetOfCafEur: childcareEur,
      hasHomeServices: homeServicesEur > 0,
      annualHomeServicesNetEur: homeServicesEur,
      hasCharitableDonations: donationsEur > 0,
      annualDonationsEur: donationsEur,
      alreadyWithheldPasAnnualEur: withheldPasEur,
      january60PctAdvanceReceivedEur: januaryAdvanceEur,
    });
  }, [
    taxYear,
    activeHousehold.maritalStatus,
    activeHousehold.dependantsCount,
    activeHousehold.additionalNetTaxableIncomeEur,
    isRetiree,
    annualSalary,
    optsRealExpenses,
    realExpensesEur,
    perContributionEur,
    childcareEur,
    homeServicesEur,
    donationsEur,
    withheldPasEur,
    januaryAdvanceEur,
  ]);

  const formatEur = (val: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(val);

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSave = () => {
    savePersonalSimulation({
      householdId: activeHousehold.id,
      title: `Déclaration ${taxYear} (${formatEur(evaluation.finalAnnualNetIncomeTaxEur)})`,
      moduleType: 'IR_FOYER',
      taxYear,
      classification: 'CALCUL_VERIFIE',
      inputsSummary: `Revenu net imposable : ${formatEur(annualSalary)} · ${evaluation.familyQuotientParts} part(s)`,
      mainResultLabel: 'Impôt net annuel estimé',
      mainResultAmountEur: evaluation.finalAnnualNetIncomeTaxEur,
      secondaryDetail: `Solde d'été : ${formatEur(evaluation.estimatedSummerTaxBalanceEur)}`,
      statutoryRef: 'Formulaire 2042 / CGI Art. 197',
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <AppShell title="Ma déclaration">
      <DocumentScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onApplyExtractedValues={(scanned) => {
          if (scanned.annualNetTaxableSalaryEur !== null) {
            setAnnualSalary(scanned.annualNetTaxableSalaryEur);
            updateActiveHousehold({
              annualDeclaredSalaryNetImposableEur:
                scanned.annualNetTaxableSalaryEur,
            });
          }
          if (scanned.withheldPasAnnualEur !== null) {
            setWithheldPasEur(scanned.withheldPasAnnualEur);
          }
          if (scanned.grossMonthlySalaryEur !== null) {
            updateActiveHousehold({
              grossMonthlySalaryEur: scanned.grossMonthlySalaryEur,
            });
          }
        }}
      />

      <div className="space-y-4">
        {/* BLOC 1 : RÉSULTAT PRINCIPAL EN PREMIER */}
        <section className="gw-panel p-6 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-bold text-[#242b27]">
                Feuille de route pour votre déclaration {taxYear}
              </h1>
              <p className="text-xs text-[#384238]">
                Vérifiez et copiez vos montants exacts dans les cases de votre déclaration impots.gouv.fr.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="gw-button"
              >
                <Sparkles size={14} />
                <span>Importer avis d’impôt / fiche de paie</span>
              </button>
              <div className="gw-segment">
                {([2026, 2025] as const).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    aria-pressed={taxYear === yr}
                    onClick={() => setTaxYear(yr)}
                  >
                    {yr}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="gw-button"
              >
                <BookmarkCheck size={14} />
                <span>{savedNotice ? 'Enregistré' : 'Sauvegarder'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-black/10 bg-white/80 p-4">
              <p className="text-xs font-medium text-[#384238]">
                Impôt net annuel estimé
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#242b27]">
                {formatEur(evaluation.finalAnnualNetIncomeTaxEur)}
              </p>
              <p className="mt-1 text-xs text-[#384238]">
                {evaluation.familyQuotientParts.toLocaleString('fr-FR')} part(s) · TMI{' '}
                {evaluation.marginalTaxRatePercent} %
              </p>
            </div>

            <div className="rounded-xl border border-black/10 bg-white/80 p-4">
              <p className="text-xs font-medium text-[#384238]">
                Déjà prélevé à la source
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#242b27]">
                {formatEur(evaluation.alreadyWithheldPasAnnualEur)}
              </p>
              <p className="mt-1 text-xs text-[#384238]">
                Réductions et crédits :{' '}
                {formatEur(evaluation.totalReductionsAndCreditsEur)}
              </p>
            </div>

            <div className="rounded-xl border border-[#326b54]/30 bg-[#dce9da]/80 p-4">
              <p className="text-xs font-semibold text-[#242b27]">
                {evaluation.estimatedSummerTaxBalanceEur < 0
                  ? 'Remboursement estimé cet été'
                  : evaluation.estimatedSummerTaxBalanceEur > 0
                  ? 'Solde estimé à régler en automne'
                  : 'Solde d’été à l’équilibre'}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#274b39]">
                {formatEur(Math.abs(evaluation.estimatedSummerTaxBalanceEur))}
              </p>
              <p className="mt-1 text-xs text-[#242b27]">
                {evaluation.balanceType === 'RESTE_A_PAYER_4_ECHEANCES'
                  ? `En 4 prélèvements de ${formatEur(evaluation.monthlyAutumnInstallmentEur)} (sept. à déc.).`
                  : evaluation.balanceType === 'REMBOURSEMENT_DGFIP'
                  ? 'Viré par la DGFiP sur votre compte bancaire en été.'
                  : 'Réglé en une échéance en septembre.'}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-[#384238]">
            Estimation indicative, non contractuelle. Vérifiez toujours vos montants sur votre déclaration officielle impots.gouv.fr.
          </p>
        </section>

        {/* BLOC 2 : SAISIE DES MONTANTS CLÉS */}
        <section className="gw-panel p-6">
          <h2 className="text-sm font-bold text-[#242b27]">
            1. Vos montants pour préparer les cases 2042
          </h2>
          <p className="mt-1 text-xs text-[#384238]">
            Ajustez vos montants annuels ou utilisez le bouton d’import automatique ci-dessus.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-[#242b27]">
                {isRetiree
                  ? 'Pensions nettes (1AS)'
                  : 'Salaires nets imposables (1AJ)'}
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={annualSalary}
                onChange={(e) =>
                  setAnnualSalary(Math.max(0, Number(e.target.value) || 0))
                }
                className="mt-1 w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-sm text-[#242b27]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242b27]">
                Prélèvement à la source déjà payé
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={withheldPasEur}
                onChange={(e) =>
                  setWithheldPasEur(Math.max(0, Number(e.target.value) || 0))
                }
                className="mt-1 w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-sm text-[#242b27]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242b27]">
                Versements PER (case 6NS)
              </label>
              <input
                type="number"
                min={0}
                step={200}
                value={perContributionEur}
                onChange={(e) =>
                  setPerContributionEur(
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="mt-1 w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-sm text-[#242b27]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242b27]">
                Emploi à domicile net (case 7DB)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={homeServicesEur}
                onChange={(e) =>
                  setHomeServicesEur(Math.max(0, Number(e.target.value) || 0))
                }
                className="mt-1 w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-sm text-[#242b27]"
              />
            </div>
          </div>

          <div className="mt-4">
            <ExpandableDetail summary="Autres cases fréquentes (frais réels 1AK, garde d’enfant 7GA, dons 7UF, avance 60 %)">
              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#242b27]">
                    <input
                      type="checkbox"
                      checked={optsRealExpenses}
                      onChange={(e) => setOptsRealExpenses(e.target.checked)}
                    />
                    Frais réels (case 1AK)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    disabled={!optsRealExpenses}
                    value={realExpensesEur}
                    onChange={(e) =>
                      setRealExpensesEur(
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-sm text-[#242b27] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#242b27]">
                    Garde d’enfant &lt; 6 ans (case 7GA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={childcareEur}
                    onChange={(e) =>
                      setChildcareEur(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="mt-1 w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-sm text-[#242b27]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#242b27]">
                    Dons aux associations (case 7UF)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={donationsEur}
                    onChange={(e) =>
                      setDonationsEur(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="mt-1 w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-sm text-[#242b27]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#242b27]">
                    Avance de 60 % reçue en janvier
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={januaryAdvanceEur}
                    onChange={(e) =>
                      setJanuaryAdvanceEur(
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-black/15 bg-white/85 px-3 py-2 font-mono text-sm text-[#242b27]"
                  />
                </div>
              </div>
            </ExpandableDetail>
          </div>
        </section>

        {/* BLOC 3 : LISTE DES CASES À VÉRIFIER */}
        <section className="gw-panel p-6">
          <h2 className="text-sm font-bold text-[#242b27]">
            2. Vos cases 2042 prêtes à copier ({evaluation.checklistItems.length})
          </h2>
          <p className="mt-1 text-xs text-[#384238]">
            Cliquez sur un montant pour le copier, puis cochez la case une fois vérifiée sur impots.gouv.fr.
          </p>

          <div className="mt-4 space-y-3">
            {evaluation.checklistItems.map((item) => {
              const status = itemStatuses[item.id] ?? item.defaultStatus;
              const isReady = status === 'verifie_pret';

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition ${
                    isReady
                      ? 'border-[#326b54]/40 bg-[#dce9da]/50'
                      : 'border-black/10 bg-white/80'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-[#242b27] px-2 py-0.5 font-mono text-xs font-bold text-white">
                          {item.boxCodes.join(' / ')}
                        </span>
                        <h3 className="text-sm font-bold text-[#242b27]">
                          {item.title}
                        </h3>
                        <span className="rounded-md bg-black/5 px-2 py-0.5 text-[11px] font-medium text-[#384238]">
                          {item.isPreFilledByAdministration
                            ? 'Prérempli'
                            : 'À saisir'}
                        </span>
                      </div>
                      <p className="text-xs text-[#384238]">
                        {item.whatToVerifyOrEnter}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(item.id, item.suggestedAmountOrValue)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-[#242b27] hover:bg-black/5"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-[#326b54]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-[#384238]" />
                        )}
                        {item.suggestedAmountOrValue}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setItemStatuses((prev) => ({
                            ...prev,
                            [item.id]: isReady ? 'a_verifier' : 'verifie_pret',
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          isReady
                            ? 'bg-[#326b54] text-white'
                            : 'border border-black/15 bg-white text-[#242b27] hover:bg-black/5'
                        }`}
                      >
                        {isReady ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Vérifié
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            À vérifier
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <ExpandableDetail summary="En savoir plus (pièce justificative et source officielle)">
                      <p className="text-xs text-[#384238]">
                        {item.plainExplanation}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[#242b27]">
                        Justificatif : {item.supportingDocumentTitle}
                      </p>
                      <a
                        href={item.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#326b54] hover:underline"
                      >
                        {item.statutoryReference}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </ExpandableDetail>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BLOC 4 : JUSTIFICATIFS ET RESSOURCES OFFICIELLES REPLIÉS */}
        <section className="gw-panel p-6">
          <ExpandableDetail summary="Justificatifs à conserver et liens officiels impots.gouv.fr">
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {evaluation.supportingDocuments
                  .filter((doc) => doc.applicableToUser)
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-black/10 bg-white/80 p-3.5"
                    >
                      <p className="text-xs font-bold text-[#242b27]">
                        {doc.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#384238]">
                        Émetteur : {doc.issuer} · Cases :{' '}
                        {doc.associatedBoxes.join(', ')}
                      </p>
                      <p className="mt-1 text-[11px] text-[#384238]">
                        {doc.retentionRule}
                      </p>
                    </div>
                  ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {OFFICIAL_DECLARATION_RESOURCES.map((res) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#242b27] hover:bg-black/5"
                  >
                    {res.title}
                    <ExternalLink className="h-3 w-3 text-[#384238]" />
                  </a>
                ))}
              </div>
            </div>
          </ExpandableDetail>
        </section>
      </div>
    </AppShell>
  );
}
