import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const ihremPoliteDeterminer = specExample(
	"de/bitte-folgen-sie-ihrem-ansprechpartner",
);

const document = defineLanguageOverlayPage({
	description: "German Polite.",
	examples: [ihremPoliteDeterminer],
	family: "feature",
	leaf: "Polite",
	order: 8033,
	subject: "Polite",
	title: "Polite",
});

export default document;
