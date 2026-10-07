---
status: accepted
---

# Make dumcorpus own the golden corpus and classification rules

The public Dumling spec was mostly placeholders: 36 of 42 German entity pages
were a bare title, English and Hebrew had no concept pages, and 200 of 259
examples were linked from no page. The examples it did have drifted: 151
German examples were marked verified, yet many contradicted accepted ADRs,
because nothing reopened a verification when a later ADR changed the rules.
Meanwhile Dumgen held about 1,750 German gold cases and the prose rulebook its
prompts use, and shared no sentence with the spec. Two sources of truth
disagreed, and the one the pipeline was scored against was not public.

A published battery, `dumcorpus`, owns all gold and the classification
Rules. Dumgen and `app/dumling-docs` depend on it; neither owns it. Besides
the Spec Records, the gold covers Knowledge (Semantic Relations, Valency
Frames, translations), the Reading Emoji Description gold for generating a
description and for resolving one as Reuse or New, and the text-intake gold.
Relations, frames, translations and Emoji Descriptions are Dumrel and Reading
values and belong to the model, and one reviewable place for all gold beats
two. Adjudications, which are verdicts on outputs a run generated, the demo
and evaluation sidecars, and run evidence stay with Dumgen's eval.

`dumcorpus` also owns the Authored Inventories, the closed-class units
authored instead of generated, with their Reading Knowledge
([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md)
decides them). They live apart from `records/`, because they are the model's
content, not gold a run is scored against. The package roles follow: Dumling
is the model's types and schemas; `dumcorpus` connects the model to reality
through gold, Rules and authored units, and is meant to become part of the
Dumling docs; Dumgen is a pipeline that reads them. `bun run test` parses
every authored Lemma and Reading with `parseUnit`, every Reading's Knowledge
with Dumrel, and checks it against the route's Knowledge policy.

**Records.** A Spec Record is one sentence stored as one JSON file, validated
against a record schema built from Dumling's JSON Schema. Its path is its id.
It holds:

- the sentence and its Segments;
- its targets. Each states its member Segments and its route (Family and
  Kind), and holds a full Dumling Attestation whose Lemma matches that route.
  A target may hold its members and route alone while its record is reviewed
  no deeper than Segmentation;
- `noTarget` entries, each naming one or more Segments, in sentence order, as
  a target names its members, with the authored reason they have no
  defensible route (a suspended-compound fragment without a right conjunct,
  unintelligible text). A nonce noun still owns the article that opens its
  phrase ([ADR 0040](./0040-make-the-article-a-satellite-of-its-phrase-head.md)),
  so *der Blarg* is one No Target entry over `[der, Blarg]`, and hovering
  *der* highlights the unknown word it belongs to;
- `coverage: Full | Partial`. Full means every ResolvableText Segment is in
  exactly one target or one `noTarget` entry;
- `reviewDepth`, described under Review below;
- `sources`: the ADRs and Rules the annotation depends on;
- `provenance`: `Authored`, or `Quoted { work, author, year }`;
- per-target notes: the rationale and known mistakes;
- a target's typed Reading Knowledge on `reading.knowledge`, in Dumrel's
  Reading Knowledge schema. The loader checks it with Dumrel against the
  target's Reading and, where Dumrel has one, the route's Knowledge policy;
- `legacy`: each imported case's payload kept verbatim, with its source file,
  its case id and the case as it was (input, ideal output, explanation and
  sources). It stays there until it is reshaped into typed fields: an
  Attestation, and Reading Knowledge on the target. A record holding one is
  always on the worklist.

Intake gold is raw text, not a sentence, so each raw text is a Text Record
under `records/text/`, keyed by the text. A Text Record is Draft or Reviewed
as a whole, and keeps its imported cases in `legacy` the same way.

**Rules.** `dumcorpus` owns the classification rules as entries: an id, a
statement written for people, the ADRs it rests on, the routes it applies to,
and the records that show it, minimal pairs included. A Rule states a
principle: what decides, in a few sentences, with at most one example of the
core case. Boundary cases are records, linked from the Rule, whose rationale
says in a line or two why the principle lands where it does. A new boundary
case adds a record, not a clause. A Rule is reworded only when the principle
itself changes, since every rewording reopens the Reviewed records that cite
it. `bun run test` warns about a statement over 600 characters unless the
Rule states why it needs the length. Dumgen's prompt paragraphs stay in
Dumgen and cite the rule ids they implement. The prompt is Dumgen's
implementation; whether it obeys dumcorpus's Rules is decided by the eval,
not by shared wording.

