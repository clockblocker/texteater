# Sheet workspace implementation evidence

Recorded 2026-08-23 for [`#240`](https://github.com/clockblocker/texteater/issues/240).
This is decision input, not the implementation choice required by `#248`.

## Shared result

All variants render one shared three-Pane board with resizable separators,
fully overlapping Sheet Stacks, a forced dark presentation, one Reset action,
and the adapter switcher. The initial central Text Sheet uses the exact
`CardDemoTextInteraction`: the same lorem fixture, selectable fake Segments,
four layered Resolution Cards, and Motion interaction. Opening a Card pushes a
Note Sheet onto that Text's Pane; it does not navigate a parallel fake surface.

A single pure transition module still owns Sheet Opening, top-only atomic
movement, lock precedence, Collapse, Explicit Sheet Removal, and Active Pane
changes. Cards and DnD session state are not representable in that module.

Fourteen focused Bun tests pass: thirteen algebra/reuse scenarios and one
shared adapter-contract test. The full tf-demo run passes 230 tests, and the
Vite production build passes.

## Desktop browser evidence

| Variant | Exercised path | Result | Console errors |
| --- | --- | --- | --- |
| Motion 13.1.1 | Real pointer drag from central to east | Passed after switching to measured Pane geometry | None |
| `@dnd-kit/react` 0.5.0 | Real pointer drag from central to east | Passed | None |
| Pragmatic DnD 3.0.0 | Native draggable handle binding | Handle is the registered native source; in-app automation still does not synthesize HTML5 drag events | None |
| React Aria DnD 3.12.1 | Keyboard drag mode from central to east; native handle inspection | Passed with built-in target traversal; handle carries native drag and description bindings | None |

React Aria's keyboard path moved the central Text east, moved activity east,
and automatically locked the first Sheet placed there. A real separator drag
grew the west Pane from 395 px to 485 px while the other Panes absorbed the
change. Card selection opened the matching Note Sheet with the selected Segment
and Card kind intact; the lower Text Sheet remained mounted but fully covered.

## Built adapter chunks

The adapters are lazy-loaded so an unopened candidate is absent from the main
route chunk.

| Variant | Minified | Gzip |
| --- | ---: | ---: |
| Motion | 2.88 kB | 1.39 kB |
| Pragmatic DnD | 23.27 kB | 7.06 kB |
| dnd-kit | 98.56 kB | 32.66 kB |
| React Aria DnD | 154.96 kB | 36.09 kB |

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
