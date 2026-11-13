import React from 'react';
import { PublicShell } from '@/components/layout/public-shell';

export default function TermsPage() {
  return (
    <PublicShell>
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-3">
          <p className="text-xs font-semibold text-[#10B981]">
            Cadre d’utilisation et mentions légales
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101827]">
            Conditions Générales d’Utilisation (CGU)
          </h1>
          <p className="text-xs text-slate-500">
            Applicables au simulateur fiscal FISCALIQ · Droit français
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-10 space-y-6 text-sm text-slate-700 leading-relaxed">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#101827]">
              1. Mentions légales de l’éditeur
            </h2>
            <p className="text-xs text-slate-600">
              Informations légales à renseigner par l’éditeur avant mise en ligne commerciale :
            </p>
            <ul className="space-y-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-4">
              <li>• <strong>Éditeur / Société :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
              <li>• <strong>Siège social :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
              <li>• <strong>SIREN / RCS :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
              <li>• <strong>Directeur de la publication :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
              <li>• <strong>Email de contact :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#101827]">
              2. Objet du service : simulation indicative et non contractuelle
            </h2>
            <p className="text-xs">
              FISCALIQ permet d’estimer l’impôt sur le revenu, le salaire net après prélèvement à la source et les principaux crédits et réductions d’impôt en France. Les résultats affichés sont des estimations indicatives et non contractuelles.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#101827]">
              3. Indépendance et absence de conseil fiscal personnalisé
            </h2>
            <p className="text-xs">
              FISCALIQ est un service privé indépendant et n’est pas affilié à la Direction générale des Finances publiques (DGFiP). Les informations et réponses fournies s’appuient sur les textes publics (impots.gouv.fr, Service-Public.fr, BOFiP) et ne remplacent ni votre avis d’imposition officiel ni les conseils d’un avocat fiscaliste.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#101827]">
              4. Formules Gratuit et Premium
            </h2>
            <p className="text-xs">
              L’accès au simulateur principal est gratuit. La formule Premium (5 € TTC / mois, sans engagement) sera activable dès l’ouverture du paiement sécurisé en ligne.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
