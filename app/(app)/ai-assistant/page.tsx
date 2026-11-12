'use client';

import React, { useState, useRef, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { DataOriginBadge } from '@/components/ui/design-system';
import {
  PERSONAL_TAX_KNOWLEDGE_BASE,
  type OfficialPersonalTaxDocument,
  type ExplainedTerm,
} from '@/lib/ai/knowledge-base';
import type { DeterministicPersonalCalculationSnapshot } from '@/lib/ai/gemini-service';
import {
  MessageSquare,
  Send,
  BookOpen,
  ExternalLink,
  HelpCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  BookmarkCheck,
  FileText,
  PlusCircle,
  Download,
  Copy,
  Check,
  Calculator,
  Calendar,
  Lock,
  Info,
  Trash2,
} from 'lucide-react';

interface SuggestedTopicQuestion {
  id: string;
  category:
    | 'Tous'
    | 'Impôt & Barème'
    | 'Salaire & PAS'
    | 'Parts & Enfants'
    | 'Crédits & Déductions'
    | 'Frais réels'
    | 'Locatif & Retraite'
    | 'Déclaration';
  label: string;
  question: string;
}

const SUGGESTED_PERSONAL_QUESTIONS: SuggestedTopicQuestion[] = [
  {
    id: 'sq-frais-reels',
    category: 'Frais réels',
    label: 'Abattement 10 % ou Frais réels ?',
    question:
      'Comment savoir si je dois garder l’abattement automatique de 10 % ou déclarer mes frais professionnels réels (trajets domicile-travail, repas) ?',
  },
  {
    id: 'sq-credit-vs-reduction',
    category: 'Crédits & Déductions',
    label: 'Crédit d’impôt vs Réduction d’impôt',
    question:
      'Quelle est la différence exacte entre un crédit d’impôt (garde d’enfant, emploi à domicile) et une réduction d’impôt (dons aux associations) si je suis peu ou pas imposable ?',
  },
  {
    id: 'sq-pas-couple',
    category: 'Salaire & PAS',
    label: 'Taux personnalisé vs individualisé (Couple)',
    question:
      'En couple marié ou pacsé avec un écart de salaire, quel est l’intérêt d’opter pour le taux individualisé de prélèvement à la source et pourquoi mon net imposable est-il plus élevé que mon net avant impôt ?',
  },
  {
    id: 'sq-parts-case-t',
    category: 'Parts & Enfants',
    label: 'Parts fiscales, enfants & Parent isolé (Case T)',
    question:
      'Comment sont calculées les parts fiscales avec des enfants à charge (résidence exclusive ou garde alternée) et quelles sont les conditions pour cocher la case T (parent isolé) ?',
  },
  {
    id: 'sq-bareme-decote',
    category: 'Impôt & Barème',
    label: 'Tranche marginale (TMI), taux moyen & décote',
    question:
      'Pourquoi ma tranche marginale est-elle de 11 % ou 30 % alors que mon taux moyen d’imposition est beaucoup plus bas, et comment fonctionne la décote ?',
  },
  {
    id: 'sq-per-pension',
    category: 'Crédits & Déductions',
    label: 'Épargne retraite (PER) & Pension alimentaire',
    question:
      'Comment fonctionne la déduction d’une pension alimentaire versée à un enfant majeur étudiant ou d’un versement sur un Plan d’Épargne Retraite (PER) ?',
  },
  {
    id: 'sq-foncier-locatif',
    category: 'Locatif & Retraite',
    label: 'Revenus locatifs : Micro-foncier 30 % ou Réel ?',
    question:
      'Je loue un appartement non meublé : comment choisir entre le régime micro-foncier (abattement de 30 %) et le régime réel avec déficit foncier ?',
  },
  {
    id: 'sq-retraite-10pct',
    category: 'Locatif & Retraite',
    label: 'Pensions de retraite & abattement de 10 %',
    question:
      'Comment est calculé l’abattement de 10 % sur les pensions de retraite et quel est le plafond applicable par foyer fiscal ?',
  },
  {
    id: 'sq-declaration-2042',
    category: 'Déclaration',
    label: 'Calendrier déclaratif & régularisation d’été',
    question:
      'Quelles sont les étapes de la déclaration annuelle de revenus (formulaire 2042), comment fonctionne l’avance de 60 % en janvier et que se passe-t-il si j’ai un reste à payer en septembre ?',
  },
];

interface ConversationTurn {
  id: string;
  timestamp: string;
  question: string;
  taxYear: 2026 | 2025;
  profileUsed: boolean;
  directAnswer: string;
  verifiedLegalFacts: string[];
  assumptionsAndLimits: string[];
  personalRecommendations: string[];
  explainedTerms: ExplainedTerm[];
  simpleExample: string;
  clarifyingQuestions: string[];
  insufficientInformationNotice: string | null;
  citations: OfficialPersonalTaxDocument[];
  deterministicSnapshot: DeterministicPersonalCalculationSnapshot | null;
  disclaimer: string;
  feedback?: {
    rating: 'helpful' | 'needs_clarification';
    tag?: string;
  };
}

interface SavedConversationRecord {
  id: string;
  householdId: string;
  householdName: string;
  title: string;
  createdAt: string;
  turns: ConversationTurn[];
}

function getInitialTurn(
  householdName: string,
  parts: number,
  netTaxableIncomeEur: number,
  estimatedNetIncomeTaxEur: number,
  marginalTaxRatePercent: number,
  averageTaxRatePercent: number,
  estimatedWithholdingRatePercent: number,
  standardDeduction10PercentEur: number
): ConversationTurn {
  return {
    id: 'turn-initial-welcome',
    timestamp: 'Aujourd’hui',
    question:
      'Comment savoir si je dois garder l’abattement automatique de 10 % ou déclarer mes frais professionnels réels (trajets domicile-travail, repas) ?',
    taxYear: 2026,
    profileUsed: true,
    directAnswer: `Par défaut, vous n’avez aucun calcul à faire : l’administration fiscale applique automatiquement une réduction (**abattement forfaitaire de 10 %**) sur vos salaires nets imposables pour couvrir vos dépenses courantes liées à votre emploi.\n\nCependant, si vous utilisez votre véhicule personnel sur une distance importante pour aller travailler, ou si vous engagez des frais de repas hors domicile non remboursés, le total de vos dépenses réelles sur l’année peut dépasser ces 10 %. Dans ce cas, vous avez le droit d’opter pour les **frais réels** (cases 1AK / 1BK) afin de déduire vos dépenses exactes et réduire votre impôt.`,
    verifiedLegalFacts: [
      'En 2026 (sur les revenus 2025), l’abattement automatique de 10 % sur les salaires est d’au moins 509 € et plafonné à 14 555 € par salarié du foyer (CGI Art. 83-3°).',
      'Les trajets domicile-travail aux frais réels sont pris en compte dans la limite de 40 km par trajet simple (80 km aller-retour), sauf circonstances particulières justifiées liées à l’emploi ou à la famille.',
      'Dans un couple marié ou pacsé, chaque conjoint peut choisir librement entre l’abattement de 10 % et les frais réels selon ce qui est le plus avantageux pour lui.',
    ],
    assumptionsAndLimits: [
      'En optant pour les frais réels, vous devez obligatoirement ajouter à votre salaire imposable les remboursements de frais versés par votre employeur (indemnités kilométriques, prise en charge transport).',
      'Toutes les dépenses déclarées aux frais réels doivent pouvoir être prouvées par des factures ou attestations conservées pendant 3 ans.',
    ],
    personalRecommendations: [
      `Vérifiez votre abattement automatique actuel (${standardDeduction10PercentEur.toLocaleString('fr-FR')} € pour votre foyer) avant de saisir des frais réels en cases 1AK / 1BK.`,
      'Testez votre distance kilométrique et vos frais de repas dans le module « Optimisation fiscale » pour comparer immédiatement les deux options.',
      'Consultez le barème kilométrique officiel sur impots.gouv.fr avant de valider votre déclaration.',
    ],
    explainedTerms: [
      {
        term: 'Abattement forfaitaire de 10 %',
        plainExplanation:
          'Réduction automatique de 10 % appliquée par les impôts sur votre salaire net imposable avant d’appliquer le barème, sans aucun justificatif à fournir.',
      },
      {
        term: 'Frais réels (cases 1AK / 1BK)',
        plainExplanation:
          'Option permettant de remplacer l’abattement automatique de 10 % par le total réel et justifié de vos dépenses professionnelles (transport, repas, télétravail).',
      },
    ],
    simpleExample:
      'Si votre salaire net imposable annuel est de 32 000 €, votre abattement automatique de 10 % est de 3 200 €. Si vos trajets domicile-travail au barème kilométrique et vos frais de repas totalisent 4 700 € sur l’année, passer aux frais réels diminue votre revenu imposable de 1 500 € supplémentaires (soit 165 € d’impôt économisé dans la tranche à 11 %, ou 450 € dans la tranche à 30 %).',
    clarifyingQuestions: [
      'Quelle est la distance quotidienne aller-retour entre votre domicile et votre lieu de travail ?',
      'Quelle est la différence entre un crédit d’impôt et une réduction d’impôt ?',
      'Pourquoi mon salaire net imposable est-il plus élevé que mon salaire net avant impôt ?',
    ],
    insufficientInformationNotice: null,
    citations: PERSONAL_TAX_KNOWLEDGE_BASE.filter(
      (d) => d.id === 'doc-frais-professionnels-10pct-vs-reels-2026'
    ),
    deterministicSnapshot: {
      profileUsed: true,
      profileLabel: householdName,
      taxYear: 2026,
      familyQuotientParts: parts,
      netTaxableIncomeEur,
      grossTaxBeforeDecoteEur: estimatedNetIncomeTaxEur,
      decoteAppliedEur: 0,
      familyQuotientCapReductionLostEur: 0,
      estimatedNetIncomeTaxEur,
      marginalTaxRatePercent,
      averageTaxRatePercent,
      estimatedWithholdingRatePercent,
      standard10PctDeductionEur: standardDeduction10PercentEur,
    },
    disclaimer:
      'Information pédagogique et d’aide à la décision basée sur les textes officiels vérifiés (impots.gouv.fr, Service-Public.fr, BOFiP, Légifrance). Ne remplace pas un avis d’imposition officiel de la DGFiP ni les conseils d’un professionnel habilité.',
  };
}

export default function PersonalAiAssistantPage() {
  const { activeHousehold, personalTaxSummary, savePersonalSimulation } =
    useFiscaliq();

  const [selectedCategory, setSelectedCategory] =
    useState<SuggestedTopicQuestion['category']>('Tous');
  const [taxYear, setTaxYear] = useState<2026 | 2025>(2026);
  const [effectiveDate, setEffectiveDate] = useState<string>('2026-11-10');
  const [useHouseholdProfile, setUseHouseholdProfile] = useState<boolean>(true);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [streamingQuestion, setStreamingQuestion] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [streamingPhaseLabel, setStreamingPhaseLabel] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number>(18);
  const idCounterRef = useRef<number>(1);

  const computedAverageTaxRatePct = useMemo(() => {
    if (personalTaxSummary.netTaxableIncomeEur <= 0) return 0;
    return (
      Math.round(
        (personalTaxSummary.finalEstimatedTaxEur /
          personalTaxSummary.netTaxableIncomeEur) *
          1000
      ) / 10
    );
  }, [
    personalTaxSummary.finalEstimatedTaxEur,
    personalTaxSummary.netTaxableIncomeEur,
  ]);

  const initialTurn = useMemo(
    () =>
      getInitialTurn(
        activeHousehold.householdName,
        personalTaxSummary.familyQuotientParts,
        personalTaxSummary.netTaxableIncomeEur,
        personalTaxSummary.finalEstimatedTaxEur,
        personalTaxSummary.marginalTaxRatePercent,
        computedAverageTaxRatePct,
        personalTaxSummary.effectiveWithholdingRatePercent,
        personalTaxSummary.deductionAppliedEur
      ),
    [
      activeHousehold.householdName,
      personalTaxSummary,
      computedAverageTaxRatePct,
    ]
  );

  const [turnsByHousehold, setTurnsByHousehold] = useState<
    Record<string, ConversationTurn[]>
  >({});

  const turns = useMemo(
    () => turnsByHousehold[activeHousehold.id] ?? [initialTurn],
    [turnsByHousehold, activeHousehold.id, initialTurn]
  );

  const setTurns = (
    updater:
      | ConversationTurn[]
      | ((prev: ConversationTurn[]) => ConversationTurn[])
  ) => {
    setTurnsByHousehold((prevMap) => {
      const currentList = prevMap[activeHousehold.id] ?? [initialTurn];
      const nextList =
        typeof updater === 'function' ? updater(currentList) : updater;
      return {
        ...prevMap,
        [activeHousehold.id]: nextList,
      };
    });
  };

  const [savedByHousehold, setSavedByHousehold] = useState<
    Record<string, SavedConversationRecord[]>
  >({});
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  const savedConversations = useMemo(
    () => savedByHousehold[activeHousehold.id] ?? [],
    [savedByHousehold, activeHousehold.id]
  );

  const filteredSuggestions = useMemo(() => {
    if (selectedCategory === 'Tous') return SUGGESTED_PERSONAL_QUESTIONS;
    return SUGGESTED_PERSONAL_QUESTIONS.filter(
      (q) => q.category === selectedCategory
    );
  }, [selectedCategory]);

  const finalizeTurnFromPayload = (
    trimmedQuestion: string,
    data: {
      structured?: {
        directAnswer: string;
        verifiedLegalFacts?: string[];
        assumptionsAndLimits?: string[];
        personalRecommendations?: string[];
        explainedTerms?: ExplainedTerm[];
        simpleExample?: string;
        clarifyingQuestions?: string[];
        insufficientInformationNotice?: string | null;
      };
      citations?: OfficialPersonalTaxDocument[];
      deterministicSnapshot?: DeterministicPersonalCalculationSnapshot | null;
      disclaimer?: string;
      securityStatus?: { profileUsedInAnswer?: boolean };
      modelUsed?: string;
      rateLimit?: { remaining?: number };
    }
  ) => {
    if (data?.rateLimit?.remaining !== undefined) {
      setRateLimitRemaining(data.rateLimit.remaining);
    }

    if (data?.structured) {
      idCounterRef.current += 1;
      const turnSeq = idCounterRef.current;
      const newTurn: ConversationTurn = {
        id: `turn-${turnSeq}`,
        timestamp: `Échange #${turnSeq}`,
        question: trimmedQuestion,
        taxYear,
        profileUsed: Boolean(data.securityStatus?.profileUsedInAnswer),
        directAnswer: data.structured.directAnswer,
        verifiedLegalFacts: data.structured.verifiedLegalFacts || [],
        assumptionsAndLimits: data.structured.assumptionsAndLimits || [],
        personalRecommendations: data.structured.personalRecommendations || [],
        explainedTerms: data.structured.explainedTerms || [],
        simpleExample: data.structured.simpleExample || '',
        clarifyingQuestions: data.structured.clarifyingQuestions || [],
        insufficientInformationNotice:
          data.structured.insufficientInformationNotice || null,
        citations: data.citations || [],
        deterministicSnapshot: data.deterministicSnapshot || null,
        disclaimer: data.disclaimer || initialTurn.disclaimer,
      };

      setTurns((prev) => [...prev, newTurn]);
      setQuestionInput('');
    }
  };

  const handleAskQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setStreamingQuestion(trimmed);
    setStreamingText('');
    setStreamingPhaseLabel('Vérification RGPD & calcul déterministe CGI en cours...');
    setErrorBanner(null);

    try {
      const historyPayload = turns.slice(-6).flatMap((t) => [
        { role: 'user' as const, content: t.question },
        { role: 'assistant' as const, content: t.directAnswer },
      ]);

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmed,
          taxYear,
          effectiveDate,
          useHouseholdProfile,
          conversationHistory: historyPayload,
          householdContext: useHouseholdProfile
            ? {
                householdId: activeHousehold.id,
                householdName: activeHousehold.householdName,
                maritalStatus: activeHousehold.maritalStatus,
                dependantsCount: activeHousehold.dependantsCount,
                isIsolatedParent:
                  activeHousehold.maritalStatus === 'parent_isole' ||
                  (activeHousehold.maritalStatus !== 'marie_pacse' &&
                    activeHousehold.dependantsCount > 0 &&
                    activeHousehold.id.includes('parent-isole')),
                annualDeclaredSalaryNetImposableEur:
                  activeHousehold.annualDeclaredSalaryNetImposableEur,
                additionalNetTaxableIncomeEur:
                  activeHousehold.additionalNetTaxableIncomeEur,
                grossMonthlySalaryEur: activeHousehold.grossMonthlySalaryEur,
                employmentCategory: activeHousehold.employmentCategory,
                perContributionAnnualEur:
                  activeHousehold.perContributionAnnualEur,
                estimatedEligibleTaxCreditsEur:
                  activeHousehold.estimatedEligibleTaxCreditsEur,
              }
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok && response.status !== 429) {
        setErrorBanner(
          data?.error ||
            'Veuillez reformuler votre question fiscale (entre 3 et 1 200 caractères).'
        );
        return;
      }

      finalizeTurnFromPayload(trimmed, data);
    } catch {
      setErrorBanner(
        'Le service d’analyse documentaire est momentanément indisponible. Vos simulateurs déterministes restent 100 % opérationnels.'
      );
    } finally {
      setLoading(false);
      setStreamingQuestion(null);
      setStreamingText('');
      setStreamingPhaseLabel('');
    }
  };

  const handleFeedback = (
    turnId: string,
    rating: 'helpful' | 'needs_clarification',
    tag?: string
  ) => {
    setTurns((prev) =>
      prev.map((t) =>
        t.id === turnId
          ? {
              ...t,
              feedback: { rating, tag },
            }
          : t
      )
    );
  };

  const handleSaveConversation = () => {
    if (turns.length === 0) return;
    const latestTurn = turns[turns.length - 1];
    idCounterRef.current += 1;
    const convSeq = idCounterRef.current;

    const newRecord: SavedConversationRecord = {
      id: `conv-${convSeq}`,
      householdId: activeHousehold.id,
      householdName: activeHousehold.householdName,
      title:
        latestTurn.question.length > 62
          ? `${latestTurn.question.slice(0, 62)}...`
          : latestTurn.question,
      createdAt: `Session #${convSeq} · Barème ${taxYear}`,
      turns,
    };

    const updated = [newRecord, ...savedConversations].slice(0, 10);
    setSavedByHousehold((prev) => ({
      ...prev,
      [activeHousehold.id]: updated,
    }));

    try {
      window.localStorage.setItem(
        `fiscaliq_assistant_conv_${activeHousehold.id}`,
        JSON.stringify(updated)
      );
    } catch {
      // Ignore storage quota errors
    }

    // Enregistre également une trace dans l'historique des simulations du foyer
    savePersonalSimulation({
      householdId: activeHousehold.id,
      title: `Consultation Assistant Fiscal (${turns.length} question${turns.length > 1 ? 's' : ''})`,
      moduleType: 'IR_FOYER',
      taxYear,
      classification: 'CALCUL_VERIFIE',
      inputsSummary: `${activeHousehold.householdName} · Dernière question : ${latestTurn.question.slice(0, 60)}`,
      mainResultLabel: 'Impôt annuel de référence',
      mainResultAmountEur: personalTaxSummary.finalEstimatedTaxEur,
      secondaryDetail: `Millésime ${taxYear} · ${latestTurn.citations[0]?.officialReference ?? 'CGI'}`,
      statutoryRef:
        latestTurn.citations[0]?.officialReference ?? 'CGI Art. 197 & 83',
    });

    setSaveConfirmation(
      `Conversation sauvegardée dans l’espace privé de ${activeHousehold.householdName}.`
    );
    setTimeout(() => setSaveConfirmation(null), 4000);
  };

  const handleDeleteSavedConversation = (convId: string) => {
    const updated = savedConversations.filter((c) => c.id !== convId);
    setSavedByHousehold((prev) => ({
      ...prev,
      [activeHousehold.id]: updated,
    }));
    try {
      window.localStorage.setItem(
        `fiscaliq_assistant_conv_${activeHousehold.id}`,
        JSON.stringify(updated)
      );
    } catch {
      // Ignore
    }
  };

  const handleStartNewConversation = () => {
    setTurns([initialTurn]);
    setQuestionInput('');
    setErrorBanner(null);
  };

  const reportMarkdownText = useMemo(() => {
    const lines: string[] = [
      `# RAPPORT D’ANALYSE FISCALE PERSONNELLE — FISCALIQ`,
      `Foyer concerné : ${useHouseholdProfile ? activeHousehold.householdName : 'Consultation générale anonyme (sans profil rattaché)'}`,
      `Millésime réglementaire filtré : Barème ${taxYear} (Date d’effet : ${effectiveDate})`,
      ``,
      `---`,
    ];

    if (useHouseholdProfile) {
      lines.push(
        `## 1. SYNTHÈSE CHIFFRÉE DU FOYER AUTORISÉ`,
        `- Situation : ${activeHousehold.situationSummary}`,
        `- Quotient familial : ${personalTaxSummary.familyQuotientParts} part(s)`,
        `- Revenu net imposable soumis au barème : ${personalTaxSummary.netTaxableIncomeEur.toLocaleString('fr-FR')} €`,
        `- Impôt sur le revenu annuel estimé : ${personalTaxSummary.finalEstimatedTaxEur.toLocaleString('fr-FR')} € / an`,
        `- Tranche marginale d’imposition (TMI) : ${personalTaxSummary.marginalTaxRatePercent} %`,
        `- Taux moyen d’imposition : ${computedAverageTaxRatePct.toFixed(1)} %`,
        `- Taux de prélèvement à la source (PAS) estimé : ${personalTaxSummary.effectiveWithholdingRatePercent.toFixed(1)} %`,
        ``,
        `---`
      );
    }

    lines.push(`## 2. QUESTIONS POSÉES & RÉPONSES VÉRIFIÉES (${turns.length})`);

    turns.forEach((turn, idx) => {
      lines.push(
        ``,
        `### Question ${idx + 1} (${turn.timestamp} · Barème ${turn.taxYear})`,
        `« ${turn.question} »`,
        ``,
        `**Explication en français clair :**`,
        turn.directAnswer,
        ``,
        `**Faits légaux vérifiés :**`,
        ...turn.verifiedLegalFacts.map((f) => `- ${f}`),
        ``,
        `**Exemple concret :**`,
        turn.simpleExample,
        ``,
        `**Hypothèses et limites :**`,
        ...turn.assumptionsAndLimits.map((a) => `- ${a}`),
        ``,
        `**Recommandations pratiques :**`,
        ...turn.personalRecommendations.map((r) => `- ${r}`),
        ``,
        `**Sources officielles citées :**`,
        ...turn.citations.map(
          (c) =>
            `- ${c.title} | ${c.authority} (${c.officialReference}, vérifié le ${c.verifiedDate}) — ${c.sourceUrl}`
        ),
        `---`
      );
    });

    lines.push(
      ``,
      `Mentions légales : Ce rapport est généré par FISCALIQ à titre d’information pédagogique et d’aide à la décision. Tous les calculs chiffrés proviennent du calculateur officiel. Il ne remplace pas un avis d’imposition officiel de la DGFiP (impots.gouv.fr).`
    );

    return lines.join('\n');
  }, [
    turns,
    useHouseholdProfile,
    activeHousehold,
    personalTaxSummary,
    computedAverageTaxRatePct,
    taxYear,
    effectiveDate,
  ]);

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportMarkdownText);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadReport = () => {
    const blob = new Blob([reportMarkdownText], {
      type: 'text/markdown;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-assistant-fiscal-fiscaliq-${taxYear}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Mon assistant fiscal">
      <div className="space-y-6">
        <p className="text-xs text-slate-600">
          Posez vos questions en français simple sur vos impôts et votre salaire.
        </p>
        {/* Barre supérieure de contrôle : Profil autorisé, Millésime, Date d'effet, Sauvegarde & Rapport */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Toggle d'utilisation du profil autorisé */}
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="toggle-use-profile"
                      className="text-xs font-bold text-[#101827] cursor-pointer"
                    >
                      Utiliser mon profil fiscal autorisé
                    </label>
                    <input
                      id="toggle-use-profile"
                      type="checkbox"
                      checked={useHouseholdProfile}
                      onChange={(e) => setUseHouseholdProfile(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {useHouseholdProfile
                      ? `Isolé sur : ${activeHousehold.householdName} (${personalTaxSummary.familyQuotientParts} parts · TMI ${personalTaxSummary.marginalTaxRatePercent} %)`
                      : 'Mode anonyme activé : aucune donnée du foyer transmise à l’assistant'}
                  </p>
                </div>
              </div>

              {/* Sélecteur de millésime fiscal */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                <div>
                  <label
                    htmlFor="select-assistant-tax-year"
                    className="block text-[10px] font-mono uppercase tracking-wider text-slate-500"
                  >
                    Millésime & date d’effet
                  </label>
                  <select
                    id="select-assistant-tax-year"
                    value={taxYear}
                    onChange={(e) => {
                      const yr = Number(e.target.value) as 2026 | 2025;
                      setTaxYear(yr);
                      setEffectiveDate(yr === 2026 ? '2026-11-10' : '2025-12-31');
                    }}
                    className="text-xs font-bold text-[#101827] bg-transparent focus:outline-none"
                  >
                    <option value={2026}>
                      Barème 2026 (Revenus 2025 · vigueur 01/01/2026)
                    </option>
                    <option value={2025}>
                      Barème 2025 (Revenus 2024 · vigueur 01/01/2025)
                    </option>
                  </select>
                </div>
              </div>

              <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quota sécurité : {rateLimitRemaining}/18 req/min</span>
              </div>
            </div>

            {/* Actions de conversation : Nouvelle, Sauvegarder, Générer Rapport */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleStartNewConversation}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
                Nouvelle discussion
              </button>
              <button
                type="button"
                onClick={handleSaveConversation}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100 transition-colors"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                Sauvegarder l’échange
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-white" />
                Générer une fiche de synthèse
              </button>
            </div>
          </div>

          {saveConfirmation && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveConfirmation}</span>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLONNE GAUCHE : Profil fiscal actif, Questions suggérées par thème & Historique sauvegardé */}
          <div className="lg:col-span-4 space-y-5">
            {/* Carte du profil fiscal autorisé */}
            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                  PROFIL DU FOYER AUTORISÉ
                </span>
                <DataOriginBadge classification="DONNEE_FICTIVE_DEMO" />
              </div>

              <div className="text-sm font-bold text-[#101827]">
                {activeHousehold.householdName}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeHousehold.situationSummary}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    Parts & TMI
                  </div>
                  <div className="text-xs font-bold font-mono text-[#101827] mt-0.5">
                    {personalTaxSummary.familyQuotientParts} part
                    {personalTaxSummary.familyQuotientParts > 1 ? 's' : ''} ·{' '}
                    <span className="text-emerald-700">
                      {personalTaxSummary.marginalTaxRatePercent} %
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    Impôt net estimé
                  </div>
                  <div className="text-xs font-bold font-mono text-[#101827] mt-0.5">
                    {personalTaxSummary.finalEstimatedTaxEur.toLocaleString(
                      'fr-FR'
                    )}{' '}
                    € / an
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Vos données sont strictement isolées. Les calculs chiffrés sont réalisés selon le barème officiel, jamais inventés par l’IA.
                </span>
              </div>
            </div>

            {/* Catalogue de questions suggérées par thématique */}
            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-[#101827]">
                  Questions fréquentes par thème
                </h2>
              </div>

              {/* Filtres de catégories */}
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    'Tous',
                    'Impôt & Barème',
                    'Salaire & PAS',
                    'Parts & Enfants',
                    'Crédits & Déductions',
                    'Frais réels',
                    'Locatif & Retraite',
                    'Déclaration',
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setQuestionInput(item.question);
                      handleAskQuestion(item.question);
                    }}
                    className="w-full text-left p-3 rounded-md border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors group disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#101827] group-hover:text-emerald-950">
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {item.question}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Historique des conversations sauvegardées du foyer */}
            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-[#101827]">
                    Conversations sauvegardées
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {savedConversations.length}
                </span>
              </div>

              {savedConversations.length === 0 ? (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Aucune conversation enregistrée pour ce foyer. Cliquez sur « Sauvegarder l’échange » pour conserver vos explications et sources officielles.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 rounded-md border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => setTurns(conv.turns)}
                        className="text-left flex-1"
                      >
                        <div className="text-xs font-bold text-[#101827] line-clamp-1">
                          {conv.title}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {conv.createdAt} · {conv.turns.length} échange
                          {conv.turns.length > 1 ? 's' : ''}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedConversation(conv.id)}
                        aria-label="Supprimer la conversation sauvegardée"
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLONNE DROITE : Fil de conversation structuré, pédagogique et sourcé */}
          <div className="lg:col-span-8 space-y-5">
            {/* Formulaire de question en haut pour un accès immédiat */}
            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="personal-tax-question"
                  className="flex items-center gap-2 text-xs font-bold text-[#101827]"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Posez votre question fiscale en français de tous les jours
                </label>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Sources officielles obligatoires · Millésime {taxYear}
                </span>
              </div>

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
                  placeholder="Ex : Comment déclarer les frais de crèche de mon enfant ? Pourquoi mon taux PAS a-t-il changé ?"
                  className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-[#101827] focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  disabled={loading || !questionInput.trim()}
                  onClick={() => handleAskQuestion(questionInput)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs disabled:opacity-60 transition-colors shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      Recherche légale & calcul...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-white" />
                      Obtenir l’explication vérifiée
                    </>
                  )}
                </button>
              </div>

              {errorBanner && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{errorBanner}</span>
                </div>
              )}
            </div>

            {/* Fil des réponses structurées (du plus récent au plus ancien ou fil chronologique inversé pour voir la dernière réponse immédiatement) */}
            <div className="space-y-6">
              {loading && (
                <article
                  aria-live="polite"
                  className="bg-white border border-emerald-300 rounded-lg p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-700 font-semibold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#10B981]" />
                        <span>{streamingPhaseLabel || 'Analyse documentaire en cours...'}</span>
                      </div>
                      {streamingQuestion && (
                        <h3 className="text-base font-bold text-[#101827]">
                          « {streamingQuestion} »
                        </h3>
                      )}
                    </div>
                  </div>

                  {streamingText ? (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                      {streamingText}
                      <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-[#10B981] animate-pulse" />
                    </div>
                  ) : (
                    <div className="space-y-2.5 animate-pulse p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-full" />
                      <div className="h-3 bg-slate-200 rounded w-5/6" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-pulse">
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                      <div className="h-2.5 w-32 bg-slate-200 rounded" />
                      <div className="h-2 w-full bg-slate-100 rounded" />
                      <div className="h-2 w-4/5 bg-slate-100 rounded" />
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                      <div className="h-2.5 w-28 bg-slate-200 rounded" />
                      <div className="h-2 w-full bg-slate-100 rounded" />
                      <div className="h-2 w-3/4 bg-slate-100 rounded" />
                    </div>
                  </div>
                </article>
              )}

              {[...turns].reverse().map((turn, reverseIdx) => {
                const turnNumber = turns.length - reverseIdx;
                return (
                  <article
                    key={turn.id}
                    className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-5"
                  >
                    {/* En-tête de la question de l'utilisateur */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                            Question #{turnNumber} · {turn.timestamp}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                            Barème officiel {turn.taxYear}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {turn.profileUsed
                              ? `Profil utilisé : ${activeHousehold.householdName}`
                              : 'Réponse générale (sans profil)'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#101827] pt-1">
                          « {turn.question} »
                        </h3>
                      </div>
                    </div>

                    {/* Alerte si information insuffisante ou cas particulier */}
                    {turn.insufficientInformationNotice && (
                      <div className="p-3.5 rounded-md bg-amber-50/90 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">
                            Précision sur les informations disponibles :{' '}
                          </span>
                          {turn.insufficientInformationNotice}
                        </div>
                      </div>
                    )}

                    {/* 1. Explication directe en français simple */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-800">
                          Explication en français simple
                        </h4>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                        {turn.directAnswer}
                      </div>
                    </div>

                    {/* 2. Bloc Calcul Déterministe Serveur (si profil actif utilisé) */}
                    {turn.deterministicSnapshot && (
                      <div className="p-4 rounded-lg bg-[#F8FAFC] text-[#172033] border border-[#E8EDF2] space-y-3 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-bold">
                              CALCUL PERSONNALISÉ POUR VOTRE FOYER (
                              {turn.deterministicSnapshot.profileLabel})
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                            Calculé selon le barème officiel{' '}
                            {turn.deterministicSnapshot.taxYear}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                          <div className="p-2.5 rounded-lg bg-white border border-[#E8EDF2] shadow-2xs">
                            <div className="text-[10px] font-mono text-slate-500 uppercase">
                              Revenu net imposable
                            </div>
                            <div className="text-sm font-bold font-mono text-[#172033] mt-0.5">
                              {turn.deterministicSnapshot.netTaxableIncomeEur.toLocaleString(
                                'fr-FR'
                              )}{' '}
                              €
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Après -10 % (
                              {turn.deterministicSnapshot.standard10PctDeductionEur.toLocaleString(
                                'fr-FR'
                              )}{' '}
                              €)
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white border border-[#E8EDF2] shadow-2xs">
                            <div className="text-[10px] font-mono text-slate-500 uppercase">
                              Quotient familial
                            </div>
                            <div className="text-sm font-bold font-mono text-[#172033] mt-0.5">
                              {turn.deterministicSnapshot.familyQuotientParts}{' '}
                              part
                              {turn.deterministicSnapshot.familyQuotientParts > 1
                                ? 's'
                                : ''}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Tranche TMI :{' '}
                              {turn.deterministicSnapshot.marginalTaxRatePercent}{' '}
                              %
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white border border-[#E8EDF2] shadow-2xs">
                            <div className="text-[10px] font-mono text-slate-500 uppercase">
                              Impôt annuel estimé
                            </div>
                            <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                              {turn.deterministicSnapshot.estimatedNetIncomeTaxEur.toLocaleString(
                                'fr-FR'
                              )}{' '}
                              € / an
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Taux moyen réel :{' '}
                              {turn.deterministicSnapshot.averageTaxRatePercent.toFixed(
                                1
                              )}{' '}
                              %
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white border border-[#E8EDF2] shadow-2xs">
                            <div className="text-[10px] font-mono text-slate-500 uppercase">
                              Taux PAS estimé
                            </div>
                            <div className="text-sm font-bold font-mono text-[#172033] mt-0.5">
                              {turn.deterministicSnapshot.estimatedWithholdingRatePercent.toFixed(
                                1
                              )}{' '}
                              %
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Prélèvement à la source
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Distinction épistémique : Faits légaux vérifiés vs Hypothèses & Recommandations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Faits légaux vérifiés */}
                      <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-emerald-900">
                            1. Faits légaux vérifiés (CGI / BOFiP)
                          </span>
                          <DataOriginBadge classification="CALCUL_VERIFIE" />
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-800">
                          {turn.verifiedLegalFacts.map((fact, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{fact}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Hypothèses & Conditions à vérifier */}
                      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-900">
                            2. Hypothèses & limites d’application
                          </span>
                          <DataOriginBadge classification="ESTIMATION" />
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-800">
                          {turn.assumptionsAndLimits.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 4. Exemple concret & Recommandations pratiques */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {turn.simpleExample && (
                        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                          <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#101827]">
                            3. Exemple chiffré concret
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {turn.simpleExample}
                          </p>
                        </div>
                      )}

                      <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#101827]">
                          4. Recommandations personnelles & démarches
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {turn.personalRecommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="font-mono font-bold text-emerald-700">
                                →
                              </span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 5. Glossaire des termes techniques expliqués simplement */}
                    {turn.explainedTerms.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-600">
                          Vocabulaire fiscal expliqué sans jargon
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {turn.explainedTerms.map((termObj, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-md border border-slate-200 bg-white"
                            >
                              <div className="text-xs font-bold text-[#101827]">
                                {termObj.term}
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                {termObj.plainExplanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6. Sources officielles citées avec explication de pourquoi la règle s'applique */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#101827]">
                          Textes officiels vérifiés extraits de la base FISCALIQ (
                          {turn.citations.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {turn.citations.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3.5 rounded-md border border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-[#101827]">
                                  {doc.title}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold">
                                  {doc.authority} · {doc.officialReference}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600">
                                <strong>Pourquoi cette règle s’applique :</strong>{' '}
                                {doc.whyItApplies}
                              </p>
                              <div className="text-[10px] font-mono text-slate-500">
                                Millésime {doc.applicableTaxYear} · En vigueur le{' '}
                                {doc.effectiveFromDate} · Vérifié le{' '}
                                {doc.verifiedDate} · Cases 2042 :{' '}
                                {doc.declarationBoxes.join(', ')}
                              </div>
                            </div>
                            <a
                              href={doc.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-semibold shrink-0 transition-colors"
                            >
                              Source officielle
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 7. Questions de clarification suggérées (cliquables) */}
                    {turn.clarifyingQuestions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="text-[11px] font-semibold text-slate-700">
                          Pour affiner votre situation personnelle, cliquez sur une précision :
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {turn.clarifyingQuestions.map((cq, idx) => (
                            <button
                              key={idx}
                              type="button"
                              disabled={loading}
                              onClick={() => {
                                setQuestionInput(cq);
                                handleAskQuestion(cq);
                              }}
                              className="text-left text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-[#101827] hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                            >
                              + {cq}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 8. Évaluation de la réponse (Feedback utilisateur) & Avertissement */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-700">
                          Cette explication est-elle claire ?
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleFeedback(
                              turn.id,
                              'helpful',
                              'Explication très claire'
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                            turn.feedback?.rating === 'helpful'
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          Utile & clair
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleFeedback(
                              turn.id,
                              'needs_clarification',
                              'Souhaite un exemple plus détaillé'
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                            turn.feedback?.rating === 'needs_clarification'
                              ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />À préciser
                        </button>
                        {turn.feedback && (
                          <span className="text-[11px] font-medium text-emerald-700">
                            Merci pour votre retour !
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-500">
                        {turn.disclaimer}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modale de génération de rapport fiscal personnalisé */}
        {showReportModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
          >
            <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                    FICHE DE SYNTHÈSE FISCALE VÉRIFIÉE
                  </span>
                  <h3
                    id="report-modal-title"
                    className="text-base font-bold text-[#101827]"
                  >
                    Fiche de synthèse fiscale — {activeHousehold.householdName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Fermer
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <pre className="p-4 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {reportMarkdownText}
                </pre>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Document incluant les références légales vérifiées (CGI, BOFiP, impots.gouv.fr).
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-slate-300 bg-white text-[#101827] hover:bg-slate-100"
                  >
                    {copiedReport ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        Copier le rapport
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    Télécharger (.md)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
