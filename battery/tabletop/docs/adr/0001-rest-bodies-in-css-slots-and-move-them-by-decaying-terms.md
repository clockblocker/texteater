---
status: accepted
---

# Rest Bodies in CSS Slots and move them by Moves that decay to nothing

Everything the reader can see standing still is CSS. Each Region holds
invisible Slots, laid out by ordinary CSS in the Region's own size. A Body
fills an invisible seat that sits on the Slot its Place names through
`anchor()` and `anchor-size()`, and reads its Place's rotation, scale,
stacking order and side from custom properties. The browser resolves the
Region, its Slots and their seats in one layout pass. A window resize, a
zoom, a sidebar transition or a Split drag therefore never draws a Body in
its Region's old box, not even for a frame.

The Table never says where a Body is. A Body shows its rest plus its live
Moves, and at rest it has none and nothing is written on it. A Move is one
atomic change of a Body's form, place, pose or stacking. It starts from
exactly what the Body shows, ends exactly at its rest, and has one
progress, a curve from 0 to 1 that says nothing about a channel or a
distance. Every channel the change touches is an offset from rest, a Term,
whose share of its delta is a Shape of that progress: the box's place and
size, rotation, lift and opacity, the lean toward the pointer it lets go
of, each Part's offset, exit and arrival, and the stacking crossing. They
ride one progress, so nothing the Body shows can drift from the rest of it
(#1311 rule 1). Only a Trick's scripted path keys each channel's waypoints
separately, still on its Move's one timeline. A turn over is a Move of its
own.

One writer paints a Body: at each frame's own timestamp it writes the
Body's own `translate`, `rotate`, `scale`, `opacity`, size
(`calc(100% + Δ)`, so the box really resizes and its content reflows; it
is never scaled) and `transform` (the lean), its seat's `z-index`, its
shell's turn, its Glares and every Part's offset, opacity and pin, and
takes each off as its Moves end. It never writes a custom property once a
frame: a change of one restyles every element of the Body's faces
([#1318](https://github.com/clockblocker/texteater/issues/1318)). React
writes only the rest.

Who starts a Move decides its style
([#1309](https://github.com/clockblocker/texteater/issues/1309) Q2):

- **The hand.** A release springs to the new rest on one line, with the
  part of the hand's speed aimed at the rest as its rate, from the last
  frame painted. A hand faster than the spring can take lands on a
  critically damped spring of its own rate, so the Body never passes its
  rest. A release whose rest is where the Body shows has no way to go: the
  hand's speed is thrown away and no Move is made.
- **The app on a spring.** A reflow or a change of form adds a Move that
  cancels the jump in rest; Moves already running keep running, so position
  and speed stay continuous.
- **The app on a tween.** A Trick, a deal or a scripted move replaces what
  was in flight and runs from where the Body shows through its waypoints.
  Tricks queue as deck-of-cards' do: each is made when its turn comes and
  starts in the frame the one before it lands.

Stacking is modelled. A Body's order is its Place's z. A change of order is
a crossing on the Move that makes it: every other Body whose order against
it ends differently from how it shows now is crossed, and how much it shows
over the moving Body goes from what it shows now to all or nothing, along
the box's own way. Through the crossing the moving Body is drawn just above
every Body it crosses (seats stack at twice their z, so a crossing fits
over a tie), veiled by an SVG mask in which each crossed Body's shape is
cut out at its share. A Body going back under the Cards in front fades out
where they lie as it nears its rest (from 40% of the way); one coming
forward fades in over them while it is still near where it was (by 60%).
At the end the Body takes its rest and no veil is left, so at rest the
page stacks Bodies exactly as their Places order them. A Trick keeps
deck-of-cards' cut at `zAt`, also on its Move. Chrome masks only inside an
element's border box, so the veil goes on the moving Body, whose own shadow
is the one thing it can't fade; veiling the crossed Bodies instead left
their shadows standing over the moving one for the whole crossing.

The lean toward the pointer is an input only to a Body at rest with no
Move in flight, or in the hand; no other Body leans while one is held. A
Move lets the lean go on its own progress, and a box that resizes waits
until the lean is flat (0.45 of the way), then sets off from still, so no
Body leans while it resizes. The hand's pose is a Table option: `LIFTED`
(3% bigger, upright, dissolving over what it passes) or `KEEP_POSE`
(deck-of-cards: as it was, to the top at once).

A Part is a piece of a face that keeps its identity across forms; an app
renders a form's own Parts in every form's tree, and they show only in
theirs. On a change of form, a Part both forms have travels from where it
showed to where it now lies by a body-local FLIP on the box's shape. Where
two would cross, the one travelling further dissolves instead. A Part only
the old form had stays the same element, kept mounted by the Body until
the Move ends, pinned where it showed and clipped by the face, fading out
before anything travelling reaches it. A Part only the new form has fades
in once nothing travelling is over it.

An app-started Move's clock starts only once the frame that paints its
commit has painted, one frame in, so its first visible step is a frame's
worth. A queued Trick is committed inside the frame the one before it
lands, and its clock is born at that frame, so a chain keeps the library's
rhythm however long its commits take. Reduced motion is one rewrite of a
Move: past 24 px it dissolves, switching place, size, Parts and stacking
while hidden; below, a brief tween; a turn is a flat crossfade; nothing
leans or lifts. The app's "Always play animations" overrides it.

[#1311](https://github.com/clockblocker/texteater/issues/1311) found what
makes a growing Card feel jittery or like jelly, and these rules hold for
every Body and Part:

- **No overshoot.** Every spring a box rides is damped at ζ ≥ 0.97, and a
  progress ends within 1e-4 of 1, so no channel snaps at its end.
- **Snapping relative to the rest.** The box's place, its height and every
  Part's offset are written in whole device pixels from their rest, its
  width in even ones, and none is rounded back past where its move started.
- **Measure around the commit, in one task.** `transact` reads every Part
  with all transforms between it and its Body taken off, commits, gives
  each changed Body its Move and writes its first frame so the box keeps
  the size it showed, pins the Parts leaving, and reads the Parts again for
  their share of the same Move. The reads are rect differences, exact to the
  sub-pixel on a rotated, leaning or turning Body.
- **Parts move by 2D translate,** never `translate3d`, and content keeps
  fixed widths, so nothing rewraps as the box grows.

## Considered Options

- A world of bodies, each Body's box held as px values and written by one
  engine ([#1310](https://github.com/clockblocker/texteater/issues/1310)
  design A). It showed no stale frame only while one synchronous writer
  styled every Body, and it can't rest a Body against scrolled content.
- Layout-driven, with Motion's layout projection animating every change of
  form and place (#1310 design C). It needed this design's size offsets to
  really resize and moved Parts on a clock of their own.
- Terms per channel, each with its own curve, beside separate mechanisms
  for the rest of what a Body shows (#1317–#1318): ghost copies of leaving
  Parts on their own fade, a lean steered by pointer events at any time, a
  stacking flag raised while any Term lived. Each had its own clock and
  writer, and together they drew frames no single state described: a Cover
  leaning as it shrank, text over text, a Card over the ones in front of it
  until a spring's invisible tail ended
  ([#1322](https://github.com/clockblocker/texteater/issues/1322)).
- tf-demo's single morph offset ([tf-demo ADR 0012]), which restarts at zero
  on every new place and so drops the hand's velocity.

## Consequences

- A model produces every resting place as a Slot, and every stacking order
  as a Place's z. A Trick's final pose is a real Place that survives a
  resize.
- Gesture code reads Slot rects, or `pose()` to put a Body down exactly
  where it shows. The Table never measures a Body except for its Parts,
  inside `transact`, and the Slots of a crossing each frame.
- The seat is written only when the Body's mode or drawn stacking changes:
  Chrome lays every anchored element out again whenever one of them is
  restyled ([#1312](https://github.com/clockblocker/texteater/issues/1312)).
  The Body inside it carries every offset, and the seat's
  `contain: size layout` keeps the Body's own resize from laying out
  anything else.
- Each Body has its own 3D context with its paint containment on its faces,
  so a turn's lift is never clipped. Light layers are lit only on a leaning
  Body ([#1314](https://github.com/clockblocker/texteater/issues/1314)).

These constraints stand with the decision:

- **Anchor positioning, with no fallback.** Without it a seat falls to its
  static position. tf-demo targets browsers that have it.
- **Regions and Slots are never transformed.** A seat follows its anchor's
  transformed box. In development the Table reports a transformed Region or
  Slot.
- **Every jump the model causes goes through `transact`.** A model change
  committed around it teleports, and in development the Body warns.
- **Every Place has a Slot.** In development the Table reports a missing one
  after every commit.

[tf-demo ADR 0012]: ../../../../app/tf-demo/docs/adr/0012-place-resting-notes-against-their-pane-in-css.md
