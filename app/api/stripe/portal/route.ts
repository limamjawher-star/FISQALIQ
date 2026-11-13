import { NextRequest, NextResponse } from 'next/server';
import { resolveVerifiedHouseholdSession } from '@/lib/security/session-auth';
import { verifyRequestOriginAndCsrf } from '@/lib/security/security-audit-and-gdpr';

export async function POST(req: NextRequest) {
  const csrf = verifyRequestOriginAndCsrf(req);
  if (!csrf.allowed) {
    return NextResponse.json(
      { ok: false, messageFr: csrf.reasonFr || 'Requête non autorisée.' },
      { status: 403 }
    );
  }

  const session = resolveVerifiedHouseholdSession(req);
  if (!session.authenticated) {
    return NextResponse.json(
      { ok: false, messageFr: session.errorFr },
      { status: session.httpStatus }
    );
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey || stripeSecretKey.includes('replace-with')) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        messageFr:
          'Le portail client Stripe (factures et résiliation) nécessite la configuration de STRIPE_SECRET_KEY sur le serveur.',
      },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      stripeCustomerId?: string;
    };

    if (!body.stripeCustomerId) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          messageFr:
            'Aucun abonnement Stripe actif trouvé pour ce compte.',
        },
        { status: 400 }
      );
    }

    const appUrl = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, '');
    const formBody = new URLSearchParams({
      customer: body.stripeCustomerId,
      return_url: `${appUrl}/pricing`,
    });

    const portalRes = await fetch(
      'https://api.stripe.com/v1/billing_portal/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
        cache: 'no-store',
      }
    );

    const data = (await portalRes.json()) as {
      url?: string;
      error?: { message?: string };
    };

    if (!portalRes.ok || !data.url) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          messageFr:
            data.error?.message ||
            'Impossible d’ouvrir le portail de facturation Stripe.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      portalUrl: data.url,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        messageFr: 'Erreur lors de l’ouverture du portail client Stripe.',
      },
      { status: 502 }
    );
  }
}
