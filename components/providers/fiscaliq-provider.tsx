'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { DashboardActivityRecord } from '@/lib/data/demo-dataset';
import {
  DEMO_PERSONAL_HOUSEHOLDS,
  EMPTY_USER_HOUSEHOLD,
  USER_HOUSEHOLD_ID,
  PersonalHouseholdProfile,
  PERSONAL_TAX_OPPORTUNITIES,
  PersonalTaxAdvantageOpportunity,
  PERSONAL_TAX_CALENDAR_2026,
  PersonalTaxCalendarItem,
  SavedPersonalSimulation,
} from '@/lib/data/personal-tax-dataset';
import {
  calculatePersonalIncomeTax,
  calculatePersonalSalaryToNetAfterTax,
  PersonalIncomeTaxResult,
  PersonalSalarySimulatorResult,
} from '@/lib/calculations/personal-tax-engine';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const STORAGE_KEY_USER_PROFILE = 'fiscaliq_user_household_v1';
const STORAGE_KEY_SAVED_SIMULATIONS = 'fiscaliq_saved_simulations_v1';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  variant?: 'success' | 'info' | 'warning' | 'error';
}

interface FiscaliqContextValue {
  // User profile & Demo household state
  userHousehold: PersonalHouseholdProfile;
  demoHouseholds: PersonalHouseholdProfile[];
  households: PersonalHouseholdProfile[];
  activeHousehold: PersonalHouseholdProfile;
  isViewingDemo: boolean;
  selectHouseholdById: (id: string) => void;
  loadDemoHousehold: (demoId?: string) => void;
  exitDemoMode: () => void;
  saveUserProfile: (patch: Partial<PersonalHouseholdProfile>) => void;
  updateActiveHousehold: (patch: Partial<PersonalHouseholdProfile>) => void;
  clearUserData: () => void;

  // Calculated summaries
  personalTaxSummary: PersonalIncomeTaxResult;
  personalSalarySummary: PersonalSalarySimulatorResult;

  // Opportunities, calendar, simulations, activity
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
  activityLog: DashboardActivityRecord[];
  logActivity: (entry: Omit<DashboardActivityRecord, 'id' | 'timestamp'>) => void;

