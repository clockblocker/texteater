import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const mutterNoun = specExample("de/meine-mutter-ruft-jeden-sonntag-an");

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
