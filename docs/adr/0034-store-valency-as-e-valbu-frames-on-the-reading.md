---
status: accepted
---

# Store valency as accumulated concrete patterns on the Reading

A Reading records the governed complements of its word: what a learner must
memorize to use this word in this sense. A complement the word requires is
recorded even when its marker is free: `wohnen` needs a place, whether `in`,
`bei` or `auf` marks it. Free adjuncts are not recorded (`Er wartet im Regen`).
The Note's Source Contexts Block already shows how the word was used.

**Accumulated Valency Patterns.**

A Reading's `valency` is an arrival-ordered set of concrete **Valency
Patterns** (`ValencyPattern[]`), each pattern a non-empty flat list of concrete
complements realized in an encountered sentence (`ValencyComplement[]`), with
no optionality statuses and no inline `|` alternatives.

For example, clicking *nach Reiseführern fragten* contributes `[Nom, nach + Dat]`
to `fragen` ❓. Later clicking *Du hast mich gefragt* contributes `[Nom, Acc]`.
The Reading holds both concrete patterns rather than an upfront factored
E-VALBU grid like `(jN | dass … | ob … | w- …) (nach jM)`. Optionality emerges
from the set of encountered patterns rather than being guessed or spoiled ahead
of time.

Within a single concrete pattern:

- A German verb pattern opens with `Nom` at index 0 unless the verb is
  subjectless (expletive `es` only, e.g. `es graut mir` → `[Dat]`). In a
  passive sentence, the passive subject maps back to its active case (`Acc` or
  `Dat`).
- Each `Preposition` (by preposition + case), `Subject`, `DirectObject`,
  `IndirectObject` and `Reflexive` appears at most once per pattern. A German
  `Case` may appear twice for a double accusative (`jN jN fragen`, `jN jN
  lehren`; [ADR 0057](./0057-name-a-valency-complement-by-its-case-never-its-referent.md)).
- Every pattern in the frame is unique (set semantics). `Contribute` takes the
  set union in arrival order; `Correct` replaces the set; `Retract` removes a
  named pattern (or clears `valency` when omitted).

Valency never creates a Lemma, and only the Emoji Description splits Readings
([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)). A
Required lexical reflexive shows as a leading 🪞
([ADR 0052](./0052-record-a-lexical-reflexive-on-the-reading-never-in-the-canonical-form.md)),
and every pattern stored on a 🪞 Reading carries its `Reflexive` complement.
Fixed parts (a separable prefix, an expletive `es`, a Locution's fixed words)
are never complements.

Valency sits on the Reading because government varies by sense, and it is
Knowledge, not a Semantic Relation. The preposition stores nothing: its
governors are projected across all patterns in the Reading's `valency`,
following ADR 0012's rule that only direct claims are stored.

The pattern skeleton is universal. Each language defines its complement
vocabulary. German follows E-VALBU's complement kinds:

```ts
{ kind: "Case", governedCase: "Nom" | "Acc" | "Dat" | "Gen" }
{ kind: "Preposition", preposition: /* ADP Lexeme Lemma */, governedCase: "Acc" | "Dat" | "Gen" }
{ kind: "Adverbial", standIn: "Irgendwo" | "Irgendwohin" | "Irgendwie" | "IrgendwieLange" | "IrgendwieViel" }
{ kind: "Predicative", marker: "None" | "Als" | "Für" }
{ kind: "Clause", form: "ZuInfinitive" | "BareInfinitive" | "Dass" | "Ob" | "W", preposition?: /* ADP Lexeme Lemma */ }
{ kind: "Reflexive", governedCase: "Acc" | "Dat", preposition?: /* ADP Lexeme Lemma */ }
```

No complement names its referent, whether a person or a thing fills it
([ADR 0057](./0057-name-a-valency-complement-by-its-case-never-its-referent.md)).

- **Case** and **Preposition** mark a complement by the case the word governs
  (`governedCase`, never `case`). A governed preposition is always one ADP
  Lexeme with one member.
- **Adverbial** is E-VALBU's Kadv, named by its stand-in (`irgendwo`,
  `irgendwohin`, `irgendwie`, `irgendwie lange`, `irgendwie viel`).
- **Predicative** is E-VALBU's Kprd (`None`, `Als`, `Für`): describes the
  pattern's `Acc` object when present, else the subject.
- **Clause** is a clausal complement (`ZuInfinitive`, `BareInfinitive`, `Dass`,
  `Ob`, `W`). When a `da(r)-` pronominal adverb anticipates the clause (*darauf
  achten, dass …*), `Clause.preposition` names that ADP Lemma (`auf`) directly
  so the pattern is self-contained without needing a sibling `Preposition`
  complement.
