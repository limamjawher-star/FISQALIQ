'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'reset_password';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data: { supabaseConfigured?: boolean }) => {
        setSupabaseConfigured(Boolean(data.supabaseConfigured));
      })
      .catch(() => {
        setSupabaseConfigured(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          email,
          password: mode === 'reset_password' ? undefined : password,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        messageFr?: string;
      };

      if (!res.ok || !data.ok) {
        setFeedback({
          type: 'error',
          text: data.messageFr || 'Impossible de valider votre demande.',
        });
      } else {
        setFeedback({
          type: 'success',
          text: data.messageFr || 'Opération réussie.',
        });
        if (mode === 'login') {
          router.push('/onboarding');
        }
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'Erreur réseau lors de la connexion au serveur.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="gw-panel p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {mode === 'login'
                ? 'Connexion à votre compte'
                : mode === 'signup'
                ? 'Créer un compte'
                : 'Réinitialiser le mot de passe'}
            </h1>
            <p className="text-xs text-slate-600">
              Sauvegardez vos simulations d’impôt en toute sécurité.
            </p>
          </div>
        </div>

        {supabaseConfigured === false && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-950">
            <p className="font-semibold">
              Authentification cloud en attente de configuration
            </p>
            <p className="mt-1 text-amber-900">
              Les clés Supabase (<code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code>) ne sont pas encore renseignées sur ce serveur. Vous pouvez utiliser le simulateur immédiatement sans compte.
            </p>
            <Link
              href="/onboarding"
              className="mt-2.5 inline-flex items-center gap-1.5 font-semibold text-emerald-800 underline"
            >
              Utiliser le simulateur sans compte
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="mt-5 flex gap-1.5 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setFeedback(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setFeedback(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Créer un compte
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('reset_password');
              setFeedback(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              mode === 'reset_password'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mot de passe
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Adresse e-mail
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900"
              />
            </div>
          </div>

          {mode !== 'reset_password' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Mot de passe (8 caractères minimum)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </div>
          )}

          {feedback && (
            <div
              className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : 'border-rose-200 bg-rose-50 text-rose-950'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="gw-button-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading
              ? 'Vérification en cours...'
              : mode === 'login'
              ? 'Se connecter'
              : mode === 'signup'
              ? 'Créer mon compte'
              : 'Envoyer le lien par e-mail'}
          </button>
        </form>
      </div>
    </div>
  );
}
