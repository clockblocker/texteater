import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as lookUpVerb } from "../../../attestations/en/selection/Please_look_it_up_before_replying/Please_[look]_it_up_before_replying.ts";
import { attestation as takeOffVerb } from "../../../attestations/en/selection/The_plane_will_take_off_at_dawn/The_plane_will_[take]_off_at_dawn.ts";

const document = defineUniversalConceptPage({
	description:
		"Custom Dumling reference for the Phrasal feature on phrasal lemmas.",
	family: "feature",
	leaf: "Phrasal",
	order: 18031.5,
	subject: "Phrasal",
	title: "Phrasal",
	body: `
\`Phrasal\` marks that a [\`Lemma\`](/u/entity/lemma/) is stored as a phrasal lexical item.

It is a Dumling-specific feature with one public value and belongs in \`lemma.inherentFeatures\`.

## Values

- \`Yes\`: the lemma is marked as phrasal

If \`lemma.inherentFeatures.phrasal\` is absent or \`undefined\`, the lemma is treated as not being marked phrasal.
`,
	examples: [takeOffVerb, lookUpVerb],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`phrasal: "Yes"\` when the lemma's lexical identity is a multiword phrasal item rather than a simple one-word verb.

In current Dumling usage this marks English phrasal verbs such as \`take off\` and \`look up\`, where the particle is part of the stored lexical entry.
`,
		},
		{
			heading: "Layer",
			body: `
\`Phrasal\` is a lemma-level fact about the citation entry.

Selections may include only the verbal component, as in \`take\` from \`take off\` or \`look\` from \`look ... up\`, while still pointing back to a phrasal lemma whose full normalized surface is multiword.
`,
		},
		{
			heading: "Distinguish From Other Features",
			body: `
Do not use \`phrasal\` for ordinary verb-plus-preposition government. That is modeled by [\`HasGovPrep\`](/u/feature/has-gov-prep/).

Do not use it for German separable prefixes either. Those are modeled by [\`HasSepPrefix\`](/u/feature/has-sep-prefix/).
`,
		},
		{
			heading: "Current Dumling support",
			body: `
Current concrete Dumling schemas expose \`phrasal\` on English [\`VERB\`](/u/entity/lemma/lexeme/verb/) lemmas.
`,
		},
	],
});

export default document;
