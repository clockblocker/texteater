# Tabletop

This battery owns the physical layer's terms: where each Presentation rests on
the Table and how it travels between rests. A Presentation, a Pane and a Deck
keep their [Compass](../compass/GLOSSARY.md) meanings. [ADR 0001] holds the
precise rules.

## Language

**Table**:
The surface every Region and Body sits on, with one clock for everything that
moves on it and one writer for everything a Body shows.
_Avoid_: stage, world, scene

**Region**:
A place on the Table that Presentations rest in, such as a Pane. A Region is
never a Body: it holds Slots and never moves on its own.
_Avoid_: container, zone

**Slot**:
An invisible box in a Region where one Body rests. Every Place names exactly
one.
_Avoid_: anchor, frame, cell

**Place**:
Where a Presentation rests: its Slot, its rotation about the Slot's centre, its
scale, its stacking order, the side that faces up and its form. Anything the
reader can see standing still is a Place.
_Avoid_: spot, position, target

**Body**:
A Presentation's one element on the Table, in every form: resting in its Place,
held in the hand, or leaving for good. It shows its rest plus its live Moves.
_Avoid_: card element, sprite, node

**Move**:
One change of a Body's form, place, pose or stacking, whole: it starts from
what the Body shows, ends exactly at its rest, and everything it changes rides
its one progress. Its source decides its style: a Move the hand starts carries
the hand's speed, and one the app starts plays at a fixed timing.
_Avoid_: animation, transition, tween

**Term**:
One offset of a Move from the Body's rest, on one channel, whose share follows
the Move's progress to nothing.
_Avoid_: delta, value

**Crossing**:
The part of a Move that changes a Body's stacking against the Bodies around
it: each one whose order flips comes to show over it, or stops showing over
it, on the Move's progress, never in one frame.
_Avoid_: z flag, raise

**Shell**:
A Body's two sides, front and back, which turn over together about the Body's
own axis.
_Avoid_: card faces, flipper

**Part**:
A piece of a Body's face that keeps its identity across forms. It travels to
its new place when the form changes; one only a form has arrives or leaves
with that form, as the same element.
_Avoid_: child, fragment, ghost

**Tilt**:
A Body's lean toward the pointer over it, about its own two axes, with a glare
lit on that Body alone. Only a Body at rest or in the hand leans, and nothing
leans under reduced motion. A Move lets the lean go.
_Avoid_: hover effect, parallax

**Hand pose**:
How a Body looks while the hand holds it: lifted and upright, or as it was.
_Avoid_: drag style

**Trick**:
A scripted Move for a Deck: a new order and Places for its Cards, and the
waypoints each Card passes on the way. A waypoint is never a Place. Tricks
queue: each starts as the one before it lands.
_Avoid_: choreography

[ADR 0001]: ./docs/adr/0001-rest-bodies-in-css-slots-and-move-them-by-decaying-terms.md
