import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const gehImperative = specExample("de/es-schneit-und-ich-bleibe-drinnen-geh-bitte-nicht-ohne-jacke");

const document = defineLanguageOverlayPage({
	description: "German VerbForm.",
	examples: [gehImperative],
	family: "feature",
	leaf: "VerbForm",
	order: 8039,
	subject: "VerbForm",
	title: "VerbForm",
});

export default document;
