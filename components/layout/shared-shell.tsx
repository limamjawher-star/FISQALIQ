'use client';

import React, { useState, useId, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Wallet,
  Target,
  Layers,
  Settings2,
  Bell,
  X,
  Sparkles,
  Calculator,
  BookOpen,
  MoreHorizontal,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import {
  AnimatedNumber,
  QuickGlossaryModal,
} from '@/components/ui/interactive-primitives';
import {
  GLASS_WORKSPACE_STYLES,
  type GlassSettings,
} from '@/components/ui/adjustable-glass-dashboard';
import { WARM_GLASS_PALETTE } from '@/components/ui/glass-workspace-demo';

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Accueil', shortLabel: 'Accueil', icon: Home },
  { href: '/onboarding', label: 'Mon impôt (simulateur)', shortLabel: 'Mon impôt', icon: Calculator },
  { href: '/payroll', label: 'Mon salaire', shortLabel: 'Mon salaire', icon: Wallet },
  { href: '/tax-optimization', label: 'Mes économies', shortLabel: 'Mes économies', icon: Target },
  { href: '/ai-assistant', label: 'Assistant', shortLabel: 'Assistant', icon: Sparkles },
];

const MORE_MENU_LINKS = [
  { href: '/reports', label: 'Rapports' },
  { href: '/pricing', label: 'Tarifs (Gratuit / Premium)' },
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/declaration', label: 'Ma déclaration' },
  { href: '/echeances', label: 'Mes échéances' },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Aperçu de mon impôt',
  '/dashboard': 'Tableau de bord',
  '/onboarding': 'Mon simulateur',
  '/payroll': 'Mon salaire net',
  '/tax-optimization': 'Mes économies',
  '/ai-assistant': 'Assistant fiscal',
  '/reports': 'Mes rapports PDF',
  '/pricing': 'Mon abonnement',
  '/declaration': 'Ma déclaration',
  '/echeances': 'Mes échéances',
  '/settings': 'Administration fiscale',
  '/privacy': 'Confidentialité',
  '/terms': 'Conditions générales',
  '/about': 'À propos',
  '/contact': 'Contact',
  '/features': 'Fonctionnalités',
  '/solutions': 'Solutions',
};

const DEFAULT_GLASS: GlassSettings = {
  blur: 22,
  opacity: 0.3,
  saturation: 1.2,
  tint: '#eadbc7',
  edge: 0.6,
};

export interface SharedShellProps {
  variant?: 'app' | 'public';
  title?: string;
  children: React.ReactNode;
}

