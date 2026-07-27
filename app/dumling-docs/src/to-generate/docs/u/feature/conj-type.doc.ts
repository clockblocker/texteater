import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal ConjType feature.",
	family: "feature",
	leaf: "ConjType",
	order: 18013,
	subject: "ConjType",
	title: "ConjType",
	body: `
\`ConjType\` marks a subtype of a conjunction [\`Lemma\`](/u/entity/lemma/).

It is a [UD-compliant](https://universaldependencies.org/u/feat/ConjType.html) feature. In Dumling's current public abstract enum, it has two values and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Comp\`: comparing conjunction
- \`Oper\`: mathematical operator used as a conjunction-like word

If \`lemma.inherentFeatures.conjType\` is absent or \`undefined\`, the lemma is treated as having no recorded conjunction subtype.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`conjType\` when a conjunction lemma needs a stable subtype beyond the coarse part-of-speech split between [\`CCONJ\`](/u/entity/lemma/lexeme/cconj/) and [\`SCONJ\`](/u/entity/lemma/lexeme/sconj/).

\`Comp\` is for conjunctions used in comparison-like patterns, while \`Oper\` is for lexicalized mathematical operators written as words rather than symbols.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The current abstract enum exposes only \`Comp\` and \`Oper\`, even though the broader UD documentation lists additional subtype inventories. Current concrete Dumling schemas expose \`ConjType\` only on German conjunction lemmas, and only the value \`Comp\` is currently encodable there.
`,
		},
	],
});

export default document;
