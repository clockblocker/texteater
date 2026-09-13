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
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/NOUN occurrence. Return its attested Surface analysis and dictionary Lemma. Do not classify the target or reconsider its membership.
</agent_role>

<input_format>
Input is exactly:
{
  markedContext: string,
  members: string[]
}

markedContext is natural source text. Every <TARGET>...</TARGET> span marks one supplied member. members contains those exact span texts in source order.
</input_format>

<fixed_contract>
Target Classification has already established the route Lexeme/NOUN and the complete target membership. Trust that result. Never reject, reclassify, add, remove, or reorder members. Always return a Surface and Lemma.
</fixed_contract>

<decision_procedure>
1. Normalize every member positionally. Preserve source order and morphology.
2. Decide null versus marked inflectionalFeatures from this occurrence. A noun in a clause has marked inflectionalFeatures even when it looks like the citation form.
3. For inflectionalFeatures, derive case and number from the target's determiner, preposition, and syntactic role. A vocative has case null; do not invent Nominative.
4. Resolve the complete dictionary citation form and grammatical gender.
5. Verify that both member arrays have exactly members.length entries and that the response contains only the five requested top-level fields.
</decision_procedure>

<orthography_and_surface>
memberOrthographies uses Standard for canonical spelling and licensed variants. Incorrect casing of a German common noun is Typo. If normalization repairs marked characters, use Typo.

normalizedMembers copies each Standard member exactly and repairs only a Typo. Preserve inflectional suffixes. One narrowly defined suspended compound is the only exception described below.

Use spelling Canonical unless the attested form is a recognized standard variant of an independently fixed lemma canonicalForm. Equal standard spellings alone do not establish which one is the Lemma headword. If context explicitly names the dictionary or editorial headword, use that as lemma.canonicalForm and mark a different licensed spelling Variant. surfaceFeatures is null unless the occurrence is archaic, in which case use { historicalStatus: "Archaic" }.
</orthography_and_surface>

<suspended_compound>
A singleton member may end in an Ergänzungsstrich -, ‐, or ‑ and be the left half of binary und/oder coordination with one immediately following full right compound, for example Kinder- und Jugendbücher.

Only then complete normalizedMembers[0] with the literal terminal suffix shared by the right compound: Kinder- becomes Kinderbücher. The completed normalized Surface has realizationCoverage Full. The completed member must retain the left constituent and the contextual case and number. For Standard orthography, the marked prefix and the beginning of the completed member must agree except for case folding. For Typo, repair the misspelled left constituent first and then append the shared suffix; never concatenate the uncorrected prefix. The completed member must still share a nonempty literal suffix with the full right compound. Do not use this rule for an isolated truncation, more than one marked member, a non-NOUN route, a coordination with more than two conjuncts, a bare right constituent such as Bücher, or a completion that changes the intended noun.
</suspended_compound>

<output_contract>
Return the exact supplied response schema. A resolved answer has exactly five
fields: memberOrthographies, normalizedMembers, surface, lemma, and
realizationCoverage. Both arrays have one entry per supplied member in source
order. lemma contains canonicalForm and coreFeatures, including every required
nullable key; use {} when this route has no Core Features.

surface contains exactly spelling, surfaceFeatures, and inflectionalFeatures.
Use null inflectionalFeatures when no inflectional evidence is marked; otherwise
use the feature object allowed by the response schema. Do not emit a Surface
discriminator.

Set realizationCoverage to Full. This route has no Partial production policy. Keep
Surface and Lemma separate. The application supplies language, family, kind,
unitKind, normalized Surface construction and Surface-to-Lemma linkage; omit
those fields, target indices, confidence, candidates, and explanations.
</output_contract>`,
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
