'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import {
  AnimatedNumber,
  InteractiveScenarioComparator,
} from '@/components/ui/interactive-primitives';
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowRight,
  ArrowDownLeft,
  Check,
  Target,
  Plane,
  SlidersHorizontal,
  Download,
} from 'lucide-react';

type PeriodKey = 'week' | 'month' | 'year';

export default function DashboardPage() {
  const chartGradientId = useId().replace(/:/g, '');
  const {
    activeHousehold,
    updateActiveHousehold,
    personalTaxSummary,
    personalOpportunities,
    togglePersonalOpportunityStatus,
    savePersonalSimulation,
    pushToast,
  } = useFiscaliq();

  const [period, setPeriod] = useState<PeriodKey>('month');
  const [showSimulator, setShowSimulator] = useState(false);

  const annualIncome =
    activeHousehold.annualDeclaredSalaryNetImposableEur +
    activeHousehold.additionalNetTaxableIncomeEur;
  const annualTax = personalTaxSummary.finalEstimatedTaxEur;
  const netAfterTaxAnnual = Math.max(0, annualIncome - annualTax);
  const monthlyIncome = Math.round(annualIncome / 12);
  const monthlyTax = personalTaxSummary.monthlyWithholdingTaxEur;

  const periodPoints =
    period === 'week'
      ? [
          { label: 'Lun', income: Math.round(monthlyIncome * 0.18), expenses: Math.round(monthlyTax * 0.18) },
          { label: 'Mar', income: Math.round(monthlyIncome * 0.24), expenses: Math.round(monthlyTax * 0.22) },
          { label: 'Mer', income: Math.round(monthlyIncome * 0.2), expenses: Math.round(monthlyTax * 0.19) },
          { label: 'Jeu', income: Math.round(monthlyIncome * 0.28), expenses: Math.round(monthlyTax * 0.25) },
          { label: 'Ven', income: Math.round(monthlyIncome * 0.22), expenses: Math.round(monthlyTax * 0.2) },
          { label: 'Sam', income: Math.round(monthlyIncome * 0.12), expenses: Math.round(monthlyTax * 0.14) },
        ]
      : period === 'month'
      ? [
          { label: 'Nov 01', income: Math.round(monthlyIncome * 0.72), expenses: Math.round(monthlyTax * 0.85) },
          { label: 'Nov 06', income: Math.round(monthlyIncome * 0.81), expenses: Math.round(monthlyTax * 0.9) },
          { label: 'Nov 11', income: Math.round(monthlyIncome * 0.94), expenses: Math.round(monthlyTax * 0.95) },
          { label: 'Nov 18', income: Math.round(monthlyIncome * 1.05), expenses: Math.round(monthlyTax * 1.0) },
          { label: 'Nov 23', income: Math.round(monthlyIncome * 1.12), expenses: Math.round(monthlyTax * 1.04) },
          { label: 'Nov 30', income: Math.round(monthlyIncome * 1.18), expenses: Math.round(monthlyTax * 1.08) },
        ]
      : [
          { label: 'Jan', income: monthlyIncome, expenses: monthlyTax },
          { label: 'Mar', income: monthlyIncome, expenses: monthlyTax },
          { label: 'Mai', income: monthlyIncome, expenses: monthlyTax },
          {
            label: 'Juil',
            income:
              monthlyIncome +
              Math.round(activeHousehold.estimatedEligibleTaxCreditsEur * 0.4),
            expenses: monthlyTax,
          },
          { label: 'Sept', income: monthlyIncome, expenses: monthlyTax },
          { label: 'Déc', income: Math.round(monthlyIncome * 1.15), expenses: monthlyTax },
        ];

  const moneyInTotal =
    period === 'week'
      ? Math.round(monthlyIncome / 4)
      : period === 'month'
      ? monthlyIncome
      : annualIncome;

  const moneyOutTotal =
    period === 'week'
      ? Math.round(monthlyTax / 4)
      : period === 'month'
      ? monthlyTax
      : annualTax;

  const chartMax = Math.max(
    1,
    ...periodPoints.flatMap((p) => [p.income, p.expenses])
  );
  const chartX = (index: number) =>
    periodPoints.length === 1 ? 300 : (index * 600) / (periodPoints.length - 1);
  const chartY = (val: number) => 180 - (Math.max(0, val) / chartMax) * 155;
  const linePoints = (key: 'income' | 'expenses') =>
    periodPoints.map((pt, idx) => `${chartX(idx)},${chartY(pt[key])}`).join(' ');

  const recentItems = [
    {
      id: 'act-1',
      name: 'Salaire net mensuel',
      category: 'Revenu · Ce mois',
      amount: monthlyIncome,
      status: 'Effectué' as const,
    },
    {
      id: 'act-2',
      name: `Prélèvement à la source (${personalTaxSummary.effectiveWithholdingRatePercent.toLocaleString('fr-FR')} %)`,
      category: 'Impôt · Ce mois',
      amount: -monthlyTax,
      status: 'Effectué' as const,
    },
    {
      id: 'act-3',
      name: 'Crédits & réductions d’impôt',
      category: 'Avantage fiscal · 2026',
      amount: activeHousehold.estimatedEligibleTaxCreditsEur,
      status: 'Effectué' as const,
    },
    {
      id: 'act-4',
      name: 'Versement PER déductible',
      category: 'Épargne retraite · 2026',
      amount: -activeHousehold.perContributionAnnualEur,
      status: 'À venir' as const,
    },
  ];

  const topOpportunities = personalOpportunities.slice(0, 2);

  const handleExportCsv = () => {
    const csv = [
      'Operation,Categorie,Montant_EUR,Statut',
      ...recentItems.map((i) => `"${i.name}","${i.category}",${i.amount},${i.status}`),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiscaliq-${activeHousehold.id}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    pushToast({
      title: 'Export CSV prêt',
      message: 'Vos chiffres clés ont été téléchargés.',
      variant: 'success',
    });
  };

  return (
    <AppShell title="Mon impôt">
      <div className="space-y-4">
        {/* Top Row: Available Balance + Cash Flow (Exact GlassWorkspace Layout) */}
        <div className="gw-overview-grid">
          <section className="gw-panel gw-balance gw-reveal">
            <div className="gw-panel-title">
              <span>Net disponible après impôt</span>
              <Wallet size={17} aria-hidden="true" />
            </div>

            <strong className="gw-balance-value">
              <AnimatedNumber value={netAfterTaxAnnual} suffix=" €" />
            </strong>

            <p className="gw-balance-meta">
              <span className="gw-positive">
                Taux PAS {personalTaxSummary.effectiveWithholdingRatePercent.toLocaleString('fr-FR')}%
              </span>{' '}
              Impôt annuel : {annualTax.toLocaleString('fr-FR')} €
            </p>

            <div className="gw-account">
              <span className="gw-account-icon">
                <CreditCard size={19} aria-hidden="true" />
              </span>
              <div>
                <strong>{activeHousehold.householdName.split('(')[0].trim()}</strong>
                <span>
                  •••• {personalTaxSummary.familyQuotientParts.toLocaleString('fr-FR')} parts · Tranche{' '}
                  {personalTaxSummary.marginalTaxRatePercent}%
                </span>
              </div>
              <Link href="/onboarding" aria-label="Modifier mon profil">
                <ArrowUpRight size={20} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className="gw-panel gw-cashflow gw-reveal">
            <div className="gw-panel-title">
              <h2>Revenus et impôts</h2>
              <div className="gw-segment" role="group" aria-label="Période">
                {(
                  [
                    { id: 'week', label: 'Semaine' },
                    { id: 'month', label: 'Mois' },
                    { id: 'year', label: 'Année' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={period === item.id}
                    onClick={() => setPeriod(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="gw-chart-summary">
              <div>
                <span>
                  <i />
                  Entrées
                </span>
                <strong>
                  <AnimatedNumber value={moneyInTotal} suffix=" €" />
                </strong>
              </div>
              <div>
                <span>
                  <i />
                  Sorties (Impôt)
                </span>
                <strong>
                  <AnimatedNumber value={moneyOutTotal} suffix=" €" />
                </strong>
              </div>
            </div>

            <div className="gw-chart-wrap">
              <div className="gw-chart-labels">
                <span>{chartMax.toLocaleString('fr-FR')} €</span>
                <span>{Math.round(chartMax / 2).toLocaleString('fr-FR')} €</span>
                <span>0 €</span>
              </div>
              <svg
                viewBox="0 0 600 185"
                role="img"
                aria-label="Flux revenus et impôts"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`${chartGradientId}-area`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--gw-accent)" stopOpacity=".24" />
                    <stop offset="1" stopColor="var(--gw-accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[20, 100, 180].map((y) => (
                  <path
                    key={y}
                    d={`M0 ${y} H600`}
                    stroke="currentColor"
                    opacity=".11"
                    strokeDasharray="3 5"
                  />
                ))}
                <path
                  d={`M${chartX(0)} 185 ${periodPoints
                    .map((pt, idx) => `L${chartX(idx)} ${chartY(pt.income)}`)
                    .join(' ')} L${chartX(periodPoints.length - 1)} 185 Z`}
                  fill={`url(#${chartGradientId}-area)`}
                />
                <polyline
                  points={linePoints('income')}
                  fill="none"
                  stroke="var(--gw-accent)"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <polyline
                  points={linePoints('expenses')}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity=".45"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              <div className="gw-chart-months">
                {periodPoints.map((pt, index) => (
                  <span
                    key={pt.label}
                    style={{
                      left: `${chartX(index) / 6}%`,
                      transform:
                        index === 0
                          ? 'none'
                          : index === periodPoints.length - 1
                          ? 'translateX(-100%)'
                          : 'translateX(-50%)',
                    }}
                  >
                    {pt.label}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Lower Row: Recent Activity + Savings Goals */}
        <div className="gw-lower-grid">
          <section className="gw-panel gw-reveal">
            <div className="gw-panel-title">
              <h2>Opérations récentes</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="gw-text-button"
                >
                  <Download size={13} aria-hidden="true" />
                  CSV
                </button>
                <Link href="/payroll" className="gw-text-button">
                  Tout voir
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="gw-transactions">
              {recentItems.map((item) => (
                <div className="gw-transaction" key={item.id}>
                  <span
                    className={`gw-transaction-icon ${
                      item.amount > 0 ? 'is-income' : ''
                    }`}
                  >
                    {item.amount > 0 ? (
                      <ArrowDownLeft size={17} strokeWidth={1.7} />
                    ) : (
                      <ArrowUpRight size={17} strokeWidth={1.7} />
                    )}
                  </span>
                  <div className="gw-transaction-name">
                    <strong>{item.name}</strong>
                    <span>{item.category}</span>
                  </div>
                  <span
                    className={`gw-transaction-status ${
                      item.status === 'À venir' ? 'is-pending' : ''
                    }`}
                  >
                    {item.status === 'Effectué' && <Check size={12} />}
                    {item.status}
                  </span>
                  <strong className={item.amount > 0 ? 'gw-positive' : ''}>
                    {item.amount > 0 ? '+' : '−'}
                    {Math.abs(item.amount).toLocaleString('fr-FR')} €
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section className="gw-panel gw-reveal">
            <div className="gw-panel-title">
              <h2>Objectifs d’économies</h2>
              <Link href="/tax-optimization" className="gw-text-button">
                {personalOpportunities.length} actifs
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="gw-goals">
              {topOpportunities.map((opp, i) => {
                const isApplied = opp.status === 'deja_applique';
                const pct = isApplied ? 100 : 68;
                return (
                  <div className="gw-goal" key={opp.id}>
                    <div className="gw-goal-top">
                      <span className="gw-goal-icon">
                        {i % 2 ? <Plane size={17} /> : <Target size={17} />}
                      </span>
                      <strong>{opp.title}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          togglePersonalOpportunityStatus(
                            opp.id,
                            isApplied ? 'eligible_a_verifier' : 'deja_applique'
                          )
                        }
                        className="text-[11px] font-semibold underline hover:opacity-80"
                      >
                        {isApplied ? 'Activé (100%)' : 'Activer'}
                      </button>
                    </div>
                    <div
                      className="gw-goal-track"
                      role="progressbar"
                      aria-label={opp.title}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <i
                        style={{
                          width: `${pct}%`,
                          background: i % 2 ? '#ab8b68' : '#326b54',
                        }}
                      />
                    </div>
                    <p>
                      <strong>{opp.mechanismType}</strong>
                      <span>{opp.statutoryReference}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-3 border-t border-black/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSimulator((prev) => !prev)}
                className="gw-text-button font-semibold"
              >
                <SlidersHorizontal size={14} />
                <span>{showSimulator ? 'Masquer le simulateur' : 'Simuler un scénario'}</span>
              </button>
              <Link href="/pricing" className="gw-text-button font-semibold">
                <span>Gratuit 0 € · Premium 5 €</span>
              </Link>
            </div>
          </section>
        </div>

        {/* Optional Expandable Scenario Comparator */}
        {showSimulator && (
          <div className="pt-2">
            <InteractiveScenarioComparator
              baseline={{
                label: activeHousehold.householdName,
                taxYear: 2026,
                annualDeclaredIncomeEur:
                  activeHousehold.annualDeclaredSalaryNetImposableEur +
                  activeHousehold.additionalNetTaxableIncomeEur,
                maritalStatus: activeHousehold.maritalStatus,
                dependantsCount: activeHousehold.dependantsCount,
                perContributionAnnualEur: activeHousehold.perContributionAnnualEur,
                estimatedTaxCreditsEur: activeHousehold.estimatedEligibleTaxCreditsEur,
              }}
              onApplyScenarioToProfile={(patch) => updateActiveHousehold(patch)}
              onSaveComparisonSimulation={(sim) =>
                savePersonalSimulation({
                  householdId: activeHousehold.id,
                  title: sim.title,
                  moduleType: 'IR_FOYER',
                  taxYear: 2026,
                  classification: 'ESTIMATION',
                  inputsSummary: sim.inputsSummary,
                  mainResultLabel: 'Impôt annuel estimé',
                  mainResultAmountEur: sim.mainResultAmountEur,
                  secondaryDetail: sim.secondaryDetail,
                  statutoryRef: 'CGI Art. 197',
                })
              }
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
