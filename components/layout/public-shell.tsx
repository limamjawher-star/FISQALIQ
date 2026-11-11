'use client';

import React, { useState, useId, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Layers,
  Settings2,
  Bell,
  X,
  CreditCard,
  Sparkles,
  Calculator,
  BookOpen,
  LayoutDashboard,
} from 'lucide-react';
import {
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

const PUBLIC_NAV_ITEMS = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/features', label: 'Outils', icon: Calculator },
  { href: '/pricing', label: 'Gratuit & 5 €', icon: CreditCard },
  { href: '/ai-assistant', label: 'Assistant IA', icon: Sparkles },
];

const DEFAULT_GLASS: GlassSettings = {
  blur: 22,
  opacity: 0.3,
  saturation: 1.2,
  tint: '#eadbc7',
  edge: 0.6,
};

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const id = useId().replace(/:/g, '');
  const [material, setMaterial] = useState<GlassSettings>(DEFAULT_GLASS);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
        {/* Floating Frosted Glass Header */}
        <header className="gw-topbar gw-glass">
          <Link href="/" className="gw-brand">
            <span className="gw-brand-icon">
              <Layers size={18} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <strong>FISCALIQ</strong>
            <span className="gw-brand-divider" />
            <span className="gw-personal">Personal workspace</span>
          </Link>

          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-1"
          >
            {PUBLIC_NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? 'bg-white/85 text-[#242b27] font-semibold shadow-2xs'
                      : 'text-[#384238] hover:bg-white/40'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="gw-toolbar">
            <button
              type="button"
              onClick={() => setGlossaryOpen(true)}
              className="gw-adjust hidden sm:flex"
            >
              <BookOpen size={15} aria-hidden="true" />
              <span>Lexique</span>
            </button>

            <button
              type="button"
              className="gw-adjust"
              onClick={() => setSettingsOpen((prev) => !prev)}
              aria-expanded={settingsOpen}
              aria-controls={`${id}-material`}
            >
              <Settings2 size={16} aria-hidden="true" />
              <span>Adjust glass</span>
            </button>

            <Link
              href="/dashboard"
              className="gw-button"
            >
              <span>Ouvrir Workspace</span>
            </Link>
          </div>
        </header>

        <div className="gw-stage">
          <nav className="gw-rail gw-glass" aria-label="Navigation rapide">
            {PUBLIC_NAV_ITEMS.map((item) => {
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
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <main className="gw-main gw-glass">
            <PageTransition transitionKey={pathname}>{children}</PageTransition>

            <footer className="gw-footer mt-8 pt-4 border-t border-black/10">
              <span>
                <i />
                FISCALIQ · Gratuit (0 €) &amp; Premium (5 € / mois)
              </span>
              <div className="flex items-center gap-4 text-[11px]">
                <Link href="/pricing" className="hover:underline">
                  Tarifs (0 € / 5 €)
                </Link>
                <Link href="/privacy" className="hover:underline">
                  Confidentialité
                </Link>
                <Link href="/terms" className="hover:underline">
                  Conditions
                </Link>
              </div>
            </footer>

            <div className="gw-desktop-dock">
              <nav className="gw-dock gw-glass" aria-label="Navigation dock">
                {PUBLIC_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={15} strokeWidth={1.7} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </main>
        </div>

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
