'use client';

import React, { useState, useMemo, useRef } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { DataOriginBadge } from '@/components/ui/design-system';
import {
  evaluateDeclarationCompanion,
  OFFICIAL_DECLARATION_RESOURCES,
  ChecklistItemStatus,
  DeclarationWorkflowSectionId,
} from '@/lib/calculations/declaration-companion-engine';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
  ShieldCheck,
  BookmarkCheck,
  FolderOpen,
  Calendar,
  SlidersHorizontal,
  Download,
  Copy,
  Check,
  Lock,
  Info,
  XCircle,
} from 'lucide-react';

const WORKFLOW_SECTIONS: Array<{
  id: 'ALL' | DeclarationWorkflowSectionId;
  shortLabel: string;
  fullTitle: string;
}> = [
  {
    id: 'ALL',
    shortLabel: 'Toutes les rubriques',
    fullTitle: 'Parcours complet de préparation (6 rubriques)',
  },
  {
    id: 'SITUATION_FOYER',
    shortLabel: '1. Situation & Parts',
    fullTitle: 'Étape 1 · Situation familiale, enfants et quotient familial',
  },
  {
    id: 'REVENUS_ACTIVITE_PENSIONS_FONCIER',
    shortLabel: '2. Revenus & Locatif',
    fullTitle: 'Étape 2 · Salaires, retraites et revenus fonciers',
  },
  {
    id: 'FRAIS_PROFESSIONNELS',
    shortLabel: '3. Frais pro (10% vs Réels)',
    fullTitle: 'Étape 3 · Abattement forfaitaire de 10 % ou Frais réels',
  },
  {
    id: 'DEDUCTIONS_REVENU_GLOBAL',
    shortLabel: '4. Déductions (PER / Pension)',
    fullTitle: 'Étape 4 · Charges déductibles du revenu global (PER, pensions)',
  },
  {
    id: 'REDUCTIONS_CREDITS_IMPOT',
    shortLabel: '5. Crédits & Réductions',
    fullTitle: 'Étape 5 · Réductions et crédits d’impôt (Formulaire 2042 RICI)',
  },
  {
    id: 'PRELEVEMENT_SOURCE_SOLDE',
    shortLabel: '6. Prélèvement & Solde',
    fullTitle: 'Étape 6 · Retenues à la source déjà payées et solde d’été',
  },
];

