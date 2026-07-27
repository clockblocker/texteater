import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Deixis feature.",
	family: "feature",
	leaf: "Deixis",
	order: 18014.5,
	subject: "Deixis",
	title: "Deixis",
	body: `
\`Deixis\` marks the relative location encoded in demonstrative forms.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Deixis.html) feature with seven public values. It is most common on demonstrative pronouns, determiners, and adverbs, and in dumling it may belong either in \`lemma.inherentFeatures\` or \`surface.inflectionalFeatures\`, depending on whether the contrast is lexical or realized on a concrete surface.

## Values

- \`Abv\`: above the reference point
- \`Bel\`: below the reference point
- \`Even\`: at the same level as the reference point
- \`Med\`: medial, neither close nor far from the reference point
- \`Nvis\`: remote and not visible
- \`Prox\`: proximate, near the reference point
- \`Remt\`: remote or distal, far from the reference point

If \`deixis\` is absent or \`undefined\`, no deictic location contrast is recorded.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`deixis\` when the selected item itself encodes a distance, visibility, or elevation contrast relative to a reference point, as in "this / that / here / there" type systems.

\`Deixis\` is for spatially anchored demonstrative contrasts, not for definiteness, person, or case. Many languages use only \`Prox\` and \`Remt\`; some also distinguish \`Med\`, and some further distinguish visibility or elevation.
`,
		},
		{
			heading: "Placement",
			body: `
In dumling, place \`deixis\` where the contrast belongs:

- use \`lemma.inherentFeatures.deixis\` when the deictic contrast is a stable lexical fact of the [\`Lemma\`](/u/entity/lemma/)
- use \`surface.inflectionalFeatures.deixis\` when the contrast is realized on a concrete inflected surface
`,
		},
		{
			heading: "Reference Point",
			body: `
\`Deixis\` describes location relative to a reference point, often the speaker. When a language also distinguishes whose perspective anchors the contrast, pair it with [\`DeixisRef\`](/u/feature/deixis-ref/).

The elevation-sensitive values \`Abv\`, \`Even\`, and \`Bel\` are remote contrasts that additionally encode vertical position relative to that reference point. \`Nvis\` is used where the system distinguishes remote-but-not-visible referents from other remote ones.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature catalog includes \`deixis\`, but this repository currently ships no concrete language schema or built-in attestation that exposes it in use.
`,
		},
	],
});

export default document;
