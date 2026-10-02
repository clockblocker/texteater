import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const zuInfinitivalParticle = specExample("de/das-ist-schwer-zu-erklaeren");

const document = defineLanguageOverlayPage({
	description: "German PartType.",
	examples: [zuInfinitivalParticle],
	order: 8030,
	title: "PartType",
});

export default document;
