/**
 * FISCALIQ — Client Serveur Supabase Auth & PostgREST (RLS `auth.uid() = user_id`)
 *
 * Ce module exécute les appels d'authentification Supabase Auth (inscription,
 * connexion email + mot de passe, réinitialisation du mot de passe, vérification
 * du jeton utilisateur) ainsi que la persistance PostgREST soumise aux politiques
 * Row Level Security (`auth.uid() = user_id`).
 *
 * RÈGLE D'HONNÊTETÉ : Si `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * ne sont pas configurés avec de vraies valeurs, toutes les fonctions retournent
 * `configured: false` sans jamais simuler un faux compte cloud.
 */

import { getSupabasePublicConfig } from './config';

export interface SupabaseAuthUser {
  id: string;
  email: string;
  emailConfirmedAt?: string | null;
}

export interface SupabaseAuthResponse {
  configured: boolean;
  ok: boolean;
  status: number;
  user?: SupabaseAuthUser;
  accessToken?: string;
  refreshToken?: string;
  messageFr: string;
}

function getHeaders(anonKey: string, bearerToken?: string): Record<string, string> {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${bearerToken || anonKey}`,
    'Content-Type': 'application/json',
  };
}

export async function supabaseSignInWithPassword(
  email: string,
  password: string
): Promise<SupabaseAuthResponse> {
  const cfg = getSupabasePublicConfig();
  if (!cfg.isConfigured || !cfg.url || !cfg.anonKey) {
    return {
      configured: false,
      ok: false,
      status: 503,
      messageFr:
        'L’authentification Supabase n’est pas encore configurée sur cet environnement (variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY absentes).',
    };
  }

  try {
    const res = await fetch(
      `${cfg.url.replace(/\/$/, '')}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: getHeaders(cfg.anonKey),
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      }
    );

    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      user?: { id?: string; email?: string; email_confirmed_at?: string | null };
      error_description?: string;
      msg?: string;
    };

    if (!res.ok || !data.access_token || !data.user?.id) {
      return {
        configured: true,
        ok: false,
        status: res.status || 401,
        messageFr:
          data.error_description ||
          data.msg ||
          'Identifiants incorrects ou adresse e-mail non confirmée.',
      };
    }

    return {
      configured: true,
      ok: true,
      status: 200,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email || email,
        emailConfirmedAt: data.user.email_confirmed_at ?? null,
      },
      messageFr: 'Connexion réussie.',
    };
  } catch {
    return {
      configured: true,
      ok: false,
      status: 502,
      messageFr: 'Impossible de joindre le service Supabase Auth.',
    };
  }
}

export async function supabaseSignUpWithEmail(
  email: string,
  password: string
): Promise<SupabaseAuthResponse> {
  const cfg = getSupabasePublicConfig();
  if (!cfg.isConfigured || !cfg.url || !cfg.anonKey) {
    return {
      configured: false,
      ok: false,
      status: 503,
      messageFr:
        'L’inscription cloud n’est pas encore activée (variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes).',
    };
  }

  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/auth/v1/signup`, {
      method: 'POST',
      headers: getHeaders(cfg.anonKey),
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      id?: string;
      email?: string;
      user?: { id?: string; email?: string; email_confirmed_at?: string | null };
      error_description?: string;
      msg?: string;
    };

    const userId = data.user?.id || data.id;
    if (!res.ok || !userId) {
      return {
        configured: true,
        ok: false,
        status: res.status || 400,
        messageFr:
          data.error_description ||
          data.msg ||
          'Impossible de créer le compte avec cette adresse e-mail.',
      };
    }

    return {
      configured: true,
      ok: true,
      status: 200,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: {
        id: userId,
        email: data.user?.email || data.email || email,
        emailConfirmedAt: data.user?.email_confirmed_at ?? null,
      },
      messageFr: data.access_token
        ? 'Compte créé et connecté.'
        : 'Compte créé. Vérifiez votre boîte e-mail pour confirmer votre inscription.',
    };
  } catch {
    return {
      configured: true,
      ok: false,
      status: 502,
      messageFr: 'Impossible de joindre le service Supabase Auth.',
    };
  }
}

export async function supabaseResetPasswordForEmail(
  email: string
): Promise<SupabaseAuthResponse> {
  const cfg = getSupabasePublicConfig();
  if (!cfg.isConfigured || !cfg.url || !cfg.anonKey) {
    return {
      configured: false,
      ok: false,
      status: 503,
      messageFr:
        'La réinitialisation par e-mail nécessite la configuration de Supabase Auth (NEXT_PUBLIC_SUPABASE_URL).',
    };
  }

  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/auth/v1/recover`, {
      method: 'POST',
      headers: getHeaders(cfg.anonKey),
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        configured: true,
        ok: false,
        status: res.status,
        messageFr: 'Impossible d’envoyer le lien de réinitialisation.',
      };
    }

    return {
      configured: true,
      ok: true,
      status: 200,
      messageFr:
        'Si un compte existe pour cette adresse, un lien de réinitialisation vous a été envoyé.',
    };
  } catch {
    return {
      configured: true,
      ok: false,
      status: 502,
      messageFr: 'Impossible de joindre le service Supabase Auth.',
    };
  }
}

