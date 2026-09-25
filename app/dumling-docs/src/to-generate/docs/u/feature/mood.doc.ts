import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { specExample } from "../../../../lib/docs/spec-examples.ts";

const gehImperative = specExample("de/geh-bitte-nicht-ohne-jacke-raus");
const doesIndicative = specExample("en/does-this-key-open-the-archive");
const wereSubjunctive = specExample("en/if-i-were-you-i-would-wait");
const boUImperative = specExample("he/bou-lekan");

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Mood feature.",
	family: "feature",
	leaf: "Mood",
	order: 18026,
	subject: "Mood",
	title: "Mood",
	body: `
\`Mood\` marks the clause mood of a verbal surface, such as indicative, imperative, or subjunctive.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Mood.html) feature with fourteen public values. In Dumling, \`mood\` normally belongs in \`surface.inflectionalFeatures\`.

## Values

- \`Adm\`: admirative
- \`Cnd\`: conditional
- \`Des\`: desiderative
- \`Imp\`: imperative
- \`Ind\`: indicative, or realis
- \`Int\`: interrogative
- \`Irr\`: irrealis
- \`Jus\`: jussive, or injunctive
- \`Nec\`: necessitative
- \`Opt\`: optative
- \`Pot\`: potential
- \`Prp\`: purposive
- \`Qot\`: quotative
- \`Sub\`: subjunctive, or conjunctive

If \`surface.inflectionalFeatures.mood\` is absent or \`undefined\`, Dumling records no mood value for that surface.
`,
	examples: [doesIndicative, gehImperative, wereSubjunctive, boUImperative],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`mood\` on verbal or auxiliary surfaces when the analysis needs to record how the clause is grammatically presented, for example as a statement, command, wish, or subjunctive alternative.

\`Mood\` is usually an inflectional property of a concrete form, not a stable lexical property of the Lemma, so it normally belongs in \`surface.inflectionalFeatures\` rather than \`Lemma.coreFeatures\`.
`,
		},
		{
			heading: "Related features",
			body: `
\`Mood\` is distinct from [\`Tense\`](/u/feature/tense/), which locates an event in time, and from [\`VerbForm\`](/u/feature/verb-form/), which distinguishes finite forms from infinitives, participles, gerunds, and similar categories.

In practice, \`mood\` is most relevant on finite forms. Non-finite forms usually omit it.
`,
		},
		{
			heading: "Current Dumling support",
			body: `
The abstract \`Mood\` enum mirrors the full UD inventory above. Current concrete Dumling schemas expose only a smaller subset: German and English verbal schemas currently allow \`Imp\`, \`Ind\`, and \`Sub\`, while the current Hebrew verb schema exposes \`Imp\` only.
`,
		},
	],
});

export default document;
