import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const mutterNoun = specExample("de/meine-mutter-ruft-jeden-sonntag-an");

const document = defineLanguageOverlayPage({
	description: "German Gender.",
	examples: [mutterNoun],
	order: 8019,
	title: "Gender",
});

export default document;
