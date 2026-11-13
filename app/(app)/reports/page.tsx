'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { ExpandableDetail } from '@/components/ui/design-system';
import {
  SUBSCRIPTION_PLANS_CONFIG,
  PersonalReportType,
  PlanEntitlementConfig,
} from '@/lib/subscriptions/entitlements';
import type { StoredPersonalTaxReportMeta } from '@/lib/reports/pdf-report-service';
import {
  FileText,
  Download,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  ExternalLink,
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

export default function PersonalReportsPage() {
  const {
    activeHousehold,
    savedPersonalSimulations,
    deletePersonalSimulation,
    clearUserData,
  } = useFiscaliq();

  const [reportsList, setReportsList] = useState<ReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] =
    useState<PersonalReportType>('BILAN_FISCAL_COMPLET');
  const [selectedTaxYear, setSelectedTaxYear] = useState<2026 | 2025>(2026);
  const [activePlanConfig, setActivePlanConfig] = useState<PlanEntitlementConfig>(
    SUBSCRIPTION_PLANS_CONFIG.FREE
  );

  const [isLoadingServer, setIsLoadingServer] = useState(false);
  const [serverBanner, setServerBanner] = useState<{
    tone: 'emerald' | 'amber' | 'rose';
    message: string;
  } | null>(null);

  useEffect(() => {
    let isCancelled = false;
    fetch('/api/reports')
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
      })
      .catch(() => {
        // Keep current state on network failure
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
        },
        body: JSON.stringify({
          action: 'GENERATE_PDF_REPORT',
          household: activeHousehold,
          reportType: selectedReportType,
          taxYear: selectedTaxYear,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.allowed) {
        if (data.activePlan) setActivePlanConfig(data.activePlan);
        setServerBanner({
          tone: res.status === 429 ? 'amber' : 'rose',
          message: data.error || 'Génération du rapport PDF non disponible.',
        });
        return;
      }

      setReportsList(data.reports || []);
      if (data.createdReport?.reportId) {
        setSelectedReportId(data.createdReport.reportId);
      }
      if (data.activePlan) setActivePlanConfig(data.activePlan);
      setServerBanner({
        tone: 'emerald',
        message: 'Votre rapport PDF est prêt à être téléchargé.',
      });
    } finally {
      setIsLoadingServer(false);
    }
  };

  const handleExportUserDataJson = async () => {
    try {
      const res = await fetch('/api/security-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXPORT_PORTABILITY_PACKAGE',
          household: activeHousehold,
          savedSimulations: savedPersonalSimulations,
        }),
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-donnees-fiscaliq-${selectedTaxYear}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setServerBanner({
        tone: 'emerald',
        message: 'Vos données personnelles ont été exportées.',
      });
    } catch {
      setServerBanner({
        tone: 'rose',
        message: 'Impossible d’exporter vos données pour le moment.',
      });
    }
  };

  const handleDeleteAccountData = async () => {
    try {
      await fetch('/api/security-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_HOUSEHOLD_DATA',
        }),
      });
    } catch {
      // Proceed with local cleanup as well
    }
    clearUserData();
    setReportsList([]);
    setSelectedReportId(null);
    setServerBanner({
      tone: 'emerald',
      message: 'Vos données et vos simulations ont été supprimées.',
    });
  };

  return (
    <AppShell title="Mes rapports PDF">
      <div className="space-y-5">
        <p className="text-xs text-slate-600 -mt-2">
          Téléchargez votre bilan fiscal en PDF ou exportez vos simulations enregistrées.
        </p>

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
              <p className="text-xs font-medium">{serverBanner.message}</p>
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

        {/* BLOC 1 : Créer et télécharger mon rapport PDF */}
        <section className="gw-panel p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-[#101827]">
                1. Générer mon rapport en PDF ({activePlanConfig.nameFr})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              Estimation indicative, non contractuelle
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type de document
              </label>
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value as PersonalReportType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-[#101827] bg-white"
              >
                <option value="BILAN_FISCAL_COMPLET">
                  Bilan fiscal complet (Impôt, quotient familial et prélèvement à la source)
                </option>
                <option value="SYNTHESE_SALAIRE_ET_PAS">
                  Synthèse salaire net et prélèvement à la source
                </option>
                <option value="DOSSIER_OPTIMISATION_ET_2042">
                  Dossier d’économies d’impôt et cases 2042 (Premium)
                </option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Année fiscale
              </label>
              <select
                value={String(selectedTaxYear)}
                onChange={(e) => setSelectedTaxYear(e.target.value === '2025' ? 2025 : 2026)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-[#101827] bg-white"
              >
                <option value="2026">Barème 2026 (Revenus 2025)</option>
                <option value="2025">Barème 2025 (Revenus 2024)</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                type="button"
                onClick={handleGeneratePdfReport}
                disabled={isLoadingServer}
                className="gw-button gw-button-primary w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4 text-white" />
                {isLoadingServer ? 'Création en cours...' : 'Créer le PDF'}
              </button>
            </div>
          </div>

          {reportsList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {reportsList.map((item) => (
                <div
                  key={item.meta.reportId}
                  onClick={() => setSelectedReportId(item.meta.reportId)}
                  className={`p-3.5 rounded-lg border cursor-pointer flex items-center justify-between gap-3 ${
                    selectedReportItem?.meta.reportId === item.meta.reportId
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#101827]">{item.meta.title}</div>
                    <div className="text-[11px] text-slate-500">{item.meta.createdAtDisplayFr}</div>
                  </div>
                  <a
                    href={item.signedDownload.downloadUrl}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BLOC 2 : Aperçu synthétique du rapport sélectionné */}
        {selectedReportItem && (
          <section className="gw-panel p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-mono uppercase text-emerald-700 font-semibold">
                  APERÇU DU RAPPORT · MILLÉSIME {selectedReportItem.meta.taxYear}
                </div>
                <h2 className="text-sm font-bold text-[#101827]">
                  {selectedReportItem.meta.title}
                </h2>
              </div>
              <a
                href={selectedReportItem.signedDownload.downloadUrl}
                download
                className="gw-button gw-button-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger le PDF
              </a>
            </div>

            <p className="text-xs text-slate-600">
              {selectedReportItem.meta.limitationsDisclaimer}
            </p>

            <ExpandableDetail summary="En savoir plus : voir le contenu détaillé et les sources du rapport">
              <div className="space-y-3 pt-2">
                {selectedReportItem.meta.sections.map((sec) => (
                  <div
                    key={sec.sectionNumber}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#101827]">{sec.title}</div>
                    <p className="text-[11px] text-slate-600">{sec.plainFrenchExplanation}</p>
                  </div>
                ))}
                <div className="flex flex-wrap gap-3 pt-1">
                  {selectedReportItem.meta.officialReferences.map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      {ref.publisher} ({ref.officialReference}) <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            </ExpandableDetail>
          </section>
        )}

        {/* BLOC 3 : Simulations sauvegardées et gestion de mes données personnelles */}
        <section className="gw-panel p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#101827]">
              2. Mes simulations sauvegardées ({savedPersonalSimulations.length})
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportUserDataJson}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                Exporter mes données
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountData}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
              >
                Supprimer mon compte / mes données
              </button>
            </div>
          </div>

          {savedPersonalSimulations.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aucune simulation enregistrée pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {savedPersonalSimulations.map((sim) => (
                <div
                  key={sim.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#101827]">{sim.title}</div>
                    <div className="text-[11px] text-slate-600">
                      {sim.mainResultLabel} :{' '}
                      <strong className="font-mono">
                        {sim.mainResultAmountEur.toLocaleString('fr-FR')} €
                      </strong>{' '}
                      · {sim.inputsSummary}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePersonalSimulation(sim.id)}
                    aria-label="Supprimer cette simulation"
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
