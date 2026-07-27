import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as gehImperative } from "../../../../attestations/de/selection/Geh_bitte_nicht_ohne_Jacke_raus/[Geh]_bitte_nicht_ohne_Jacke_raus.ts";

const document = defineLanguageOverlayPage({
	description: "German Person.",
	examples: [gehImperative],
	family: "feature",
	leaf: "Person",
	order: 8031,
	subject: "Person",
	title: "Person",
});

export default document;
