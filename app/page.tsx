'use client';

import React, { useState, useMemo, useId } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/layout/public-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { AnimatedNumber } from '@/components/ui/interactive-primitives';
import {
  calculatePersonalIncomeTax,
  calculateFamilyQuotientParts,
  FamilyMaritalStatus,
} from '@/lib/calculations/personal-tax-engine';
import { PUBLIC_SUBSCRIPTION_PLANS, SUBSCRIPTION_PLANS_CONFIG } from '@/lib/subscriptions/entitlements';
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowRight,
  ArrowDownLeft,
  Check,
  Target,
  Plane,
  Sparkles,
} from 'lucide-react';

type PeriodKey = 'week' | 'month' | 'year';

export default function HomePage() {
  const chartId = useId().replace(/:/g, '');
  const { updateActiveHousehold } = useFiscaliq();

  // Interactive quick state
  const [annualSalary, setAnnualSalary] = useState<number>(48000);
  const [maritalStatus, setMaritalStatus] = useState<FamilyMaritalStatus>('celibataire');
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [deductionMode, setDeductionMode] = useState<'abattement_10' | 'frais_reels'>('abattement_10');
  const [realExpensesAnnual, setRealExpensesAnnual] = useState<number>(6400);
  const [taxCredits, setTaxCredits] = useState<number>(600);
  const [period, setPeriod] = useState<PeriodKey>('month');

  const computedParts = useMemo(
    () =>
      calculateFamilyQuotientParts({
        maritalStatus,
        dependantsCount: childrenCount,
      }).totalParts,
    [maritalStatus, childrenCount]
  );

  const liveTaxResult = useMemo(
    () =>
      calculatePersonalIncomeTax({
        taxYear: 2026,
        annualDeclaredIncomeEur: annualSalary,
        expenseDeductionMode: deductionMode,
        realExpensesAmountEur: deductionMode === 'frais_reels' ? realExpensesAnnual : 0,
        maritalStatus,
        dependantsCount: childrenCount,
        perDeductibleContributionEur: 0,
        estimatedTaxCreditsEur: taxCredits,
      }),
    [annualSalary, deductionMode, realExpensesAnnual, maritalStatus, childrenCount, taxCredits]
  );

  const netAfterTax = Math.max(0, annualSalary - liveTaxResult.finalEstimatedTaxEur);
  const monthlyIncome = Math.round(annualSalary / 12);
  const monthlyTax = liveTaxResult.monthlyWithholdingTaxEur;

  const periodPoints =
    period === 'week'
      ? [
          { label: 'Lun', income: Math.round(monthlyIncome * 0.19), expenses: Math.round(monthlyTax * 0.18) },
          { label: 'Mar', income: Math.round(monthlyIncome * 0.25), expenses: Math.round(monthlyTax * 0.21) },
          { label: 'Mer', income: Math.round(monthlyIncome * 0.21), expenses: Math.round(monthlyTax * 0.19) },
          { label: 'Jeu', income: Math.round(monthlyIncome * 0.29), expenses: Math.round(monthlyTax * 0.24) },
          { label: 'Ven', income: Math.round(monthlyIncome * 0.23), expenses: Math.round(monthlyTax * 0.2) },
          { label: 'Sam', income: Math.round(monthlyIncome * 0.14), expenses: Math.round(monthlyTax * 0.15) },
        ]
      : period === 'month'
      ? [
          { label: 'Nov 01', income: Math.round(monthlyIncome * 0.72), expenses: Math.round(monthlyTax * 0.85) },
          { label: 'Nov 06', income: Math.round(monthlyIncome * 0.82), expenses: Math.round(monthlyTax * 0.9) },
          { label: 'Nov 11', income: Math.round(monthlyIncome * 0.95), expenses: Math.round(monthlyTax * 0.96) },
          { label: 'Nov 18', income: Math.round(monthlyIncome * 1.06), expenses: Math.round(monthlyTax * 1.0) },
          { label: 'Nov 23', income: Math.round(monthlyIncome * 1.14), expenses: Math.round(monthlyTax * 1.05) },
          { label: 'Nov 30', income: Math.round(monthlyIncome * 1.22), expenses: Math.round(monthlyTax * 1.1) },
        ]
      : [
          { label: 'Jan', income: monthlyIncome, expenses: monthlyTax },
          { label: 'Mar', income: monthlyIncome, expenses: monthlyTax },
          { label: 'Mai', income: monthlyIncome, expenses: monthlyTax },
          { label: 'Juil', income: monthlyIncome + taxCredits, expenses: monthlyTax },
          { label: 'Sept', income: monthlyIncome, expenses: monthlyTax },
          { label: 'Déc', income: Math.round(monthlyIncome * 1.15), expenses: monthlyTax },
        ];

  const moneyIn =
    period === 'week'
      ? Math.round(monthlyIncome / 4)
      : period === 'month'
      ? monthlyIncome
      : annualSalary;

  const moneyOut =
    period === 'week'
      ? Math.round(monthlyTax / 4)
      : period === 'month'
      ? monthlyTax
      : liveTaxResult.finalEstimatedTaxEur;

  const chartMax = Math.max(1, ...periodPoints.flatMap((p) => [p.income, p.expenses]));
  const chartX = (index: number) =>
    periodPoints.length === 1 ? 300 : (index * 600) / (periodPoints.length - 1);
  const chartY = (val: number) => 180 - (Math.max(0, val) / chartMax) * 155;
  const linePoints = (key: 'income' | 'expenses') =>
    periodPoints.map((pt, idx) => `${chartX(idx)},${chartY(pt[key])}`).join(' ');

  return (
    <PublicShell>
      {/* Minimalist View Heading matching attached image */}
      <div className="gw-view-heading">
        <div>
          <p className="gw-greeting">Welcome back · Barème officiel 2026</p>
          <h1>Overview</h1>
        </div>
        <div className="gw-heading-action">
          <span className="gw-date">Novembre 2026</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Row 1: Available Balance + Cash Flow */}
        <div className="gw-overview-grid">
          <section className="gw-panel gw-balance gw-reveal">
            <div className="gw-panel-title">
              <span>Net disponible après impôt</span>
              <Wallet size={17} aria-hidden="true" />
            </div>

            <strong className="gw-balance-value">
              <AnimatedNumber value={netAfterTax} suffix=" €" />
            </strong>

            <p className="gw-balance-meta">
              <span className="gw-positive">
                Taux {liveTaxResult.effectiveWithholdingRatePercent.toLocaleString('fr-FR')}%
              </span>{' '}
              Impôt net : <AnimatedNumber value={liveTaxResult.finalEstimatedTaxEur} suffix=" €" />
            </p>

            {/* Compact interactive sliders inside the glass panel */}
            <div className="mt-4 pt-3 border-t border-black/10 space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#384238]">Revenu net / an</span>
                  <strong className="font-mono">{annualSalary.toLocaleString('fr-FR')} €</strong>
                </div>
                <input
                  type="range"
                  min={12000}
                  max={160000}
                  step={1000}
                  value={annualSalary}
                  onChange={(e) => setAnnualSalary(Number(e.target.value))}
                  className="w-full accent-[#326b54] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="gw-segment">
                  {(
                    [
                      { id: 'celibataire', label: 'Seul' },
                      { id: 'marie_pacse', label: 'Couple' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      aria-pressed={maritalStatus === st.id}
                      onClick={() => setMaritalStatus(st.id)}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="gw-segment">
                  {[0, 1, 2, 3].map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={childrenCount === c}
                      onClick={() => setChildrenCount(c)}
                    >
                      {c} enf.
                    </button>
                  ))}
                </div>

                <div className="gw-segment">
                  <button
                    type="button"
                    aria-pressed={deductionMode === 'abattement_10'}
                    onClick={() => setDeductionMode('abattement_10')}
                  >
                    10%
                  </button>
                  <button
                    type="button"
                    aria-pressed={deductionMode === 'frais_reels'}
                    onClick={() => setDeductionMode('frais_reels')}
                  >
                    Réels
                  </button>
                </div>
              </div>

              {deductionMode === 'frais_reels' && (
                <div>
                  <div className="flex justify-between text-[11px]">
                    <span>Frais réels</span>
                    <strong>{realExpensesAnnual.toLocaleString('fr-FR')} €</strong>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={20000}
                    step={250}
                    value={realExpensesAnnual}
                    onChange={(e) => setRealExpensesAnnual(Number(e.target.value))}
                    className="w-full accent-[#326b54] cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="gw-account">
              <span className="gw-account-icon">
                <CreditCard size={19} aria-hidden="true" />
              </span>
              <div>
                <strong>Foyer fiscal · {computedParts.toLocaleString('fr-FR')} parts</strong>
                <span>•••• TMI {liveTaxResult.marginalTaxRatePercent}%</span>
              </div>
              <button
                type="button"
                title="Appliquer au tableau de bord"
                onClick={() =>
                  updateActiveHousehold({
                    annualDeclaredSalaryNetImposableEur: annualSalary,
                    maritalStatus,
                    dependantsCount: childrenCount,
                    estimatedEligibleTaxCreditsEur: taxCredits,
                  })
                }
              >
                <ArrowUpRight size={20} aria-hidden="true" />
              </button>
            </div>
          </section>

          <section className="gw-panel gw-cashflow gw-reveal">
            <div className="gw-panel-title">
              <h2>Cash flow</h2>
              <div className="gw-segment" role="group" aria-label="Période">
                {(
                  [
                    { id: 'week', label: 'Week' },
                    { id: 'month', label: 'Month' },
                    { id: 'year', label: 'Year' },
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
                  Money in
                </span>
                <strong>
                  <AnimatedNumber value={moneyIn} suffix=" €" />
                </strong>
              </div>
              <div>
                <span>
                  <i />
                  Money out
                </span>
                <strong>
                  <AnimatedNumber value={moneyOut} suffix=" €" />
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
                  <linearGradient id={`${chartId}-area`} x1="0" x2="0" y1="0" y2="1">
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
                  fill={`url(#${chartId}-area)`}
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

        {/* Row 2: Recent Activity + Savings Goals */}
        <div className="gw-lower-grid">
          <section className="gw-panel gw-reveal">
            <div className="gw-panel-title">
              <h2>Recent activity</h2>
              <Link href="/dashboard" className="gw-text-button">
                View all
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <div className="gw-transactions">
              <div className="gw-transaction">
                <span className="gw-transaction-icon is-income">
                  <ArrowDownLeft size={17} strokeWidth={1.7} />
                </span>
                <div className="gw-transaction-name">
                  <strong>Salaire mensuel net</strong>
                  <span>Revenu · Aujourd&apos;hui</span>
                </div>
                <span className="gw-transaction-status">
                  <Check size={12} />
                  Completed
                </span>
                <strong className="gw-positive">
                  +{monthlyIncome.toLocaleString('fr-FR')} €
                </strong>
              </div>

              <div className="gw-transaction">
                <span className="gw-transaction-icon">
                  <ArrowUpRight size={17} strokeWidth={1.7} />
                </span>
                <div className="gw-transaction-name">
                  <strong>Prélèvement à la source (PAS)</strong>
                  <span>Impôt · Mensuel</span>
                </div>
                <span className="gw-transaction-status">
                  <Check size={12} />
                  Completed
                </span>
                <strong>−{monthlyTax.toLocaleString('fr-FR')} €</strong>
              </div>

              <div className="gw-transaction">
                <span className="gw-transaction-icon is-income">
                  <Sparkles size={17} strokeWidth={1.7} />
                </span>
                <div className="gw-transaction-name">
                  <strong>Abattement / Frais déduits</strong>
                  <span>Déduction · 2042</span>
                </div>
                <span className="gw-transaction-status">
                  <Check size={12} />
                  Completed
                </span>
                <strong className="gw-positive">
                  +{liveTaxResult.deductionAppliedEur.toLocaleString('fr-FR')} €
                </strong>
              </div>
            </div>
          </section>

          <section className="gw-panel gw-reveal">
            <div className="gw-panel-title">
              <h2>Savings goals</h2>
              <span className="gw-small-label">2 active</span>
            </div>

            <div className="gw-goals">
              <div className="gw-goal">
                <div className="gw-goal-top">
                  <span className="gw-goal-icon">
                    <Target size={18} />
                  </span>
                  <strong>Déduction Frais / PER</strong>
                  <span>70%</span>
                </div>
                <div className="gw-goal-track">
                  <i
                    style={{
                      width: '70%',
                      background: '#326b54',
                    }}
                  />
                </div>
                <p>
                  <strong>{liveTaxResult.deductionAppliedEur.toLocaleString('fr-FR')} €</strong>
                  <span>sur 14 426 €</span>
                </p>
              </div>

              <div className="gw-goal">
                <div className="gw-goal-top">
                  <span className="gw-goal-icon">
                    <Plane size={18} />
                  </span>
                  <strong>Crédits d&apos;impôt 2042</strong>
                  <button
                    type="button"
                    onClick={() => setTaxCredits((prev) => (prev === 600 ? 1500 : 600))}
                    className="text-[11px] font-semibold underline"
                  >
                    + Tester 1 500 €
                  </button>
                </div>
                <div className="gw-goal-track">
                  <i
                    style={{
                      width: `${Math.min(100, Math.round((taxCredits / 2500) * 100))}%`,
                      background: '#ab8b68',
                    }}
                  />
                </div>
                <p>
                  <strong>{taxCredits.toLocaleString('fr-FR')} €</strong>
                  <span>sur 2 500 €</span>
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Row 3: Simple 2-Option Subscription Model (Gratuit 0 € & Premium 5 €) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {PUBLIC_SUBSCRIPTION_PLANS.map((planKey) => {
            const plan = SUBSCRIPTION_PLANS_CONFIG[planKey];
            const isPremium = planKey === 'PREMIUM';
            return (
              <section key={planKey} className="gw-panel gw-reveal flex flex-col justify-between">
                <div>
                  <div className="gw-panel-title">
                    <h2>{plan.nameFr}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/70 text-[#242b27]">
                      {plan.pricingDisplayLabelFr}
                    </span>
                  </div>
                  <strong className="text-3xl font-semibold tracking-tight block mb-2">
                    {isPremium ? '5 €' : '0 €'}
                    <span className="text-xs font-normal text-[#384238]"> / mois</span>
                  </strong>
                  <p className="text-xs text-[#384238] mb-3">{plan.taglineFr}</p>
                  <ul className="space-y-1.5 text-xs">
                    {plan.includedBulletsFr.map((b, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check size={14} className="text-[#326b54] shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
                  <span className="text-[11px] text-[#384238]">{plan.pricingStatusNoteFr}</span>
                  <Link href="/pricing" className="gw-button">
                    <span>{isPremium ? 'Choisir Premium 5 €' : 'Rester en Gratuit'}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </PublicShell>
  );
}
