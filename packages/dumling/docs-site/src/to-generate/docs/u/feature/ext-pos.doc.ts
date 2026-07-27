import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal ExtPos feature.",
	family: "feature",
	leaf: "ExtPos",
	order: 18017,
	subject: "ExtPos",
	title: "ExtPos",
	body: `
\`ExtPos\` marks the effective external part of speech of an expression when that expression behaves like a different UPOS category from the head word itself.

It is a [UD-compliant](https://universaldependencies.org/u/feat/ExtPos.html) feature. In UD, it is annotated on the head token of the expression. In Dumling's current public schemas, the same distinction is exposed only as \`lemma.inherentFeatures.extPos\`.

## Values

- \`ADJ\`: adjective-like expression
- \`ADP\`: adposition-like expression
- \`ADV\`: adverb-like expression
- \`AUX\`: auxiliary-like expression
- \`CCONJ\`: coordinating-conjunction-like expression
- \`DET\`: determiner-like expression
- \`INTJ\`: interjection-like expression
- \`PRON\`: pronoun-like expression
- \`PROPN\`: proper-noun-like expression
- \`SCONJ\`: subordinating-conjunction-like expression

If \`lemma.inherentFeatures.extPos\` is absent or \`undefined\`, no external POS reinterpretation is recorded.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`extPos\` when the whole expression should be interpreted syntactically as a different part of speech from the head lemma's ordinary lexical category.

Typical cases include fixed multiword adpositions, adverbials, subordinators, reciprocal-pronoun-like expressions, and proper-name-like expressions whose head word would otherwise receive another UPOS tag.

Do not use \`extPos\` just to restate the lemma's ordinary lexical class. That ordinary class already lives in the lemma subtype such as [\`ADP\`](/u/entity/lemma/lexeme/adp/) or [\`PROPN\`](/u/entity/lemma/lexeme/propn/).
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract enum in Dumling follows the universal UD value set and includes all ten values listed above.

Current concrete Dumling schemas encode only \`ADP\`, \`ADV\`, \`CCONJ\`, \`DET\`, \`PRON\`, \`PROPN\`, and \`SCONJ\`. The remaining universal values \`ADJ\`, \`AUX\`, and \`INTJ\` are available in the abstract catalog but are not currently exposed by the concrete English or German lemma schemas.
`,
		},
	],
});

export default document;
