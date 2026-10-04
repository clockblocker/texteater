---
status: accepted
---

# Give every Pane a Ground beneath its Covers

Each Pane holds one Sheet Stack. Its bottom Sheet is the Ground, which the
Pane keeps for as long as it exists; every Sheet above the Ground is a Cover.
Protection comes from position: nothing removes the Ground by covering it or by
going back, and it leaves only when lifted on purpose. Locked Sheets are
retired, and Library Sheet and Text Sheet with them: the Library is a Menu
Item, and a Text is a Ground's selection. The terms were decided under
Wayfinder map #473 (#474–#484) and prototyped as Compass in tf-demo's
deck-models playground.

**Ground line.** The Ground's content walks a line, bottom rung first. A Rooted
Pane's line starts at the Menu, then a Menu Item, then that item's selection:
in tf-demo, Menu › Library › Text. Going back on the Ground (←) steps one rung
down the line and ends the Deck of the rung it leaves. Once a selection is on
the Ground, only going back or a lift changes it. Dropping a Held Card on a
Pane's side edge makes a Floating Pane whose Ground is the dropped Note or
Text, with no rung below it. Its bar shows X in place of ←, and X closes the
Pane with its Covers and its Deck. A Pane's kind belongs to its line, by
whether the line contains the Menu, and not to what the Ground shows. A Rooted
Pane may be spawned empty, at its Menu.

**Covers.** Following a Link pushes a Cover in the same Pane. Each push is a
fresh Presentation, even when that Note is already open here or in another
Pane, so the Sheet Stack is the path taken, and going back retraces it one
Sheet at a time. There is no forward history. Go to source is a Link like any
other: it pushes the source Text as a Cover scrolled to the Sentence with the
Segment lit. It closes no Cover and never touches the Ground. Going back on a
Cover collapses it when it still has a Card in a live Deck and closes it
otherwise. A Cover that arrived by Link never had a Card, so going back closes
it.

**Decks.** A click on a Segment, in a Text or in a Source Context inside a
Note, deals a Deck to the Sheet it was clicked in, Ground or Cover. A Sheet
holds at most one Deck, and a new selection in that Sheet replaces it.
Covering a Sheet hides its Deck and going back reveals it. A Deck whose Cards
have all been lifted away is empty but still live. A Deck ends in exactly two
ways: its Sheet leaves (a Cover closes, or the Ground steps down its line), or
a Sweep on its Sheet while that Sheet is on top. A Sweep is one action with
several triggers, among them a dismissive click on the Sheet away from any
Link or Segment, and Escape. A Deck is live while the Sheet that dealt it is in
its stack and the Deck has not been swept or replaced since. X on a Floating
Pane collapses its Ground Note back to its Card when that Card's Deck is live
and closes it otherwise. Individual Cards are no longer dismissed from a Deck.

**Lifting and spawning.** Dragging a Segment or a Link lifts a fresh Held Card
from the pointer; dragging is the only way to spawn a Pane. A drop inside a
Pane makes a Cover there, a drop on a Pane's side edge makes a Floating Pane
beside it, and a drop back where the Card came from cancels. A Floating Ground
lifts by a plain drag, and its Pane closes behind it. A Rooted Ground lifts by
a press of about one second; its Pane stays and steps one rung down, so a
lifted Text leaves the Library showing. [tf-demo ADR 0006] decides which
element is the handle in each form.

The Ground line does not bring back the fixed Navigation Anchor that
[tf-demo ADR 0003] rejected. A Rooted Pane can be spawned at any time, so the
Menu stays reachable without a central Pane.

## Considered Options

- An Obsidian-style leaf holding one Sheet with back and forward history, and
  a hybrid in which following replaces the top Sheet unless it is protected.
  Obsidian's behaviour survives only in where a spawned Pane lands, never in
  replacing a Sheet in place (#474).
- Menu Items as Locked Sheets with the Text as the first Cover. This
  contradicts the Ground being the Text. A Menu in the initial Pane only was
  rejected, and so was a moved Note as a Cover over a fresh Ground at the Menu
  (#475).
- A Floating Pane that stays at a Menu when its Ground is lifted away, and a
  Ground that cannot be lifted (#480).
- Bringing an already open Cover to the top would close the Covers above it,
  which going back never reveals. Focusing another Pane that already holds the
  Note would move focus away from where the reader is looking (#483).
- For Go to source: popping the Covers to the Ground and reselecting is a jump
  the stack makes nowhere else, and it needs a second rule for other Texts.
  Highlighting the Ground beneath the Covers is invisible (#484).
- A Link dealing a one-Card Deck was a detour, since a Link names one Note
  (#476).

## Consequences

- The Card Layer is retired. A Card's place is its rank in the Deck that dealt
  it. Opening it as a Cover does not move it, and collapsing returns it to the
  same slot.
- [tf-demo ADR 0003] keeps its single URL and Workspace Persistence. The
  Library and Texts it opens sit on a Rooted Pane's Ground line.

[tf-demo ADR 0003]: ./0003-make-the-workspace-own-navigation.md
[tf-demo ADR 0006]: ./0006-render-a-note-presentation-as-one-element-of-blocks.md
