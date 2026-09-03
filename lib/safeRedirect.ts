/**
 * Safe admin redirect-target sanitising.
 *
 * "?next=" is attacker-controllable input that ends in router.push(). Left
 * unchecked it is an open redirect (`?next=https://evil.example` — phishing
 * straight off our own login URL) and worse (`?next=javascript:...` in some
 * router implementations). Only same-app admin paths may pass.
 */

/** The only destination we ever fall back to. */
export const DEFAULT_ADMIN_PATH = "/admin/dashboard";

/**
 * Returns a path safe to router.push() / redirect() to, or the default.
 *
 * Accepted: real internal admin paths ("/admin", "/admin/dashboard/menu", …).
 * Rejected: absolute URLs, protocol-relative ("//host"), backslash tricks
 * ("\host" — browsers normalise to "//host"), any scheme ("javascript:",
 * "data:"), anything with control characters, and non-admin paths.
 */
export function sanitizeAdminPath(value: string | null | undefined): string {
  if (typeof value !== "string") return DEFAULT_ADMIN_PATH;

  // Strip NUL/newlines/tabs and friends — control characters have no business
  // in a path and several are parser-confusion vectors.
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "");
  if (cleaned !== value) return DEFAULT_ADMIN_PATH;

  // Exactly one leading slash; never two (protocol-relative), never a
  // backslash (browsers treat "/\..." like "//...").
  if (!cleaned.startsWith("/")) return DEFAULT_ADMIN_PATH;
  if (cleaned.startsWith("//") || cleaned.startsWith("/\\")) return DEFAULT_ADMIN_PATH;
  if (cleaned.includes("\\")) return DEFAULT_ADMIN_PATH;

  // Only our own admin area is ever a legitimate post-login destination.
  if (cleaned !== "/admin" && !cleaned.startsWith("/admin/")) return DEFAULT_ADMIN_PATH;

  return cleaned;
}
