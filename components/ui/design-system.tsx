'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Loader2, Inbox } from 'lucide-react';

/**
 * FISCALIQ — Institutional European Fintech Design System
 * Palette: Deep Navy #101827, Off-White #F8FAFC, Emerald #10B981, Neutral Slate
 * Geometry: Restrained radii (rounded-lg for panels, rounded-md for controls), 1px structural hairlines, zero pill badges.
 */

export interface SurfacePanelProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'navy' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function SurfacePanel({
  id,
  children,
  className = '',
  variant = 'default',
  padding = 'md',
}: SurfacePanelProps) {
  const variantClasses = {
    default: 'bg-white text-[#172033] border border-slate-200/90 shadow-2xs',
    navy: 'bg-[#F8FAFC] text-[#172033] border border-slate-200/90 shadow-2xs',
    subtle: 'bg-[#F8FAFC] text-[#172033] border border-slate-200',
  }[variant];

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding];

  return (
    <div id={id} className={`rounded-lg ${variantClasses} ${paddingClasses} ${className}`}>
      {children}
    </div>
  );
}

export interface PanelHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  dark?: boolean;
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: PanelHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
      <div className="space-y-0.5">
        {eyebrow && (
          <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-700">
            {eyebrow}
          </p>
        )}
        <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#172033]">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export interface KpiMetricProps {
  label: string;
  value: string;
  subtext?: string;
  accent?: 'default' | 'emerald' | 'navy';
  badge?: React.ReactNode;
  testId?: string;
}

