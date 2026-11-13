import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAndApplyStripeWebhook,
  applyVerifiedPaymentWebhook,
} from '@/lib/subscriptions/entitlements';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const stripeSig = req.headers.get('stripe-signature') || '';
    const customSig = req.headers.get('x-payment-webhook-signature') || '';

    const result = stripeSig
      ? verifyAndApplyStripeWebhook({
          rawBody,
          stripeSignatureHeader: stripeSig,
        })
      : applyVerifiedPaymentWebhook({
          rawBody,
          signatureHeader: customSig,
        });

    return NextResponse.json(
      {
        received: result.allowed,
        messageFr: result.messageFr,
        planId: result.usage.planId,
      },
      { status: result.httpStatus }
    );
  } catch {
    return NextResponse.json(
      {
        received: false,
        messageFr: 'Charge utile de webhook invalide.',
      },
      { status: 400 }
    );
  }
}
