import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "German Gender[psor].",
	family: "feature",
	order: 8020,
	subject: "Gender[psor]",
	title: "Gender[psor]",
	body: `
A possessive's Surface records the possessor's gender and number only as far
as its form shows them. \`sein\` marks the gender set \`Masc,Neut\`; \`ihr\`
fits a feminine or a plural possessor, so it marks no gender.
`,
});

export default document;
