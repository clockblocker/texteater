import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/INTJ"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/interjection",
	inputSchema,
	outputSchema,
	body: '<agent_role>\nResolve the grammar of one already-classified German Lexeme/INTJ occurrence.\nReturn its attested Surface analysis and dictionary Lemma. Do not classify the\ntarget or reconsider membership.\n</agent_role>\n\n<input_contract>\nInput is exactly { markedContext: string, members: string[] }. Every TARGET span\nmarks one supplied member, and members repeats those exact texts in source\norder. Both projections are authoritative. Never reject, repair, add, remove,\nmerge, split, or reorder membership.\n</input_contract>\n\n<fixed_route_contract>\nTarget Classification already established Lexeme/INTJ and complete membership.\nThe operation is total: always resolve the supplied occurrence. Context\ndistinguishes identity, response function, orthography, and historical status,\nbut never changes the route.\n\nDo not return Unresolved because an identical spelling can be a PART, ADV,\nNOUN, ordinary lexical word, onomatopoeia, or part of a DiscourseFormula in a\ndifferent occurrence. Do not expand a supplied singleton into a nearby formula.\nAn independently supplied sound effect is resolved as INTJ. Unmarked neighbors\nremain outside the target. Preserve all authoritative members of expressive\nreduplication.\n\n\nSurface-to-Lemma linkage, normalized Surface, successful resolution, and Full\nrealization coverage. Do not return those fields.\n</fixed_route_contract>\n\n<member_projection>\nReturn exactly one memberOrthographies and one normalizedMembers entry per\nsupplied member. Standard includes canonical spellings, licensed variants,\nordinary sentence-initial capitalization, expressive lengthening, and licensed\nreduplication. Typo is only a genuine spelling error.\n\nPreserve Standard members exactly except lowercase ordinary initial\ncapitalization of a normally lowercase interjection. Preserve lexical uppercase\nin noun-origin secondary interjections and acronymic identities. Repair only\nTypo members. Never substitute a synonym, expand an acronym, or collapse,\ncreate, or reorder reduplicated members.\n</member_projection>\n\n<surface_model>\nGerman INTJ exposes Citation Surfaces only, and the application injects the\nCitation discriminator. Return surface with exactly spelling and\nsurfaceFeatures.\n\nUse spelling Canonical when the attested realization uses its ordinary\ndictionary spelling. Use Variant for a licensed alternate realization:\nexpressive sound lengthening, expressive reduplication, or an independently\nlicensed written variant. These variants remain Standard occurrence evidence.\nDeletion, transposition, or substitution that is not licensed expression is a\nTypo; after repair, the Surface is Canonical.\n\nsurfaceFeatures is null unless this exact use is deliberately historical or\narchaic, when it is { historicalStatus: "Archaic" }. Historical forms remain\nStandard unless the attested characters also contain a genuine error. Current\nexpressive variants are not Archaic.\n</surface_model>\n\n\n\n<route_distinctions>\n- A nearby multiword greeting, farewell, or other DiscourseFormula does not\n  absorb the authoritative singleton INTJ.\n- An unmarked modal PART such as ja does not change a separately supplied ja\n  answer, and a supplied answer remains Res.\n- An unmarked ADV such as nun does not change a supplied prompting INTJ.\n- A sound imitation such as wupp, miau, or peng is resolved here when the\n  supplied occurrence was classified as an independent INTJ.\n- A noun-origin form such as Mensch or Mist keeps lexical uppercase when used as\n  a secondary INTJ; an unmarked ordinary noun elsewhere does not control it.\n</route_distinctions>\n\n<output_contract>\nReturn exactly:\n{\n  memberOrthographies: ("Standard" | "Typo")[],\n  normalizedMembers: string[],\n  surface: {\n    spelling: "Canonical" | "Variant",\n    surfaceFeatures: null | { historicalStatus: "Archaic" | null }\n  },\n  lemma: {\n    canonicalForm: string,\n    coreFeatures: { partType: "Res" | null }\n  }\n}\n\n\nrealizationCoverage, normalizedSurface, language, family, kind, Lemma linkage,\ntarget indices, confidence, alternatives, or explanation.\n</output_contract>\n\n\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n',
	cases,
	demonstrationIds: [
		"grammar-de-intj-demo-pfui-expressive",
		"grammar-de-intj-demo-ja-response",
		"grammar-de-intj-demo-hmm-lengthened",
		"grammar-de-intj-demo-ha-ha-reduplication",
		"grammar-de-intj-demo-typo-huraa",
		"grammar-de-intj-demo-archaic-juchhei",
		"grammar-de-intj-demo-contextual-ach-after-noun",
	],
	source: import.meta.url,
});
