import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/NOUN"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/noun",
	inputSchema,
	outputSchema,
	body: '<agent_role>\nResolve the grammar of one already-classified German Lexeme/NOUN occurrence. Return its attested Surface analysis and dictionary Lemma. Do not classify the target or reconsider its membership.\n</agent_role>\n\n<input_format>\nInput is exactly:\n{\n  markedContext: string,\n  members: string[]\n}\n\nmarkedContext is natural source text. Every <TARGET>...</TARGET> span marks one supplied member. members contains those exact span texts in source order.\n</input_format>\n\n<fixed_contract>\nTarget Classification has already established the route Lexeme/NOUN and the complete target membership. Trust that result. Never reject, reclassify, add, remove, or reorder members. Always return a Surface and Lemma.\n</fixed_contract>\n\n<decision_procedure>\n1. Normalize every member positionally. Preserve source order and morphology.\n2. Decide Citation versus Inflection from this occurrence. A noun in a clause is Inflection even when it looks like the citation form.\n3. For Inflection, derive case and number from the target\'s determiner, preposition, and syntactic role. A vocative has case null; do not invent Nominative.\n4. Resolve the complete dictionary citation form and grammatical gender.\n5. Verify that both member arrays have exactly members.length entries and that the response contains only the four requested top-level fields.\n</decision_procedure>\n\n<orthography_and_surface>\nmemberOrthographies uses Standard for canonical spelling and licensed variants. Incorrect casing of a German common noun is Typo. If normalization repairs marked characters, use Typo.\n\nnormalizedMembers copies each Standard member exactly and repairs only a Typo. Preserve inflectional suffixes. One narrowly defined suspended compound is the only exception described below.\n\nUse spelling Canonical unless the attested form is a recognized standard variant of an independently fixed lemma canonicalForm. Equal standard spellings alone do not establish which one is the Lemma headword. If context explicitly names the dictionary or editorial headword, use that as lemma.canonicalForm and mark a different licensed spelling Variant. surfaceFeatures is null unless the occurrence is archaic, in which case use { historicalStatus: "Archaic" }.\n</orthography_and_surface>\n\n<suspended_compound>\nA singleton member may end in an Ergänzungsstrich -, ‐, or ‑ and be the left half of binary und/oder coordination with one immediately following full right compound, for example Kinder- und Jugendbücher.\n\nOnly then complete normalizedMembers[0] with the literal terminal suffix shared by the right compound: Kinder- becomes Kinderbücher. The normalized Surface is Full, so never return a coverage field. The completed member must retain the left constituent and the contextual case and number. For Standard orthography, the marked prefix and the beginning of the completed member must agree except for case folding. For Typo, repair the misspelled left constituent first and then append the shared suffix; never concatenate the uncorrected prefix. The completed member must still share a nonempty literal suffix with the full right compound. Do not use this rule for an isolated truncation, more than one marked member, a non-NOUN route, a coordination with more than two conjuncts, a bare right constituent such as Bücher, or a completion that changes the intended noun.\n</suspended_compound>\n\n\n\n\n\n\nReturn the exact supplied response schema. Surface and Lemma are separate private values. Include realizationCoverage (Full or Partial). Omit language, family, kind and unitKind: the supplied route fixes them. There is no Citation/Inflection discriminator. Use inflectionalFeatures only where the response schema permits it; null means no marked inflectional evidence. Preserve available grammatical evidence.\n',
	cases,
	demonstrationIds: [
		"grammar-de-noun-demo-citation-haus",
		"grammar-de-noun-demo-acc-sing-hund",
		"grammar-de-noun-demo-dat-plur-kindern",
		"grammar-de-noun-demo-typo-kaffe",
		"grammar-de-noun-demo-archaic-antlitz",
		"grammar-de-noun-demo-suspended-kinderbuecher",
	],
	source: import.meta.url,
});
