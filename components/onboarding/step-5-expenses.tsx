'use client';

import React from 'react';
import { ExpandableDetail } from '@/components/ui/design-system';
import {
  ExpenseSituationKey,
  PersonalTaxOnboardingState,
  TriStateAnswer,
} from '@/lib/calculations/personal-tax-engine';
import { SkipForward } from 'lucide-react';

interface Step5ExpensesProps {
  wizardState: PersonalTaxOnboardingState;
  updateExpense: (
    key: ExpenseSituationKey,
    patch: Partial<PersonalTaxOnboardingState['expenses'][ExpenseSituationKey]>
  ) => void;
  onSkipStep: () => void;
}

const EXPENSE_SITUATIONS_META: {
  key: ExpenseSituationKey;
  title: string;
  simpleExplanation: string;
  defaultAmountEur: number;
}[] = [
  {
    key: 'garde_enfants_moins_6_ans',
    title: 'Garde d’enfants de moins de 6 ans (crèche, assistante maternelle)',
    simpleExplanation: 'Crédit d’impôt de 50 % des sommes payées hors aides CAF (plafond 3 500 € / enfant).',
    defaultAmountEur: 2300,
  },
  {
    key: 'emploi_domicile',
    title: 'Salarié à domicile (ménage, soutien scolaire, jardinage)',
    simpleExplanation: 'Crédit d’impôt de 50 % des dépenses restées à votre charge.',
    defaultAmountEur: 2000,
  },
  {
    key: 'dons_associations',
    title: 'Dons aux associations',
    simpleExplanation: 'Réduction d’impôt de 66 % (ou 75 % pour l’aide aux personnes en difficulté).',
    defaultAmountEur: 300,
  },
  {
    key: 'frais_professionnels_reels',
    title: 'Frais professionnels réels (trajets domicile-travail, repas)',
    simpleExplanation: 'Utile uniquement si vos frais dépassent la déduction automatique de 10 %.',
    defaultAmountEur: 4800,
  },
  {
    key: 'pension_alimentaire_versee',
    title: 'Pension alimentaire versée',
    simpleExplanation: 'Déductible de votre revenu imposable si le bénéficiaire est détaché du foyer.',
    defaultAmountEur: 3600,
  },
  {
    key: 'epargne_retraite_per',
    title: 'Versements sur un Plan d’Épargne Retraite (PER)',
    simpleExplanation: 'Diminue votre revenu imposable dans la limite de votre plafond retraite.',
    defaultAmountEur: 1500,
  },
];

export function Step5Expenses({
  wizardState,
  updateExpense,
  onSkipStep,
}: Step5ExpensesProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#101827]">
            Avez-vous des dépenses ouvrant droit à un avantage fiscal ?
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sélectionnez vos dépenses de l’année pour les déduire de votre estimation.
            Si vous n’en avez aucune, passez directement cette étape.
          </p>
          <ExpandableDetail
            summary="En savoir plus"
            officialRef="CGI Art. 199 sexdecies & Art. 200"
          >
            <p>
              Un crédit d’impôt est remboursé même si votre impôt est nul, tandis qu’une réduction diminue uniquement l’impôt dû. Les dépenses marquées « À vérifier » ne sont pas déduites par défaut.
            </p>
          </ExpandableDetail>
        </div>

        <button
          type="button"
          onClick={onSkipStep}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shrink-0"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Passer cette étape
        </button>
      </div>

      <div className="space-y-3">
        {EXPENSE_SITUATIONS_META.map((exp) => {
          const entry = wizardState.expenses[exp.key];
          return (
            <div
              key={exp.key}
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
                    updateExpense(exp.key, {
                      selected: e.target.checked,
                      annualAmountEur:
                        e.target.checked && entry.annualAmountEur === 0
                          ? exp.defaultAmountEur
                          : entry.annualAmountEur,
                    })
                  }
                  className="mt-1 accent-emerald-600"
                />
                <div>
                  <div className="text-xs font-bold text-[#101827]">
                    {exp.title}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {exp.simpleExplanation}
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
                      step={100}
                      disabled={entry.amountUnknownOrSkipped}
                      value={entry.amountUnknownOrSkipped ? 0 : entry.annualAmountEur}
                      onChange={(e) =>
                        updateExpense(exp.key, {
                          annualAmountEur: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-32 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-[#101827] disabled:opacity-50"
                    />
                  </div>

                  <div className="inline-flex rounded border border-slate-200 p-0.5 bg-slate-100 shrink-0">
                    {[
                      { id: 'oui' as TriStateAnswer, label: 'Justificatif confirmé' },
                      { id: 'ne_sait_pas' as TriStateAnswer, label: 'À vérifier' },
                    ].map((cond) => (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() =>
                          updateExpense(exp.key, {
                            conditionsConfirmed: cond.id,
                          })
                        }
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                          entry.conditionsConfirmed === cond.id
                            ? 'bg-[#10B981] text-white shadow-xs'
                            : 'text-slate-600 hover:text-[#172033]'
                        }`}
                      >
                        {cond.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
