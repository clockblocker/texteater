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

### ADV features that the current codecs cannot state cleanly

- **Route:** `grammatical-resolution/de/lexeme/adverb`
- **Golden Case:** `grammar-de-adv-demo-contextual-heute`,
  `grammar-de-adv-provisional-ordinal-erstens`, and
  `grammar-de-adv-provisional-cardinal-indefinite-viel`
- **Raised by:** Wayfinder issue #34
- **Question:** Should an ordinary ungraded contextual ADV be a Citation
  Surface because the Inflection codec requires a non-null Degree, how should
  ordinal `erstens` be represented when ADV excludes `NumType=Ord`, and should
  quantitative `viel` carry both `NumType=Card` and `PronType=Ind`?
- **Current take:** Keep the ungraded Citation rule in the draft because it is
  the only valid current DTO. Keep `erstens` and `viel` corpus-only until the
  domain codecs and German annotation policy are reconciled.

### Foreign status of lexicalized circa

- **Route:** `grammatical-resolution/de/lexeme/adverb`
- **Golden Case:** `grammar-de-adv-provisional-foreign-circa`
- **Raised by:** Wayfinder issue #34
- **Question:** Does established German adverb `circa` retain
  `foreign: Yes`, or has lexicalization made that Core Feature inappropriate?
- **Current take:** Retain the proposed foreign reading only as a corpus-only
  probe; do not teach or score it until lexical policy chooses a boundary.

### Split pronominal adverb da … für

- **Route:** `grammatical-resolution/de/lexeme/adverb`
- **Golden Case:** `grammar-de-adv-provisional-split-pronominal-dafuer`
- **Raised by:** Wayfinder issue #34
- **Question:** Is split `da … für` one discontinuous ADV Surface of `dafür`,
  and if so should normalizedSurface retain an ellipsis marker or join the
  members canonically?
- **Current take:** A single Dem pronominal-adverb identity is plausible, but
  route ownership and discontinuous Surface normalization need domain review;
  keep the case corpus-only.

### Canonical Lemma for contextual möchte

- **Route:** `grammatical-resolution/de/lexeme/auxiliary`
- **Golden Case:** `grammar-de-aux-modal-moechte-bleiben`
- **Raised by:** Wayfinder issue #35
- **Question:** Should contextual `möchte` resolve to canonical `mögen`, or to
  an independently lexicalized `möchten` Lemma?
- **Current take:** The draft provisionally models the traditional subjunctive
  analysis under `mögen`, but excludes the case from demonstrations and scoring
  because current sources and dictionaries do not provide one uncontested
  canonical policy.

### Feminine DET agreement missing from the codec

- **Route:** `grammatical-resolution/de/lexeme/determiner`
- **Golden Case:** `grammar-de-det-provisional-feminine-die`
- **Raised by:** Wayfinder issue #37
- **Question:** How should German feminine agreement be represented when the
  exact DET Inflection codec excludes `Gender=Fem` despite attested German use?
- **Current take:** Preserve the linguistically feminine example as a
  corpus-only probe with `gender: null`; do not score that lossy representation
  until the domain codec is corrected or the omission is explicitly adopted.

### Contextual uninflected derlei as Citation or Inflection

- **Route:** `grammatical-resolution/de/lexeme/determiner`
- **Golden Case:** `grammar-de-det-provisional-uninflected-derlei`
- **Raised by:** Wayfinder issue #37
- **Question:** Should contextual uninflected DET `derlei` use Citation because
  the Inflection codec requires a non-empty feature bag, or should the domain
  permit an Inflection Surface with no overt agreement features?
- **Current take:** Use Citation provisionally and keep the example corpus-only;
  the Surface distinction needs a domain decision before it becomes evidence.

### Ambiguous Lemma behind am häufigsten

- **Route:** `grammatical-resolution/de/lexeme/adverb`
- **Golden Case:** `grammar-de-adv-superlative-am-haeufigsten`
- **Raised by:** Wayfinder issue #34 live evaluation
- **Question:** The Surface `am häufigsten` can realize regular `häufig` or the
  suppletive superlative of `oft`; can context ever select one Lemma reliably,
  or must exact single-Lemma resolution remain Unresolved?
- **Current take:** Return Unresolved when the supplied context does not choose
  between the two defensible Lemmas. Do not impose an arbitrary corpus tie-break.

### Contextual versus syncretic possessor gender for seinen

- **Route:** `grammatical-resolution/de/lexeme/determiner`
- **Golden Case:** `grammar-de-det-possessive-seinen`
- **Raised by:** Wayfinder issue #37 live evaluation review
- **Question:** Should `Gender[psor]` preserve the morphological Masc/Neut
  syncretism of `sein`, or may an explicit contextual antecedent such as `Er`
  collapse it to Masc during Grammatical Resolution?
- **Current take:** Follow the existing Dumling contextual precedent and emit
  Masc when the antecedent explicitly resolves the possessor. Record that this
  differs from broader German GSD annotation and revisit it at domain audit.

### Lexical versus contextual PronType for relative wo

- **Route:** `grammatical-resolution/de/lexeme/adverb`
- **Golden Case:** `grammar-de-adv-interrogative-identity-wo`
- **Raised by:** Wayfinder issue #34 live evaluation review
- **Question:** German GSD keeps ADV lemma `wo` lexically `PronType=Int`, even
  in relative-clause attestations; should lexical Core Feature identity or the
  contextual relative use govern learner-facing Grammatical Resolution?
- **Current take:** Preserve the GSD-based Int oracle as a corpus-only probe,
  but do not score it until the domain chooses lexical or contextual policy.

### Degree-modifier etwas as ADV or PART

- **Route:** `grammatical-resolution/de/lexeme/adverb`
- **Golden Case:** `grammar-de-adv-indefinite-etwas`
- **Raised by:** Wayfinder issue #34 live evaluation review
- **Question:** Degree-modifier `etwas` is attested as ADV with
  `PronType=Ind`, but should this use remain ADV or cross the project boundary
  to PART, and must the lexical feature survive that contextual use?
- **Current take:** Keep the ADV/Ind analysis as a corpus-only probe rather
  than treating either route or feature policy as authoritative evidence.
