import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

export default defineGeneratedDocPage({
	title: "Model",
	order: 20,
	description: "Dumling units and grammatical evidence.",
	body: `
Dumling has four tagged units. A Lemma identifies grammar, a Reading pairs a
Lemma with an Emoji Description, a Surface describes a realization, and an
Attestation records occurrence evidence.

## Lemma

<!-- DOC_BLOCK:core-lemma -->

A Lemma has \`unitKind: "Lemma"\`, \`language\`, \`family\`, \`kind\`, \`canonicalForm\`,
and \`coreFeatures\`. These fields distinguish grammatical identities.
Grammatically indistinguishable homonyms share one Lemma. Their Readings may
have different Emoji Descriptions.

## Surface

<!-- DOC_BLOCK:core-surface -->

A Surface has \`unitKind: "Surface"\`, its Lemma, \`language\`, \`normalizedSurface\`,
\`spelling\`, and \`surfaceFeatures\`. Routes that represent inflection also have
nullable \`inflectionalFeatures\`. A marked feature bag contains at least one
non-null value; null means no marked features were supplied.

\`checkIfGrundform(surface)\` assesses canonical realization from spelling and
grammar. It returns a boolean on success or an assessment error when evidence
is missing, ambiguous, or unrepresentable. Matching spelling alone does not
establish Grundform. For example, English past-tense *read* has the same spelling
as its infinitive.

German PRON case, number and gender belong to Lemma identity. Contextual
reflexiveness belongs to the Surface's inflectional features.

## Reading

A Reading has \`unitKind: "Reading"\`, a \`lemma\`, and an \`emojiDescription\` of
one to four emoji graphemes. Dictionary scope, persistence and identity keys
belong to consumers.

## Attestation

<!-- DOC_BLOCK:core-attestation -->

An Attestation has \`unitKind: "Attestation"\`, a Surface, a non-empty ordered
\`members\` tuple, and \`realizationCoverage: "Full" | "Partial"\`. Each member
records exact \`attested\` text and \`orthography: "Standard" | "Typo"\`.
Sentences and clicks belong to the consuming application.

## Validation and routing

\`parseUnit(input)\` normalizes a complete unit and returns either
\`{ success: true, chain }\` or \`{ success: false, error }\`. The chain contains
\`unitKind\`, \`language\`, \`family\`, \`kind\`, and the validated \`value\`.
Supplying a complete expected route narrows the result and rejects mismatches.

[The API page](/general/api/) shows runtime validation and schema composition.
Docs occurrence slugs identify their sentence wrappers; changing the linked
Attestation does not change the occurrence route.
`,
});
