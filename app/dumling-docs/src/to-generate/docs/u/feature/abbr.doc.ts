import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as bvgAbbreviation } from "../../../attestations/de/attestation/In_Berlin_betreibt_die_BVG_die_UBahn/In_Berlin_betreibt_die_[BVG]_die_UBahn.ts";
import { attestation as tzahalAbbreviation } from "../../../attestations/he/attestation/הוא_שירת_בצהל/הוא_שירת_ב[צהל].ts";

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
