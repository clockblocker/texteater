import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as gehImperative } from "../../../../attestations/de/selection/Geh_bitte_nicht_ohne_Jacke_raus/[Geh]_bitte_nicht_ohne_Jacke_raus.ts";

const document = defineLanguageOverlayPage({
	description: "German VerbForm.",
	examples: [gehImperative],
	family: "feature",
	leaf: "VerbForm",
	order: 8039,
	subject: "VerbForm",
	title: "VerbForm",
});

export default document;
