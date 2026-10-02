import { defineUniversalConceptPage } from "../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "Root overview for the universal public concept tree.",
	order: 10100,
	title: "Universal",
	body: `
This is the universal public concept tree.

Every language-specific public tree under \`/{lang}/**\` mirrors a strict subset of this hierarchy, inheriting universal content before adding local commentary.
`,
});

export default document;
