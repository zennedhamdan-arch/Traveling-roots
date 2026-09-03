"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OfferRow } from "@/lib/supabase/types";

/**
 * Offers manager — deliberately minimal: title, description, dates, on/off.
 * Only fields the `offers` table actually has, nothing speculative.
 */

export default function OfferManager({
  initial,
}: Readonly<{ initial: readonly OfferRow[] }>): React.JSX.Element {
  const router = useRouter();
  const [rows, setRows] = useState<readonly OfferRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  async function add(): Promise<void> {
    if (title.trim().length === 0) {
      setError("Give the offer a title.");
      return;
    }
    setBusyId("new");
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const nextSort = rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;
      const { data: inserted, error: insertError } = await supabase
        .from("offers")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          starts_at: startsAt || null,
          ends_at: endsAt || null,
          active: false,
          sort_order: nextSort,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setRows((current) => [...current, inserted]);
      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      setStatus("Offer added. Switch it on when it goes live.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Adding failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function patch(id: string, changes: Partial<OfferRow>): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.from("offers").update(changes).eq("id", id);
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

  async function remove(row: OfferRow): Promise<void> {
    if (!window.confirm(`Delete “${row.title}”?`)) return;
    setBusyId(row.id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: deleteError } = await supabase.from("offers").delete().eq("id", row.id);
      if (deleteError) throw deleteError;
      setRows((current) => current.filter((item) => item.id !== row.id));
      setStatus("Offer deleted.");
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
        <h2 className="admin-card-title">Add an offer</h2>
        <div className="admin-item-grid">
          <label className="admin-field">
            <span className="admin-label">Title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Starts (optional)</span>
            <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label className="admin-field admin-field-wide">
            <span className="admin-label">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Ends (optional)</span>
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
        </div>
        <div className="admin-row">
          <button
            type="button"
            className="admin-button"
            disabled={busyId === "new"}
            onClick={() => void add()}
          >
            Add offer
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
        <p className="admin-muted">No offers yet.</p>
      ) : (
        <ul className="admin-list">
          {rows.map((row) => (
            <OfferCard
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
  row: OfferRow;
  busy: boolean;
  onPatch: (id: string, changes: Partial<OfferRow>) => Promise<void>;
  onRemove: (row: OfferRow) => Promise<void>;
}>;

function OfferCard({ row, busy, onPatch, onRemove }: CardProps): React.JSX.Element {
  const [title, setTitle] = useState(row.title);
  const [description, setDescription] = useState(row.description ?? "");

  const dirty = title !== row.title || description !== (row.description ?? "");

  return (
    <li className="admin-list-item">
      <div className="admin-list-body">
        <div className="admin-item-grid">
          <label className="admin-field">
            <span className="admin-label">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </label>
          <label className="admin-field admin-field-wide">
            <span className="admin-label">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </label>
        </div>

        <p className="admin-muted">
          {row.starts_at ?? "no start"} → {row.ends_at ?? "no end"}
        </p>

        <div className="admin-row">
          <button
            type="button"
            className="admin-button"
            disabled={busy || !dirty}
            onClick={() =>
              void onPatch(row.id, {
                title: title.trim(),
                description: description.trim() || null,
              })
            }
          >
            Save
          </button>
          <label className="admin-check admin-check-inline">
            <input
              type="checkbox"
              checked={row.active}
              disabled={busy}
              onChange={(e) => void onPatch(row.id, { active: e.target.checked })}
            />
            Active
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
