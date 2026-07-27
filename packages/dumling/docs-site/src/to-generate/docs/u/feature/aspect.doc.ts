import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Aspect feature.",
	family: "feature",
	leaf: "Aspect",
	order: 18011.5,
	subject: "Aspect",
	title: "Aspect",
	body: `
\`Aspect\` marks how an event is viewed in time: as ongoing, completed, habitual, repeated, prospective, or otherwise structured.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Aspect.html) feature with six public values.

## Values

- \`Hab\`: habitual aspect
- \`Imp\`: imperfect aspect
- \`Iter\`: iterative / frequentative aspect
- \`Perf\`: perfect aspect
- \`Prog\`: progressive aspect
- \`Prosp\`: prospective aspect
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`aspect\` when the analysis needs to record how the event unfolds in time, not just when it is anchored in time.

\`Aspect\` is distinct from \`Tense\`: tense locates an event relative to a reference point, while aspect describes its internal temporal contour, such as whether it is completed, ongoing, habitual, or repeated.
`,
		},
		{
			heading: "Layering",
			body: `
In dumling, \`aspect\` may belong in different places depending on the language and analysis:

- use \`lemma.inherentFeatures.aspect\` when aspect is lexical and part of the lemma identity
- use \`surface.inflectionalFeatures.aspect\` when aspect is realized on a concrete inflected form

This matches UD practice, where aspect is often verbal but may be lexical in some languages and inflectional in others.
`,
		},
		{
			heading: "Current German Scope",
			body: `
The current German pack uses only a narrow inflectional slice of this feature: \`aspect: "Perf"\` on participial verbal surfaces where that distinction matters.
`,
		},
	],
});

export default document;
