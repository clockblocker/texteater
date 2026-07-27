import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as kindernPluralNoun } from "../../../../attestations/de/selection/Mit_den_Kindern_ist_es_nie_langweilig/Mit_den_[Kindern]_ist_es_nie_langweilig.ts";

const document = defineLanguageOverlayPage({
	description: "German Number.",
	examples: [kindernPluralNoun],
	family: "feature",
	leaf: "Number",
	order: 8027,
	subject: "Number",
	title: "Number",
});

export default document;
