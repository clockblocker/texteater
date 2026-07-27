import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as vieleIndefinitePronoun } from "../../../../attestations/de/selection/Viele_kamen_zu_spät/[Viele]_kamen_zu_spät.ts";

const document = defineLanguageOverlayPage({
	description: "German PronType.",
	examples: [vieleIndefinitePronoun],
	family: "feature",
	leaf: "PronType",
	order: 8035,
	subject: "PronType",
	title: "PronType",
});

export default document;
