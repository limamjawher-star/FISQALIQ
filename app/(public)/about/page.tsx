import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/layout/public-shell';
import { ShieldCheck, Calculator, Lock, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'À propos — FISCALIQ',
  description: 'Simulateur fiscal 2026 en français simple.',
};

const PILLARS = [
  {
    icon: Calculator,
    title: 'Barème officiel 2026',
    desc: 'Tous les calculs appliquent les règles officielles (parts, décote, tranches et prélèvement à la source).',
  },
  {
    icon: ShieldCheck,
    title: 'Sources publiques vérifiées',
    desc: 'Références directes vers impots.gouv.fr, service-public.fr, BOFiP et Légifrance.',
  },
  {
    icon: Lock,
    title: 'Confidentialité & RGPD',
    desc: 'Protection de vos données personnelles et aucun partage commercial.',
  },
];

export default function AboutPage() {
  return (
    <PublicShell>
      <div className="gw-view-heading">
        <div>
          <p className="gw-greeting">Méthodologie &amp; Rigueur</p>
          <h1>À propos</h1>
        </div>
        <div className="gw-heading-action">
          <Link href="/pricing" className="gw-button">
            <span>Gratuit 0 € · Premium 5 €</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <section key={p.title} className="gw-panel space-y-2">
              <div className="gw-panel-title">
                <span className="gw-goal-icon">
                  <Icon size={16} />
                </span>
                <span>Vérifié</span>
              </div>
              <h2 className="text-base font-semibold">{p.title}</h2>
              <p className="text-xs text-[#384238]">{p.desc}</p>
            </section>
          );
        })}
      </div>
    </PublicShell>
  );
}
