# Compass Context

This battery owns workspace presentation terminology. It manages placement and
form for opaque Subjects; an application owns what a Subject means and how it
renders. [tf-demo ADR 0008] holds the precise rules for Panes, Grounds, Covers
and Decks.

## Language

**Subject**:
A value presented in a workspace. The battery treats it as opaque.

**Presentation**:
One stable workspace instance of a Subject. It keeps its identity, reading
state, and its slot in the Deck that dealt it as it changes form. Every Open
makes a fresh Presentation, so more than one may show the same Subject.

**Card**:
The compact form of a Presentation. A Card may rest in a Deck or be held
during a Lift.

**Sheet**:
The expanded form of a Presentation in a Pane: the Pane's Ground or one of its
Covers.
_Avoid_: Layer, View

**Pane**:
A resizable workspace region holding one Sheet Stack and the Decks its Sheets
dealt. A Pane is Rooted or Floating, by its Ground line.
_Avoid_: panel, docking region

**Split**:
The layout primitive that divides a space between Split Regions along one
axis and lets the reader resize them. A split in the Pane layout renders as a
Split. It holds no Sheets or Decks; Panes do.
_Avoid_: Group, panel group

**Split Region**:
One part of a Split's space. A Pane occupies a Split Region: the region is the
space and its size, the Pane is what the workspace keeps in it.
_Avoid_: panel

**Split Handle**:
The control between two Split Regions that resizes them by pointer drag or
arrow keys. Its first Split Region is the inline-start one, on the right under
right-to-left text.
_Avoid_: separator, divider

**Sheet Stack**:
The Sheets in one Pane, from the Ground up through its Covers. It is the path
the reader took, and going back retraces it one Sheet at a time. A covered
Sheet keeps its Deck, scroll, and context.

**Ground**:
The bottom Sheet of a Pane, which the Pane keeps for as long as it exists.
Covers hide it without removing it, and going back steps its Ground line;
only a Lift moves its content out. Short for Ground Sheet.
_Avoid_: Locked Sheet, base layer

**Cover**:
Any Sheet above the Ground in the same Pane. An Open that pushes, or an
Expand inside a Pane, makes one. Short for Cover Sheet.

**Ground line**:
The rungs a Ground's content walks, bottom first. A Rooted Pane's line runs
Menu › Menu Item › that item's selection. Going back on the Ground steps one
rung down and ends the Deck of the rung it leaves.

**Menu**:
The first rung of a Rooted Pane's Ground line, listing the application's Menu
Items.

**Menu Item**:
A rung after the Menu whose selection becomes the Ground's content.

**Rooted Pane**:
A Pane whose Ground line starts at the Menu, so going back on its Ground
steps down to the Menu. It may be spawned empty, at its Menu. Its content, the
Rooted Ground, lifts by a long press, and the Pane steps one rung down.

**Floating Pane**:
A Pane made by an Expand on a Pane's inline-start or inline-end edge. Its
Ground is the dropped Presentation, with no rung below, so its bar shows X in
place of Back. X closes the Pane. Its content, the Floating Ground, lifts by
a plain drag, and the Pane closes behind it.

**Deck**:
The ordered Cards dealt from one Sheet, Ground or Cover. A Sheet holds at most
one Deck, and a new deal replaces it. Covering hides it; it ends only when its
Sheet leaves or on a Sweep.
A Deck is live while its Sheet is in the stack and the Deck has not been swept
or replaced.
_Avoid_: Card Layer, Card Stack, pile, modal overlay

**Card Tail**:
The exposed lower portion of an occluded Card. It identifies the Card and
provides its lift handle.

**Active Pane**:
The Pane receiving pane-scoped commands.

**Held Card**:
A Presentation in Card form during a Lift.

**Open**:
Create a Presentation from an interaction with a Subject: deal it into a
Deck, push it as a Cover, or lift it as a fresh Held Card.

**Lift**:
Begin a provisional gesture that holds a Presentation as a Held Card: a Card
from its Deck, a Cover, a Ground, or a fresh Presentation dragged out of a
Sheet.

**Expand**:
Settle a Held Card as a Sheet: as a Cover when dropped inside a Pane, or as
the Ground of a new Floating Pane when dropped on a Pane's inline-start or
inline-end edge. It keeps
its slot in the Deck that dealt it. Moving a Sheet is a Lift followed by an
Expand.
_Avoid_: Move

**Collapse**:
Return a Sheet to Card form in its slot in a live Deck, revealing what it
covered. Going back on a Cover collapses it when it still has such a slot.

**Close**:
Explicitly dismiss a Presentation, or a Floating Pane with its Covers and
Deck. Going back on a Cover with no slot in a live Deck closes it.

**Sweep**:
End the Deck of the top Sheet. It is one action with three triggers: a
dismissive click on the Sheet, Escape, and a fast swipe toward inline-start on
any of its Cards.
_Avoid_: dismiss a Card

**Back**:
The control that goes back one step: it collapses or closes a Cover, or steps
the Ground line down. It points toward inline-start, ← in left-to-right text
and → in right-to-left text.

**Cancel gesture**:
Restore the workspace state recorded at the start of the active Lift.

[tf-demo ADR 0008]: ../../app/tf-demo/docs/adr/0008-give-every-pane-a-ground-beneath-its-covers.md
