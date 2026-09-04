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
| `npm run seed:generate` | Rebuilds `supabase/seed.sql` from `data/`         |
| `npm run db:test`     | Applies the migrations to a real Postgres and tests RLS |

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
  layout.tsx              Root: metadata, fonts, JSON-LD — no navbar (it must
                          never appear over /admin)
  (public)/               Route group: everything the public sees
    layout.tsx            Renders the Navbar (fixed-position, public only)
    page.tsx              Server component; only the sequence is client-side
    order/                Public pickup-order page
    (legal)/privacy|terms Factual legal pages
  admin/                  Dashboard (own layout, own CSS, no public chrome)
  globals.css             Design tokens + reset

components/
  CinematicSequence.tsx   ← all animation logic lives here
  Navbar.tsx  StorySection.tsx  Experiences.tsx
  Menu.tsx  MenuCategory.tsx  MenuItem.tsx
  ReservationCTA.tsx  Footer.tsx  BrandMark.tsx  Button.tsx
  PickupOrderForm.tsx  HeroVideo.tsx
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
  content.ts              Content loaders: Supabase with data/ fallback
  upload.ts               Storage uploads (resumable above 6 MB)
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

## Architecture

The site runs in two modes, and both are fully supported:

```
                    NEXT_PUBLIC_SUPABASE_URL set?
                        /                    \
                      no                     yes
                       |                       |
            content from data/*.ts    content from Supabase
            /admin -> "not connected"  /admin -> dashboard
```

**The fallback is the point, not a safety net.** The restaurant's menu, phone
number, hours and address are already correct and committed in `data/`. A
missing environment variable, a paused Supabase project or a network blip must
never take that off the internet. Every loader in `lib/content.ts` falls back
per-field, so the worst case is that a recent edit is not shown yet — never a
blank menu.

### Rendering

The homepage stays **statically rendered** with a 60-second revalidate. Public
content is read through a cookie-less client (`lib/supabase/public.ts`), so
looking up the menu does not depend on who is asking and does not opt the page
out of the CDN. Only `/admin` is dynamic.

That is why adding a database cost the public bundle about 1 kB: Supabase only
ships in the admin chunks.

### Authorization

| Who | May do |
| --- | --- |
| Anyone | Read published content; create a reservation request or a pickup order |
| A signed-up user who is **not** allow-listed | Nothing more than the above |
| A row in `admin_users` | Everything |

Being authenticated is not authorization. Supabase Auth will happily
authenticate any account, so permission is a row in `admin_users`, checked by
`is_admin()` inside every write policy and enforced by Postgres rather than by
the UI.

There is **no service-role key** in this application. The dashboard runs under
the signed-in admin's own session, so there is one authorization path and
`npm run db:test` covers it.

