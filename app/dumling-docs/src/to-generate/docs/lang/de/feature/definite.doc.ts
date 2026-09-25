import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as derArticle } from "../../../../attestations/de/attestation/Sieh_einmal_hier_steht_er_pfui_der_Struwwelpeter/Sieh_einmal_hier_steht_er_pfui_[der]_Struwwelpeter.ts";

const document = defineLanguageOverlayPage({
	description: "German Definite.",
	examples: [derArticle],
	family: "feature",
	leaf: "Definite",
	order: 8014,
	subject: "Definite",
	title: "Definite",
});

export default document;
