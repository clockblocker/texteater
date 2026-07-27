import { attestation as bateiConstructState } from "../../../attestations/he/selection/בתי_הספר_נסגרו_מוקדם/[בתי]_הספר_נסגרו_מוקדם.ts";
import { attestation as habayitPartialSelection } from "../../../attestations/he/selection/חזרתי_לבית/חזרתי_ל[בית].ts";
import { attestation as derArticle } from "../../../attestations/de/selection/Sieh_einmal_hier_steht_er_pfui_der_Struwwelpeter/Sieh_einmal_hier_steht_er_pfui_[der]_Struwwelpeter.ts";
import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Definite feature.",
	family: "feature",
	leaf: "Definite",
	order: 18014,
	subject: "Definite",
	title: "Definite",
	body: `
\`Definite\` marks definiteness-related status on a [\`Lemma\`](/u/entity/lemma/) or a concrete surface.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Definite.html) feature with five public values. In Dumling it may belong either in \`lemma.inherentFeatures\` or in \`surface.inflectionalFeatures\`, depending on whether definiteness is treated as a stable lexical property or as a property of an inflected form.

## Values

- \`Com\`: complex
- \`Cons\`: construct state; reduced definiteness
- \`Def\`: definite
- \`Ind\`: indefinite
- \`Spec\`: specific indefinite

If \`definite\` is absent or \`undefined\`, the item has no recorded definiteness value.
`,
	examples: [derArticle, bateiConstructState, habayitPartialSelection],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`definite\` on a [\`Lemma\`](/u/entity/lemma/) when definiteness is lexically built into the item, as with article-like or pronoun-like entries whose lexical identity is already definite or indefinite.

Use \`definite\` on \`surface.inflectionalFeatures\` when a language expresses definiteness morphologically on a concrete form, as with Hebrew noun or adjective surfaces.

For Hebrew construct state, use \`Cons\` rather than \`Def\`. The construct form encodes a reduced definiteness status of the head itself, even when the larger phrase can still be interpreted as definite.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature enum follows UD and includes all five values above. Current concrete Dumling schemas expose narrower subsets:

- English and German [\`DET\`](/u/entity/lemma/lexeme/det/) lemmas currently use \`Def\` and \`Ind\` in \`lemma.inherentFeatures\`.
- Hebrew concrete schemas currently use \`Cons\` and \`Def\` in \`surface.inflectionalFeatures\` for several lexeme subtypes, including [\`NOUN\`](/u/entity/lemma/lexeme/noun/) and [\`DET\`](/u/entity/lemma/lexeme/det/).
- Hebrew [\`PRON\`](/u/entity/lemma/lexeme/pron/) lemmas currently expose only inherent \`Def\`.

\`Com\` and \`Spec\` are part of the universal feature definition but are not currently surfaced by the concrete language schemas in this repository.
`,
		},
	],
});

export default document;
