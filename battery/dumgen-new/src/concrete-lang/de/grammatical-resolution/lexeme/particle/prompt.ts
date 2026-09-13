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
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/PART occurrence.
Return its attested Surface and dictionary Lemma. Do not classify the
target or reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span
marks one supplied member, and members repeats those exact texts in source
order. Both projections are authoritative. Never reject, repair, add, remove,
merge, split, or reorder membership. Contextual words and punctuation are not
members unless supplied.
</input_contract>

<route_contract>
Target Classification already established Lexeme/PART. The operation is total:
always resolve the supplied occurrence. Use its context to determine the
particle's lexical and polarity features, but never return Unresolved or
reclassify it as ADV, ADP, INTJ, CCONJ, SCONJ, a Phraseme, or part of a VERB.
The fixed PART route remains authoritative for a contextually ambiguous form.

German PART is uninflected in the current codec. Every occurrence has a
Surface.
</route_contract>

<member_projection>
Return exactly one memberOrthographies and normalizedMembers entry per supplied
member. Standard includes canonical spelling, ordinary sentence-initial
capitalization, licensed regional or expressive variants, and conventional
abbreviations. Typo is only a genuine spelling or inappropriate-casing error.

Preserve a Standard member's characters except lowercase ordinary
sentence-initial capitalization. Repair only Typo members. A typo repair changes
normalizedMembers to the intended particle but does not change Surface spelling
from Canonical. A licensed variant remains unchanged and uses spelling Variant.
Never replace a particle with a synonym. Lexical identity follows explicit
lexicographic cues: “variant of X” selects Lemma X and spelling Variant, while
“own Lemma/headword/entry” selects the attested form as canonicalForm and
spelling Canonical. Without an explicit relation, do not invent a modern-Lemma
link merely because a regional or historical form resembles another particle;
preserve the supplied lexeme as its own canonicalForm. If abbreviation
punctuation sits outside TARGET, do not add it to normalizedMembers; the
dictionary Lemma may still include the punctuation.
</member_projection>

<surface_model>
surface contains exactly spelling and surfaceFeatures. spelling is Canonical
for the Lemma's ordinary form and for a repaired typo. Use Variant only for an
independently licensed regional, expressive, historical, or abbreviated Surface
of the chosen Lemma. surfaceFeatures is null unless this exact occurrence is
explicitly historical or archaic; then use { historicalStatus: "Archaic" }.
Do not mark a merely colloquial or foreign form archaic.
</surface_model>

<route_distinctions>
- Clause-dependent modal ja is PART with null polarity; an explicitly supplied
  affirmative answer ja is PART with Pos under this already-fixed route.
- Infinitival zu is PART with PartType Inf; an unmarked prepositional zu remains
  ADP context.
- A supplied modal or focus homograph remains PART even beside an unmarked ADV,
  CCONJ, SCONJ, INTJ, or ADP.
- A nearby separable VERB element never enters PART membership. Only the
  supplied target is resolved.
- A punctuation mark outside TARGET is not a member. Never absorb surrounding
  phraseme or clause material.
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
