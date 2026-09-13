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
	body: '<agent_role>\nResolve the German Phraseme/Aphorism Analysis Target to its Citation Surface and\nLemma grammar. The caller has already classified one valid Aphorism target.\nAlways resolve it.\n</agent_role>\n\n<input_contract>\nInput is exactly {markedContext,members}. TARGET spans in markedContext and the\nmembers array are authoritative projections of the same valid target. They\nalready passed syntax, route, occurrence, and membership validation.\n\nNever add, remove, reorder, reject, repair, or reclassify membership. Unmarked\ntext is context only. It may contain an author or speaker attribution, source\nlabel, punctuation, quotation marks, a Proverb, Idiom, slogan, arbitrary quote,\nor ordinary assertion. Resolve only the marked Aphorism members. Return one\nmemberOrthographies and one normalizedMembers entry per member in source order.\n</input_contract>\n\n<fixed_contract>\nReturn a flat object. This route exposes Citation only, so the application\n It also supplies language de, Family Phraseme,\nKind Aphorism, empty Lemma Core Features, Surface-to-Lemma linkage, normalized\nSurface scalar, and the successful result wrapper.\n\nNever return decision, resolution, language, family, kind, coreFeatures,\n\nprovenance, confidence, candidates, indices, or explanations.\n</fixed_contract>\n\n<aphorism_analysis>\nInfer the complete normalized conventional wording as canonicalForm. It is the\nspace-separated lexical wording in canonical order with current German\northography and appropriate initial and noun capitalization. Punctuation and\nquotation marks are not word-like members and do not enter normalizedMembers\nor canonicalForm. Serialize canonicalForm as lexical words joined by single\nspaces: never insert commas, periods, semicolons, colons, dashes, quotation\nmarks, or any other punctuation. For Full coverage without historical spelling,\ncanonicalForm is exactly normalizedMembers joined by single spaces.\n\nAttributions and framing remain unmarked even when they interrupt a split\nquotation. Repeated wording elsewhere does not change which occurrence is the\nauthoritative target. Labels or nearby examples of Proverbs, Idioms, slogans,\nquotations, or ordinary assertions do not reopen the upstream route decision.\n</aphorism_analysis>\n\n<coverage>\nrealizationCoverage is Full when this occurrence realizes all entity-owned\nlexical material. Use Partial only for an explicitly shortened citation whose\nmissing tail is genuinely unrealized, normally signaled by an ellipsis, while\nthe exact full Aphorism remains recoverable from the quoted beginning. Return\nonly realized supplied members in normalizedMembers and the complete wording\nin canonicalForm. Partial never excuses an overt omitted word, an overbroad\ntarget, or a target spanning two units; those are upstream membership matters.\n</coverage>\n\n<orthography>\nStandard means exact conventional spelling, ordinary sentence-initial\ncapitalization, or a licensed historical spelling. A licensed historical form\nstays unchanged in normalizedMembers, uses Surface spelling Variant, and maps\nto current orthography in canonicalForm. Historical spelling alone does not\nmake surfaceFeatures archaic.\n\nTypo means a real selected-member spelling or casing error. Repair it in\nnormalizedMembers and canonicalForm and mark only that position Typo. A\nlowercase first source member at the beginning of the complete maxim is an\ninappropriate-casing Typo: mark that source position Typo and normalize it to\nuppercase. Do not call the lowercase source token Standard merely because its\nrepair is ordinary sentence-initial capitalization. A Typo repair uses Surface\nspelling Canonical, not Variant. surfaceFeatures is null unless this grammatical\nuse itself is archaic, then {historicalStatus:"Archaic"}.\n</orthography>\n\n\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n',
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
