import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as mutterNoun } from "../../../../attestations/de/selection/Meine_Mutter_ruft_jeden_Sonntag_an/Meine_[Mutter]_ruft_jeden_Sonntag_an.ts";

const document = defineLanguageOverlayPage({
	description: "German Gender.",
	examples: [mutterNoun],
	family: "feature",
	leaf: "Gender",
	order: 8019,
	subject: "Gender",
	title: "Gender",
});

export default document;
