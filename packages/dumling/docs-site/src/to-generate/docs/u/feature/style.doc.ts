import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as likeVernacularSubordinator } from "../../../attestations/en/selection/Do_it_like_I_showed_you/Do_it_[like]_I_showed_you.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Style feature.",
	family: "feature",
	leaf: "Style",
	order: 18037.5,
	subject: "Style",
	title: "Style",
	body: `
\`Style\` marks the register, sublanguage, or stylistic coloring associated with a word or form.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Style.html) feature with eight public values. In Dumling, it may be lexical in \`lemma.inherentFeatures\` or, in principle, inflectional in \`surface.inflectionalFeatures\`, depending on how a language-specific schema exposes it.

## Values

- \`Arch\`: archaic or obsolete
- \`Coll\`: colloquial
- \`Expr\`: expressive or emotional
- \`Form\`: formal or literary
- \`Rare\`: rare
- \`Slng\`: slang
- \`Vrnc\`: vernacular
- \`Vulg\`: vulgar

If \`style\` is absent or \`undefined\`, Dumling records no style value for that lemma or surface.
`,
	examples: [likeVernacularSubordinator],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`style\` when the lexical item or form itself belongs to a marked register, such as archaic, colloquial, slang, vernacular, or expressive usage.

\`Style\` is not a topic label or social judgment. It records how the item is situated in the grammar or lexicon of a speech community, not whether the sentence content is casual or formal overall.
`,
		},
		{
			heading: "Layering",
			body: `
Some languages treat style mostly as a lexical property of particular lemmas, while others can expose it through recurrent form-level alternations.

That is why the abstract feature is not tied to one layer only: a language pack can place it on the lemma when the stylistic value is part of lexical identity, or on the surface when the stylistic distinction is expressed inflectionally or orthographically.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract \`Style\` enum exposes all eight UD values above.

Current concrete Dumling schemas use a narrower inherent subset on selected English lexeme classes: \`Arch\`, \`Coll\`, \`Expr\`, \`Slng\`, and \`Vrnc\`. The current ID codec serializes that same five-value subset.
`,
		},
	],
});

export default document;
