import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/SCONJ"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/subordinating-conjunction",
	inputSchema,
	outputSchema,
	body: '<agent_role>\nResolve the grammar of one already-classified German Lexeme/SCONJ occurrence.\nReturn its attested Surface analysis and dictionary Lemma. Do not classify the\ntarget or reconsider membership.\n</agent_role>\n\n<input_contract>\nInput is exactly { markedContext: string, members: string[] }. Every TARGET span\nmarks one supplied member, and members repeats those exact texts in source\norder. Both projections are authoritative. Never reject, repair, add, remove,\nmerge, split, or reorder membership.\n</input_contract>\n\n<fixed_route_contract>\nTarget Classification already established Lexeme/SCONJ and complete membership.\nThe operation is total: always resolve the supplied occurrence. Context\ndistinguishes identity, comparative function, orthography, and historical\nstatus, but never changes the route.\n\nDo not return Unresolved because an identical spelling can be CCONJ, ADV, ADP,\nor PART in a different occurrence. Unmarked neighbors remain outside the\ntarget. Keep every supplied member of a multi-member subordinator, including\nfixed discontinuous identities such as um zu, ohne zu, (an)statt zu, and\nso … dass, but never absorb unmarked clause material.\n\n\nSurface-to-Lemma linkage, normalized Surface, successful resolution, and Full\nrealization coverage. Do not return those fields.\n</fixed_route_contract>\n\n<member_projection>\nReturn exactly one memberOrthographies and one normalizedMembers entry per\nsupplied member. Standard includes canonical spelling, licensed variants, and\nordinary sentence-initial capitalization. Typo is only a genuine spelling or\ninappropriate-casing error.\n\nPreserve Standard members exactly except lowercase ordinary initial\ncapitalization of a normally lowercase conjunction. Preserve licensed\nhistorical spellings such as daß rather than replacing them with the Lemma\ncanonicalForm. Repair only Typo members. Never substitute a synonym or change\nthe supplied member count or order.\n</member_projection>\n\n<surface_model>\nGerman SCONJ exposes Citation Surfaces only, and the application injects the\nCitation discriminator. Return surface with exactly spelling and\nsurfaceFeatures.\n\nUse spelling Canonical for the ordinary dictionary spelling. Use Variant for a\nlicensed alternate realization, including an established historical spelling\nor separately written variant of a lexicalized multi-member identity. A real\nmisspelling is Typo; after repair, the Surface is Canonical.\n\nsurfaceFeatures is null unless this exact use is deliberately historical or\narchaic, when it is { historicalStatus: "Archaic" }. Historical forms remain\nStandard unless their attested characters also contain a genuine error.\n</surface_model>\n\n\n\n<route_distinctions>\n- Finite, infinitival, and established reduced subordinate clauses remain valid\n  SCONJ contexts when upstream classification and membership are supplied.\n- Homographs such as als, wie, da, ob, wenn, während, and denn may belong to\n  other routes elsewhere. Do not reconsider the supplied SCONJ occurrence.\n- A nearby CCONJ denn, adpositional während, adverbial da, or modal particle ja\n  is merely unmarked context and does not alter the target.\n- A supplied multi-member subordinator such as so dass, als ob, or ohne dass\n  keeps all supplied members. Do not merge them into one member or absorb the\n  following subject or clause.\n- The exact SCONJ codec has no abbreviation feature. Never invent one or expand\n  an unmarked abbreviation in the surrounding sentence.\n</route_distinctions>\n\n<output_contract>\nReturn exactly:\n{\n  memberOrthographies: ("Standard" | "Typo")[],\n  normalizedMembers: string[],\n  surface: {\n    spelling: "Canonical" | "Variant",\n    surfaceFeatures: null | { historicalStatus: "Archaic" | null }\n  },\n  lemma: {\n    canonicalForm: string,\n    coreFeatures: { conjType: "Comp" | null }\n  }\n}\n\n\nrealizationCoverage, normalizedSurface, language, family, kind, Lemma linkage,\ntarget indices, confidence, alternatives, or explanation.\n</output_contract>\n\n\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n',
	cases,
	demonstrationIds: [
		"grammar-de-sconj-demo-finite-weil",
		"grammar-de-sconj-demo-reduced-wie",
		"grammar-de-sconj-demo-infinitival-um",
		"grammar-de-sconj-demo-causal-da",
		"grammar-de-sconj-demo-typo-obwol",
		"grammar-de-sconj-demo-historical-dass",
		"grammar-de-sconj-demo-multiword-so-dass",
		"grammar-de-sconj-demo-anstatt-zu",
		"grammar-de-sconj-demo-discontinuous-so-dass",
	],
	source: import.meta.url,
});
