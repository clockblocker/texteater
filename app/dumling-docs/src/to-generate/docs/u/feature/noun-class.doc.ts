import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal NounClass feature.",
	family: "feature",
	leaf: "NounClass",
	order: 18026.5,
	subject: "NounClass",
	title: "NounClass",
	body: `
\`NounClass\` marks a noun class associated with a [\`Lemma\`](/u/entity/lemma/) or with agreement targeting that noun.

It is a [UD-compliant](https://universaldependencies.org/u/feat/NounClass.html) feature with 35 public values. In Dumling, it will usually belong in \`lemma.inherentFeatures\`, but it may also surface in \`surface.inflectionalFeatures\` where noun-class agreement is morphologically expressed on the concrete form.

## Values

### Bantu values

- \`Bantu1\`: singular; persons
- \`Bantu2\`: plural; persons
- \`Bantu3\`: singular; plants, thin objects
- \`Bantu4\`: plural; plants, thin objects
- \`Bantu5\`: singular; fruits, round objects, paired things
- \`Bantu6\`: plural; fruits, round objects, paired things
- \`Bantu7\`: singular; things, diminutives
- \`Bantu8\`: plural; things, diminutives
- \`Bantu9\`: singular; animals, things
- \`Bantu10\`: plural; animals, things
- \`Bantu11\`: long thin objects, natural phenomena, abstracts
- \`Bantu12\`: singular; small things, diminutives
- \`Bantu13\`: plural or mass; small amount of mass
- \`Bantu14\`: plural; diminutives
- \`Bantu15\`: verbal nouns, infinitives
- \`Bantu16\`: definite location; close to something
- \`Bantu17\`: indefinite location, direction, movement
- \`Bantu18\`: definite location; inside something
- \`Bantu19\`: little bit of; pejorative plural
- \`Bantu20\`: singular; augmentatives
- \`Bantu21\`: singular; augmentatives, derogatives
- \`Bantu22\`: plural; augmentatives
- \`Bantu23\`: location with place names

### Wolof values

- \`Wol1\`: Wolof noun class 1/\`k\`; singular human
- \`Wol2\`: Wolof noun class 2; plural human
- \`Wol3\`: Wolof noun class 3/\`g\`; singular
- \`Wol4\`: Wolof noun class 4/\`j\`; singular
- \`Wol5\`: Wolof noun class 5/\`b\`; singular
- \`Wol6\`: Wolof noun class 6/\`m\`; singular
- \`Wol7\`: Wolof noun class 7/\`l\`; singular
- \`Wol8\`: Wolof noun class 8/\`y\`; plural non-human
- \`Wol9\`: Wolof noun class 9/\`s\`; singular
- \`Wol10\`: Wolof noun class 10/\`w\`; singular
- \`Wol11\`: Wolof noun class 11/\`f\`; location
- \`Wol12\`: Wolof noun class 12/\`n\`; manner

If \`nounClass\` is absent or \`undefined\`, no noun-class value is being asserted for that lemma or surface.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`nounClass\` when a language has a stable noun-class system and the class distinction is morphologically relevant.

Put the value on \`lemma.inherentFeatures.nounClass\` when the class is a lexical property of the noun. Put the value on \`surface.inflectionalFeatures.nounClass\` when the attested surface form carries noun-class agreement morphology.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature catalog includes \`nounClass\`, but this repository currently ships no built-in attestations or language-specific overlay pages that demonstrate it in use.
`,
		},
	],
});

export default document;
