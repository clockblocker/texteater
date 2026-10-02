---
status: accepted
---

# Store valency as E-VALBU frames on the Reading

A Reading records the governed complements of its word: what a learner must
memorize to use this word in this sense. A complement the word requires is
recorded even when its marker is free: `wohnen` needs a place, whether `in`,
`bei` or `auf` marks it. The marker is free, but whether the complement is
needed is governed: *Sie wohnt* is incomplete. Free adjuncts are not recorded
(`Er wartet im Regen`). The Note's Source Contexts Block already shows how the
word was used. Recording adjuncts as well was rejected because it heads into
full syntactic analysis to produce a copy of Source Contexts.

**The Valency Frame.**

A Reading owns at most one Valency Frame, modelled on E-VALBU, the IDS
Mannheim valency dictionary, where each Lesart has one Satzbauplan and
optional complements are parenthesised. A frame is an ordered list of Slots.
Each Slot is `{ status, complements }`: one status, `"Required" | "Optional"`,
and a non-empty ordered list of complements, usually one. Several complements
in one Slot are alternatives, E-VALBU's `/`: `reden` has a Required Nom, an
Optional `mit` + Dat and an Optional `über` + Acc | `von` + Dat. A Case or
Preposition complement appears at most once in a frame, since its referent
tells it apart (`jemanden etwas lehren` has an Acc Someone and an Acc
Something). An Adverbial, Predicative or Clause appears at most once in a
Slot but may recur in another: `Dass er kommt, bedeutet, dass sie geht` has
a Clause Dass in the Nom Slot and in the Acc Slot of `bedeuten`.

The status describes the Reading's valency, not one occurrence. A sentence in
this sense realizes one complement of each Required Slot and at most one of
each Optional Slot, though an imperative, a passive, an ellipsis or a
coordination may leave out a Required Slot.

Two complements are alternatives in one Slot when either can replace the other
in the same position of the same sentence, the Reading stays the same (same
Emoji Description), and both name the same participant. They need not answer
the same question word (`mich | mir ekelt`). Complements that can appear
together are separate Slots, each with its own status, so E-VALBU's `v` is not
modelled: `wohnen` has a Required place and an Optional manner. A different
sense is a different Reading.

A frame never creates a Lemma or a Reading. Only the Emoji Description splits
Readings ([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)).
`warten` with and without `auf` is one Reading with an Optional `auf` slot.
`sich gewöhnen an` has a Required `an` slot. `bestehen auf` and `bestehen aus`
are two Readings because their senses differ, and each has its own frame.

Fixed parts are not slots. A separable prefix, a lexical reflexive and a
Locution's wording come from Lemma identity.

The frame sits on the Reading because government varies by sense, and it is
Knowledge, not a Semantic Relation. Its edges carry a case, cross Families
(the Collocation `Bescheid wissen` governs the Lexeme `über`, which ADR 0020
keeps out of relations) and have no algebra beyond one inverse. A separate
Grammatical Relation store was rejected because it would duplicate the
Contribute, Correct and Retract operations Knowledge already has. The
preposition stores nothing: its governors are projected, following ADR 0012's
rule that only direct claims are stored.

The frame skeleton is universal. Each language defines its complement
vocabulary. German follows E-VALBU:

```ts
{ kind: "Case", governedCase: "Nom" | "Acc" | "Dat" | "Gen", referent }
{ kind: "Preposition", preposition: /* ADP Lexeme Lemma */, governedCase: "Acc" | "Dat" | "Gen", referent }
{ kind: "Adverbial", standIn: "Irgendwo" | "Irgendwohin" | "Irgendwie" | "IrgendwieLange" | "IrgendwieViel" }
{ kind: "Predicative", of: "Subject" | "Object", marker: "None" | "Als" | "Für" }
{ kind: "Clause", form: "ZuInfinitive" | "BareInfinitive" | "Dass" | "Ob" | "W", correlate?: "Required" | "Optional" }
// referent: "Someone" | "Something" | "Either"
```

- **Case** and **Preposition** mark a complement by the case the word
  governs. The field is `governedCase`, not `case`, because Knowledge never
  carries a Feature Pool feature or its name
  ([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)). A
  governed preposition is always one ADP Lexeme with one member. A
  circumposition or another Locution ADP heads an adjunct and is never
  governed.
