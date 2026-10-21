---
status: accepted
---

# Store German inflection classes as Reading Knowledge

Homonyms that differ only in how they inflect share one Lemma: `Mutter`
'mother' (`Mütter`) and `Mutter` 'nut' (`Muttern`), `Bank` 'bench' (`Bänke`)
and 'bank' (`Banken`), `wiegen` 'weigh' (`wog`) and 'rock' (`wiegte`). Their
Readings tell them apart, as the Emoji Description splits any two senses
([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)).
Each Reading stores its own inflection class as Knowledge, the way it stores
its Valency Frame
([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)).

Two alternatives were rejected. A Core plural or conjugation class would make
resolution choose the class from one sentence, though a singular or present
occurrence (`Meine Mutter kocht`) shows none, and `Pizza` with `Pizzen` and
`Pizzas` would become two Lemmas of one word. Homonym indexes (`Mutter¹`,
`Mutter²`) would split the Lemma with no grammar a learner can use.

**A noun's plural.** A German NOUN Reading's `plural` aspect stores the
nominative plural forms of its sense, each listed once (`Pizza`: `Pizzen`,
`Pizzas`), or one marker: `NoPlural` (`Milch`) or `PluralOnly` (`Leute`).
Code derives each form's Plural Pattern from the Canonical Form with
`germanPluralPattern`:

| Pattern | Example |
| --- | --- |
| `NoEnding` | `Lehrer` → `Lehrer` |
| `UmlautOnly` | `Mutter` → `Mütter` |
| `E` | `Tag` → `Tage`, `Kenntnis` → `Kenntnisse` |
| `UmlautE` | `Bank` → `Bänke` |
| `Er` | `Kind` → `Kinder` |
| `UmlautEr` | `Haus` → `Häuser` |
| `En` | `Mutter` → `Muttern`, `Frau` → `Frauen`, `Pizza` → `Pizzen` |
| `S` | `Pizza` → `Pizzas` |
| `Other` | `Visum` → `Visa` |

`-n` and `-en` are one pattern, as in learner dictionaries, and so are a
doubled final consonant (`Lehrerinnen`) and a foreign ending replaced by `-en`
(`Museum` → `Museen`).

The form is the one source of truth, because a pattern can't give its form
back: `En` covers `Muttern`, `Frauen`, `Lehrerinnen` and `Pizzen`, an umlaut
pattern doesn't say which vowel changes, and `Other` (`Visa`) has no form at
all. Forms are never rebuilt from pattern labels, and never pooled across a
Lemma's Readings: `Mutter` 👩 stores `Mütter` and 🔩 stores `Muttern`.

The Knowledge call that creates a Reading names the plural forms of its
sense, and code derives the patterns. The model never names a pattern,
because code can check a form but not a label. A later occurrence never
changes the stored plural; a wrong plural or marker is fixed through Correct.
The user ruled this for every stored aspect in
[#883](https://github.com/clockblocker/texteater/issues/883) (point 5), except
translations, which later occurrences add to
([ADR 0047](./0047-accumulate-a-readings-translations-click-by-click.md)).

Routing ignores the aspect. The emoji judge alone picks the Reading. In `Zieh
die Muttern fest` the judge rejects 👩, and the new 🔩 Reading of the same
Lemma stores `Muttern`.

**A verb's conjugation class.** A German VERB Reading stores its conjugation
class as a set of Strong, Weak and Mixed, judged on the Präteritum stem (a
separable verb by its stem): `wiegen` 'weigh' is Strong (`wog`), and 'rock' is
Weak (`wiegte`). The generator names the Präteritum form and code derives the
class, as for plurals.

**A verb's Präteritum.** The Reading also keeps the forms its classes are
judged on, as its `preterite` aspect: the third person singular Präteritum
forms of its sense, each listed once, as a dictionary cites them (`wog`;
`stand auf` for `aufstehen`, never `aufstand`; `erinnerte` for `sich
erinnern`). A Strong or Mixed verb's past forms can't be rebuilt from its
class, so a host renders these forms and never guesses them
([#1209](https://github.com/clockblocker/texteater/issues/1209)). The call that
writes the forms gives both aspects, so keeping them costs no model call. The
class stays stored beside the forms, so Knowledge written before the forms
were kept stays whole. The generator fills both from one write, so they
agree whenever it writes them together. Dumrel doesn't require them to agree:
a later occurrence never changes a stored aspect
([#883](https://github.com/clockblocker/texteater/issues/883), point 5), so
forms kept for a Reading whose classes were stored earlier may attest a class
it lacks. Refusing them would lose the whole run's Knowledge, and a wrong
class is fixed through Correct.

**A verb's other principal parts.** Three more aspects keep the forms a host
can't rebuild from the infinitive or the class
([#1217](https://github.com/clockblocker/texteater/issues/1217)):
`presentSingular`, the Präsens of each singular person (`fahre`, `fährst`,
`fährt`; `kann`, `kannst`, `kann`), `pastParticiple`, the Partizip II
(`gefahren`; `trompetet`, with no ge-; `gebacken` beside the Präteritum
`backte`), and `subjunctivePast`, the third person singular Konjunktiv II
(`führe`, `brächte`, `verbrennte`). Each lists its forms once, as a
dictionary cites them. A separable verb's finite forms split off the
particle (`fährt ab`, `führe ab`), its Partizip II is one word
(`abgefahren`), and no form holds `sich`. An Ersatzinfinitiv (`hat …
lassen`) is syntax, not a Partizip II. The write that gives the Präteritum
gives them too, so they cost no model call. Every German VERB Reading keeps
them, Weak verbs included: a Weak verb's forms follow from its stem only
mostly (`arbeitest`, `pendle`, `trompetet`), and a host renders stored forms
instead of guessing. The first person is kept because `kann`, `weiß` and
`bin` don't follow from the infinitive. Dumrel checks only the endings it
can be sure of (a second person Präsens in -t, a Partizip II in -t or -n, a
Konjunktiv II in -e). It checks the parts neither against each other nor
against the classes, for the reason it doesn't check the Präteritum.

## Consequences

- A Surface still attaches to its Lemma, so `Muttern` is a Surface of the
  Lemma `Mutter`. The Reading it attests is the emoji judge's decision.
- No aspect here enters NOUN or VERB Core Features, and no Lemma is split.
- Gold keeps the classes and the Präteritum in agreement, a Weak verb's
  Konjunktiv II equal to its Präteritum, a Strong verb's Partizip II in -n
  and a Mixed one's in -t, and dumcorpus checks it.
- Records reviewed through Knowledge don't yet have to cover the principal
  parts. Records over the file-token limit can't take them until they are
  split, and the Readings they share carry one value (Dumcorpus ADR 0002).
  Once they hold them, they join the structural aspects.
