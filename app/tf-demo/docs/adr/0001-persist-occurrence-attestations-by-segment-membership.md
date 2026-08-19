---
status: accepted
refines:
  - "texteater#130"
  - "texteater#132"
  - "texteater#133"
supersedes:
  - "texteater#137"
  - "texteater#138"
source: "texteater#151"
refined-by:
  - "0002-persist-one-visitor-encounter-per-segment"
partially-superseded-by:
  - "system ADR 0010"
---

# Persist occurrence Attestations by exclusive Segment membership

The Visitor interaction portions of this decision are refined by ADR 0002:
physical Segment Selections are ephemeral and reuse one durable Visitor
Encounter per Visitor and Segment.

tf-demo stores one occurrence-specific Attestation for one resolved high-level
unit in one Sentence. Every member Segment links to that record, and a Segment
belongs to at most one occurrence. Clicking any member therefore reaches the
same committed Surface and Reading. A database Attestation ID is tf-demo-owned
occurrence identity: equal Dumling Attestation values at different source
occurrences have different IDs, while the reconstructed public Dumling
Attestation remains a value with no ID.

## Stored graph

```text
Text -> Sentence -> Segment
                       |
                       | membership { attestationId, orthography }
                       v
                  Attestation -> Surface -> Lemma
                       |
                       +----------> Reading -> Lemma

Click -> Segment
Click -> optional Attestation result
```

`Text -> Sentence -> Segment` always represents Dumgen's immutable high-level
whole-unit segmentation. Reading Knowledge may later describe drill-down
structure, but it never partitions or replaces source Segments.

The durable occurrence record stores only its database ID, `surfaceId`,
`readingId`, and `realizationCoverage`. Each member Segment stores the exclusive
membership pair `{ attestationId, orthography }`, where orthography is
`Standard | Typo`. An occurrence has at least one member, all members belong to
the same Sentence, and every member is `ResolvableText`.

Lemma, Surface, and Reading are immutable canonical shared records. Each has a
tf-demo database ID and an indexed key derived from its accepted value equality.
A Lemma record stores the strict Dumling Lemma fields. A Surface record stores
its strict non-Lemma Dumling fields plus `lemmaId`; a Reading record stores
`emojiDescription` plus `lemmaId`. Reconstructing either value supplies the
referenced canonical Lemma, so neither record embeds a duplicate Lemma DTO.
Reading equality is `(Lemma, emojiDescription)` inside the one Shared Demo
Dictionary. Surface and Reading point independently to Lemma, and the Lemma
identified by the Attestation's Surface must equal the Lemma identified by its
Reading. Reading is not embedded in the public Dumling Attestation because
Grammatical Resolution precedes Reading Resolution.

A Click stores its request ID, Visitor, exact clicked Segment occurrence,
timestamp, and an optional occurrence Attestation result. Absence is a recorded
result, not a cache miss, so unresolved Click history and request-ID replay
remain stable. Visitor identity scopes Click history only; it never enters
canonical keys, membership, or occurrence identity.

## Derived values and invariants

The occurrence does not duplicate Sentence, members, member indices, member
order, marked context, the Dumling Attestation DTO, Surface, Reading, or Lemma.
They are reconstructed as follows:

- query every Segment whose membership names the occurrence and reject an
  empty set or members from different Sentences;
- sort those Segments by their immutable sentence-local index; that order is
  the sole member order and the ordered index list;
- pair each exact Segment text with its membership orthography to reconstruct
  the Dumling Attestation members;
- render the full ordered Sentence Segments, marking precisely those member
  texts as `TARGET`, to reconstruct marked context;
- combine those members, the stored `realizationCoverage`, and the canonical
  Surface to reconstruct the public Dumling Attestation;
- require the canonical Surface and Reading to reference the same Lemma before
  the occurrence may be committed or returned.

Repeated equal Segment text is not deduplicated: distinct indices remain
distinct ordered members. Discontinuous members are valid; intervening
Segments remain unmarked context. Member indices, marked context, and the
clicked index are never Attestation identity.

Occurrence records and memberships are immutable after their first valid
commit. They may end only through explicit Analysis Stripping or full demo
reset. There is no edit, reparenting, merge, or second Attestation for a member
Segment.

## Atomic first-valid commit

Before model work, resolution reads the clicked Segment's membership. If it
already names a committed occurrence, the Click records and returns that
occurrence without invoking Dumgen, Reading Resolution, or Dumdict. Thus a
sequential click on any other member reuses the first committed result.

When the clicked Segment is unclaimed, model work may produce a proposal and a
Dumdict plan. One database transaction then validates and applies the complete
accepted result:

- every Dumdict-planned Lemma, Surface, and Reading change;
- canonical record reuse or insertion;
- one occurrence Attestation and every member Segment membership; and
- the Visitor Click with its optional Attestation result.

The transaction first rechecks the clicked Segment, then compares any remaining
proposal with committed memberships:

1. If the clicked Segment belongs to a committed occurrence, that occurrence is
   the winner regardless of the losing proposal's member array. The proposed
   result and all planned dictionary changes are discarded; the Click records
   and returns the winner.
2. If every proposed member is unclaimed, it creates the occurrence and all
   memberships after validating every invariant.
3. If the clicked Segment is unclaimed but another proposed member is claimed,
   this is partial overlap. The
   transaction writes nothing, including no Click or dictionary change, and
   returns a Membership Conflict.

An Unresolved model result performs the same clicked-membership recheck in its
write transaction. If another transaction claimed the Segment during model
work, the Click records and returns that committed winner instead of persisting
an obsolete Unresolved result.

An already recorded request ID replays its stored Click and optional result
without resolving or saving again. These rules define durable conflict
outcomes only; locks, queues, cancellation, retry scheduling, and Effect
execution policy remain outside this decision.

## Stripping, reset, and transition

Analysis Stripping for a Text preserves the Text and its Sentences, and removes
their Segments, memberships, occurrence Attestations, and Clicks. It then
removes Readings with no surviving occurrence and prunes their Reading-owned
Knowledge and relations; unreferenced Surfaces and Lemmas may likewise be
removed. Canonical records still referenced by another Text survive. Full demo
reset remains the explicit operation that removes all shared and Visitor data.

The previous `grammaticalResolutions`, `resolvedContexts`,
`visitorResolvedContexts`, clicked-index keys, composite string-attestation
aliases, and any contradictory analysis are not compatible state. Deployment
must strip or reset them rather than infer occurrence membership or preserve an
obsolete result as canonical. New analysis is produced only through the model
above.

## Prior decisions refined

- #130's shared linguistic graph and Visitor-only Click ownership remain; its
  clicked-index Resolved Segment Context is replaced by shared occurrence
  membership.
- #132's global-versus-Visitor separation remains, while its grammatical
  resolution and resolved-context tables are replaced by the minimal graph
  above.
- #133's real Dumgen and Dumdict integration remains, but dictionary plans,
  occurrence persistence, membership, and Click history now commit together.
- #137 is superseded: tf-demo, not Dumdict, owns the durable occurrence record
  and reconstructs the structured Dumling Attestation value. Dumdict does not
  archive that structured evidence.
- #138 is superseded as an ownership proposal: ADR 0008 places the Reading DTO,
  schema, equality, and stable key operation in Dumling while Dumdict retains
  Reading Entry and dictionary-workflow ownership.

Local-to-hosted Reading reconciliation remains owned by #117. This decision
does not choose lock, queue, cancellation, or Effect orchestration policy.
