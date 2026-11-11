import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/layout/public-shell';
import { Users, ArrowRight, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Profils — FISCALIQ',
  description: 'Adapté à chaque foyer fiscal en France.',
};

const PROFILES = [
  {
    title: 'Salarié célibataire',
    parts: '1 part',
    points: ['Abattement 10 % vs Frais réels', 'Calcul de la décote & TMI'],
    href: '/dashboard',
  },
  {
    title: 'Couple & Famille',
    parts: '2 à 4+ parts',
    points: ['Quotient familial & enfants', 'Crédit garde 50 % & taux individualisé'],
    href: '/dashboard',
  },
  {
    title: 'Parent isolé (Case T)',
    parts: '2 parts (1 enfant)',
    points: ['Demi-part supplémentaire Case T', 'Plafond majoré 4 262 €'],
    href: '/dashboard',
  },
  {
    title: 'Retraités & Bailleurs',
    parts: '2 parts',
    points: ['Abattement 10 % pensions', 'Micro-foncier 30 % vs Régime réel'],
    href: '/dashboard',
  },
];

export default function SolutionsPage() {
  return (
    <PublicShell>
      <div className="gw-view-heading">
        <div>
          <p className="gw-greeting">Adapté à votre foyer</p>
          <h1>Profils &amp; Situations</h1>
        </div>
        <div className="gw-heading-action">
          <Link href="/pricing" className="gw-button">
            <span>Gratuit 0 € · Premium 5 €</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROFILES.map((p) => (
          <section key={p.title} className="gw-panel flex flex-col justify-between">
            <div>
              <div className="gw-panel-title">
                <span className="flex items-center gap-1.5 font-semibold text-[#242b27]">
                  <Users size={15} />
                  {p.title}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/70 text-[11px] font-mono">
                  {p.parts}
                </span>
              </div>
              <ul className="space-y-1.5 text-xs mt-2">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2">
                    <Check size={14} className="text-[#326b54]" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-black/10 flex justify-end">
              <Link href={p.href} className="gw-text-button font-semibold">
                <span>Simuler ce profil</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </section>
        ))}
      </div>
    </PublicShell>
  );
}
