---
status: accepted
---

# Make the Dumling spec own the golden corpus and classification rules

The public Dumling spec was mostly placeholders: 36 of 42 German entity pages
were a bare title, English and Hebrew had no concept pages, and 200 of 259
examples were linked from no page. The examples it did have drifted: 151
German examples were marked verified, yet many contradicted accepted ADRs,
because nothing reopened a verification when a later ADR changed the rules.
Meanwhile Dumgen held about 1,750 German gold cases and the prose rulebook its
prompts use, and shared no sentence with the spec. Two sources of truth
disagreed, and the one the pipeline was scored against was not public.

A new published battery, `dumspec`, now owns the gold and the rules. Dumgen and
`app/dumling-docs` depend on it; neither owns it.

**Records.** A Spec Record is one sentence stored as one JSON file, validated
against a record schema built from Dumling's JSON Schema. Its path is its id.
It holds:

- the sentence and its Segments;
- its targets, each a full Dumling Attestation. A target is never only a
  Family and Kind;
- `noTarget` entries, each a Segment with the authored reason it has no
  defensible route (a suspended-compound fragment without a right conjunct,
  unintelligible text);
- `coverage: Full | Partial`. Full means every ResolvableText Segment is in
  exactly one target or one `noTarget` entry;
- `status: Draft | Reviewed`;
- `sources`: the ADRs and Rules the annotation depends on;
- `provenance`: `Authored`, or `Quoted { work, author, year }`;
- per-target notes: the rationale and known mistakes.

**Rules.** `dumspec` owns the classification rules as entries: an id, a
statement written for people, the ADRs it rests on, the routes it applies to,
and the records that show it, minimal pairs included. Dumgen's prompt
paragraphs stay in Dumgen and cite the rule ids they implement. The prompt is
Dumgen's implementation; whether it obeys the spec is decided by the eval,
not by shared wording.

**Guards.** `bun test` in `dumspec` enforces:

1. Stale citation. A Reviewed record or a Dumgen prompt paragraph that cites a
   superseded ADR, or a Rule changed since it was reviewed, fails. An ADR that
   changes classification re-reviews the records it touches in the same
   change.
2. Mechanical rules. Strict `parseUnit`, the Grundform check, member order in
   the sentence, and coverage.
3. Eval disagreement. Dumgen's `evaluate` reports each case where the pipeline
   disagrees with a Reviewed record as a review item, because either the model
   or the record is wrong.

**Projections.** Dumgen's target-classification, grammatical-resolution and
sentence-analysis cases are projected from records, as Dumgen once projected
its prompt representations from one Canonical Classification Corpus.
Classification cases come from every Segment of a Full record and from each
target of a Partial one; `noTarget` entries project to `Unresolved`. Dumgen
keeps a sidecar keyed by record id for its demo/eval split, slices and
contamination keys. Knowledge, relation, emoji, translation and segmentation
gold stay in Dumgen, because they are not Dumling values.

**Pages.** Each language × Family × Kind route page and each feature page is
generated from `dumspec` and the Dumling schemas: the route's Rules, its Core
and Inflectional features, and every record attesting it, Reviewed first and
records with archaic Surfaces last. A check fails when a schema route lacks a
page or a page lacks a route. Hand-written pages remain for concept prose.
Every record is published.

**Migration.** Dumgen's grammatical-resolution cases enter as Reviewed Partial
records, their existing `sources` serving as citations. The docs examples in
every language enter as Draft, and `isVerified` is removed. The 1845
Struwwelpeter verse stays, quoted with its provenance, and its review marks
archaic Surfaces `historicalStatus: Archaic`. Target-classification cases
carry only Family, Kind and members, so Dumgen drafts their Attestations and a
person reviews them in batches: demos, the participle-boundary slice and the
evaluation slice first. The remaining cases each get a keep-or-retire
decision. Until the last batch lands, a check fails for any case id found in
neither the old corpus nor the spec.

This replaced Dumgen's Canonical Classification Corpus (its former ADR 0002)
and moves evaluation gold out of Dumgen. The Fixed Catalog stayed in Dumgen
until the amendment below.

Amended on 2026-09-27: `dumspec` owns all gold, and a Draft may fail the
current model.

