import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const gehImperative = specExample("de/es-schneit-und-ich-bleibe-drinnen-geh-bitte-nicht-ohne-jacke");

const document = defineLanguageOverlayPage({
	description: "German Mood.",
	examples: [gehImperative],
	family: "feature",
	leaf: "Mood",
	order: 8026,
	subject: "Mood",
	title: "Mood",
});

export default document;
