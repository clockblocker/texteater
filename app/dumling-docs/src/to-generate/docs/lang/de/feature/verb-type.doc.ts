import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const mussPresentAuxiliary = specExample("de/er-muss-heute-arbeiten");

const document = defineLanguageOverlayPage({
	description: "German VerbType.",
	examples: [mussPresentAuxiliary],
	family: "feature",
	leaf: "VerbType",
	order: 8040,
	subject: "VerbType",
	title: "VerbType",
});

export default document;
