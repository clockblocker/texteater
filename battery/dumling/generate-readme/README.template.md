# `dumling`

Build linguistic data as ordinary TypeScript values, with the exact grammar of
each language preserved in the type.

Take this sentence:

> Er saß **schweigend** am Fenster.

Here is the complete breakdown of `schweigend`.

## Lemma

The Lemma is its grammatical identity. In this sentence, `schweigend` is an
adjective in its positive form, not an inflected use of the verb `schweigen`.

<!-- README_BLOCK:lemma -->

## Surface

The Surface records the normalized form and the grammatical evidence for this
realization of the Lemma.

<!-- README_BLOCK:surface -->

`Surface<"de", "Lexeme", "ADJ">` knows the feature vocabulary for a German
adjective. `satisfies` catches an impossible Family, Kind, or feature value
without widening the object you authored.

## Reading

A Reading gives the Lemma a dictionary-scoped semantic identity. Here the
Emoji Description distinguishes the "silent" reading.

<!-- README_BLOCK:reading -->

## Attestation

The Attestation records what was actually present in the sentence. It points
to the Surface, preserves the attested text, and says that this occurrence
fully realizes the Surface.

<!-- README_BLOCK:attestation -->

The four units are plain structural values. Lemma sits inside Surface, and
Surface sits inside Attestation. Reading branches from Lemma because semantic
identity is separate from occurrence evidence.

## Grundform is derived

A Surface does not store a Citation/Inflection discriminator. Ask whether its
spelling and grammatical evidence realize the Lemma's Grundform:

<!-- README_BLOCK:grundform -->

Known contrary evidence returns `false`. Missing or ambiguous evidence returns
a typed `GrundformAssessmentError`, rather than guessing.

## Validate unknown input

At an input boundary, `parseUnit` validates and normalizes the whole nested
value. Expected coordinates reject the wrong route and preserve the exact
successful type:

<!-- README_BLOCK:parse -->

Ordinary invalid input is returned as a `ParsingError`; parsing does not throw.

## Compose exact schemas

Codec authors can import one concrete Zod schema without loading every
grammatical route:

<!-- README_BLOCK:schema -->

Each concrete path exports `lemmaSchema`, `surfaceSchema`, `readingSchema`, and
`attestationSchema`. Application code can stay on the small `dumling` and
`dumling/types` entrypoints, which do not load Zod.

## Install

```sh
npm install dumling
```

`dumling` supports German (`de`), English (`en`), and Hebrew (`he`) on Node.js
24 as ESM.
