'use client';

import React, { useState, useId, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Wallet,
  Target,
  ChartNoAxesCombined,
  Layers,
  Settings2,
  Bell,
  X,
  Sparkles,
  Calculator,
  CreditCard,
  BookOpen,
} from 'lucide-react';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import {
  AnimatedNumber,
  PageTransition,
  QuickGlossaryModal,
} from '@/components/ui/interactive-primitives';
import {
  GLASS_WORKSPACE_STYLES,
  type GlassSettings,
} from '@/components/ui/adjustable-glass-dashboard';
import {
  WARM_GLASS_PALETTE,
  DEFAULT_WARM_ROOM_BACKGROUND,
} from '@/components/ui/glass-workspace-demo';

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const WORKSPACE_NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: Home,
  },
  {
    href: '/payroll',
    label: 'Salaire & Flux',
    shortLabel: 'Activity',
    icon: Wallet,
  },
  {
    href: '/tax-optimization',
    label: 'Optimisations',
    shortLabel: 'Savings',
    icon: Target,
  },
  {
    href: '/reports',
    label: 'Rapports PDF',
    shortLabel: 'Reports',
    icon: ChartNoAxesCombined,
  },
  {
    href: '/onboarding',
    label: 'Simulateur',
    shortLabel: 'Impôts',
    icon: Calculator,
  },
  {
    href: '/ai-assistant',
    label: 'Assistant IA',
    shortLabel: 'IA',
    icon: Sparkles,
  },
  {
    href: '/pricing',
    label: 'Gratuit & 5 €',
    shortLabel: '5 €',
    icon: CreditCard,
  },
];

const DEFAULT_GLASS: GlassSettings = {
  blur: 22,
  opacity: 0.3,
  saturation: 1.2,
  tint: '#eadbc7',
  edge: 0.6,
};

