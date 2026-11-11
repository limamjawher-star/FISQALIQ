'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  calculatePersonalIncomeTax,
  FamilyMaritalStatus,
} from '@/lib/calculations/personal-tax-engine';
import { SupportedTaxYear } from '@/lib/calculations/tax-parameters';
import {
  ArrowRight,
  BookmarkPlus,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Search,
  BookOpen,
  X,
  Info,
} from 'lucide-react';

/**
 * 1. AnimatedNumber — Smooth numerical transition when financial values change.
 * Uses requestAnimationFrame with cubic ease-out (220ms) and respects prefers-reduced-motion.
 */
export interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  testId?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  testId,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const previousValueRef = useRef<number>(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion || previousValueRef.current === value) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startValue = previousValueRef.current;
    const endValue = value;
    const durationMs = 220;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
        previousValueRef.current = endValue;
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, prefersReducedMotion]);

  const formatted = useMemo(() => {
    const rounded =
      decimals > 0
        ? Number(displayValue.toFixed(decimals))
        : Math.round(displayValue);
    return rounded.toLocaleString('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, [displayValue, decimals]);

  return (
    <span data-testid={testId} className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * 2. PageTransition — Subtle, fast page and tab entrance animation respecting prefers-reduced-motion.
 */
export function PageTransition({
  children,
  transitionKey,
  className = '',
}: {
  children: React.ReactNode;
  transitionKey?: string;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={transitionKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 3. Skeleton Loading Primitives
 */
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Chargement des données fiscales"
      className="rounded-lg border border-slate-200 bg-white p-5 space-y-3 animate-pulse"
    >
      <div className="h-3 w-28 bg-slate-200 rounded" />
      <div className="h-7 w-40 bg-slate-200 rounded" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-2.5 bg-slate-100 rounded"
            style={{ width: `${Math.max(55, 92 - idx * 14)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 4. InteractiveScenarioComparator — Side-by-side tax scenario comparator (Scénario A vs Scénario B)
 * Connected to real deterministic calculation functions and optional household state application.
 */
export interface ScenarioBaselineInput {
  label: string;
  annualDeclaredIncomeEur: number;
  maritalStatus: FamilyMaritalStatus;
  dependantsCount: number;
  perContributionAnnualEur: number;
  estimatedTaxCreditsEur: number;
  taxYear?: SupportedTaxYear;
}

export interface InteractiveScenarioComparatorProps {
  baseline: ScenarioBaselineInput;
  onApplyScenarioToProfile?: (patch: {
    annualDeclaredSalaryNetImposableEur: number;
    maritalStatus: FamilyMaritalStatus;
    dependantsCount: number;
    perContributionAnnualEur: number;
    estimatedEligibleTaxCreditsEur: number;
  }) => void;
  onSaveComparisonSimulation?: (summary: {
    title: string;
    inputsSummary: string;
    mainResultAmountEur: number;
    secondaryDetail: string;
  }) => void;
}

type ScenarioPresetKey =
  | 'CUSTOM'
  | 'NAISSANCE_ENFANT'
  | 'VERSEMENT_PER_3000'
  | 'FRAIS_REELS_6200'
  | 'MARIAGE_PACS'
  | 'HAUSSE_SALAIRE_5000';

const MARITAL_LABELS: Record<FamilyMaritalStatus, string> = {
  celibataire: 'Célibataire',
  marie_pacse: 'Marié(e) / Pacsé(e)',
  parent_isole: 'Parent isolé (Case T)',
  divorce_separe: 'Divorcé(e) / Séparé(e)',
  veuf: 'Veuf / Veuve',
};

export function InteractiveScenarioComparator(props: InteractiveScenarioComparatorProps) {
  const { baseline } = props;
  const baselineSignature = `${baseline.annualDeclaredIncomeEur}-${baseline.maritalStatus}-${baseline.dependantsCount}-${baseline.perContributionAnnualEur}-${baseline.estimatedTaxCreditsEur}`;
  return <InteractiveScenarioComparatorInner key={baselineSignature} {...props} />;
}

function InteractiveScenarioComparatorInner({
  baseline,
  onApplyScenarioToProfile,
  onSaveComparisonSimulation,
}: InteractiveScenarioComparatorProps) {
  const taxYear: SupportedTaxYear = baseline.taxYear ?? 2026;

  // Scenario B interactive state initialized with a meaningful optimization preset
  const [activePreset, setActivePreset] = useState<ScenarioPresetKey>('VERSEMENT_PER_3000');
  const [simIncome, setSimIncome] = useState<number>(baseline.annualDeclaredIncomeEur);
  const [simMarital, setSimMarital] = useState<FamilyMaritalStatus>(baseline.maritalStatus);
  const [simDependants, setSimDependants] = useState<number>(baseline.dependantsCount);
  const [simDeductionMode, setSimDeductionMode] = useState<'abattement_10' | 'frais_reels'>(
    'abattement_10'
  );
  const [simRealExpenses, setSimRealExpenses] = useState<number>(
    Math.round(baseline.annualDeclaredIncomeEur * 0.14)
  );
  const [simPer, setSimPer] = useState<number>(baseline.perContributionAnnualEur + 3000);
  const [simCredits, setSimCredits] = useState<number>(baseline.estimatedTaxCreditsEur);

  const applyPreset = (preset: ScenarioPresetKey) => {
    setActivePreset(preset);
    setSimIncome(baseline.annualDeclaredIncomeEur);
    setSimMarital(baseline.maritalStatus);
    setSimDependants(baseline.dependantsCount);
    setSimDeductionMode('abattement_10');
    setSimPer(baseline.perContributionAnnualEur);
    setSimCredits(baseline.estimatedTaxCreditsEur);

    if (preset === 'NAISSANCE_ENFANT') {
      setSimDependants(baseline.dependantsCount + 1);
      setSimCredits(baseline.estimatedTaxCreditsEur + 1200);
    } else if (preset === 'VERSEMENT_PER_3000') {
      setSimPer(baseline.perContributionAnnualEur + 3000);
    } else if (preset === 'FRAIS_REELS_6200') {
      setSimDeductionMode('frais_reels');
      setSimRealExpenses(Math.max(6200, Math.round(baseline.annualDeclaredIncomeEur * 0.15)));
    } else if (preset === 'MARIAGE_PACS') {
      setSimMarital('marie_pacse');
    } else if (preset === 'HAUSSE_SALAIRE_5000') {
      setSimIncome(baseline.annualDeclaredIncomeEur + 5000);
    }
  };

  // Deterministic Calculation A (Baseline)
  const resultA = useMemo(() => {
    return calculatePersonalIncomeTax({
      annualDeclaredIncomeEur: baseline.annualDeclaredIncomeEur,
      maritalStatus: baseline.maritalStatus,
      dependantsCount: baseline.dependantsCount,
      perDeductibleContributionEur: baseline.perContributionAnnualEur,
      estimatedTaxCreditsEur: baseline.estimatedTaxCreditsEur,
      taxYear,
    });
  }, [baseline, taxYear]);

  // Deterministic Calculation B (Simulated Scenario)
  const resultB = useMemo(() => {
    return calculatePersonalIncomeTax({
      annualDeclaredIncomeEur: simIncome,
      maritalStatus: simMarital,
      dependantsCount: simDependants,
      expenseDeductionMode: simDeductionMode,
      realExpensesAmountEur: simRealExpenses,
      perDeductibleContributionEur: simPer,
      estimatedTaxCreditsEur: simCredits,
      taxYear,
    });
  }, [
    simIncome,
    simMarital,
    simDependants,
    simDeductionMode,
    simRealExpenses,
    simPer,
    simCredits,
    taxYear,
  ]);

  const taxDeltaAnnual = resultB.finalEstimatedTaxEur - resultA.finalEstimatedTaxEur;
  const netDisponibleA = baseline.annualDeclaredIncomeEur - resultA.finalEstimatedTaxEur;
  const netDisponibleB = simIncome - resultB.finalEstimatedTaxEur;
  const monthlyDisposableDelta = Math.round((netDisponibleB - netDisponibleA) / 12);
  const pasRateDelta =
    Math.round(
      (resultB.effectiveWithholdingRatePercent - resultA.effectiveWithholdingRatePercent) * 10
    ) / 10;

  return (
    <div className="rounded-xl border border-[#E8EDF2] bg-white p-5 sm:p-6 shadow-2xs space-y-5">
      {/* Header & Quick Scenario Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8EDF2] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-mono font-semibold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#10B981]" />
            <span>COMPARATEUR DE SCÉNARIOS CÔTE À CÔTE · BARÈME {taxYear}</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#172033]">
            Comparez votre situation actuelle avec un changement de vie ou une optimisation
          </h3>
        </div>

        {/* Preset Scenario Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'VERSEMENT_PER_3000', label: '+3 000 € sur PER' },
            { id: 'FRAIS_REELS_6200', label: 'Passer aux Frais réels' },
            { id: 'NAISSANCE_ENFANT', label: '+1 enfant & garde' },
            { id: 'MARIAGE_PACS', label: 'Mariage / PACS' },
            { id: 'HAUSSE_SALAIRE_5000', label: '+5 000 € de salaire' },
          ].map((preset) => {
            const active = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id as ScenarioPresetKey)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#10B981] text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => applyPreset('CUSTOM')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
            title="Réinitialiser sur la situation actuelle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* Interactive Controls for Scenario B */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F8FAFC] border border-[#E8EDF2]">
        {/* Control 1: Revenu déclaré */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="comp-sim-income" className="font-semibold text-slate-700">
              Revenu net déclaré (B)
            </label>
            <span className="font-mono font-bold text-[#172033] tabular-nums">
              {simIncome.toLocaleString('fr-FR')} €
            </span>
          </div>
          <input
            id="comp-sim-income"
            type="range"
            min={12000}
            max={160000}
            step={1000}
            value={simIncome}
            onChange={(e) => {
              setActivePreset('CUSTOM');
              setSimIncome(Number(e.target.value));
            }}
            className="w-full accent-[#10B981] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>12 000 €</span>
            <span>Actuel : {baseline.annualDeclaredIncomeEur.toLocaleString('fr-FR')} €</span>
            <span>160 000 €</span>
          </div>
        </div>

        {/* Control 2: Situation & Enfants */}
        <div className="space-y-1.5">
          <label htmlFor="comp-sim-marital" className="block text-xs font-semibold text-slate-700">
            Statut &amp; personnes à charge (B)
          </label>
          <div className="flex items-center gap-2">
            <select
              id="comp-sim-marital"
              value={simMarital}
              onChange={(e) => {
                setActivePreset('CUSTOM');
                setSimMarital(e.target.value as FamilyMaritalStatus);
              }}
              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-[#172033]"
            >
              {Object.entries(MARITAL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <div className="inline-flex items-center rounded-md border border-slate-300 bg-white">
              <button
                type="button"
                aria-label="Retirer une personne à charge"
                onClick={() => {
                  setActivePreset('CUSTOM');
                  setSimDependants((d) => Math.max(0, d - 1));
                }}
                className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                -
              </button>
              <span className="px-2 text-xs font-mono font-bold text-[#172033] tabular-nums">
                {simDependants} enf.
              </span>
              <button
                type="button"
                aria-label="Ajouter une personne à charge"
                onClick={() => {
                  setActivePreset('CUSTOM');
                  setSimDependants((d) => Math.min(8, d + 1));
                }}
                className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                +
              </button>
            </div>
          </div>
          <p className="text-[11px] font-mono text-slate-500">
            Quotient simulé : {resultB.familyQuotientParts.toLocaleString('fr-FR')} part(s)
          </p>
        </div>

        {/* Control 3: Abattement 10% vs Frais réels */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Frais pro (B)</span>
            <div className="inline-flex rounded-md bg-slate-200/80 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActivePreset('CUSTOM');
                  setSimDeductionMode('abattement_10');
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  simDeductionMode === 'abattement_10'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                10 % auto
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePreset('CUSTOM');
                  setSimDeductionMode('frais_reels');
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  simDeductionMode === 'frais_reels'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Frais réels
              </button>
            </div>
          </div>
          {simDeductionMode === 'frais_reels' ? (
            <input
              type="number"
              min={0}
              max={40000}
              step={200}
              aria-label="Montant des frais réels"
              value={simRealExpenses}
              onChange={(e) => {
                setActivePreset('CUSTOM');
                setSimRealExpenses(Math.max(0, Number(e.target.value) || 0));
              }}
              className="w-full rounded-md border border-emerald-400 bg-white px-2.5 py-1 text-xs font-mono font-bold text-[#172033]"
            />
          ) : (
            <p className="text-xs font-mono text-slate-600 pt-1">
              Déduction 10 % : -{resultB.deductionAppliedEur.toLocaleString('fr-FR')} €
            </p>
          )}
        </div>

        {/* Control 4: Versement PER & Crédits d'impôt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="comp-sim-per" className="font-semibold text-slate-700">
              PER déductible + Crédits
            </label>
            <span className="font-mono font-bold text-emerald-700 tabular-nums">
              {(simPer + simCredits).toLocaleString('fr-FR')} €
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <span className="text-[10px] text-slate-500 block">PER (6NS)</span>
              <input
                id="comp-sim-per"
                type="number"
                min={0}
                max={30000}
                step={500}
                value={simPer}
                onChange={(e) => {
                  setActivePreset('CUSTOM');
                  setSimPer(Math.max(0, Number(e.target.value) || 0));
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-[#172033]"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Crédits (7GA/7DB)</span>
              <input
                type="number"
                min={0}
                max={15000}
                step={200}
                aria-label="Crédits d'impôt"
                value={simCredits}
                onChange={(e) => {
                  setActivePreset('CUSTOM');
                  setSimCredits(Math.max(0, Number(e.target.value) || 0));
                }}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-[#172033]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards (Scenario A vs Scenario B + Live Delta) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Column A: Situation Actuelle */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              SCÉNARIO A · SITUATION ACTUELLE
            </span>
            <h4 className="text-sm font-bold text-[#172033]">{baseline.label}</h4>
            <p className="text-xs text-slate-500 font-mono">
              {MARITAL_LABELS[baseline.maritalStatus]} · {resultA.familyQuotientParts.toLocaleString('fr-FR')} part(s)
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Revenu net imposable :</span>
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {resultA.netTaxableIncomeEur.toLocaleString('fr-FR')} €
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Taux moyen / TMI :</span>
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {resultA.effectiveWithholdingRatePercent.toFixed(1)} % · TMI {resultA.marginalTaxRatePercent} %
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/80">
              <span className="font-semibold text-slate-700">Impôt net annuel :</span>
              <span className="text-lg font-bold font-mono text-[#172033] tabular-nums">
                <AnimatedNumber value={resultA.finalEstimatedTaxEur} suffix=" €" />
              </span>
            </div>
          </div>
        </div>

        {/* Column B: Scénario Simulé */}
        <div className="lg:col-span-4 rounded-xl border border-emerald-300 bg-emerald-50/30 p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-semibold">
              SCÉNARIO B · SIMULATION INTERACTIVE
            </span>
            <h4 className="text-sm font-bold text-[#172033]">
              {simDeductionMode === 'frais_reels'
                ? `Frais réels (${simRealExpenses.toLocaleString('fr-FR')} €)`
                : simPer > baseline.perContributionAnnualEur
                ? `Avec PER (${simPer.toLocaleString('fr-FR')} €)`
                : 'Profil simulé B'}
            </h4>
            <p className="text-xs text-slate-600 font-mono">
              {MARITAL_LABELS[simMarital]} · {resultB.familyQuotientParts.toLocaleString('fr-FR')} part(s)
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-emerald-200/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Revenu net imposable :</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                <AnimatedNumber value={resultB.netTaxableIncomeEur} suffix=" €" />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Taux moyen / TMI :</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {resultB.effectiveWithholdingRatePercent.toFixed(1)} % · TMI {resultB.marginalTaxRatePercent} %
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-emerald-200/80">
              <span className="font-semibold text-emerald-950">Impôt net simulé :</span>
              <span className="text-lg font-bold font-mono text-emerald-800 tabular-nums">
                <AnimatedNumber value={resultB.finalEstimatedTaxEur} suffix=" €" />
              </span>
            </div>
          </div>
        </div>

        {/* Column C: Écart & Impact Financier Direct */}
        <div className="lg:col-span-4 rounded-xl border border-[#E8EDF2] bg-white p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              IMPACT FINANCIER NET (B VS A)
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              {taxDeltaAnnual <= 0 ? (
                <TrendingDown className="w-5 h-5 text-[#10B981] shrink-0" />
              ) : (
                <TrendingUp className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <p
                className={`text-2xl font-bold font-mono tabular-nums ${
                  taxDeltaAnnual < 0
                    ? 'text-[#10B981]'
                    : taxDeltaAnnual > 0
                    ? 'text-amber-700'
                    : 'text-[#172033]'
                }`}
              >
                <AnimatedNumber
                  value={taxDeltaAnnual}
                  prefix={taxDeltaAnnual > 0 ? '+' : ''}
                  suffix=" € / an"
                />
              </p>
            </div>
            <p className="text-xs text-slate-600">
              {taxDeltaAnnual < 0
                ? `Soit ${Math.abs(Math.round(taxDeltaAnnual / 12)).toLocaleString('fr-FR')} € d’impôt en moins chaque mois.`
                : taxDeltaAnnual > 0
                ? `Impôt supplémentaire lié à la hausse de revenu (+${(simIncome - baseline.annualDeclaredIncomeEur).toLocaleString('fr-FR')} €).`
                : 'Aucun écart d’impôt entre les deux scénarios.'}
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Écart net en poche / mois :</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  monthlyDisposableDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {monthlyDisposableDelta >= 0 ? '+' : ''}
                {monthlyDisposableDelta.toLocaleString('fr-FR')} € / mois
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Évolution taux PAS :</span>
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {pasRateDelta > 0 ? '+' : ''}
                {pasRateDelta.toFixed(1)} pt
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onApplyScenarioToProfile && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyScenarioToProfile({
                      annualDeclaredSalaryNetImposableEur: simIncome,
                      maritalStatus: simMarital,
                      dependantsCount: simDependants,
                      perContributionAnnualEur: simPer,
                      estimatedEligibleTaxCreditsEur: simCredits,
                    })
                  }
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Appliquer au foyer</span>
                </button>
              )}
              {onSaveComparisonSimulation && (
                <button
                  type="button"
                  onClick={() =>
                    onSaveComparisonSimulation({
                      title: `Comparaison A/B : ${
                        taxDeltaAnnual <= 0
                          ? `Économie de ${Math.abs(taxDeltaAnnual).toLocaleString('fr-FR')} €`
                          : `Scénario +${taxDeltaAnnual.toLocaleString('fr-FR')} €`
                      }`,
                      inputsSummary: `Scénario B : Revenu ${simIncome.toLocaleString('fr-FR')} € · ${resultB.familyQuotientParts} part(s) · PER ${simPer.toLocaleString('fr-FR')} €`,
                      mainResultAmountEur: resultB.finalEstimatedTaxEur,
                      secondaryDetail: `Écart d’impôt : ${taxDeltaAnnual > 0 ? '+' : ''}${taxDeltaAnnual.toLocaleString('fr-FR')} €/an (${pasRateDelta > 0 ? '+' : ''}${pasRateDelta.toFixed(1)} pt PAS)`,
                    })
                  }
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Sauvegarder</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 5. Interactive Tax Glossary Modal / Drawer — Explains key French tax terminology with concrete examples
 */
export interface GlossaryTermEntry {
  id: string;
  term: string;
  category: 'Quotient & Parts' | 'Calcul & Tranches' | 'Déductions & Crédits' | 'Fiche de paie';
  shortDefinition: string;
  concreteExample: string;
  officialRef: string;
  formBox: string;
}

export const FRENCH_TAX_GLOSSARY: GlossaryTermEntry[] = [
  {
    id: 'quotient-familial',
    term: 'Quotient familial (Parts fiscales)',
    category: 'Quotient & Parts',
    shortDefinition:
      'Mécanisme qui divise le revenu net imposable de votre foyer par votre nombre de parts (1 part pour un célibataire, 2 parts pour un couple marié/pacsé, +0,5 part pour chacun des 2 premiers enfants, +1 part à partir du 3e enfant) avant d’appliquer le barème progressif.',
    concreteExample:
      'Un couple avec 2 enfants (3 parts) déclarant 60 000 € de revenu imposable est taxé sur la base de 20 000 € par part, restant ainsi dans la tranche à 11 % au lieu de monter dans la tranche à 30 %.',
    officialRef: 'CGI Art. 194 & Art. 197',
    formBox: 'Page 2 de la déclaration 2042',
  },
  {
    id: 'tmi-vs-taux-moyen',
    term: 'Tranche Marginale (TMI) vs Taux Moyen',
    category: 'Calcul & Tranches',
    shortDefinition:
      'Votre TMI (0 %, 11 %, 30 %, 41 % ou 45 %) est le taux appliqué uniquement à la dernière tranche de vos revenus. Votre taux moyen réel (souvent 3 à 4 fois plus bas) est le pourcentage total d’impôt par rapport à l’ensemble de vos revenus.',
    concreteExample:
      'Pour un célibataire avec 32 000 € de revenu net imposable (1 part), la TMI atteint 30 %, mais seuls les 2 421 € au-dessus de 29 579 € sont taxés à 30 %. Le taux moyen réel n’est que de 8,4 %.',
    officialRef: 'CGI Art. 197-I-1',
    formBox: 'Avis d’imposition (Taux moyen & TMI)',
  },
  {
    id: 'decote',
    term: 'Décote fiscale (Réduction bas revenus)',
    category: 'Calcul & Tranches',
    shortDefinition:
      'Réduction automatique qui adoucit l’entrée dans l’impôt lorsque votre impôt brut est inférieur à 1 982 € (célibataire) ou 3 277 € (couple marié/pacsé) au barème 2026.',
    concreteExample:
      'Si votre impôt brut théorique est de 1 200 € (célibataire), la décote retire automatiquement 354 € (897 € - 45,25 % × 1 200 €), ramenant votre impôt à 846 €.',
    officialRef: 'CGI Art. 197-I-4',
    formBox: 'Calculée automatiquement par la DGFiP',
  },
  {
    id: 'credit-vs-reduction',
    term: 'Crédit d’impôt vs Réduction d’impôt',
    category: 'Déductions & Crédits',
    shortDefinition:
      'Une réduction d’impôt (ex. dons) diminue votre impôt jusqu’à 0 € mais l’excédent n’est jamais remboursé. Un crédit d’impôt (ex. garde d’enfant, emploi à domicile) vous est intégralement remboursé par virement si votre impôt est inférieur au crédit.',
    concreteExample:
      'Avec 0 € d’impôt et 1 200 € de dépenses de garde d’enfant en crèche, le crédit d’impôt de 50 % déclenche un virement de +600 € de la DGFiP sur votre compte bancaire.',
    officialRef: 'CGI Art. 199 sexdecies, 200 & 200 quater B',
    formBox: 'Cases 7GA, 7DB (crédits) et 7UF, 7UD (réductions)',
  },
  {
    id: 'abattement-10-frais-reels',
    term: 'Abattement forfaitaire de 10 % vs Frais réels',
    category: 'Déductions & Crédits',
    shortDefinition:
      'L’administration retire automatiquement 10 % de votre salaire imposable (plancher 509 €, plafond 14 555 € en 2026) pour vos dépenses d’emploi. Vous pouvez renoncer à ces 10 % pour déclarer vos dépenses réelles (kilomètres, repas) si elles sont supérieures.',
    concreteExample:
      'Pour 35 000 € de salaire, l’abattement automatique est de 3 500 €. Si vos trajets quotidiens représentent 5 200 € au barème kilométrique, les frais réels réduisent votre base imposable de 1 700 € supplémentaires.',
    officialRef: 'CGI Art. 83-3°',
    formBox: 'Cases 1AK / 1BK (Formulaire 2042)',
  },
  {
    id: 'net-imposable-csg',
    term: 'Salaire net imposable vs Net avant impôt',
    category: 'Fiche de paie',
    shortDefinition:
      'Votre salaire « net imposable » est toujours légèrement supérieur au « net à payer avant impôt » car une partie des cotisations sociales (2,90 % de CSG/CRDS non déductible et la part patronale de mutuelle santé) est soumise à l’impôt.',
    concreteExample:
      'Sur un salaire brut de 3 000 €/mois, votre net avant impôt est d’environ 2 340 €, tandis que votre net imposable déclaré aux impôts est d’environ 2 435 €.',
    officialRef: 'CGI Art. 154 quinquies & Art. 83',
    formBox: 'Cases 1AJ / 1BJ (préremplies)',
  },
];

export function QuickGlossaryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const filteredTerms = useMemo(() => {
    return FRENCH_TAX_GLOSSARY.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchSearch =
        search.trim() === '' ||
        item.term.toLowerCase().includes(search.toLowerCase()) ||
        item.shortDefinition.toLowerCase().includes(search.toLowerCase()) ||
        item.formBox.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lexique fiscal interactif en français clair"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.16 }}
          className="relative z-10 w-full max-w-3xl max-h-[85vh] bg-white rounded-xl border border-[#E8EDF2] shadow-xl flex flex-col overflow-hidden"
        >
          <div className="p-5 border-b border-[#E8EDF2] flex items-center justify-between gap-4 bg-[#F8FAFC]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#10B981]">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#172033]">
                  Lexique fiscal en français simple
                </h2>
                <p className="text-xs text-slate-500">
                  Chaque terme technique expliqué avec un exemple chiffré et sa case 2042
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le lexique"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b border-[#E8EDF2] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un terme (ex. décote, TMI, case 7GA, quotient...)"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-[#172033] focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {['ALL', 'Quotient & Parts', 'Calcul & Tranches', 'Déductions & Crédits', 'Fiche de paie'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-[#10B981] text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'Tous' : cat}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="p-5 overflow-y-auto space-y-3">
            {filteredTerms.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 hover:border-emerald-300 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#172033]">{item.term}</h3>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    <span>{item.formBox}</span>
                    <span>·</span>
                    <span className="text-emerald-700 font-semibold">{item.officialRef}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.shortDefinition}</p>
                <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-slate-200/80 text-xs text-slate-700">
                  <strong className="text-[#172033]">Exemple concret : </strong>
                  {item.concreteExample}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
