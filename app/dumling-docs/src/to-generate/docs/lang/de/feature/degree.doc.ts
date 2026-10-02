import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const besserenComparativeAdjective = specExample(
	"de/ich-suche-einen-besseren-ansatz",
);

const document = defineLanguageOverlayPage({
	description: "German Degree.",
	examples: [besserenComparativeAdjective],
	order: 8015,
	title: "Degree",
});

export default document;
