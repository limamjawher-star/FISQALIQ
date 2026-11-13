'use client';

import React from 'react';
import Link from 'next/link';
import { SharedShell } from '@/components/layout/shared-shell';

export default function GlobalErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SharedShell title="Une erreur est survenue">
      <div className="gw-panel space-y-4">
        <h2 className="text-base font-bold text-[#101827]">
          Nous n’avons pas pu afficher cette page.
        </h2>
        <p className="text-xs text-slate-600">
          Vos données enregistrées localement sont intactes. Vous pouvez réessayer ou revenir à l’accueil.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="gw-button gw-button-primary"
          >
            Réessayer
          </button>
          <Link href="/" className="gw-button">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </SharedShell>
  );
}
