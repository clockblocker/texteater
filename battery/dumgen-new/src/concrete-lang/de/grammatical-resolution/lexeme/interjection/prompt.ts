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
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/INTJ occurrence.
Return its attested Surface analysis and dictionary Lemma. Do not classify the
target or reconsider membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span
marks one supplied member, and members repeats those exact texts in source
order. Both projections are authoritative. Never reject, repair, add, remove,
merge, split, or reorder membership.
</input_contract>

<fixed_route_contract>
Target Classification already established Lexeme/INTJ and complete membership.
The operation is total: always resolve the supplied occurrence. Context
distinguishes identity, response function, orthography, and historical status,
but never changes the route.

Do not return Unresolved because an identical spelling can be a PART, ADV,
NOUN, ordinary lexical word, onomatopoeia, or part of a DiscourseFormula in a
different occurrence. Do not expand a supplied singleton into a nearby formula.
An independently supplied sound effect is resolved as INTJ. Unmarked neighbors
remain outside the target. Preserve all authoritative members of expressive
reduplication.
</fixed_route_contract>

<member_projection>
Return exactly one memberOrthographies and one normalizedMembers entry per
supplied member. Standard includes canonical spellings, licensed variants,
ordinary sentence-initial capitalization, expressive lengthening, and licensed
reduplication. Typo is only a genuine spelling error.

Preserve Standard members exactly except lowercase ordinary initial
capitalization of a normally lowercase interjection. Preserve lexical uppercase
in noun-origin secondary interjections and acronymic identities. Repair only
Typo members. Never substitute a synonym, expand an acronym, or collapse,
create, or reorder reduplicated members.
</member_projection>

<surface_model>
German INTJ is uninflected. Return surface with exactly spelling and
surfaceFeatures.

Use spelling Canonical when the attested realization uses its ordinary
dictionary spelling. Use Variant for a licensed alternate realization:
expressive sound lengthening, expressive reduplication, or an independently
licensed written variant. These variants remain Standard occurrence evidence.
Deletion, transposition, or substitution that is not licensed expression is a
Typo; after repair, the Surface is Canonical.

surfaceFeatures is null unless this exact use is deliberately historical or
archaic, when it is { historicalStatus: "Archaic" }. Historical forms remain
Standard unless the attested characters also contain a genuine error. Current
expressive variants are not Archaic.
</surface_model>

<route_distinctions>
- A nearby multiword greeting, farewell, or other DiscourseFormula does not
  absorb the authoritative singleton INTJ.
- An unmarked modal PART such as ja does not change a separately supplied ja
  answer, and a supplied answer remains Res.
- An unmarked ADV such as nun does not change a supplied prompting INTJ.
- A sound imitation such as wupp, miau, or peng is resolved here when the
  supplied occurrence was classified as an independent INTJ.
- A noun-origin form such as Mensch or Mist keeps lexical uppercase when used as
  a secondary INTJ; an unmarked ordinary noun elsewhere does not control it.
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
