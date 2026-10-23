---
status: accepted
---

# Keep Paradigm Variants on the Lemma and license them per Reading

Inflection belongs to the Lemma, not to its senses. Homonyms that inflect
differently share one Lemma: `Bank` 'bench' (`Bänke`) and 'bank' (`Banken`),
`Mutter` 'mother' (`Mütter`) and 'nut' (`Muttern`)
([ADR 0038](./0038-store-german-plurals-and-principal-parts-as-forms-never-patterns.md)).
Other Lemmas have alternatives that every sense takes: `melken` has `molk`
and `melkte`, `Pizza` has `Pizzen` and `Pizzas`. Stored on each Reading,
shared forms would repeat on every sense, and nothing could say that a sense
takes both. So a Lemma owns a **Lemma Paradigm**: each alternative its forms
take, stored once, and for each Reading the alternatives its sense takes.

**Variation Dimensions and Paradigm Variants.** A route's Paradigm Policy, in
Dumrel, names its Variation Dimensions: the parts of its paradigm that may
take alternatives. German NOUN has `plural`. German VERB has `preterite`,
`present1`, `present2`, `present3`, `pastParticiple` and `subjunctivePast`.
A dimension holds one or more Paradigm Variants, each one form or one marker
(`Bänke`, `NoPlural`, `molk`). A variant's id is a content key of its value,
so two writers that add `Banken` add one variant. Variants belong to one
dimension, never to the whole paradigm, because free alternatives mix across
dimensions: Duden allows `melkte` with `gemolken`, and `sandte` with
`gesendet`. A Paradigm Policy may still make one dimension of parts that must
not mix in its language.

**Licences.** Each Reading has a Licence per dimension: the variants its
sense takes. A Reading with no Licence in a dimension is Unstated and takes
every variant. A dimension is **Free** when every Reading of the Lemma takes
every variant, and **Conditioned** otherwise. Both are derived and never
stored.

| Lemma | Variants | Licences | Dimension |
| --- | --- | --- | --- |
| `melken` | preterite: `molk`, `melkte` | ✋ both | Free |
| `Pizza` | plural: `Pizzen`, `Pizzas` | 🍕 both | Free |
| `Bank` | plural: `Bänke`, `Banken` | 🪑 `Bänke`; 🏦 `Banken` | Conditioned |
| `Mutter` | plural: `Mütter`, `Muttern` | 👩 `Mütter`; 🔩 `Muttern` | Conditioned |
| `senden` | preterite: `sandte`, `sendete` | 📨 both; 📡 `sendete` | Conditioned |
| `Wasser` | plural: `Wässer`, `NoPlural` | 💧 `NoPlural`; 🧴 `Wässer` | Conditioned |

`Wort`, `schleifen`, `bewegen`, `hängen` and `schaffen` are Conditioned like
`Bank`. The Readings whose Licences agree in every dimension form a **Licence
Group** and share one inflection table
([ADR 0049](./0049-tabulate-a-lemmas-forms-as-projections.md)). Every Reading
is in exactly one group, and a Free Lemma has exactly one. Gender-distinct
homographs never meet here: *der See* and *die See* are two Lemmas by Core
gender
([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)).

**The Paradigm is grammatical and not identity.** It is not Knowledge, and it
is no part of the Lemma's identity
([ADR 0002](./0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)):
`Pizza` with `Pizzen` and `Pizzas` stays one Lemma, and ADR 0038's rejection
of a Core plural or conjugation class stands. Dumrel defines the Paradigm,
its Paradigm Changes and its pure operations
([Dumrel ADR 0001](../../battery/dumrel/docs/adr/0001-keep-dumrel-ownerless-and-pure.md)),
and Dumdict stores it on the Lemma Record.

**Forms, not patterns.** The forms stay the one source of truth (ADR 0038).
Code derives each variant's Plural Pattern and Conjugation Class, and nothing
stores a pattern or a class. A Reading's classes are those of the variants it
licenses: `senden` 📨 is Mixed and Weak, 📡 is Weak.

**Invariants.** Every Licence is non-empty and names existing variants. A
variant that no Reading licenses is removed. A removed Reading takes its
Licences with it, and a Lemma removed with its last Reading takes its
Paradigm
([ADR 0043](./0043-correct-identity-by-moving-occurrences.md)). A Lemma whose
Paradigm holds no variants derives its forms from the language's rules
alone. Concurrent writers merge variants by id and Licences as a set union
per Reading.

**Who decides the Licence.** Knowledge Production writes Paradigm Changes
when it creates a Reading
([Dumgen ADR 0003](../../battery/dumgen/docs/adr/0003-split-german-knowledge-generation-by-family.md)):

- **A Lemma's first Reading.** Luna writes the forms of its sense as ADR 0038
  describes. Code turns each form into a variant and gives the Reading an
  explicit Licence over them.
