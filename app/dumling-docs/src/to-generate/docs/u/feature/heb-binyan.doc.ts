import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as nifalVerb } from "../../../attestations/he/selection/הדוח_נכתב_אתמול/הדוח_[נכתב]_אתמול.ts";
import { attestation as hitpaelVerb } from "../../../attestations/he/selection/הוא_התכתב_עם_המרצה/הוא_[התכתב]_עם_המרצה.ts";
import { attestation as paalVerb } from "../../../attestations/he/selection/הוא_כתב_מהר/הוא_[כתב]_מהר.ts";

const document = defineUniversalConceptPage({
	description:
		"Hebrew-specific reference for the HebBinyan feature used on verbs.",
	family: "feature",
	leaf: "HebBinyan",
	order: 18023.5,
	subject: "HebBinyan",
	title: "HebBinyan",
	body: `
\`HebBinyan\` marks the Hebrew verbal binyan of a [\`Lemma\`](/u/entity/lemma/).

It is a Hebrew-specific feature aligned with [UD Hebrew treebank practice](https://universaldependencies.org/treebanks/he_htb/index.html) and belongs in \`lemma.inherentFeatures\`.

## Values

- \`HIFIL\`: hif'il pattern
- \`HITPAEL\`: hitpa'el pattern
- \`HUFAL\`: huf'al pattern
- \`NIFAL\`: nif'al pattern
- \`PAAL\`: pa'al / qal pattern
- \`PIEL\`: pi'el pattern
- \`PUAL\`: pu'al pattern

If \`lemma.inherentFeatures.hebBinyan\` is absent or \`undefined\`, the lemma is treated as having no recorded binyan.
`,
	examples: [paalVerb, nifalVerb, hitpaelVerb],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`hebBinyan\` when the lemma is a Hebrew [\`VERB\`](/u/entity/lemma/lexeme/verb/) and its stem class is part of the lexical analysis.

In dumling, binyan is modeled as an inherent lemma-level fact rather than an inflectional surface feature. Different inflected surfaces of the same verb keep the same \`hebBinyan\` value.
`,
		},
		{
			heading: "Relation to voice and other features",
			body: `
\`HebBinyan\` does not replace inflectional features such as [\`Voice\`](/u/feature/voice/), [\`Tense\`](/u/feature/tense/), or [\`VerbForm\`](/u/feature/verb-form/).

Some binyanim often correlate with voice-like behavior, but the features remain distinct. For example, a \`NIFAL\` or \`HITPAEL\` lemma may still carry explicit surface-level \`voice\` values where the analysis needs them.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature enum includes all seven values above. Current concrete Dumling schemas expose \`hebBinyan\` on Hebrew [\`VERB\`](/u/entity/lemma/lexeme/verb/) lemmas.
`,
		},
	],
});

export default document;
