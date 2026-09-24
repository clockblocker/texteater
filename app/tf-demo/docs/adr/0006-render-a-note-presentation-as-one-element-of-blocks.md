---
status: proposed
---

# Render a Note Presentation as one element of Blocks

A Note Presentation is one rendered element in every form: resting Card, Held
Card, and Sheet. It never becomes a second component, a drag ghost, or a
crossfade between two faces. Changing form is a layout animation of that one
element and of its Blocks, which read the Presentation's form and adapt. Every
edge of the Note is its own: nothing drawn beside it stands in for part of its
box.

A Note is an ordered list of Blocks. The Heading Block is pinned first and the
Source Contexts Block is pinned; together they are the Anchor and are visible
in every form, so the eye has something to hold while the box grows. The
Heading is the lift handle in every form. As a Card it is the title row, at the
lower edge when the Card is a Card Tail. As a Cover it is the Cover's bar: its
← and its label. As a Ground it folds shut, because the Pane bar carries the
label. The Heading row's height rides the same morph as the box; only its words
change, and the row itself never fades. Every other Block renders at full size
in Card form and is clipped by the Card's box; a Block may opt into a compact
Card form instead. Source Contexts shows two in Card form and an expandable
list in Sheet form.

The Pane owns what Sheet chrome does: the trail, ←, and X. Where it is drawn
follows whose edge it sits on. A Ground fills its Pane, so its chrome is the
Pane bar. A Cover is inset in its Pane, so its chrome is the Note's Heading,
and the Pane hands it the ← to draw.

We chose this over keeping two faces with a tuned crossfade (the 2026-09
Compass prototype) because no crossfade between two components can read as
one thing growing. The Blocks' content column keeps one width across forms
and shrinks only when the Pane is narrower, so the common case never rewraps;
this measure rule is an experiment, not part of the decision.

## Considered Options

- A Cover bar drawn beside the Note as Pane chrome (the 2026-09-19 build) was
  itself a two-face crossfade. It sat at the Cover's final box and faded in
  while the Note was still morphing toward it: complete about 200 ms before
  the body landed, showing the Ground through itself while it faded, joined to
  the body by the body's own top border, and gone in one frame on Collapse.
- Keeping the bar beside the Note but driving it from the Note's motion
  values would fix the timing, but two elements would then have to agree on
  border colour, radius, scale, shadow, opacity, and exit for as long as
  either changed.
