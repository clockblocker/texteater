import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<task>
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
Use Citation for an ordinary invariant symbolic occurrence and for an explicit
mention of a symbol identity. Citation returns exactly {spelling,
surfaceFeatures}; its fixed kind is application-owned. Use Inflection only when
the symbol is used nominally and German syntax or agreement establishes at
least one of case, gender, or number. Inflection additionally returns
surfaceKind:"Inflection" and inflectionalFeatures with exactly nullable case,
gender, and number; at least one value must be non-null. A neighboring numeric
quantity, article belonging to another noun, or mere visual invariance never by
itself licenses Inflection.

Operationally, when a German determiner directly governs the TARGET symbol and
the symbol itself fills that noun phrase, you MUST use Inflection and copy the
established agreement: das + target is neuter singular, die + target is
feminine singular unless plural syntax establishes plural, and des + target is
genitive. Likewise, a governing preposition plus determiner establishes case.
Do not downgrade these ordinary syntactic occurrences to Citation merely
because the glyph has no visible inflectional ending. Use Citation for a symbol
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

<output>
Return exactly memberOrthographies, normalizedMembers, surface, and lemma.
Never return decision, resolution, Unresolved, realizationCoverage, language,
family, kind, normalizedSurface, a linked Lemma inside Surface, target indices,
confidence, candidates, or explanations. The application injects the German
SYM route, linkage, normalized Surface, successful result, and
realizationCoverage Full.
</output>

<self_check>
Counts equal members; Standard material is preserved; Citation has no
surfaceKind or inflectionalFeatures; Inflection has surfaceKind Inflection and a
non-empty feature bag; all nullable Core keys are present.
</self_check>`;

export const demonstrations = corpus.select([
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
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/symbol",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
