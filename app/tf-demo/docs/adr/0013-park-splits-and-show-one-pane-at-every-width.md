---
status: accepted
---

# Park splits and show one Pane at every width

Splits are parked: turned off, with their code kept. tf-demo shows one Pane
at every width, and nothing a reader does spawns a second one. The rule that
[tf-demo ADR 0008] gives narrow screens now holds at every width. A Pane has
no side edges to drop on. A Held Card dropped anywhere in the Pane under its
bar opens as a Cover there, and a Presentation that would have become a
Floating Pane's Ground opens as a Cover instead. The keyboard's Lift offers
no edges either. The playground's control for spawning an empty Rooted Pane
is hidden.

Width still decides placement. Below `md` a Cover fills its Pane and the
Deck takes its narrow place; above it, Covers and the Deck keep their wide
placement. Only the Pane count is the same at every width.

A saved workspace with more than one Pane comes back as one Pane: the
Active Pane when it is Rooted, otherwise the first Rooted Pane, so the Menu
stays reachable. The other Panes are dropped with their Covers and Decks. A
saved layout with no Rooted Pane is discarded.

The Compass battery's Split, Split Handle, Floating Pane and layout-tree
machinery stays, and so do ADR 0008's rules for edge drops, Floating Panes and
X. They apply again once splits are unparked. `SPLITS_PARKED` in
`src/workspace/compass/splits.ts` is the one switch for that.

[tf-demo ADR 0008]: ./0008-give-every-pane-a-ground-beneath-its-covers.md
