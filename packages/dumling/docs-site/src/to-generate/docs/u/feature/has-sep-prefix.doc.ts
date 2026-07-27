import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as hinauslaufenInfinitive } from "../../../attestations/de/selection/Er_versucht_hinauszulaufen/Er_versucht_[hinauszulaufen].ts";
import { attestation as passAufImperative } from "../../../attestations/de/selection/Pass_auf_dich_auf/[Pass]_auf_dich_auf.ts";

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the HasSepPrefix feature on lemmas with separable prefixes.",
	family: "feature",
	leaf: "HasSepPrefix",
	order: 18023,
	subject: "HasSepPrefix",
	title: "HasSepPrefix",
	body: `
\`HasSepPrefix\` records the canonical separable prefix associated with a [\`Lemma\`](/u/entity/lemma/).

It is a Dumling-specific feature. The value is a non-empty string and belongs in \`lemma.inherentFeatures\`.

## Values

- any non-empty string, such as \`"auf"\`, \`"mit"\`, or \`"hinaus"\`

If \`lemma.inherentFeatures.hasSepPrefix\` is absent or \`undefined\`, the lemma is treated as not having a recorded separable prefix.
`,
	examples: [passAufImperative, hinauslaufenInfinitive],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`hasSepPrefix\` when the lemma's lexical identity includes a detachable prefix that may surface attached in some forms and separated in others.

This lets Dumling keep a single lemma such as \`aufpassen\` or \`hinauslaufen\` while still recording the prefixal component that participates in German separable-verb behavior.
`,
		},
		{
			heading: "Layer",
			body: `
\`HasSepPrefix\` is an inherent lemma-level feature, not an inflectional surface feature.

The actual selected token may show only the stem, only the detached prefix, or a fully attached form, but all of those still point back to the same lemma carrying the same \`hasSepPrefix\` value.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`hasSepPrefix\` in the German pack on [\`VERB\`](/lang/de/entity/lemma/lexeme/verb/) lemmas and on German [\`Prefix\`](/lang/de/entity/lemma/morpheme/prefix/) morpheme lemmas.
`,
		},
	],
});

export default document;
