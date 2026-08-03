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

### Contextual Short variant stored on an ADJ Lemma

- **Route:** `grammatical-resolution/de/lexeme/adjective`
- **Golden Case:** `grammar-de-adj-provisional-short-moeglich`
- **Raised by:** Wayfinder issue #32
- **Question:** UD `Variant=Short` describes a contextual short-form Surface,
  while Dumling currently stores `variant` in Lemma Core Features. Should that
  feature move to Surface, remain lexical, or collapse to null?
- **Current take:** Keep the case corpus-only and avoid teaching a lexical
  Short identity until the domain location of the feature is settled.

### Participial ADJ features unsupported by the codec

- **Route:** `grammatical-resolution/de/lexeme/adjective`
- **Golden Case:** `grammar-de-adj-provisional-participial-geschlossen`
- **Raised by:** Wayfinder issue #32
- **Question:** German treebanks retain verbal `VerbForm` and `Tense` on many
  ADJ participles, but the current ADJ codec cannot express those features or
  consistently preserve a verbal Lemma. Should these resolve as ADJ, require a
  codec extension, or remain Unresolved?
- **Current take:** Keep the participial analysis corpus-only pending a domain
  decision; ordinary perfect-participle VERB uses remain out of route.

### ADJ Core Feature and route boundaries

- **Route:** `grammatical-resolution/de/lexeme/adjective`
- **Golden Case:** `grammar-de-adj-provisional-card-siebenhundert`,
  `grammar-de-adj-provisional-foreign-cool`, and
  `grammar-de-adj-provisional-abbreviation-sog`
- **Raised by:** Wayfinder issue #32
- **Question:** When does numeric `siebenhundert` remain ADJ versus NUM, when
  does lexicalized `cool` retain `Foreign=Yes`, and how should abbreviated
  `sog.` preserve punctuation, canonical form, and agreement?
- **Current take:** Preserve all three as corpus-only probes; do not score their
  Core Features or route ownership until shared German lexical policy exists.

### NUM compact form representation gaps

- **Route:** `grammatical-resolution/de/lexeme/numeral`
- **Golden Case:** `grammar-de-num-provisional-fraction-half`,
  `grammar-de-num-provisional-range-10-12`, and
  `grammar-de-num-provisional-multiplicative-2x`
- **Raised by:** Wayfinder issue #39
- **Question:** How should fraction glyphs, compact numeric ranges, and `2x`
  multiplicatives be represented when the NUM codec has no NumForm/range model
  and multiplicatives ordinarily belong to ADV?
- **Current take:** Keep the three forms corpus-only and Unresolved rather than
  inventing a canonical identity or silently crossing routes.

### German PART inventory versus modal-particle taxonomy

- **Route:** `grammatical-resolution/de/lexeme/particle`
- **Golden Case:** `grammar-de-part-provisional-affirmative-ja` and
  `grammar-de-part-provisional-foreign-not`
- **Raised by:** Wayfinder issue #40
- **Question:** How should the narrow UD German PART inventory (`nicht`, `zu`)
  reconcile with the broader IDS modal-particle taxonomy when Dumling excludes
  `PartType=Mod`, and should affirmative `ja` or code-switched `not` carry
  Polarity/Foreign features on this route?
- **Current take:** The draft resolves settled modal uses with nullable Core
  Features but keeps affirmative and foreign feature assertions corpus-only.

### Multi-valued German PronType identities in a scalar codec

- **Route:** `grammatical-resolution/de/lexeme/pronoun`
- **Golden Case:** `grammar-de-pron-provisional-dem-rel-der`,
  `grammar-de-pron-provisional-int-rel-wer`, and
  `grammar-de-pron-provisional-int-rel-was`
- **Raised by:** Wayfinder issue #41
- **Question:** German GSD assigns combined lexical identities such as
  `Dem,Rel` and `Int,Rel`, while the current PRON Core Feature codec accepts
  only one scalar `pronType`. Should the domain support multiple values, choose
  a contextual value, or preserve a different lexical split?
- **Current take:** Keep these cases corpus-only and Unresolved. Do not collapse
  an established multi-valued identity merely to satisfy the current codec.

### PROPN numerical components and unstable Core identity

- **Route:** `grammatical-resolution/de/lexeme/proper-noun`
- **Golden Case:** `grammar-de-propn-provisional-numeric-ii`,
  `grammar-de-propn-provisional-organization-gender`, and
  `grammar-de-propn-provisional-abbreviation-ard`
- **Raised by:** Wayfinder issue #42
- **Question:** How should numeric name components retain `NumType` when the
  PROPN codec cannot express it, and when may contextual organization Gender
  or acronym shape become stable Lemma Core `gender` or `abbr` identity?
- **Current take:** Keep these cases corpus-only. Resolve only identities whose
  route and stable Core Features are independently established rather than
  inferred from numeric, article, or all-caps shape alone.

### Complex and non-final German subordinators at a word-like boundary

- **Route:** `grammatical-resolution/de/lexeme/subordinating-conjunction`
- **Golden Case:** `grammar-de-sconj-provisional-multiword-so-dass` and
  `grammar-de-sconj-provisional-v2-weil`
