'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PublicShell } from '@/components/layout/public-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { FamilyMaritalStatus } from '@/lib/calculations/personal-tax-engine';
import { ArrowRight } from 'lucide-react';
import {
  SurfacePanel,
  NotificationBanner,
} from '@/components/ui/design-system';

export default function SignupPage() {
  const router = useRouter();
  const { updateActiveHousehold } = useFiscaliq();
  const [householdName, setHouseholdName] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<FamilyMaritalStatus>('marie_pacse');
  const [dependantsCount, setDependantsCount] = useState<number>(2);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (householdName.trim().length < 2) {
      setError('Veuillez indiquer votre prénom ou le nom de votre foyer.');
      return;
    }
    if (!email.includes('@')) {
      setError('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    updateActiveHousehold({
      householdName: `${householdName.trim()} (Profil personnalisé)`,
      maritalStatus,
      dependantsCount,
    });

    router.push('/dashboard');
  };

  return (
    <PublicShell>
      <section className="max-w-md mx-auto px-6 py-16">
        <SurfacePanel padding="lg" className="space-y-6">
          <div className="space-y-1.5 border-b border-slate-200/80 pb-4">
            <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
              INSCRIPTION PARTICULIERS · GRATUIT &amp; SANS ENGAGEMENT
            </p>
            <h1 className="text-xl font-bold text-[#101827] tracking-tight">
              Créer votre espace fiscal personnel
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Renseignez votre situation familiale en 30 secondes pour personnaliser vos calculs d’impôt et vos crédits d’impôt éligibles.
            </p>
          </div>

          {error && (
            <NotificationBanner
              variant="error"
              title="Information manquante"
              message={error}
              onDismiss={() => setError(null)}
            />
          )}

          <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200/80 text-xs">
            <span className="text-slate-600">Tester avec un foyer exemple ?</span>
            <button
              type="button"
              onClick={() => {
                setHouseholdName('Clara & Thomas');
                setMaritalStatus('marie_pacse');
                setDependantsCount(1);
                setEmail('clara.thomas.demo@fiscaliq.fr');
                setError(null);
              }}
              className="font-semibold text-[#101827] hover:text-[#10B981] transition-colors"
            >
              Préremplir un exemple
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="signup-household"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Prénom ou nom de votre foyer
              </label>
              <input
                id="signup-household"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Ex: Clara & Thomas"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#101827]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="signup-situation"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Situation familiale
                </label>
                <select
                  id="signup-situation"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value as FamilyMaritalStatus)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#101827]"
                >
                  <option value="celibataire">Célibataire</option>
                  <option value="marie_pacse">Marié(e) ou Pacsé(e)</option>
                  <option value="parent_isole">Parent isolé (Case T)</option>
                  <option value="divorce_separe">Divorcé(e) / Séparé(e)</option>
                  <option value="veuf">Veuf / Veuve</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="signup-children"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Enfants à charge
                </label>
                <select
                  id="signup-children"
                  value={dependantsCount}
                  onChange={(e) => setDependantsCount(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#101827]"
                >
                  <option value={0}>0 enfant</option>
                  <option value={1}>1 enfant</option>
                  <option value={2}>2 enfants</option>
                  <option value={3}>3 enfants</option>
                  <option value={4}>4 enfants</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Votre adresse e-mail
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="clara@exemple.fr"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#101827]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Accéder à mon tableau de bord fiscal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <Link href="/dashboard" className="font-semibold text-emerald-700 hover:underline">
              Explorer un foyer démo sans inscription
            </Link>
            <Link href="/login" className="hover:text-[#101827]">
              Déjà inscrit ? Connexion
            </Link>
          </div>
        </SurfacePanel>
      </section>
    </PublicShell>
  );
}
