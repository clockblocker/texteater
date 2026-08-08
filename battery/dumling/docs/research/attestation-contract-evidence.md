# Attestation contract evidence

Status: fact-finding for [texteater#72][issue-72] under [wayfinder map
#69][issue-69]. This note does not supersede accepted documentation or implement
the migration.

## Verdict

The smallest evidence-backed Dumling interface is a fleeting, hydrated
`Attestation -> Surface -> Lemma` value with:

- a non-empty ordered list of attested member strings, each paired with its own
  `Standard | Typo` judgment;
- `realizationCoverage: "Full" | "Partial"` for this occurrence; and
- one linked `Surface`.

It has no click, Segment, sentence, generated identity, ID codec, or persistence
contract. `markedContext` remains Dumgen-owned context alongside the Attestation,
not inside it. The linked `Surface.normalizedSurface` remains the normalized
attested projection; adding the same string to Attestation would create two
authorities.

This conclusion deliberately preserves the verified Lemma and Surface identity
model. Accepted ADR 0002 fixes Lemma identity and the hydrated grammatical chain,
while the Dumling context fixes Surface identity as language, normalized
contextual form, Surface kind, inflectional features, and Lemma identity
([ADR 0002][adr-0002], [Dumling context][dumling-context]). Existing ID tests
also prove that coverage, spelling, and other Surface metadata do not alter
Surface identity ([Surface ID test][surface-id-test]).

There is one documentation conflict to resolve during implementation: accepted
ADR 0002 still names `Selection`, assigns it click identity, and places coverage
on Surface. Map #69 reverses exactly those occurrence-layer decisions. A new ADR
must explicitly supersede those clauses while preserving ADR 0002's Lemma
decision; this research note cannot silently do that.

## Evidence hierarchy

1. Map #69 supplies the migration's fixed starting decisions: Attestation is
   fleeting, Dumling must not know the click or Segmentation mechanics, coverage
   moves to Attestation, typo evidence stays occurrence-local, and licensed
   spelling stays on Surface ([map #69][issue-69]).
2. Accepted ADR 0002 and the current Dumling context own the grammatical
   topology and identity vocabulary ([ADR 0002][adr-0002], [Dumling
   context][dumling-context]).
3. Runtime schemas, constructors, Dumgen assembly, tests, and checked fixtures
   show which invariants are executable today. Generated documentation and
   classifier notes are supporting evidence; where stale prose disagrees with
   executable values, the executable value wins.

## Field-by-field decision table

| Concern | Evidence | Forced conclusion for this refactor | Validation owner | Genuine human policy? |
| --- | --- | --- | --- | --- |
| Linked `surface` | Every current Selection is hydrated with one Surface, which is hydrated with one Lemma; ADR 0002 fixes that direction ([public types][public-types-selection], [ADR 0002][adr-0002]). | Required, exactly one, hydrated. Do not copy language, Family, Kind, Lemma, or Surface kind beside it. | Dumling validates the concrete Surface schema and its language-specific feature inventory. | No. |
| Ordered attested members | Analysis Target already owns ordered members; Dumgen rejects empty, unordered, duplicate, out-of-bounds, or non-`ResolvableText` membership before constructing Dumling data ([Dumgen target validation][dumgen-implementation]). Multi-part fixtures preserve textual order even when discontinuous ([circumfix fixture][circumfix-fixture], [give-up fixture][give-up-fixture]). | Required as a non-empty ordered list of exact member strings. Indices are projected away before the Dumling seam. | Dumgen proves membership, ordering, Segment kinds, bounds, and exact source projection. Dumling can only prove non-empty list/non-empty string shape. | No. |
| Typo evidence | `gvae up` has one Typo member and one Standard member while both clicks share one canonical Surface ([orthography test][orthography-test], [give-up fixture][give-up-fixture]). Dumgen's model contract already emits one orthography per target member and checks equal cardinality ([Dumgen types][dumgen-types], [Dumgen postcondition][dumgen-postcondition]). | Required **per member**, paired with the member string. Aggregate and clicked-only orthography are insufficient. | Dumgen/model decides linguistic correctness; Dumling validates only the enum and member pairing. | No. |
| `realizationCoverage` | Full discontinuous occurrences include all lexical members despite one click: `gave up` and `ge … t` are Full ([give-up fixture][give-up-doc-fixture], [circumfix fixture][circumfix-fixture]). Partial examples retain only attested material: `heulte mit` for `mit den Wölfen heulen`, and coordinate-ellipse `Kinder` for `Kinderbuch` ([partial test][partial-test], [coordinate-ellipse case][coordinate-ellipse]). Normalization never invents omitted material ([Dumling context][dumling-context]). | Required on Attestation as `Full | Partial`. Full means the occurrence supplies all lexical realization required by the chosen Lemma analysis; Partial means conventional lexical material is absent. Discontinuity, intervening fillers, one clicked member, casing repair, and typo repair do not themselves make it Partial. | Dumling validates the enum. Dumgen's route policy and grammatical resolution validate whether the value is true. | **Yes:** extend the proven examples into a complete cross-Family omission/ellipsis/valency policy. |
| Raw flattened `attestedSurface` | Current Dumgen constructs this from authoritative Segments, inserting a space only when a whitespace Segment occurs between members ([projection code][projection-code]). That relation cannot be reconstructed from bare strings in every possible segmentation, nor checked by Dumling. | Do not make a second caller-supplied string authoritative. The member records are the occurrence evidence. If display needs a flattened projection, Dumgen should expose or derive it beside the Attestation using its Segment aggregate. | Dumgen. | Only if a standalone Attestation must reproduce exact display without Dumgen context; see the human decisions below. |
| Normalized attested projection | Surface identity already includes `normalizedSurface`; it may repair typo/casing but must preserve constituent order and contextual inflection and must not insert missing constituents or substitute the Lemma's Canonical Form ([Dumling context][dumling-context]). The typo fixture maps raw `gvae up` to normalized `gave up` on the shared canonical Surface ([orthography test][orthography-test]). | Keep `surface.normalizedSurface` as the single normalized projection. Do not duplicate `normalizedAttestedSurface` on Attestation. Moving it would reopen fixed Surface identity. | Dumling validates normalized-string shape; Dumgen/grammatical resolution validates the semantic normalization invariant. | No, unless Surface identity is separately reopened, which map #69 excludes. |
| `markedContext` | Dumgen constructs escaped TARGET markup from the complete Segmented Sentence and ordered membership, passes it to the model, and currently returns it alongside Selection rather than inside Selection ([marked-context code][projection-code], [Dumgen result][dumgen-types]). The prompt preflight validates markup mechanics ([marked-context test][marked-context-test]). | Keep it outside Attestation in Dumgen's resolved result. It is resolution context and later Reading input, but Dumling neither constructs nor interprets it. | Dumgen. | Only its lifetime/transport, if consumers need a standalone archival occurrence. |
| Click and Segmentation fields | The current schema can validate integer/order/inclusion shape but explicitly cannot validate bounds, Segment kinds, or source projection; those are segmenter/application facts ([Dumling context][dumling-context], [Selection schema][selection-schema]). Dumgen already performs the stronger validation ([Dumgen target validation][dumgen-implementation]). | Delete `segmentedSentenceId`, `clickedSegmentIndex`, and member Segment indices from Dumling. Interaction state stays in Dumgen/application data keyed by the authoritative sentence and click. | Dumgen/application. | No. |
| Attestation identity and IDs | Current Selection identity is only the interaction pair `(segmentedSentenceId, clickedSegmentIndex)` ([ADR 0002][adr-0002], [ID interface][id-interface]). Once both fields are prohibited and Attestation is fleeting, no evidence-backed identity remains. | Attestation has value equality only. No `AttestationIdentity`, entity ID, CSV/base64url ID, ID decoder, or identity-bearing persistence key. | Not applicable. | No under map #69's fixed “fleeting” decision. |
| Runtime validation and serialization | Dumling exposes strict language-specific schemas and `parse` operations for its public hydrated values; the current Selection schema rejects unknown fields and validates its nested Surface ([Selection schema][selection-schema], [parse interface][parse-interface]). | Provide a strict Attestation schema/parser and constructor if Attestation is public. Its ordinary JSON shape can cross an existing in-process boundary, but do not promise canonical ID encoding or durable storage. | Dumling for DTO shape; transport owner for wire versioning. | **Yes only if** a separately versioned cross-process or archival wire contract is required. The repository proves no such adapter today. |
| Persistence | Current docs called Selection persisted, but its persistence/identity is entirely the sentence/click pair; map #69 explicitly makes Attestation fleeting ([classifier summary][classifier-summary], [map #69][issue-69]). | No Attestation repository or durable lifecycle. Persist Surface/Lemma where needed; applications may retain their own interaction record that contains or refers to a transient Attestation result. | Application/storage context. | Historical Selection compatibility is an operational migration question, not an Attestation field. |
| Classifier notes, mistakes, verification flags | `AttestedSelection` is a documentation wrapper around authoritative Selection plus `sentenceMarkdown`, notes, mistakes, and verification status ([wrapper type][public-types-wrapper]). | Keep corpus/reviewer metadata outside the grammatical Attestation. | Dumling-docs or experiment owner. | No. |

## Candidate interfaces

All candidates preserve `Surface<L, SK, LK, LSK>` and its existing language,
Surface-kind, Lemma-family, and Lemma-kind correlation. Dependencies are
in-process values; no adapter seam is justified.

### A. Paired member evidence (recommended)

```ts
type MemberOrthography = "Standard" | "Typo";
type RealizationCoverage = "Full" | "Partial";

type AttestedMember = Readonly<{
  attested: string;
  orthography: MemberOrthography;
}>;

type Attestation<L, SK, LK, LSK> = Readonly<{
  members: readonly [AttestedMember, ...AttestedMember[]];
  realizationCoverage: RealizationCoverage;
  surface: Surface<L, SK, LK, LSK>;
}>;
```

Interface invariants and errors:

- `members` is non-empty and in source textual order; each `attested` string is
  non-empty exact source text.
- Orthography is paired structurally, so cardinality cannot drift.
- `surface.normalizedSurface` is the normalized projection of these members in
  the same order. Typo/casing repair is permitted; constituent insertion,
  deletion other than declared Partial omission, reordering, and lemmatization
  are not.
- The constructor/schema rejects invalid shape and Surface mismatches. A generic
  Dumling schema does **not** pretend it can prove source ordering, typo truth,
  or Full/Partial truth; Dumgen proves those before crossing the seam.
- There is no ordering constraint relative to a click because a click is not
  part of the interface; there is no identity or persistence error mode.

This is the deepest candidate: one member list expresses raw evidence and typo
alignment, while the existing Surface expresses normalized grammar. Change to
Segmentation or TARGET markup remains local to Dumgen.

### B. Parallel arrays plus explicit raw projection

```ts
type Attestation<L, SK, LK, LSK> = Readonly<{
  attestedMembers: readonly [string, ...string[]];
  memberOrthographies: readonly [MemberOrthography, ...MemberOrthography[]];
  attestedSurface: string;
  realizationCoverage: RealizationCoverage;
  surface: Surface<L, SK, LK, LSK>;
}>;
```

This closely matches today's model output and application assembly. It is
credible when array-shaped model exchange is the dominant caller, but its
interface is shallower: callers must learn a positional alignment invariant,
and `attestedSurface` duplicates information whose whitespace/adjacency rule is
owned upstream. Dumling can check equal lengths but cannot check the projection
against the source sentence. Prefer it only as a private Dumgen prompt DTO;
Dumgen should project it to candidate A at the public seam.

### C. Self-contained context envelope

```ts
type Attestation<L, SK, LK, LSK> = Readonly<{
  markedContext: string;
  members: readonly [AttestedMember, ...AttestedMember[]];
  attestedSurface: string;
  normalizedAttestedSurface: string;
  realizationCoverage: RealizationCoverage;
  surface: Surface<L, SK, LK, LSK>;
}>;
```

This is credible only for an archival/replay product: one value can display the
source context without consulting Dumgen. It has the weakest locality for the
current system. TARGET syntax, escaping, raw projection, normalized projection,
and Surface must remain synchronized, yet only Dumgen can check most of those
relations. It also duplicates `surface.normalizedSurface`. No accepted source
requires a standalone archive, so this candidate needs an affirmative human
retention/wire requirement before adoption.

### Comparison

| Candidate | Depth | Locality | Seam placement | Main cost |
| --- | --- | --- | --- | --- |
| A: paired members | Highest: three fields cover the grammatical occurrence | Linguistic invariants in Dumling; Segmentation mechanics in Dumgen | Clean Dumgen -> Dumling value seam | Exact source display remains in the outer Dumgen result |
| B: parallel arrays | Medium | Alignment/projection checks split between Dumgen and Dumling | Leaks model DTO shape through the seam | Parallel arrays and duplicate projection |
| C: context envelope | Low for current callers; potentially useful for archives | Markup, display, and grammar changes couple | Pulls Dumgen mechanics into Dumling | Multiple authorities and an unproved storage use case |

## Outer Dumgen interaction projection

Attestation does not need a human decision about click recovery. Dumgen can
mechanically preserve the current result's request correlation and member
highlighting while keeping all interaction state outside Attestation:

```ts
type ResolvedGrammaticalResult<L> = Readonly<{
  decision: "Resolved";
  language: L;
  markedContext: string;
  attestation: Attestation<L>;
  interaction: Readonly<{
    segmentedSentenceId: SegmentedSentenceId; // Dumgen-owned brand
    clickedSegmentIndex: number;
    memberSegmentIndices: readonly [number, ...number[]];
  }>;
}>;
```

The interaction projection echoes the input sentence and click. Its member
indices are ordered, unique, in-bounds `ResolvableText` indices, include the
click, and align position-for-position with `attestation.members`. Consequently,
the clicked member's orthography is derived by locating the click in
`memberSegmentIndices` and reading the same position in `attestation.members`.
Family and Kind derive from `attestation.surface.lemma`. No orthography map,
`evidencePosition`, raw Analysis Target, or duplicated route fields are needed.

On a member-cache hit, Dumgen returns the same Attestation and `markedContext`;
only `interaction.clickedSegmentIndex` changes. Including sentence and click
preserves the request-correlation fields currently returned inside Selection,
while the nested placement makes their non-grammatical ownership explicit
([current Dumgen result][dumgen-types], [current cache projection][dumgen-cache]).

## Deletion-test analysis

- Delete sentence/click IDs and member indices from Dumling: grammatical
  complexity does not reappear in Dumling callers. Dumgen already owns the
  authoritative aggregate, target membership, bounds, Segment-kind checks,
  markup, and projection. This deletion deepens the module.
- Delete clicked-only `selectedOrthography`: per-member typo complexity must
  reappear somewhere. The model already returns the complete vector; pairing it
  with members on Attestation concentrates the rule once and removes the
  laboratory's current need to recover one Selection per member
  ([laboratory loop][laboratory-loop]).
- Delete ordered members and retain only a flattened string: the ability to
  align mixed typo evidence and to represent discontinuous lexical members
  disappears. Every consumer would have to parse an unparseable display string.
- Delete `markedContext` from Attestation: no Dumling behavior is lost. Dumgen
  still owns and uses it. Therefore it does not earn space on the Dumling
  interface.
- Delete an Attestation-level normalized string: nothing is lost because
  `surface.normalizedSurface` is already the normalized projection and part of
  Surface identity. Keeping both would be pass-through duplication.
- Delete Attestation ID/descriptor codecs: only interaction routing disappears,
  and that routing belongs to Dumgen/application after the click fields move.
  Grammar remains available through the linked Surface. These codecs do not
  earn their interface cost.
- Delete the strict Attestation schema: validation logic would reappear at each
  public ingestion point. If Attestation is public, the schema is a real seam
  and should remain; a durable storage adapter is not justified until a second
  lifecycle actually exists.

## Proposed invariant tests

These are migration acceptance tests, not claims that the repository's current
baseline is green.

1. **Public shape:** strict schemas accept candidate A and reject click, sentence,
   Segment-index, `markedContext`, duplicate language/route fields, and reviewer
   metadata.
2. **Non-empty paired evidence:** reject no members, empty member text, and any
   orthography outside `Standard | Typo`. The paired shape makes length mismatch
   unrepresentable.
3. **Mixed typo:** `gvae up` yields members
   `[{attested: "gvae", orthography: "Typo"}, {attested: "up", orthography:
   "Standard"}]`, a canonical Surface with `normalizedSurface: "gave up"`, and
   Full coverage.
4. **Licensed variant:** `armour` and pointed Hebrew remain Standard members of
   Variant Surfaces; they are not Typos ([orthography test][orthography-test]).
5. **Discontinuous Full:** `gave … up`, `zog … an`, and `ge … t` preserve member
   order and are Full when all lexical realization is present; intervening
   fillers and punctuation are not members.
6. **Partial does not invent:** `heulte mit` -> `mit den Wölfen heulen` and
   `Kinder` -> `Kinderbuch` remain normalized as the attested projection and are
   Partial. The omitted constituents appear only in Lemma Canonical Form.
7. **Normalization discipline:** casing/typo repair may change member spelling,
   but normalized Surface never reorders, lemmatizes, or inserts members. A
   partial target that a route does not license remains Unresolved rather than
   silently repaired; existing aphorism, proverb, and paired-frame prompts make
   this route-policy distinction explicit ([proverb policy][proverb-policy],
   [paired-frame policy][paired-frame-policy]).
8. **Click independence:** resolving any member click of the same Analysis
   Target returns the same Attestation value and one per-member orthography set;
   the clicked index remains only in the outer interaction result/cache key.
9. **Identity:** Dumling ID encoders accept Surface/Lemma but not Attestation;
   changing coverage does not change the linked Surface ID.
10. **Hydration and round-trip:** the Attestation parser preserves the exact
    member list and linked concrete Surface/Lemma through ordinary JSON
    round-trip, without introducing a canonical Attestation ID or repository.

## Decisively rejected alternatives

- **Aggregate `orthography`:** rejected because one occurrence can contain both
  Typo and Standard members (`gvae up`).
- **Clicked-only `selectedOrthography`:** rejected because Attestation is
  click-independent and Dumgen already obtains one value per member in one
  grammatical result.
- **Segment or sentence references in Dumling:** rejected because Dumling cannot
  validate their semantic correctness and map #69 assigns all such mechanics to
  Dumgen.
- **Coverage retained on Surface:** rejected for this migration because map #69
  fixes it as occurrence-local; existing identity tests already show coverage
  is not Surface identity.
- **Normalized projection moved off Surface or duplicated:** rejected because it
  is part of fixed Surface identity and existing normalization behavior.
- **Attestation IDs or persistent entities:** rejected because the only existing
  Selection identity is the click pair being removed and map #69 calls
  Attestation fleeting.
- **Corpus metadata in Attestation:** rejected because the existing
  `AttestedSelection` wrapper already demonstrates that notes and verification
  are a separate documentation concern.

## Minimal human decisions still required

1. **Partial-realization policy beyond proved cases.** Define which omitted
   lexical material still permits a defensible Attestation for each Family and
   route, especially coordinate ellipsis, shortened phrasemes, and future
   valency/implicit arguments. The evidence fixes the meaning of Full versus
   Partial and several boundary examples, but it intentionally does not justify
   generalizing `heulte mit` to every recoverable expression.
2. **Standalone retention/wire requirement.** Decide whether any consumer must
   archive or replay an Attestation independently of Dumgen's resolved result.
   If yes, specify the source-context lifetime and versioned transport owner;
   that requirement may justify candidate C or a separate Dumgen envelope. If
   no, adopt candidate A, ordinary strict schema parsing, and no persistence.
3. **External historical Selection compatibility (operational, not an
   Attestation field).** Choose a hard break, time-bounded decoder/adapter and
   route redirects, or a data migration if Selection API values, IDs, or docs
   URLs exist outside this repository. The repository-local corpus, generated
   routes, and logbooks can be migrated mechanically, and Dumdict does not use
   Selection as its stored identity; repository evidence cannot establish what
   external consumers have retained. This decision therefore controls only the
   compatibility plan, not the new Attestation contract.

No other field-level product or Dumgen interaction-projection decision is
required by the available evidence. Names and tuple/object syntax can be
settled mechanically during implementation without changing the domain
contract.

[issue-69]: https://github.com/clockblocker/texteater/issues/69
[issue-72]: https://github.com/clockblocker/texteater/issues/72
[adr-0002]: ../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md#lemma-is-grammatical-identity-and-reading-is-semantic-identity
[dumling-context]: ../../CONTEXT.md#language
[public-types-selection]: ../../src/types/public-types.ts#L128
[public-types-wrapper]: ../../src/types/public-types.ts#L210
[surface-id-test]: ../../tests/external/ling-id/ling-id-public.test.ts#L99
[selection-schema]: ../../src/schemas/shared/builders.ts#L144
[id-interface]: ../../src/operations/api-shape.ts#L25
[parse-interface]: ../../src/operations/api-shape.ts#L143
[orthography-test]: ../../tests/internal/spelling-relation.test.ts#L11
[give-up-fixture]: ../../tests/helpers/attested-entities/eng/selections.ts#L33
[partial-test]: ../../tests/internal/api.test.ts#L136
[give-up-doc-fixture]: <../../../../app/dumling-docs/src/to-generate/attestations/en/selection/She_gave_up_after_midnight/She_gave_[up]_after_midnight.ts#L7>
[circumfix-fixture]: <../../../../app/dumling-docs/src/to-generate/attestations/de/selection/In_gelacht_markieren_ge_und_t_zusammen_das_Partizip/In_[ge]lacht_markieren_ge_und_t_zusammen_das_Partizip.ts#L7>
[classifier-summary]: ../../../../app/dumling-docs/src/classification-logbook/de/summary.md#selection-resolution
[dumgen-types]: ../../../dumgen/src/types.ts#L60
[dumgen-implementation]: ../../../dumgen/src/dumgen/implementation.ts#L307
[dumgen-cache]: ../../../dumgen/src/dumgen/implementation.ts#L157
[dumgen-postcondition]: ../../../dumgen/src/catalog/laboratory/create-de-grammatical-resolution-prompt.ts#L90
[projection-code]: ../../../dumgen/src/dumgen/implementation.ts#L496
[marked-context-test]: ../../../dumgen/tests/internal/grammatical-resolution-marked-context.test.ts#L5
[coordinate-ellipse]: ../../../dumgen/src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/noun/golden-corpus/cases/orthography-and-surface.ts#L222
[laboratory-loop]: ../../../../app/laboratory/src/classification.ts#L430
[proverb-policy]: ../../../dumgen/src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/proverb/prompt-source.ts#L31
[paired-frame-policy]: ../../../dumgen/src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/paired-frame/prompt-source.ts#L20
