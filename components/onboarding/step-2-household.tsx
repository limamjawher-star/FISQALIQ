'use client';

import React from 'react';
import { ExpandableDetail } from '@/components/ui/design-system';
import {
  OnboardingHouseholdStatus,
  PersonalTaxOnboardingState,
  TriStateAnswer,
} from '@/lib/calculations/personal-tax-engine';

interface Step2HouseholdProps {
  wizardState: PersonalTaxOnboardingState;
  setWizardState: React.Dispatch<React.SetStateAction<PersonalTaxOnboardingState>>;
}

const HOUSEHOLD_STATUS_OPTIONS: {
  value: OnboardingHouseholdStatus;
  label: string;
  sub: string;
}[] = [
  {
    value: 'celibataire',
    label: 'Célibataire',
    sub: '1 part de base · Déclaration individuelle',
  },
  {
    value: 'marie',
    label: 'Marié(e)',
    sub: '2 parts de base · Déclaration commune',
  },
  {
    value: 'pacse',
    label: 'Pacsé(e)',
    sub: '2 parts de base · Déclaration commune',
  },
  {
    value: 'divorce',
    label: 'Divorcé(e)',
    sub: '1 part de base · Déclaration individuelle',
  },
  {
    value: 'separe',
    label: 'Séparé(e)',
    sub: '1 part de base · Déclaration individuelle',
  },
  {
    value: 'veuf',
    label: 'Veuf / Veuve',
    sub: '1 part (ou 2 parts si enfant à charge)',
  },
];

export function Step2Household({
  wizardState,
  setWizardState,
}: Step2HouseholdProps) {
  const showSingleParentQuestion =
    wizardState.householdStatus === 'celibataire' ||
    wizardState.householdStatus === 'divorce' ||
    wizardState.householdStatus === 'separe';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-[#101827]">
          Quelle est votre situation familiale ?
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Un adulte seul débute avec 1 part fiscale. Un couple marié ou pacsé débute avec 2 parts.
        </p>
        <ExpandableDetail summary="En savoir plus" officialRef="CGI Art. 194">
          <p>
            Le quotient familial adapte le barème de l’impôt à la composition du foyer. Les personnes vivant seules avec un enfant à charge bénéficient d’une demi-part supplémentaire (case T).
          </p>
        </ExpandableDetail>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HOUSEHOLD_STATUS_OPTIONS.map((item) => {
          const isSelected = wizardState.householdStatus === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setWizardState((prev) => ({
                  ...prev,
                  householdStatus: item.value,
                }))
              }
              className={`p-4 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold text-[#101827]">
                {item.label}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {item.sub}
              </div>
            </button>
          );
        })}
      </div>

      {showSingleParentQuestion && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="text-xs font-bold text-[#101827]">
            Viviez-vous seul(e) au 1er janvier ?
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Utile uniquement si vous avez un enfant à charge pour calculer la demi-part parent isolé (+0,5 part).
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'oui' as TriStateAnswer, label: 'Oui, je vis seul(e)' },
              { id: 'non' as TriStateAnswer, label: 'Non, en concubinage' },
              { id: 'ne_sait_pas' as TriStateAnswer, label: 'Je ne sais pas' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setWizardState((prev) => ({
                    ...prev,
                    livesAloneOnJan1: opt.id,
                  }))
                }
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                  wizardState.livesAloneOnJan1 === opt.id
                    ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
