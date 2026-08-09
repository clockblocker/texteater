import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "Domain terms used by dumling.",
	order: 10,
	title: "Linguistics",
	body: `
\`dumling\` models learner-facing linguistic annotation. The package does not try to be a full grammar engine. It gives applications stable objects for the parts of annotation that commonly need to be validated, serialized, searched, and shown back to learners.

## Lemma

A \`Lemma\` is the normalized grammatical identity behind observed forms.

For a word like \`Seen\`, the German Lemma has canonical form \`See\`. For an English form like \`ran\`, the Lemma has canonical form \`run\`.

The Lemma owns properties that remain stable across forms and attestations:

- \`language\`: the concrete language, such as \`de\`, \`en\`, or \`he\`
- \`canonicalForm\`: the normalized form used to name the Lemma
- \`family\`: the broad class: \`Lexeme\`, \`Morpheme\`, \`Phraseme\`, or \`Construction\`
- \`kind\`: the concrete subtype, such as \`NOUN\`, \`VERB\`, \`Prefix\`, or \`Idiom\`
- \`coreFeatures\`: the stable grammatical features that complete its identity

Together these fields are Lemma identity. Grammatically indistinguishable
homonyms share one Lemma. Homographs with different grammatical analyses—for
example a noun and verb with the same spelling—are different Lemmas.

\`Construction\` is the public branch for learner-relevant patterned Lemmas such as fused forms like German \`zum\`, \`zur\`, \`beim\`, or \`ins\`, and paired frames such as \`um zu\` or \`entweder oder\`.

## Surface

A \`Surface\` is the normalized linguistic realization resolved from noisy text.

The Surface always contains a \`Lemma\`. It owns:

- \`normalizedSurface\`: the normalized form, such as \`gave up\`
- \`spelling\`: \`Canonical\` or a licensed \`Variant\`, such as \`armor\` / \`armour\`
- inflectional features and Lemma identity

There are two surface kinds:

- \`Citation\`: the Surface realizes the Lemma's canonical form
- \`Inflection\`: the surface is an inflected form of the Lemma

Inflection surfaces carry \`inflectionalFeatures\`, such as number, case, tense, person, gender, degree, definiteness, or verb form, depending on the language and Lemma kind.

## Attestation

A \`Attestation\` is fleeting, click-independent occurrence evidence linked to
one Surface.

Its non-empty \`members\` tuple preserves source order. Each member pairs its
exact \`attested\` string with \`Standard\` or \`Typo\` orthography evidence.
\`realizationCoverage\` is \`Full\` or \`Partial\`; for example, \`heulte mit\`
can partially realize \`mit den Wölfen heulen\`.

The full chain is:

\`\`\`txt
Attestation -> Surface -> Lemma
\`\`\`

An Attestation can be discontinuous: the members \`gvae\` and \`up\` preserve
the same occurrence while the first member alone carries \`Typo\`. Sentence
IDs, click indices, and marked context belong to the calling application.

## Lemma Families and Kinds

\`family\` has four values:

| Kind | Use |
| --- | --- |
| \`Lexeme\` | words and word-like Lemmas, categorized with Universal Dependencies-style POS tags |
| \`Morpheme\` | roots, prefixes, suffixes, clitics, and related sub-word units |
| \`Phraseme\` | multi-word or formulaic expressions such as idioms and proverbs |
| \`Construction\` | learner-relevant patterned Lemmas such as fused forms like \`zum\` and paired frames like \`um zu\` |

\`kind\` is the public subtype field for all four families. The package does not expose separate public discriminator names like \`pos\`, \`morphemeKind\`, or \`phrasemeKind\`.

## Reading Boundary

Dumling stops at Lemma. A learner's semantic identity is a \`Reading\` outside
this package:

\`Reading = { lemma, emojiDescription }\`

The same Lemma may participate in several Readings. A classifier reuses a
learner's existing Reading when it is close enough or proposes a new one; a
learner-owned Reading remains an application value rather than a Dumling DTO.

## Features

Features are split by where they belong:

- \`coreFeatures\` describe the Lemma itself
- \`inflectionalFeatures\` describe a concrete inflected surface
- each Attestation member owns its \`orthography\`
- \`realizationCoverage\` describes the Attestation
- \`spelling\` describes the Surface
- \`surfaceFeatures\` describe marked properties of the resolved surface itself, such as \`historicalStatus: "Archaic"\`

Each language narrows the abstract feature inventory. For example, German nouns support grammatical gender as a core feature and case/number as inflectional features. English nouns support number inflection but not grammatical case in the same way. Hebrew supports language-specific features such as \`hebBinyan\` for verbs.
`,
});

export default document;
