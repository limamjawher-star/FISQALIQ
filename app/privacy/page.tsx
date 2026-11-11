import React from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/layout/public-shell';
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
  Trash2,
} from 'lucide-react';

export default function PrivacyPage() {
  return (
    <PublicShell>
      {/* En-tête éditorial (Clean White Theme) */}
      <section className="bg-white text-[#172033] border-b border-[#E8EDF2]">
        <div className="max-w-5xl mx-auto px-6 py-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            NOTICE D’INFORMATION RGPD (ART. 13 &amp; 14) · CRIBLAGE AIPD (ART. 35) · SÉCURITÉ DES DONNÉES
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#172033]">
            Politique de confidentialité, sécurité des données fiscales et gouvernance RGPD
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            FISCALIQ est conçu selon les principes de minimisation des données (<em>Privacy by Design</em>) et d’isolation stricte par foyer fiscal. Cette page détaille les données traitées, les bases légales envisagées, les durées de conservation, les sous-traitants techniques, le criblage d’Analyse d’Impact (AIPD) et les modalités d’exercice de vos droits.
          </p>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Avertissement de transparence juridique :</strong> Les contrôles techniques de sécurité, de minimisation et d’isolation décrits ci-dessous sont implémentés et vérifiés dans le code. Conformément aux bonnes pratiques d’ingénierie, cette documentation technique ne constitue pas un avis juridique et <strong>FISCALIQ ne revendique pas une conformité RGPD certifiée sans validation formelle par un Délégué à la Protection des Données (DPO) ou un cabinet d’avocats spécialisé</strong> avant l’ouverture commerciale.
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12 space-y-10 text-sm text-slate-700 leading-relaxed">
        {/* 1. Minimisation des données (Art. 5-1-c) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-bold text-[#101827]">
              1. Principe de minimisation des données (Article 5-1-c du RGPD)
            </h2>
          </div>
          <p>
            Pour estimer votre impôt sur le revenu, votre quotient familial, votre prélèvement à la source ou vos droits aux réductions et crédits d’impôt, FISCALIQ ne traite que les paramètres strictement nécessaires au calcul mathématique.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider font-mono">
                Données strictement nécessaires au calcul
              </div>
              <ul className="space-y-1.5 text-xs text-emerald-900">
                <li>• Situation familiale déclarative (célibataire, marié/pacsé, parent isolé, nombre de personnes à charge).</li>
                <li>• Montants annuels ou mensuels de revenus (salaires nets imposables, pensions, loyers, charges déductibles).</li>
                <li>• Dépenses éligibles aux réductions ou crédits d’impôt (garde d’enfant, emploi à domicile, dons, PER).</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="text-xs font-bold text-rose-950 uppercase tracking-wider font-mono">
                Données strictement interdites &amp; masquées automatiquement
              </div>
              <ul className="space-y-1.5 text-xs text-rose-900">
                <li>• <strong>Numéro de sécurité sociale (NIR)</strong> à 13 ou 15 chiffres.</li>
                <li>• <strong>Numéro fiscal de référence (SPI à 13 chiffres)</strong> et <strong>mot de passe impots.gouv.fr</strong>.</li>
                <li>• <strong>Coordonnées bancaires (IBAN, numéro de carte bancaire PAN/CVV)</strong>.</li>
                <li>• <strong>Adresse postale exacte</strong> ou copie de pièce d’identité.</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Si un utilisateur saisit par inadvertance un NIR, un numéro fiscal SPI, un IBAN ou un numéro de carte dans une question posée à l’Assistant IA, le filtre serveur <code>enforceDataMinimizationOnInput</code> le détecte et le masque automatiquement (<code>[MASQUÉ_MINIMISATION_RGPD]</code>) avant tout traitement.
          </p>
        </div>

        {/* 2. Bases légales (Art. 6-1) & Finalités */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-bold text-[#101827]">
              2. Finalités et bases légales envisagées (Article 6-1 du RGPD)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#101827]">
                  <th className="py-3 px-3 font-bold">Finalité du traitement</th>
                  <th className="py-3 px-3 font-bold">Base légale RGPD (Art. 6-1)</th>
                  <th className="py-3 px-3 font-bold">Durée de conservation technique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-3 font-semibold text-[#101827]">
                    Simulation de l’impôt sur le revenu, du salaire net et génération des rapports PDF
                  </td>
                  <td className="py-3 px-3">
                    Exécution de mesures précontractuelles ou du contrat d’utilisation (Art. 6-1-b)
                  </td>
                  <td className="py-3 px-3 font-mono">
                    Session active · Liens PDF signés 15 min · Purge à la demande (Art. 17)
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-[#101827]">
                    Personnalisation optionnelle des réponses de l’Assistant IA avec le profil du foyer
                  </td>
                  <td className="py-3 px-3">
                    Consentement explicite et révocable à chaque question via l’interrupteur dédié (Art. 6-1-a)
                  </td>
                  <td className="py-3 px-3 font-mono">
                    Expiration automatique prévue à 30 jours ou suppression immédiate
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-[#101827]">
                    Protection contre les abus, limitation de débit (Rate Limiting) et prévention des injections
                  </td>
                  <td className="py-3 px-3">
                    Intérêt légitime de sécurité du système d’information (Art. 6-1-f)
                  </td>
                  <td className="py-3 px-3 font-mono">
                    Fenêtre glissante en mémoire (60 secondes) · Journaux sécurité 90 jours max
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-[#101827]">
                    Traitement des demandes d’exercice des droits RGPD (Accès, Portabilité, Effacement)
                  </td>
                  <td className="py-3 px-3">
                    Respect d’une obligation légale (Art. 6-1-c et Art. 12 à 22 RGPD)
                  </td>
                  <td className="py-3 px-3 font-mono">
                    Certificat technique d’exécution immédiat
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Isolation par foyer, Sous-traitants & Transferts internationaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#10B981]" />
              <h2 className="text-base font-bold text-[#101827]">
                3. Isolation stricte des données par foyer fiscal
              </h2>
            </div>
            <p className="text-xs leading-relaxed">
              Chaque profil de foyer, simulation, conversation et rapport PDF est rattaché à un identifiant de foyer unique vérifié côté serveur. Toute tentative d’accès croisé entre deux foyers est rejetée avec un statut HTTP <code>403 Forbidden</code>. En base PostgreSQL Supabase, les politiques Row-Level Security (<code>auth.uid() = user_id</code>) et la révocation des privilèges anonymes (<code>REVOKE ALL FROM anon</code>) interdisent toute lecture par un tiers.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-[#10B981]" />
              <h2 className="text-base font-bold text-[#101827]">
                4. Sous-traitants (Art. 28) &amp; Transferts internationaux
              </h2>
            </div>
            <p className="text-xs leading-relaxed">
              L’architecture cible repose sur : (1) <strong>Supabase PostgreSQL &amp; Storage privé</strong> (hébergement recommandé dans l’Union européenne : Irlande <code>eu-west-1</code> ou Francfort <code>eu-central-1</code>), (2) <strong>Google Cloud / Gemini API</strong> exécuté exclusivement côté serveur pour l’analyse documentaire (sans jamais exposer de clé API au navigateur), et (3) l’hébergement applicatif en région <code>europe-west1</code>. Aucune donnée n’est vendue ni partagée avec des courtiers ou annonceurs.
            </p>
          </div>
        </div>

        {/* 5. Criblage AIPD / DPIA (Art. 35 RGPD) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-bold text-[#101827]">
              5. Criblage d’Analyse d’Impact relative à la Protection des Données (AIPD / DPIA — Art. 35 RGPD)
            </h2>
          </div>
          <p className="text-xs leading-relaxed">
            Selon les lignes directrices de la CNIL et du Comité Européen de la Protection des Données (CEPD), une AIPD est requise lorsqu’un traitement réunit au moins deux des neuf critères de risque élevé. Le criblage technique de FISCALIQ identifie :
          </p>
          <ul className="space-y-2 text-xs">
            <li className="flex items-start gap-2">
              <span className="font-mono font-bold text-[#101827]">Critère 1 (Données à caractère hautement personnel / financières) :</span>
              <span>Traitement de données de revenus, de charges familiales et d’imposition des ménages.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono font-bold text-[#101827]">Critère 2 (Usage innovant d’un système d’IA documentaire) :</span>
              <span>Utilisation d’un modèle de langage (RAG sur sources officielles) combiné à un moteur de calcul déterministe.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono font-bold text-emerald-700">Absence de décision automatisée au sens de l’Article 22 RGPD :</span>
              <span>FISCALIQ est un outil d’aide à la compréhension et de simulation pédagogique : il ne soumet aucune déclaration à la DGFiP et ne produit aucun effet juridique automatisé.</span>
            </li>
          </ul>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <strong>Conclusion du criblage AIPD :</strong> Bien que les risques soient réduits par la minimisation stricte (absence de NIR/SPI/IBAN) et le calcul déterministe, la validation formelle d’une AIPD (Art. 35 RGPD) par le responsable de traitement et son DPO est inscrite comme prérequis obligatoire avant la mise en production publique.
          </div>
        </div>

        {/* 6. Liste de contrôle d'implémentation RGPD */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-[#10B981]" />
              <h2 className="text-lg font-bold text-[#101827]">
                6. Liste de contrôle de mise en œuvre RGPD &amp; Sécurité ({GDPR_IMPLEMENTATION_CHECKLIST.length} exigences)
              </h2>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#10B981] text-white text-xs font-semibold hover:bg-[#059669] shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
              Exercer mes droits RGPD (Export Art. 15/20 &amp; Effacement Art. 17)
            </Link>
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
                        ? 'CONTRÔLE TECHNIQUE ACTIF DANS LE CODE'
                        : 'VALIDATION JURIDIQUE / DPO REQUISE AVANT PRODUCTION'}
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
                      ? 'CORRIGÉ & VÉRIFIÉ PAR TEST AUTOMATISÉ'
                      : 'PRÉREQUIS DÉPLOIEMENT SUPABASE PRODUCTION'}
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
