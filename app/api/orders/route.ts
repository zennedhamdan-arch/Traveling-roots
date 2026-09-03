import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { requireSupabaseEnv } from "@/lib/supabase/env";
import type { Database, PickupOrderDraftLine } from "@/lib/supabase/types";
import { restaurantLocalToUtcIso } from "@/lib/time";

/**
 * Public pickup-order submission.
 *
 * Same contract as app/api/reservations: Turnstile verified server-side,
 * then inserted under the ANON key so every database control still applies —
 * above all the pickup_orders_resolve trigger, which reprices the order from
 * the live menu. The client's numbers are never read, before or after this
 * change; the lines carry only ids/quantities/variant labels.
 */

export const runtime = "nodejs";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type Submission = {
  customer_name?: unknown;
  phone?: unknown;
  note?: unknown;
  pickup_at?: unknown;
  items?: unknown;
  turnstileToken?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

class ConfigError extends Error {}

async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new ConfigError("Anti-bot protection is not configured on the server.");
    }
    return true; // local development only
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body });
  if (!response.ok) return false;
  const outcome = (await response.json()) as { success?: boolean };
  return outcome.success === true;
}

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? undefined;
}

/** Accepts only the shape the database trusts; prices are dropped here too. */
function parseLines(value: unknown): PickupOrderDraftLine[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 40) return null;
  const lines: PickupOrderDraftLine[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) return null;
    const line = raw as Record<string, unknown>;
    const menuItemId = asString(line.menu_item_id);
    const quantity = line.quantity;
    const variantLabel = asString(line.variant_label);
    if (!menuItemId || !/^[0-9a-f-]{36}$/i.test(menuItemId)) return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return null;
    }
    lines.push({
      menu_item_id: menuItemId,
      quantity,
      ...(variantLabel ? { variant_label: variantLabel } : {}),
    });
  }
  return lines;
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

  const customerName = asString(payload.customer_name);
  const phone = asString(payload.phone);
  const note = asString(payload.note);
  const pickupAtRaw = asString(payload.pickup_at); // "YYYY-MM-DDTHH:mm" or null
  const items = parseLines(payload.items);

  if (!customerName || customerName.length > 120) {
    return NextResponse.json({ error: "Please give a name." }, { status: 400 });
  }
  if (!phone || phone.length < 6 || phone.length > 40) {
    return NextResponse.json({ error: "Please give a phone number." }, { status: 400 });
  }
  if (!items) {
    return NextResponse.json(
      { error: "Please pick at least one dish for your order." },
      { status: 400 },
    );
  }

  let pickupAtIso: string | null = null;
  if (pickupAtRaw) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(pickupAtRaw)) {
      return NextResponse.json({ error: "Please check the pickup time." }, { status: 400 });
    }
    const [date, time] = pickupAtRaw.split("T") as [string, string];
    try {
      pickupAtIso = restaurantLocalToUtcIso(date, time);
    } catch {
      return NextResponse.json({ error: "Please check the pickup time." }, { status: 400 });
    }
  }

  const { url, anonKey } = requireSupabaseEnv();
  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("pickup_orders").insert({
    customer_name: customerName,
    phone,
    note,
    pickup_at: pickupAtIso,
    items,
  });

  if (error) {
    // The pricing trigger refuses hidden/unavailable/made-up items with
    // human-readable messages — safe and useful to pass through; anything
    // else stays generic.
    if (/menu item|variant|no online price|quantity|between/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (/violates row-level security|pickup_at/i.test(error.message)) {
      return NextResponse.json(
        { error: "Please choose a pickup time in the next two weeks." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "The order could not be sent. Please try again, or call us." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
