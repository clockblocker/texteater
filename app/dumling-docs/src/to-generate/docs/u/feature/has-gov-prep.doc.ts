import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as wartetVerb } from "../../../attestations/de/attestation/Er_wartet_auf_den_Nachtbus/Er_[wartet]_auf_den_Nachtbus.ts";
import { attestation as gebetenParticiple } from "../../../attestations/de/attestation/Sie_wurde_um_Geduld_gebeten/Sie_wurde_um_Geduld_[gebeten].ts";
import { attestation as dependOnVerb } from "../../../attestations/en/attestation/We_depend_on_accurate_labels/We_[depend]_on_accurate_labels.ts";

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the HasGovPrep feature on Lemmas with governed prepositions.",
	family: "feature",
	leaf: "HasGovPrep",
	order: 18022,
	subject: "HasGovPrep",
	title: "HasGovPrep",
	body: `
\`HasGovPrep\` records the canonical governed preposition associated with a [\`Lemma\`](/u/entity/lemma/).

It is a Dumling-specific feature. The value is a non-empty string and belongs in \`Lemma.coreFeatures\`.

## Values

- any non-empty string, such as \`"on"\`, \`"auf"\`, or \`"um"\`

If \`Lemma.coreFeatures.hasGovPrep\` is absent or \`undefined\`, the Lemma is treated as not having a recorded governed preposition.
`,
	examples: [dependOnVerb, wartetVerb, gebetenParticiple],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`hasGovPrep\` when the Lemma lexically selects a particular preposition in its complementation pattern, as in English \`depend on\` or German \`warten auf\`.

The preposition is recorded as part of the Lemma's argument-structure behavior even when the selected token itself is only the verb form, as in \`wartet\` or \`gebeten\`.
`,
		},
		{
			heading: "Not The Same As Phrasality",
			body: `
\`HasGovPrep\` does not mean the Lemma is a phrasal verb or that the preposition is a detachable particle.

Use [\`Phrasal\`](/u/feature/phrasal/) for English-style phrasal Lemmas such as \`take off\`, and [\`HasSepPrefix\`](/u/feature/has-sep-prefix/) for German separable-prefix Lemmas such as \`aufpassen\`.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`hasGovPrep\` on English and German [\`VERB\`](/u/entity/lemma/lexeme/verb/) Lemmas.
`,
		},
	],
});

export default document;
