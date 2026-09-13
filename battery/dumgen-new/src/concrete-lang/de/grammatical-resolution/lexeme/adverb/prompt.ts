import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/ADV"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/adverb",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/ADV occurrence.
Return its attested Surface analysis and dictionary Lemma. Do not classify the
target or reconsider membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span
marks one supplied member, and members repeats those exact texts in source
order. Both projections are authoritative. Never reject, repair, add, remove,
merge, split, or reorder membership.
</input_contract>

<fixed_route_contract>
Target Classification already established Lexeme/ADV and complete membership.
The operation is total: always resolve the supplied ADV occurrence. Context
distinguishes identity and grammatical features but never changes the route.

Do not reject a target because a homograph can be an adverbially used ADJ, PART,
ADP, or SCONJ elsewhere. Those route distinctions were fixed upstream. Fixed
correlating units such as einerseits … andererseits and teils … teils are one
ADV Lexeme with multiple ordered members. Clause structure and local syntax
identify the ADV reading: for example, locative da in a verb-second matrix
clause differs from subordinate SCONJ da, and a pronominal adverb such as davor
is not the ADP vor. Never move or split members to fit another route.
</fixed_route_contract>

<member_projection>
Return one memberOrthographies and one normalizedMembers value for each supplied
member. Standard includes canonical spelling, ordinary sentence-initial
capitalization, licensed abbreviations, and licensed historical variants. Typo
is only a genuine spelling or inappropriate-casing error.

Preserve each Standard member exactly except lowercase ordinary sentence-initial
capitalization. Repair only Typo members. Preserve morphology and source order;
never replace an attested degree Surface with its Lemma. A licensed Variant
Surface remains Standard occurrence evidence. Sentence-initial capitalization
must not survive in normalizedMembers when the same ADV is ordinarily lowercase
inside a sentence: for example, initial Heute projects to heute while remaining
Standard. Apply this lowercase projection independently of PronType and route
homography.
</member_projection>

<surface_inflection>
Use null inflectionalFeatures for an invariant ADV occurrence, including ordinary clause use,
not only a dictionary label. The ADV codec supports an inflectionalFeatures object only when Degree
is non-null. Use an inflectionalFeatures object exactly for an established graded form:

{ inflectionalFeatures: { degree: "Cmp" | "Pos" | "Sup" } }

Use Cmp for a comparative, Sup for a superlative, and Pos only when context
explicitly establishes the positive member of a degree contrast. Do not emit
an inflectionalFeatures object with a null Degree. Preserve irregular paradigms: lieber is a Cmp
Surface of gern and öfter is a Cmp Surface of oft. A periphrastic superlative
such as am liebsten has two members when both are supplied.

Fixed correlating ADV Lexemes such as einerseits … andererseits and teils …
teils are invariant and therefore use null inflectionalFeatures. Their repeated or separated
anchors remain distinct normalizedMembers in source order.

surface.spelling is Variant only for a licensed spelling variant or conventional
abbreviation such as bißchen or ca; use Canonical otherwise. surfaceFeatures is
null unless the attested use itself is archaic, when it is
{ historicalStatus: "Archaic" }. A licensed historical spelling can be Variant
without making the use archaic.
</surface_inflection>

<route_distinctions>
- A lexical ADV remains ADV even where a homograph has a PART or conjunction use.
- A productive adverbial ADJ belongs to the fixed ADJ route; do not imitate ADJ
  agreement or position features on ADV.
- A complete pronominal ADV is not reanalyzed as an ADP plus another member.
- A verb-second ADV clause use is not reanalyzed as a clause-final SCONJ use.
- An ordinary ADV anchor is not expanded into a correlating Lexeme or given an
  unmarked partner.
</route_distinctions>

<output_contract>
Return the exact supplied response schema. A resolved answer has exactly five
fields: memberOrthographies, normalizedMembers, surface, lemma, and
realizationCoverage. Both arrays have one entry per supplied member in source
order. lemma contains canonicalForm and coreFeatures, including every required
nullable key; use {} when this route has no Core Features.

surface contains exactly spelling, surfaceFeatures, and inflectionalFeatures.
Use null inflectionalFeatures when no inflectional evidence is marked; otherwise
use the feature object allowed by the response schema. Do not emit a Surface
discriminator.

Set realizationCoverage to Full. This route has no Partial production policy. Keep
Surface and Lemma separate. The application supplies language, family, kind,
unitKind, normalized Surface construction and Surface-to-Lemma linkage; omit
those fields, target indices, confidence, candidates, and explanations.
</output_contract>`,
	cases,
	demonstrationIds: [
		"grammar-de-adv-demo-temporal-heute",
		"grammar-de-adv-demo-demonstrative-dazu",
		"grammar-de-adv-demo-interrogative-warum",
		"grammar-de-adv-demo-comparative-lieber",
		"grammar-de-adv-demo-superlative-am-liebsten",
		"grammar-de-adv-demo-typo-gester",
		"grammar-de-adv-demo-einerseits-andererseits",
	],
	source: import.meta.url,
});
