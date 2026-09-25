import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const aufPreposition = specExample("de/das-rote-band-lag-auf-dem-geschenk", 2);
const entlangPostposition = specExample("de/wir-liefen-den-fluss-entlang");

const document = defineLanguageOverlayPage({
	description: "German AdpType.",
	examples: [aufPreposition, entlangPostposition],
	family: "feature",
	leaf: "AdpType",
	order: 8011,
	subject: "AdpType",
	title: "AdpType",
	body: `
In German, \`AdpType\` is currently used on [\`ADP\`](/de/entity/lemma/lexeme/adp/) Lemmas to distinguish ordinary prepositions from postpositions and, when needed, circumpositions.

The German concrete schema currently allows \`Circ\`, \`Post\`, and \`Prep\`. The repository's verified attestations currently show \`Prep\` and \`Post\`.
`,
});

export default document;
