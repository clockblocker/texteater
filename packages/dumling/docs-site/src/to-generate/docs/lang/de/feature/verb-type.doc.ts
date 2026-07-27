import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as mussPresentAuxiliary } from "../../../../attestations/de/selection/Er_muss_heute_arbeiten/Er_[muss]_heute_arbeiten.ts";

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
