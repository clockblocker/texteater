import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Variant feature.",
	order: 18038,
	title: "Variant",
	body: `
\`Variant\` is UD's feature for an alternative form of a word, such as \`Short\` for a short adjective form. It is a [UD-compliant](https://universaldependencies.org/u/feat/Variant.html) feature in the Feature Pool.

No current concrete Dumling route uses it. A spelling that differs from a Lemma's standard spelling is a Variant on [\`Surface.spelling\`](/u/feature/surface/spelling/), not a Lemma feature.
`,
});

export default document;
