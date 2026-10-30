---
status: accepted
---

# Store a German Surface in base order and project its slots

In *Vielleicht hatte es damit zu tun, dass …* the learner clicks `hatte es
damit zu tun`. The Lemma is the Locution `mit zu tun haben`, cited `mit jM zu
tun haben`. The Surface between them is `mit zu tun hatte`. Attestation →
Surface is the syntax step: word order, leaving out whatever fills a slot,
and taking a fused word apart. Surface → Lemma is pure inflection.

**A German Surface is its base-order form.** Its `normalizedSurface` holds:

- the Lemma's fixed words in their inflected forms, in the Canonical Form's
  order;
- the verbal complex last, in subordinate-clause order;
- no slot filler and no slot token.

| Attested | Surface | Lemma |
| --- | --- | --- |
| `hatte es damit zu tun` | `mit zu tun hatte` | `mit zu tun haben` |
| `fängt … an` | `anfängt` | `anfangen` |
| `hat … gesprochen` | `gesprochen hat` | `sprechen` |
| `wird … reisen` | `reisen wird` | `reisen` |
| `wurde … verhaftet` | `verhaftet wurde` | `verhaften` |
| `brach das Eis` | `das Eis brach` | `das Eis brechen` |
| `regnet es` | `es regnet` | `regnen` |
| `wartet auf` | `wartet` | `warten` |
| `erinnert sich` | `erinnert` | `erinnern` |

A separable verb is joined where its Canonical Form joins it: `anfängt`,
`angefangen hat`. Word-order variants share one Surface. *Damit hatte es zu
tun* and *hatte es damit zu tun* are both `mit zu tun hatte`, and *es regnet*
and *regnet es* are both `es regnet`.

What fills a slot stays out. Free arguments are units of their own and never
members ([ADR 0003](./0003-attestation-supersedes-selection-and-owns-realization-coverage.md)).
A Lexeme's governed preposition and a lexical reflexive are members, but they
fill slots, so the Surface leaves them out
([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md),
[ADR 0052](./0052-record-a-lexical-reflexive-on-the-reading-never-in-the-canonical-form.md)).
A Locution's fixed preposition is one of its words and stays: the `mit` of
`mit zu tun hatte`.

`es` takes one of three places:

- The subject expletive (`es regnet`, `es gibt`;
  [ADR 0022](./0022-describe-whole-verbal-surfaces-compositionally.md)) is a
  member and leads, as in *dass es regnet*.
- An `es` among a Locution's fixed words keeps its place in the Canonical
  Form: `es eilig hat`.
- A referential `es` is a free unit, never a member (ADR 0003). The `es` of
  *hatte es damit zu tun* refers back, so the Surface holds no `es`.

**A pronominal adverb gives its fixed preposition.** A pronominal adverb
(`da(r)-`, `wo(r)-` or `hier-` with a preposition) that realizes a
Locution's fixed preposition stays one member, and the Surface takes the
preposition: `damit` gives `mit`. Its `da-` stands for the slot's filler,
which stays out like any filler. The Attestation's Preposition
`valencyEvidence` names the adverb as the slot's marker, so Dumling lets a
pronominal adverb spell its preposition.
[ADR 0029](./0029-keep-preposition-government-out-of-lemma-identity.md)
keeps pronominal adverbs single words, so `damit` never splits into `da`
and `mit`.

A free pronominal adverb is different. `darauf` in *wartet darauf* stands
for the governed `auf` slot and is no part of the Lemma's wording, so it is
an ADV unit of its own and the governor's Preposition evidence has `member:
null`. The dumcorpus Rule is `de/pronominal-adverb-stands-alone`.

**Where the verb is not last.**

- An imperative keeps its own order: `komm herein`, `lass die Kirche im
  Dorf`, `pass auf`.
- A modal or causative perfect with an Ersatzinfinitiv puts the finite
  auxiliary first, as a subordinate clause does: `hat müssen` (the modal's
  unit in *hat … schreiben müssen*; ADR 0022) and `hat reparieren lassen`.
- A Locution whose Canonical Form fixes another order keeps it: `da liegt
  der Hase im Pfeffer`. So does a Saying, written as a sentence
  ([ADR 0039](./0039-split-phrasemes-into-locutions-and-sayings.md)).

Variation (ADR 0039) is recorded in the wording, in base order. The passive
of `den Nagel auf den Kopf treffen` is `der Nagel auf den Kopf getroffen
wurde`. A Partial unit holds only its own members
([ADR 0041](./0041-judge-dumling-fields-by-the-learner-and-by-classification.md)):
the shared `hatte` of *ihren Sonnenschirm aufgespannt* stays with the other
verb, and the Surface is `aufgespannt`.

**Surface → Lemma is pure inflection.** Inflect the verbal complex back to
the infinitive, and the base-order form spells the Canonical Form: `mit zu
tun hatte` → `mit zu tun haben`, `gesprochen hat` → `sprechen`, `es regnet`
→ `regnen`. The auxiliaries and the subject expletive are grammar of the
Surface, never words of the Lemma. dumcorpus checks this on gold, except
where Variation changed the wording.

**The slotted line is a projection.** A learner sees the Surface with its
slots, `jD mit jM zu tun hatte`. That line is derived when it is shown, from
the Lemma and the Reading's Valency Frame, the way the Citation is derived,
and it is never stored. It shows the frame's whole shape: every slot, the
Optional ones in parentheses, as the Citation header does (`jD (auf jN)
wartet`). `jD`, the Nom slot, appears only on a finite, non-imperative
Surface whose frame has a Nom slot. An ADJ or NOUN Reading with a frame shows
its slots after its head: `stolz (auf jN)`, `Angst (vor jM)`. A noun without
a frame shows its form alone: `Kindern`.

The slots depend on the Reading, and one Surface serves several: `wartet`
belongs to every Reading of `warten`. Grammatical Resolution writes the
Surface on the click path, before Knowledge proposes any frame, and the click
path stays free of the frame. The line shows the frame rather than what the
sentence filled, because bare-case fillers aren't recorded
([#609](https://github.com/clockblocker/texteater/issues/609)), so a line
built from them would lose slots.

**Ids follow the form.** dumdict ids hash the whole Surface, so an id
changes with its form. The data is rewritten once, with no compatibility.

**German only.** Another language's Surface keeps its members' spelling in
sentence order, less its slot fillers. Nothing here fixes a word order for
Hebrew, and Hebrew decides its own.

## Considered Options

- The slotted line stored as the Surface (`jD mit jM zu tun hatte`).
  Rejected: the slots depend on the Reading, and storing them puts the frame
  on the click path.
- A slotted line showing only the slots the sentence filled. Rejected: bare
  Dat and Gen fillers aren't recorded, so the line would lose slots, and
  Surface → Lemma would stop being pure inflection.
- `damit` split into a piece `da` filling `jM` and a piece `mit`. Rejected:
  `da` would be a piece with no Lexeme to link, and ADR 0029 keeps
  pronominal adverbs single words.
- The attested words in sentence order, as before. Rejected: each word order
  made a Surface of its own, and Surface → Lemma needed syntax as well as
  inflection.

## Consequences

- dumcorpus rewrites every German VERB Attestation's Surface once, checks
  the base-order form against the Canonical Form, and rewords
  `de/pronominal-adverb-stands-alone`.
- The resolve-grammar eval still scores `normalizedSurface` exactly. Its
  oracle aligns a unit by membership, not by the order the words were
  written in.
- tf-demo prints the slotted line through the presenter that prints the
  Citation.
