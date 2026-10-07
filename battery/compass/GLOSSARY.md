# Compass

This battery owns workspace presentation terminology. It manages placement and
form for opaque Subjects; an application owns what a Subject means and how it
renders. [tf-demo ADR 0008] holds the precise rules for Panes, Grounds, Covers
and Decks.

## Language

**Subject**:
A value presented in a workspace. The battery treats it as opaque.

**Presentation**:
One stable workspace instance of a Subject, which keeps its identity as it
changes form. Every Open makes a fresh one.

**Card**:
The compact form of a Presentation, resting in a Deck or held during a Lift.

**Sheet**:
The expanded form of a Presentation in a Pane: the Pane's Ground or one of its
Covers.
_Avoid_: Layer, View

**Pane**:
A resizable workspace region holding one Sheet Stack and the Decks its Sheets
dealt. A Pane is Rooted or Floating.
_Avoid_: panel, docking region

**Split**:
The layout primitive that divides a space between Split Regions along one
axis and lets the reader resize them.
_Avoid_: Group, panel group

**Split Region**:
One part of a Split's space, which a Pane occupies.
_Avoid_: panel

**Split Handle**:
The control between two Split Regions that resizes them.
_Avoid_: separator, divider

**Sheet Stack**:
The Sheets in one Pane, from the Ground up through its Covers: the path the
reader took.

**Ground**:
The bottom Sheet of a Pane, which the Pane keeps for as long as it exists.
Short for Ground Sheet.
_Avoid_: Locked Sheet, base layer

**Cover**:
Any Sheet above the Ground in the same Pane. Short for Cover Sheet.

**Ground line**:
The rungs a Ground's content walks, bottom first.

**Menu**:
The first rung of a Rooted Pane's Ground line, listing the application's Menu
Items.

**Menu Item**:
A rung after the Menu whose selection becomes the Ground's content.

**Rooted Pane**:
A Pane whose Ground line starts at the Menu. Its content is the Rooted
Ground.

**Floating Pane**:
A Pane made by an Expand on a Pane's side edge, whose Ground has no rung
below it. Its content is the Floating Ground.

**Deck**:
The ordered Cards dealt from one Sheet, Ground or Cover. A Sheet holds at most
one Deck. A Deck is live until its Sheet leaves, a Sweep ends it or a new
deal replaces it.
_Avoid_: Card Layer, Card Stack, pile, modal overlay

**Card Tail**:
The exposed lower portion of an occluded Card, which identifies it and
provides its lift handle.

**Active Pane**:
The Pane receiving pane-scoped commands.

**Held Card**:
A Presentation in Card form during a Lift.

**Open**:
Create a Presentation from an interaction with a Subject: deal it into a
Deck, push it as a Cover, or lift it as a fresh Held Card.

**Lift**:
Begin a provisional gesture that holds a Presentation as a Held Card.

**Expand**:
Settle a Held Card as a Sheet: a Cover, or the Ground of a new Floating Pane.
_Avoid_: Move

**Collapse**:
Return a Sheet to Card form in its slot in a live Deck.

**Close**:
Explicitly dismiss a Presentation, or a Floating Pane with its Covers and
Deck.

**Sweep**:
End the Deck of the top Sheet.
_Avoid_: dismiss a Card

**Back**:
The control that goes back one step: it collapses or closes a Cover, or steps
the Ground line down.

**Cancel gesture**:
Restore the workspace state recorded at the start of the active Lift.

[tf-demo ADR 0008]: ../../app/tf-demo/docs/adr/0008-give-every-pane-a-ground-beneath-its-covers.md
