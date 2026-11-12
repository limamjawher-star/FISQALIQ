'use client';

import React from 'react';
import { ExpandableDetail } from '@/components/ui/design-system';
import { PersonalTaxOnboardingState } from '@/lib/calculations/personal-tax-engine';
import { SkipForward } from 'lucide-react';

interface Step3DependantsProps {
  wizardState: PersonalTaxOnboardingState;
  setWizardState: React.Dispatch<React.SetStateAction<PersonalTaxOnboardingState>>;
  onSkipStep: () => void;
}

export function Step3Dependants({
  wizardState,
  setWizardState,
  onSkipStep,
}: Step3DependantsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#101827]">
            Combien d’enfants sont à votre charge ?
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Les 2 premiers enfants ajoutent 0,5 part chacun, puis 1 part entière dès le 3e enfant.
          </p>
          <ExpandableDetail summary="En savoir plus" officialRef="CGI Art. 194">
            <p>
              En garde principale, chaque enfant compte pour +0,5 part (puis +1 part dès le 3e). En garde alternée, l’avantage est partagé par moitié (+0,25 part puis +0,5 part).
            </p>
          </ExpandableDetail>
        </div>

        <button
          type="button"
          onClick={() => {
            setWizardState((prev) => ({
              ...prev,
              hasDependants: false,
              exclusiveCustodyChildrenCount: 0,
              sharedCustodyChildrenCount: 0,
              childrenUnder6Count: 0,
              children6To17Count: 0,
              adultChildrenAttachedCount: 0,
              dependantsWithDisabilityCardCount: 0,
            }));
            onSkipStep();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shrink-0"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Passer cette étape
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
          <label
            htmlFor="exclusive-children-input"
            className="block text-xs font-bold text-[#101827] mb-1"
          >
            Enfants en garde principale
          </label>
          <p className="text-[11px] text-slate-500 mb-2">
            Enfants vivant principalement chez vous (+0,5 part puis +1 part dès le 3e).
          </p>
          <input
            id="exclusive-children-input"
            type="number"
            min={0}
            max={8}
            value={wizardState.exclusiveCustodyChildrenCount}
            onChange={(e) => {
              const count = Math.max(0, Math.min(8, Number(e.target.value) || 0));
              setWizardState((prev) => ({
                ...prev,
                hasDependants: count + prev.sharedCustodyChildrenCount > 0,
                exclusiveCustodyChildrenCount: count,
              }));
            }}
            className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827]"
          />
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
          <label
            htmlFor="shared-children-input"
            className="block text-xs font-bold text-[#101827] mb-1"
          >
            Enfants en garde alternée
          </label>
          <p className="text-[11px] text-slate-500 mb-2">
            Résidence partagée à égalité avec l’autre parent (+0,25 part puis +0,5 part).
          </p>
          <input
            id="shared-children-input"
            type="number"
            min={0}
            max={8}
            value={wizardState.sharedCustodyChildrenCount}
            onChange={(e) => {
              const count = Math.max(0, Math.min(8, Number(e.target.value) || 0));
              setWizardState((prev) => ({
                ...prev,
                hasDependants: prev.exclusiveCustodyChildrenCount + count > 0,
                sharedCustodyChildrenCount: count,
              }));
            }}
            className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-md text-[#101827]"
          />
        </div>
      </div>
    </div>
  );
}
