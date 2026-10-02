---
status: accepted
---

# Lemma is grammatical identity and Reading is semantic identity

A Lemma's language, Family, Kind, Core Features and Canonical Form form its
grammatical identity, the Canonical Form compared without letter case. A
Reading adds one Emoji Description to a Lemma and forms semantic identity
within a dictionary scope. This keeps inflection on Surfaces and prevents
semantic distinctions from splitting grammatical identity.

**Identity ignores letter case.** In German and English, case mostly shows a
word's position or a convention (a sentence start, a headline, emphasis, an
acronym), not which word it is. Where case does tell two words apart, Kind or
Core Features already do: the NOUN `Morgen` and the ADV `morgen`, the NOUN
`Sprechen` and the VERB `sprechen`, and `Sie` and `sie`, split by Core. So
`LOL` and `lol` are one INTJ Lemma, and neither is a Variant or a Typo of the
other. Dumling folds case by each language's rules and owns the Lemma and
Reading identity keys built on that fold.

**The Canonical Form keeps a display casing**, the one a dictionary shows:
`Haus`, `LOL`, `Sie`. It never takes the word's position in the sentence.
Sentence-initial `Wegen`, `Alle` and `Wer` are the Lemmas `wegen`, `alle` and
`wer`, and their members are normalized the same way. Nouns and proper nouns
keep their capital. A casing error in the source (`Unter` mid-sentence,
`katze`) stays a Typo member and never reaches the Canonical Form; a spelling
whose casing is free, such as `lol` for `LOL`, is Standard. Lexical casing was
added on 2026-09-27 (#638).

Amended on 2026-10-01: the Canonical Form took part in identity with its exact
casing, so `LOL` and `lol` were two Lemmas. Decided on
[#729](https://github.com/clockblocker/texteater/issues/729).

**Dumling owns the Reading value.** Dumling owns the Reading DTO, its schema,
equality and stable identity operation. Dictionaries establish the scope for
that equality and own Reading records, Knowledge, persistence and workflows.
Keeping the value with its identity operation avoids duplicated identity
algorithms without making Dumling a dictionary.

**Knowledge belongs to one exact Reading, never to a Lemma.** Transcription is
one optional normalized string in Reading Knowledge. One owner avoids
ambiguous Knowledge ownership. There is deliberately no Lemma-Knowledge
compatibility path.

These three decisions were recorded apart as ADRs 0002, 0008 and 0010 and
merged here on 2026-09-28.

Amended by [ADR 0045](./0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md): a Foreign Lemma has exactly one Reading, which the Lemma alone identifies, with no Emoji Description. Its Translation carries every sense.

Amended by [ADR 0046](./0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md): a Syncretism's identity is a Lemma's identity plus its `syncretic` list, the Core Features its units disagree on. The units it holds are not part of it. No other Lemma has the list, so every other identity is unchanged.
