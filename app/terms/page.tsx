import React from 'react';
import { PublicShell } from '@/components/layout/public-shell';

export default function TermsPage() {
  return (
    <PublicShell>
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-16 space-y-3">
          <p className="text-xs font-semibold text-[#10B981]">
            Cadre d’utilisation et avertissement pédagogique
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#101827]">
            Conditions Générales d’Utilisation (CGU)
          </h1>
          <p className="text-xs text-slate-500">
            Version applicable à la plateforme particuliers FISCALIQ · Droit français
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-14 space-y-8 text-sm text-slate-700 leading-relaxed">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-[#101827]">
              1. Nature du service : Outil pédagogique et simulateur d’aide à la décision
            </h2>
            <p>
              FISCALIQ met à disposition des particuliers et des foyers vivant en France un outil logiciel permettant de comprendre le fonctionnement de l’impôt sur le revenu, d’estimer le salaire net après prélèvement à la source et d’identifier les réductions et crédits d’impôt prévus par la loi.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-[#101827]">
              2. Indépendance vis-à-vis de l’administration fiscale et absence de conseil juridique réglementé
            </h2>
            <p>
              FISCALIQ n’est pas un service public officiel et n’est pas affilié à la Direction générale des Finances publiques (DGFiP). Conformément à la loi n° 71-1130 du 31 décembre 1971, les simulations, estimations et explications fournies par FISCALIQ ont une valeur strictement pédagogique et informative : elles ne remplacent ni votre déclaration officielle sur <strong>impots.gouv.fr</strong>, ni votre avis d’imposition, ni une consultation personnalisée délivrée par un avocat fiscaliste.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-[#101827]">
              3. Exactitude des barèmes et responsabilité de l’utilisateur
            </h2>
            <p>
              Bien que nos moteurs de calcul utilisent les barèmes officiels publiés par l’administration française (barème progressif de l’impôt sur le revenu selon l’article 197 du CGI, plafonds de quotient familial, décote et abattement de 10 %), l’impôt définitivement dû dépend de l’ensemble des éléments déclarés par votre foyer fiscal auprès de la DGFiP.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