- **Adverbial** is E-VALBU's Kadv, named by its stand-in, the adverb E-VALBU
  substitutes for it: `wohnen` *irgendwo*; `legen`, `stellen`, `setzen` and
  `hängen` *irgendwohin*; `sich benehmen` *irgendwie*; `dauern` *irgendwie
  lange*; `kosten` *irgendwie viel*. Other stand-ins wait until a word
  requires one. It has no referent, and the preposition inside it is free
  (see "An occurrence").
- **Predicative** is E-VALBU's Kprd: `aussehen` takes one of its subject with
  no marker, and `jN für dumm halten` one of its object marked `für`. It has
  no case and no referent. Its marker `als` or `für` is a free word, and it
  never makes a Preposition Slot. A copula (`sein`, `werden`, `bleiben`,
  `scheinen`, `wirken`, `sich zeigen`) has a Required Nom and a Required
  Predicative of its subject, marked `als` for `sich zeigen` and unmarked for
  the rest. Whether a complement is Manner or Predicative follows E-VALBU per
  Reading. Where E-VALBU lacks the verb, it is Predicative when "X is ADJ"
  holds (`die Suppe sieht lecker aus`: `die Suppe ist lecker`) and Manner
  otherwise (`er benimmt sich gut`).
- **Clause** is a clausal complement, one per form. It is an alternative in
  the Slot of a noun phrase that could stand in its place (`versuchen` Acc |
  Clause ZuInfinitive; `wissen` Acc | Clause Dass | Clause Ob | Clause W), and
  it has a Slot of its own where none can (`sich weigern`). Modals take a
  Clause BareInfinitive, and `helfen` takes Clause BareInfinitive | Clause
  ZuInfinitive besides its Dat. `correlate` says whether the clause needs a
  word that anticipates it: `es` in a Nom or Acc Slot, and `da(r)-` with the
  Slot's preposition in a Preposition Slot. `sich freuen auf` has the Slot
  `auf` + Acc | Clause Dass with a Required correlate (*darauf*), and `sich
  freuen über` the same with an Optional one. Since the correlate takes its preposition
  from the Slot, a Clause with a correlate in a Preposition Slot shares it
  with exactly one Preposition. A correlate is a unit of its own, never a
  member: `es` stays a PRON and `darauf` an ADV.

Hebrew marks function and preposition, with no case: Subject, DirectObject
and Preposition. English marks position and preposition, with no case:
Subject, DirectObject, IndirectObject (`him` in `give him a book`) and
Preposition. Neither adds an Adverbial, a Predicative or a Clause until
reviewed examples establish one, and both share the Slot shape.

Each language × Family × Kind route chooses which complements it allows, as
[ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md) does for
Core Features. German VERB routes, Lexeme and Locution, allow all five kinds.
ADJ routes allow all but Predicative, and a measure (`drei Jahre alt`) is
decided per Reading. NOUN routes allow Preposition and Clause, a Clause both
beside a Preposition (`die Freude darauf, dass …`) and in a Slot of its own
(`der Versuch, etw zu tun`). A route that allows none, such as Foreign
([ADR 0045](./0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md)),
takes no frame.

The subject is a slot too. In German it is the Nom Slot, and it is not
rendered. A subject clause is an alternative in it: the Nom Slot of `freuen`
'please' is Nom | Clause Dass with an Optional correlate (`Es freut mich, dass
du kommst`). A verb with no subject has no Nom slot, and its experiencer is a
Dat or Acc slot: `mir graut vor` is Required Dat, Optional `vor` + Dat. An
expletive `es` is never a slot ([ADR 0022](./0022-describe-whole-verbal-surfaces-compositionally.md)).
Collocations and Idioms have frames on their Readings like Lexemes.
A Required slot is how an expression states the valency it demands:
`jemandem auf den Keks gehen` has a Required Dat slot, which is exactly what
the learner error *Du gehst mich auf den Keks* gets wrong.

**Where a frame comes from.**

The Knowledge call proposes the whole frame, statuses and alternatives
included, when it creates a Reading. Later sentences add slots it missed, and
mistakes go through Knowledge's Correct. Only that proposal and Correct group
complements as alternatives. A Contribute appends a Slot only when no stored
complement covers any of its complements, and never adds a complement to a
stored Slot: contributing `von` + Dat to `reden` adds nothing. Correct
replaces the frame. A Retract that names a complement removes it from its
Slot, and the Slot once it is empty.

Statuses taken only from attestations were rejected. An imperative, a passive
or an object dropped by context looks the same as an Optional slot, and the
first click on a word would show half its frame. Frames authored only by hand
were rejected as well, since a Reading created at intake would have no frame
until someone wrote one.