export default function PersonalDeclarationPage() {
  const { activeHousehold, personalTaxSummary, savePersonalSimulation } =
    useFiscaliq();

  const [taxYear, setTaxYear] = useState<2026 | 2025>(2026);
  const [selectedSection, setSelectedSection] = useState<
    'ALL' | DeclarationWorkflowSectionId
  >('ALL');

  // États personnalisables par foyer (permettant d'adapter la checklist en temps réel)
  const [customOverridesByHousehold, setCustomOverridesByHousehold] = useState<
    Record<
      string,
      {
        hasSalaries?: boolean;
        annualNetImposableSalaryEur?: number;
        hasPensions?: boolean;
        annualNetImposablePensionEur?: number;
        hasRentalIncome?: boolean;
        annualGrossRentalIncomeEur?: number;
        hasAdultChildStudent?: boolean;
        optsForRealProfessionalExpenses?: boolean;
        estimatedRealProfessionalExpensesEur?: number;
        hasPerContributions?: boolean;
        annualPerContributionEur?: number;
        paysAlimony?: boolean;
        annualAlimonyPaidEur?: number;
        hasChildcareUnder6?: boolean;
        annualChildcareNetOfCafEur?: number;
        hasHomeServices?: boolean;
        annualHomeServicesNetEur?: number;
        hasCharitableDonations?: boolean;
        annualDonationsEur?: number;
        alreadyWithheldPasAnnualEur?: number;
        january60PctAdvanceReceivedEur?: number;
      }
    >
  >({});

  const currentOverrides = customOverridesByHousehold[activeHousehold.id] ?? {};

  const updateOverride = (
    patch: Partial<(typeof customOverridesByHousehold)[string]>
  ) => {
    setCustomOverridesByHousehold((prev) => ({
      ...prev,
      [activeHousehold.id]: {
        ...(prev[activeHousehold.id] ?? {}),
        ...patch,
      },
    }));
  };

  // Valeurs dérivées du profil actif + personnalisations utilisateur
  const isRetireeHousehold = activeHousehold.activityProfile === 'retraite';
  const hasSalaries =
    currentOverrides.hasSalaries ?? !isRetireeHousehold;
  const annualNetImposableSalaryEur =
    currentOverrides.annualNetImposableSalaryEur ??
    (hasSalaries ? activeHousehold.annualDeclaredSalaryNetImposableEur : 0);

  const hasPensions =
    currentOverrides.hasPensions ?? isRetireeHousehold;
  const annualNetImposablePensionEur =
    currentOverrides.annualNetImposablePensionEur ??
    (hasPensions ? activeHousehold.annualDeclaredSalaryNetImposableEur : 0);

  const hasRentalIncome =
    currentOverrides.hasRentalIncome ??
    activeHousehold.additionalNetTaxableIncomeEur > 0;
  const annualGrossRentalIncomeEur =
    currentOverrides.annualGrossRentalIncomeEur ??
    (activeHousehold.additionalNetTaxableIncomeEur > 0
      ? Math.round(activeHousehold.additionalNetTaxableIncomeEur / 0.7)
      : 0);

  const hasAdultChildStudent =
    currentOverrides.hasAdultChildStudent ?? false;
  const optsForRealProfessionalExpenses =
    currentOverrides.optsForRealProfessionalExpenses ?? false;
  const estimatedRealProfessionalExpensesEur =
    currentOverrides.estimatedRealProfessionalExpensesEur ?? 4200;

  const hasPerContributions =
    currentOverrides.hasPerContributions ??
    activeHousehold.perContributionAnnualEur > 0;
  const annualPerContributionEur =
    currentOverrides.annualPerContributionEur ??
    activeHousehold.perContributionAnnualEur;

  const paysAlimony = currentOverrides.paysAlimony ?? false;
  const annualAlimonyPaidEur = currentOverrides.annualAlimonyPaidEur ?? 3600;

  const hasChildcareUnder6 =
    currentOverrides.hasChildcareUnder6 ??
    (activeHousehold.dependantsCount > 0 &&
      activeHousehold.estimatedEligibleTaxCreditsEur >= 1000);
  const annualChildcareNetOfCafEur =
    currentOverrides.annualChildcareNetOfCafEur ??
    (hasChildcareUnder6 ? 2300 : 0);

  const hasHomeServices =
    currentOverrides.hasHomeServices ??
    (activeHousehold.estimatedEligibleTaxCreditsEur >= 500 &&
      !hasChildcareUnder6);
  const annualHomeServicesNetEur =
    currentOverrides.annualHomeServicesNetEur ??
    (hasHomeServices ? 1500 : 0);

  const hasCharitableDonations =
    currentOverrides.hasCharitableDonations ??
    (activeHousehold.estimatedEligibleTaxCreditsEur > 0 &&
      activeHousehold.estimatedEligibleTaxCreditsEur < 500);
  const annualDonationsEur =
    currentOverrides.annualDonationsEur ??
    (hasCharitableDonations ? 300 : 0);

  const defaultAnnualPas =
    personalTaxSummary.monthlyWithholdingTaxEur * 12;
  const alreadyWithheldPasAnnualEur =
    currentOverrides.alreadyWithheldPasAnnualEur ?? defaultAnnualPas;

  const defaultJanAdvance = Math.round(
    activeHousehold.estimatedEligibleTaxCreditsEur * 0.6
  );
  const january60PctAdvanceReceivedEur =
    currentOverrides.january60PctAdvanceReceivedEur ?? defaultJanAdvance;

  // Évaluation déterministe complète du compagnon déclaratif
  const evaluation = useMemo(() => {
    return evaluateDeclarationCompanion({
      taxYear,
      maritalStatus: activeHousehold.maritalStatus,
      dependantsCount: activeHousehold.dependantsCount,
      hasSharedCustodyChildren: false,
      hasAdultChildStudent,
      hasSalaries,
      annualNetImposableSalaryEur,
      hasPensions,
      annualNetImposablePensionEur,
      hasRentalIncome,
      annualGrossRentalIncomeEur,
      optsForRealProfessionalExpenses,
      estimatedRealProfessionalExpensesEur,
      hasPerContributions,
      annualPerContributionEur,
      paysAlimony,
      annualAlimonyPaidEur,
      hasChildcareUnder6,
      annualChildcareNetOfCafEur,
      hasHomeServices,
      annualHomeServicesNetEur,
      hasCharitableDonations,
      annualDonationsEur,
      alreadyWithheldPasAnnualEur,
      january60PctAdvanceReceivedEur,
    });
  }, [
    taxYear,
    activeHousehold.maritalStatus,
    activeHousehold.dependantsCount,
    hasAdultChildStudent,
    hasSalaries,
    annualNetImposableSalaryEur,
    hasPensions,
    annualNetImposablePensionEur,
    hasRentalIncome,
    annualGrossRentalIncomeEur,
    optsForRealProfessionalExpenses,
    estimatedRealProfessionalExpensesEur,
    hasPerContributions,
    annualPerContributionEur,
    paysAlimony,
    annualAlimonyPaidEur,
    hasChildcareUnder6,
    annualChildcareNetOfCafEur,
    hasHomeServices,
    annualHomeServicesNetEur,
    hasCharitableDonations,
    annualDonationsEur,
    alreadyWithheldPasAnnualEur,
    january60PctAdvanceReceivedEur,
  ]);

  // Suivi de l'état de chaque point de contrôle et notes personnelles par foyer
  const [statusByHouseholdAndItem, setStatusByHouseholdAndItem] = useState<
    Record<string, Record<string, ChecklistItemStatus>>
  >({});
  const [notesByHouseholdAndItem, setNotesByHouseholdAndItem] = useState<
    Record<string, Record<string, string>>
  >({});
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const saveCounterRef = useRef<number>(1);

  const getItemStatus = (
    itemId: string,
    defaultStatus: ChecklistItemStatus
  ): ChecklistItemStatus => {
    return (
      statusByHouseholdAndItem[activeHousehold.id]?.[itemId] ?? defaultStatus
    );
  };

  const setItemStatus = (itemId: string, status: ChecklistItemStatus) => {
    setStatusByHouseholdAndItem((prev) => ({
      ...prev,
      [activeHousehold.id]: {
        ...(prev[activeHousehold.id] ?? {}),
        [itemId]: status,
      },
    }));
  };

  const getItemNote = (itemId: string): string => {
    return notesByHouseholdAndItem[activeHousehold.id]?.[itemId] ?? '';
  };

  const setItemNote = (itemId: string, note: string) => {
    setNotesByHouseholdAndItem((prev) => ({
      ...prev,
      [activeHousehold.id]: {
        ...(prev[activeHousehold.id] ?? {}),
        [itemId]: note,
      },
    }));
  };

  const filteredChecklistItems = useMemo(() => {
    if (selectedSection === 'ALL') return evaluation.checklistItems;
    return evaluation.checklistItems.filter(
      (item) => item.sectionId === selectedSection
    );
  }, [evaluation.checklistItems, selectedSection]);

  // Statistiques de progression et détection des éléments manquants
  const checklistStats = useMemo(() => {
    let verifiedCount = 0;
    let missingDocCount = 0;
    let toVerifyCount = 0;
    const incompleteItems: Array<{
      id: string;
      title: string;
      boxCodes: string[];
      status: ChecklistItemStatus;
      supportingDocumentTitle: string;
    }> = [];

    for (const item of evaluation.checklistItems) {
      const st =
        statusByHouseholdAndItem[activeHousehold.id]?.[item.id] ??
        item.defaultStatus;
      if (st === 'verifie_pret') {
        verifiedCount += 1;
      } else if (st === 'en_attente_justificatif') {
        missingDocCount += 1;
        incompleteItems.push({
          id: item.id,
          title: item.title,
          boxCodes: item.boxCodes,
          status: st,
          supportingDocumentTitle: item.supportingDocumentTitle,
        });
      } else if (st === 'a_verifier') {
        toVerifyCount += 1;
        incompleteItems.push({
          id: item.id,
          title: item.title,
          boxCodes: item.boxCodes,
          status: st,
          supportingDocumentTitle: item.supportingDocumentTitle,
        });
      }
    }

    const totalApplicable = evaluation.checklistItems.filter(
      (item) =>
        (statusByHouseholdAndItem[activeHousehold.id]?.[item.id] ??
          item.defaultStatus) !== 'non_concerne'
    ).length;

    const progressPercent =
      totalApplicable > 0
        ? Math.round((verifiedCount / totalApplicable) * 100)
        : 100;

    return {
      verifiedCount,
      missingDocCount,
      toVerifyCount,
      totalApplicable,
      progressPercent,
      incompleteItems,
    };
  }, [evaluation.checklistItems, statusByHouseholdAndItem, activeHousehold.id]);

  const applicableSupportingDocs = useMemo(
    () => evaluation.supportingDocuments.filter((d) => d.applicableToUser),
    [evaluation.supportingDocuments]
  );

  const handleSaveProgress = () => {
    saveCounterRef.current += 1;
    const seq = saveCounterRef.current;

    try {
      const payload = {
        taxYear,
        overrides: currentOverrides,
        statuses: statusByHouseholdAndItem[activeHousehold.id] ?? {},
        notes: notesByHouseholdAndItem[activeHousehold.id] ?? {},
      };
      window.localStorage.setItem(
        `fiscaliq_declaration_prep_${activeHousehold.id}`,
        JSON.stringify(payload)
      );
    } catch {
      // Ignore storage quota errors
    }

    savePersonalSimulation({
      householdId: activeHousehold.id,
      title: `Préparation déclaration ${taxYear} (${checklistStats.verifiedCount}/${checklistStats.totalApplicable} points vérifiés)`,
      moduleType: 'IR_FOYER',
      taxYear,
      classification: 'CALCUL_VERIFIE',
      inputsSummary: `Revenu imposable ${evaluation.netTaxableGlobalIncomeEur.toLocaleString('fr-FR')} € · ${evaluation.familyQuotientParts} parts · PAS retenu ${evaluation.alreadyWithheldPasAnnualEur.toLocaleString('fr-FR')} €`,
      mainResultLabel:
        evaluation.estimatedSummerTaxBalanceEur < 0
          ? 'Remboursement DGFiP estimé en été'
          : 'Solde d’impôt estimé en été',
      mainResultAmountEur: Math.abs(evaluation.estimatedSummerTaxBalanceEur),
      secondaryDetail: `Impôt annuel net : ${evaluation.finalAnnualNetIncomeTaxEur.toLocaleString('fr-FR')} € · Sauvegarde #${seq}`,
      statutoryRef: 'Formulaire 2042 / 2042 RICI (CGI Art. 170 & 197)',
    });

    setSaveBanner(
      `Votre avancement déclaratif (${checklistStats.progressPercent} % complété) a été sauvegardé dans l’espace privé de ${activeHousehold.householdName}.`
    );
    setTimeout(() => setSaveBanner(null), 4000);
  };

  const finalReviewReportMarkdown = useMemo(() => {
    const lines: string[] = [
      `# DOSSIER DE PRÉPARATION À LA DÉCLARATION DE REVENUS ${taxYear} (REVENUS ${evaluation.incomeYear})`,
      `Foyer : ${activeHousehold.householdName}`,
      `Situation : ${activeHousehold.situationSummary} (${evaluation.familyQuotientParts} part(s) fiscale(s))`,
      `Avancement de la préparation : ${checklistStats.verifiedCount} / ${checklistStats.totalApplicable} rubriques vérifiées (${checklistStats.progressPercent} %)`,
      ``,
      `> AVERTISSEMENT IMPORTANT : Ce document est une fiche d'aide à la préparation générée par la plateforme indépendante FISCALIQ. Il ne remplace pas la déclaration officielle sur impots.gouv.fr et n'est jamais transmis automatiquement à la DGFiP.`,
      ``,
      `---`,
      `## 1. SYNTHÈSE CHIFFRÉE DÉTERMINISTE (BARÈME OFFICIEL ${taxYear})`,
      `- Revenu net imposable soumis au barème : ${evaluation.netTaxableGlobalIncomeEur.toLocaleString('fr-FR')} €`,
      `- Mode de déduction des frais professionnels : ${
        evaluation.appliedProfessionalDeductionMode === 'frais_reels'
          ? `Option Frais réels (${evaluation.appliedProfessionalDeductionEur.toLocaleString('fr-FR')} €)`
          : `Abattement forfaitaire automatique de 10 % (${evaluation.appliedProfessionalDeductionEur.toLocaleString('fr-FR')} €)`
      }`,
      `- Impôt brut après décote (avant réductions/crédits) : ${evaluation.grossTaxAfterDecoteBeforeCreditsEur.toLocaleString('fr-FR')} €`,
      `- Réductions d'impôt non remboursables appliquées : -${evaluation.nonRefundableReductionsEur.toLocaleString('fr-FR')} €`,
      `- Crédits d'impôt remboursables retenus : -${evaluation.refundableCreditsEur.toLocaleString('fr-FR')} €`,
      `- IMPÔT ANNUEL NET ESTIMÉ : ${evaluation.finalAnnualNetIncomeTaxEur.toLocaleString('fr-FR')} € (TMI : ${evaluation.marginalTaxRatePercent} % · Taux moyen : ${evaluation.averageTaxRatePercent.toFixed(1)} %)`,
      `- Prélèvement à la source déjà retenu en ${evaluation.incomeYear} : ${evaluation.alreadyWithheldPasAnnualEur.toLocaleString('fr-FR')} €`,
      `- Avance de 60 % des crédits/réductions reçue en janvier ${taxYear} : ${evaluation.january60PctAdvanceReceivedEur.toLocaleString('fr-FR')} €`,
      `- SOLDE PRÉVISIONNEL D'ÉTÉ ${taxYear} : ${
        evaluation.estimatedSummerTaxBalanceEur < 0
          ? `Remboursement estimé de ${Math.abs(evaluation.estimatedSummerTaxBalanceEur).toLocaleString('fr-FR')} € par virement de la DGFiP`
          : evaluation.estimatedSummerTaxBalanceEur > 0
          ? `Reste à payer estimé de ${evaluation.estimatedSummerTaxBalanceEur.toLocaleString('fr-FR')} € (${
              evaluation.balanceType === 'RESTE_A_PAYER_4_ECHEANCES'
                ? `4 prélèvements de ~${evaluation.monthlyAutumnInstallmentEur.toLocaleString('fr-FR')} € de sept. à déc.`
                : '1 prélèvement unique en septembre'
            })`
          : 'Solde à l’équilibre (0 €)'
      }`,
      ``,
      `---`,
      `## 2. RÉCAPITULATIF DES CASES 2042 / 2042 RICI À VÉRIFIER OU REMPLIR`,
    ];

    evaluation.checklistItems.forEach((item) => {
      const st =
        statusByHouseholdAndItem[activeHousehold.id]?.[item.id] ??
        item.defaultStatus;
      const note = notesByHouseholdAndItem[activeHousehold.id]?.[item.id] ?? '';
      const statusLabel =
        st === 'verifie_pret'
          ? '[VÉRIFIÉ & PRÊT]'
          : st === 'en_attente_justificatif'
          ? '[JUSTIFICATIF MANQUANT]'
          : st === 'a_verifier'
          ? '[À VÉRIFIER]'
          : '[NON CONCERNÉ]';

      lines.push(
        ``,
        `### ${statusLabel} ${item.boxCodes.join(' / ')} — ${item.title} (${item.formName})`,
        `- Pré-rempli par la DGFiP : ${item.isPreFilledByAdministration ? 'Oui (à contrôler)' : 'Non (saisie manuelle obligatoire)'}`,
        `- Valeur / Repère calculé : ${item.suggestedAmountOrValue}`,
        `- Pièce justificative à conserver 3 ans : ${item.supportingDocumentTitle}`,
        `- Référence légale : ${item.statutoryReference} (${item.officialUrl})`
      );
      if (note) {
        lines.push(`- Note personnelle : ${note}`);
      }
    });

    if (checklistStats.incompleteItems.length > 0) {
      lines.push(
        ``,
        `---`,
        `## 3. INFORMATIONS MANQUANTES OU JUSTIFICATIFS À RASSEMBLER AVANT VALIDATION`,
        ...checklistStats.incompleteItems.map(
          (inc) =>
            `- ${inc.boxCodes.join(', ')} (${inc.title}) → Pièce requise : ${inc.supportingDocumentTitle}`
        )
      );
    }

    lines.push(
      ``,
      `---`,
      `## 4. CALENDRIER OFFICIEL DE LA CAMPAGNE ${taxYear}`,
      ...evaluation.verifiedCalendar.map(
        (c) => `- **${c.periodLabel}** : ${c.title} (${c.statutoryOrOfficialRef})`
      )
    );

    return lines.join('\n');
  }, [
    taxYear,
    evaluation,
    activeHousehold,
    checklistStats,
    statusByHouseholdAndItem,
    notesByHouseholdAndItem,
  ]);

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(finalReviewReportMarkdown);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadReport = () => {
    const blob = new Blob([finalReviewReportMarkdown], {
      type: 'text/markdown;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preparation-declaration-2042-${taxYear}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Ma déclaration · Compagnon de préparation annuelle (2042 & 2042 RICI)"
      subtitle="Préparez votre déclaration d’impôt étape par étape : liste personnalisée des cases à vérifier, pièces justificatives requises, détection des oublis et calcul du solde d’été."
      badge="GUIDE DÉCLARATIF INDÉPENDANT · BARÈMES VÉRIFIÉS 2026 & 2025"
    >
      <div className="space-y-6">
        {/* 1. Bandeau d'indépendance institutionnelle et de protection des données */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3 max-w-4xl">
              <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-emerald-800">
                    PLATEFORME D’ASSISTANCE INDÉPENDANTE · PROTECTION STRICTE DES DONNÉES
                  </span>
                  <DataOriginBadge classification="DONNEE_FICTIVE_DEMO" />
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>Information essentielle :</strong> FISCALIQ est un outil indépendant d’aide à la compréhension et à la préparation déclarative. Il <strong>ne transmet aucune déclaration à l’administration fiscale</strong> et ne remplace pas le portail officiel{' '}
                  <a
                    href="https://www.impots.gouv.fr/particulier"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-700 underline"
                  >
                    impots.gouv.fr
                  </a>
                  . Pour votre sécurité, nous ne vous demanderons <strong>jamais</strong> votre mot de passe fiscal ni vos identifiants bancaires.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                aria-label="Choisir le millésime déclaratif"
                value={taxYear}
                onChange={(e) => setTaxYear(Number(e.target.value) as 2026 | 2025)}
                className="px-3 py-2 rounded-md text-xs font-bold bg-slate-50 border border-slate-300 text-[#101827]"
              >
                <option value={2026}>Campagne 2026 (Revenus 2025)</option>
                <option value={2025}>Campagne 2025 (Revenus 2024)</option>
              </select>

              <button
                type="button"
                onClick={handleSaveProgress}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition-colors"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                Sauvegarder ma préparation
              </button>

              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-white" />
                Rapport final de révision
              </button>
            </div>
          </div>

          {saveBanner && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveBanner}</span>
            </div>
          )}
        </section>

        {/* 2. Bandeau des 6 indicateurs déterministes de la déclaration */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              1. AVANCEMENT & QUOTIENT
            </div>
            <div className="text-xl font-bold font-mono text-[#101827] mt-1">
              {checklistStats.progressPercent} % · {evaluation.familyQuotientParts}{' '}
              part{evaluation.familyQuotientParts > 1 ? 's' : ''}
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              {checklistStats.verifiedCount}/{checklistStats.totalApplicable} points vérifiés
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              2. REVENU NET IMPOSABLE
            </div>
            <div className="text-xl font-bold font-mono text-[#101827] mt-1">
              {evaluation.netTaxableGlobalIncomeEur.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              {evaluation.appliedProfessionalDeductionMode === 'frais_reels'
                ? `Frais réels : -${evaluation.appliedProfessionalDeductionEur.toLocaleString('fr-FR')} €`
                : `Abattement 10 % : -${evaluation.appliedProfessionalDeductionEur.toLocaleString('fr-FR')} €`}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              3. IMPÔT APRÈS DÉCOTE
            </div>
            <div className="text-xl font-bold font-mono text-[#101827] mt-1">
              {evaluation.grossTaxAfterDecoteBeforeCreditsEur.toLocaleString(
                'fr-FR'
              )}{' '}
              €
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              Avant réductions & crédits RICI
            </div>
          </div>

          <div className="bg-white border border-emerald-200 bg-emerald-50/40 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-semibold">
              4. CRÉDITS & RÉDUCTIONS
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              -{evaluation.totalReductionsAndCreditsEur.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-emerald-900 mt-1">
              Dont {evaluation.refundableCreditsEur.toLocaleString('fr-FR')} € remboursables
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              5. IMPÔT ANNUEL NET DÛ
            </div>
            <div className="text-xl font-bold font-mono text-[#101827] mt-1">
              {evaluation.finalAnnualNetIncomeTaxEur.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              TMI {evaluation.marginalTaxRatePercent} % · Taux moyen{' '}
              {evaluation.averageTaxRatePercent.toFixed(1)} %
            </div>
          </div>

          <div className="bg-[#F8FAFC] text-[#172033] border border-[#E8EDF2] rounded-lg p-4 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
              6. SOLDE ESTIMÉ EN ÉTÉ {taxYear}
            </div>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              {evaluation.estimatedSummerTaxBalanceEur < 0
                ? `+${Math.abs(evaluation.estimatedSummerTaxBalanceEur).toLocaleString('fr-FR')} €`
                : `${evaluation.estimatedSummerTaxBalanceEur.toLocaleString('fr-FR')} €`}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {evaluation.balanceType === 'REMBOURSEMENT_DGFIP'
                ? 'Remboursement par virement DGFiP'
                : evaluation.balanceType === 'RESTE_A_PAYER_4_ECHEANCES'
                ? `Reste à payer (4 × ${evaluation.monthlyAutumnInstallmentEur} € sept-déc)`
                : evaluation.balanceType === 'RESTE_A_PAYER_UNIQUE_SEPTEMBRE'
                ? 'Reste à payer (1 prélèvement en sept.)'
                : 'Solde à l’équilibre (0 €)'}
            </div>
          </div>
        </section>

        {/* 3. Configuration rapide de la situation annuelle du foyer + Alerte Déclaration Automatique / Éléments manquants */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Panneau de personnalisation des revenus, charges et acomptes de l'année */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-[#101827]">
                  Personnaliser ma liste de contrôle selon mes revenus & dépenses {evaluation.incomeYear}
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Recalcul déterministe instantané
              </span>
            </div>

            {/* Coche des situations applicables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {[
                {
                  key: 'hasSalaries',
                  label: 'Salaires (1AJ / 1BJ)',
                  checked: hasSalaries,
                  onToggle: (v: boolean) => updateOverride({ hasSalaries: v }),
                },
                {
                  key: 'optsForRealProfessionalExpenses',
                  label: 'Tester les Frais réels (1AK)',
                  checked: optsForRealProfessionalExpenses,
                  onToggle: (v: boolean) =>
                    updateOverride({ optsForRealProfessionalExpenses: v }),
                },
                {
                  key: 'hasChildcareUnder6',
                  label: 'Garde d’enfant < 6 ans (7GA)',
                  checked: hasChildcareUnder6,
                  onToggle: (v: boolean) =>
                    updateOverride({ hasChildcareUnder6: v }),
                },
                {
                  key: 'hasHomeServices',
                  label: 'Emploi à domicile (7DB)',
                  checked: hasHomeServices,
                  onToggle: (v: boolean) =>
                    updateOverride({ hasHomeServices: v }),
                },
                {
                  key: 'hasCharitableDonations',
                  label: 'Dons aux associations (7UF)',
                  checked: hasCharitableDonations,
                  onToggle: (v: boolean) =>
                    updateOverride({ hasCharitableDonations: v }),
                },
                {
                  key: 'hasPerContributions',
                  label: 'Épargne retraite PER (6NS)',
                  checked: hasPerContributions,
                  onToggle: (v: boolean) =>
                    updateOverride({ hasPerContributions: v }),
                },
                {
                  key: 'hasRentalIncome',
                  label: 'Revenus locatifs (4BE / 2044)',
                  checked: hasRentalIncome,
                  onToggle: (v: boolean) =>
                    updateOverride({ hasRentalIncome: v }),
                },
                {
                  key: 'hasPensions',
                  label: 'Pensions de retraite (1AS)',
                  checked: hasPensions,
                  onToggle: (v: boolean) => updateOverride({ hasPensions: v }),
                },
                {
                  key: 'hasAdultChildStudent',
                  label: 'Enfant majeur étudiant (Case J)',
                  checked: hasAdultChildStudent,
                  onToggle: (v: boolean) =>
                    updateOverride({ hasAdultChildStudent: v }),
                },
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className={`flex items-center gap-2 p-2.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                    toggle.checked
                      ? 'bg-emerald-50/70 border-emerald-300 text-[#101827] font-semibold'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={toggle.checked}
                    onChange={(e) => toggle.onToggle(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600"
                  />
                  <span>{toggle.label}</span>
                </label>
              ))}
            </div>

            {/* Saisie rapide des montants clés pour le calcul du solde d'été */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label
                  htmlFor="decl-input-salaires"
                  className="block text-[11px] font-semibold text-slate-700"
                >
                  Cumul net imposable annuel (1AJ+1BJ)
                </label>
                <input
                  id="decl-input-salaires"
                  type="number"
                  min={0}
                  step={500}
                  value={annualNetImposableSalaryEur}
                  onChange={(e) =>
                    updateOverride({
                      annualNetImposableSalaryEur: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    })
                  }
                  className="mt-1 w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                />
              </div>

              <div>
                <label
                  htmlFor="decl-input-pas-paye"
                  className="block text-[11px] font-semibold text-slate-700"
                >
                  PAS déjà retenu sur l’année (8HV+8IV)
                </label>
                <input
                  id="decl-input-pas-paye"
                  type="number"
                  min={0}
                  step={100}
                  value={alreadyWithheldPasAnnualEur}
                  onChange={(e) =>
                    updateOverride({
                      alreadyWithheldPasAnnualEur: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    })
                  }
                  className="mt-1 w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                />
              </div>

              <div>
                <label
                  htmlFor="decl-input-avance-janv"
                  className="block text-[11px] font-semibold text-slate-700"
                >
                  Avance 60 % reçue en janvier (€)
                </label>
                <input
                  id="decl-input-avance-janv"
                  type="number"
                  min={0}
                  step={50}
                  value={january60PctAdvanceReceivedEur}
                  onChange={(e) =>
                    updateOverride({
                      january60PctAdvanceReceivedEur: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    })
                  }
                  className="mt-1 w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md text-[#101827]"
                />
              </div>
            </div>
          </div>

          {/* Panneau de diagnostic : Éligibilité Déclaration Automatique + Informations manquantes */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-[#101827]">
                  Diagnostic de complétude & Déclaration automatique
                </h2>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                {checklistStats.incompleteItems.length} point
                {checklistStats.incompleteItems.length > 1 ? 's' : ''} à finaliser
              </span>
            </div>

            {/* Statut Déclaration Automatique (CGI Art. 171) */}
            <div
              className={`p-3.5 rounded-md border text-xs space-y-1.5 ${
                evaluation.automaticDeclarationEligible
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  {evaluation.automaticDeclarationEligible
                    ? 'Éligible en principe à la vérification simplifiée'
                    : 'Action manuelle requise sur impots.gouv.fr (Déclaration automatique insuffisante)'}
                </span>
              </div>
              {!evaluation.automaticDeclarationEligible && (
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  {evaluation.automaticDeclarationExclusionReasons.map(
                    (reason, idx) => (
                      <li key={idx}>{reason}</li>
                    )
                  )}
                </ul>
              )}
            </div>

            {/* Liste des éléments manquants ou à vérifier */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#101827]">
                Informations ou justificatifs manquants à rassembler :
              </div>
              {checklistStats.incompleteItems.length === 0 ? (
                <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Toutes les rubriques de votre déclaration sont marquées comme vérifiées et prêtes !
                  </span>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {checklistStats.incompleteItems.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-2.5 rounded border border-slate-200 bg-slate-50 flex items-start justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#101827]">
                          <span className="font-mono text-emerald-800">
                            {inc.boxCodes.join(', ')}
                          </span>{' '}
                          — {inc.title}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Pièce à préparer : <strong>{inc.supportingDocumentTitle}</strong>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 ${
                          inc.status === 'en_attente_justificatif'
                            ? 'bg-red-100 text-red-900 font-semibold'
                            : 'bg-amber-100 text-amber-900 font-semibold'
                        }`}
                      >
                        {inc.status === 'en_attente_justificatif'
                          ? 'Justificatif manquant'
                          : 'À vérifier'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Parcours de préparation en 6 rubriques & Checklist interactive */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                PARCOURS DE PRÉPARATION ÉTAPE PAR ÉTAPE
              </span>
              <h2 className="text-base font-bold text-[#101827]">
                Liste de contrôle personnalisée des cases 2042, 2042 RICI et 2044
              </h2>
            </div>

            {/* Onglets des 6 rubriques */}
            <div className="flex flex-wrap gap-1.5">
              {WORKFLOW_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSection(sec.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    selectedSection === sec.id
                      ? 'bg-white text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {sec.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChecklistItems.map((item) => {
              const currentStatus = getItemStatus(item.id, item.defaultStatus);
              const currentNote = getItemNote(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-lg border transition-colors flex flex-col justify-between gap-4 ${
                    currentStatus === 'verifie_pret'
                      ? 'border-emerald-300 bg-emerald-50/15'
                      : currentStatus === 'en_attente_justificatif'
                      ? 'border-red-200 bg-red-50/10'
                      : 'border-slate-200/90 bg-white'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {item.boxCodes.join(' · ')}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.formName}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          item.isPreFilledByAdministration
                            ? 'bg-sky-50 text-sky-900 border border-sky-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {item.isPreFilledByAdministration
                          ? 'Pré-rempli (à vérifier)'
                          : 'Non pré-rempli (à saisir)'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#101827]">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.plainExplanation}
                    </p>

                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                      <div className="font-semibold text-[#101827]">
                        Ce que vous devez vérifier ou saisir :
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {item.whatToVerifyOrEnter}
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        <strong>Erreur fréquente à éviter :</strong>{' '}
                        {item.commonMistakeToAvoid}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
                      <span>
                        <strong>Justificatif à conserver 3 ans :</strong>{' '}
                        {item.supportingDocumentTitle}
                      </span>
                      <a
                        href={item.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                      >
                        {item.statutoryReference}{' '}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Pied de carte : Repère chiffré, sélecteur de statut & note personnelle */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-[#101827]">
                        Repère calculé : {item.suggestedAmountOrValue}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          {
                            id: 'verifie_pret',
                            label: 'Vérifié & prêt',
                            icon: CheckCircle2,
                            activeClass:
                              'bg-emerald-600 text-white border-emerald-600',
                          },
                          {
                            id: 'a_verifier',
                            label: 'À vérifier',
                            icon: Clock,
                            activeClass:
                              'bg-amber-600 text-white border-amber-600',
                          },
                          {
                            id: 'en_attente_justificatif',
                            label: 'Justificatif manquant',
                            icon: AlertTriangle,
                            activeClass: 'bg-red-600 text-white border-red-600',
                          },
                          {
                            id: 'non_concerne',
                            label: 'Non concerné',
                            icon: XCircle,
                            activeClass:
                              'bg-slate-600 text-white border-slate-600',
                          },
                        ] as const
                      ).map((btn) => {
                        const Icon = btn.icon;
                        const isSelected = currentStatus === btn.id;
                        return (
                          <button
                            key={btn.id}
                            type="button"
                            onClick={() => setItemStatus(item.id, btn.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                              isSelected
                                ? btn.activeClass
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={currentNote}
                        onChange={(e) => setItemNote(item.id, e.target.value)}
                        placeholder="Ajouter un mémo personnel (ex: Attestation crèche reçue le 12/03)..."
                        className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded text-[#101827]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Guide des pièces justificatives à rassembler (sans les joindre en ligne) */}
        <section className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-[#101827]">
                  Quels documents et justificatifs rassembler pour votre foyer ? ({applicableSupportingDocs.length})
                </h2>
                <p className="text-xs text-slate-600">
                  Règle officielle (LPF Art. L169) : vous ne devez pas joindre ces pièces lors de la télédéclaration, mais vous devez les conserver pendant 3 ans.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {applicableSupportingDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold">
                      Cases : {doc.associatedBoxes.join(', ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {doc.whenAvailable}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#101827]">
                    {doc.title}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    <strong>Émetteur :</strong> {doc.issuer}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed pt-1">
                    {doc.whatToCheck}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/80 text-[10px] font-mono text-slate-500">
                  Conservation : {doc.retentionRule}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Calendrier fiscal officiel vérifié & Ressources officielles impots.gouv.fr */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendrier officiel vérifié */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <div>
                  <h2 className="text-base font-bold text-[#101827]">
                    Calendrier officiel vérifié — Campagne {taxYear} (Revenus {evaluation.incomeYear})
                  </h2>
                  <p className="text-xs text-slate-600">
                    Aucune date fictive : distinction entre échéances légales fixes (CGI) et périodes annuelles publiées par la DGFiP.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {evaluation.verifiedCalendar.map((milestone) => (
                <div
                  key={milestone.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {milestone.periodLabel}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      {milestone.datePrecisionType === 'DATE_LEGALE_FIXE'
                        ? 'Échéance légale fixe (CGI)'
                        : 'Calendrier annuel DGFiP'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#101827]">
                    {milestone.title}
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {milestone.plainExplanation}
                  </p>
                  <div className="text-[11px] text-emerald-900 bg-emerald-50/70 border border-emerald-200/80 rounded p-2">
                    <strong>Action recommandée :</strong> {milestone.actionRequired}
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500">
                    <span>
                      Réf. : {milestone.statutoryOrOfficialRef} · Vérifié le{' '}
                      {milestone.verificationDate}
                    </span>
                    <a
                      href={milestone.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                    >
                      Source officielle <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ressources déclaratives officielles & Garantie de confidentialité */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200/90 rounded-lg p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ExternalLink className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-bold text-[#101827]">
                  Ressources officielles de l’administration fiscale
                </h2>
              </div>

              <div className="space-y-3">
                {OFFICIAL_DECLARATION_RESOURCES.map((res) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#101827]">
                        {res.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-emerald-800 shrink-0">
                        {res.authority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {res.description}
                    </p>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-[#F8FAFC] text-[#172033] border border-[#E8EDF2] rounded-lg p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-bold">
                  CONFIDENTIALITÉ & SÉCURITÉ DÉCLARATIVE
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                FISCALIQ protège vos informations personnelles par isolation stricte de session. Nous ne demandons jamais votre numéro fiscal à 13 chiffres ni votre mot de passe{' '}
                <span className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">impots.gouv.fr</span>.
              </p>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" />
                Générer mon rapport final de préparation 2042
              </button>
            </div>
          </div>
        </div>

        {/* Modale du rapport final de révision déclarative */}
        {showReportModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decl-report-modal-title"
          >
            <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                    RAPPORT DE PRÉPARATION DÉCLARATIVE · MILLÉSIME {taxYear}
                  </span>
                  <h3
                    id="decl-report-modal-title"
                    className="text-base font-bold text-[#101827]"
                  >
                    Synthèse finale 2042 / 2042 RICI — {activeHousehold.householdName}
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

              <div className="p-5 overflow-y-auto flex-1">
                <pre className="p-4 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {finalReviewReportMarkdown}
                </pre>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Utilisez cette fiche comme aide-mémoire lors de votre saisie sur impots.gouv.fr.
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
                        Copier la fiche
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs"
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
