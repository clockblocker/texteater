import { defineUniversalConceptPage } from "../../../../lib/docs/source-mirrored-doc-pages.ts";
import { attestation as bitteFolgenSieIhremAnsprechpartnerDative } from "../../../attestations/de/selection/Bitte_folgen_Sie_Ihrem_Ansprechpartner/Bitte_folgen_Sie_[Ihrem]_Ansprechpartner.ts";
import { attestation as themAccusative } from "../../../attestations/en/selection/I_emailed_them_yesterday/I_emailed_[them]_yesterday.ts";
import { attestation as shelGenitive } from "../../../attestations/he/selection/הספר_של_נועה_נשאר_כאן/הספר_[של]_נועה_נשאר_כאן.ts";
import { attestation as kaasherTemporal } from "../../../attestations/he/selection/נמשיך_כאשר_כולם_יגיעו/נמשיך_[כאשר]_כולם_יגיעו.ts";

const document = defineUniversalConceptPage({
	description: "UD-style reference for the universal Case feature.",
	family: "feature",
	leaf: "Case",
	order: 18012,
	subject: "Case",
	title: "Case",
	body: `
\`Case\` marks grammatical or adpositional case.

It is a [UD-compliant](https://universaldependencies.org/u/feat/Case.html) feature with many public values. In Dumling, it may belong either in \`surface.inflectionalFeatures\` for case-inflected forms or in \`lemma.inherentFeatures\` for lexemes whose case value is lexicalized.

## Values

- \`Acc\`: accusative
- \`Abe\`: abessive, caritive, or privative
- \`Ben\`: benefactive or destinative
- \`Cau\`: causative, motivative, or purposive
- \`Cmp\`: comparative
- \`Cns\`: considerative
- \`Com\`: comitative or associative
- \`Dat\`: dative
- \`Dis\`: distributive
- \`Equ\`: equative
- \`Gen\`: genitive
- \`Ins\`: instrumental or instructive
- \`Par\`: partitive
- \`Tem\`: temporal
- \`Abl\`: ablative or adelative
- \`Add\`: additive
- \`Ade\`: adessive
- \`All\`: allative or adlative
- \`Del\`: delative or superelative
- \`Ela\`: elative or inelative
- \`Ess\`: essive or prolative
- \`Ill\`: illative or inlative
- \`Ine\`: inessive
- \`Lat\`: lative or directional allative
- \`Loc\`: locative
- \`Nom\`: nominative
- \`Per\`: perlative
- \`Sbe\`: subelative
- \`Sbl\`: sublative
- \`Spl\`: superlative
- \`Sub\`: subessive
- \`Sup\`: superessive
- \`Ter\`: terminative or terminal allative

If \`case\` is absent or \`undefined\`, Dumling records no case value for that lemma or surface. Absence should be read as unspecified, not automatically as caseless.
`,
	examples: [
		themAccusative,
		bitteFolgenSieIhremAnsprechpartnerDative,
		shelGenitive,
		kaasherTemporal,
	],
	subsections: [
		{
			heading: "Use",
			body: `
Use \`case\` when the language-specific schema exposes a case distinction for that lexeme class.

Put the value on \`surface.inflectionalFeatures.case\` when the attested form is an inflected surface such as English \`them\` or German \`Ihrem\`.

Put the value on \`lemma.inherentFeatures.case\` when the lexeme itself carries a fixed case-like function, such as Hebrew \`של\` with \`Gen\` or Hebrew \`כאשר\` with \`Tem\`.

Concrete language schemas usually expose only a subset of the universal inventory, so do not force values that the local type definition does not allow.
`,
		},
	],
});

export default document;
