import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const ihremPoliteDeterminer = specExample(
	"de/bitte-folgen-sie-ihrem-ansprechpartner",
);

const document = defineLanguageOverlayPage({
	description: "German Case.",
	examples: [ihremPoliteDeterminer],
	family: "feature",
	leaf: "Case",
	order: 8012,
	subject: "Case",
	title: "Case",
});

export default document;
