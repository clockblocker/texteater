---
status: accepted
---

# Claim seven direct Semantic Relations, only from a dictionary listing

Reading Knowledge stores seven direct Semantic Relations. A Reading claims
one only where a dictionary lists it for this sense and it holds for the
whole Reading. Generation, gold and review all draw the same lines between
neighbouring relations, and a dictionary listing is evidence that models and
reviewers can check. Their own sense of relatedness drifts.

- **Synonym**: means the same as the Reading in this meaning and can replace
  it. A register or regional difference neither demotes nor blocks a
  Synonym (`Mama`: `Mutter`, `Semmel`: `Brötchen`). A dictionary's gloss is
  no synonym listing.
- **Near Synonym**: means nearly the same, with a real difference of
  meaning, scope or perspective (`Pfote`: `Tatze`, which only larger
  predators have).
- **Antonym**: the direct opposite, as a dictionary lists it, never one
  read off a definition's negation.
- **Near Antonym**: a conventional contrast short of a direct opposite,
  never just another member of the same set.
- **Hypernym**: a broader category that the dictionary lists as the
  Reading's Oberbegriff, stored on the narrower Reading. A definition's
  genus does not count, and neither does a catch-all such as `Person` or
  `Gegenstand`.
- **Holonym**: a whole the Reading is a part, member or substance of,
  stored on the part (`Pfote`: `Tier`). A broader category is a Hypernym,
  not a Holonym.
- **Endonym**: the local name of the place a PROPN Reading names, stored
  on the name from outside (`Pressburg`: `Bratislava`). Only a PROPN
  Reading stores one, and each target is a PROPN Lemma.

Hyponym, Meronym and Exonym are never stored. They are projected from
Hypernym, Holonym and Endonym ([ADR 0012]). Synonym is symmetric and
transitive, and the other non-near claims carry across a Synonym. Antonym is
symmetric but not transitive. Near Synonym and Near Antonym are symmetric,
but neither is transitive or carried across a Synonym.

Register and region stay out of the relation because Synonym closure needs
exact synonyms, and dictionaries tag register and region inconsistently. A
learner therefore gets no near-synonym warning about either
([#884](https://github.com/clockblocker/texteater/issues/884), ruling G1).

The German evidence, which is Duden, DWDS or OpenThesaurus with at most
three claims per relation, is the dumcorpus Rule
`de/relations-need-a-dictionary`, together with its boundary records. Which
relations a route requests is the Knowledge Policy ([Dumrel ADR 0001]). The
relation space is [ADR 0020], and target modes are [ADR 0011].

Amended on 2026-10-07: a regional difference, like a register one, neither
demotes nor blocks a Synonym, stated above. Before, `Semmel`: `Brötchen` and
`Föhre`: `Kiefer` were Near Synonyms because one word of each pair is
regional. Two agent judges extended ruling G1 of
[#884](https://github.com/clockblocker/texteater/issues/884) from register
to region under the user's delegation.

[ADR 0011]: ../../../../docs/adr/0011-use-reading-owned-lemma-targeted-semantic-relations.md
[ADR 0012]: ../../../../docs/adr/0012-store-only-direct-semantic-relation-claims.md
[ADR 0020]: ../../../../docs/adr/0020-keep-semantic-relations-inside-one-family.md
[Dumrel ADR 0001]: ./0001-keep-dumrel-ownerless-and-pure.md
