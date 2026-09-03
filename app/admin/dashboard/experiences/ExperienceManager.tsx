"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ExperienceRow } from "@/lib/supabase/types";
import { buildObjectPath, uploadFile, type UploadProgress } from "@/lib/upload";

/**
 * Experiences manager.
 *
 * Add, edit, photograph, reorder, disable and delete the public experiences
 * cards. Deliberately plain fields — title, description, duration, price —
 * because those are the only fields the public card shows; the owner never
 * fills in forms the website ignores.
 *
 * Images go to the shared `gallery` storage bucket under an `experiences/`
 * prefix — one bucket for all site imagery keeps storage simple; the path
 * keeps it tidy.
 */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ExperienceManager({
  initial,
}: Readonly<{ initial: readonly ExperienceRow[] }>): React.JSX.Element {
  const router = useRouter();
  const [rows, setRows] = useState<readonly ExperienceRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add-form state.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");

  async function addExperience(): Promise<void> {
    if (title.trim().length === 0) {
      setError("Give the experience a title.");
      return;
    }
    setError(null);
    setBusyId("new");
    try {
      const supabase = createSupabaseBrowserClient();
      const nextSort = rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;
      const { data: inserted, error: insertError } = await supabase
        .from("experiences")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          duration: duration.trim() || null,
          price: price.trim().length > 0 ? Number(price.trim()) : null,
          active: true,
          sort_order: nextSort,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setRows((current) => [...current, inserted]);
      setTitle("");
      setDescription("");
      setDuration("");
      setPrice("");
      setStatus("Experience added — it is live on the site.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Adding failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function save(id: string, patch: Partial<ExperienceRow>): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.from("experiences").update(patch).eq("id", id);
      if (updateError) throw updateError;
      setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
      setStatus("Saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saving failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1): Promise<void> {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;

    const reordered = rows.slice();
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(target, 0, moved);
    const renumbered = reordered.map((row, position) => ({ ...row, sort_order: position }));

    setBusyId(moved.id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await Promise.all(
        renumbered.map((row) =>
          row.sort_order === rows.find((old) => old.id === row.id)?.sort_order
            ? Promise.resolve()
            : supabase.from("experiences").update({ sort_order: row.sort_order }).eq("id", row.id),
        ),
      );
      setRows(renumbered);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reordering failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: ExperienceRow): Promise<void> {
    if (!window.confirm(`Delete “${row.title}”? This cannot be undone.`)) return;
    setBusyId(row.id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: deleteError } = await supabase.from("experiences").delete().eq("id", row.id);
      if (deleteError) throw deleteError;
      if (row.image_path) await supabase.storage.from("gallery").remove([row.image_path]);
      setRows((current) => current.filter((item) => item.id !== row.id));
      setStatus("Experience deleted.");
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
        <h2 className="admin-card-title">Add an experience</h2>
        <div className="admin-item-grid">
          <label className="admin-field">
            <span className="admin-label">Title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Duration (optional, e.g. “2 hours”)</span>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={60} />
          </label>
          <label className="admin-field admin-field-wide">
            <span className="admin-label">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Price in RWF (optional)</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="e.g. 15000"
            />
          </label>
        </div>
        <div className="admin-row">
          <button
            type="button"
            className="admin-button"
            disabled={busyId === "new"}
            onClick={() => void addExperience()}
          >
            Add experience
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
        <p className="admin-muted">
          No experiences yet — the public section falls back to the verified
          built-in set (garden dining, outdoor coffee bar, theme nights).
        </p>
      ) : (
        <ul className="admin-list">
          {rows.map((row, index) => (
            <ExperienceCard
              key={row.id}
              row={row}
              index={index}
              busy={busyId === row.id}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
              onSave={save}
              onMove={move}
              onRemove={remove}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type CardProps = Readonly<{
  row: ExperienceRow;
  index: number;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSave: (id: string, patch: Partial<ExperienceRow>) => Promise<void>;
  onMove: (index: number, direction: -1 | 1) => Promise<void>;
  onRemove: (row: ExperienceRow) => Promise<void>;
}>;

function ExperienceCard({
  row,
  index,
  busy,
  isFirst,
  isLast,
  onSave,
  onMove,
  onRemove,
}: CardProps): React.JSX.Element {
  const [title, setTitle] = useState(row.title);
  const [description, setDescription] = useState(row.description ?? "");
  const [duration, setDuration] = useState(row.duration ?? "");
  const [price, setPrice] = useState(row.price === null ? "" : String(row.price));
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const dirty =
    title !== row.title ||
    description !== (row.description ?? "") ||
    duration !== (row.duration ?? "") ||
    price !== (row.price === null ? "" : String(row.price));

  async function uploadImage(file: File): Promise<void> {
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrorShared("Please choose a JPG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorShared(`That file is ${formatBytes(file.size)}. The limit is 10 MB.`);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const path = buildObjectPath("experiences", file);
      const { publicUrl } = await uploadFile(supabase, {
        bucket: "gallery",
        file,
        path,
        onProgress: setProgress,
      });
      await onSave(row.id, { image_url: publicUrl, image_path: path });
    } catch (caught) {
      setErrorShared(caught instanceof Error ? caught.message : "The upload failed.");
    } finally {
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Tiny shared error surface for the card (kept local to avoid prop drilling).
  const [cardError, setCardError] = useState<string | null>(null);
  function setErrorShared(message: string): void {
    setCardError(message);
  }

  return (
    <li className="admin-list-item">
      <div className="admin-list-item-row">
        {row.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="admin-thumb" src={row.image_url} alt={row.title} loading="lazy" />
        ) : (
          <span className="admin-thumb admin-thumb-empty">No photo</span>
        )}

        <div className="admin-list-body">
          <div className="admin-item-grid">
            <label className="admin-field">
              <span className="admin-label">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </label>
            <label className="admin-field">
              <span className="admin-label">Duration</span>
              <input value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={60} />
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
              <span className="admin-label">Price (RWF)</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">Photo</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={busy || progress !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadImage(file);
                }}
              />
            </label>
          </div>

          {progress ? (
            <div className="admin-progress" aria-live="polite">
              <div
                className="admin-progress-bar"
                style={{ width: `${progress.ratio * 100}%` }}
              />
              <span className="admin-progress-label">
                {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.bytesTotal)}
              </span>
            </div>
          ) : null}

          {cardError ? (
            <p className="admin-error" role="alert">
              {cardError}
            </p>
          ) : null}
          {!row.active ? <p className="admin-muted">Hidden from the public site.</p> : null}

          <div className="admin-row">
            <button
              type="button"
              className="admin-button"
              disabled={busy || !dirty}
              onClick={() =>
                void onSave(row.id, {
                  title: title.trim(),
                  description: description.trim() || null,
                  duration: duration.trim() || null,
                  price: price.trim().length > 0 ? Number(price.trim()) : null,
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
                onChange={(e) => void onSave(row.id, { active: e.target.checked })}
              />
              Shown on site
            </label>

            <div className="admin-row-gap">
              <button
                type="button"
                className="admin-button admin-button-quiet"
                disabled={busy || isFirst}
                onClick={() => void onMove(index, -1)}
                aria-label={`Move ${row.title} up`}
              >
                ↑ Up
              </button>
              <button
                type="button"
                className="admin-button admin-button-quiet"
                disabled={busy || isLast}
                onClick={() => void onMove(index, 1)}
                aria-label={`Move ${row.title} down`}
              >
                ↓ Down
              </button>
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
      </div>
    </li>
  );
}
