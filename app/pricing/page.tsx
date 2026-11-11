'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { useFiscaliq } from '@/components/providers/fiscaliq-provider';
import {
  PUBLIC_SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLANS_CONFIG,
  SubscriptionPlanId,
} from '@/lib/subscriptions/entitlements';
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function PricingPage() {
  const { activeHousehold, pushToast } = useFiscaliq();
  const [selectedPlanId, setSelectedPlanId] = useState<'FREE' | 'PREMIUM'>('PREMIUM');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelectPlan = async (planId: 'FREE' | 'PREMIUM') => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-household-id': activeHousehold.id,
        },
        body: JSON.stringify({
          action: 'SWITCH_PLAN_SIMULATION',
          authenticatedHouseholdId: activeHousehold.id,
          targetHouseholdId: activeHousehold.id,
          newPlanId: planId as SubscriptionPlanId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.allowed) {
        setSelectedPlanId(planId);
        setStatusMessage(data.message);
        pushToast({
          title: `Formule ${SUBSCRIPTION_PLANS_CONFIG[planId].nameFr} activée`,
          message: SUBSCRIPTION_PLANS_CONFIG[planId].pricingDisplayLabelFr,
          variant: 'success',
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AppShell title="Abonnement · Gratuit & Premium 5 €">
      <div className="space-y-4">
        {statusMessage && (
          <div className="gw-panel flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Check size={15} className="text-[#326b54]" />
              <span>{statusMessage}</span>
            </div>
            <Link href="/reports" className="gw-button">
              <span>Mes rapports PDF</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Only Two Simple Options: Gratuit (0 €) and Premium (5 €) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PUBLIC_SUBSCRIPTION_PLANS.map((planKey) => {
            const plan = SUBSCRIPTION_PLANS_CONFIG[planKey];
            const isSelected = selectedPlanId === planKey;
            const isPremium = planKey === 'PREMIUM';

            return (
              <section
                key={planKey}
                className={`gw-panel gw-reveal flex flex-col justify-between transition-all ${
                  isSelected ? 'ring-2 ring-[#326b54]' : ''
                }`}
              >
                <div className="space-y-4">
                  <div className="gw-panel-title">
                    <h2 className="flex items-center gap-2 text-base">
                      {isPremium && <Sparkles size={16} className="text-[#326b54]" />}
                      <span>{plan.nameFr}</span>
                    </h2>
                    {isSelected && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#dce9da] text-[#242b27]">
                        Actif
                      </span>
                    )}
                  </div>

                  <div>
                    <strong className="gw-balance-value block">
                      {isPremium ? '5 €' : '0 €'}
                      <span className="text-sm font-normal text-[#384238]"> / mois</span>
                    </strong>
                    <p className="text-xs text-[#384238] mt-1">{plan.taglineFr}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 border-y border-black/10">
                    <div>
                      <strong className="block text-sm">{plan.limits.monthlyPdfReportsMax}</strong>
                      <span className="text-[10px] text-[#384238]">PDF / mois</span>
                    </div>
                    <div>
                      <strong className="block text-sm">{plan.limits.savedSimulationsMax}</strong>
                      <span className="text-[10px] text-[#384238]">Simulations</span>
                    </div>
                    <div>
                      <strong className="block text-sm">{plan.limits.monthlyAssistantQuestionsMax}</strong>
                      <span className="text-[10px] text-[#384238]">Questions IA</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs">
                    {plan.includedBulletsFr.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check size={15} className="text-[#326b54] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5 mt-5 border-t border-black/10 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#384238]">{plan.pricingStatusNoteFr}</span>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleSelectPlan(planKey)}
                    className="gw-button"
                  >
                    <span>
                      {isSelected ? `Formule ${plan.nameFr} active` : `Choisir ${plan.nameFr}`}
                    </span>
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        {/* Minimal Security Note */}
        <section className="gw-panel flex items-center justify-between gap-4 text-xs text-[#384238]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#326b54] shrink-0" />
            <span>Sans engagement · Zéro coordonnée bancaire stockée · Rapports PDF privés.</span>
          </div>
          <Link href="/dashboard" className="underline font-medium text-[#242b27]">
            Retour Overview
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
