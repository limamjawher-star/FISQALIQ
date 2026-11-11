'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { DataOriginBadge } from '@/components/ui/design-system';
import {
  PERSONAL_TAX_SUPABASE_RLS_SCHEMA,
  SUPABASE_PGVECTOR_KNOWLEDGE_BASE_SCHEMA,
  SUPABASE_GDPR_AND_CONVERSATIONS_RLS_SCHEMA,
} from '@/lib/supabase/config';
import {
  SECURITY_AUDIT_FINDINGS_REGISTRY,
  GDPR_IMPLEMENTATION_CHECKLIST,
} from '@/lib/security/security-audit-and-gdpr';
import {
  getKnowledgeRegistrySources,
  searchVerifiedKnowledgeChunks,
  chunkKnowledgeDocument,
  approveKnowledgeSource,
  rejectKnowledgeSource,
  archiveKnowledgeSource,
  updateKnowledgeSourcePreserveHistory,
  resetKnowledgeRegistryToInitial,
  TOPIC_LABELS_FR,
  NORMATIVE_TIER_LABELS_FR,
  OfficialPersonalTaxDocument,
  PersonalTaxKnowledgeTopic,
  OfficialPublisher,
  NormativeTier,
  SourceVerificationStatus,
} from '@/lib/ai/knowledge-base';
import {
  ShieldCheck,
  Database,
  Scale,
  CheckCircle2,
  UserCheck,
  Lock,
  BookOpen,
  Search,
  History,
  FileCheck2,
  XCircle,
  Archive,
  GitBranchPlus,
  ExternalLink,
  Layers,
  Cpu,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  Trash2,
} from 'lucide-react';

type ActiveSettingsTab =
  | 'KNOWLEDGE_REGISTRY_ADMIN'
  | 'SEMANTIC_SEARCH_PGVECTOR'
  | 'HOUSEHOLD_AND_BAREME'
  | 'SECURITY_AND_GDPR_AUDIT';

const STATUS_BADGE_MAP: Record<
  SourceVerificationStatus,
  { label: string; className: string; authoritative: boolean }
> = {
  APPROVED_VERIFIED: {
    label: 'Approuvée & Vérifiée (Autorisée IA)',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    authoritative: true,
  },
  PENDING_REVIEW: {
    label: 'En attente de revue (Bloquée IA)',
    className: 'bg-amber-50 text-amber-800 border-amber-300',
    authoritative: false,
  },
  REJECTED: {
    label: 'Rejetée (Bloquée IA)',
    className: 'bg-rose-50 text-rose-800 border-rose-300',
    authoritative: false,
  },
  ARCHIVED_HISTORICAL: {
    label: 'Archivée — Historique (Bloquée IA par défaut)',
    className: 'bg-slate-100 text-slate-700 border-slate-300',
    authoritative: false,
  },
};

