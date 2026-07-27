import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as uebergesetztPerfectParticiple } from "../../../../attestations/de/selection/Der_Fährmann_hat_uns_übergesetzt/Der_Fährmann_hat_uns_[übergesetzt].ts";

const document = defineLanguageOverlayPage({
	description: "German Aspect.",
	examples: [uebergesetztPerfectParticiple],
	family: "feature",
	leaf: "Aspect",
	order: 8011.5,
	subject: "Aspect",
	title: "Aspect",
});

export default document;
