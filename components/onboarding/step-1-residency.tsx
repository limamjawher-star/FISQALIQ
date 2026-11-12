'use client';

import React from 'react';
import { ExpandableDetail } from '@/components/ui/design-system';
import {
  PersonalTaxOnboardingState,
  TaxResidencyChoice,
} from '@/lib/calculations/personal-tax-engine';
import { AlertTriangle } from 'lucide-react';

interface Step1ResidencyProps {
  wizardState: PersonalTaxOnboardingState;
  setWizardState: React.Dispatch<React.SetStateAction<PersonalTaxOnboardingState>>;
}

const RESIDENCY_OPTIONS: {
  value: TaxResidencyChoice;
  title: string;
  desc: string;
}[] = [
  {
    value: 'resident_france',
    title: 'Oui, je réside fiscalement en France',
    desc: 'Cas général : j’habite en France (métropole ou DOM) et j’y déclare mes revenus.',
  },
  {
    value: 'non_resident_revenus_france',
    title: 'Non, je réside à l’étranger avec des revenus français',
    desc: 'Vous percevez des loyers, salaires ou pensions de source française depuis l’étranger.',
  },
  {
    value: 'incertain_a_verifier',
    title: 'Je ne sais pas encore (déménagement, expatriation, frontalier)',
    desc: 'Nous noterons ce point comme « À vérifier » sans hypothèse automatique.',
  },
];

export function Step1Residency({
  wizardState,
  setWizardState,
}: Step1ResidencyProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-[#101827]">
          Habitez-vous fiscalement en France cette année ?
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Votre lieu de résidence principale détermine les règles de calcul de votre impôt.
          Choisissez l’option qui correspond à votre foyer.
        </p>
        <ExpandableDetail summary="En savoir plus" officialRef="CGI Art. 4 B">
          <p>
            Vous êtes résident fiscal en France si votre foyer y habite plus de 183 jours par an,
            si vous y exercez votre activité principale, ou si le centre de vos intérêts économiques s’y trouve.
          </p>
        </ExpandableDetail>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {RESIDENCY_OPTIONS.map((option) => {
          const isSelected = wizardState.residencyStatus === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setWizardState((prev) => ({
                  ...prev,
                  residencyStatus: option.value,
                  countryOfResidence:
                    option.value === 'resident_france' ? 'France' : 'Étranger',
                }))
              }
              className={`p-4 rounded-lg border text-left transition-all flex items-start justify-between gap-3 ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-[#101827]">
                  {option.title}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  {option.desc}
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300'
                }`}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {wizardState.residencyStatus !== 'resident_france' && (
        <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/70 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 space-y-1">
            <p className="leading-relaxed">
              Les non-résidents dépendent de règles spécifiques sur leurs revenus de source française.
              L’estimation suivante est fournie à titre indicatif selon le barème métropolitain.
            </p>
            <ExpandableDetail summary="En savoir plus" officialRef="CGI Art. 197 A">
              <p>
                Les revenus de source française des non-résidents sont soumis à un taux minimum de 20 % (jusqu’à 29 579 €) ou 30 % au-delà, sous réserve des conventions internationales.
              </p>
            </ExpandableDetail>
          </div>
        </div>
      )}
    </div>
  );
}
