import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const gehImperative = specExample(
	"de/es-schneit-und-ich-bleibe-drinnen-geh-bitte-nicht-ohne-jacke",
);

const document = defineLanguageOverlayPage({
	description: "German VerbForm.",
	examples: [gehImperative],
	order: 8039,
	title: "VerbForm",
});

export default document;
