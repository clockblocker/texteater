# Intake-owned units

The contract behind Dumgen ADR 0005 and ADR 0006: what intake produces for a
sentence, what a click reads, what the corpora carry, and what the host
stores. Terms are the Dumgen glossary's.

## The Sentence Analysis

`analyzeSentence({ sentence })` takes one accepted German Segmented Sentence
and returns its Sentence Analysis. The input keeps the frozen shape (`id`,
`language`, `segments` of kind and text); the analysis is the intake-owned
value beside it.

```ts
type SentenceAnalysis = {
  sentenceId: string;
  language: "de";
  stitchedText: string;
  segments: AnalyzedSegment[];   // concatenated, they give stitchedText back
  targets: LexemeTarget[];       // the Lexeme layer: a flat partition of the ResolvableText Segments
  phrasemes: PhrasemeTarget[];   // the Phraseme layer: a partition of a subset of targets
  fusions: Fusion[];             // listed once, components point at Segments
  government: Government[];      // one per governed preposition (ADR 0030)
};

type AnalyzedSegment = { offset: number; kind: SegmentKind; text: string; surface: string };

type LexemeTarget = {
  id: string;
  members: { offset: number; role: MemberRole }[];  // ordered by offset, exactly one Head
  routeMass: Record<LexemeKind | "Unresolved", number>;
  identity: {                                        // only when the head enumerates candidates
    candidates: IdentityCandidate[];                 // headword groups
    mass: Record<CandidateKey | "NoMatch" | "Unresolved", number>;
  } | null;
  provenance: string;
};

type PhrasemeTarget = {
  id: string;
  members: LexemeTarget["id"][];                     // words, never Segments; ordered by first offset
  kindMass: Record<PhrasemeKind | "None" | "Unresolved", number>;
  fixedness: number;                                 // mean Score, 0 free to 3 fixed expression
  provenance: string;
};

type MemberRole =
  | "Head" | "SeparableParticle" | "GovernedPreposition" | "Reflexive"
  | "Expletive" | "Article" | "Auxiliary" | "Unresolved";

type Fusion = {
  offset: number;
  form: string;
  components: { offset: number; span: string; surface: string; role: string }[];
};

type Government = {
  offset: number;                  // the preposition, fused adposition or pronominal adverb Segment
  preposition: GovernablePreposition;  // its ADP headword: `auf` for darauf, `von` for vom
  case: "Acc" | "Dat" | "Gen";     // fixed by the ADP Lemma, else the vote
  governor: LexemeTarget["id"];
};
```

The offset is the persisted occurrence coordinate. A rule change may re-split
a word and shift Segment indices; offsets into the same Stitched Text do not
move. Types are exported from `dumgen/types`; the module is
`src/concrete-lang/de/sentence-analysis/`.

Invariants enforced in code, never asked:

- Every ResolvableText Segment belongs to exactly one Lexeme Target. A word
  intake cannot place is a singleton whose Route Mass is `{ Unresolved: 1 }`.
- A Lexeme Target has exactly one Head. A group the matrix glued around two
  Heads is split at them; a non-head follows the Head it scored the higher
  Include with, and a verbal role landing on a non-VERB Head, or an Article
  on a non-NOUN Head, becomes a singleton.
- A NOUN target keeps at most one article, and it opens the phrase.
- A fused word never joins a group as a whole, whatever the matrix said about
  the source word. Its adposition component is a singleton ADP target; its
  article component joins the next NOUN target that has no article, with
  role Article (system ADR 0032). An unattached fused article is a DET singleton.
- An abbreviation is one Segment; its surface is the expansion from the
  fusion table.
- A Phraseme Target's members are words, projected by Head from the pair
  answers, and it has at least two. The fixedness Score establishes it: only
  a word whose own Score is at or above 1.5 is linked by the pair answers, so
  fixed neighbours never carry a free word in. The Kind Choice only names
  it. A word belongs to at most one Phraseme.
- The governor vote is summed per word (`nimmt` and `teil` vote together)
  and the word reaching 0.6 governs. Without one, a preposition the Lexeme
  layer made a verb's `GovernedPreposition` member is governed by that verb.
  A preposition voted to govern itself and a two-way preposition whose case
  vote is Unresolved yield no Government.

## The Resolution Selector

One pure function per policy version, shipped with the package (`dumgen`
exports), scored by the sentence corpus. Given a Lexeme Target:

- Route: the argmax of the Route Mass. `Unresolved` can win. Family follows
  from the Kind.
- Identity State of the head: Selected when a candidate key wins the
  Identity Mass; Open when `NoMatch` wins or the route is open-class with no
  candidates; Unresolved when `Unresolved` wins; Miss when the route is
  DET or PRON and no candidate exists.
- Identity State of a non-head: Derived. Its identity comes from the head:
  the article's DET cell from the noun's case, number, gender and
  definiteness (system ADR 0032); the
  auxiliary's AUX Reading from the head's form and the other auxiliaries;
  particle, governed preposition, reflexive and expletive project the head's
  lexical Core Features.
- Identity implies route: a Selected head's Kind replaces the vote for a
  singleton target.

Given a Phraseme Target: `None` below the fixedness floor, else the best
named Kind of the Kind Mass; `Unresolved` only when no Kind has mass.

Given an offset: `largestOf` is the Phraseme containing the word when there
is one, else the word; `resolvedUnitAt` is that unit's Family, Kind and
Segment span, or null when it is Unresolved or `None`, or when the word's
head Identity State is Miss.

