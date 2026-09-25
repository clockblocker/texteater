import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../lib/docs/spec-examples.ts";

const lookUpVerb = specExample("en/please-look-it-up-before-replying");
const takeOffVerb = specExample("en/the-plane-will-take-off-at-dawn");

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the Phrasal feature on phrasal Lemmas.",
	family: "feature",
	leaf: "Phrasal",
	order: 18031.5,
	subject: "Phrasal",
	title: "Phrasal",
	body: `
\`Phrasal\` marks that a [\`Lemma\`](/u/entity/lemma/) is stored as a phrasal lexical item.

It is a Dumling-specific feature with one public value and belongs in \`Lemma.coreFeatures\`.

## Values

- \`Yes\`: the Lemma is marked as phrasal

If \`Lemma.coreFeatures.phrasal\` is absent or \`undefined\`, the Lemma is treated as not being marked phrasal.
`,
	examples: [takeOffVerb, lookUpVerb],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`phrasal: "Yes"\` when the Lemma's lexical identity is a multiword phrasal item rather than a simple one-word verb.

In current Dumling usage this marks English phrasal verbs such as \`take off\` and \`look up\`, where the particle is part of the stored Lemma.
`,
		},
		{
			heading: "Layer",
			body: `
\`Phrasal\` is a core fact about the Lemma.

Partial Attestations may include only the verbal component, as in \`take\` from \`take off\` or \`look\` from \`look ... up\`, while still pointing back to a phrasal Lemma whose full normalized surface is multiword.
`,
		},
		{
			heading: "Distinguish From Other Features",
			body: `
Do not use \`phrasal\` for ordinary verb-plus-preposition government. A governed preposition is valency, not identity, so it stays out of the Lemma and its Canonical Form. In "We depend on accurate labels." the Lemma is \`depend\`, not a phrasal \`depend on\`: \`on\` stays an [\`Attestation\`](/u/entity/attestation/) member, and its government belongs to the Reading's Valency Frame, not to a Lemma feature.

Do not use it for German separable prefixes either. Those are modeled by [\`HasSepPrefix\`](/u/feature/has-sep-prefix/).
`,
		},
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`phrasal\` on English [\`VERB\`](/u/entity/lemma/lexeme/verb/) Lemmas.
`,
		},
	],
});

export default document;
