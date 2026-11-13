import React from 'react';
import Link from 'next/link';
import { SharedShell } from '@/components/layout/shared-shell';

export default function NotFound() {
  return (
    <SharedShell title="Page introuvable">
      <div className="gw-panel space-y-4">
        <h2 className="text-base font-bold text-[#101827]">
          Cette page n’existe pas ou a été déplacée.
        </h2>
        <p className="text-xs text-slate-600">
          Revenez à l’accueil ou ouvrez le simulateur pour estimer votre impôt 2026.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="gw-button gw-button-primary">
            Retour à l’accueil
          </Link>
          <Link href="/onboarding" className="gw-button">
            Estimer mon impôt
          </Link>
        </div>
      </div>
    </SharedShell>
  );
}
