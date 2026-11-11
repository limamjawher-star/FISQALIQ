'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  DEMO_COMPANIES,
  DEMO_EMPLOYEES,
  DemoCompanyProfile,
  DemoEmployeeRecord,
  LEGAL_TAX_OPTIMIZATION_LEVERS,
  LegalTaxLever,
  REGULATORY_DEADLINES_DEMO,
  RegulatoryDeadline,
  INITIAL_SAVED_CALCULATIONS,
  SavedCalculationRecord,
  INITIAL_DASHBOARD_ACTIVITIES,
  DashboardActivityRecord,
} from '@/lib/data/demo-dataset';
import {
  DEMO_PERSONAL_HOUSEHOLDS,
  PersonalHouseholdProfile,
  PERSONAL_TAX_OPPORTUNITIES,
  PersonalTaxAdvantageOpportunity,
  PERSONAL_TAX_CALENDAR_2026,
  PersonalTaxCalendarItem,
  INITIAL_SAVED_PERSONAL_SIMULATIONS,
  SavedPersonalSimulation,
} from '@/lib/data/personal-tax-dataset';
import {
  calculateCorporateTax,
  calculateProfitabilityMetrics,
  CorporateTaxResult,
  ProfitabilityResult,
} from '@/lib/calculations/engine';
import {
  calculatePersonalIncomeTax,
  calculatePersonalSalaryToNetAfterTax,
  PersonalIncomeTaxResult,
  PersonalSalarySimulatorResult,
} from '@/lib/calculations/personal-tax-engine';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  variant?: 'success' | 'info' | 'warning' | 'error';
}

interface FiscaliqContextValue {
  // Personal & Household Tax Intelligence State (Primary Product Direction)
  households: PersonalHouseholdProfile[];
  activeHousehold: PersonalHouseholdProfile;
  selectHouseholdById: (id: string) => void;
  updateActiveHousehold: (patch: Partial<PersonalHouseholdProfile>) => void;
  personalTaxSummary: PersonalIncomeTaxResult;
  personalSalarySummary: PersonalSalarySimulatorResult;
  personalOpportunities: PersonalTaxAdvantageOpportunity[];
  togglePersonalOpportunityStatus: (
    id: string,
    status: PersonalTaxAdvantageOpportunity['status']
  ) => void;
  personalCalendar: PersonalTaxCalendarItem[];
  updatePersonalCalendarStatus: (
    id: string,
    status: PersonalTaxCalendarItem['status']
  ) => void;
  savedPersonalSimulations: SavedPersonalSimulation[];
  savePersonalSimulation: (
    sim: Omit<SavedPersonalSimulation, 'id' | 'createdAt'>
  ) => void;
  deletePersonalSimulation: (id: string) => void;
  restoreDefaultPersonalSimulations: () => void;

  // Global Toast Notifications
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Legacy / Remaining Stage-by-Stage Compatibility State
  companies: DemoCompanyProfile[];
  activeCompany: DemoCompanyProfile;
  selectCompanyById: (id: string) => void;
  updateActiveCompany: (patch: Partial<DemoCompanyProfile>) => void;
  employees: DemoEmployeeRecord[];
  addEmployee: (emp: Omit<DemoEmployeeRecord, 'id'>) => void;
  removeEmployee: (id: string) => void;
  taxLevers: LegalTaxLever[];
  toggleTaxLeverStatus: (id: string, status: LegalTaxLever['status']) => void;
  deadlines: RegulatoryDeadline[];
  updateDeadlineStatus: (id: string, status: RegulatoryDeadline['status']) => void;
  savedCalculations: SavedCalculationRecord[];
  saveCalculation: (calc: Omit<SavedCalculationRecord, 'id' | 'createdAt'>) => void;
  deleteSavedCalculation: (id: string) => void;
  restoreDefaultSavedCalculations: () => void;
  activityLog: DashboardActivityRecord[];
  logActivity: (entry: Omit<DashboardActivityRecord, 'id' | 'timestamp'>) => void;
  corporateTaxSummary: CorporateTaxResult;
  profitabilitySummary: ProfitabilityResult;
}

const FiscaliqContext = createContext<FiscaliqContextValue | null>(null);

function formatNowTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} · ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

