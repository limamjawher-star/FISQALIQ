'use client';

import React from 'react';
import { ExpandableDetail } from '@/components/ui/design-system';
import { PersonalTaxOnboardingState } from '@/lib/calculations/personal-tax-engine';
import { SkipForward } from 'lucide-react';

interface Step6TaxNoticeProps {
  wizardState: PersonalTaxOnboardingState;
  setWizardState: React.Dispatch<React.SetStateAction<PersonalTaxOnboardingState>>;
  onSkipStep: () => void;
}

export function Step6TaxNotice({
  wizardState,
  setWizardState,
  onSkipStep,
}: Step6TaxNoticeProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#101827]">
            Quel impôt a déjà été prélevé à la source cette année ?
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Étape facultative : indiquez le montant déjà prélevé sur vos fiches de paie.
            Sinon, cliquez sur « Passer cette étape ».
          </p>
          <ExpandableDetail summary="En savoir plus" officialRef="CGI Art. 204 A">
            <p>
              Le prélèvement à la source (PAS) est un acompte mensuel. La différence entre votre impôt annuel final et le montant déjà prélevé détermine votre solde en septembre.
            </p>
          </ExpandableDetail>
        </div>

        <button
          type="button"
          onClick={() => {
            setWizardState((prev) => ({
              ...prev,
              skipExistingTaxNoticeStep: true,
            }));
            onSkipStep();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#10B981] text-white hover:bg-[#059669] shrink-0 shadow-xs"
        >
          <SkipForward className="w-3.5 h-3.5 text-white" />
          Passer cette étape
        </button>
      </div>

      <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 max-w-md">
        <label
          htmlFor="tax-already-withheld-input"
          className="block text-xs font-bold text-[#101827] mb-1"
        >
          Impôt déjà prélevé à la source (€ / an)
        </label>
        <p className="text-[11px] text-slate-500 mb-2">
          Cumul annuel inscrit au bas de votre bulletin de paie ou sur impots.gouv.fr.
        </p>
        <input
          id="tax-already-withheld-input"
          type="number"
          min={0}
          step={100}
          value={wizardState.taxAlreadyWithheldOrPaidEur ?? ''}
          onChange={(e) =>
            setWizardState((prev) => ({
              ...prev,
              skipExistingTaxNoticeStep: false,
              taxAlreadyWithheldOrPaidEur:
                e.target.value === ''
                  ? null
                  : Math.max(0, Number(e.target.value)),
            }))
          }
          placeholder="Ex : 1 200 €"
          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded text-[#101827]"
        />
      </div>
    </div>
  );
}
