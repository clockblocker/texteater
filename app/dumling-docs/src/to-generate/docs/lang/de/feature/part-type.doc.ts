import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const zuInfinitivalParticle = specExample("de/das-ist-schwer-zu-erklaeren");

const document = defineLanguageOverlayPage({
	description: "German PartType.",
	examples: [zuInfinitivalParticle],
	family: "feature",
	leaf: "PartType",
	order: 8030,
	subject: "PartType",
	title: "PartType",
});

export default document;
