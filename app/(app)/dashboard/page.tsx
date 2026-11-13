'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import {
  AnimatedNumber,
  InteractiveScenarioComparator,
} from '@/components/ui/interactive-primitives';
import {
  Wallet,
  Calculator,
  Target,
  FileText,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';

export default function DashboardPage() {
  const {
    activeHousehold,
    updateActiveHousehold,
    personalTaxSummary,
    savePersonalSimulation,
  } = useFiscaliq();

  const [showComparator, setShowComparator] = useState(false);

  const annualIncome =
    activeHousehold.annualDeclaredSalaryNetImposableEur +
    activeHousehold.additionalNetTaxableIncomeEur;
  const annualTax = personalTaxSummary.finalEstimatedTaxEur;
  const netAfterTaxAnnual = Math.max(0, annualIncome - annualTax);

  return (
    <AppShell title="Mon impôt">
      <div className="space-y-4">
        {/* BLOC 1 : Synthèse 100 % calculée depuis le profil réel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="gw-panel gw-balance gw-reveal">
            <div className="gw-panel-title">
              <span>Impôt annuel estimé (2026)</span>
              <Calculator size={17} aria-hidden="true" />
            </div>
            <strong className="gw-balance-value">
              <AnimatedNumber value={annualTax} suffix=" €" />
            </strong>
            <p className="gw-balance-meta">
              <span className="gw-positive">
                Taux {personalTaxSummary.effectiveWithholdingRatePercent.toLocaleString('fr-FR')} %
              </span>{' '}
              · {personalTaxSummary.familyQuotientParts.toLocaleString('fr-FR')} part(s)
            </p>
          </section>

          <section className="gw-panel gw-reveal flex flex-col justify-between">
            <div className="gw-panel-title">
              <span>Revenu net après impôt</span>
              <Wallet size={17} aria-hidden="true" />
            </div>
            <strong className="gw-balance-value">
              <AnimatedNumber value={netAfterTaxAnnual} suffix=" €" />
            </strong>
            <p className="text-xs text-[#384238] mt-1">
              Prélèvement mensuel : {personalTaxSummary.monthlyWithholdingTaxEur.toLocaleString('fr-FR')} € / mois
            </p>
          </section>

          <section className="gw-panel gw-reveal flex flex-col justify-between">
            <div className="gw-panel-title">
              <span>Tranche &amp; Décote</span>
              <Target size={17} aria-hidden="true" />
            </div>
            <strong className="gw-balance-value">
              {personalTaxSummary.marginalTaxRatePercent} %
            </strong>
            <p className="text-xs text-[#384238] mt-1">
              Décote appliquée : {personalTaxSummary.decoteAmountEur.toLocaleString('fr-FR')} € · Crédits : {personalTaxSummary.taxCreditsAppliedEur.toLocaleString('fr-FR')} €
            </p>
          </section>
        </div>

        {/* BLOC 2 : Décomposition transparente du calcul */}
        <section className="gw-panel gw-reveal">
          <div className="gw-panel-title">
            <h2>Détail de votre calcul (Barème 2026)</h2>
            <Link href="/onboarding" className="gw-button">
              <span>Modifier mes réponses</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
            <div className="p-3 rounded-xl bg-white/60 border border-black/10">
              <span className="text-[#384238] block">Revenu déclaré</span>
              <strong className="font-mono text-sm text-[#242b27]">
                {annualIncome.toLocaleString('fr-FR')} €
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-white/60 border border-black/10">
              <span className="text-[#384238] block">Abattement 10 % / Frais</span>
              <strong className="font-mono text-sm text-[#326b54]">
                −{personalTaxSummary.deductionAppliedEur.toLocaleString('fr-FR')} €
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-white/60 border border-black/10">
              <span className="text-[#384238] block">Revenu net imposable</span>
              <strong className="font-mono text-sm text-[#242b27]">
                {personalTaxSummary.netTaxableIncomeEur.toLocaleString('fr-FR')} €
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-white/60 border border-black/10">
              <span className="text-[#384238] block">Quotient par part</span>
              <strong className="font-mono text-sm text-[#242b27]">
                {personalTaxSummary.taxableIncomePerPartEur.toLocaleString('fr-FR')} €
              </strong>
            </div>
          </div>

          <p className="text-xs text-[#384238] mt-3">
            Estimation indicative, non contractuelle. Tous les montants ci-dessus sont calculés uniquement à partir de vos données saisies.
          </p>
        </section>

        {/* BLOC 3 : Accès rapide aux outils d'optimisation et de déclaration */}
        <section className="gw-panel gw-reveal flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/tax-optimization" className="gw-button">
              <Target size={14} />
              <span>Calculer mes économies (Frais réels, PER, Dons)</span>
            </Link>
            <Link href="/declaration" className="gw-button">
              <FileText size={14} />
              <span>Préparer mes cases 2042</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setShowComparator((prev) => !prev)}
            className="gw-text-button font-semibold"
          >
            <SlidersHorizontal size={14} />
            <span>{showComparator ? 'Masquer le comparateur' : 'Comparer deux scénarios'}</span>
          </button>
        </section>

        {showComparator && (
          <InteractiveScenarioComparator
            baseline={{
              label: activeHousehold.householdName,
              taxYear: 2026,
              annualDeclaredIncomeEur: annualIncome,
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
        )}
      </div>
    </AppShell>
  );
}
