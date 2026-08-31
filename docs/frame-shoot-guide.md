# Shooting the 29-frame hero sequence

The scrubbed sequence is the first thing a guest sees and the main thing the
site is judged on. It is also the one asset that cannot be faked — everything
else on the site is real, verified Traveling Roots information.

This is a spec you can hand to whoever holds the camera. No special equipment
is required; a phone on a tripod is genuinely enough.

---

## Why this isn't just "a video"

The scrollbar is the playhead. The guest can stop on any single frame, hold it,
and scroll backwards. That changes what makes a good source clip:

| In a video (30fps, plays itself) | Here (29 frames, guest controls it) |
| --- | --- |
| A cut is an edit | A cut is a glitch |
| A fade through black is invisible | A black frame looks broken |
| A soft frame is gone in 33ms | A soft frame can sit on screen for 5 seconds |
| Camera shake reads as energy | Camera shake reads as a wobbling page |

Every frame has to survive being stared at.

---

## The shot

**One continuous move. One subject. No cuts.**

1. **Lock the camera off.** Tripod, or wedge the phone. If the camera moves,
   the whole page appears to wobble as the guest scrolls. This is the single
   most important rule.
2. **One dish, start to finish.** Pick a signature — the smoked ribs, a
   homemade-bun burger, a pizza. Something you actually serve.
3. **Give it an arc.** The sequence has to visibly *go somewhere* between frame
   01 and frame 29, because that progression is what makes scrolling feel like
   control. Good options:
   - a 180° turntable rotation of the finished plate
   - the dish being built: base → components → sauce → garnish → finished
   - a slow push from a wide garden table down onto one plate
4. **Shoot it slowly**, about 4–6 seconds of real time, then extract frames.
   Slow means sharp frames and small differences between them.
5. **Consistent light throughout.** No one walking past the window mid-take.
   Flicker between frames is very obvious when you scrub.

### Framing

- **Vertical, 9:16** works, and the site already adapts to it (the frame sits
  right of the text column on desktop). **Landscape 16:9 also works** and will
  automatically re-centre. Either is fine — just be consistent.
- Leave headroom. The top ~7% and bottom ~19% of the frame sit under the
  navbar and the captions, so keep the food out of those bands.
- Plain, uncluttered background. The garden, a wood table, a dark slate.

### Frame count

Aim to extract **at least 29 usable frames**, ideally 40–60, and let the ingest
script select and resample. More source frames is always better: with fewer
than 29 the script has to generate in-between frames by blending, which is
smooth but is a dissolve, not real motion.

---

## Getting them into the site

```bash
# 1. Extract frames from the clip (ffmpeg, or your phone's burst mode)
ffmpeg -i shot.mov -vf fps=10 raw-frames/frame_%03d.png

# 2. Ingest — sorts, cleans, resizes, encodes
npm run frames:ingest -- raw-frames

# 3. Verify
npm run frames:check
```

`frames:ingest` will:

- sort numerically, so `frame_10` lands after `frame_2`
- drop any black frames
- detect scene cuts and use one continuous scene (`--scene auto`)
- trim cross-dissolve frames at the edges of that scene
- resample to exactly 29, interpolating if there aren't enough
- normalise size and encode WebP without cropping or stretching

`frames:check` then reports the size, the per-frame weight against the mobile
budget, and runs the continuity pass:

```
Continuity: ✓ no black frames, no hard cuts — reads as one shot.
```

If it reports a cut or a black frame, the sequence will visibly glitch while
scrolling — fix the source rather than shipping it.

---

## Checklist before you shoot

- [ ] Camera physically locked off
- [ ] One dish you actually serve
- [ ] Lighting won't change during the take
- [ ] Clear space at the top and bottom of frame
- [ ] The move has a clear beginning and end
- [ ] Shot slowly — 4–6 seconds
- [ ] No cuts, no fades, no transitions
