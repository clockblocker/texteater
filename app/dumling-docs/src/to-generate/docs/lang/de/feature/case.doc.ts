import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as ihremPoliteDeterminer } from "../../../../attestations/de/selection/Bitte_folgen_Sie_Ihrem_Ansprechpartner/Bitte_folgen_Sie_[Ihrem]_Ansprechpartner.ts";

const document = defineLanguageOverlayPage({
	description: "German Case.",
	examples: [ihremPoliteDeterminer],
	family: "feature",
	leaf: "Case",
	order: 8012,
	subject: "Case",
	title: "Case",
});

export default document;