/**
 * Persiste ou lit le profil fiscal dans `public.personal_tax_profiles` en appliquant
 * le jeton JWT de l'utilisateur pour que PostgreSQL applique strictement `auth.uid() = user_id`.
 */
export async function supabaseFetchPersonalProfile(
  userAccessToken: string,
  userId: string
): Promise<{ configured: boolean; ok: boolean; profile?: Record<string, unknown> | null }> {
  const cfg = getSupabasePublicConfig();
  if (!cfg.isConfigured || !cfg.url || !cfg.anonKey || !userAccessToken) {
    return { configured: false, ok: false };
  }

  try {
    const url = `${cfg.url.replace(/\/$/, '')}/rest/v1/personal_tax_profiles?user_id=eq.${encodeURIComponent(
      userId
    )}&select=*&limit=1`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(cfg.anonKey, userAccessToken),
      cache: 'no-store',
    });

    if (!res.ok) return { configured: true, ok: false };
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    return {
      configured: true,
      ok: true,
      profile: rows[0] ?? null,
    };
  } catch {
    return { configured: true, ok: false };
  }
}

export async function supabaseUpsertPersonalProfile(
  userAccessToken: string,
  userId: string,
  profilePayload: Record<string, unknown>
): Promise<{ configured: boolean; ok: boolean }> {
  const cfg = getSupabasePublicConfig();
  if (!cfg.isConfigured || !cfg.url || !cfg.anonKey || !userAccessToken) {
    return { configured: false, ok: false };
  }

  try {
    const url = `${cfg.url.replace(/\/$/, '')}/rest/v1/personal_tax_profiles`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...getHeaders(cfg.anonKey, userAccessToken),
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        ...profilePayload,
        user_id: userId,
        updated_at: new Date().toISOString(),
      }),
      cache: 'no-store',
    });

    return { configured: true, ok: res.ok };
  } catch {
    return { configured: true, ok: false };
  }
}

export async function supabaseDeleteUserAccountData(
  userAccessToken: string,
  userId: string
): Promise<{ configured: boolean; ok: boolean }> {
  const cfg = getSupabasePublicConfig();
  if (!cfg.isConfigured || !cfg.url || !cfg.anonKey || !userAccessToken) {
    return { configured: false, ok: false };
  }

  try {
    const baseUrl = cfg.url.replace(/\/$/, '');
    const headers = getHeaders(cfg.anonKey, userAccessToken);

    await fetch(
      `${baseUrl}/rest/v1/saved_calculations?user_id=eq.${encodeURIComponent(userId)}`,
      { method: 'DELETE', headers, cache: 'no-store' }
    );
    const res = await fetch(
      `${baseUrl}/rest/v1/personal_tax_profiles?user_id=eq.${encodeURIComponent(userId)}`,
      { method: 'DELETE', headers, cache: 'no-store' }
    );

    return { configured: true, ok: res.ok };
  } catch {
    return { configured: true, ok: false };
  }
}
