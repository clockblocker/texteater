import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
const document = defineLanguageOverlayPage({
	description: "German Definite.",
	family: "feature",
	leaf: "Definite",
	order: 8014,
	subject: "Definite",
	title: "Definite",
	body: `
German marks \`definite\` only in the Core of the \`der\` and \`ein\` article
cells, one DET Lemma per Paradigm Cell: \`dem\` is \`Def\`, \`einem\` is
\`Ind\`. No click resolves to them. An article is a member of the Head of its
phrase (\`[das, Berlin]\`), and \`dumspec\` derives its DET cell from its
spelling and the Head's case, number and gender.
`,
});

export default document;
