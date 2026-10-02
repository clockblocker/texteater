import { defineLanguageOverlayPage } from "../../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "Overview of the foreign route in the German pack.",
	order: 7500,
	title: "Foreign",
	body: "Fremdsprachliches Material im deutschen Text ist ein Lemma der Familie `Foreign`: ein Wort (`whatever`) oder eine in der Herkunftssprache feste Wendung (`by the way`), mit der Herkunftssprache als `sourceLang`. Verzeichnet der Duden das Wort in dieser Bedeutung, ist es ein deutsches Lexem, auch unflektiert (`cringe`, `lol`). Ein nicht verzeichnetes Wort ist ein deutsches Lexem, wenn es im Satz deutsche Grammatik zeigt: eine Endung (`geyeetet`) oder einen kongruierenden Artikel (`der Hotfix`). Die Nennform korrigiert nur Großschreibung am Satzanfang und Tippfehler (`watevr` ist `whatever`).",
});

export default document;
