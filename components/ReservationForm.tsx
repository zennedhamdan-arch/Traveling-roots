"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./ReservationForm.module.css";

/**
 * The public reservation form.
 *
 * A reservation submitted here is a REQUEST, not a confirmed booking — the
 * copy says so and the dashboard says so. It inserts into reservation_requests
 * through the anon key, so Row Level Security applies: the guest may create a
 * row and may not choose its status, read it back, or write staff notes.
 *
 * Without Supabase configured this component is never rendered (the section
 * falls back to phone and WhatsApp buttons) — a form that can never succeed
 * is worse than no form.
 */

type Status = "idle" | "submitting" | "done" | "error";

export default function ReservationForm(): React.JSX.Element {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const canSubmit =
    status !== "submitting" &&
    name.trim().length > 0 &&
    phone.trim().length >= 6 &&
    date.length > 0 &&
    time.length > 0 &&
    partySize >= 1;

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("reservation_requests").insert({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().length > 0 ? email.trim() : null,
        party_size: partySize,
        preferred_at: new Date(`${date}T${time}`).toISOString(),
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
            onChange={(e) => setPartySize(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
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
          <input
            className={styles.input}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            type="time"
            required
          />
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
          {errorMessage} Please try again, or call us — the number is next to
          this form.
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
