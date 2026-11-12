'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { AnimatedNumber } from '@/components/ui/interactive-primitives';
import {
  calculatePersonalIncomeTax,
  calculateFamilyQuotientParts,
  FamilyMaritalStatus,
} from '@/lib/calculations/personal-tax-engine';
import {
  Calculator,
  CreditCard,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const { updateActiveHousehold } = useFiscaliq();

  // Interactive quick state (all numbers computed strictly from these user inputs)
  const [annualSalary, setAnnualSalary] = useState<number>(48000);
  const [maritalStatus, setMaritalStatus] = useState<FamilyMaritalStatus>('celibataire');
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [deductionMode, setDeductionMode] = useState<'abattement_10' | 'frais_reels'>('abattement_10');
  const [realExpensesAnnual, setRealExpensesAnnual] = useState<number>(6400);

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
        estimatedTaxCreditsEur: 0,
      }),
    [annualSalary, deductionMode, realExpensesAnnual, maritalStatus, childrenCount]
  );

  return (
    <>
      {/* 1. Headline + one sentence + one main button "Commencer" */}
      <div className="gw-view-heading">
        <div>
          <p className="gw-greeting">Bonjour · Barème officiel 2026</p>
          <h1>Estimez votre impôt sur le revenu 2026 en 2 minutes</h1>
          <p className="text-xs text-[#384238] mt-1">
            Calculez votre impôt et vos parts fiscales en français simple, puis découvrez vos réductions légales.
          </p>
        </div>
        <div className="gw-heading-action">
          <Link href="/onboarding" className="gw-button">
            <span>Commencer</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {/* 2. 3-step strip */}
        <section className="gw-panel gw-reveal">
          <p className="text-xs sm:text-sm font-medium text-[#242b27]">
            1. Répondez à quelques questions → 2. Voyez votre impôt estimé → 3. Découvrez comment payer moins, légalement
          </p>
        </section>

        {/* 3. Live calculator labeled "Essayez avec votre salaire", showing only: impôt estimé, taux, parts */}
        <section className="gw-panel gw-balance gw-reveal">
          <div className="gw-panel-title">
            <span>Essayez avec votre salaire</span>
            <Calculator size={17} aria-hidden="true" />
          </div>

          <strong className="gw-balance-value">
            <AnimatedNumber value={liveTaxResult.finalEstimatedTaxEur} suffix=" €" />
          </strong>

          <p className="gw-balance-meta">
            <span className="gw-positive">
              Taux {liveTaxResult.effectiveWithholdingRatePercent.toLocaleString('fr-FR')} %
            </span>{' '}
            Parts : {computedParts.toLocaleString('fr-FR')}
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

            <div className="flex flex-wrap items-center justify-between gap-2">
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
              <strong>Impôt estimé : {liveTaxResult.finalEstimatedTaxEur.toLocaleString('fr-FR')} €</strong>
              <span>
                Taux {liveTaxResult.effectiveWithholdingRatePercent.toLocaleString('fr-FR')} % ·{' '}
                {computedParts.toLocaleString('fr-FR')} {computedParts > 1 ? 'parts' : 'part'}
              </span>
            </div>
            <button
              type="button"
              title="Appliquer au tableau de bord"
              onClick={() =>
                updateActiveHousehold({
                  annualDeclaredSalaryNetImposableEur: annualSalary,
                  maritalStatus,
                  dependantsCount: childrenCount,
                  estimatedEligibleTaxCreditsEur: 0,
                })
              }
            >
              <ArrowUpRight size={20} aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* 4. Short disclaimer line */}
        <p className="text-xs text-[#384238]">
          Estimation indicative, non contractuelle. Aucun mot de passe impots.gouv.fr demandé.
        </p>
      </div>
    </>
  );
}

