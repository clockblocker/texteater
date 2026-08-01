# Prompt Chains

Persistent decisions about Dumgen prompt-chain topology. The prompts themselves
remain early work in progress under the laboratory namespace.

## German segmentation chain

The intended runtime chain has exactly two prompt stages:

```text
Source Sentence -> Intake -> Segmentation<Lang>
```

1. **Intake** decides whether the Source Sentence is `Accepted`,
   `UnsupportedLanguage`, or `Unintelligible`.
2. **Segmentation<Lang>** performs language-specific segmentation for an
   accepted Source Sentence. The current scope supports only
   `Segmentation<de>`.

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
  -> Reading Resolution<Lang, Family, Kind>
```

1. **Target Classification<Lang, Policy>** is a family of distinct prompts.
   Each prompt applies one targeting policy to decide which attested Segments
   form the target of analysis and which Lemma Family and Kind should handle
   it. It returns exactly one ephemeral Analysis Target containing the ordered
   Segment indices and grammatical route, or the `Unresolved` domain error. An
   Analysis Target is not yet a Selection because no Surface has been resolved.
2. **Grammatical Resolution<Lang, Family, Kind>** receives that Analysis Target
   and its context, then jointly produces the completed Selection, Surface, and
   Lemma. It owns clicked orthography, Surface normalization, spelling,
   realization coverage, Surface kind and features, canonical form, and Lemma
   core features.
3. **Reading Resolution<Lang, Family, Kind>** receives the fixed Lemma,
   contextual evidence, and the learner's existing Readings for that Lemma. It
   either reuses an existing Reading or drafts a new one. It must not revise or
   otherwise reconsider the resolved Lemma.

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

The view visually marks every member Segment as belonging to the resolved unit.
This applies to discontinuous units as well as contiguous ones. A later click on
another member creates only a new lightweight click-local Selection. Selection
identity continues to include `clickedSegmentIndex`, and `selectedOrthography`
continues to describe only that clicked Segment.

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