export function KpiMetricCard({
  label,
  value,
  subtext,
  accent = 'default',
  badge,
  testId,
}: KpiMetricProps) {
  if (accent === 'navy') {
    return (
      <div className="rounded-lg bg-[#F8FAFC] text-[#172033] border border-slate-200 p-4 sm:p-5 flex flex-col justify-between space-y-1.5 shadow-2xs">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-slate-600">{label}</p>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        <p
          data-testid={testId}
          className="text-2xl font-bold font-mono tabular-nums tracking-tight text-[#172033]"
        >
          {value}
        </p>
        {subtext && (
          <p className="text-[11px] font-mono tabular-nums text-slate-500">{subtext}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <p
        data-testid={testId}
        className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
          accent === 'emerald' ? 'text-[#10B981]' : 'text-[#101827]'
        }`}
      >
        {value}
      </p>
      {subtext && (
        <p
          className={`text-[11px] font-mono tabular-nums ${
            accent === 'emerald' ? 'text-emerald-700 font-medium' : 'text-slate-500'
          }`}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}

export interface DataOriginBadgeProps {
  classification: 'CALCUL_VERIFIE' | 'ESTIMATION' | 'DONNEE_FICTIVE_DEMO';
  compact?: boolean;
}

/**
 * Institutional rectangular classification label distinguishing:
 * - CALCUL_VERIFIE: Deterministic calculation using verified official 2026/2025 parameters
 * - ESTIMATION: Projection dependent on unverified company-specific rates (AT/MP, IDCC, etc.)
 * - DONNEE_FICTIVE_DEMO: Illustrative fictional dataset figure
 */
export function DataOriginBadge({ classification, compact = false }: DataOriginBadgeProps) {
  const config = {
    CALCUL_VERIFIE: {
      label: compact ? 'CALCUL VÉRIFIÉ' : 'CALCUL DÉTERMINISTE VÉRIFIÉ',
      classes: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      dot: 'bg-[#10B981]',
    },
    ESTIMATION: {
      label: compact ? 'ESTIMATION' : 'ESTIMATION INDICATIVE',
      classes: 'bg-amber-50 text-amber-900 border-amber-300',
      dot: 'bg-amber-500',
    },
    DONNEE_FICTIVE_DEMO: {
      label: compact ? 'DÉMO FICTIVE' : 'DONNÉE FICTIVE DE DÉMO',
      classes: 'bg-slate-100 text-slate-700 border-slate-300',
      dot: 'bg-slate-500',
    },
  }[classification];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-xs border text-[10px] font-mono font-semibold uppercase tracking-wider whitespace-nowrap ${config.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-xs shrink-0 ${config.dot}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

export interface StatusDotProps {
  tone: 'emerald' | 'amber' | 'slate' | 'red' | 'navy';
  label: string;
}

/**
 * Zero-pill status indicator: uses a crisp 6px geometric dot + typographic hierarchy.
 */
export function StatusIndicator({ tone, label }: StatusDotProps) {
  const dotColors = {
    emerald: 'bg-[#10B981]',
    amber: 'bg-amber-500',
    slate: 'bg-slate-400',
    red: 'bg-red-600',
    navy: 'bg-slate-700',
  }[tone];

  const textColors = {
    emerald: 'text-emerald-800',
    amber: 'text-amber-800',
    slate: 'text-slate-700',
    red: 'text-red-800',
    navy: 'text-slate-800',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColors}`}>
      <span className={`w-1.5 h-1.5 rounded-xs shrink-0 ${dotColors}`} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export interface NotificationBannerProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onDismiss?: () => void;
}

export function NotificationBanner({
  variant = 'info',
  title,
  message,
  onDismiss,
}: NotificationBannerProps) {
  const styles = {
    info: {
      container: 'bg-slate-50 border-slate-200 border-l-2 border-l-emerald-600 text-slate-800',
      icon: <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    },
    success: {
      container: 'bg-emerald-50/70 border-emerald-200 border-l-2 border-l-[#10B981] text-emerald-950',
      icon: <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />,
    },
    warning: {
      container: 'bg-amber-50/70 border-amber-200 border-l-2 border-l-amber-600 text-amber-950',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    },
    error: {
      container: 'bg-red-50/80 border-red-200 border-l-2 border-l-red-600 text-red-900',
      icon: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
    },
  }[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-md border p-3.5 text-xs flex items-start justify-between gap-3 ${styles.container}`}
    >
      <div className="flex items-start gap-2.5">
        {styles.icon}
        <div className="space-y-0.5">
          {title && <p className="font-semibold">{title}</p>}
          <p className="leading-relaxed">{message}</p>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-medium underline underline-offset-2 opacity-75 hover:opacity-100 shrink-0"
        >
          Fermer
        </button>
      )}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-[#F8FAFC] p-8 text-center space-y-3">
      <div className="mx-auto w-8 h-8 rounded-md bg-slate-200/70 flex items-center justify-center text-slate-600">
        {icon || <Inbox className="w-4 h-4" />}
      </div>
      <div className="space-y-1 max-w-md mx-auto">
        <p className="text-sm font-semibold text-[#101827]">{title}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      {action ? (
        <div className="pt-1">{action}</div>
      ) : (
        actionLabel &&
        onAction && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onAction}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#101827] bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              {actionLabel}
            </button>
          </div>
        )
      )}
    </div>
  );
}

export function InlineLoadingBanner({ label = 'Exécution du moteur déterministe...' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 flex items-center gap-2.5"
    >
      <Loader2 className="w-4 h-4 text-[#10B981] animate-spin shrink-0" />
      <span className="font-medium">{label}</span>
    </div>
  );
}

export interface HelpTooltipProps {
  term: string;
  explanation: string;
  officialRef?: string;
}

/**
 * Accessible contextual tooltip for technical tax terms.
 * Allows plain-French simplified UI while giving instant clarification when hovered or clicked.
 */
export function HelpTooltip({ term, explanation, officialRef }: HelpTooltipProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <span className="relative inline-flex items-center align-baseline">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={`Explication du terme ${term}`}
        aria-expanded={open}
        className="inline-flex items-center gap-0.5 border-b border-dotted border-slate-400 text-inherit font-medium hover:text-emerald-700 focus:outline-hidden cursor-help mx-0.5"
      >
        <span>{term}</span>
        <Info className="w-3 h-3 text-slate-400 hover:text-emerald-600 shrink-0" />
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2.5 bg-white text-slate-800 text-[11px] leading-relaxed rounded-md border border-slate-200 shadow-lg pointer-events-none"
        >
          <span className="font-bold block text-[#172033] mb-0.5">{term}</span>
          <span className="text-slate-600 block">{explanation}</span>
          {officialRef && (
            <span className="text-[10px] text-emerald-700 font-mono mt-1 pt-1 border-t border-slate-100 block">
              Réf : {officialRef}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export interface ExpandableDetailProps {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  officialRef?: string;
  className?: string;
}

/**
 * Standard progressive disclosure element for legal sources, calculation formulas, and assumptions.
 */
export function ExpandableDetail({
  summary,
  children,
  defaultOpen = false,
  officialRef,
  className = '',
}: ExpandableDetailProps) {
  return (
    <details
      open={defaultOpen}
      className={`group rounded-md border border-slate-200 bg-slate-50/60 p-3 text-xs transition-colors hover:border-slate-300 ${className}`}
    >
      <summary className="cursor-pointer select-none font-medium text-slate-700 flex items-center justify-between gap-2 list-none group-open:text-emerald-800">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 group-open:text-emerald-600 shrink-0" />
          <span>{summary}</span>
        </span>
        <span className="text-[10px] font-mono text-slate-500 group-open:rotate-180 transition-transform duration-150">
          ▼
        </span>
      </summary>
      <div className="mt-2.5 pt-2 border-t border-slate-200 text-slate-600 leading-relaxed space-y-1.5">
        {children}
        {officialRef && (
          <p className="text-[10px] font-mono text-emerald-800 pt-1">
            Source légale : {officialRef}
          </p>
        )}
      </div>
    </details>
  );
}

