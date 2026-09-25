import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const ihremPoliteDeterminer = specExample(
	"de/bitte-folgen-sie-ihrem-ansprechpartner",
);

const document = defineLanguageOverlayPage({
	description: "German Poss.",
	examples: [ihremPoliteDeterminer],
	family: "feature",
	leaf: "Poss",
	order: 8034,
	subject: "Poss",
	title: "Poss",
});

export default document;
