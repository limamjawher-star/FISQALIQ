'use client';

import React from 'react';
import { ExpandableDetail } from '@/components/ui/design-system';
import { evaluatePersonalOnboardingProfile } from '@/lib/calculations/personal-tax-engine';
import { ArrowRight } from 'lucide-react';

interface Step7SummaryProps {
  evaluation: ReturnType<typeof evaluatePersonalOnboardingProfile>;
  onSaveAndGoToOptimization: () => void;
}

export function Step7Summary({
  evaluation,
  onSaveAndGoToOptimization,
}: Step7SummaryProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-[#101827]">
          Votre estimation d’impôt 2026
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Voici le résultat calculé à partir de vos réponses selon le barème progressif 2026.
        </p>
        <ExpandableDetail summary="En savoir plus" officialRef="CGI Art. 197 (Barème 2026)">
          <ul className="list-disc pl-4 space-y-1">
            {evaluation.quotient.explanationLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
            {evaluation.incompleteItemsToVerify.map((item, idx) => (
              <li key={`verify-${idx}`}>{item}</li>
            ))}
          </ul>
        </ExpandableDetail>
      </div>

      {/* 3 numbers only: impôt estimé, taux, parts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E8EDF2] shadow-2xs">
          <div className="text-[11px] text-slate-500">Impôt estimé</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {evaluation.taxEstimate.finalEstimatedTaxEur.toLocaleString('fr-FR')} €
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-500">Taux</div>
          <div className="text-2xl font-bold font-mono text-[#101827] mt-1">
            {evaluation.taxEstimate.effectiveWithholdingRatePercent.toLocaleString('fr-FR')} %
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-500">Parts</div>
          <div className="text-2xl font-bold font-mono text-[#101827] mt-1">
            {evaluation.quotient.totalParts.toLocaleString('fr-FR')}
          </div>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onSaveAndGoToOptimization}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-[#10B981] text-white hover:bg-[#059669] transition-colors shadow-xs"
        >
          Voir comment économiser
          <ArrowRight className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