export function SharedShell({
  variant = 'app',
  title,
  children,
}: SharedShellProps) {
  const pathname = usePathname();
  const id = useId().replace(/:/g, '');
  const {
    demoHouseholds,
    activeHousehold,
    isViewingDemo,
    selectHouseholdById,
    loadDemoHousehold,
    exitDemoMode,
    clearUserData,
    personalTaxSummary,
  } = useFiscaliq();

  const [material, setMaterial] = useState<GlassSettings>(DEFAULT_GLASS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const resolvedTitle = title || PAGE_TITLES[pathname] || 'FISCALIQ';
  const isAppVariant = variant === 'app';
  const isHomePage = pathname === '/';

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
          backgroundImage:
            'radial-gradient(ellipse at 50% 15%, rgba(246, 240, 230, 0.95) 0%, rgba(230, 219, 203, 0.9) 45%, rgba(206, 192, 172, 0.96) 100%)',
        } as CSSProperties
      }
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setSettingsOpen(false);
          setAlertsOpen(false);
          setMoreOpen(false);
        }
      }}
    >
      <style>{GLASS_WORKSPACE_STYLES}</style>
      <QuickGlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />

      {/* Local optimized room visual via next/image */}
      <div className="gw-room" aria-hidden="true">
        <Image
          src="/assets/visuals/editorial-paris-fintech.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          referrerPolicy="no-referrer"
          className="object-cover object-[center_42%] opacity-65"
        />
      </div>
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
            <span className="gw-personal">Espace personnel</span>
          </Link>

          {/* Center 5 Primary Navigation Tabs */}
          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-1"
          >
            {PRIMARY_NAV.map((item) => {
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

          {/* Right Toolbar Controls */}
          <div className="gw-toolbar">
            <button
              type="button"
              onClick={() => setGlossaryOpen(true)}
              className="gw-adjust hidden sm:flex"
              title="Lexique des termes fiscaux"
            >
              <BookOpen size={15} aria-hidden="true" />
              <span>Lexique</span>
            </button>

            <button
              type="button"
              className="gw-adjust"
              onClick={() => {
                setMoreOpen((prev) => !prev);
                setSettingsOpen(false);
                setAlertsOpen(false);
              }}
              aria-expanded={moreOpen}
              title="Autres pages et démarches"
            >
              <MoreHorizontal size={16} aria-hidden="true" />
              <span>Plus</span>
            </button>

            <button
              type="button"
              className="gw-adjust"
              onClick={() => {
                setSettingsOpen((prev) => !prev);
                setMoreOpen(false);
                setAlertsOpen(false);
              }}
              aria-expanded={settingsOpen}
              aria-controls={`${id}-material`}
              title="Personnaliser le verre"
            >
              <Settings2 size={16} aria-hidden="true" />
              <span>Ajuster</span>
            </button>

            {isAppVariant ? (
              <>
                <button
                  type="button"
                  className="gw-icon-button relative"
                  onClick={() => {
                    setAlertsOpen((prev) => !prev);
                    setMoreOpen(false);
                    setSettingsOpen(false);
                  }}
                  aria-expanded={alertsOpen}
                  aria-label="Notifications"
                >
                  <Bell size={17} strokeWidth={1.8} aria-hidden="true" />
                  {isViewingDemo && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#326b54]" />
                  )}
                </button>

                {/* Profile indicator */}
                <button
                  type="button"
                  className="gw-avatar-button"
                  onClick={() => {
                    setAlertsOpen((prev) => !prev);
                    setMoreOpen(false);
                    setSettingsOpen(false);
                  }}
                  title={activeHousehold.householdName}
                  aria-label="Profil et exemples"
                >
                  <span>{isViewingDemo ? 'Exemple' : 'Moi'}</span>
                  <ChevronDown size={12} aria-hidden="true" />
                </button>
              </>
            ) : (
              <Link href="/onboarding" className="gw-button">
                <span>Mon simulateur</span>
              </Link>
            )}
          </div>
        </header>

        {/* Popover Menu Plus */}
        {moreOpen && (
          <div
            className="gw-popover gw-glass"
            style={{ right: '80px', top: '70px', width: '240px', zIndex: 60 }}
          >
            <div className="gw-popover-header">
              <strong>Accès direct</strong>
              <button
                type="button"
                className="gw-popover-close"
                onClick={() => setMoreOpen(false)}
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-2 space-y-1">
              {MORE_MENU_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-[#326b54] text-white font-semibold'
                      : 'text-[#242b27] hover:bg-black/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Popover Profil & Exemples */}
        {alertsOpen && isAppVariant && (
          <div
            className="gw-popover gw-glass"
            style={{ right: '20px', top: '70px', width: '300px', zIndex: 60 }}
          >
            <div className="gw-popover-header">
              <div>
                <strong>Mon foyer fiscal</strong>
                <p className="text-[11px] text-[#384238]">
                  {isViewingDemo ? 'Mode démonstration actif' : 'Vos données personnelles locales'}
                </p>
              </div>
              <button
                type="button"
                className="gw-popover-close"
                onClick={() => setAlertsOpen(false)}
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-3 space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-black/5 flex items-center justify-between">
                <div>
                  <strong className="block text-[#242b27]">
                    {activeHousehold.householdName.split('(')[0].trim()}
                  </strong>
                  <span className="text-[11px] text-[#384238]">
                    {personalTaxSummary.familyQuotientParts} parts · Barème 2026
                  </span>
                </div>
                {!isViewingDemo && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#dce9da] text-[#242b27]">
                    Mon profil
                  </span>
                )}
              </div>

              {isViewingDemo && (
                <button
                  type="button"
                  onClick={() => {
                    exitDemoMode();
                    setAlertsOpen(false);
                  }}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#326b54] text-white hover:bg-[#274b39] flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Revenir à mon profil</span>
                </button>
              )}

              <div className="pt-2 border-t border-black/10">
                <span className="text-[11px] font-semibold text-[#384238] block mb-1.5">
                  Charger un exemple type :
                </span>
                <div className="space-y-1">
                  {demoHouseholds.map((h) => {
                    const isSelected = activeHousehold.id === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          loadDemoHousehold(h.id);
                          setAlertsOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-black/10 font-semibold' : 'hover:bg-black/5 text-[#384238]'
                        }`}
                      >
                        <span className="truncate">{h.householdName.split('(')[0].trim()}</span>
                        {isSelected && <Check size={13} className="text-[#326b54] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-black/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Effacer vos données locales et réinitialiser votre profil ?')) {
                      clearUserData();
                      setAlertsOpen(false);
                    }
                  }}
                  className="text-[11px] text-[#805b20] hover:underline"
                >
                  Effacer mes données
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Stage: Left Rail + Content */}
        <div className="gw-stage">
          {/* Left Vertical Rail (Desktop) */}
          <nav className="gw-rail gw-glass" aria-label="Navigation rapide">
            {PRIMARY_NAV.map((item) => {
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

          {/* Main Glass Workspace */}
          <main className="gw-main gw-glass">
            {/* Header: shown on app pages when not home page */}
            {isAppVariant && !isHomePage && (
              <div className="gw-view-heading">
                <div>
                  <p className="gw-greeting">
                    Bonjour, {activeHousehold.householdName.split('(')[0].trim()}.
                  </p>
                  <h1>{resolvedTitle}</h1>
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
            )}

            {/* Mobile Dock (Sticky at bottom on phones) */}
            <div className="gw-mobile-nav">
              <nav className="gw-dock gw-glass" aria-label="Navigation mobile">
                {PRIMARY_NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={isActive ? 'gw-active' : undefined}
                    >
                      <Icon size={17} strokeWidth={1.8} />
                      <span>{item.shortLabel}</span>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setMoreOpen((prev) => !prev)}
                  className={moreOpen ? 'gw-active' : undefined}
                  aria-label="Plus d'onglets"
                >
                  <MoreHorizontal size={17} strokeWidth={1.8} />
                  <span>Plus</span>
                </button>
              </nav>
            </div>

            {/* Page Content */}
            {children}
          </main>
        </div>
      </div>

      {/* Glass Customization Drawer */}
      {settingsOpen && (
        <aside
          id={`${id}-material`}
          className="gw-drawer gw-glass"
          aria-label="Personnalisation du verre liquide"
        >
          <div className="gw-drawer-header">
            <div>
              <h3>Ajuster le verre</h3>
              <p>Réglez l’effet de transparence et de flou.</p>
            </div>
            <button
              type="button"
              className="gw-icon-button"
              onClick={() => setSettingsOpen(false)}
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="gw-drawer-body">
            <div className="gw-control-group">
              <div className="gw-control-label">
                <span>Flou d’arrière-plan</span>
                <strong>{material.blur}px</strong>
              </div>
              <input
                type="range"
                min={8}
                max={40}
                value={material.blur}
                onChange={(e) => updateGlass({ blur: Number(e.target.value) })}
              />
            </div>

            <div className="gw-control-group">
              <div className="gw-control-label">
                <span>Opacité de surface</span>
                <strong>{Math.round(material.opacity * 100)}%</strong>
              </div>
              <input
                type="range"
                min={0.12}
                max={0.7}
                step={0.02}
                value={material.opacity}
                onChange={(e) => updateGlass({ opacity: Number(e.target.value) })}
              />
            </div>

            <div className="gw-control-group">
              <div className="gw-control-label">
                <span>Contraste des bords</span>
                <strong>{Math.round(material.edge * 100)}%</strong>
              </div>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={material.edge}
                onChange={(e) => updateGlass({ edge: Number(e.target.value) })}
              />
            </div>

            <div className="gw-control-group">
              <div className="gw-control-label">
                <span>Teinte</span>
              </div>
              <div className="gw-swatches">
                {[
                  { name: 'Sable chaud', color: '#eadbc7' },
                  { name: 'Bois clair', color: '#dfcbaf' },
                  { name: 'Pure', color: '#ffffff' },
                  { name: 'Sauge', color: '#cddbc9' },
                ].map((swatch) => (
                  <button
                    key={swatch.color}
                    type="button"
                    onClick={() => updateGlass({ tint: swatch.color })}
                    className={`gw-swatch ${material.tint === swatch.color ? 'gw-active' : ''}`}
                    style={{ backgroundColor: swatch.color }}
                    title={swatch.name}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              className="gw-button"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setMaterial(DEFAULT_GLASS)}
            >
              <RotateCcw size={14} />
              <span>Rétablir les valeurs d’origine</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
