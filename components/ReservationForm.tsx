"use client";

import { useMemo, useState } from "react";

import {
  restaurantLocalIsPast,
  restaurantToday,
} from "@/lib/time";
import Turnstile from "./Turnstile";
import styles from "./ReservationForm.module.css";

/**
 * The public reservation form (rendered on /reservation).
 *
 * A reservation submitted here is a REQUEST, not a confirmed booking — the
 * copy says so and the dashboard says so. It posts to /api/reservations,
 * which verifies the anti-bot token server-side and then inserts into
 * reservation_requests through the anon key, so Row Level Security applies:
 * the guest may create a row and may not choose its status, read it back, or
 * write staff notes.
 *
 * Validation happens three times, on purpose:
 *   1. in the UI (min attribute, slot list) — good UX,
 *   2. here on submit — because attribute limits are advisory,
 *   3. in Postgres (RLS refuses past dates) — because none of the above is
 *      trustworthy. The messages below just say it more politely.
 */

type Status = "idle" | "submitting" | "done" | "error";

type Props = Readonly<{
  timeSlots: readonly string[];
  /** Public Turnstile site key, supplied by the server page. Empty = not configured. */
  turnstileSiteKey: string;
}>;

export default function ReservationForm({
  timeSlots,
  turnstileSiteKey: siteKey,
}: Props): React.JSX.Element {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(timeSlots[0] ?? "");
  const [partySize, setPartySize] = useState(1);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  /* All dates/times on this form are RESTAURANT-local (Africa/Kigali), no
     matter where the guest is: a visitor in New York picking 19:00 means
     19:00 in Musanze. "Today" is therefore today AT THE RESTAURANT — which
     may differ from the guest's calendar either side of their midnight.
     Recomputed every render so a tab left open rolls over correctly. */
  const today = restaurantToday();

  const slots = useMemo(() => {
    if (timeSlots.length > 0) return timeSlots;
    /* No hours configured: a plain time input, still bounded to a sane day. */
    return null;
  }, [timeSlots]);

  const canSubmit =
    status !== "submitting" &&
    status !== "done" &&
    name.trim().length > 0 &&
    phone.trim().length >= 6 &&
    date.length > 0 &&
    time.length > 0 &&
    partySize >= 1 &&
    /* With CAPTCHA configured, no token means no submit. Without keys (e.g.
       local dev) the server decides — and fails loudly in production. */
    (siteKey.length === 0 || turnstileToken !== null);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    /* Duplicate guard: the button is disabled, but a fast double Enter would
       still land here. */
    if (status === "submitting" || status === "done") return;
    if (!canSubmit) return;

    /* Re-validate at submission time — the min attribute is a convenience,
       not a control. Compared in RESTAURANT time, the frame the whole form
       (and the database policy) operates in. */
    if (date < today) {
      setStatus("error");
      setErrorMessage("Please choose today or a future date.");
      return;
    }

    if (restaurantLocalIsPast(date, time)) {
      setStatus("error");
      setErrorMessage(
        "That time has already passed — please choose a later time, or a future date.",
      );
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    /* The browser no longer writes to the database: the submission goes to
       our API route, which verifies the anti-bot token server-side and
       inserts under the same anon-role rules (RLS, column grants) that
       always applied. */
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().length > 0 ? email.trim() : null,
          party_size: partySize,
          date,
          time,
          notes: notes.trim().length > 0 ? notes.trim() : null,
          turnstileToken,
        }),
      });

      const outcome = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !outcome?.ok) {
        throw new Error(outcome?.error ?? "The request could not be sent.");
      }
      setStatus("done");
    } catch (caught) {
      setStatus("error");
      setErrorMessage(
        caught instanceof Error && caught.message.length > 0
          ? caught.message
          : "The request could not be sent.",
      );
    }
  }

  if (status === "done") {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneMark} aria-hidden="true">
          ✓
        </p>
        <h3 className={styles.doneTitle}>Request received</h3>
        <p className={styles.doneBody}>
          Thank you, {name.trim()}. We will call or WhatsApp{" "}
          <strong>{phone.trim()}</strong> to confirm your table — a request is
          not a booking until you hear from us.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate={false}>
      <div className={styles.rows}>
        <label className={styles.field}>
          <span className={styles.label}>Your name *</span>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            maxLength={120}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Phone *</span>
          <input
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+250 7…"
            required
            maxLength={40}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Email (optional)</span>
          <input
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            maxLength={160}
          />
        </label>

        <div className={styles.field}>
          <span className={styles.label} id="guests-label">
            Guests *
          </span>
          {/* A stepper, not a number input: exact ±1 control, no native
              spinners, no keyboard-only edge cases, comfortable on phones.
              The value itself is display-only. */}
          <div className={styles.stepper} role="group" aria-labelledby="guests-label">
            <button
              type="button"
              className={styles.stepButton}
              onClick={() => setPartySize((g) => Math.max(1, g - 1))}
              disabled={partySize <= 1}
              aria-label="Decrease guests"
            >
              <span aria-hidden="true">−</span>
            </button>
            <span className={styles.stepValue} aria-live="polite" aria-label="Guests">
              {partySize}
            </span>
            <button
              type="button"
              className={styles.stepButton}
              onClick={() => setPartySize((g) => Math.min(20, g + 1))}
              disabled={partySize >= 20}
              aria-label="Increase guests"
            >
              <span aria-hidden="true">＋</span>
            </button>
          </div>
          <span className={styles.stepHint}>
            {partySize} {partySize === 1 ? "guest" : "guests"}
          </span>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Date *</span>
          <input
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            min={today}
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Time *</span>
          {slots ? (
            <select
              className={styles.input}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            >
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={styles.input}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              type="time"
              min="08:00"
              max="22:00"
              required
            />
          )}
        </label>

        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.label}>Message (optional)</span>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Occasion, seating preference, allergies…"
          />
        </label>
      </div>

      {status === "error" && errorMessage !== null ? (
        <p className={styles.error} role="alert">
          {errorMessage} Please try again, or call us — the number is below the form.
        </p>
      ) : null}

      {siteKey ? <Turnstile siteKey={siteKey} onToken={setTurnstileToken} /> : null}

      <button type="submit" className={styles.submit} disabled={!canSubmit}>
        {status === "submitting" ? "Sending…" : "Request a table"}
      </button>
      <p className={styles.finePrint}>
        This sends a request — we confirm every table by phone or WhatsApp.
      </p>
    </form>
  );
}
