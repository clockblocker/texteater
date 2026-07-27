import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as aufPreposition } from "../../../attestations/de/selection/Das_rote_Band_lag_auf_dem_Geschenk/Das_rote_Band_lag_[auf]_dem_Geschenk.ts";
import { attestation as entlangPostposition } from "../../../attestations/de/selection/Wir_liefen_den_Fluss_entlang/Wir_liefen_den_Fluss_[entlang].ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal AdpType feature.",
	family: "feature",
	leaf: "AdpType",
	order: 18011,
	subject: "AdpType",
	title: "AdpType",
	body: `
\`AdpType\` marks the subtype of an adposition [\`Lemma\`](/u/entity/lemma/).

It is a [UD-compliant](https://universaldependencies.org/u/feat/AdpType.html) feature and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Circ\`: circumposition
- \`Post\`: postposition
- \`Prep\`: preposition
- \`Voc\`: vocative adposition or vocative marker

If \`lemma.inherentFeatures.adpType\` is absent or \`undefined\`, the lemma is treated as having no recorded adpositional subtype.
`,
	examples: [aufPreposition, entlangPostposition],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`adpType\` on [\`ADP\`](/u/entity/lemma/lexeme/adp/) lemmas when the subtype is a stable lexical fact of the lemma itself.

Choose \`Prep\` when the adposition normally precedes its complement, \`Post\` when it follows it, and \`Circ\` for circumpositional analyses. Use \`Voc\` only when your UD analysis treats a vocative marker as adpositional.

Do not use \`adpType\` to encode a verb's governed preposition. That is a separate lemma-level fact modeled by [\`HasGovPrep\`](/u/feature/has-gov-prep/).
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature enum follows UD and includes all four values above. Current concrete Dumling schemas expose \`AdpType\` only on German [\`ADP\`](/u/entity/lemma/lexeme/adp/) lemmas, and only \`Circ\`, \`Post\`, and \`Prep\` are currently encodable there.
`,
		},
	],
});

export default document;
