# Intake-owned units

The contract between Dumgen's `segment.inUnits` (Dumgen ADR 0007) and its
host, tf-demo: what intake produces for a Text, what tf-demo stores, and what
hover and a click read. The shapes and the API are TSDoc on `dumgen`'s
exports (`src/index.ts`, `src/segment/segmented-sentence.ts`). The two-layer
Sentence Analysis of ADR 0005 and ADR 0006 is frozen in
`battery/legacy-dumgen`; its contract is in this file's history before #850.

## Intake

1. `splitText(text)` splits a Text into paragraphs and Sentences in code. No
   model is asked.
2. tf-demo reads German only for now. A Text submitted in another language is
   rejected before any jev call; `language` stays a parameter so Hebrew can
   follow.
3. `createDumgen({ jev: createTypeSafeAsk({ apiKey }), onOperation })
   .segment.inUnits({ language: "de", paragraphs })` is an Effect that
   gives each Sentence its normalized text, its Segments and its biggest
   units; tf-demo `yield*`s it inside its intake program. jev is the only
   model; the key is the Convex deployment's `TYPESAFE_API_KEY`.
4. A Sentence whose jev calls fail comes back marked `failed`, with its
   Segments and no units, and the Text is stored anyway; the reason is only
   in the operation's trace. Only a non-German language, a blank Sentence,
   a bug or an interruption fails the whole call.
5. Intake is not deterministic, so a stored submission is never segmented
   again: resubmitting the same key and source returns the stored Text.

## What tf-demo stores

- A `sentences` row keeps the normalized text as `stitchedText` and the units
  exactly as `segment.inUnits` returned them: ascending Segment indices, the
  route or `Unresolved`, and any route variants.
- `segments` rows are keyed by their index in the Sentence. A fused word that
  segmentation split is stored as its pieces, each with the `surface` it
  stands for. Units and Attestation Membership name Segments by this index
  (Dumgen ADR 0004, amended 2026-10-02).
- Every write checks that each ResolvableText Segment belongs to exactly one
  unit and that units name only ResolvableText Segments. A Sentence whose
  segmentation failed is stored with `segmentationFailed` and no units
  instead (#861).
- A Definition Text's single Sentence goes through the same
  `segment.inUnits` in a scheduled action. Notes fixtures skip jev and store
  each word as its own `Unresolved` unit.
- `intakeRuns` keeps one row per submission attempt, read from the
  operation's trace: each Sentence's outcome (Segmented, Failed or
  NotStarted), the jev calls, failures, tokens and durations. It never
  keeps text, prompts or model output.

## What hover and a click read

- `textViews.get` gives every ResolvableText Segment its whole unit. The
  reader builds one map per Sentence, so hover and focus light every member
  of the unit, discontinuous ones included, with no network call. A Segment
  that belongs to an Occurrence Attestation groups with the occurrence's
  members instead. A Sentence whose segmentation failed shows as not
  segmented: hover previews no word.
- While click resolution is rebuilt (#848), tf-demo's `ClickResolution` port
  runs `selectUnitOnly`: a click selects the whole unit, and its Resolution
  Session ends `Unresolved` at once. No Note is made and no model is asked.
  The deck settles on one Unit Card with the unit's words (a gap reads as
  `…`), its route and any variants.
- Route variants are for the click to pick from (ADR 0007, amended
  2026-09-30). Until resolution returns, the Unit Card only lists them.

## Live probe

`bun run test:pipeline:live` in `app/tf-demo` asks for interactive
authorization. It then submits one three-Sentence German Text through live
jev, checks the stored units, hovers every member of every multi-Segment unit
and clicks one. The 2026-10-02 run made 13 jev calls for its three Sentences,
34,161 input tokens in all.
