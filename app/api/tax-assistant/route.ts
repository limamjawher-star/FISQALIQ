import { NextRequest, NextResponse } from 'next/server';
import { personalTaxAssistantQuerySchema } from '@/lib/validation/schemas';
import { generatePersonalTaxAssistantAnswer } from '@/lib/ai/gemini-service';
import {
  verifyRequestOriginAndCsrf,
  verifyHouseholdDataIsolation,
} from '@/lib/security/security-audit-and-gdpr';

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = verifyRequestOriginAndCsrf(req);
    if (!csrfCheck.allowed) {
      return NextResponse.json(
        {
          error: csrfCheck.reasonFr || 'Requête inter-site non autorisée.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = personalTaxAssistantQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            'Veuillez saisir une question fiscale valide (entre 3 et 1 200 caractères).',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const headerAuthHouseholdId = req.headers.get('x-authenticated-household-id');
    const effectiveAuthHouseholdId =
      headerAuthHouseholdId || parsed.data.authorizedHouseholdId || '';

    // Contrôle strict d'isolation des données personnelles du foyer (prévention IDOR / Cross-Household)
    if (parsed.data.useHouseholdProfile && parsed.data.householdContext) {
      const isolation = verifyHouseholdDataIsolation({
        authenticatedHouseholdId: effectiveAuthHouseholdId,
        targetHouseholdId: parsed.data.householdContext.householdId,
        requireNonEmpty: true,
      });

      if (
        !isolation.authorized ||
        (parsed.data.authorizedHouseholdId &&
          parsed.data.authorizedHouseholdId !== parsed.data.householdContext.householdId)
      ) {
        return NextResponse.json(
          {
            authorized: false,
            error:
              isolation.errorFr ||
              'Accès refusé (403) : isolation stricte des données fiscales personnelles entre foyers.',
          },
          { status: 403 }
        );
      }
    }

    const forwardedFor = req.headers.get('x-forwarded-for') ?? 'local-client';
    const clientIp = forwardedFor.split(',')[0]?.trim() || 'local-client';
    const clientKey = `${clientIp}:${effectiveAuthHouseholdId || 'anon'}`;

    const responsePayload = await generatePersonalTaxAssistantAnswer(
      {
        ...parsed.data,
        authorizedHouseholdId: effectiveAuthHouseholdId || parsed.data.authorizedHouseholdId,
      },
      clientKey
    );

    const status =
      responsePayload.rateLimit && !responsePayload.rateLimit.allowed ? 429 : 200;

    // Support Server-Sent Events (SSE) progressive streaming when requested by the interactive client
    if (body?.stream === true && status === 200) {
      const encoder = new TextEncoder();
      const fullAnswer = responsePayload.structured.directAnswer || '';
      const words = fullAnswer.split(/(?<=\s)/);
      const chunkSize = Math.max(3, Math.ceil(words.length / 14));

      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: unknown) => {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          };

          sendEvent('phase', {
            step: 1,
            label: 'Isolation RGPD vérifiée & calcul déterministe CGI exécuté',
            deterministicSnapshot: responsePayload.deterministicSnapshot,
            citationsCount: responsePayload.citations.length,
          });

          let accumulated = '';
          for (let i = 0; i < words.length; i += chunkSize) {
            const slice = words.slice(i, i + chunkSize).join('');
            accumulated += slice;
            sendEvent('delta', {
              textDelta: slice,
              accumulatedText: accumulated,
            });
            await new Promise((resolve) => setTimeout(resolve, 22));
          }

          sendEvent('complete', {
            ...responsePayload,
            answer: responsePayload.answerMarkdown,
          });
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          Connection: 'keep-alive',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

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
  } catch {
    return NextResponse.json(
      {
        error:
          'Une erreur est survenue lors de l’analyse documentaire de votre question fiscale.',
      },
      { status: 500 }
    );
  }
}
