---
status: accepted
---

# Rest Bodies in CSS Slots and move them by Terms that decay to nothing

Everything the reader can see standing still is CSS. Each Region holds
invisible Slots, laid out by ordinary CSS in the Region's own size. A Body
fills an invisible seat that sits on the Slot its Place names through
`anchor()` and `anchor-size()`, and reads its Place's rotation, scale,
stacking order and side from custom properties. The browser resolves the
Region, its Slots and their seats in one layout pass. A window resize, a
zoom, a sidebar transition or a Split drag therefore never draws a Body in
its Region's old box, not even for a frame.

The Table never says where a Body is. It holds only how far the Body still
is from its rest, as Terms: per-channel offsets (box, rotation, lift,
stacking order, turn, opacity) that decay to nothing. A Body shows its rest
plus its live Terms. At rest it has none, and nothing is written on it. A
new rest adds a Term instead of replacing a value, so position and velocity
stay continuous through every retarget. The box's Terms sit inside `calc()`
beside the seat's size, so a growing Body really resizes and its content
reflows; it is never scaled. One frame loop writes the Terms, at each
frame's own timestamp. React writes the rest, as custom properties the
stylesheet reads. While a Body moves, the Table writes its flight straight
on the Body's own `translate`, `rotate`, `scale`, `opacity`, width and
height, composed with its rest, on its seat's `z-index`, its Parts'
`translate` and its shell's `transform`, and takes each off as its Terms
end. It never writes a custom property once a frame: a change of one
restyles every element of the Body's faces, which cost about 0.1 ms a
Card a frame and, at 52 Cards on a CPU slowed four times, took Shuffle
from 58 to 45 frames a second
([#1318](https://github.com/clockblocker/texteater/issues/1318)).

A Term is its delta times its curve's share, which runs from 1 to 0, and a
curve says nothing about a channel or a distance. Every Term one Move adds
shares one curve object and one birth: the box's place and size, its
Parts' offsets and the tilt it lets go of. They ride one progress, so the
edges never drift apart and a Part never slides against the box (#1311
rule 1). Only a Trick's scripted path keeps a curve per channel, since its
waypoints differ.

Who starts a Move decides its style
([#1309](https://github.com/clockblocker/texteater/issues/1309) Q2):

- **The hand.** A release springs to the new rest on one line, with the
  part of the hand's speed aimed at the rest as its rate. It replaces the
  Body's Terms and starts on the last frame painted, where the hand last
  showed the Body. A hand faster than the spring can take without passing
  the rest lands on a critically damped spring of its own rate, so the
  Body keeps the hand's speed and still never passes its rest.
- **The app on a spring.** A reflow or a change of form adds Terms that
  cancel the jump in rest. The Terms already running keep running, so
  position and speed stay continuous. A Part's offsets add the same way.
- **The app on a tween.** A Trick, a deal or a turn is a fixed tween with
  deck-of-cards' timing, whose waypoints are offsets from the final rest.
  It replaces the Body's Terms. Tricks queue as deck-of-cards' do: each is
  made only when its turn comes, from the Deck as it is then, and starts
  in the frame the one before it lands, when its last move ends; a turn
  it cues after that plays on. A Trick played at once cuts in on whatever
  plays or waits instead.

An app-started Move's clock starts only once the frame that paints its
commit has painted, one frame in: that frame is the slowest of the move,
and a clock already running would spend it, so the first visible step
would jump. A queued Trick is committed inside the frame the one before it
lands, which paints it, and its clock is born at that frame, so a chain
keeps the library's rhythm however long its commits take; deck-of-cards'
curve starts slowly, so a slow commit frame costs its first step little.
Reduced motion is one rewrite of the Terms a change adds: a
dissolve past 24 px, a brief tween below it, and a flat crossfade for the
turn. The app's "Always play animations" overrides it.

[#1311](https://github.com/clockblocker/texteater/issues/1311) found what
makes a growing Card feel jittery or like jelly, and these rules hold for
every Body and Part:

- **No overshoot.** Every spring a box rides is damped at ζ ≥ 0.97, and a
  0→1 progress ends within 1e-4 of its way, so no channel snaps at its end.
- **Snapping relative to the rest.** The box's place, its height and every
  Part's offset are written in whole device pixels from their rest, its
  width in even ones, and none is rounded back past where its move
  started. The Body keeps its rest's sub-pixel phase on every frame, so its
  text holds still against its edges.
- **Measure around the commit, in one task.** `transact` reads every Part
  with all transforms between it and its Body taken off, commits, writes
  each changed Body's first frame so the box keeps the size it showed, and
  reads again. The reads are rect differences, exact to the sub-pixel,
  even on a rotated, tilted or turning Body. A Body with no Parts is never
  restyled for a read.
- **Parts move by 2D translate,** never `translate3d`, and content keeps
  fixed widths, so nothing rewraps as the box grows.
- **Where two Parts cross, one goes on top.** An app's skin makes it
  opaque, inside the face's isolated stacking context.

## Considered Options

- A world of bodies, each Body's box held as px values and written by one
  engine ([#1310](https://github.com/clockblocker/texteater/issues/1310)
  design A). It showed no stale frame only while one synchronous writer
  styled every Body; any deferred write showed them. It also can't rest a
  Body against scrolled content.
- Layout-driven, with Motion's layout projection animating every change of
  form and place (#1310 design C). It needed this design's size Terms to
  really resize, a grab mid-move reached into a Motion internal, and it
  moves Parts on a clock of their own.
- A curve per channel, each Term on its own spring. Motion's rest
  thresholds scale with distance, so a Body's width and height end frames
  apart, and a Part follows only a copy of the box's curve.
- tf-demo's single morph offset ([tf-demo ADR 0012]), which restarts at zero
  on every new place and so drops the hand's velocity.

## Consequences

- A model produces every resting place as a Slot. A Deck's poses (pile, fan,
  grid, row) are Slots, so a Trick's final pose is a real Place that survives
  a resize.
- Gesture code reads Slot rects. The Table never measures a Body except
  for its Parts, inside `transact`.
- The seat is written only when the Body's stacking order or mode changes,
  on its `z-index` and, held or leaving, its px box.
  Chrome lays every anchored element out again whenever any one of them is
  restyled, so a per-frame write on the anchored element cost layout for
  every Body on the Table ([#1312](https://github.com/clockblocker/texteater/issues/1312)).
  The Body inside it carries every offset instead, and the seat's
  `contain: size layout` keeps the Body's own resize from laying out
  anything else. A held or leaving Body's seat stands on a fixed px box,
  and the hand moves the Body from it. The Table skips any write that would
  set what is already there.
- Each Body has its own 3D context with its paint containment on its faces,
  so a turn's lift is never clipped. Its stacking order stays raised through
  a move the hand or a morph started.
- A Tilt is its own layer with its own writer: the Body's `transform`,
  written only while it tilts, follows the pointer on a spring, and its
  Glares are lit on that Body alone
  ([#1314](https://github.com/clockblocker/texteater/issues/1314)). A change
  of rest never touches it, and a move of the box lets it go on the move's
  own progress.

These constraints stand with the decision:

- **Anchor positioning, with no fallback.** Without it a seat falls to its
  static position. tf-demo targets browsers that have it, Baseline since
  early 2026.
- **Regions and Slots are never transformed.** A seat follows its anchor's
  transformed box, so a transformed Region would drag its Bodies by its
  bounding box. In development the Table reports a transformed Region or
  Slot.
- **Every jump the model causes goes through `transact`.** A model change
  committed around it teleports, and in development the Body warns.
- **Every Place has a Slot.** A Body whose Slot is missing falls to its
  static position. In development the Table reports it after every commit.

[tf-demo ADR 0012]: ../../../../app/tf-demo/docs/adr/0012-place-resting-notes-against-their-pane-in-css.md