export function FiscaliqProvider({ children }: { children: React.ReactNode }) {
  // Primary Personal Tax State
  const [households, setHouseholds] = useState<PersonalHouseholdProfile[]>(
    DEMO_PERSONAL_HOUSEHOLDS
  );
  const [activeHouseholdId, setActiveHouseholdId] = useState<string>(
    DEMO_PERSONAL_HOUSEHOLDS[0].id
  );
  const [personalOpportunities, setPersonalOpportunities] = useState<
    PersonalTaxAdvantageOpportunity[]
  >(PERSONAL_TAX_OPPORTUNITIES);
  const [personalCalendar, setPersonalCalendar] = useState<PersonalTaxCalendarItem[]>(
    PERSONAL_TAX_CALENDAR_2026
  );
  const [savedPersonalSimulations, setSavedPersonalSimulations] = useState<
    SavedPersonalSimulation[]
  >(INITIAL_SAVED_PERSONAL_SIMULATIONS);

  // Toast State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const pushToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  // Legacy B2B State (preserved so remaining secondary routes do not break before their replacement stage)
  const [companies, setCompanies] = useState<DemoCompanyProfile[]>(DEMO_COMPANIES);
  const [activeCompanyId, setActiveCompanyId] = useState<string>(DEMO_COMPANIES[0].id);
  const [employees, setEmployees] = useState<DemoEmployeeRecord[]>(DEMO_EMPLOYEES);
  const [taxLevers, setTaxLevers] = useState<LegalTaxLever[]>(LEGAL_TAX_OPTIMIZATION_LEVERS);
  const [deadlines, setDeadlines] = useState<RegulatoryDeadline[]>(REGULATORY_DEADLINES_DEMO);
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculationRecord[]>(
    INITIAL_SAVED_CALCULATIONS
  );
  const [activityLog, setActivityLog] = useState<DashboardActivityRecord[]>([
    {
      id: 'act-perso-01',
      companyId: 'foyer-couple-2-enfants',
      timestamp: '08/11/2026 · 09:20',
      category: 'simulation',
      title: 'Estimation d’impôt sur le revenu 2026 calculée (3 parts)',
      detail: 'Impôt net annuel calculé selon le barème progressif 2026 après crédit d’impôt garde d’enfant (Tranche marginale 11 %).',
      actor: 'Simulateur IR 2026 (Barème officiel)',
      classification: 'CALCUL_VERIFIE',
    },
    {
      id: 'act-perso-02',
      companyId: 'foyer-couple-2-enfants',
      timestamp: '07/11/2026 · 18:15',
      category: 'optimisation',
      title: 'Crédit d’impôt garde d’enfant (< 6 ans) vérifié',
      detail: '50 % des dépenses prises en compte (plafond légal de 3 500 € par enfant, CGI Art. 200 quater B).',
      actor: 'Découverte des aides & réductions',
      classification: 'CALCUL_VERIFIE',
    },
    {
      id: 'act-perso-03',
      companyId: 'foyer-couple-2-enfants',
      timestamp: '06/11/2026 · 14:10',
      category: 'conformite',
      title: 'Avance de 60 % des crédits d’impôt (Janvier 2026) marquée comme reçue',
      detail: 'Virement automatique DGFiP sur le compte bancaire du foyer.',
      actor: 'Calendrier fiscal particulier',
      classification: 'DONNEE_FICTIVE_DEMO',
    },
    {
      id: 'act-perso-04',
      companyId: 'foyer-couple-2-enfants',
      timestamp: '05/11/2026 · 11:05',
      category: 'simulation',
      title: 'Comparaison Abattement 10 % vs Frais réels effectuée',
      detail: 'Vérification automatique du plafond et du plancher de la déduction de 10 % (CGI Art. 83-3°).',
      actor: 'Compagnon déclaratif',
      classification: 'CALCUL_VERIFIE',
    },
  ]);

  const activeHousehold = useMemo(() => {
    return households.find((h) => h.id === activeHouseholdId) || households[0];
  }, [households, activeHouseholdId]);

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === activeCompanyId) || companies[0];
  }, [companies, activeCompanyId]);

  const logActivity = (entry: Omit<DashboardActivityRecord, 'id' | 'timestamp'>) => {
    const record: DashboardActivityRecord = {
      ...entry,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: formatNowTimestamp(),
    };
    setActivityLog((prev) => [record, ...prev]);
  };

  // Personal Household Actions
  const selectHouseholdById = (id: string) => {
    setActiveHouseholdId(id);
    const target = households.find((h) => h.id === id);
    if (target) {
      logActivity({
        companyId: target.id,
        category: 'dossier',
        title: `Profil de foyer sélectionné : ${target.householdName}`,
        detail: `${target.situationSummary} · Revenu déclaré ${target.annualDeclaredSalaryNetImposableEur.toLocaleString('fr-FR')} €/an.`,
        actor: 'Sélecteur de situation personnelle',
        classification: 'DONNEE_FICTIVE_DEMO',
      });
      pushToast({
        variant: 'info',
        title: `Foyer actif : ${target.householdName.split('(')[0].trim()}`,
        message: `Calculs mis à jour (${target.annualDeclaredSalaryNetImposableEur.toLocaleString('fr-FR')} € de revenu déclaré).`,
      });
    }
  };

  const updateActiveHousehold = (patch: Partial<PersonalHouseholdProfile>) => {
    setHouseholds((prev) =>
      prev.map((h) => (h.id === activeHousehold.id ? { ...h, ...patch } : h))
    );
    logActivity({
      companyId: activeHousehold.id,
      category: 'dossier',
      title: 'Situation personnelle mise à jour',
      detail: `Recalcul immédiat de l’impôt sur le revenu et du quotient familial pour ${activeHousehold.householdName}.`,
      actor: 'Mon profil fiscal',
      classification: 'ESTIMATION',
    });
    pushToast({
      variant: 'success',
      title: 'Profil fiscal mis à jour',
      message: 'Votre impôt annuel, votre quotient familial et votre taux de PAS ont été recalculés.',
    });
  };

  const togglePersonalOpportunityStatus = (
    id: string,
    status: PersonalTaxAdvantageOpportunity['status']
  ) => {
    const target = personalOpportunities.find((o) => o.id === id);
    setPersonalOpportunities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    if (target) {
      const label =
        status === 'deja_applique'
          ? 'Appliqué à ma simulation'
          : status === 'eligible_a_verifier'
          ? 'Éligibilité à vérifier'
          : 'Non concerné';
      logActivity({
        companyId: activeHousehold.id,
        category: 'optimisation',
        title: `Avantage fiscal mis à jour : ${label}`,
        detail: `${target.title} (${target.statutoryReference}).`,
        actor: 'Découverte des réductions & crédits d’impôt',
        classification: 'ESTIMATION',
      });
      pushToast({
        variant: 'success',
        title: label,
        message: target.title,
      });
    }
  };

  const updatePersonalCalendarStatus = (
    id: string,
    status: PersonalTaxCalendarItem['status']
  ) => {
    const target = personalCalendar.find((c) => c.id === id);
    setPersonalCalendar((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    if (target) {
      const label =
        status === 'effectue'
          ? 'Effectué'
          : status === 'a_preparer'
          ? 'À préparer'
          : 'À vérifier';
      logActivity({
        companyId: activeHousehold.id,
        category: 'conformite',
        title: `Étape du calendrier fiscal : ${label}`,
        detail: `${target.title} (${target.periodLabel}).`,
        actor: 'Calendrier de déclaration',
        classification: 'DONNEE_FICTIVE_DEMO',
      });
      pushToast({
        variant: 'info',
        title: `Échéance marquée « ${label} »`,
        message: `${target.title} (${target.periodLabel})`,
      });
    }
  };

  const savePersonalSimulation = (
    sim: Omit<SavedPersonalSimulation, 'id' | 'createdAt'>
  ) => {
    const newSim: SavedPersonalSimulation = {
      ...sim,
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: formatNowTimestamp(),
    };
    setSavedPersonalSimulations((prev) => [newSim, ...prev]);
    logActivity({
      companyId: sim.householdId,
      category: 'simulation',
      title: `Simulation personnelle sauvegardée : ${sim.title}`,
      detail: `${sim.mainResultLabel} : ${sim.mainResultAmountEur.toLocaleString('fr-FR')} € (${sim.statutoryRef}).`,
      actor: 'Calculateur IR déterministe',
      classification: sim.classification,
    });
    pushToast({
      variant: 'success',
      title: 'Simulation sauvegardée',
      message: `${sim.title} (${sim.mainResultAmountEur.toLocaleString('fr-FR')} €)`,
    });
  };

  const deletePersonalSimulation = (id: string) => {
    setSavedPersonalSimulations((prev) => prev.filter((s) => s.id !== id));
    pushToast({
      variant: 'info',
      title: 'Simulation supprimée',
      message: 'La simulation a été retirée de votre historique.',
    });
  };

  const restoreDefaultPersonalSimulations = () => {
    setSavedPersonalSimulations(INITIAL_SAVED_PERSONAL_SIMULATIONS);
    pushToast({
      variant: 'success',
      title: 'Simulations restaurées',
      message: 'Les scénarios de référence ont été rechargés.',
    });
  };

  const personalTaxSummary = useMemo(() => {
    return calculatePersonalIncomeTax({
      annualDeclaredIncomeEur: activeHousehold.annualDeclaredSalaryNetImposableEur,
      additionalTaxableIncomeEur: activeHousehold.additionalNetTaxableIncomeEur,
      maritalStatus: activeHousehold.maritalStatus,
      dependantsCount: activeHousehold.dependantsCount,
      perDeductibleContributionEur: activeHousehold.perContributionAnnualEur,
      estimatedTaxCreditsEur: activeHousehold.estimatedEligibleTaxCreditsEur,
      taxYear: 2026,
    });
  }, [activeHousehold]);

  const personalSalarySummary = useMemo(() => {
    return calculatePersonalSalaryToNetAfterTax({
      grossMonthlySalaryEur: activeHousehold.grossMonthlySalaryEur,
      status: activeHousehold.employmentCategory,
      maritalStatus: activeHousehold.maritalStatus,
      dependantsCount: activeHousehold.dependantsCount,
      taxYear: 2026,
    });
  }, [activeHousehold]);

  // Legacy B2B Actions
  const selectCompanyById = (id: string) => {
    setActiveCompanyId(id);
  };

  const updateActiveCompany = (patch: Partial<DemoCompanyProfile>) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === activeCompany.id ? { ...c, ...patch } : c))
    );
  };

  const addEmployee = (emp: Omit<DemoEmployeeRecord, 'id'>) => {
    const newEmp: DemoEmployeeRecord = {
      ...emp,
      id: `emp-${Date.now()}`,
    };
    setEmployees((prev) => [newEmp, ...prev]);
  };

  const removeEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const toggleTaxLeverStatus = (id: string, status: LegalTaxLever['status']) => {
    setTaxLevers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const updateDeadlineStatus = (id: string, status: RegulatoryDeadline['status']) => {
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
  };

  const saveCalculation = (calc: Omit<SavedCalculationRecord, 'id' | 'createdAt'>) => {
    const newRecord: SavedCalculationRecord = {
      ...calc,
      id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: formatNowTimestamp(),
    };
    setSavedCalculations((prev) => [newRecord, ...prev]);
  };

  const deleteSavedCalculation = (id: string) => {
    setSavedCalculations((prev) => prev.filter((c) => c.id !== id));
  };

  const restoreDefaultSavedCalculations = () => {
    setSavedCalculations(INITIAL_SAVED_CALCULATIONS);
  };

  const corporateTaxSummary = useMemo(() => {
    return calculateCorporateTax({
      annualTurnoverHt: activeCompany.annualTurnoverHt,
      taxableProfit: activeCompany.taxableProfitEstimate,
      isCapitalFullyPaidUp: activeCompany.isCapitalFullyPaidUp,
      physicalPersonOwnershipShare: activeCompany.physicalPersonOwnershipShare / 100,
    });
  }, [activeCompany]);

  const profitabilitySummary = useMemo(() => {
    return calculateProfitabilityMetrics({
      annualRevenueHt: activeCompany.annualTurnoverHt,
      variableCostsHt: activeCompany.variableCostsHt,
      fixedExternalExpensesHt: activeCompany.fixedExternalExpensesHt,
      operatingTaxesHt: activeCompany.operatingTaxesHt,
      totalPayrollCost: activeCompany.totalPayrollCost,
      depreciationAndAmortization: activeCompany.depreciationAndAmortization,
      isPmeReducedRateEligible: corporateTaxSummary.isEligibleForPmeReducedRate,
    });
  }, [activeCompany, corporateTaxSummary.isEligibleForPmeReducedRate]);

  const value: FiscaliqContextValue = {
    households,
    activeHousehold,
    selectHouseholdById,
    updateActiveHousehold,
    personalTaxSummary,
    personalSalarySummary,
    personalOpportunities,
    togglePersonalOpportunityStatus,
    personalCalendar,
    updatePersonalCalendarStatus,
    savedPersonalSimulations,
    savePersonalSimulation,
    deletePersonalSimulation,
    restoreDefaultPersonalSimulations,

    toasts,
    pushToast,
    dismissToast,

    companies,
    activeCompany,
    selectCompanyById,
    updateActiveCompany,
    employees,
    addEmployee,
    removeEmployee,
    taxLevers,
    toggleTaxLeverStatus,
    deadlines,
    updateDeadlineStatus,
    savedCalculations,
    saveCalculation,
    deleteSavedCalculation,
    restoreDefaultSavedCalculations,
    activityLog,
    logActivity,
    corporateTaxSummary,
    profitabilitySummary,
  };

  return (
    <FiscaliqContext.Provider value={value}>
      {children}
      {/* Global Toast Notification Stack */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-label="Notifications de l'application"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto rounded-lg border border-slate-200 bg-white/95 backdrop-blur-md p-3.5 shadow-lg flex items-start justify-between gap-3 text-xs transition-all duration-150"
            >
              <div className="flex items-start gap-2.5">
                {toast.variant === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : toast.variant === 'info' ? (
                  <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold text-[#172033]">{toast.title}</p>
                  <p className="text-slate-600 leading-snug">{toast.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Fermer la notification"
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </FiscaliqContext.Provider>
  );
}

export function useFiscaliq() {
  const ctx = useContext(FiscaliqContext);
  if (!ctx) {
    throw new Error('useFiscaliq must be used inside FiscaliqProvider');
  }
  return ctx;
}



