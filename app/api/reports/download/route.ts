import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizedReportPdfBinary } from '@/lib/reports/pdf-report-service';
import {
  enforceApiRateLimit,
  extractClientIdentifier,
} from '@/lib/security/security-audit-and-gdpr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || '';
  const headerAuthHouseholdId = request.headers.get('x-authenticated-household-id');
  const queryHouseholdId = searchParams.get('householdId') || '';

  // Si l'en-tête d'authentification est présent et diffère du paramètre d'URL, rejet immédiat 403
  if (
    headerAuthHouseholdId &&
    queryHouseholdId &&
    headerAuthHouseholdId !== queryHouseholdId
  ) {
    return NextResponse.json(
      {
        authorized: false,
        error:
          'Accès refusé (403) : conflit entre l’en-tête d’authentification du foyer et le paramètre du lien signé.',
      },
      { status: 403 }
    );
  }

  const authenticatedHouseholdId = headerAuthHouseholdId || queryHouseholdId;

  const rateLimit = enforceApiRateLimit({
    category: 'PDF_REPORTS',
    clientIdentifier: extractClientIdentifier(request, authenticatedHouseholdId),
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        authorized: false,
        error: `Limite de téléchargements atteinte (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
      },
      { status: 429 }
    );
  }

  const result = getAuthorizedReportPdfBinary({
    token,
    authenticatedHouseholdId,
  });

  if (!result.authorized || !result.pdfBuffer || !result.filename) {
    return NextResponse.json(
      {
        authorized: false,
        error: result.errorFr || 'Téléchargement non autorisé.',
      },
      { status: result.httpStatus }
    );
  }

  return new NextResponse(new Uint8Array(result.pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': String(result.pdfBuffer.byteLength),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'X-Fiscaliq-Storage-Bucket': 'fiscaliq-personal-reports',
      'X-Fiscaliq-Verification': 'CALCUL_DETERMINISTE_VERIFIE',
    },
  });
}
