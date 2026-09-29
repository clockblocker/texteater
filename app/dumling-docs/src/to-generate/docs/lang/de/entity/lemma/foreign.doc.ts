import { defineLanguageOverlayPage } from "../../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "Overview of the foreign route in the German pack.",
	family: "foreign",
	order: 7500,
	subject: "foreign",
	title: "Foreign",
	body: "Fremdsprachliches Material im deutschen Text ist ein Lemma der Familie `Foreign`: ein Wort (`whatever`) oder eine in der Herkunftssprache feste Wendung (`by the way`), mit der Herkunftssprache als `sourceLang`. Zeigt das Wort im Satz deutsche Grammatik, eine Endung (`ein cooler Typ`) oder einen kongruierenden Artikel (`das Meeting`), ist es ein deutsches Lexem. Die Nennform korrigiert nur Großschreibung am Satzanfang und Tippfehler (`watevr` ist `whatever`).",
});

export default document;
