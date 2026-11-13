'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { ExpandableDetail } from '@/components/ui/design-system';
import { getVerifiedDeclarationCalendar } from '@/lib/calculations/declaration-companion-engine';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  FileText,
} from 'lucide-react';

export default function PersonalCalendarPage() {
  const {
    activeHousehold,
    isViewingDemo,
    personalCalendar,
    updatePersonalCalendarStatus,
  } = useFiscaliq();
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
      <div className="space-y-4">
        {/* BLOC 1 : En-tête et filtre */}
        <section className="gw-panel p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-4 h-4 text-[#326b54]" />
              <h2 className="text-sm font-bold text-[#242b27]">
                Calendrier fiscal {taxYear} ({activeHousehold.householdName.split('(')[0].trim()})
              </h2>
              {isViewingDemo && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900">
                  Profil d’exemple
                </span>
              )}
            </div>
            <p className="text-xs text-[#384238]">
              Dates clés de déclaration au printemps, remboursement d’été et solde d’automne.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Choisir le millésime du calendrier"
              value={taxYear}
              onChange={(e) => setTaxYear(Number(e.target.value) as 2026 | 2025)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/85 border border-black/15 text-[#242b27]"
            >
              <option value={2026}>Campagne 2026 (Revenus 2025)</option>
              <option value={2025}>Campagne 2025 (Revenus 2024)</option>
            </select>

            <Link href="/declaration" className="gw-button">
              <FileText size={14} />
              <span>Préparer ma déclaration 2042</span>
            </Link>
          </div>
        </section>

        {/* BLOC 2 : Liste interactive des démarches */}
        <section className="gw-panel p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-bold text-[#242b27]">
              1. Vos échéances à suivre
            </h2>
            <div className="gw-segment">
              {[
                { id: 'ALL', label: 'Toutes' },
                { id: 'a_preparer', label: 'À préparer' },
                { id: 'a_verifier', label: 'À vérifier' },
                { id: 'effectue', label: 'Effectué' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={statusFilter === tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-white/75 border border-black/10 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#dce9da] text-[#242b27]">
                      {item.periodLabel}
                    </span>
                    <span className="text-[11px] font-mono text-[#384238]">
                      {item.formOrService}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#242b27]">{item.title}</h3>
                  <p className="text-xs text-[#384238]">{item.simpleExplanation}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => updatePersonalCalendarStatus(item.id, 'a_preparer')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      item.status === 'a_preparer'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white/80 text-[#384238] border-black/15'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> À préparer
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePersonalCalendarStatus(item.id, 'a_verifier')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      item.status === 'a_verifier'
                        ? 'bg-sky-700 text-white border-sky-700'
                        : 'bg-white/80 text-[#384238] border-black/15'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" /> À vérifier
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePersonalCalendarStatus(item.id, 'effectue')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      item.status === 'effectue'
                        ? 'bg-[#326b54] text-white border-[#326b54]'
                        : 'bg-white/80 text-[#384238] border-black/15'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Effectué
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BLOC 3 : Références officielles repliées */}
        <section className="gw-panel p-5">
          <ExpandableDetail
            summary={`En savoir plus : calendrier légal vérifié de la campagne ${taxYear}`}
            officialRef="CGI Art. 1665 bis, Art. 170 et Art. 1663 C · impots.gouv.fr"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {verifiedDeadlines.map((dl) => (
                <div
                  key={dl.id}
                  className="p-3.5 rounded-xl border border-black/10 bg-white/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#326b54]">
                      {dl.periodLabel}
                    </span>
                    <span className="text-[10px] font-mono text-[#384238]">
                      {dl.statutoryOrOfficialRef}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#242b27]">{dl.title}</h3>
                  <p className="text-xs text-[#384238]">{dl.plainExplanation}</p>
                  <a
                    href={dl.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#326b54] hover:underline"
                  >
                    Source officielle <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </ExpandableDetail>
        </section>
      </div>
    </AppShell>
  );
}
