import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as mussPresentAuxiliary } from "../../../../attestations/de/selection/Er_muss_heute_arbeiten/Er_[muss]_heute_arbeiten.ts";

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
