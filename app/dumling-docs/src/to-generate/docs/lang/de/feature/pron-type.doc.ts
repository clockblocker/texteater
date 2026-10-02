import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const vieleIndefinitePronoun = specExample("de/viele-kamen-zu-spaet");

const document = defineLanguageOverlayPage({
	description: "German PronType.",
	examples: [vieleIndefinitePronoun],
	order: 8035,
	title: "PronType",
});

export default document;
