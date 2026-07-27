import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Animacy feature.",
	family: "feature",
	leaf: "Animacy",
	order: 18011.1,
	subject: "Animacy",
	title: "Animacy",
	body: `
\`Animacy\` marks an animacy class associated with a noun or with agreement targeting that noun.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Animacy.html) feature with four public values.

In dumling, it usually belongs in \`lemma.inherentFeatures\` for nouns and pronouns whose lexical entry carries animacy. In languages where animacy is also expressed through agreement, the same feature may also surface in \`surface.inflectionalFeatures\`.

## Values

- \`Anim\`: animate
- \`Hum\`: human
- \`Inan\`: inanimate
- \`Nhum\`: non-human

If \`animacy\` is absent or \`undefined\`, no animacy value is being asserted for that lemma or surface.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`Animacy\` when the grammar distinguishes animacy classes morphologically or through agreement.

Different languages expose different contrasts:

- some distinguish only animate vs. inanimate
- some distinguish human vs. non-human
- some distinguish human vs. non-human animate vs. inanimate

\`Hum\` is a subtype of the animate domain. \`Nhum\` can either cover all non-human referents or only non-human animates, depending on whether the language also separately uses \`Inan\`.
`,
		},
	],
});

export default document;