- **A later Reading of a Lemma with variants.** Luna first writes the
  sense's forms of each dimension without seeing the stored variants.
  - **Exact match.** If Luna's forms are the dimension's stored variants by
    content id, code licenses those variants and asks no judge.
  - **Contrastive judge.** Otherwise a jev licence judge gets one question
    per such dimension, all in one request. It sees the stored variants and
    Luna's new forms together, in one sorted list that doesn't say which
    Reading holds which or which forms Luna wrote. The marked Sentence and
    the new Reading's Emoji Description sit beside them, as the Reading
    judge sees Emoji Descriptions
    ([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)).
    Its options are every selection of those forms, so it may take one,
    several or all.
  - **What gets licensed.** The Reading licenses the stored variants the
    judge picks. Each new form it picks becomes a variant. A form Luna
    omits never conditions the Reading on its own: only the judge's choice
    leaves a stored form out, so `melken` can stay Free when Luna writes
    `melkte` alone.
  - **Why Luna goes first.** Shown one form at a time, jev says yes to any
    correct form of the word: it took `Bänke` for 🏦 at 0.91. Set beside
    its rival, the form is judged by contrast instead
    ([#1260](https://github.com/clockblocker/texteater/issues/1260)).
- **A Reading whose forms were never produced**, such as an authored member
  without paradigm data, is Unstated and licenses all. Every produced Reading's Licence is explicit, so a later
  variant never joins a Reading produced for another sense: 🪑 does not gain
  `Banken` when 🏦 is created.

Dumcorpus supplies the authored Paradigms and Licences of the Authored
Inventory's closed classes, and a German Doublet Rule with gold for the
meaning-conditioned doublets (`Bank`, `Mutter`, `Wort`, `Strauß`, `Druck`,
`Gesicht`, `schleifen`, `bewegen`, `hängen`, `senden`, `wenden`, `schaffen`,
`erschrecken`, `wiegen`) and free controls (`melken`, `Pizza`). The licence
judge is tuned on one half of that gold and scored on the other, and its
prompt cites the Rule. Code decides ids and merging: it splits a written list
into one variant per form, sets Licences and removes unlicensed variants.

**Routing ignores the Paradigm.** The Reading judge picks by Emoji
Description alone (ADR 0031): `Zieh die Muttern fest` reaches 🔩 by meaning.
A met form that fits only variants its Reading doesn't license, such as
`Banken` judged 🪑, is flagged as a Licence Conflict. Code never relicenses the
Reading or moves the occurrence, because it can't tell a misjudged Reading
from an incomplete Licence. Correct does either: it moves the occurrence
(ADR 0043) or licenses the variant.

**A later occurrence may add a variant.** Code detects a met form that fits
no stored variant: it sits in a table cell whose derived forms are known, and
no variant derives it there, such as `Pizzas` when only `Pizzen` is stored. A post-click step in Dumgen, in the
shape of
[ADR 0047](./0047-accumulate-a-readings-translations-click-by-click.md), asks
jev whether the form is a standard form of the sense. If so, the form becomes
a variant with provenance `Attested`, licensed to the Reading it was met
under. Nothing else is removed or relicensed. A Variant spelling (`daß`) or a
Typo never triggers it. Translations (ADR 0047) and Paradigm Variants are
the only stored values a later occurrence adds to. Every other stays as the
occurrence that wrote it left it
([#883](https://github.com/clockblocker/texteater/issues/883), point 5).

## Considered Options

- Principal parts kept on each Reading and pooled by a projection. Rejected:
  the forms stay on senses, against the user's ruling. Shared forms repeat
  per Reading, "takes every variant" can't be expressed, and an added variant
  would have to be written into a Reading the judge may have got wrong.
- Whole-paradigm variants. Rejected: free alternatives would need every
  combination of the parts, and one met form (`gemelkt`) couldn't say which
  whole variant it belongs to.
- One table per variant instead of per Licence Group. The two agree whenever
  Licences partition the variants. Rejected for overlap: `senden` 📨 would
  embed two half tables instead of one with `sandte / sendete`.
- Luna alone for a later Reading. Rejected: an omission (`melkte` only) would
  read as false conditioning. The judge sees every stored option.
- A judge over the stored variants alone, before Luna, with Luna only after
  NoMatch. Rejected: jev says yes to a correct form it sees alone. On the
  German Doublet Rule's gold it got 72.8% of dimensions right, and it gave
  `Bank` and `Mutter` the other meaning's plural in nearly every run.

## Consequences

- The principal-part aspects leave Reading Knowledge, a hard break in Dumrel,
  and Dumdict's stored records change. tf-demo has to migrate
  ([#1232](https://github.com/clockblocker/texteater/issues/1232)).
- A Lemma's later Reading costs the Luna write a first Reading costs, and
  one jev call more only when some dimension's forms differ from the stored
  ones. A first Reading costs nothing extra.
- A new Reading may split or join Licence Groups, so a host rewrites the
  affected tables in the commit that adds it.