export default function SettingsPage() {
  const { activeHousehold } = useFiscaliq();
  const [activeTab, setActiveTab] = useState<ActiveSettingsTab>('KNOWLEDGE_REGISTRY_ADMIN');
  const [gdprExportPreview, setGdprExportPreview] = useState<string | null>(null);
  const [gdprErasureResult, setGdprErasureResult] = useState<string | null>(null);
  const [isRunningGdprAction, setIsRunningGdprAction] = useState(false);

  const handleGdprExport = async () => {
    setIsRunningGdprAction(true);
    setGdprErasureResult(null);
    try {
      const res = await fetch('/api/security-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-household-id': activeHousehold.id,
        },
        body: JSON.stringify({
          action: 'GDPR_EXPORT_ART_15_20',
          authenticatedHouseholdId: activeHousehold.id,
          targetHouseholdId: activeHousehold.id,
        }),
      });
      const json = await res.json();
      setGdprExportPreview(JSON.stringify(json, null, 2));
    } catch {
      setGdprExportPreview('Erreur lors de la génération de l’export RGPD.');
    } finally {
      setIsRunningGdprAction(false);
    }
  };

  const handleGdprErasure = async () => {
    setIsRunningGdprAction(true);
    setGdprExportPreview(null);
    try {
      const res = await fetch('/api/security-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-household-id': activeHousehold.id,
        },
        body: JSON.stringify({
          action: 'GDPR_ERASURE_ART_17',
          authenticatedHouseholdId: activeHousehold.id,
          targetHouseholdId: activeHousehold.id,
        }),
      });
      const json = await res.json();
      setGdprErasureResult(
        json?.erasureCertificate?.messageFr ||
          'Effacement RGPD (Art. 17) exécuté pour le foyer actif.'
      );
    } catch {
      setGdprErasureResult('Erreur lors de l’exécution de l’effacement RGPD.');
    } finally {
      setIsRunningGdprAction(false);
    }
  };

  // Filtres du registre officiel des sources
  const [sources, setSources] = useState<OfficialPersonalTaxDocument[]>(() =>
    getKnowledgeRegistrySources({ includeNonApproved: true })
  );
  const [topicFilter, setTopicFilter] = useState<PersonalTaxKnowledgeTopic | 'ALL'>('ALL');
  const [publisherFilter, setPublisherFilter] = useState<OfficialPublisher | 'ALL'>('ALL');
  const [tierFilter, setTierFilter] = useState<NormativeTier | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<SourceVerificationStatus | 'ALL'>('ALL');
  const [incomeYearFilter, setIncomeYearFilter] = useState<2025 | 2024 | 'ALL'>('ALL');

  // Source sélectionnée pour l'inspection des versions / chunks / mise à jour
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    'doc-ir-bareme-decote-2026'
  );
  const [adminActionBanner, setAdminActionBanner] = useState<string | null>(null);

  // Formulaire de création d'une nouvelle version (sans écraser l'historique)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateSummaryText, setUpdateSummaryText] = useState('');
  const [updateReferenceText, setUpdateReferenceText] = useState('');
  const [updateReasonText, setUpdateReasonText] = useState('');

  // Recherche sémantique & test d'ingestion/découpage
  const [semanticQuery, setSemanticQuery] = useState(
    'Quel est le plafond du crédit d’impôt garde d’enfant de moins de 6 ans et de l’abattement de 10 % sur les salaires ?'
  );
  const [searchIncomeYear, setSearchIncomeYear] = useState<2025 | 2024 | 'ALL'>(2025);
  const [searchTopicFilter, setSearchTopicFilter] = useState<PersonalTaxKnowledgeTopic | 'ALL'>(
    'ALL'
  );
  const [searchPublisherFilter, setSearchPublisherFilter] = useState<OfficialPublisher | 'ALL'>(
    'ALL'
  );
  const [embeddingInspectResult, setEmbeddingInspectResult] = useState<{
    embeddingEngine: string;
    vectorDimensions: number;
    vectorPreview: number[];
    estimatedTokens: number;
    detectedCitations: string[];
  } | null>(null);
  const [isInspectingEmbedding, setIsInspectingEmbedding] = useState(false);

  // Préférences du foyer existantes
  const [defaultTaxYear, setDefaultTaxYear] = useState<'2026' | '2025'>('2026');
  const [explainTermsAutomatically, setExplainTermsAutomatically] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const filteredSources = useMemo(() => {
    return sources.filter((doc) => {
      if (topicFilter !== 'ALL' && doc.topic !== topicFilter) return false;
      if (publisherFilter !== 'ALL' && doc.publisher !== publisherFilter) return false;
      if (tierFilter !== 'ALL' && doc.normativeTier !== tierFilter) return false;
      if (statusFilter !== 'ALL' && doc.verificationStatus !== statusFilter) return false;
      if (incomeYearFilter !== 'ALL' && doc.applicableIncomeYear !== incomeYearFilter)
        return false;
      return true;
    });
  }, [sources, topicFilter, publisherFilter, tierFilter, statusFilter, incomeYearFilter]);

  const selectedSource = useMemo(
    () =>
      sources.find((s) => s.id === selectedSourceId) ||
      filteredSources[0] ||
      sources[0],
    [sources, selectedSourceId, filteredSources]
  );

  const selectedSourceChunks = useMemo(
    () => (selectedSource ? chunkKnowledgeDocument(selectedSource) : []),
    [selectedSource]
  );

  const semanticResults = useMemo(() => {
    if (!semanticQuery.trim()) return [];
    return searchVerifiedKnowledgeChunks(semanticQuery, {
      applicableIncomeYear: searchIncomeYear,
      topic: searchTopicFilter,
      publisher: searchPublisherFilter,
      onlyApprovedVerified: true,
      maxResults: 5,
    });
  }, [semanticQuery, searchIncomeYear, searchTopicFilter, searchPublisherFilter]);

  const refreshLocalSources = () => {
    setSources([...getKnowledgeRegistrySources({ includeNonApproved: true })]);
  };

  const handleApproveSource = async (source: OfficialPersonalTaxDocument) => {
    approveKnowledgeSource(
      source.id,
      'Comité Juridique & Fiscal FISCALIQ',
      'Source officielle vérifiée et activée pour les réponses fiscales faisant foi.'
    );
    refreshLocalSources();
    setAdminActionBanner(
      `Source « ${source.title} » approuvée (statut APPROVED_VERIFIED). Elle peut désormais appuyer les réponses faisant foi.`
    );
    try {
      await fetch('/api/ai/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', sourceId: source.id }),
      });
    } catch {
      // L'état en mémoire client est déjà synchronisé
    }
  };

  const handleRejectSource = async (source: OfficialPersonalTaxDocument) => {
    rejectKnowledgeSource(
      source.id,
      'Comité Juridique & Fiscal FISCALIQ',
      'Source rejetée lors de la revue documentaire : exclue des réponses de l’assistant.'
    );
    refreshLocalSources();
    setAdminActionBanner(
      `Source « ${source.title} » rejetée (statut REJECTED). Elle est strictement exclue des réponses fiscales.`
    );
    try {
      await fetch('/api/ai/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', sourceId: source.id }),
      });
    } catch {
      // Synchronisé
    }
  };

  const handleArchiveSource = async (source: OfficialPersonalTaxDocument) => {
    archiveKnowledgeSource(
      source.id,
      'Comité Juridique & Fiscal FISCALIQ',
      'Source placée en archive historique : conservée pour traçabilité mais désactivée pour les réponses courantes.'
    );
    refreshLocalSources();
    setAdminActionBanner(
      `Source « ${source.title} » archivée (statut ARCHIVED_HISTORICAL). Conservée dans le registre sans jamais être supprimée.`
    );
    try {
      await fetch('/api/ai/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ARCHIVE', sourceId: source.id }),
      });
    } catch {
      // Synchronisé
    }
  };

  const openVersionUpdateModal = (source: OfficialPersonalTaxDocument) => {
    setSelectedSourceId(source.id);
    setUpdateReferenceText(source.officialReference);
    setUpdateSummaryText(source.plainFrenchSummary);
    setUpdateReasonText(
      `Mise à jour doctrinale BOFiP / CGI avec conservation intégrale de la version v${source.versionNumber}`
    );
    setIsUpdateModalOpen(true);
  };

  const handleCreateNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource || !updateSummaryText.trim()) return;

    const updated = updateKnowledgeSourcePreserveHistory({
      sourceId: selectedSource.id,
      newOfficialReference: updateReferenceText.trim() || selectedSource.officialReference,
      newPlainFrenchSummary: updateSummaryText.trim(),
      changeReason:
        updateReasonText.trim() ||
        'Actualisation réglementaire avec archivage de la version précédente.',
    });

    refreshLocalSources();
    setIsUpdateModalOpen(false);
    if (updated) {
      setAdminActionBanner(
        `Nouvelle version v${updated.versionNumber} créée pour « ${updated.title} ». La version précédente v${updated.versionNumber - 1} a été archivée dans l'historique immuable sans aucun écrasement.`
      );
    }

    try {
      await fetch('/api/ai/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_NEW_VERSION',
          sourceId: selectedSource.id,
          newOfficialReference: updateReferenceText.trim(),
          newPlainFrenchSummary: updateSummaryText.trim(),
          changeReason: updateReasonText.trim(),
        }),
      });
    } catch {
      // Synchronisé
    }
  };

  const handleResetRegistry = async () => {
    resetKnowledgeRegistryToInitial();
    refreshLocalSources();
    setAdminActionBanner(
      'Registre restauré à son état initial vérifié (12 sources approuvées + 1 source en attente de revue).'
    );
    try {
      await fetch('/api/ai/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET' }),
      });
    } catch {
      // Synchronisé
    }
  };

  const handleRunServerEmbeddingInspection = async () => {
    if (!selectedSource) return;
    setIsInspectingEmbedding(true);
    try {
      const response = await fetch('/api/ai/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'INSPECT_EXTRACTION_AND_EMBEDDING',
          sourceId: selectedSource.id,
          rawText: `${selectedSource.title}\n${selectedSource.officialReference}\n${selectedSource.normativeExcerpt}\n${selectedSource.plainFrenchSummary}`,
        }),
      });
      const data = await response.json();
      if (response.ok && data.extraction) {
        setEmbeddingInspectResult({
          embeddingEngine: data.embeddingEngine,
          vectorDimensions: data.vectorDimensions,
          vectorPreview: data.vectorPreview,
          estimatedTokens: data.extraction.estimatedTokens,
          detectedCitations: data.extraction.detectedCitations,
        });
      }
    } finally {
      setIsInspectingEmbedding(false);
    }
  };

  const handleSavePreferences = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const approvedCount = sources.filter(
    (s) => s.verificationStatus === 'APPROVED_VERIFIED'
  ).length;
  const pendingCount = sources.filter(
    (s) => s.verificationStatus === 'PENDING_REVIEW'
  ).length;
  const historicalVersionsCount = sources.reduce(
    (acc, s) => acc + s.historicalVersions.length,
    0
  );

  return (
    <AppShell
      title="Base de connaissances officielle, Registre des sources & Paramètres"
      subtitle="Registre normatif vérifié (Légifrance, BOFiP, impots.gouv.fr, Service-Public, economie.gouv.fr), versions historiques immuables, découpage pgvector et revue des sources."
      badge="SOURCES OFFICIELLES VÉRIFIÉES + ADMINISTRATION RAG PGVECTOR"
    >
      <div className="space-y-6">
        {/* En-tête principal */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                Base de connaissances officielle & Gouvernance
              </span>
              <DataOriginBadge classification="CALCUL_VERIFIE" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Base de connaissances fiscale officielle, Registre des sources & Paramètres
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Registre normatif vérifié (Légifrance, BOFiP-Impôts, impots.gouv.fr, Service-Public Particuliers,
              economie.gouv.fr), conservation immuable des versions historiques, découpage vectoriel{' '}
              <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">pgvector</code> et interface de
              revue des sources.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/ai-assistant"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              Interroger l’Assistant fiscal
            </Link>
            <button
              type="button"
              onClick={handleResetRegistry}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser le registre
            </button>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="flex flex-wrap items-center gap-2 bg-[#F8FAFC] border border-[#E8EDF2] rounded-xl p-2 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('KNOWLEDGE_REGISTRY_ADMIN')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'KNOWLEDGE_REGISTRY_ADMIN'
                ? 'bg-white text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            1. Registre des sources & Revue d’administration ({sources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SEMANTIC_SEARCH_PGVECTOR')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'SEMANTIC_SEARCH_PGVECTOR'
                ? 'bg-white text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <Cpu className="w-4 h-4 text-emerald-600" />
            2. Ingestion, Chunking, Embeddings & Schéma Supabase pgvector
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HOUSEHOLD_AND_BAREME')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'HOUSEHOLD_AND_BAREME'
                ? 'bg-white text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            3. Préférences du foyer & Barèmes 2026/2025
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SECURITY_AND_GDPR_AUDIT')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'SECURITY_AND_GDPR_AUDIT'
                ? 'bg-white text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            4. Audit Sécurité, Isolation & Droits RGPD (Art. 15/17/20)
          </button>
        </div>

        {/* Bannière de confirmation d'action d'administration */}
        {adminActionBanner && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 leading-relaxed font-medium">
                {adminActionBanner}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAdminActionBanner(null)}
              className="text-xs font-semibold text-emerald-800 hover:underline shrink-0"
            >
              Fermer
            </button>
          </div>
        )}

        {/* =====================================================================
            ONGLET 1 : REGISTRE DES SOURCES OFFICIELLES & ADMINISTRATION
           ===================================================================== */}
        {activeTab === 'KNOWLEDGE_REGISTRY_ADMIN' && (
          <div className="space-y-6">
            {/* Cartes de synthèse & Hiérarchie normative */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium">
                  Sources vérifiées actives (Autorisées IA)
                </div>
                <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
                  {approvedCount} / {sources.length}
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Seules les sources <code className="font-mono">APPROVED_VERIFIED</code> peuvent fonder une réponse.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium">
                  Thématiques fiscales couvertes
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                  12 / 12
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  IR, foyer, parts, salaires, retraites, foncier, déductions, réductions, crédits, PAS, 2042, paiement.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium">
                  Versions historiques préservées
                </div>
                <div className="text-2xl font-bold text-indigo-700 font-mono mt-1">
                  {historicalVersionsCount} versions archivées
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Aucun écrasement silencieux : les règles 2025 (revenus 2024) restent consultables.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium">
                  En attente de revue humaine
                </div>
                <div className="text-2xl font-bold text-amber-700 font-mono mt-1">
                  {pendingCount} fiche(s)
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Bloquée par le moteur RAG tant qu’un réviseur ne l’a pas approuvée.
                </p>
              </div>
            </div>

            {/* Distinction explicite des 4 niveaux de la hiérarchie normative */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Distinction stricte entre Législation, Doctrine administrative opposable, Explications officielles et Contenu pédagogique FISCALIQ
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(NORMATIVE_TIER_LABELS_FR) as NormativeTier[]).map((tierKey) => {
                  const tierInfo = NORMATIVE_TIER_LABELS_FR[tierKey];
                  return (
                    <div
                      key={tierKey}
                      className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 flex flex-col justify-between"
                    >
                      <div>
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border mb-2 ${tierInfo.badgeClass}`}
                        >
                          {tierInfo.label}
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {tierInfo.description}
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/70 text-[10px] font-mono text-slate-500">
                        Niveau : {tierKey}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Barre de filtres de métadonnées */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Registre officiel des sources fiscales & Interface de revue ({filteredSources.length} affichées)
                </h2>
                <span className="text-xs text-slate-500">
                  Cliquez sur une source pour inspecter ses versions historiques, ses segments (chunks) ou créer une nouvelle version.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Éditeur officiel (Publisher)
                  </label>
                  <select
                    value={publisherFilter}
                    onChange={(e) =>
                      setPublisherFilter(e.target.value as OfficialPublisher | 'ALL')
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="ALL">Tous les éditeurs officiels (5)</option>
                    <option value="Legifrance">Légifrance (CGI / Lois)</option>
                    <option value="BOFiP">BOFiP-Impôts (Doctrine DGFiP)</option>
                    <option value="impots.gouv.fr">impots.gouv.fr (DGFiP)</option>
                    <option value="Service-Public Particuliers">
                      Service-Public Particuliers (DILA)
                    </option>
                    <option value="economie.gouv.fr">economie.gouv.fr (Bercy)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Thématique fiscale (12 domaines)
                  </label>
                  <select
                    value={topicFilter}
                    onChange={(e) =>
                      setTopicFilter(e.target.value as PersonalTaxKnowledgeTopic | 'ALL')
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="ALL">Toutes les thématiques (12)</option>
                    {(Object.keys(TOPIC_LABELS_FR) as PersonalTaxKnowledgeTopic[]).map((t) => (
                      <option key={t} value={t}>
                        {TOPIC_LABELS_FR[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Niveau normatif
                  </label>
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value as NormativeTier | 'ALL')}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="ALL">Tous les niveaux normatifs</option>
                    <option value="LEGISLATION_CGI_LOI">Législation (CGI / Loi)</option>
                    <option value="DOCTRINE_BOFIP">Doctrine administrative (BOFiP)</option>
                    <option value="EXPLICATION_OFFICIELLE_ADMINISTRATION">
                      Explication officielle administration
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Année des revenus applicable
                  </label>
                  <select
                    value={String(incomeYearFilter)}
                    onChange={(e) =>
                      setIncomeYearFilter(
                        e.target.value === '2025'
                          ? 2025
                          : e.target.value === '2024'
                            ? 2024
                            : 'ALL'
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="ALL">Toutes années (Revenus 2025 & 2024)</option>
                    <option value="2025">Revenus 2025 (Déclaration 2026)</option>
                    <option value="2024">Revenus 2024 (Déclaration 2025 — Historique)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Statut de vérification
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as SourceVerificationStatus | 'ALL')
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="ALL">Tous les statuts</option>
                    <option value="APPROVED_VERIFIED">Approuvée & Vérifiée (Autorisée IA)</option>
                    <option value="PENDING_REVIEW">En attente de revue (Bloquée IA)</option>
                    <option value="ARCHIVED_HISTORICAL">Archivée — Historique</option>
                    <option value="REJECTED">Rejetée</option>
                  </select>
                </div>
              </div>

              {/* Tableau du registre des sources avec actions d'administration */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                      <th className="py-3 px-3.5">Titre, Référence & Éditeur</th>
                      <th className="py-3 px-3">Thématique & Niveau</th>
                      <th className="py-3 px-3">Dates de provenance</th>
                      <th className="py-3 px-3">Millésime & Version</th>
                      <th className="py-3 px-3">Statut de vérification</th>
                      <th className="py-3 px-3.5 text-right">
                        Actions d’administration (Revue)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredSources.map((doc) => {
                      const statusMeta = STATUS_BADGE_MAP[doc.verificationStatus];
                      const tierMeta = NORMATIVE_TIER_LABELS_FR[doc.normativeTier];
                      const isSelected = selectedSource?.id === doc.id;

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedSourceId(doc.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3.5 px-3.5 align-top max-w-xs">
                            <div className="font-bold text-slate-900 leading-snug">
                              {doc.title}
                            </div>
                            <div className="text-[11px] text-slate-600 font-mono mt-1">
                              {doc.officialReference}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {doc.publisher}
                              </span>
                              <a
                                href={doc.officialUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                              >
                                Source officielle <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 align-top">
                            <div className="font-semibold text-slate-800 text-[11px]">
                              {TOPIC_LABELS_FR[doc.topic]}
                            </div>
                            <span
                              className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded border ${tierMeta.badgeClass}`}
                            >
                              {tierMeta.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 align-top font-mono text-[11px] text-slate-600 space-y-0.5">
                            <div>Publiée : {doc.publicationDate}</div>
                            <div>Modifiée : {doc.modificationDate}</div>
                            <div>Collectée : {doc.retrievalDate}</div>
                            <div className="text-emerald-800 font-semibold">
                              Effet : {doc.effectiveDate}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 align-top">
                            <div className="font-semibold text-slate-900 text-[11px]">
                              Revenus {doc.applicableIncomeYear}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Déclaration {doc.applicableTaxYear}
                            </div>
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono text-[10px] font-semibold">
                              <History className="w-3 h-3" /> v{doc.versionNumber} (
                              {doc.historicalVersions.length} archive
                              {doc.historicalVersions.length > 1 ? 's' : ''})
                            </div>
                          </td>

                          <td className="py-3.5 px-3 align-top">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${statusMeta.className}`}
                            >
                              {statusMeta.authoritative ? (
                                <FileCheck2 className="w-3.5 h-3.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              )}
                              {statusMeta.label}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {doc.reviewedBy}
                            </div>
                          </td>

                          <td
                            className="py-3.5 px-3.5 align-top text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {doc.verificationStatus !== 'APPROVED_VERIFIED' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveSource(doc)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                                  title="Approuver et autoriser pour les réponses faisant foi"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Approuver
                                </button>
                              )}
                              {doc.verificationStatus !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleRejectSource(doc)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                                  title="Rejeter et exclure des réponses de l'assistant"
                                >
                                  <XCircle className="w-3 h-3" /> Rejeter
                                </button>
                              )}
                              {doc.verificationStatus !== 'ARCHIVED_HISTORICAL' && (
                                <button
                                  type="button"
                                  onClick={() => handleArchiveSource(doc)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-colors"
                                  title="Archiver à titre historique"
                                >
                                  <Archive className="w-3 h-3" /> Archiver
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openVersionUpdateModal(doc)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                title="Mettre à jour en créant une nouvelle version sans écraser l'historique"
                              >
                                <GitBranchPlus className="w-3 h-3" /> Nouvelle version
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panneau d'inspection détaillée de la source sélectionnée : Texte légal vs Vulgarisation & Historique des versions */}
            {selectedSource && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-mono uppercase text-emerald-700 font-semibold">
                        Inspection de provenance & séparation normative — ID : {selectedSource.id}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {selectedSource.title}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      Version active v{selectedSource.versionNumber}
                    </span>
                  </div>

                  {/* Bloc 1 : Texte légal / Doctrine opposable */}
                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                        1. Texte normatif / Doctrine officielle ({selectedSource.publisher})
                      </span>
                      <span className="text-[11px] font-mono text-indigo-700">
                        {selectedSource.officialReference}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                      {selectedSource.normativeExcerpt}
                    </p>
                  </div>

                  {/* Bloc 2 : Explication en français simple */}
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                      2. Synthèse explicative vérifiée (Français courant)
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      {selectedSource.plainFrenchSummary}
                    </p>
                  </div>

                  {/* Bloc 3 : Note pédagogique FISCALIQ & Exemple */}
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      3. Contenu pédagogique & Exemple chiffré FISCALIQ (Non opposable, à vocation explicative)
                    </span>
                    <p className="text-xs text-amber-950 leading-relaxed">
                      <strong>Conseil pédagogique :</strong> {selectedSource.fiscaliqEducationalNotes}
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed pt-1">
                      <strong>Exemple :</strong> {selectedSource.simpleExample}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>Licence & Droits :</strong> {selectedSource.copyrightAndAccessNotice}
                    </span>
                    <span>
                      <strong>Mode d’acquisition :</strong>{' '}
                      {selectedSource.ingestionMethod === 'LEGIFRANCE_BOFIP_OPEN_DATA_EXTRACT'
                        ? 'Extraction Open Data Légifrance / BOFiP'
                        : 'Curation manuelle sur publication publique officielle'}
                    </span>
                  </div>
                </div>

                {/* Historique immuable des versions antérieures */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-base font-bold text-slate-900">
                        Historique immuable des versions ({selectedSource.historicalVersions.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => openVersionUpdateModal(selectedSource)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                      <GitBranchPlus className="w-3.5 h-3.5" /> Créer v
                      {selectedSource.versionNumber + 1}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Conformément aux règles d’auditabilité fiscale de FISCALIQ, aucune règle d’une
                    année antérieure n’est écrasée silencieusement. Toute modification crée une
                    nouvelle version et archive la version précédente avec ses dates d’effet.
                  </p>

                  {selectedSource.historicalVersions.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                      Cette source est actuellement en <strong>version initiale v1</strong>. Cliquez
                      sur « Créer v2 » ci-dessus pour tester la création d’une nouvelle version avec
                      archivage automatique de la v1.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedSource.historicalVersions.map((hist) => (
                        <div
                          key={hist.versionNumber}
                          className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px] font-semibold">
                              Archive v{hist.versionNumber} — Revenus {hist.applicableIncomeYear} (Décl.{' '}
                              {hist.applicableTaxYear})
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              Archivée le {hist.archivedDate}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-indigo-800">
                            {hist.officialReference}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {hist.normativeExcerpt}
                          </p>
                          <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">
                            <strong>Motif du changement :</strong> {hist.changeReason}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modale de mise à jour versionnée sans écrasement */}
            {isUpdateModalOpen && selectedSource && (
              <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-xs font-semibold text-indigo-700 uppercase">
                        Mise à jour versionnée sans écrasement
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        Créer la version v{selectedSource.versionNumber + 1} (archive automatiquement la v
                        {selectedSource.versionNumber})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsUpdateModalOpen(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Fermer
                    </button>
                  </div>

                  <form onSubmit={handleCreateNewVersion} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Référence légale ou doctrinale (CGI / BOFiP)
                      </label>
                      <input
                        type="text"
                        value={updateReferenceText}
                        onChange={(e) => setUpdateReferenceText(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Synthèse vérifiée mise à jour (Français courant)
                      </label>
                      <textarea
                        rows={4}
                        value={updateSummaryText}
                        onChange={(e) => setUpdateSummaryText(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Motif juridique de la nouvelle version (journal d’audit)
                      </label>
                      <input
                        type="text"
                        value={updateReasonText}
                        onChange={(e) => setUpdateReasonText(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsUpdateModalOpen(false)}
                        className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                      >
                        Enregistrer v{selectedSource.versionNumber + 1} & Archiver v
                        {selectedSource.versionNumber}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            ONGLET 2 : RECHERCHE SÉMANTIQUE, CHUNKING, EMBEDDINGS & PGVECTOR
           ===================================================================== */}
        {activeTab === 'SEMANTIC_SEARCH_PGVECTOR' && (
          <div className="space-y-6">
            {/* Simulateur de recherche sémantique hybride avec filtrage de métadonnées */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-base font-bold text-slate-900">
                      Testeur de recherche sémantique & filtrage de métadonnées (Sources APPROVED_VERIFIED uniquement)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Interroge les segments vectorisés (chunks) avec filtrage strict sur{' '}
                    <code className="font-mono bg-slate-100 px-1 rounded">
                      verification_status = &apos;APPROVED_VERIFIED&apos;
                    </code>
                    , année des revenus, éditeur officiel et thématique.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Requête fiscale en langage naturel
                  </label>
                  <input
                    type="text"
                    value={semanticQuery}
                    onChange={(e) => setSemanticQuery(e.target.value)}
                    placeholder="Ex. : Quel est le plafond des frais de garde d'enfant ou du déficit foncier ?"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 bg-white"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Année des revenus
                  </label>
                  <select
                    value={String(searchIncomeYear)}
                    onChange={(e) =>
                      setSearchIncomeYear(
                        e.target.value === '2025'
                          ? 2025
                          : e.target.value === '2024'
                            ? 2024
                            : 'ALL'
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="2025">Revenus 2025 (Décl. 2026)</option>
                    <option value="2024">Revenus 2024 (Décl. 2025)</option>
                    <option value="ALL">Toutes années</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Thématique
                  </label>
                  <select
                    value={searchTopicFilter}
                    onChange={(e) =>
                      setSearchTopicFilter(e.target.value as PersonalTaxKnowledgeTopic | 'ALL')
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="ALL">Toutes thématiques</option>
                    {(Object.keys(TOPIC_LABELS_FR) as PersonalTaxKnowledgeTopic[]).map((t) => (
                      <option key={t} value={t}>
                        {TOPIC_LABELS_FR[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Éditeur officiel
                  </label>
                  <select
                    value={searchPublisherFilter}
                    onChange={(e) =>
                      setSearchPublisherFilter(e.target.value as OfficialPublisher | 'ALL')
                    }
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900 bg-white"
                  >
                    <option value="ALL">Tous éditeurs</option>
                    <option value="Legifrance">Légifrance</option>
                    <option value="BOFiP">BOFiP</option>
                    <option value="impots.gouv.fr">impots.gouv.fr</option>
                    <option value="Service-Public Particuliers">Service-Public</option>
                    <option value="economie.gouv.fr">economie.gouv.fr</option>
                  </select>
                </div>
              </div>

              {/* Résultats des segments (chunks) classés par score hybride */}
              <div className="space-y-3 pt-2">
                {semanticResults.map((res) => {
                  const tierInfo = NORMATIVE_TIER_LABELS_FR[res.chunk.sectionTier];
                  return (
                    <div
                      key={res.chunk.chunkId}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[10px] font-bold">
                            {res.chunk.publisher} • Revenus {res.chunk.applicableIncomeYear}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${tierInfo.badgeClass}`}
                          >
                            {tierInfo.label}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Vérifié : {res.chunk.verificationStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span className="text-slate-600">
                            Cosinus : <strong>{res.semanticSimilarity}</strong>
                          </span>
                          <span className="text-slate-600">
                            Lexical : <strong>{res.keywordScore}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                            Score RAG : {res.combinedScore}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-slate-900">
                        {res.chunk.sectionHeading}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {res.chunk.chunkText}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                        <span className="font-mono">
                          Chunk ID : {res.chunk.chunkId} (~{res.chunk.tokenEstimate} tokens)
                        </span>
                        <a
                          href={res.chunk.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                        >
                          {res.chunk.officialReference} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inspecteur d'extraction, découpage (chunking) et génération d'embeddings serveur */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Découpage sémantique (Chunking) & Embeddings (`gemini-embedding-2`)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Source inspectée : <strong>{selectedSource?.title}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunServerEmbeddingInspection}
                    disabled={isInspectingEmbedding}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#10B981] text-white hover:bg-[#059669] shadow-xs disabled:opacity-50"
                  >
                    {isInspectingEmbedding
                      ? 'Calcul vectoriel...'
                      : 'Tester l’extraction & Embedding serveur'}
                  </button>
                </div>

                {embeddingInspectResult && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-emerald-950">
                      <span>Moteur d’embedding : {embeddingInspectResult.embeddingEngine}</span>
                      <span className="font-mono">
                        Dimensions : {embeddingInspectResult.vectorDimensions}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-700">
                      Citations détectées automatiquement :{' '}
                      <span className="font-mono font-semibold">
                        {embeddingInspectResult.detectedCitations.join(', ') || 'Aucune'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600 break-all">
                      Aperçu vecteur L2 : [{embeddingInspectResult.vectorPreview.join(', ')}, ...]
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {selectedSourceChunks.map((chunk) => (
                    <div
                      key={chunk.chunkId}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span>
                          Segment #{chunk.chunkIndex} ({chunk.sectionTier})
                        </span>
                        <span>~{chunk.tokenEstimate} tokens</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {chunk.sectionHeading}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{chunk.chunkText}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schéma SQL Supabase PostgreSQL + pgvector */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Schéma SQL Supabase PostgreSQL + <code className="font-mono">pgvector</code> & Fonction RPC{' '}
                    <code className="font-mono">match_verified_tax_chunks</code>
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ce schéma provisionne l’extension <code className="font-mono">vector</code>, la table
                  du registre des sources, la table immuable d’archivage des versions historiques,
                  l’index HNSW et la fonction RPC qui filtre strictement sur{' '}
                  <code className="font-mono">verification_status = &apos;APPROVED_VERIFIED&apos;</code>.
                </p>
                <pre className="bg-[#F8FAFC] text-slate-800 border border-[#E8EDF2] p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed max-h-[420px]">
                  {SUPABASE_PGVECTOR_KNOWLEDGE_BASE_SCHEMA}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ONGLET 3 : PRÉFÉRENCES DU FOYER, BARÈMES 2026/2025 & SÉCURITÉ RGPD
           ===================================================================== */}
        {activeTab === 'HOUSEHOLD_AND_BAREME' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Préférences d’affichage et de simulation
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Année fiscale par défaut des simulateurs
                  </label>
                  <select
                    value={defaultTaxYear}
                    onChange={(e) => setDefaultTaxYear(e.target.value as '2026' | '2025')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="2026">
                      Déclaration 2026 (sur les revenus perçus en 2025)
                    </option>
                    <option value="2025">
                      Déclaration 2025 (sur les revenus perçus en 2024)
                    </option>
                  </select>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={explainTermsAutomatically}
                    onChange={(e) => setExplainTermsAutomatically(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    Afficher automatiquement les explications simplifiées (quotient familial,
                    décote, différence entre réduction et crédit d’impôt) sur le tableau de bord.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  Enregistrer mes préférences
                </button>

                {savedNotice && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Vos préférences d’affichage ont été enregistrées.
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Protection de vos données (RGPD) & Conformité Légale
                  </h2>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  FISCALIQ applique le principe de minimisation des données et le respect strict des
                  conditions de réutilisation des informations publiques (Licence Ouverte Etalab 2.0) :
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Aucun mot de passe fiscal :</strong> nous ne demandons jamais vos
                      identifiants impots.gouv.fr ni vos coordonnées bancaires.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Pas de scraping abusif ni d’API inventée :</strong> les sources
                      réglementaires proviennent exclusivement des publications officielles publiques
                      autorisées et sont soumises à validation humaine.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-4">
                  <Scale className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Barèmes officiels de l’impôt sur le revenu versionnés (CGI Art. 197)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Tranches pour 1 part de quotient familial utilisées par le moteur déterministe
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">
                        Millésime 2026 (Revenus 2025)
                      </span>
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        v2026.1
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700 font-mono">
                      <li>0 % : jusqu’à 11 600 €</li>
                      <li>11 % : de 11 601 € à 29 579 €</li>
                      <li>30 % : de 29 580 € à 84 577 €</li>
                      <li>41 % : de 84 578 € à 181 917 €</li>
                      <li>45 % : au-delà de 181 917 €</li>
                    </ul>
                    <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                      <div>
                        Plafond demi-part : <strong>1 807 €</strong>
                      </div>
                      <div>
                        Abattement 10 % max : <strong>14 555 €</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">
                        Millésime 2025 (Revenus 2024)
                      </span>
                      <span className="text-[11px] font-mono text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        v2025.1
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700 font-mono">
                      <li>0 % : jusqu’à 11 497 €</li>
                      <li>11 % : de 11 498 € à 29 315 €</li>
                      <li>30 % : de 29 316 € à 83 823 €</li>
                      <li>41 % : de 83 824 € à 180 294 €</li>
                      <li>45 % : au-delà de 180 294 €</li>
                    </ul>
                    <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                      <div>
                        Plafond demi-part : <strong>1 791 €</strong>
                      </div>
                      <div>
                        Abattement 10 % max : <strong>14 426 €</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Isolation de votre foyer fiscal (Row-Level Security Supabase)
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Schéma PostgreSQL garantissant que chaque foyer fiscal ne peut lire et modifier
                  que son propre profil (<code className="font-mono">auth.uid() = user_id</code>) :
                </p>
                <pre className="bg-[#F8FAFC] text-slate-800 border border-[#E8EDF2] p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {PERSONAL_TAX_SUPABASE_RLS_SCHEMA}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 4 : AUDIT SÉCURITÉ, ISOLATION & DROITS RGPD */}
        {activeTab === 'SECURITY_AND_GDPR_AUDIT' && (
          <div className="space-y-6">
            {/* Exercice des droits RGPD en direct (Art. 15, 17, 20) */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-700">
                    EXERCICE TECHNIQUE DES DROITS RGPD · FOYER ACTIF : {activeHousehold.householdName}
                  </div>
                  <h2 className="text-lg font-bold text-[#101827] mt-1">
                    Droit d’accès, de portabilité (Art. 15 &amp; 20) et Droit à l’effacement immédiat (Art. 17)
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                    Testez en direct l’export structuré de vos données fiscales personnelles ou la suppression immédiate des rapports PDF stockés dans le compartiment privé Supabase Storage pour votre foyer authentifié (<code className="font-mono">{activeHousehold.id}</code>).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isRunningGdprAction}
                    onClick={handleGdprExport}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#10B981] text-white text-xs font-semibold hover:bg-[#059669] shadow-xs transition-colors disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    Exporter mes données (Art. 15 &amp; 20)
                  </button>
                  <button
                    type="button"
                    disabled={isRunningGdprAction}
                    onClick={handleGdprErasure}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-900 text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-60"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Purger mes rapports PDF privés (Art. 17)
                  </button>
                </div>
              </div>

              {gdprErasureResult && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{gdprErasureResult}</span>
                </div>
              )}

              {gdprExportPreview && (
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-[#101827]">
                    Aperçu du paquet d’export JSON (Art. 15 &amp; 20 RGPD) :
                  </div>
                  <pre className="bg-[#F8FAFC] text-emerald-950 border border-[#E8EDF2] p-4 rounded-lg text-[11px] font-mono overflow-x-auto max-h-72">
                    {gdprExportPreview}
                  </pre>
                </div>
              )}
            </div>

            {/* Constats d'audit de sécurité (Critique / Élevé / Moyen / Faible) */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-[#101827]">
                    Journal d’audit de sécurité en production (0 vulnérabilité critique ouverte)
                  </h2>
                </div>
                <Link
                  href="/privacy"
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Consulter la Notice RGPD complète &amp; le Criblage AIPD →
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {SECURITY_AUDIT_FINDINGS_REGISTRY.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            finding.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-900'
                              : finding.severity === 'HIGH'
                                ? 'bg-amber-100 text-amber-900'
                                : finding.severity === 'MEDIUM'
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {finding.severity} · {finding.id}
                        </span>
                        <span className="text-xs font-bold text-[#101827]">
                          {finding.titleFr}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          finding.status === 'REMEDIATED_VERIFIED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {finding.status === 'REMEDIATED_VERIFIED'
                          ? 'CORRIGÉ & VÉRIFIÉ'
                          : 'PRÉREQUIS DÉPLOIEMENT PRODUCTION'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{finding.descriptionFr}</p>
                    <p className="text-xs text-emerald-900 bg-emerald-50/70 border border-emerald-200 rounded p-2">
                      <strong>Remédiation :</strong> {finding.remediationAppliedFr}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Liste de contrôle RGPD & Schéma SQL RLS des conversations et droits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-[#101827]">
                  Liste de contrôle RGPD &amp; Criblage AIPD ({GDPR_IMPLEMENTATION_CHECKLIST.length} points)
                </h3>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {GDPR_IMPLEMENTATION_CHECKLIST.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-[#101827]">
                          {item.gdprArticle}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            item.technicalImplementationStatus === 'IMPLEMENTED_IN_CODE'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {item.technicalImplementationStatus === 'IMPLEMENTED_IN_CODE'
                            ? 'Implémenté'
                            : 'Validation DPO requise'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        {item.requirementTitleFr}
                      </div>
                      <p className="text-[11px] text-slate-600">{item.detailsFr}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-[#101827]">
                  Schéma SQL RLS : Conversations IA, Droits RGPD &amp; Révocation Anon
                </h3>
                <pre className="bg-[#F8FAFC] text-slate-800 border border-[#E8EDF2] p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed">
                  {SUPABASE_GDPR_AND_CONVERSATIONS_RLS_SCHEMA}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
