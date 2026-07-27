import { defineLanguageOverlayPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "Root overview for the German public concept tree.",
	family: "scope",
	order: 100,
	subject: "de",
	title: "German",
	body: `
Diese Überblicksseite bündelt die öffentlichen deutschen Klassifikationsrouten.

Sie spiegelt den universellen \`/u/**\`-Baum, zeigt aber nur die im deutschen Pack tatsächlich freigegebenen Teilbäume. Universal definierte Inhalte erscheinen auf jeder Seite zuerst; deutsche Hinweise und Beispiele folgen danach.
`,
});

export default document;
