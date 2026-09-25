import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const besserenComparativeAdjective = specExample(
	"de/ich-suche-einen-besseren-ansatz",
);

const document = defineLanguageOverlayPage({
	description: "German Degree.",
	examples: [besserenComparativeAdjective],
	family: "feature",
	leaf: "Degree",
	order: 8015,
	subject: "Degree",
	title: "Degree",
});

export default document;
