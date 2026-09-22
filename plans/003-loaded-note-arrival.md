# 003 — Fade a loaded Note in over its skeleton instead of popping

- **Status**: TODO
- **Commit**: afaecd59
- **Severity**: MEDIUM (missed opportunity)
- **Category**: Missed opportunities
- **Estimated scope**: 3 files, ~20 lines

## Problem

The skeleton on `/playground/loading` is what a user sees until a Note's data
arrives. In the app the swap from skeleton to loaded Note is a hard cut: the
pending branch returns the skeleton, the next render returns the Note, and
every word teleports in at once.

```tsx
// app/tf-demo/src/views/route-note-view.tsx:45-48 — current
	if (noteQuery.isPending)
		return (
			<NoteSkeletonFor kind={target.kind} presentation={presentation} />
		);
```

```tsx
// app/tf-demo/src/views/text-view.tsx:99 — current
	if (textQuery.isPending) return <TextViewSkeleton />;
```

The repo already owns a keyframe for exactly this moment, but only the Reading
emoji uses it (`app/tf-demo/src/notes/universal/blocks/renderers/reading/header/default.tsx:73`):

```css
/* app/tf-demo/src/index.css:32-46 — current */
/* A word that arrives into a Note that was already showing its bone for it. */
@keyframes note-arrive {
	from {
		opacity: 0;
		transform: translateY(0.12em);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
.note-arrival {
	display: inline-block;
	animation: note-arrive 180ms ease-out both;
}
```

## Target

When, and only when, a view first rendered its skeleton, the loaded content
plays the existing `note-arrive` keyframe once on its root: 180ms, `ease-out`,
opacity 0 → 1 with a 0.12em rise. A Note that mounts with cached data gets no
animation (that path is hit constantly while dealing Cards and must stay
instant).

```css
/* target — app/tf-demo/src/index.css, directly after `.note-arrival` */
/* A whole Note or Text arriving where its skeleton stood. */
.note-arrival-block {
	animation: note-arrive 180ms ease-out both;
}
```

```tsx
// target — app/tf-demo/src/views/route-note-view.tsx
	// True only when this mount showed a skeleton first.
	const arrivedFromSkeleton = useRef(noteQuery.isPending).current;
	const arrival = arrivedFromSkeleton
		? "min-h-full note-arrival-block"
		: "min-h-full";
	if (noteQuery.isPending)
		return (
			<NoteSkeletonFor kind={target.kind} presentation={presentation} />
		);
	if (noteQuery.data?.kind !== target.kind) {
		return ( <NotFoundView … /> );   // unchanged
	}
	if (noteQuery.data.kind === "Surface") {
		return (
			<div className={arrival}>
				<PaginatedSurfaceNote … />   // unchanged props
			</div>
		);
	}
	return (
		<div className={arrival}>
			{noteQuery.data.kind === "Attestation" ? (
				renderNote({ … })              // unchanged
			) : (
				<PaginatedRouteNote … />        // unchanged
			)}
		</div>
	);
```

```tsx
// target — app/tf-demo/src/views/text-view.tsx
	const arrivedFromSkeleton = useRef(textQuery.isPending).current;
	if (textQuery.isPending) return <TextViewSkeleton />;
	if (!textDetail) { return ( <NotFoundView … /> ); }   // unchanged
	return (
		<div className={arrivedFromSkeleton ? "min-h-full note-arrival-block" : "min-h-full"}>
			<TextPresentation … />                          // unchanged props
		</div>
	);
```

Reduced motion: the app-wide blanket in `index.css:3-13` collapses this to
0.01ms, which is the correct outcome for a one-shot entrance. No extra work.

## Repo conventions to follow

- App-level motion CSS lives in `app/tf-demo/src/index.css`; the `note-arrive`
  keyframe and `.note-arrival` class there are the exemplar. Reuse the
  keyframe; do not add a second one.
- Hooks are imported from `react` by name (`import { useCallback } from "react";`
  at `route-note-view.tsx:5`; `useRef` is already imported in `text-view.tsx:5`).
- `min-h-full` on the wrapper preserves the height chain the Note root relies on
  (`render.tsx:88` uses `min-h-full bg-paper`).
- Formatting: tabs, Biome.

## Steps

1. `app/tf-demo/src/index.css`: after the `.note-arrival { … }` rule (line 46),
   add the `.note-arrival-block` rule from Target.
2. `app/tf-demo/src/views/route-note-view.tsx:5`: change the import to
   `import { useCallback, useRef } from "react";`.
3. `app/tf-demo/src/views/route-note-view.tsx`: immediately before
   `if (noteQuery.isPending)` (line 45), add the two `arrivedFromSkeleton` /
   `arrival` lines from Target. Hooks must stay above every early return.
4. Same file: wrap the `PaginatedSurfaceNote` return (lines 57-64) and the
   final Attestation/PaginatedRouteNote return (lines 66-76) in
   `<div className={arrival}>…</div>` as shown. Leave `NotFoundView` unwrapped.
5. `app/tf-demo/src/views/text-view.tsx`: immediately before line 99 add
   `const arrivedFromSkeleton = useRef(textQuery.isPending).current;` and wrap
   the final `<TextPresentation …/>` return (lines 108-121) as shown.

## Boundaries

- Do NOT touch `resolution-note-view.tsx`; its multi-stage skeleton → resolving
  → complete handoff is a separate design question.
- Do NOT animate Notes that mount with data already cached.
- Do NOT change any prop passed to the wrapped components.
- Do NOT change the keyframe's values (180ms, `ease-out`, 0.12em).
- Do NOT add dependencies.
- If line numbers have drifted so the excerpts do not match, STOP and report.

## Verification

- **Mechanical**: `bun run --cwd app/tf-demo lint` and
  `bun run --cwd app/tf-demo check` pass; `bun run --cwd app/tf-demo test` passes.
- **Feel check**: run tf-demo, DevTools → Network → throttle to "Slow 3G",
  open a Text and click a word so a Note Sheet opens cold:
  - The skeleton shows, then the loaded Note fades up in place within a fifth
    of a second; no flash of empty paper between them.
  - At Animations-panel playback 10%, the whole Note rises about 2px while
    fading; it does not slide from off screen.
  - Turn throttling off, navigate away and back to the same Note: it appears
    instantly with no fade (cached data path).
  - DevTools → Rendering → reduced motion: the Note appears instantly.
- **Done when**: cold loads fade in, warm loads do not, tests pass.
