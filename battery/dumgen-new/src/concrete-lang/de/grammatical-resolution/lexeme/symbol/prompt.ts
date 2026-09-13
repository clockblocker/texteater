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
	body: '<task>\nResolve the grammar of one already-classified German Lexeme/SYM occurrence.\nInput is exactly {markedContext: string, members: string[]}. TARGET contents and\nmembers are the complete ordered lexical membership. Always return one total\nflat resolution. Route classification and membership happened upstream; never\nreject, add, remove, merge, split, reorder, or reclassify a member.\n</task>\n\n<membership>\nReturn exactly one memberOrthographies and one normalizedMembers entry per\nsupplied member. A symbolic identity may contain several Unicode code points or\nASCII characters inside one member, such as :-) or §§. Preserve the supplied\ncardinality and order. Repeated identical symbols elsewhere in context, nearby\nnumbers, words, abbreviations, punctuation, and opaque emoji are not members.\n\nStandard is a conventional glyph or licensed Unicode presentation. Typo is an\nactual damaged or duplicated symbol whose intended identity is established by\ncontext. Repair only Typo members. normalizedMembers preserves the exact\nconventional occurrence glyph for Standard members, including licensed\nvariants; it contains the repaired glyph for Typo members. Never silently\nreplace x with ×, a full-width form with its ASCII counterpart, or one currency\nsign with another unless the context explicitly establishes Variant or Typo.\n</membership>\n\n<surface>\nUse Citation for an ordinary invariant symbolic occurrence and for an explicit\nmention of a symbol identity. Citation returns exactly {spelling,\nsurfaceFeatures}; its fixed kind is application-owned. Use Inflection only when\nthe symbol is used nominally and German syntax or agreement establishes at\nleast one of case, gender, or number. Inflection additionally returns\n\ngender, and number; at least one value must be non-null. A neighboring numeric\nquantity, article belonging to another noun, or mere visual invariance never by\nitself licenses Inflection.\n\nOperationally, when a German determiner directly governs the TARGET symbol and\nthe symbol itself fills that noun phrase, you MUST use Inflection and copy the\nestablished agreement: das + target is neuter singular, die + target is\nfeminine singular unless plural syntax establishes plural, and des + target is\ngenitive. Likewise, a governing preposition plus determiner establishes case.\nDo not downgrade these ordinary syntactic occurrences to Citation merely\nbecause the glyph has no visible inflectional ending. Use Citation for a symbol\nmentioned under a separate label noun such as Zeichen, Symbol, or Eintrag; that\nlabel\'s determiner and case do not govern the target.\n\nspelling is Canonical for the ordinary Lemma form and for a repaired Typo. Use\nVariant only when context establishes a licensed Unicode, historical, or other\nsymbolic alternative of a different canonicalForm. surfaceFeatures is null\nunless the occurrence is explicitly archaic or historical, in which case use\n{historicalStatus:"Archaic"}.\n</surface>\n\n<lemma>\ncanonicalForm is the normalized citation identity of this symbol. It normally\nequals the conventional occurrence glyph; a repaired Typo or explicitly\nrelated Variant may differ. Do not translate a symbol into a word or expand its\nmeaning.\n\ncoreFeatures contains exactly {foreign, numType}; both keys are mandatory and\nnullable. foreign is Yes only when context presents the symbol as\nsource-language material outside the established German symbolic inventory;\ninternational use or non-German origin alone is insufficient. numType is Card\nonly for a symbol whose established identity is a cardinal-number marker, and\nRange only for a symbol whose established identity is a numeric range marker.\nA currency, unit, percentage, operator, digit neighbor, or mathematical use\ndoes not otherwise imply numType.\n</lemma>\n\n<fixed_route_distinctions>\nThe SYM route and membership are authoritative. NUM digits, sentence PUNCT,\nOpaqueText emoji, written abbreviations, ordinary lexical strings, and symbols\nembedded in names remain outside this target because upstream classification\nalready fixed the distinction. Resolve the supplied SYM even when its glyph is\npunctuation-like or letter-like. Do not return Unresolved or repair membership.\n</fixed_route_distinctions>\n\n<output>\nReturn exactly memberOrthographies, normalizedMembers, surface, and lemma.\nNever return decision, resolution, Unresolved, realizationCoverage, language,\nfamily, kind, normalizedSurface, a linked Lemma inside Surface, target indices,\nconfidence, candidates, or explanations. The application injects the German\nSYM route, linkage, normalized Surface, successful result, and\nrealizationCoverage Full.\n</output>\n\n<self_check>\nCounts equal members; Standard material is preserved; Citation has no\n\nnon-empty feature bag; all nullable Core keys are present.\n</self_check>\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n',
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
