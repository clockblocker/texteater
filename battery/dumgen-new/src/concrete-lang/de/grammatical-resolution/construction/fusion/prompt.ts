import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Construction/Fusion"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/construction/fusion",
	inputSchema,
	outputSchema,
	body: '<agent_role>\nResolve the grammar of one already-classified German Construction/Fusion\noccurrence. Return its Citation Surface and Lemma. Do not classify the target or\nreconsider its membership.\n</agent_role>\n\n<input_contract>\nInput is exactly { markedContext: string, members: string[] }. The sole TARGET\nspan and sole members entry are two authoritative projections of the same\nwritten fused word. The caller already proved that the member is a valid\nConstruction/Fusion in this context.\n\nAlways resolve it. Never reject, repair, add, remove, merge, split, or reorder\nmembership. In particular, never split a fused word into hidden preposition and\narticle members, and never absorb a following article, noun, complement, Idiom\nword, or other unmarked material. Other fused-looking forms, standalone ADP or\nDET words, route contrasts, and repeated spellings in unmarked context do not\nchange the supplied member.\n</input_contract>\n\n<route_contract>\nThe route is fixed as German Construction/Fusion. A Fusion is one written form\nconventionally realizing a German preposition plus article, such as am, beim,\nim, ins, vom, zum, zur, ans, aufs, fürs, ums, durchs, übers, hinterm, vorm, or\nunterm. The fused member itself is the complete Construction. The operation is\ntotal even when nearby context mentions a lexicalized lookalike, a separately\nwritten preposition and article, a dialect form, or another route such as an\nIdiom or multi-member Lexeme.\n</route_contract>\n\n<application_projection>\nThis route has Citation Surface only. The application injects German language,\nConstruction family, Fusion kind, empty Lemma Core Features, Citation\n\ncoverage, and the successful result wrapper.\n\nNever return decision, resolution, Unresolved, realizationCoverage,\n\nlinkage, target indices, confidence, candidates, sources, or explanation.\n</application_projection>\n\n<member_projection>\nReturn exactly one memberOrthographies and one normalizedMembers entry.\nStandard means exact conventional spelling, ordinary sentence-initial\ncapitalization, or a licensed historical spelling. Typo means a genuine local\nspelling or inappropriate-casing error.\n\nFor ordinary sentence-initial capitalization, lowercase normalizedMembers but\nclassify the member Standard: Im becomes im and Beim becomes beim. Repair only\ngenuine Typos inside the supplied member: zun in a context selecting zum becomes\nnormalized zum, and beimm becomes beim. Do not repair valid unmarked context.\n\nLicensed historical apostrophe spellings such as für\'s and in\'s remain\nunchanged in normalizedMembers, remain Standard, and use Surface spelling\nVariant while lemma.canonicalForm gives current fürs or ins. A typo repair uses\nSurface spelling Canonical, not Variant.\n</member_projection>\n\n<surface_and_lemma>\nsurface contains exactly spelling and surfaceFeatures. spelling is Canonical\nfor an ordinary current fused form and Variant for a licensed spelling variant\nof the same Fusion Lemma. surfaceFeatures is null unless the grammatical use of\nthe fused form itself is archaic; then use { historicalStatus: "Archaic" }.\nArchaic wording or a historical source in unmarked context does not by itself\nmake a current Fusion use archaic.\n\nlemma.canonicalForm is the conventional current fused spelling of the supplied\nmember, not its expanded preposition-plus-article paraphrase and not the larger\nphrase. Thus Im maps to im, zun maps to zum, and historical für\'s maps to fürs.\n</surface_and_lemma>\n\n<output_contract>\nReturn exactly:\n{\n  memberOrthographies: [("Standard" | "Typo")],\n  normalizedMembers: [string],\n  surface: {\n    spelling: "Canonical" | "Variant",\n    surfaceFeatures: null | { historicalStatus: "Archaic" }\n  },\n  lemma: { canonicalForm: string }\n}\n\nFinal check: both arrays have length one, preserve the supplied member only,\nand the output contains no application-owned fields. Always resolve the fixed\nroute.\n</output_contract>\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n',
	cases,
	demonstrationIds: [
		"grammar-de-fusion-demo-im-initial",
		"grammar-de-fusion-demo-zur-noun-control",
		"grammar-de-fusion-demo-zum-typo",
		"grammar-de-fusion-demo-fuers-historical-variant",
		"grammar-de-fusion-demo-am-near-route-controls",
		"grammar-de-fusion-demo-ins-near-idiom-and-dialect",
	],
	source: import.meta.url,
});
