### Reviewer Notes

- For linking stuff the `meaningInEmojis` is set to the sense of the surrounding phrase.
  Examples:
    - `[Am] nächsten Morgen war alles anders.` -> `🌅`
    - `Er vergaß [seinen] Schlüssel im Büro.` -> `🔑`
    - `[Wegen] dem Regen kamen wir zu spät.` -> `🌧️`
- `selectionFeatures.spelling` set to `"Variant"` for sentence-initial fusions.
  Examples:
    - `[Am] nächsten Morgen war alles anders.` -> `{ selectionFeatures: { spelling: "Variant" } }`
- Etymological morphology is forced over learner-facing lexical meaning.
  Examples: - `Am [nächsten] Morgen war alles anders.` -> `{ canonicalLemma: "nah", degree: "Sup", meaningInEmojis: "➡️" }`
- Agents seem to be confused by capitalized words like `[Am] nächsten Morgen war alles anders.`. This leads them to overthink and lean towards `{ selectionFeatures: { spelling: "Variant" } }`.

### Emerging Rules

- Common fusions (`am`, `ins`, etc.) keep ordinary sentence-initial capitalization unmarked. They should not grow a `selectionFeatures` bag just because the sentence starts with a capital letter.
- `meaningInEmojis` must point to the selected item itself, not to the larger surrounding phrase.
- When a form is synchronically lexicalized for learners, classify that lexeme directly instead of forcing a historical or etymological source analysis.
  Example:
    - temporal `nächsten` in `am nächsten Morgen` should be modeled as lexical `nächst`, not as superlative `nah`
- State predicates that predicate over an argument rather than modifying the event stay `ADJ`, even when they can feel adverb-like on the surface. This includes ordinary predicatives with copular `sein` and resultative predicates like `entzwei`.
  Examples:
    - `Am nächsten Morgen war alles [anders].`
    - `Er war am fünften Tage [tot].`
    - `Die schoß das Häschen ganz [entzwei].`
- Participial classification splits by use. Attributive participles modifying a noun and carrying adjectival agreement are stored as `ADJ`; bare or predicative Partizip-II forms stay `VERB`, even in stative, passive-like, or adjective-leaning clauses, unless there is a stronger reason to treat the item as a fully lexicalized adjective.
  Examples:
    - `die [eingezeichneten] Seen` -> `ADJ`
    - `Auf der Karte sind drei Seen [eingezeichnet].` -> `VERB`
    - `Sie wurde um Geduld [gebeten].` -> `VERB`
    - `[Verbrannt] ist alles ganz und gar, das arme Kind mit Haut und Haar.` -> `VERB`
- Finite German modals split by whether they auxiliary-mark an overt infinitive. Use `AUX` when the modal combines with an overt infinitive, and use `VERB` when the modal stands as the clause's main predicate in an elliptical clause with no overt infinitive.
  Examples:
    - `Er [muss] heute arbeiten.` -> `AUX`
    - `Das [muss] heute noch raus.` -> `VERB`
- Finite `werden` splits by function. Use `AUX` when it auxiliary-marks another verbal form, and use `VERB` when it itself carries the clause's change-of-state meaning with a predicative complement.
  Examples:
    - `Jetzt schien die Sonne gar zu sehr, da [ward] ihm sein Gewehr zu schwer.` -> `VERB`
- Short directional forms like `raus`, `rein`, `rüber`, `runter`, `drin`, and `draußen` stay standalone `ADV` entries when there is no overt verb host that licenses a separable-verb analysis. Do not invent a larger verb lemma from clause meaning alone in elliptical clauses.
  Examples:
    - `Das muss heute noch [raus].` -> `ADV` lemma `heraus`
    - `Die Kinder sind schon [drin].` -> `ADV` lemma `drinnen`
- When a motion verb plus directional item can be read either as a lexicalized separable verb or as plain `Verb + directional adverb`, lean to the compositional analysis unless the form itself clearly disambiguates toward the separable verb. Fronting the directional item alone does not force a separable-verb reading.
  Examples:
    - `Er lief erst nach links und dann [hinaus].` -> standalone `ADV` lemma `hinaus`
    - `[Fort] geht nun die Mutter und wupp! den Daumen in den Mund.` -> standalone `ADV` lemma `fort`
    - `nahm Ranzen, Pulverhorn und Flint und lief [hinaus] ins Feld geschwind` -> standalone `ADV` lemma `hinaus`
    - `Er versucht, [hinauszulaufen].` -> inflected `VERB` lemma `hinauslaufen`
- Colloquial reduced `mal` stays a standalone `Lexeme/ADV` with canonical lemma `einmal`. Treat it as `Variant` spelling rather than collapsing imperative-plus-`mal` frames into a `Phraseme`, unless the whole formula itself is the learner-facing unit.
  Examples:
    - `Sieh [einmal], hier steht er, pfui, der Struwwelpeter!` -> standalone `ADV` lemma `einmal`
    - `Sieh [mal] an, die Kleine von nebenan.` -> standalone `ADV`, `selectionFeatures: { spelling: "Variant" }`, lemma `einmal`
