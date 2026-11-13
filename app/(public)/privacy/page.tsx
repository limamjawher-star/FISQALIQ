import React from 'react';
import { PublicShell } from '@/components/layout/public-shell';
import { ExpandableDetail } from '@/components/ui/design-system';
import {
  ShieldCheck,
  Lock,
  Scale,
  AlertTriangle,
  FileText,
  UserCheck,
} from 'lucide-react';

export default function PrivacyPage() {
  return (
    <PublicShell>
      <section className="bg-white text-[#172033] border-b border-[#E8EDF2]">
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            PROTECTION DE VOS DONNÉES PERSONNELLES (RGPD)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#172033]">
            Politique de confidentialité
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Cette page décrit uniquement ce qui est effectivement actif dans l’application aujourd’hui. Vos estimations sont enregistrées sur votre appareil et peuvent être effacées en un clic.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-10 space-y-6 text-sm text-slate-700 leading-relaxed">
        {/* 1. Responsable du traitement */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-base font-bold text-[#101827]">
              1. Identité du responsable de traitement et contact RGPD
            </h2>
          </div>
          <p className="text-xs text-slate-600">
            Les informations légales de l’éditeur doivent être complétées avant l’ouverture commerciale :
          </p>
          <ul className="space-y-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg p-4">
            <li>• <strong>Raison sociale :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
            <li>• <strong>Adresse du siège social :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
            <li>• <strong>Immatriculation SIREN / RCS :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
            <li>• <strong>Email de contact :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
            <li>• <strong>Contact protection des données (DPO) :</strong> [À COMPLÉTER PAR LE FOURNISSEUR]</li>
          </ul>
        </div>

        {/* 2. Minimisation des données */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-base font-bold text-[#101827]">
              2. Données utilisées et masquage automatique
            </h2>
          </div>
          <p className="text-xs">
            Pour estimer votre impôt et votre salaire net, seuls les montants que vous saisissez sont utilisés. Nous ne demandons jamais votre mot de passe impots.gouv.fr ni vos coordonnées bancaires.
          </p>
          <ExpandableDetail summary="En savoir plus : filtrage des numéros sensibles">
            <p>
              Si vous saisissez par erreur un numéro de sécurité sociale, un numéro fiscal à 13 chiffres ou un IBAN dans une question à l’assistant, il est automatiquement masqué avant tout traitement.
            </p>
          </ExpandableDetail>
        </div>

        {/* 3. Où sont stockées vos données aujourd'hui */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-base font-bold text-[#101827]">
              3. Enregistrement et suppression de vos données
            </h2>
          </div>
          <p className="text-xs">
            Votre profil fiscal et vos simulations sauvegardées sont conservés localement dans votre navigateur. Vous pouvez les exporter ou les supprimer immédiatement depuis la page « Mes rapports PDF » ou le bouton « Effacer mes données ».
          </p>
          <ExpandableDetail summary="En savoir plus : rapports PDF et durée de validité">
            <p>
              Lorsque vous générez un rapport PDF, un lien de téléchargement temporaire valable 15 minutes est créé pour votre session uniquement.
            </p>
          </ExpandableDetail>
        </div>

        {/* 4. Absence de décision automatisée */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-base font-bold text-[#101827]">
              4. Calculs indicatifs et contrôle humain
            </h2>
          </div>
          <p className="text-xs">
            Tous les montants affichés sont des estimations indicatives et non contractuelles calculées selon le barème officiel. Aucune déclaration n’est transmise automatiquement à l’administration fiscale.
          </p>
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Vous disposez d’un droit d’accès, de rectification, de portabilité et d’effacement de vos données (articles 15 à 20 du RGPD), exerçable directement dans l’application ou auprès de l’adresse [À COMPLÉTER PAR LE FOURNISSEUR].
            </span>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
