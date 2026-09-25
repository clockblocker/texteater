---
status: accepted
---

# Store valency as E-VALBU frames on the Reading

A Reading records the governed complements of its word: what a learner must
memorize to use this word in this sense. Free adjuncts are not recorded, and
neither are patterns whose marker is free (`wohnen in`, `wohnen bei`,
`wohnen auf`). The Note's Source Contexts Block already shows how the word was
used. Recording free valency as well was rejected because it heads into full
syntactic analysis to produce a copy of Source Contexts.

**The Valency Frame.**

Each Reading owns one Valency Frame, modelled on E-VALBU, the IDS Mannheim
valency dictionary, where each Lesart has one Satzbauplan and optional
complements are parenthesised. A frame is an ordered list of Slots. Each Slot
has `status: "Required" | "Optional"` and a complement.

A frame never creates a Lemma or a Reading. Only the Emoji Description splits
Readings ([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)).
`warten` with and without `auf` is one Reading with an Optional `auf` slot.
`sich gewöhnen an` has a Required `an` slot. `bestehen auf` and `bestehen aus`
are two Readings because their senses differ, and each has its own frame.

Fixed parts are not slots. A separable prefix, a lexical reflexive and a
Phraseme's wording come from Lemma identity.

The frame skeleton is universal. Each language defines its complement
vocabulary. German follows E-VALBU and marks complements by case:

```ts
{ kind: "Case", case: "Nom" | "Acc" | "Dat" | "Gen", referent }
{ kind: "Preposition", preposition: /* ADP Lemma */, case: "Acc" | "Dat" | "Gen", referent }
// referent: "Someone" | "Something" | "Either"
```

Hebrew marks function and preposition, with no case: Subject, DirectObject
and Preposition. Each language × Family × Kind route chooses which complements
it allows, as [ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)
does for Core Features.

The subject is a slot too, so its case is recorded: `mir graut`, `mich
friert`. Collocations and Idioms have frames on their Readings like Lexemes.
A Required slot is how an expression states the valency it demands:
`jemandem auf den Keks gehen` has a Required Dat slot, which is exactly what
the learner error *Du gehst mich auf den Keks* gets wrong.

**Where a frame comes from.**

The Knowledge call proposes the whole frame, statuses included, when it
creates a Reading. Later sentences add slots it missed, and mistakes go
through Knowledge's Correct.

Statuses taken only from attestations were rejected. An imperative, a passive
or an object dropped by context looks the same as an Optional slot, and the
first click on a word would show half its frame. Frames authored only by hand
were rejected as well, since a Reading created at intake would have no frame
until someone wrote one.

**An occurrence.**

The Attestation replaces `governedPrepositionEvidence` with
`valencyEvidence: { member: index | null, complement, realizedCase }[]`. The
member index says which member realizes the slot. `Pass auf dich auf` has two
members spelled `auf`, and only the index tells them apart.

A governed preposition stays an Attestation member, so clicking it still
routes to the governor. `normalizedSurface` projects only Fixed members:
`wartet`, not `wartet auf`; `pass auf`, not `pass auf auf`.

Intake's Sentence Analysis replaces `government` with the realized
`slots: { governor, marker: offset | null, filler: target id | null, complement, realizedCase }[]`.
It lists only preposition slots the sentence realizes, for every governor
Kind. Case slots (bare Nom, Acc, Dat or Gen noun phrases) come only from the
Knowledge call's frame. The frame is already complete without them, and
Source Contexts already show the sentence. A free dative would Contribute a
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

- This supersedes the Attestation's `governedPrepositionEvidence` from ADR
  0029, and from [ADR 0030](./0030-store-preposition-government-as-reading-knowledge.md)
  the `governedPrepositions` aspect and its rule that no valency comes from
  the sense alone. The rest of both stands: government stays out of Lemma
  identity, lives on the Reading as Knowledge rather than as a Relation, and
  pronominal adverbs stay ADV Lexemes.
- ADR 0030 rejected a per-Reading call that guessed valency from the sense.
  That call ran in every sentence. The frame is proposed once, by the
  Knowledge call that creates the Reading, so a guess can be wrong and is
  fixed through Correct.
- The `governedBy` view of a preposition is projected from Preposition slots.
- A verb's `normalizedSurface` no longer contains its governed preposition,
  so docs examples such as `Er [wartet] auf den Nachtbus` change.
- ADR 0022's expletive `es` is unchanged.
- Every governor Kind takes in its governed preposition as an Attestation
  member: VERB, ADJ, NOUN and Phrasemes. Clicking `auf` in `Er ist stolz auf
  seinen Sohn` opens `stolz`, and clicking `über` in `Er weiß Bescheid über
  die Pläne` opens the Collocation `Bescheid wissen`. ADJ and NOUN get the
  `GovernedPreposition` member role verbs already have. A Phraseme Target
  gets a governed-preposition member whose role does not count toward
  fixedness. `normalizedSurface` stays Fixed-only, so `stolz auf` projects
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
  `lexicalBreakdown`. The Collocation stores its own frame, not a projection
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
  language in Dumling records each preposition's allowed cases, a preferred
  case where there is a norm, and whether it is two-way, keyed by `adpType`
  where that matters: `für` {Acc}, `mit` {Dat}, `auf` and `in` {Acc, Dat}
  two-way, `wegen` and `trotz` {Gen, Dat} preferring Gen, `entlang` Post
  {Acc} and Prep {Gen, Dat}. It replaces Dumgen's `governablePrepositions`,
  and a governor's Preposition slot is validated against it: `warten` `auf`
  + Acc and `bestehen` `auf` + Dat pass, `für` + Dat fails.
- A free ADP occurrence records the case it took as `realizedCase` in its
  `valencyEvidence`, from the judgement Grammatical Resolution already makes
  for the case. `[Wegen] dem Regen` records Dat against the preferred Gen. A
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
