import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as schlossNeuter } from "../../../attestations/de/attestation/Das_Schloss_über_dem_Fluss_wurde_renoviert/Das_[Schloss]_über_dem_Fluss_wurde_renoviert.ts";
import { attestation as leiterMasculine } from "../../../attestations/de/attestation/Der_Leiter_der_Werkstatt_kam_später/Der_[Leiter]_der_Werkstatt_kam_später.ts";
import { attestation as mutterFeminine } from "../../../attestations/de/attestation/Meine_Mutter_ruft_jeden_Sonntag_an/Meine_[Mutter]_ruft_jeden_Sonntag_an.ts";
import { attestation as atFemininePronoun } from "../../../attestations/he/attestation/רק_את_יודעת/רק_[את]_יודעת.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Gender feature.",
	family: "feature",
	leaf: "Gender",
	order: 18019,
	subject: "Gender",
	title: "Gender",
	body: `
\`Gender\` marks grammatical gender.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Gender.html) feature with four public values. In Dumling, it may belong either in \`Lemma.coreFeatures\` for lexemes with lexical gender or in \`surface.inflectionalFeatures\` for inflected forms that show gender agreement.

## Values

- \`Com\`: common gender
- \`Fem\`: feminine
- \`Masc\`: masculine
- \`Neut\`: neuter

If \`gender\` is absent or \`undefined\`, Dumling records no gender value for that Lemma or surface. Absence should be read as unspecified, not as a claim that the language lacks gender.
`,
	examples: [
		mutterFeminine,
		leiterMasculine,
		schlossNeuter,
		atFemininePronoun,
	],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`gender\` when the language-specific schema exposes a grammatical gender distinction for the relevant lexeme class.

Put the value on \`Lemma.coreFeatures.gender\` when the gender is part of the Lemma identity, as with many nouns and proper nouns.

Put the value on \`surface.inflectionalFeatures.gender\` when a concrete inflected form agrees in gender, as with pronouns, determiners, adjectives, or verbs in languages that inflect for it.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract UD-style enum exposes \`Com\`, \`Fem\`, \`Masc\`, and \`Neut\`.

Current concrete Dumling schemas use narrower subsets. German and English currently expose only \`Fem\`, \`Masc\`, and \`Neut\`, while Hebrew currently exposes only \`Fem\` and \`Masc\`. The current ID codec also serializes only \`Fem\`, \`Masc\`, and \`Neut\`.
`,
		},
	],
});

export default document;
