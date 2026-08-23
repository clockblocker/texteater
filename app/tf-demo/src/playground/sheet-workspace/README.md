# Sheet workspace comparison playground

Throwaway implementations for [`texteater#240`](https://github.com/clockblocker/texteater/issues/240).
They deliberately stay isolated from production Text, Note, Convex, URL, and
persistence behavior.

Run `bun run demo` from the repository root, then open:

- `/playground/sheet-workspace/motion`
- `/playground/sheet-workspace/dnd-kit`
- `/playground/sheet-workspace/pragmatic`
- `/playground/sheet-workspace/react-aria`

All four adapters receive the same valid `SheetWorkspace`, emit only a proposed
top-Sheet placement, and commit through `transitionSheetWorkspace`. Cards,
gesture sessions, hit testing, and animation state never enter the reducer.
