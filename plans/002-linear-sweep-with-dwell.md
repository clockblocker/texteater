# 002 — Make the bone sweep travel at constant speed

- **Status**: TODO
- **Commit**: afaecd59
- **Severity**: LOW
- **Category**: Easing & duration
- **Estimated scope**: 1 file, ~8 lines

## Problem

The band of light is constant, looping motion, but it runs on an ease-in-out
curve. It crawls in from the left edge, rushes through the middle of the
viewport and slows again on the right, so the "one band" reads as uneven, and
the pause between sweeps is an accident of the curve rather than a choice.

```css
/* battery/lego/src/styles.css:117-128 — current (inside `@theme inline`) */
	/* One band of light crossing a Note that is still on its way. The band
	   is fixed to the viewport, so every bone shows the same sweep. */
	--animate-bone: bone 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	@keyframes bone {
		from {
			background-position: -60vw 0;
		}
		to {
			background-position: 110vw 0;
		}
	}
```

`word-sheen` (`battery/lego/src/styles.css:149-161`) shares the same token, so
the resolving word sweeps with the same timing. That is intended cohesion and
stays shared.

## Target

Linear travel with an explicit rest while the band is off screen. The period
stays 2.4s so nothing else shifts; the band now crosses in 1.8s and rests 0.6s.

```css
/* target */
	/* One band of light crossing a Note that is still on its way. The band
	   is fixed to the viewport, so every bone shows the same sweep. It travels
	   at one speed and rests off screen between crossings. */
	--animate-bone: bone 2.4s linear infinite;
	@keyframes bone {
		from {
			background-position: -60vw 0;
		}
		75%,
		to {
			background-position: 110vw 0;
		}
	}
```

## Repo conventions to follow

- Animation tokens are Tailwind v4 `--animate-*` variables inside
  `@theme inline` in `battery/lego/src/styles.css`, keyframes beside them.
- Change only the token line and keyframe selectors; the gradient, size and
  attachment in `bone-sheen` are not part of this plan.

## Steps

1. `battery/lego/src/styles.css:120`: change
   `--animate-bone: bone 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;` to
   `--animate-bone: bone 2.4s linear infinite;`.
2. `battery/lego/src/styles.css:121-128`: change the `to` keyframe selector to
   `75%, to` so the band holds at `110vw 0` for the last quarter of the loop.
3. Extend the comment above the token with the sentence from Target.

## Boundaries

- Do NOT touch `bone-sheen`, `word-sheen`, or any component file.
- Do NOT change the 2.4s period.
- Do NOT add dependencies.
- If line 120 does not contain the cubic-bezier above, STOP and report.

## Verification

- **Mechanical**: `bun run --cwd battery/lego lint` passes.
- **Feel check** (this cannot be judged from code; watch it):
  - Open `http://localhost:5173/playground/loading` with normal motion.
  - DevTools → Animations panel, playback 25%: the highlight moves the same
    distance per frame across the whole viewport width, then the screen is
    still for a visible beat before the next crossing.
  - Every bone on screen shows the same phase of the band at the same instant
    (the viewport-fixed attachment is untouched).
  - If the rest feels too long, the executor may change `75%` to `80%` and
    nothing else; if the crossing feels too fast at 1.8s, STOP and report.
- **Done when**: the band crosses at one visible speed with a deliberate pause,
  and the resolving word in a Reading Note sweeps in the same rhythm.
