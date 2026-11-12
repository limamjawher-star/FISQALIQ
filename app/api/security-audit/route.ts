import { NextRequest, NextResponse } from 'next/server';
import {
  DEMO_PERSONAL_HOUSEHOLDS,
  INITIAL_SAVED_PERSONAL_SIMULATIONS,
} from '@/lib/data/personal-tax-dataset';
import {
  listAuthorizedHouseholdReports,
  purgeHouseholdReportsForGdprErasure,
} from '@/lib/reports/pdf-report-service';
import {
  getOrCreateHouseholdSubscription,
  SUBSCRIPTION_PLANS_CONFIG,
} from '@/lib/subscriptions/entitlements';
import {
  getSecurityAuditSummary,
  verifyRequestOriginAndCsrf,
  enforceApiRateLimit,
  extractClientIdentifier,
} from '@/lib/security/security-audit-and-gdpr';
import { resolveVerifiedHouseholdSession } from '@/lib/security/session-auth';

export async function GET(request: NextRequest) {
  const rateLimit = enforceApiRateLimit({
    category: 'GDPR_PRIVACY_RIGHTS',
    clientIdentifier: extractClientIdentifier(request),
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Trop de requêtes (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
      },
      { status: 429 }
    );
  }

  return NextResponse.json(getSecurityAuditSummary(), {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const csrfCheck = verifyRequestOriginAndCsrf(request);
    if (!csrfCheck.allowed) {
      return NextResponse.json(
        {
          authorized: false,
          error: csrfCheck.reasonFr || 'Requête inter-site non autorisée.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body?.action as
      | 'GDPR_EXPORT_ART_15_20'
      | 'GDPR_ERASURE_ART_17';

    const requestedTargetHouseholdId =
      typeof body?.targetHouseholdId === 'string' ? body.targetHouseholdId : null;

    // Derive household strictly from verified session; never trust x-authenticated-household-id or body.authenticatedHouseholdId
    const session = resolveVerifiedHouseholdSession(request, requestedTargetHouseholdId);
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
      category: 'GDPR_PRIVACY_RIGHTS',
      clientIdentifier: extractClientIdentifier(request, authenticatedHouseholdId),
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          authorized: false,
          error: `Trop de requêtes RGPD (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
        },
        { status: 429 }
      );
    }

    if (action === 'GDPR_EXPORT_ART_15_20') {
      const householdProfile =
        DEMO_PERSONAL_HOUSEHOLDS.find((h) => h.id === authenticatedHouseholdId) || null;
      const reportsRes = listAuthorizedHouseholdReports({
        authenticatedHouseholdId,
        requestedHouseholdId: authenticatedHouseholdId,
      });
      const subscriptionUsage = getOrCreateHouseholdSubscription(authenticatedHouseholdId);
      const savedSimulations = INITIAL_SAVED_PERSONAL_SIMULATIONS.filter(
        (s) => s.householdId === authenticatedHouseholdId
      );

      return NextResponse.json(
        {
          authorized: true,
          gdprAction: 'ART_15_ACCESS_AND_ART_20_PORTABILITY',
          exportedAtIso: new Date().toISOString(),
          householdId: authenticatedHouseholdId,
          dataMinimizedGuarantee:
            'Aucun NIR, aucun numéro fiscal SPI à 13 chiffres, aucun IBAN ni aucune coordonnée de carte bancaire n’est stocké par FISCALIQ.',
          exportPackage: {
            householdProfile,
            subscription: {
              plan: SUBSCRIPTION_PLANS_CONFIG[subscriptionUsage.planId],
              usage: subscriptionUsage,
            },
            savedSimulations,
            storedPdfReportsMetadata: reportsRes.reports.map((r) => r.meta),
          },
        },
        {
          headers: {
            'Cache-Control': 'private, no-store, max-age=0',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    if (action === 'GDPR_ERASURE_ART_17') {
      const purgeResult = purgeHouseholdReportsForGdprErasure({
        authenticatedHouseholdId,
        targetHouseholdId: authenticatedHouseholdId,
      });

      if (!purgeResult.authorized) {
        return NextResponse.json(
          {
            authorized: false,
            error: purgeResult.messageFr,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          authorized: true,
          gdprAction: 'ART_17_RIGHT_TO_ERASURE',
          erasureCertificate: {
            certificateId: `gdpr-erasure-${authenticatedHouseholdId}-${Date.now()}`,
            householdId: authenticatedHouseholdId,
            erasedAtIso: purgeResult.erasedAtIso,
            deletedReportsCount: purgeResult.deletedReportsCount,
            deletedStoragePaths: purgeResult.deletedStoragePaths,
            messageFr: purgeResult.messageFr,
          },
        },
        {
          headers: {
            'Cache-Control': 'private, no-store, max-age=0',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    return NextResponse.json(
      { error: 'Action RGPD non reconnue.' },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne du serveur.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
