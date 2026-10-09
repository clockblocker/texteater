---
status: accepted
---

# Segment text into biggest units, and break multiword Lemmas down apart

Segmentation serves two tasks: route a click or hover to the biggest semantic
unit that contains the clicked piece, and let a multiword Lemma's Note drill
down to its Lexemes ([ADR 0041](../../../../docs/adr/0041-judge-dumling-fields-by-the-learner-and-by-classification.md)).
Each language implements one segmenter per task: `segment.inUnits` and
`segment.inLexemes`. The set's third member, `segment.inMorphemes`, is named
but out of scope. Splitting a text into paragraphs and Sentences happens
above the segmenters and is not their concern.

**`segment.inUnits` routes clicks.** It owes consistent grouping first, not a
perfect route ([ADR 0008](./0008-judge-segment-in-units-by-membership-before-route.md)).
It takes a text already split into paragraphs and Sentences and returns each
Sentence's pieces and its units. A piece is what a reader can click, a split
fused word included (`i` and `m` of `im`). A unit is the pieces that route to
one biggest unit, discontinuous ones included (`[fängt, an]`,
`[hat, den, Faden, verloren]`), with its route: language, Family and Kind. A
unit normally carries one route. When the segmenter cannot decide between
the Kinds of one known clash set, a small set of Kinds that often clash such
as ADJ and VERB or NOUN and PROPN, the unit may carry those routes as
variants, its route first. Variants never reach outside one clash set. Its
grouping stays fixed either way.
Every piece belongs to exactly one unit. A unit whose route falls below the
language's confidence line is `Unresolved`: hover still groups its pieces,
and a click shows only the text, with Correct available. Foreign and
unanalyzable material has a route of its own. Only the biggest units are
returned. An inner layer may travel with them as an optional hint when a lab
run shows it improves resolution; nothing may depend on it.

**Closed-class identity comes from the authored candidates.** When a piece's
spelling realizes authored DET, PRON or AUX members, its identity is chosen
among those candidates, never classified first and located by features
afterwards. A spelling that lists no candidate on a Closed Route is an
observable Catalog Miss (system ADR 0021). In the intake lab the candidate
choice beat the route vote on closed-class Kinds
([#487](https://github.com/clockblocker/texteater/issues/487)).

**A click settles a variant unit's route with its clash set's own prompt.**
It never regroups the pieces. When the unit carries variants,
`resolve.grammar` runs the focused jev prompt of their clash set, which
judges the exact route by the Rules for that clash; a unit with one route
keeps it. The click then resolves the Surface features, the Canonical Form,
the Reading and Knowledge of that one route, and propagates them. Dumling,
Dumdict and storage only ever see one exact route.

The clash-set prompts are not built yet
([#869](https://github.com/clockblocker/texteater/issues/869)). Until they
are, production `segment.inUnits` emits no variants, a click resolves the
unit's first route, and only the lab and evaluation use variants (ADR 0008,
[#860](https://github.com/clockblocker/texteater/issues/860)).

**`segment.inLexemes` breaks down Locutions and Sayings.** It runs once per
multiword Lemma, on the Lemma's wording and the sentence that created it, and
returns the same shape as `segment.inUnits` one level down: it never returns the
whole Lemma as one unit. Its pieces resolve through the click path. Drill-down
from a Lexeme to its preposition, article, auxiliary or reflexive is read from
model data and needs no segmenter.

A language's implementation may use any linguistic vocabulary that helps its
judge, Member Roles and fixedness included, as long as it stays inside the
implementation and out of the output.

## Considered Options

- `string → string[]`. Rejected: it cannot express discontinuous units or a
  word split between two units.
- Two layers in one call, Lexeme Targets under Phraseme Targets.
  Rejected: task 1 needs only the biggest unit, and a second layer duplicates
  `segment.inLexemes`.
- A route distribution handed to the click. Rejected: it puts open
  classification back on the click path.
- One generic click-time prompt that picks among any unit's variants.
  Rejected: seeing only the variants, it scored 64.6 percent acceptable on
  the variant units, against 70.8 percent for taking the first route, and
  won only on NOUN or PROPN and ADV or PART
  ([#760](https://github.com/clockblocker/texteater/issues/760)). A prompt
  per clash set judges by that clash's Rules instead.
- One route always, the most probable. Rejected: a confidently wrong Note
  teaches something false; `Unresolved` costs one Correct.
- One segmenter for every multi-piece unit. Rejected: prepositions, articles,
  auxiliaries and reflexives are already in model data.

## Consequences

- Intake owns pieces and biggest units, not two layers of targets with
  masses, roles and a Resolution Selector.
- dumcorpus sentence records are `segment.inUnits` gold, their No Target
  entries `Unresolved`; Breakdown Records are `segment.inLexemes` gold.
- Implemented by the segmentation rewrite, which also decides the role and
  judgment vocabulary each language uses.
