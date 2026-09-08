# react-resizable-panels Context

This battery owns workspace presentation terminology. It manages placement and
form for opaque Subjects; an application owns what a Subject means and how it
renders.

## Language

**Subject**:
A value presented in a workspace. The battery treats it as opaque.

**Presentation**:
One stable workspace instance of a Subject. It keeps its identity, reading
state, and originating Card Layer as it changes form. More than one
Presentation may show the same Subject.

**Card**:
The compact form of a Presentation. A Card may rest in a Card Layer or be held
during a Lift.

**Sheet**:
The expanded form of a Presentation in a Pane.
_Avoid_: Layer, View

**Pane**:
A resizable workspace region containing a layered arrangement of
Presentations.
_Avoid_: panel, docking region

**Sheet Stack**:
The ordered Sheets in one Pane, from bottom to top. A covered Sheet remains in
the stack and retains its context.

**Card Layer**:
The ordered Cards opened from one Presentation. It retains membership and
order while a member is held or expanded as a Sheet.
_Avoid_: Card Stack, modal overlay

**Card Tail**:
The exposed lower portion of an occluded Card. It identifies the Card and
provides its lift handle.

**Locked Sheet**:
A Sheet protected from Collapse. It may still be covered.
_Avoid_: pinned Note, locked Pane

**Active Pane**:
The Pane receiving pane-scoped commands.

**Held Card**:
A Presentation in Card form during a Lift. It has one visible Card body and a
gesture checkpoint that records the state to restore on cancellation.

**Open**:
Create a Presentation or Card Layer from an interaction with a Subject.

**Lift**:
Begin a provisional gesture for a Presentation in Card form. Its resting body
and shadow leave their previous position.

**Expand**:
Settle a Held Card as a Sheet while retaining its Card Layer membership.

**Collapse**:
Return a Sheet to Card form in its retained Card Layer, revealing the
composition it covered.

**Move**:
Change a Presentation's placement. Moving and changing form are separate
operations, even when one gesture does both.

**Close**:
Explicitly dismiss a Presentation or Card Layer.

**Cancel gesture**:
Restore the workspace state recorded at the start of the active Lift.
