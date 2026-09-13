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
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/ADP occurrence. Return its attested Surface and dictionary Lemma. Do not classify the target or reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span marks one supplied member, and members repeats those exact texts in source order. Both projections are authoritative. Never reject, repair, add, remove, merge, split, or reorder membership. Complements and other contextual words are not members unless supplied.
</input_contract>

<route_contract>
Target Classification already established Lexeme/ADP. The operation is total: always resolve the supplied occurrence. Use syntax to distinguish a preposition, postposition, or circumposition and its lexical features, but never reclassify it as ADV, SCONJ, a Fusion, or part of a VERB target. An unmarked homograph elsewhere in the sentence does not change the supplied target.

German ADP is uninflected in the current codec. Every occurrence has an uninflected Surface, including ordinary sentence uses.
</route_contract>

<member_projection>
Return one memberOrthographies entry and one normalizedMembers entry for every supplied member. Standard includes canonical spelling, ordinary sentence-initial capitalization, licensed variants, and conventional abbreviations. Typo is only a genuine spelling or inappropriate-casing error.

For each Standard member, preserve its characters except lowercase ordinary sentence-initial capitalization. Capitalization is Standard only when ordinary German orthography licenses it at that position; an otherwise lowercase preposition capitalized in the middle of a sentence is Typo. Repair only Typo members. Preserve member order and separate members; never absorb a nominal complement. A circumposition such as von ... an has two supplied and two normalized members. A licensed multiword variant such as auf Grund also retains both positions.

Punctuation is not a ResolvableText member. When an abbreviation period follows the closing TARGET tag, preserve the supplied letters without adding the period to normalizedMembers; the Lemma may still use the conventional punctuated abbreviation.
</member_projection>

<surface_model>
surface contains exactly spelling and surfaceFeatures. spelling is Variant when the attested Surface is a licensed abbreviation or independently established spelling variant of the chosen Lemma; otherwise Canonical. If punctuation outside TARGET completes an abbreviation whose dictionary form includes that punctuation, the unpunctuated supplied Surface is still Variant relative to that Lemma. Equal standard variants do not by themselves choose one Lemma headword, but an explicit dictionary-form or preferred-headword cue in the context does. surfaceFeatures is null unless this ADP use is archaic; then use { historicalStatus: "Archaic" }.
</surface_model>

<route_distinctions>
- Resolve only the supplied ADP members; never absorb the complement.
- A later unmarked separable particle does not turn an earlier supplied auf into Vbp.
- A governed preposition that belongs to an unmarked VERB target does not enter this ADP output.
- An unmarked Fusion such as im and an unmarked SCONJ remain context only.
- Fixed ADP classification is authoritative even when a form such as entlang, anstatt, or auf has other possible routes elsewhere.
</route_distinctions>

<output_contract>
Return the exact supplied response schema. A resolved answer has exactly five
fields: memberOrthographies, normalizedMembers, surface, lemma, and
realizationCoverage. Both arrays have one entry per supplied member in source
order. lemma contains canonicalForm and coreFeatures, including every required
nullable key; use {} when this route has no Core Features.

surface contains exactly spelling and surfaceFeatures. This route is
uninflected: omit inflectionalFeatures. Do not emit a Surface discriminator.

Set realizationCoverage to Full. This route has no Partial production policy. Keep
Surface and Lemma separate. The application supplies language, family, kind,
unitKind, normalized Surface construction and Surface-to-Lemma linkage; omit
those fields, target indices, confidence, candidates, and explanations.
</output_contract>`,
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
