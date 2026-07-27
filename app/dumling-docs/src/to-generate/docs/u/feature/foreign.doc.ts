import { attestation as covidishForeignWord } from "../../../attestations/en/selection/The_report_says_COVIDish_twice/The_report_says_[COVIDish]_twice.ts";
import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Foreign feature.",
	family: "feature",
	leaf: "Foreign",
	order: 18018,
	subject: "Foreign",
	title: "Foreign",
	body: `
\`Foreign\` marks that a [\`Lemma\`](/u/entity/lemma/) is a genuinely foreign word appearing inside otherwise native text.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Foreign.html) feature with one public value and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Yes\`: the lemma is marked as foreign

If \`lemma.inherentFeatures.foreign\` is absent or \`undefined\`, the lemma is treated as not marked foreign.
`,
	examples: [covidishForeignWord],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`foreign: "Yes"\` when the item is analyzed as a foreign insertion or code-switched word, not as an ordinary established loanword of the matrix language.

Do not use \`Foreign\` just because a lemma has unusual spelling or refers to a foreign person, place, or institution. The feature is for genuinely foreign material embedded in otherwise native text.

UD often uses \`Foreign=Yes\` on [\`X\`](/u/entity/lemma/lexeme/x/) when the foreign token is hard to classify internally, but it can also be used on other lexical categories when the original part of speech is known and worth preserving.
`,
		},
		{
			heading: "Scope",
			body: `
This abstract feature mirrors the current UD definition and exposes only the boolean value \`Yes\`.
`,
		},
	],
});

export default document;
