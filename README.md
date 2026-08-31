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
| `npm run frames:check`| Validates the 29 frames: presence, size, weight     |

---

## ⚠️ Three things still need your real assets

Everything is wired up and typed. Each one is a drop-in replacement — no
component changes required.

### 1. The 29 frames — `public/sequence/`

The real sequence has **not** been supplied yet. The repo currently ships
**temporary placeholder frames**: an abstract geometric composition that
assembles from frame 01 → 29, with a tick scale so you can see which frame is
on screen. They exist purely so the scroll mechanic could be built and tuned.
They deliberately invent nothing about the real animation.

**To install the real frames:**

```bash
rm public/sequence/*.webp
# copy your files in, named exactly:
#   frame-01.webp … frame-29.webp
npm run frames:check
```

`frames:check` verifies all 29 exist, share one aspect ratio, and stay under a
180 KB-per-frame mobile budget. Nothing else needs to change — the frame array
is generated programmatically in `lib/sequence.ts`.

Once the real frames are in, delete `scripts/generate-placeholder-frames.mjs`.

**Recommended encoding** (roughly 60–120 KB per frame at 1600px wide):

```bash
cwebp -q 80 -m 6 -resize 1600 0 frame-01.png -o frame-01.webp
```

### 2. The logo — `public/images/logo.*`

The official logo is **not** recreated or approximated anywhere in this repo.
Until you supply it, every brand lock-up falls back to a clean typographic
wordmark.

To use the real one, save it and set the path in `data/site.ts`:

```ts
export const brand = {
  logo: { src: "/images/logo.png", width: 512, height: 505 },
  ...
};
```

It then appears in the hero, navbar and footer automatically.

### 3. The menu — `data/menu.ts`

**No dishes, prices or ingredients have been invented.** The file currently
holds category shells with clearly-labelled placeholder rows and `price: null`.
While `MENU_STATUS.isPlaceholder` is `true`, the UI hides all prices and shows
a visible notice, so nothing fake is ever presented to a visitor as real.

To go live:

1. Replace the `menu` array with the real data.
2. Set `MENU_STATUS.isPlaceholder = false`.
3. Drop dish photos into `public/images/food/` and reference them as
   `/images/food/<file>.webp`. Items without a photo fall back to a
   typographic tile — never a stock image.
4. `npm run typecheck` will catch any malformed row.

```ts
{
  id: "beef-burger",
  name: "Beef Burger",
  description: "…",
  price: "RWF 8,500",
  image: "/images/food/beef-burger.webp",
  dietary: ["Contains nuts"],
  signature: true,
  availability: "Thursday – Saturday",
}
```

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

**Instagram is not verified.** No official account could be confirmed, so the
"Follow on Instagram" action is **omitted entirely** rather than pointing at a
guessed handle. Add the real one to `restaurant.socials` in
`data/restaurant.ts` (there's a commented-out stub) and the action appears in
the reservation section and footer automatically.

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
  menu.ts                 Menu data + types
  site.ts                 Nav, copy, caption timeline, brand config

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
  `tabIndex`, `aria-controls`.
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
