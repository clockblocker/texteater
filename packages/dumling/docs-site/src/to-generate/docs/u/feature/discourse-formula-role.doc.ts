import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as gutenTagGreeting } from "../../../attestations/de/selection/Guten_Tag_ich_habe_einen_Termin/[Guten_Tag]_ich_habe_einen_Termin.ts";
import { attestation as tutMirLeidApology } from "../../../attestations/de/selection/Tut_mir_leid_das_war_mein_Fehler/[Tut_mir_leid]_das_war_mein_Fehler.ts";
import { attestation as noWorriesAcknowledgment } from "../../../attestations/en/selection/No_worries_I_already_fixed_it/[No_worries]_I_already_fixed_it.ts";

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the DiscourseFormulaRole feature on discourse-formula lemmas.",
	family: "feature",
	leaf: "DiscourseFormulaRole",
	order: 18016,
	subject: "DiscourseFormulaRole",
	title: "DiscourseFormulaRole",
	body: `
\`DiscourseFormulaRole\` records the communicative role of a [\`DiscourseFormula\`](/u/entity/lemma/phraseme/discourse-formula/) [\`Lemma\`](/u/entity/lemma/).

It is a Dumling-specific feature with ten public values and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Greeting\`
- \`Farewell\`
- \`Apology\`
- \`Thanks\`
- \`Acknowledgment\`
- \`Refusal\`
- \`Request\`
- \`Reaction\`
- \`Initiation\`
- \`Transition\`

If \`lemma.inherentFeatures.discourseFormulaRole\` is absent or \`undefined\`, the discourse formula is treated as having no recorded role in the current payload.
`,
	examples: [
		gutenTagGreeting,
		tutMirLeidApology,
		noWorriesAcknowledgment,
	],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`discourseFormulaRole\` when a citation is best analyzed as a stored discourse formula rather than as a fully compositional phrase.

The value should capture the formula's pragmatic function in interaction, such as greeting, apologizing, or acknowledging, not the lexical category of any one word inside the expression.
`,
		},
		{
			heading: "Layer",
			body: `
\`DiscourseFormulaRole\` is a lemma-level fact about the formula as a whole.

Selections may cover the full formula, as in \`Guten Tag\`, or only part of it, as in a partial selection of \`see you later\`. In both cases the feature still belongs on the underlying phraseme lemma.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`discourseFormulaRole\` on [\`DiscourseFormula\`](/u/entity/lemma/phraseme/discourse-formula/) phraseme lemmas in the English and German packs.
`,
		},
	],
});

export default document;
