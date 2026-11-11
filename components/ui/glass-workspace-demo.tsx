"use client";

import type { CSSProperties } from "react";
import GlassWorkspace, {
  type WorkspaceTransaction,
  type WorkspaceGoal,
  type WorkspaceCashFlowPeriod,
} from "@/components/ui/adjustable-glass-dashboard";

export const WARM_GLASS_PALETTE: CSSProperties = {
  "--gw-ink": "#242b27",
  "--gw-muted": "#384238",
  "--gw-accent": "#326b54",
  "--gw-line": "#283b3020",
  "--gw-background": "#d6cebf",
  "--gw-shade": "#e9e7df18",
  "--gw-surface": "#ffffff",
  "--gw-panel": "#ffffff",
  "--gw-brand": "#294b39",
  "--gw-brand-ink": "#ffffff",
  "--gw-avatar": "#f1e4d1",
  "--gw-rail-active": "#ffffff99",
  "--gw-positive-surface": "#dce9da",
  "--gw-account-surface": "#d9dfcf75",
  "--gw-account-action": "#ffffff77",
  "--gw-segment": "#293d3010",
  "--gw-segment-active": "#ffffffe0",
  "--gw-transaction-surface": "#e7dccb77",
  "--gw-income-surface": "#cadcc688",
  "--gw-pending": "#805b20",
  "--gw-goal-surface": "#d6d9c566",
  "--gw-dock": "#f4f2e655",
  "--gw-dock-active": "#fffffff0",
  "--gw-button": "#274b39",
  "--gw-button-ink": "#ffffff",
  "--gw-search": "#ffffff55",
  "--gw-savings-orb": "#d6e1c888",
  "--gw-popover": "#f5f0e9e8",
  "--gw-notification": "#f6f1e8ef",
  "--gw-fallback": "#f1ede5",
  "--gw-mobile-dock": "#ffffff44",
  "--gw-shadow": "#17291b48",
  "--gw-panel-shadow": "#14251c44",
  "--gw-soft-shadow": "#20292012",
  "--gw-segment-shadow": "#14251a10",
  "--gw-dock-shadow": "#14251c12",
  "--gw-popover-shadow": "#13201733",
  "--gw-sample-shadow": "#13331d80",
  "--gw-toast-shadow": "#0002",
  "--gw-toast": "#243e2e",
  "--gw-dock-ink": "#283e2e",
  "--gw-selection": "#698c7270",
  "--gw-scrollbar": "#8e9d88",
  "--gw-hover": "#ffffff28",
  "--gw-dock-hover": "#ffffff30",
  "--gw-control-hover": "#ffffff36",
  "--gw-strong-edge": "#ffffff99",
  "--gw-soft-edge": "#ffffff88",
  "--gw-toast-ink": "#ffffff",
  "--gw-highlight": "#ffffff",
} as CSSProperties;

export const DEFAULT_WARM_ROOM_BACKGROUND =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80";

const settings = {
  useHostTheme: false,
  blur: 22,
  opacity: 0.3,
  saturation: 1.2,
  edge: 0.6,
  tint: "#eadbc7",
};

const transactions: WorkspaceTransaction[] = [
  {
    id: "1",
    name: "Salaire net versé",
    category: "Income",
    date: "Aujourd'hui",
    amount: 4800,
    status: "Completed",
  },
  {
    id: "2",
    name: "Prélèvement à la source (PAS)",
    category: "Home",
    date: "Ce mois",
    amount: -395,
    status: "Completed",
  },
  {
    id: "3",
    name: "Crédit d'impôt Garde d'enfant",
    category: "Income",
    date: "Avance 60%",
    amount: 1050,
    status: "Completed",
  },
  {
    id: "4",
    name: "Versement PER déductible",
    category: "Travel",
    date: "Nov 2026",
    amount: -300,
    status: "Pending",
  },
];

const goals: WorkspaceGoal[] = [
  {
    id: "reserve",
    name: "Plafond Épargne Retraite (PER)",
    saved: 3000,
    target: 4637,
    color: "#326b54",
  },
  {
    id: "credit",
    name: "Crédits & Réductions 2042",
    saved: 1750,
    target: 2500,
    color: "#ab8b68",
  },
];

const cashFlowPeriods: WorkspaceCashFlowPeriod[] = [
  {
    id: "week",
    label: "Semaine",
    description: "Synthèse hebdomadaire.",
    points: [
      { label: "Lun", income: 680, expenses: 112 },
      { label: "Mar", income: 940, expenses: 188 },
      { label: "Mer", income: 720, expenses: 84 },
      { label: "Jeu", income: 1120, expenses: 245 },
      { label: "Ven", income: 760, expenses: 98 },
      { label: "Sam", income: 340, expenses: 174 },
      { label: "Dim", income: 240, expenses: 65 },
    ],
  },
  {
    id: "month",
    label: "Mois",
    description: "Revenus nets vs Impôt prélevé.",
    points: [
      { label: "Nov 01", income: 560, expenses: 124 },
      { label: "Nov 06", income: 660, expenses: 168 },
      { label: "Nov 11", income: 840, expenses: 174 },
      { label: "Nov 18", income: 1120, expenses: 238 },
      { label: "Nov 23", income: 1205, expenses: 258 },
      { label: "Nov 30", income: 1225, expenses: 292.3 },
    ],
  },
  {
    id: "year",
    label: "Année",
    description: "Projection annuelle 2026.",
    points: [
      { label: "Jan", income: 5200, expenses: 420 },
      { label: "Mar", income: 5200, expenses: 420 },
      { label: "Mai", income: 5200, expenses: 420 },
      { label: "Juil", income: 6250, expenses: 420 },
      { label: "Sept", income: 5200, expenses: 420 },
      { label: "Déc", income: 5800, expenses: 420 },
    ],
  },
];

export default function GlassWorkspaceDemo(
  props: Partial<typeof settings> = {},
) {
  const s = { ...settings, ...props };
  return (
    <GlassWorkspace
      brand="FISCALIQ"
      userName="Martin"
      currency="EUR"
      balance={54745}
      balanceChange={{ percent: 8.2, label: "net après impôt estimé" }}
      account={{ name: "Foyer fiscal · 2,5 parts", lastFour: "2026" }}
      periodLabel="Novembre 2026"
      cashFlowPeriods={cashFlowPeriods}
      initialPeriodId="month"
      footerNote="Barème officiel 2026 · Gratuit 0 € & Premium 5 €"
      savingsNote="Vos plafonds d'optimisation fiscale suivis en temps réel."
      useHostTheme={s.useHostTheme}
      style={WARM_GLASS_PALETTE}
      glass={s}
      transactions={transactions}
      goals={goals}
      backgroundImage={DEFAULT_WARM_ROOM_BACKGROUND}
    />
  );
}
