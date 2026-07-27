import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "Implemented language packs and their notes.",
	order: 100,
	title: "Language Packs",
	body: `
These pages summarize the implemented runtime language packs. The public classification trees live under \`/u/**\` and \`/{lang}/**\`; the pages here provide broader pack notes, examples, and schema pointers.
`,
});

export default document;
