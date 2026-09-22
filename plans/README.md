# Animation plans — `/playground/loading`

Audit of the Loading playground (`app/tf-demo/src/playground/entries/loading-gallery.tsx`)
and the skeleton primitives it exercises (`battery/lego/src/molecules/note-skeleton.tsx`,
`battery/lego/src/styles.css`). Written at commit `afaecd59` on 2026-09-22.

Note: `docs/reference/developer-documentation.md` says GitHub owns plans. These
files are working artifacts for an executor; move them to issues or delete them
after execution rather than committing them.

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Keep a loading signal under reduced motion](001-reduced-motion-bone-pulse.md) | MEDIUM | TODO |
| 002 | [Make the bone sweep travel at constant speed](002-linear-sweep-with-dwell.md) | LOW | TODO |
| 003 | [Fade a loaded Note in over its skeleton](003-loaded-note-arrival.md) | MEDIUM | TODO |

## Recommended order

1. 002 first: one-line token change, easiest feel check, and it changes the
   ordinary sweep that 001's feel check compares against.
2. 001 next: touches the same `styles.css` region; do it after 002 to avoid a
   merge in the `@theme` block.
3. 003 last: independent of lego; app-only.

## Dependencies

- 001 and 002 both edit `battery/lego/src/styles.css` lines 117-143. Run them
  sequentially, not in parallel worktrees.
- 003 has no dependency on 001 or 002.

## Not planned (needs a device first)

`bone-sheen` uses `background-attachment: fixed` to keep every bone on one
band. Headless Chromium held 60 fps with 96 bones idle and while scrolling, so
the desktop paint cost is not a confirmed problem. Whether iOS Safari honours
`fixed` here is unverified; if it does not, each bone shows its own slice of
the band on phones. Check on a real iPhone before planning any change.
