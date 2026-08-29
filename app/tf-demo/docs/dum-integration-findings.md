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
`KnowledgeChange`: the action validates it through the lightweight
`parseAsKnowledgeChange` interface, applies it through
`applyDumdictKnowledgeChange`, and persists the append-only
Knowledge Change plus accumulated Knowledge in a mutation.

## Integration gaps

### DUMGEN-1 resolved: tf-demo owns Text-to-Sentence splitting

Reproduction path:

- `battery/dumgen/src/dumgen.ts` exposes `segment(sourceSentences: readonly
  string[])`.
- `battery/dumgen/src/types.ts` and Dumgen ADR 0001 define every input item as a
  caller-delimited Source Sentence.
- There is no public Text-to-Sentences operation in `battery/dumgen/src/index.ts`.

Resolution in tf-demo: `server/sentenceSplitting.ts` owns one small
`splitInSentences(text)` interface that returns ordered Source Sentences. Its
initial implementation uses the platform sentence segmenter and deliberately
keeps that heuristic private so it can become more capable without changing
the orchestration caller. Dumgen continues to own Intake and deterministic
Source Segmentation for the resulting caller-delimited Source Sentences.

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

Resolved by the canonical Dumling `Reading` DTO, lightweight `parseAsReading`
interface, and `readingFingerprint` operation. Dumdict and tf-demo now consume
that operation;
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

Consequence: a click cannot legitimately generate a Dumrel Knowledge Change
through Dumgen's public API. tf-demo therefore exposes a separate
`applyReadingKnowledgeChange` action for caller-supplied, fully validated Dumrel
changes.
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

### DUMDICT-4: Relation planning requires complete indexed Lemma inventories

Reproduction path:

- Dumdict's `addNewNote` Reading Entry context requires explicit existing Lemma
  targets, exact pending-Shadow matches, and the complete relation-bearing
  dictionary slice.
- Ambiguous exact Lemmas keep their Unit Shadow pending and inert.
- A Reading added later to a target Lemma acquires inverse views without a
  backfill write.

tf-demo now stores normalized Reading-owned, Lemma-targeted edges as the single
source of truth. Indexed source and target reads reconstruct Dumdict Knowledge
and learner projections. The new-note and cleanup adapters provide complete,
explicitly bounded inventories: exceeding a bound fails instead of treating a
truncated slice as complete. Dumdict therefore owns unambiguous resolution,
direct target conflicts, inferred graph projection, and pending lifecycle,
while one Convex mutation preflights and commits every planned change
atomically. Resolved targets open Lemma Route Notes; pending targets remain Unit
Shadows until an exact Lemma exists.

## Evidence commands

From the repository root:

```sh
bun test app/tf-demo/tests/linguistic-orchestration.test.ts
bun --cwd app/tf-demo run check
bun --cwd app/tf-demo run lint
```

With local Convex selected and `OPENAI_API_KEY` configured, the live path is:

```sh
cd app/tf-demo
bunx convex dev --once
bunx convex run orchestration:submitText \
  '{"submissionKey":"smoke-bank-1","sourceText":"Die Banken sind geöffnet."}'
# Copy the returned sentenceId into the next call.
bunx convex run orchestration:resolveSegment \
  '{"requestId":"smoke-bank-resolution-1","visitorId":"smoke-visitor-1","sentenceId":"<sentenceId>","clickedSegmentIndex":2}'
# Copy ownerReadingKey from the resolved Reading into this call.
bunx convex run orchestration:applyReadingKnowledgeChange \
  '{"knowledgeChangeKey":"smoke-bank-definition-1","ownerReadingKey":"<ownerReadingKey>","change":{"kind":"Contribute","aspect":"definition","value":"Ein Geldinstitut."}}'
bunx convex run readingNotes:get \
  '{"readingId":"<readingId>"}'
```

Convex must receive Dumgen's compressed generated prompt bytes through
`dumgen/runtime-prompt-data`; its action bundler does not deploy package-relative
sidecar files. A contract test disables package-relative file reads and proves
that the injected runtime reaches the provider boundary.

The 2026-08-21 live run passed Convex push. The real calls then produced:

- accepted German Segments for `Die Banken sind geöffnet.`;
- a resolved `Lexeme/NOUN` Lemma `Bank`, plural Surface `Banken`, structured
  Dumling Attestation, and Reading `🏦`;
- one applied Dumdict new-note commit, one universal Resolved Segment Context,
  and one Visitor Click;
- universal Resolved Segment Context reuse on a second Click without invoking
  Dumgen or duplicating the exact string attestation;
- request-ID deduplication on an exact retry; and
- a validated Reading Definition change accumulated as `Ein Geldinstitut.`;
  the resulting Unit Reading Note contained both that Definition and the source
  context `Die Banken sind geöffnet.`.
