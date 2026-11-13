import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
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
  enforceApiRateLimit,
  extractClientIdentifier,
} from '@/lib/security/security-audit-and-gdpr';
import { resolveVerifiedHouseholdSession } from '@/lib/security/session-auth';

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

    // Si la requête suit le schéma personnel, utiliser le moteur personnel complet avec session vérifiée
    const personalParsed = personalTaxAssistantQuerySchema.safeParse(body);
    if (personalParsed.success && !body.companyContext) {
      const session = resolveVerifiedHouseholdSession(req);

      if (!session.authenticated) {
        return NextResponse.json(
          {
            authorized: false,
            error: session.errorFr,
          },
          { status: session.httpStatus }
        );
      }

      const verifiedHouseholdId = session.householdId;
      const clientKey = extractClientIdentifier(req, verifiedHouseholdId);

      const sanitizedHouseholdContext =
        personalParsed.data.useHouseholdProfile && personalParsed.data.householdContext
          ? {
              ...personalParsed.data.householdContext,
              householdId: verifiedHouseholdId,
            }
          : undefined;

      const responsePayload = await generatePersonalTaxAssistantAnswer(
        {
          ...personalParsed.data,
          authorizedHouseholdId: verifiedHouseholdId,
          householdContext: sanitizedHouseholdContext,
        },
        clientKey
      );

      const status =
        responsePayload.rateLimit && !responsePayload.rateLimit.allowed ? 429 : 200;

      // Support real Gemini streaming when requested (`stream: true`) and GEMINI_API_KEY is configured
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (
        body.stream === true &&
        status === 200 &&
        apiKey &&
        apiKey !== 'MY_GEMINI_API_KEY' &&
        apiKey.length > 10
      ) {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        const streamPrompt = `Tu es l'assistant fiscal français de FISCALIQ. Formule une réponse claire et concise en français simple (phrases courtes) à la question : "${personalParsed.data.question}". Appuie-toi strictement sur cette synthèse vérifiée sans modifier aucun montant ni inventer de source :\n\n${responsePayload.answerMarkdown}`;

        const geminiStream = await ai.models.generateContentStream({
          model: 'gemini-4-hydrogen',
          contents: streamPrompt,
        });

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of geminiStream) {
                if (chunk.text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: chunk.text })}\n\n`)
                  );
                }
              }
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    done: true,
                    citations: responsePayload.citations,
                    rateLimit: responsePayload.rateLimit,
                  })}\n\n`
                )
              );
            } catch {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    text: responsePayload.answerMarkdown,
                    done: true,
                  })}\n\n`
                )
              );
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'private, no-store, max-age=0',
            Connection: 'keep-alive',
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
