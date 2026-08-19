# tf-demo Dumgen, Dumdict, Dumling, and Dumrel integration findings

This file records the concrete package seams encountered while implementing
[texteater#133](https://github.com/clockblocker/texteater/issues/133). The
production path is `convex/orchestration.ts`; its portable composition is in
`server/linguisticOrchestration.ts`.

## Verdict

The real German click chain composes for the first vertical slice:

1. `buildDumgen().segment([sourceSentence])` performs Intake and deterministic
   German Source Segmentation.
2. `resolve.grammatical("de", ...)` produces Dumling `Attestation`, `Surface`,
   and `Lemma` values plus Dumgen interaction context.
3. A real `createDumdictService({ language: "de", storage })` consults existing
   Readings through an internal Convex query.
4. `resolve.reading("de", ...)` reuses or drafts a Reading.
5. Dumdict plans `addNewNote` or `ensureOwnedSurface` through its public
   host-composable `applyPlan` callback without committing yet.
6. One Convex mutation preflights exclusive Segment membership, applies or
   discards that validated plan, persists or reuses the occurrence Attestation,
   claims every member, and records the Visitor Click.

Knowledge application also composes when the caller supplies a Dumrel
`KnowledgeChange`: the action validates it with `knowledgeChangeSchema`, applies
it through `applyDumdictKnowledgeChange`, and persists the append-only
contribution plus accumulated Knowledge in a mutation.

## Integration gaps

### DUMGEN-1: text submission has no sentence-delimiting operation

Reproduction path:

- `battery/dumgen/src/dumgen.ts` exposes `segment(sourceSentences: readonly
  string[])`.
- `battery/dumgen/src/types.ts` and Dumgen ADR 0001 define every input item as a
  caller-delimited Source Sentence.
- There is no public Text-to-Sentences operation in `battery/dumgen/src/index.ts`.

Workaround in tf-demo: the first slice treats the submitted text as exactly one
Source Sentence and calls `segment([sourceText])`. Multi-sentence document
submission needs a real sentence-boundary owner; tf-demo does not hide one in a
demo tokenizer.

### DUMDICT-1: Dumdict loses structured Attestation evidence

Reproduction path:

- Dumgen returns `GrammaticalResult.attestation: Attestation<"de">` in
  `battery/dumgen/src/types.ts`.
- Dumdict accepts `AddAttestationRequest.attestation: string` and stores
  `ReadingEntry.attestations: string[]` in
  `battery/dumdict/src/public/service.ts` and
  `battery/dumdict/src/dto/entries.ts`.

Workaround in tf-demo: the structured Dumling Attestation is preserved unchanged
on the global grammatical resolution. Dumdict receives the exactly reconstructed
Stitched Text as its string encounter evidence. No lossy conversion is presented
as a Dumling Attestation.

### DUMDICT-2: resolved, Reading identity is public in Dumling

The former integration gap was:

- Dumdict privately defined `readingKey` without exporting it.
- tf-demo duplicated its stable JSON algorithm for indexed Convex lookup.

Resolved by the canonical Dumling `Reading` DTO, `readingSchema`, and
`readingFingerprint` operation. Dumdict and tf-demo now consume that operation;
`convex/model/linguisticKeys.ts` no longer contains a Reading identity
algorithm. The public fingerprint preserves the established indexed key bytes.

### DUMGEN-2: Knowledge Analysis is present in the catalog but absent publicly

Reproduction path:

- `battery/dumgen/src/catalog/prompt-catalog.ts` registers Knowledge Analysis
  prompt leaves.
- `battery/dumgen/src/dumgen.ts` exposes only `segment`,
  `resolve.grammatical`, and `resolve.reading`.
- `battery/dumgen/src/index.ts` does not export Knowledge Analysis or Knowledge
  Projection operations.

Consequence: a click cannot legitimately generate a Dumrel Knowledge
Contribution through Dumgen's public API. tf-demo therefore exposes a separate
`contributeKnowledge` action for caller-supplied, fully validated Dumrel changes.
It does not fabricate a definition, translation, relation, or private catalog
import merely to make the click look enriched. The Reading identity and emoji
remain presentable when accumulated Knowledge is empty.

### DUMDICT-3 resolved: host-composable plans share the click transaction

Reproduction path:

- Dumdict exposes each validated immutable `DumdictPlan` to a host-provided
  `applyPlan` callback.
- tf-demo captures that plan in the Node action without calling the storage
  commit port.
- `persistResolvedClick` invokes the public-plan Convex applier directly inside
  the same mutation as occurrence membership and Click writes.

Result: free members commit dictionary and host records together. Exact full
overlap discards the losing plan and records the Click against the committed
winner. Partial or multi-occurrence overlap returns a Membership Conflict with
no writes. A validated empty plan for an already-owned Surface remains
host-composable without advancing the dictionary revision.

### DUMDICT-4: Dumdict-planned relation cleanup needs a wider Convex slice adapter

Reproduction path:

- Dumdict `loadNewNoteContext` can require explicit existing relation targets
  and pending target matches.
- The tf-demo first slice creates Readings without relations and its query
  returns empty relation arrays.

The Convex commit mutation understands Dumdict pending-relation change variants.
tf-demo now projects resolved and pending relations, lets a visitor contribute a
validated Dumrel semantic relation between two already stored Dumdict Readings,
and follows resolved relations from note to note. It still does not claim
Dumdict-planned pending-target resolution or cleanup through this narrow
adapter. Those operations require extending the query arguments and indexed
slice loading used by `getInfoForRelationsCleanup` and
`loadCleanupRelationsContext`.

## Evidence commands

From the repository root:

```sh
bun test app/tf-demo/tests/linguistic-orchestration.test.ts
bun --cwd app/tf-demo run check
bun --cwd app/tf-demo run lint
```

With local Convex selected and `OPENAI_API_KEY` configured, the live path is:

```sh
bun --cwd app/tf-demo x convex dev --once
bun --cwd app/tf-demo x convex run orchestration:submitText \
  '{"submissionKey":"smoke-bank-1","sourceText":"Die Banken sind geöffnet."}'
```

The 2026-08-15 live run used a supported Node 24 executable on `PATH` because
the machine's default Node 25 is outside local Convex's supported Node-action
range. Convex push passed. The real calls then produced:

- accepted German Segments for `Die Banken sind geöffnet.`;
- a resolved `Lexeme/NOUN` Lemma `Bank`, plural Surface `Banken`, structured
  Dumling Attestation, and Reading `🏦`;
- one applied Dumdict new-note commit, one universal Resolved Segment Context,
  and one Visitor Click;
- universal Resolved Segment Context reuse on a second Click without invoking
  Dumgen or duplicating the exact string attestation;
- request-ID deduplication on an exact retry; and
- a validated Reading Definition contribution accumulated as
  `Ein Geldinstitut.`.
