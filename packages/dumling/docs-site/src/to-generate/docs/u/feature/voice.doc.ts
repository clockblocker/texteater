import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as writtenPassiveParticiple } from "../../../attestations/en/selection/The_note_was_written_in_pencil/The_note_was_[written]_in_pencil.ts";
import { attestation as nichtavPassiveVerb } from "../../../attestations/he/selection/הדוח_נכתב_אתמול/הדוח_[נכתב]_אתמול.ts";
import { attestation as hitkatevMiddleVerb } from "../../../attestations/he/selection/הוא_התכתב_עם_המרצה/הוא_[התכתב]_עם_המרצה.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Voice feature.",
	family: "feature",
	leaf: "Voice",
	order: 18040.5,
	subject: "Voice",
	title: "Voice",
	body: `
\`Voice\` marks how the event structure is grammatically oriented, for example toward an actor, patient, middle reading, or other voice category.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Voice.html) feature with ten public values. In Dumling, \`voice\` normally belongs in \`surface.inflectionalFeatures\`.

## Values

- \`Act\`: active or actor-focus voice
- \`Antip\`: antipassive
- \`Bfoc\`: beneficiary-focus voice
- \`Cau\`: causative voice
- \`Dir\`: direct voice
- \`Inv\`: inverse voice
- \`Lfoc\`: location-focus voice
- \`Mid\`: middle voice
- \`Pass\`: passive or patient-focus voice
- \`Rcp\`: reciprocal voice

If \`surface.inflectionalFeatures.voice\` is absent or \`undefined\`, Dumling records no voice value for that surface.
`,
	examples: [
		writtenPassiveParticiple,
		nichtavPassiveVerb,
		hitkatevMiddleVerb,
	],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`voice\` on verbal surfaces when the morphology of the form itself encodes an active, passive, middle, reciprocal, or other voice distinction recognized by the language-specific schema.

The exact interpretation depends on the language. In some languages the main contrast is active vs. passive; in others, voice also covers richer systems such as antipassive or focus-based alternations.
`,
		},
		{
			heading: "Related features",
			body: `
\`Voice\` is distinct from [\`Reflex\`](/u/feature/reflex/), which marks reflexive pronouns, and from [\`HebBinyan\`](/u/feature/heb-binyan/), which records a Hebrew verb's lexical stem class.

A language may have lexical patterns that correlate with voice, but \`voice\` itself is used when the surface analysis needs an explicit grammatical value.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract \`Voice\` enum exposes all ten UD values above.

Current concrete Dumling schemas expose smaller subsets. English and German currently use only \`Pass\`, while Hebrew currently exposes \`Act\`, \`Mid\`, and \`Pass\`. The current ID codec serializes those same three values.
`,
		},
	],
});

export default document;
