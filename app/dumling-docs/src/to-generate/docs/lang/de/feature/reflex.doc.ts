import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const dichReflexivePronoun = specExample("de/pass-auf-dich-auf", 1);

const document = defineLanguageOverlayPage({
	description: "German Reflex.",
	examples: [dichReflexivePronoun],
	family: "feature",
	leaf: "Reflex",
	order: 8037,
	subject: "Reflex",
	title: "Reflex",
});

export default document;