  // Global Toast Notifications
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
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
  // 1. New visitors start with an EMPTY user profile (or persisted localStorage profile)
  const [userHousehold, setUserHousehold] = useState<PersonalHouseholdProfile>(() => {
    if (typeof window === 'undefined') return EMPTY_USER_HOUSEHOLD;
    try {
      const rawProfile = window.localStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as Partial<PersonalHouseholdProfile>;
        if (parsed && typeof parsed === 'object') {
          return {
            ...EMPTY_USER_HOUSEHOLD,
            ...parsed,
            id: USER_HOUSEHOLD_ID,
            isDemoData: false,
          };
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return EMPTY_USER_HOUSEHOLD;
  });

  const [activeHouseholdId, setActiveHouseholdId] = useState<string>(
    USER_HOUSEHOLD_ID
  );
  const [personalOpportunities, setPersonalOpportunities] = useState<
    PersonalTaxAdvantageOpportunity[]
  >(PERSONAL_TAX_OPPORTUNITIES);
  const [personalCalendar, setPersonalCalendar] = useState<PersonalTaxCalendarItem[]>(
    PERSONAL_TAX_CALENDAR_2026
  );
  const [savedPersonalSimulations, setSavedPersonalSimulations] = useState<
    SavedPersonalSimulation[]
  >(() => {
    if (typeof window === 'undefined') return [];
    try {
      const rawSims = window.localStorage.getItem(STORAGE_KEY_SAVED_SIMULATIONS);
      if (rawSims) {
        const parsedSims = JSON.parse(rawSims);
        if (Array.isArray(parsedSims)) {
          return parsedSims;
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });
  const [activityLog, setActivityLog] = useState<DashboardActivityRecord[]>([]);

  // Toast State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Persist userHousehold changes to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_USER_PROFILE,
        JSON.stringify(userHousehold)
      );
    } catch {
      // Ignore storage write errors
    }
  }, [userHousehold]);

  // Persist savedPersonalSimulations changes to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_SAVED_SIMULATIONS,
        JSON.stringify(savedPersonalSimulations)
      );
    } catch {
      // Ignore storage write errors
    }
  }, [savedPersonalSimulations]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const logActivity = useCallback(
    (entry: Omit<DashboardActivityRecord, 'id' | 'timestamp'>) => {
      const record: DashboardActivityRecord = {
        ...entry,
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: formatNowTimestamp(),
      };
      setActivityLog((prev) => [record, ...prev]);
    },
    []
  );

  const households = useMemo(
    () => [userHousehold, ...DEMO_PERSONAL_HOUSEHOLDS],
    [userHousehold]
  );

  const activeHousehold = useMemo(() => {
    if (activeHouseholdId === USER_HOUSEHOLD_ID) {
      return userHousehold;
    }
    return (
      DEMO_PERSONAL_HOUSEHOLDS.find((h) => h.id === activeHouseholdId) ||
      userHousehold
    );
  }, [activeHouseholdId, userHousehold]);

  const isViewingDemo = activeHousehold.id !== USER_HOUSEHOLD_ID;

  const selectHouseholdById = useCallback(
    (id: string) => {
      setActiveHouseholdId(id);
      if (id === USER_HOUSEHOLD_ID) {
        pushToast({
          variant: 'info',
          title: 'Mon profil actif',
          message: 'Vous consultez votre propre profil fiscal.',
        });
        return;
      }
      const target = DEMO_PERSONAL_HOUSEHOLDS.find((h) => h.id === id);
      if (target) {
        pushToast({
          variant: 'info',
          title: `Exemple actif : ${target.householdName.split('(')[0].trim()}`,
          message: `Exemple fictif chargé (${target.annualDeclaredSalaryNetImposableEur.toLocaleString('fr-FR')} € / an).`,
        });
      }
    },
    [pushToast]
  );

  const loadDemoHousehold = useCallback(
    (demoId?: string) => {
      const targetId = demoId || DEMO_PERSONAL_HOUSEHOLDS[0].id;
      selectHouseholdById(targetId);
    },
    [selectHouseholdById]
  );

  const exitDemoMode = useCallback(() => {
    setActiveHouseholdId(USER_HOUSEHOLD_ID);
    pushToast({
      variant: 'info',
      title: 'Retour à votre profil',
      message: 'L’exemple de démonstration a été fermé.',
    });
  }, [pushToast]);

  // Always updates the user's own profile (never overwrites a demo household)
  const saveUserProfile = useCallback(
    (patch: Partial<PersonalHouseholdProfile>) => {
      setUserHousehold((prev) => ({
        ...prev,
        ...patch,
        id: USER_HOUSEHOLD_ID,
        isDemoData: false,
      }));
      setActiveHouseholdId(USER_HOUSEHOLD_ID);
      logActivity({
        companyId: USER_HOUSEHOLD_ID,
        category: 'dossier',
        title: 'Profil fiscal personnel enregistré',
        detail: 'Calculs d’impôt et de parts fiscales mis à jour.',
        actor: 'Mon profil fiscal',
        classification: 'ESTIMATION',
      });
      pushToast({
        variant: 'success',
        title: 'Profil fiscal enregistré',
        message: 'Vos données sont sauvegardées sur cet appareil.',
      });
    },
    [logActivity, pushToast]
  );

  const updateActiveHousehold = useCallback(
    (patch: Partial<PersonalHouseholdProfile>) => {
      saveUserProfile(patch);
    },
    [saveUserProfile]
  );

  const clearUserData = useCallback(() => {
    setUserHousehold(EMPTY_USER_HOUSEHOLD);
    setSavedPersonalSimulations([]);
    setActivityLog([]);
    setActiveHouseholdId(USER_HOUSEHOLD_ID);
    try {
      window.localStorage.removeItem(STORAGE_KEY_USER_PROFILE);
      window.localStorage.removeItem(STORAGE_KEY_SAVED_SIMULATIONS);
    } catch {
      // Ignore storage errors
    }
    pushToast({
      variant: 'info',
      title: 'Données effacées',
      message: 'Votre profil et vos simulations sauvegardées ont été réinitialisés.',
    });
  }, [pushToast]);

  const togglePersonalOpportunityStatus = useCallback(
    (id: string, status: PersonalTaxAdvantageOpportunity['status']) => {
      setPersonalOpportunities((prev) => {
        const target = prev.find((o) => o.id === id);
        if (target) {
          const label =
            status === 'deja_applique'
              ? 'Appliqué à ma simulation'
              : status === 'eligible_a_verifier'
              ? 'Éligibilité à vérifier'
              : 'Non concerné';
          pushToast({
            variant: 'success',
            title: label,
            message: target.title,
          });
        }
        return prev.map((item) => (item.id === id ? { ...item, status } : item));
      });
    },
    [pushToast]
  );

  const updatePersonalCalendarStatus = useCallback(
    (id: string, status: PersonalTaxCalendarItem['status']) => {
      setPersonalCalendar((prev) => {
        const target = prev.find((c) => c.id === id);
        if (target) {
          const label =
            status === 'effectue'
              ? 'Effectué'
              : status === 'a_preparer'
              ? 'À préparer'
              : 'À vérifier';
          pushToast({
            variant: 'info',
            title: `Échéance marquée « ${label} »`,
            message: `${target.title} (${target.periodLabel})`,
          });
        }
        return prev.map((item) => (item.id === id ? { ...item, status } : item));
      });
    },
    [pushToast]
  );

  const savePersonalSimulation = useCallback(
    (sim: Omit<SavedPersonalSimulation, 'id' | 'createdAt'>) => {
      const newSim: SavedPersonalSimulation = {
        ...sim,
        householdId: USER_HOUSEHOLD_ID,
        id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: formatNowTimestamp(),
      };
      setSavedPersonalSimulations((prev) => [newSim, ...prev]);
      logActivity({
        companyId: USER_HOUSEHOLD_ID,
        category: 'simulation',
        title: `Simulation sauvegardée : ${sim.title}`,
        detail: `${sim.mainResultLabel} : ${sim.mainResultAmountEur.toLocaleString('fr-FR')} €.`,
        actor: 'Calculateur IR',
        classification: sim.classification,
      });
      pushToast({
        variant: 'success',
        title: 'Simulation sauvegardée',
        message: `${sim.title} (${sim.mainResultAmountEur.toLocaleString('fr-FR')} €)`,
      });
    },
    [logActivity, pushToast]
  );

  const deletePersonalSimulation = useCallback(
    (id: string) => {
      setSavedPersonalSimulations((prev) => prev.filter((s) => s.id !== id));
      pushToast({
        variant: 'info',
        title: 'Simulation supprimée',
        message: 'La simulation a été retirée de votre historique.',
      });
    },
    [pushToast]
  );

  const restoreDefaultPersonalSimulations = useCallback(() => {
    setSavedPersonalSimulations([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY_SAVED_SIMULATIONS);
    } catch {
      // Ignore storage errors
    }
    pushToast({
      variant: 'info',
      title: 'Historique vidé',
      message: 'Vos simulations sauvegardées ont été effacées.',
    });
  }, [pushToast]);

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

  const value = useMemo<FiscaliqContextValue>(
    () => ({
      userHousehold,
      demoHouseholds: DEMO_PERSONAL_HOUSEHOLDS,
      households,
      activeHousehold,
      isViewingDemo,
      selectHouseholdById,
      loadDemoHousehold,
      exitDemoMode,
      saveUserProfile,
      updateActiveHousehold,
      clearUserData,
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
      activityLog,
      logActivity,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      userHousehold,
      households,
      activeHousehold,
      isViewingDemo,
      selectHouseholdById,
      loadDemoHousehold,
      exitDemoMode,
      saveUserProfile,
      updateActiveHousehold,
      clearUserData,
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
      activityLog,
      logActivity,
      toasts,
      pushToast,
      dismissToast,
    ]
  );

  return (
    <FiscaliqContext.Provider value={value}>
      {children}
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
