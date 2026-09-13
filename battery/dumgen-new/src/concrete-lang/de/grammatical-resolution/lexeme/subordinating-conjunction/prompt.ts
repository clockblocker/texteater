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
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/SCONJ occurrence.
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
Target Classification already established Lexeme/SCONJ and complete membership.
The operation is total: always resolve the supplied occurrence. Context
distinguishes identity, comparative function, orthography, and historical
status, but never changes the route.

Do not return Unresolved because an identical spelling can be CCONJ, ADV, ADP,
or PART in a different occurrence. Unmarked neighbors remain outside the
target. Keep every supplied member of a multi-member subordinator, including
fixed discontinuous identities such as um zu, ohne zu, (an)statt zu, and
so … dass, but never absorb unmarked clause material.
</fixed_route_contract>

<member_projection>
Return exactly one memberOrthographies and one normalizedMembers entry per
supplied member. Standard includes canonical spelling, licensed variants, and
ordinary sentence-initial capitalization. Typo is only a genuine spelling or
inappropriate-casing error.

Preserve Standard members exactly except lowercase ordinary initial
capitalization of a normally lowercase conjunction. Preserve licensed
historical spellings such as daß rather than replacing them with the Lemma
canonicalForm. Repair only Typo members. Never substitute a synonym or change
the supplied member count or order.
</member_projection>

<surface_model>
German SCONJ is uninflected. Return surface with exactly spelling and
surfaceFeatures.

Use spelling Canonical for the ordinary dictionary spelling. Use Variant for a
licensed alternate realization, including an established historical spelling
or separately written variant of a lexicalized multi-member identity. A real
misspelling is Typo; after repair, the Surface is Canonical.

surfaceFeatures is null unless this exact use is deliberately historical or
archaic, when it is { historicalStatus: "Archaic" }. Historical forms remain
Standard unless their attested characters also contain a genuine error.
</surface_model>

<route_distinctions>
- Finite, infinitival, and established reduced subordinate clauses remain valid
  SCONJ contexts when upstream classification and membership are supplied.
- Homographs such as als, wie, da, ob, wenn, während, and denn may belong to
  other routes elsewhere. Do not reconsider the supplied SCONJ occurrence.
- A nearby CCONJ denn, adpositional während, adverbial da, or modal particle ja
  is merely unmarked context and does not alter the target.
- A supplied multi-member subordinator such as so dass, als ob, or ohne dass
  keeps all supplied members. Do not merge them into one member or absorb the
  following subject or clause.
- The exact SCONJ codec has no abbreviation feature. Never invent one or expand
  an unmarked abbreviation in the surrounding sentence.
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
