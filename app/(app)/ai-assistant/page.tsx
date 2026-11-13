'use client';

import React, { useState, useRef, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { ExpandableDetail } from '@/components/ui/design-system';
import {
  PERSONAL_TAX_KNOWLEDGE_BASE,
  type OfficialPersonalTaxDocument,
  type ExplainedTerm,
} from '@/lib/ai/knowledge-base';
import type { DeterministicPersonalCalculationSnapshot } from '@/lib/ai/gemini-service';
import {
  MessageSquare,
  Send,
  ExternalLink,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

const QUICK_QUESTIONS = [
  'Comment choisir entre l’abattement de 10 % et les frais réels ?',
  'Quelle est la différence entre un crédit d’impôt et une réduction d’impôt ?',
  'Pourquoi mon salaire net imposable est-il plus élevé que mon net avant impôt ?',
  'Comment fonctionnent les parts fiscales et la case T (parent isolé) ?',
];

interface ConversationTurn {
  id: string;
  question: string;
  taxYear: 2026 | 2025;
  directAnswer: string;
  verifiedLegalFacts: string[];
  simpleExample: string;
  explainedTerms: ExplainedTerm[];
  citations: OfficialPersonalTaxDocument[];
  deterministicSnapshot: DeterministicPersonalCalculationSnapshot | null;
}

export default function PersonalAiAssistantPage() {
  const { activeHousehold, personalTaxSummary } = useFiscaliq();

  const [taxYear, setTaxYear] = useState<2026 | 2025>(2026);
  const [useHouseholdProfile, setUseHouseholdProfile] = useState<boolean>(true);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [streamingAnswer, setStreamingAnswer] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const idCounterRef = useRef<number>(1);

  const initialTurn: ConversationTurn = useMemo(
    () => ({
      id: 'turn-initial',
      question: 'Comment choisir entre l’abattement de 10 % et les frais réels ?',
      taxYear: 2026,
      directAnswer:
        'Par défaut, l’administration fiscale applique automatiquement un abattement de 10 % sur votre salaire net imposable (minimum 495 €, plafond 14 426 €). Si vos dépenses professionnelles réelles et justifiées (trajets domicile-travail, repas) dépassent ce montant de 10 %, vous pouvez opter pour les frais réels (cases 1AK / 1BK) afin de réduire votre impôt.',
      verifiedLegalFacts: [
        'L’abattement automatique de 10 % ne demande aucun justificatif (CGI Art. 83-3°).',
        'Les frais réels exigent de conserver vos factures et justificatifs pendant 3 ans.',
      ],
      simpleExample:
        'Pour 30 000 € de salaire net imposable, l’abattement automatique est de 3 000 €. Si vos frais de trajet justifiés atteignent 4 200 €, l’option pour les frais réels réduit votre base imposable de 1 200 € supplémentaires.',
      explainedTerms: [
        {
          term: 'Abattement de 10 %',
          plainExplanation: 'Réduction automatique appliquée sur vos salaires sans justificatif.',
        },
      ],
      citations: PERSONAL_TAX_KNOWLEDGE_BASE.filter(
        (d) => d.id === 'doc-frais-professionnels-10pct-vs-reels-2026'
      ),
      deterministicSnapshot: null,
    }),
    []
  );

  const [currentTurn, setCurrentTurn] = useState<ConversationTurn>(initialTurn);

  const handleAskQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setStreamingAnswer('');
    setErrorBanner(null);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmed,
          taxYear,
          effectiveDate: taxYear === 2026 ? '2026-11-10' : '2025-12-31',
          useHouseholdProfile,
          householdContext: useHouseholdProfile
            ? {
                householdId: activeHousehold.id,
                householdName: activeHousehold.householdName,
                maritalStatus: activeHousehold.maritalStatus,
                dependantsCount: activeHousehold.dependantsCount,
                isIsolatedParent: activeHousehold.maritalStatus === 'parent_isole',
                annualDeclaredSalaryNetImposableEur:
                  activeHousehold.annualDeclaredSalaryNetImposableEur,
                additionalNetTaxableIncomeEur:
                  activeHousehold.additionalNetTaxableIncomeEur,
                grossMonthlySalaryEur: activeHousehold.grossMonthlySalaryEur,
                employmentCategory: activeHousehold.employmentCategory,
                perContributionAnnualEur: activeHousehold.perContributionAnnualEur,
                estimatedEligibleTaxCreditsEur:
                  activeHousehold.estimatedEligibleTaxCreditsEur,
              }
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorBanner(
          data?.error || 'Veuillez saisir une question fiscale (entre 3 et 1 200 caractères).'
        );
        return;
      }

      if (data?.structured) {
        idCounterRef.current += 1;
        setCurrentTurn({
          id: `turn-${idCounterRef.current}`,
          question: trimmed,
          taxYear,
          directAnswer: data.structured.directAnswer,
          verifiedLegalFacts: data.structured.verifiedLegalFacts || [],
          simpleExample: data.structured.simpleExample || '',
          explainedTerms: data.structured.explainedTerms || [],
          citations: data.citations || [],
          deterministicSnapshot: data.deterministicSnapshot || null,
        });
        setQuestionInput('');
      }
    } catch {
      setErrorBanner(
        'Le service de réponse est momentanément indisponible. Vos simulateurs restent accessibles.'
      );
    } finally {
      setLoading(false);
      setStreamingAnswer('');
    }
  };

  return (
    <AppShell title="Assistant">
      <div className="space-y-5">
        <p className="text-xs text-slate-600 -mt-2">
          Posez vos questions en français simple sur vos impôts et votre salaire.
        </p>

        {/* BLOC 1 : Avertissement clair (Information générale, non conseil fiscal) */}
        <section className="gw-panel p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              <strong>Information générale et sources officielles :</strong> cet assistant s’appuie sur les textes publics (impots.gouv.fr, Service-Public.fr, BOFiP) et ne constitue pas un conseil fiscal personnalisé. Estimation indicative, non contractuelle.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1.5 font-semibold text-[#101827] cursor-pointer">
              <input
                type="checkbox"
                checked={useHouseholdProfile}
                onChange={(e) => setUseHouseholdProfile(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600"
              />
              Adapter à mon profil ({personalTaxSummary.familyQuotientParts} part{personalTaxSummary.familyQuotientParts > 1 ? 's' : ''})
            </label>

            <select
              aria-label="Choisir l'année du barème"
              value={taxYear}
              onChange={(e) => setTaxYear(Number(e.target.value) as 2026 | 2025)}
              className="px-2.5 py-1 rounded border border-slate-300 bg-slate-50 font-semibold text-[#101827]"
            >
              <option value={2026}>Barème 2026</option>
              <option value={2025}>Barème 2025</option>
            </select>
          </div>
        </section>

        {/* BLOC 2 : Zone de question et suggestions rapides */}
        <section className="gw-panel p-5 space-y-3">
          <label
            htmlFor="personal-tax-question"
            className="flex items-center gap-2 text-xs font-bold text-[#101827]"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Posez votre question
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="personal-tax-question"
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskQuestion(questionInput);
                }
              }}
              placeholder="Ex : Comment déclarer mes frais de garde d’enfant ?"
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-[#101827] focus:outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              disabled={loading || !questionInput.trim()}
              onClick={() => handleAskQuestion(questionInput)}
              className="gw-button gw-button-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold text-white disabled:opacity-60 transition-colors shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  Recherche...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-white" />
                  Poser ma question
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={loading}
                onClick={() => {
                  setQuestionInput(q);
                  handleAskQuestion(q);
                }}
                className="px-2.5 py-1 rounded-md text-[11px] bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {errorBanner && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}
        </section>

        {/* BLOC 3 : Réponse principale claire en premier */}
        <section className="gw-panel p-5 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
            RÉPONSE EN FRANÇAIS SIMPLE · BARÈME {currentTurn.taxYear}
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[#101827]">
            « {currentTurn.question} »
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {streamingAnswer || currentTurn.directAnswer}
          </p>
          {currentTurn.simpleExample && (
            <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-950">
              <strong>Exemple concret :</strong> {currentTurn.simpleExample}
            </div>
          )}
        </section>

        {/* BLOC 4 : Détails légaux et sources officielles repliés */}
        <section className="gw-panel p-5">
          <ExpandableDetail
            summary="En savoir plus : voir les règles officielles et les sources"
            officialRef={currentTurn.citations[0]?.officialReference || 'impots.gouv.fr · CGI'}
          >
            <div className="space-y-4 pt-2 text-xs text-slate-700">
              {currentTurn.verifiedLegalFacts.length > 0 && (
                <div>
                  <div className="font-bold text-[#101827] mb-1">Règles applicables :</div>
                  <ul className="list-disc pl-4 space-y-1">
                    {currentTurn.verifiedLegalFacts.map((fact, idx) => (
                      <li key={idx}>{fact}</li>
                    ))}
                  </ul>
                </div>
              )}

              {currentTurn.citations.length > 0 && (
                <div>
                  <div className="font-bold text-[#101827] mb-1.5">Sources officielles :</div>
                  <div className="space-y-2">
                    {currentTurn.citations.map((cit) => (
                      <div
                        key={cit.id}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-[#101827]">{cit.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {cit.authority} · {cit.officialReference}
                          </div>
                        </div>
                        <a
                          href={cit.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                        >
                          Consulter la source <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ExpandableDetail>
        </section>
      </div>
    </AppShell>
  );
}
