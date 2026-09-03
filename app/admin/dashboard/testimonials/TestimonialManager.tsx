"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TestimonialRow } from "@/lib/supabase/types";

/**
 * Testimonials manager — add real guest quotes, publish or hide them, remove
 * them. Ratings are optional and clamped to 1–5.
 */

export default function TestimonialManager({
  initial,
}: Readonly<{ initial: readonly TestimonialRow[] }>): React.JSX.Element {
  const router = useRouter();
  const [rows, setRows] = useState<readonly TestimonialRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [author, setAuthor] = useState("");
  const [quote, setQuote] = useState("");
  const [source, setSource] = useState("");
  const [rating, setRating] = useState("");

  async function add(): Promise<void> {
    if (author.trim().length === 0 || quote.trim().length === 0) {
      setError("A testimonial needs an author and a quote.");
      return;
    }
    setBusyId("new");
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const nextSort = rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;
      const parsedRating = rating.trim().length > 0 ? Number(rating.trim()) : null;
      const { data: inserted, error: insertError } = await supabase
        .from("testimonials")
        .insert({
          author: author.trim(),
          quote: quote.trim(),
          source: source.trim() || null,
          rating: parsedRating === null ? null : Math.min(5, Math.max(1, parsedRating)),
          published: false,
          sort_order: nextSort,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setRows((current) => [...current, inserted]);
      setAuthor("");
      setQuote("");
      setSource("");
      setRating("");
      setStatus("Testimonial added. Publish it when you are happy with it.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Adding failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function patch(id: string, changes: Partial<TestimonialRow>): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("testimonials")
        .update(changes)
        .eq("id", id);
      if (updateError) throw updateError;
      setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)));
      setStatus("Saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saving failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: TestimonialRow): Promise<void> {
    if (!window.confirm(`Delete the quote from ${row.author}?`)) return;
    setBusyId(row.id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: deleteError } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", row.id);
      if (deleteError) throw deleteError;
      setRows((current) => current.filter((item) => item.id !== row.id));
      setStatus("Testimonial deleted.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deleting failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-stack">
      <div className="admin-card">
        <h2 className="admin-card-title">Add a testimonial</h2>
        <div className="admin-item-grid">
          <label className="admin-field">
            <span className="admin-label">Author *</span>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Source (optional, e.g. “Google review”)</span>
            <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={120} />
          </label>
          <label className="admin-field admin-field-wide">
            <span className="admin-label">Quote *</span>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Rating 1–5 (optional)</span>
            <input
              value={rating}
              onChange={(e) => setRating(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              maxLength={1}
            />
          </label>
        </div>
        <div className="admin-row">
          <button
            type="button"
            className="admin-button"
            disabled={busyId === "new"}
            onClick={() => void add()}
          >
            Add testimonial
          </button>
        </div>
      </div>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="admin-success" role="status">
          {status}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="admin-muted">No testimonials yet.</p>
      ) : (
        <ul className="admin-list">
          {rows.map((row) => (
            <TestimonialCard
              key={row.id}
              row={row}
              busy={busyId === row.id}
              onPatch={patch}
              onRemove={remove}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type CardProps = Readonly<{
  row: TestimonialRow;
  busy: boolean;
  onPatch: (id: string, changes: Partial<TestimonialRow>) => Promise<void>;
  onRemove: (row: TestimonialRow) => Promise<void>;
}>;

function TestimonialCard({ row, busy, onPatch, onRemove }: CardProps): React.JSX.Element {
  const [author, setAuthor] = useState(row.author);
  const [quote, setQuote] = useState(row.quote);

  const dirty = author !== row.author || quote !== row.quote;

  return (
    <li className="admin-list-item">
      <div className="admin-list-body">
        <div className="admin-item-grid">
          <label className="admin-field">
            <span className="admin-label">Author</span>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} />
          </label>
          <label className="admin-field">
            <span className="admin-label">{row.rating ? `${"★".repeat(row.rating)}` : "No rating"}</span>
            <span className="admin-muted">{row.source ?? "—"}</span>
          </label>
          <label className="admin-field admin-field-wide">
            <span className="admin-label">Quote</span>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </label>
        </div>

        <div className="admin-row">
          <button
            type="button"
            className="admin-button"
            disabled={busy || !dirty}
            onClick={() => void onPatch(row.id, { author: author.trim(), quote: quote.trim() })}
          >
            Save
          </button>
          <label className="admin-check admin-check-inline">
            <input
              type="checkbox"
              checked={row.published}
              disabled={busy}
              onChange={(e) => void onPatch(row.id, { published: e.target.checked })}
            />
            Published
          </label>
          <div className="admin-row-gap">
            <button
              type="button"
              className="admin-button admin-button-danger"
              disabled={busy}
              onClick={() => void onRemove(row)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
