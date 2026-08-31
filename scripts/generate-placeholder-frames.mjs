/**
 * TEMPORARY placeholder frame generator.
 *
 * The real 29 frames have not been supplied yet. This writes 29 deliberately
 * abstract, obviously-synthetic frames so the scroll mechanic can be built,
 * tuned and verified end to end.
 *
 * It invents nothing about the real sequence: no food, no props, no colours
 * borrowed from the reference. Just a geometric composition that visibly
 * assembles from frame 01 to frame 29, plus a progress scale so you can see
 * at a glance which frame is on screen.
 *
 * DELETE THIS FILE (and public/sequence/*.webp) once the real frames land:
 *   node scripts/generate-placeholder-frames.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const FRAME_COUNT = 29;
// Matches the real source sequence: 720x1280, 9:16 portrait. Keeping the
// placeholders at the true aspect ratio is the whole point -- a landscape
// stand-in would have hidden how much of a desktop viewport a tall frame
// leaves empty.
const WIDTH = 720;
const HEIGHT = 1280;
/** Geometry is derived from the short edge so any aspect ratio composes. */
const BASE = Math.min(WIDTH, HEIGHT);
const OUT_DIR = path.join(process.cwd(), "public", "sequence");

const CREAM = "#f6f1e7";
const SAND = "#e0d4bf";
const GOLD = "#c8a45c";
const MOSS = "#6d8f76";

const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function buildSvg(index) {
  const t = index / (FRAME_COUNT - 1);
  const e = easeInOut(t);

  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 - BASE * 0.03;

  // Central form grows and settles.
  const plateR = lerp(BASE * 0.055, BASE * 0.35, e);
  const plateOpacity = lerp(0.12, 0.4, e);

  // Eight satellites converge inward and rotate into place.
  const satellites = [];
  const COUNT = 8;
  const orbit = lerp(BASE * 0.78, BASE * 0.45, e);
  const spin = lerp(-75, 0, e);

  for (let i = 0; i < COUNT; i += 1) {
    const angle = ((i / COUNT) * 360 + spin) * (Math.PI / 180);
    const x = cx + Math.cos(angle) * orbit;
    const y = cy + Math.sin(angle) * orbit * 0.62;
    const r = lerp(BASE * 0.014, BASE * 0.042, e) * (0.7 + 0.3 * Math.sin(i * 1.7));
    const o = Math.min(1, lerp(0.15, 0.85, e));
    const fill = i % 3 === 0 ? GOLD : i % 3 === 1 ? MOSS : SAND;
    satellites.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.abs(r).toFixed(1)}" fill="${fill}" opacity="${o.toFixed(3)}"/>`,
    );
  }

  // Concentric rings that tighten as the composition resolves.
  const rings = [0, 1, 2]
    .map((i) => {
      const r = plateR + lerp(BASE * 0.25, BASE * 0.064, e) * (i + 1);
      const o = lerp(0.06, 0.2, e) / (i * 0.5 + 1);
      return `<ellipse cx="${cx}" cy="${cy}" rx="${r.toFixed(1)}" ry="${(r * 0.62).toFixed(1)}" fill="none" stroke="${CREAM}" stroke-width="1.25" opacity="${o.toFixed(3)}"/>`;
    })
    .join("");

  // A 29-step scale along the bottom: the active tick marks the frame.
  const scaleY = HEIGHT - BASE * 0.13;
  const scaleW = WIDTH * 0.72;
  const scaleX = cx - scaleW / 2;
  const ticks = Array.from({ length: FRAME_COUNT }, (_, i) => {
    const x = scaleX + (scaleW / (FRAME_COUNT - 1)) * i;
    const active = i === index;
    const h = active ? 26 : 10;
    const color = active ? GOLD : CREAM;
    const o = active ? 1 : 0.28;
    return `<rect x="${x.toFixed(1)}" y="${(scaleY - h / 2).toFixed(1)}" width="${active ? 2.5 : 1}" height="${h}" fill="${color}" opacity="${o}"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <g>
    ${rings}
    <ellipse cx="${cx}" cy="${cy}" rx="${plateR.toFixed(1)}" ry="${(plateR * 0.62).toFixed(1)}" fill="${CREAM}" opacity="${plateOpacity.toFixed(3)}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${plateR.toFixed(1)}" ry="${(plateR * 0.62).toFixed(1)}" fill="none" stroke="${CREAM}" stroke-width="1.5" opacity="0.55"/>
    ${satellites.join("\n    ")}
    ${ticks}
  </g>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const name = `frame-${String(i + 1).padStart(2, "0")}.webp`;
    const svg = Buffer.from(buildSvg(i));
    const webp = await sharp(svg)
      .webp({ quality: 82, alphaQuality: 90, effort: 5 })
      .toBuffer();
    await writeFile(path.join(OUT_DIR, name), webp);
  }

  console.log(`Wrote ${FRAME_COUNT} placeholder frames to public/sequence/`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
