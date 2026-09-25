import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as derArticle } from "../../../../attestations/de/attestation/Viele_vermissen_das_alte_Berlin/Viele_vermissen_[das]_alte_Berlin.ts";

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
