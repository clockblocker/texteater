---
status: accepted
---

# Rest Bodies in CSS Slots and move them by Terms that decay to nothing

Everything the reader can see standing still is CSS. Each Region holds
invisible Slots, laid out by ordinary CSS in the Region's own size. A Body sits
on the Slot its Place names through `anchor()` and `anchor-size()`, and reads
its Place's rotation, scale, stacking order and side from custom properties.
The browser resolves the Region, its Slots and their Bodies in one layout pass.
A window resize, a zoom, a sidebar transition or a Split drag therefore never
draws a Body in its Region's old box, not even for a frame.

The Table never says where a Body is. It holds only how far the Body still is
from its rest, as Terms: per-channel offsets (box, rotation, lift, stacking
order, turn, opacity), each on its own curve, that decay to nothing. A Body
shows its rest plus its live Terms. At rest it has none, and nothing is written
on it. A new rest adds a Term instead of replacing a value, so position and
velocity stay continuous through every retarget. The box's Terms sit inside
`calc()` beside `anchor-size()`, so a growing Body really resizes and its
content reflows; it is never scaled. One frame loop writes the Terms, and
every property has one writer: React writes the rest, the Table writes the
flight.

Who starts a Move decides its style
([#1309](https://github.com/clockblocker/texteater/issues/1309) Q2). A release
from the hand springs to the new rest with the part of the hand's speed aimed
at it. A Move the app starts, such as a Trick, a deal or a turn, is a fixed
tween with deck-of-cards' timing, and its waypoints are offsets from the final
rest. Reduced motion is one rewrite of the Terms a change adds: a dissolve past
24 px, a brief tween below it, and a flat crossfade for the turn. The app's
"Always play animations" overrides it.

A Part moves by a position-only FLIP in body-local px, read from `offsetLeft`
and `offsetTop`, which ignore every transform, so a leaning or turning Body
can't throw it off. A move's first frame, its size Terms included, is written
to the DOM before the browser paints, never through a Motion value: a Motion
value renders one frame late, and a spike showed a part 140 px off its edge.

These constraints stand with the decision:

- **Anchor positioning, with no fallback.** Without it a Body falls to its
  static position. tf-demo targets browsers that have it, Baseline since early
  2026.
- **Regions and Slots are never transformed.** A Body follows its anchor's
  transformed box, so a transformed Region would drag its Bodies by its
  bounding box. In development the Table reports a transformed Region or Slot.
- **Every jump the model causes goes through `transact`.** It reads the Slots
  and Parts before and after the commit and adds the Terms that hide the jump.
  A model change committed around it teleports, and in development the Body
  warns.
- **Every Place has a Slot.** A Body whose Slot is missing falls to its static
  position. In development the Table reports it after every commit.

## Considered Options

- A world of bodies, each Body's box held as px values and written by one
  engine ([#1310](https://github.com/clockblocker/texteater/issues/1310)
  design A). It showed no stale frame only while one synchronous writer styled
  every Body; any deferred write showed them. It also can't rest a Body against
  scrolled content.
- Layout-driven, with Motion's layout projection animating every change of form
  and place (#1310 design C). It needed this design's size Terms to really
  resize, and a grab mid-move reached into a Motion internal.
- tf-demo's single morph offset ([tf-demo ADR 0012]), which restarts at zero on
  every new place and so drops the hand's velocity.

## Consequences

- A model produces every resting place as a Slot. A Deck's poses (pile, fan,
  grid, row) are Slots, so a Trick's final pose is a real Place that survives a
  resize.
- Gesture code reads Slot rects. The Table never measures a Body.
- Each Body has its own 3D context with its paint containment on its faces, so
  a turn's lift is never clipped. Its stacking order stays raised through a
  move the hand or a morph started.

[tf-demo ADR 0012]: ../../../../app/tf-demo/docs/adr/0012-place-resting-notes-against-their-pane-in-css.md