- **Reflexive** is a lexical reflexive (`Acc` or `Dat`), naming its preposition
  inside a fixed phrase (`außer sich sein` → `außer` + `Dat`;
  [ADR 0052](./0052-record-a-lexical-reflexive-on-the-reading-never-in-the-canonical-form.md)).

Hebrew marks `Subject`, `DirectObject` and caseless `Preposition`. English
marks `Subject`, `DirectObject`, `IndirectObject`, caseless `Preposition` and
caseless `Reflexive`.

Each language × Family × Kind route chooses which complement kinds it allows:
German VERB routes (Lexeme and Locution) allow all six; ADJ routes allow all
but Predicative and Reflexive; NOUN routes allow `Preposition` and `Clause`;
other routes take no valency.

**Click-by-click accumulation and per-Visitor projection.**

Valency accumulates gradually from encountered sentences, mirroring translation
accumulation
([ADR 0047](./0047-accumulate-a-readings-translations-click-by-click.md)):

1. On a **New** Reading, `knowledge.produce` extracts only the single concrete
   pattern `<TARGET>` realizes in that creating sentence, anchored to
   `attestation.valencyEvidence`, and records it on both the Reading's
   `valency` and the creating Attestation's `realizedValencyPattern`.
2. On a **reused** (or authored) Reading, post-click
   `knowledge.accumulateValency` runs asynchronously after the click commits:
   `jev` judges whether one of the Reading's stored patterns matches what this
   sentence realizes; only after `NoMatch` (or when no patterns are stored yet)
   does Luna extract the concrete pattern without seeing stored patterns. Any
   genuinely new pattern is contributed to the Reading, and the matched or
   extracted pattern is recorded on this Attestation's
   `realizedValencyPattern`.
3. When loading a Reading Note for a Visitor, `tf-demo` projects the distinct
   `realizedValencyPattern`s across that Visitor's own encounters of the
   Reading (falling back to the Reading's shared `valency` when none are
   recorded on their Attestations yet). A Visitor never sees unencountered
   patterns discovered by another Visitor.

**An occurrence on the click path.**

The click-path Attestation keeps `valencyEvidence: { member: index | null,
complement, realizedCase }[]` lean — recording only member-backed governed
`Preposition`s, `Reflexive`, and ADP `realizedCase`. Bare case objects,
Adverbials, Predicatives and Clauses stay off the click path and are extracted
asynchronously post-click.

A governed preposition stays an Attestation member so clicking it routes to its
governor (`aus Angst vor Hunden` → `[Angst, vor]`), while `normalizedSurface`
omits governed prepositions and lexical reflexives (`wartet`, `erinnert`;
[ADR 0056](./0056-store-a-german-surface-in-base-order-and-project-its-slots.md)).
Pronominal adverbs (`darauf`, `dafür`) stay standalone ADV units with
`member: null` on the governor's evidence, unless realizing a Locution's fixed
preposition (`damit` in `hatte es damit zu tun`).

**Rendering.**

Reading Headings and Surface Card Tails stay clean and uncrowded: a Reading
Heading prints only the emoji and Citation (`❓ fragen`, `🪞🧠 sich erinnern`,
`👀 auf|passen`), and a Surface Heading prints only the base-order form with
separable bar and `sich` for Required reflexives (`gefragt hast`, `an|fängt`,
`sich erinnert`).

Discovered Valency Patterns render as a bulleted list inside the Reading's
dedicated **Valency Block** (folded behind `Show N more` after 4 patterns),
showing only patterns that carry at least one governed complement or lexical
reflexive:

```text
• nach `jM` fragen
• `jN` fragen
• `jN` nach `jM` fragen
• darauf, `dass …` achten
• sich an `jN` erinnern
• mit `jM` zu tun haben
• stolz auf `jN`
• Angst vor `jM`
```

Bare intransitive `[Nom]` patterns render nothing, so intransitive verbs and
complementless nouns/adjectives show no Valency Block until a governed
complement is met.

## Consequences

- [ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md)
  keeps government out of Lemma identity; this ADR accumulates concrete
  realized patterns on the Reading, records each occurrence's pattern on its
  Attestation post-click, and keeps click-path `valencyEvidence` lean.
- A preposition's `governedBy` view projects from every `Preposition`
  complement across all stored patterns.
- Every governor Kind takes its governed preposition as an Attestation member
  (VERB, ADJ, NOUN, Locutions, and routine formulas), while `normalizedSurface`
  omits it.
- An adposition's own cases are no pattern list; dumcorpus's ADP Case Table
  lists them, validates every `Preposition` complement and `Clause.preposition`
  against them, and renders the ADP's Valency Block
  ([ADR 0053](./0053-list-each-adpositions-cases-in-an-authored-adp-case-table.md)).
