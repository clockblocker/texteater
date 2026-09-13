import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/PRON"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/pronoun",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/PRON occurrence. Return its attested Surface and dictionary Lemma. Do not classify the target or reconsider membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span marks one supplied member, and members repeats those exact texts in source order. Both projections are authoritative. Never reject, repair, add, remove, merge, split, or reorder membership. Never absorb an adposition, determiner, particle, governing verb, or other contextual word.
</input_contract>

<route_contract>
Target Classification already established Lexeme/PRON. The operation is total: always resolve the supplied occurrence. Use context to fill codec-supported grammar, but never reclassify the target as DET, ADV, PART, NOUN, NUM, or VERB.

The fixed route is lexical, not inferred again from local syntax. A substantive demonstrative, relative, interrogative, indefinite, negative, total, personal, reflexive, reciprocal, or possessive occurrence can be PRON. A neighboring determiner remains context. Degree-modifying etwas elsewhere would be ADV, but the supplied target is PRON. A contracted pronoun remains PRON. A pronoun selected by an inherently reflexive verb is still the supplied PRON member; never absorb the verb or return a VERB feature.
</route_contract>

<member_projection>
Return one memberOrthographies entry and one normalizedMembers entry for every supplied member. Standard includes canonical spelling, ordinary sentence-initial capitalization, required formal-address capitalization, and licensed contractions or variants. Typo is only a genuine spelling or inappropriate-casing error.

For each Standard member, preserve its contextual form except always lowercase ordinary sentence-initial capitalization. This applies equally to personal, demonstrative, interrogative, indefinite, total, and foreign members. Preserve uppercase only when the lexeme itself requires it, as in the formal Sie paradigm. Repair only Typo members. A lowercase formal-address sie is Typo and normalizes to Sie. Punctuation is not a ResolvableText member: when an external apostrophe licenses contracted s for es, preserve supplied s in normalizedMembers. The contraction is Standard. Never replace a contextual member with its Lemma form.
</member_projection>

<lemma_identity>
Case, agreement Number, gender, and gender[psor] belong in lemma.coreFeatures.
Each case-bearing form has its own grammatical identity. Preserve the reviewed
canonical form: jemand/Nom, jemanden/Acc, jemandem/Dat; likewise niemand,
niemanden, niemandem. An alternate accusative jemand realizes the jemanden
Lemma; retain jemand in normalizedMembers and use Variant spelling. Never
collapse these identities to one nominative Lemma.

Use the case-bearing form for personal, interrogative, demonstrative, relative,
indefinite, total, and possessive identities. Keep same-spelling cases distinct:
sie/Nom and sie/Acc, uns/Acc and uns/Dat. Demonstrative and relative der/die/das
keep their normalized form and differ by pronType. Possessive seiner and seines
retain their respective possessed-item gender Masc and Neut, independently of
the possessor's gender[psor]. Do not reduce a possessive to its uninflected stem.

Case is Acc, Dat, Gen, or Nom when established; invariant etwas, nichts, nix,
and einander may retain null Case. Null is unmarked, not a wildcard. Use Number
Plur or Sing when the identity establishes agreement; plural agreement has
null gender. The reviewed wer/wen/wem/wessen identities retain unmarked Number.
For other forms, preserve supported evidence without copying an unrelated
neighbor's agreement.

For non-possessive personal pronouns, marked gender requires third-person singular reference.
For possessives, gender describes the possessed item and gender[psor] describes
the possessor; neither supplies the other. Marked gender[psor] requires a
personal possessive with third-person singular reference. Formal address uses
plural agreement number independently of referenceNumber: explicit singular or
plural addressee evidence supplies referenceNumber, otherwise null. Do not
invent personal gender or infer it from a person's name alone.

Foreign personal forms preserve source-language identity and supported grammar;
an invariant foreign form receives no invented case or number. Contracted es
in subject position retains the es Lemma with Nom, Neut, Sing coordinates.
</lemma_identity>

