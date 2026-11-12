'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { DataOriginBadge, ExpandableDetail } from '@/components/ui/design-system';
import {
  getVerifiedDeclarationCalendar,
  OFFICIAL_DECLARATION_RESOURCES,
} from '@/lib/calculations/declaration-companion-engine';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export default function PersonalCalendarPage() {
  const { activeHousehold, personalCalendar, updatePersonalCalendarStatus } =
    useFiscaliq();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [taxYear, setTaxYear] = useState<2026 | 2025>(2026);

  const verifiedDeadlines = useMemo(
    () => getVerifiedDeclarationCalendar(taxYear),
    [taxYear]
  );

  const filteredItems = useMemo(() => {
    if (statusFilter === 'ALL') return personalCalendar;
    return personalCalendar.filter((item) => item.status === statusFilter);
  }, [personalCalendar, statusFilter]);

  return (
    <AppShell title="Mes échéances">
      <div className="space-y-6">
        <p className="text-xs text-slate-600 -mt-2">
          Retrouvez les dates clés de votre déclaration et de vos paiements d’impôt.
        </p>

        {/* Bandeau de contrôle et rappel méthodologique (aucune date inventée) */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                SUIVI DES ÉCHÉANCES ANNUELLES ({activeHousehold.householdName.split('(')[0].trim()})
              </span>
              <DataOriginBadge classification="DONNEE_FICTIVE_DEMO" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ce calendrier regroupe vos dates fixes et vos périodes de déclaration au printemps. Aucune date non publiée n’est inventée.
            </p>
            <ExpandableDetail
              summary="Détails"
              officialRef="CGI Art. 1665 bis, Art. 170 et Art. 1663 C · Calendrier DGFiP"
            >
              <p>
                Les échéances distinguent les dates légales fixes et les périodes de déclaration en ligne (Zones 1, 2 et 3) publiées chaque printemps par l’administration fiscale.
              </p>
            </ExpandableDetail>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Choisir le millésime du calendrier"
              value={taxYear}
              onChange={(e) => setTaxYear(Number(e.target.value) as 2026 | 2025)}
              className="px-3 py-1.5 rounded-md text-xs font-bold bg-slate-50 border border-slate-300 text-[#101827]"
            >
              <option value={2026}>Campagne 2026 (Revenus 2025)</option>
              <option value={2025}>Campagne 2025 (Revenus 2024)</option>
            </select>

            <Link
              href="/declaration"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-white" />
              Ouvrir le compagnon Ma déclaration
            </Link>
          </div>
        </section>

        {/* Filtres d'état du suivi personnel */}
        <section className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-bold text-[#172033]">
            1. Suivi interactif de vos démarches personnelles
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'Toutes les étapes' },
              { id: 'a_preparer', label: 'À préparer' },
              { id: 'a_verifier', label: 'À vérifier' },
              { id: 'effectue', label: 'Effectué' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : 'bg-[#F8FAFC] text-slate-600 hover:text-[#172033] hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#E8EDF2] rounded-xl p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {item.periodLabel}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Service / Formulaire : {item.formOrService}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#101827]">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.simpleExplanation}
                </p>
                <div className="pt-1">
                  <a
                    href={item.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    Source officielle impots.gouv.fr{' '}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    updatePersonalCalendarStatus(item.id, 'a_preparer')
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
                    item.status === 'a_preparer'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> À préparer
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updatePersonalCalendarStatus(item.id, 'a_verifier')
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
                    item.status === 'a_verifier'
                      ? 'bg-sky-700 text-white border-sky-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" /> À vérifier
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updatePersonalCalendarStatus(item.id, 'effectue')
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
                    item.status === 'effectue'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Effectué
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Référentiel légal détaillé du millésime sélectionné */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                RÉFÉRENTIEL RÉGLEMENTAIRE VÉRIFIÉ
              </span>
              <h2 className="text-base font-bold text-[#101827]">
                2. Détail légal des échéances — Campagne {taxYear} (Revenus {taxYear - 1})
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifiedDeadlines.map((dl) => (
              <div
                key={dl.id}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {dl.periodLabel}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    {dl.statutoryOrOfficialRef}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#101827]">{dl.title}</h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {dl.plainExplanation}
                </p>
                <div className="text-[11px] text-slate-600">
                  <strong>Public concerné :</strong> {dl.whoIsConcerned}
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-500">
                    Vérifié le {dl.verificationDate}
                  </span>
                  <a
                    href={dl.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                  >
                    Documentation officielle <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Rappel : FISCALIQ est une plateforme indépendante d’aide à la préparation et ne transmet pas votre déclaration à la DGFiP.
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {OFFICIAL_DECLARATION_RESOURCES.slice(0, 2).map((res) => (
                <a
                  key={res.id}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                >
                  {res.authority} <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
