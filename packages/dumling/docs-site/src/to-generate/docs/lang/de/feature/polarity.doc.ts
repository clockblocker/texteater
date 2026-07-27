import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as nichtNegativeParticle } from "../../../../attestations/de/selection/Das_ist_nicht_mein_Problem/Das_ist_[nicht]_mein_Problem.ts";

const document = defineLanguageOverlayPage({
	description: "German Polarity.",
	examples: [nichtNegativeParticle],
	family: "feature",
	leaf: "Polarity",
	order: 8032,
	subject: "Polarity",
	title: "Polarity",
});

export default document;
