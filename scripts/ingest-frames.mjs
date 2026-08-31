/**
 * Ingests raw extracted frames into the sequence the site expects.
 *
 *   node scripts/ingest-frames.mjs <source-dir> [options]
 *
 *   --scene <auto|N|all>  which scene to use          (default: auto)
 *   --trim <n>            frames to drop at each cut  (default: 1)
 *   --width <px>          output width                (default: 1080)
 *   --quality <1-100>     WebP quality               (default: 78)
 *   --no-interpolate      repeat frames instead of generating in-betweens
 *   --dry-run             analyse and report, write nothing
 *
 * ---------------------------------------------------------------------------
 * Why this does more than rename files
 *
 * A scroll-scrubbed sequence is not a video. The user owns the playhead, they
 * can stop on any frame and reverse, so the sequence has to read as ONE
 * continuous shot. Three things in a raw extraction break that:
 *
 *   1. Filename order.   A plain alphabetical sort puts Serial10 before
 *                        Serial2. Frames are sorted numerically instead.
 *   2. Black frames.     A fade-through-black is invisible at 30fps and
 *                        looks like a broken image when you scrub onto it.
 *   3. Scene cuts.       If the source is a montage of different shots, the
 *                        sequence hard-cuts mid-scroll and reads as a bug.
 *
 * So this script detects scenes by colour distance, drops black frames and
 * cross-dissolve frames either side of a cut, picks a single continuous
 * scene, and resamples it to exactly FRAME_COUNT frames.
 * ---------------------------------------------------------------------------
 */

import { mkdir, readdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/** Must match FRAME_COUNT in lib/sequence.ts. */
const FRAME_COUNT = 29;
const OUT_DIR = path.join(process.cwd(), "public", "sequence");
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp", ".tiff"]);

/** Mean luma (0–255) below which a frame is treated as black. */
const DARK_LUMA = 12;
/** Mean per-channel colour distance that indicates a cut rather than motion. */
const CUT_DELTA = 26;
/**
 * Below this mean pixel difference two consecutive frames are the same shot.
 * Extractors routinely emit duplicates when the source clip holds; scrubbing
 * onto a run of identical frames feels like the scroll has jammed.
 */
const DUPLICATE_DELTA = 1.5;
/** Thumbnail edge used for duplicate fingerprints — cheap and sufficient. */
const FINGERPRINT = 48;

function parseArgs(argv) {
  const [, , source, ...rest] = argv;
  const opts = {
    source,
    width: 1080,
    quality: 78,
    scene: "auto",
    trim: 1,
    dryRun: false,
    interpolate: true,
  };
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    if (key === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    if (key === "--no-interpolate") {
      opts.interpolate = false;
      continue;
    }
    const value = rest[i + 1];
    i += 1;
    if (key === "--width") opts.width = Number(value);
    else if (key === "--quality") opts.quality = Number(value);
    else if (key === "--scene") opts.scene = value;
    else if (key === "--trim") opts.trim = Number(value);
  }
  return opts;
}

/** The frame number from the extractor: prefer "Serial<N>", else the last int. */
function frameNumber(name) {
  const serial = name.match(/serial[_-]?(\d+)/i);
  if (serial?.[1] != null) return Number(serial[1]);
  const matches = name.match(/(\d+)/g);
  if (!matches || matches.length === 0) return null;
  return Number(matches[matches.length - 1]);
}

const colourDistance = (a, b) =>
  (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;

/**
 * NOTE: sharp's `.stats()` is computed on the INPUT image and ignores earlier
 * pipeline operations, so `.extract(...).stats()` silently returns whole-image
 * numbers. Everything here is measured from an explicit raw pixel buffer.
 */
async function describe(file) {
  const thumb = await sharp(file)
    .resize(FINGERPRINT, FINGERPRINT, { fit: "fill" })
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .raw()
    .toBuffer();

  let r = 0;
  let g = 0;
  let b = 0;
  const pixels = thumb.length / 3;
  for (let i = 0; i < thumb.length; i += 3) {
    r += thumb[i];
    g += thumb[i + 1];
    b += thumb[i + 2];
  }
  r /= pixels;
  g /= pixels;
  b /= pixels;

  // Greyscale fingerprint for duplicate detection.
  const fingerprint = Buffer.allocUnsafe(pixels);
  for (let i = 0, p = 0; i < thumb.length; i += 3, p += 1) {
    fingerprint[p] = (thumb[i] * 0.2126 + thumb[i + 1] * 0.7152 + thumb[i + 2] * 0.0722) | 0;
  }

  return { rgb: [r, g, b], luma: 0.2126 * r + 0.7152 * g + 0.0722 * b, fingerprint };
}

/** Mean absolute pixel difference between two equally sized buffers. */
function pixelDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/**
 * Maps `count` output slots onto the source list, keeping the two neighbouring
 * source frames and the fractional position between them.
 *
 * Nearest-neighbour resampling would just repeat frames: 7 sources stretched
 * to 29 slots means each one appears four times, and scrubbing that reads as a
 * visible staircase rather than motion. Keeping the fraction lets the writer
 * generate a true in-between frame instead.
 */
function buildTimeline(list, count) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    const pos = t * (list.length - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, list.length - 1);
    return { a: list[i0], b: list[i1], t: pos - i0 };
  });
}

