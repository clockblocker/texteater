# Dumgen `Selection` → `Attestation` migration research

Status: repository and issue-tracker trace for
[texteater#73](https://github.com/clockblocker/texteater/issues/73), child of
[map #69](https://github.com/clockblocker/texteater/issues/69). This is a
migration map, not an implementation. Field-level evidence from
[texteater#72](../../../dumling/docs/research/attestation-contract-evidence.md)
fixes the default Attestation contract used here.

## Verdict

The migration is structurally straightforward because the default Attestation
contract is now evidence-backed. Dumgen is already the deep module at the
correct external seam: callers use `segment`, `resolve.grammatical`, and
`resolve.reading`, while the Prompt
Catalog and its route adapters remain internal
([public interface](../../src/dumgen.ts#L52-L68),
[internal construction](../../src/dumgen/build.ts#L15-L20)). The private prompt
DTOs already separate model judgments from application-owned identity and
interaction data: Target Classification returns member indices and a route,
Grammatical Resolution returns per-member orthography plus Surface/Lemma
fields, and Dumgen adds sentence identity, the click, attested projection, and
the linked canonical entity
([target projection](../../src/catalog/prompt-catalog.ts#L82-L162),
[grammar projection](../../src/catalog/laboratory/create-de-grammatical-resolution-prompt.ts#L50-L165),
[current Selection construction](../../src/dumgen/implementation.ts#L430-L473)).

Therefore the deterministic work is a replace-in-place migration, not another
orchestration layer: define Dumling `Attestation`, move occurrence evidence out
of `Surface`, change Dumgen's success projection, migrate the laboratory and
fixture/docs consumers, regenerate assets, and test through the public
interfaces. The work cannot begin honestly with a final contract until the
three implementation blockers under **Exact human blockers** are settled.

## Authoritative constraints

Map #69 fixes the direction of travel: `Attestation` is fleeting,
click-independent occurrence evidence; Dumgen owns clicks, target membership,
marked-context construction, and Segment projection; Dumling owns none of the
Segmented Sentence ID or index mechanics; typo evidence and
`realizationCoverage` are Attestation-local; `Surface` remains persistent with
its `Citation | Inflection` topology; and Lemma identity and the verified
linguistic inventories are not reopened
([map #69](https://github.com/clockblocker/texteater/issues/69)).

The fixed default Dumling value is a fleeting, hydrated
`Attestation -> Surface -> Lemma` containing a non-empty ordered `members`
list, each member pairing exact attested text with its own `Standard | Typo`
judgment, Attestation-level `realizationCoverage`, and exactly one linked
Surface. It has no click, sentence, Segment index, marked context, duplicate
flattened/normalized projection, identity codec, or persistence contract
([#72 evidence](../../../dumling/docs/research/attestation-contract-evidence.md#verdict),
[#72 candidate interface](../../../dumling/docs/research/attestation-contract-evidence.md#a-paired-member-evidence-recommended)).

The current code contradicts that destination in exactly the expected places:

- Dumling `Selection` stores `segmentedSentenceId`, `clickedSegmentIndex`,
  `surfaceSegmentIndices`, `attestedSurface`, clicked-only
  `selectedOrthography`, and a linked Surface
  ([type](../../../dumling/src/types/abstract/entities.ts#L81-L93),
  [schema](../../../dumling/src/schemas/shared/builders.ts#L144-L206)).
- Dumling `Surface` stores `realizationCoverage`
  ([type](../../../dumling/src/types/abstract/entities.ts#L66-L79),
  [Citation and Inflection schemas](../../../dumling/src/schemas/shared/builders.ts#L59-L141)).
- Selection identity is serialized as exactly sentence ID plus clicked index
  ([CSV encoder](../../../dumling/src/operations/shared/id/id-codec/readable-csv.ts#L230-L253),
  [decoder](../../../dumling/src/operations/shared/id/id-codec/readable-csv.ts#L286-L317)).
- Dumgen's public success result exposes that Selection
  ([types](../../src/types.ts#L60-L82)); its internal target and model result are
  already private types
  ([types](../../src/types.ts#L108-L132)).

There is an explicit ADR conflict to resolve. Accepted ADR 0002 fixes both
Selection identity and Surface ownership of realization coverage, even though
its Lemma/Reading decisions remain compatible with map #69
([superseded ADR 0001](../../../../docs/adr/0001-separate-entry-identity-from-lemma-form.md),
[accepted ADR 0002](../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)).
The implementation must add a superseding ADR (or amend ADR status according to
the repository's ADR convention) that replaces only those Selection/Surface
occurrence decisions and preserves Lemma/Reading identity. Dumling/Dumgen
context and persistent prompt-chain documentation must likewise be explicitly
superseded rather than silently rewritten, as required by the map.

## Current call graph

```text
Laboratory UI click
  -> POST /api/resolve { segmentedSentenceId, clickedSegmentIndex }
  -> server looks up session-owned SegmentedSentence
  -> GermanClassificationResolver.resolve(sentence, clickedSegmentIndex)
  -> Dumgen.resolve.grammatical("de", { sentence, clickedSegmentIndex })
     -> Target Classification private DTO
        input:  clickedSegmentIndex + [{ kind, text }]
        output: additional member indices + Family/Kind
        adapter: ordered AnalysisTarget.memberSegmentIndices
     -> Dumgen constructs escaped markedContext from target members
     -> route-specific Grammatical Resolution private DTO
        input:  { markedContext }
        output: memberOrthographies + Surface fields + Lemma fields
        adapter: restores language/Family/Kind and links Surface -> Lemma
     -> Dumgen constructs click-local Selection
        sentence ID + clicked index + member indices + attestedSurface
        + clicked member orthography + Surface -> Lemma
     -> { decision: "Resolved", language, markedContext, selection }
  -> laboratory asks the same Dumgen instance for every member click
     (Dumgen's WeakMap makes these cache hits) to synthesize one Selection/member
  -> Reading Resolution using markedContext + selection.surface.lemma
  -> response includes target, Selection, Surface, Reading,
     memberOrthographies, traces, diagnostics, and cache metadata
  -> UI highlights target members and displays click-local Selection evidence
```

Evidence:

- The HTTP layer owns the current session's sentence store and resolves the
  request's sentence ID and clicked index before calling the resolver
  ([server](../../../../app/laboratory/src/server.ts#L185-L262)).
- Dumgen validates the sentence/click, calls Target Classification, constructs
  marked context, dispatches Grammatical Resolution, validates the result, and
  returns Selection
  ([implementation](../../src/dumgen/implementation.ts#L157-L252),
  [input/target validation](../../src/dumgen/implementation.ts#L307-L428),
  [context construction](../../src/dumgen/implementation.ts#L518-L534)).
- Dumgen caches the resolved grammatical unit by every member index, but still
  reconstructs a different click-local Selection on a cache hit
  ([cache](../../src/dumgen/implementation.ts#L99-L102),
  [cache hit](../../src/dumgen/implementation.ts#L162-L179),
  [cache fill](../../src/dumgen/implementation.ts#L234-L245)).
- The laboratory then duplicates that member fan-out in its own cache and
  exposes Selections to the client
  ([resolver state](../../../../app/laboratory/src/classification.ts#L172-L211),
  [fan-out](../../../../app/laboratory/src/classification.ts#L430-L467),
  [response](../../../../app/laboratory/src/classification.ts#L392-L427)).

## Migrated call graph

The intended graph keeps the existing external Dumgen seam and prompt stages;
only the success projection and ownership change:

```text
Application click state
  -> Dumgen.resolve.grammatical(language, { sentence, clickedSegmentIndex })
     -> Target Classification DTO (unchanged)
     -> validated internal AnalysisTarget (unchanged)
     -> markedContext construction (unchanged)
     -> Grammatical Resolution DTO
        unchanged judgments, reorganized ownership:
        occurrence: orthography evidence + Full/Partial
        Surface: normalized reusable form + spelling + kind/features
        Lemma: canonical identity/core features
     -> deterministic projection
        Attestation -> Surface -> Lemma
        plus Dumgen-owned interaction state
     -> { decision: "Resolved", language, markedContext,
          attestation,
          interaction: {
            segmentedSentenceId,
            clickedSegmentIndex,
            memberSegmentIndices
          } }
  -> Reading Resolution uses attestation.surface.lemma (otherwise unchanged)
  -> application keeps active click/session/member highlighting outside Dumling
  -> laboratory displays Attestation as the grammatical result and prompt
     exchanges as diagnostic instrumentation
```

This interaction shape is mechanically derived from current behavior rather
than a product decision. `segmentedSentenceId` and `clickedSegmentIndex` echo
the validated request aggregate; `memberSegmentIndices` is a non-empty ordered
list aligned one-to-one and positionally with `attestation.members`. All three
fields are Dumgen-owned and must not be embedded in Attestation. `markedContext`
also stays as an outer resolved-result field. Family/Kind are derivable from
`attestation.surface.lemma`, while orthography is read from the paired
Attestation members, so no raw `AnalysisTarget` or parallel public
orthography array is needed. This gives ordinary consumers request correlation
and discontinuous-member highlighting without parsing `onModelExchange`;
instrumentation remains diagnostic and unable to affect generation
([instrumentation interface](../../src/dumgen.ts#L37-L50),
[diagnostic-only regression](../../tests/internal/dumgen.test.ts#L296-L338),
[#72 interaction evidence](../../../dumling/docs/research/attestation-contract-evidence.md#field-by-field-decision-table)).

```ts
type GrammaticalInteraction = Readonly<{
  segmentedSentenceId: SegmentedSentenceId; // Dumgen-owned brand
  clickedSegmentIndex: number;
  memberSegmentIndices: readonly [number, ...number[]];
}>;

type ResolvedGrammaticalResult<L> = Readonly<{
  decision: "Resolved";
  language: L;
  markedContext: string;
  attestation: Attestation<L>;
  interaction: GrammaticalInteraction;
}>;
```

The invariant is
`interaction.memberSegmentIndices.length === attestation.members.length`, and
index/member pairs at every position describe the same target member.

## Prompt/private DTO mapping

| Stage or field | Current source and mapping | Migration |
| --- | --- | --- |
| Target input | `{ clickedSegmentIndex, segments: [{ kind, text }] }`; it is the only prompt that sees Segment structure ([catalog](../../src/catalog/prompt-catalog.ts#L82-L130), [persistent contract](../persistent/prompt-chains.md#L67-L90)). | No schema or policy change. Click and indices stay private to Dumgen/model orchestration, never in Dumling. |
| Target output | Model emits `additionalMemberSegmentIndices` plus correlated Family/Kind; the adapter inserts the click and sorts the complete membership ([catalog](../../src/catalog/prompt-catalog.ts#L109-L162)). | No semantic change. Keep `AnalysisTarget` internal. Its route remains the dispatch key; its indices drive projection and interaction highlighting. |
| Grammar input | Exactly `{ markedContext }` ([noun schema](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/noun/schemas.ts#L12-L14)); Dumgen escapes literal marker text and inserts one tag/member ([implementation](../../src/dumgen/implementation.ts#L518-L534)). | No change. Do not add sentence ID, click, indices, member strings, or public Attestation wrappers to model input. |
| Grammar output: occurrence | `memberOrthographies[]` is position-aligned to target markers; the adapter and Dumgen check the count ([route adapter](../../src/catalog/laboratory/create-de-grammatical-resolution-prompt.ts#L92-L123), [Dumgen validation](../../src/dumgen/implementation.ts#L403-L427)). `realizationCoverage` currently sits inside the model Surface because it sits on canonical Dumling Surface ([verb schema](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/schemas.ts#L73-L99)). | Preserve the judgments but project each orthography into its paired Attestation member and coverage onto Attestation. Only the cross-Family Full/Partial omission policy remains a human gate. The private DTO may remain flat if the adapter makes ownership explicit; it need not imitate the public graph. |
| Grammar output: deterministic occurrence data | `attestedSurface` is not model output; Dumgen projects target Segment text and inserts a space only when intervening Segments contain whitespace ([implementation](../../src/dumgen/implementation.ts#L496-L516)). | Keep this deterministic. Any public member-string or normalized-attested-projection field must be derived/validated here, not asked back from the model. |
| Grammar output: Surface/Lemma | Route-local schemas omit fixed `language`, Family, Kind, and linked Lemma; the adapter restores them with fixed-field codecs and canonical Dumling schemas ([adapter](../../src/catalog/laboratory/create-de-grammatical-resolution-prompt.ts#L50-L87), [decode](../../src/catalog/laboratory/create-de-grammatical-resolution-prompt.ts#L125-L165)). | Keep the same adapter seam. Surface loses occurrence-only fields after the Dumling schema changes; Lemma and feature inventories remain untouched. Licensed `Canonical | Variant` spelling stays on Surface. |
| Reading | Public input is already the minimal `{ markedContext, lemma: string, existingEmojiDescriptions }`, and exact membership overrides the model's advisory decision ([types](../../src/types.ts#L84-L93), [implementation](../../src/dumgen/implementation.ts#L255-L290)). | Only replace `selection.surface.lemma` with `attestation.surface.lemma` at callers. No prompt/schema/policy change. |

This is a clean deep-module migration. `createDeGrammaticalResolutionPrompt` is
the existing internal adapter shared by all 23 authored German grammatical
routes
([route registry](../../src/catalog/laboratory/de-authored-grammatical-resolution-prompts.ts#L1-L139));
put common canonical projection there and in Dumgen construction, rather than
adding per-caller or per-route compatibility adapters. Tests should exercise
the Dumgen and Dumling public interfaces; prompt-schema tests remain internal.

## Interaction-state ownership

| State | Owner after migration | Reason/evidence |
| --- | --- | --- |
| Source sentence, Segments, offsets, `SegmentedSentenceId` | Dumgen/application | Dumgen defines the Segmented Sentence aggregate and validates the clicked Segment ([types](../../src/types.ts#L16-L54), [validation](../../src/dumgen/implementation.ts#L307-L359)). Map #69 explicitly removes it from Dumling. |
| Active click and session lookup | Application/laboratory | The request contains the click; the server resolves the sentence inside its current session ([contract](../../../../app/laboratory/src/shared/contract.ts#L60-L63), [server](../../../../app/laboratory/src/server.ts#L196-L245)). It is interaction state, not grammatical evidence. |
| Target member Segment indices and marked context | Dumgen; application may receive a view projection | Dumgen validates membership and constructs context ([implementation](../../src/dumgen/implementation.ts#L370-L401), [implementation](../../src/dumgen/implementation.ts#L518-L534)). Indices cannot cross into Dumling, but the current UI needs membership to highlight discontinuous units ([client](../../../../app/laboratory/src/client/App.tsx#L467-L475)). |
| Member strings, typo evidence, Full/Partial occurrence coverage, linked Surface | Dumling Attestation, with deterministic projection/validation in Dumgen | These are occurrence grammar under map #69. The exact Attestation field layout is still open. |
| Normalized reusable spelling, canonical/variant status, Surface kind/features, Lemma | Dumling Surface/Lemma | These remain reusable grammatical entities. Surface identity already excludes `spelling`, `realizationCoverage`, and Surface metadata from its CSV identity, so moving coverage need not change Surface IDs if normalized form and the linked Lemma stay fixed ([Surface CSV](../../../dumling/src/operations/shared/id/id-codec/readable-csv.ts#L244-L253), [decoded identity](../../../dumling/src/operations/shared/id/id-codec/readable-csv.ts#L362-L390)). |
| Prompt exchanges, raw model DTOs, stage names | Dumgen instrumentation; laboratory diagnostics only | `onModelExchange` is the existing internal observability seam and the laboratory reconstructs targets/stages from it ([laboratory trace adapter](../../../../app/laboratory/src/classification.ts#L49-L145)). |
| Reading candidates and resolved learner Reading | Application/Dumdict | Reading remains learner-scoped and above Dumling; the laboratory currently owns its in-memory candidate index ([resolver state](../../../../app/laboratory/src/classification.ts#L172-L187), [reading composition](../../../../app/laboratory/src/classification.ts#L314-L374)). |

The laboratory's duplicate “one Selection per member” cache disappears. One
click-independent Attestation can be reused for any target member; the
application separately maps each member index to that resolved unit. This
removes shallow reconstruction work currently spread between Dumgen and the
laboratory while retaining member-hit behavior.

## Public contract and caller effects

### Dumling

This is the breaking core change. `Selection` is threaded through the public
type union, entity kind mapping, schema registry, create/convert/parse/describe
operations, and identity codec
([public types](../../../dumling/src/types/public-types.ts#L33-L53),
[public interface](../../../dumling/src/operations/api-shape.ts#L56-L149),
[descriptor registry](../../../dumling/src/schemas/descriptor-schemas.ts#L19-L32),
[creation](../../../dumling/src/operations/shared/create/create.ts#L89-L115),
[ID operations](../../../dumling/src/operations/shared/id/id.ts#L27-L68)).
Replace these surfaces with the fixed Attestation interface; do not retain a
pass-through `Selection` wrapper unless the human compatibility decision
requires a time-bounded adapter. If Attestation has no identity, it must not be
forced through the ID interface merely to preserve symmetry.

`SegmentedSentenceId` has no remaining Dumling field after Selection removal
and moves to Dumgen: current Dumgen imports it from Dumling
([Dumgen types](../../src/types.ts#L1-L5)), while map #28 previously required
that reuse. Map #69 now fixes Dumgen as the owner. Only an approved,
time-bounded historical compatibility export may remain in Dumling.

### Dumgen

Keep the high-level `Dumgen` interface shape established by #28; only the
resolved grammatical payload changes. `GrammaticalResult.Resolved.selection`
becomes Attestation plus the fixed Dumgen-owned interaction envelope above, and internal
`constructSelection`/`selectionSchemaFor` become Attestation construction and
validation. Error outcomes, route correlation, instrumentation, and Reading
remain unchanged
([current result](../../src/types.ts#L56-L82),
[current public interface](../../src/dumgen.ts#L52-L68)).

All direct Dumgen tests that assert Selection fields, cached click-local
reconstruction, or Surface coverage must be replaced with interface tests for
one reusable Attestation, separate member/click state, occurrence-local
coverage/orthography, and unchanged prompt ordering
([current success test](../../tests/internal/dumgen.test.ts#L215-L294)).

### Laboratory

The shared response currently exports aliases for `Selection`, exposes it in
`EntityRepresentation`, returns target membership and per-member orthography,
and displays the click-local entity
([contract](../../../../app/laboratory/src/shared/contract.ts#L7-L29),
[resolved response](../../../../app/laboratory/src/shared/contract.ts#L88-L121),
[client wording](../../../../app/laboratory/src/client/App.tsx#L712-L740)).
Migrate it to Attestation plus explicit application interaction state. Preserve
the server's sentence/session ownership, prompt trace reconstruction, Reading
composition, and member-hit cache. No UI or HTTP consumer should infer
interaction state from Attestation.

### Dumling docs generation

The docs generator treats Selection as an entity kind, validates click and
member indices against legacy `sentenceMarkdown`, uses Selection identity for
route slugs, renders `selectedOrthography` and Surface coverage as separate
classification lines, emits a `Selection<...>` type expression, and produces
Selection identity CSV logbooks
([source types](../../../../app/dumling-docs/scripts/generate-content/shared/types.ts#L18-L53),
[validation](../../../../app/dumling-docs/scripts/generate-content/attestations/validate/validate-selection-attestation.ts#L56-L103),
[slug](../../../../app/dumling-docs/scripts/generate-content/attestations/entity/attestation-slug.ts#L7-L18),
[rendering](../../../../app/dumling-docs/scripts/generate-content/attestations/render/classification-lines.ts#L5-L25),
[logbooks](../../../../app/dumling-docs/scripts/generate-content/attestations/selection/logbook.ts#L178-L270)).

The checked-in source corpus contains 258 Selection attestations (161 DE, 50
EN, 47 HE), plus four non-Selection entity attestations. Each Selection source
embeds sentence/click/index fields and a linked Surface
([representative source](../../../../app/dumling-docs/src/to-generate/attestations/de/selection/Das_wäre_schön_gewesen/Das_wäre_schön_[gewesen].ts#L1-L49)).
Migrate those sources after the external historical compatibility policy fixes
slug/redirect handling:
the generator currently emits one generated entity Markdown page and one
public Markdown page per route, plus two selection logbook CSVs per language
([generation](../../../../app/dumling-docs/scripts/generate-content/attestations/generate-attestations.ts#L29-L85),
[owned outputs](../../../../app/dumling-docs/scripts/generate-content/attestations/codegen.ts#L51-L164)).

`sentenceMarkdown` may remain docs-only display/review evidence; it must not be
used to smuggle click identity back into Dumling. If click-specific reviewed
examples remain valuable, keep them in the source wrapper or a separate review
record and point several such records at the same Attestation.

### Dumdict and other callers

Dumdict re-exports Dumling `Selection` and `SelectionIdentity`, so the breaking
name is part of its public interface even though storage identifies Surfaces,
not Selections
([re-export](../../../dumdict/src/dumling.ts#L1-L31),
[Surface ID helper](../../../dumdict/src/dumling.ts#L34-L46)). Its attested
entity fixtures and the `attested-selection-indexing` test are migration data,
not runtime storage behavior
([test](../../../dumdict/tests/internal/attested-selection-indexing.test.ts#L1-L24)).
Update the re-exports and fixture vocabulary; keep Surface/Reading storage
unchanged.

A repository-wide direct-reference scan found production/runtime callers in
only Dumling, Dumgen, Dumdict, `app/laboratory`, and `app/dumling-docs`.
Most of the remaining references are the 258 docs sources/generated pages,
Dumling/Dumdict fixtures, and Dumgen Prompt Sources, Golden Cases, experiments,
and generated prompts. Historical notes may retain “Selection” only when
clearly labelled historical or superseded.

## Generated and derived assets

The migration must update sources first and regenerate, never hand-edit
derived files:

1. **Dumgen prompt assets.** There are 23 authored German Grammatical
   Resolution routes wired through one adapter
   ([registry](../../src/catalog/laboratory/de-authored-grammatical-resolution-prompts.ts#L1-L139)).
   Their route schemas/examples currently place `memberOrthographies` and
   `realizationCoverage` in the old output shape; corresponding Golden Cases,
   evaluators, route tests, the issue-22 retained experiment, and 23 committed
   Generated System Prompt modules must move in lockstep. Prompt Assembly owns
   deterministic generation and stale-artifact checking
   ([scripts](../../package.json#L27-L42)). Preserve instructions and semantic
   cases unless a human decision changes their meaning; structural movement is
   not a prompt-quality experiment.
2. **Dumgen README.** The generated example reads
   `grammatical.selection.surface.lemma`; update its source and regenerate the
   README
   ([example](../../generate-readme/examples/core-idea.ts#L1-L23),
   [script](../../package.json#L37-L42)).
3. **Dumling README and generated schema documentation.** Rename the canonical
   types/operations and move coverage before regenerating Dumling's README
   ([scripts](../../../dumling/package.json#L55-L69)).
4. **Docs attestations.** Migrate the 258 checked-in source modules and generator
   code, then regenerate entity pages, public pages, ownership manifests, and
   six language logbook CSVs through `generate:attestations`/`generate:content`
   ([scripts](../../../../app/dumling-docs/package.json#L6-L19),
   [output ownership](../../../../app/dumling-docs/scripts/generate-content/attestations/codegen.ts#L60-L95)).
5. **Dumdict README/fixtures.** Its README Surface example contains coverage;
   update the source and regenerate if the Surface shape changes
   ([example](../../../dumdict/generate-readme/examples/core-idea.ts#L42-L58),
   [script](../../../dumdict/package.json#L27-L40)).

## Relationship to #28 and #12

### #28: deepen Dumgen

[Issue #28](https://github.com/clockblocker/texteater/issues/28) specifies the
current high-level Dumgen interface, internal Prompt Catalog, language-routed
operations, instrumentation, and Selection-returning grammatical result. The
repository already implements its deep-module shape and tests that no prompt
tree leaks through the interface
([implementation](../../src/dumgen.ts#L52-L68),
[shape test](../../tests/internal/dumgen.test.ts#L69-L81)).

Map #69 does not justify reopening that seam. Treat #28 as a prerequisite that
is implemented in code but whose Selection-specific acceptance clauses require
revalidation. Preserve:

- exactly `segment` and `resolve.{grammatical,reading}`;
- internal route maps and Prompt Catalog;
- minimal Reading input;
- correlated language/Family/Kind outcomes;
- typed `DumgenError` behavior; and
- `onModelExchange` observability.

Replace only the successful grammatical entity and add the fixed
`interaction.{segmentedSentenceId,clickedSegmentIndex,memberSegmentIndices}`
projection.
In particular, do not make the Prompt Catalog public again and do not expose
raw `AnalysisTarget` merely because Selection no longer carries indices.

### #12: valency-bearing attested data

[Issue #12](https://github.com/clockblocker/texteater/issues/12) asks where
expressed, omitted, governed, and discontinuous valency evidence belongs. Map
#69 answers only the ownership direction: occurrence evidence and Full/Partial
coverage belong on Attestation, not reusable Surface. That creates the correct
future home for valency realization without adding any valency field now.

The Attestation migration must preserve #12's examples—especially
discontinuous separable verbs and partial idiom realization—and must not treat
governed but non-member material as Surface/Attestation members. Exact valency
relations, omitted constituents, and identity effects remain #12 follow-up
work; they neither block the structural migration nor license changing current
DE/HE Segmentation or target-membership policy.

## Implementation slices and dependency order

### Gate 0 — implementation policies

Resolve the three blockers below and record the selected
policies/supersessions. No bulk rename should precede this gate because
identity, fixture shape, docs routes, and the public Dumgen result all depend
on it.

### Slice 1 — Dumling core (depends on Gate 0)

- Introduce the canonical `Attestation` type/schema and its concrete-language
  registry.
- Remove interaction mechanics from Dumling and move
  `realizationCoverage` off Surface.
- Replace Selection create/convert/parse/describe/ID operations according to
  the fixed value-only Attestation contract. Attestation receives a strict
  schema/parser but no identity or ID codec. Move `SegmentedSentenceId`
  ownership to Dumgen; any approved historical compatibility stays outside the
  canonical Attestation interface.
- Preserve Lemma, Surface kind topology, feature inventories, and Surface ID
  behavior.
- Replace tests at the Dumling interface, supersede the Selection/coverage
  clauses of accepted ADR 0002, and explicitly supersede Selection domain
  documentation.

This slice establishes the canonical seam all other work consumes.

### Slice 2 — Dumgen canonical projection (depends on Slice 1)

- Change `GrammaticalResult.Resolved` and exported types.
- Replace Selection construction/schema dispatch with Attestation construction
  and `interaction: { segmentedSentenceId, clickedSegmentIndex,
  memberSegmentIndices }`; require non-empty ordered member indices aligned
  one-to-one with `attestation.members`, and keep `markedContext` outer.
- Keep Target Classification, marked-context construction, routing, Reading,
  errors, and instrumentation stable.
- Collapse cache entries to one resolved Attestation per grammatical unit;
  retain member-index lookup only as Dumgen/application state.
- Add interface tests before migrating callers.

### Slice 3 — private grammar DTOs and prompt assets (depends on Gate 0 and
Slice 1; may proceed with Slice 2)

- Move occurrence fields in all 23 route schemas, shared codecs/adapters,
  demonstrations/Golden Cases, evaluators, and internal tests.
- Regenerate all Generated System Prompts and run stale-output checks.
- Preserve prompt text, model policy, Golden Case semantics, and target policy
  except for the approved field/ownership wording.
- Keep the issue-22 experiment historical; repair or quarantine its pre-existing
  missing imports separately rather than masking them in this migration.

### Slice 4 — runtime callers (depends on Slice 2)

- Migrate the laboratory contract/resolver/client to Attestation plus explicit
  click/member view state; remove per-member Selection synthesis.
- Update Dumdict re-exports and fixture-only indexing tests; do not modify
  learner storage semantics.
- Update Dumgen/Dumdict README example sources.

### Slice 5 — docs source corpus and generator (depends on Slice 1 and the
historical compatibility policy; can run parallel to Slice 4)

- Rename entity guards/helpers/type expressions/path validation and logbook
  vocabulary.
- Migrate all 258 Selection sources without changing their linguistic analyses.
- Preserve click-specific `sentenceMarkdown` only in a non-Dumling review
  wrapper if required.
- Regenerate pages/public artifacts/logbooks and assert ownership cleanup so no
  stale `/selection/` routes survive except an explicitly selected redirect or
  compatibility manifest.

### Slice 6 — integrated regeneration and verification (depends on 2–5)

- Regenerate READMEs, prompts, and docs from source.
- Run the matrix below from leaves to repository root.
- Review the diff for accidental prompt-policy, DE/HE Segmentation, Lemma, or
  feature-inventory changes before any hands-on model evaluation.

## Verification matrix

| Area | Required assertions | Commands |
| --- | --- | --- |
| Dumling interface | Attestation validates the selected occurrence invariants; no click/sentence/index fields appear; Surface rejects coverage; Lemma/features/Surface IDs are stable; Selection exists only in approved compatibility code. | `cd battery/dumling && bun run check && bun run check:types && bun test && bun run build && bun run lint && bun run validate` |
| Dumgen interface | Module shape remains `segment` + `resolve`; target/grammar/reading prompt order is unchanged; resolved output has Attestation plus outer `markedContext` and `interaction.{segmentedSentenceId,clickedSegmentIndex,memberSegmentIndices}`, no Selection/raw DTO; member indices are non-empty and align one-to-one with Attestation members; errors and language/route correlation remain; a second member uses the same Attestation without a model call. | `cd battery/dumgen && bun run check && bun test && bun run build && bun run lint && bun run validate` |
| Prompt assets | All 23 route schemas/cases agree on the new occurrence/Surface shape; no semantic test expectation changes beyond ownership; generated prompts are deterministic and current. | `cd battery/dumgen && bun run generate:system-prompts && bun run check:system-prompts && bun run check:experiment:issue-22` followed by review of generated diffs |
| Laboratory | HTTP still accepts sentence ID + clicked index; session lookup and member highlighting remain application-owned; response/UI show Attestation; traces still come only from instrumentation; Reading composes from Attestation Lemma. | `cd app/laboratory && bun run check && bun test && bun run build && bun run lint && bun run validate` |
| Docs generator/corpus | 258 migrated sources load; source and generated kind/route names agree; no interaction field is inside Attestation; generated/public page counts and six logbooks are complete; old owned routes are deleted or redirected per decision. | `cd app/dumling-docs && bun run generate:attestations && bun run generate:content && bun run check && bun test && bun run build && bun run validate` |
| Dumdict | Re-exports compile; Surface/Reading persistence is unchanged; migrated occurrence fixtures preserve discontinuous membership evidence outside Dumling where needed. | `cd battery/dumdict && bun run check && bun test && bun run build && bun run lint && bun run validate` |
| Generated READMEs | Examples use Attestation and no Surface carries coverage. | Run `bun run generate:readme` in `battery/dumling`, `battery/dumgen`, and `battery/dumdict`, then inspect the generated diffs. |
| Repository integration | Workspace dependency rules, tests, builds, and generated assets agree; a final reference scan finds no unintended canonical Selection vocabulary. | `bun run check && bun run test && bun run build && bun run lint && bun run validate`; then `rg -n '\bSelection\b|clickedSegmentIndex|surfaceSegmentIndices|selectedOrthography|realizationCoverage' battery app docs` and classify every remaining match. |

No verification command should call a live provider. Existing mock/interface
tests already assert prompt order, DTO inputs, marked context, and cache behavior
without judging model quality
([Dumgen tests](../../tests/internal/dumgen.test.ts#L83-L143),
[laboratory tests](../../../../app/laboratory/tests/classification.test.ts#L95-L170)).
Hands-on linguistic review is a post-structural prompt-quality gate, not an
implementation blocker or evidence that the structural migration is correct.

### Baseline failures to keep separate

Observed on 2026-08-08 before this note changed any code:

- `battery/dumgen: bun run check` fails on four missing
  `experiments/issue-22-compact-noun-dtos/compact-codecs` imports. That retained
  experiment has its own check script
  ([package scripts](../../package.json#L27-L39)); do not attribute these errors
  to Attestation work or silently repair them inside a migration diff.
- `app/laboratory: bun run check` passes.
- `app/laboratory: bun test` reports 11 pass / 1 fail. The existing
  “stops a disabled route before Grammatical Resolution” case unexpectedly
  dispatches grammar and fails `invalid-output`; the test's intended gate is
  visible here
  ([test](../../../../app/laboratory/tests/classification.test.ts#L244-L280)).
  Preserve the intent, but establish whether stale built Dumgen output or route
  enablement is the independent cause before using this as an Attestation
  regression.

## Exact human blockers

The default evidence-backed Attestation contract is otherwise fixed: paired
ordered members, Attestation-level coverage, one linked Surface, strict
value-shape parsing, no interaction fields, no duplicate projections, and no
Attestation identity or persistence
([#72 verdict](../../../dumling/docs/research/attestation-contract-evidence.md#verdict),
[#72 rejected alternatives](../../../dumling/docs/research/attestation-contract-evidence.md#decisively-rejected-alternatives)).
Only these three policies can still alter implementation scope:

1. **Cross-Family `Full | Partial` omission/ellipsis/valency policy.** The
   evidence fixes the field, owner, core meaning, and proved cases. A human must
   define which omitted lexical material still permits a defensible Attestation
   for each Family and route, especially coordinate ellipsis, shortened
   phrasemes, and future implicit/valency participants, without pulling
   governed non-members into the Attestation
   ([#72 remaining policy](../../../dumling/docs/research/attestation-contract-evidence.md#minimal-human-decisions-still-required)).
2. **Standalone Attestation archival/replay/versioned-wire requirement.** The
   default is an in-process fleeting value with ordinary strict JSON parsing,
   no durable lifecycle, and source context retained by Dumgen/application. If
   a consumer must archive or replay Attestation independently, a human must
   identify that consumer, the source-context lifetime, the versioned transport
   owner, and whether the archive is a separate Dumgen envelope rather than a
   larger Dumling Attestation.
3. **External historical Selection API/ID/URL compatibility policy.** Confirm
   whether Selection values, IDs, public API consumers, or generated docs URLs
   exist outside this repository. Choose either a hard break or an explicitly
   time-bounded decoder/adapter/redirect. Compatibility must not add click,
   identity, or persistence fields to canonical Attestation; current docs slugs
   and CSV identities encode sentence ID plus click, so the choice controls
   cleanup and redirects.

After these policies are recorded, Slices 1–6 are agent-completable. Human
linguistic acceptance remains a post-structural prompt-quality gate. Automated
migration must preserve current DE/HE Segmentation, target policy, prompt
wording, demonstrations, model choice, and feature inventories; any proposed
semantic rewrite is separately human-evaluated and does not block deterministic
compilation, generation, or interface verification.
