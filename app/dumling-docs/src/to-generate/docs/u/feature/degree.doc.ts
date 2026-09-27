import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../lib/docs/spec-examples.ts";

const positiveDegree = specExample("de/als-grundform-wird-mild-angegeben");
const superlativeDegree = specExample("en/she-performed-best-under-pressure");
const comparativeDegree = specExample("en/this-is-the-better-option");

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Degree feature.",
	family: "feature",
	leaf: "Degree",
	order: 18015,
	subject: "Degree",
	title: "Degree",
	body: `
\`Degree\` marks degree on scalar items such as adjectives and adverbs.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Degree.html) feature with seven public values and belongs in \`surface.inflectionalFeatures\`.

## Values

- \`Abs\`: absolute superlative
- \`Aug\`: augmentative
- \`Cmp\`: comparative
- \`Dim\`: diminutive
- \`Equ\`: equative
- \`Pos\`: positive or base degree
- \`Sup\`: superlative

Whether a German or English ADV or ADJ Surface marks Degree follows from its Lemma's \`comparable\` Core Feature (ADR 0042). A comparable Lemma's Surface always marks it, \`Pos\` in a citation (\`mild\`) included. A non-comparable Lemma's Surface (\`hier\`, \`tot\`) never does.
`,
	examples: [comparativeDegree, superlativeDegree, positiveDegree],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`degree\` on every Surface of a comparable Lemma: \`Pos\` for the base form, \`Cmp\` and \`Sup\` for its comparison forms, suppletive ones included (\`gut\` → \`besser\`, \`good\` → \`better\`). Leave it out on a non-comparable Lemma's Surface.

In Dumling, \`Degree\` is modeled on the inflected surface rather than the Lemma, because contrasts such as \`good\` / \`better\` / \`best\` are different surface realizations of the same lexical item.
`,
		},
		{
			heading: "Scope",
			body: `
\`Degree\` is most common on [\`ADJ\`](/u/entity/lemma/lexeme/adj/) and [\`ADV\`](/u/entity/lemma/lexeme/adv/) surfaces, but the full UD inventory also includes derivational-style values such as \`Aug\` and \`Dim\` for languages whose annotation schemes use them.
`,
		},
	],
});

export default document;
