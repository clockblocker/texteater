import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/SYM"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/symbol",
	inputSchema,
	outputSchema,
	body: `<task>
Resolve the grammar of one already-classified German Lexeme/SYM occurrence.
Input is exactly {markedContext: string, members: string[]}. TARGET contents and
members are the complete ordered lexical membership. Always return one total
flat resolution. Route classification and membership happened upstream; never
reject, add, remove, merge, split, reorder, or reclassify a member.
</task>

<membership>
Return exactly one memberOrthographies and one normalizedMembers entry per
supplied member. A symbolic identity may contain several Unicode code points or
ASCII characters inside one member, such as :-) or §§. Preserve the supplied
cardinality and order. Repeated identical symbols elsewhere in context, nearby
numbers, words, abbreviations, punctuation, and opaque emoji are not members.

Standard is a conventional glyph or licensed Unicode presentation. Typo is an
actual damaged or duplicated symbol whose intended identity is established by
context. Repair only Typo members. normalizedMembers preserves the exact
conventional occurrence glyph for Standard members, including licensed
variants; it contains the repaired glyph for Typo members. Never silently
replace x with ×, a full-width form with its ASCII counterpart, or one currency
sign with another unless the context explicitly establishes Variant or Typo.
</membership>

<surface>
Use null inflectionalFeatures for an ordinary invariant symbolic occurrence and for an explicit
mention of a symbol identity. Use an inflectionalFeatures object only when
the symbol is used nominally and German syntax or agreement establishes at
least one of case, gender, or number. The inflectionalFeatures object contains case, gender, and number; at least one value must be non-null. A neighboring numeric
quantity, article belonging to another noun, or mere visual invariance never by
itself licenses an inflectionalFeatures object.

Operationally, when a German determiner directly governs the TARGET symbol and
the symbol itself fills that noun phrase, you MUST use an inflectionalFeatures object and copy the
established agreement: das + target is neuter singular, die + target is
feminine singular unless plural syntax establishes plural, and des + target is
genitive. Likewise, a governing preposition plus determiner establishes case.
Do not downgrade these ordinary syntactic occurrences to null inflectionalFeatures merely
because the glyph has no visible inflectional ending. Use null inflectionalFeatures for a symbol
mentioned under a separate label noun such as Zeichen, Symbol, or Eintrag; that
label's determiner and case do not govern the target.

spelling is Canonical for the ordinary Lemma form and for a repaired Typo. Use
Variant only when context establishes a licensed Unicode, historical, or other
symbolic alternative of a different canonicalForm. surfaceFeatures is null
unless the occurrence is explicitly archaic or historical, in which case use
{historicalStatus:"Archaic"}.
</surface>

<lemma>
canonicalForm is the normalized citation identity of this symbol. It normally
equals the conventional occurrence glyph; a repaired Typo or explicitly
related Variant may differ. Do not translate a symbol into a word or expand its
meaning.

coreFeatures contains exactly {foreign, numType}; both keys are mandatory and
nullable. foreign is Yes only when context presents the symbol as
source-language material outside the established German symbolic inventory;
international use or non-German origin alone is insufficient. numType is Card
only for a symbol whose established identity is a cardinal-number marker, and
Range only for a symbol whose established identity is a numeric range marker.
A currency, unit, percentage, operator, digit neighbor, or mathematical use
does not otherwise imply numType.
</lemma>

<fixed_route_distinctions>
The SYM route and membership are authoritative. NUM digits, sentence PUNCT,
OpaqueText emoji, written abbreviations, ordinary lexical strings, and symbols
embedded in names remain outside this target because upstream classification
already fixed the distinction. Resolve the supplied SYM even when its glyph is
punctuation-like or letter-like. Do not return Unresolved or repair membership.
</fixed_route_distinctions>

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
		"grammar-de-sym-demo-percent-unit",
		"grammar-de-sym-demo-times-nominal",
		"grammar-de-sym-demo-euro-currency",
		"grammar-de-sym-demo-section-dative",
		"grammar-de-sym-demo-equals-genitive",
		"grammar-de-sym-demo-feminine-hash",
		"grammar-de-sym-demo-foreign-arabic-percent",
		"grammar-de-sym-demo-card-number-sign",
		"grammar-de-sym-demo-range-dash",
		"grammar-de-sym-demo-variant-fullwidth-plus",
		"grammar-de-sym-demo-typo-ocr-euro",
		"grammar-de-sym-demo-sections-plural",
	],
	source: import.meta.url,
});