Full setup instructions: [Setting up the admin panel](#setting-up-the-admin-panel).

### Hardening (production pass)

- **Admin sign-in is two-step.** Password, then a TOTP code; a password-only
  session sees nothing (see step 5 above). Errors stay deliberately vague —
  nothing reveals whether an email or code was the wrong half.
- **Open redirects are closed.** The login `?next=` parameter accepts only
  internal `/admin` paths; anything else (`https://…`, `//`, `\`, control
  characters…) falls back to `/admin/dashboard`.
- **Security headers** (see `next.config.ts`): a strict CSP built from the
  sources the site actually uses — no `unsafe-eval` — plus `nosniff`,
  `strict-origin-when-cross-origin`, `SAMEORIGIN` framing, a Permissions-Policy
  locking out camera/mic/location/payment, COOP and HSTS. If a future feature
  adds a source, add it to the list in `next.config.ts`; to trial a change,
  duplicate the CSP header as `Content-Security-Policy-Report-Only`.
- **The public forms post through `/api/reservations` and `/api/orders`**,
  which verify the Turnstile token server-side before inserting — still under
  the anon key, so every RLS policy, column grant and the order repricing
  trigger apply exactly as before.
- **Structured data is serialized safely** (`lib/jsonld.ts`): `<`, `>` and `&`
  are escaped as Unicode escapes, so no value can ever break out of the
  `<script type="application/ld+json">` element.
- **All reservation and pickup times are interpreted in Africa/Kigali**
  (`lib/time.ts`) — on the public forms, in the API routes and in the admin
  lists — regardless of the guest's or the owner's device timezone. Stored
  values are UTC instants; existing rows are untouched.

### The hero

The 29-frame sequence has **not** been deleted. It is the fallback:

```
active hero_media row with a video  ->  <HeroVideo>
otherwise                           ->  CinematicSequence
```

So uploading a video is reversible from the dashboard, a failed upload leaves
a working hero rather than a black rectangle, and the site still works with no
Supabase at all. Uploads over 6 MB use Supabase's resumable protocol, because
one dropped packet at 95% of an 80 MB file should not restart the upload.

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

**Environment variables.** `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`). Both are safe to expose —
the anon key is protected by RLS. Without them the site still deploys and runs;
only `/admin` is unavailable.

**Anti-bot (Cloudflare Turnstile).** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and
`TURNSTILE_SECRET_KEY` protect the public reservation and order forms. Create
a *Managed* widget at dash.cloudflare.com → Turnstile to get the pair. The
site key is public; the secret is server-only — never give it a
`NEXT_PUBLIC_` prefix. Add both in Vercel (Production and Preview) and
**redeploy**: the widget only renders if the site key existed at build time.
If the secret is missing in production the forms fail loudly with a clear
message instead of silently losing their protection — that is deliberate.
Locally you can leave both unset; the check is skipped in development only.

**Domain.** `metadataBase` and the structured data both read from
`restaurant.website` in `data/restaurant.ts`. If you serve this on a domain
other than `https://www.travelingrootsltdrwanda.com/`, update that value so
canonical URLs and JSON-LD stay correct.

---

## Setting up the admin panel

End to end: a Supabase project, six SQL files, one allow-listed account, two
environment variables. About ten minutes. After this you can edit the menu,
change the hero video and manage reservation requests from `/admin` — no code,
no redeploy.

### What the panel manages

| Dashboard tab | What you can do |
| --- | --- |
The dashboard navigation is a grouped sidebar on desktop and a hamburger drawer on phones: **Dashboard** (Overview), **Website** (Hero video, Menu, Experiences, Gallery, Offers, Testimonials), **Business** (Business info), **Customers** (Reservations, Pickup orders), **System** (Sign out).

| Page | What you can do |
| --- | --- |
| **Overview** | Counts (menu items, categories, gallery photos, experiences, active offers, new/all reservations, new/all pickup orders), recent reservations and orders, quick actions |
| **Hero video** | Upload a video that replaces the 29-frame scroll sequence; deactivate it to go back to the frames |
| **Menu** | Edit any item's name, price (RWF), description and variants; publish or hide items and whole categories |
| **Experiences** | Add, edit, photograph, reorder, hide or delete the public experiences cards (duration and price optional) |
| **Gallery** | Upload photos (JPG/PNG/WebP/AVIF, up to 10 MB) with captions, alt text and a category (Food / Restaurant / Garden / Events / Atmosphere), reorder them, hide them or delete them. Mark up to 8 photos **Featured** — those drift through the homepage showcase; everything published appears on the **`/gallery`** page |
| **Offers / Testimonials** | Manage specials and guest quotes (add, edit, activate/publish, delete) |
| **Business info** | Name, phone, WhatsApp, email, address, directions URL, opening hours, social links — and the floating WhatsApp button (on/off + pre-filled message) — consumed live by the public site |
| **Pickup orders** | Orders submitted from the public **`/order`** page; call or WhatsApp the guest to confirm, then move the order through `new → accepted → preparing → ready → completed / cancelled` |
| **Reservations** | Read every reservation request (form or phone); filter by status and move them through `new → contacted → confirmed / declined / archived` |

Everything the database stores is also editable directly in Supabase's table
editor (business info, experiences, offers, testimonials, social links) —
those just don't have dedicated dashboard UI yet.

**Reservations & the public site.** The reserve section now offers both the
fast path (call / WhatsApp) and, when Supabase is configured, a request form
(name, phone, date, time, guests) that writes straight into
`reservation_requests` — subject to the same RLS as everything else. The
public site also has a gallery section (admin-managed photos, lightbox with
keyboard and swipe), a location section with the restaurant's own Google Maps
embed and directions/call/WhatsApp buttons, DB-driven experiences with the
verified set as fallback, and a fuller footer.

**How online ordering works.** The public `/order` page (linked from the nav
and the reservation section) lists the live menu with quantity steppers; the
guest leaves a name, phone number and optional pickup time. Nothing is charged
online — the dashboard shows the order with tappable call and WhatsApp links,
and you confirm with the guest directly. The **total is computed by the
database from the live menu when the order is placed**, never by the browser,
and each order snapshots its prices so later menu edits never rewrite old
orders. Unpublished categories, unavailable items and made-up prices are
refused by the database, not by the form.

### 1. Create the Supabase project

Go to [database.new](https://database.new) → **New project**. Pick the region
closest to Rwanda (`eu-central-1` is currently the nearest low-latency
option). Save the database password somewhere safe — you will not need it for
this setup, but you will for disaster recovery.

### 2. Run the SQL

In the Supabase dashboard open **SQL Editor → New query**, paste the entire
contents of each file below, press **Run**, and repeat — **in this order**:

| Order | File | What it does |
| --- | --- | --- |
| 1 | `supabase/migrations/0001_schema.sql` | Tables, constraints, triggers |
| 2 | `supabase/migrations/0002_rls.sql` | Row Level Security — who may read/write what |
| 3 | `supabase/migrations/0003_storage.sql` | The `hero-videos` storage bucket and its policies |
| 4 | `supabase/migrations/0004_pickup_orders.sql` | The pickup-order table, its pricing trigger and policies |
| 5 | `supabase/migrations/0005_whatsapp_floating.sql` | Floating WhatsApp button settings (on/off, pre-filled message) |
| 6 | `supabase/migrations/0006_gallery_featured.sql` | Gallery curation: `featured` + `category` columns on `gallery_items` (homepage showcase) — no policy changes |
| 6 | `supabase/seed.sql` | The real menu, business info and social links |

`seed.sql` is idempotent — running it twice does not duplicate anything.

### 3. Create your owner account

**Authentication → Users → Add user.** Use a real email address you control
and a strong password, and tick **Auto Confirm User**.

Then allow-list that account — **this is the step that actually grants
access.** Creating the auth user alone changes nothing; a signed-in stranger
is still a stranger:

```sql
insert into public.admin_users (id, email, role)
select id, email, 'owner' from auth.users where email = 'you@example.com';
```

Run that in the SQL Editor, with your exact email. Roles are `'owner'` or
`'editor'`. To add a second admin later, create their auth user the same way
and insert a second row.

Finally, **turn off public sign-ups**: **Authentication → Providers → Email →
disable "Enable sign ups"**. The allow-list already blocks strangers from
changing anything — this just stops them creating accounts at all.

### 4. Point the site at the project

In Supabase: **Settings → API**. Copy **Project URL** and the **anon public**
key.

**Locally:** copy `.env.example` to `.env.local`, fill in both values, restart
the dev server.

**On Vercel:** **Project → Settings → Environment Variables**, add both
(Production and Preview), then **redeploy** — a running deployment does not
pick up new variables. Both values are safe to expose: the anon key is
protected by RLS, and there is deliberately no service-role key in this app.

Until this step is done, the site works normally from the committed content
in `data/` and `/admin` shows a "not connected" page. After it is done, the
homepage reads the database (revalidating every 60 seconds) and `/admin`
becomes a login screen.

### 5. Sign in and use it

Visit **`/admin`** → you land on the login page → sign in with the owner
email and password → the dashboard.

**First sign-in asks to pair an authenticator app.** The dashboard requires
two-step sign-in (password + a six-digit code from Google Authenticator, Authy,
1Password, etc.): once at the first sign-in you scan a QR code, and every
sign-in after that asks for a fresh code. A password alone — even a correct
one — opens nothing: the session must be at AAL2 (both steps passed) before
any admin page will render.

**Lost the device?** Remove the factor in Supabase
(**Authentication → Users → your admin → MFA factors**), then sign in again —
you'll be offered a fresh QR code to pair a new device. Don't leave the
account factor-less longer than the pairing takes.

Day-to-day notes:

- **Edits appear on the public site within about a minute** (the homepage
  revalidates every 60 s), not instantly. Wait, then hard-refresh.
- Hiding a category hides every item in it; hidden rows show "(hidden)" in
  the editor.
- The hero upload switches the site to the video; **deactivate** it in the
  Hero tab to return to the frame sequence. Nothing is deleted either way.
- Sign out from the dashboard sidebar.

### 6. Verify the security model (optional, recommended)

```bash
npm run db:test
```

66 checks against an in-process Postgres using these exact migration files:
an anonymous visitor cannot read the reservation list or the order list,
cannot self-approve a booking, cannot accept their own order, cannot set
their own price and cannot see unpublished content; a signed-up non-admin
can change nothing. Run it after any change to the SQL.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `/admin` says "not connected" | Env vars missing/typo'd, or Vercel was not redeployed after adding them |
| Login works, then bounces back or "not authorized" | The account is not allow-listed, or the email in `admin_users` doesn't match exactly (case-sensitive) — run the step 3 insert |
| Menu edit not visible on the site | Wait out the 60-second revalidate and hard-refresh; confirm the item and its category are published |
| Site fine but showing old committed data | Supabase unreachable or the project paused — the fallback to `data/` is by design |
| Video upload fails | Large files use resumable upload; check the file is a real video format and retry — a failed upload never breaks the current hero |

More detail on the authorization model: [`supabase/README.md`](supabase/README.md).
