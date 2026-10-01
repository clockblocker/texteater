import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../lib/docs/spec-examples.ts";

const erinnertVerb = specExample("de/sie-erinnert-sich-an-den-geruch");

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the LexicallyReflexive feature on inherently reflexive Lemmas.",
	family: "feature",
	leaf: "LexicallyReflexive",
	order: 18025,
	subject: "LexicallyReflexive",
	title: "LexicallyReflexive",
	body: `
\`LexicallyReflexive\` marks that a [\`Lemma\`](/u/entity/lemma/) is lexically reflexive and names the case its reflexive takes.

It is a Dumling-specific feature and belongs in \`Lemma.coreFeatures\`.

## Values

- \`Acc\`: the reflexive is accusative, as in German \`sich erinnern\` (\`ich erinnere mich\`)
- \`Dat\`: the reflexive is dative, as in German \`sich etwas vorstellen\` (\`ich stelle mir etwas vor\`)

If \`Lemma.coreFeatures.lexicallyReflexive\` is absent or \`undefined\`, the Lemma is treated as not being marked lexically reflexive.
`,
	examples: [erinnertVerb],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`lexicallyReflexive\` when reflexivity is part of the Lemma's lexical identity, as with German \`sich erinnern\`. The case is fixed per word, so German \`sich vorstellen\` (Acc, 'introduce oneself') and \`sich etwas vorstellen\` (Dat, 'imagine') are two Lemmas, apart from plain \`vorstellen\`.

Do not add it merely because one attested clause happens to contain a reflexive pronoun. The feature is for lexemes whose citation identity already includes reflexive behavior.
`,
		},
		{
			heading: "Layer",
			body: `
\`LexicallyReflexive\` is a core Lemma-level feature, not an inflectional Surface feature.

An overt inherently reflexive pronoun is also an Attestation member, as with \`erinnert sich an\` from \`Sie erinnert sich an den Geruch\`, while the Lemma retains the same \`lexicallyReflexive\` value. A merely contextual reflexive object is not included by this feature.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`lexicallyReflexive\` on German [\`VERB\`](/u/entity/lemma/lexeme/verb/) Lemmas.
`,
		},
	],
});

export default document;
