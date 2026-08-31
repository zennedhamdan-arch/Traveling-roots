# Traveling Roots

A premium website concept for **Traveling Roots**, a garden restaurant in
Musanze, Rwanda.

The centrepiece is a 29-frame cinematic image sequence scrubbed directly by
the scrollbar: scroll forward and the sequence advances, stop and it stops,
scroll back and it reverses from exactly where it was. It is rendered to a
`<canvas>` and driven by GSAP ScrollTrigger — no video element, no WebGL, no
3D engine.

```
SCROLL → DISCOVER → SEE THE FOOD → EXPLORE → VIEW MENU → RESERVE
```

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

| Script                | What it does                                       |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Dev server                                          |
| `npm run build`       | Production build                                    |
| `npm start`           | Serve the production build                          |
| `npm run typecheck`   | `tsc --noEmit`, strict                              |
| `npm run lint`        | ESLint (flat config)                                |
| `npm run frames:check`| Validates the 29 frames: presence, size, weight, continuity |
| `npm run frames:ingest <dir>` | Converts raw extracted frames into `frame-01…29.webp` |
| `npm run frames:measure` | Re-reads the frames' real dimensions            |
| `npm run logo:detect` | Re-scans `public/images/` for the logo              |

---

## Asset status

| Asset | Status |
| --- | --- |
| Menu | ✅ Real, transcribed from the official Canva menu |
| Instagram | ✅ `traveling_roots_rwanda` |
| Logo | ✅ `public/images/logo.png` (560×554, transparent PNG) |
| Frame sequence | ⚠️ **Placeholder stock imagery** — see below |

### 1. The 29 frames — `public/sequence/`

Built from `raw-frames/` (27 source JPEGs) with:

```bash
npm run frames:ingest -- raw-frames --scene 1 --trim 0 --width 720 --quality 82
```

The source is a montage of **three unrelated scenes** — a layered sandwich on
black, tacos on red, a baguette on orange — plus a cross-dissolve frame and a
duplicate. Only **scene 1 (the sandwich on black)** is used, because a scrubbed
sequence has to read as one continuous shot, and because its black backdrop
merges into the dark stage instead of sitting in the page as a coloured
rectangle. Eight unique source frames are interpolated up to 29.

> ⚠️ **These are placeholders.** The imagery is Pinterest-sourced stock food
> that Traveling Roots does not serve, so it is not a licensable or honest
> final hero. See **[docs/frame-shoot-guide.md](docs/frame-shoot-guide.md)**
> for a hand-to-the-camera spec for shooting the real sequence — it is two
> commands to swap in.

**To install the real frames**, use the ingest script — it handles the messy
filenames a frame extractor produces:

```bash
npm run frames:ingest -- /path/to/extracted-frames
npm run frames:check
```

`frames:ingest` does the four things that go wrong with a raw extraction:

| Problem | What the script does |
| --- | --- |
| A plain sort puts `Serial10` before `Serial2` | Sorts **numerically** |
| A fade-through-black becomes a dead frame when scrubbed | Drops frames below a luma threshold |
| A montage hard-cuts mid-scroll | Detects scenes by colour distance and uses **one** |
| Cross-dissolve frames look like double exposures | Trims them from the scene edges |

It then resamples to exactly 29, normalises size, and encodes WebP. Frames are
never cropped or stretched — an odd-sized frame is padded and named in a
warning.

Useful flags:

```bash
npm run frames:ingest -- raw-frames --dry-run       # analyse, write nothing
npm run frames:ingest -- raw-frames --scene 2       # pick a specific scene
npm run frames:ingest -- raw-frames --scene all     # keep the montage
npm run frames:ingest -- raw-frames --trim 0        # keep boundary frames
```

Start with `--dry-run`: it prints the detected scenes and exactly which source
frame lands in each output slot.

**If there are fewer than 29 usable frames**, the script generates the missing
in-betweens by blending neighbours rather than repeating them — 7 frames
repeated four times each is a visible staircase when scrubbed. Interpolation is
a cross-dissolve, not true motion, so more source frames is always better. Pass
`--no-interpolate` to opt out.

