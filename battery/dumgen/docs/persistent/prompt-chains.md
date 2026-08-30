# Prompt Chains

**Status: current runtime contract.** Accepted local ADR 0001 governs Intake
and Source Segmentation. Prompt experiments remain laboratory evidence; the
runtime stages described here are implemented production behavior.

## Segmentation chain

```text
Source Sentence
  -> Intake model call
  -> if Accepted: deterministic Source Segmentation<Lang>
```

The batch-only public operation makes exactly one Intake model call. Intake and
Source Segmentation remain distinct stages, but German and Hebrew segmentation
are deterministic local modules and never make a second model call. A rejected
Intake Decision stops the chain before Source Segmentation.

Intake returns one of:

- `Accepted` with an Enabled Segmentation Language, used to dispatch
  `SourceSegmentation<Lang>`
- `UnsupportedLanguage` without a language projection
- `Unintelligible` without a language

For now, Intake resolves one primary language and dispatches one route. German
and Hebrew are enabled. Their Source Segmentation modules preserve
non-primary-language spans as `OpaqueText`. Multilingual routing is deferred to
[texteater#19](https://github.com/clockblocker/texteater/issues/19).

## Classification chain

```text
Segmented Sentence + Click
  -> Target Classification<Lang, Policy>
  -> Grammatical Resolution<Lang, Family, Kind>
  -> Reading Resolution<Lang>
```

Each prompt receives only the data needed for its judgment. The prompt path
owns static routing data. Code owns identity, copied input, derivable values,
presentation data, and validation. Reading Resolution's `decision` is the sole
deliberate redundancy; it helps expose hallucination without controlling
application behavior.

Human-authored runtime Prompt Sources live under
`src/promptsmith/production/**/prompt-source.ts`. Prompt experiments and their
evaluators live under `src/promptsmith/laboratory/experiments`; they do not
define a second runtime chain.

Consumers enter these chains through `segment`, `resolve.grammatical`, and
`resolve.reading`. The prompt catalog and its stage topology are internal to
Dumgen. `onModelExchange` is the instrumentation seam for laboratory traces.

### Model boundary

Where a canonical Dumling contract exists, Dumgen uses it for external results.
Each migrated prompt uses a private, minimal Dumgen DTO. Deterministic mapping
connects the two. Model DTOs never become domain results, though laboratory
traces may expose them.

For settled routes, `codecBuilder4.buildFixedFieldsCodec` derives a model schema
from a Dumling object. Decode restores route fields such as `language`,
`family`, and `kind`; encode validates and removes them. Shared Dumling-backed
schemas and codecs live outside Promptsmith so authored sources and runtime use
the same model shape.

`AnalysisTarget` is an internal intermediate. It contains only member Segment
indices, Lemma Family, and Lemma Kind, and does not belong in Dumling. A
successful public operation returns the constructed Attestation and Dumgen
interaction projection; a disabled route returns only its correlated Family
and Kind.

### 1. Target Classification

`Target Classification<Lang, Policy>` decides which attested Segments form the
target and which grammatical route handles it. It is the only classification
stage that receives the Segment array.

```ts
type TargetClassificationInput = {
  clickedSegmentIndex: number;
  segments: { kind: SegmentKind; text: string }[];
};

type TargetClassification =
  | {
      memberSegmentIndices: number[];
      family: Family;
      kind: KindFor<Family>;
    }
  | { decision: "Unresolved" };
```

Member indices are ordered, unique, point only to `ResolvableText`, and include
the clicked index. Language and policy come from the prompt path. An Analysis
Target is not an Attestation because no Surface has been resolved.

### 2. Grammatical Resolution

`Grammatical Resolution<Lang, Family, Kind>` receives the marked target in
context. It resolves member orthography, Surface normalization, spelling,
realization coverage, Surface kind and features, canonical form, and Lemma core
features.

Each supported route is a separate prompt with its own smallest codec-derived
schema. Target Classification already fixed route and membership, so the
operation is total: invalid model output is a contract error, not a route
decision or `Unresolved` result.

The complete prompt input is:

```ts
{ markedContext: string; members: string[] }
```

Its internal projected result contains one orthography per `<TARGET>` marker:

```ts
type ModelGrammaticalResolution = {
  memberOrthographies: ("Standard" | "Typo")[];
  normalizedMembers: string[];
  surface: RouteSpecificModelSurface;
  lemma: RouteSpecificModelLemma;
  // Phraseme only; application injects Full for Lexeme and Construction.
  realizationCoverage?: "Full" | "Partial";
};
```

Dumgen injects language, Family, Kind, Surface-to-Lemma linkage, normalized
Surface, successful result construction, and fixed route fields. It aligns
orthographies with Analysis Target members. It owns Segmented
Sentence identity, the click and member indices, and exact attested member text.
It zips target members with orthographies, constructs the Attestation, links the
Surface to the Lemma, and returns the click-independent Attestation beside the
Dumgen-owned interaction projection. Target indices, TARGET pairs,
orthographies, Attestation members, and normalized Surface projection align
one-to-one in source order.

### 3. Reading Resolution

`Reading Resolution<Lang>` receives a fixed Lemma, marked context, and the
learner's existing Readings for that exact Lemma. It reuses one Reading or
drafts a new one. It never revisits the Lemma. Routes vary only by language.

```ts
type ReadingResolution = {
  decision: "Reuse" | "New";
  emojiDescription: string;
};
```

Exact membership in `existingEmojiDescriptions` determines the result. A match
means `Reuse`; a miss means `New`. The model's `decision` is diagnostic only and
never overrides membership. Log disagreement instead of changing the result.
An empty set therefore means `New`.

The caller supplies descriptions only from the current learner's Readings for
the exact resolved Lemma. It excludes other learners and Lemmas.

The public operation accepts the canonical spelling already selected from the
fixed Lemma:

```ts
{
  markedContext: string;
  lemma: string; // canonicalForm
  existingEmojiDescriptions: string[];
}
```

Attestation and Surface data are not repeated. An Emoji Description contains one
to four Unicode RGI emoji graphemes, never Lemma text, a gloss, or prose. See
[Emoji Description Authoring](./human-owned-and-verified/emoji-description-authoring.md).

## Context and target markers

After Target Classification, the Segment array is no longer model input. The
authoritative sentence text is:

```ts
const sentenceText = segments.map(({ text }) => text).join("");
```

Dumgen also derives prompt-only marked context from the authoritative Segmented
Sentence and internal Analysis Target. Every member gets its own markers,
including discontinuous members:

```text
Fritz, <TARGET>steh</TARGET> sofort <TARGET>auf</TARGET>!
```

Both downstream prompts receive this marked context. Markers never alter
Segmented Sentence, Surface, Lemma, Reading, or attestation data.

## Target policy

Each clickable region binds to one policy-specific Target Classification
prompt. One click produces one target at one level.

Drill-down uses a new clickable region and its own policy. It is a new click,
not reclassification of the original one. Dumling entities at every supported
level remain first-class targets.

The current `HighLevelWholeUnit` policy selects a defensible fixed unit
containing the click, including proverbs, discourse formulae such as
`Guten Morgen`, idioms, and separable verbs. Conventional but non-idiomatic
Collocations such as `eine Entscheidung treffen` remain separate Lexeme
targets. For German VERBs the policy also selects every realized fixed
component: governed prepositions, inherently reflexive pronouns, detached
separable members, and perfect/future/passive auxiliaries. It excludes modals
with lexical verbs, copulas with predicates, free arguments, contextual
reflexives, adjuncts, and modifiers. Otherwise it selects the word-level
Lexeme. It never selects a Morpheme; a future morpheme policy will handle that
through drill-down.

The private grammar output returns one positionally aligned `normalizedMembers`
entry per target member. Dumgen validates those entries and constructs the
Surface's `normalizedSurface` by joining them with one space. Expanding fixed
membership therefore intentionally changes affected Surface identities. The
lexical head still owns VERB inflectional features and
the Lemma retains its dictionary `canonicalForm`; analytic auxiliaries do not
donate finite features or rename the Lemma.

Target markup fixes the resolution level. Under this policy, clicks on `eine`,
`Entscheidung`, and `treffen` resolve their ordinary Lexeme targets separately;
the contextual support use does not introduce a `Light` Core Feature or a
second Lemma identity. `Phraseme/Collocation` remains available to other
explicit target policies rather than being inferred by this one.

## Resolved-unit reuse

Under one policy, every Segment in a conventionalized unit must resolve to the
same ordered member indices, Family, and Kind. Only the clicked index may vary.

The cache is scoped to Segmented Sentence, view, and policy. Each view owns a
dedicated Dumgen instance, which caches the validated grammatical unit and its
member orthographies. After the first complete resolution, the application
stores the Analysis Target, click-independent Attestation, Surface, Lemma, and
Reading for every member. Clicking another member makes no model call.

The view marks all members of the unit, including discontinuous ones. The
interaction value changes `clickedSegmentIndex`, while the cached Attestation
and its per-member orthographies remain unchanged.

## Incremental route rollout

Target Classification may select any valid route allowed by its policy. A WIP
catalog prompt does not enable that route.

Every route reachable from the current German classifier is enabled. The
authored `Lexeme/X` resolver remains available for upstream compatibility but
is not currently selected. `Lexeme/PUNCT`, Morphemes, and excluded
`Phraseme/Collocation` stop before Grammatical Resolution and return:

```ts
type ResolutionRouteNotImplemented = {
  decision: "NotImplemented";
  language: Lang;
  route: GrammaticalRoute<Lang>;
};
```

This is not `Unresolved`: classification succeeded, but its resolver is not
enabled. It creates no Attestation and remains visible in laboratory logs. Add
and verify one part-of-speech route at a time.

## Resolution failure

For an enabled route, `ResolvableText` promises that a click should produce an
Analysis Target, Attestation, Surface, and Lemma. A valid disabled route ends in
`NotImplemented`. Known unresolvable material must be `OpaqueText` and never
reach Target Classification.

Target Classification may still return `Unresolved` before it establishes a
valid route. Grammatical Resolution does not: after classification, malformed
or indefensible output is an execution/contract error. Record it and fix the
responsible projection, schema, or route prompt.
