# Sheet workspace implementation evidence

Recorded 2026-08-23 for [`#240`](https://github.com/clockblocker/texteater/issues/240).
This is decision input, not the implementation choice required by `#248`.

## Shared result

All variants render the same three-Pane fixture, full reducer state, controls,
minimum-width geometry, modifier Card preview, and acceptance checklist. A
single pure transition module owns Sheet Opening, top-only atomic movement,
lock precedence, Collapse, Explicit Sheet Removal, and Active Pane changes.
Cards and DnD session state are not representable in that module.

Thirteen focused Bun tests pass: twelve algebra scenarios and one shared
adapter-contract test. A Vite production build also passes.

## Desktop browser evidence

| Variant | Exercised path | Result | Console errors |
| --- | --- | --- | --- |
| Motion 13.1.1 | Real pointer drag from central to east | Passed after switching to measured Pane geometry | None |
| `@dnd-kit/react` 0.5.0 | Real pointer drag from central to east | Passed | None |
| Pragmatic DnD 3.0.0 | Native bindings plus shared click/tap movement | Shared path passed; in-app automation did not synthesize the native drag | None |
| React Aria DnD 3.12.1 | Keyboard drag mode from central to east | Passed with built-in announcement and target traversal | None |

The shared click/tap alternative produced byte-for-byte equivalent reducer
state for all four variants. Successful placement moved activity to east and
automatically locked the first Sheet placed there.

## Built adapter chunks

The adapters are lazy-loaded so an unopened candidate is absent from the main
route chunk.

| Variant | Minified | Gzip |
| --- | ---: | ---: |
| Motion | 2.82 kB | 1.36 kB |
| Pragmatic DnD | 23.41 kB | 7.10 kB |
| dnd-kit | 98.63 kB | 32.65 kB |
| React Aria DnD | 155.01 kB | 36.09 kB |

Motion is already a tf-demo dependency, so its variant chunk is not a complete
measure of Motion's package cost. These numbers are useful for relative route
loading evidence, not a standalone package-cost score.

## Evidence still required by the fixed contract

- Current iOS Safari and Android Chrome touch runs, including scroll near the
  handle and cross-Pane offsets.
- Real-device confirmation of Pragmatic's native drag and preview.
- Human comparison of Card-to-Sheet continuity and reduced-motion behavior.
- Screen-reader notes beyond React Aria's browser-visible live announcements.
- Same-device performance traces and video captures if the full scoring rubric
  remains mandatory for the final choice.

Do not close `#248` or the parent map until the human choice records how these
remaining gates were handled.
