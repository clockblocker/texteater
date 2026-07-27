import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as zuInfinitivalParticle } from "../../../../attestations/de/selection/Das_ist_schwer_zu_erklären/Das_ist_schwer_[zu]_erklären.ts";

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