- **Raised by:** Wayfinder issue #43
- **Question:** Should complex markers such as `so dass` remain multiple
  word-like Lexemes or become a Phraseme, and how should spoken V2 uses of
  `weil` and `obwohl` affect SCONJ identity when the usual verb-final signal is
  absent?
- **Current take:** Keep complex and V2 examples corpus-only. The route resolves
  settled single-word markers, including established reduced clauses, without
  treating verb-final order as an absolute or absorbing multiword material.

### German SYM feature identity versus contextual agreement

- **Route:** `grammatical-resolution/de/lexeme/symbol`
- **Golden Case:** `grammar-de-sym-provisional-foreign-ampersand`,
  `grammar-de-sym-provisional-numtype-range-dash`, and
  `grammar-de-sym-provisional-keycap`
- **Raised by:** Wayfinder issue #44
- **Question:** When may treebank `Foreign` or `NumType` annotations become
  stable Core identity for a language-independent symbol, and how should
  multi-code-point symbols interact with segmentation and contextual nominal
  agreement?
- **Current take:** Keep those feature and segmentation claims corpus-only.
  Authoritative symbol Lemmas use all-null Core Features, while an Inflection
  Surface records agreement only when the surrounding German context supports
  a non-empty feature bundle.

### German lexical participles and periphrastic features

- **Route:** `grammatical-resolution/de/lexeme/verb`
- **Golden Case:** `grammar-de-verb-provisional-passive-participle` and
  `grammar-de-verb-provisional-predicative-participle`
- **Raised by:** Wayfinder issue #45
- **Question:** Should `Voice` or other periphrastic information belong to a
  lexical participle Surface, the surrounding construction, or neither, and
  when has a predicative participle crossed into ADJ?
- **Current take:** Keep passive and predicative boundary cases corpus-only.
  Authoritative German lexical participles use `VerbForm=Part` with
  `Aspect=null`; `Aspect=Perf` is perfective aspect, not a Partizip-II marker.

### Lexeme/X is unreachable under the current German segmentation boundary

- **Route:** `grammatical-resolution/de/lexeme/other`
- **Golden Case:** `grammar-de-x-foreign-code-switch`,
  `grammar-de-x-unintelligible-gibberish`, and
  `grammar-de-x-truncated-fragment`
- **Raised by:** Wayfinder issue #46 and the independent route review
- **Question:** UD X covers unanalyzed code-switching, gibberish, and word
  fragments, but current Dumgen policy makes all three `OpaqueText` before a
  click. Is a positive Lexeme/X Selection ever reachable without changing the
  German-only segmentation and language-routing model tracked by issue #19?
- **Current take:** No. Keep the X prompt as an intentionally all-`Unresolved`
  diagnostic leaf. Its DTO still represents Dumling Citation and non-empty
  Inflection Surfaces, but any downstream X target currently identifies an
  upstream Segmentation or Target Classification contract defect.

### Aphorism identity versus proverb and quotation

- **Route:** `grammatical-resolution/de/phraseme/aphorism`
- **Golden Case:** `grammar-de-aphorism-provisional-proverb-boundary`,
  `grammar-de-aphorism-provisional-literary-quotation`, and
  `grammar-de-aphorism-provisional-punctuation-identity`
- **Raised by:** Wayfinder issue #47
- **Question:** Which editorial or attribution evidence makes a concise maxim
  an authored Aphorism rather than a traditional Proverb, famous quotation, or
  arbitrary sentence, and should terminal punctuation participate in a
  Phraseme Canonical Form when punctuation is not `ResolvableText`?
- **Current take:** Resolve source-backed entries from a public-domain
  aphorism collection and exclude punctuation from member identity. Keep
  proverb/quotation and punctuation alternatives corpus-only where editorial
  classification is not independently settled.

### Collocation alternants and partial realization

- **Route:** `grammatical-resolution/de/phraseme/collocation`
- **Golden Case:** `grammar-de-collocation-provisional-determiner-alternant`,
  `grammar-de-collocation-provisional-plural-nominal`, and
  `grammar-de-collocation-provisional-support-verb-alternant`
- **Raised by:** Wayfinder issue #48
- **Question:** When do determiner, nominal-number, or support-verb alternants
  remain Surfaces of one conventional Collocation Lemma, and what incomplete
  member set is sufficient for a defensible Partial realization?
- **Current take:** Authoritatively cover settled support-verb combinations.
  Partial requires at least two distinctive marked members and preserves only
  their attested order; alternant identity remains corpus-only. Dumling reuses
  VERB inflection here, so nominal case and number are not inferred into the
  DTO.

### Polyfunctional discourse formulae in a scalar role codec

- **Route:** `grammatical-resolution/de/phraseme/discourse-formula`
- **Golden Case:** `grammar-de-discourse-formula-provisional-bitte-schoen-request`
  and `grammar-de-discourse-formula-provisional-bitte-schoen-reaction`
- **Raised by:** Wayfinder issue #49
- **Question:** Should a polyfunctional formula carry several stable roles, or
  should Grammatical Resolution select the single discourse function enacted
  by the marked context when the current Core Feature codec is scalar?
- **Current take:** Select one context-enacted role only when the discourse
  function is explicit. Keep the paired `bitte schön` uses contamination-linked
  and corpus-only rather than collapsing polyfunctionality into one lexical
  identity or inventing a multi-valued codec.
