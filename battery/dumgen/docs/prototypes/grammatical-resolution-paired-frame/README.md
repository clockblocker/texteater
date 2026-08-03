# German Construction/PairedFrame Grammatical Resolution

This route-local prototype covers exactly
`grammatical-resolution/de/construction/paired-frame`. Its package command and
generated prompt are registered; catalog/runtime dispatch remains outside this
route-local prototype.
The Golden Corpus has 24 cases: four minimized demonstrations and exactly 20
held-out cases. Promptsmith rejects overlap by case fingerprint and explicit
contamination key.

The four demonstrations teach four irreducible facts: `anstatt ... zu` is a
discontinuous frame whose infinitive is a filler; `sowohl ... als auch` has
three lexical members; `sowohl ... wie auch` has its own three-member Canonical
Lemma; and marking a conjunct determiner makes the target overbroad.
The heldouts cover coordinators (including the independently licensed
two-member `sowohl ... wie`), proportional linkages, infinitive frames,
sentence-initial normalization, two one-member typos, single-arm selection,
unmarked third members, overselection, mixed occurrences, mismatched arms,
accidentally co-occurring lookalikes, and the neighboring one-word CCONJ route.

## Dumling and route contract

The model DTOs are projected from Dumling's German
`Construction/PairedFrame` Lemma and Citation Surface schemas. The fixed route
fields `language`, `family`, and `kind`, and the Surface's linked Lemma, are
absent from model exchange and restored by codecs. Both German PairedFrame
feature bags are empty in Dumling, so the complete Lemma `coreFeatures` is
exactly `{}`. Construction has no Inflection branch: every accepted Surface is
`Citation` and `Full`, with no `inflectionalFeatures`.

The input schema reuses the shared grammatical-resolution TARGET preflight.
Each pair must contain one word-like member, but one-pair inputs remain valid
inputs so the model can return `Unresolved` for a classified single arm. A
Resolved output requires at least two `memberOrthographies` entries and exactly
one entry per marked member. The prompt then applies occurrence, all-member,
and Full-realization gates in that order.

The canonical-form notation uses a spaced ellipsis (`entweder … oder`), matching
the existing Reading Resolution fixture. `normalizedSurface` is instead the
space-separated projection of the actually marked arms (`entweder oder`), with
fillers and punctuation excluded. Lexical arm substitutions or member-inventory
changes are not spelling variants: `je … desto`, `je … umso`, `sowohl … als
auch`, `sowohl … wie`, and `sowohl … wie auch` are five separate empty-Core
Lemmas, and their full Surfaces are `Canonical`. The optional `auch` in the IDS
inventory changes member cardinality, so the last two are not two Surfaces of
one Lemma. Dumling reserves `Variant` for licensed orthographic variation of
the same lexical members. A repaired typo also remains a Canonical Surface and
marks only the affected member `Typo`.

The pure evaluator checks decision/null coherence, mechanical TARGET-member
count, orthographies, every Citation Surface field, Canonical Form, and the
empty Core Feature bag. It canonicalizes only the schema-equivalent
`{"historicalStatus":null}` Surface feature bag to `null`.

## Source record

The product taxonomy is authoritative for route placement. Dumling's own
README names German `um_zu` as the example of a PairedFrame, and the existing
Reading Resolution Golden Corpus classifies the complete `entweder … oder`
target as `Construction/PairedFrame`. Conversely, the existing German CCONJ
corpus resolves a single marked `noch` in `weder ... noch` as a one-word
Lexeme. The resulting operational boundary is: the complete licensed frame is
the Construction; one selected arm is still a Lexeme target and is unresolved
on this route.

The linguistic inventory and case shapes are grounded in the Leibniz Institute
for the German Language's grammis, not generated examples treated as authority:

