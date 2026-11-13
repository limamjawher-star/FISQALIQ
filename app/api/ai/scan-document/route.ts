import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import {
  parseFiscalDocumentTextDeterministically,
  ScannedFiscalDocumentResult,
} from '@/lib/ai/document-scanner';
import {
  verifyRequestOriginAndCsrf,
  enforceApiRateLimit,
  extractClientIdentifier,
  enforceDataMinimizationOnInput,
} from '@/lib/security/security-audit-and-gdpr';
import { resolveVerifiedHouseholdSession } from '@/lib/security/session-auth';

export async function POST(req: NextRequest) {
  const csrf = verifyRequestOriginAndCsrf(req);
  if (!csrf.allowed) {
    return NextResponse.json(
      { ok: false, error: csrf.reasonFr || 'Requête non autorisée.' },
      { status: 403 }
    );
  }

  const session = resolveVerifiedHouseholdSession(req);
  if (!session.authenticated) {
    return NextResponse.json(
      { ok: false, error: session.errorFr },
      { status: session.httpStatus }
    );
  }

  const rateLimit = enforceApiRateLimit({
    category: 'AI_ASSISTANT',
    clientIdentifier: extractClientIdentifier(req, session.householdId),
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Trop de requêtes (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as {
      documentText?: string;
      imageBase64?: string;
      mimeType?: string;
    };

    const rawText = (body.documentText || '').trim();
    const imageBase64 = (body.imageBase64 || '').trim();
    const mimeType = (body.mimeType || 'image/png').trim();

    if (!rawText && !imageBase64) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Veuillez coller le texte de votre avis d’impôt / fiche de paie ou importer une image.',
        },
        { status: 400 }
      );
    }

    // 1. Run deterministic extraction on text first
    const deterministicResult = parseFiscalDocumentTextDeterministically(rawText);

    // 2. If an image/PDF is provided (or text had no regex matches) and GEMINI_API_KEY is available, use Gemini
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (
      (imageBase64 || deterministicResult.extractedFieldsSummaryFr.length === 0) &&
      apiKey &&
      apiKey !== 'MY_GEMINI_API_KEY' &&
      apiKey.length > 10
    ) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const redaction = enforceDataMinimizationOnInput(rawText);
        const promptText = `Extrais uniquement les montants fiscaux numériques présents dans ce document fiscal français (avis d'impôt ou bulletin de paie). Ne retourne JAMAIS de nom, d'adresse, d'IBAN ni de numéro fiscal. Texte nettoyé : ${redaction.redactedText}`;

        const parts: Array<
          | { text: string }
          | { inlineData: { mimeType: string; data: string } }
        > = [{ text: promptText }];

        if (imageBase64) {
          parts.unshift({
            inlineData: {
              mimeType,
              data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
            },
          });
        }

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                documentTypeDetected: {
                  type: Type.STRING,
                  description: 'AVIS_IMPOT, FICHE_DE_PAIE, or INCONNU',
                },
                annualNetTaxableSalaryEur: {
                  type: Type.NUMBER,
                  description: 'Salaires nets imposables annuels (case 1AJ) en euros',
                },
                grossMonthlySalaryEur: {
                  type: Type.NUMBER,
                  description: 'Salaire brut mensuel en euros',
                },
                withheldPasAnnualEur: {
                  type: Type.NUMBER,
                  description: 'Prélèvement à la source annuel retenu en euros',
                },
                withholdingRatePercent: {
                  type: Type.NUMBER,
                  description: 'Taux de prélèvement à la source en pourcentage',
                },
                availablePerCeilingEur: {
                  type: Type.NUMBER,
                  description: 'Plafond épargne retraite PER disponible (case 6NS) en euros',
                },
                familyQuotientParts: {
                  type: Type.NUMBER,
                  description: 'Nombre de parts de quotient familial',
                },
              },
            },
          },
        });

        const parsedJson = JSON.parse((response.text ?? '{}').trim()) as Partial<
          ScannedFiscalDocumentResult
        >;

        const summary: string[] = [];
        if (typeof parsedJson.annualNetTaxableSalaryEur === 'number' && parsedJson.annualNetTaxableSalaryEur > 0) {
          summary.push(
            `Salaires nets imposables (1AJ) : ${Math.round(parsedJson.annualNetTaxableSalaryEur).toLocaleString('fr-FR')} €`
          );
        }
        if (typeof parsedJson.grossMonthlySalaryEur === 'number' && parsedJson.grossMonthlySalaryEur > 0) {
          summary.push(
            `Salaire brut mensuel : ${Math.round(parsedJson.grossMonthlySalaryEur).toLocaleString('fr-FR')} €`
          );
        }
        if (typeof parsedJson.withheldPasAnnualEur === 'number' && parsedJson.withheldPasAnnualEur >= 0) {
          summary.push(
            `Prélèvement à la source retenu : ${Math.round(parsedJson.withheldPasAnnualEur).toLocaleString('fr-FR')} €`
          );
        }
        if (typeof parsedJson.availablePerCeilingEur === 'number' && parsedJson.availablePerCeilingEur > 0) {
          summary.push(
            `Plafond PER disponible (6NS) : ${Math.round(parsedJson.availablePerCeilingEur).toLocaleString('fr-FR')} €`
          );
        }

        if (summary.length > 0) {
          return NextResponse.json({
            ok: true,
            result: {
              documentTypeDetected:
                parsedJson.documentTypeDetected === 'AVIS_IMPOT' ||
                parsedJson.documentTypeDetected === 'FICHE_DE_PAIE'
                  ? parsedJson.documentTypeDetected
                  : deterministicResult.documentTypeDetected,
              annualNetTaxableSalaryEur:
                parsedJson.annualNetTaxableSalaryEur ??
                deterministicResult.annualNetTaxableSalaryEur,
              grossMonthlySalaryEur:
                parsedJson.grossMonthlySalaryEur ??
                deterministicResult.grossMonthlySalaryEur,
              withheldPasAnnualEur:
                parsedJson.withheldPasAnnualEur ??
                deterministicResult.withheldPasAnnualEur,
              withholdingRatePercent:
                parsedJson.withholdingRatePercent ??
                deterministicResult.withholdingRatePercent,
              availablePerCeilingEur:
                parsedJson.availablePerCeilingEur ??
                deterministicResult.availablePerCeilingEur,
              familyQuotientParts:
                parsedJson.familyQuotientParts ??
                deterministicResult.familyQuotientParts,
              redactedPiiCount: redaction.detectedCategories.length,
              extractedFieldsSummaryFr: summary,
              extractionMethod: 'GEMINI_MULTIMODAL',
            } satisfies ScannedFiscalDocumentResult,
          });
        }
      } catch {
        // Fallback cleanly to deterministic result
      }
    }

    return NextResponse.json({
      ok: true,
      result: deterministicResult,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Impossible d’analyser ce document.' },
      { status: 400 }
    );
  }
}
