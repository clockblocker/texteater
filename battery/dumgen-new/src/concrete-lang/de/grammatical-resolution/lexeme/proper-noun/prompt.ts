import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/PROPN"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/proper-noun",
	inputSchema,
	outputSchema,
	body: "<task>\nResolve the grammar of one already-classified German Lexeme/PROPN occurrence.\nInput is exactly {markedContext: string, members: string[]}. TARGET contents and\nmembers are the complete ordered lexical membership.\nAlways return one total flat resolution. Route classification and membership selection happened\nupstream; never reject, add, remove, merge, split, reorder, or reclassify a\nmember.\n</task>\n\n<membership>\nReturn one memberOrthographies and one normalizedMembers entry per supplied\nmember. A proper name may have one member or several separately marked members.\nAll supplied members together form this classified PROPN Surface, including\nfunction words or title articles that upstream included. Preserve exact order\nand punctuation between members through their separate normalized values;\nnever absorb an unmarked title, common noun, adjective, number, or neighbor.\nAn earlier unmarked occurrence does not affect the supplied occurrence.\n\nStandard includes registered capitalization, internal capitals, lowercase\nbrand styling, abbreviations, and licensed variants. Typo means an actual\nspelling or casing error. Repair only Typo members. normalizedMembers preserves\ncontextual case suffixes, registered styling, and the characters of licensed\nvariants. Preserve a genitive apostrophe only when that apostrophe is inside the\nauthoritative supplied member string; never import surrounding punctuation from\noutside TARGET into normalizedMembers. Never replace contextual forms with\nLemma forms or expand an abbreviation.\n</membership>\n\n<surface>\nUse Citation for an explicit name-entry, dictionary, register, or quoted-title\nmention without contextual name case/number. Case carried by a surrounding\nlabel such as Titel or Eintrag belongs to that common noun and is never copied\nonto the quoted name. Use Inflection for ordinary contextual\noccurrences—including organizations, acronyms, stylized brands, direct address,\nand names described as historical forms. Lexical uncertainty never licenses\nCitation for a contextual occurrence. Its inflectionalFeatures contains exactly case and number; at\nleast one must be non-null. Resolve Acc, Dat, Gen, or Nom from syntax, articles,\nand government. Directional nach with a destination name is Acc; static in with\na location name is Dat. A vocative has case null but normally number Sing. Plural-only\nnames use number Plur. A multi-member name has one feature bag for the whole\nSurface, not one per member.\n\nspelling is Canonical for the ordinary Lemma form and for a repaired Typo. Use\nVariant only when context establishes a licensed alternative spelling,\nhistorical exonym, or transliteration of another canonicalForm. A registered\nstylized spelling is Canonical, not automatically Variant. surfaceFeatures is\nnull except when the exact occurrence is identified as archaic or historical;\nthen use {historicalStatus:\"Archaic\"}.\n</surface>\n\n<lemma>\ncanonicalForm is the complete normalized citation identity of the same name.\nFor a multi-member name, join its complete lexical members in conventional\northography, including spaces or name-internal hyphens. Strip contextual\ngenitive -s or apostrophe only from canonicalForm, never normalizedMembers. A\nTypo resolves to the repaired identity. A licensed variant or historical\nexonym may have a different canonicalForm only when context establishes that\nrelation; do not silently translate or modernize a name.\n\ncoreFeatures contains exactly {abbr, foreign, gender}; all keys are mandatory\nand nullable. abbr Yes requires an established abbreviated name identity, not\ncapital shape alone. foreign Yes requires an overt source-language name in the\nGerman context; an established German exonym or loan name is not Foreign merely\nbecause of origin. A brand or product's non-German origin never suffices for\nForeign when the name is used as an established German lexical identity. gender is stable grammatical identity Fem, Masc, or Neut\nonly when established by a person's identity, lexical convention, or reliable\nagreement. Do not infer personal gender from name shape alone. Plural-only\ngeographic names have gender null because plural does not encode it.\n</lemma>\n\n<fixed_route_distinctions>\nThe PROPN route is authoritative. A common-looking component inside the supplied\nname remains part of this PROPN; a supplied article inside a work title is not\nremoved as DET; a supplied numeric or adjectival-looking component is not\nreclassified. Conversely, unmarked titles, common nouns, appositions, and\nneighbors remain context. Resolve exactly the supplied members.\n</fixed_route_distinctions>\n\n<output>\nReturn exactly memberOrthographies, normalizedMembers, surface, and lemma.\nNever return decision, resolution, Unresolved, realizationCoverage, language,\nfamily, kind, normalizedSurface, a linked Lemma inside Surface, entity type,\nroute data, target indices, confidence, candidates, or explanations. The app\ninjects route/language/linkage, normalized Surface, successful result, and\nrealizationCoverage Full.\n</output>\n\n<self_check>\n\n\ncase/number bag; all nullable Core Feature keys are present.\n</self_check>\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n",
	cases,
	demonstrationIds: [
		"grammar-de-propn-demo-person-maria",
		"grammar-de-propn-demo-place-berlin",
		"grammar-de-propn-demo-multi-angela-merkel",
		"grammar-de-propn-demo-genitive-hans",
		"grammar-de-propn-demo-acronym-nato",
		"grammar-de-propn-demo-typo-koelnn",
		"grammar-de-propn-demo-citation-work-tonio-kroeger",
		"grammar-de-propn-demo-org-unesco",
		"grammar-de-propn-demo-vocative-clara",
		"grammar-de-propn-demo-stylized-ebay",
		"grammar-de-propn-demo-org-rotes-kreuz",
		"grammar-de-propn-demo-work-physiker",
		"grammar-de-propn-demo-integrated-lego",
	],
	source: import.meta.url,
});
