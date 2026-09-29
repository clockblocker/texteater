---
status: accepted
---

# Lemma is grammatical identity and Reading is semantic identity

A Lemma's language, Canonical Form, Family, Kind, and Core Features form its
grammatical identity. A Reading adds one Emoji Description to a Lemma and forms
semantic identity within a dictionary scope. This keeps inflection on Surfaces
and prevents semantic distinctions from splitting grammatical identity.

A Canonical Form takes the word's lexical casing, never its position in the
sentence. Sentence-initial `Wegen`, `Alle` and `Wer` are the Lemmas `wegen`,
`alle` and `wer`, and their members are normalized the same way. Nouns and
proper nouns keep their capital. A casing error in the source (`Unter`
mid-sentence, `katze`) stays a Typo member and never reaches the Canonical
Form. This was added on 2026-09-27 (#638).

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
