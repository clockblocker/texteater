# Dumrel

Dumrel defines identityless Knowledge and pure operations over it.

## Language

**Reading Knowledge**:
optional linguistic content owned by one exact Reading.
An empty value contains no authored aspects.

**Knowledge Change**:
a Contribute, Correct, or Retract operation on one atomic
aspect or bucket. Omission does not delete an aspect.

**Knowledge Settings**:
enabled or disabled preferences applied to the aspects
applicable to a source route. Omitted preferences are enabled.

**Knowledge Request Mask**:
the applicable, enabled aspects requested for
production. Present leaves carry null; absent leaves are not requested.

**Unit Shadow**:
a target described by Language, Family, Kind and Canonical Form
without choosing a Lemma's Core Features or an exact Reading.

**Pending Semantic Relation**:
a direct relation proposal whose target is a
Unit Shadow awaiting downstream matching.

**Governed Preposition**:
a preposition a Reading lexically selects: a Preposition Slot of the Reading's
Valency Frame, naming an ADP Lemma and, in German, the case it assigns in
that construction (`warten`: `auf` + Acc; Hebrew `סמך`: `על`; English
`depend`: `on`). An adjunct the sentence happens to contain is not one.
_Avoid_: govPrep, prepositional object, valency note

**Governor**:
the Reading whose Valency Frame holds a Governed Preposition. The
preposition's side of the link is projected, never stored.
_Avoid_: governing verb (adjectives, nouns and Locutions govern too)

**Participle Source**:
the VERB Lemma whose participle a Participial Adjective's form is, with the
Reading's Participle Meaning, stored in that Reading's Knowledge (`gekocht`:
`kochen`; `verliebt`: `sich verlieben`). The form alone names the verb, so
every Reading of one adjective names the same verb. It is a grammatical link,
not a Semantic Relation. The verb's side, its participial adjectives, is
projected from the verb's Lemma, never stored.
_Avoid_: base verb, derivation relation, participle relation

**Participle Meaning**:
whether a Reading with a Participle Source means a sense of its verb
(Verbal: `gekocht`, `gebildet` 'educated') or has drifted from all of them
(Drifted: `gelassen` 😌 from `lassen`, `verschieden` ↔️ 'different' from
`verscheiden`). Readings of one adjective can differ: `verschieden` ⚰️
'deceased' is Verbal. A Drifted Reading is not among its verb's participial
adjectives.
_Avoid_: lexicalized (lexicalized `gebildet` is still Verbal), etymology

**Plural Pattern**:
how a German noun forms its plural from its singular: no ending, umlaut only,
`-e`, umlaut + `-e`, `-er`, umlaut + `-er`, `-(e)n`, `-s`, or another way. A
NOUN Reading's Knowledge stores every pattern its plurals attest (`Pizza`:
`-(e)n`, `-s`), or a NoPlural or PluralOnly marker. It never splits a Lemma:
`Mutter` 👩 `Mütter` and 🔩 `Muttern` are two Readings of one Lemma.
_Avoid_: plural class, declension class (declension covers the singular too)

**Conjugation Class**:
how a German verb forms its Präteritum, judged on the stem: Strong changes
the stem with no `-te` (`wog`), Weak adds `-te` to the unchanged stem
(`wiegte`), Mixed adds `-te` to a changed stem (`brachte`). A separable verb
is judged by its stem (`aufstehen`: `stand`). A VERB Reading's Knowledge
stores every class its Präteritum forms attest (`senden`: `sandte`,
`sendete`). It never splits a Lemma: `wiegen` 'weigh' (`wog`) and 'rock'
(`wiegte`) are two Readings of one Lemma.
_Avoid_: verb type, irregular verb, Verbklasse

**Locution Type**:
whether a Locution's Reading is an Idiom (its meaning is not the sum of its
words: `ins Gras beißen`) or a Collocation (its verb only supports the
predicate: `eine Entscheidung treffen`). Optional: `zum Teil` has none. It
never splits a Lemma.
_Avoid_: Phraseme Kind, idiomaticity

**Saying Type**:
whether a Saying's Reading is a Proverb or a Winged Word, with an optional
attribution (`Sein oder Nichtsein`: Shakespeare). It never splits a Lemma.
_Avoid_: Aphorism, provenance Kind

**Formula Role**:
what a routine formula does in conversation: greeting, farewell, thanks,
apology, sympathy, request and the like. An INTJ Reading's Knowledge stores
it, so `tut mir leid` is one Lemma with an apology Reading and a sympathy
Reading.
_Avoid_: discourseFormulaRole, DiscourseFormula
