import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const vieleIndefinitePronoun = specExample("de/viele-kamen-zu-spaet");

const document = defineLanguageOverlayPage({
	description: "German PronType.",
	examples: [vieleIndefinitePronoun],
	family: "feature",
	leaf: "PronType",
	order: 8035,
	subject: "PronType",
	title: "PronType",
});

export default document;
