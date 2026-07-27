import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as dichReflexivePronoun } from "../../../../attestations/de/selection/Pass_auf_dich_auf/Pass_auf_[dich]_auf.ts";

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
