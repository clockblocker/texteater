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
	body: `<agent_role>
Resolve the grammar of one already-classified German Construction/Fusion
occurrence. Return its Surface and Lemma. Do not classify the target or
reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. The sole TARGET
span and sole members entry are two authoritative projections of the same
written fused word. The caller already proved that the member is a valid
Construction/Fusion in this context.

Always resolve it. Never reject, repair, add, remove, merge, split, or reorder
membership. In particular, never split a fused word into hidden preposition and
article members, and never absorb a following article, noun, complement, Idiom
word, or other unmarked material. Other fused-looking forms, standalone ADP or
DET words, route contrasts, and repeated spellings in unmarked context do not
change the supplied member.
</input_contract>

<route_contract>
The route is fixed as German Construction/Fusion. A Fusion is one written form
conventionally realizing a German preposition plus article, such as am, beim,
im, ins, vom, zum, zur, ans, aufs, fürs, ums, durchs, übers, hinterm, vorm, or
unterm. The fused member itself is the complete Construction. The operation is
total even when nearby context mentions a lexicalized lookalike, a separately
written preposition and article, a dialect form, or another route such as an
Idiom or multi-member Lexeme.
</route_contract>

<member_projection>
Return exactly one memberOrthographies and one normalizedMembers entry.
Standard means exact conventional spelling, ordinary sentence-initial
capitalization, or a licensed historical spelling. Typo means a genuine local
spelling or inappropriate-casing error.

For ordinary sentence-initial capitalization, lowercase normalizedMembers but
classify the member Standard: Im becomes im and Beim becomes beim. Repair only
genuine Typos inside the supplied member: zun in a context selecting zum becomes
normalized zum, and beimm becomes beim. Do not repair valid unmarked context.

Licensed historical apostrophe spellings such as für's and in's remain
unchanged in normalizedMembers, remain Standard, and use Surface spelling
Variant while lemma.canonicalForm gives current fürs or ins. A typo repair uses
Surface spelling Canonical, not Variant.
</member_projection>

<surface_and_lemma>
surface contains exactly spelling and surfaceFeatures. spelling is Canonical
for an ordinary current fused form and Variant for a licensed spelling variant
of the same Fusion Lemma. surfaceFeatures is null unless the grammatical use of
the fused form itself is archaic; then use { historicalStatus: "Archaic" }.
Archaic wording or a historical source in unmarked context does not by itself
make a current Fusion use archaic.

lemma.canonicalForm is the conventional current fused spelling of the supplied
member, not its expanded preposition-plus-article paraphrase and not the larger
phrase. Thus Im maps to im, zun maps to zum, and historical für's maps to fürs.
</surface_and_lemma>

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
		"grammar-de-fusion-demo-im-initial",
		"grammar-de-fusion-demo-zur-noun-control",
		"grammar-de-fusion-demo-zum-typo",
		"grammar-de-fusion-demo-fuers-historical-variant",
		"grammar-de-fusion-demo-am-near-route-controls",
		"grammar-de-fusion-demo-ins-near-idiom-and-dialect",
	],
	source: import.meta.url,
});
