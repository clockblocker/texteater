---
status: accepted
---

# Classify multi-member Lexemes by whole-unit POS

A Lexeme may have a fixed realization with more than one member. This is the
same identity policy already used for German verbs such as `rechnen … mit`:
fixed realized members belong to one Lexeme and one ordered Attestation even
when they are discontinuous or have different standalone analyses.

`Construction/PairedFrame` is removed. Its former units become Lexemes under
one whole-unit POS rather than mixed-POS entities: `entweder … oder`,
`weder … noch`, `sowohl … als`, `sowohl … als auch`, `sowohl … wie`,
`sowohl … wie auch`, `je … desto`, `je … umso`, and `je … je` are `CCONJ`;
`um zu`, `ohne zu`, `anstatt zu`, `statt zu`, and `so … dass` are `SCONJ`;
`einerseits … andererseits` and `teils … teils` are `ADV`. TIGER guides
borderline German classification. A multi-member Lexeme always has exactly one
Kind for the whole unit; member-local parts of speech do not create a mixed
Lemma.

Canonical Form names the lexical identity in its conventional dictionary form.
An ellipsis is allowed when it conventionally exposes an open slot, but is not
required: `entweder … oder` and `um zu` are both valid Canonical Forms.
Attestation members and `normalizedSurface` continue to follow ADR 0004's
ordered fixed-member projection.

This changes Lemma identity, and therefore dependent Surface and Reading
identity, for former PairedFrame values. It does not decide which POS kinds may
participate in Morphological Tree or Lexical Breakdown Knowledge; Dumrel owns
that separate policy.
