import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Style feature.",
	family: "feature",
	leaf: "Style",
	order: 18037.5,
	subject: "Style",
	title: "Style",
	body: `
\`Style\` marks the register, sublanguage, or stylistic coloring associated with a word or form.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Style.html) feature with eight public values. The abstract feature can be lexical, set on a Lemma, or inflectional, set on a surface. A language-specific schema decides which, if it exposes the feature at all.

## Values

- \`Arch\`: archaic or obsolete
- \`Coll\`: colloquial
- \`Expr\`: expressive or emotional
- \`Form\`: formal or literary
- \`Rare\`: rare
- \`Slng\`: slang
- \`Vrnc\`: vernacular
- \`Vulg\`: vulgar

If \`style\` is absent or \`undefined\`, Dumling records no style value for that Lemma or surface.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`style\` when the lexical item or form itself belongs to a marked register, such as archaic, colloquial, slang, vernacular, or expressive usage.

\`Style\` is not a topic label or social judgment. It records how the item is situated in the grammar or lexicon of a speech community, not whether the sentence content is casual or formal overall.
`,
		},
		{
			heading: "Layering",
			body: `
Some languages treat style mostly as a lexical property of particular Lemmas, while others can expose it through recurrent form-level alternations.

That is why the abstract feature is not tied to one layer only: a language pack can place it on the Lemma when the stylistic value is part of lexical identity, or on the surface when the stylistic distinction is expressed inflectionally or orthographically.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract \`Style\` enum exposes all eight UD values above.

No concrete language route uses \`style\`, so no Dumling Lemma or surface carries a style value today. Where Dumling should record archaism and register is an open question, parked on [#727](https://github.com/clockblocker/texteater/issues/727).
`,
		},
	],
});

export default document;
