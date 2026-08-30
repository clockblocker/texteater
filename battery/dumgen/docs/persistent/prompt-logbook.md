# Prompt Logbook

**Status: active human-review queue.** Entries without an explicit `Status`
remain open for human review. Resolved entries stay in place as history and are
labelled individually.

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

## Review queue

<!-- Append new entries here. -->

> Grammatical Resolution entries below that propose a model-level
> `Unresolved`, decision wrapper, or membership repair are historical questions
> superseded by Wayfinder #90. The current operation is total after classified
> `{ markedContext, members }` input; invalid output is a contract error. Route
> READMEs and retained phase-bound evidence contain the current dispositions.

### Ergänzungsstrich reconstruction as a Full noun Surface

- **Status:** Resolved by system ADRs 0003 and 0004.
- **Route:** `grammatical-resolution/de/lexeme/noun`
- **Golden Case:** suspended-compound matrix in Wayfinder issue #93
- **Raised by:** Wayfinder issues #30 and #93
- **Question:** How may `Kinder-` in `Kinder- und Jugendbücher` resolve without
  weakening target-member identity?
- **Current take:** Resolved by system ADRs 0003/0004. The singleton attested
  member stays `Kinder-`; the NOUN-only positional projector licenses
  `Kinderbücher` from the literal right-conjunct suffix, with Standard
  orthography and Full realization. Only U+002D, U+2010, and U+2011 qualify.

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

- **Status:** Resolved by the current German DET Inflection codec.
- **Route:** `grammatical-resolution/de/lexeme/determiner`
- **Golden Case:** `grammar-de-det-provisional-feminine-die`
- **Raised by:** Wayfinder issue #37
- **Question:** How should German feminine agreement be represented when the
  exact DET Inflection codec excludes `Gender=Fem` despite attested German use?
- **Current take:** Resolved: the German DET Inflection codec now supports
  `Gender=Fem`. Preserve feminine agreement directly and score the corrected
  golden cases normally.

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
- **Status:** Resolved by system ADR 0007.
- **Question:** German treebanks retain verbal `VerbForm` and `Tense` on many
  ADJ participles, but the current ADJ codec cannot express those features or
  consistently preserve a verbal Lemma. Should these resolve as ADJ, require a
  codec extension, or remain Unresolved?
- **Current take:** Follow the TIGER boundary without copying hybrid treebank
  features into Dumling. Productive perfect/passive/state-passive occurrences
  resolve under the source `VERB` Lemma and its participial features. Actual
  adjectival uses resolve under a participial `ADJ` Lemma and carry only the
  current ADJ codec's contextual agreement and degree features.

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
  click. Is a positive Lexeme/X Attestation ever reachable without changing the
  German-only segmentation and language-routing model tracked by issue #19?
- **Current take:** No. Keep the X prompt as an intentionally all-`Unresolved`
  diagnostic leaf. Its DTO still represents Dumling Citation and non-empty
  Inflection Surfaces, but any downstream X target currently identifies an
  upstream Segmentation or Target Classification contract defect.

### Aphorism identity versus proverb and quotation

- **Route:** `grammatical-resolution/de/phraseme/aphorism`
- **Golden Case:** `grammar-de-aphorism-unresolved-proverb`,
  `grammar-de-aphorism-unresolved-literary-quotation`, and
  `grammar-de-aphorism-authorship-anonymous-maxim`
- **Raised by:** Wayfinder issue #47
- **Question:** Which editorial or attribution evidence makes a concise maxim
  an authored Aphorism rather than a traditional Proverb, famous quotation, or
  arbitrary sentence, and should terminal punctuation participate in a
  Phraseme Canonical Form when punctuation is not `ResolvableText`?
- **Current take:** Resolve source-backed entries from a public-domain
  aphorism collection and exclude punctuation from member identity. Score
  explicit Proverb and literary-quotation boundaries, while keeping uncertain
  anonymous authorship outside evaluation until editorial classification is
  independently settled.

### Proverb punctuation and documented wording variants

- **Route:** `grammatical-resolution/de/phraseme/proverb`
- **Golden Case:** `grammar-de-proverb-ende-gut`,
  `grammar-de-proverb-variant-andere-zeiten-andere-sitten`, and
  `grammar-de-proverb-variant-wer-rastet-rostet`
- **Raised by:** Wayfinder issue #51
- **Question:** Should the punctuation displayed in an OWID sentence-valued
  Kernform participate in Dumling Lemma identity when punctuation is not
  `ResolvableText`, and do OWID-documented shortened forms or recurrent
  component replacements realize the same empty-Core Lemma or distinct
  Canonical Forms?
- **Current take:** Exclude internal and terminal punctuation from target
  membership, normalized Surface, and Canonical Form, matching the existing
  Aphorism route. Score only exact modern OWID Kernformen. Keep the shortened
  `Wer rastet, rostet` and component-replaced `Andere Zeiten, andere Sitten`
  corpus-only and `Unresolved`: `spelling: Variant` clearly covers licensed
  orthography, but does not by itself establish Lemma identity across omitted
  or replaced lexical members.

### Collocation alternants and partial realization

- **Route:** `grammatical-resolution/de/phraseme/collocation`
- **Golden Case:** `grammar-de-coll-determiner-alternant`,
  `grammar-de-coll-plural-member-alternant`, and
  `grammar-de-coll-support-verb-alternant`
- **Raised by:** Wayfinder issue #48
- **Question:** When do determiner, nominal-number, or support-verb alternants
  remain Surfaces of one conventional Collocation Lemma, and what incomplete
  member set is sufficient for a defensible Partial realization?
