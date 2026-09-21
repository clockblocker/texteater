---
status: accepted
---

# Treat Funktionsverbgefüge as Collocations

A German support-verb predicate, the Funktionsverbgefüge, is a Collocation
Phraseme: `eine Entscheidung treffen`, `eine Frage stellen`, `zur Kenntnis
nehmen`, `zur Verfügung stellen`, `in Frage kommen`, `Abschied nehmen`. Its
fixed lexical members are the support verb and the predicate noun; the
noun's own article or fused preposition comes with the noun, and free
arguments, adverbs and modifiers stay outside. An ordinary full verb with a
free object (`eine Cola bringen`) is not a Collocation.

This reverses the issue 82 policy the click corpus encoded, under which
conventionality alone did not establish fixedness and every member of a
support-verb predicate was its own Lexeme. The Dumling classification docs
already placed support-verb expressions under Collocation; the criteria
named them; only the gold and the production route inventory disagreed.

## Consequences

- The click corpus gold for the support-verb sentences becomes
  `Phraseme/Collocation` over verb, noun and the noun's article or fused
  preposition; the adverb between them stays Lexeme.
- `Phraseme/Collocation` enters the production classification inventory and
  the intake Phraseme layer (Dumgen ADR 0006).
- A learner who opens the Collocation sees its member words, each with its
  own Surface; the noun's article is reached through the noun.

Ruled on
[Wayfinder: intake-owned Pieces and Units](https://github.com/clockblocker/texteater/issues/487),
2026-09-21.
