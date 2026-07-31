### Reviewer Notes

- Historical mistakes in older classifications assigned the meaning of the
  surrounding scene to the clicked item (`Am` → sunrise, `seinen` → key,
  `wegen` → rain). Current correction: Dumling resolves the click through
  `Selection → Surface → LinguisticEntry`; learner-owned Meaning is resolved
  downstream and is not a Dumling Entry field.
- Historical mistakes also treated sentence-initial capitalization as a
  spelling Variant. Current correction: ordinary capitalization gives
  `selectedOrthography: "Standard"` and a Canonical Surface.
- Historical analyses sometimes forced etymology over the learner-facing
  lexical unit. Current correction: temporal `nächsten` in `am nächsten Morgen`
  resolves to an Entry with `citationForm: "nächst"`, rather than inventing a
  `nah` Entry solely from historical derivation.

### Emerging Rules

- Common fusions such as `am` and `ins` keep sentence-initial capitalization
  unmarked: the clicked Segment is Standard and the Surface spelling is
  Canonical.
- Learner-owned Meaning describes the resolved learner-facing unit, not a
  nearby noun or the whole scene. It belongs to the downstream Meaning layer,
  not to Dumling's Entry, Surface, or Selection DTOs.
- When a form is synchronically lexicalized for learners, classify that Entry
  directly instead of forcing a historical source analysis.
- State predicates stay `ADJ` when they predicate over an argument rather than
  modifying the event. Examples include `anders`, `tot`, and resultative
  `entzwei`.
- Participial classification splits by use. Attributive participles carrying
  adjectival agreement are `ADJ`; bare or predicative Partizip-II forms remain
  `VERB` unless independently lexicalized as adjectives.
- Finite German modals are `AUX` with an overt infinitive and `VERB` when they
  stand as the main predicate in an elliptical clause.
- Finite `werden` is `AUX` when it marks another verbal form and `VERB` when it
  carries change-of-state meaning itself.
- Short directional forms such as `raus`, `rein`, `rüber`, `runter`, `drin`,
  and `draußen` remain standalone `ADV` Entries when no overt verb host licenses
  a separable-verb analysis. Use the learner-facing Entry `citationForm`, such
  as `heraus` or `drinnen`, without inventing a larger verb from clause meaning.
- For motion verb plus directional item ambiguity, prefer the compositional
  analysis unless the form clearly identifies a separable verb. Fronting the
  directional item alone does not force a separable-verb reading.
- Reduced colloquial `mal` is a standalone `Lexeme/ADV` Entry with
  `citationForm: "einmal"`. The Surface has `spelling: "Variant"`; the clicked
  Segment remains `selectedOrthography: "Standard"` because `mal` is licensed,
  not a typo.
- Standalone intensifiers and scalar-focus items remain `Lexeme/ADV` unless
  they participate in a recoverable fixed learner-facing expression.
- Free prepositions heading ordinary prepositional phrases stay standalone
  `ADP` Entries. True separable prefixes participate in the verb Surface; verb
  government remains an Entry feature where supported.
- When a conventional idiom is used literally, classify the attested words
  word-by-word rather than collapsing them into a `Phraseme`.
- A citation-shaped noun whose local syntax does not decisively resolve case
  may stay a Citation Surface rather than receiving guessed inflection.
- A click on one component of a fixed expression does not by itself make the
  Surface Partial. Put every participating Segment in
  `surfaceSegmentIndices`, preserve their text in `attestedSurface`, and keep
  `realizationCoverage: "Full"` when the full occurrence is present. Use
  `realizationCoverage: "Partial"` only when the attested Surface itself omits
  part of the Entry's conventional realization.
- Conventional multiword discourse formulas remain
  `Phraseme/DiscourseFormula` when the learner-facing unit is the whole formula.
  Clicking `ja` in `na ja` can therefore resolve a full `na ja` Surface with
  both Segment indices.
- Split `tut … leid` by use: a live apology may be a
  `Phraseme/DiscourseFormula`; an ordinary reportable predicate resolves to the
  `Lexeme/VERB` Entry with `citationForm: "leidtun"`.
- German `es` keeps one Entry ID across referential and nonreferential uses.
  Clause-level use may be documented in classifier notes but does not create a
  new Entry identity.
- Verbal Phraseme Surfaces may be Inflection Surfaces. The attested occurrence
  `verstehe … nur Bahnhof` is finite and resolves to the Entry
  `nur Bahnhof verstehen`.
- Citation-only `Construction/PairedFrame` Entries use a plain spaced
  `citationForm`, such as `um zu`. A full attested occurrence uses the same
  spaced `normalizedSurface`.
- Add `gender[psor]` and `number[psor]` only when the form or recoverable context
  actually disambiguates possessor features.
- Capitalization alone is never a Variant.
- Selection identity is the immutable `segmentedSentenceId` plus local
  `clickedSegmentIndex`. `surfaceSegmentIndices` separately records the
  complete Surface occurrence.

### Open Questions

- What is the intended `Citation` versus `Inflection` rule when morphology is
  syncretic but syntax supplies case, number, or gender?
- For idiom/literal overlap, when should the conventional phrase beat the
  locally literal reading? `mit Haut und Haar` remains the sharpest test case.
- Should Entry-level government always reflect dictionary norm when the
  attested phrase differs, as in `wegen dem Regen`, or should that attested
  syntax be captured in a later valency model?
- What information should remain in `classificationMistakes` once historical
  migrations are complete?