- [Konjunktor](https://grammis.ids-mannheim.de/kontrastive-grammatik/3789)
  explicitly lists `entweder ... oder`, `sowohl ... als auch`,
  `sowohl ... wie (auch)`, and `weder ... noch` as multi-part coordinators and
  describes their discontinuous placement.
- [Stellung von entweder ... oder](https://grammis.ids-mannheim.de/systematische-grammatik/2566)
  documents both phrase and clause coordination and the variable position of
  the first arm. The corpus paraphrases those configurations rather than
  copying source sentences.
- [Stellung von sowohl ... als auch](https://grammis.ids-mannheim.de/systematische-grammatik/2567)
  licenses `als auch` and `wie (auch)` second-arm sequences and continuous or
  discontinuous coordination. This supports separate two-member `sowohl ...
  wie` and three-member `sowohl ... wie auch` Canonical Lemmas, alongside the
  three-member `sowohl ... als auch` Lemma.
- [Morphosyntaktische Klassifikation der Nebensätze](https://grammis.ids-mannheim.de/systematische-grammatik/1950)
  describes `je ... desto/umso` as an obligatory two-part linkage between a
  proportional subordinate clause and its correlate.
- [Konnektoren als funktionale Klasse](https://grammis.ids-mannheim.de/systematische-grammatik/366)
  lists both `je ... desto` and `je ... umso` under proportional connectors,
  supporting two distinct lexical frame inventories.
- [Infinitivkonstruktion](https://grammis.ids-mannheim.de/terminologie/909)
  groups `um ... zu`, `ohne ... zu`, and `anstatt ... zu` as German infinitive
  constructions. Dumling supplies the product-level PairedFrame precedent for
  `um ... zu`; this prototype extends that same frame treatment to the two
  structurally parallel members of the IDS group.

All positive corpus sentences are short original paraphrases of these sourced
patterns. Source wording is not copied into the prompt or treated as output
metadata.

## Bounded evidence runner

The runner imports the shared Dumgen policy, currently `gpt-5.6-luna` with
reasoning effort `none`. It performs one serial call per heldout, no retries,
`store: false`, with an exact 20-case suite capped at 25. Import and preflight
make no provider call. Draft evidence is written atomically and cannot satisfy
the threshold until offline finalization. The retained schema binds the exact
prompt, input and output schemas, ordered cases, model policy, raw provider
output, response metadata, and recomputed diagnostics. Finalization rejects a
parsed output that differs from the retained raw text and requires every
scored miss to be classified. Evidence requires at least 15 attempts, at least
80%, no execution errors, and no unclassified misses.

The current finalized evidence is the 20-case `gpt-5.6-luna` Batch API run at
`runs/2026-08-03T16-00-15-793Z/results.json`. It scores 20/20 (100%), with zero
execution errors, no misses to classify, and `evidenceThresholdMet` true. The
retained record identifies the `openai-batch-v1` transport, Batch and file IDs,
request counts, and content hashes; per-request latency is correctly null
because Batch does not expose it. No fallback model was used.

## Taxonomy decisions still needing integration review

Two boundaries cannot be proved by the empty PairedFrame codec alone. First,
IDS calls the coordinator pairs multi-word lexemes or multi-part coordinators,
while the product places the complete `entweder … oder` pair under
Construction. This prototype consistently follows the product at whole-pair
scope, but runtime Target Classification must preserve that override for
`weder ... noch` and `sowohl ... als auch` too. Second, Dumling explicitly names
only `um_zu`; treating IDS-parallel `ohne ... zu` and `anstatt ... zu` as the
same product kind is a documented extrapolation. If integration wants a closed
product inventory limited to explicitly named frames, those two cases should
move to an unresolved policy probe rather than silently becoming another
route.

Canonical Lemma identity includes `canonicalForm`, so replacing a frame arm
creates a different empty-Core Lemma. The distinct-Lemma policy also keeps the
Surface `spelling` field aligned with Dumling's orthographic meaning rather
than using `Variant` for lexical substitutions.

## Deferred shared additions

This slice registers the Prompt Source with system-prompt code generation,
commits its generated artifact, and exposes its bounded runner command. Runtime
catalog dispatch remains deferred to issue #54. The prompt logbook records the
lexical-alternant identity decision.
