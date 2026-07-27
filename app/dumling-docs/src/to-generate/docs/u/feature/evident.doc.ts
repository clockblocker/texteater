import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Evident feature.",
	family: "feature",
	leaf: "Evident",
	order: 18016.5,
	subject: "Evident",
	title: "Evident",
	body: `
\`Evident\` marks evidentiality: whether a form encodes the speaker's source of information.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Evident.html) feature with two public values and will usually belong in \`inflectionalFeatures\`.

## Values

- \`Fh\`: firsthand, where the speaker presents the event as directly witnessed or otherwise firsthand
- \`Nfh\`: non-firsthand, where the speaker did not directly witness the event

If \`inflectionalFeatures.evident\` is absent or \`undefined\`, no evidential distinction is encoded.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`evident\` when a language morphologically distinguishes firsthand from non-firsthand evidence on a concrete form, most often a verb form.

This is typically an inflectional category rather than a stable lexical property of the [\`Lemma\`](/u/entity/lemma/). For example, UD uses \`Evident\` for the firsthand-versus-non-firsthand contrast in Turkish past-tense forms.
`,
		},
		{
			heading: "Scope",
			body: `
This public enum mirrors the current UD feature page and exposes only \`Fh\` and \`Nfh\`.

More specific reported or quotative categories are not modeled here. UD currently handles those elsewhere, such as with quotative [\`Mood\`](/u/feature/mood/) analyses.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature catalog includes \`evident\`, but this repository currently ships no built-in attestations or language-specific overlay pages that demonstrate it in use.
`,
		},
	],
});

export default document;
