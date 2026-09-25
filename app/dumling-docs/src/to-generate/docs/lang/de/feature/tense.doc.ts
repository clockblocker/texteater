import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const mussPresentAuxiliary = specExample("de/er-muss-heute-arbeiten");

const document = defineLanguageOverlayPage({
	description: "German Tense.",
	examples: [mussPresentAuxiliary],
	family: "feature",
	leaf: "Tense",
	order: 8038.5,
	subject: "Tense",
	title: "Tense",
});

export default document;