Given a unit's offsets: `governedPrepositionsAt` lists the preposition and
case of every Government whose governor has a member among them, so a
Phraseme reaches its member words' government. The host requests the
`valency` Knowledge aspect only when this list holds a preposition and case
the Reading's Valency Frame lacks; each becomes an Optional Preposition Slot
with no model call.

## The intake call, German

One jev call per sentence (chunked at 220 questions), state is the tagged
sentence plus two rule fields: `criteria` (the realization rules, the
shipped `targetCriteria` minus its Phraseme and Fusion sentences) and
`fixedness` (the fixedness rules). A sentence with a governable preposition
adds a third, `government` (which word selects a preposition, with the
adjunct, particle and connective exclusions).

| questions | count for n resolvable Segments | answer used as |
| --- | --- | --- |
| membership Choice from every anchor, under `criteria` | n(n-1) | symmetrized Include mass, connected components at tau 0.6 |
| route Choice over the Lexeme inventory | n | Route Mass, summed per group |
| role Choice | n | Member Role value |
| identity Choice over authored members, cell rubric | one per Segment with candidates | Identity Mass, summed per headword group |
| fixedness Score, under `fixedness` | n | mean per expression |
| Phraseme Kind Choice | n | Kind Mass, summed per expression |
| same-expression Noul per unordered pair | n(n-1)/2 | components over Heads at 0.5 |
| governor Choice over the other occurrences plus None, under `government` | one per Segment realizing a governable preposition | mass summed per word, governor at 0.6 |
| case Choice Acc/Dat | one per two-way preposition among those | argmax, Unresolved drops the Government |

Cost, measured: 16.2k input tokens per sentence, p50 about 370 ms per call;
the 28-occurrence sentence needs several chunked calls.

English and Hebrew: not analysed; `analyzeSentence` accepts German only.

## The click contract

- A click selects the largest unit containing the clicked Segment: the
  Phraseme when the word is a fixed member of one, else the word. A click on
  a non-head member selects the same unit as the head.
- The host maps the clicked stored Segment to its offset range and reads
  `resolvedUnitAt`. A resolved unit becomes the Analysis Target for
  Grammatical Resolution with no classification call; a stored Segment is a
  member when every analysed Segment inside it belongs to the unit, so a
  fused `zur` stays outside the NOUN whose article is its `r` and inside the
  Collocation that covers both.
- Null (Unresolved route, Miss identity, `None` Phraseme, no analysis)
  falls back to `classifyTarget`, today's path.
- Grammar features run at click for the clicked unit only. Selected shows
  the authored Reading and Knowledge with zero calls; Derived is reached from
  the head; Open pays one grammar call, then the Luna fan-out.

## Corpora and evaluation

- Sentence gold is keyed by offset (`sentence-analysis/de`, source
  `src/concrete-lang/de/sentence-analysis/source-data.json`): Lexeme
  Targets with members `{ offset, role? }`, a Kind, and for closed-class
  heads the headword group `Kind:headword`; Phraseme Targets as a Kind and
  the head offsets of their member words; Government as the preposition's
  offset, its headword, its case and the offsets of the words that may
  govern it. Roles are scored only where authored, and a layer a case leaves
  out is not scored: the `sentence-de-government-*` cases score government
  alone. The scorer (`scoreAnalysis`) reports members found, route, roles,
  identity, Phrasemes found and correct, extra Phrasemes, and government
  correct and extra; `contractPass` is all of them right and nothing extra.
- The click corpus keeps scoring per click; its support-verb sentences are
  Collocation (ADR 0028) and its fused-word sentences ADP (ADR 0027).
- Held-out split: tau 0.6 was chosen on the evaluation clicks. The authoring
  cases (`--scope all`) are the held-out set for the threshold.
- The evaluation is the production operation: `bun cli/evaluate.ts
  --experiment sentence-analysis/de --revision <rev>` runs `analyzeSentence`
  on every sentence and records the run with the corpus fingerprint and the
  effective jev settings. First run, 2026-09-21: 16 sentences, 7 strict
  passes; the misses are `früh`/`spät` routed ADV, `usw.` and a typo routed
  X, code-switched words routed as German, and one article left off a
  genitive noun.
- Government, 2026-09-23, 35 sentences, three runs: 13 of 14 gold
  Governments right and no false positive in each. The miss is the case of
  `an` with an accusative complement (`erinnert sich an seinen Bruder` read
  as dative, 0.54 to 0.68). Membership matched a run without the government
  questions: 74 to 75 of 80 members against 75, route and roles equal.

## The host

tf-demo runs `analyzeSentence` at intake for every accepted German sentence,
stores the analysis beside the sentence, reads it at selection time, and
strips it with the other derived analysis. Attestation Membership stays keyed
by stored Segment index; the offset migration and Fused orthography are the
remaining production items, with the Convex hop cost of the authored
candidates and live latency per Identity State.

## Playground

`/playground/lattice/<sentence id>` renders tf-demo's `lattice.json`,
emitted by the production operation for the 16 corpus sentences, through the
package's Resolution Selector: a click lights up the largest unit, a
Phraseme's panel lists its member words and descends to each, a word's panel
ascends to its Phraseme. Re-emit with `bun prototypes/intake/fixtures.ts
<output path>`.
