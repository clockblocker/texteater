---
status: accepted
---

# Judge `segment.inUnits` by membership first, and tolerate route misses between disputed Kinds

A learner needs the Segments of one unit grouped together, and grouped the
same way every time they meet the construction. Whether `eben` is PART or ADV,
`also` CCONJ or ADV, or adverbial `schnell` ADJ or ADV matters much less to
them. The route matters mainly for which Lemma a unit's occurrences are stored
under, and the UI will reconcile Readings and Lemmas across these Kinds. How
it does that is out of scope here.

The lab measurements show where the errors are. On the frozen dev benchmark
(gold hash `90c1afa7a4df706d`, three repetitions), the candidates v3 policy
got 611 of 5,319 unit-repetitions wrong on grouping and 357 wrong on route
alone. Given gold grouping, routing reaches 90 to 93 percent across prompt
variants. For the candidates4 run (`final-1_closed-1`, policy
`step0+saying+maxim@0.7+closed`), 107 of its 309 route errors are confusions
between the five Kind pairs below; tolerating them, 95.8 percent of correctly
grouped units get an acceptable route, against 93.6 percent strict. The runs
are in
`battery/dumgen/evidence/segment-in-units-lab/`.

**Membership is the primary measure.** A unit is right when its Segment set
exactly matches gold, whatever its route.

**Consistency is second.** The same construction is grouped the same way
across sentences and across repeated runs.

**Route accuracy is secondary and tolerant.** Confusing PART with ADV, CCONJ
with ADV, adverbial ADJ with ADV, NOUN with PROPN, or PRON with DET is an
acceptable miss. Other route errors still count.

## Consequences

- Evaluation reports membership accuracy as the headline, beside a
  consistency measure and a route score that tolerates these confusions. The
  exact unit match, grouping and route together, stops being the headline.
- Pipeline effort goes to membership before routing.
- Gold work that only settles a route between these Kinds does not block
  `segment.inUnits` evaluation. Gold work that decides membership does.
- A unit normally carries one route. In a borderline case it may carry a few
  route variants, and the click picks one
  ([ADR 0007](./0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md),
  amended 2026-09-30). A route counts as right when gold is among the
  variants. Evaluation also reports how often units carry variants and how
  many, so that returning variants can't replace deciding. The closed-class
  identity rule stands.

Decided by the user on 2026-09-30 during the segmentation rewrite
([#701](https://github.com/clockblocker/texteater/issues/701)), on the map
[#595](https://github.com/clockblocker/texteater/issues/595).
