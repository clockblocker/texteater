# German high-level target and Attestation membership footprint

Status: implementation map for
[texteater#83](https://github.com/clockblocker/texteater/issues/83), a research
child of [map #82](https://github.com/clockblocker/texteater/issues/82). This
document audits the settled policy; it does not implement it.

## Verdict

The monorepo has the right generic Dumling entity and most of the right Dumgen
alignment machinery, but its German target prompt still implements the older,
narrower idea of a target. It groups conventional phrasemes and separable verb
parts while leaving governed prepositions, inherently reflexive pronouns, and
perfect/future/passive auxiliaries outside the target. The German VERB and
Phraseme resolution prompts, Golden Corpora, documentation sources, and
Laboratory integration repeat that policy.

Two adjacent contracts also need reconciliation before implementation:
`Lexeme/PUNCT` is listed as a high-level route even though punctuation is
non-clickable `Punctuation`, and the current Prompt Assembly glossary couples
Golden evidence to one model-facing Prompt Source even though #84 must freeze
representation-neutral evidence before #85 chooses a private DTO.

The correction is not a new Dumling entity or a valency model. It is:

1. make `HighLevelTargetClassification<"de">` a public Dumgen action;
2. classify every *realized fixed component* into one ordered target;
3. project that exact ordered target one-to-one into `Attestation.members`;
4. retain the target on every later result branch so callers never reconstruct
   it from model traces or Attestation data; and
5. update the affected German prompts, corpora, fixtures, docs, and caches in
   dependency order.

Existing Dumling `Attestation`, Lemma/Surface identity, and the German feature
inventories are compatible extensions. The migration intentionally changes
`Surface.normalizedSurface`, and therefore Surface IDs, for occurrences whose
old target omitted fixed material. There is no evidence for adding member-role,
aggregate verbal-complex, click, Segment-index, or free-valency fields to
Dumling.

## The policy in concrete examples

The unit is determined by fixedness, not by adjacency, POS, or whether a token
can later receive its own drill-down analysis. The source-order target indices,
Attestation members, and normalized Surface projection must be positionally
aligned.

| Occurrence | High-level members, in source order | Normalized Surface | Separate material |
| --- | --- | --- | --- |
| `Er wartet auf den Bus.` | `wartet`, `auf` | `wartet auf` | `den Bus` |
| `Sie erinnert sich an den Termin.` | `erinnert`, `sich`, `an` | `erinnert sich an` | `den Termin` |
| `Pass auf dich auf.` | `Pass`, governed `auf`, detached-prefix `auf` | `pass auf auf` | free reflexive object `dich` |
| `Sie hat gearbeitet.` | `hat`, `gearbeitet` | `hat gearbeitet` | — |
| `Sie wird arbeiten.` | `wird`, `arbeiten` | `wird arbeiten` | — |
| `Sie wurde gebeten.` | `wurde`, `gebeten` | `wurde gebeten` | — |
| `Sie kann schwimmen.` | clicked lexical item only | unchanged for that item | modal and lexical verb are separate high-level targets |
| `Sie ist schön.` | clicked item only | unchanged for that item | copula and predicative adjective are separate high-level targets |
| `Der Ausschuss trifft eine Entscheidung.` | clicked lexical item only | unchanged for that item | a conventional non-idiomatic Collocation is not fixed enough for this policy |

The linguistic distinction is first-party grammar rather than a repository
convenience:

- IDS grammis distinguishes a verb-governed preposition in `auf etwas warten`
  from freely addable local adjuncts, and says the governed preposition must be
  learned with the verb ([governed-preposition list](https://grammis.ids-mannheim.de/VmP-Listen),
  [`warten` example](https://grammis.ids-mannheim.de/progr%40mm/6876),
  [government versus adjunct](https://grammis.ids-mannheim.de/sgt/2262)).
- An obligatory reflexive pronoun is lexically required and is part of the
  reflexive verb's lexical makeup, unlike a freely used reflexive object
  ([reflexive pronouns](https://grammis.ids-mannheim.de/progr%40mm/5205),
  [contrastive grammar](https://grammis.ids-mannheim.de/kontrastive-grammatik/4476)).
- Separable verbs realize one lexeme discontinuously in finite main-clause
  order ([`aufstehen`](https://grammis.ids-mannheim.de/progr%40mm/6922),
  [`aufpassen` forms and valency](https://grammis.ids-mannheim.de/verbs/view/400319)).
- `haben`, `sein`, and `werden` form analytic perfect, future, and passive
  complexes with an infinite verb; the participle is part of the resulting
  verbal complex ([auxiliary overview](https://grammis.ids-mannheim.de/progr%40mm/5216),
  [auxiliary function table](https://grammis.ids-mannheim.de/systematische-grammatik/1612),
  [Partizip II](https://grammis.ids-mannheim.de/terminologie/181),
  [`werden` passive](https://grammis.ids-mannheim.de/terminologie/290)).

These sources establish the fixed relationships. The product decision in #82
establishes that those realized fixed components are the high-level target.

## Target and Attestation contract

### Public Dumgen action

The current public interface exposes only `segment` and the two `resolve`
operations, while `AnalysisTarget` is explicitly internal
([interface](../../src/dumgen.ts), [types](../../src/types.ts)). That directly
contradicts #82. Add the following public shapes in `src/types.ts`, export them
from `src/dumgen.ts`, and construct the action in `src/dumgen/build.ts`:

```ts
export type AnalysisTarget<
  L extends GrammaticalResolutionLanguage,
> = L extends "de"
  ? Readonly<
      {
        readonly [Family in GermanHighLevelFamily]: {
          readonly family: Family;
          readonly kind: GermanHighLevelKind<Family>;
        };
      }[GermanHighLevelFamily] & {
        readonly memberSegmentIndices: readonly [number, ...number[]];
      }
    >
  : never;

export type HighLevelTargetClassification<
  L extends GrammaticalResolutionLanguage,
> =
  | Readonly<{ decision: "Resolved"; target: AnalysisTarget<L> }>
  | Readonly<{ decision: "Unresolved" }>;

export type Dumgen = Readonly<{
  segment(...): ...;
  classify: Readonly<{
    highLevelTarget<L extends GrammaticalResolutionLanguage>(
      language: L,
      input: GrammaticalInput<L>,
    ): Promise<HighLevelTargetClassification<L>>;
  }>;
  resolve: ...;
}>;
```

`classify.highLevelTarget` is a new public domain action, not a Dumling entity
and not an export of the private model DTO. `GrammaticalInput` remains the
source sentence plus caller-owned click used to ask the question. The resolved
target contains no language, click, sentence, prompt exchange, orthography, or
Attestation. Its indices are ordered, unique, in bounds, point only at
resolvable text, include the clicked index, and form one click-invariant unit.
The language parameter is retained at the type level so the action input and
the language-specific target union stay correlated; it does not add a repeated
runtime `language` field to the settled result. Today
`GrammaticalResolutionLanguage` is only `"de"`, while the conditional shape
keeps a future language extension honest.
The current runtime already validates all of those conditions except the
non-empty tuple at the type boundary
([target validation](../../src/dumgen/implementation.ts)).

The private output shape in
[`prompt-catalog.ts`](../../src/catalog/prompt-catalog.ts), in which the model
returns only `additionalMemberSegmentIndices` and the adapter restores the
clicked member, is an implementation detail under comparison in #85. The
public result above must remain stable whichever private prompt arm wins.

### Reachable high-level routes: `Lexeme/PUNCT` is not one

The current high-level route inventory includes `Lexeme/PUNCT`
([`german-high-level-routes.ts`](../../src/schema/german-high-level-routes.ts)),
and the target output schema consequently offers it to the model
([target schema](../../src/promptsmith/laboratory/prompt-source/target-classification/de/high-level-whole-unit/schemas.ts)).
That route is unreachable through the public interaction contract. Only a
`ResolvableText` Segment can be clicked or become a target member
([Dumgen context](../../CONTEXT.md),
[runtime validation](../../src/dumgen/implementation.ts),
[catalog postcondition](../../src/catalog/prompt-catalog.ts)), while German
Source Segmentation emits punctuation marks and runs as `Punctuation`, not
`ResolvableText`
([German segmenter](../../src/source-segmentation/de.ts)).

Resolve the contradiction by removing `PUNCT` from
`GERMAN_HIGH_LEVEL_ROUTES.Lexeme`. The target output enum and public
`GermanHighLevelKind<"Lexeme">` then narrow automatically. Do not manufacture a
`ResolvableText` em dash/full stop in a Golden Case or unit test to claim route
coverage. Replace such a case with punctuation *context* around a click on a
real `ResolvableText`, and require the evaluator to reject any Punctuation
index in membership. Current manufactured PUNCT expectations in
[`grammatical-resolution-inventory.test.ts`](../../tests/internal/grammatical-resolution-inventory.test.ts)
and [`dumgen.test.ts`](../../tests/internal/dumgen.test.ts) must leave the
high-level chain.

This is not a request to delete Dumling `Lexeme/PUNCT`, reclassify punctuation
as text, make Punctuation clickable, or remove PUNCT from the general German
Grammatical Resolution inventory. It may remain explicitly NotImplemented for
a future drill-down/non-click entry point
([resolution inventory](../../src/schema/de-grammatical-resolution-inventory.ts)).
It simply cannot be a result of this high-level clicked-`ResolvableText`
action. `Lexeme/SYM` remains reachable because the German segmenter deliberately
emits supported currency symbols as `ResolvableText`.

### Canonical evidence must precede private DTO selection

The existing Prompt Assembly domain model binds each Golden Corpus to one
Prompt Source's exact model-facing input/output schema instances, makes the
Prompt Source own its Demonstration Selection, and permits an experiment to
evaluate only that Prompt Source's own corpus
([current glossary](../../CONTEXT.md),
[`contracts.ts`](../../src/promptsmith/assembly/contracts.ts),
[`define-prompt-source.ts`](../../src/promptsmith/assembly/define-prompt-source.ts),
[`define-experiment.ts`](../../src/promptsmith/assembly/define-experiment.ts)).
That is a direct contradiction for #84/#85: #84 must freeze one
representation-neutral semantic corpus, demonstration selection, held-out
selection, and pure evaluator *before* #85 compares sparse full indices,
additional indices, and a fixed-length mask. If any candidate Prompt Source
owns the evidence in its exact DTO, it becomes the authority and the comparison
is circular.

For this classifier, the canonical case contract is the public-domain stimulus
and answer:

```ts
type CanonicalTargetCase = Readonly<{
  input: GrammaticalInput<"de">; // complete Segmented Sentence + click
  idealOutput: HighLevelTargetClassification<"de">; // original Segment indices
  explanation?: string;
  contaminationKeys?: readonly string[];
}>;
```

Its schema and corpus live under
`src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/`,
not under any candidate Prompt Source. Its named semantic collections assign no
demo/evaluation role. A separate `selections.ts` pins explicit demonstration
and held-out IDs and checks ID, complete-stimulus, and contamination-key
disjointness. The canonical evaluator accepts unknown candidate output only
after a #85 adapter maps it back to the canonical decision/route/original-index
shape; it scores linguistic correctness and membership invariants without
importing a candidate output schema.

Concretely, that directory's `schemas.ts` must own both canonical input and
canonical output schemas; `corpus.ts`, `cases/*.ts`, `validators.ts`, and
`selections.ts` depend inward on them. The pure evaluator under
`experiments/target-classification-german-high-level/evaluator.ts` imports only
those canonical types. Neither it nor the canonical `corpus.ts` may import
`prompt-source/target-classification/de/high-level-whole-unit/schemas.ts`,
because that file becomes the selected candidate's private model contract in
#85. Likewise remove `target-de-route-lexeme-punct` from `cases/routes.ts` and
`selections.ts`; punctuation robustness cases keep Punctuation Segments only as
unclicked context.

Each #85 arm therefore supplies a bidirectional experiment adapter, not another
Golden Corpus:

```ts
type TargetPromptAdapter<ModelInput, ModelOutput> = Readonly<{
  toModelInput(input: GrammaticalInput<"de">): ModelInput;
  toModelIdealOutput(args: {
    input: GrammaticalInput<"de">;
    idealOutput: HighLevelTargetClassification<"de">;
  }): ModelOutput;
  toCanonicalOutput(args: {
    input: GrammaticalInput<"de">;
    output: unknown;
  }): unknown;
}>;
```

The adapter owns whitespace filtering, compact-to-original index maps, and the
candidate membership encoding. It materializes the same frozen canonical
Demonstration Selection through each candidate's exact schemas. Provider output
is first checked by that candidate's output schema, then decoded, then scored by
the one pure canonical evaluator. Add adapter round-trip and collision checks:
every canonical demo/held-out case must encode, a decoded ideal must equal the
canonical ideal, no two selected canonical stimuli may collapse to one private
stimulus, and decoded membership must reference ordered unique original
`ResolvableText` indices including the click.

Prompt Assembly needs a compatible new canonical-experiment seam rather than a
global rewrite of the 23 schema-bound Grammatical Resolution corpora. Extend
[`contracts.ts`](../../src/promptsmith/assembly/contracts.ts) and exports in
[`index.ts`](../../src/promptsmith/assembly/index.ts) with a canonical corpus
selection plus adapter-backed experiment contract; add a sibling definition to
[`define-experiment.ts`](../../src/promptsmith/assembly/define-experiment.ts)
that validates canonical selection identity/contamination before adapting.
`definePromptSource` may still own the *materialized model-facing examples* it
embeds, but it must not own or choose the canonical case IDs for these #85
arms. Existing route-local schema-bound corpora remain valid for prompts that
are not comparing DTOs.

Generated-prompt provenance must also accept the external canonical corpus,
selection, and adapter source paths. The current code generator assumes every
selected case lives at `<prompt-source>/golden-corpus` and its strict layout
check derives that directory from `source.goldenCorpus`
([`system-prompt-codegen.ts`](../../src/promptsmith/assembly/system-prompt-codegen.ts)).
Keep the candidate Prompt Source directory limited to its authored body/schema
and adapter-facing demonstration material, but record external evidence paths
through an explicit provenance input; never copy the canonical corpus into
three candidate directories. `assemble-system-prompt.ts` can remain the final
renderer once examples have been adapted
([renderer](../../src/promptsmith/assembly/assemble-system-prompt.ts)).

Supersede the conflicting **Prompt Source**, **Golden Corpus**,
**Demonstration Selection**, **Prompt Assembly**, and **Prompt Experiment**
clauses in [`battery/dumgen/CONTEXT.md`](../../CONTEXT.md). The replacement must
distinguish a reusable representation-neutral classifier corpus from the
existing prompt-schema-bound corpus convention and state that frozen evidence
selection precedes candidate Prompt Sources. Update Prompt Assembly contract
tests in
[`promptsmith-contracts.test.ts`](../../tests/internal/promptsmith-contracts.test.ts)
for cross-representation selection identity, adapter round trips,
contamination, private-stimulus collision, and provenance. Append the #85
choice to the prompt logbook; do not rewrite old experiment history.

### Complete downstream results

The current `GrammaticalResult` drops the target and duplicates it partially in
`GrammaticalInteraction`; its `NotImplemented` branch retains only a route and
its `Unresolved` branch retains only a language
([current result union](../../src/types.ts)). Replace those branches with a
complete discriminated union:

```ts
export type GrammaticalResult<L extends GrammaticalResolutionLanguage> =
  | Readonly<{
      decision: "Resolved";
      language: L;
      target: AnalysisTarget<L>;
      markedContext: string;
      attestation: Attestation<L>;
    }>
  | Readonly<{
      decision: "NotImplemented";
      language: L;
      target: AnalysisTarget<L>;
    }>
  | Readonly<{
      decision: "Unresolved";
      language: L;
      stage: "TargetClassification";
    }>
  | Readonly<{
      decision: "Unresolved";
      language: L;
      stage: "GrammaticalResolution";
      target: AnalysisTarget<L>;
    }>;
```

The `target` must be the validated value returned by the public classification
path, unchanged in membership and order. Family/Kind and member indices are
therefore not repeated in an interaction wrapper or separate `route` field.
The caller already owns sentence and click. `markedContext` remains a
resolution artifact and belongs only to a successful grammatical result.

`resolve.grammatical` and `classify.highLevelTarget` must share one internal
classifier and target cache, rather than invoke or adapt the model twice. A
classification failure is distinguishable from a later grammar failure by
`stage`. This is the minimum complete state needed by the Laboratory without
parsing `onModelExchange` traces.

### One-to-one Attestation projection

No Dumling shape change is needed. `Attestation.members` is already a non-empty
ordered list of `{ member, orthography }` pairs; its schema and constructor
validate that generic contract
([entity types](../../../dumling/src/types/abstract/entities.ts),
[schema builder](../../../dumling/src/schemas/shared/builders.ts),
[constructor](../../../dumling/src/operations/shared/create/create.ts)).
Attestation also deliberately has no ID operation
([public API](../../../dumling/src/operations/api-shape.ts),
[ID dispatch](../../../dumling/src/operations/shared/id/id.ts)).

Strengthen the existing runtime assertion in
[`implementation.ts`](../../src/dumgen/implementation.ts) to enforce:

```text
target.memberSegmentIndices.length === attestation.members.length

target.memberSegmentIndices[i]
  -> exact source Segment text
  -> attestation.members[i].member
  -> grammar output memberOrthographies[i]
```

No realized fixed target member may disappear because a resolution prompt
calls it an auxiliary, function word, reflexive, or governed preposition. A
model output whose member count differs is invalid; it is not a Partial
Attestation.

### Surface projection and features

For this migration, `Surface.normalizedSurface` is the normalized, one-space
projection of exactly the ordered target members. It preserves occurrence
order, including discontinuous components, and never inserts an unrealized
component. That extends the existing Surface normalization rule documented in
the Dumling context
([Dumling context](../../../dumling/CONTEXT.md)).

`Lemma.canonicalForm` does not absorb occurrence strings merely because they
are target members. Examples remain `warten`, `sich erinnern`, and `aufpassen`;
the existing German VERB core features record `hasGovPrep`,
`lexicallyReflexive`, and `hasSepPrefix`
([VERB feature type](../../../dumling/src/types/concrete-language/features/de/lexeme/verb.ts),
[VERB schema](../../../dumling/src/schemas/concrete-language/features/de/lexeme/verb.ts),
[feature atoms](../../../dumling/src/types/abstract/features/custom)).

The existing VERB Surface feature remains the morphology of the route-owning
lexical head, not a new analysis of every member or of the whole clause. Thus a
perfect/passive lexical head remains Participle morphology and a future head
remains Infinitive morphology; finite tense/person on the auxiliary is not
copied onto that head. This matches the current word-level documentation of
Tense
([Tense source](../../../../app/dumling-docs/src/to-generate/docs/u/feature/tense.doc.ts)).
If a consumer later needs whole-complex tense/voice or member roles, that is a
new domain question, not a hidden part of #82.

### Full and Partial

`Full` means all entity-owned material realized in this occurrence is present
in the Attestation. A missing free complement or adjunct does not make an
Attestation Partial. Ordinary governed-preposition, inherently reflexive,
separable, perfect, future, and passive examples are Full once every realized
fixed component is included. `Partial` remains available for a defensible
Surface/Lemma occurrence in which entity-owned lexical material is genuinely
unrealized, for example the repository's partial idiom uses. Omitting an overt
fixed component from the target is instead a target/Attestation alignment bug.

## Audit classification

### Direct contradictions

| Contract | Exact locations | Required correction |
| --- | --- | --- |
| Dumgen context and public API | [`battery/dumgen/CONTEXT.md`](../../CONTEXT.md), [`src/dumgen.ts`](../../src/dumgen.ts), [`src/types.ts`](../../src/types.ts) | Supersede “Analysis Target is internal”; publish the classification action and complete result types above. |
| Unreachable `Lexeme/PUNCT` high-level route | [`german-high-level-routes.ts`](../../src/schema/german-high-level-routes.ts), [German Source Segmentation](../../src/source-segmentation/de.ts), [target schema](../../src/promptsmith/laboratory/prompt-source/target-classification/de/high-level-whole-unit/schemas.ts), [inventory tests](../../tests/internal/grammatical-resolution-inventory.test.ts) | Remove PUNCT from the high-level route set and remove manufactured `ResolvableText` punctuation coverage. Keep punctuation as indexed context and keep the general PUNCT Lemma/drill-down inventory unchanged. |
| Prompt-owned, DTO-shaped target evidence | [`battery/dumgen/CONTEXT.md`](../../CONTEXT.md), [`assembly/contracts.ts`](../../src/promptsmith/assembly/contracts.ts), [`define-prompt-source.ts`](../../src/promptsmith/assembly/define-prompt-source.ts), [`define-experiment.ts`](../../src/promptsmith/assembly/define-experiment.ts), [`system-prompt-codegen.ts`](../../src/promptsmith/assembly/system-prompt-codegen.ts) | Supersede Prompt Source ownership for this comparison: #84 owns one canonical full-Segment/original-index corpus and frozen selections; #85 candidates adapt that same evidence into/out of private DTOs. Add canonical-experiment and external-provenance seams without migrating unrelated schema-bound corpora. |
| German high-level target prompt | [`target-classification/.../schemas.ts`](../../src/promptsmith/laboratory/prompt-source/target-classification/de/high-level-whole-unit/schemas.ts), [`prompt-source.ts`](../../src/promptsmith/laboratory/prompt-source/target-classification/de/high-level-whole-unit/prompt-source.ts) | Teach the entire fixed-member boundary, not only conventional phrasemes and separable verbs. Keep modal/copula/free-material negatives. Use the #85-selected private DTO without exposing it. |
| VERB resolution policy | [`grammatical-resolution/de/lexeme/verb/prompt-source.ts`](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/prompt-source.ts), [`cases/lexical-features.ts`](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/golden-corpus/cases/lexical-features.ts), [`cases/boundaries.ts`](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/golden-corpus/cases/boundaries.ts) | Remove rules that reject reflexive, governed-preposition, and analytic-auxiliary target members. Convert those boundary negatives into aligned positive cases. Keep modal and copular negatives. |
| Phraseme resolution policy | [`collocation/prompt-source.ts`](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/prompt-source.ts), [`collocation/cases/forms.ts`](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/golden-corpus/cases/forms.ts), [`idiom/prompt-source.ts`](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/prompt-source.ts), [`idiom/cases/forms.ts`](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/golden-corpus/cases/forms.ts) | Stop removing realized perfect/future/passive auxiliaries from members and normalized Surface. Preserve canonical lexical-form rules separately. Audit aphorism, proverb, discourse-formula, paired-frame, and fusion wording for the same “lexical member = target member” conflation. |
| Runtime result retention | [`src/dumgen/implementation.ts`](../../src/dumgen/implementation.ts), [`src/types.ts`](../../src/types.ts) | Return the target on Resolved, NotImplemented, and post-target Unresolved branches. Delete duplicate route/member-index projections and retain stage on failures. |
| Laboratory reconstruction | [`app/laboratory/src/shared/contract.ts`](../../../../app/laboratory/src/shared/contract.ts), [`classification.ts`](../../../../app/laboratory/src/classification.ts), [`client/App.tsx`](../../../../app/laboratory/src/client/App.tsx), [`tests/classification.test.ts`](../../../../app/laboratory/tests/classification.test.ts) | Import the public Dumgen target/result contract, stop reconstructing a target from model exchange or Attestation+interaction, and preserve source-index highlighting directly from `result.target`. |
| Documentation claims and examples | [`has-gov-prep.doc.ts`](../../../../app/dumling-docs/src/to-generate/docs/u/feature/has-gov-prep.doc.ts), [`lexically-reflexive.doc.ts`](../../../../app/dumling-docs/src/to-generate/docs/u/feature/lexically-reflexive.doc.ts), [`has-sep-prefix.doc.ts`](../../../../app/dumling-docs/src/to-generate/docs/u/feature/has-sep-prefix.doc.ts), German Attestation sources under [`attestations/de/`](../../../../app/dumling-docs/src/to-generate/attestations/de) | Remove claims that fixed realized material may be excluded at high level; update/reclassify representative `wartet`, `erinnert`, `Pass ... auf`, `hat mitgebracht`, and `wurde gebeten` examples. Preserve explicitly labeled later drill-down examples. |
| Package READMEs and persistent prompt narrative | [`battery/dumgen/README.md`](../../README.md), [`generate-readme/examples/core-idea.ts`](../../generate-readme/examples/core-idea.ts), [`app/laboratory/README.md`](../../../../app/laboratory/README.md), [`docs/persistent/prompt-chains.md`](../persistent/prompt-chains.md), [`docs/persistent/prompt-logbook.md`](../persistent/prompt-logbook.md) | Document the public classification stage, complete result, and expanded membership. Edit Dumgen's generator source, then regenerate. Append a superseding log entry; do not rewrite historical experiments. |

`[Pass] auf dich [auf]` is an especially important regression: the first `auf`
is governed and the second is the detached separable prefix. Both are distinct
members even though the strings match. Their source indices and positional
alignment carry the distinction; no member-role field is required. The free
object `dich` remains outside this target.

The exact authored examples that currently encode the narrower boundary are
`Er_wartet_auf_den_Nachtbus/Er_[wartet]_auf_den_Nachtbus.ts`,
`Sie_erinnert_sich_an_den_Geruch/Sie_[erinnert]_sich_an_den_Geruch.ts`, all four
authored views under `Pass_auf_dich_auf/`,
`Sie_wurde_um_Geduld_gebeten/Sie_wurde_um_Geduld_[gebeten].ts`, and the separate
`[hat]` and `[mitgebracht]` views under the long
`Die_Peitsche_hat_er_mitgebrachtund_nimmt_sie_sorglich_sehr_in_acht/` folder.
All paths are relative to the linked `attestations/de/` source directory in the
table. `Das_muss_heute_noch_raus/` and `Sie_ist_verheiratet/` are modal and
copular negative controls, not examples to merge.

### Compatible extensions

These contracts should be retained and tightened, not redesigned:

- Dumling's generic Attestation type, schema, create/convert/parse/describe
  operations, lack of identity, and `Attestation -> Surface -> Lemma` graph.
- Lemma identity and existing German VERB/AUX feature unions. The settled
  policy changes membership, not lexical identity or feature atom names.
- The private Prompt Catalog adapter and route-specific grammar adapters. They
  may keep a model-friendly flat DTO as long as Dumgen validates the public
  projection.
- Prompt Assembly's `defineGoldenCorpus` collections/selections are reusable
  with canonically owned schemas, and `definePromptSource` should keep exact
  schema validation for adapter-materialized local demonstrations. The new gap
  is experiment/adaptation/provenance orchestration, not case-set algebra or
  final demonstration rendering
  ([Golden Corpus assembly](../../src/promptsmith/assembly/golden-corpus.ts),
  [local demonstrations](../../src/promptsmith/assembly/local-demonstrations.ts),
  [renderer](../../src/promptsmith/assembly/assemble-system-prompt.ts)).
- The current source-order target validation, marked-context creation,
  one-orthography-per-member assertion, and fan-out cache under every target
  member in [`implementation.ts`](../../src/dumgen/implementation.ts).
- The AUX grammatical-resolution route and corpus
  ([prompt](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/auxiliary/prompt-source.ts)).
  An AUX grouped in a perfect/future/passive high-level unit may still be an AUX
  drill-down target. At high level, modal and copular AUX clicks remain
  separate; perfect/future/passive clicks resolve through the lexical VERB or
  applicable Phraseme route.
- Laboratory discontinuous highlighting and position-aligned member
  orthography display. They should consume the public target rather than infer
  one.

The Aphorism, Proverb, and DiscourseFormula prompts need a mechanical wording
audit because they equate target members with “lexical members”; PairedFrame
already includes fixed function-word arms, and Fusion is inherently one fused
Segment. Their present membership algorithms are otherwise compatible
([Aphorism](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/aphorism/prompt-source.ts),
[Proverb](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/proverb/prompt-source.ts),
[DiscourseFormula](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/discourse-formula/prompt-source.ts),
[PairedFrame](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/paired-frame/prompt-source.ts),
[Fusion](../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/fusion/prompt-source.ts)).

### Mechanical migrations

After the contracts and prompts are corrected:

- regenerate every affected prompt under
  [`generated-system-prompt/`](../../src/promptsmith/laboratory/generated-system-prompt)
  from authored prompt sources; do not hand-edit generated prompts;
- update the prompt experiments/evaluation suites and internal route tests
  under [`experiments/`](../../src/promptsmith/laboratory/experiments) and
  [`tests/internal/`](../../tests/internal) for the expanded member arrays;
- update Dumgen and Laboratory cache tests so any member click returns the same
  classification/Attestation and the unchanged target;
- regenerate Dumgen README output from its generator and Dumling Docs generated
  content/logbook output from `to-generate` sources;
- regenerate
  [`classification-logbook/de/de-attestations.csv`](../../../../app/dumling-docs/src/classification-logbook/de/de-attestations.csv)
  rather than editing it directly; and
- update fixtures/snapshots whose normalized Surface or member list changes.

Historical entries in
[`de-prompt-logbook.md`](../../src/promptsmith/laboratory/de-prompt-logbook.md)
and the persistent prompt logbook are evidence of the experiments that produced
the old policy. Append a dated supersession entry; do not rewrite those entries
as though they never happened.

### Genuine domain gaps, not blockers

1. `hasGovPrep: string | null` cannot express multiple or alternating governed
   prepositions or a richer valency relation. That belongs to the pre-existing
   governed-preposition/valency work in
   [#12](https://github.com/clockblocker/texteater/issues/12), not this migration.
2. Dumling has no aggregate verbal-complex feature or per-member grammatical
   role. Nothing in #82 requires either. Open a separate domain-model decision
   only when a consumer needs whole-complex tense/voice or role-labelled
   components.
3. The exact private classifier prompt representation and evidence threshold
   belong to #84 and #85. They do not change the public action, fixed-member
   rule, or projection invariant audited here.
4. Prompt Assembly has no representation-neutral corpus/adapter experiment
   contract or external demonstration-provenance seam. That is a bounded
   infrastructure gap exposed by #84/#85, not a reason to choose one private
   DTO early or to migrate every existing Grammatical Resolution corpus.

## ADR and domain-document supersession

Accepted system ADR
[`0003-attestation-supersedes-selection-and-owns-realization-coverage.md`](../../../../docs/adr/0003-attestation-supersedes-selection-and-owns-realization-coverage.md)
is compatible: it deliberately makes Attestation generic and click-independent
and does not enumerate German member boundaries. ADR
[`0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md`](../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)
also remains compatible for Lemma and Reading identity. Do not mark either
superseded.

Implementation should add a new system ADR, next available number, titled along
the lines of **German high-level targets align fixed realized components with
Attestation members**. It should extend ADR 0003 and record:

- Target Classification is a public Dumgen action and Analysis Target is not a
  Dumling entity;
- fixed realized component membership and exact one-to-one Attestation
  alignment;
- the German inclusion and exclusion boundary from #82;
- high-level route reachability is constrained to clickable `ResolvableText`,
  so PUNCT is not in this action even though it remains a Dumling Lemma kind;
- the distinction between high-level grouping and drill-down classification;
- target-member Surface normalization and head-morphology feature projection;
  and
- the intentional Surface-identity consequences.

That ADR explicitly supersedes only the narrower policy decisions recorded in
[#74](https://github.com/clockblocker/texteater/issues/74) and
[#76](https://github.com/clockblocker/texteater/issues/76): #74 said governed
non-members must not become members merely by association, while #82 now says a
*realized governed preposition itself* is fixed high-level material; #76 kept
Analysis Target entirely private, while #82 publishes classification. The
generic Attestation decisions from those tickets remain in force.

After accepting the ADR, update
[`battery/dumgen/CONTEXT.md`](../../CONTEXT.md) and
[`battery/dumling/CONTEXT.md`](../../../dumling/CONTEXT.md). Dumgen's statement
that Analysis Target is internal is directly superseded. Dumling's normalization
and Full/Partial guidance needs the overt-fixed-member versus free-complement
distinction. The system
[`CONTEXT-MAP.md`](../../../../CONTEXT-MAP.md) changes only if the new ADR adds a
new cross-context link; neither GOAL nor VISION is part of this work.

The representation-neutral evidence rule is a separate Dumgen authoring
decision. Add the next context-specific ADR under
[`battery/dumgen/docs/adr/`](../adr), titled along the lines of **Canonical
classifier evidence precedes private prompt representation**. It should record
the #84 corpus/selection/evaluator ownership, #85 adapter boundary, and external
codegen provenance. It does not supersede Dumgen ADR 0001's batch-intake
decision. It explicitly supersedes the schema-bound ownership claims in the
current Dumgen glossary only for experiments comparing multiple private DTOs;
the existing Prompt Source-owned convention remains accepted for ordinary
single-representation prompts. Accept this ADR and update the glossary before
#84 authors the canonical corpus; it is not documentation cleanup deferred
until #85.

### #69 and Selection-era disposition

[Wayfinder #69](https://github.com/clockblocker/texteater/issues/69) is complete
and remains the foundation rather than an implementation dependency. Its
surviving contracts require no Dumling migration here: Attestation is fleeting,
click-independent, non-identifiable paired occurrence evidence; coverage and
typo evidence are Attestation-local; Surface remains persistent; and Lemma
identity/feature inventories stay intact
([ADR 0003](../../../../docs/adr/0003-attestation-supersedes-selection-and-owns-realization-coverage.md),
[Dumling API](../../../dumling/src/operations/api-shape.ts)). Expanding which
fixed realized Segments Dumgen supplies changes values and associations, not
that topology.

The following #69-era decisions are intentionally superseded by #82:

- #74's warning that associated governed non-members do not become members is
  retained for free complements/adjuncts, but no longer excludes an overt
  governed preposition that is itself fixed target material.
- #76's “exactly `segment` and `resolve`” public seam and private
  `AnalysisTarget` are replaced by the public generic classification action.
  Its promise not to change prompt policy is also spent: #82 deliberately
  changes German membership policy.
- #76's public `GrammaticalInteraction` echo of sentence ID, click, and member
  indices is deleted in favor of caller-owned sentence/click plus the public
  target. The live contracts to change are
  [`src/types.ts`](../../src/types.ts),
  [`battery/dumgen/CONTEXT.md`](../../CONTEXT.md),
  [`prompt-chains.md`](../persistent/prompt-chains.md), and Laboratory's
  [`shared/contract.ts`](../../../../app/laboratory/src/shared/contract.ts).
- #77's “preserve all linguistic analyses” migration guarantee remains true of
  that historical Selection-to-Attestation migration, but is not a prohibition
  on #82's explicitly authorized German reanalysis. Only the enumerated
  affected sources change; unrelated DE/EN/HE docs remain untouched.

The actual Selection API stays deleted. ADR 0003's hard break, the public ID
test that rejects historical Selection IDs, and Dumdict's absence of Selection
aliases remain correct and need no compatibility layer
([ID rejection test](../../../dumling/tests/external/ling-id/ling-id-public.test.ts),
[Dumdict boundary](../../../dumdict/docs/dumling-features-request.md)). Historical
references in accepted/partially superseded ADRs and the explicitly historical
Dumdict v1 testing strategy are provenance, not live contracts; do not rewrite
them
([ADR 0002](../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md),
[historical strategy](../../../dumdict/docs/v1-architecture/TESTING_STRATEGY.md)).
Prompt Assembly `CaseSelection`/`Demonstration Selection` vocabulary is also
unrelated to the retired Dumling Selection entity and must not be renamed by a
blind repository migration.

## Identity and compatibility consequences

### Stable identities

- Lemma and Reading identity **algorithms** do not change. Existing Lemma IDs
  and Reading identity keys remain stable when their own identity inputs are
  unchanged; no AUX or lexical Lemma is renamed or rekeyed.
- Attestation remains fleeting and has no identity codec.
- Segmented Sentence IDs, source Segment indices, and clicks remain owned by
  Dumgen/application code and do not enter Dumling identity.
- For an unchanged docs `sentenceMarkdown`, the occurrence slug remains the
  same because the current generator derives it from that markdown
  ([slug generator](../../../../app/dumling-docs/scripts/generate-content/attestations/entity/attestation-slug.ts)).

### Changed click-to-entity association

Stable identity does not mean every click selects the same entity as before.
Under click invariance, clicking either member of `hat gearbeitet`,
`wird arbeiten`, or `wurde gebeten` now returns the lexical VERB target and its
Lemma (or the applicable whole Phraseme), not a standalone AUX Lemma for the
auxiliary click. The same is true for the downstream learner Reading. The AUX
Lemma/Reading identities remain valid and may still be reached by later
drill-down classification; they are simply no longer the high-level association
for these periphrastic clicks.

Laboratory's in-memory Reading candidates are keyed by the complete selected
Lemma, and its resolved-unit cache is keyed by sentence/member index
([Reading and member caches](../../../../app/laboratory/src/classification.ts)).
Deployment/test migration must clear or rebuild those caches so an auxiliary
member cannot return a stale AUX unit after another member returns the lexical
unit. Fixtures must assert that every auxiliary/lexical member click shares the
same target, Attestation, lexical/Phraseme Lemma, and Reading.

Dumdict also keys lookup by the complete Lemma and Reading by
`(Lemma, emojiDescription)`; Surface entries carry `ownerLemma`
([identity functions](../../../dumdict/src/core/identity.ts),
[service request](../../../dumdict/src/public/service.ts),
[stored entries](../../../dumdict/src/dto/entries.ts)). Therefore persisted
evidence produced solely by the old high-level AUX-click association requires a
semantic cleanup, not an ID-codec migration:

1. find affected perfect/future/passive AUX-linked Reading and Surface records;
2. create or reuse the correct lexical VERB/Phraseme Reading and expanded
   Surface under their ordinary identities;
3. move/copy only occurrence strings and learner notes that genuinely describe
   the lexical/Phraseme reading, then remove the misassociated AUX evidence; and
4. retain legitimate AUX drill-down Readings, Surfaces, relations, and evidence.

Dumdict's `ReadingEntry.attestations: string[]` is learner evidence attached to
a Reading, not the fleeting Dumling `Attestation` entity. Its storage contract
does not automatically follow a new high-level click result
([append operation](../../../dumdict/src/core/plan-mutation/append-reading-attestation.ts)).
Do not bulk-rekey an AUX Reading as a VERB Reading or rewrite its relations; the
two are different semantic identities. Where no old high-level results were
persisted, this cleanup has no data effect.

### Intentionally changed Surface identity

Dumling Surface identity includes `normalizedSurface` and the linked Lemma
identity. Adding previously omitted fixed material therefore changes the
Surface ID for affected units by design. The Lemma identity algorithm remains
stable, but the *selected linked Lemma* also changes for an auxiliary click that
previously resolved to AUX and now resolves to the lexical VERB/Phraseme
([identity ADR](../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md),
[Dumdict Surface ID boundary](../../../dumdict/src/dumling.ts)). Repository
fixtures and generated docs must be regenerated. Any persisted Dumdict Surface
references need an ordinary upsert/reindex migration; there is no Attestation
ID or old-to-new Surface alias to preserve.

This does not violate the identity ADR: the identity input has intentionally
changed from, for example, `wartet` to `wartet auf`. Do not hide the change
behind a compatibility decoder or retain the wrong normalized string merely to
keep bytes stable.

If a docs source changes its bracketed `sentenceMarkdown` to display the whole
high-level target, its slug also changes. Treat that as a regenerated content
route under the repository's already accepted hard migration, or preserve an
old drill-down example as a separately labelled source. Do not make the
Attestation schema carry a “target level” field just to stabilize documentation
URLs.

### Runtime compatibility

The current Dumgen cache keys a resolved unit under every target member, and
the Laboratory repeats a similar fan-out cache
([Dumgen cache](../../src/dumgen/implementation.ts),
[Laboratory cache](../../../../app/laboratory/src/classification.ts)). Expand the
cache only after validation and key every member, including repeated strings at
different indices. The same sentence object/ID and any member click must return
the same target and Attestation. Classification-only and later-Unresolved
results also need an internal target cache so public classification and grammar
resolution cannot disagree.

This is a deliberate public Dumgen type break: callers must handle `classify`,
the staged Unresolved union, and target-bearing result branches. Do not ship a
second legacy `GrammaticalInteraction` or trace-reconstruction adapter; that
would leave two authorities for membership.

## Dependency-ordered implementation plan

1. **Accept both ADRs and update domain docs before corpus work.** Accept the
   system target/Attestation ADR and the Dumgen canonical-evidence/adapter ADR;
   then supersede the affected Target, Prompt Source, Golden Corpus,
   Demonstration Selection, Prompt Assembly, and Prompt Experiment clauses in
   `battery/dumgen/CONTEXT.md`, plus Dumling normalization/coverage guidance and
   any `CONTEXT-MAP.md` links. Freeze the public action, member boundary,
   reachability, evidence ownership, feature projection, and identity/association
   consequences before #84 creates the representation-neutral corpus.
2. **Run the two independent prerequisites after the ADR gate.** #86 aligns
   VERB/Phraseme resolution policies, Surface normalization, Full/Partial docs,
   positional assertions, and affected identity fixtures against the existing
   internal target while preserving AUX drill-down. In parallel, #84 removes
   PUNCT from the reachable high-level inventory and freezes canonically owned
   full-Segmented-Sentence/original-index schemas, collections, explicit
   demonstration/held-out selections, validators, and the pure evaluator.
   Punctuation remains context and a negative membership assertion; the corpus
   must not import a candidate Prompt Source schema.
3. **Complete #85 through adapters after #84.** Add the bounded
   canonical-experiment and external-provenance Prompt Assembly seams,
   materialize the same frozen demos
   through each DTO adapter, decode every result to the canonical shape, and
   compare with the pure evaluator. Validate round trips, contamination, and
   private-stimulus collisions before selecting an arm. Append the retained
   evidence/choice to the logbook. Neither #84 nor #85 changes the public result
   contract or redefines the glossary accepted in step 1.
4. **Land #87 after both #85 and #86.** Apply #85's selected strategy to
   the authored high-level prompt/schema while keeping #84's canonical evidence
   unchanged. Update
   `src/types.ts`, `src/dumgen.ts`, `src/dumgen/build.ts`, exports, target
   validation/cache, public tests, the generated target prompt, and the README
   generator. Add the positive and negative boundaries enumerated above.
5. **Land #88's complete pipeline and Laboratory integration.** Make
   `resolve.grammatical` consume the same cached classification, retain target
   on every post-classification branch, remove
   `GrammaticalInteraction`/route duplication, delete Laboratory
   trace/Attestation reconstruction, and preserve discontinuous highlighting.
6. **Regenerate and verify all prompt assets.** Regenerate affected grammar and
   target prompts and run schema, Golden Corpus, evaluator, route, runtime,
   cache, and public-contract tests.
7. **Migrate documentation and persistence fixtures.** Update authored docs
   examples/feature claims, append logbook supersessions, regenerate content,
   README, CSVs, fixtures, and changed Surface IDs. Audit persisted
   perfect/future/passive AUX-click associations and perform the scoped Dumdict
   Reading/Surface evidence cleanup above without deleting legitimate AUX
   drill-down entities.
8. **Run the full workspace checks.** Include formatting, type checking, unit
   and integration tests, generated-file cleanliness, and a repository search
   for old claims that governed prepositions/reflexives/analytic auxiliaries
   are excluded from high-level members.

The public contract is already settled and can be documented immediately, but
its implementation in #87 remains blocked by #84/#85 and #86 exactly as the
#82 dependency graph records. Laboratory integration remains #88 after #87.

## Explicit non-changes

- Do not add `HighLevelTargetClassification`, `AnalysisTarget`, Segment IDs,
  Segment indices, clicks, routes, or marked context to Dumling.
- Do not add an Attestation ID, target-level flag, member-role union, aggregate
  verbal-complex DTO, or free-valency graph.
- Do not change Lemma canonical forms, Lemma/Reading identity algorithms, or the
  verified German feature atom inventory merely because the selected
  click-to-entity association changes.
- Do not group modal constructions, copulas with predicates, free arguments,
  adjuncts, or modifiers.
- Do not infer membership from adjacency or POS alone.
- Do not delete the AUX route or prevent later AUX/preposition/pronoun
  drill-down merely because the item participated in a high-level unit.
- Do not rename/rekey/delete valid AUX Lemmas or Readings when high-level
  perfect/future/passive clicks switch association; migrate only evidence that
  was attached under the superseded high-level policy.
- Do not resurrect Dumling Selection APIs, IDs, interaction fields, or aliases;
  Prompt Assembly Case Selections are a different concept.
- Do not use `Partial` to excuse a missing overt target member.
- Do not expose the #85 experimental prompt DTO through the public action.
- Do not make punctuation clickable, emit punctuation as `ResolvableText`, or
  manufacture such Segments in fixtures to cover `Lexeme/PUNCT`; do not delete
  Dumling PUNCT or its separate general Grammatical Resolution inventory.
- Do not bind #84's canonical corpus/evaluator to one #85 model DTO, copy the
  corpus into candidate Prompt Source directories, or let candidates choose
  different demonstration/held-out IDs.
- Do not force the representation-neutral experiment seam onto unrelated
  schema-bound Grammatical Resolution corpora.
- Do not hand-edit generated prompts, generated docs/CSVs, or rewrite historical
  logbook entries.
- Do not reopen #12's broader valency modeling, and do not edit GOAL or VISION.

## Acceptance checks

The migration is aligned when all of the following are mechanically tested:

- every resolved public classification has an ordered non-empty target that is
  identical for clicks on any of its members;
- governed-preposition, inherently reflexive, separable, perfect, future, and
  passive fixtures include every realized fixed component;
- every perfect/future/passive auxiliary-member click selects the same lexical
  VERB/Phraseme Lemma and learner Reading as its lexical member, while explicit
  drill-down AUX fixtures still resolve the standalone AUX entity;
- modal, copula, free-argument, adjunct, and modifier fixtures remain separate;
- PUNCT is absent from the reachable high-level route union; punctuation stays
  non-clickable context, and the corpus/evaluator reject it as membership;
- one canonical #84 corpus and frozen demo/held-out selections feed every #85
  arm; each adapter round-trips canonical ideals, introduces no private-input
  collisions, and all arms are scored by the same pure canonical evaluator;
- `target.memberSegmentIndices.length === attestation.members.length` and each
  position agrees on source text and orthography;
- every post-target grammar result carries that unchanged target, including
  NotImplemented and later Unresolved results;
- normalized Surface is exactly the target-member projection and affected
  Surface IDs change deterministically; Lemma/Reading identity algorithms stay
  fixed while AUX member clicks select the lexical/Phraseme identities;
- repeated same-text members such as the two `auf`s in `Pass auf dich auf` stay
  distinct by source index and position;
- the Laboratory uses no model-exchange or Attestation reconstruction path to
  discover target membership; and
- generated assets are reproducible and repository searches find no current
  normative statement of the superseded narrower policy.
