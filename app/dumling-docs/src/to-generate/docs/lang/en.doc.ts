import { defineLanguageOverlayPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "Root overview for the English public concept tree.",
	order: 100,
	title: "English",
	body: `
The English route and feature pages, generated from the \`dumcorpus\` records
and the Dumling schemas.
`,
});

export default document;
