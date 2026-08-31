/**
 * Verifies the frame sequence before you ship.
 *
 *   npm run frames:check
 *
 * Checks that all 29 frames exist, are non-empty, share one aspect ratio, and
 * flags any that are heavy enough to hurt a mobile connection.
 */

import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const FRAME_COUNT = 29;
const DIR = path.join(process.cwd(), "public", "sequence");
/** Above this, a frame is worth re-compressing for weak mobile networks. */
const WARN_KB = 180;

async function main() {
  let files;
  try {
    files = await readdir(DIR);
  } catch {
    console.error(`✗ Missing directory: public/sequence/`);
    process.exitCode = 1;
    return;
  }

  const problems = [];
  const ratios = [];
  let totalBytes = 0;

  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const name = `frame-${String(i + 1).padStart(2, "0")}.webp`;
    const file = path.join(DIR, name);

    try {
      const info = await stat(file);
      if (info.size === 0) {
        problems.push(`${name} is empty`);
        continue;
      }
      totalBytes += info.size;

      const meta = await sharp(file).metadata();
      if (!meta.width || !meta.height) {
        problems.push(`${name} has no readable dimensions`);
        continue;
      }
      ratios.push({ name, ratio: meta.width / meta.height, w: meta.width, h: meta.height });

      const kb = info.size / 1024;
      if (kb > WARN_KB) {
        problems.push(`${name} is ${kb.toFixed(0)} KB (over the ${WARN_KB} KB mobile budget)`);
      }
    } catch {
      problems.push(`${name} is missing`);
    }
  }

  const extras = files.filter(
    (f) => f.endsWith(".webp") && !/^frame-\d{2}\.webp$/.test(f),
  );
  for (const extra of extras) problems.push(`Unexpected file: ${extra}`);

  const numbered = files.filter((f) => /^frame-\d{2}\.webp$/.test(f));
  if (numbered.length > FRAME_COUNT) {
    problems.push(
      `Found ${numbered.length} frames but the sequence is exactly ${FRAME_COUNT}`,
    );
  }

  const first = ratios[0];
  if (first) {
    const odd = ratios.filter((r) => Math.abs(r.ratio - first.ratio) > 0.01);
    for (const r of odd) {
      problems.push(
        `${r.name} is ${r.w}×${r.h}, which doesn't match ${first.w}×${first.h}`,
      );
    }
    console.log(`Frame size: ${first.w}×${first.h} (${first.ratio.toFixed(3)}:1)`);
  }

  console.log(
    `Sequence weight: ${(totalBytes / 1024 / 1024).toFixed(2)} MB across ${ratios.length} frames ` +
      `(avg ${(totalBytes / 1024 / Math.max(ratios.length, 1)).toFixed(0)} KB)`,
  );

  if (problems.length > 0) {
    console.error(`\n${problems.length} issue(s):`);
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
