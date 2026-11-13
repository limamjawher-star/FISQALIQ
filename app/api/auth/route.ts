import { NextRequest, NextResponse } from 'next/server';
import {
  supabaseSignInWithPassword,
  supabaseSignUpWithEmail,
  supabaseResetPasswordForEmail,
} from '@/lib/supabase/server-client';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import {
  issueSignedSessionToken,
  resolveVerifiedHouseholdSession,
} from '@/lib/security/session-auth';
import { verifyRequestOriginAndCsrf } from '@/lib/security/security-audit-and-gdpr';

export async function GET(req: NextRequest) {
  const cfg = getSupabasePublicConfig();
  const session = resolveVerifiedHouseholdSession(req);
  return NextResponse.json(
    {
      supabaseConfigured: cfg.isConfigured,
      authenticated: session.authenticated,
      householdId: session.authenticated ? session.householdId : null,
      source: session.source,
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
      { ok: false, messageFr: csrf.reasonFr || 'Requête non autorisée.' },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as {
      action?: 'login' | 'signup' | 'reset_password' | 'logout';
      email?: string;
      password?: string;
    };

    if (body.action === 'logout') {
      const response = NextResponse.json({
        ok: true,
        messageFr: 'Session déconnectée.',
      });
      response.cookies.delete('fiscaliq_session');
      response.cookies.delete('fiscaliq_sb_token');
      return response;
    }

    const email = (body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, messageFr: 'Veuillez saisir une adresse e-mail valide.' },
        { status: 400 }
      );
    }

    if (body.action === 'reset_password') {
      const result = await supabaseResetPasswordForEmail(email);
      return NextResponse.json(result, { status: result.status });
    }

    const password = body.password || '';
    if (password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          messageFr: 'Le mot de passe doit contenir au moins 8 caractères.',
        },
        { status: 400 }
      );
    }

    const authResult =
      body.action === 'signup'
        ? await supabaseSignUpWithEmail(email, password)
        : await supabaseSignInWithPassword(email, password);

    if (!authResult.ok || !authResult.user) {
      return NextResponse.json(authResult, { status: authResult.status });
    }

    const response = NextResponse.json({
      ok: true,
      configured: authResult.configured,
      user: authResult.user,
      messageFr: authResult.messageFr,
    });

    if (authResult.accessToken) {
      const signedSession = issueSignedSessionToken({
        householdId: authResult.user.id,
        role: 'user',
        ttlSeconds: 60 * 60 * 24 * 7,
      });

      const isProd = process.env.NODE_ENV === 'production';
      response.cookies.set('fiscaliq_session', signedSession, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      response.cookies.set('fiscaliq_sb_token', authResult.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, messageFr: 'Requête d’authentification invalide.' },
      { status: 400 }
    );
  }
}
