---
status: proposed
---

# Render a Note Presentation as one element of Blocks

A Note Presentation is one rendered element in every form: resting Card, Held
Card, and Sheet. It never becomes a second component, a drag ghost, or a
crossfade between two faces. Changing form is a layout animation of that one
element and of its Blocks, which read the Presentation's form and adapt.

A Note is an ordered list of Blocks. The Heading Block is pinned first and the
Source Contexts Block is pinned; together they are the Anchor and are visible
in every form, so the eye has something to hold while the box grows. The
Heading is the lift handle in every form and moves to the lower edge when the
Card is a Card Tail. Every other Block renders at full size in Card form and is
clipped by the Card's box; a Block may opt into a compact Card form instead.
Source Contexts shows two in Card form and an expandable list in Sheet form.

We chose this over keeping two faces with a tuned crossfade (the 2026-09
Compass prototype) because no crossfade between two components can read as
one thing growing. The Blocks' content column keeps one width across forms
and shrinks only when the Pane is narrower, so the common case never rewraps;
this measure rule is an experiment, not part of the decision. Sheet chrome
(the trail and the collapse control) belongs to the Pane, not to the Note.
