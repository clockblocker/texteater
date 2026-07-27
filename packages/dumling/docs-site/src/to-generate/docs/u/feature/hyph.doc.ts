import { attestation as twentyFirstHyphenatedOrdinal } from "../../../attestations/en/selection/The_twentyfirst_attempt_finally_passed/The_[twentyfirst]_attempt_finally_passed.ts";
import { attestation as unPrefixPartialSelection } from "../../../attestations/en/selection/That_answer_was_unbelievable/That_answer_was_[un]believable.ts";
import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Hyph feature.",
	family: "feature",
	leaf: "Hyph",
	order: 18024,
	subject: "Hyph",
	title: "Hyph",
	body: `
\`Hyph\` marks that a [\`Lemma\`](/u/entity/lemma/) is conventionally hyphenated.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Hyph.html) feature with one public value and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Yes\`: the lemma is marked as hyphenated

If \`lemma.inherentFeatures.hyph\` is absent or \`undefined\`, the lemma is treated as not marked for hyphenation.
`,
	examples: [twentyFirstHyphenatedOrdinal, unPrefixPartialSelection],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`hyph: "Yes"\` when the lemma's canonical written form includes a hyphen as part of the lexical item itself.

This is a lemma-level orthographic property, not an inflectional one. Use it for stable entries such as hyphenated compounds, certain ordinal words, or bound morphemes whose citation form is written with a trailing hyphen.

Do not use \`hyph\` merely because a concrete selection omits or adds a hyphen relative to the lemma. That kind of mismatch belongs to selection-level modeling such as [\`Spelling\`](/u/feature/selection/spelling/) or [\`Coverage\`](/u/feature/selection/coverage/), while \`hyph\` records the canonical lemma form itself.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature enum follows UD and exposes only \`Yes\`.

Current concrete Dumling schemas expose \`hyph\` only as an inherent feature on German [\`NOUN\`](/u/entity/lemma/lexeme/noun/) and German [\`OTHER\`](/u/entity/lemma/lexeme/other/) lexemes.
`,
		},
	],
});

export default document;
