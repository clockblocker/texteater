---
status: accepted
---

# Segment text into biggest units, and break multiword Lemmas down apart

Segmentation serves two tasks: route a click or hover to the biggest semantic
unit that contains the clicked piece, and let a multiword Lemma's Note drill
down to its Lexemes ([ADR 0041](../../../../docs/adr/0041-record-in-dumling-only-what-routing-and-drill-down-consume.md)).
Each language implements one segmenter per task. Morpheme segmentation is out
of scope.

**`Segment.Text` routes clicks.** It takes a text and returns its pieces and
its units. A piece is what a reader can click, a split fused word included
(`i` and `m` of `im`). A unit is the pieces that route to one biggest unit,
discontinuous ones included (`[fängt, an]`, `[hat, den, Faden, verloren]`),
with its route: language, Family and Kind. Every piece belongs to exactly one
unit. A unit whose route falls below the language's confidence line is
`Unresolved`: hover still groups its pieces, and a click shows only the text,
with Correct available. Foreign and unanalyzable material has a route of its
own. Only the biggest units are returned. An inner layer may travel with them
as an optional hint when a lab run shows it improves resolution; nothing may
depend on it.

**Closed-class identity comes from the authored candidates.** When a piece's
spelling realizes authored DET, PRON or AUX members, its identity is chosen
among those candidates, never classified first and located by features
afterwards. A spelling that lists no candidate on a Closed Route is an
observable Catalog Miss (system ADR 0021). This rule comes from ADR 0005,
where the candidate choice beat the route vote on closed-class Kinds.

**A click does not classify.** It resolves the Surface features, the Canonical
Form, the Reading and Knowledge of a unit whose route segmentation already
chose, and propagates them.

**`Segment.Unit` breaks down Locutions and Sayings.** It runs once per
multiword Lemma, on the Lemma's wording and the sentence that created it, and
returns the same shape as `Segment.Text` one level down: it never returns the
whole Lemma as one unit. Its pieces resolve through the click path. Drill-down
from a Lexeme to its preposition, article, auxiliary or reflexive is read from
model data and needs no segmenter.

A language's implementation may use any linguistic vocabulary that helps its
judge, Member Roles and fixedness included, as long as it stays inside the
implementation and out of the output.

## Considered Options

- `string → string[]`. Rejected: it cannot express discontinuous units or a
  word split between two units.
- Two layers in one call, Lexeme Targets under Phraseme Targets (ADR 0006).
  Rejected: task 1 needs only the biggest unit, and a second layer duplicates
  `Segment.Unit`.
- A route distribution handed to the click. Rejected: it puts classification
  back on the click path.
- One route always, the most probable. Rejected: a confidently wrong Note
  teaches something false; `Unresolved` costs one Correct.
- One segmenter for every multi-piece unit. Rejected: prepositions, articles,
  auxiliaries and reflexives are already in model data.

## Consequences

- Supersedes [ADR 0005](./0005-intake-owns-segments-and-analysis-targets.md)
  and [ADR 0006](./0006-segment-in-two-layers-lexeme-targets-and-phraseme-targets.md):
  intake owns pieces and biggest units, not two layers of targets with
  masses, and keeps ADR 0005's closed-class identity rule.
- dumspec sentence records are `Segment.Text` gold, their No Target entries
  `Unresolved`; Breakdown Records are `Segment.Unit` gold.
- Implemented by the segmentation rewrite, which also decides the role and
  judgment vocabulary each language uses.
