# Tabletop

This battery owns the physical layer's terms: where each Presentation rests on
the Table and how it travels between rests. A Presentation, a Pane and a Deck
keep their [Compass](../compass/GLOSSARY.md) meanings. [ADR 0001] holds the
precise rules.

## Language

**Table**:
The surface every Region and Body sits on, with one clock for everything that
moves on it.
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
held in the hand, or leaving for good.
_Avoid_: card element, sprite, node

**Term**:
One offset from a Body's rest that decays to nothing. A Body shows its rest
plus its live Terms; a Body at rest has none.
_Avoid_: animation, tween, delta

**Move**:
How a Body travels to its next Place, its box and its Parts on one progress.
Its source decides its style: a Move the hand starts carries the hand's speed,
and a Move the app starts plays at a fixed timing.
_Avoid_: transition

**Shell**:
A Body's two sides, front and back, which turn over together about the Body's
own axis.
_Avoid_: card faces, flipper

**Part**:
A piece of a Body's face that keeps its identity across forms and travels to
its new place when the form changes.
_Avoid_: child, fragment

**Tilt**:
A Body's lean toward the pointer over it, about its own two axes, with a glare
lit on that Body alone. Only the Body under the pointer or in the hand tilts,
and nothing tilts under reduced motion.
_Avoid_: hover effect, parallax

**Trick**:
A scripted Move for a Deck: a new order and Places for its Cards, and the
waypoints each Card passes on the way. A waypoint is never a Place.
_Avoid_: animation, choreography

[ADR 0001]: ./docs/adr/0001-rest-bodies-in-css-slots-and-move-them-by-decaying-terms.md
