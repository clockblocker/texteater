# Prompt Logbook

This is the single review queue for prompt examples, policy tensions, and open
questions that deserve human thought after automated prompt authoring and
evaluation. Routine failures and run output stay with their Prompt Experiments.

Add an entry when a tricky case reveals a real ambiguity, challenges an
existing policy, or suggests that the prompt approach may need to change. Keep
the example in its Golden Corpus when it is valid; the logbook records why it
is worth revisiting.

## Entry format

```markdown
### <short question or case name>

- **Route:** `<prompt route>`
- **Golden Case:** `<case ID or proposed marked-context example>`
- **Raised by:** <Wayfinder ticket or retained run>
- **Question:** <the policy or linguistic judgment that needs thought>
- **Current take:** <the best provisional answer, including uncertainty>
```

## Open

<!-- Append new entries here. -->

### Coordinate ellipsis as a Partial noun Surface

- **Route:** `grammatical-resolution/de/lexeme/noun`
- **Golden Case:** `grammar-de-noun-partial-coordinate-ellipse-kinderbuch`
- **Raised by:** Wayfinder issue #30
- **Question:** In `Kinder- und Jugendbücher`, should the selected `Kinder`
  attestation resolve as a Partial inflected Surface of `Kinderbuch`, including
  plural features supplied by the shared final constituent?
- **Current take:** Provisionally yes. The corpus pins `Kinder` as Partial,
  accusative plural, while preserving the unattested `buch` only in the
  complete Lemma. This needs domain review before becoming general policy.

### Gender for the plural-only Lemma Leute

- **Route:** `grammatical-resolution/de/lexeme/noun`
- **Golden Case:** `grammar-de-noun-vocative-leute-unmarked-case`
- **Raised by:** Wayfinder issue #30
- **Question:** Should `Leute` carry a grammatical gender when the Lemma is
  plural-only and the vocative-like attestation does not mark case?
- **Current take:** Provisionally use `gender: null` and `case: null`, while
  retaining plural number. A later domain decision may choose a lexical gender
  convention independent of this context.

### U-Bahn target segmentation and Hyph

- **Route:** `grammatical-resolution/de/lexeme/noun`
- **Golden Case:** `grammar-de-noun-hyphenated-u-bahn`
- **Raised by:** Wayfinder issue #30
- **Question:** Does the upstream chain reliably deliver `U-Bahn` as one TARGET
  member, and does `hyph: Yes` describe this lexicalized spelling rather than
  target membership?
- **Current take:** Provisionally treat the single TARGET as one complete noun
  Surface and set `hyph: Yes` on the Lemma. Segmentation and target-selection
  policy should confirm that boundary separately.

### Fotografie canonical direction for Photographie

- **Route:** `grammatical-resolution/de/lexeme/noun`
- **Golden Case:** `grammar-de-noun-variant-photographie`
- **Raised by:** Wayfinder issue #30
- **Question:** When both spellings are licensed, should `Fotografie` be the
  canonical Lemma and `Photographie` a Variant Surface, or may canonical
  direction depend on a lexical authority or user preference?
- **Current take:** Provisionally pin `Fotografie` as canonical and
  `Photographie` as Variant while keeping its member orthography Standard. The
  evaluator remains exact; this direction needs lexicographic policy review.

### Circumpositional von … an route identity

- **Route:** `grammatical-resolution/de/lexeme/adposition`
- **Golden Case:** `grammar-de-adp-provisional-circumposition-von-an`
- **Raised by:** Wayfinder issue #33
- **Question:** Is discontinuous `von … an` one `Lexeme/ADP` with
  `adpType: Circ`, or does the gap make it a Construction, and how should the
  gap appear in `canonicalForm` and `normalizedSurface`?
- **Current take:** Keep the case corpus-only. A resolved ADP reading is
  plausible, but route ownership and gap representation need a domain decision
  before demonstration or scoring.

### Clausal anstatt as ADP with ExtPos or SCONJ

- **Route:** `grammatical-resolution/de/lexeme/adposition`
- **Golden Case:** `grammar-de-adp-provisional-ext-pos-sconj-anstatt`
- **Raised by:** Wayfinder issue #33
- **Question:** Does clausal `anstatt` retain an ADP Lemma with
  `extPos: SCONJ`, or should Target Classification route it directly to
  `Lexeme/SCONJ`?
- **Current take:** Keep the case corpus-only and avoid teaching either route
  until the intended ExtPos boundary is reviewed.

### Historical status of adversative allein

- **Route:** `grammatical-resolution/de/lexeme/coordinating-conjunction`
- **Golden Case:** `grammar-de-cconj-provisional-archaic-allein`
- **Raised by:** Wayfinder issue #36
- **Question:** Is adversative conjunction `allein` sufficiently historical to
  require `surfaceFeatures.historicalStatus: Archaic`, or is it better treated
  as current but elevated/literary?
- **Current take:** The CCONJ identity is defensible, but the historical-status
  boundary is not. Keep it corpus-only and unscored pending review.

### Expressive lengthening in interjections

- **Route:** `grammatical-resolution/de/lexeme/interjection`
- **Golden Case:** `grammar-de-intj-demo-hmm-variant`
- **Raised by:** Wayfinder issue #38
- **Question:** Should productive expressive `hmm` be a Variant Surface of the
  `hm` Lemma, or can lengthening establish a separate Lemma under some lexical
  policy?
- **Current take:** Treat `hmm` as a Standard member of a Variant Surface for
  `hm` in the draft, while flagging the exact Variant-versus-Lemma boundary for
  human lexicographic review.
