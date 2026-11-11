'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PublicShell } from '@/components/layout/public-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import { ArrowRight } from 'lucide-react';
import {
  SurfacePanel,
  NotificationBanner,
} from '@/components/ui/design-system';

export default function LoginPage() {
  const router = useRouter();
  const { selectHouseholdById } = useFiscaliq();
  const [email, setEmail] = useState('camille.julien.demo@fiscaliq.fr');
  const [password, setPassword] = useState('••••••••••••');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes('@') || password.trim().length < 6) {
      setError(
        'Veuillez saisir une adresse e-mail valide et un mot de passe d’au moins 6 caractères.'
      );
      return;
    }
    router.push('/dashboard');
  };

  return (
    <PublicShell>
      <section className="max-w-md mx-auto px-6 py-16">
        <SurfacePanel padding="lg" className="space-y-6">
          <div className="space-y-1.5 border-b border-slate-200/80 pb-4">
            <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
              ESPACE PERSONNEL · CONNEXION SÉCURISÉE
            </p>
            <h1 className="text-xl font-bold text-[#101827] tracking-tight">
              Accéder à votre espace fiscal personnel
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mode démonstration actif : choisissez un profil de foyer ci-dessous pour explorer immédiatement votre tableau de bord fiscal.
            </p>
          </div>

          {error && (
            <NotificationBanner
              variant="error"
              title="Authentification refusée"
              message={error}
              onDismiss={() => setError(null)}
            />
          )}

          {/* Quick Demo Household Switcher */}
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200/80 space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Foyers de démonstration rapides
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  selectHouseholdById('foyer-couple-2-enfants');
                  setEmail('camille.julien.demo@fiscaliq.fr');
                  setPassword('••••••••••••');
                  setError(null);
                }}
                className="px-2.5 py-1.5 text-left text-[11px] rounded-xs bg-white border border-slate-200 hover:border-slate-400 text-[#101827] font-medium transition-colors"
              >
                Couple marié (2 enfants)
              </button>
              <button
                type="button"
                onClick={() => {
                  selectHouseholdById('foyer-celibataire-salarie');
                  setEmail('sarah.lyon.demo@fiscaliq.fr');
                  setPassword('••••••••••••');
                  setError(null);
                }}
                className="px-2.5 py-1.5 text-left text-[11px] rounded-xs bg-white border border-slate-200 hover:border-slate-400 text-[#101827] font-medium transition-colors"
              >
                Salariée célibataire (1 part)
              </button>
              <button
                type="button"
                onClick={() => {
                  selectHouseholdById('foyer-parent-isole');
                  setEmail('karim.nantes.demo@fiscaliq.fr');
                  setPassword('••••••••••••');
                  setError(null);
                }}
                className="px-2.5 py-1.5 text-left text-[11px] rounded-xs bg-white border border-slate-200 hover:border-slate-400 text-[#101827] font-medium transition-colors"
              >
                Parent isolé Case T (2 parts)
              </button>
              <button
                type="button"
                onClick={() => {
                  selectHouseholdById('foyer-retraite-bailleur');
                  setEmail('helene.marc.demo@fiscaliq.fr');
                  setPassword('••••••••••••');
                  setError(null);
                }}
                className="px-2.5 py-1.5 text-left text-[11px] rounded-xs bg-white border border-slate-200 hover:border-slate-400 text-[#101827] font-medium transition-colors"
              >
                Retraités &amp; Bailleurs
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Adresse e-mail
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#101827]"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Mot de passe
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#101827]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#10B981] rounded-lg hover:bg-[#059669] transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Accéder à mon tableau de bord</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Nouveau sur FISCALIQ ?</span>
            <Link href="/signup" className="font-semibold text-[#101827] hover:text-[#10B981]">
              Créer mon profil fiscal gratuit →
            </Link>
          </div>
        </SurfacePanel>
      </section>
    </PublicShell>
  );
}
