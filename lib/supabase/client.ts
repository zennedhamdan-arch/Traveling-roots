"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "./env";
import type { Database } from "./types";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser Supabase client, used by the admin UI for auth and file uploads.
 *
 * Memoised: creating a new client per render would drop the auth state
 * listener and re-subscribe on every keystroke.
 */
export function createSupabaseBrowserClient() {
  if (cached) return cached;
  const { url, anonKey } = requireSupabaseEnv();
  cached = createBrowserClient<Database>(url, anonKey);
  return cached;
}
