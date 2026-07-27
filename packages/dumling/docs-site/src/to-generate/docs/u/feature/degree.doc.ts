import { attestation as positiveDegree } from "../../../attestations/de/selection/Viele_deutschsprachigen_Quellen_fehlen_noch/Viele_[deutschsprachigen]_Quellen_fehlen_noch.ts";
import { attestation as comparativeDegree } from "../../../attestations/en/selection/This_is_the_better_option/This_is_the_[better]_option.ts";
import { attestation as superlativeDegree } from "../../../attestations/en/selection/She_performed_best_under_pressure/She_performed_[best]_under_pressure.ts";
import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Degree feature.",
	family: "feature",
	leaf: "Degree",
	order: 18015,
	subject: "Degree",
	title: "Degree",
	body: `
\`Degree\` marks degree on scalar items such as adjectives and adverbs.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Degree.html) feature with seven public values and belongs in \`surface.inflectionalFeatures\`.

## Values

- \`Abs\`: absolute superlative
- \`Aug\`: augmentative
- \`Cmp\`: comparative
- \`Dim\`: diminutive
- \`Equ\`: equative
- \`Pos\`: positive or base degree
- \`Sup\`: superlative

If \`surface.inflectionalFeatures.degree\` is absent or \`undefined\`, the surface is not annotated for degree.
`,
	examples: [comparativeDegree, superlativeDegree, positiveDegree],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`degree\` when the selected surface overtly expresses comparison, superlative force, or another UD-recognized degree distinction.

In Dumling, \`Degree\` is modeled on the inflected surface rather than the lemma, because contrasts such as \`good\` / \`better\` / \`best\` are different surface realizations of the same lexical item.
`,
		},
		{
			heading: "Scope",
			body: `
\`Degree\` is most common on [\`ADJ\`](/u/entity/lemma/lexeme/adj/) and [\`ADV\`](/u/entity/lemma/lexeme/adv/) surfaces, but the full UD inventory also includes derivational-style values such as \`Aug\` and \`Dim\` for languages whose annotation schemes use them.
`,
		},
	],
});

export default document;
