import { defineLanguageOverlayPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "Root overview for the Hebrew public concept tree.",
	order: 100,
	title: "Hebrew",
	body: `
The Hebrew route and feature pages, generated from the \`dumcorpus\` records and
the Dumling schemas.
`,
});

export default document;