`frames:check` then verifies all 29 exist, share one aspect ratio, and stay
under a 180 KB-per-frame mobile budget — and runs a **continuity pass**:

```
Frame size: 720×1280  (0.563:1, portrait)
Sequence weight: 0.64 MB across 29 frames (avg 23 KB)

Continuity: ✓ no black frames, no hard cuts — reads as one shot.
```

The continuity pass exists because a scroll-scrubbed sequence is not a video.
The user controls the playhead, so a black frame or a cut to a different scene
in the middle reads as a bug rather than as an edit. If either is present the
check names the exact frames.

Nothing else needs to change — the frame array is generated programmatically
in `lib/sequence.ts`.

Once the real frames are in, delete `scripts/generate-placeholder-frames.mjs`.

**Recommended encoding** (roughly 60–120 KB per frame):

```bash
cwebp -q 80 -m 6 -resize 1080 0 frame-01.png -o frame-01.webp
```

#### The stage matches the frames

`measure-frames` also samples the average colour of the frame **corners** and
writes it to `data/frames.generated.ts`. The stage behind the canvas is painted
that colour, so the letterboxing that `contain` produces is invisible and the
food appears to float in the page rather than inside a rectangle. Swap in
frames shot on white and the stage follows.

#### The layout follows the frames

`scripts/measure-frames.mjs` runs on every `dev` / `build`, reads
`frame-01.webp` and writes `data/frames.generated.ts`. The section renders
`data-orientation="portrait"` or `"landscape"` **on the server**, so the right
composition is in place on first paint instead of jumping after hydration.

That matters for tall frames. A 9:16 frame contained inside a 16:9 desktop
viewport only fills about a quarter of the width — centring it strands the
food in the middle of two dead margins. So for portrait frames above 1024px
the frame is pushed right (`SEQUENCE_TUNING.layout.portrait.desktop.focusX`)
and the copy takes the left column, as an editorial split. Mobile stays
centred and near-full-bleed. Swap in landscape frames and the centred
composition returns on its own — no code change.

### 2. The logo — `public/images/logo.png` ✅ installed

The official logo is **not** recreated or approximated anywhere in this repo —
the supplied PNG is used as-is. Because it already carries its own
transparency, `detect-logo` correctly applies **no** circular mask, so nothing
is cropped.

Replacing it is a pure drop-in — no code change:

```bash
cp new-logo.png public/images/logo.png
npm run build          # or npm run dev
```

`scripts/detect-logo.mjs` runs automatically on `predev` / `prebuild`, finds
the file (`.svg`, `.png`, `.webp` or `.jpg`), reads its real dimensions and
writes `data/logo.generated.ts`. It then appears in the hero, navbar and
footer.

If the file has no transparency, the script detects that and applies a
circular mask — but only to near-square artwork, so a wide wordmark is never
cropped. That hides the background corners, which would otherwise show as a
white box against the dark hero.

---

## The menu

**Done.** `data/menu.ts` holds the full menu, transcribed verbatim from the
official 4-page Canva menu: **11 categories, ~100 items**, every price, every
description and both dietary marks. Nothing is invented.

- Prices: the printed menu writes `6K` and the coffee list writes the same
  amounts as `2000rwf`. Both are Rwandan francs, so `6K` renders as
  `6,000 RWF`. No amount was converted, rounded or altered.
- Obvious typography slips in the source (`CABAGE`, `BEFF`, `PINAPPLE`,
  `TALAPIA`) are corrected. House names (`Winnaz Chicken`, `Orky Porky`,
  `Hard Tac`) are left exactly as printed.
- Portion pricing (pork ribs 400g/500g/1kg, crêpe fillings, wine by the
  glass/bottle, juices) uses the `variants` field.
- Drinks is one tab holding nine sub-sections, so the tab strip stays usable.

**⚠ Please have the kitchen confirm the dietary marks once.** They are
transcribed from the badges on the artwork and each one is consistent with the
dish's own listed ingredients, but this is safety-relevant information.

### Adding dish photography

