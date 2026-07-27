import { attestation as twentyFirstOrdinal } from "../../../attestations/en/selection/The_twentyfirst_attempt_finally_passed/The_[twentyfirst]_attempt_finally_passed.ts";
import { attestation as halfFraction } from "../../../attestations/en/selection/Use_half_the_flour_first/Use_[half]_the_flour_first.ts";
import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal NumForm feature.",
	family: "feature",
	leaf: "NumForm",
	order: 18028,
	subject: "NumForm",
	title: "NumForm",
	body: `
\`NumForm\` marks the written form used by a numeral or number-related [\`Lemma\`](/u/entity/lemma/).

It is a [UD-compliant](https://universaldependencies.org/u/feat/NumForm.html) feature with four public values and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Combi\`: mixed letter-digit or otherwise combined numeral form
- \`Digit\`: digit-based numeral form
- \`Roman\`: Roman numeral form
- \`Word\`: fully worded numeral form

If \`lemma.inherentFeatures.numForm\` is absent or \`undefined\`, the lemma has no recorded numeral-form annotation.
`,
	examples: [twentyFirstOrdinal, halfFraction],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`numForm\` when the shape of the numeral expression is a stable lexical fact of the lemma, such as whether it is written as digits, Roman numerals, or words.

\`NumForm\` often works together with [\`NumType\`](/u/feature/num-type/): for example, a lemma can be an ordinal written as a word or a cardinal written as digits. The two features answer different questions, with \`NumType\` covering semantic subtype and \`NumForm\` covering written form.
`,
		},
		{
			heading: "Value guide",
			body: `
Choose \`Digit\` for items like \`12\`, \`Roman\` for items like \`IV\`, and \`Word\` for spelled-out forms like \`twelve\` or \`twenty-first\`.

Use \`Combi\` for mixed forms such as alphanumeric items when the analysis treats them as number-shaped lexical items rather than as ordinary alphabetic words.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature enum follows UD and exposes all four values above.

Current concrete English schemas expose only subsets of that inventory, depending on lexeme type:

- [\`NUM\`](/u/entity/lemma/lexeme/num/): \`Digit\`, \`Roman\`, \`Word\`
- [\`NOUN\`](/u/entity/lemma/lexeme/noun/): \`Combi\`, \`Digit\`, \`Word\`
- [\`ADJ\`](/u/entity/lemma/lexeme/adj/): \`Combi\`, \`Word\`
- [\`DET\`](/u/entity/lemma/lexeme/det/) and [\`ADV\`](/u/entity/lemma/lexeme/adv/): \`Word\`
`,
		},
	],
});

export default document;
