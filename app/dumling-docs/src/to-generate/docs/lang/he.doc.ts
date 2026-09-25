import { defineLanguageOverlayPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "Root overview for the Hebrew public concept tree.",
	family: "scope",
	order: 100,
	subject: "he",
	title: "Hebrew",
	body: `
The Hebrew route and feature pages, generated from the \`dumspec\` records and
the Dumling schemas.
`,
});

export default document;
