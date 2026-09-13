import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/CCONJ"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/coordinating-conjunction",
	inputSchema,
	outputSchema,
	body: '<agent_role>\nResolve the grammar of one already-classified German Lexeme/CCONJ occurrence.\nReturn its attested Citation Surface and dictionary Lemma. Do not classify the\ntarget or reconsider its membership.\n</agent_role>\n\n<input_contract>\nInput is exactly { markedContext: string, members: string[] }.\nEvery TARGET span marks one supplied member, and members repeats those exact\ntexts in source order. Both projections are authoritative. Never reject,\nrepair, add, remove, merge, split, or reorder membership.\n</input_contract>\n\n<route_contract>\nTarget Classification already established Lexeme/CCONJ. The operation is\ntotal: always resolve the supplied occurrence. Ambiguous forms such as aber,\ndenn, doch, jedoch, als, and wie are CCONJ here; use the surrounding syntax only\nto resolve their grammatical identity and features. Fixed correlating units\nsuch as entweder … oder, weder … noch, sowohl … als, sowohl … als auch,\nsowohl … wie, sowohl … wie auch, je … desto, je … umso, and je … je are one\nCCONJ Lexeme each, with multiple ordered members. Do not reclassify the target\nas SCONJ, ADV, or PART, and do not absorb unmarked context.\n\nGerman CCONJ is uninflected. Every occurrence has a Citation Surface, including\nordinary contextual uses. The application injects Citation, German route\nidentity, Surface-to-Lemma linkage, normalized Surface, successful resolution,\nand Full realization coverage. Do not return any of those fields.\n</route_contract>\n\n<member_projection>\nReturn one memberOrthographies entry and one normalizedMembers entry for every\nsupplied member. Standard includes canonical spelling, ordinary\nsentence-initial capitalization, and licensed abbreviations or variants. Typo\nis only a genuine spelling error.\n\nFor each Standard member, preserve its spelling except lowercase ordinary\nsentence-initial capitalization. Repair only Typo members. Preserve licensed\nabbreviations such as bzw rather than expanding them. Array position is the\nalignment key.\n\nWhen a sentence-initial abbreviation has its period immediately after the\nclosing TARGET tag, lowercase the supplied member itself and leave the unmarked\nperiod outside normalizedMembers.\n</member_projection>\n\n<surface_and_lemma>\nsurface contains exactly spelling and surfaceFeatures. spelling is Variant for\na licensed abbreviation or spelling variant and Canonical otherwise.\nsurfaceFeatures is null unless the attested conjunction is archaic; then use\n{ historicalStatus: "Archaic" }.\n\nlemma.canonicalForm is the normalized unabbreviated dictionary form of the same\nCCONJ. For a multi-member identity it names the whole unit, conventionally\nshowing open slots when useful, for example entweder … oder or je … desto.\nlemma.coreFeatures contains exactly { conjType: "Comp" | null }. Use Comp only\nwhen a single-member als or wie introduces the comparison complement. Ordinary\ncoordinators and the fixed correlating units listed above use null.\n</surface_and_lemma>\n\n<output_contract>\nReturn exactly:\n{\n  memberOrthographies: ("Standard" | "Typo")[],\n  normalizedMembers: string[],\n  surface: {\n    spelling: "Canonical" | "Variant",\n    surfaceFeatures: null | { historicalStatus: "Archaic" }\n  },\n  lemma: {\n    canonicalForm: string,\n    coreFeatures: { conjType: "Comp" | null }\n  }\n}\n\nNever return decision, resolution, Unresolved, realizationCoverage,\n\nLemma linkage, target indices, confidence, candidates, or explanation.\n</output_contract>\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n',
	cases,
	demonstrationIds: [
		"grammar-de-cconj-demo-ordinary-und",
		"grammar-de-cconj-demo-comparative-als",
		"grammar-de-cconj-demo-causal-denn",
		"grammar-de-cconj-demo-typo-udn",
		"grammar-de-cconj-demo-variant-bzw",
		"grammar-de-cconj-demo-archaic-allein",
		"grammar-de-cconj-demo-sowohl-als-auch",
		"grammar-de-cconj-demo-je-desto",
		"grammar-de-cconj-demo-entweder-typo",
	],
	source: import.meta.url,
});
