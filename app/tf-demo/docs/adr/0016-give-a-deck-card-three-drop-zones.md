---
status: accepted
---

# Give a Deck Card three drop zones

Dragging a Card off its Deck picks it up, and it has exactly three places
to go. Which one is read from where the hand is headed: the travel so far
plus the throw still in it, measured from where the press started. A
release does what the Card showed just before it.

- **Back on the Deck**: anywhere within the commit distance (88 px) of the
  start. Let go there, the Card springs back to its slot.
- **Dismiss zone**: past the commit distance toward inline-start or down.
  Let go there, the whole Deck is swept. A quick flick toward either end of
  the line is in the dismiss zone too, however short its travel. The Deck
  flies off the way the flick went, and toward inline-start otherwise.
- **Expand zone**: past the commit distance toward inline-end or up. Let go
  there, the Card is Expanded to a Cover over its Deck.

When the hand reaches past the line in two directions at once, the longer
reach decides.

A double-click on a Card, two taps on it within 500 ms, also Expands it.
Its first tap brings the Card to the front, as a single tap does, and the
second Expands it.

The preview shows the zone before the release. Every Card of a Deck that
would be swept has a red border, and a Card in hand also dims. A Card that
would Expand has a blue border, and a ghost of its Cover appears. A Card
headed back on the Deck shows neither.

A drag that starts toward inline-start swipes the whole Deck: every Card
follows the hand, the one under it in front. Carried past the commit
distance, the Deck is in the dismiss zone, however far or slowly it goes.
Pulled about 48 px off that line, up or down, or back past its start, the
Card tears loose. The Deck springs back without it, and the Card is in hand,
headed for whichever zone the hand reaches.
A drag that starts any other way puts the Card in hand at once.

A Card carried sideways leans the way it goes. It turns 1° per 16 px of
travel, at most 20°, counter-clockwise to the left and clockwise to the
right. A swiped Deck leans with it. Under reduced motion nothing leans, and
every zone still does what it shows.

Directions follow the text's inline direction ([tf-demo ADR 0008]): in
Hebrew the dismiss zone is to the right and the expand zone to the left. The
lean follows the physical travel.

The keyboard's Lift offers the same three destinations, in the order back,
dismiss, expand.

## Considered Options

- **Down expands, like up.** Rejected once tried: pulling a Card down,
  away from the text, reads as putting the Deck away, and up toward the
  text as opening the Card.

- **Separate commit lines on a Card that stays on its Deck.** Swipe
  outcomes would have their own thresholds, rubber-banded until a line.
  Rejected because the reader expects to pick up a Card and drop it
  somewhere. Three zones keep the drop and give each gesture a place.
- **A flick toward inline-end Expands**, mirroring the slow drag. Rejected
  because a flick is a throw-away motion in either direction. Expanding
  calls for a deliberate carry, and a hand that stops before the release
  is read as a carry, not a flick.
- **A slow carry far toward inline-start lets the Card go to spawn a Pane
  there.** This was the old rule, with a let-go point at 240 px. Rejected
  because a long drag left now means dismiss, and splits are parked
  ([tf-demo ADR 0013]).

## Consequences

- A Card carried off its Deck no longer reads the Pane's drop regions. It
  can't open as a Cover in another Pane or spawn a Floating Pane from an
  edge. To do either, Expand it, then lift the Cover by its Heading. A
  Sheet lifted by its bar and a fresh Card lifted from a Segment or a Link
  still read the drop regions and edges, under [tf-demo ADR 0008] and
  [tf-demo ADR 0013].
- A Sweep has one more trigger, the dismiss zone, beside a dismissive
  click and Escape. A Card can be swept away downward as well as toward
  inline-start.

[tf-demo ADR 0008]: ./0008-give-every-pane-a-ground-beneath-its-covers.md
[tf-demo ADR 0013]: ./0013-park-splits-and-show-one-pane-at-every-width.md