`dumspec` also owns the Knowledge gold (Semantic Relations, Valency Frames,
translations), the Reading Emoji Description gold for generating a description
and for resolving one as Reuse or New, and the text-intake gold. This reverses
the rejected option below and the Projections rule that kept this gold in
Dumgen. Relations, frames, translations and Emoji Descriptions are Dumrel and
Reading values, and they belong to the model now being settled (map
[#595](https://github.com/clockblocker/texteater/issues/595)). One reviewable
place for all gold beats two. Adjudications, which are verdicts on outputs a
run generated, the demo and evaluation sidecars, and run evidence stay with
Dumgen's eval.

The model is changing, so a record's Review Status no longer implies it is
valid:

- A Draft may fail validation against the current model. `bun test` lists each
  such Draft with its failing checks as a worklist and does not fail. The
  loader and the pages leave it out until it passes. A Reviewed record must
  pass.
- A model change that breaks Reviewed records demotes them to Draft by script
  (`bun run demote-broken-reviewed`) instead of migrating them. The Drafts are
  reshaped to the new model later, in one pass, and a person reviews them
  after that.
- An imported case keeps its payload verbatim in the record's `legacy` list:
  its source file, its case id and the case as it was, with its input, ideal
  output, explanation and sources. It stays there until it is reshaped into
  typed fields: an Attestation, and later Reading Knowledge on the target. A
  record holding one is always on the worklist.
- Intake gold is raw text, not a sentence, so each raw text enters as a Text
  Record under `records/text/`, keyed by the text.

The target-classification and sentence-analysis cases no record held entered
the same way, with every other remaining case in Dumgen, so drafting and
reviewing their Attestations moves into that pass. Their Dumgen projections
wait for the pipeline rewrite against `dumspec`.

Amended on 2026-09-27 with [ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumspec.md):
`dumspec` also owns the Authored Inventories, the closed-class units authored
instead of generated, with their Reading Knowledge. They live apart from
`records/`, because they are the model's content, not gold a run is scored
against. The package roles follow: Dumling is the model's types and schemas;
`dumspec` connects the model to reality through gold, Rules and authored
units, and is meant to become part of the Dumling docs; Dumgen is a pipeline
that reads them. `bun test` parses every authored Lemma and Reading with
`parseUnit`, every Reading's Knowledge with Dumrel, and checks it against the
route's Knowledge policy.

Amended on 2026-09-29: a target's typed Reading Knowledge lives on
`reading.knowledge`, in Dumrel's Reading Knowledge schema. The loader checks it
with Dumrel against the target's Reading and, where Dumrel has one, the
route's Knowledge policy. `legacy` keeps an imported Knowledge payload only
until it is converted there
([#700](https://github.com/clockblocker/texteater/issues/700)).

Amended on 2026-09-29: a Rule states a principle: what decides, in a few
sentences, with at most one example of the core case. Boundary cases are
records, linked from the Rule, whose rationale says in a line or two why the
principle lands where it does. A new boundary case adds a record, not a
clause. A Rule is reworded only when the principle itself changes, since every
rewording reopens the Reviewed records that cite it. `bun test` warns about a
statement over 600 characters unless the Rule states why it needs the length.

Amended on 2026-09-29: records are reviewed one Annotation Layer at a time
([#736](https://github.com/clockblocker/texteater/issues/736); one Review
Depth per record was ruled on 2026-09-29, and the rest awaits the maintainer's
rulings). `segment.inUnits` is scored only on each target's members
and route, yet a Reviewed record had to carry a full Attestation and an Emoji
Description for every word, and a model change to one Attestation feature
demoted the whole record.

- A sentence or Breakdown Record's annotation has four layers, each resting
  on the ones before it: Segmentation (each target's member Segments and
  route, the No Target entries and the coverage), Attestation (each target's
  Attestation and Grundform verdict), Reading (each target's Emoji
  Description) and Knowledge (each Reading's Knowledge). A Reading names an
  Attestation's Lemma, so no layer can be reviewed before the ones it rests
  on.
- `status` gives way to `reviewDepth`, the deepest layer a person has
  reviewed; a record without one is a Draft. A Text Record is still Draft or
  Reviewed as a whole.
- Each target states its route (Family and Kind) beside its members, and the
  Attestation's Lemma must match it. Segmentation is then checked, reviewed
  and projected without the Attestation, and redrafting a Draft Attestation
  cannot change a reviewed route. A target may hold its members and route
  alone while its record is reviewed no deeper than Segmentation. This
  reverses the rejected option "a target may be Classified only" for the
  layers not yet reviewed.
- A reviewed layer must pass and be complete. A layer past the depth may
  fail or be missing, and its issues go on the worklist instead of failing.
  Missing Knowledge is not work until a record is reviewed through Knowledge.
- `loadSpecSegmentations` returns every record whose Segmentation passes.
  `loadSpecRecords` returns those whose Attestation layer passes too, each
  target with the Reading and Knowledge that pass. The pages publish
  Attestations, so they read the second and count a record as Reviewed once
  its Attestation layer is.
- `bun run demote-broken-reviewed` lowers a broken record's depth to the
  deepest layer that still passes. A stale citation still reopens the whole
  record, because Rules are not assigned to layers.
- Each Dumgen stage takes its gold from the records reviewed through the
  layer it outputs: `segment.inUnits` from Segmentation, resolution from
  Attestation, the Reading call from Reading, the Knowledge call from
  Knowledge.

## Considered Options

- The spec renders a curated subset of Dumgen's corpus. Rejected: the spec
  stays a view, and its pages stay empty wherever no one curates.
- The spec also owns Knowledge, emoji and translation gold. Rejected: those are
  Dumrel and Dumgen concepts, not Dumling values. Reversed by the 2026-09-27
  amendment.
- A target may be Classified only, without an Attestation. Rejected in favour of
  one uniform target, at the cost of drafting and reviewing the classification
  cases before they move. Reversed by the 2026-09-29 layered-review amendment
  for records reviewed no deeper than Segmentation.
- An independent review status per Annotation Layer. Rejected on 2026-09-29
  (#736): it can state an impossible combination, such as a reviewed Reading
  over an unreviewed Segmentation. A `segmentationReviewed` flag was rejected
  with it, because it serves one stage and leaves the later layers sharing
  one status, and so were lighter route-only records allowed only in Draft,
  because a Draft never counts as gold.
- Spec rules double as prompt text. Rejected: prompt tuning would churn the
  public rules and re-open every citing record.
- `isVerified` with reviewer and date. Rejected: a one-time flag is what went
  stale.
- Records as TypeScript with `satisfies`. Rejected: over 1,500 large literal
  types cost type-check time, and coverage and the guards need runtime
  validation anyway.
