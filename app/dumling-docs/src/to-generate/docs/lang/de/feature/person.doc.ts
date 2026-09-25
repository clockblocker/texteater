import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const gehImperative = specExample("de/geh-bitte-nicht-ohne-jacke-raus");

const document = defineLanguageOverlayPage({
	description: "German Person.",
	examples: [gehImperative],
	family: "feature",
	leaf: "Person",
	order: 8031,
	subject: "Person",
	title: "Person",
});

export default document;
