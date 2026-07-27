import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as einExistentialVerb } from "../../../attestations/he/selection/אין_מקום_פנוי/[אין]_מקום_פנוי.ts";
import { attestation as yeshExistentialVerb } from "../../../attestations/he/selection/יש_קפה_במטבח/[יש]_קפה_במטבח.ts";

const document = defineUniversalConceptPage({
	description:
		"Hebrew-specific reference for the HebExistential feature used on verbs.",
	family: "feature",
	leaf: "HebExistential",
	order: 18023.6,
	subject: "HebExistential",
	title: "HebExistential",
	body: `
\`HebExistential\` marks that a Hebrew [\`Lemma\`](/u/entity/lemma/) is an existential verb.

It is a Hebrew-specific feature aligned with [UD Hebrew guidance](https://universaldependencies.org/he/index.html) and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Yes\`: the lemma is marked as existential

If \`lemma.inherentFeatures.hebExistential\` is absent or \`undefined\`, the lemma is treated as not being marked existential.
`,
	examples: [yeshExistentialVerb, einExistentialVerb],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`hebExistential: "Yes"\` when the lemma is a Hebrew [\`VERB\`](/u/entity/lemma/lexeme/verb/) whose lexical analysis is existential, such as \`יש\` or \`אין\`.

In dumling, this is an inherent lemma-level fact. Different inflected or cited uses of the same existential verb keep the same \`hebExistential\` value.
`,
		},
		{
			heading: "Relation to polarity",
			body: `
\`HebExistential\` does not replace [\`Polarity\`](/u/feature/polarity/).

For example, \`אין\` is modeled as a negative existential verb because that negativity is lexical to the lemma itself, not an inflectional polarity marking added on top of some separate non-existential base verb.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature schema currently exposes one public value, \`"Yes"\`. Current concrete Dumling schemas expose \`hebExistential\` on Hebrew [\`VERB\`](/u/entity/lemma/lexeme/verb/) lemmas.
`,
		},
	],
});

export default document;
