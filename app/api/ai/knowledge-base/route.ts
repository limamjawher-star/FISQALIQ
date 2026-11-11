import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  getKnowledgeRegistrySources,
  searchVerifiedKnowledgeChunks,
  chunkKnowledgeDocument,
  extractAndNormalizeLegalText,
  computeDeterministicEmbedding,
  approveKnowledgeSource,
  rejectKnowledgeSource,
  archiveKnowledgeSource,
  updateKnowledgeSourcePreserveHistory,
  resetKnowledgeRegistryToInitial,
  PersonalTaxKnowledgeTopic,
  OfficialPublisher,
  NormativeTier,
  SourceVerificationStatus,
} from '@/lib/ai/knowledge-base';
import {
  enforceApiRateLimit,
  extractClientIdentifier,
  verifyRequestOriginAndCsrf,
  inspectDocumentSecurity,
} from '@/lib/security/security-audit-and-gdpr';

export async function GET(request: NextRequest) {
  const rateLimit = enforceApiRateLimit({
    category: 'KNOWLEDGE_BASE_READ',
    clientIdentifier: extractClientIdentifier(request),
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Limite de requêtes atteinte (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
      },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').slice(0, 600);
  const topic = (searchParams.get('topic') || 'ALL') as PersonalTaxKnowledgeTopic | 'ALL';
  const publisher = (searchParams.get('publisher') || 'ALL') as OfficialPublisher | 'ALL';
  const normativeTier = (searchParams.get('normativeTier') || 'ALL') as NormativeTier | 'ALL';
  const verificationStatus = (searchParams.get('verificationStatus') || 'ALL') as
    | SourceVerificationStatus
    | 'ALL';
  const incomeYearParam = searchParams.get('incomeYear');
  const applicableIncomeYear: 2025 | 2024 | 'ALL' =
    incomeYearParam === '2025'
      ? 2025
      : incomeYearParam === '2024'
        ? 2024
        : 'ALL';

  const sources = getKnowledgeRegistrySources({
    includeNonApproved: true,
    topic,
    publisher,
    normativeTier,
    verificationStatus,
    applicableIncomeYear,
  });

  const searchResults = query.trim()
    ? searchVerifiedKnowledgeChunks(query, {
        applicableIncomeYear,
        topic,
        publisher,
        normativeTier,
        onlyApprovedVerified: true,
        maxResults: 6,
      })
    : [];

  return NextResponse.json({
    sources,
    searchResults,
    authoritativeGuardrail:
      'Seules les sources au statut APPROVED_VERIFIED peuvent être retournées dans searchResults et utilisées par l’assistant fiscal.',
  });
}

export async function POST(request: NextRequest) {
  try {
    const csrfCheck = verifyRequestOriginAndCsrf(request);
    if (!csrfCheck.allowed) {
      return NextResponse.json(
        { error: csrfCheck.reasonFr || 'Requête inter-site non autorisée.' },
        { status: 403 }
      );
    }

    const rateLimit = enforceApiRateLimit({
      category: 'KNOWLEDGE_BASE_ADMIN',
      clientIdentifier: extractClientIdentifier(request),
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Trop d’opérations d’administration (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const adminRoleHeader = (
      request.headers.get('x-fiscaliq-admin-role') || 'comite_juridique_interne'
    ).toLowerCase();

    if (
      adminRoleHeader === 'unauthorized' ||
      adminRoleHeader === 'anonymous' ||
      adminRoleHeader === 'external_user' ||
      adminRoleHeader === 'lecteur_externe'
    ) {
      return NextResponse.json(
        {
          authorized: false,
          error:
            'Accès refusé (403) : les actions de gouvernance sur le registre officiel des sources fiscales sont réservées au Comité Juridique & Fiscal habilité.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body?.action as string;

    if (action === 'APPROVE') {
      const updated = approveKnowledgeSource(
        String(body.sourceId || ''),
        String(body.reviewerName || 'Comité Juridique & Fiscal FISCALIQ').slice(0, 120),
        String(body.reviewNotes || 'Source officielle vérifiée et approuvée.').slice(0, 500)
      );
      if (!updated) {
        return NextResponse.json({ error: 'Source introuvable.' }, { status: 404 });
      }
      return NextResponse.json({
        updatedSource: updated,
        sources: getKnowledgeRegistrySources({ includeNonApproved: true }),
      });
    }

    if (action === 'REJECT') {
      const updated = rejectKnowledgeSource(
        String(body.sourceId || ''),
        String(body.reviewerName || 'Comité Juridique & Fiscal FISCALIQ').slice(0, 120),
        String(
          body.reviewNotes || 'Source rejetée lors du contrôle de conformité.'
        ).slice(0, 500)
      );
      if (!updated) {
        return NextResponse.json({ error: 'Source introuvable.' }, { status: 404 });
      }
      return NextResponse.json({
        updatedSource: updated,
        sources: getKnowledgeRegistrySources({ includeNonApproved: true }),
      });
    }

    if (action === 'ARCHIVE') {
      const updated = archiveKnowledgeSource(
        String(body.sourceId || ''),
        String(body.reviewerName || 'Comité Juridique & Fiscal FISCALIQ').slice(0, 120),
        String(body.reviewNotes || 'Version archivée à titre historique.').slice(0, 500)
      );
      if (!updated) {
        return NextResponse.json({ error: 'Source introuvable.' }, { status: 404 });
      }
      return NextResponse.json({
        updatedSource: updated,
        sources: getKnowledgeRegistrySources({ includeNonApproved: true }),
      });
    }

    if (action === 'UPDATE_NEW_VERSION') {
      const combinedTextToScan = `${body.newOfficialReference || ''} ${body.newPlainFrenchSummary || ''} ${body.newNormativeExcerpt || ''} ${body.changeReason || ''}`;
      const docScan = inspectDocumentSecurity(combinedTextToScan);
      if (!docScan.safe) {
        return NextResponse.json(
          {
            error: docScan.rejectionReasonFr,
            threatsDetected: docScan.threatsDetected,
          },
          { status: 400 }
        );
      }

      const updated = updateKnowledgeSourcePreserveHistory({
        sourceId: String(body.sourceId || ''),
        newOfficialReference: body.newOfficialReference,
        newPlainFrenchSummary: String(body.newPlainFrenchSummary || '').slice(0, 3000),
        newNormativeExcerpt: body.newNormativeExcerpt,
        newModificationDate: body.newModificationDate,
        newApplicableIncomeYear: body.newApplicableIncomeYear,
        newApplicableTaxYear: body.newApplicableTaxYear,
        newEffectiveDate: body.newEffectiveDate,
        changeReason:
          String(
            body.changeReason ||
              'Actualisation réglementaire avec conservation intégrale de la version précédente.'
          ).slice(0, 500),
        reviewerName: String(
          body.reviewerName || 'Comité Juridique & Fiscal FISCALIQ'
        ).slice(0, 120),
      });
      if (!updated) {
        return NextResponse.json({ error: 'Source introuvable.' }, { status: 404 });
      }
      return NextResponse.json({
        updatedSource: updated,
        sources: getKnowledgeRegistrySources({ includeNonApproved: true }),
      });
    }

    if (action === 'RESET') {
      resetKnowledgeRegistryToInitial();
      return NextResponse.json({
        sources: getKnowledgeRegistrySources({ includeNonApproved: true }),
      });
    }

    if (action === 'INSPECT_EXTRACTION_AND_EMBEDDING') {
      const rawText = String(body.rawText || '').slice(0, 8000);
      const docScan = inspectDocumentSecurity(rawText);
      if (!docScan.safe) {
        return NextResponse.json(
          {
            error: docScan.rejectionReasonFr,
            threatsDetected: docScan.threatsDetected,
          },
          { status: 400 }
        );
      }

      const extraction = extractAndNormalizeLegalText(docScan.sanitizedContent);
      const localVector = computeDeterministicEmbedding(extraction.cleanedText, 32);

      let embeddingEngine: 'gemini-embedding-2' | 'deterministic_pgvector_fallback' =
        'deterministic_pgvector_fallback';
      let geminiVectorPreview: number[] | null = null;

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && !apiKey.includes('placeholder') && extraction.cleanedText.length > 0) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const embedResp = await ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: [extraction.cleanedText],
          });
          const values = embedResp.embeddings?.[0]?.values;
          if (values && values.length > 0) {
            embeddingEngine = 'gemini-embedding-2';
            geminiVectorPreview = values.slice(0, 16).map((v) => Number(v.toFixed(4)));
          }
        } catch {
          embeddingEngine = 'deterministic_pgvector_fallback';
        }
      }

      const sourceId = body.sourceId as string | undefined;
      const allSources = getKnowledgeRegistrySources({ includeNonApproved: true });
      const targetSource =
        allSources.find((s) => s.id === sourceId) || allSources[0];
      const generatedChunks = chunkKnowledgeDocument(targetSource);

      return NextResponse.json({
        extraction,
        documentSecurityScan: {
          safe: true,
          threatsDetected: [],
        },
        embeddingEngine,
        vectorDimensions: embeddingEngine === 'gemini-embedding-2' ? 768 : 32,
        vectorPreview: geminiVectorPreview || localVector.slice(0, 16),
        generatedChunks,
      });
    }

    return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne du serveur.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
