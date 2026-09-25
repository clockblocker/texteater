---
status: accepted
---

# Attest articles and fused words Segment by Segment

A learner clicks a Segment, and the Segment's Attestation Membership leads to
its Attestation. Nothing sits between them: there is no click-result value
like the retired Selection. A fused word is one Segment per component
([Dumgen ADR 0004](../../battery/dumgen/docs/adr/0004-make-segment-the-one-clickable-dto-produced-at-intake.md)),
and every host stores Segments at that granularity. `im` is the Segments `i`
(standing for `in`) and `m` (standing for `dem`).

**Member orthography.** A member is `Standard`, `Typo`, `Fused` or
`Shorthand`.

- `Fused`: the letters are one piece of a written word that holds several
  words. Examples: `m` in `im`, `s` in `aufs`, `'s` in `geht's`, `'ll` in
  `I'll`, `n't` and `wo` in `won't`, the Hebrew prefixes.
- `Shorthand`: a standalone shortened spelling of one word. Examples: `'ne`,
  `'nen`, `'s ist spät`, and abbreviations such as `z.B.` and `e.g.`.
- A piece that is both shortened and attached is `Fused`.

**Reaching the Fusion.** A `Fused` member carries its Fusion value and the
index of the component it realizes. A component with no letters of its own,
such as the hidden article in Hebrew `בבית`, is listed on the Attestation that
owns it as the same pair, and it makes that Attestation's coverage Partial.
Every Fusion component belongs to exactly one Attestation. From any piece, the
learner can open the Fusion and see how the word breaks down.

**A noun owns its article.** The article is a member of the noun's
Attestation, so clicking it opens the noun, and its DET identity is derived
([ADR 0019](./0019-separate-grammatical-relations-from-semantic-relations.md),
[ADR 0032](./0032-choose-core-features-per-route-for-the-learner.md)). German
and English record it as the inflectional feature
`article: Definite | Indefinite | None`. Hebrew records it through its
existing `definite` feature. No stored value spells the article out.
`normalizedSurface` is the noun's own letters in every language. A host adds
the article when it displays the noun: tf-demo shows German `dem Wald` from the
Lemma's gender and the Surface's case, number and article. English displays no
article. Grundform ignores the article.

- `Ich bin im Wald`: ADP `in` with members `[i Fused]`, and Surface `Wald`
  (Dat, Sing, Definite) with members `[m Fused, Wald]`, Full.
- `Er wartet aufs Ende`: `auf` is the governed-preposition member of `warten`
  ([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)), and
  `s` is the article member of `Ende`. One Fusion supplies two Attestations.
- `Hast du 'ne Frage?`: Surface `Frage` (Acc, Sing, Indefinite) with members
  `['ne Shorthand, Frage]`.
- `the big house`: Surface `house` (Sing, Definite) with members
  `[the, house]`. `the` joins the noun across the adjective, as German `der`
  does.
- `ישבנו בבית`: ADP `ב` with members `[ב Fused]`, and Surface `בית` (Def) with
  members `[בית Fused]`, Partial, pointing at the hidden `ה` component. Without
  the article (*be-vayit*), the Fusion has no `ה` and the noun is Full. Intake
  decides which Fusion applies.

`articleEvidence` remains only for an article the noun does not own: the
shared `der` of `der Aufstieg und Abstieg`.

A proper noun owns its article only if it is canonically cited with one: `die
Schweiz`, `der Rhein`, `der Struwwelpeter`, English `the Netherlands`, Hebrew
`הירדן`. For them the article is the Core Feature `article: Definite`, part of
the Lemma's identity, and its members and display follow the common noun's
(`in [der Schweiz]`). A proper noun cited bare (`Berlin`, `Anna`) has no
`article` feature. An article it takes in a sentence (`das alte Berlin`, a
colloquial `der Peter`) stays its own DET.

**What segmentation splits off is a syntactic word.** Each piece resolves to
a Lexeme of its own Kind, never a Morpheme. Clitic is retired as a Morpheme
Kind in every language: the term describes how a word attaches, not a kind of
morph.

- English `'ll` is AUX `will`. `'s` is AUX `be` or `have`, or PRON `us` in
  `let's`. `n't` is PART `not`, the same Lemma as a written-out `not`.
- Possessive `'s` is its own PART Lemma, and possessive grammar is explained
  through its Reading. It attaches to a phrase, not a noun: in `the king of
  England's hat` the possessor is the king. Plural `boys'` is `boys` plus `'`
  standing for `'s`.
- Hebrew `ב`, `ל`, `כ`, `מ` are ADP, `ו` is CCONJ, and `ש` is SCONJ. `ה` is the
  article of the noun or adjective it prefixes (`הבית הגדול`), and SCONJ
  where it introduces a relative participle (`האיש הנמצא בבית`). A pronoun
  suffix splits like `'s`: `לי` is ADP `ל` plus a pronoun piece. The pronoun's
  Lemma is for the Hebrew owner to decide.

## Considered Options

- Keeping `im` outside the noun, with Partial coverage and `im` as
  `articleEvidence` (ADRs 0003 and 0004). Rejected: no Attestation contained
  `m`, so clicking it led nowhere, and `aufs Ende warten` could not give `auf`
  to the verb and `s` to the noun.
- Making `'ne Frage` a Variant Surface. Rejected: every shortened article
  would multiply the noun's Surfaces. The shortening is a fact about the
  written occurrence, so it belongs on the member.
- Keeping the Hebrew article as its own DET unit, as the HTB treebank does.
  Rejected: the hidden `ה` in `בבית` has no letters, so it could have no
  Attestation. It would be the one word in the sentence that belongs to
  nothing.
- Keeping the English article as its own unit. Rejected: the noun's `article`
  feature would count it a second time.
- Moving `article` from the Surface to the Attestation. Rejected: the article
  stays a Surface inflection in German and English.

## Consequences

- This supersedes the `im Wald` paragraphs of
  [ADR 0003](./0003-attestation-supersedes-selection-and-owns-realization-coverage.md)
  and [ADR 0004](./0004-align-german-high-level-targets-with-fixed-realized-attestation-members.md),
  and ADR 0004's rule that `normalizedSurface` prepends the recovered article.
  It amends [ADR 0027](./0027-retire-the-construction-family.md) with the
  `Shorthand` orthography and the Fusion reference on a `Fused` member.
- The German noun check that `normalizedSurface` starts with the article is
  removed. A missing article is `None`, not null.
- Dumgen's noun-article resolution treats a fused article as an owned member,
  and the English fusion table no longer calls possessive `'s` noun
  inflection.
- tf-demo stores Segments at piece granularity, which completes the migration
  that Dumgen ADR 0004 left to production. A stored Segment no longer has to
  wait for every piece of its word before joining a unit.
- Decided on [#595](https://github.com/clockblocker/texteater/issues/595),
  area 2.
