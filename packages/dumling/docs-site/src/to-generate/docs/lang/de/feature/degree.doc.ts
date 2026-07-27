import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as besserenComparativeAdjective } from "../../../../attestations/de/selection/Ich_suche_einen_besseren_Ansatz/Ich_suche_einen_[besseren]_Ansatz.ts";

const document = defineLanguageOverlayPage({
	description: "German Degree.",
	examples: [besserenComparativeAdjective],
	family: "feature",
	leaf: "Degree",
	order: 8015,
	subject: "Degree",
	title: "Degree",
});

export default document;
