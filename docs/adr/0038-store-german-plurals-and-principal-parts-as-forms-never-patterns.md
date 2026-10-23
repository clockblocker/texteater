---
status: accepted
---

# Store German plurals and principal parts as forms, never patterns

Homonyms that differ only in how they inflect share one Lemma: `Mutter`
'mother' (`Mütter`) and `Mutter` 'nut' (`Muttern`), `Bank` 'bench' (`Bänke`)
and 'bank' (`Banken`), `wiegen` 'weigh' (`wog`) and 'rock' (`wiegte`). Their
Readings tell them apart, as the Emoji Description splits any two senses
([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)).
The Lemma's Paradigm holds each alternative form once, and each Reading
licenses those of its sense
([ADR 0048](./0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md)).
This ADR decides what the German Variation Dimensions hold.

Two alternatives were rejected. A Core plural or conjugation class would make
resolution choose the class from one sentence, though a singular or present
occurrence (`Meine Mutter kocht`) shows none, and `Pizza` with `Pizzen` and
`Pizzas` would become two Lemmas of one word. Homonym indexes (`Mutter¹`,
`Mutter²`) would split the Lemma with no grammar a learner can use.

**A noun's plural.** A German NOUN Lemma's `plural` dimension holds the
nominative plural forms of its senses, each one Paradigm Variant (`Pizza`:
`Pizzen`, `Pizzas`), or a marker: `NoPlural` (`Milch`) or `PluralOnly`
(`Leute`). A Reading licenses forms or one marker: `Wasser` 💧 licenses
`NoPlural`, and 🧴 licenses `Wässer`. Code derives each form's Plural Pattern
from the Canonical Form with `germanPluralPattern`:

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
all. Forms are never rebuilt from pattern labels. `Mutter` holds `Mütter` and
`Muttern` once each, 👩 licenses `Mütter` and 🔩 licenses `Muttern`.

The Knowledge call that creates a Lemma's first Reading names the plural
forms of its sense, and code derives the patterns; a later Reading's Licence
is chosen as ADR 0048 decides. The model never names a pattern, because code
can check a form but not a label. A wrong plural or marker is fixed through
Correct, and a later occurrence may add a form the Paradigm lacks (ADR 0048).

Routing ignores the Paradigm. The emoji judge alone picks the Reading. In
`Zieh die Muttern fest` the judge rejects 👩, and the new 🔩 Reading of the
same Lemma licenses `Muttern`.

**A verb's conjugation class.** A German verb's conjugation class is Strong,
Weak or Mixed, judged on the Präteritum stem (a separable verb by its stem).
Code derives it from each `preterite` variant and never stores it: `wiegen`
'weigh' licenses `wog`, Strong, and 'rock' licenses `wiegte`, Weak. A
Reading's classes are those of the variants it licenses.

**A verb's Präteritum.** The `preterite` dimension holds the third person
singular Präteritum forms, each one variant, as a dictionary cites them
(`wog`; `stand auf` for `aufstehen`, never `aufstand`; `erinnerte` for `sich
erinnern`). A Strong or Mixed verb's past forms can't be rebuilt from its
class, so a host renders these forms and never guesses them
([#1209](https://github.com/clockblocker/texteater/issues/1209)).

**A verb's other principal parts.** Five more dimensions keep the forms a
host can't rebuild from the infinitive or the class
([#1217](https://github.com/clockblocker/texteater/issues/1217)):
`present1`, `present2` and `present3`, the Präsens of each singular person
(`fahre`, `fährst`, `fährt`; `kann`, `kannst`, `kann`), `pastParticiple`, the
Partizip II (`gefahren`; `trompetet`, with no ge-; `gebacken` beside the
Präteritum `backte`), and `subjunctivePast`, the third person singular
Konjunktiv II (`führe`, `brächte`, `verbrennte`). Each variant is one form as
a dictionary cites it. A separable verb's finite forms split off the particle
(`fährt ab`, `führe ab`), its Partizip II is one word (`abgefahren`), and no
form holds `sich`. An Ersatzinfinitiv (`hat … lassen`) is syntax, not a
Partizip II. The write that gives the Präteritum gives them too, so they cost
no model call. Every produced German VERB Reading licenses them, Weak verbs
included: a Weak verb's forms follow from its stem only mostly (`arbeitest`,
`pendle`, `trompetet`), and a host renders stored forms instead of guessing.
The first person is kept because `kann`, `weiß` and `bin` don't follow from
the infinitive. Dumrel checks each variant only for the endings it can be
sure of (a second person Präsens in -t, a Partizip II in -t or -n, a
Konjunktiv II in -e). It checks no dimension against another, since free
alternatives mix across dimensions (`melkte` with `gemolken`).

## Consequences

- A Surface still attaches to its Lemma, so `Muttern` is a Surface of the
  Lemma `Mutter`. The Reading it attests is the emoji judge's decision, and a
  Licence that doesn't take it is flagged (ADR 0048).
- No dimension enters NOUN or VERB Core Features, and no Lemma is split.
- Gold keeps each licensed selection consistent: a Weak verb's Konjunktiv II
  equal to its Präteritum, a Strong verb's Partizip II in -n and a Mixed
  one's in -t. Dumcorpus checks it per selection.
- A record reviewed through Knowledge covers every verb dimension, as it
  covers a noun's `plural` (Dumcorpus ADR 0002).
