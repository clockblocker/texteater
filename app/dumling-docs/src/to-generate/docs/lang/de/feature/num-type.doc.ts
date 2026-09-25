import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const fuenftenOrdinalAdjective = specExample(
	"de/er-wog-vielleicht-ein-halbes-lot",
	3,
);

const document = defineLanguageOverlayPage({
	description: "German NumType.",
	examples: [fuenftenOrdinalAdjective],
	family: "feature",
	leaf: "NumType",
	order: 8029,
	subject: "NumType",
	title: "NumType",
});

export default document;
