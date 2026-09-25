import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../../lib/docs/spec-examples.ts";

const mitgebrachtParticiple = specExample(
	"de/die-peitsche-hat-er-mitgebracht",
	1,
);
const hinauslaufenInfinitive = specExample("de/er-versucht-hinauszulaufen");
const passAufImperative = specExample("de/pass-auf-dich-auf");

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
In German, \`HasSepPrefix\` is used on Lemmas whose lexical analysis includes a separable verbal prefix.

The current German concrete schema exposes this feature on [\`VERB\`](/de/entity/lemma/lexeme/verb/) Lemmas and on German [\`Prefix\`](/de/entity/lemma/morpheme/prefix/) morpheme Lemmas. The value is the prefix string itself, such as \`"auf"\`, \`"mit"\`, or \`"hinaus"\`.

German attestations in this repository show the feature across multiple surface patterns:

- attached in infinitives, as in \`hinauszulaufen\`
- attached in participles, as in \`mitgebracht\`
- split across the clause, as in \`Pass ... auf\`
`,
});

export default document;
