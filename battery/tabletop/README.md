# tabletop

The physical layer. Every Presentation is one Body that rests in a CSS Slot and
shows its rest plus its live Moves: each change of form, place, pose or
stacking is one Move, every channel of it on one progress, painted by one
writer ([ADR 0001](./docs/adr/0001-rest-bodies-in-css-slots-and-move-them-by-decaying-terms.md)).

- `src/core`, exported as `tabletop/core`: pure, with no DOM and no React.
  Moves, their curves and the Shapes channels follow them by; `plan` (a
  change of rest as a Move, its style decided by its source), `planParts`
  (each Part's share), `crossing` (a change of stacking), `reduce` (the one
  reduced-motion policy), device-pixel snapping, the turn, the lean, the hand
  poses, pose functions that emit Slots (`pile`, `fan`, `grid`, `row`,
  `cover`, `arrange`), deck-of-cards' tricks as plans (`deal`, `fanOut`,
  `shuffle`, `sort`, `bysuit`, `poker`, `flip`, `turnDown`), and the one set
  of springs.
- `src/react`, exported as `tabletop/react`: `Table`, `Region`, `Slot`, `Body`,
  `Shell`, `Part`, `Glare` and `useHand`, on the Table's own frame loop and
  its one writer, with no layout projection, and no CSS transition or
  animation on its own elements. Crossings are drawn as SVG mask veils.
  Tricks queue behind the one playing, as deck-of-cards' do; `play` cuts
  in, and `cue` calls a follow-up on a move's own clock.

Each entry exports only what another workspace uses; the rest stays inside
the battery until a caller needs it.

Terminology lives in [GLOSSARY.md](./GLOSSARY.md). The Playground's Tabletop
entry in tf-demo plays all of it, and its Deck tricks entry plays every
deck-of-cards trick on 52 Cards. tf-demo's `e2e/support/frames.ts`,
`invariants.ts` and `continuity.ts` hold every move to its frame invariants,
queued and composed tricks and rapid presses among them.

The eases and tricks are ported from pakastin's deck-of-cards
([LICENSE-deck-of-cards](./LICENSE-deck-of-cards)).
