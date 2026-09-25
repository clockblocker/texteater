import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../lib/docs/spec-examples.ts";

const bvgAbbreviation = specExample("de/in-berlin-betreibt-die-bvg-die-u-bahn");
const tzahalAbbreviation = specExample("he/hu-sheret-betsahal");

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Abbr feature.",
	family: "feature",
	leaf: "Abbr",
	order: 18010,
	subject: "Abbr",
	title: "Abbr",
	body: `
\`Abbr\` marks that a [\`Lemma\`](/u/entity/lemma/) is an abbreviation.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Abbr.html) feature with one public value and belongs in \`Lemma.coreFeatures\`.

## Values

- \`Yes\`: the Lemma is marked as an abbreviation

If \`Lemma.coreFeatures.abbr\` is absent or \`undefined\`, the Lemma is marked as not an abbreviation.
`,
	examples: [bvgAbbreviation, tzahalAbbreviation],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`abbr: "Yes"\` when the Lemma is itself an abbreviated form of a word or multi-word name.

The abbreviated item normally still has its ordinary lexical category, such as [\`PROPN\`](/u/entity/lemma/lexeme/propn/), rather than being forced into a catch-all part of speech just because its surface form is short or opaque.
`,
		},
	],
});

export default document;
