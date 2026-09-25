import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const bvgAbbreviation = specExample("de/in-berlin-betreibt-die-bvg-die-u-bahn");

const document = defineLanguageOverlayPage({
	description: "German Abbr.",
	examples: [bvgAbbreviation],
	family: "feature",
	leaf: "Abbr",
	order: 8010,
	subject: "Abbr",
	title: "Abbr",
});

export default document;
