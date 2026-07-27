import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Clusivity feature.",
	family: "feature",
	leaf: "Clusivity",
	order: 18012.5,
	subject: "Clusivity",
	title: "Clusivity",
	body: `
\`Clusivity\` marks whether a first-person plural reference includes the listener.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Clusivity.html) feature with two public values.

## Values

- \`Ex\`: exclusive, meaning "we" = I + they and not you
- \`In\`: inclusive, meaning "we" = I + you, optionally also others

If \`clusivity\` is absent or \`undefined\`, no inclusive-versus-exclusive distinction is encoded.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`clusivity: "In"\` or \`clusivity: "Ex"\` only together with first-person plural forms.

In many languages this distinction belongs to personal pronouns, so it may live in \`lemma.inherentFeatures\`. In others it is expressed by inflectional agreement on a concrete surface, such as a verb form, so it may instead belong in \`inflectionalFeatures\`.
`,
		},
		{
			heading: "Scope",
			body: `
This public enum mirrors the base UD feature and currently exposes the two core values \`Ex\` and \`In\` only.
`,
		},
	],
});

export default document;