Drop files into `public/images/food/` and add `image: "/images/food/x.webp"`
to an item. The category switches from the editorial price list to a photo
card grid **automatically** — no layout flag to set. Items without a photo
fall back to a typographic tile, never a stock image.

---

## Verified business information

All business data lives in **`data/restaurant.ts`**, one source of truth, with
a provenance comment on every field. Nothing is hard-coded in components.

| Field    | Value                                             | Source            |
| -------- | ------------------------------------------------- | ----------------- |
| Phone    | +250 794 317 286                                  | official site     |
| WhatsApp | +250 736 652 490                                  | official site     |
| Hours    | Monday – Sunday, 12:00 – 22:00                    | official site     |
| Address  | NM 227 St, Ruhengeri / Musanze, Rwanda            | Petit Futé        |
| Email    | TravelingRootsRwanda@gmail.com                    | Facebook page     |
| Facebook | Traveling Roots Rwanda                            | Facebook          |
| Instagram| @traveling_roots_rwanda                           | the restaurant    |

The Canva menu link is kept in the data file for reference but is **never**
used as the primary menu experience.

---

## Project structure

```
app/
  layout.tsx              Metadata, fonts, nav, JSON-LD
  page.tsx                Server component; only the sequence is client-side
  globals.css             Design tokens + reset
  (legal)/privacy|terms   Factual legal pages

components/
  CinematicSequence.tsx   ← all animation logic lives here
  Navbar.tsx  StorySection.tsx  Experiences.tsx
  Menu.tsx  MenuCategory.tsx  MenuItem.tsx
  ReservationCTA.tsx  Footer.tsx  BrandMark.tsx  Button.tsx
  StructuredData.tsx

data/
  restaurant.ts           Verified business data (single source of truth)
  menu.ts                 The full real menu + types
  site.ts                 Nav, copy, caption timeline, brand config
  logo.generated.ts       Auto-generated by scripts/detect-logo.mjs

lib/
  sequence.ts             Frame URLs + every tuning constant
  sequenceLoader.ts       Preloading, progress, failure fallback
  actions.ts              CTAs derived from verified contact data
  useMediaQuery.ts        Motion preference, SSR-safe

public/sequence/          frame-01.webp … frame-29.webp
```

---

## How the sequence works

`lib/sequence.ts` holds every tunable number — no magic numbers scattered
around the codebase.

**One** ScrollTrigger drives everything: the frame playhead, the hero exit and
all five captions. Fewer triggers means no ordering races, one set of
measurements, and one thing to tear down.

```ts
const master = gsap.timeline({
  scrollTrigger: {
    trigger: section,
    start: "top top",
    end: () => `+=${vh * scrollDistanceVh / 100}`,  // recomputed on refresh
    pin: stage,
    scrub,                    // 0.5 desktop · 0.25 mobile
    invalidateOnRefresh: true,
  },
});
master.to(playhead, { frame: 28, duration: 1, ease: "none", snap: { frame: 1 } }, 0);
```

The timeline is exactly **1 unit long**, so every caption position parameter
reads directly as scroll progress (`0.45` = 45%).

`progress → frame` is `Math.round(progress * 28)`, verified to step by at most
one frame in either direction — so the sequence never visibly jumps, and
scrolling backwards scrubs 29 → 1 from wherever it currently sits. It never
restarts and never autoplays. **The scrollbar is the timeline.**

### Tuning

| Constant             | Mobile | Desktop | Why                                              |
| -------------------- | ------ | ------- | ------------------------------------------------ |
| `scrollDistanceVh`   | 280    | 380     | ~13vh per frame — physical, without dragging on   |
| `scrub`              | 0.25   | 0.5     | Long scrub feels laggy against touch momentum     |
| `maxDpr`             | 2      | 2       | 3× DPR costs 2.25× fill rate for no visible gain  |
| `minFramesToStart`   | 6      | 6       | Head start so the first flick never hits a gap    |

`safeArea` shrinks the *destination box* rather than cropping, so the nav and
captions never sit on top of the subject and the frame is never cut.

### Presentation

