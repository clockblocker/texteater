---
status: accepted
---

# Separate linguistic entry identity from lemma form

The system will use explicit, opaque Linguistic Entry identities. Word-like
entries are Lexemes; Phrasemes, Morphemes, and Constructions remain peer
identity-bearing families. A Lexeme's Lemma Form is only its canonical citation
form, so matching language, Lemma Form, part of speech, inherent features, or
inflectional paradigm can retrieve candidates and prove differences but can
never prove identity.

## Identity policy

Each supported language must declare a versioned lexical boundary policy for
its experiment corpus and runtime catalog. That policy asserts which
contextual uses share a Lexeme and records the lexical authority or curated
decision behind the assertion. If existing identity cannot be established,
resolution proposes a new opaque identity rather than silently merging by a
morphogrammatical tuple. Learner-owned Meaning content never participates in
Linguistic Entry identity.

Global Surface identity continues to include the identity it realizes. The
identity-bearing component formerly called “Lemma identity” is therefore the
Linguistic Entry ID, not the Lemma Form text or a tuple derived from it.

## Required boundary cases

- Russian noun `коса` homonyms receive distinct Lexeme identities under the
  Russian boundary policy even when Lemma Form, gender, part of speech, and
  paradigm match.
- German `das Schloss` for a castle and for a lock remains one Lexeme under the
  German boundary policy. Lexicographic Senses may distinguish the uses, and a
  learner may keep one or several Meanings for them independently.
- German `die Bank → Banken` and `die Bank → Bänke` are distinct Lexemes. Their
  different paradigms are sufficient evidence that the identities differ, but
  the paradigms are not the identities.
- Identically spelled entries with different parts of speech are distinct
  Lexemes.
- One Lexeme may have multiple learner Meanings with the same Lemma Form.

## Node topology

```text
Selection -> Surface -> Linguistic Entry
                           |
                           +-- Citation Form
                           |     `-- Lemma Form (when the entry is a Lexeme)
                           |
                           +-- zero or more authority-scoped Senses
                           |
                           `-- zero or more learner-owned Meanings per learner
```

A Sense is optional and belongs to one named dictionary or lexical authority;
its identity is scoped to that authority and edition. It can subdivide
polysemy, but it neither splits nor merges Linguistic Entries. A Meaning belongs
to one learner and one Linguistic Entry, may group several Senses, may split one
Sense when useful, and is never used to decide homonymy.

## Consequences

German Lemma-resolution experiments must resolve or propose a Linguistic Entry
identity in addition to family, subkind, Lemma Form, and inherent features.
Candidate lookup may use the descriptive fields, but exact resolution is
against an Entry ID declared by the corpus boundary policy.

The current Dumling `Lemma` DTO and ID codec conflate citation text,
morphogrammatical description, and learner semantic content. Dumling and
Dumdict therefore require a later schema migration: introduce entry IDs,
replace identity-bearing `Lemma` references with Linguistic Entry references,
keep Meaning IDs learner-owned, and stop deriving stable entry identity from
emoji or other Meaning content. This ADR records the policy; it does not perform
that migration.
