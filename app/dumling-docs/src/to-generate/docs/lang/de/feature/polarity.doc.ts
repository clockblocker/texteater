import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const nichtNegativeParticle = specExample("de/das-ist-nicht-mein-problem");

const document = defineLanguageOverlayPage({
	description: "German Polarity.",
	examples: [nichtNegativeParticle],
	order: 8032,
	title: "Polarity",
});

export default document;
