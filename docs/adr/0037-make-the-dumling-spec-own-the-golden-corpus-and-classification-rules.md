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
sentence-analysis cases are projected from records, as ADR 0002 in Dumgen
projected prompt representations from its Canonical Classification Corpus.
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

This supersedes [Dumgen ADR 0002](../../battery/dumgen/docs/adr/0002-use-one-canonical-classification-corpus-across-prompt-representations.md)
and amends [ADR 0021](./0021-make-dumgen-own-authored-content-and-route-closure.md):
the Fixed Catalog and its authored Knowledge stay in Dumgen; evaluation gold
moves to `dumspec`.

## Considered Options

- The spec renders a curated subset of Dumgen's corpus. Rejected: the spec
  stays a view, and its pages stay empty wherever no one curates.
- The spec also owns Knowledge, emoji and translation gold. Rejected: those are
  Dumrel and Dumgen concepts, not Dumling values.
- A target may be Classified only, without an Attestation. Rejected in favour of
  one uniform target, at the cost of drafting and reviewing the classification
  cases before they move.
- Spec rules double as prompt text. Rejected: prompt tuning would churn the
  public rules and re-open every citing record.
- `isVerified` with reviewer and date. Rejected: a one-time flag is what went
  stale.
- Records as TypeScript with `satisfies`. Rejected: over 1,500 large literal
  types cost type-check time, and coverage and the guards need runtime
  validation anyway.
