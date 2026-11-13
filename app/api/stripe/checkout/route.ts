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
  const stripePriceId = process.env.STRIPE_PREMIUM_PRICE_ID?.trim();

  if (
    !stripeSecretKey ||
    !stripePriceId ||
    stripeSecretKey.includes('replace-with') ||
    stripePriceId.includes('replace-with')
  ) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        messageFr:
          'Le paiement Stripe (5 € / mois) est en attente des clés STRIPE_SECRET_KEY et STRIPE_PREMIUM_PRICE_ID dans la configuration du serveur.',
      },
      { status: 503 }
    );
  }

  const appUrl = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, '');

  const formBody = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': stripePriceId,
    'line_items[0][quantity]': '1',
    client_reference_id: session.householdId,
    'metadata[householdId]': session.householdId,
    success_url: `${appUrl}/pricing?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
  });

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
      cache: 'no-store',
    });

    const data = (await stripeRes.json()) as {
      url?: string;
      error?: { message?: string };
    };

    if (!stripeRes.ok || !data.url) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          messageFr:
            data.error?.message ||
            'Impossible de créer la session de paiement Stripe.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      checkoutUrl: data.url,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        messageFr: 'Erreur de connexion au service Stripe Checkout.',
      },
      { status: 502 }
    );
  }
}
