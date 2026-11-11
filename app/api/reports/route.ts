import { NextRequest, NextResponse } from 'next/server';
import { DEMO_PERSONAL_HOUSEHOLDS, PersonalHouseholdProfile } from '@/lib/data/personal-tax-dataset';
import {
  getOrCreateHouseholdSubscription,
  setHouseholdPlanForSimulation,
  PUBLIC_SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLANS_CONFIG,
  paymentProviderAdapter,
  SubscriptionPlanId,
  PersonalReportType,
} from '@/lib/subscriptions/entitlements';
import {
  listAuthorizedHouseholdReports,
  generateAndStoreAuthorizedPdfReport,
  issueSignedDownloadToken,
} from '@/lib/reports/pdf-report-service';
import {
  enforceApiRateLimit,
  extractClientIdentifier,
  verifyRequestOriginAndCsrf,
} from '@/lib/security/security-audit-and-gdpr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authenticatedHouseholdId =
    request.headers.get('x-authenticated-household-id') ||
    searchParams.get('authenticatedHouseholdId') ||
    '';
  const requestedHouseholdId =
    searchParams.get('householdId') || authenticatedHouseholdId;

  const rateLimit = enforceApiRateLimit({
    category: 'PDF_REPORTS',
    clientIdentifier: extractClientIdentifier(request, authenticatedHouseholdId),
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        authorized: false,
        error: `Limite de requêtes atteinte (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
      },
      { status: 429 }
    );
  }

  const listResult = listAuthorizedHouseholdReports({
    authenticatedHouseholdId,
    requestedHouseholdId,
  });

  if (!listResult.authorized) {
    return NextResponse.json(
      {
        authorized: false,
        error: listResult.errorFr,
      },
      { status: listResult.httpStatus }
    );
  }

  const usage = getOrCreateHouseholdSubscription(authenticatedHouseholdId);
  const activePlan = SUBSCRIPTION_PLANS_CONFIG[usage.planId];

  return NextResponse.json(
    {
      authorized: true,
      householdId: authenticatedHouseholdId,
      subscription: {
        activePlan,
        allPlans: PUBLIC_SUBSCRIPTION_PLANS.map((k) => SUBSCRIPTION_PLANS_CONFIG[k]),
        usage,
        paymentAbstraction: {
          providerId: paymentProviderAdapter.providerId,
          paymentsActiveInEnvironment: paymentProviderAdapter.paymentsActiveInEnvironment,
          cardStoragePolicy: paymentProviderAdapter.cardStoragePolicy,
        },
      },
      reports: listResult.reports,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const csrfCheck = verifyRequestOriginAndCsrf(request);
    if (!csrfCheck.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          error: csrfCheck.reasonFr || 'Requête inter-site non autorisée.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body?.action as string;
    const authenticatedHouseholdId =
      request.headers.get('x-authenticated-household-id') ||
      String(body?.authenticatedHouseholdId || '');
    const targetHouseholdId = String(
      body?.targetHouseholdId || body?.household?.id || authenticatedHouseholdId
    );

    const rateLimit = enforceApiRateLimit({
      category: 'PDF_REPORTS',
      clientIdentifier: extractClientIdentifier(request, authenticatedHouseholdId),
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          error: `Trop de requêtes sur les rapports PDF (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
        },
        { status: 429 }
      );
    }

    if (action === 'GENERATE_PDF_REPORT') {
      const reportType = (body?.reportType || 'BILAN_FISCAL_COMPLET') as PersonalReportType;
      const taxYear: 2026 | 2025 = body?.taxYear === 2025 ? 2025 : 2026;

      const household: PersonalHouseholdProfile =
        body?.household ||
        DEMO_PERSONAL_HOUSEHOLDS.find((h) => h.id === targetHouseholdId) ||
        DEMO_PERSONAL_HOUSEHOLDS[0];

      const genResult = generateAndStoreAuthorizedPdfReport({
        authenticatedHouseholdId,
        household: { ...household, id: targetHouseholdId },
        reportType,
        taxYear,
      });

      const updatedUsage = getOrCreateHouseholdSubscription(authenticatedHouseholdId);

      if (!genResult.allowed) {
        return NextResponse.json(
          {
            allowed: false,
            error: genResult.messageFr,
            usage: updatedUsage,
            activePlan: SUBSCRIPTION_PLANS_CONFIG[updatedUsage.planId],
          },
          { status: genResult.httpStatus }
        );
      }

      const listResult = listAuthorizedHouseholdReports({
        authenticatedHouseholdId,
        requestedHouseholdId: targetHouseholdId,
      });

      return NextResponse.json(
        {
          allowed: true,
          message: genResult.messageFr,
          createdReport: genResult.report,
          signedDownload: genResult.signedDownload,
          reports: listResult.reports,
          usage: updatedUsage,
          activePlan: SUBSCRIPTION_PLANS_CONFIG[updatedUsage.planId],
        },
        {
          headers: {
            'Cache-Control': 'private, no-store, max-age=0',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    if (action === 'REFRESH_SIGNED_URL') {
      if (!authenticatedHouseholdId || authenticatedHouseholdId !== targetHouseholdId) {
        return NextResponse.json(
          {
            allowed: false,
            error:
              'Accès refusé (403) : vous ne pouvez générer un lien de téléchargement que pour un rapport appartenant à votre propre foyer fiscal.',
          },
          { status: 403 }
        );
      }

      const reportId = String(body?.reportId || '');
      const freshSigned = issueSignedDownloadToken({
        reportId,
        householdId: authenticatedHouseholdId,
        ttlSeconds: 900,
      });

      return NextResponse.json({
        allowed: true,
        signedDownload: freshSigned,
      });
    }

    if (action === 'SWITCH_PLAN_SIMULATION') {
      const newPlanId = (body?.newPlanId || 'PLUS') as SubscriptionPlanId;
      const switchRes = setHouseholdPlanForSimulation(
        authenticatedHouseholdId,
        targetHouseholdId,
        newPlanId
      );

      if (!switchRes.allowed) {
        return NextResponse.json(
          {
            allowed: false,
            error: switchRes.messageFr,
          },
          { status: switchRes.httpStatus }
        );
      }

      const paymentIntentInfo = paymentProviderAdapter.preparePlanUpgradeIntent({
        householdId: authenticatedHouseholdId,
        targetPlanId: newPlanId,
      });

      return NextResponse.json({
        allowed: true,
        message: switchRes.messageFr,
        activePlan: switchRes.planConfig,
        usage: switchRes.usage,
        paymentAbstractionNotice: paymentIntentInfo,
      });
    }

    return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne du serveur.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
