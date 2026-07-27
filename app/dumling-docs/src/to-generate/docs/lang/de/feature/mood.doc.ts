import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as gehImperative } from "../../../../attestations/de/selection/Geh_bitte_nicht_ohne_Jacke_raus/[Geh]_bitte_nicht_ohne_Jacke_raus.ts";

const document = defineLanguageOverlayPage({
	description: "German Mood.",
	examples: [gehImperative],
	family: "feature",
	leaf: "Mood",
	order: 8026,
	subject: "Mood",
	title: "Mood",
});

export default document;
