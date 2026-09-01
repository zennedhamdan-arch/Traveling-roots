"use client";

import { useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./ReservationForm.module.css";

/**
 * The public reservation form (rendered on /reservation).
 *
 * A reservation submitted here is a REQUEST, not a confirmed booking — the
 * copy says so and the dashboard says so. It inserts into reservation_requests
 * through the anon key, so Row Level Security applies: the guest may create a
 * row and may not choose its status, read it back, or write staff notes.
 *
 * Validation happens three times, on purpose:
 *   1. in the UI (min attribute, slot list) — good UX,
 *   2. here on submit — because attribute limits are advisory,
 *   3. in Postgres (RLS refuses past dates) — because none of the above is
 *      trustworthy. The messages below just say it more politely.
 */

type Status = "idle" | "submitting" | "done" | "error";

/** Local calendar date as YYYY-MM-DD — never UTC, or guests west of Greenwich
    would be blocked from booking "today" after their midnight. */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type Props = Readonly<{ timeSlots: readonly string[] }>;

export default function ReservationForm({ timeSlots }: Props): React.JSX.Element {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(timeSlots[0] ?? "");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* Computed at render, not memorised forever: "today" must be today when
     the guest actually opens the page, including across a midnight rollover
     while the tab sits open. */
  const today = formatLocalDate(new Date());

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
    partySize >= 1;

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    /* Duplicate guard: the button is disabled, but a fast double Enter would
       still land here. */
    if (status === "submitting" || status === "done") return;
    if (!canSubmit) return;

    /* Re-validate the date against TODAY at submission time — the min
       attribute is a convenience, not a control. */
    const now = new Date();
    if (date < formatLocalDate(now)) {
      setStatus("error");
      setErrorMessage("Please choose today or a future date.");
      return;
    }

    const preferredAt = new Date(`${date}T${time}`);
    if (Number.isNaN(preferredAt.getTime()) || preferredAt.getTime() <= now.getTime()) {
      setStatus("error");
      setErrorMessage(
        "That time has already passed — please choose a later time, or a future date.",
      );
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("reservation_requests").insert({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().length > 0 ? email.trim() : null,
        party_size: partySize,
        preferred_at: preferredAt.toISOString(),
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });

      if (error) throw error;
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error && error.message.length > 0
          ? error.message
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

        <label className={styles.field}>
          <span className={styles.label}>Guests *</span>
          <input
            className={styles.input}
            value={partySize}
            onChange={(e) =>
              setPartySize(Math.max(1, Math.min(60, Number(e.target.value) || 1)))
            }
            type="number"
            min={1}
            max={60}
            required
          />
        </label>

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

      <button type="submit" className={styles.submit} disabled={!canSubmit}>
        {status === "submitting" ? "Sending…" : "Request a table"}
      </button>
      <p className={styles.finePrint}>
        This sends a request — we confirm every table by phone or WhatsApp.
      </p>
    </form>
  );
}
