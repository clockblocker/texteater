# Intake-owned units

The contract between Dumgen's `segment.inUnits` (Dumgen ADR 0007) and its
host, tf-demo: what intake produces for a Scroll, what tf-demo stores, and what
hover and a click read. The shapes and the API are TSDoc on `dumgen`'s
exports (`src/index.ts`, `src/segment/segmented-sentence.ts`). The earlier
two-layer Sentence Analysis left with `battery/legacy-dumgen` (#866); its contract is in this file's history before #850.

## Intake

1. A pasted text becomes an Extracted Text of one Scroll
   (`extractPastedText`): Paragraphs and Line Breaks, no Section. tf-demo
   stores that Scroll's Extracted Text on its Scroll, and a later run of the
   same submission starts from the stored one, read back with `parseScroll`
   (#1178, #1189).
2. `splitScroll(scroll)` splits it into paragraphs and Sentences in code
   with the language-neutral `splitText` (#1187). No model is asked.
3. tf-demo reads German Scrolls only for now. A Scroll submitted with another
   target language is rejected before any jev call; `language` stays a
   parameter so Hebrew can follow.
4. `createDumgen({ jev: createTypeSafeAsk({ apiKey }), onOperation })` is the
   production Dumgen. Its `language.detect({ paragraphs })` gives each
   Sentence its Detected Language (Dumgen ADR 0001): code settles Sentences
   with no letters or mostly Hebrew words, jev judges the rest with one
   Choice each in windows of about 30 Sentences, and an undetermined
   Sentence takes the language around it, or none. A failed jev request
   fails the submission. Its `segment.inUnits({ language: "de", paragraphs
   })` gets only the German Sentences and gives each its normalized text,
   its Segments and its biggest units; tf-demo `yield*`s both inside its
   intake program. jev is the only model; the key is the Convex deployment's
   `TYPESAFE_API_KEY`.
5. Every other Sentence is a Plain Sentence: stored with its Detected
   Language (none when undetermined), its normalized text and no Segments,
   and shown in the reader as plain text.
6. A Sentence whose jev calls fail in `segment.inUnits` comes back marked
   `failed`, with its Segments and no units, and the Scroll is stored anyway;
   the reason is only in the operation's trace. Only a non-German target
   language, a blank Sentence, a failed language judgment, a bug or an
   interruption fails the whole submission.
7. Intake is not deterministic, so a stored submission is never segmented
   again: resubmitting the same key and source returns the stored Scroll.

## What tf-demo stores

- A `sentences` row keeps the normalized text as `stitchedText` and the units
  exactly as `segment.inUnits` returned them: ascending Segment indices, the
  route or `Unresolved`, and any route variants.
- `segments` rows are keyed by their index in the Sentence. A fused word that
  segmentation split is stored as its pieces, each with the `surface` it
  stands for. Units and Attestation Membership name Segments by this index
  (Dumgen ADR 0004).
- Every write checks that each ResolvableText Segment belongs to exactly one
  unit and that units name only ResolvableText Segments. A Sentence whose
  segmentation failed is stored with `segmentationFailed` and no units
  instead (#861).
- A Definition Text's single Sentence goes through the same
  `segment.inUnits` in a scheduled action. Notes fixtures skip jev and store
  each word as its own `Unresolved` unit.
- `intakeRuns` keeps one row per submission attempt, read from the
  operations' traces: each Sentence's outcome (Segmented, Failed, NotStarted
  or Plain), the jev calls of `language.detect` and `segment.inUnits`,
  failures, tokens and durations. It never
  keeps text, prompts or model output.

## What hover and a click read

- `scrollViews.get` gives every ResolvableText Segment its whole unit. The
  reader builds one map per Sentence, so hover and focus light every member
  of the unit, discontinuous ones included, with no network call. A Segment
  that belongs to an Occurrence Attestation groups with the occurrence's
  members instead. A Sentence whose segmentation failed shows as not
  segmented: hover previews no word.
- A click on a Segment whose occurrence is already committed reuses it, with
  no model call. Otherwise tf-demo's `ClickResolution` port runs
  `dumgenClickResolution`: Dumgen's `resolve.grammar` takes the stored unit
  under the click, with its Sentence, the neighbouring Sentences and the
  stored Lemmas found under its words, and names the Attestation.
  `resolve.reading` then reuses an Emoji Description of the Lemma's stored
  Readings or makes a new one, and the occurrence commits. A unit intake
  left `Unresolved`, or a Segment with no unit, ends the Resolution Session
  `Unresolved` with no call. The deck shows one Unit Card with the unit's
  words (a gap reads as `…`), its route and any variants until Grammar
  arrives, and settles on it when the click ends `Unresolved`.
- Route variants span one known clash set, and a click is to settle them
  with that clash set's focused prompt (Dumgen ADR 0007). Those prompts are
  not built yet (#869): production `segment.inUnits` emits no variants, and
  a click resolves the unit's first route.

## Live probe

`bun run test:pipeline:live` in `app/tf-demo` asks for interactive
authorization. It then submits one three-Sentence German Scroll through live
jev, checks the stored units, hovers every member of every multi-Segment unit
and clicks one. The 2026-10-02 run made 13 jev calls for its three Sentences,
34,161 input tokens in all.
