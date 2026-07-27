import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "General framework and API documentation.",
	order: 10,
	title: "General Docs",
	body: `
These pages explain the shared dumling model, terminology, and runtime API without entering language-specific classification notes.
`,
});

export default document;
