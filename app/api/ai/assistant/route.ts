import { NextRequest, NextResponse } from 'next/server';
import {
  aiQuerySchema,
  personalTaxAssistantQuerySchema,
} from '@/lib/validation/schemas';
import {
  generateFiscalAssistantAnswer,
  generatePersonalTaxAssistantAnswer,
} from '@/lib/ai/gemini-service';
import {
  verifyRequestOriginAndCsrf,
  verifyHouseholdDataIsolation,
  enforceApiRateLimit,
  extractClientIdentifier,
} from '@/lib/security/security-audit-and-gdpr';

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = verifyRequestOriginAndCsrf(req);
    if (!csrfCheck.allowed) {
      return NextResponse.json(
        { error: csrfCheck.reasonFr || 'Requête inter-site non autorisée.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Si la requête suit le schéma personnel, utiliser le moteur personnel complet avec contrôle d'isolation
    const personalParsed = personalTaxAssistantQuerySchema.safeParse(body);
    if (personalParsed.success && !body.companyContext) {
      const headerAuthHouseholdId = req.headers.get('x-authenticated-household-id');
      const effectiveAuthHouseholdId =
        headerAuthHouseholdId || personalParsed.data.authorizedHouseholdId || '';

      if (personalParsed.data.useHouseholdProfile && personalParsed.data.householdContext) {
        const isolation = verifyHouseholdDataIsolation({
          authenticatedHouseholdId: effectiveAuthHouseholdId,
          targetHouseholdId: personalParsed.data.householdContext.householdId,
          requireNonEmpty: true,
        });

        if (
          !isolation.authorized ||
          (personalParsed.data.authorizedHouseholdId &&
            personalParsed.data.authorizedHouseholdId !==
              personalParsed.data.householdContext.householdId)
        ) {
          return NextResponse.json(
            {
              authorized: false,
              error:
                isolation.errorFr ||
                'Accès refusé (403) : isolation stricte des données personnelles entre foyers.',
            },
            { status: 403 }
          );
        }
      }

      const clientKey = extractClientIdentifier(req, effectiveAuthHouseholdId || 'anon');
      const responsePayload = await generatePersonalTaxAssistantAnswer(
        {
          ...personalParsed.data,
          authorizedHouseholdId:
            effectiveAuthHouseholdId || personalParsed.data.authorizedHouseholdId,
        },
        clientKey
      );

      const status =
        responsePayload.rateLimit && !responsePayload.rateLimit.allowed ? 429 : 200;

      return NextResponse.json(
        {
          ...responsePayload,
          answer: responsePayload.answerMarkdown,
        },
        {
          status,
          headers: {
            'Cache-Control': 'private, no-store, max-age=0',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    const rateLimit = enforceApiRateLimit({
      category: 'AI_ASSISTANT',
      clientIdentifier: extractClientIdentifier(req),
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Trop de requêtes (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const parsed = aiQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Veuillez saisir une question valide (entre 3 et 1 200 caractères).',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const responsePayload = await generateFiscalAssistantAnswer(parsed.data);
    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Une erreur est survenue lors de l’interrogation du service d’analyse documentaire.',
      },
      { status: 500 }
    );
  }
}
