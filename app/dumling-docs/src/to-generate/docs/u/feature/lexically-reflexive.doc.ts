import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as erinnertVerb } from "../../../attestations/de/attestation/Sie_erinnert_sich_an_den_Geruch/Sie_[erinnert]_sich_an_den_Geruch.ts";

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the LexicallyReflexive feature on inherently reflexive Lemmas.",
	family: "feature",
	leaf: "LexicallyReflexive",
	order: 18025,
	subject: "LexicallyReflexive",
	title: "LexicallyReflexive",
	body: `
\`LexicallyReflexive\` marks that a [\`Lemma\`](/u/entity/lemma/) is lexically reflexive.

It is a Dumling-specific feature with one public value and belongs in \`Lemma.coreFeatures\`.

## Values

- \`Yes\`: the Lemma is recorded as lexically reflexive

If \`Lemma.coreFeatures.lexicallyReflexive\` is absent or \`undefined\`, the Lemma is treated as not being marked lexically reflexive.
`,
	examples: [erinnertVerb],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`lexicallyReflexive: "Yes"\` when reflexivity is part of the Lemma's lexical identity, as with German \`sich erinnern\`.

Do not add it merely because one attested clause happens to contain a reflexive pronoun. The feature is for lexemes whose citation identity already includes reflexive behavior.
`,
		},
		{
			heading: "Layer",
			body: `
\`LexicallyReflexive\` is a core Lemma-level feature, not an inflectional Surface feature.

The attested members may exclude the reflexive element entirely, as with \`erinnert\` from \`Sie erinnert sich an den Geruch\`, but the Lemma still carries the same \`lexicallyReflexive\` value.
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
