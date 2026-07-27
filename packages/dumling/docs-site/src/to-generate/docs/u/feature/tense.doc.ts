import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as doesPresentAuxiliary } from "../../../attestations/en/selection/Does_this_key_open_the_archive/[Does]_this_key_open_the_archive.ts";
import { attestation as nichtavPastVerb } from "../../../attestations/he/selection/הדוח_נכתב_אתמול/הדוח_[נכתב]_אתמול.ts";
import { attestation as ochalFutureVerb } from "../../../attestations/he/selection/מחר_אוכל_מוקדם/מחר_[אוכל]_מוקדם.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Tense feature.",
	family: "feature",
	leaf: "Tense",
	order: 18038.5,
	subject: "Tense",
	title: "Tense",
	body: `
\`Tense\` marks when an event is located in time relative to a reference point.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Tense.html) feature with five public values. In Dumling, \`tense\` normally belongs in \`surface.inflectionalFeatures\`.

## Values

- \`Fut\`: future tense
- \`Imp\`: imperfect tense
- \`Past\`: past tense, preterite, or aorist
- \`Pqp\`: pluperfect
- \`Pres\`: present or non-past tense

If \`surface.inflectionalFeatures.tense\` is absent or \`undefined\`, Dumling records no tense value for that surface.
`,
	examples: [doesPresentAuxiliary, nichtavPastVerb, ochalFutureVerb],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`tense\` on verbal or auxiliary surfaces when the analysis needs to record how the form anchors the event in time.

\`Tense\` is distinct from [\`Aspect\`](/u/feature/aspect/): tense places the event relative to a reference point, while aspect describes its internal temporal contour.
`,
		},
		{
			heading: "Single-word scope",
			body: `
\`Tense\` is a word-level feature, not a full clause-level tense analysis.

Periphrastic constructions may express a tense interpretation without any one participating word carrying a special dedicated tense value. In such cases, Dumling records the morphology of the individual surface rather than forcing a clausal tense label onto a single token.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract \`Tense\` enum exposes \`Fut\`, \`Imp\`, \`Past\`, \`Pqp\`, and \`Pres\`.

Current concrete Dumling schemas expose only subsets of that inventory. English and German currently use \`Past\` and \`Pres\`, while Hebrew currently uses \`Fut\` and \`Past\`. The current ID codec serializes \`Fut\`, \`Past\`, and \`Pres\`.
`,
		},
	],
});

export default document;
