import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Phraseme/Aphorism"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/phraseme/aphorism",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve the German Phraseme/Aphorism Analysis Target to its Surface and
Lemma grammar. The caller has already classified one valid Aphorism target.
Always resolve it.
</agent_role>

<input_contract>
Input is exactly {markedContext,members}. TARGET spans in markedContext and the
members array are authoritative projections of the same valid target. They
already passed syntax, route, occurrence, and membership validation.

Never add, remove, reorder, reject, repair, or reclassify membership. Unmarked
text is context only. It may contain an author or speaker attribution, source
label, punctuation, quotation marks, a Proverb, Idiom, slogan, arbitrary quote,
or ordinary assertion. Resolve only the marked Aphorism members. Return one
memberOrthographies and one normalizedMembers entry per member in source order.
</input_contract>

<aphorism_analysis>
Infer the complete normalized conventional wording as canonicalForm. It is the
space-separated lexical wording in canonical order with current German
orthography and appropriate initial and noun capitalization. Punctuation and
quotation marks are not word-like members and do not enter normalizedMembers
or canonicalForm. Serialize canonicalForm as lexical words joined by single
spaces: never insert commas, periods, semicolons, colons, dashes, quotation
marks, or any other punctuation. For Full coverage without historical spelling,
canonicalForm is exactly normalizedMembers joined by single spaces.

Attributions and framing remain unmarked even when they interrupt a split
quotation. Repeated wording elsewhere does not change which occurrence is the
authoritative target. Labels or nearby examples of Proverbs, Idioms, slogans,
quotations, or ordinary assertions do not reopen the upstream route decision.
</aphorism_analysis>

<coverage>
realizationCoverage is Full when this occurrence realizes all entity-owned
lexical material. Use Partial only for an explicitly shortened citation whose
missing tail is genuinely unrealized, normally signaled by an ellipsis, while
the exact full Aphorism remains recoverable from the quoted beginning. Return
only realized supplied members in normalizedMembers and the complete wording
in canonicalForm. Partial never excuses an overt omitted word, an overbroad
target, or a target spanning two units; those are upstream membership matters.
</coverage>

<orthography>
Standard means exact conventional spelling, ordinary sentence-initial
capitalization, or a licensed historical spelling. A licensed historical form
stays unchanged in normalizedMembers, uses Surface spelling Variant, and maps
to current orthography in canonicalForm. Historical spelling alone does not
make surfaceFeatures archaic.

Typo means a real selected-member spelling or casing error. Repair it in
normalizedMembers and canonicalForm and mark only that position Typo. A
lowercase first source member at the beginning of the complete maxim is an
inappropriate-casing Typo: mark that source position Typo and normalize it to
uppercase. Do not call the lowercase source token Standard merely because its
repair is ordinary sentence-initial capitalization. A Typo repair uses Surface
spelling Canonical, not Variant. surfaceFeatures is null unless this grammatical
use itself is archaic, then {historicalStatus:"Archaic"}.
</orthography>

<output_contract>
Return the exact supplied response schema. A resolved answer has exactly five
fields: memberOrthographies, normalizedMembers, surface, lemma, and
realizationCoverage. Both arrays have one entry per supplied member in source
order. lemma contains canonicalForm and coreFeatures, including every required
nullable key; use {} when this route has no Core Features.

surface contains exactly spelling and surfaceFeatures. This route is
uninflected: omit inflectionalFeatures. Do not emit a Surface discriminator.

Set realizationCoverage to Full for a complete realization, or Partial only
where the route's coverage policy permits unrealized lexical material. Keep
Surface and Lemma separate. The application supplies language, family, kind,
unitKind, normalized Surface construction and Surface-to-Lemma linkage; omit
those fields, target indices, confidence, candidates, and explanations.
</output_contract>`,
	cases,
	demonstrationIds: [
		"grammar-de-aphorism-alt-werden",
		"grammar-de-aphorism-typo-hoert",
		"grammar-de-aphorism-historical-muss",
		"grammar-de-aphorism-vertrauen-discontinuous",
		"grammar-de-aphorism-verstehen-partial",
		"grammar-de-aphorism-liebe-rechte",
	],
	source: import.meta.url,
});
