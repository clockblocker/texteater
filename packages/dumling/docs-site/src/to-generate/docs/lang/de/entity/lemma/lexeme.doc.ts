import { defineLanguageOverlayPage } from "../../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "Overview of public lexeme subtypes in the German pack.",
	family: "pos",
	order: 4000,
	subject: "lexeme",
	title: "Lexeme",
	body: `
Die Lexem-Seiten bilden die öffentlichen Wortarten des deutschen Packs ab und verlinken auf die grammatischen Feature-Seiten, die für die jeweilige Wortart im Modell benutzt werden.
`,
});

export default document;
