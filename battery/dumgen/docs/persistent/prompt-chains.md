# Prompt Chains

Persistent decisions about Dumgen prompt-chain topology. The prompts themselves
remain early work in progress under the laboratory namespace.

## German segmentation chain

The intended runtime chain has exactly two prompt stages:

```text
Source Sentence -> Intake -> Segmentation<Lang>
```

1. **Intake** resolves the Source Sentence language. `Accepted` carries the
   supported language used to dispatch `Segmentation<Lang>`;
   `UnsupportedLanguage` retains the resolved but unsupported language;
   `Unintelligible` carries no language.
2. **Segmentation<Lang>** performs language-specific segmentation for an
   accepted Source Sentence. The current scope supports only
   `Segmentation<de>`.

For the current scope, Intake resolves exactly one primary language per Source
Sentence and dispatches exactly one Segmentation route. Segmentation preserves
non-primary-language spans as `OpaqueText`. A future multilingual model is
tracked in [texteater#19](https://github.com/clockblocker/texteater/issues/19).

A strict finalizer is evaluation and testing infrastructure, not a third stage
of the intended runtime chain. It exists to expose contract violations during
prompt development, not to compensate for them in runtime operation. The
working assumption is that the configured nano model must follow each stage's
contract consistently once its prompt is sufficiently precise.

## Classification chain

The intended runtime chain follows three distinct linguistic problems:

```text
Segmented Sentence + Click
  -> Target Classification<Lang, Policy>
  -> Grammatical Resolution<Lang, Family, Kind>
  -> Reading Resolution<Lang>
```

### Minimal contracts

Every model-facing prompt has the smallest input and output that its own
judgment requires. Static routing information belongs in the prompt path.
Application-owned identity, copied input, derivable values, presentation data,
and intermediate structures that the next judgment does not need are excluded
from model schemas. The advisory `decision` in Reading Resolution is the one
deliberate redundancy retained as a hallucination guard.

### Contract layers

Dumgen communicates with external callers through the canonical Dumling domain
contracts. Dumling schemas may validate those contracts inside the process, but
they do not constrain the shapes sent to or received from a model.

Each prompt owns internal Dumgen DTOs optimized for its pointed structured
generation task. Those DTOs may differ freely from Dumling shapes. Deterministic
Dumgen mapping converts between the external Dumling contract and the minimal
model-facing representation; model DTOs do not leak across the Dumgen boundary.

Schema-shape mapping for settled routes uses
`codecBuilder4.buildFixedFieldsCodec`. The codec derives the minimal model
schema from the canonical Dumling object, decodes by restoring route-owned
fields such as `language`, `family`, and `kind`, and encodes by validating and
removing those fields. Shared Dumling-backed schema/codecs live outside
Promptsmith so authored Prompt Sources and runtime projection use one model
shape without duplicate omit masks.

`AnalysisTarget` is deliberately exposed as a stable Dumgen-owned,
presentation-facing contract; it is not added to Dumling. It is not a leaked
model DTO: Dumgen maps the private Target
Classification output into the public Analysis Target containing only member
Segment indices, Lemma Family, and Lemma Kind. Other intermediate model DTOs
remain private and may appear only in laboratory traces.

1. **Target Classification<Lang, Policy>** is a family of distinct prompts.
   Each prompt applies one targeting policy to decide which attested Segments
   form the target of analysis and which Lemma Family and Kind should handle
   it. It returns exactly one ephemeral Analysis Target containing the ordered
   Segment indices and grammatical route, or the `Unresolved` domain error. An
   Analysis Target is not yet a Selection because no Surface has been resolved.
   This is the only classification stage that receives the indexed Segment
   array.

   Its complete runtime input and output are:

   ```ts
   type TargetClassificationInput = {
     clickedSegmentIndex: number;
     segments: { kind: SegmentKind; text: string }[];
   };

   type TargetClassification =
     | {
         decision: "Resolved";
         memberSegmentIndices: number[];
         family: Family;
         kind: KindFor<Family>;
       }
     | { decision: "Unresolved" };
   ```

   Segment indices are array positions and are not copied into each input
   Segment. Resolved member indices are ordered, unique, reference only
   `ResolvableText`, and include the clicked index. Language and targeting
   policy are fixed by the prompt path.
2. **Grammatical Resolution<Lang, Family, Kind>** receives that Analysis Target
   and its context, then produces the linguistic judgments needed for the
   application to construct the Selection, Surface, and Lemma. It owns member
   orthography, Surface normalization, spelling, realization coverage, Surface
   kind and features, canonical form, and Lemma core features. Each supported
   `<Lang, Family, Kind>` route is a physically distinct prompt with its own
   instructions and pointed model-facing schema; there is no generic union
   prompt that receives Family and Kind as runtime options.
   The dispatched prompt must preserve its route exactly or return `Unresolved`;
   it cannot silently change Family or Kind.

   Its complete runtime prompt input is:

   ```ts
   { markedContext: string }
   ```

   Language, Family, and Kind are fixed by the prompt path. The resolver emits
   one ordered orthography value per `<TARGET>` marker; the application aligns
   those values with the cached Analysis Target member indices.

   Its output contains only model-owned judgments:

   ```ts
   type GrammaticalResolution =
     | {
         decision: "Resolved";
         memberOrthographies: ("Standard" | "Typo")[];
         surface: ModelSurfaceFields;
         lemma: ModelLemmaFields;
       }
     | { decision: "Unresolved" };
   ```

   The application owns Segmented Sentence identity, clicked index, member
   indices, and `attestedSurface`. It constructs the click-local Selection and
   links the returned Surface to the returned Lemma.
3. **Reading Resolution<Lang>** receives the fixed Lemma,
   contextual evidence, and the learner's existing Readings for that Lemma. It
   either reuses an existing Reading or drafts a new one. It must not revise or
   otherwise reconsider the resolved Lemma. There is one physically distinct
   prompt per language because its judgment does not depend on Lemma family or
   kind.

   ```ts
   type ReadingResolution =
     | { decision: "Reuse"; emojiDescription: string }
     | { decision: "New"; emojiDescription: string };
   ```

   Exact `emojiDescription` membership in the supplied existing descriptions is
   authoritative. A match means reuse; a miss means the application combines
   the new description with the already-fixed Lemma. The model's `decision`
   field is advisory redundancy intended to discourage hallucination and expose
   inconsistent reasoning. It never overrides the match-derived result. A
   disagreement between `decision` and exact membership is retained as a prompt
   quality diagnostic rather than used for application behavior.

   An Emoji Description contains only one emoji or a compact emoji sequence.
   It never includes the Lemma text, a gloss, or explanatory prose.

   The supplied membership set contains only Emoji Descriptions from the
   current learner's existing Readings for the exact resolved Lemma. Readings
   owned by other learners or attached to other Lemmas are excluded. An empty
   set necessarily makes the match-derived result `New`.

   Its system-facing input retains the complete Lemma so the application can
   select descriptions for the matching Lemma identity, including family and
   kind:

   ```ts
   {
     markedContext: string;
     lemma: Lemma<Lang>;
     existingEmojiDescriptions: string[];
   }
   ```

   Family, kind, and core features are system-owned routing and identity data.
   They are projected out before the LLM call. The complete model input is:

   ```ts
   {
     markedContext: string;
     lemma: string; // canonicalForm
     existingEmojiDescriptions: string[];
   }
   ```

   Selection and Surface data are not repeated in Reading Resolution.

### Context after target classification

After Target Classification, classifiers do not receive the Segment array.
The authoritative sentence context is:

```ts
const sentenceText = segments.map(({ text }) => text).join("");
```

Grammatical Resolution and Reading Resolution receive this string together
with the already-resolved target, Surface, Lemma, or Reading evidence required
by their own pointed contracts. Segment indices remain application-owned
bookkeeping for Selection identity, reuse, and visual resolved-unit state.

Because repeated text can make an unmarked target ambiguous, the application
also derives a prompt-only marked-context string from the cached Analysis
Target. Every participating member is wrapped independently, including members
of a discontinuous unit:

```text
Fritz, <TARGET>steh</TARGET> sofort <TARGET>auf</TARGET>!
```

Both downstream classifiers receive this same marked context. The markers are
prompt evidence only; they never alter the authoritative Segmented Sentence,
Surface, Lemma, Reading, or attestation.

### Target classification policies

Each clickable region is bound by its view to exactly one policy-specific
Target Classification prompt. One click produces one classification; a prompt
never returns several targets or levels.

Drill-down happens through a new clickable region exposed by the resulting
entry. That region invokes its own Target Classification policy. It is a new
click in a new view, not a reclassification of the original click. Dumling
entities at every supported level remain first-class targets.

The current work covers only the high-level, whole-unit policy. It selects a
defensible conventionalized unit containing the click, so proverbs, discourse
formulae such as `Guten Morgen`, and phrasal or separable verbs can be treated
as one target. When no larger conventionalized unit contains the click, this
policy falls back to the ordinary word-level Lexeme.

The high-level policy never selects a Morpheme as the initial target. Morphemes
are reached only through a new clickable region in a drill-down view bound to a
dedicated morpheme-level Target Classification policy. Other lower-level
targeting policies are deferred.

### Resolved-unit reuse

Every clickable Segment participating in one conventionalized unit must resolve
under the same policy to the same Analysis Target: identical ordered member
indices, Lemma Family, and Lemma Kind. The originally clicked index may differ.

After the first complete resolution, the application retains the Analysis
Target, Surface, Lemma, and Reading in memory for its Segmented Sentence, view,
and policy, and associates every member Segment index with that result. Clicking
another member reuses the complete linguistic resolution without another model
call.

The first Grammatical Resolution classifies `Standard` or `Typo` orthography
for every member Segment and retains those member-indexed values with the cached
result. When another member is clicked, the application copies that member's
cached value into the new Selection's clicked-only `selectedOrthography`.

The view visually marks every member Segment as belonging to the resolved unit.
This applies to discontinuous units as well as contiguous ones. A later click on
another member creates only a new lightweight click-local Selection. Selection
identity continues to include `clickedSegmentIndex`, and `selectedOrthography`
continues to describe only that clicked Segment.

### Incremental resolution-route rollout

Target Classification may select any valid route allowed by its policy, but a
route is not part of the executable resolution chain merely because a WIP
catalog prompt exists for it.

The initial enabled post-click grammatical route is exactly
`<de, Lexeme, NOUN>`. Every successfully resolved German Lemma then uses the
shared `Reading Resolution<de>` prompt. When Target Classification selects a
route without an enabled Grammatical Resolution prompt, application
orchestration returns:

```ts
type ResolutionRouteNotImplemented = {
  decision: "NotImplemented";
  stage: "GrammaticalResolution";
  language: string;
  family: string;
  kind: string;
};
```

The chain stops before another model call and creates no Selection. This result
is visible and logged in the laboratory. It is not `Unresolved`: Target
Classification made a valid judgment, but the selected downstream route has
not been implemented yet.

Hands-on development stabilizes German nouns first. After that slice is
accepted, one new part-of-speech route is selected, implemented, and verified
at a time.

### Resolution expectation

`ResolvableText` is a happy-path promise made by Segmentation<de>: clicking it
is expected to produce a defensible Analysis Target and then a `Selection`,
`Surface`, and `Lemma`. Material for which that promise cannot be made belongs
in `OpaqueText`.

Every Target Classification policy must nevertheless support the explicit
`Unresolved` domain error. `Unresolved` creates no Selection and is a diagnostic
failure, not an acceptable normal branch of the learner flow. Each occurrence
identifies a segmentation or classification prompt problem to capture as a
problematic case and fix. Material known to be unresolvable is classified as
`OpaqueText` by Segmentation<Lang> and never reaches Target Classification.
