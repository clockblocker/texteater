---
status: accepted
---

# Draw every Presentation from one foundation that holds no engine

Every surface that shows a Note Presentation draws it from the same
components, in `src/presentation`: the app's Compass renderer, the
Playground's Notes and Loading galleries, and Deck interactions. A change
to the box, the Heading row, the Body's clip or the Deck's pile is made
once and shows in all of them, so the look of a Card can be worked on in the
Playground and be the app's.

The foundation is three things:

- **The box.** `PresentationBox` is the paper surface in one of the forms
  of [tf-demo ADR 0006](./0006-render-a-note-presentation-as-one-element-of-blocks.md):
  a Card in front, a Card Tail above or below it, a Cover, a Ground, or a
  Sheet with no bar. Its skin is written once: corners, border, fill,
  containment, and a shadow that grows with the Card's lift.
- **The content.** `PresentationContent` places the Heading row and the
  Body with its scroller and clip for a form, from the Note's parts: the
  Heading Block's words as a Card's title row and as a Cover's title, and
  every other Block.
- **The Deck's resting geometry.** `deck-geometry` reads the Compass
  battery's placements in px. The app places a resting Note with those
  placements as CSS
  ([tf-demo ADR 0012](./0012-place-resting-notes-against-their-pane-in-css.md));
  a renderer that moves its Cards on px values reads the same ones, so the
  two piles are one pile.

The foundation holds no motion engine. A host draws the box as the element
its engine moves (`as`), and hands the content a `ContentDrawing`: one
function per part that changes with the form, the Heading row, its faces,
the scroller and the fade. The content says what each part is and where it
sits; the host draws it as an element its engine animates. Without a
drawing every part is a plain element and a change of form is drawn at
once, which is what a gallery wants. The Compass renderer's drawing is
Motion's (`workspace/compass/content-motion.tsx`); Deck interactions moves
the box on its own values and draws the content still.

`src/presentation` sits below `src/workspace` and `src/playground`, which
both import it, and beside `src/notes`, which it does not import: a host
passes a Note's parts in.

## Considered Options

- **Aligning the three copies' values.** Rejected: each surface kept its
  own box, Heading row and pile arithmetic, so the next change would drift
  again. The gallery's Card had no Heading row and no Card Tail at all.
- **Rendering the app's `PresentationView` in the Playground.** Rejected: it
  carries the Compass's placement, gestures and Motion layout, and Deck
  interactions studies a different engine.
- **Small styled parts that each host composes.** Rejected: the order of the
  parts and which face a form shows would then be written once per host.
- **A foundation built on Motion.** Rejected: the engines are being
  replaced (#1308), and the foundation should outlast them.

## Consequences

- `src/presentation/one-foundation.test.ts` fails when the paper skin is
  written out elsewhere or a Playground entry builds a pile from the
  battery's sizes. `e2e/card-foundation.pw.ts` holds the three surfaces to
  the same computed box, Heading row, Body and pile.
- Deck interactions deals one click's Deck from the fake db, through the
  app's `segmentSelectionDeckCards`, so its Cards and their order are the
  app's ([tf-demo ADR 0011](./0011-tell-a-clicks-story-in-its-deck.md)).
- A Card in a gallery rests its controls, as in the app (#485); its links
  work in the Cover.
