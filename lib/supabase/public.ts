import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";
import type { Database } from "./types";

/**
 * Cookie-less Supabase client for PUBLIC content.
 *
 * The menu, opening hours and hero video are the same for every visitor, so
 * reading them must not depend on who is asking. Using the cookie-aware server
 * client here would call `cookies()`, which opts the whole homepage out of
 * static rendering and makes every visit a server round-trip.
 *
 * With this client the homepage stays statically rendered and revalidates on a
 * timer, so a guest gets HTML from the CDN rather than a database query.
 *
 * RLS still applies — this uses the anon key and holds no session, so it can
 * only see exactly what an anonymous visitor may see.
 */
let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabasePublicClient() {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;

  cached = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cached;
}
