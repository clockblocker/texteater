import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal AdpType feature.",
	family: "feature",
	leaf: "AdpType",
	order: 18011,
	subject: "AdpType",
	title: "AdpType",
	body: `
\`AdpType\` marks the subtype of an adposition [\`Lemma\`](/u/entity/lemma/).

It is a [UD-compliant](https://universaldependencies.org/u/feat/AdpType.html) feature in the Feature Pool, so a route may make it one of its \`Lemma.coreFeatures\`.

## Values

- \`Circ\`: circumposition
- \`Post\`: postposition
- \`Prep\`: preposition
- \`Voc\`: vocative adposition or vocative marker

If \`Lemma.coreFeatures.adpType\` is absent or \`undefined\`, the Lemma is treated as having no recorded adpositional subtype.
`,
	subsections: [
		{
			heading: "Use",
			body: `
Use \`adpType\` on [\`ADP\`](/u/entity/lemma/lexeme/adp/) Lemmas only when the subtype tells two Lemmas apart. Where one adposition stands on either side of its complement, the position is not identity: German \`wegen\` in \`wegen des Sturms\` and \`des Nebels wegen\` is one Lemma, and the sentence shows where it stands.

Do not use \`adpType\` to encode the preposition a verb, adjective, noun or Locution governs. That is not a Lemma-level fact; it is recorded as \`valencyEvidence\` on the [\`Attestation\`](/u/entity/attestation/).
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract feature enum follows UD and includes all four values above. No current concrete Dumling route uses it. German [\`ADP\`](/u/entity/lemma/lexeme/adp/) has no Core Features: the Dumling spec's ADP Case Table lists the positions each German adposition takes, and a German circumposition is a Locution ADP.
`,
		},
	],
});

export default document;