**Review.** Records are reviewed one Annotation Layer at a time
([#736](https://github.com/clockblocker/texteater/issues/736)). A sentence or
Breakdown Record's annotation has four layers, each resting on the ones
before it:

1. Segmentation: each target's member Segments and route, the No Target
   entries and the coverage.
2. Attestation: each target's Attestation and Grundform verdict.
3. Reading: each target's Emoji Description.
4. Knowledge: each Reading's Knowledge.

A Reading names an Attestation's Lemma, so no layer can be reviewed before
the ones it rests on. `reviewDepth` is the deepest layer a person has
reviewed; a record without one is a Draft. Because each target states its
route beside its members, Segmentation is checked, reviewed and projected
without the Attestation, and redrafting a Draft Attestation cannot change a
reviewed route.

The model is still changing, so a record need not be valid past its depth:

- A reviewed layer must pass and be complete. A layer past the depth may fail
  or be missing, and its issues go on the worklist instead of failing
  `bun run test`. A Draft may fail validation against the current model; the
  test run lists each such Draft with its failing checks. Missing Knowledge
  is not work until a record is reviewed through Knowledge.
- `loadSpecSegmentations` returns every record whose Segmentation passes.
  `loadSpecRecords` returns those whose Attestation layer passes too, each
  target with the Reading and Knowledge that pass. A record that fails
  is left out until it passes.
- A model change that breaks Reviewed records demotes them by script
  (`bun run demote-broken-reviewed`) instead of migrating them: a broken
  record's depth drops to the deepest layer that still passes. Drafts and
  demoted layers are reshaped to the new model later, in one pass, and a person
  reviews them after that. The pass also drafts and reviews the Attestations
  of the imported cases still held in `legacy`.

**Guards.** `bun run test` in `dumcorpus` enforces:

1. Stale citation. A Reviewed record or a Dumgen prompt paragraph that cites a
   superseded ADR, or a Rule changed since it was reviewed, fails. An ADR that
   changes classification re-reviews the records it touches in the same
   change. A stale citation reopens the whole record, because Rules are not
   assigned to layers.
2. Mechanical rules. Strict `parseUnit`, the Grundform check, member order in
   the sentence, and coverage.
3. Eval disagreement. Dumgen's `evaluate` reports each case where the pipeline
   disagrees with a Reviewed record as a review item, because either the model
   or the record is wrong.

**Projections.** Dumgen's eval cases are projected from records. Each Dumgen
stage takes its gold from the records reviewed through the layer it outputs:
`segment.inUnits` from Segmentation, resolution from Attestation, the Reading
call from Reading, the Knowledge call from Knowledge. Classification cases
come from every Segment of a Full record and from each target of a Partial
one. A No Target entry projects to one `Unresolved` unit over all its
Segments. Dumgen keeps a sidecar keyed by record id for its demo/eval split,
slices and contamination keys.

**Pages.** Each language × Family × Kind route page and each feature page is
generated from `dumcorpus` and the Dumling schemas: the route's Rules, its Core
and Inflectional features, and every record attesting it, Reviewed first and
records with archaic Surfaces last. The pages publish Attestations, so they
read `loadSpecRecords` and count a record as Reviewed once its Attestation
layer is. A check fails when a schema route lacks a page or a page lacks a
route. Hand-written pages remain for concept prose. Every record that passes
is published.

## Considered Options

- The Dumling docs render a curated subset of Dumgen's corpus. Rejected: the
  docs stay a view, and their pages stay empty wherever no one curates.
- Knowledge, emoji and translation gold stay in Dumgen, because they are
  Dumrel and Dumgen concepts, not Dumling values. Rejected: they are Dumrel
  and Reading values in the model, and one reviewable place for all gold
  beats two.
- Every target carries a full Attestation, at every Review Depth. Rejected:
  `segment.inUnits` is scored only on each target's members and route, yet a
  Reviewed record had to carry a full Attestation and an Emoji Description for
  every word, and a model change to one Attestation feature demoted the whole
  record.
- A target may stay Classified only, without an Attestation, in a record
  reviewed through Attestation. Rejected in favour of one uniform target at
  that depth.
- An independent review status per Annotation Layer. Rejected: it can state an
  impossible combination, such as a reviewed Reading over an unreviewed
  Segmentation. A `segmentationReviewed` flag was rejected with it, because it
  serves one stage and leaves the later layers sharing one status, and so
  were lighter route-only records allowed only in Draft, because a Draft never
  counts as gold.
- Rules double as prompt text. Rejected: prompt tuning would churn the public
  Rules and reopen every citing record.
- `isVerified` with reviewer and date. Rejected: a one-time flag is what went
  stale.
- Records as TypeScript with `satisfies`. Rejected: over 1,500 large literal
  types cost type-check time, and coverage and the guards need runtime
  validation anyway.
