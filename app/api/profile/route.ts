import { NextRequest, NextResponse } from 'next/server';
import { resolveVerifiedHouseholdSession } from '@/lib/security/session-auth';
import { verifyRequestOriginAndCsrf } from '@/lib/security/security-audit-and-gdpr';
import {
  supabaseFetchPersonalProfile,
  supabaseUpsertPersonalProfile,
  supabaseDeleteUserAccountData,
} from '@/lib/supabase/server-client';

export async function GET(req: NextRequest) {
  const session = resolveVerifiedHouseholdSession(req);
  if (!session.authenticated) {
    return NextResponse.json(
      { authorized: false, error: session.errorFr },
      { status: session.httpStatus }
    );
  }

  const sbToken = req.cookies.get('fiscaliq_sb_token')?.value || '';
  const cloudResult = await supabaseFetchPersonalProfile(sbToken, session.householdId);

  return NextResponse.json(
    {
      authorized: true,
      householdId: session.householdId,
      cloudConfigured: cloudResult.configured,
      cloudProfile: cloudResult.profile ?? null,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const csrf = verifyRequestOriginAndCsrf(req);
  if (!csrf.allowed) {
    return NextResponse.json(
      { authorized: false, error: csrf.reasonFr || 'Requête non autorisée.' },
      { status: 403 }
    );
  }

  const session = resolveVerifiedHouseholdSession(req);
  if (!session.authenticated) {
    return NextResponse.json(
      { authorized: false, error: session.errorFr },
      { status: session.httpStatus }
    );
  }

  try {
    const body = (await req.json()) as {
      profile?: Record<string, unknown>;
      targetHouseholdId?: string;
    };

    const recheck = resolveVerifiedHouseholdSession(req, body.targetHouseholdId);
    if (!recheck.authenticated) {
      return NextResponse.json(
        { authorized: false, error: recheck.errorFr },
        { status: recheck.httpStatus }
      );
    }

    const sbToken = req.cookies.get('fiscaliq_sb_token')?.value || '';
    const upsertResult = await supabaseUpsertPersonalProfile(
      sbToken,
      session.householdId,
      body.profile || {}
    );

    return NextResponse.json({
      authorized: true,
      householdId: session.householdId,
      cloudConfigured: upsertResult.configured,
      persistedToCloud: upsertResult.ok,
    });
  } catch {
    return NextResponse.json(
      { authorized: false, error: 'Données de profil invalides.' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const csrf = verifyRequestOriginAndCsrf(req);
  if (!csrf.allowed) {
    return NextResponse.json(
      { authorized: false, error: csrf.reasonFr || 'Requête non autorisée.' },
      { status: 403 }
    );
  }

  const session = resolveVerifiedHouseholdSession(req);
  if (!session.authenticated) {
    return NextResponse.json(
      { authorized: false, error: session.errorFr },
      { status: session.httpStatus }
    );
  }

  const sbToken = req.cookies.get('fiscaliq_sb_token')?.value || '';
  const deleteResult = await supabaseDeleteUserAccountData(sbToken, session.householdId);

  const response = NextResponse.json({
    authorized: true,
    householdId: session.householdId,
    cloudDeleted: deleteResult.ok,
    messageFr: 'Vos données personnelles et votre session ont été supprimées.',
  });
  response.cookies.delete('fiscaliq_session');
  response.cookies.delete('fiscaliq_sb_token');
  return response;
}
