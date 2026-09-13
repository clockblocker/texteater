import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/ADP"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/adposition",
	inputSchema,
	outputSchema,
	body: '<agent_role>\nResolve the grammar of one already-classified German Lexeme/ADP occurrence. Return its attested Citation Surface and dictionary Lemma. Do not classify the target or reconsider its membership.\n</agent_role>\n\n<input_contract>\nInput is exactly { markedContext: string, members: string[] }. Every TARGET span marks one supplied member, and members repeats those exact texts in source order. Both projections are authoritative. Never reject, repair, add, remove, merge, split, or reorder membership. Complements and other contextual words are not members unless supplied.\n</input_contract>\n\n<route_contract>\nTarget Classification already established Lexeme/ADP. The operation is total: always resolve the supplied occurrence. Use syntax to distinguish a preposition, postposition, or circumposition and its lexical features, but never reclassify it as ADV, SCONJ, a Fusion, or part of a VERB target. An unmarked homograph elsewhere in the sentence does not change the supplied target.\n\nGerman ADP is uninflected in the current codec. Every occurrence has a Citation Surface, including ordinary sentence uses. Do not return those fields.\n</route_contract>\n\n<member_projection>\nReturn one memberOrthographies entry and one normalizedMembers entry for every supplied member. Standard includes canonical spelling, ordinary sentence-initial capitalization, licensed variants, and conventional abbreviations. Typo is only a genuine spelling or inappropriate-casing error.\n\nFor each Standard member, preserve its characters except lowercase ordinary sentence-initial capitalization. Capitalization is Standard only when ordinary German orthography licenses it at that position; an otherwise lowercase preposition capitalized in the middle of a sentence is Typo. Repair only Typo members. Preserve member order and separate members; never absorb a nominal complement. A circumposition such as von ... an has two supplied and two normalized members. A licensed multiword variant such as auf Grund also retains both positions.\n\nPunctuation is not a ResolvableText member. When an abbreviation period follows the closing TARGET tag, preserve the supplied letters without adding the period to normalizedMembers; the Lemma may still use the conventional punctuated abbreviation.\n</member_projection>\n\n<surface_model>\nsurface contains exactly spelling and surfaceFeatures. spelling is Variant when the attested Surface is a licensed abbreviation or independently established spelling variant of the chosen Lemma; otherwise Canonical. If punctuation outside TARGET completes an abbreviation whose dictionary form includes that punctuation, the unpunctuated supplied Surface is still Variant relative to that Lemma. Equal standard variants do not by themselves choose one Lemma headword, but an explicit dictionary-form or preferred-headword cue in the context does. surfaceFeatures is null unless this ADP use is archaic; then use { historicalStatus: "Archaic" }.\n</surface_model>\n\n\n\n<route_distinctions>\n- Resolve only the supplied ADP members; never absorb the complement.\n- A later unmarked separable particle does not turn an earlier supplied auf into Vbp.\n- A governed preposition that belongs to an unmarked VERB target does not enter this ADP output.\n- An unmarked Fusion such as im and an unmarked SCONJ remain context only.\n- Fixed ADP classification is authoritative even when a form such as entlang, anstatt, or auf has other possible routes elsewhere.\n</route_distinctions>\n\n<output_contract>\nReturn exactly:\n{\n  memberOrthographies: ("Standard" | "Typo")[],\n  normalizedMembers: string[],\n  surface: {\n    spelling: "Canonical" | "Variant",\n    surfaceFeatures: null | { historicalStatus: "Archaic" }\n  },\n  lemma: {\n    canonicalForm: string,\n    coreFeatures: {\n      abbr: "Yes" | null,\n      adpType: "Circ" | "Post" | "Prep" | null,\n      extPos: "ADV" | "SCONJ" | null,\n      foreign: "Yes" | null,\n      governedCase: "Acc" | "Dat" | "Gen" | "Nom" | null,\n      partType: "Vbp" | null\n    }\n  }\n}\n\n\n</output_contract>\n\n\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n',
	cases,
	demonstrationIds: [
		"grammar-de-adp-demo-prep-mit-dat",
		"grammar-de-adp-demo-two-way-auf",
		"grammar-de-adp-demo-post-entlang-acc",
		"grammar-de-adp-demo-circ-von-an",
		"grammar-de-adp-demo-typo-one",
		"grammar-de-adp-demo-archaic-ob",
	],
	source: import.meta.url,
});
