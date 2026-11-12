import { NextRequest, NextResponse } from 'next/server';
import { DEMO_PERSONAL_HOUSEHOLDS, PersonalHouseholdProfile } from '@/lib/data/personal-tax-dataset';
import {
  getOrCreateHouseholdSubscription,
  applyVerifiedPaymentWebhook,
  PUBLIC_SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLANS_CONFIG,
  paymentProviderAdapter,
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
import { resolveVerifiedHouseholdSession } from '@/lib/security/session-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedHouseholdId = searchParams.get('householdId');

  // Derive household strictly from verified session; never trust headers or query params for auth
  const session = resolveVerifiedHouseholdSession(request, requestedHouseholdId);
  if (!session.authenticated) {
    return NextResponse.json(
      {
        authorized: false,
        error: session.errorFr,
      },
      { status: session.httpStatus }
    );
  }

  const authenticatedHouseholdId = session.householdId;

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
    requestedHouseholdId: requestedHouseholdId || authenticatedHouseholdId,
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
    const rawBody = await request.text();
    let body: Record<string, unknown> = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
    }

    const action = String(body?.action || '');

    // Verified payment webhook endpoint: authenticates via HMAC-SHA256 signature header
    if (action === 'PAYMENT_WEBHOOK') {
      const signatureHeader = request.headers.get('x-payment-webhook-signature') || '';
      const webhookRes = applyVerifiedPaymentWebhook({
        rawBody,
        signatureHeader,
      });

      if (!webhookRes.allowed) {
        return NextResponse.json(
          {
            allowed: false,
            error: webhookRes.messageFr,
          },
          { status: webhookRes.httpStatus }
        );
      }

      return NextResponse.json({
        allowed: true,
        message: webhookRes.messageFr,
        activePlan: webhookRes.planConfig,
        usage: webhookRes.usage,
      });
    }

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

    // Derive household from verified session; never trust x-authenticated-household-id or body IDs
    const requestedTargetId =
      typeof body?.targetHouseholdId === 'string' ? body.targetHouseholdId : null;
    const session = resolveVerifiedHouseholdSession(request, requestedTargetId);
    if (!session.authenticated) {
      return NextResponse.json(
        {
          allowed: false,
          error: session.errorFr,
        },
        { status: session.httpStatus }
      );
    }

    const authenticatedHouseholdId = session.householdId;

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

      const clientHousehold = body?.household as PersonalHouseholdProfile | undefined;
      const fallbackHousehold =
        DEMO_PERSONAL_HOUSEHOLDS.find((h) => h.id === authenticatedHouseholdId) ||
        DEMO_PERSONAL_HOUSEHOLDS[0];

      const household: PersonalHouseholdProfile = {
        ...(clientHousehold || fallbackHousehold),
        id: authenticatedHouseholdId,
      };

      const genResult = generateAndStoreAuthorizedPdfReport({
        authenticatedHouseholdId,
        household,
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
        requestedHouseholdId: authenticatedHouseholdId,
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

    return NextResponse.json(
      {
        allowed: false,
        error:
          'Action non autorisée : les changements d’abonnement ne sont appliqués qu’après validation cryptographique d’un webhook de paiement vérifié.',
      },
      { status: 403 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne du serveur.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
