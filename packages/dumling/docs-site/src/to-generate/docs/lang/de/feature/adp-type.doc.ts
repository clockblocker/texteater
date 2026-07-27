import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as aufPreposition } from "../../../../attestations/de/selection/Das_rote_Band_lag_auf_dem_Geschenk/Das_rote_Band_lag_[auf]_dem_Geschenk.ts";
import { attestation as entlangPostposition } from "../../../../attestations/de/selection/Wir_liefen_den_Fluss_entlang/Wir_liefen_den_Fluss_[entlang].ts";

const document = defineLanguageOverlayPage({
	description: "German AdpType.",
	examples: [aufPreposition, entlangPostposition],
	family: "feature",
	leaf: "AdpType",
	order: 8011,
	subject: "AdpType",
	title: "AdpType",
	body: `
In German, \`AdpType\` is currently used on [\`ADP\`](/lang/de/entity/lemma/lexeme/adp/) lemmas to distinguish ordinary prepositions from postpositions and, when needed, circumpositions.

The German concrete schema currently allows \`Circ\`, \`Post\`, and \`Prep\`. The repository's verified attestations currently show \`Prep\` and \`Post\`.
`,
});

export default document;