- Standalone German intensifiers and scalar-focus items stay `Lexeme/ADV` unless the selected token is clearly part of a fixed learner-facing expression that should be modeled as a larger unit.
  Examples:
    - `Und Minz und Maunz, die schreien [gar] jämmerlich zu zweien.` -> standalone `ADV`
    - `Es brennt das ganze Kind [sogar].` -> standalone `ADV`
    - `Verbrannt ist alles ganz und [gar].` -> partial `Phraseme/Idiom` for `ganz und gar`
- Free prepositions heading ordinary prepositional phrases stay standalone `ADP` entries and are not pulled into the verb. Only lexically governed prepositions or true separable prefixes belong on the verb analysis.
  Examples:
    - `Das rote Band lag [auf] dem Geschenk.` -> standalone `ADP`
    - `Das rote Band [lag] auf dem Geschenk.` -> `VERB` lemma `liegen`, no `hasGovPrep`
- When a conventional idiom is being used literally rather than idiomatically, classify the attested words word-by-word instead of collapsing them into a `Phraseme`.
  Example:
    - `Verbrannt ist alles ganz und gar, das arme Kind mit Haut und [Haar];` -> standalone noun `Haar`, not idiom `mit Haut und Haar`
- If a noun surface is citation-shaped and the local syntax does not decisively resolve the case reading, prefer `Surface/Citation` over a guessed inflectional analysis.
  Example:
    - `Einst ging er an Ufers [Rand] mit der Mappe in der Hand.`
- When a selected token is clearly just an internal component of an idiom, classify the idiom as the learner-facing unit rather than the token's standalone POS.
  Example:
    - `Bei dieser Formel verstehe ich nur [Bahnhof].`
- Conventional multiword discourse formulas stay `Phraseme/DiscourseFormula` when the learner-facing meaning belongs to the fixed formula rather than to the selected word in isolation. If only one component is selected, keep `selectionFeatures: { coverage: "Partial" }` and still point to the full citation-form formula. Fall back to standalone `INTJ`, `PART`, or other token-level POS only when no larger fixed formula is recoverable.
  Examples:
    - `[Na ja], ganz überzeugt bin ich nicht.` -> full `Phraseme/DiscourseFormula`
    - `Na [ja], ganz überzeugt bin ich nicht.` -> partial `Phraseme/DiscourseFormula` for `na ja`
    - `Die schoß das Häschen ganz entzwei; da rief die Frau: »O [wei]! O wei!«` -> partial `Phraseme/DiscourseFormula` for `o wei`
    - `Sieh einmal, hier steht er, [pfui], der Struwwelpeter!` -> standalone `Lexeme/INTJ`
- Split `tut ... leid` by use, not by string shape alone. Use `Phraseme/DiscourseFormula` only when the expression itself performs a live apology; use `Lexeme/VERB` lemma `leidtun` when the clause predicates regret in an ordinary reportable/embeddable way.
  Examples:
    - `[Tut mir leid], das war mein Fehler.` -> `Phraseme/DiscourseFormula`
    - `Es tut ihm [leid].` -> `Lexeme/VERB` lemma `leidtun`
    - `Mark sagt, dass es ihm [leid] tut.` -> `Lexeme/VERB` lemma `leidtun`
    - `[Tut] mir leid.` can still be `Partial` `Phraseme/DiscourseFormula` if the utterance is still functioning as a direct apology rather than as a reported predicate.
- German `es` stays a single pronoun lemma across referential and nonreferential uses. Do not create separate lemma IDs or ID-bearing feature splits for referential, expletive, presentational, anticipatory, or formal-subject `es`; if the clause-level use matters, capture it only in `classifierNotes`.
  Examples:
    - `Ich trinke Bier. [Es] ist gut.` -> same lemma `es`
    - `[Es] regnet.` -> same lemma `es`
    - `[Es] zog der wilde Jägersmann sein grasgrün neues Röcklein an;` -> same lemma `es`
- `Phraseme` is citation-only in the public DTO.
- Citation-only `Construction/PairedFrame` keeps `canonicalLemma` identical to citation `normalizedFullSurface`, using the plain spaced citation form rather than an internal delimiter spelling.
  Example:
    - `um zu`, not `um_zu`
- Only add `gender[psor]` and `number[psor]` when the attested form or clearly recoverable context actually disambiguates possessor features.
- Capitalization is not a Variant.

### Open Questions

- Should sentence-initial capitalization ever trigger `selectionFeatures.spelling: "Variant"`, or should all purely orthographic sentence-initial capitalization stay unmarked unless there is some other noncanonical property?

- Do we want token-role information for split/governed verb constructions so that repeated surface forms like the two `auf` tokens in `Pass auf dich auf!` can be told apart without reading the prose note?

- What is the intended rule for `Citation` vs `Inflection` when morphology is syncretic but syntax still supplies case/number/gender? Right now the file mixes both strategies.

- For idiom/literal overlap cases, what should win: the larger conventional phrase or the locally literal reading? `mit Haut und Haar` is the sharpest test case, but the same question applies to other partial idiom selections too.

- Is lemma-level governance supposed to reflect the dictionary norm even when the attested phrase shows something else, as in `wegen dem Regen`, or should attested syntax be recoverable somewhere in the row?

- If `classificationMistakes` is meant to be used later, what kind of information belongs there? If it is not meant to be used, it is currently dead weight and makes the file look incomplete.
