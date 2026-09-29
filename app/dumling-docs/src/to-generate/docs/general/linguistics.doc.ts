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
- \`family\`: the broad class: \`Lexeme\`, \`Locution\`, \`Saying\`, or \`Morpheme\`
- \`kind\`: the concrete subtype, such as \`NOUN\`, \`VERB\`, \`Prefix\`, or \`Saying\`
- \`coreFeatures\`: the stable grammatical features that complete its identity

Together these fields are Lemma identity. Homonyms share one Lemma unless
they differ in one of these fields: a noun and a verb with the same spelling
are two Lemmas. A grammatical difference outside identity does not split a
Lemma: \`Mutter\` 'mother' (\`Mütter\`) and \`Mutter\` 'nut' (\`Muttern\`) are one
Lemma with two Readings, and each Reading's Knowledge records its plural.

A fused word such as German \`zum\`, \`zur\`, \`beim\`, or \`ins\`, English \`I'll\` or \`don't\`, or Hebrew \`בבית\` is not a Lemma. Each of its pieces is a syntactic word of its own Lexeme Kind, never a Morpheme: \`'ll\` is AUX \`will\`, \`n't\` is PART \`not\`, Hebrew \`ב\` is ADP. The Attestation member realized by such a piece carries the orthography \`Fused\`. Fixed identities with several realized members remain Lexemes, such as German \`rechnen … mit\` (VERB), \`entweder … oder\` (CCONJ), and \`um zu\` (SCONJ).

## Surface

A \`Surface\` is the normalized linguistic realization resolved from noisy text.

The Surface always contains a \`Lemma\`. It owns:

- \`normalizedSurface\`: the normalized form, such as \`gave up\`
- \`spelling\`: \`{ kind: "Canonical" }\`, or a \`Variant\` of the Lemma's
  spelling that is no mistake, with its \`variantTags\`: \`Licensed\` by a
  current standard (British \`armour\` for \`armor\`), \`Historical\` under an
  earlier one (German \`daß\`), \`Regional\` (\`nit\`) and \`Expressive\`,
  letters stretched for effect (\`ohhh\`). A Variant lists every tag that
  applies, in that order: Swiss \`Strasse\` is \`["Licensed", "Regional"]\`.
  Licensed and Historical never combine
- inflectional features and Lemma identity

Routes with represented inflection carry nullable \`inflectionalFeatures\`,
such as number, case, tense, person or verb form. \`checkIfGrundform\` assesses
whether a Surface realizes its Lemma's canonical grammar and spelling. It
returns an assessment error when the supplied evidence cannot establish that
distinction; there is no stored Surface-kind tag.

## Attestation

A \`Attestation\` is fleeting, click-independent occurrence evidence linked to
one Surface.

Its non-empty \`members\` tuple preserves source order. Each member pairs its
exact \`attested\` string with its orthography:

- \`Standard\`: an ordinary spelling
- \`Typo\`: a misspelling of the Surface
- \`Shorthand\`: a standalone shortened spelling of one word, such as \`'ne\` or \`z.B.\`
- \`Fused\`: one piece of a written word that holds several words, such as \`m\` in \`im\` or \`'ll\` in \`I'll\`

A \`Fused\` member also carries its \`fusion\` (the written word's \`spelling\`
and its ordered \`components\`, each a \`span\` of letters and the \`surface\` it
stands for) and the index of the \`component\` it realizes. From any piece, a
learner can open the Fusion and see how the word breaks down.

\`realizationCoverage\` is \`Full\` or \`Partial\`; for example, \`heulte mit\`
can partially realize \`mit den Wölfen heulen\`.

The Head of a phrase owns its article: the article is a member of the Head's
Attestation. The Head is usually the noun, or the word standing in for an
elided noun (\`[den, roten]\`, \`[the, rich]\`). A German or English noun
Surface is the noun's own letters and has no article feature, so \`books\` is
one Surface with or without \`the\`. Hebrew marks the article with
\`definite: Def\`. \`articleEvidence\` says where the article is attested: an
\`Owned\` member (Full coverage), a \`Shared\` article the Head does not own,
as in \`der Aufstieg und Abstieg\` (Partial), or a \`Hidden\` Fusion component
with no letters, such as the article in Hebrew \`בבית\` (Partial). A Head
without an article has \`articleEvidence: null\`. Whether the article agrees
with its Head (\`ein Häuser\` does not) is checked in \`dumspec\`, which also
derives the article's \`DET\` cell.

A proper noun cited with its article has the Core Feature
\`article: Definite\`: \`die Schweiz\`, \`der Rhein\`, \`the Netherlands\`,
Hebrew \`הירדן\`. Its members, article evidence and display follow the common
noun's (\`in [der Schweiz]\`). A proper noun cited bare (\`Berlin\`) has
\`article: null\` and owns the article it takes in a sentence
(\`[das, Berlin]\` in \`das alte Berlin\`).

The full chain is:

\`\`\`txt
Attestation -> Surface -> Lemma
\`\`\`

An Attestation can be discontinuous: the members \`gvae\` and \`up\` preserve
the same occurrence while the first member alone carries \`Typo\`. Sentence
IDs, click indices, and marked context belong to the calling application.

## Lemma Families and Kinds

\`family\` has four values:

| Family | Use |
| --- | --- |
| \`Lexeme\` | lexical identities with one Head, categorized by a Universal Dependencies-style POS tag; satellites such as a particle or reflexive may be part of the Canonical Form (\`sich erinnern\`, \`give up\`) |
| \`Locution\` | multiword Lemmas with two or more Heads (\`den Faden verlieren\`, \`zum Teil\`), categorized by the POS tag the whole acts as |
| \`Saying\` | complete sayings, proverbs and winged words, with the one Kind \`Saying\` |
| \`Morpheme\` | roots, prefixes, suffixes, and related sub-word units |

\`kind\` is the public subtype field for all four families. A Kind may repeat across Families (\`Lexeme/VERB\`, \`Locution/VERB\`), so a route is always language, Family and Kind. The package does not expose separate public discriminator names like \`pos\` or \`morphemeKind\`.

## Reading

A \`Reading\` is Dumling's foundational semantic value:

\`Reading = { unitKind: "Reading", lemma, emojiDescription }\`

The same Lemma may participate in several Readings. Dumling owns the Reading
value and validation. A
dictionary establishes the learner or hosted scope and owns Reading records,
candidate lookup, selection, persistence, and workflows.

## Features

Features are split by where they belong:

- \`coreFeatures\` describe the Lemma itself
- \`inflectionalFeatures\` describe a concrete inflected surface
- each Attestation member owns its \`orthography\`
- \`realizationCoverage\` describes the Attestation
- \`spelling\` describes the Surface
- \`surfaceFeatures\` describe marked properties of the resolved surface itself, such as \`historicalStatus: "Archaic"\`

Each language narrows the abstract feature inventory, and each language, family and kind decides which features are core. For example, German nouns support grammatical gender as a core feature and case/number as inflectional features, while the German pillar pronouns and articles make case, number and gender core, one Lemma per paradigm cell, and German stem-and-ending words such as \`dieser\` keep them on the Surface. English nouns support number inflection but not grammatical case in the same way. Hebrew supports language-specific features such as \`hebBinyan\` for verbs.
`,
});

export default document;