**An occurrence.**

The Attestation replaces `governedPrepositionEvidence` with
`valencyEvidence: { member: index | null, complement, realizedCase }[]`. The
member index says which member realizes the slot. `Pass auf dich auf` has two
members spelled `auf`, and only the index tells them apart. The evidence names
the complement the sentence realized, even when the frame lacks it. Its
complements are Case and Preposition only, a strict subset of the frame's
vocabulary: nothing produces or reads an Adverbial, Predicative or Clause
there.

A governed preposition stays an Attestation member, so clicking it still
routes to the governor. `normalizedSurface` projects only Fixed members:
`wartet`, not `wartet auf`; `pass auf`, not `pass auf auf`. The preposition
inside an Adverbial is not a member: in `legt das Buch auf den Tisch` and
`wohnt in Bonn`, the verb requires a direction or a place, not `auf` or `in`.
Neither is the `als` or `für` that marks a Predicative.

Intake's Sentence Analysis replaces `government` with the realized
`slots: { governor, marker: offset | null, filler: target id | null, complement, realizedCase }[]`.
It lists only preposition slots the sentence realizes, for every governor
Kind. Case slots (bare Nom, Acc, Dat or Gen noun phrases) come only from the
Knowledge call's frame, and so do Adverbial, Predicative and Clause
complements, which intake never realizes. The frame is already complete
without them, and Source Contexts already show the sentence. A free dative would Contribute a
wrong slot (`Ich backe dir einen Kuchen` → Dat on `backen`). Each bare noun
phrase would also cost one more import-time question. Decided in
[#605](https://github.com/clockblocker/texteater/issues/605).

A preposition slot keeps its case under passive (`um Geduld` stays `um` +
Acc), so intake converts no passives. Asking about bare Dat and Gen objects
stays an option ([#609](https://github.com/clockblocker/texteater/issues/609)).
If intake takes it up, it must convert a passive back to the active frame
through the Surface's `passive`
([ADR 0022](./0022-describe-whole-verbal-surfaces-compositionally.md)): in
`Sie wurde um Geduld gebeten`, the Nom `Sie` fills the Acc slot of `bitten`.

Some words realize a governed preposition and its filler at once: German
`darauf` and `dafür`, Hebrew `לו` and `עליו`. The filler wins. The word stays
its own unit, and the slot links it as `filler`, with the preposition's Lemma
as the complement. German pronominal adverbs stay ADV Lexemes
([ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md)).
How Hebrew `לו` itself is analysed belongs to areas 2 and 3 of
[#595](https://github.com/clockblocker/texteater/issues/595).

**Rendering.**

A Valency Block shows the learner the Lemma with its frame. Optional slots
are in parentheses. `jN` is an Acc person, `jM` a Dat person and `etw`
something. A separable verb's `>` and `<` mark its split and are rendered
from its `hasSepPrefix` Core Feature: `>passen` is the base the prefix
attaches to on its left and `auf<` is the separated prefix, so `auf<` +
`>passen` reads `aufpassen`. Only separable verbs carry them.

```text
>passen (auf `jN/etw`) auf<             aufpassen
>fangen (mit `etw`) an<                 anfangen
warten (auf `jN/etw`)                   warten
stolz (auf `jN/etw`)                    stolz
gehen `jM` auf den Keks                 jemandem auf den Keks gehen
stellen (`jM`) `etw` zur Verfügung      (jemandem) etwas zur Verfügung stellen
```

## Consequences

- This supersedes [ADR 0030](./0030-store-preposition-government-as-reading-knowledge.md),
  its `governedPrepositions` aspect and its rule that no valency comes from
  the sense alone, and the Attestation's `governedPrepositionEvidence` from
  [ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md).
  What stands of ADR 0030 is stated above. ADR 0029 still keeps government
  out of Lemma identity and pronominal adverbs as ADV Lexemes.
- ADR 0030 rejected a per-Reading call that guessed valency from the sense.
  That call ran in every sentence. The frame is proposed once, by the
  Knowledge call that creates the Reading, so a guess can be wrong and is
  fixed through Correct.
- The `governedBy` view of a preposition is projected from every Preposition
  complement of a frame, alternatives included: `von` lists `reden`.
- A verb's `normalizedSurface` no longer contains its governed preposition,
  so docs examples such as `Er [wartet] auf den Nachtbus` change.
- ADR 0022's expletive `es` is unchanged.
- Every governor Kind takes in its governed preposition as an Attestation
  member: VERB, ADJ, NOUN and Locutions. Clicking `auf` in `Er ist stolz auf
  seinen Sohn` opens `stolz`, and clicking `über` in `Er weiß Bescheid über
  die Pläne` opens the Collocation `Bescheid wissen`. ADJ and NOUN get the
  `GovernedPreposition` member role verbs already have in the legacy intake,
  where a Phraseme Target gets a governed-preposition member whose role does
  not count toward fixedness. `normalizedSurface` stays Fixed-only, so `stolz auf` projects
  `stolz`. Separated cases (`Auf ihn bin ich stolz`, `der auf seinen Sohn
  stolze Vater`) work the way separable verbs already do. This supersedes
  ADR 0029's rule that only verbs absorb a governed preposition, under which
  one relation behaved three ways. Taking it into no governor was rejected
  too: it is consistent, but a learner who clicks a verb's preposition would
  land on a preposition Note that only lists governors. Decided in
  [#603](https://github.com/clockblocker/texteater/issues/603).
- A governed preposition belongs to the smallest unit its government
  survives with in the same sense: `stolz auf` to ADJ `stolz`, `Angst vor`
  to NOUN `Angst`, but `Bescheid wissen über` to the Collocation, because
  `Bescheid` means 'being informed' only inside its Collocations and
  `Bescheid über` alone is the official notice.
  Duden and grammis list these complements under the adjective and the noun,
  UD HDT attaches the PP to `stolz` in 6 of 9 cases and to `Angst` in 31 of
  33 (all 5 `Angst haben … vor` included), and the government survives
  without the verb (`aus Angst vor Hunden`, `der auf seinen Sohn stolze
  Vater`). When the whole Collocation is present, the largest-unit rule
  resolves the click to it: `Sie hat Angst vor Hunden` and `Hast du Angst?`
  open `Angst haben`, while `aus Angst vor Hunden` opens `Angst`. The
  Collocation Note reaches the governor's frame and the verb through its
  Breakdown ([ADR 0041](./0041-record-in-dumling-only-what-routing-and-drill-down-consume.md)). The Collocation stores its own frame, not a projection
  of its members' frames, because slots like the Dat of `jemandem auf den
  Keks gehen` come from no member.
- A copula (`sein`, `werden`, `bleiben`, `scheinen`, `wirken`, `sich zeigen`)
  never forms a Collocation with a predicative adjective, so an adjective
  and its governed preposition resolve to the ADJ even beside a copula. A
  Collocation needs a verb the noun or adjective lexically selects: `Angst
  haben`, `Lust haben auf`, `Rücksicht nehmen auf`. `Angst haben` qualifies
  by restricted lexical choice (`Angst haben/bekommen`, not `*Angst
  besitzen`), though it fails grammis's Funktionsverbgefüge tests.
  `stolz auf jN sein` was
  rejected as a Collocation: it fails the restricted-choice test, it would
  make one Collocation per copula and adjective, and UD attaches `sein` as
  the adjective's `cop`.
- `governedCase` leaves German ADP Core. Identity does not change, since no
  two German ADPs differ by case alone. An authored, closed table per
  language, the ADP Case Table, lists each adposition with the positions it
  takes, before (Prep) or after (Post) its complement, and for each position
  its allowed cases, a preferred case where there is a norm, and whether it
  is two-way: `für` Prep {Acc}, `mit` Prep {Dat}, `auf` and `in` Prep
  {Acc, Dat} two-way, `trotz` Prep {Gen, Dat} preferring Gen, `wegen` Prep
  {Gen, Dat} preferring Gen and Post {Gen}, `entlang` Post {Acc, Dat}
  preferring Acc and Prep {Gen, Dat}. A position it doesn't list isn't
  allowed. A circumposition or other Locution ADP has one case set and no
  position, since its words are its Canonical Form. Neither the Lemma nor
  the Attestation records the position
  ([ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)):
  the sentence shows it, and the table states what German allows and what a
  Note can show. It replaces Dumgen's `governablePrepositions`, and every
  Preposition complement of a governor's frame, alternatives included, is
  validated against it: `warten` `auf` + Acc and `bestehen` `auf` + Dat
  pass, `für` + Dat fails. ADR 0041 moved the
  table and its check from Dumling to dumspec, since which cases a
  preposition takes is a fact about the language.
- A free ADP occurrence records the case it took as `realizedCase` in its
  `valencyEvidence`, from the judgement Grammatical Resolution already makes
  for the case. `[Wegen] dem Regen` records Dat against the preferred Gen. A
  Locution ADP records it the same way (`um des Friedens willen` Gen). An
  occurrence whose complement shows no case records none (`Köln versus
  Berlin`). dumspec accepts a realized case that one of the adposition's
  positions allows. It fails an adposition the table doesn't list, naming
  it, a case none of its positions allows, naming the word and the case, and
  a governor's Preposition complement whose preposition the table lacks. A
  governed preposition has no ADP Attestation; its case lives in the
  governor's frame. The ADP's Valency Block renders from the table
  (`` auf `etw` · Akk: wohin? · Dat: wo? ``), and each Source Context shows
  its realized case and marks a colloquial one (`Dat · umgangssprachlich`).
  A Core case set was rejected: it holds the same facts inside identity with
  no preferred case and no per-sentence case. So was a generated frame per
  ADP Reading: two-way would depend on the emoji judge splitting location
  from direction, and a one-case slot cannot hold both cases when the judge
  merges them. Decided in
  [#604](https://github.com/clockblocker/texteater/issues/604).

Amended by [ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md): Idiom and Collocation governors are Locutions, and a Collocation's predicate may be a noun or an adjective, which widens the Collocation test above.

Amended on 2026-10-01: the ADP Case Table was keyed by the Lemma's
`adpType` only where position changed the case, Post `entlang` took {Acc}
alone, an adposition the table didn't list took any oblique case, and a
Locution ADP recorded no case. Now every entry lists its positions, the
any-case fallback is gone, and a Locution ADP records its case. Decided on
[#652](https://github.com/clockblocker/texteater/issues/652) and
[#733](https://github.com/clockblocker/texteater/issues/733).

Also amended on 2026-10-01: a complement whose marker is free (`wohnen in`,
`bei`, `auf`) was not recorded, a Slot held exactly one complement, German
complements were Case and Preposition only with their case in `case`, and the
German subject was always Nom. Now a required complement is recorded whatever
marks it, a Slot holds alternatives, German adds Adverbial, Predicative and
Clause, the field is `governedCase`, and a subject clause shares the Nom
Slot. Rejected on the way: a Slot that is either one complement or a list of
alternatives, two shapes for one thing; naming the Adverbial's field
`meaning`, since meaning belongs to the Reading and its Emoji Description;
and clause forms recorded as a field on the Acc or Preposition complement,
which [#672](https://github.com/clockblocker/texteater/issues/672) replaced
with Clause alternatives. Decided on
[#673](https://github.com/clockblocker/texteater/issues/673) and #672, and
implemented on [#674](https://github.com/clockblocker/texteater/issues/674).

Also amended on 2026-10-01: every complement appeared at most once in a
frame, so `bedeuten` could not take a dass-clause as both its subject and its
object. Now only Case and Preposition complements do, and an Adverbial,
Predicative or Clause is unique within its Slot. Decided by the user on #674.

Also amended on 2026-10-01: dumspec's
`de/governed-preposition-joins-its-governor` keeps one example, *Auf ihn bin
ich stolz*, and this ADR holds the ones it dropped: `aus Angst vor Hunden`
gives `[Angst, vor]` NOUN, and `legt das Buch auf den Tisch` and `wohnt in
Bonn` keep the preposition inside their Adverbial free. The `im` of `wartet
im Keller` heads a free adjunct, so it is no member of `warten` either.
Decided on [#743](https://github.com/clockblocker/texteater/issues/743).

Amended on 2026-10-02: a routine formula
([ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md)) is a
governor too, through its head word, so the Lexeme INTJ joins VERB, ADJ, NOUN
and Locutions above. It takes in the preposition its head word governs, as
`Angst haben` takes in `vor`: `Vielen Dank für Ihre Hilfe` gives `[Vielen,
Dank, für]` INTJ `vielen Dank`, and `danke für die Hilfe` gives `[danke,
für]` INTJ `danke`, which governs what its Grundform `danken` does. A
locative or adjunct preposition stays free: the `in` of `willkommen in
Leipzig` is no member. An INTJ records no `valencyEvidence`, so the member
carries no evidence, and `normalizedSurface` stays Fixed-only. Decided by the
user on [#701](https://github.com/clockblocker/texteater/issues/701)
(grouping audit Q1).
