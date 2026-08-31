"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { HeroMediaRow } from "@/lib/supabase/types";
import {
  RESUMABLE_THRESHOLD_BYTES,
  buildObjectPath,
  uploadFile,
  type UploadProgress,
} from "@/lib/upload";

type HeroManagerProps = Readonly<{
  initialMedia: readonly HeroMediaRow[];
  heroVideoEnabled: boolean;
}>;

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const POSTER_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Hero media manager.
 *
 * Everything the owner needs from a phone: see what is live, upload a
 * replacement with real progress, add a poster, retitle it, switch it off, or
 * delete it.
 *
 * Rows are kept rather than overwritten, so "replace the video" is reversible
 * — the previous one stays in the list and can be made live again in one tap.
 */
export default function HeroManager({
  initialMedia,
  heroVideoEnabled,
}: HeroManagerProps): React.JSX.Element {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const active = initialMedia.find((row) => row.is_active) ?? null;

  const reset = useCallback(() => {
    setProgress(null);
    setIsBusy(false);
    abortRef.current = null;
  }, []);

  const uploadVideo = useCallback(
    async (file: File) => {
      setError(null);
      setStatus(null);

      if (!VIDEO_TYPES.includes(file.type)) {
        setError("Please choose an MP4, WebM or MOV file.");
        return;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setError(
          `That file is ${formatBytes(file.size)}. The limit is 200 MB — ` +
            "try exporting at 1080p instead of 4K.",
        );
        return;
      }

      setIsBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const supabase = createSupabaseBrowserClient();
        const path = buildObjectPath("videos", file);

        const { publicUrl } = await uploadFile(supabase, {
          bucket: "hero",
          file,
          path,
          signal: controller.signal,
          onProgress: setProgress,
        });

        const { error: insertError } = await supabase.from("hero_media").insert({
          video_url: publicUrl,
          video_path: path,
          is_active: false,
        });
        if (insertError) throw insertError;

        setStatus("Uploaded. Select “Make live” when you're ready to publish it.");
        router.refresh();
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          setStatus("Upload cancelled.");
        } else {
          setError(
            caught instanceof Error ? caught.message : "The upload failed. Please try again.",
          );
        }
      } finally {
        reset();
      }
    },
    [reset, router],
  );

  const uploadPoster = useCallback(
    async (file: File, rowId: string) => {
      setError(null);
      setStatus(null);

      if (!POSTER_TYPES.includes(file.type)) {
        setError("Please choose a JPG, PNG or WebP image.");
        return;
      }

      setIsBusy(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const path = buildObjectPath("posters", file);
        const { publicUrl } = await uploadFile(supabase, {
          bucket: "hero",
          file,
          path,
          onProgress: setProgress,
        });

        const { error: updateError } = await supabase
          .from("hero_media")
          .update({ poster_url: publicUrl, poster_path: path })
          .eq("id", rowId);
        if (updateError) throw updateError;

        setStatus("Poster image saved.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The upload failed.");
      } finally {
        reset();
      }
    },
    [reset, router],
  );

  const setActive = useCallback(
    async (rowId: string | null) => {
      setError(null);
      setIsBusy(true);
      try {
        const supabase = createSupabaseBrowserClient();

        // Clear first: a partial unique index forbids two active rows, so
        // activating without deactivating would be rejected by the database.
        const { error: clearError } = await supabase
          .from("hero_media")
          .update({ is_active: false })
          .eq("is_active", true);
        if (clearError) throw clearError;

        if (rowId) {
          const { error: setError_ } = await supabase
            .from("hero_media")
            .update({ is_active: true })
            .eq("id", rowId);
          if (setError_) throw setError_;
        }

        setStatus(rowId ? "This video is now live on the homepage." : "Hero video switched off.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not update.");
      } finally {
        setIsBusy(false);
      }
    },
    [router],
  );

  const removeRow = useCallback(
    async (row: HeroMediaRow) => {
      if (!window.confirm("Delete this video permanently?")) return;

      setError(null);
      setIsBusy(true);
      try {
        const supabase = createSupabaseBrowserClient();

        // Delete the files too, otherwise Storage fills with orphans nobody
        // can see or reach through the dashboard.
        const paths = [row.video_path, row.poster_path].filter(
          (p): p is string => typeof p === "string" && p.length > 0,
        );
        if (paths.length > 0) {
          await supabase.storage.from("hero").remove(paths);
        }

        const { error: deleteError } = await supabase
          .from("hero_media")
          .delete()
          .eq("id", row.id);
        if (deleteError) throw deleteError;

        setStatus("Deleted.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not delete.");
      } finally {
        setIsBusy(false);
      }
    },
    [router],
  );

  const saveText = useCallback(
    async (rowId: string, title: string, subtitle: string) => {
      setError(null);
      setIsBusy(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { error: updateError } = await supabase
          .from("hero_media")
          .update({
            // Empty means "use the designed copy", which is NULL in the
            // database — not an empty string that would blank the headline.
            title: title.trim() || null,
            subtitle: subtitle.trim() || null,
          })
          .eq("id", rowId);
        if (updateError) throw updateError;
        setStatus("Text saved.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save.");
      } finally {
        setIsBusy(false);
      }
    },
    [router],
  );

  const toggleGlobal = useCallback(async () => {
    setIsBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase
        .from("site_settings")
        .update({ hero_video_enabled: !heroVideoEnabled })
        .eq("id", 1);
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }, [heroVideoEnabled, router]);

  return (
    <div className="admin-stack">
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

      {/* -------------------------------------------------- current */}
      <section className="admin-card">
        <h2 className="admin-subtitle">Currently live</h2>
        {active?.video_url ? (
          <>
            <video
              className="admin-video-preview"
              src={active.video_url}
              poster={active.poster_url ?? undefined}
              controls
              playsInline
              preload="metadata"
            />
            <div className="admin-row">
              <button
                type="button"
                className="admin-button admin-button-quiet"
                disabled={isBusy}
                onClick={() => void setActive(null)}
              >
                Switch off
              </button>
            </div>
          </>
        ) : (
          <p className="admin-muted">
            Nothing is live. The homepage is showing the image sequence.
          </p>
        )}

        <label className="admin-check">
          <input
            type="checkbox"
            checked={heroVideoEnabled}
            disabled={isBusy}
            onChange={() => void toggleGlobal()}
          />
          <span>
            Show hero video on the homepage
            <small className="admin-hint">
              Turn this off to fall back to the image sequence without deleting
              anything.
            </small>
          </span>
        </label>
      </section>

      {/* -------------------------------------------------- upload */}
      <section className="admin-card">
        <h2 className="admin-subtitle">Upload a new video</h2>
        <p className="admin-hint">
          MP4 or WebM, up to 200 MB. 1080p is plenty — a 4K hero costs your
          visitors data and takes longer to start playing. Files over{" "}
          {formatBytes(RESUMABLE_THRESHOLD_BYTES)} upload in resumable chunks,
          so a dropped connection picks up where it left off.
        </p>

        <input
          className="admin-file"
          type="file"
          accept={VIDEO_TYPES.join(",")}
          disabled={isBusy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void uploadVideo(file);
          }}
        />

        {progress ? (
          <div className="admin-progress">
            <div
              className="admin-progress-bar"
              style={{ width: `${Math.round(progress.ratio * 100)}%` }}
            />
            <span className="admin-progress-label">
              {formatBytes(progress.bytesUploaded)} of {formatBytes(progress.bytesTotal)} (
              {Math.round(progress.ratio * 100)}%)
            </span>
            <button
              type="button"
              className="admin-link"
              onClick={() => abortRef.current?.abort()}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </section>

      {/* -------------------------------------------------- library */}
      <section className="admin-card">
        <h2 className="admin-subtitle">All videos</h2>
        {initialMedia.length === 0 ? (
          <p className="admin-muted">Nothing uploaded yet.</p>
        ) : (
          <ul className="admin-list">
            {initialMedia.map((row) => (
              <HeroRow
                key={row.id}
                row={row}
                isBusy={isBusy}
                onMakeLive={() => void setActive(row.id)}
                onDelete={() => void removeRow(row)}
                onSaveText={(title, subtitle) => void saveText(row.id, title, subtitle)}
                onPoster={(file) => void uploadPoster(file, row.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type HeroRowProps = Readonly<{
  row: HeroMediaRow;
  isBusy: boolean;
  onMakeLive: () => void;
  onDelete: () => void;
  onSaveText: (title: string, subtitle: string) => void;
  onPoster: (file: File) => void;
}>;

function HeroRow({
  row,
  isBusy,
  onMakeLive,
  onDelete,
  onSaveText,
  onPoster,
}: HeroRowProps): React.JSX.Element {
  const [title, setTitle] = useState(row.title ?? "");
  const [subtitle, setSubtitle] = useState(row.subtitle ?? "");

  return (
    <li className="admin-list-item" data-active={row.is_active ? "true" : "false"}>
      <div className="admin-list-media">
        {row.video_url ? (
          <video
            src={row.video_url}
            poster={row.poster_url ?? undefined}
            controls
            playsInline
            preload="none"
            className="admin-thumb"
          />
        ) : (
          <div className="admin-thumb admin-thumb-empty">No video</div>
        )}
      </div>

      <div className="admin-list-body">
        <p className="admin-list-meta">
          {row.is_active ? <span className="admin-badge">Live</span> : null}
          <span>{new Date(row.created_at).toLocaleDateString()}</span>
        </p>

        <label className="admin-field">
          <span className="admin-label">Headline (optional)</span>
          <input
            className="admin-input"
            value={title}
            placeholder="Food with roots. Flavours without borders."
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="admin-field">
          <span className="admin-label">Sub-line (optional)</span>
          <input
            className="admin-input"
            value={subtitle}
            placeholder="Discover Traveling Roots."
            onChange={(event) => setSubtitle(event.target.value)}
          />
        </label>

        <div className="admin-row">
          <button
            type="button"
            className="admin-button admin-button-quiet"
            disabled={isBusy}
            onClick={() => onSaveText(title, subtitle)}
          >
            Save text
          </button>

          {!row.is_active ? (
            <button
              type="button"
              className="admin-button"
              disabled={isBusy || !row.video_url}
              onClick={onMakeLive}
            >
              Make live
            </button>
          ) : null}

          <label className="admin-button admin-button-quiet admin-file-button">
            {row.poster_url ? "Replace poster" : "Add poster"}
            <input
              type="file"
              accept={POSTER_TYPES.join(",")}
              disabled={isBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onPoster(file);
              }}
            />
          </label>

          <button
            type="button"
            className="admin-button admin-button-danger"
            disabled={isBusy}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
