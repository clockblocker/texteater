import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const mussPresentAuxiliary = specExample("de/er-muss-heute-arbeiten");

const document = defineLanguageOverlayPage({
	description: "German Tense.",
	examples: [mussPresentAuxiliary],
	order: 8038.5,
	title: "Tense",
});

export default document;
