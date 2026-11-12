import React from 'react';
import { PublicShell } from '@/components/layout/public-shell';
import { ExpandableDetail } from '@/components/ui/design-system';
import {
  GDPR_IMPLEMENTATION_CHECKLIST,
  SECURITY_AUDIT_FINDINGS_REGISTRY,
} from '@/lib/security/security-audit-and-gdpr';
import {
  ShieldCheck,
  Lock,
  Database,
  Scale,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Server,
  UserCheck,
} from 'lucide-react';

export default function PrivacyPage() {
  return (
    <PublicShell>
      {/* En-tête éditorial (Clean White Theme) */}
      <section className="bg-white text-[#172033] border-b border-[#E8EDF2]">
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            PROTECTION DE VOS DONNÉES PERSONNELLES · TRANSPARENCE TECHNIQUE
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#172033]">
            Politique de confidentialité et état réel des contrôles techniques
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Cette page décrit uniquement ce qui est effectivement implémenté et actif dans le code de FISCALIQ aujourd’hui, en distinguant clairement le fonctionnement actuel de l’application et les briques prêtes pour un déploiement en production.
          </p>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div>
                <strong>Transparence sur l’état d’implémentation :</strong> Votre profil et vos simulations sont actuellement enregistrés localement dans votre navigateur (<code>localStorage</code>) avec un bouton « Effacer mes données » immédiat. Les schémas SQL Supabase et l’adaptateur Redis/Supabase sont fournis dans le code mais nécessitent la configuration de vos variables d’environnement serveur en production.
              </div>
              <ExpandableDetail summary="Détails" officialRef="RGPD Art. 13, 14 et 35">
                <p>
                  Ce document présente honnêtement l’architecture technique implémentée dans le dépôt. Il ne constitue pas un avis juridique ni une certification RGPD formelle par un Délégué à la Protection des Données (DPO).
                </p>
              </ExpandableDetail>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12 space-y-10 text-sm text-slate-700 leading-relaxed">
        {/* 1. Minimisation des données */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-bold text-[#101827]">
              1. Minimisation des données et masquage automatique côté serveur
            </h2>
          </div>
          <p>
            Pour estimer votre impôt, vos parts fiscales ou votre salaire net, FISCALIQ utilise uniquement les montants nécessaires au calcul. Aucun mot de passe fiscal ni coordonnée bancaire n’est demandé.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider font-mono">
                Données utilisées pour vos simulations
              </div>
              <ul className="space-y-1.5 text-xs text-emerald-900">
                <li>• Situation familiale déclarative (célibataire, marié/pacsé, parent isolé, nombre de personnes à charge).</li>
                <li>• Montants annuels ou mensuels de revenus (salaires nets imposables, pensions, loyers, charges déductibles).</li>
                <li>• Dépenses éligibles aux réductions ou crédits d’impôt (garde d’enfant, emploi à domicile, dons, PER).</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="text-xs font-bold text-rose-950 uppercase tracking-wider font-mono">
                Données filtrées automatiquement côté serveur
              </div>
              <ul className="space-y-1.5 text-xs text-rose-900">
                <li>• <strong>Numéro de sécurité sociale (NIR)</strong> à 13 ou 15 chiffres.</li>
                <li>• <strong>Numéro fiscal de référence (SPI à 13 chiffres)</strong> et <strong>mot de passe impots.gouv.fr</strong>.</li>
                <li>• <strong>Coordonnées bancaires (IBAN, numéro de carte bancaire PAN/CVV)</strong>.</li>
                <li>• <strong>Adresse email ou téléphone</strong> saisis par erreur dans une question.</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Lorsqu’une question est envoyée à l’Assistant fiscal, la fonction serveur <code>enforceDataMinimizationOnInput</code> détecte et remplace par expressions régulières les NIR, numéros SPI, IBAN et numéros de carte (<code>[MASQUÉ_MINIMISATION_RGPD]</code>) avant tout appel à l’API Gemini.
          </p>
        </div>

        {/* 2. Stockage réel et durée de conservation */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-bold text-[#101827]">
              2. Où et comment vos données sont stockées aujourd’hui
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#101827]">
                  <th className="py-3 px-3 font-bold">Fonctionnalité</th>
                  <th className="py-3 px-3 font-bold">Implémentation actuelle dans l’application</th>
                  <th className="py-3 px-3 font-bold">Contrôle d’effacement / expiration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-3 font-semibold text-[#101827]">
                    Profil fiscal et simulations sauvegardées
                  </td>
                  <td className="py-3 px-3">
                    Stockés dans le <code>localStorage</code> de votre navigateur (<code>fiscaliq_user_household_v1</code> et <code>fiscaliq_saved_simulations_v1</code>). Les nouveaux visiteurs démarrent avec un profil vierge.
                  </td>
                  <td className="py-3 px-3 font-mono">
                    Bouton « Effacer mes données » immédiat dans l’interface
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-[#101827]">
                    Génération et téléchargement de rapports PDF
                  </td>
                  <td className="py-3 px-3">
                    Générés côté serveur à la demande et stockés en mémoire serveur de session, protégés par un jeton signé HMAC-SHA256 (<code>FISCALIQ_REPORT_SIGNING_SECRET</code>).
                  </td>
                  <td className="py-3 px-3 font-mono">
                    Lien signé valide 15 min · Purge serveur via API Art. 17
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-[#101827]">
                    Limitation de débit (Rate Limiting) et abonnements
                  </td>
                  <td className="py-3 px-3">
                    Gérés via l’adaptateur <code>shared-store.ts</code> : répliqués vers Upstash Redis ou Supabase PostgreSQL si les variables d’environnement sont configurées, sinon en mémoire locale du processus serveur.
                  </td>
                  <td className="py-3 px-3 font-mono">
                    Fenêtre de 60 secondes pour les compteurs de requêtes
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-[#101827]">
                    Questions posées à l’Assistant fiscal
                  </td>
                  <td className="py-3 px-3">
                    Traitées côté serveur après masquage automatique des identifiants sensibles. Le contexte du foyer n’est transmis que si l’option est activée.
                  </td>
                  <td className="py-3 px-3 font-mono">
                    Aucune persistance en base des conversations par défaut
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Session serveur, CSP & Base de connaissances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#10B981]" />
              <h2 className="text-base font-bold text-[#101827]">
                3. Session vérifiée côté serveur et isolation
              </h2>
            </div>
            <p className="text-xs leading-relaxed">
              Les routes API ne font jamais confiance aux en-têtes déclaratifs ni aux identifiants envoyés dans le corps des requêtes. Le foyer est résolu côté serveur via <code>resolveVerifiedHouseholdSession</code>.
            </p>
            <ExpandableDetail summary="Détails">
              <p>
                En production, un jeton de session signé HMAC-SHA256 est exigé. Dans l’environnement d’aperçu local, la session est rattachée au profil local de l’utilisateur (<code>foyer-utilisateur</code>) et rejette toute tentative d’accès à un identifiant tiers avec un statut HTTP 403.
              </p>
            </ExpandableDetail>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-[#10B981]" />
              <h2 className="text-base font-bold text-[#101827]">
                4. En-têtes de sécurité HTTP, CSP et administration
              </h2>
            </div>
            <p className="text-xs leading-relaxed">
              L’application applique un en-tête <code>Content-Security-Policy</code> dans <code>next.config.ts</code>, vérifie l’origine CSRF sur les routes POST et protège la base de connaissances fiscale par défaut.
            </p>
            <ExpandableDetail summary="Détails">
              <p>
                La route <code>POST /api/ai/knowledge-base</code> refuse par défaut toute modification sans jeton administrateur vérifié (<code>FISCALIQ_ADMIN_SESSION_TOKEN</code>), et <code>GET /api/ai/knowledge-base</code> ne renvoie que les sources au statut <code>APPROVED_VERIFIED</code> aux utilisateurs non-administrateurs.
              </p>
            </ExpandableDetail>
          </div>
        </div>

        {/* 5. Garanties de protection des données */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-bold text-[#101827]">
              5. Calculateur déterministe et absence de décision automatisée
            </h2>
          </div>
          <p className="text-xs leading-relaxed">
            FISCALIQ est un outil d’aide à la compréhension et de simulation pédagogique : tous les montants d’impôt, de décote, de quotient familial et de cotisations sont calculés par des fonctions déterministes en TypeScript, jamais par un modèle de langage.
          </p>
          <ul className="space-y-2 text-xs">
            <li className="flex items-start gap-2">
              <span className="font-mono font-bold text-[#101827]">Calculs vérifiables :</span>
              <span>Le barème progressif, le plafonnement du quotient familial et la décote sont calculés exactement selon les règles du Code général des impôts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono font-bold text-[#101827]">Sources officielles approuvées :</span>
              <span>L’assistant documentaire s’appuie exclusivement sur les extraits au statut <code>APPROVED_VERIFIED</code> (impots.gouv.fr, BOFiP, Légifrance, URSSAF).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono font-bold text-emerald-700">Contrôle humain permanent :</span>
              <span>Aucune déclaration n’est transmise automatiquement à l’administration fiscale.</span>
            </li>
          </ul>
        </div>

        {/* 6. Liste de contrôle d'implémentation RGPD */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-[#10B981]" />
              <h2 className="text-lg font-bold text-[#101827]">
                6. État des contrôles de confidentialité ({GDPR_IMPLEMENTATION_CHECKLIST.length} points)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {GDPR_IMPLEMENTATION_CHECKLIST.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#101827]">
                      {item.id} · {item.gdprArticle}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                        item.technicalImplementationStatus === 'IMPLEMENTED_IN_CODE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {item.technicalImplementationStatus === 'IMPLEMENTED_IN_CODE'
                        ? 'IMPLÉMENTÉ DANS LE CODE'
                        : 'PRÉREQUIS CONFIGURATION PRODUCTION / DPO'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#101827]">
                    {item.requirementTitleFr}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.detailsFr}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Synthèse des constats d'audit de sécurité applicative */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-bold text-[#101827]">
              7. Journal d’audit de sécurité applicative ({SECURITY_AUDIT_FINDINGS_REGISTRY.length} points inspectés)
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {SECURITY_AUDIT_FINDINGS_REGISTRY.map((finding) => (
              <div
                key={finding.id}
                className="p-4 rounded-lg border border-slate-200 bg-white space-y-1.5"
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
                              : 'bg-slate-100 text-slate-700'
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
                      ? 'IMPLÉMENTÉ DANS LE CODE'
                      : 'PRÉREQUIS DÉPLOIEMENT PRODUCTION'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{finding.descriptionFr}</p>
                <p className="text-xs text-emerald-900 bg-emerald-50/60 border border-emerald-200 rounded p-2.5">
                  <strong>Mesure appliquée :</strong> {finding.remediationAppliedFr}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
