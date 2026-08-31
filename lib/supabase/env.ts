/**
 * Supabase environment access.
 *
 * The whole app is designed to work with these UNSET. That is deliberate:
 * the site already renders a complete, correct restaurant page from the files
 * in `data/`, and losing an environment variable must not take the menu, the
 * phone number or the reservation buttons off the internet.
 *
 * So `isSupabaseConfigured` is checked before every database call, and each
 * content loader falls back to the hardcoded data. Supabase is an enhancement
 * layer, not a hard dependency.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured: boolean =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** Throws only where a caller genuinely cannot proceed (the admin area). */
export function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (see README → Supabase setup).",
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}
