import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../lib/docs/spec-examples.ts";

const mildCitation = specExample("de/als-grundform-wird-mild-angegeben");
const hierAdverb = specExample("de/bitte-warten-sie-hier-vor-dem-eingang");

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the Comparable feature on ADV and ADJ Lemmas.",
	family: "feature",
	leaf: "Comparable",
	order: 18012.75,
	subject: "Comparable",
	title: "Comparable",
	body: `
\`Comparable\` marks that an [\`ADV\`](/u/entity/lemma/lexeme/adv/) or [\`ADJ\`](/u/entity/lemma/lexeme/adj/) [\`Lemma\`](/u/entity/lemma/) has comparison forms of its own.

It is a Dumling-specific feature with one public value and belongs in \`Lemma.coreFeatures\` (ADR 0042).

## Values

- \`Yes\`: the Lemma has comparison forms

\`null\` means the Lemma has none (\`hier\`, \`tot\`, \`here\`).
`,
	examples: [mildCitation, hierAdverb],
	subsections: [
		{
			heading: "Use",
			body: `
A Lemma is comparable when the dictionary gives it comparison forms. Inflected forms count (\`schneller\`, \`faster\`), and so do suppletive ones (\`gern\` → \`lieber\`, \`good\` → \`better\`). Periphrastic \`more\` or \`most\` does not, and neither does a colloquial form such as \`töter\`.
`,
		},
		{
			heading: "Layer",
			body: `
\`Comparable\` is a Core Feature, and it decides [\`Degree\`](/u/feature/degree/) on every Surface. A comparable Lemma's Surface always marks Degree, \`Pos\` in a citation (\`mild\`) included. A non-comparable Lemma's Surface never does: an ADV has no inflection, and an ADJ marks case, gender and number only when attributive (\`der tote Mann\`).

Grundform follows. A comparable Lemma cites its positive. A non-comparable one without inflection is Grundform by its spelling, and an attributive form is not.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`comparable\` on German and English ADV and ADJ Lexemes and Locutions.
`,
		},
	],
});

export default document;