`"contain"`, always — the frame is centred at its true aspect ratio and can
never be stretched or cropped. Switch via `FRAME_FIT` in `lib/sequence.ts` if
the real frames prove otherwise.

---

## Performance

- **161 kB First Load JS**, static-prerendered.
- Only `CinematicSequence`, `Navbar` and `Menu` ship client JS. The story,
  experiences, reservation and footer are server-rendered — the restaurant's
  content and contact details are in the initial HTML, and readable even if
  the animation never loads.
- Frames are preloaded (only 29) with frame 1 at `fetchPriority="high"` and the
  rest at `low`, decoded off the main thread via `img.decode()`.
- `Cache-Control: immutable` on `/sequence/*` — a return visit re-downloads
  nothing.
- Painting is coalesced to **one `requestAnimationFrame` per tick**, and the
  scrub never triggers a React re-render (frame state lives in refs).
- Fonts are self-hosted from npm — no third-party font requests.
- No Three.js, no scroll-hijacking library, no particles, no glassmorphism.

**A single mobile sequence is used.** Frames average 29 KB, so a separate
`/sequence/mobile/` build would add complexity for no measurable gain. Re-test
once the real frames land: if they exceed ~120 KB each, add the mobile variant
then, and only then.

---

## Reduced motion

With `prefers-reduced-motion: reduce`, the preference is resolved in a layout
effect **before first paint**, so there's no flash of the animated treatment.
Then:

- no pin, no scrub, no scroll-driven frames;
- a single still frame renders as a plain `<img>` — **28 fewer image requests**;
- all five captions become a readable static list;
- navigation, menu, reservation and every CTA work exactly as normal.

---

## Accessibility

- Semantic landmarks, one `<h1>`, ordered `h2`/`h3`/`h4`.
- Skip link; visible focus rings on every interactive element.
- Menu categories are a real ARIA tablist: arrow keys, Home/End, roving
  `tabIndex`, `aria-controls`. Heading levels stay correctly nested when a
  category has sub-sections.
- Captions use GSAP `autoAlpha`, which toggles `visibility` — hidden captions
  leave the accessibility tree automatically.
- The loader is a labelled `progressbar`.
- Touch targets are ≥ 48 px.
- **The animation is never required to understand the restaurant.**

---

## Resilience

- If a frame fails, the canvas holds the **last successfully loaded frame**
  instead of tearing a hole in the page (`SequenceLoader.frameAt`).
- If *every* frame fails, a short status message appears and the rest of the
  page is untouched.
- `gsap.context()` scopes every tween and trigger; `ctx.revert()` on unmount is
  a complete, leak-free teardown, and all listeners and in-flight rAFs are
  cancelled.

---

## Tech

Next.js 15 (App Router) · React 19 · TypeScript (strict) · GSAP 3 +
ScrollTrigger · HTML Canvas · CSS Modules. No UI framework, no CSS framework,
no 3D engine.

---

## Deploying to Vercel

No configuration is needed beyond the defaults — but a few things are worth
knowing.

**Build command** is the default `npm run build`. `prebuild` runs
`detect-logo` and `measure-frames` first, both of which need `sharp`. Vercel
installs `devDependencies` during the build, so this works out of the box. If
either script ever fails, the build still succeeds: `data/logo.generated.ts`
and `data/frames.generated.ts` are committed, so the last known-good values are
used.

**Node** is pinned via `engines.node` (`>=20.9.0`).

**Caching.** Vercel serves `public/` with `cache-control: public, max-age=0,
must-revalidate` by default, which would re-validate all 29 frames on every
visit. `next.config.ts` overrides `/sequence/:path*` with
`max-age=31536000, immutable`. If you replace the frames, the filenames stay
the same, so **purge the deployment cache** (or redeploy) to avoid serving the
old sequence for a year.

**`.vercelignore`** keeps `raw-frames/` and `docs/` out of the upload — the
raw JPEGs are build input, not served assets.

**Domain.** `metadataBase` and the structured data both read from
`restaurant.website` in `data/restaurant.ts`. If you serve this on a domain
other than `https://www.travelingrootsltdrwanda.com/`, update that value so
canonical URLs and JSON-LD stay correct.
