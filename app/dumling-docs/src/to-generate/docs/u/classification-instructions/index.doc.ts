import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "Language-specific classifier instructions that extend the shared universal tree.",
	family: "scope",
	order: 20000,
	subject: "classification-instructions",
	title: "Classification Instructions",
	body: `
This section collects language-specific classifier instructions that do not belong in the shared universal concept tree itself.

Use these pages when a language pack needs narrow operational guidance for applying the public categories to real attestations.
`,
});

export default document;