<surface_model>
surface has spelling, surfaceFeatures, and inflectionalFeatures. Reflexivity is
the only Inflectional Feature: use { reflex: "Yes" } when the target is
co-referential with the clause subject and the subject acts on or for itself;
otherwise use null. This applies to mich, dir, uns, and sich. First- and
second-person reflexive uses retain their exact personal Lemma. Dedicated sich
has person 3 and pronType Prs; do not copy the antecedent's number.

spelling is Variant only for a licensed alternate realization or contraction
of the same Lemma; otherwise Canonical. A repaired Typo has Canonical spelling.
External punctuation may license a contracted Variant without being copied into
normalizedMembers. surfaceFeatures is null unless the use is archaic, then
{ historicalStatus: "Archaic" }. Case, Number, and both gender coordinates never
appear in surface.inflectionalFeatures.
</surface_model>

<route_distinctions>
- Resolve only the supplied PRON members; membership is authoritative.
- Do not absorb a governing adposition or verb.
- A nearby DET, ADV, or PART does not change the supplied PRON route.
- For identical der/die/das spellings, free pointing use selects Dem and relative-clause use selects Rel; both keep the exact normalized form as canonicalForm.
- A pronoun governed by an inherently reflexive VERB remains a PRON Surface with reflex Yes.
- Syncretic sie uses context for feminine singular, plural, or formal address; do not guess beyond what agreement and discourse establish. Within formal address, use explicit singular or plural addressee evidence for referenceNumber and return null when count is unstated.
- In a formal imperative with an addressed Sie and a neighboring reflexive sich, Sie is the nominative subject; do not copy the reflexive object's case.
</route_distinctions>

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
		"grammar-de-pron-demo-personal-ihm",
		"grammar-de-pron-demo-formal-ihnen",
		"grammar-de-pron-demo-reflexive-sich",
		"grammar-de-pron-fixed-der-paradigm-dem-der-nom-masc",
		"grammar-de-pron-fixed-der-paradigm-rel-der-nom-masc",
		"grammar-de-pron-fixed-jemand-jemandem",
		"grammar-de-pron-fixed-niemand-niemandem",
		"grammar-de-pron-fixed-keiner-nom-sing-masc",
		"grammar-de-pron-fixed-keiner-nom-sing-neut",
		"grammar-de-pron-fixed-keiner-nom-plur",
		"grammar-de-pron-fixed-jedermann-acc",
		"grammar-de-pron-fixed-jedermann-gen",
		"grammar-de-pron-fixed-mancher-nom-sing-masc",
		"grammar-de-pron-fixed-mancher-nom-plur",
		"grammar-de-pron-fixed-mancher-dat-sing-neut",
		"grammar-de-pron-demo-variant-nix",
		"grammar-de-pron-dev-poss-meiner",
		"grammar-de-pron-demo-archaic-meiner",
		"grammar-de-pron-fixed-wem",
		"grammar-de-pron-fixed-alles-acc",
		"grammar-de-pron-fixed-alle-nom",
		"grammar-de-pron-fixed-aller-gen",
		"grammar-de-pron-fixed-jeder-nom-masc",
		"grammar-de-pron-fixed-jeder-acc-fem",
		"grammar-de-pron-fixed-jeder-dat-neut",
		"grammar-de-pron-fixed-jeder-gen-fem",
		"grammar-de-pron-fixed-jedweder-nom-masc",
		"grammar-de-pron-fixed-jedweder-acc-fem",
		"grammar-de-pron-fixed-jedweder-dat-neut",
		"grammar-de-pron-fixed-jedweder-gen-fem",
		"grammar-de-pron-fixed-jeglicher-nom-sing-masc",
		"grammar-de-pron-fixed-jeglicher-acc-sing-fem",
		"grammar-de-pron-fixed-jeglicher-dat-sing-neut",
		"grammar-de-pron-fixed-jeglicher-gen-sing-fem",
		"grammar-de-pron-fixed-jeglicher-nom-plur",
		"grammar-de-pron-fixed-jeglicher-dat-plur",
		"grammar-de-pron-fixed-mehrere-dat",
		"grammar-de-pron-fixed-mehrere-gen",
	],
	source: import.meta.url,
});
