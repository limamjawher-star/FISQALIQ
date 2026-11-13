'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
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
  CreditCard,
} from 'lucide-react';

export default function PricingPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<'FREE' | 'PREMIUM'>('FREE');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const handleSelectPlan = async (planId: SubscriptionPlanId) => {
    setSelectedPlanId(planId);

    if (planId === 'FREE') {
      setStatusMessage(
        'Formule Gratuit (0 € / mois) active. Vos estimations et 1 rapport PDF par mois sont inclus.'
      );
      return;
    }

    setLoadingCheckout(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await res.json()) as {
        ok?: boolean;
        checkoutUrl?: string;
        messageFr?: string;
      };

      if (res.ok && data.ok && data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      setStatusMessage(
        data.messageFr ||
          'Le paiement Stripe Checkout (5 € / mois) sera actif dès la configuration des clés Stripe.'
      );
    } catch {
      setStatusMessage('Impossible de joindre le service de paiement Stripe.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    setLoadingCheckout(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        portalUrl?: string;
        messageFr?: string;
      };
      if (res.ok && data.ok && data.portalUrl) {
        window.location.assign(data.portalUrl);
        return;
      }
      setStatusMessage(
        data.messageFr ||
          'Le portail de facturation et résiliation Stripe n’est pas encore configuré.'
      );
    } catch {
      setStatusMessage('Impossible de joindre le portail client Stripe.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <AppShell title="Mon abonnement">
      <div className="space-y-4">
        {statusMessage && (
          <div className="gw-panel flex flex-wrap items-center justify-between gap-3 text-xs">
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

        {/* Two Options Only: Gratuit (0 €) and Premium (5 €) */}
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
                    disabled={loadingCheckout}
                    onClick={() => handleSelectPlan(planKey)}
                    className="gw-button"
                  >
                    <span>
                      {isPremium
                        ? loadingCheckout
                          ? 'Ouverture Stripe...'
                          : 'Passer en Premium (5 €/mois)'
                        : 'Utiliser Gratuit (0 €)'}
                    </span>
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        {/* Stripe Customer Portal & Security Note */}
        <section className="gw-panel flex flex-wrap items-center justify-between gap-4 text-xs text-[#384238]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#326b54] shrink-0" />
            <span>Sans engagement · Paiement sécurisé par Stripe · Aucune carte stockée sur nos serveurs.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenBillingPortal}
              className="inline-flex items-center gap-1.5 underline font-medium text-[#242b27]"
            >
              <CreditCard size={13} />
              <span>Factures et résiliation (Portail Stripe)</span>
            </button>
            <Link href="/onboarding" className="underline font-medium text-[#242b27]">
              Retour à mon impôt
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
