import { defineLanguageOverlayPage } from "../../../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../../../lib/docs/spec-examples.ts";

const struwwelpeter = specExample("de/sieh-einmal-hier-steht-er", 6);
const berlin = specExample("de/viele-vermissen-das-alte-berlin");

const document = defineLanguageOverlayPage({
	description: "German PROPN.",
	examples: [struwwelpeter, berlin],
	order: 4005,
	title: "PROPN",
});

export default document;
