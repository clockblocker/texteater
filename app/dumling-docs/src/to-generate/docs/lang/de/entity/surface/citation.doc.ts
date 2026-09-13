import { defineLanguageOverlayPage } from "../../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description: "German Citation.",
	family: "surface",
	leaf: "Citation",
	order: 2001,
	subject: "Citation",
	title: "Grundform",
	body: "Grundform is a Surface assessment returned by `checkIfGrundform`. Matching canonical spelling and the represented grammatical features can establish it; insufficient evidence returns an assessment error. The result is not stored as a Surface tag.",
});

export default document;
