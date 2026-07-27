import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as mitgebrachtParticiple } from "../../../../attestations/de/selection/Die_Peitsche_hat_er_mitgebrachtund_nimmt_sie_sorglich_sehr_in_acht/Die_Peitsche_hat_er_[mitgebracht]und_nimmt_sie_sorglich_sehr_in_acht.ts";
import { attestation as hinauslaufenInfinitive } from "../../../../attestations/de/selection/Er_versucht_hinauszulaufen/Er_versucht_[hinauszulaufen].ts";
import { attestation as passAufImperative } from "../../../../attestations/de/selection/Pass_auf_dich_auf/[Pass]_auf_dich_auf.ts";

const document = defineLanguageOverlayPage({
	description: "German HasSepPrefix.",
	examples: [
		passAufImperative,
		mitgebrachtParticiple,
		hinauslaufenInfinitive,
	],
	family: "feature",
	leaf: "HasSepPrefix",
	order: 8023,
	subject: "HasSepPrefix",
	title: "HasSepPrefix",
	body: `
In German, \`HasSepPrefix\` is used on lemmas whose lexical analysis includes a separable verbal prefix.

The current German concrete schema exposes this feature on [\`VERB\`](/lang/de/entity/lemma/lexeme/verb/) lemmas and on German [\`Prefix\`](/lang/de/entity/lemma/morpheme/prefix/) morpheme lemmas. The value is the prefix string itself, such as \`"auf"\`, \`"mit"\`, or \`"hinaus"\`.

German attestations in this repository show the feature across multiple surface patterns:

- attached in infinitives, as in \`hinauszulaufen\`
- attached in participles, as in \`mitgebracht\`
- split across the clause, as in \`Pass ... auf\`
`,
});

export default document;
