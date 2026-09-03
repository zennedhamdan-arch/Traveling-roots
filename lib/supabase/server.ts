import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "./env";
import type { Database } from "./types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Reads the session from cookies, so RLS sees the real user. Never import this
 * into a Client Component: it would ship `next/headers` to the browser.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Middleware refreshes the session instead, so this is safe to skip.
        }
      },
    },
  });
}

/**
 * Returns the signed-in user only if they are on the admin allow-list AND the
 * session is at AAL2 — password plus a verified TOTP challenge.
 *
 * `getUser()` — not `getSession()`. getSession reads the cookie and trusts it;
 * getUser revalidates the JWT with Supabase. On a page that decides whether to
 * show an admin dashboard, trusting an unverified cookie is the difference
 * between an auth check and a suggestion.
 *
 * Logged in is not the same as authorized twice over: a session that has only
 * presented a password (AAL1) is treated exactly like a signed-out one. Every
 * admin has a TOTP factor by construction — the sign-in page requires enrolling
 * one before it will let anyone through — so an AAL1 session here is either a
 * half-finished sign-in or a stale cookie, and neither gets a dashboard.
 */
export async function getAdminUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!assurance || assurance.currentLevel !== "aal2") return null;

  // Membership is checked against the database, not a JWT claim, so revoking
  // an admin takes effect on their next request rather than at token expiry.
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!admin) return null;
  return { user, admin };
}
