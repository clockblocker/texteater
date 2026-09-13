import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/NUM"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/numeral",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/NUM occurrence.
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
Target Classification already established Lexeme/NUM and complete membership.
The operation is total: always resolve the supplied NUM occurrence. Context
distinguishes numerical identity and grammatical features but never changes the
route. A supplied numeral may contain one member or several ordered members,
including a spoken decimal. Preserve every supplied member exactly once.

Do not reject a target because a homograph or neighboring expression could be
an ordinal-like ADJ, DET, PRON, NOUN, or SYM elsewhere. Those distinctions were
fixed upstream. Resolve only the marked NUM, without copying features from an
unmarked neighboring word or symbol.
</fixed_route_contract>

<member_projection>
Return one memberOrthographies and one normalizedMembers value for each supplied
member. Standard includes canonical spelling, ordinary sentence-initial
capitalization, licensed variants, and licensed abbreviations. Typo is only a
genuine spelling or inappropriate-casing error.

Preserve each Standard member exactly except lowercase sentence-initial
capitalization of a word numeral. This casing projection is independent of
null versus marked inflectionalFeatures: an initial inflected quantity numeral also projects
to lowercase. Repair only Typo members. Preserve digits, Roman-numeral casing,
abbreviation casing, morphology, and member order. Never replace a digit with a
word or a word with digits. A licensed Variant Surface remains Standard
occurrence evidence. Sentence-initial capitalization must not survive in
normalizedMembers: initial Acht projects to acht while remaining Standard.
Recognized historical spellings are licensed Standard evidence, not Typo: keep
their attested spelling in normalizedMembers, use a Variant Surface with
Archaic status, and map only canonicalForm to the modern spelling.
</member_projection>

<surface_inflection>
Use null inflectionalFeatures for an invariant NUM occurrence, including ordinary clause uses of
word cardinals, digits, spoken decimals, years, Roman numerals, fractions,
multiplicative forms, ranges, and multi-member spoken numbers. Null inflectionalFeatures is not restricted to dictionary labels.

Use an inflectionalFeatures object only when the NUM Surface itself carries or establishes at least
one inflectional feature:
{
  case: "Acc" | "Dat" | "Gen" | "Nom" | null,
  gender: "Fem" | "Masc" | "Neut" | null,
  number: "Plur" | "Sing" | null
}

At least one value must be non-null. Inflected quantity numerals such as Million
and Millionen can carry case, feminine gender, and number; an explicitly
gendered historical word form can also carry agreement. Fill only features
established by the Surface and realistic syntax. Invariant digits and words do
not acquire inflection merely from the case or gender of a neighboring noun.
When no feature is established, use null inflectionalFeatures rather than an all-null feature object.

German word quantities in the Million family and the larger -illion and
-illiarde series are not invariant cardinals when their own singular or plural
form and syntax establish agreement. Resolve such a quantity as an inflectionalFeatures object with
its established case, feminine gender, and number. At sentence start, keep its
occurrence orthography Standard but lowercase the ordinary initial capital in
normalizedMembers. This quantity-word rule is mandatory and takes precedence
over the general null-feature rule for invariant numerals.

surface.spelling is Variant only for a licensed alternate spelling or
abbreviation, such as zwo or T for Tausend, and Canonical otherwise.
surfaceFeatures is null unless the attested use itself is archaic; then use
{ historicalStatus: "Archaic" }. A modern licensed variant is not Archaic.
For an archaic word form whose morphology visibly distinguishes agreement, use
an inflectionalFeatures object with the established case, gender, and number, map canonicalForm to
the modern dictionary numeral, set spelling Variant, and set the Surface
historical status Archaic. Visibly marked historical
agreement always requires an inflectionalFeatures object, even when the modern base numeral is
invariant. Do not preserve its ordinary sentence-initial capital in
normalizedMembers or canonicalForm.
</surface_inflection>

<route_distinctions>
- An ordinal ADJ in context does not make a separately marked cardinal label an
  ADJ; the fixed NUM target remains NUM.
- An unmarked DET such as beide is not part of a separately supplied numeral.
- A standalone cardinal can head a phrase without becoming PRON.
- A nominalized number word outside the target does not change the marked
  numeric identity to NOUN.
- Mathematical punctuation or operators outside the target do not make the
  marked number a SYM.
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
		"grammar-de-num-demo-word-vier",
		"grammar-de-num-demo-digit-7",
		"grammar-de-num-demo-fraction-eineinhalb",
		"grammar-de-num-demo-range-zehn-bis-zwoelf",
		"grammar-de-num-demo-inflected-millionen",
		"grammar-de-num-demo-initial-inflected-trillionen",
		"grammar-de-num-demo-typo-dreii",
	],
	source: import.meta.url,
});
