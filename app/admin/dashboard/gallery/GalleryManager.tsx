"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { GalleryItemRow } from "@/lib/supabase/types";
import { buildObjectPath, uploadFile, type UploadProgress } from "@/lib/upload";

/**
 * Gallery manager.
 *
 * Everything the owner needs from a phone: upload photos (with real progress
 * for larger files), retitle or re-alt-text them, pick a category, mark the
 * ones the homepage showcase should drift through (Featured), reorder them,
 * hide them without deleting, and delete them for good — including the stored
 * file.
 *
 * The storage bucket and the row policies already exist (migrations 0003 and
 * 0002); this component only uses the signed-in admin's own session, exactly
 * like the rest of the dashboard.
 */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // matches the gallery bucket's limit
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** The categories the database's check constraint allows (migration 0006). */
const GALLERY_CATEGORIES = ["Food", "Restaurant", "Garden", "Events", "Atmosphere"] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** "Pork ribs platter.jpg" -> "Pork ribs platter" — a starting alt text. */
function altFromFileName(name: string): string {
  const withoutExtension = name.includes(".")
    ? name.slice(0, name.lastIndexOf("."))
    : name;
  return withoutExtension.slice(0, 200);
}

export default function GalleryManager({
  initial,
}: Readonly<{ initial: readonly GalleryItemRow[] }>): React.JSX.Element {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [rows, setRows] = useState<readonly GalleryItemRow[]>(initial);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<void> {
    setError(null);
    setStatus(null);

    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)}. The limit is 10 MB — ` +
          "most phones can export a smaller copy.",
      );
      return;
    }

    setUploading(true);
    setProgress(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const path = buildObjectPath("photos", file);
      const { publicUrl } = await uploadFile(supabase, {
        bucket: "gallery",
        file,
        path,
        onProgress: setProgress,
      });

      const nextSort =
        rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;

      const { data: inserted, error: insertError } = await supabase
        .from("gallery_items")
        .insert({
          image_url: publicUrl,
          image_path: path,
          alt_text: altFromFileName(file.name),
          published: true,
          sort_order: nextSort,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setRows((current) => [...current, inserted]);
      setStatus("Uploaded and live. Add a caption below.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save(
    id: string,
    patch: Partial<
      Pick<GalleryItemRow, "caption" | "alt_text" | "published" | "featured" | "category">
    >,
  ): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("gallery_items")
        .update(patch)
        .eq("id", id);
      if (updateError) throw updateError;

      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
      setStatus("Saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saving failed.");
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Reordering renumbers every row to its new position. Swapping only the two
   * touched rows would be fewer writes, but rows seeded with equal sort_order
   * (everything defaults to 0) would then never separate — renumbering is
   * idempotent and keeps the order unambiguous forever after.
   */
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
            : supabase.from("gallery_items").update({ sort_order: row.sort_order }).eq("id", row.id),
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

  async function remove(row: GalleryItemRow): Promise<void> {
    const confirmed = window.confirm(
      "Delete this photo for good? This also removes the stored file.",
    );
    if (!confirmed) return;

    setBusyId(row.id);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: deleteError } = await supabase
        .from("gallery_items")
        .delete()
        .eq("id", row.id);
      if (deleteError) throw deleteError;

      // The row is gone; now the file. A failure here leaves an orphaned
      // object, which is untidy but harmless — not worth failing the delete.
      if (row.image_path) {
        await supabase.storage.from("gallery").remove([row.image_path]);
      }

      setRows((current) => current.filter((item) => item.id !== row.id));
      setStatus("Photo deleted.");
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
        <label className="admin-field">
          <span className="admin-label">Add photos</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <span className="admin-hint">
            JPG, PNG, WebP or AVIF, up to 10 MB. Photos go live immediately —
            hide one with its checkbox if it is not ready.
          </span>
        </label>

        {uploading ? (
          <div className="admin-progress" aria-live="polite">
            <div className="admin-progress-bar" style={{ width: `${progress?.ratio ?? 0}%` }} />
            <span className="admin-progress-label">
              {progress
                ? `${formatBytes(progress.bytesUploaded)} / ${formatBytes(progress.bytesTotal)}`
                : "Starting…"}
            </span>
          </div>
        ) : null}
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
        <p className="admin-muted">No photos yet — add the first one above.</p>
      ) : (
        <ul className="admin-gallery-list">
          {rows.map((row, index) => (
            <GalleryCard
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
  row: GalleryItemRow;
  index: number;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSave: (
    id: string,
    patch: Partial<
      Pick<GalleryItemRow, "caption" | "alt_text" | "published" | "featured" | "category">
    >,
  ) => Promise<void>;
  onMove: (index: number, direction: -1 | 1) => Promise<void>;
  onRemove: (row: GalleryItemRow) => Promise<void>;
}>;

function GalleryCard({
  row,
  index,
  busy,
  isFirst,
  isLast,
  onSave,
  onMove,
  onRemove,
}: CardProps): React.JSX.Element {
  // Local edit state per card, so editing one photo never blocks the others.
  const [caption, setCaption] = useState(row.caption ?? "");
  const [altText, setAltText] = useState(row.alt_text);

  const dirty = caption !== (row.caption ?? "") || altText !== row.alt_text;

  return (
    <li className="admin-list-item">
      <div className="admin-list-item-row">
        {/* A plain <img> on purpose: these are admin-uploaded images served
            from Supabase's CDN, and this page is dynamic and behind auth, so
            next/image optimisation would add cost and config (remotePatterns)
            without buying anything here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="admin-thumb" src={row.image_url} alt={row.alt_text} loading="lazy" />

        <div className="admin-list-body">
          <div className="admin-item-grid">
            <label className="admin-field">
              <span className="admin-label">Caption (shown under the photo)</span>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} />
            </label>

            <label className="admin-field admin-field-wide">
              <span className="admin-label">Alt text (describe the photo)</span>
              <input value={altText} onChange={(e) => setAltText(e.target.value)} maxLength={200} />
            </label>
          </div>

          <div className="admin-row">
            <button
              type="button"
              className="admin-button"
              disabled={busy || !dirty}
              onClick={() => void onSave(row.id, { caption: caption || null, alt_text: altText })}
            >
              Save
            </button>

            <label className="admin-check admin-check-inline">
              <input
                type="checkbox"
                checked={row.published}
                disabled={busy}
                onChange={(e) => void onSave(row.id, { published: e.target.checked })}
              />
              Published
            </label>

            <label className="admin-check admin-check-inline">
              <input
                type="checkbox"
                checked={row.featured}
                disabled={busy}
                onChange={(e) => void onSave(row.id, { featured: e.target.checked })}
              />
              Featured
            </label>

            <label className="admin-field">
              <span className="admin-label">Category</span>
              <select
                className="admin-input"
                value={row.category ?? ""}
                disabled={busy}
                onChange={(e) => void onSave(row.id, { category: e.target.value || null })}
              >
                <option value="">—</option>
                {GALLERY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="admin-row-gap">
              <button
                type="button"
                className="admin-button admin-button-quiet"
                disabled={busy || isFirst}
                aria-label={`Move ${row.alt_text || "photo"} up`}
                onClick={() => void onMove(index, -1)}
              >
                ↑ Up
              </button>
              <button
                type="button"
                className="admin-button admin-button-quiet"
                disabled={busy || isLast}
                aria-label={`Move ${row.alt_text || "photo"} down`}
                onClick={() => void onMove(index, 1)}
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

          <p className="admin-muted">
            {!row.published
              ? "Hidden from the public site. "
              : ""}
            {row.featured
              ? "Featured — appears in the homepage showcase (first 8 featured photos)."
              : "Not featured — appears in the full gallery only."}
          </p>
        </div>
      </div>
    </li>
  );
}
