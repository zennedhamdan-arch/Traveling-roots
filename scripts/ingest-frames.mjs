/**
 * Ingests raw extracted frames into the sequence the site expects.
 *
 *   node scripts/ingest-frames.mjs <source-dir> [--width 1080] [--quality 78]
 *
 * Handles the messy filenames you get out of a frame extractor. It sorts by
 * the LAST number in each filename, so all of these order correctly:
 *
 *   ...Serial1_19700101_000000.jpeg
 *   ...Serial2_19700101_000000.jpeg
 *   ...Serial10_19700101_000004.jpeg
 *
 * (A plain alphabetical sort would put Serial10 before Serial2 — the single
 * most common way an image sequence ends up scrambled.)
 *
 * It then normalises every frame to one size, encodes WebP, and writes
 * frame-01.webp … frame-NN.webp into public/sequence/.
 *
 * Frames are NOT cropped or stretched: they are resized to fit and, if an odd
 * one out has a different aspect ratio, it is padded rather than distorted —
 * and you get a warning telling you which one.
 */

import { mkdir, readdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "sequence");
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp", ".tiff"]);

function parseArgs(argv) {
  const [, , source, ...rest] = argv;
  const opts = { source, width: 1080, quality: 78 };
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    const value = rest[i + 1];
    if (key === "--width") opts.width = Number(value);
    else if (key === "--quality") opts.quality = Number(value);
  }
  return opts;
}

/** The last integer in the filename — the frame number from the extractor. */
function trailingNumber(name) {
  const matches = name.match(/(\d+)/g);
  if (!matches || matches.length === 0) return null;
  // Prefer an explicit "Serial<N>" marker when one is present.
  const serial = name.match(/serial[_-]?(\d+)/i);
  if (serial?.[1] != null) return Number(serial[1]);
  return Number(matches[matches.length - 1]);
}

async function main() {
  const { source, width, quality } = parseArgs(process.argv);

  if (!source) {
    console.error("Usage: node scripts/ingest-frames.mjs <source-dir> [--width 1080] [--quality 78]");
    process.exitCode = 1;
    return;
  }

  const srcDir = path.resolve(source);
  const entries = (await readdir(srcDir)).filter((f) =>
    EXTS.has(path.extname(f).toLowerCase()),
  );

  if (entries.length === 0) {
    console.error(`No images found in ${srcDir}`);
    process.exitCode = 1;
    return;
  }

  const numbered = entries.map((file) => ({ file, n: trailingNumber(file) }));
  const unnumbered = numbered.filter((e) => e.n == null);

  if (unnumbered.length > 0) {
    console.error("These files have no number in the name, so their order is unknown:");
    for (const e of unnumbered) console.error(`  ✗ ${e.file}`);
    process.exitCode = 1;
    return;
  }

  numbered.sort((a, b) => a.n - b.n);

  // Report gaps and duplicates in the extractor's numbering before writing.
  const seen = new Map();
  for (const e of numbered) {
    if (seen.has(e.n)) {
      console.warn(`⚠ Duplicate frame number ${e.n}: "${seen.get(e.n)}" and "${e.file}"`);
    }
    seen.set(e.n, e.file);
  }
  const lo = numbered[0].n;
  const hi = numbered[numbered.length - 1].n;
  const gaps = [];
  for (let i = lo; i <= hi; i += 1) if (!seen.has(i)) gaps.push(i);
  if (gaps.length > 0) {
    console.warn(`⚠ Missing source frame number(s): ${gaps.join(", ")}`);
    console.warn("  The output will be renumbered contiguously, closing the gap.");
  }

  // One canonical size for the whole sequence, taken from the first frame.
  const firstMeta = await sharp(path.join(srcDir, numbered[0].file)).metadata();
  const srcRatio = (firstMeta.width ?? 1) / (firstMeta.height ?? 1);
  const outW = Math.round(width);
  const outH = Math.round(outW / srcRatio);

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  let total = 0;
  const odd = [];

  for (let i = 0; i < numbered.length; i += 1) {
    const entry = numbered[i];
    const src = path.join(srcDir, entry.file);
    const meta = await sharp(src).metadata();
    const ratio = (meta.width ?? 1) / (meta.height ?? 1);

    if (Math.abs(ratio - srcRatio) > 0.01) {
      odd.push(`${entry.file} (${meta.width}×${meta.height})`);
    }

    const name = `frame-${String(i + 1).padStart(2, "0")}.webp`;
    const buffer = await sharp(src)
      // "contain" + transparent padding: never crop, never stretch.
      .resize(outW, outH, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality, effort: 6 })
      .toBuffer();

    await writeFile(path.join(OUT_DIR, name), buffer);
    total += buffer.length;
  }

  const count = numbered.length;
  console.log(`\n✓ Wrote ${count} frames to public/sequence/ at ${outW}×${outH}`);
  console.log(
    `  Total ${(total / 1024 / 1024).toFixed(2)} MB — average ${(total / 1024 / count).toFixed(0)} KB per frame`,
  );

  if (odd.length > 0) {
    console.warn(`\n⚠ ${odd.length} frame(s) had a different aspect ratio and were padded:`);
    for (const o of odd) console.warn(`  ${o}`);
  }

  console.log(`\nNow update FRAME_COUNT in lib/sequence.ts to ${count} if it isn't already,`);
  console.log("then run: npm run frames:check");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
