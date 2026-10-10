---
status: accepted
---

# Place resting Notes against their Pane in CSS

A resting Note, a Ground, a Cover or a Card in a Deck slot, is placed by CSS
that reads its Pane's element. Each Pane's element carries an `anchor-name`,
and the Note's inset and size are `calc()` expressions over `anchor()`,
`anchor-size()` and rem (`placementStyle` in the Compass battery). The browser
resolves them in the same layout pass that sizes the Panes, so a browser zoom,
a window resize, the sidebar's width transition or a Split Handle drag never
draws a Note in its Pane's old box.

The battery writes each resting place once, as a `Placement` over the root
size and the Pane's size. The renderer prints it as CSS. Gesture code reads it
in px against a measured Pane box, for a Deck's column, a Card's height and
the return band, so the two readings cannot drift apart.

Measured px boxes are used only while a gesture or a morph is in flight: a
Held Card at its hand box, a Sheet emerging from its bar, a Card growing from
the hand into a Cover. A change of place is a morph from where the Note was.
The Note is laid out at its new place and offset back to the box it showed,
with translate for the origin and px added inside `calc()` for the size. The
offset animates to nothing. It is measured once, in a layout effect, before
the frame paints, and the target is read from an empty stand-in, so the Note
is laid out only at sizes it paints at. At rest the offset is nothing and the
Note is pure CSS, so the hand-off back to CSS has nothing to jump.

The Notes layer is `display: contents`. The frame is then every Note's
containing block, and the Panes are inside it, which anchor positioning
requires of an anchor.

## Considered Options

- Measuring Pane boxes with a ResizeObserver and placing Notes in px, which
  this replaces. React renders the measurement after the browser paints, so
  every resize showed 1–3 frames of Notes laid out at the new size in the old
  box. Telling a resize from a move needed a layout epoch, which also
  swallowed real morphs that happened to coincide with a layout change.
- Fractions of the frame from the Split's `flexGrow` ratios. Regions have
  minimum sizes in px, so a Pane's share changes on resize. The fraction
  would also have to account for Split Handle widths and nested Splits, and
  the live ratios sit in the panels store outside React.
- Rendering each Ground inside its Pane's element and lifting it into the
  overlay for a morph. Moving between parents remounts the Note, which loses
  its scroll position and motion state and breaks the one-element rule of
  [tf-demo ADR 0006](./0006-render-a-note-presentation-as-one-element-of-blocks.md).

## Consequences

- Anchor positioning is Baseline from Chrome 125, Safari 26 and Firefox 147.
  Older browsers draw resting Notes at their static position.
- A Note placed in CSS has no px box until something measures it.
  `NoteHandle.box()` measures the element.
