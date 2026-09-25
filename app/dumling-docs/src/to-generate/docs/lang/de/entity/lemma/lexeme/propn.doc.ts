import { defineLanguageOverlayPage } from "../../../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as struwwelpeter } from "../../../../../../attestations/de/attestation/Sieh_einmal_hier_steht_er_pfui_der_Struwwelpeter/Sieh_einmal_hier_steht_er_pfui_der_[Struwwelpeter].ts";
import { attestation as berlin } from "../../../../../../attestations/de/attestation/Viele_vermissen_das_alte_Berlin/Viele_vermissen_das_alte_[Berlin].ts";

const document = defineLanguageOverlayPage({
	description: "German PROPN.",
	examples: [struwwelpeter, berlin],
	family: "pos",
	leaf: "PROPN",
	order: 4005,
	subject: "PROPN",
	title: "PROPN",
});

export default document;
