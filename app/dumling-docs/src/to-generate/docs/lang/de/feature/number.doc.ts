import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const kindernPluralNoun = specExample(
	"de/mit-den-kindern-ist-es-nie-langweilig",
);

const document = defineLanguageOverlayPage({
	description: "German Number.",
	examples: [kindernPluralNoun],
	family: "feature",
	leaf: "Number",
	order: 8027,
	subject: "Number",
	title: "Number",
});

export default document;