- **Current take:** Authoritatively cover settled support-verb combinations.
  Every canonical member present in the occurrence must be marked; omitting a
  present member is underselection, not Partial. The route has no authoritative
  positive Partial policy yet: ellipsis with an absent support verb remains
  Unresolved because its verbal features cannot be borrowed from another
  occurrence. Alternant identity remains corpus-only. Dumling reuses VERB
  inflection here, so nominal case and number are not inferred into the DTO.

### Polyfunctional discourse formulae in a scalar role codec

- **Route:** `grammatical-resolution/de/phraseme/discourse-formula`
- **Golden Case:** `grammar-de-discourse-formula-bitte-schoen-request-role-identity`
  and `grammar-de-discourse-formula-bitte-schoen-presentation-role-gap`
- **Raised by:** Wayfinder issue #49
- **Question:** Should a polyfunctional formula carry several stable roles, or
  should Grammatical Resolution select the single discourse function enacted
  by the marked context when the current Core Feature codec is scalar?
- **Current take:** Select one context-enacted role only when the discourse
  function is explicit. Because the role is a Lemma Core Feature, two role
  values create distinct grammatical Lemmas rather than mutating one identity.
  Keep the paired `bitte schön` uses contamination-linked and outside
  evaluation while that identity split receives wider human review.

### Idiom Partial realization versus whole-unit target selection

- **Route:** `grammatical-resolution/de/phraseme/idiom`
- **Golden Case:** `grammar-de-idiom-woelfe-past-partial` and
  `grammar-de-idiom-provisional-faeustchen-underselected-head`
- **Raised by:** Wayfinder issue #50
- **Question:** Dumling authoritatively represents selected `heulte mit` as a
  Partial Surface of `mit den Wölfen heulen`, while whole-unit Target
  Classification normally selects every member of a conventionalized Idiom.
  Does that example license Partial for other head-plus-member selections, or
  is it a family-specific exception pending a broader Attestation policy?
- **Current take:** Preserve only the exact repository-backed `heulte mit`
  positive. Keep `lachte ins` corpus-only and Unresolved; do not generalize a
  Partial rule to other Idioms until Attestation and whole-unit classification
  define the boundary together.

### Fusion identity for polyfunctional `am`

- **Route:** `grammatical-resolution/de/construction/fusion`
- **Golden Case:** `grammar-de-fusion-am` and
  `grammar-de-fusion-unresolved-am-superlative`
- **Raised by:** Wayfinder issue #52
- **Question:** When the written form `am` is contextually nondecomposable, as
  in a superlative (`am schönsten`) or progressive construction (`am Essen
  sein`), should it ever reach Construction/Fusion merely because the same
  orthography elsewhere realizes `an dem`?
- **Current take:** No. Resolve `am` on this route only when the occurrence
  supports the conventional preposition-plus-article expansion `an dem`.
  Nondecomposable superlative and progressive uses are distinct grammatical
  constructions and should be excluded by Target Classification rather than
  coerced into the empty-Core Fusion Lemma.

### Paired-frame lexical alternants are distinct Lemmas, not spelling variants

- **Route:** `grammatical-resolution/de/construction/paired-frame`
- **Golden Case:** `grammar-de-paired-frame-je-desto`,
  `grammar-de-paired-frame-je-umso`,
  `grammar-de-paired-frame-sowohl-als-auch`, and
  `grammar-de-paired-frame-sowohl-wie`, and
  `grammar-de-paired-frame-sowohl-wie-auch`
- **Raised by:** Wayfinder issue #53 and the independent route review
- **Question:** Do IDS-licensed alternative arms or member inventories such as
  `desto`/`umso`, `als`/`wie`, and `wie`/`wie auch` realize one PairedFrame
  Lemma as `spelling: Variant`, or do they create separate empty-Core Lemmas?
- **Current take:** Separate Lemmas. Dumling spelling variation is
  orthographic, while these alternatives replace lexical frame members.
  Preserve each exact member inventory in `canonicalForm`, including the
  independently licensed two-member `sowohl ... wie`; keep each full Surface
  `Canonical`, and use one `memberOrthographies` value per marked word.
  The related route placement of `weder ... noch`, `sowohl ...`, `je ...`, and
  IDS-parallel `ohne/anstatt ... zu` remains a product inventory decision for
  Target Classification; issue #54 owns runtime dispatch.

### German fixed members align through Target, Attestation, and Surface

- **Route:** `grammatical-resolution/de/lexeme/verb` and verbal Phraseme routes
- **Golden Case:** `grammar-de-verb-separable-imperative-aufpassen`,
  `grammar-de-verb-governed-preposition-wartet`,
  `grammar-de-verb-reflexive-erinnert`,
  `grammar-de-verb-participle-gesungen`,
  `grammar-de-verb-future-wird-reisen`, and
  `grammar-de-verb-passive-wurde-gebeten`
- **Raised by:** Wayfinder issues #82, #83, and #86 on 2026-08-09
- **Question:** Which realized components belong to one German high-level unit,
  and which member supplies Surface morphology and Lemma identity?
- **Current take:** Include governed prepositions, inherently reflexive
  pronouns, separable members, and perfect/future/passive auxiliaries exactly
  once in source order. Keep modal, copular, free-valency, contextual-reflexive,
  adjunct, modifier, and ordinary non-idiomatic Collocation material separate.
  Conventional support-verb combinations such as `eine Entscheidung treffen`
  do not become multi-segment targets under this policy. Normalize exactly the target
  projection, retain dictionary `canonicalForm`, and project morphology from
  the route-owning lexical head rather than its analytic auxiliary. This entry
  supersedes the narrower member exclusions in earlier prompt experiments;
  their historical records remain unchanged.
