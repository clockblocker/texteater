import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal DeixisRef feature.",
	family: "feature",
	leaf: "DeixisRef",
	order: 18015,
	subject: "DeixisRef",
	title: "DeixisRef",
	body: `
\`DeixisRef\` marks which speech-act participant serves as the reference point for a deictic contrast.

It is a [UD-compliant](https://universaldependencies.org/u/feat/DeixisRef.html) feature with two public values. It accompanies \`Deixis\` when a language needs to distinguish whether a demonstrative item is anchored to the speaker or to the hearer.

## Values

- \`1\`: deixis relative to the first-person participant, the speaker
- \`2\`: deixis relative to the second-person participant, the hearer

If \`deixisRef\` is absent or \`undefined\`, no participant-relative deictic reference point is recorded.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`deixisRef\` only together with \`deixis\`. \`DeixisRef\` does not by itself mean "this", "that", "here", or "there"; it only says whose location or perspective anchors the deictic contrast.

This feature is relevant only for languages whose demonstrative systems distinguish speaker-oriented and hearer-oriented reference points.
`,
		},
		{
			heading: "Placement",
			body: `
In dumling, place \`deixisRef\` wherever the paired \`deixis\` value belongs.

- use \`lemma.inherentFeatures.deixisRef\` when the speaker-versus-hearer contrast is a stable lexical fact of the [\`Lemma\`](/u/entity/lemma/)
- use \`surface.inflectionalFeatures.deixisRef\` when that contrast is realized on a concrete inflected form
`,
		},
		{
			heading: "Scope",
			body: `
UD uses \`DeixisRef\` for demonstrative pronouns, determiners, and adverbs when necessary. The abstract dumling enum mirrors UD and currently exposes only the two public values \`1\` and \`2\`.
`,
		},
	],
});

export default document;
