/**
 * Validates the frame sequence before you ship.
 *
 *   npm run frames:check
 *
 * Checks:
 *   · all frames present, non-empty, one consistent aspect ratio
 *   · per-frame weight against a mobile budget
 *   · CONTINUITY — flags near-black frames and hard cuts between frames
 *
 * The continuity pass matters for a scroll-scrubbed sequence. The scrollbar is
 * the timeline, so a black frame or an abrupt scene change in the middle reads
 * as a glitch, not as an edit. This tells you exactly where they are.
 */

import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const FRAME_COUNT = 29;
const DIR = path.join(process.cwd(), "public", "sequence");

/** Above this, a frame is worth re-compressing for weak mobile networks. */
const WARN_KB = 180;
/** Mean luma below this (0–255) means the frame is essentially black. */
const DARK_LUMA = 12;
/** Mean per-channel jump between neighbours that reads as a cut, not motion. */
const CUT_DELTA = 26;

const frameName = (i) => `frame-${String(i + 1).padStart(2, "0")}.webp`;

async function main() {
  let files;
  try {
    files = await readdir(DIR);
  } catch {
    console.error("✗ Missing directory: public/sequence/");
    process.exitCode = 1;
    return;
  }

  const problems = [];
  const warnings = [];
  const frames = [];
  let totalBytes = 0;

  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const name = frameName(i);
    const file = path.join(DIR, name);

    let info;
    try {
      info = await stat(file);
    } catch {
      problems.push(`${name} is missing`);
      continue;
    }

    if (info.size === 0) {
      problems.push(`${name} is empty`);
      continue;
    }
    totalBytes += info.size;

    const image = sharp(file);
    const meta = await image.metadata();
    if (!meta.width || !meta.height) {
      problems.push(`${name} has no readable dimensions`);
      continue;
    }

    // Flatten onto black so transparent padding doesn't skew the statistics.
    const stats = await sharp(file)
      .flatten({ background: { r: 0, g: 0, b: 0 } })
      .stats();
    const [r, g, b] = stats.channels;
    const luma = 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean;

    frames.push({
      name,
      index: i,
      w: meta.width,
      h: meta.height,
      ratio: meta.width / meta.height,
      kb: info.size / 1024,
      rgb: [r.mean, g.mean, b.mean],
      luma,
    });

    if (info.size / 1024 > WARN_KB) {
      warnings.push(
        `${name} is ${(info.size / 1024).toFixed(0)} KB (over the ${WARN_KB} KB mobile budget)`,
      );
    }
  }

  const numbered = files.filter((f) => /^frame-\d{2}\.webp$/.test(f));
  for (const extra of files.filter(
    (f) => /\.(webp|png|jpe?g)$/i.test(f) && !/^frame-\d{2}\.webp$/.test(f),
  )) {
    warnings.push(`Unexpected file in public/sequence/: ${extra}`);
  }
  if (numbered.length > FRAME_COUNT) {
    problems.push(
      `Found ${numbered.length} frames but the sequence is exactly ${FRAME_COUNT}`,
    );
  }

  const first = frames[0];
  if (first) {
    for (const f of frames) {
      if (Math.abs(f.ratio - first.ratio) > 0.01) {
        problems.push(`${f.name} is ${f.w}×${f.h}, which doesn't match ${first.w}×${first.h}`);
      }
    }
    const orientation =
      first.ratio < 0.95 ? "portrait" : first.ratio > 1.05 ? "landscape" : "square";
    console.log(
      `Frame size: ${first.w}×${first.h}  (${first.ratio.toFixed(3)}:1, ${orientation})`,
    );
  }

  console.log(
    `Sequence weight: ${(totalBytes / 1024 / 1024).toFixed(2)} MB across ${frames.length} frames ` +
      `(avg ${(totalBytes / 1024 / Math.max(frames.length, 1)).toFixed(0)} KB)`,
  );

  /* ---------------- continuity ---------------- */

  const dark = frames.filter((f) => f.luma < DARK_LUMA);
  const cuts = [];
  for (let i = 1; i < frames.length; i += 1) {
    const a = frames[i - 1];
    const b = frames[i];
    const delta =
      (Math.abs(a.rgb[0] - b.rgb[0]) +
        Math.abs(a.rgb[1] - b.rgb[1]) +
        Math.abs(a.rgb[2] - b.rgb[2])) /
      3;
    if (delta > CUT_DELTA) cuts.push({ from: a.name, to: b.name, delta });
  }

  if (dark.length > 0 || cuts.length > 0) {
    console.log("\nContinuity:");
    for (const f of dark) {
      console.log(`  ⚠ ${f.name} is essentially black (mean luma ${f.luma.toFixed(1)})`);
    }
    for (const c of cuts) {
      console.log(
        `  ⚠ hard cut ${c.from} → ${c.to} (colour jump ${c.delta.toFixed(0)})`,
      );
    }
    console.log(
      "\n  A scrubbed sequence reads best as ONE continuous shot. Black frames and\n" +
        "  scene changes look like glitches when the user controls the timeline.",
    );
  } else if (frames.length > 1) {
    console.log("\nContinuity: ✓ no black frames, no hard cuts — reads as one shot.");
  }

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n✓ All ${FRAME_COUNT} frames present and consistent.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