interface AppShellProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  const pathname = usePathname();
  const id = useId().replace(/:/g, '');
  const {
    households,
    activeHousehold,
    selectHouseholdById,
    personalTaxSummary,
  } = useFiscaliq();

  const [material, setMaterial] = useState<GlassSettings>(DEFAULT_GLASS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  const updateGlass = (patch: Partial<GlassSettings>) => {
    setMaterial((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div
      className="gw-root"
      style={
        {
          ...WARM_GLASS_PALETTE,
          '--gw-blur': `${material.blur}px`,
          '--gw-opacity': material.opacity,
          '--gw-saturation': material.saturation,
          '--gw-tint': material.tint,
          '--gw-edge': material.edge,
        } as CSSProperties
      }
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setSettingsOpen(false);
          setAlertsOpen(false);
        }
      }}
    >
      <style>{GLASS_WORKSPACE_STYLES}</style>
      <QuickGlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />

      {!bgFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="gw-room"
          src={DEFAULT_WARM_ROOM_BACKGROUND}
          alt=""
          onError={() => setBgFailed(true)}
        />
      )}
      <div className="gw-room-shade" aria-hidden="true" />

      <div className="gw-workspace">
        {/* Floating Glass Topbar */}
        <header className="gw-topbar gw-glass">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="gw-brand">
              <span className="gw-brand-icon">
                <Layers size={18} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <strong>FISCALIQ</strong>
              <span className="gw-brand-divider" />
              <span className="gw-personal">Personal workspace</span>
            </Link>

            <select
              aria-label="Profil fiscal actif"
              value={activeHousehold.id}
              onChange={(e) => selectHouseholdById(e.target.value)}
              className="hidden md:block text-xs font-medium rounded-lg px-2.5 py-1 bg-white/50 border border-black/10 text-[#242b27] focus:outline-none"
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.householdName}
                </option>
              ))}
            </select>
          </div>

          <div className="gw-toolbar">
            <Link
              href="/pricing"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#274b39] text-white hover:opacity-95 transition-opacity"
            >
              <span>Gratuit · Premium 5 €</span>
            </Link>

            <button
              type="button"
              onClick={() => setGlossaryOpen(true)}
              className="gw-adjust hidden sm:flex"
              title="Lexique fiscal"
            >
              <BookOpen size={15} aria-hidden="true" />
              <span>Lexique</span>
            </button>

            <button
              type="button"
              className="gw-adjust"
              onClick={() => {
                setSettingsOpen((prev) => !prev);
                setAlertsOpen(false);
              }}
              aria-expanded={settingsOpen}
              aria-controls={`${id}-material`}
            >
              <Settings2 size={16} aria-hidden="true" />
              <span>Adjust glass</span>
            </button>

            <button
              type="button"
              className="gw-icon-button gw-bell"
              aria-label="Notifications"
              aria-expanded={alertsOpen}
              onClick={() => {
                setAlertsOpen((prev) => !prev);
                setSettingsOpen(false);
              }}
            >
              <Bell size={17} aria-hidden="true" />
              <i />
            </button>

            <span className="gw-avatar" title={activeHousehold.householdName}>
              {activeHousehold.householdName.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        {/* Stage: Left Floating Rail + Main Frosted Glass Canvas */}
        <div className="gw-stage">
          <nav className="gw-rail gw-glass" aria-label="Navigation rapide">
            {WORKSPACE_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} strokeWidth={1.7} />
                  <span>{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>

          <main className="gw-main gw-glass">
            {/* Minimalist View Heading */}
            <div className="gw-view-heading">
              <div>
                <p className="gw-greeting">
                  Welcome back, {activeHousehold.householdName.split('(')[0].trim()}.
                </p>
                <h1>{title}</h1>
              </div>

              <div className="gw-heading-action">
                <span className="gw-date">
                  {personalTaxSummary.familyQuotientParts.toLocaleString('fr-FR')} parts ·{' '}
                  <strong className="text-[#242b27] tabular-nums">
                    <AnimatedNumber
                      value={personalTaxSummary.finalEstimatedTaxEur}
                      suffix=" € / an"
                    />
                  </strong>
                </span>
              </div>
            </div>

            {/* Mobile Dock */}
            <div className="gw-mobile-nav">
              <nav className="gw-dock gw-glass" aria-label="Navigation mobile">
                {WORKSPACE_NAV.slice(0, 5).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={15} strokeWidth={1.7} />
                      <span>{item.shortLabel}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="gw-view">
              <PageTransition transitionKey={pathname}>{children}</PageTransition>
            </div>

            <footer className="gw-footer">
              <span>
                <i />
                FISCALIQ 2026 · Offre Gratuit (0 €) &amp; Premium (5 € / mois)
              </span>
              <Link href="/pricing" className="underline hover:opacity-80">
                Voir l&apos;offre à 5 €
              </Link>
            </footer>

            {/* Desktop Bottom Floating Dock */}
            <div className="gw-desktop-dock">
              <nav className="gw-dock gw-glass" aria-label="Barre d'accès rapide">
                {WORKSPACE_NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={15} strokeWidth={1.7} />
                      <span>{item.shortLabel}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </main>
        </div>

        {/* Notifications Popover */}
        {alertsOpen && (
          <aside className="gw-notifications gw-glass" aria-label="Notifications">
            <div>
              <h2>Notifications</h2>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setAlertsOpen(false)}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <p>Barème 2026 actif · Formules Gratuit (0 €) et Premium (5 €) disponibles.</p>
          </aside>
        )}

        {/* Adjustable Glass Settings Popover */}
        {settingsOpen && (
          <aside
            className="gw-material gw-glass"
            id={`${id}-material`}
            aria-label="Glass appearance"
          >
            <div className="gw-material-title">
              <div>
                <span className="gw-material-icon">
                  <Settings2 size={18} aria-hidden="true" />
                </span>
                <h2>Glass appearance</h2>
              </div>
              <button
                type="button"
                className="gw-icon-button"
                aria-label="Fermer"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p>Ajustez la transparence du verre en direct.</p>
            <div className="gw-material-sample" aria-hidden="true">
              <Layers size={26} strokeWidth={1.2} />
              <span>Aperçu en direct</span>
            </div>
            <div className="gw-presets" aria-label="Glass presets">
              {[
                {
                  name: 'Clear',
                  value: { blur: 8, opacity: 0.12, saturation: 1.1, edge: 0.8 },
                },
                { name: 'Frosted', value: DEFAULT_GLASS },
                {
                  name: 'Solid',
                  value: { blur: 32, opacity: 0.86, saturation: 1, edge: 0.35 },
                },
              ].map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => updateGlass(p.value)}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {[
              {
                key: 'blur',
                label: 'Blur',
                min: 0,
                max: 40,
                step: 1,
                value: `${Math.round(material.blur)} px`,
              },
              {
                key: 'opacity',
                label: 'Opacity',
                min: 0.08,
                max: 0.9,
                step: 0.01,
                value: `${Math.round(material.opacity * 100)}%`,
              },
              {
                key: 'saturation',
                label: 'Saturation',
                min: 0.5,
                max: 2,
                step: 0.05,
                value: `${Math.round(material.saturation * 100)}%`,
              },
              {
                key: 'edge',
                label: 'Edge light',
                min: 0,
                max: 1,
                step: 0.05,
                value: `${Math.round(material.edge * 100)}%`,
              },
            ].map((c) => (
              <label className="gw-range" key={c.key}>
                <span>
                  {c.label}
                  <output>{c.value}</output>
                </span>
                <input
                  type="range"
                  aria-label={c.label}
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={material[c.key as keyof GlassSettings]}
                  onChange={(e) =>
                    updateGlass({ [c.key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
            <label className="gw-tint">
              Glass tint{' '}
              <input
                type="color"
                value={material.tint}
                onChange={(e) => updateGlass({ tint: e.target.value })}
              />
            </label>
            <button
              className="gw-reset"
              type="button"
              onClick={() => setMaterial(DEFAULT_GLASS)}
            >
              Reset appearance
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
