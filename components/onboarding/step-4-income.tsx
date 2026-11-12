'use client';

import React from 'react';
import { ExpandableDetail } from '@/components/ui/design-system';
import {
  IncomeCategoryKey,
  PersonalTaxOnboardingState,
} from '@/lib/calculations/personal-tax-engine';

interface Step4IncomeProps {
  wizardState: PersonalTaxOnboardingState;
  updateIncome: (
    key: IncomeCategoryKey,
    patch: Partial<PersonalTaxOnboardingState['incomes'][IncomeCategoryKey]>
  ) => void;
}

const INCOME_CATEGORIES_META: {
  key: IncomeCategoryKey;
  title: string;
  simpleExplanation: string;
  placeholderEur: number;
}[] = [
  {
    key: 'salaires',
    title: 'Salaires ou revenus d’emploi',
    simpleExplanation: 'Le « net imposable » annuel inscrit sur votre fiche de paie de décembre.',
    placeholderEur: 36000,
  },
  {
    key: 'pensions_retraite',
    title: 'Pensions de retraite ou d’invalidité',
    simpleExplanation: 'Total annuel net imposable versé par vos caisses de retraite.',
    placeholderEur: 24000,
  },
  {
    key: 'allocations_chomage',
    title: 'Allocations chômage ou indemnités journalières',
    simpleExplanation: 'Allocations imposables versées par France Travail ou l’Assurance Maladie.',
    placeholderEur: 14000,
  },
  {
    key: 'independant_bic_bnc',
    title: 'Activité indépendante ou micro-entrepreneur',
    simpleExplanation: 'Bénéfice net imposable annuel de votre activité.',
    placeholderEur: 18000,
  },
  {
    key: 'revenus_locatifs',
    title: 'Revenus locatifs nets',
    simpleExplanation: 'Loyers nets imposables perçus dans l’année.',
    placeholderEur: 7200,
  },
  {
    key: 'revenus_placements',
    title: 'Revenus de placements financiers',
    simpleExplanation: 'Intérêts, dividendes ou plus-values imposables.',
    placeholderEur: 1500,
  },
];

export function Step4Income({ wizardState, updateIncome }: Step4IncomeProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-[#101827]">
          Quels revenus annuels percevez-vous ?
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Cochez vos sources de revenus et indiquez le montant annuel net imposable.
          Si un montant est inconnu, cochez « Montant inconnu ».
        </p>
        <ExpandableDetail summary="En savoir plus" officialRef="CGI Art. 83-3°">
          <p>
            L’administration applique automatiquement un abattement de 10 % sur les salaires et retraites (cases 1AJ et 1AS de la déclaration 2042).
          </p>
        </ExpandableDetail>
      </div>

      <div className="space-y-3">
        {INCOME_CATEGORIES_META.map((cat) => {
          const entry = wizardState.incomes[cat.key];
          return (
            <div
              key={cat.key}
              className={`p-4 rounded-lg border transition-all ${
                entry.selected
                  ? 'border-emerald-600 bg-emerald-50/25'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entry.selected}
                  onChange={(e) =>
                    updateIncome(cat.key, {
                      selected: e.target.checked,
                      annualAmountEur:
                        e.target.checked && entry.annualAmountEur === 0
                          ? cat.placeholderEur
                          : entry.annualAmountEur,
                    })
                  }
                  className="mt-1 accent-emerald-600"
                />
                <div>
                  <div className="text-xs font-bold text-[#101827]">
                    {cat.title}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {cat.simpleExplanation}
                  </div>
                </div>
              </label>

              {entry.selected && (
                <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Montant annuel (€ / an) :
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      disabled={entry.amountUnknownOrSkipped}
                      value={entry.amountUnknownOrSkipped ? 0 : entry.annualAmountEur}
                      onChange={(e) =>
                        updateIncome(cat.key, {
                          annualAmountEur: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-36 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-[#101827] disabled:opacity-50"
                    />
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={entry.amountUnknownOrSkipped}
                      onChange={(e) =>
                        updateIncome(cat.key, {
                          amountUnknownOrSkipped: e.target.checked,
                        })
                      }
                      className="accent-emerald-600"
                    />
                    <span>Montant inconnu (passer)</span>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
