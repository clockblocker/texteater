import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "Domain terms used by dumling.",
	order: 10,
	title: "Linguistics",
	body: `
\`dumling\` models learner-facing linguistic annotation. The package does not try to be a full grammar engine. It gives applications stable objects for the parts of annotation that commonly need to be validated, serialized, searched, and shown back to learners.

## Lemma

A \`Lemma\` is the dictionary entry, or lemma-like entry, behind an observed form.

For a word like \`Seen\`, the German lemma might be \`See\`. For an English form like \`ran\`, the lemma might be \`run\`.

The lemma owns properties that belong to the lemma entry itself:

- \`language\`: the concrete language, such as \`de\`, \`en\`, or \`he\`
- \`canonicalLemma\`: the canonical lemma spelling
- \`lemmaKind\`: the broad class: \`Lexeme\`, \`Morpheme\`, \`Phraseme\`, or \`Construction\`
- \`lemmaSubKind\`: the concrete subtype, such as \`NOUN\`, \`VERB\`, \`Prefix\`, or \`Idiom\`
- \`inherentFeatures\`: features that belong to the lemma as a lexical item
- \`meaningInEmojis\`: a compact meaning hint for learner-facing UI

\`Construction\` is the public branch for learner-relevant patterned entries such as fused forms like German \`zum\`, \`zur\`, \`beim\`, or \`ins\`, and paired frames such as \`um zu\` or \`entweder oder\`.

## Surface

A \`Surface\` is the normalized full form in context.

The surface always contains a \`Lemma\`. This keeps a normalized word form connected to the lemma entry it realizes.

There are two surface kinds:

- \`Citation\`: the surface is the citation form itself
- \`Inflection\`: the surface is an inflected form of the lemma

Inflection surfaces carry \`inflectionalFeatures\`, such as number, case, tense, person, gender, degree, definiteness, or verb form, depending on the language and lemma subtype.

## Selection

A \`Selection\` is the exact string the learner highlighted.

The selection always contains a \`Surface\`, and that surface always contains a \`Lemma\`. This gives the full chain:

\`\`\`txt
Selection -> Surface -> Lemma
\`\`\`

Marked selection mismatches live in the optional \`selectionFeatures\` bag:

| Field | Marked value | Meaning |
| --- | --- | --- |
| \`orthography\` | \`Typo\` | the observed selection is misspelled |
| \`coverage\` | \`Partial\` | the learner highlighted only part of the resolved surface |
| \`spelling\` | \`Variant\` | the observed spelling is licensed but non-canonical |

Absence means the unmarked default: standard orthography, full coverage, and canonical spelling.

These axes remain independent. A typo can still be partial, and a partial selection can still point to a full normalized surface.

## Lemma Kinds

\`lemmaKind\` has four values:

| Kind | Use |
| --- | --- |
| \`Lexeme\` | words and word-like lexical entries, categorized with Universal Dependencies-style POS tags |
| \`Morpheme\` | roots, prefixes, suffixes, clitics, and related sub-word units |
| \`Phraseme\` | multi-word or formulaic expressions such as idioms and proverbs |
| \`Construction\` | learner-relevant patterned entries such as fused forms like \`zum\` and paired frames like \`um zu\` |

\`lemmaSubKind\` is the public subtype field for all four families. The package does not expose separate public discriminator names like \`pos\`, \`morphemeKind\`, or \`phrasemeKind\`.

## Features

Features are split by where they belong:

- \`inherentFeatures\` describe the lemma itself
- \`inflectionalFeatures\` describe a concrete inflected surface
- \`selectionFeatures\` describe how the attested highlight differs from the resolved surface
- \`surfaceFeatures\` describe marked properties of the resolved surface itself, such as \`historicalStatus: "Archaic"\`

Each language narrows the abstract feature inventory. For example, German nouns support grammatical gender as an inherent feature and case/number as inflectional features. English nouns support number inflection but not grammatical case in the same way. Hebrew supports language-specific features such as \`hebBinyan\` for verbs.
`,
});

export default document;
