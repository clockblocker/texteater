# Intake-owned units

The contract behind Dumgen ADR 0005: what intake produces for a sentence,
what a click reads, what the corpora carry, and where the production effort
starts. Terms are the Dumgen glossary's.

## The Segmented Sentence

```ts
type SegmentedSentence = {
  id: string;
  language: "de" | "en" | "he";
  stitchedText: string;
  segments: Segment[];        // concatenated, they give stitchedText back
  targets: AnalysisTarget[];  // a flat partition of the ResolvableText Segments
  fusions: Fusion[];          // listed once, components point at Segments
};

type Segment = { offset: number; kind: SegmentKind; text: string; surface: string };

type AnalysisTarget = {
  members: { offset: number; role: MemberRole }[];  // ordered by offset
  routeMass: Record<Kind | "Unresolved", number>;   // bare Kinds, no Family
  identity: {                                        // only when the head enumerates candidates
    candidates: IdentityCandidate[];                 // headword groups
    mass: Record<CandidateKey | "NoMatch" | "Unresolved", number>;
  } | null;
};

type MemberRole =
  | "Head" | "SeparableParticle" | "GovernedPreposition" | "Reflexive"
  | "Expletive" | "Article" | "Auxiliary" | "Unresolved";

type IdentityCandidate = {
  key: `${"DET" | "PRON" | "AUX"}:${headword}:${pronType | ""}`;
  kind: "DET" | "PRON" | "AUX";
  headword: string;
  pronType: string | null;
  cells: string[];        // the authored cells behind the group
  definition: string;
};

type Fusion = {
  offset: number;
  form: string;
  components: { offset: number; span: string; surface: string; role: string }[];
};
```

The offset is the persisted occurrence coordinate. A rule change may re-split
a word and shift Segment indices; offsets into the same Stitched Text do not
move. The lab's emitted shape is `prototypes/intake/segmented-sentence.ts`.

Invariants enforced in code, never asked:

- Every ResolvableText Segment belongs to exactly one target; targets do not
  nest. A word intake cannot place is a singleton whose Route Mass is
  `{ Unresolved: 1 }`.
- A NOUN target keeps at most one article, and it opens the phrase.
- A fused word never joins a group as a whole. Its adposition component is a
  singleton ADP target; its article component joins the next NOUN target
  that has no article, with role Article (ADR 0024). An unattached fused
  article is a DET singleton.
- An abbreviation is one Segment; its surface is the expansion from the
  fusion table, and its whole-unit Kind is the expansion's.
- `Free` is not a role: a singleton's only member is its Head.

## The Resolution Selector

One pure function per policy version, versioned with the code, scored by the
lab. Given a target:

- Route: the argmax of the Route Mass. `Unresolved` can win. Family follows
  from the Kind.
- Identity State of the head: Selected when a candidate key wins the
  Identity Mass; Open when `NoMatch` wins or the route is open-class with no
  candidates; Unresolved when `Unresolved` wins; Miss when the route is
  DET or PRON and no candidate exists.
- Identity State of a non-head: Derived. Its identity comes from the head:
  the article's DET Lemma and surface by agreement (ADR 0024); the
  auxiliary's AUX Reading from the head's form and the other auxiliaries
  (rules in `prototypes/intake/derive-aux.ts`); particle, governed
  preposition, reflexive and expletive project the head's lexical Core
  Features.
- Identity implies route: a Selected head's Kind replaces the vote for a
  singleton target.

## The intake call, German

One jev call per sentence (chunked at 220 questions), state is the tagged
sentence plus `targetCriteria`:

| questions | count for n resolvable Segments | answer used as |
| --- | --- | --- |
| membership Choice from every anchor | n(n-1) | symmetrized Include mass, connected components at tau 0.6 |
| route Choice over the extended inventory | n | Route Mass, summed per group |
| role Choice | n | Member Role value |
| identity Choice over authored members, cell rubric | one per Segment with candidates | Identity Mass, summed per headword group |

Cost, measured: 9.4k input tokens per sentence for membership and route,
plus 1.1k for identity and 2.4k for roles; p50 about 360 ms per call; 2.7
clicks break even against 3.5k tokens per click today. The 28-occurrence
sentence needs 5 chunked calls; `pairwise` membership is the trade if intake
latency ever matters.

