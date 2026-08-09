import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as unPrefixAttestation } from "../../../attestations/en/attestation/That_answer_was_unbelievable/That_answer_was_[un]believable.ts";
import { attestation as twentyFirstHyphenatedOrdinal } from "../../../attestations/en/attestation/The_twentyfirst_attempt_finally_passed/The_[twentyfirst]_attempt_finally_passed.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Hyph feature.",
	family: "feature",
	leaf: "Hyph",
	order: 18024,
	subject: "Hyph",
	title: "Hyph",
	body: `
\`Hyph\` marks that a [\`Lemma\`](/u/entity/lemma/) is conventionally hyphenated.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Hyph.html) feature with one public value and belongs in \`Lemma.coreFeatures\`.

## Values

- \`Yes\`: the Lemma is marked as hyphenated

If \`Lemma.coreFeatures.hyph\` is absent or \`undefined\`, the Lemma is treated as not marked for hyphenation.
`,
	examples: [twentyFirstHyphenatedOrdinal, unPrefixAttestation],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`hyph: "Yes"\` when the Lemma's canonical written form includes a hyphen as part of the lexical item itself.

This is a Lemma-level orthographic property, not an inflectional one. Use it for stable Lemmas such as hyphenated compounds, certain ordinal words, or bound morphemes whose canonical form is written with a trailing hyphen.

Do not use \`hyph\` merely because noisy input omits or adds a hyphen relative
to the Lemma. A typo on the clicked Segment belongs to
[\`member.orthography\`](/u/feature/attestation/member-orthography/); licensed
variation belongs to [\`Surface.spelling\`](/u/feature/surface/spelling/), and
partial realization belongs to
[\`Attestation.realizationCoverage\`](/u/feature/attestation/realization-coverage/).
\`hyph\` records the Lemma's canonical grammatical form itself.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature enum follows UD and exposes only \`Yes\`.

Current concrete Dumling schemas expose \`hyph\` only as a core feature on German [\`NOUN\`](/u/entity/lemma/lexeme/noun/) and German [\`OTHER\`](/u/entity/lemma/lexeme/other/) lexemes.
`,
		},
	],
});

export default document;
