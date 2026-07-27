import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as erinnertVerb } from "../../../attestations/de/selection/Sie_erinnert_sich_an_den_Geruch/Sie_[erinnert]_sich_an_den_Geruch.ts";

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the LexicallyReflexive feature on inherently reflexive lemmas.",
	family: "feature",
	leaf: "LexicallyReflexive",
	order: 18025,
	subject: "LexicallyReflexive",
	title: "LexicallyReflexive",
	body: `
\`LexicallyReflexive\` marks that a [\`Lemma\`](/u/entity/lemma/) is lexically reflexive.

It is a Dumling-specific feature with one public value and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Yes\`: the lemma is recorded as lexically reflexive

If \`lemma.inherentFeatures.lexicallyReflexive\` is absent or \`undefined\`, the lemma is treated as not being marked lexically reflexive.
`,
	examples: [erinnertVerb],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`lexicallyReflexive: "Yes"\` when reflexivity is part of the lemma's lexical identity, as with German \`sich erinnern\`.

Do not add it merely because one attested clause happens to contain a reflexive pronoun. The feature is for lexemes whose citation identity already includes reflexive behavior.
`,
		},
		{
			heading: "Layer",
			body: `
\`LexicallyReflexive\` is an inherent lemma-level feature, not an inflectional surface feature.

The selected token may exclude the reflexive element entirely, as in a selection of \`erinnert\` from \`Sie erinnert sich an den Geruch\`, but the lemma still carries the same \`lexicallyReflexive\` value.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`lexicallyReflexive\` on German [\`VERB\`](/u/entity/lemma/lexeme/verb/) lemmas.
`,
		},
	],
});

export default document;
