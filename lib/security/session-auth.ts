/**
 * FISCALIQ — Server-Side Verified Session & Admin Authentication
 *
 * SECURITY RULES:
 * 1. Deny by default for admin actions (`verifyAdminSession`). Never trust
 *    unverified role headers such as `x-fiscaliq-admin-role`.
 * 2. Never trust `x-authenticated-household-id` headers or client body IDs
 *    (`authenticatedHouseholdId`, `targetHouseholdId`) as the source of identity;
 *    always derive the household from a server-verified session.
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { USER_HOUSEHOLD_ID } from '@/lib/data/personal-tax-dataset';
import { getReportSigningSecret } from '@/lib/reports/pdf-report-service';

export interface VerifiedAdminSessionResult {
  authorized: boolean;
  httpStatus: 200 | 401 | 403;
  reviewerIdentity?: string;
  errorFr?: string;
}

export interface VerifiedHouseholdSessionResult {
  authenticated: boolean;
  householdId: string;
  source: 'verified_signed_cookie' | 'verified_bearer_token' | 'local_dev_session' | 'unauthenticated';
  httpStatus: 200 | 401 | 403;
  errorFr?: string;
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length || bufA.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies an HMAC-SHA256 signed session token of the form:
 *   base64url(JSON({ householdId, role, exp })).base64url(hmac)
 */
export function verifySignedSessionToken(token: string): {
  valid: boolean;
  householdId?: string;
  role?: 'user' | 'admin';
} {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    const [payloadB64, signatureB64] = parts;
    if (!payloadB64 || !signatureB64) return { valid: false };

    const secret = getReportSigningSecret();
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('base64url');

    if (!timingSafeCompareStrings(signatureB64, expectedSig)) {
      return { valid: false };
    }

    const decoded = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as {
      householdId?: string;
      role?: 'user' | 'admin';
      exp?: number;
    };

    if (typeof decoded.exp === 'number' && Date.now() > decoded.exp) {
      return { valid: false };
    }

    return {
      valid: true,
      householdId: decoded.householdId,
      role: decoded.role,
    };
  } catch {
    return { valid: false };
  }
}

export function issueSignedSessionToken(params: {
  householdId: string;
  role?: 'user' | 'admin';
  ttlSeconds?: number;
}): string {
  const secret = getReportSigningSecret();
  const payloadB64 = Buffer.from(
    JSON.stringify({
      householdId: params.householdId,
      role: params.role || 'user',
      exp: Date.now() + (params.ttlSeconds ?? 3600) * 1000,
    }),
    'utf8'
  ).toString('base64url');

  const sigB64 = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifies that a request holds a valid, cryptographically verified admin session.
 * Denies by default (403) if no verified admin credential is present.
 * Never trusts `x-fiscaliq-admin-role` or any unverified header.
 */
export function verifyAdminSession(request: NextRequest): VerifiedAdminSessionResult {
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const cookieToken = request.cookies.get('fiscaliq_admin_session')?.value || '';
  const candidateToken = bearerToken || cookieToken;

  if (!candidateToken) {
    return {
      authorized: false,
      httpStatus: 403,
      errorFr:
        'Accès refusé (403) : une session administrateur vérifiée est obligatoire pour modifier la base de connaissances.',
    };
  }

  // 1. Check against configured server-side admin token
  const configuredAdminSecret = process.env.FISCALIQ_ADMIN_SESSION_TOKEN?.trim();
  if (
    configuredAdminSecret &&
    configuredAdminSecret.length >= 24 &&
    !configuredAdminSecret.includes('replace-with') &&
    timingSafeCompareStrings(candidateToken, configuredAdminSecret)
  ) {
    return {
      authorized: true,
      httpStatus: 200,
      reviewerIdentity: 'Administrateur vérifié (Jeton serveur)',
    };
  }

  // 2. Check HMAC-signed session token with role === 'admin'
  const verifiedSigned = verifySignedSessionToken(candidateToken);
  if (verifiedSigned.valid && verifiedSigned.role === 'admin') {
    return {
      authorized: true,
      httpStatus: 200,
      reviewerIdentity: 'Administrateur vérifié (Session signée)',
    };
  }

  return {
    authorized: false,
    httpStatus: 403,
    errorFr:
      'Accès refusé (403) : jeton de session administrateur invalide ou expiré.',
  };
}

/**
 * Derives the authenticated household strictly from a verified server session.
 * Never trusts `x-authenticated-household-id` headers or body IDs.
 */
export function resolveVerifiedHouseholdSession(
  request: NextRequest,
  requestedTargetHouseholdId?: string | null
): VerifiedHouseholdSessionResult {
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const sessionCookie = request.cookies.get('fiscaliq_session')?.value || '';
  const candidateToken = bearerToken || sessionCookie;

  let derivedHouseholdId: string | null = null;
  let source: VerifiedHouseholdSessionResult['source'] = 'unauthenticated';

  if (candidateToken) {
    const verified = verifySignedSessionToken(candidateToken);
    if (verified.valid && verified.householdId) {
      derivedHouseholdId = verified.householdId;
      source = bearerToken ? 'verified_bearer_token' : 'verified_signed_cookie';
    }
  }

  // In non-production local workspace preview, bind to the single local user profile
  // (`foyer-utilisateur`) if no external auth cookie is present yet.
  if (!derivedHouseholdId && process.env.NODE_ENV !== 'production') {
    derivedHouseholdId = USER_HOUSEHOLD_ID;
    source = 'local_dev_session';
  }

  if (!derivedHouseholdId) {
    return {
      authenticated: false,
      householdId: '',
      source: 'unauthenticated',
      httpStatus: 401,
      errorFr:
        'Non authentifié (401) : une session utilisateur vérifiée est requise.',
    };
  }

  // If the caller attempted to specify a different target household in query/body, reject with 403
  const cleanRequestedTarget = (requestedTargetHouseholdId || '').trim();
  if (cleanRequestedTarget && cleanRequestedTarget !== derivedHouseholdId) {
    return {
      authenticated: false,
      householdId: derivedHouseholdId,
      source,
      httpStatus: 403,
      errorFr:
        'Accès refusé (403) : le foyer demandé ne correspond pas à la session vérifiée.',
    };
  }

  return {
    authenticated: true,
    householdId: derivedHouseholdId,
    source,
    httpStatus: 200,
  };
}
