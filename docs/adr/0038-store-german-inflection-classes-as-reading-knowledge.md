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
([ADR 0030](./0030-store-preposition-government-as-reading-knowledge.md),
[ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)).
Decided in [#597](https://github.com/clockblocker/texteater/issues/597).

Two alternatives were rejected. A Core plural or conjugation class would make
resolution choose the class from one sentence, though a singular or present
occurrence (`Meine Mutter kocht`) shows none, and `Pizza` with `Pizzen` and
`Pizzas` would become two Lemmas of one word. Homonym indexes (`Mutter¹`,
`Mutter²`) would split the Lemma with no grammar a learner can use.

**A noun's plural.** A German NOUN Reading's `pluralPattern` is a set of Plural
Patterns or one marker:

| Value | Example |
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
| `NoPlural` | `Milch` |
| `PluralOnly` | `Leute` |

`-n` and `-en` are one pattern, as in learner dictionaries, and so are a
doubled final consonant (`Lehrerinnen`) and a foreign ending replaced by `-en`
(`Museum` → `Museen`).

The Knowledge call that creates a Reading names the plural forms of its sense,
and code derives each pattern from the Canonical Form. The model never names a
pattern, because code can check a form but not a label.

Every occurrence whose Surface is a nominative, accusative or genitive plural
Contributes the pattern it attests, with no model call. Variants accumulate
this way: `Die Pizza heute war lecker` stores `[En]`, and `Ich mag Pizzas`
adds `S` to the same Reading. A dative plural is skipped, because its `-n`
(`Kindern`) marks case, not plural. An attested plural never Contributes to a
NoPlural or PluralOnly Reading. A plural-only noun attests only its own
Canonical Form, and replacing a marker takes Correct.

Routing ignores the aspect. The emoji judge alone picks the Reading, and the
occurrence Contributes to the Reading it picked. In `Zieh die Muttern fest` the
judge rejects 👩, and the new 🔩 Reading of the same Lemma stores `[En]`.

**A verb's conjugation class.** A German VERB Reading stores its conjugation
class as a set of Strong, Weak and Mixed, judged on the Präteritum stem (a
separable verb by its stem): `wiegen` 'weigh' is Strong (`wog`), and 'rock' is
Weak (`wiegte`). The generator names the Präteritum form and code derives the
class, as for plurals.

## Consequences

- A Surface still attaches to its Lemma, so `Muttern` is a Surface of the
  Lemma `Mutter`. The Reading it attests is the emoji judge's decision.
- Neither aspect enters NOUN or VERB Core Features, and no Lemma is split.
- The plural shipped first. The conjugation class is still open in #597.
