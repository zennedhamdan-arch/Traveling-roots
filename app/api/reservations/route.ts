import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { requireSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";
import { restaurantLocalIsPast, restaurantLocalToUtcIso, restaurantToday } from "@/lib/time";

/**
 * Public reservation submission.
 *
 * The browser no longer writes to the database directly: it posts here, the
 * Cloudflare Turnstile token is verified SERVER-side first, and only then is
 * the row inserted. The insert still runs under the ANON key — deliberately —
 * so every existing database control applies unchanged: the anon INSERT
 * policy, the column grants (a guest cannot set status/admin_notes), and the
 * past-date policy. This route adds a gate; it moves nothing to trust.
 */

export const runtime = "nodejs";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type Submission = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  party_size?: unknown;
  date?: unknown;
  time?: unknown;
  notes?: unknown;
  turnstileToken?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Verify the CAPTCHA with Cloudflare using the server-only secret. */
async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Fail clearly, never silently: in production an unset secret must stop
    // submissions, not quietly drop the protection.
    if (process.env.NODE_ENV === "production") {
      throw new ConfigError("Anti-bot protection is not configured on the server.");
    }
    return true; // local development only, where no keys exist by design
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const outcome = (await response.json()) as { success?: boolean };
  return outcome.success === true;
}

class ConfigError extends Error {}

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? undefined;
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: Submission;
  try {
    payload = (await request.json()) as Submission;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // Mismatched halves of the CAPTCHA config fail loudly: if the server has a
  // secret but the public site key was absent at build time, the widget never
  // rendered, no guest could ever pass, and submissions would deadlock —
  // surface that as configuration error, not a broken form.
  if (process.env.TURNSTILE_SECRET_KEY && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    return NextResponse.json(
      {
        error:
          "Anti-bot protection is misconfigured on the server. Please call us — the number is on the site.",
      },
      { status: 503 },
    );
  }

  const turnstileToken = asString(payload.turnstileToken);
  if (!turnstileToken) {
    return NextResponse.json(
      { error: "Please complete the anti-bot check." },
      { status: 400 },
    );
  }

  try {
    const human = await verifyTurnstile(turnstileToken, clientIp(request));
    if (!human) {
      return NextResponse.json(
        { error: "The anti-bot check didn't pass. Please try again." },
        { status: 400 },
      );
    }
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "The anti-bot check could not be reached. Please try again." },
      { status: 502 },
    );
  }

  // ---- Field validation (mirrors the form; the database re-checks all of it) ----
  const name = asString(payload.name);
  const phone = asString(payload.phone);
  const email = asString(payload.email);
  const notes = asString(payload.notes);
  const date = asString(payload.date);
  const time = asString(payload.time);
  const partySize =
    typeof payload.party_size === "number" ? Math.round(payload.party_size) : NaN;

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Please give a name." }, { status: 400 });
  }
  if (!phone || phone.length < 6 || phone.length > 40) {
    return NextResponse.json({ error: "Please give a phone number." }, { status: 400 });
  }
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 60) {
    return NextResponse.json({ error: "Please choose the number of guests." }, { status: 400 });
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "Please choose a date and time." }, { status: 400 });
  }
  if (date < restaurantToday()) {
    return NextResponse.json(
      { error: "Please choose today or a future date." },
      { status: 400 },
    );
  }
  if (restaurantLocalIsPast(date, time)) {
    return NextResponse.json(
      { error: "That time has already passed — please choose a later time." },
      { status: 400 },
    );
  }

  let preferredAtIso: string;
  try {
    preferredAtIso = restaurantLocalToUtcIso(date, time);
  } catch {
    return NextResponse.json({ error: "Please check the date and time." }, { status: 400 });
  }

  // ---- Insert under the anon key: RLS, column grants and the past-date
  // policy all still apply exactly as they did from the browser. ----
  const { url, anonKey } = requireSupabaseEnv();
  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("reservation_requests").insert({
    name,
    phone,
    email,
    party_size: partySize,
    preferred_at: preferredAtIso,
    notes,
  });

  if (error) {
    // Never surface database internals to a guest.
    if (/violates row-level security|preferred_at/i.test(error.message)) {
      return NextResponse.json(
        { error: "Please choose today or a future date." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "The request could not be sent. Please try again, or call us." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
