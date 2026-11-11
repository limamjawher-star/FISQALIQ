'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { DataOriginBadge } from '@/components/ui/design-system';
import {
  PUBLIC_SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLANS_CONFIG,
  SubscriptionPlanId,
  PersonalReportType,
  PlanEntitlementConfig,
  HouseholdUsageSnapshot,
} from '@/lib/subscriptions/entitlements';
import type { StoredPersonalTaxReportMeta } from '@/lib/reports/pdf-report-service';
import { SUPABASE_REPORTS_AND_SUBSCRIPTIONS_RLS_SCHEMA } from '@/lib/supabase/config';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Lock,
  ShieldCheck,
  Sparkles,
  KeyRound,
  AlertTriangle,
  ExternalLink,
  CreditCard,
  Database,
  Layers,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface ReportListItem {
  meta: StoredPersonalTaxReportMeta;
  signedDownload: {
    token: string;
    expiresAtIso: string;
    ttlSeconds: number;
    downloadUrl: string;
  };
}

type ReportsViewTab =
  | 'PDF_REPORTS_AND_VAULT'
  | 'SUBSCRIPTIONS_AND_PRICING'
  | 'SAVED_SIMULATIONS_AND_RLS';

export default function PersonalReportsPage() {
  const {
    activeHousehold,
    savedPersonalSimulations,
    deletePersonalSimulation,
    restoreDefaultPersonalSimulations,
  } = useFiscaliq();

  const [activeTab, setActiveTab] = useState<ReportsViewTab>('PDF_REPORTS_AND_VAULT');

  // État serveur des rapports PDF et de l'abonnement du foyer authentifié
  const [reportsList, setReportsList] = useState<ReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] =
    useState<PersonalReportType>('BILAN_FISCAL_COMPLET');
  const [selectedTaxYear, setSelectedTaxYear] = useState<2026 | 2025>(2026);

  const [activePlanConfig, setActivePlanConfig] = useState<PlanEntitlementConfig>(
    SUBSCRIPTION_PLANS_CONFIG.PREMIUM
  );
  const [usageSnapshot, setUsageSnapshot] = useState<HouseholdUsageSnapshot>({
    householdId: activeHousehold.id,
    planId: 'PREMIUM',
    periodMonth: '2026-11',
    savedSimulationsUsed: savedPersonalSimulations.length,
    assistantQuestionsUsed: 4,
    pdfReportsGeneratedUsed: 1,
    updatedAtIso: '2026-11-10T09:00:00.000Z',
  });

  const [isLoadingServer, setIsLoadingServer] = useState(false);
  const [serverBanner, setServerBanner] = useState<{
    tone: 'emerald' | 'amber' | 'rose';
    message: string;
  } | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    fetch(`/api/reports?householdId=${encodeURIComponent(activeHousehold.id)}`, {
      headers: {
        'x-authenticated-household-id': activeHousehold.id,
      },
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (isCancelled || !ok || !data.authorized) return;
        setReportsList(data.reports || []);
        if (data.reports?.length > 0) {
          setSelectedReportId((prev) =>
            data.reports.some((r: ReportListItem) => r.meta.reportId === prev)
              ? prev
              : data.reports[0].meta.reportId
          );
        }
        if (data.subscription?.activePlan) {
          setActivePlanConfig(data.subscription.activePlan);
        }
        if (data.subscription?.usage) {
          setUsageSnapshot(data.subscription.usage);
        }
      })
      .catch(() => {
        // Conservation de l'état courant en cas d'erreur réseau
      });

    return () => {
      isCancelled = true;
    };
  }, [activeHousehold.id]);

  const selectedReportItem =
    reportsList.find((r) => r.meta.reportId === selectedReportId) ||
    reportsList[0] ||
    null;

  const handleGeneratePdfReport = async () => {
    setIsLoadingServer(true);
    setServerBanner(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-household-id': activeHousehold.id,
        },
        body: JSON.stringify({
          action: 'GENERATE_PDF_REPORT',
          authenticatedHouseholdId: activeHousehold.id,
          targetHouseholdId: activeHousehold.id,
          household: activeHousehold,
          reportType: selectedReportType,
          taxYear: selectedTaxYear,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.allowed) {
        if (data.usage) setUsageSnapshot(data.usage);
        if (data.activePlan) setActivePlanConfig(data.activePlan);
        setServerBanner({
          tone: res.status === 429 ? 'amber' : 'rose',
          message:
            data.error ||
            'Génération refusée par le contrôle des droits côté serveur.',
        });
        return;
      }

      setReportsList(data.reports || []);
      if (data.createdReport?.reportId) {
        setSelectedReportId(data.createdReport.reportId);
      }
      if (data.usage) setUsageSnapshot(data.usage);
      if (data.activePlan) setActivePlanConfig(data.activePlan);
      setServerBanner({
        tone: 'emerald',
        message: data.message,
      });
    } finally {
      setIsLoadingServer(false);
    }
  };

  const handleRefreshSignedLink = async (reportId: string) => {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-authenticated-household-id': activeHousehold.id,
      },
      body: JSON.stringify({
        action: 'REFRESH_SIGNED_URL',
        authenticatedHouseholdId: activeHousehold.id,
        targetHouseholdId: activeHousehold.id,
        reportId,
      }),
    });
    const data = await res.json();
    if (res.ok && data.allowed && data.signedDownload) {
      setReportsList((prev) =>
        prev.map((item) =>
          item.meta.reportId === reportId
            ? { ...item, signedDownload: data.signedDownload }
            : item
        )
      );
      setServerBanner({
        tone: 'emerald',
        message:
          'Nouveau lien de téléchargement temporaire signé (validité 15 minutes) généré côté serveur.',
      });
    }
  };

  const handleSwitchPlanSimulation = async (newPlanId: SubscriptionPlanId) => {
    setIsLoadingServer(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-household-id': activeHousehold.id,
        },
        body: JSON.stringify({
          action: 'SWITCH_PLAN_SIMULATION',
          authenticatedHouseholdId: activeHousehold.id,
          targetHouseholdId: activeHousehold.id,
          newPlanId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.allowed) {
        setActivePlanConfig(data.activePlan);
        setUsageSnapshot(data.usage);
        setServerBanner({
          tone: 'emerald',
          message: `${data.message} (${data.paymentAbstractionNotice?.explanationFr || ''})`,
        });
      }
    } finally {
      setIsLoadingServer(false);
    }
  };

  const handleTestCrossHouseholdIsolation = async () => {
    const res = await fetch(
      `/api/reports?householdId=foyer-tiers-non-autorise`,
      {
        headers: {
          'x-authenticated-household-id': activeHousehold.id,
        },
      }
    );
    const data = await res.json();
    if (res.status === 403) {
      setServerBanner({
        tone: 'amber',
        message: `Test d’isolation réussi (HTTP 403) : ${data.error}`,
      });
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Foyer',
      'Module',
      'Intitule',
      'Parametres',
      'Resultat_Principal',
      'Montant_EUR',
      'Reference_Legale',
    ];
    const rows = savedPersonalSimulations.map((sim) => [
      `"${sim.createdAt}"`,
      `"${activeHousehold.householdName}"`,
      `"${sim.moduleType}"`,
      `"${sim.title.replace(/"/g, '""')}"`,
      `"${sim.inputsSummary.replace(/"/g, '""')}"`,
      `"${sim.mainResultLabel}"`,
      sim.mainResultAmountEur,
      `"${sim.statutoryRef}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fiscaliq-bilan-fiscal-personnel-2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportStatus('Votre récapitulatif CSV a été téléchargé.');
    setTimeout(() => setExportStatus(null), 4000);
  };

  return (
    <AppShell
      title="Mes rapports PDF, Coffre-fort privé & Formules d’abonnement"
      subtitle="Générez vos rapports fiscaux personnels en PDF côté serveur, téléchargez-les via des liens signés à durée limitée et consultez les formules Free, Plus et Premium."
      badge="RAPPORTS PDF SERVEUR + SUPABASE STORAGE PRIVÉ + ABONNEMENTS"
    >
      <div className="space-y-6">
        {/* Barre supérieure de synthèse du foyer et de la formule active */}
        <section className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Lock className="w-3.5 h-3.5" />
                Foyer authentifié isolé : {activeHousehold.householdName}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                {activePlanConfig.nameFr}
              </span>
              <DataOriginBadge classification="CALCUL_VERIFIE" />
            </div>
            <p className="text-xs text-slate-600">
              Compartiment privé Supabase Storage :{' '}
              <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                fiscaliq-personal-reports/{activeHousehold.id}/
              </code>{' '}
              · Quotas mensuels :{' '}
              <strong>
                {usageSnapshot.pdfReportsGeneratedUsed}/{activePlanConfig.limits.monthlyPdfReportsMax}
              </strong>{' '}
              rapport(s) PDF généré(s).
            </p>
          </div>

          {/* Onglets de navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('PDF_REPORTS_AND_VAULT')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'PDF_REPORTS_AND_VAULT'
                  ? 'bg-white text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              1. Rapports PDF & Coffre-fort ({reportsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUBSCRIPTIONS_AND_PRICING')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'SUBSCRIPTIONS_AND_PRICING'
                  ? 'bg-white text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              2. Formules Free / Plus / Premium & Quotas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SAVED_SIMULATIONS_AND_RLS')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'SAVED_SIMULATIONS_AND_RLS'
                  ? 'bg-white text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              3. Simulations ({savedPersonalSimulations.length}) & Sécurité Storage
            </button>
          </div>
        </section>

        {/* Bannière de retour serveur */}
        {serverBanner && (
          <div
            className={`rounded-xl p-4 border flex items-start justify-between gap-3 ${
              serverBanner.tone === 'emerald'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : serverBanner.tone === 'amber'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {serverBanner.tone === 'emerald' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <p className="text-xs font-medium leading-relaxed">{serverBanner.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setServerBanner(null)}
              className="text-xs font-semibold underline shrink-0"
            >
              Fermer
            </button>
          </div>
        )}

        {/* =====================================================================
            ONGLET 1 : GÉNÉRATEUR DE RAPPORTS PDF SERVEUR, LIENS SIGNÉS & APERÇU
           ===================================================================== */}
        {activeTab === 'PDF_REPORTS_AND_VAULT' && (
          <div className="space-y-6">
            {/* Panneau de configuration et génération serveur du PDF */}
            <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-base font-bold text-[#101827]">
                      Générer un rapport fiscal personnel PDF côté serveur
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Le fichier PDF est composé sur le serveur, archivé dans le compartiment privé{' '}
                    <code className="font-mono bg-slate-100 px-1 rounded">
                      fiscaliq-personal-reports
                    </code>{' '}
                    et délivré uniquement via un jeton signé temporaire (15 minutes).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestCrossHouseholdIsolation}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    title="Vérifier que le serveur bloque l'accès aux rapports d'un autre foyer (HTTP 403)"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Tester l’isolation inter-foyers (403)
                  </button>
                  <button
                    type="button"
                    onClick={() => typeof window !== 'undefined' && window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    Imprimer l’aperçu
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Modèle de rapport PDF à générer
                  </label>
                  <select
                    value={selectedReportType}
                    onChange={(e) =>
                      setSelectedReportType(e.target.value as PersonalReportType)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-xs font-medium text-[#101827] bg-white"
                  >
                    <option value="BILAN_FISCAL_COMPLET">
                      1. Bilan Fiscal Personnel Complet (Profil, Quotient Familial, Barème IR, PAS & Références)
                    </option>
                    <option value="SYNTHESE_SALAIRE_ET_PAS">
                      2. Synthèse Salaire, Fiche de Paie & Prélèvement à la Source (Personnalisé, Individualisé, Neutre)
                    </option>
                    <option value="DOSSIER_OPTIMISATION_ET_2042">
                      3. Dossier d’Optimisation Légale & Préparation Déclaration 2042 (Formules Plus & Premium)
                    </option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Millésime fiscal applicable
                  </label>
                  <select
                    value={String(selectedTaxYear)}
                    onChange={(e) =>
                      setSelectedTaxYear(e.target.value === '2025' ? 2025 : 2026)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-xs font-medium text-[#101827] bg-white"
                  >
                    <option value="2026">Déclaration 2026 (Revenus 2025)</option>
                    <option value="2025">Déclaration 2025 (Revenus 2024)</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <button
                    type="button"
                    onClick={handleGeneratePdfReport}
                    disabled={isLoadingServer}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-4 h-4 text-white" />
                    {isLoadingServer ? 'Génération PDF...' : 'Générer le rapport PDF'}
                  </button>
                </div>
              </div>

              {/* Liste des rapports PDF stockés dans le coffre-fort privé du foyer */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Coffre-fort privé du foyer ({reportsList.length} rapport(s) PDF stocké(s))
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reportsList.map((item) => {
                    const isSelected =
                      selectedReportItem?.meta.reportId === item.meta.reportId;
                    return (
                      <div
                        key={item.meta.reportId}
                        onClick={() => setSelectedReportId(item.meta.reportId)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/30 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              PDF SERVEUR · {(item.meta.byteSize / 1024).toFixed(1)} Ko
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {item.meta.createdAtDisplayFr}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-[#101827]">
                            {item.meta.title}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                            Objet privé : {item.meta.privateStorageBucket}/
                            {item.meta.privateStorageObjectPath}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                            SHA-256 : {item.meta.sha256Checksum.slice(0, 24)}…
                          </div>
                        </div>

                        <div
                          className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Lien signé actif (TTL 15 min)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRefreshSignedLink(item.meta.reportId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              title="Régénérer un nouveau jeton signé de 15 minutes"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Renouveler lien
                            </button>
                            <a
                              href={item.signedDownload.downloadUrl}
                              download
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Télécharger le PDF
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Aperçu haute-lisibilité du rapport PDF sélectionné */}
            {selectedReportItem && (
              <section className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
                {/* Bandeau d'en-tête PDF Clean Light Theme */}
                <div className="bg-[#F8FAFC] text-[#172033] p-6 border-b-2 border-[#10B981]">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                        <span>FISCALIQ PARTICULIERS — RAPPORT FISCAL PERSONNEL VÉRIFIÉ</span>
                        <span>•</span>
                        <span>MILLÉSIME {selectedReportItem.meta.taxYear} (REVENUS {selectedReportItem.meta.incomeYear})</span>
                      </div>
                      <h2 className="text-xl font-bold tracking-tight text-[#172033]">
                        {selectedReportItem.meta.title}
                      </h2>
                      <p className="text-xs text-slate-600 max-w-3xl">
                        {selectedReportItem.meta.subtitle}
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <a
                        href={selectedReportItem.signedDownload.downloadUrl}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger ce PDF ({(selectedReportItem.meta.byteSize / 1024).toFixed(1)} Ko)
                      </a>
                      <span className="text-[11px] font-mono text-slate-500">
                        Réf. : {selectedReportItem.meta.reportId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corps structuré du rapport en 5 sections claires + Références & Limites */}
                <div className="p-6 space-y-6">
                  {selectedReportItem.meta.sections.map((sec) => (
                    <div
                      key={sec.sectionNumber}
                      className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <h3 className="text-sm sm:text-base font-bold text-[#101827]">
                          {sec.title}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {sec.classificationLabel}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200/80">
                        <strong className="text-[#101827]">En clair :</strong>{' '}
                        {sec.plainFrenchExplanation}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {sec.keyMetrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between"
                          >
                            <div className="text-[11px] text-slate-500 font-medium">
                              {m.label}
                            </div>
                            <div className="text-base font-bold font-mono text-[#101827] mt-1">
                              {m.value}
                            </div>
                            {m.note && (
                              <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                                {m.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
                        {sec.bulletPoints.map((b, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {/* Section 6 : Références officielles, Hypothèses, Méthodologie et Limites */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
                    <div className="lg:col-span-7 border border-slate-200 rounded-xl p-5 space-y-3">
                      <h3 className="text-sm font-bold text-[#101827] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        Références officielles vérifiées citées dans ce rapport
                      </h3>
                      <div className="space-y-2">
                        {selectedReportItem.meta.officialReferences.map((ref, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 mr-2">
                                {ref.publisher}
                              </span>
                              <span className="font-semibold text-[#101827]">{ref.title}</span>
                              <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                                {ref.officialReference} · Vérifié le {ref.verifiedDate}
                              </div>
                            </div>
                            <a
                              href={ref.officialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline shrink-0"
                            >
                              Consulter <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-5 border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50">
                      <h3 className="text-sm font-bold text-[#101827]">
                        Méthodologie, hypothèses retenues & limites légales
                      </h3>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <strong>Méthodologie :</strong>{' '}
                        {selectedReportItem.meta.methodologySummary}
                      </p>
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-[#101827]">
                          Hypothèses appliquées :
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-600 list-disc pl-4">
                          {selectedReportItem.meta.assumptionsSummary.map((a, idx) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                        {selectedReportItem.meta.limitationsDisclaimer}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* =====================================================================
            ONGLET 2 : TARIFICATION FREE / PLUS / PREMIUM, QUOTAS & ABSTRACTION PAIEMENT
           ===================================================================== */}
        {activeTab === 'SUBSCRIPTIONS_AND_PRICING' && (
          <div className="space-y-6">
            {/* Suivi de consommation des quotas côté serveur */}
            <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#101827]">
                    Vos droits actifs & compteurs d’usage côté serveur ({activePlanConfig.nameFr})
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Toutes les permissions et limites d’utilisation sont vérifiées côté serveur avant
                    chaque génération de rapport PDF ou sauvegarde.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Période : {usageSnapshot.periodMonth}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Rapports PDF générés ce mois
                    </span>
                    <span className="font-mono font-bold text-[#101827]">
                      {usageSnapshot.pdfReportsGeneratedUsed} /{' '}
                      {activePlanConfig.limits.monthlyPdfReportsMax}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10B981]"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (usageSnapshot.pdfReportsGeneratedUsed /
                              activePlanConfig.limits.monthlyPdfReportsMax) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Liens de téléchargement signés valables 15 minutes.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Simulations sauvegardées
                    </span>
                    <span className="font-mono font-bold text-[#101827]">
                      {savedPersonalSimulations.length} /{' '}
                      {activePlanConfig.limits.savedSimulationsMax}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (savedPersonalSimulations.length /
                              activePlanConfig.limits.savedSimulationsMax) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Historique d’impôt, frais réels et prélèvement à la source.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Questions à l’assistant fiscal
                    </span>
                    <span className="font-mono font-bold text-[#101827]">
                      {usageSnapshot.assistantQuestionsUsed} /{' '}
                      {activePlanConfig.limits.monthlyAssistantQuestionsMax}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (usageSnapshot.assistantQuestionsUsed /
                              activePlanConfig.limits.monthlyAssistantQuestionsMax) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Réponses sourcées sur CGI, BOFiP et impots.gouv.fr.
                  </p>
                </div>
              </div>
            </section>

            {/* Grille des 2 formules : Gratuit (0 €) et Premium (5 €) */}
            <section className="space-y-4">
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
                <div className="max-w-2xl space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Deux formules simples
                  </span>
                  <h2 className="text-xl font-bold text-[#101827]">
                    Gratuit (0 €) &amp; Premium (5 € / mois)
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  {PUBLIC_SUBSCRIPTION_PLANS.map((planKey) => {
                    const plan = SUBSCRIPTION_PLANS_CONFIG[planKey];
                    const isCurrent =
                      activePlanConfig.planId === planKey ||
                      (activePlanConfig.planId === 'PLUS' && planKey === 'PREMIUM');

                    return (
                      <div
                        key={planKey}
                        className={`rounded-xl border p-6 flex flex-col justify-between transition-all ${
                          isCurrent
                            ? 'border-2 border-[#10B981] bg-emerald-50/20 shadow-sm'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {plan.planId}
                            </span>
                            {isCurrent && (
                              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                                Formule active du foyer
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-lg font-bold text-[#101827]">{plan.nameFr}</h3>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {plan.taglineFr}
                            </p>
                          </div>

                          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-sm font-bold text-[#101827]">
                              {plan.pricingDisplayLabelFr}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {plan.pricingStatusNoteFr}
                            </p>
                          </div>

                          {/* Plafonds configurables */}
                          <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <div className="font-bold text-[#101827]">
                                {plan.limits.monthlyPdfReportsMax}
                              </div>
                              <div className="text-[10px] text-slate-500">PDF / mois</div>
                            </div>
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <div className="font-bold text-[#101827]">
                                {plan.limits.savedSimulationsMax}
                              </div>
                              <div className="text-[10px] text-slate-500">Simulations</div>
                            </div>
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <div className="font-bold text-[#101827]">
                                {plan.limits.monthlyAssistantQuestionsMax}
                              </div>
                              <div className="text-[10px] text-slate-500">Questions IA</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs font-bold text-[#101827]">
                              Fonctionnalités incluses :
                            </div>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                              {plan.includedBulletsFr.map((b, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                            <div className="text-[11px] font-semibold text-slate-500">
                              Limites de la formule :
                            </div>
                            <ul className="space-y-1 text-[11px] text-slate-500 list-disc pl-4">
                              {plan.limitationsBulletsFr.map((l, i) => (
                                <li key={i}>{l}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="pt-5 mt-5 border-t border-slate-200">
                          <button
                            type="button"
                            disabled={isCurrent || isLoadingServer}
                            onClick={() => handleSwitchPlanSimulation(planKey)}
                            className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors ${
                              isCurrent
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-[#10B981] text-white hover:bg-[#059669] shadow-xs'
                            }`}
                          >
                            {isCurrent
                              ? 'Formule actuellement activée'
                              : `Tester les droits de la ${plan.nameFr}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Encadré d'architecture : Abstraction de paiement & interdiction de stockage des cartes */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#101827]">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span>
                      Architecture d’abstraction de paiement (Sans stockage de coordonnées bancaires)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    La couche serveur <code className="font-mono bg-slate-100 px-1 rounded">PaymentProviderAbstraction</code> prépare
                    la future délégation du paiement à un prestataire certifié PCI-DSS externe.
                    Conformément aux règles de sécurité de FISCALIQ, aucune donnée de carte bancaire
                    (numéro PAN, cryptogramme CVV, date d’expiration) n’est jamais demandée, traitée
                    ni enregistrée dans la base de données.
                  </p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700 shrink-0">
                  Politique : NEVER_STORE_CARD_DETAILS
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            ONGLET 3 : SIMULATIONS SAUVEGARDÉES, EXPORT CSV & SCHÉMA RLS STORAGE
           ===================================================================== */}
        {activeTab === 'SAVED_SIMULATIONS_AND_RLS' && (
          <div className="space-y-6">
            <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#101827]">
                    Mes simulations fiscales sauvegardées ({savedPersonalSimulations.length} /{' '}
                    {activePlanConfig.limits.savedSimulationsMax})
                  </h3>
                  <p className="text-xs text-slate-600">
                    Retrouvez toutes les simulations d’impôt, de frais réels et de fiche de paie
                    réalisées dans votre espace.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                    Exporter mes simulations (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={restoreDefaultPersonalSimulations}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurer les exemples
                  </button>
                </div>
              </div>

              {exportStatus && (
                <div className="mb-4 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {exportStatus}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3.5">Intitulé</th>
                      <th className="py-2.5 px-3.5">Hypothèses</th>
                      <th className="py-2.5 px-3.5">Résultat</th>
                      <th className="py-2.5 px-3.5">Référence</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {savedPersonalSimulations.map((sim) => (
                      <tr key={sim.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3.5 font-semibold text-[#101827]">
                          {sim.title}
                          <div className="text-[10px] font-mono text-slate-400">
                            {sim.createdAt}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600">{sim.inputsSummary}</td>
                        <td className="py-3 px-3.5 font-mono font-bold text-emerald-700">
                          {sim.mainResultLabel} :{' '}
                          {sim.mainResultAmountEur.toLocaleString('fr-FR')} €
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-500">
                          {sim.statutoryRef}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => deletePersonalSimulation(sim.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-rose-700 hover:bg-rose-50"
                            title="Supprimer cette simulation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Schéma SQL Supabase Storage Privé & Abonnements RLS */}
            <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-[#101827]">
                  Schéma SQL Supabase Storage Privé (<code className="font-mono">fiscaliq-personal-reports</code>) &
                  Row-Level Security des Abonnements
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Garantit que les fichiers PDF stockés dans le compartiment privé et les métadonnées
                de rapports ne sont accessibles qu’à l’utilisateur authentifié propriétaire du
                dossier (<code className="font-mono">auth.uid() = user_id</code>) :
              </p>
              <pre className="bg-[#F8FAFC] text-slate-800 border border-[#E8EDF2] p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed max-h-[380px]">
                {SUPABASE_REPORTS_AND_SUBSCRIPTIONS_RLS_SCHEMA}
              </pre>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
