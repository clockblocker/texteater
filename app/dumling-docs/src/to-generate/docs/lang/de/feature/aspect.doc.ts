import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const uebergesetztPerfectParticiple = specExample(
	"de/der-faehrmann-hat-uns-uebergesetzt",
);

const document = defineLanguageOverlayPage({
	description: "German Aspect.",
	examples: [uebergesetztPerfectParticiple],
	family: "feature",
	leaf: "Aspect",
	order: 8011.5,
	subject: "Aspect",
	title: "Aspect",
});

export default document;
