import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/PART"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/particle",
	inputSchema,
	outputSchema,
	body: '<agent_role>\nResolve the grammar of one already-classified German Lexeme/PART occurrence.\nReturn its attested Citation Surface and dictionary Lemma. Do not classify the\ntarget or reconsider its membership.\n</agent_role>\n\n<input_contract>\nInput is exactly { markedContext: string, members: string[] }. Every TARGET span\nmarks one supplied member, and members repeats those exact texts in source\norder. Both projections are authoritative. Never reject, repair, add, remove,\nmerge, split, or reorder membership. Contextual words and punctuation are not\nmembers unless supplied.\n</input_contract>\n\n<route_contract>\nTarget Classification already established Lexeme/PART. The operation is total:\nalways resolve the supplied occurrence. Use its context to determine the\nparticle\'s lexical and polarity features, but never return Unresolved or\nreclassify it as ADV, ADP, INTJ, CCONJ, SCONJ, a Phraseme, or part of a VERB.\nThe fixed PART route remains authoritative for a contextually ambiguous form.\n\nGerman PART is uninflected in the current codec. Every occurrence has a\nCitation Surface.\nidentity, Surface-to-Lemma linkage, normalized Surface, successful resolution,\nand realizationCoverage Full. Do not return those fields.\n</route_contract>\n\n<member_projection>\nReturn exactly one memberOrthographies and normalizedMembers entry per supplied\nmember. Standard includes canonical spelling, ordinary sentence-initial\ncapitalization, licensed regional or expressive variants, and conventional\nabbreviations. Typo is only a genuine spelling or inappropriate-casing error.\n\nPreserve a Standard member\'s characters except lowercase ordinary\nsentence-initial capitalization. Repair only Typo members. A typo repair changes\nnormalizedMembers to the intended particle but does not change Surface spelling\nfrom Canonical. A licensed variant remains unchanged and uses spelling Variant.\nNever replace a particle with a synonym. Lexical identity follows explicit\nlexicographic cues: “variant of X” selects Lemma X and spelling Variant, while\n“own Lemma/headword/entry” selects the attested form as canonicalForm and\nspelling Canonical. Without an explicit relation, do not invent a modern-Lemma\nlink merely because a regional or historical form resembles another particle;\npreserve the supplied lexeme as its own canonicalForm. If abbreviation\npunctuation sits outside TARGET, do not add it to normalizedMembers; the\ndictionary Lemma may still include the punctuation.\n</member_projection>\n\n<surface_model>\nsurface contains exactly spelling and surfaceFeatures. spelling is Canonical\nfor the Lemma\'s ordinary form and for a repaired typo. Use Variant only for an\nindependently licensed regional, expressive, historical, or abbreviated Surface\nof the chosen Lemma. surfaceFeatures is null unless this exact occurrence is\nexplicitly historical or archaic; then use { historicalStatus: "Archaic" }.\nDo not mark a merely colloquial or foreign form archaic.\n</surface_model>\n\n\n\n<route_distinctions>\n- Clause-dependent modal ja is PART with null polarity; an explicitly supplied\n  affirmative answer ja is PART with Pos under this already-fixed route.\n- Infinitival zu is PART with PartType Inf; an unmarked prepositional zu remains\n  ADP context.\n- A supplied modal or focus homograph remains PART even beside an unmarked ADV,\n  CCONJ, SCONJ, INTJ, or ADP.\n- A nearby separable VERB element never enters PART membership. Only the\n  supplied target is resolved.\n- A punctuation mark outside TARGET is not a member. Never absorb surrounding\n  phraseme or clause material.\n</route_distinctions>\n\n<output_contract>\nReturn exactly:\n{\n  memberOrthographies: ("Standard" | "Typo")[],\n  normalizedMembers: string[],\n  surface: {\n    spelling: "Canonical" | "Variant",\n    surfaceFeatures: null | { historicalStatus: "Archaic" }\n  },\n  lemma: {\n    canonicalForm: string,\n    coreFeatures: {\n      abbr: "Yes" | null,\n      foreign: "Yes" | null,\n      partType: "Inf" | null,\n      polarity: "Neg" | "Pos" | null\n    }\n  }\n}\n\n\ninflectionalFeatures, normalizedSurface, language, family, kind, Lemma linkage,\ntarget indices, confidence, candidates, or explanation.\n</output_contract>\n\n\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n',
	cases,
	demonstrationIds: [
		"grammar-de-part-demo-negative-nicht",
		"grammar-de-part-demo-infinitival-zu",
		"grammar-de-part-demo-modal-halt",
		"grammar-de-part-demo-focus-sogar",
		"grammar-de-part-demo-typo-ebn",
		"grammar-de-part-demo-archaic-nit",
		"grammar-de-part-demo-distinct-archaic-ni",
		"grammar-de-part-demo-foreign-yes",
		"grammar-de-part-demo-abbreviation-aff",
	],
	source: import.meta.url,
});
