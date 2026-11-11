import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/layout/public-shell';
import {
  Calculator,
  Sparkles,
  Wallet,
  MessageSquare,
  Calendar,
  FileText,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Outils — FISCALIQ',
  description: 'Les 6 outils essentiels pour vos impôts et votre salaire net.',
};

const MODULES = [
  {
    icon: Calculator,
    title: 'Calculateur d’impôt 2026',
    summary: 'Impôt net, parts fiscales, TMI et décote en temps réel.',
    href: '/onboarding',
    plan: 'Gratuit · 0 €',
  },
  {
    icon: Wallet,
    title: 'Salaire Brut → Net & PAS',
    summary: 'Net avant impôt, prélèvement à la source et net en poche.',
    href: '/payroll',
    plan: 'Gratuit · 0 €',
  },
  {
    icon: Sparkles,
    title: 'Optimisations fiscales',
    summary: 'Frais réels vs 10 %, PER, garde d’enfant, dons et emploi à domicile.',
    href: '/tax-optimization',
    plan: 'Premium · 5 €',
  },
  {
    icon: MessageSquare,
    title: 'Assistant IA fiscal',
    summary: 'Réponses directes sourcées sur impots.gouv.fr et le CGI.',
    href: '/ai-assistant',
    plan: 'Gratuit & Premium',
  },
  {
    icon: Calendar,
    title: 'Déclaration 2042 & Calendrier',
    summary: 'Checklist personnalisée des cases 2042 et échéances DGFiP.',
    href: '/profitability',
    plan: 'Premium · 5 €',
  },
  {
    icon: FileText,
    title: 'Rapports PDF & Scénarios',
    summary: 'Dossiers PDF téléchargeables et comparateur côte à côte.',
    href: '/reports',
    plan: 'Gratuit & Premium',
  },
];

export default function FeaturesPage() {
  return (
    <PublicShell>
      <div className="gw-view-heading">
        <div>
          <p className="gw-greeting">6 outils essentiels</p>
          <h1>Fonctionnalités</h1>
        </div>
        <div className="gw-heading-action">
          <Link href="/pricing" className="gw-button">
            <span>Gratuit 0 € · Premium 5 €</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <section key={m.title} className="gw-panel flex flex-col justify-between">
              <div>
                <div className="gw-panel-title">
                  <span className="gw-goal-icon">
                    <Icon size={16} />
                  </span>
                  <span className="text-[11px] font-medium">{m.plan}</span>
                </div>
                <h2 className="text-base font-semibold mb-1">{m.title}</h2>
                <p className="text-xs text-[#384238]">{m.summary}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-black/10 flex justify-end">
                <Link href={m.href} className="gw-text-button font-semibold">
                  <span>Ouvrir</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </PublicShell>
  );
}