English and Hebrew: Segment production only (fusion and clitic tables for
English, the bounded prefix enumeration for Hebrew from #492). Their
membership, route and identity questions are not authored; every
ResolvableText Segment is a singleton target favouring Unresolved until they
are.

## The click contract

Decided on [#494](https://github.com/clockblocker/texteater/issues/494).

- A click selects the Analysis Target containing the clicked Segment. A
  click on a non-head member selects the same target as the head.
- Grammar features (case, number, gender, tense, mood, the `sein` plus
  participle fork) run at click for the clicked target only. Intake stops at
  segmentation, membership, roles, Route Mass and closed-class identity.
- Selected: the authored Reading and Knowledge show with zero calls; the
  Surface sheet costs one grammar call.
- Derived: reached from the head target's Surface explanation, zero calls.
- Open: one grammar call, then the Luna fan-out; the classification call is
  gone.
- Miss and Unresolved: today's path unchanged. A Miss is also an observable
  Catalog Miss, reported per spelling.

## Corpora and evaluation

Decided on [#495](https://github.com/clockblocker/texteater/issues/495).

- Sentence gold is keyed by offset in the Segmented Sentence shape: targets
  with members `{ offset, role? }`, a Kind, and for closed-class heads the
  headword group `Kind:headword`. Roles are scored only where authored.
  The lab's `fixtures/sentences.ts` is the first such corpus; the 508
  classification click cases keep scoring as probes into the sentence.
- Closed-class classification gold carries the authored member id only
  through the lemma corpora, which the lab already turns into sentences; the
  click corpus is not duplicated.
- Held-out split: tau 0.6 was chosen on the 206 evaluation clicks. The
  authoring cases (`--scope all`, 292 sentences) are the held-out set for the
  threshold; report both before the number is quoted again.
- Sub-unit gold (a DET inside a NOUN target, a VERB inside an idiom) is not
  authored: targets do not nest, and Derived members are reached from the
  head, so there is nothing to score below the target.
- Evaluation Run: the lab's sentence scoring becomes a Promptsmith operation
  experiment (`runOperationExperiment`) whose cases are Segmented Sentences
  with offset gold and whose executor is the intake call; the manifest
  fingerprints the corpus and the effective jev settings so the numbers the
  ADR quotes can be rerun. This is the first task of the production effort.
- Applied: the coordinating-conjunction gold for `bzw.` carries the dot
  inside the member, as the Segment does. Classification cases for
  `z.B.`, `d.h.`, `usw.` (mid-sentence and sentence-final), `u.a.`, `o.Ä.`,
  `z.T.`, `v.a.`, `sowie`, `und zwar`, `Dipl.-Ing.` and their expansions
  (28 clicks); grammar cases with a Variant Surface for each abbreviated
  form and a multi-member Canonical Surface for each written-out form (14
  ADV, 3 CCONJ, 1 NOUN). A fused `zum` in `zum Beispiel` is one member with
  Standard orthography until the Dumling schema carries Fused; the case
  migrates then. `Dipl.-Ing.` and `o.Ä.` were added to the segmenter and the
  abbreviation table. tf-demo's sentence splitter keeps a sentence-internal
  abbreviation or an ordinal with what follows it and still splits after a
  sentence-final `usw.` before a capital.

## Boundary of the production effort

In scope for the follow-on: the intake orchestration calling the sentence
questions and persisting the Segmented Sentence in Convex; Attestation
Membership keyed by offset with Fused orthography; the reader's tones for
Identity States; the Evaluation Run; migration of Fusion-Lemma Attestations;
Convex hop cost measured with the authored catalog behind the identity
candidates; live latency per Identity State.

Out of scope: Luna prompt changes, Closed Route activation policy (map 223),
PRON and DET population authoring (map 236), Hebrew beyond the prefix
enumeration, speculative Luna prefetch, the morpheme level, one call per text
for language and stitching.

## Playground findings

Reviewed on 2026-09-21 ([#496](https://github.com/clockblocker/texteater/issues/496)):
accepted as built, no change to the contract requested. What the fixtures
show wrong is membership, not the contract: an idiom split into verb and
noun phrase, an adjunct preposition grouped with its noun, a
Funktionsverbgefüge taking free arguments, a weekday voted PROPN leaving a
fused article unattached. These are `targetCriteria` and corpus questions
for the production effort.