/** Decoded, resized RGB pixels — cached, since each source frame feeds several outputs. */
const rawCache = new Map();
async function rawPixels(file, outW, outH) {
  const hit = rawCache.get(file);
  if (hit) return hit;
  const buffer = await sharp(file)
    .resize(outW, outH, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
    .removeAlpha()
    .raw()
    .toBuffer();
  rawCache.set(file, buffer);
  return buffer;
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.source) {
    console.error(
      "Usage: node scripts/ingest-frames.mjs <source-dir> [--scene auto|N|all] [--trim 1] [--width 1080] [--quality 78] [--no-interpolate] [--dry-run]",
    );
    process.exitCode = 1;
    return;
  }

  const srcDir = path.resolve(opts.source);
  const files = (await readdir(srcDir)).filter((f) =>
    EXTS.has(path.extname(f).toLowerCase()),
  );

  if (files.length === 0) {
    console.error(`No images found in ${srcDir}`);
    process.exitCode = 1;
    return;
  }

  /* ---------------- order ---------------- */

  const numbered = files.map((file) => ({ file, n: frameNumber(file) }));
  const unnumbered = numbered.filter((e) => e.n == null);
  if (unnumbered.length > 0) {
    console.error("These files have no number in the name, so their order is unknown:");
    for (const e of unnumbered) console.error(`  ✗ ${e.file}`);
    process.exitCode = 1;
    return;
  }
  numbered.sort((a, b) => a.n - b.n);

  const seen = new Map();
  for (const e of numbered) {
    if (seen.has(e.n)) {
      console.warn(`⚠ Duplicate frame number ${e.n}: "${seen.get(e.n)}" and "${e.file}"`);
    }
    seen.set(e.n, e.file);
  }
  const missing = [];
  for (let i = numbered[0].n; i <= numbered[numbered.length - 1].n; i += 1) {
    if (!seen.has(i)) missing.push(i);
  }

  console.log(`Read ${numbered.length} source frames from ${srcDir}`);
  if (missing.length > 0) {
    console.warn(`⚠ Source numbering skips: ${missing.join(", ")}`);
  }

  /* ---------------- analyse ---------------- */

  for (const entry of numbered) {
    const stats = await describe(path.join(srcDir, entry.file));
    entry.rgb = stats.rgb;
    entry.luma = stats.luma;
    entry.fingerprint = stats.fingerprint;
  }

  const black = numbered.filter((e) => e.luma < DARK_LUMA);
  const lit = numbered.filter((e) => e.luma >= DARK_LUMA);
  if (black.length > 0) {
    console.log(
      `\nDropped ${black.length} black frame(s): ${black.map((e) => e.file).join(", ")}`,
    );
    console.log("  (a fade-through-black is invisible in a video and a dead frame when scrubbed)");
  }

  // Drop consecutive duplicates. A held frame is invisible at 30fps but stalls
  // the scrub, because several scroll positions map to the same picture.
  const unique = [];
  const duplicates = [];
  for (const entry of lit) {
    const previous = unique[unique.length - 1];
    if (previous && pixelDistance(previous.fingerprint, entry.fingerprint) < DUPLICATE_DELTA) {
      duplicates.push(`${entry.n} (same as ${previous.n})`);
      continue;
    }
    unique.push(entry);
  }
  if (duplicates.length > 0) {
    console.log(`\nDropped ${duplicates.length} duplicate frame(s): ${duplicates.join(", ")}`);
    console.log("  (identical frames make the scroll feel like it has jammed)");
  }

  /* ---------------- segment into scenes ---------------- */

  const scenes = [];
  let current = [];
  for (let i = 0; i < unique.length; i += 1) {
    if (i > 0) {
      const delta = colourDistance(unique[i - 1].rgb, unique[i].rgb);
      if (delta > CUT_DELTA) {
        scenes.push(current);
        current = [];
      }
    }
    current.push(unique[i]);
  }
  if (current.length > 0) scenes.push(current);

  console.log(`\nDetected ${scenes.length} scene(s):`);
  scenes.forEach((scene, i) => {
    const [r, g, b] = scene[0].rgb;
    console.log(
      `  Scene ${i + 1}: ${String(scene.length).padStart(2)} frames  ` +
        `(source ${scene[0].n}\u2013${scene[scene.length - 1].n})  ` +
        `avg colour rgb(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)})`,
    );
  });

  /* ---------------- choose ---------------- */

  let chosen;
  let label;

  if (opts.scene === "all") {
    chosen = unique;
    label = "all scenes (montage — expect hard cuts while scrubbing)";
  } else if (opts.scene === "auto") {
    let best = 0;
    for (let i = 1; i < scenes.length; i += 1) {
      if (scenes[i].length > scenes[best].length) best = i;
    }
    chosen = scenes[best];
    label = `scene ${best + 1} (longest)`;
  } else {
    const index = Number(opts.scene) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= scenes.length) {
      console.error(`\n✗ --scene ${opts.scene} is out of range (1–${scenes.length})`);
      process.exitCode = 1;
      return;
    }
    chosen = scenes[index];
    label = `scene ${index + 1}`;
  }

  // Cross-dissolve frames sit at scene boundaries: they are a blend of two
  // shots and look like a double exposure when you stop on one.
  if (opts.scene !== "all" && opts.trim > 0 && chosen.length > opts.trim * 2 + 2) {
    const before = chosen.length;
    chosen = chosen.slice(opts.trim, chosen.length - opts.trim);
    console.log(
      `\nTrimmed ${before - chosen.length} cross-dissolve frame(s) from the scene edges.`,
    );
  }

  console.log(`\nUsing ${label} — ${chosen.length} frames → resampled to ${FRAME_COUNT}.`);

  const timeline = buildTimeline(chosen, FRAME_COUNT);

  const upsampling = chosen.length < FRAME_COUNT;
  if (upsampling) {
    const ratio = (FRAME_COUNT / chosen.length).toFixed(1);
    if (opts.interpolate) {
      console.log(
        `\n  ${chosen.length} source frames → ${FRAME_COUNT} slots (${ratio}× upsample).\n` +
          "  Generating in-between frames by blending neighbours, so the scrub is\n" +
          "  smooth instead of a stepped repeat. This is a cross-dissolve tween, not\n" +
          "  true motion — more source frames will always look better.",
      );
    } else {
      console.warn(
        `\n⚠ ${chosen.length} source frames → ${FRAME_COUNT} slots with --no-interpolate.\n` +
          `  Each frame repeats about ${ratio}×; scrubbing will look stepped.`,
      );
    }
  }

  if (opts.dryRun) {
    console.log("\nDry run — nothing written. Output would be:");
    timeline.forEach((slot, i) => {
      const name = `frame-${String(i + 1).padStart(2, "0")}.webp`;
      const blended = opts.interpolate && slot.t > 0.02 && slot.a !== slot.b;
      const detail = blended
        ? `blend ${slot.a.n}→${slot.b.n} @ ${slot.t.toFixed(2)}`
        : `source ${slot.a.n}`;
      console.log(`  ${name}  ←  ${detail}`);
    });
    return;
  }

  /* ---------------- write ---------------- */

  const firstMeta = await sharp(path.join(srcDir, chosen[0].file)).metadata();
  const srcRatio = (firstMeta.width ?? 1) / (firstMeta.height ?? 1);
  const outW = Math.round(opts.width);
  const outH = Math.round(outW / srcRatio);

  const odd = [];
  for (const entry of chosen) {
    const meta = await sharp(path.join(srcDir, entry.file)).metadata();
    const ratio = (meta.width ?? 1) / (meta.height ?? 1);
    if (Math.abs(ratio - srcRatio) > 0.01) {
      odd.push(`${entry.file} (${meta.width}×${meta.height})`);
    }
  }

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  let total = 0;
  let blendedCount = 0;

  for (let i = 0; i < timeline.length; i += 1) {
    const slot = timeline[i];
    const pathA = path.join(srcDir, slot.a.file);
    const shouldBlend = opts.interpolate && slot.t > 0.02 && slot.a !== slot.b;

    let pixels = await rawPixels(pathA, outW, outH);

    if (shouldBlend) {
      const pixelsB = await rawPixels(path.join(srcDir, slot.b.file), outW, outH);
      const blend = Buffer.allocUnsafe(pixels.length);
      const t = slot.t;
      const inv = 1 - t;
      for (let p = 0; p < pixels.length; p += 1) {
        blend[p] = pixels[p] * inv + pixelsB[p] * t;
      }
      pixels = blend;
      blendedCount += 1;
    }

    const buffer = await sharp(pixels, {
      raw: { width: outW, height: outH, channels: 3 },
    })
      .webp({ quality: opts.quality, effort: 6 })
      .toBuffer();

    await writeFile(
      path.join(OUT_DIR, `frame-${String(i + 1).padStart(2, "0")}.webp`),
      buffer,
    );
    total += buffer.length;
  }

  console.log(`\n✓ Wrote ${FRAME_COUNT} frames to public/sequence/ at ${outW}×${outH}`);
  if (blendedCount > 0) {
    console.log(`  ${FRAME_COUNT - blendedCount} from source, ${blendedCount} interpolated.`);
  }
  console.log(
    `  Total ${(total / 1024 / 1024).toFixed(2)} MB — average ${(total / 1024 / FRAME_COUNT).toFixed(0)} KB per frame`,
  );

  if (odd.length > 0) {
    console.warn(`\n⚠ ${odd.length} frame(s) had a different aspect ratio and were padded:`);
    for (const o of odd) console.warn(`  ${o}`);
  }

  console.log("\nNext: npm run frames:measure && npm run frames:check");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
