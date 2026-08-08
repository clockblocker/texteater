# Prompt Chains

Decisions about Dumgen prompt topology and boundaries. The prompts remain
laboratory work in progress.

## Segmentation chain

```text
Source Sentence
  -> Intake model call
  -> if Accepted: Segmentation<Lang> model call
```

This is always a chain of two distinct, sequential model calls. Intake and
Segmentation are never combined into one prompt or call. A rejected Intake
Decision stops the chain before Segmentation.

Intake returns one of:

- `Accepted` with an Enabled Segmentation Language, used to dispatch
  `Segmentation<Lang>`
- `UnsupportedLanguage` with the resolved language
- `Unintelligible` without a language

For now, Intake resolves one primary language and dispatches one route. Only
`Segmentation<de>` is enabled. It preserves non-primary-language spans as
`OpaqueText`. Multilingual routing is deferred to
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
successful public operation returns the constructed Selection; a disabled route
returns only its correlated Family and Kind.

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
Target is not a Selection because no Surface has been resolved.

### 2. Grammatical Resolution

`Grammatical Resolution<Lang, Family, Kind>` receives the marked target in
context. It resolves member orthography, Surface normalization, spelling,
realization coverage, Surface kind and features, canonical form, and Lemma core
features.

Each supported route is a separate prompt with its own schema. It must preserve
its route or return `Unresolved`; it cannot change Family or Kind.

The complete prompt input is:

```ts
{ markedContext: string }
```

Its internal projected result contains one orthography per `<TARGET>` marker:

```ts
type GrammaticalResolution =
  | {
      decision: "Resolved";
      memberOrthographies: ("Standard" | "Typo")[];
      surface: Omit<Surface<Lang>, "lemma">;
      lemma: Lemma<Lang>;
    }
  | { decision: "Unresolved" };
```

Dumgen aligns orthographies with Analysis Target members. It owns Segmented
Sentence identity, the click and member indices, and `attestedSurface`; it
constructs the Selection and links the Surface to the Lemma before returning a
public grammatical result.

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

Selection and Surface data are not repeated. An Emoji Description contains one
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

The current `HighLevelWholeUnit` policy selects a defensible conventionalized
unit containing the click, including proverbs, discourse formulae such as
`Guten Morgen`, support-verb Collocations such as `eine Entscheidung treffen`,
and separable verbs. Otherwise it selects the word-level Lexeme. It never
selects a Morpheme; a future morpheme policy will handle that through
drill-down.

Target markup fixes the resolution level. A whole-unit target on `eine
Entscheidung treffen` resolves its `Phraseme/Collocation` Lemma. An explicit
verb drill-down in the same context resolves the ordinary `Lexeme/VERB` Lemma
`treffen`; the contextual support use does not introduce a `Light` Core Feature
or a second Lemma identity.

## Resolved-unit reuse

Under one policy, every Segment in a conventionalized unit must resolve to the
same ordered member indices, Family, and Kind. Only the clicked index may vary.

The cache is scoped to Segmented Sentence, view, and policy. Each view owns a
dedicated Dumgen instance, which caches the validated grammatical unit and its
member orthographies. After the first complete resolution, the application
stores the Analysis Target, Surface, Lemma, Reading, and click-local Selection
for every member. Clicking another member makes no model call.

The view marks all members of the unit, including discontinuous ones. Selection
identity still includes `clickedSegmentIndex`, and `selectedOrthography` still
describes only that Segment.

## Incremental route rollout

Target Classification may select any valid route allowed by its policy. A WIP
catalog prompt does not enable that route.

Initially, only `<de, Lexeme, NOUN>` Grammatical Resolution is enabled. Every
resolved German Lemma then uses `Reading Resolution<de>`. For another valid
route, orchestration stops before Grammatical Resolution and returns:

```ts
type ResolutionRouteNotImplemented = {
  decision: "NotImplemented";
  language: Lang;
  route: GrammaticalRoute<Lang>;
};
```

This is not `Unresolved`: classification succeeded, but its resolver is not
enabled. It creates no Selection and remains visible in laboratory logs. Add
and verify one part-of-speech route at a time.

## Resolution failure

For an enabled route, `ResolvableText` promises that a click should produce an
Analysis Target, Selection, Surface, and Lemma. A valid disabled route ends in
`NotImplemented`. Known unresolvable material must be `OpaqueText` and never
reach Target Classification.

Target Classification and Grammatical Resolution still support `Unresolved`.
`Unresolved` creates no Selection and is a diagnostic failure, not a normal
learner-flow branch. Record each case and fix the responsible Segmentation,
Target Classification, or Grammatical Resolution prompt.
