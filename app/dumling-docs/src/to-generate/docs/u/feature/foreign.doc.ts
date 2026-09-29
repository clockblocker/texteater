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

It is a [UD-compliant](https://universaldependencies.org/u/feat/Foreign.html) feature with one public value and belongs in \`Lemma.coreFeatures\`.

## Values

- \`Yes\`: the Lemma is marked as foreign

If \`Lemma.coreFeatures.foreign\` is absent or \`undefined\`, the Lemma is treated as not marked foreign.
`,
	subsections: [
		{
			heading: "Use",
			body: `
In Dumling, a foreign insertion or code-switched word is not a Lexeme marked \`foreign\`. A word from another language that the text language's dictionary lists is a Lexeme of its real Kind, and so is an unlisted word that shows the text's grammar. Other material from another language is a Lemma of the [\`Foreign\`](/u/entity/lemma/foreign/foreign/) Family, with its source language as [\`sourceLang\`](/u/feature/source-lang/) (ADR 0045).

Do not use \`Foreign\` just because a Lemma has unusual spelling or refers to a foreign person, place, or institution. Foreign names stay \`PROPN\`.
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
