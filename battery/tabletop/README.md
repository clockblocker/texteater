# tabletop

The physical layer. Every Presentation is one Body that rests in a CSS Slot and
moves by Terms that decay to nothing ([ADR 0001](./docs/adr/0001-rest-bodies-in-css-slots-and-move-them-by-decaying-terms.md)).

- `src/core`, exported as `tabletop/core`: pure, with no DOM and no React.
  Terms and their curves, `retarget` (a change of rest that keeps position and
  velocity), `reduce` (the one reduced-motion policy), device-pixel snapping,
  the turn, the tilt, pose functions that emit Slots (`pile`, `fan`, `grid`,
  `row`, `cover`), deck-of-cards' tricks as plans, and the one set of springs.
- `src/react`, exported as `tabletop/react`: `Table`, `Region`, `Slot`, `Body`,
  `Shell`, `Part`, `Glare` and `useHand`, on the Table's own frame loop with
  no layout projection.

Each entry exports only what another workspace uses; the rest stays inside
the battery until a caller needs it.

Terminology lives in [GLOSSARY.md](./GLOSSARY.md). The Playground's Tabletop
entry in tf-demo plays all of it.

The eases and tricks are ported from pakastin's deck-of-cards
([LICENSE-deck-of-cards](./LICENSE-deck-of-cards)).
