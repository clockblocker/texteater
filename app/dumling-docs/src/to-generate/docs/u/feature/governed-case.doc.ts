import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as zuPreposition } from "../../../attestations/de/selection/Und_Minz_und_Maunz_die_schreiengar_jämmerlich_zu_zweien/Und_Minz_und_Maunz_die_schreiengar_jämmerlich_[zu]_zweien.ts";
import { attestation as wegenPreposition } from "../../../attestations/de/selection/Wegen_dem_Regen_kamen_wir_zu_spät/[Wegen]_dem_Regen_kamen_wir_zu_spät.ts";
import { attestation as entlangPostposition } from "../../../attestations/de/selection/Wir_liefen_den_Fluss_entlang/Wir_liefen_den_Fluss_[entlang].ts";

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the GovernedCase feature on adposition Lemmas.",
	family: "feature",
	leaf: "GovernedCase",
	order: 18021,
	subject: "GovernedCase",
	title: "GovernedCase",
	body: `
\`GovernedCase\` records the lexical case government of an adposition [\`Lemma\`](/u/entity/lemma/).

It is a Dumling-specific feature. Its value inventory is the same abstract inventory as [\`Case\`](/u/feature/case/), and it belongs in \`Lemma.coreFeatures\`.

## Values

- any public [\`Case\`](/u/feature/case/) value, such as \`Acc\`, \`Dat\`, or \`Gen\`

If \`Lemma.coreFeatures.governedCase\` is absent or \`undefined\`, the Lemma is treated as not having a single recorded governed case.
`,
	examples: [wegenPreposition, zuPreposition, entlangPostposition],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`governedCase\` when the adposition lexically selects one case as a stable property of the Lemma itself.

This is different from recording the case of a locally inflected dependent in one sentence. \`GovernedCase\` belongs on the adposition Lemma, not on the selected token of the complement phrase.
`,
		},
		{
			heading: "When To Leave It Unset",
			body: `
Leave \`governedCase\` unset when the adposition alternates between cases in ordinary use and the schema is not modeling that alternation with one fixed lexical value.

That is why a German two-way preposition such as \`auf\` may appear in accusative or dative phrases without Dumling forcing one permanent \`governedCase\` value onto the Lemma.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`governedCase\` on German [\`ADP\`](/u/entity/lemma/lexeme/adp/) Lemmas.
`,
		},
	],
});

export default document;
