import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const derArticle = specExample("de/viele-vermissen-das-alte-berlin");

const document = defineLanguageOverlayPage({
	description: "German Definite.",
	examples: [derArticle],
	family: "feature",
	leaf: "Definite",
	order: 8014,
	subject: "Definite",
	title: "Definite",
});

export default document;
