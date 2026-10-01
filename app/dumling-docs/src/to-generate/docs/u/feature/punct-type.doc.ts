import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal PunctType feature.",
	family: "feature",
	leaf: "PunctType",
	order: 18036,
	subject: "PunctType",
	title: "PunctType",
	body: `
\`PunctType\` names the kind of punctuation mark a [\`PUNCT\`](/u/entity/lemma/lexeme/punct/) Lemma is, such as \`Comm\` for a comma or \`Peri\` for a period. It is a [UD-compliant](https://universaldependencies.org/u/feat/PunctType.html) feature in the Feature Pool.

No current concrete Dumling route uses it: a punctuation mark is a Punctuation Segment, and its spelling already says which mark it is.
`,
});

export default document;
