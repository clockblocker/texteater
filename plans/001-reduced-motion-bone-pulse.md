# 001 — Keep a loading signal under reduced motion (bone pulse)

- **Status**: TODO
- **Commit**: afaecd59
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 4 files, ~25 lines

## Problem

With `prefers-reduced-motion: reduce`, every bone stops dead. The skeleton
becomes a set of static grey bars with nothing that says "still loading", which
reads as a broken render. Reduced motion means fewer and gentler animations,
not zero: keep an opacity signal, drop the travelling band.

Three places conspire to remove all motion:

```ts
// battery/lego/src/molecules/note-skeleton.tsx:54 — current
"inline-block h-[0.7em] max-w-full rounded-[0.22em] bone-sheen align-middle motion-reduce:animate-none",
```

```ts
// battery/lego/src/atoms/skeleton.tsx:12 — current
"rounded-md bg-muted bone-sheen motion-reduce:animate-none",
```

```css
/* app/tf-demo/src/index.css:3-13 — current (app-wide blanket) */
@media (prefers-reduced-motion: reduce) {
	:root:not([data-motion-preference="ignore"]) *,
	:root:not([data-motion-preference="ignore"]) *::before,
	:root:not([data-motion-preference="ignore"]) *::after {
		animation-delay: 0s;
		animation-duration: 0.01ms;
		animation-iteration-count: 1;
		scroll-behavior: auto;
		transition-delay: 0s;
		transition-duration: 0.01ms;
	}
```

The sweep itself is defined here:

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

```css
/* battery/lego/src/styles.css:131-143 — current */
/* A bone's sheen: a soft highlight drawn over the bone's own colour. */
@utility bone-sheen {
	background-image: linear-gradient(
		100deg,
		transparent 30%,
		color-mix(in srgb, var(--ink) 18%, transparent) 50%,
		transparent 70%
	);
	background-attachment: fixed;
	background-repeat: no-repeat;
	background-size: 50vw 100vh;
	animation: var(--animate-bone);
}
```

## Target

Under reduced motion a bone has no gradient and no movement. It breathes in
opacity only, slowly, forever:

```css
/* target — battery/lego/src/styles.css, inside `@theme inline`, directly after the `bone` keyframes */
	/* The same bones when motion is reduced: no travelling band, a slow breath in opacity. */
	--animate-bone-rest: bone-rest 1.8s ease-in-out infinite;
	@keyframes bone-rest {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}
```

```css
/* target — battery/lego/src/styles.css, `bone-sheen` utility */
@utility bone-sheen {
	background-image: linear-gradient(
		100deg,
		transparent 30%,
		color-mix(in srgb, var(--ink) 18%, transparent) 50%,
		transparent 70%
	);
	background-attachment: fixed;
	background-repeat: no-repeat;
	background-size: 50vw 100vh;
	animation: var(--animate-bone);

	@media (prefers-reduced-motion: reduce) {
		background-image: none;
		animation: var(--animate-bone-rest);
	}
}
```

```css
/* target — app/tf-demo/src/index.css, inside the existing reduced-motion block,
   after the blanket rule and before the `data-motion-preference="ignore"` rules */
	/* Bones keep a slow opacity breath; the blanket above would freeze it. */
	:root:not([data-motion-preference="ignore"]) .bone-sheen {
		animation: var(--animate-bone-rest);
	}
```

The two `motion-reduce:animate-none` classes are removed so the utility's own
reduced-motion branch is what runs.

## Repo conventions to follow

- Animation tokens live in `battery/lego/src/styles.css` inside `@theme inline`
  as Tailwind v4 `--animate-*` variables with their `@keyframes` beside them.
  Exemplar: `--animate-bone` at `battery/lego/src/styles.css:120`.
- Reusable motion is a `@utility` in the same file (`bone-sheen`, `word-sheen`).
- tf-demo owns the app-level reduced-motion policy in `app/tf-demo/src/index.css`;
  its `data-motion-preference="ignore"` branch (lines 15-20) already restores
  the ordinary sweep, so leave that branch untouched.
- Formatting: tabs, Biome. Keep comments in the file's plain style.

## Steps

1. `battery/lego/src/styles.css`: after the closing `}` of `@keyframes bone`
   (line 128) and still inside `@theme inline`, add the `--animate-bone-rest`
   token and `@keyframes bone-rest` exactly as in Target.
2. `battery/lego/src/styles.css`: inside `@utility bone-sheen`, append the
   nested `@media (prefers-reduced-motion: reduce)` block from Target as the
   last declaration. Do not touch `word-sheen`.
3. `battery/lego/src/molecules/note-skeleton.tsx:54`: delete the class token
   `motion-reduce:animate-none`. Resulting string:
   `"inline-block h-[0.7em] max-w-full rounded-[0.22em] bone-sheen align-middle"`.
4. `battery/lego/src/atoms/skeleton.tsx:12`: delete the class token
   `motion-reduce:animate-none`. Resulting string:
   `"rounded-md bg-muted bone-sheen"`.
5. `app/tf-demo/src/index.css`: inside the `@media (prefers-reduced-motion: reduce)`
   block, immediately after the blanket rule's closing `}` (line 13), add the
   `.bone-sheen` rule from Target. It must come after the blanket rule so its
   higher specificity and later position both win.

## Boundaries

- Do NOT touch `word-sheen` or `reader-segment.tsx`; the resolving word has its
  own reduced-motion fallback (`motion-reduce:text-word-resolving`).
- Do NOT change the ordinary (non-reduced) sweep in this plan; that is plan 002.
- Do NOT change markup, widths, colours or the skeleton components' structure.
- Do NOT add dependencies.
- If a cited line no longer matches, STOP and report instead of improvising.

## Verification

- **Mechanical**: from the repo root, `bun run --cwd battery/lego lint` and
  `bun run --cwd app/tf-demo lint` pass; `bun run --cwd app/tf-demo check` passes.
- **Feel check**: run tf-demo (`bun run --cwd app/tf-demo dev`, Vite on 5173),
  open `http://localhost:5173/playground/loading`, then in Chrome DevTools →
  Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce":
  - Every bone in every Card and Sheet fades between full and roughly half
    opacity over about two seconds, in unison, with no travelling highlight.
  - Nothing moves on screen; only opacity changes.
  - Turn emulation off: the original sweeping band returns unchanged.
  - Open Settings in tf-demo and set the motion preference to ignore the
    system: with emulation still on, the sweep returns (lines 15-20 of
    `index.css` still apply).
  - Also check the `Skeleton` atom, if any surface uses it, behaves the same.
- **Done when**: reduced motion shows a breathing skeleton, no band, and the
  ordinary path is byte-for-byte the same visual as before.
