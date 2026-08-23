# Sheet workspace comparison playground

Throwaway implementations for [`texteater#240`](https://github.com/clockblocker/texteater/issues/240).
They deliberately stay isolated from production Text, Note, Convex, URL, and
persistence behavior.

The workspace is built on the Card playground rather than beside it. Its
initial central Text Sheet renders `CardDemoTextInteraction`, including the
same lorem-ipsum fixture, selectable fake Segments, layered Resolution Cards,
and Motion card mechanics. Opening one of those Cards pushes a Note Sheet onto
the Text Sheet's Pane when activated directly; dropping it over a Pane places
the Note Sheet in that Pane.

Run `bun run demo` from the repository root, then open:

- `/playground/sheet-workspace/motion`
- `/playground/sheet-workspace/dnd-kit`
- `/playground/sheet-workspace/pragmatic`
- `/playground/sheet-workspace/react-aria`

Run the real Chromium pointer and keyboard regressions with
`bun run --cwd app/tf-demo test:e2e`.

All four adapters receive the same valid `SheetWorkspace`, emit only a proposed
top-Sheet placement, and commit through `transitionSheetWorkspace`. Cards,
gesture sessions, hit testing, and animation state never enter the reducer.
The shared presentation gives every adapter the same resizable Panes, fully
overlapping Sheet Stacks, dark appearance, and compact comparison controls.
