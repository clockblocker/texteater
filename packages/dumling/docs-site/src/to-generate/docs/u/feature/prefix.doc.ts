import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description:
		"Hebrew-specific reference for the Prefix feature used on adverbial lemmas.",
	family: "feature",
	leaf: "Prefix",
	order: 18034.5,
	subject: "Prefix",
	title: "Prefix",
	body: `
\`Prefix\` marks that a Hebrew [\`Lemma\`](/u/entity/lemma/) is a non-standalone prefixal adverbial.

It is a Hebrew-specific feature aligned with [UD Hebrew guidance](https://universaldependencies.org/he/index.html), has one public value, and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Yes\`: the lemma is marked as prefixal

If \`lemma.inherentFeatures.prefix\` is absent or \`undefined\`, the lemma is treated as not being marked prefixal.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`prefix: "Yes"\` when the lemma is analyzed as a Hebrew [\`ADV\`](/u/entity/lemma/lexeme/adv/) that functions as a bound prefix-like element rather than as a fully standalone adverbial word.

This covers the UD Hebrew pattern used for prefixal adverbials such as loan elements like \`multi-\` or \`anti-\`, as well as comparable native Hebrew items.
`,
		},
		{
			heading: "Relation to Prefix morphemes",
			body: `
This feature is not the same thing as the [\`Prefix\`](/u/entity/lemma/morpheme/prefix/) lemma subtype.

The lemma subtype \`Prefix\` is a morpheme classification. \`Prefix=Yes\` is instead a grammatical feature on a Hebrew adverbial lexeme whose lexical behavior is prefix-like.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature schema currently exposes one public value, \`"Yes"\`. Current concrete Dumling schemas expose \`prefix\` only on Hebrew [\`ADV\`](/u/entity/lemma/lexeme/adv/) lemmas.
`,
		},
	],
});

export default document;
