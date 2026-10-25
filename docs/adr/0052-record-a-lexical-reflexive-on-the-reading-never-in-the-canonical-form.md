---
status: accepted
---

# Record a lexical reflexive on the Reading, never in the Canonical Form

A Canonical Form never holds valency. Placeholders (`jdm.`, `etwas`) and
governed prepositions already stay out of it
([ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md),
[ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md)), and a
lexical reflexive stays out too. `sich erinnern` is the Lemma `erinnern`. Its
Reading 🪞🧠 'remember' has a Reflexive Slot in its Valency Frame
([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)), and
its Reading 💭 'remind someone' has none. Only the presentation layer prints
`sich`. The user ruled this on
[#1285](https://github.com/clockblocker/texteater/issues/1285),
[#1286](https://github.com/clockblocker/texteater/issues/1286) and
[#1287](https://github.com/clockblocker/texteater/issues/1287) on
2026-10-25.

**Reflexivity belongs to the Reading.** A reflexive verb has the same forms
as its base verb, because `sich` is a separate word. The Lemma is grammatical
identity
([ADR 0002](./0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)),
and government already stays out of it (ADR 0029). A separable particle is
different: `auf` is part of the word `aufpassen`, so `hasSepPrefix` stays
Core. Duden and DWDS list ⟨sich erinnern⟩ as a sense under `erinnern`. ADR
0032's dictionary check reads that usage line as not identity
([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)). So no
route has a reflexive Core Feature, and German VERB has no
`lexicallyReflexive`. One Lemma holds the plain and the reflexive Readings.
`vorstellen` has 'introduce' and 🪞 'imagine' (Reflexive Dat, then Acc).
Introducing oneself is no Reading of its own: another noun phrase can replace
its `sich` (*er stellt seine Frau vor*, E-VALBU), so that `sich` is a free
PRON (below). A relation or Source that names the bare Lemma
(`entschuldigen`, `sorgen`) needs no change.

**The Reflexive complement.** The frame vocabulary gains a Reflexive
complement. The German one names the case of its reflexive, which is fixed
per Reading:

```ts
{ kind: "Reflexive", governedCase: "Acc" | "Dat" }
```

`erinnern` 🪞🧠 takes Acc (*ich erinnere mich*). `vorstellen` 'imagine' takes
Dat (*ich stelle mir etwas vor*). The field is `governedCase` for the reason
ADR 0034 gives. The Reflexive has no referent, since it is the subject. The
English Reflexive has no case (`pride oneself on`). Hebrew adds none, since
HITPAEL is a binyan, not a pronoun. A Reflexive is the only complement in its
Slot, and a frame has at most one. Its Slot takes a status like any other.
`schämen` takes a Required one. Where Duden gives one sense with and without
the reflexive, as in `(sich) ausruhen`, the Slot is Optional.

**Which `sich` fills the Slot.** A Reading has a Reflexive Slot exactly when
no other noun phrase can replace its `sich` in that sense. This is the
fixed-member test (Rule `de/fixed-member-test`) applied to the reflexive. Rule
`de/verb-owns-its-scattered-members` already draws the same line for
membership. The test covers three kinds:

- inherent: `sich schämen`, `sich erinnern`
- reciprocal-inherent: `sich zanken`
- the modal-passive `sich lassen`: *die Tür lässt sich öffnen*
  ([ADR 0026](./0026-treat-modals-as-verbs-and-confine-aux-to-grammar-readings.md))

A `sich` that alternates with another object in the same sense is a free PRON
unit of its own
([ADR 0044](./0044-identify-german-pronouns-by-pillar-stem-and-referent.md)),
and it fills an ordinary Acc or Dat Slot. Examples are *er wäscht sich* (*er
wäscht ihn*), the benefactive *sie kauft sich ein Buch* and the contextual
reciprocal *sie grüßen sich*.

**Locutions follow the same rule.** A Locution's Reading takes a Reflexive
Slot in the same way, and its Canonical Form drops `sich`:

- `Sorgen machen` 😟 'worry', Reflexive Dat
- `es gemütlich machen`, Reflexive Dat
- `den Kopf zerbrechen`, Reflexive Dat
- `geschlagen geben`, Reflexive Acc

`jdm. Sorgen machen` 'cause someone worry' is another Reading of `Sorgen
machen`, with an ordinary Dat Slot. A Saying is a sentence, so its `sich` is
one of its words, not valency: `Wie man sich bettet, so liegt man` keeps it.

**A Required Reflexive Slot marks its Reading with 🪞.** Readings of one Lemma
are told apart by their Emoji Description alone
([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)),
and a reflexive use and a plain use may share a meaning emoji. *Ich fürchte
den Hund* and *Ich fürchte mich vor dem Hund* are both 😨, yet Duden and DWDS
give each its own sense line. Their frames differ: one has an Acc, the other a
Reflexive Acc and `vor` + Dat. One frame can't hold both uses. A Reflexive and
an Acc name different participants, so they can't be alternatives, and two
Optional Slots would license *ich fürchte mich den Hund*.

So a Reading whose frame has a Required Reflexive Slot starts its Emoji
Description with 🪞. 🪞 is the Reading of the reflexivity unit `sich`, just as
a reciprocal pronominal adverb starts with 🤝, the Reading of `einander`
(ADR 0029). `fürchten` has 😨 and 🪞😨, and `erinnern` has 💭 and 🪞🧠. The
marker goes on every such Reading, not only where two Readings would collide,
because the generator never sees the stored Readings. The grammar judgment
supplies the marker, not the emoji model. When a click's members hold a
lexical reflexive, the Reading judge is offered only Readings with a Reflexive
Slot, and code writes 🪞 before the emoji the generator proposes. An Optional
Reflexive Slot carries no marker, and its Reading is offered whether or not
the sentence has `sich`. dumcorpus checks two invariants:

- 🪞 comes first exactly when the frame has a Required Reflexive Slot.
- No Lemma has a Reading with an Optional Reflexive Slot beside a 🪞 Reading
  whose remaining emoji is the same.

The judges agreed on this on
[#1285](https://github.com/clockblocker/texteater/issues/1285#issuecomment-6394459769).

**An occurrence keeps the reflexive as a member.** The reflexive stays a
member of its verb's or Locution's Attestation, so clicking `sich` in *sie
erinnert sich* opens `erinnern` 🪞🧠
([ADR 0003](./0003-attestation-supersedes-selection-and-owns-realization-coverage.md)).
`valencyEvidence` names that member with its Reflexive complement and the case
it took, as it names a governed preposition. Three things read it: the Reading
judge's offer above, `normalizedSurface`, and the Knowledge call, which adds a
Reflexive Slot its sentence realizes when the proposed frame omits one (ADR
0034).

`normalizedSurface` leaves the reflexive out, as it leaves out governed
prepositions: `erinnert`, not `erinnert sich`, and `macht Sorgen`, not `macht
sich Sorgen`. A Surface is a form of its Lemma, and `sich` is no form of
`erinnern`, so the Grundform check compares bare forms. `segment.inUnits`
doesn't change. It decides membership and routes, it writes no Canonical Form,
and the reflexive is still a member.

**Only the presentation layer prints `sich`.** tf-demo owns one shared
presenter, in its German overrides, that renders a Reading's Citation from the
Reading's Lemma and frame. Every place that now prints a Reading's raw
Canonical Form uses it. German puts `sich` first, or right after a leading
`es`: `sich erinnern`, `sich Sorgen machen`, `es sich gemütlich machen`. A
heading at Lemma level has no frame to read, so it shows the bare Lemma,
`erinnern`. How the Valency Block places `sich` among the Slots, and whether
it shows the case, is decided in tf-demo as a presentation question. An
inflection table never prints the reflexive: its cells are bare forms (`er
schämt`, not `er schämt sich`), as the user ruled on 2026-10-25. Dumgen's
prompts are not read by a learner, and they pass the Canonical Form and the
frame as data.

**Lookup strips the reflexive.** Some wordings cite a reflexive, such as a
lookup a learner types (`sich erinnern`) or a relation target a model wrote
(`sich freuen`). Such a wording is normalized before it is matched: lookup
removes `sich`, or the `sich` after a leading `es`. The wording then resolves
to the Lemma like any other. Where a Reading is chosen, a 🪞 Reading is
preferred. `erinnern` and `sich erinnern` share one Spelling Crossroad, and
that is fine, because a Crossroad holds every Lemma with its key.

**Breakdowns need no exception.** A Breakdown spells the Canonical Form, which
is now the bare word: `erinnern` = `er · inner · n`
([ADR 0050](./0050-break-a-reading-down-into-its-constituents.md),
[ADR 0051](./0051-copy-school-morphemic-analysis-into-a-readings-morphemes.md)).
Dumrel's `breakdownWording` (bdf2057bc) removed `sich` for the spell-back. It
is deleted along with the model change.

**Hebrew doesn't change.** No Hebrew route changes. The record
`he/hu-hitkatev-im-hamartse.json` cites the HITPAEL verb התכתב under `כתב`.
Whether that fits the Hebrew Grundform rule is the Hebrew owner's call.

## Considered Options

- A boolean `isReflexive` Core Feature. Rejected: the reflexive's form needs
  the case (*mich* or *mir*), which a boolean doesn't hold.
- `lexicallyReflexive` Acc | Dat kept in Core, with a bare Canonical Form.
  Rejected: reflexivity is not grammatical identity. Unit Shadows carry no
  Core, so they couldn't tell `erinnern` from its reflexive twin
  ([#1288](https://github.com/clockblocker/texteater/issues/1288)).
- A reflexive Lemma of its own with a "sich X" Canonical Form. Rejected for
  the reasons above. It had also split 5 relation and Source targets in gold
  that named the bare form.
- One Reading for the reflexive and plain uses whenever they share an emoji,
  with both patterns in one frame. Rejected: one frame can't hold both
  (above).
- 🪞 only where two Readings would collide. Rejected: the generator can't see
  the stored Readings.
- `sich` kept in `normalizedSurface`. Rejected: a Surface is a form of its
  Lemma, and governed prepositions are already left out.
- Dumling or dumrel owning the citation presenter. Rejected: the user ruled
  that `sich` shows only in presentation, and tf-demo is the host that prints
  it.

## Consequences

- Replaces ADR 0029's reflexive Lemma and ADR 0032's German reflexive
  exception. Amends ADR 0026, ADR 0034, ADR 0036, ADR 0038, ADR 0039, ADR
  0041, ADR 0044, ADR 0050 and ADR 0051.
- Dumling deletes `lexicallyReflexive` with its legacy `"Yes"` values, and a
  German Attestation's `valencyEvidence` gains the Reflexive. Dumrel's German
  and English complement vocabularies gain the Reflexive.
- dumcorpus rewrites its gold once. The six base/reflexive twin Lemmas merge
  (`entscheiden`, `entschuldigen`, `fragen`, `fühlen`, `fürchten`, `lassen`).
  About 50 Spec Records and 2 Breakdown Records lose `sich` from Canonical
  Forms and Surfaces. Readings with a Required Reflexive Slot take 🪞, and the
  reflexive Rules are reworded last.
- The tf-demo database is reset.
